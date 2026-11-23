/**
 * @description M4-B 方向选择域服务端 IO 支撑：待归并请求集合常量 / 列表分页与行视图组装、
 *   后台方向预览（读 M3 报告冻结 factorSnapshot + M1 当前配置，调用 M4-A 纯函数）、
 *   归并别名冲突检查、转正 stub 载荷生成、Zod schema、路由参数解析与错误码工具。
 *   口径见 docs/specs/M4-matching/spec.md §3.5/§4.7/§5.2/§5.3、ADR 0004-D5。
 *   本文件只读报告与 M1 配置，不写快照、不改方向 version（别名写入在 selection 域）。
 * @file server/utils/talent-direction-api.ts
 */
import type PocketBase from "pocketbase";
import { createError, getQuery, getRouterParam } from "h3";
import { z } from "zod";
import {
  TALENT_DIRECTION_REQUEST_COLLECTION,
  TALENT_DIRECTION_REQUEST_STATUS_PENDING,
  TALENT_DIRECTION_REQUEST_STATUSES,
  type TalentDirectionBrief,
  type TalentDirectionEmptyReason,
  type TalentDirectionPreviewHit,
  type TalentDirectionPreviewRecommendationItem,
  type TalentDirectionPreviewResult,
  type TalentDirectionRequestListQuery,
  type TalentDirectionRequestListResult,
  type TalentDirectionRequestRecord,
  type TalentDirectionRequestRow,
} from "~~/shared/types/talent-direction";
import type { TalentDirection } from "~~/shared/types/talent-rule";
import type { TalentReportRecord } from "~~/shared/types/talent-report";
import { escapeFilterValue } from "~~/server/utils/pocketbase-client";
import {
  loadTalentReportSnapshotRules,
  getTalentReportOrThrow,
} from "~~/server/utils/talent-report";
import {
  hasTalentReportSnapshot,
  matchTalentReportDirections,
} from "~~/server/utils/talent-report-snapshot";

/** 待归并列表默认 / 最大分页（CONVENTIONS：默认 20、上限 100）。 */
export const TALENT_DIRECTION_REQUEST_DEFAULT_PAGE_SIZE = 20;
export const TALENT_DIRECTION_REQUEST_MAX_PAGE_SIZE = 100;

/** M4-B 新增 / 复用的权限码：list 复用 M1，merge 为 M4 新增 F 行，view 复用 M3。 */
export const TALENT_DIRECTION_REQUIRED_PERMISSION_CODES = [
  "talent:direction:list",
  "talent:direction:merge",
] as const;

/** 后台方向选择域路由定义（测试断言路由清单 / 权限映射用）。 */
export interface TalentDirectionRouteDefinition {
  method: "GET" | "POST";
  path: string;
  permission: string;
  write: boolean;
  /** 相对 `server/api/admin/talent` 的路由文件。 */
  file: string;
  action?: "merge" | "promote";
}

/**
 * 后台路由清单：
 * - spec §5.2 #1–#3 使用 `/direction-requests`；
 * - 任务卡口径额外提供 `/directions/requests` 与 `/directions/preview` 别名（同一服务函数）；
 * - 方向选择（选择 / 换档 / 取消）聚合为 `POST /reports/:id/selection`，供后台联调，C 端
 *   `/api/client/talent/selections` 四条路由按 spec 留 M7。
 */
export const TALENT_DIRECTION_ADMIN_ROUTES: readonly TalentDirectionRouteDefinition[] = [
  {
    method: "GET",
    path: "/api/admin/talent/directions/preview",
    permission: "talent:report:view",
    write: false,
    file: "directions/preview.get.ts",
  },
  {
    method: "GET",
    path: "/api/admin/talent/direction-requests",
    permission: "talent:direction:list",
    write: false,
    file: "direction-requests/index.get.ts",
  },
  {
    method: "GET",
    path: "/api/admin/talent/directions/requests",
    permission: "talent:direction:list",
    write: false,
    file: "directions/requests/index.get.ts",
  },
  {
    method: "POST",
    path: "/api/admin/talent/direction-requests/:id/merge",
    permission: "talent:direction:merge",
    write: true,
    file: "direction-requests/[id]/[action].post.ts",
    action: "merge",
  },
  {
    method: "POST",
    path: "/api/admin/talent/direction-requests/:id/promote",
    permission: "talent:direction:merge",
    write: true,
    file: "direction-requests/[id]/[action].post.ts",
    action: "promote",
  },
  {
    method: "POST",
    path: "/api/admin/talent/directions/requests/:id/merge",
    permission: "talent:direction:merge",
    write: true,
    file: "directions/requests/[id]/[action].post.ts",
    action: "merge",
  },
  {
    method: "POST",
    path: "/api/admin/talent/directions/requests/:id/promote",
    permission: "talent:direction:merge",
    write: true,
    file: "directions/requests/[id]/[action].post.ts",
    action: "promote",
  },
  {
    method: "POST",
    path: "/api/admin/talent/reports/:id/selection",
    permission: "talent:report:view",
    write: true,
    file: "reports/[id]/selection.post.ts",
  },
];

