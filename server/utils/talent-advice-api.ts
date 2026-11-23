/**
 * @description M5-B 培育建议域 API 服务层：9 条后台路由清单 / 权限码映射、列表 15 列读模型
 *   （5 项检索 AND + `versionId` 版本视图 + 分页默认 20 / 上限 100）、CSV 导出、
 *   M3 报告详情第 4 页签挂载数据参数解析、静态段优先守卫，以及路由共用 Zod schema。
 *   领域计算全部复用 M5-A（`talent-advice.ts` / `talent-advice-source.ts`）：
 *   发布 / 撤回 / 接收新版 / 版本历史 / 建议书详情 / 按人历史都只调用领域函数，本文件不重复实现状态机。
 *   口径见 docs/specs/M5-advice/spec.md §4/§5 与 ADR 0005-D1–D4：
 *   - 只有 9 条后台路由；不提供正文编辑、新建、删除、版本编辑/回切、按册补发；
 *   - 「回到当前生效版」是纯前端查看态（不传 `versionId`），服务端没有任何切换生效版本的写接口；
 *   - 响应只含脱敏 / 冻结字段：不返回 `sections`（列表）/ `idNoHash` / 明文证件号。
 * @file server/utils/talent-advice-api.ts
 */
import { createError } from "h3";
import type { H3Event } from "h3";
import { z } from "zod";
import type {
  TalentAdviceDocListRow,
  TalentAdviceDocRecord,
  TalentAdviceReceiveResult,
  TalentAdviceSubjectAdvice,
  TalentAdviceVersionHistory,
  TalentAdviceViewingVersion,
} from "~~/shared/types/talent-advice";
import type {
  TalentChildRecord,
  TalentParentRecord,
} from "~~/shared/types/talent-member";
import type { TalentReportRecord } from "~~/shared/types/talent-report";
import { hashTalentMemberIdNo } from "./talent-member-crypto";
import {
  createTalentAdviceStore,
  isTalentAdviceClientVisible,
  listTalentAdviceForSubject,
  listTalentAdviceVersions,
  resolveTalentAdviceViewingVersion,
  sanitizeTalentAdviceDocRecord,
  type TalentAdviceStore,
} from "./talent-advice";
import { encodeTalentCsv } from "./talent-csv-format";

// ── 路由清单与权限码（spec §5.2 / §2.2） ─────────────────────────────────

/** 权威权限码：1 个 C 菜单码（`list`，M2.0 既有行复用）+ 4 个新增 F 码。 */
export const TALENT_ADVICE_PERMISSION_CODES = [
  "talent:advice:list",
  "talent:advice:view",
  "talent:advice:sync",
  "talent:advice:publish",
  "talent:advice:export",
] as const;
export type TalentAdvicePermissionCode =
  (typeof TALENT_ADVICE_PERMISSION_CODES)[number];

export interface TalentAdviceAdminRoute {
  method: "GET" | "POST";
  /** HTTP 路径（spec §5.2 表格口径，不含 baseURL）。 */
  path: string;
  /** 相对 `server/api/admin/talent/` 的路由文件（嵌套动作按文件聚合，见各文件头注释）。 */
  file: string;
  /** 聚合文件内的动作键（`[id]/[action].get|post.ts`）；独立文件为空。 */
  action?: string;
  permission: TalentAdvicePermissionCode;
  /** 是否写 `oper_logs`（仅导出与 3 个写动作）。 */
  audit: boolean;
  description: string;
}

