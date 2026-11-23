/**
 * @description M7 C 端 API 服务端投影与守卫：把 M2 会员（parent/child 归属、加密脱敏）、
 *   M3 报告冻结快照（report/volume/factor）、M4 方向快照（推荐/已选/自填）、M5 建议快照
 *   投影成 `apps/client/src/api/talent-types.ts` 的 C 端契约；写接口复用 M2/M4 既有服务函数，
 *   不重写归属判断、不重算快照、不改 M3/M4/M5 内部语义。
 *
 *   口径见 docs/specs/M7-c-end/spec.md §10（API 契约 / 守卫 / 越权口径）、
 *   M3 spec §7、M4 spec §5.3.5–§5.3.8/§7、M5 spec §7、M2 spec §7、ADR 0007。
 * @file server/utils/talent-client-api.ts
 */
import { createError, readBody } from "h3";
import type PocketBase from "pocketbase";
import { z } from "zod";
import {
  TALENT_CHILD_RELATIONS,
  TALENT_MEMBER_GENDER_LABELS,
  TALENT_QUERY_REASON_LABELS,
  type TalentChildQuery,
  type TalentChildRecord,
  type TalentMemberChildView,
  type TalentMemberParentView,
  type TalentParentRecord,
  type TalentQueryReason,
} from "~~/shared/types/talent-member";
import type { TalentDirection } from "~~/shared/types/talent-rule";
import {
  TALENT_DIRECTION_MANUAL_NAME_MAX,
  TALENT_DIRECTION_RECOMMEND_LIMIT,
  TALENT_DIRECTION_SELECTION_LIMIT,
  type TalentDirectionSelectionResult,
  type TalentSelectionItem,
} from "~~/shared/types/talent-direction";
import type {
  TalentReportRecord,
  TalentReportSubjectType,
  TalentReportVolumeId,
} from "~~/shared/types/talent-report";
import {
  TALENT_REPORT_STATUS_LABELS,
  TALENT_REPORT_VOLUME_DEFINITIONS,
} from "~~/shared/types/talent-report";
import type { TalentAdviceDocRecord } from "~~/shared/types/talent-advice";
import type {
  TalentClientAccountState,
  TalentClientAdviceBook,
  TalentClientAdviceResponse,
  TalentClientChildInput,
  TalentClientChildItem,
  TalentClientChildrenResponse,
  TalentClientDirectionsResponse,
  TalentClientDirectionItem,
  TalentClientDirectionTier,
  TalentClientFactorResponse,
  TalentClientProfileInput,
  TalentClientProfileResponse,
  TalentClientReportOverviewResponse,
  TalentClientReportStatus,
  TalentClientSelectionItem,
  TalentClientSelectionMutationResponse,
  TalentClientSummaryResponse,
  TalentClientSummarySubject,
  TalentClientVolumeResponse,
  TalentClientVolumeSummary,
  TalentClientVolumeFactor,
  TalentClientVolumeState,
} from "~~/shared/types/talent-client";
import { getCurrentUserBasic } from "./auth";
import { pocketBaseFileUrl } from "./file-url";
import { escapeFilterValue } from "./pocketbase-client";
import { calculateTalentAge } from "./talent-age";
import {
  assertTalentChildAccess,
  countTalentMemberReports,
  isTalentParentActive,
  resolveTalentParentByUserId,
  sanitizeTalentChildRecord,
  sanitizeTalentParentRecord,
} from "./talent-member";
import {
  createTalentMemberChild,
  getTalentMemberBindings,
  updateTalentMember,
  updateTalentMemberChild,
} from "./talent-member-api";
import {
  getTalentReportOrThrow,
  assertTalentReportPublished,
  listTalentReportOpenVolumes,
} from "./talent-report";
import {
  getTalentReportVolumeDefinition,
  normalizeTalentReportVolumeIds,
} from "./talent-report-snapshot";
import {
  buildManualDirectionOptions,
  recommendDirections,
} from "./talent-direction-match";
import { listEnabledTalentTiers } from "./talent-direction-api";
import { resolveTalentReportDirectionSelection } from "./talent-direction-selection";
import {
  createTalentAdviceStore,
  getActiveTalentAdviceVersion,
  getTalentAdviceClientSnapshot,
  normalizeTalentAdviceBooks,
} from "./talent-advice";
import { getSiteConfig } from "./site-service";
import { resolveProfileAvatarAction } from "./profile-avatar";
import {
  markTalentChildQueryFailed,
  submitTalentChildQuery,
} from "./talent-member-query";

// ── 常量：状态文案（§11.2，不得改写）与上限 ─────────────────────────────────

/** C 端状态文案（PRD §7.10 / M7 spec §11.2）；页面不自行拼装。 */
export const TALENT_CLIENT_STATUS_TEXTS = {
  reportReady: (count: number) => `${Math.max(0, count)} 个分册可读`,
  reportPending: "报告整理中",
  reportRetracted: "报告内容更新中",
  reportSyncing: "报告待同步",
  noReport: "该对象暂无基因报告",
  querying: "结果查询中",
  notFound: "信息待核对",
  unqueried: "尚未查询",
  adviceEmpty: "暂未收到培育建议",
} as const;

/** C 端 404 统一文案：不区分「不存在」与「无权限」，不泄露存在性。 */
export const TALENT_CLIENT_NOT_FOUND_TEXT = "内容不可查看";

/** C 端登录态要求的家长档案解析失败文案。 */
export const TALENT_CLIENT_UNBOUND_TEXT = "未绑定会员档案";

/** 固定六册总数。 */
export const TALENT_CLIENT_TOTAL_VOLUME_COUNT =
  TALENT_REPORT_VOLUME_DEFINITIONS.length;

// ── 统一错误：404 不泄露存在性 / 409 状态冲突 / 422 校验 ─────────────────────

/** 越权 / 不存在 / 未绑定 / 已解绑 / 停用统一 404。 */
export function notFoundTalentClient(message = TALENT_CLIENT_NOT_FOUND_TEXT) {
  return createError({
    statusCode: 404,
    message,
    data: { code: "NOT_FOUND" },
  });
}

/** 分册不存在 / 未开放 / 越权统一 404（不泄露存在性；C 端提示「分册未开放」）。 */
export function notFoundTalentClientVolume() {
  return createError({
    statusCode: 404,
    message: "分册未开放",
    data: { code: "VOLUME_NOT_FOUND" },
  });
}

/** 409 状态冲突（报告未发布 / 已撤回沿用 M3 的 code + state）。 */
export function conflictTalentClient(message: string, code: string, state = "") {
  return createError({
    statusCode: 409,
    message,
    data: state ? { code, state } : { code },
  });
}

/** 422 字段级校验。 */
export function invalidTalentClient(message: string, code = "VALIDATION_ERROR") {
  return createError({ statusCode: 422, message, data: { code } });
}

/** 把 M3/M5 冻结守卫的错误统一成 C 端口径：404 文案「内容不可查看」，409 保留 code/state。 */
export function normalizeTalentClientGuardError(error: unknown): never {
  const candidate = error as {
    statusCode?: number;
    status?: number;
    message?: string;
    data?: { code?: unknown; state?: unknown };
  };
  const statusCode = Number(candidate?.statusCode ?? candidate?.status ?? 0);
  if (statusCode === 404) {
    throw createError({
      statusCode: 404,
      message: TALENT_CLIENT_NOT_FOUND_TEXT,
      data: { code: String(candidate?.data?.code || "REPORT_NOT_FOUND") },
    });
  }
  if (statusCode === 409) {
    throw createError({
      statusCode: 409,
      message: String(candidate?.message || TALENT_CLIENT_STATUS_TEXTS.reportPending),
      data: {
        code: String(candidate?.data?.code || "REPORT_STATE_CONFLICT"),
        state: String(candidate?.data?.state || ""),
      },
    });
  }
  throw error;
}

// ── Zod 校验（422 + data.code=VALIDATION_ERROR） ────────────────────────────

/** 读取并校验请求体；失败统一 422 `VALIDATION_ERROR` + issues。 */
export async function validateTalentClientBody<T extends z.ZodTypeAny>(
  event: unknown,
  schema: T,
): Promise<z.infer<T>> {
  const raw = await readBody(event as never).catch(() => null);
  const parsed = schema.safeParse(raw ?? {});
  if (!parsed.success) {
    throw createError({
      statusCode: 422,
      message: parsed.error.issues[0]?.message || "请求参数不正确",
      data: { code: "VALIDATION_ERROR", issues: parsed.error.issues },
    });
  }
  return parsed.data;
}