// ── 错误工具：错误码只通过 data.code 暴露，不回传 PB 原始错误与堆栈 ─────────────

export function notFoundTalentDirection(message = "待归并方向不存在") {
  return createError({ statusCode: 404, message });
}

export function conflictTalentDirection(message: string, code: string) {
  return createError({ statusCode: 409, message, data: { code } });
}

export function invalidTalentDirection(message: string, code: string) {
  return createError({ statusCode: 422, message, data: { code } });
}

// ── Zod schema ──────────────────────────────────────────────────────────────

/** 归并请求体：目标正式方向 id 必填。 */
export const talentDirectionMergeSchema = z.object({
  targetDirectionId: z
    .string({ message: "请选择目标方向" })
    .trim()
    .min(1, "请选择目标方向")
    .max(64, "目标方向 id 过长"),
});

/** 转正请求体：无参数（空对象 / 无 body 均合法）。 */
export const talentDirectionPromoteSchema = z
  .union([z.object({}).strict(), z.undefined(), z.null()])
  .transform(() => ({}));

/** 后台方向选择请求体：select / changeTier / cancel 三态，按动作做最小必填校验。 */
export const talentDirectionSelectionSchema = z
  .object({
    action: z.enum(["select", "changeTier", "cancel"], {
      message: "选择动作不合法",
    }),
    directionId: z.string().trim().max(64).optional(),
    requestId: z.string().trim().max(64).optional(),
    manualName: z.string().trim().max(20).optional(),
    tierId: z.string().trim().max(64).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const directionId = value.directionId ?? "";
    const requestId = value.requestId ?? "";
    const manualName = value.manualName ?? "";
    const tierId = value.tierId ?? "";
    if (value.action === "select") {
      if (!directionId && !manualName)
        context.addIssue({
          code: "custom",
          message: "请选择培养方向或填写自定义方向名称",
        });
      if (!tierId)
        context.addIssue({ code: "custom", message: "请选择目标档位" });
    }
    if (value.action === "changeTier") {
      if (!directionId && !requestId)
        context.addIssue({ code: "custom", message: "缺少已选方向 id" });
      if (!tierId)
        context.addIssue({ code: "custom", message: "请选择目标档位" });
    }
    if (value.action === "cancel" && !directionId && !requestId)
      context.addIssue({ code: "custom", message: "缺少已选方向 id" });
  });

// ── 路由参数 / 查询解析 ──────────────────────────────────────────────────────

function pathSegments(event: { path?: unknown }): string[] {
  const path = String(event?.path ?? "");
  return path
    .split("?")[0]!
    .split("/")
    .filter(Boolean);
}

/** 待归并请求 id：优先 router param，其次从 path 的 `requests` 段后回退解析。 */
export function resolveTalentDirectionRequestId(event: {
  path?: unknown;
  context?: { params?: Record<string, string> };
}): string {
  const param = String(
    (event as { context?: { params?: Record<string, string> } }).context?.params?.id ??
      getRouterParamSafe(event, "id") ??
      "",
  ).trim();
  if (param) return param;
  const segments = pathSegments(event);
  const marker = segments.lastIndexOf("requests");
  return String(marker >= 0 ? segments[marker + 1] ?? "" : "").trim();
}

/** 动作段：优先 router param，其次 path 末段（merge / promote）。 */
export function resolveTalentDirectionRequestAction(event: {
  path?: unknown;
  context?: { params?: Record<string, string> };
}): string {
  const param = String(
    (event as { context?: { params?: Record<string, string> } }).context?.params?.action ??
      getRouterParamSafe(event, "action") ??
      "",
  ).trim();
  if (param) return param;
  const segments = pathSegments(event);
  return String(segments[segments.length - 1] ?? "").trim();
}