/** 9 条后台路由（spec §5.2 #1–#9）。C 端 `GET /api/client/talent/advice` 归 M7，不在此表。 */
export const TALENT_ADVICE_ADMIN_ROUTES: readonly TalentAdviceAdminRoute[] = [
  {
    method: "GET",
    path: "/api/admin/talent/advice",
    file: "advice/index.get.ts",
    permission: "talent:advice:list",
    audit: false,
    description: "建议列表（15 列 / 5 项检索 / versionId 版本视图 / 分页）",
  },
  {
    method: "GET",
    path: "/api/admin/talent/advice/:id",
    file: "advice/[id].get.ts",
    permission: "talent:advice:view",
    audit: false,
    description: "建议书详情（信息条 + 按分册分组四段）",
  },
  {
    method: "GET",
    path: "/api/admin/talent/advice/versions",
    file: "advice/versions/index.get.ts",
    permission: "talent:advice:view",
    audit: false,
    description: "版本历史（份数 / 发布 / 撤回统计）",
  },
  {
    method: "GET",
    path: "/api/admin/talent/advice/:id/history",
    file: "advice/[id]/[action].get.ts",
    action: "history",
    permission: "talent:advice:view",
    audit: false,
    description: "按人历史版本（同一 reportNo 跨版本快照）",
  },
  {
    method: "GET",
    path: "/api/admin/talent/advice/subject",
    file: "advice/subject.get.ts",
    permission: "talent:advice:view",
    audit: false,
    description: "M3 报告详情第 4 页签挂载数据（按 subjectType+subjectId 或 reportId）",
  },
  {
    method: "GET",
    path: "/api/admin/talent/advice/export",
    file: "advice/export.get.ts",
    permission: "talent:advice:export",
    audit: true,
    description: "CSV 导出（跟随当前筛选与版本视图）",
  },
  {
    method: "POST",
    path: "/api/admin/talent/advice/:id/publish",
    file: "advice/[id]/[action].post.ts",
    action: "publish",
    permission: "talent:advice:publish",
    audit: true,
    description: "发布（仅当前生效版本可操作）",
  },
  {
    method: "POST",
    path: "/api/admin/talent/advice/:id/withdraw",
    file: "advice/[id]/[action].post.ts",
    action: "withdraw",
    permission: "talent:advice:publish",
    audit: true,
    description: "撤回（仅当前生效版本可操作，C 端立即不可见）",
  },
  {
    method: "POST",
    path: "/api/admin/talent/advice/versions",
    file: "advice/versions/index.post.ts",
    permission: "talent:advice:sync",
    audit: true,
    description: "接收新一版（新版本生效 / 旧版本归档 / 失败补偿）",
  },
];

/** 与 `[id]` 同层但必须由静态路由处理的段（静态优先守卫；spec §5.7）。 */
export const TALENT_ADVICE_STATIC_SEGMENTS = [
  "versions",
  "subject",
  "export",
] as const;

// ── 路由共用 Zod schema（失败统一 422；spec §5.3） ─────────────────────────

const talentAdviceIsoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式必须为 YYYY-MM-DD");

/** #9 接收新一版：`effectiveAt` 必填；`versionNo` 缺省 `V{YYYY}.{MM}`；`note` 缺省服务端生成。 */
export const talentAdviceReceiveSchema = z.object({
  effectiveAt: talentAdviceIsoDate,
  versionNo: z
    .string()
    .trim()
    .min(1, "版本号不能为空")
    .max(40, "版本号不能超过 40 个字符")
    .optional(),
  note: z.string().trim().max(500, "同步说明不能超过 500 个字符").optional(),
});

/** #8 撤回：原因可选，仅写入 `oper_logs` 摘要，不改正文。 */
export const talentAdviceWithdrawSchema = z.object({
  reason: z.string().trim().max(200, "撤回原因不能超过 200 个字符").optional(),
});

// ── 列表分页 / 检索格式（spec §5.1 / §5.3 / §6.1） ────────────────────────

/** 列表默认每页 20 / 上限 100（BR-13）。 */
export const TALENT_ADVICE_DEFAULT_PAGE_SIZE = 20;
export const TALENT_ADVICE_MAX_PAGE_SIZE = 100;

export interface TalentAdviceListQuery {
  adviceNo: string;
  name: string;
  idNo: string;
  reportNo: string;
  /** 精确周岁（整数）；`null` 表示不筛选（AC-ADM-07-2 精确相等，不支持区间）。 */
  age: number | null;
  versionId: string;
  page: number;
  pageSize: number;
}

function invalidTalentAdviceQuery(
  message: string,
  code = "VALIDATION_ERROR",
): ReturnType<typeof createError> {
  return createError({ statusCode: 422, message, data: { code } });
}

export function normalizeTalentAdvicePagination(query: {
  page?: unknown;
  pageSize?: unknown;
}): { page: number; pageSize: number } {
  const rawPage = Number(query.page);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const rawPageSize = Number(query.pageSize);
  const pageSize =
    Number.isFinite(rawPageSize) && rawPageSize > 0
      ? Math.min(TALENT_ADVICE_MAX_PAGE_SIZE, Math.floor(rawPageSize))
      : TALENT_ADVICE_DEFAULT_PAGE_SIZE;
  return { page, pageSize };
}