/** `PUT /profile`：手机号只读，不接收；身份证留空 = 不修改。 */
export const talentClientProfileSchema = z
  .object({
    name: z.string().trim().min(1, "请填写姓名").max(50, "姓名不能超过 50 个字符").optional(),
    nickname: z
      .string()
      .trim()
      .min(1, "请填写昵称")
      .max(20, "昵称不能超过 20 个字符")
      .optional(),
    avatar: z.string().max(2048).optional(),
    gender: z.enum(["male", "female"], { message: "性别不合法" }).optional(),
    birthday: z.string().trim().max(10, "出生日期格式不正确").optional(),
    idNo: z.string().trim().max(18, "身份证号格式不正确").optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "至少提交一个字段");

const talentClientChildRelationSchema = z.enum(
  [...TALENT_CHILD_RELATIONS] as [string, ...string[]],
  { message: "与孩子关系不合法" },
);

/** `POST /children`：新增孩子（身份证必填）。 */
export const talentClientChildCreateSchema = z
  .object({
    name: z.string().trim().min(1, "请填写孩子姓名").max(50, "孩子姓名不能超过 50 个字符"),
    gender: z.enum(["male", "female"], { message: "请选择性别" }),
    relation: talentClientChildRelationSchema,
    birthday: z.string().trim().min(1, "请选择出生日期").max(10),
    idNo: z.string().trim().min(1, "请填写身份证号").max(18),
  })
  .strict();

/** `PUT /children/:id`：编辑孩子（身份证留空 = 不修改）。 */
export const talentClientChildUpdateSchema = z
  .object({
    name: z.string().trim().min(1, "请填写孩子姓名").max(50, "孩子姓名不能超过 50 个字符").optional(),
    gender: z.enum(["male", "female"], { message: "请选择性别" }).optional(),
    relation: talentClientChildRelationSchema.optional(),
    birthday: z.string().trim().min(1, "请选择出生日期").max(10).optional(),
    idNo: z.string().trim().max(18, "身份证号格式不正确").optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "至少提交一个字段");

/** `POST /selections`：正式方向（directionId）或自填方向（manualName）二选一。 */
export const talentClientSelectionCreateSchema = z
  .object({
    reportId: z.string().trim().min(1, "请提供报告 id").max(64),
    directionId: z.string().trim().max(64).optional(),
    manualName: z.string().trim().max(20).optional(),
    tierId: z.string().trim().min(1, "请选择目标档位").max(64),
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.directionId && !value.manualName)
      context.addIssue({ code: "custom", message: "请选择培养方向或填写自定义方向名称" });
    if (value.directionId && value.manualName)
      context.addIssue({ code: "custom", message: "培养方向与自定义名称只能二选一" });
  });

/** `PUT /selections/:selectionId`：换档。 */
export const talentClientSelectionTierSchema = z
  .object({
    reportId: z.string().trim().min(1, "请提供报告 id").max(64),
    tierId: z.string().trim().min(1, "请选择目标档位").max(64),
  })
  .strict();

// ── 文案 / 派生纯函数 ──────────────────────────────────────────────────────

/** 性别中文标签（`` 未填）。 */
function genderLabelOf(gender: unknown): string {
  const key = String(gender ?? "");
  return (TALENT_MEMBER_GENDER_LABELS as Readonly<Record<string, string>>)[key] ?? "";
}

/** 生日 → 周岁（无生日返回 0）。 */
export function talentClientAge(birthday: unknown, now: Date = new Date()): number {
  const age = calculateTalentAge(String(birthday ?? ""), now.toISOString());
  return age === undefined ? 0 : age;
}

/** 周岁文案：`10 岁` / 空。 */
export function talentClientAgeLabel(age: number): string {
  return age > 0 ? `${age} 岁` : "";
}

/** M3 报告记录 → C 端报告状态（旧行 / 空行按「无报告」处理）。 */
export function resolveTalentClientReportStatus(
  report: Pick<TalentReportRecord, "status"> | null | undefined,
): TalentClientReportStatus {
  const status = String(report?.status ?? "");
  if (status === "published" || status === "pending_publish" || status === "retracted")
    return status;
  return "none";
}

/** 对象脚注文案（§11.2 优先级：报告状态 > 子女查询状态）。 */
export function buildTalentClientStatusText(input: {
  subjectType: TalentReportSubjectType;
  query?: TalentChildQuery | null;
  reportStatus: TalentClientReportStatus;
  readableVolumeCount?: number;
}): string {
  const reportStatus = input.reportStatus;
  if (reportStatus === "pending_publish") return TALENT_CLIENT_STATUS_TEXTS.reportPending;
  if (reportStatus === "retracted") return TALENT_CLIENT_STATUS_TEXTS.reportRetracted;
  if (reportStatus === "published") {
    const readable = Number(input.readableVolumeCount ?? 0) || 0;
    return readable > 0
      ? TALENT_CLIENT_STATUS_TEXTS.reportReady(readable)
      : TALENT_CLIENT_STATUS_TEXTS.reportPending;
  }
  if (input.subjectType === "self") return TALENT_CLIENT_STATUS_TEXTS.noReport;
  const query = String(input.query ?? "unqueried");
  if (query === "querying") return TALENT_CLIENT_STATUS_TEXTS.querying;
  if (query === "not_found") return TALENT_CLIENT_STATUS_TEXTS.notFound;
  if (query === "found") return TALENT_CLIENT_STATUS_TEXTS.reportSyncing;
  return TALENT_CLIENT_STATUS_TEXTS.unqueried;
}

/** 报告状态中文（总览信息条；C 端只用于「已发布」等中性状态名）。 */
export function talentClientReportStatusLabel(status: TalentClientReportStatus): string {
  if (status === "none") return "尚未同步";
  const labels = TALENT_REPORT_STATUS_LABELS as Readonly<Record<string, string>>;
  return labels[status] ?? "尚未同步";
}

/** 报告开放册数（发布校验保证 open ⊆ 已检测册）。 */
function readableVolumeCountOf(report: TalentReportRecord | null | undefined): number {
  if (!report) return 0;
  if (resolveTalentClientReportStatus(report) !== "published") return 0;
  return normalizeTalentReportVolumeIds(report.openVolumeIds).length;
}

/** 已选方向计数（报告 `selections[]` 为 M4 唯一写入口）。 */
function selectionCountOf(report: TalentReportRecord | null | undefined): number {
  return Array.isArray(report?.selections) ? report.selections.length : 0;
}

/** 选择上限（快照 `selectionLimit` 为权威值，缺省 3）。 */
function selectionLimitOf(report: TalentReportRecord | null | undefined): number {
  const value = Number(report?.directionSnapshot?.selectionLimit ?? 0);
  if (!Number.isFinite(value) || value <= 0) return TALENT_DIRECTION_SELECTION_LIMIT;
  return Math.min(Math.trunc(value), 50);
}

// ── 登录态（401/403 统一口径；账号停用 403 `ACCOUNT_DISABLED`） ─────────────

export interface TalentClientAccountUser {
  id: string;
  name: string;
  nickname: string;
  avatar: string;
}

/**
 * 解析当前登录账号：未登录 / token 失效 → 401（由 `getCurrentUserBasic` 抛出）；
 * `users.status="0"` → 403 `ACCOUNT_DISABLED`（C 端停用页）。
 */
export async function requireTalentClientUser(
  event: unknown,
): Promise<TalentClientAccountUser> {
  let user: Record<string, unknown>;
  try {
    user = await getCurrentUserBasic(event as never);
  } catch (error) {
    const candidate = error as { statusCode?: number; status?: number };
    const statusCode = Number(candidate?.statusCode ?? candidate?.status ?? 0);
    if (statusCode === 403)
      throw createError({
        statusCode: 403,
        message: "账号已停用",
        data: { code: "ACCOUNT_DISABLED" },
      });
    throw error;
  }
  return {
    id: String(user.id ?? ""),
    name: String(user.name ?? ""),
    nickname: String(user.nickname ?? ""),
    avatar: String(user.avatar ?? ""),
  };
}

// ── 家长解析（只按登录账号，不接受前端 parentId） ────────────────────────────

export interface TalentClientParentContext {
  parent: TalentParentRecord | null;
  accountState: TalentClientAccountState;
}

/** 按 `talent_parents.userId` 解析家长；停用 / 未绑定以 accountState 区分。 */
export async function resolveTalentClientParent(
  pb: PocketBase,
  userId: string,
): Promise<TalentClientParentContext> {
  const parent = await resolveTalentParentByUserId(pb, String(userId ?? ""));
  if (!parent) return { parent: null, accountState: "unbound" };
  if (!isTalentParentActive(parent.status))
    return { parent, accountState: "parent_disabled" };
  return { parent, accountState: "active" };
}

/**
 * 数据路由家长门禁：未绑定 / 家长停用 → 404（资源级隐藏，不泄露账号状态）。
 * 写接口（children/profile）额外用返回的 parent 做归属校验。
 */
export async function requireTalentClientParent(
  pb: PocketBase,
  userId: string,
): Promise<TalentParentRecord> {
  const context = await resolveTalentClientParent(pb, userId);
  if (context.accountState !== "active" || !context.parent)
    throw notFoundTalentClient();
  return context.parent;
}

// ── 报告归属 + 发布状态门禁（复用 M2/M3 冻结守卫） ────────────────────────────

/**
 * C 端报告访问断言：家长正常 + 报告归属一致 + 子女未解绑 → 报告；越权 404；
 * 未发布 / 已撤回 → 409（`code` + `state` 由 `assertTalentReportPublished` 提供）。
 */
export async function assertTalentClientReportAccess(
  pb: PocketBase,
  userId: string,
  reportId: unknown,
): Promise<{ parent: TalentParentRecord; report: TalentReportRecord }> {
  const parent = await requireTalentClientParent(pb, userId);
  let report: TalentReportRecord;
  try {
    report = await getTalentReportOrThrow(pb, reportId);
  } catch (error) {
    throw normalizeTalentClientGuardError(error);
  }
  const subjectType = String(report.subjectType ?? "") as TalentReportSubjectType;
  if (subjectType !== "self" && subjectType !== "child")
    throw notFoundTalentClient();
  if (String(report.parentId ?? "") !== parent.id) throw notFoundTalentClient();
  if (subjectType === "child") {
    try {
      await assertTalentChildAccess(pb, userId, String(report.subjectId ?? ""));
    } catch (error) {
      throw normalizeTalentClientGuardError(error);
    }
  }
  assertTalentReportPublished(report);
  return { parent, report };
}

// ── summary ────────────────────────────────────────────────────────────────

/** 单个对象的 summary 输入（报告与建议计数由服务端装配）。 */
export interface TalentClientSummarySubjectInput {
  subjectType: TalentReportSubjectType;
  subjectId: string;
  name: string;
  gender: "male" | "female" | "";
  genderLabel: string;
  birthday: string;
  relation: string;
  relationLabel: string;
  query: TalentChildQuery | null;
  queryReason: TalentQueryReason | "";
  report: TalentReportRecord | null;
  adviceCount: number;
  now?: Date;
}

/** 由对象输入构建 summary 对象视图（纯函数，便于单测文案与计数口径）。 */
export function buildTalentClientSummarySubject(
  input: TalentClientSummarySubjectInput,
): TalentClientSummarySubject {
  const report = input.report ?? null;
  const reportStatus = resolveTalentClientReportStatus(report);
  const readableVolumeCount = readableVolumeCountOf(report);
  const age = talentClientAge(input.birthday, input.now ?? new Date());
  return {
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    name: String(input.name ?? ""),
    gender: input.gender ?? "",
    genderLabel: String(input.genderLabel ?? ""),
    age,
    ageLabel: talentClientAgeLabel(age),
    relation: String(input.relation ?? ""),
    relationLabel: String(input.relationLabel ?? ""),
    query: input.subjectType === "child" ? (input.query ?? "unqueried") : null,
    queryReason:
      input.subjectType === "child" && input.query === "not_found"
        ? (input.queryReason ?? "")
        : "",
    reportId: report ? String(report.id ?? "") : "",
    reportStatus,
    statusText: buildTalentClientStatusText({
      subjectType: input.subjectType,
      query: input.query,
      reportStatus,
      readableVolumeCount,
    }),
    readableVolumeCount,
    totalVolumeCount: report ? TALENT_CLIENT_TOTAL_VOLUME_COUNT : 0,
    adviceCount: Math.max(0, Number(input.adviceCount ?? 0) || 0),
    selectedDirectionCount: selectionCountOf(report),
    selectionLimit: selectionLimitOf(report),
  };
}

/**
 * 构建 summary 响应（纯函数）：
 * - `unbound` / `parent_disabled` 只回账号状态 + 页脚，不返回对象；
 * - `current` 由 `currentSubjectId` 选中；非法 / 越权 → 404（不泄露存在性）。
 */
export function buildTalentClientSummary(input: {
  accountState: TalentClientAccountState;
  subjects?: TalentClientSummarySubjectInput[];
  currentSubjectId?: string;
  footer?: { copyright?: string; contactPhone?: string };
  now?: Date;
}): TalentClientSummaryResponse {
  const footer = {
    copyright: String(input.footer?.copyright ?? ""),
    contactPhone: String(input.footer?.contactPhone ?? ""),
  };
  if (input.accountState !== "active")
    return {
      accountState: input.accountState,
      subjects: [],
      currentId: "",
      current: null,
      pendingCheckCount: 0,
      footer,
    };

  const subjectInputs = Array.isArray(input.subjects) ? input.subjects : [];
  const subjects = subjectInputs.map((item) =>
    buildTalentClientSummarySubject({ ...item, now: input.now }),
  );
  const requestedId = String(input.currentSubjectId ?? "").trim();
  let current: TalentClientSummarySubject | null = subjects[0] ?? null;
  if (requestedId) {
    current = subjects.find((item) => item.subjectId === requestedId) ?? null;
    if (!current) throw notFoundTalentClient();
  }
  const pendingCheckCount = subjects.filter(
    (item) => item.subjectType === "child" && item.query !== "found",
  ).length;
  return {
    accountState: "active",
    subjects,
    currentId: current?.subjectId ?? "",
    current,
    pendingCheckCount,
    footer,
  };
}

/** 读取当前家长名下报告（按对象索引；一人一份，取最新行；旧 `error` 行忽略）。 */
async function loadTalentClientReportMap(
  pb: PocketBase,
  parentId: string,
): Promise<Map<string, TalentReportRecord>> {
  const rows = await pb
    .collection("talent_reports")
    .getFullList<TalentReportRecord>({
      filter: `parentId = "${escapeFilterValue(parentId)}"`,
      fields:
        "id,status,subjectType,subjectId,parentId,reportNo,snapshotVersion,publishedAt,openVolumeIds,selections,directionSnapshot,created",
      sort: "-created",
      $autoCancel: false,
    })
    .catch(() => [] as TalentReportRecord[]);
  const map = new Map<string, TalentReportRecord>();
  for (const row of rows) {
    const status = resolveTalentClientReportStatus(row);
    if (status === "none") continue;
    const type = String(row.subjectType ?? "") as TalentReportSubjectType;
    if (type !== "self" && type !== "child") continue;
    const key = `${type}:${String(row.subjectId ?? "")}`.trim();
    if (!key || map.has(key)) continue;
    map.set(key, row);
  }
  return map;
}

/**
 * 当前生效版已发布建议的分册数（按 `reportId` 索引；summary 的 `adviceCount`）。
 * 只读 M5 集合，不返回建议正文。
 */
export async function loadTalentClientAdviceBookCounts(
  pb: PocketBase,
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  try {
    const store = createTalentAdviceStore(pb);
    const activeVersion = await getActiveTalentAdviceVersion(store);
    if (!activeVersion) return counts;
    const rows: TalentAdviceDocRecord[] = store.listDocRowsByVersion
      ? await store.listDocRowsByVersion(activeVersion.id)
      : await store.listDocsByVersion(activeVersion.id);
    for (const row of rows) {
      if (row.publishStatus !== "published") continue;
      const reportId = String(row.reportId ?? "");
      if (!reportId || counts.has(reportId)) continue;
      const books = normalizeTalentAdviceBooks(row.books);
      counts.set(
        reportId,
        Math.max(0, Number(row.bookCount ?? books.length) || books.length),
      );
    }
  } catch {
    return counts;
  }
  return counts;
}

/**
 * `GET /summary` 服务端装配：账号状态 + 对象列表 + 当前对象 + 待核对 + 报告 / 建议计数。
 * 复用 M2 `getTalentMemberBindings` 做归属与脱敏，M5 生效版统计建议分册数。
 */
export async function loadTalentClientSummary(
  pb: PocketBase,
  userId: string,
  options: { subjectId?: string; now?: Date } = {},
): Promise<TalentClientSummaryResponse> {
  const context = await resolveTalentClientParent(pb, userId);
  const site = await getSiteConfig(pb).catch(() => ({
    copyright: "",
    contactPhone: "",
  }));
  const footer = { copyright: site.copyright, contactPhone: site.contactPhone };
  if (context.accountState !== "active" || !context.parent)
    return buildTalentClientSummary({
      accountState: context.accountState,
      footer,
      now: options.now,
    });

  const parent = context.parent;
  const bindings = await getTalentMemberBindings(pb, userId);
  const reportMap = await loadTalentClientReportMap(pb, parent.id);
  const adviceCounts = await loadTalentClientAdviceBookCounts(pb);
  const subjects: TalentClientSummarySubjectInput[] = bindings.items.map(
    (item) => {
      const subjectType = item.objectType === "self" ? "self" : "child";
      const report =
        reportMap.get(`${subjectType}:${item.id}`.trim()) ?? null;
      return {
        subjectType,
        subjectId: item.id,
        name: item.name,
        gender: item.gender,
        genderLabel: item.genderLabel,
        birthday: item.birthday,
        relation: item.relation,
        relationLabel: item.relationLabel,
        query: item.query,
        queryReason: item.queryReason,
        report,
        adviceCount: report ? (adviceCounts.get(String(report.id ?? "")) ?? 0) : 0,
      };
    },
  );
  return buildTalentClientSummary({
    accountState: "active",
    subjects,
    currentSubjectId: options.subjectId,
    footer,
    now: options.now,
  });
}

// ── 报告总览 / 分册 / 要素解读（M3 冻结快照投影） ────────────────────────────

function volumeDetected(
  report: TalentReportRecord,
  volumeId: string,
): boolean {
  const snapshotVolume = Array.isArray(report.volumeSnapshot)
    ? report.volumeSnapshot.find((volume) => String(volume.volumeId) === volumeId)
    : undefined;
  if (snapshotVolume)
    return (
      Number(snapshotVolume.factorCount ?? 0) > 0 ||
      (Array.isArray(snapshotVolume.chapters) && snapshotVolume.chapters.length > 0)
    );
  return (report.factorSnapshot ?? []).some(
    (factor) => String(factor.volumeId) === volumeId,
  );
}

/** 单册状态：`readable`（open 且有要素）/ `not_open`（已检测未开放）/ `not_detected`。 */
export function resolveTalentClientVolumeState(
  report: TalentReportRecord,
  volumeId: string,
): TalentClientVolumeState {
  const open = normalizeTalentReportVolumeIds(report.openVolumeIds).includes(
    volumeId as TalentReportVolumeId,
  );
  if (!volumeDetected(report, volumeId)) return "not_detected";
  return open ? "readable" : "not_open";
}

/** 报告表头文案：全开 `6 篇`；部分开放 `共 6 册 · N 册可读`（§6.1）。 */
export function buildTalentClientVolumeHeaderText(readableCount: number): string {
  const readable = Math.max(0, readableCount);
  if (readable >= TALENT_CLIENT_TOTAL_VOLUME_COUNT)
    return `${TALENT_CLIENT_TOTAL_VOLUME_COUNT} 册`;
  return `共 ${TALENT_CLIENT_TOTAL_VOLUME_COUNT} 册 · ${readable} 册可读`;
}

/** 报告对象展示信息（报告总览 / 建议页头共用；脱敏、只给周岁文案）。 */
export async function loadTalentClientReportSubject(
  pb: PocketBase,
  userId: string,
  report: TalentReportRecord,
): Promise<{
  subjectType: TalentReportSubjectType;
  name: string;
  gender: string;
  birthday: string;
  relationLabel: string;
}> {
  if (String(report.subjectType ?? "") === "self") {
    const parent = await requireTalentClientParent(pb, userId);
    const view = sanitizeTalentParentRecord(parent);
    return {
      subjectType: "self",
      name: view.name,
      gender: view.gender,
      birthday: view.birthday,
      relationLabel: "",
    };
  }
  const access = await assertTalentChildAccess(
    pb,
    userId,
    String(report.subjectId ?? ""),
  );
  const view = sanitizeTalentChildRecord(access.child, {
    parentStatus: access.parent.status,
  });
  return {
    subjectType: "child",
    name: view.name,
    gender: view.gender,
    birthday: view.birthday,
    relationLabel: view.relationLabel,
  };
}

/** 报告总览（`GET /reports/:id`）：状态 + 固定 6 册摘要 + 建议份数。 */
export function buildTalentClientReportOverview(input: {
  report: TalentReportRecord;
  subject: {
    subjectType: TalentReportSubjectType;
    name: string;
    gender: string;
    birthday: string;
    relationLabel?: string;
    ageLabel?: string;
  };
  adviceCount?: number;
  now?: Date;
}): TalentClientReportOverviewResponse {
  const report = input.report;
  const readableVolumes = listTalentReportOpenVolumes(report);
  const readableVolumeCount = readableVolumes.length;
  const age = talentClientAge(input.subject.birthday, input.now ?? new Date());
  return {
    report: {
      id: String(report.id ?? ""),
      status: resolveTalentClientReportStatus(report),
      statusLabel: talentClientReportStatusLabel(
        resolveTalentClientReportStatus(report),
      ),
      publishedAt: String(report.publishedAt ?? ""),
      snapshotVersion: Number(report.snapshotVersion ?? 0) || 0,
      readableVolumeCount,
      totalVolumeCount: TALENT_CLIENT_TOTAL_VOLUME_COUNT,
      volumeHeaderText: buildTalentClientVolumeHeaderText(readableVolumeCount),
      adviceCount: Math.max(0, Number(input.adviceCount ?? 0) || 0),
    },
    subject: {
      subjectType: input.subject.subjectType,
      name: String(input.subject.name ?? ""),
      genderLabel: genderLabelOf(input.subject.gender),
      ageLabel: input.subject.ageLabel ?? talentClientAgeLabel(age),
      relationLabel: String(input.subject.relationLabel ?? ""),
    },
    volumes: TALENT_REPORT_VOLUME_DEFINITIONS.map((definition) => {
      const state = resolveTalentClientVolumeState(report, definition.volumeId);
      const snapshotVolume = Array.isArray(report.volumeSnapshot)
        ? report.volumeSnapshot.find(
            (volume) => String(volume.volumeId) === definition.volumeId,
          )
        : undefined;
      return {
        volumeId: definition.volumeId,
        name: definition.name,
        sortOrder: definition.sortOrder,
        state,
        chapterCount: state === "readable" ? Number(snapshotVolume?.chapterCount ?? 0) || 0 : 0,
        factorCount: state === "readable" ? Number(snapshotVolume?.factorCount ?? 0) || 0 : 0,
      };
    }),
  };
}

/** 冻结快照内某册的要素（发布顺序；`note` / `condition` 取冻结值）。 */
function volumeFactorItems(
  report: TalentReportRecord,
  volumeId: string,
): Array<{
  code: string;
  name: string;
  levelName: string;
  levelOrder: number;
  note: string;
  condition: string;
  chapter: string;
}> {
  return (report.factorSnapshot ?? [])
    .filter((factor) => String(factor.volumeId) === volumeId)
    .map((factor) => ({
      code: String(factor.code ?? ""),
      name: String(factor.name ?? ""),
      levelName: String(factor.levelName ?? ""),
      levelOrder: Number(factor.levelOrder ?? 0) || 0,
      note: String(factor.note ?? ""),
      condition: String(factor.condition ?? ""),
      chapter: String(factor.chapter ?? ""),
    }));
}

/** 要素命中的培养方向（M3 冻结 `directionSnapshot`，不重算）：requirement 该要素已达成。 */
function buildFactorDirectionMap(
  report: TalentReportRecord,
): Map<string, Array<{ directionId: string; name: string; hitCount: number; total: number }>> {
  const map = new Map<
    string,
    Array<{ directionId: string; name: string; hitCount: number; total: number }>
  >();
  const directions = Array.isArray(report.directionSnapshot?.directions)
    ? report.directionSnapshot.directions
    : [];
  for (const direction of directions) {
    for (const requirement of direction.requirements ?? []) {
      if (requirement.met !== true) continue;
      const code = String(requirement.code ?? "");
      if (!code) continue;
      const list = map.get(code) ?? [];
      list.push({
        directionId: String(direction.directionId ?? ""),
        name: String(direction.name ?? ""),
        hitCount: Number(direction.hitCount ?? 0) || 0,
        total: Number(direction.total ?? 0) || 0,
      });
      map.set(code, list);
    }
  }
  return map;
}

/** 报告列表行（`GET /reports`）：当前对象 + 报告快照摘要 + 开放册 + 建议份数。 */
export interface TalentClientReportListItem {
  subjectType: TalentReportSubjectType;
  subjectId: string;
  name: string;
  reportId: string;
  reportStatus: TalentClientReportStatus;
  statusLabel: string;
  statusText: string;
  publishedAt: string;
  snapshotVersion: number;
  readableVolumeCount: number;
  totalVolumeCount: number;
  openVolumeIds: string[];
  /** 开放册（含册名 / 顺序；未开放册不返回）。 */
  openVolumes: Array<{ volumeId: string; name: string; sortOrder: number }>;
  adviceCount: number;
}

/** `GET /reports` 服务端装配：本人 + 已绑定子女各一行（无报告也给空摘要）。 */
export async function loadTalentClientReportList(
  pb: PocketBase,
  userId: string,
  _options: { now?: Date } = {},
): Promise<{ items: TalentClientReportListItem[] }> {
  const parent = await requireTalentClientParent(pb, userId);
  const bindings = await getTalentMemberBindings(pb, userId);
  const reportMap = await loadTalentClientReportMap(pb, parent.id);
  const adviceCounts = await loadTalentClientAdviceBookCounts(pb);
  const items: TalentClientReportListItem[] = bindings.items.map((item) => {
    const subjectType: TalentReportSubjectType =
      item.objectType === "self" ? "self" : "child";
    const report = reportMap.get(`${subjectType}:${item.id}`.trim()) ?? null;
    if (!report) {
      return {
        subjectType,
        subjectId: item.id,
        name: item.name,
        reportId: "",
        reportStatus: "none",
        statusLabel: talentClientReportStatusLabel("none"),
        statusText: buildTalentClientStatusText({
          subjectType,
          query: item.query,
          reportStatus: "none",
        }),
        publishedAt: "",
        snapshotVersion: 0,
        readableVolumeCount: 0,
        totalVolumeCount: 0,
        openVolumeIds: [],
        openVolumes: [],
        adviceCount: 0,
      };
    }
    const adviceCount = adviceCounts.get(String(report.id ?? "")) ?? 0;
    // 列表不读 `volumeSnapshot` 全量（体积大）：可读册 = 开放册（发布校验保证 open ⊆ 已检测册）。
    const reportStatus = resolveTalentClientReportStatus(report);
    const openVolumeIds = normalizeTalentReportVolumeIds(report.openVolumeIds);
    const readableVolumeCount =
      reportStatus === "published" ? openVolumeIds.length : 0;
    return {
      subjectType,
      subjectId: item.id,
      name: item.name,
      reportId: String(report.id ?? ""),
      reportStatus,
      statusLabel: talentClientReportStatusLabel(reportStatus),
      statusText: buildTalentClientStatusText({
        subjectType,
        query: item.query,
        reportStatus,
        readableVolumeCount,
      }),
      publishedAt: String(report.publishedAt ?? ""),
      snapshotVersion: Number(report.snapshotVersion ?? 0) || 0,
      readableVolumeCount,
      totalVolumeCount: TALENT_CLIENT_TOTAL_VOLUME_COUNT,
      openVolumeIds,
      openVolumes: TALENT_REPORT_VOLUME_DEFINITIONS.filter((definition) =>
        openVolumeIds.includes(definition.volumeId),
      ).map((definition) => ({
        volumeId: definition.volumeId,
        name: definition.name,
        sortOrder: definition.sortOrder,
      })),
      adviceCount,
    };
  });
  return { items };
}

/** 分册响应（`GET /reports/:id/volumes/:volumeId`）：章节 + 要素 + 数据熵 + 相关方向。 */
export function buildTalentClientVolume(
  report: TalentReportRecord,
  volumeId: string,
): TalentClientVolumeResponse | null {
  const definition = getTalentReportVolumeDefinition(volumeId);
  if (!definition) return null;
  const items = volumeFactorItems(report, definition.volumeId);
  if (!items.length) {
    const snapshotVolume = Array.isArray(report.volumeSnapshot)
      ? report.volumeSnapshot.find(
          (volume) => String(volume.volumeId) === definition.volumeId,
        )
      : undefined;
    if (!snapshotVolume) return null;
  }
  const directionMap = buildFactorDirectionMap(report);
  const chapters: Array<{ chapter: string; factorIndexes: number[] }> = [];
  const chapterIndex = new Map<string, number>();
  const factors: TalentClientVolumeFactor[] = items.map((item, index) => {
    const chapter = item.chapter;
    let position = chapterIndex.get(chapter);
    if (position === undefined) {
      position = chapters.length;
      chapterIndex.set(chapter, position);
      chapters.push({ chapter, factorIndexes: [] });
    }
    chapters[position]!.factorIndexes.push(index);
    return {
      index,
      name: item.name,
      levelName: item.levelName,
      note: item.note,
      condition: item.condition,
      relatedDirections: directionMap.get(item.code) ?? [],
    };
  });
  const entropyCounts = new Map<string, { count: number; levelOrder: number }>();
  for (const item of items) {
    const key = item.levelName;
    if (!key) continue;
    const current = entropyCounts.get(key);
    entropyCounts.set(key, {
      count: (current?.count ?? 0) + 1,
      levelOrder: item.levelOrder,
    });
  }
  const volume: TalentClientVolumeSummary = {
    volumeId: definition.volumeId,
    name: definition.name,
    sortOrder: definition.sortOrder,
    chapterCount: chapters.length,
    factorCount: factors.length,
  };
  return {
    volume,
    entropyOptions: [...entropyCounts.entries()]
      .sort((left, right) => {
        const diff = right[1].levelOrder - left[1].levelOrder;
        return diff !== 0 ? diff : left[0].localeCompare(right[0], "zh-Hans-CN");
      })
      .map(([name, value]) => ({ name, count: value.count })),
    chapters,
    factors,
  };
}

/** 要素解读（`GET /reports/:id/factors/:factorCode`）：本册要素 + 上一项 / 下一项序号。 */
export function buildTalentClientFactor(
  report: TalentReportRecord,
  factorCode: string,
): TalentClientFactorResponse | null {
  const code = String(factorCode ?? "").trim();
  if (!code) return null;
  const item = (report.factorSnapshot ?? []).find(
    (factor) => String(factor.code ?? "") === code,
  );
  if (!item) return null;
  const volumeId = String(item.volumeId ?? "");
  if (
    !normalizeTalentReportVolumeIds(report.openVolumeIds).includes(
      volumeId as TalentReportVolumeId,
    )
  )
    return null;
  const position = volumeFactorItems(report, volumeId).findIndex(
    (factor) => factor.code === code,
  );
  if (position < 0) return null;
  const volume = buildTalentClientVolume(report, volumeId);
  if (!volume) return null;
  const factor = volume.factors[position];
  if (!factor) return null;
  const count = volume.factors.length;
  return {
    volume: volume.volume,
    factor,
    prevIndex: count > 0 ? (position - 1 + count) % count : 0,
    nextIndex: count > 0 ? (position + 1) % count : 0,
  };
}

// ── 培养方向 / 选择（M4 冻结快照投影 + 复用 M4 服务） ────────────────────────

/** M1 当前配置只读视图（用于方向描述 / 档位明细 / 分级名称装饰，不进快照）。 */
export interface TalentClientDirectionConfig {
  directions: Map<
    string,
    { id: string; name: string; description: string; icon: string; status: string; tierIds: string[]; defaultTierId: string }
  >;
  tiers: Map<
    string,
    { id: string; name: string; teacher: string; freq: string; headline: string; description: string; isDefault: boolean }
  >;
  levels: Map<string, string>;
  manualOptions: Array<{ directionId: string; name: string }>;
}

/** 读取 M1 当前方向 / 档位 / 分级（只读；不写任何集合）。 */
export async function loadTalentClientDirectionConfig(
  pb: PocketBase,
): Promise<TalentClientDirectionConfig> {
  const [directionRows, enabledTiers, levelRows] = await Promise.all([
    pb
      .collection("talent_directions")
      .getFullList<TalentDirection>({ $autoCancel: false })
      .catch(() => [] as TalentDirection[]),
    listEnabledTalentTiers(pb).catch(() => []),
    pb
      .collection("talent_levels")
      .getFullList<{ code?: string; name?: string }>({
        fields: "code,name",
        $autoCancel: false,
      })
      .catch(() => [] as Array<{ code?: string; name?: string }>),
  ]);
  const directions = new Map<
    string,
    { id: string; name: string; description: string; icon: string; status: string; tierIds: string[]; defaultTierId: string }
  >();
  for (const row of directionRows) {
    const id = String(row.id ?? "");
    if (!id) continue;
    directions.set(id, {
      id,
      name: String(row.name ?? ""),
      description: String(row.description ?? ""),
      icon: String(row.icon ?? ""),
      status: String(row.status ?? "1"),
      tierIds: (Array.isArray(row.tierIds) ? row.tierIds : []).map(String),
      defaultTierId: String(row.defaultTierId ?? ""),
    });
  }
  const tiers = new Map<
    string,
    { id: string; name: string; teacher: string; freq: string; headline: string; description: string; isDefault: boolean }
  >();
  for (const tier of enabledTiers) {
    tiers.set(tier.id, {
      id: tier.id,
      name: tier.name,
      teacher: tier.teacher,
      freq: tier.freq,
      headline: (tier as { headline?: string }).headline ?? "",
      description: (tier as { description?: string }).description ?? "",
      isDefault: tier.isDefault === true,
    });
  }
  const levels = new Map<string, string>();
  for (const level of levelRows) {
    const code = String(level.code ?? "").trim();
    if (!code) continue;
    levels.set(code, String(level.name ?? "").trim());
  }
  const manualOptions = [...directions.values()]
    .filter((direction) => direction.status === "1")
    .map((direction) => ({ directionId: direction.id, name: direction.name }))
    .sort((left, right) => left.name.localeCompare(right.name, "zh-Hans-CN"));
  return { directions, tiers, levels, manualOptions };
}

/** `selections[]` → C 端选择项（`selectionId` = 正式方向 id 或自定义请求 id）。 */
export function toTalentClientSelectionItem(
  item: TalentSelectionItem,
): TalentClientSelectionItem {
  const selectionId = String(item.directionId || item.requestId || "");
  return {
    selectionId,
    directionId: String(item.directionId ?? ""),
    requestId: String(item.requestId ?? ""),
    custom: item.custom === true,
    directionName: String(item.directionName ?? ""),
    tierId: String(item.tierId ?? ""),
    tierName: String(item.tierName ?? ""),
    teacher: String(item.teacher ?? ""),
    freq: String(item.freq ?? ""),
    manualName: String(item.manualName ?? ""),
    selectedAt: String(item.selectedAt ?? ""),
  };
}

/**
 * 全局启用档位投影：快照 `tiers` ∩ 当前启用（同 id 取当前文案，顺序按快照 `sortOrder`）。
 * 快照没有档位（空快照 / 旧快照）时回退当前启用档位，保证自填页仍有培养目标候选
 * （M4 spec §5.3.5：快照为空仍允许自填，档位取当前启用档位）。
 */
export function buildTalentClientGlobalTiers(input: {
  report: TalentReportRecord;
  config: TalentClientDirectionConfig;
}): TalentClientDirectionTier[] {
  const frozen = Array.isArray(input.report.directionSnapshot?.tiers)
    ? input.report.directionSnapshot.tiers
    : [];
  if (!frozen.length) {
    return [...input.config.tiers.values()]
      .map((tier) => ({
        tierId: tier.id,
        name: tier.name,
        teacher: tier.teacher,
        freq: tier.freq,
        headline: tier.headline,
        description: tier.description,
        default: tier.isDefault,
      }))
      .filter((tier) => Boolean(tier.tierId));
  }
  return [...frozen]
    .sort(
      (left, right) =>
        Number(left.sortOrder ?? 0) - Number(right.sortOrder ?? 0)
        || String(left.id ?? "").localeCompare(String(right.id ?? "")),
    )
    .map((frozenTier) => {
      const current = input.config.tiers.get(String(frozenTier.id ?? ""));
      if (!current) return null;
      return {
        tierId: current.id,
        name: current.name || String(frozenTier.name ?? ""),
        teacher: current.teacher || String(frozenTier.teacher ?? ""),
        freq: current.freq || String(frozenTier.freq ?? ""),
        headline: current.headline || String(frozenTier.headline ?? ""),
        description: current.description,
        default: current.isDefault,
      };
    })
    .filter((tier): tier is TalentClientDirectionTier => tier !== null);
}

/** 方向响应（`GET /directions`）：推荐 ≤5 / 已选 / 全局启用档位 / 自填选项 / 上限（读冻结快照）。 */
export function buildTalentClientDirections(input: {
  report: TalentReportRecord;
  config: TalentClientDirectionConfig;
}): TalentClientDirectionsResponse {
  const report = input.report;
  const config = input.config;
  const snapshot = report.directionSnapshot ?? null;
  const selections = (Array.isArray(report.selections) ? report.selections : []).map(
    toTalentClientSelectionItem,
  );
  const recommendation = snapshot
    ? recommendDirections(snapshot)
    : {
        items: [],
        fallback: false,
        totalCandidates: 0,
        emptyReason: "NO_DIRECTIONS" as const,
        recommendLimit: TALENT_DIRECTION_RECOMMEND_LIMIT,
      };
  const snapshotTiers = new Map(
    (Array.isArray(snapshot?.tiers) ? snapshot.tiers : []).map((tier) => [
      String(tier.id ?? ""),
      tier,
    ]),
  );
  const items: TalentClientDirectionItem[] = recommendation.items.map((hit) => {
    const direction = config.directions.get(hit.directionId);
    const selected = selections.find(
      (item) => !item.custom && item.directionId === hit.directionId,
    );
    const tiers = (Array.isArray(hit.tierIds) ? hit.tierIds : [])
      .map((tierId) => {
        const frozen = snapshotTiers.get(tierId);
        const current = config.tiers.get(tierId);
        if (!current) return null;
        return {
          tierId,
          name: current.name || String(frozen?.name ?? ""),
          teacher: current.teacher || String(frozen?.teacher ?? ""),
          freq: current.freq || String(frozen?.freq ?? ""),
          headline: current.headline || String(frozen?.headline ?? ""),
          description: current.description,
          default: String(hit.defaultTierId ?? "") === tierId,
        };
      })
      .filter(
        (tier): tier is NonNullable<typeof tier> => tier !== null,
      );
    return {
      directionId: hit.directionId,
      name: direction?.name || String(hit.name ?? ""),
      description: direction?.description ?? "",
      icon: direction?.icon ?? "",
      hitCount: Number(hit.hitCount ?? 0) || 0,
      total: Number(hit.total ?? 0) || 0,
      hitRate: Number(hit.hitRate ?? 0) || 0,
      selected: Boolean(selected),
      selectedTierId: selected?.tierId ?? "",
      requirements: (Array.isArray(hit.requirements) ? hit.requirements : []).map(
        (requirement) => ({
          factorName: String(requirement.factorName ?? ""),
          needLevelName:
            config.levels.get(String(requirement.level ?? "")) ||
            String(requirement.level ?? ""),
          actualLevelName: requirement.factorLevel
            ? config.levels.get(String(requirement.factorLevel ?? "")) ||
              String(requirement.factorLevel ?? "")
            : "—",
          met: requirement.met === true,
          gap: Number(requirement.gap ?? 0) || 0,
        }),
      ),
      tiers,
      defaultTierId: String(hit.defaultTierId ?? ""),
      selectable:
        Boolean(direction) && direction!.status === "1" && tiers.length > 0,
      fallback: hit.fallback === true,
    };
  });
  const manualOptions =
    snapshot && snapshot.directions.length > 0
      ? buildManualDirectionOptions(snapshot)
      : config.manualOptions;
  const tiers = buildTalentClientGlobalTiers({ report, config });
  return {
    reportId: String(report.id ?? ""),
    snapshotVersion: Number(report.snapshotVersion ?? 0) || 0,
    publishedAt: String(report.publishedAt ?? ""),
    recommendLimit:
      Number(recommendation.recommendLimit ?? 0) ||
      Number(snapshot?.recommendLimit ?? 0) ||
      TALENT_DIRECTION_RECOMMEND_LIMIT,
    selectionLimit: selectionLimitOf(report),
    selectionCount: selections.length,
    fallback: recommendation.fallback === true,
    emptyReason: recommendation.emptyReason ?? null,
    items,
    selections,
    tiers,
    manualTiers: tiers,
    manualOptions,
    manualLimit: TALENT_DIRECTION_MANUAL_NAME_MAX,
  };
}

/** 选择 / 换档 / 取消响应投影（M4 结果 → C 端契约，去掉后台 reportNo 等字段）。 */
export function buildTalentClientSelectionResponse(
  result: TalentDirectionSelectionResult,
): TalentClientSelectionMutationResponse {
  return {
    ...(result.selection
      ? { selection: toTalentClientSelectionItem(result.selection) }
      : {}),
    selections: (Array.isArray(result.selections) ? result.selections : []).map(
      toTalentClientSelectionItem,
    ),
    selectionCount: Number(result.selectionCount ?? 0) || 0,
    selectionLimit: Number(result.selectionLimit ?? 0) || 0,
    alreadySelected: result.alreadySelected === true,
    changed: result.changed === true,
  };
}

/**
 * C 端方向写动作：先做家长 + 报告归属 + 发布状态门禁（409/404），再复用 M4 服务函数。
 * `selectionId` 同时按正式 `directionId` 与自定义 `requestId` 匹配（至多一个非空）。
 */
export async function mutateTalentClientSelection(input: {
  pb: PocketBase;
  userId: string;
  userName?: string;
  action: "select" | "changeTier" | "cancel";
  reportId: string;
  selectionId?: string;
  directionId?: string;
  manualName?: string;
  tierId?: string;
}): Promise<TalentDirectionSelectionResult> {
  const { report } = await assertTalentClientReportAccess(
    input.pb,
    input.userId,
    input.reportId,
  );
  const selectionId = String(input.selectionId ?? "").trim();
  // C 端档位前置校验（spec §10.4：`INVALID_TIER` / `TIER_UNAVAILABLE`）：
  // M4 服务层对「选择」使用 `pickTier` 的 request → current → default 回退，
  // 非法档位会被静默替换为默认档位；C 端契约要求 422，故在校验层先拦截。
  if (input.action === "select") {
    const requestedTierId = String(input.tierId ?? "").trim();
    const enabledTiers = await listEnabledTalentTiers(input.pb);
    const enabledTierIds = new Set(enabledTiers.map((tier) => tier.id));
    const directionId = String(input.directionId ?? "").trim();
    if (directionId) {
      const hit = (report.directionSnapshot?.directions ?? []).find(
        (direction) => direction.directionId === directionId,
      );
      if (hit) {
        const candidateTierIds = new Set(
          (hit.tierIds ?? []).filter((tierId) => enabledTierIds.has(tierId)),
        );
        if (candidateTierIds.size === 0)
          throw invalidTalentClient("该方向暂未开放档位", "TIER_UNAVAILABLE");
        if (!candidateTierIds.has(requestedTierId))
          throw invalidTalentClient(
            "目标档位不在该方向的候选档位内",
            "INVALID_TIER",
          );
      }
    } else if (!enabledTierIds.has(requestedTierId)) {
      throw invalidTalentClient(
        "该培养目标暂未开放，请重新选择",
        "TIER_UNAVAILABLE",
      );
    }
  }
  const actor = { userId: input.userId, userName: input.userName };
  const target =
    input.action === "select"
      ? {
          action: "select" as const,
          directionId: String(input.directionId ?? "").trim(),
          manualName: String(input.manualName ?? "").trim(),
          tierId: String(input.tierId ?? "").trim(),
        }
      : input.action === "changeTier"
        ? {
            action: "changeTier" as const,
            directionId: selectionId,
            requestId: selectionId,
            tierId: String(input.tierId ?? "").trim(),
          }
        : {
            action: "cancel" as const,
            directionId: selectionId,
            requestId: selectionId,
          };
  try {
    return await resolveTalentReportDirectionSelection(
      input.pb,
      String(report.id ?? ""),
      target,
      actor,
    );
  } catch (error) {
    throw normalizeTalentClientGuardError(error);
  }
}

// ── 培育建议（M5 冻结快照投影 + 展示别名） ──────────────────────────────────

/**
 * 建议响应投影：M5 快照 `entropyList[].level` 同时补 `name` 展示别名，
 * 兼容 M7-A 客户端类型的 `{ name, count }` 口径；不改 M5 快照与可见性判断。
 */
export function buildTalentClientAdvice(
  snapshot: Awaited<ReturnType<typeof getTalentAdviceClientSnapshot>>,
): TalentClientAdviceResponse {
  if (snapshot.available !== true) return snapshot;
  const books: TalentClientAdviceBook[] = snapshot.books.map((book) => ({
    book: String(book.book ?? ""),
    bookName: String(book.bookName ?? ""),
    state: book.state,
    adviceNo: String(book.adviceNo ?? ""),
    sectionCount: Number(book.sectionCount ?? 0) || 0,
    total: Number(book.total ?? 0) || 0,
    entropyList: (book.entropyList ?? []).map((entry) => ({
      name: entry.level,
      level: entry.level,
      count: Number(entry.count ?? 0) || 0,
    })),
    sections: (book.sections ?? []).map((section) => ({
      chapter: String(section.chapter ?? ""),
      factor: String(section.factor ?? ""),
      entropy: String(section.entropy ?? ""),
      content: String(section.content ?? ""),
      example: String(section.example ?? ""),
      direction: String(section.direction ?? ""),
      suggestion: String(section.suggestion ?? ""),
    })),
  }));
  return {
    available: true,
    version: { ...snapshot.version },
    owner: { ...snapshot.owner },
    books,
    emptyText: String(snapshot.emptyText ?? TALENT_CLIENT_STATUS_TEXTS.adviceEmpty),
  };
}

/** `GET /advice?reportId=`：M5 守卫 + 可见性派生（已发布 ∧ 生效版 ∧ 报告 published ∧ 归属正常）。 */
export async function loadTalentClientAdvice(
  userId: string,
  reportId: string,
): Promise<TalentClientAdviceResponse> {
  try {
    return buildTalentClientAdvice(
      await getTalentAdviceClientSnapshot(userId, reportId),
    );
  } catch (error) {
    throw normalizeTalentClientGuardError(error);
  }
}

// ── 家长资料（中性账户 + 家长档案脱敏合并） ──────────────────────────────────

export interface TalentClientNeutralAccount {
  id: string;
  nickname?: string;
  avatar?: string;
}

/** 中性账户 + 家长视图 → C 端资料（手机号 / 身份证只给脱敏）。 */
export function buildTalentClientProfile(
  account: TalentClientNeutralAccount,
  parent: TalentMemberParentView,
): TalentClientProfileResponse {
  const avatar = String(account.avatar ?? "");
  return {
    id: parent.id,
    userId: String(account.id ?? ""),
    nickname: String(account.nickname ?? ""),
    avatar: avatar ? pocketBaseFileUrl("users", account.id, avatar) : "",
    name: parent.name,
    gender: parent.gender,
    genderLabel: parent.genderLabel,
    birthday: parent.birthday,
    maskedMobile: parent.maskedMobile,
    maskedIdNo: parent.maskedIdNo,
    hasIdNo: !parent.idNoMissing,
  };
}

/**
 * `PUT /profile`：中性账户字段（昵称 / 头像）写 `users`，家长档案字段（姓名 / 性别 / 生日 /
 * 身份证）走 M2 `updateTalentMember`（复用 M2 加密、生日一致性、唯一冲突 409）。
 * 手机号只读，不接收；身份证留空 = 不修改。
 */
export async function updateTalentClientProfile(input: {
  pb: PocketBase;
  account: TalentClientNeutralAccount;
  parent: TalentParentRecord;
  body: TalentClientProfileInput;
  actor?: { userId?: string };
}): Promise<TalentClientProfileResponse> {
  const { pb, account, parent, body } = input;
  const patch: Record<string, unknown> = {};
  if (body.nickname !== undefined) patch.nickname = String(body.nickname).trim();
  const currentAvatarUrl = account.avatar
    ? pocketBaseFileUrl("users", account.id, String(account.avatar))
    : "";
  const avatarAction = resolveProfileAvatarAction(body.avatar, currentAvatarUrl);
  if (avatarAction === "clear") patch.avatar = "";
  if (avatarAction === "reject")
    throw createError({ statusCode: 400, message: "头像仅支持通过上传接口更新" });
  let updatedUserId = account.id;
  if (Object.keys(patch).length > 0) {
    const updated = await pb
      .collection("users")
      .update(account.id, patch, { $autoCancel: false });
    updatedUserId = String(updated.id ?? account.id);
    if (patch.nickname !== undefined) account.nickname = String(patch.nickname);
    if (patch.avatar !== undefined) account.avatar = String(patch.avatar);
  }
  let updatedParent = parent;
  const memberPatch: {
    name?: string;
    gender?: string;
    birthday?: string;
    idNo?: string;
  } = {};
  if (body.name !== undefined) memberPatch.name = body.name;
  if (body.gender !== undefined) memberPatch.gender = body.gender;
  if (body.birthday !== undefined) memberPatch.birthday = body.birthday;
  if (body.idNo !== undefined && String(body.idNo).trim() !== "")
    memberPatch.idNo = body.idNo;
  if (Object.keys(memberPatch).length > 0) {
    try {
      updatedParent = await updateTalentMember(
        pb,
        String(parent.id),
        memberPatch,
        { userId: String(input.actor?.userId ?? "") },
      );
    } catch (error) {
      const candidate = error as { statusCode?: number; status?: number; message?: string };
      const statusCode = Number(candidate?.statusCode ?? candidate?.status ?? 0);
      if (statusCode === 409)
        throw conflictTalentClient(
          String(candidate?.message || "该身份证号已存在会员档案，请核对后合并"),
          "IDNO_EXISTS",
        );
      if (statusCode === 422)
        throw invalidTalentClient(String(candidate?.message || "资料校验失败"));
      throw error;
    }
  }
  return buildTalentClientProfile(
    { id: updatedUserId, nickname: account.nickname, avatar: account.avatar },
    sanitizeTalentParentRecord(updatedParent),
  );
}

// ── 孩子管理（M2 服务层复用：归属 / 加密 / 查询状态机） ───────────────────────

/** 子女视图 + 报告数 → C 端孩子行（脱敏、周岁、查询状态与原因）。 */
export function buildTalentClientChildItem(
  view: TalentMemberChildView,
  reportCount = 0,
  now: Date = new Date(),
): TalentClientChildItem {
  const age = talentClientAge(view.birthday, now);
  return {
    id: view.id,
    name: view.name,
    gender: view.gender as TalentClientChildItem["gender"],
    genderLabel: view.genderLabel,
    birthday: view.birthday,
    age,
    ageLabel: talentClientAgeLabel(age),
    relation: view.relation,
    relationLabel: view.relationLabel,
    maskedIdNo: view.maskedIdNo,
    query: view.query,
    queryReason: view.query === "not_found" ? view.queryReason : "",
    queryReasonLabel:
      view.query === "not_found"
        ? ((TALENT_QUERY_REASON_LABELS as Readonly<Record<string, string>>)[
            view.queryReason
          ] ?? "")
        : "",
    reportCount: Math.max(0, Number(reportCount ?? 0) || 0),
  };
}

/** 读取当前家长名下正常子女（`status="1"`）并装配报告数。 */
export async function loadTalentClientChildren(
  pb: PocketBase,
  parent: TalentParentRecord,
): Promise<TalentClientChildrenResponse> {
  const children = await pb
    .collection("talent_children")
    .getFullList<TalentChildRecord>({
      filter: `parentId = "${escapeFilterValue(parent.id)}" && status = "1"`,
      sort: "created",
      $autoCancel: false,
    });
  const counts = await countTalentMemberReports(
    pb,
    "child",
    children.map((child) => String(child.id ?? "")),
  );
  return {
    items: children.map((child) =>
      buildTalentClientChildItem(
        sanitizeTalentChildRecord(child, { parentStatus: parent.status }),
        counts.get(String(child.id ?? "")) ?? 0,
      ),
    ),
  };
}

/** 写入冲突归一：M2 409 → `CHILD_IDNO_EXISTS`；422 → `VALIDATION_ERROR`。 */
function normalizeTalentClientMemberWriteError(error: unknown): never {
  const candidate = error as {
    statusCode?: number;
    status?: number;
    message?: string;
  };
  const statusCode = Number(candidate?.statusCode ?? candidate?.status ?? 0);
  if (statusCode === 409)
    throw conflictTalentClient(
      String(candidate?.message || "该身份证已存在孩子档案"),
      "CHILD_IDNO_EXISTS",
    );
  if (statusCode === 422)
    throw invalidTalentClient(String(candidate?.message || "资料校验失败"));
  throw error;
}

/**
 * `POST /children`：复用 M2 建档（身份证唯一 / 重绑 / 上限 10）+ 自动发起查询。
 * 查询失败不影响建档（该子女置「信息待核对 · 接口异常」），与后台口径一致。
 */
export async function createTalentClientChild(input: {
  pb: PocketBase;
  parent: TalentParentRecord;
  body: TalentClientChildInput;
  actor?: { userId?: string };
}): Promise<TalentClientChildItem> {
  let child: TalentChildRecord;
  try {
    child = await createTalentMemberChild(
      input.pb,
      input.parent.id,
      {
        name: input.body.name,
        gender: input.body.gender,
        relation: input.body.relation,
        birthday: input.body.birthday,
        idNo: String(input.body.idNo ?? ""),
      },
      { userId: String(input.actor?.userId ?? "") },
    );
  } catch (error) {
    normalizeTalentClientMemberWriteError(error);
  }
  let latest: TalentChildRecord = child!;
  try {
    const result = await submitTalentChildQuery(latest.id);
    latest = result.child;
  } catch {
    latest = await markTalentChildQueryFailed(latest.id).catch(() => latest);
  }
  return buildTalentClientChildItem(
    sanitizeTalentChildRecord(latest, { parentStatus: input.parent.status }),
  );
}

/**
 * `PUT /children/:id`：`assertTalentChildAccess` 归属门禁（越权 404）；
 * 身份证留空不改；姓名 / 性别 / 生日 / 证件变更后自动重查（M2 服务层）。
 */
export async function updateTalentClientChild(input: {
  pb: PocketBase;
  userId: string;
  childId: string;
  /** 只提交变化字段；身份证留空 = 不修改。 */
  body: Partial<TalentClientChildInput>;
  actor?: { userId?: string };
}): Promise<TalentClientChildItem> {
  let parent: TalentParentRecord;
  try {
    const access = await assertTalentChildAccess(
      input.pb,
      input.userId,
      input.childId,
    );
    parent = access.parent;
  } catch (error) {
    throw normalizeTalentClientGuardError(error);
  }
  let child: TalentChildRecord;
  let requery = false;
  try {
    const updated = await updateTalentMemberChild(
      input.pb,
      input.childId,
      {
        name: input.body.name,
        gender: input.body.gender,
        relation: input.body.relation,
        birthday: input.body.birthday,
        idNo: input.body.idNo,
      },
      { userId: String(input.actor?.userId ?? "") },
    );
    child = updated.child;
    requery = updated.requery;
  } catch (error) {
    normalizeTalentClientMemberWriteError(error);
  }
  let latest: TalentChildRecord = child!;
  if (requery) {
    try {
      const result = await submitTalentChildQuery(latest.id);
      latest = result.child;
    } catch {
      latest = await markTalentChildQueryFailed(latest.id).catch(() => latest);
    }
  }
  return buildTalentClientChildItem(
    sanitizeTalentChildRecord(latest, { parentStatus: parent.status }),
  );
}

/** `GET /children` 家长门禁 + 列表（未绑定 / 停用 → 404）。 */
export async function loadTalentClientChildrenForUser(
  pb: PocketBase,
  userId: string,
): Promise<TalentClientChildrenResponse> {
  const parent = await requireTalentClientParent(pb, userId);
  return loadTalentClientChildren(pb, parent);
}