function getRouterParamSafe(
  event: unknown,
  name: string,
): string | undefined {
  try {
    return getRouterParam(event as never, name);
  } catch {
    return undefined;
  }
}

/** 预览 / 选择路由的报告 id：router param 优先，path 中 `reports` 段后回退。 */
export function resolveTalentDirectionReportId(event: {
  path?: unknown;
  context?: { params?: Record<string, string> };
}): string {
  const param = String(
    (event as { context?: { params?: Record<string, string> } }).context?.params?.id ??
      getRouterParamSafe(event, "id") ??
      "",
  ).trim();
  if (param) return param;
  const segments = pathSegments(event);
  const marker = segments.lastIndexOf("reports");
  return String(marker >= 0 ? segments[marker + 1] ?? "" : "").trim();
}

/** 预览查询的 `reportId`：必填，缺失 422。 */
export function readTalentDirectionPreviewReportId(
  query: Record<string, unknown>,
): string {
  const reportId = String(query?.reportId ?? "").trim();
  if (!reportId)
    throw invalidTalentDirection("请提供报告 id（reportId）", "REPORT_ID_REQUIRED");
  return reportId;
}

/** 列表查询归一化：keyword / status（默认待归并）/ page / pageSize（默认 20、上限 100）。 */
export function normalizeTalentDirectionRequestListQuery(
  query: Record<string, unknown> = {},
): TalentDirectionRequestListQuery {
  const rawStatus = String(query.status ?? "").trim();
  const status = (TALENT_DIRECTION_REQUEST_STATUSES as readonly string[]).includes(
    rawStatus,
  )
    ? rawStatus
    : TALENT_DIRECTION_REQUEST_STATUS_PENDING;
  const rawPage = Number(query.page);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const rawPageSize = Number(query.pageSize);
  const pageSize =
    Number.isFinite(rawPageSize) && rawPageSize > 0
      ? Math.min(
          TALENT_DIRECTION_REQUEST_MAX_PAGE_SIZE,
          Math.floor(rawPageSize),
        )
      : TALENT_DIRECTION_REQUEST_DEFAULT_PAGE_SIZE;
  return {
    keyword: String(query.keyword ?? "").trim(),
    status,
    page,
    pageSize,
  };
}

// ── 行视图组装（批量读取关系，避免 N+1） ───────────────────────────────────

function uniqueIds(values: readonly unknown[]): string[] {
  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))];
}

function idFilter(ids: readonly string[]): string {
  return ids.map((id) => `id = "${escapeFilterValue(id)}"`).join(" || ");
}

async function loadByIds<T extends { id: string }>(
  pb: PocketBase,
  collection: string,
  ids: readonly string[],
): Promise<Map<string, T>> {
  const unique = uniqueIds(ids);
  if (!unique.length) return new Map();
  const rows = await pb.collection(collection).getFullList<T>({
    filter: idFilter(unique),
    $autoCancel: false,
  });
  return new Map(rows.map((row) => [String(row.id), row]));
}

/** 把待归并请求记录组装为列表行（姓名 / 脱敏手机号来自关系，不返回原文）。 */
export async function buildTalentDirectionRequestRows(
  pb: PocketBase,
  requests: readonly TalentDirectionRequestRecord[],
): Promise<TalentDirectionRequestRow[]> {
  if (!requests.length) return [];
  const reportMap = await loadByIds<TalentReportRecord>(
    pb,
    "talent_reports",
    requests.map((item) => item.reportId),
  );
  const parentMap = await loadByIds<{
    id: string;
    name?: string;
    maskedMobile?: string;
  }>(pb, "talent_parents", requests.map((item) => item.parentId));
  const childMap = await loadByIds<{ id: string; name?: string }>(
    pb,
    "talent_children",
    requests.map((item) => item.subjectId),
  );
  const tierMap = await loadByIds<{ id: string; name?: string }>(
    pb,
    "talent_tiers",
    requests.map((item) => item.tierId),
  );
  const directionMap = await loadByIds<TalentDirection>(
    pb,
    "talent_directions",
    requests.map((item) => item.targetDirectionId ?? ""),
  );
  const userMap = await loadByIds<{
    id: string;
    displayName?: string;
    username?: string;
  }>(pb, "users", requests.map((item) => item.mergedBy ?? ""));

  return requests.map((request) => {
    const report = reportMap.get(String(request.reportId ?? ""));
    const parent = parentMap.get(String(request.parentId ?? ""));
    const child = childMap.get(String(request.subjectId ?? ""));
    const tier = tierMap.get(String(request.tierId ?? ""));
    const direction = directionMap.get(String(request.targetDirectionId ?? ""));
    const operator = userMap.get(String(request.mergedBy ?? ""));
    const subjectType = String(request.subjectType ?? "");
    const parentName = String(parent?.name ?? "");
    return {
      id: String(request.id ?? ""),
      reportId: String(request.reportId ?? ""),
      reportNo: String(report?.reportNo ?? ""),
      subjectType,
      subjectName:
        subjectType === "self"
          ? parentName
          : String(child?.name ?? parentName),
      parentName,
      maskedMobile: String(parent?.maskedMobile ?? ""),
      manualName: String(request.manualName ?? ""),
      tierId: String(request.tierId ?? ""),
      tierName: String(tier?.name ?? request.tierId ?? ""),
      status: String(request.status ?? ""),
      targetDirectionId: String(request.targetDirectionId ?? ""),
      targetDirectionName: String(direction?.name ?? ""),
      createdAt: String(request.created ?? ""),
      mergedAt: String(request.mergedAt ?? ""),
      mergedByName: String(
        operator?.displayName ?? operator?.username ?? "",
      ),
    };
  });
}