/**
 * 解析列表 query：5 项检索（建议编号 / 姓名 / 身份证 / 报告编号 / 年龄）+ `versionId` + 分页。
 * 身份证只允许 4 位（脱敏列包含匹配）或 18 位（`idNoHash` 精确匹配），其它长度 422；
 * 年龄只接受 0–100 整数（`"7岁"` / `"7-8"` → 422）。
 */
export function parseTalentAdviceListQuery(
  raw: Record<string, unknown> = {},
): TalentAdviceListQuery {
  const adviceNo = String(raw.adviceNo ?? "").trim();
  if (adviceNo.length > 80) throw invalidTalentAdviceQuery("建议编号不能超过 80 个字符");
  const name = String(raw.name ?? "").trim();
  if (name.length > 50) throw invalidTalentAdviceQuery("姓名不能超过 50 个字符");
  const reportNo = String(raw.reportNo ?? "").trim();
  if (reportNo.length > 64) throw invalidTalentAdviceQuery("报告编号不能超过 64 个字符");
  const versionId = String(raw.versionId ?? "").trim();
  if (versionId.length > 64) throw invalidTalentAdviceQuery("版本参数不正确");
  const idNo = String(raw.idNo ?? "").trim();
  if (idNo && !/^(?:\d{4}|\d{17}[\dXx])$/.test(idNo))
    throw invalidTalentAdviceQuery(
      "身份证检索应为前 4 / 后 4 位或完整 18 位",
      "INVALID_ID_NO_LENGTH",
    );
  const ageText = String(raw.age ?? "").trim();
  let age: number | null = null;
  if (ageText) {
    if (!/^\d{1,3}$/.test(ageText) || Number(ageText) > 100)
      throw invalidTalentAdviceQuery("年龄必须为 0–100 的整数（精确周岁）");
    age = Number(ageText);
  }
  const { page, pageSize } = normalizeTalentAdvicePagination(raw);
  return { adviceNo, name, idNo, reportNo, age, versionId, page, pageSize };
}

// ── 列表读模型（spec §5.4.1） ─────────────────────────────────────────────

export interface TalentAdviceListResult {
  rows: TalentAdviceDocListRow[];
  total: number;
  page: number;
  pageSize: number;
  viewing: TalentAdviceViewingVersion | null;
}

interface TalentAdviceQueryResult {
  query: TalentAdviceListQuery;
  viewing: TalentAdviceViewingVersion | null;
  activeVersionId: string;
  /** 当前版本视图下命中筛选的全部建议行（已排序，未分页）。 */
  docs: TalentAdviceDocRecord[];
}

function matchesTalentAdviceListQuery(
  doc: TalentAdviceDocRecord,
  query: TalentAdviceListQuery,
  idNoHash: string,
): boolean {
  if (query.adviceNo && !String(doc.adviceNo ?? "").includes(query.adviceNo))
    return false;
  if (query.name && !String(doc.name ?? "").includes(query.name)) return false;
  if (query.reportNo && !String(doc.reportNo ?? "").includes(query.reportNo))
    return false;
  if (query.idNo) {
    if (query.idNo.length === 18) {
      if (String(doc.idNoHash ?? "") !== idNoHash) return false;
    } else if (!String(doc.maskedIdNo ?? "").includes(query.idNo)) {
      return false;
    }
  }
  if (query.age !== null && Math.trunc(Number(doc.age) || 0) !== query.age)
    return false;
  return true;
}

/** 取指定版本（缺省当前生效版）下命中筛选的建议行；`versionId` 不存在 → 404。 */
async function queryTalentAdviceDocs(
  rawQuery: Record<string, unknown>,
  store: TalentAdviceStore,
): Promise<TalentAdviceQueryResult> {
  const query = parseTalentAdviceListQuery(rawQuery);
  const versions = await store.listVersions();
  const activeVersionId =
    versions.find((version) => version.status === "active")?.id ?? "";
  const viewing = resolveTalentAdviceViewingVersion(versions, query.versionId);
  if (!viewing)
    return { query, viewing: null, activeVersionId, docs: [] };
  // 列表读模型只取 15 列字段（不读 sections）；假实现没有该可选方法时回退全量读取。
  const docs = store.listDocRowsByVersion
    ? await store.listDocRowsByVersion(viewing.versionId)
    : await store.listDocsByVersion(viewing.versionId);
  const idNoHash = query.idNo.length === 18 ? hashTalentMemberIdNo(query.idNo) : "";
  const filtered = docs.filter((doc) =>
    matchesTalentAdviceListQuery(doc, query, idNoHash),
  );
  // 列表默认 `-syncedAt`，同值按 `adviceNo` 升序（稳定、可复现；spec §5.1）。
  filtered.sort((left, right) => {
    const bySyncedAt = String(right.syncedAt ?? "").localeCompare(
      String(left.syncedAt ?? ""),
    );
    if (bySyncedAt !== 0) return bySyncedAt;
    return String(left.adviceNo ?? "").localeCompare(String(right.adviceNo ?? ""));
  });
  return { query, viewing, activeVersionId, docs: filtered };
}

/** 为列表页行补派生可见性（报告三态 × 建议两态 × 归属，读取时派生、不落库）。 */
async function buildTalentAdviceListRows(
  docs: readonly TalentAdviceDocRecord[],
  store: TalentAdviceStore,
  activeVersionId: string,
): Promise<TalentAdviceDocListRow[]> {
  const reportCache = new Map<string, TalentReportRecord | null>();
  const parentCache = new Map<string, TalentParentRecord | null>();
  const childCache = new Map<string, TalentChildRecord | null>();

  const loadReport = async (id: string): Promise<TalentReportRecord | null> => {
    if (!id) return null;
    if (!reportCache.has(id)) reportCache.set(id, await store.getReportById(id));
    return reportCache.get(id) ?? null;
  };
  const loadParent = async (id: string): Promise<TalentParentRecord | null> => {
    if (!id) return null;
    if (!parentCache.has(id)) parentCache.set(id, await store.getParentById(id));
    return parentCache.get(id) ?? null;
  };
  const loadChild = async (id: string): Promise<TalentChildRecord | null> => {
    if (!id) return null;
    if (!childCache.has(id)) childCache.set(id, await store.getChildById(id));
    return childCache.get(id) ?? null;
  };

  const rows: TalentAdviceDocListRow[] = [];
  for (const doc of docs) {
    const report = await loadReport(String(doc.reportId ?? ""));
    const parent = await loadParent(String(doc.parentId ?? ""));
    const child =
      doc.subjectType === "child" ? await loadChild(String(doc.subjectId ?? "")) : null;
    const clientVisible = isTalentAdviceClientVisible({
      doc,
      activeVersionId,
      report,
      parent,
      child,
    });
    rows.push(
      sanitizeTalentAdviceDocRecord(doc, { clientVisible, activeVersionId }),
    );
  }
  return rows;
}

/** #1 列表：15 列数据 + 5 项检索 AND + 版本视图 + 分页；`viewing.isCurrent=false` 即历史只读。 */
export async function listTalentAdviceDocs(
  rawQuery: Record<string, unknown> = {},
  store: TalentAdviceStore = createTalentAdviceStore(),
): Promise<TalentAdviceListResult> {
  const { query, viewing, activeVersionId, docs } = await queryTalentAdviceDocs(
    rawQuery,
    store,
  );
  if (!viewing)
    return {
      rows: [],
      total: 0,
      page: query.page,
      pageSize: query.pageSize,
      viewing: null,
    };
  const start = (query.page - 1) * query.pageSize;
  const pageDocs = docs.slice(start, start + query.pageSize);
  return {
    rows: await buildTalentAdviceListRows(pageDocs, store, activeVersionId),
    total: docs.length,
    page: query.page,
    pageSize: query.pageSize,
    viewing,
  };
}

// ── 导出（spec §5.4.7） ───────────────────────────────────────────────────

/** 单次导出上限（超出 422 `ADVICE_EXPORT_TOO_LARGE`，提示收窄筛选）。 */
export const TALENT_ADVICE_EXPORT_MAX_ROWS = 10000;