/** 读取单条待归并请求；不存在统一 404「待归并方向不存在」。 */
export async function loadTalentDirectionRequestOrThrow(
  pb: PocketBase,
  requestId: unknown,
): Promise<TalentDirectionRequestRecord> {
  const id = String(requestId ?? "").trim();
  if (!id) throw notFoundTalentDirection();
  const record = await pb
    .collection(TALENT_DIRECTION_REQUEST_COLLECTION)
    .getOne<TalentDirectionRequestRecord>(id, { $autoCancel: false })
    .catch(() => null);
  if (!record) throw notFoundTalentDirection();
  return record;
}

/** 读取单条请求并组装行视图（归并 / 转正响应复用）。 */
export async function loadTalentDirectionRequestRow(
  pb: PocketBase,
  requestId: unknown,
): Promise<TalentDirectionRequestRow> {
  const request = await loadTalentDirectionRequestOrThrow(pb, requestId);
  const rows = await buildTalentDirectionRequestRows(pb, [request]);
  return rows[0]!;
}

/** 待归并列表（spec §5.3.1）：关键词命中自填方向 / 家长 / 子女，默认只看待归并。 */
export async function listTalentDirectionRequests(
  pb: PocketBase,
  query: Record<string, unknown> = {},
): Promise<TalentDirectionRequestListResult> {
  const normalized = normalizeTalentDirectionRequestListQuery(query);
  const filters = [`status = "${escapeFilterValue(normalized.status)}"`];

  if (normalized.keyword) {
    const keyword = escapeFilterValue(normalized.keyword);
    const [parents, children] = await Promise.all([
      pb
        .collection("talent_parents")
        .getFullList<{ id: string }>({
          fields: "id",
          filter: `name ~ "${keyword}"`,
          $autoCancel: false,
        })
        .catch(() => []),
      pb
        .collection("talent_children")
        .getFullList<{ id: string }>({
          fields: "id",
          filter: `name ~ "${keyword}"`,
          $autoCancel: false,
        })
        .catch(() => []),
    ]);
    const parentIds = uniqueIds(parents.map((row) => row.id));
    const subjectIds = uniqueIds(children.map((row) => row.id));
    const keywordClauses = [`manualName ~ "${keyword}"`];
    if (parentIds.length)
      keywordClauses.push(
        parentIds
          .map((id) => `parentId = "${escapeFilterValue(id)}"`)
          .join(" || "),
      );
    if (subjectIds.length)
      keywordClauses.push(
        subjectIds
          .map((id) => `subjectId = "${escapeFilterValue(id)}"`)
          .join(" || "),
      );
    filters.push(`(${keywordClauses.join(" || ")})`);
  }

  const result = await pb
    .collection(TALENT_DIRECTION_REQUEST_COLLECTION)
    .getList<TalentDirectionRequestRecord>(normalized.page, normalized.pageSize, {
      filter: filters.join(" && "),
      sort: "-created",
      $autoCancel: false,
    });
  const rows = await buildTalentDirectionRequestRows(pb, result.items);
  return {
    rows,
    total: result.totalItems,
    page: normalized.page,
    pageSize: normalized.pageSize,
  };
}