/** CSV 15 列（顺序与列表 15 列一致，末列补「撤回时间」）。 */
export const TALENT_ADVICE_EXPORT_HEADERS = [
  "建议编号",
  "版本",
  "本人",
  "身份证",
  "性别",
  "出生日期",
  "年龄",
  "基因报告",
  "基因篇数",
  "分册",
  "覆盖要素",
  "数据熵",
  "发布状态",
  "同步时间",
  "撤回时间",
] as const;

export function assertTalentAdviceExportSize(total: number): void {
  if (total > TALENT_ADVICE_EXPORT_MAX_ROWS)
    throw createError({
      statusCode: 422,
      message: `导出最多 ${TALENT_ADVICE_EXPORT_MAX_ROWS} 行，请收窄筛选`,
      data: { code: "ADVICE_EXPORT_TOO_LARGE" },
    });
}

export function buildTalentAdviceExportCsv(
  rows: readonly TalentAdviceDocListRow[],
): string {
  return encodeTalentCsv(
    [...TALENT_ADVICE_EXPORT_HEADERS],
    rows.map((row) => [
      row.adviceNo,
      row.versionName,
      row.name,
      row.maskedIdNo || "—",
      row.genderLabel,
      row.birthday,
      row.ageLabel,
      row.reportNo,
      row.geneBookCountLabel,
      row.books,
      row.coveredFactorText,
      row.entropyText,
      row.publishStatusLabel,
      row.syncedAt,
      row.withdrawnAt,
    ]),
  );
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** 导出文件名 `培育建议-{versionNo}-{YYYYMMDDHHmm}.csv`（时间取 UTC，避免本地时区漂移）。 */
export function talentAdviceExportFileName(
  versionNo: string,
  at: Date = new Date(),
): string {
  const stamp = `${at.getUTCFullYear()}${pad2(at.getUTCMonth() + 1)}${pad2(
    at.getUTCDate(),
  )}${pad2(at.getUTCHours())}${pad2(at.getUTCMinutes())}`;
  return `培育建议-${versionNo || "全部版本"}-${stamp}.csv`;
}

export function talentAdviceDownloadHeaders(event: H3Event, fileName: string): void {
  setHeader(event, "content-type", "text/csv; charset=utf-8");
  setHeader(
    event,
    "content-disposition",
    `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
  );
}

export interface TalentAdviceExportResult {
  csv: string;
  rows: number;
  fileName: string;
  versionNo: string;
  viewing: TalentAdviceViewingVersion | null;
}

/** #6 导出：跟随当前筛选与 `versionId`（历史版本导出历史数据），CSV 带 BOM。 */
export async function exportTalentAdviceCsv(
  rawQuery: Record<string, unknown> = {},
  options: { store?: TalentAdviceStore; now?: Date } = {},
): Promise<TalentAdviceExportResult> {
  const store = options.store ?? createTalentAdviceStore();
  const { viewing, activeVersionId, docs } = await queryTalentAdviceDocs(
    rawQuery,
    store,
  );
  assertTalentAdviceExportSize(docs.length);
  const rows = await buildTalentAdviceListRows(docs, store, activeVersionId);
  const versionNo = viewing?.versionName ?? "";
  return {
    csv: buildTalentAdviceExportCsv(rows),
    rows: rows.length,
    fileName: talentAdviceExportFileName(versionNo, options.now ?? new Date()),
    versionNo,
    viewing,
  };
}

// ── M3 报告详情第 4 页签挂载数据（spec §7.4） ─────────────────────────────

export interface TalentAdviceSubjectQuery {
  subjectType: "child" | "self";
  subjectId: string;
}

/**
 * 解析 `GET /advice/subject` 参数：spec §7.4 用 `subjectType + subjectId`；
 * 也接受 `reportId`（M3 报告详情已有该字段，服务端反查 subjectType/subjectId，避免 M3 重复解析）。
 */
export async function resolveTalentAdviceSubjectQuery(
  raw: Record<string, unknown> = {},
  store: TalentAdviceStore = createTalentAdviceStore(),
): Promise<TalentAdviceSubjectQuery> {
  const reportId = String(raw.reportId ?? "").trim();
  if (reportId) {
    const report = await store.getReportById(reportId);
    if (!report)
      throw createError({
        statusCode: 404,
        message: "报告不存在",
        data: { code: "NOT_FOUND" },
      });
    return {
      subjectType: report.subjectType === "self" ? "self" : "child",
      subjectId: String(report.subjectId ?? ""),
    };
  }
  const subjectType = String(raw.subjectType ?? "").trim();
  const subjectId = String(raw.subjectId ?? "").trim();
  if (subjectType !== "child" && subjectType !== "self")
    throw invalidTalentAdviceQuery("subjectType 必须为 child 或 self");
  if (!subjectId) throw invalidTalentAdviceQuery("subjectId 不能为空");
  return { subjectType, subjectId };
}

/** #5 报告详情第 4 页签：当前生效版建议覆盖册与状态（不返回 sections 全量）。 */
export async function loadTalentAdviceSubjectAdvice(
  rawQuery: Record<string, unknown> = {},
  store: TalentAdviceStore = createTalentAdviceStore(),
): Promise<TalentAdviceSubjectAdvice> {
  const { subjectType, subjectId } = await resolveTalentAdviceSubjectQuery(
    rawQuery,
    store,
  );
  return listTalentAdviceForSubject(subjectType, subjectId, store);
}

// ── 路由参数解析与静态段优先守卫（spec §5.7） ─────────────────────────────

export interface TalentAdviceRouteEventLike {
  path?: string;
  context?: { params?: Record<string, string | undefined> };
}

export function talentAdviceRouteSegments(
  event: TalentAdviceRouteEventLike,
): string[] {
  const path = String(event?.path ?? "").split("?")[0] ?? "";
  return path.split("/").filter(Boolean);
}

/**
 * 取 `advice` 后的第一段（`[id]` / `[id]/history` / `[id]/publish` 共用）：
 * 优先 router param，缺失时用 path 兜底（Nitro 静态无匹配方法回落到动态路由时 params 可能为空）。
 */
export function resolveTalentAdviceRouteId(
  event: TalentAdviceRouteEventLike,
  paramName = "id",
): string {
  const param = String(event?.context?.params?.[paramName] ?? "").trim();
  if (param) return param;
  const segments = talentAdviceRouteSegments(event);
  const index = segments.lastIndexOf("advice");
  return index >= 0 ? String(segments[index + 1] ?? "").trim() : "";
}

/** 取 `[action]` 段：优先 router param，缺失时用 path 末段兜底。 */
export function resolveTalentAdviceRouteAction(
  event: TalentAdviceRouteEventLike,
  paramName = "action",
): string {
  const param = String(event?.context?.params?.[paramName] ?? "").trim();
  if (param) return param;
  const segments = talentAdviceRouteSegments(event);
  return String(segments.at(-1) ?? "").trim();
}

function createTalentAdviceMethodNotAllowed(path: string) {
  return createError({
    statusCode: 405,
    message: `请求方法不支持：${path}`,
  });
}

/**
 * 静态段优先双保险：`versions` / `subject` / `export` 只能由静态路由处理，
 * 即使 Nitro 回落到 `[id].get.ts` 也不能把它们当成建议书 id（spec §5.7）。
 */
export function assertTalentAdviceDetailSegment(segment: unknown): string {
  const id = String(segment ?? "").trim();
  if (!id) throw createError({ statusCode: 404, message: "建议书不存在" });
  if ((TALENT_ADVICE_STATIC_SEGMENTS as readonly string[]).includes(id))
    throw createTalentAdviceMethodNotAllowed(`/api/admin/talent/advice/${id}`);
  return id;
}

// ── 审计摘要（只含编号 / 版本 / 姓名，不含正文与证件号；spec §2.4 / §4.2） ──

export function talentAdviceDocAuditSummary(
  doc: Partial<Pick<TalentAdviceDocRecord, "adviceNo" | "name">> | null,
  versionNo: string,
): string {
  return [doc?.adviceNo, versionNo, doc?.name]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" · ");
}

export function talentAdviceReceiveAuditSummary(
  result: TalentAdviceReceiveResult,
): string {
  return `${result.version.versionNo} 生效，新建 ${result.docCount} 份，暂无 ${result.emptyCount} 人，失败 ${result.failedCount} 人`;
}

/** 版本历史（#3）与服务层同口径，仅为路由收口类型。 */
export async function loadTalentAdviceVersionHistory(
  store: TalentAdviceStore = createTalentAdviceStore(),
): Promise<TalentAdviceVersionHistory> {
  return listTalentAdviceVersions(store);
}