// ── 归并：别名冲突检查 + 方向摘要 ───────────────────────────────────────────

/** 规整方向别名：trim、去空、去重（保序）。 */
export function normalizeTalentDirectionAliases(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const aliases: string[] = [];
  for (const item of value) {
    const alias = String(item ?? "").trim();
    if (!alias || seen.has(alias)) continue;
    seen.add(alias);
    aliases.push(alias);
  }
  return aliases;
}

/** 方向摘要（归并 / 转正响应；不含配置正文）。 */
export function buildTalentDirectionBrief(
  direction: TalentDirection,
): TalentDirectionBrief {
  return {
    id: String(direction.id ?? ""),
    code: String(direction.code ?? ""),
    name: String(direction.name ?? ""),
    status: String(direction.status ?? ""),
    version: Number(direction.version ?? 0) || 0,
    aliases: normalizeTalentDirectionAliases(direction.aliases),
  };
}

/**
 * 归并别名唯一性（spec §4.7）：
 * - 已存在于目标方向 `aliases` → 幂等放行（不重复写入）；
 * - 属于其它方向的别名 → 409 `ALIAS_CONFLICT`；
 * - 与其它方向 `name` 相同 → 409（避免家长看到两个同名方向）。
 */
export async function assertTalentDirectionAliasAvailable(
  pb: PocketBase,
  manualName: string,
  targetDirectionId: string,
): Promise<void> {
  const alias = String(manualName ?? "").trim();
  if (!alias) throw invalidTalentDirection("自填方向名称为空", "INVALID_MANUAL_NAME");
  const directions = await pb
    .collection("talent_directions")
    .getFullList<TalentDirection>({ $autoCancel: false });
  const target = directions.find((item) => String(item.id) === targetDirectionId);
  if (!target) throw notFoundTalentDirection("目标培养方向不存在");
  if (normalizeTalentDirectionAliases(target.aliases).includes(alias)) return;
  for (const direction of directions) {
    const id = String(direction.id ?? "");
    if (id === String(target.id)) continue;
    if (normalizeTalentDirectionAliases(direction.aliases).includes(alias))
      throw conflictTalentDirection(
        `别名「${alias}」已被方向「${String(direction.name ?? "")}」使用`,
        "ALIAS_CONFLICT",
      );
    if (String(direction.name ?? "").trim() === alias)
      throw conflictTalentDirection(
        `自填方向「${alias}」与已有方向名称相同，请改为归并或调整名称`,
        "ALIAS_CONFLICT",
      );
  }
}

// ── 转正 stub（绕过 M1 保存校验的「停用待配置」方向） ────────────────────────

export interface TalentDirectionStubInput {
  manualName: string;
  code: string;
  tierIds: readonly string[];
  defaultTierId: string;
  createdBy?: string;
  updatedBy?: string;
}

/** 生成转正方向写入载荷（spec §4.7）：停用、requirements=[]、启用档位全集。 */
export function buildTalentDirectionStubPayload(
  input: TalentDirectionStubInput,
): Record<string, unknown> {
  const name = String(input.manualName ?? "").trim();
  const firstChar = Array.from(name)[0] ?? "";
  return {
    code: String(input.code ?? ""),
    name,
    description: `由自定义方向「${name}」转入，待配置要素与要求分级。`,
    icon: firstChar,
    requirements: [],
    tierIds: [...input.tierIds],
    defaultTierId: String(input.defaultTierId ?? ""),
    aliases: [],
    version: 1,
    status: "0",
    createdBy: String(input.createdBy ?? ""),
    updatedBy: String(input.updatedBy ?? ""),
  };
}

// ── 后台方向预览（按报告 factorSnapshot 计算推荐 / 0 命中 / 诊断） ─────────────

/**
 * 预览：读报告冻结 `factorSnapshot` + 当前 M1 配置全量重算（不落库、不改快照）。
 * 返回全部已评估方向（含 0 命中、诊断字段与 warnings）与按推荐上限截断的推荐列表。
 */
export async function buildTalentDirectionPreview(
  pb: PocketBase,
  reportId: unknown,
): Promise<TalentDirectionPreviewResult> {
  const report = await getTalentReportOrThrow(pb, reportId);
  const rules = await loadTalentReportSnapshotRules(pb);
  const factorSnapshot = Array.isArray(report.factorSnapshot)
    ? report.factorSnapshot
    : [];
  const matched = matchTalentReportDirections({ factorSnapshot, rules });

  const hits: TalentDirectionPreviewHit[] = matched.hits.map((hit) => ({
    directionId: String(hit.directionId ?? ""),
    code: String(hit.code ?? ""),
    name: String(hit.name ?? ""),
    version: Number(hit.version ?? 0) || 0,
    status: String(hit.status ?? ""),
    hitCount: Number(hit.hitCount ?? 0) || 0,
    total: Number(hit.total ?? 0) || 0,
    hitRate: Number(hit.hitRate ?? 0) || 0,
    tierIds: Array.isArray(hit.tierIds) ? [...hit.tierIds] : [],
    defaultTierId: String(hit.defaultTierId ?? ""),
    emptyRequirements: hit.emptyRequirements === true,
    requirements: (Array.isArray(hit.requirements) ? hit.requirements : []).map(
      (requirement) => ({
        code: String(requirement.code ?? ""),
        level: String(requirement.level ?? ""),
        factorName: String(requirement.factorName ?? ""),
        factorLevel: String(requirement.factorLevel ?? ""),
        actualOrder: Number(requirement.actualOrder ?? 0) || 0,
        needOrder: Number(requirement.needOrder ?? 0) || 0,
        met: requirement.met === true,
        gap: Number(requirement.gap ?? 0) || 0,
        levelDisabled: requirement.levelDisabled === true,
        factorMissing: requirement.factorMissing === true,
      }),
    ),
  }));

  const recommendationItems: TalentDirectionPreviewRecommendationItem[] =
    matched.recommended.map((item) => ({
      directionId: String(item.directionId ?? ""),
      code: String(item.code ?? ""),
      name: String(item.name ?? ""),
      hitCount: Number(item.hitCount ?? 0) || 0,
      total: Number(item.total ?? 0) || 0,
      hitRate: Number(item.hitRate ?? 0) || 0,
      fallback: item.fallback === true,
    }));

  return {
    reportId: String(report.id ?? ""),
    reportNo: String(report.reportNo ?? ""),
    status: String(report.status ?? ""),
    snapshotVersion: Number(report.snapshotVersion ?? 0) || 0,
    hasSnapshot: hasTalentReportSnapshot(report),
    factorCount: factorSnapshot.length,
    totalDirections: Number(matched.totalDirections ?? 0) || 0,
    evaluatedDirections: Number(matched.evaluatedDirections ?? 0) || 0,
    noDirections: matched.noDirections === true,
    recommendation: {
      items: recommendationItems,
      fallback: matched.fallback === true,
      totalCandidates: Number(matched.evaluatedDirections ?? 0) || 0,
      emptyReason:
        (matched.emptyReason as TalentDirectionEmptyReason | null | undefined) ??
        null,
      recommendLimit: Number(matched.recommendLimit ?? 0) || 0,
    },
    hits,
    warnings: matched.warnings.map((warning) => ({
      code: warning.code,
      directionId: warning.directionId,
      factorCode: warning.factorCode,
      message: String(warning.message ?? ""),
    })),
    generatedAt: new Date().toISOString(),
  };
}

// ── 只读查询辅助（测试 / 后台页面复用） ─────────────────────────────────────

/** 当前启用档位（只读 M1；不写）。 */
export async function listEnabledTalentTiers(pb: PocketBase): Promise<
  Array<{
    id: string;
    code: string;
    name: string;
    sortOrder: number;
    teacher: string;
    freq: string;
    isDefault: boolean;
  }>
> {
  const rows = await pb
    .collection("talent_tiers")
    .getFullList<{
      id: string;
      code?: string;
      name?: string;
      sortOrder?: number;
      teacher?: string;
      freq?: string;
      status?: string;
      isDefault?: boolean;
    }>({ sort: "sortOrder", $autoCancel: false });
  return rows
    .filter((row) => String(row.status ?? "") === "1")
    .map((row) => ({
      id: String(row.id ?? ""),
      code: String(row.code ?? ""),
      name: String(row.name ?? ""),
      sortOrder: Number(row.sortOrder ?? 0) || 0,
      teacher: String(row.teacher ?? ""),
      freq: String(row.freq ?? ""),
      isDefault: row.isDefault === true,
    }));
}

/** 供路由测试复用的查询参数读取（Nuxt 环境下等价 getQuery）。 */
export function readTalentDirectionQuery(event: unknown): Record<string, unknown> {
  try {
    return (getQuery(event as never) ?? {}) as Record<string, unknown>;
  } catch {
    return {};
  }
}