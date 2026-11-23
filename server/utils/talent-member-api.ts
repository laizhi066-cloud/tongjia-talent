/**
 * @description M2 会员域 API 服务层：列表分页 / 四筛交集 / 状态计数、详情聚合、C 端 bindings 只读
 *   查询与显式 claim、PocketBase 唯一冲突映射，以及 13 条路由共用的 Zod schema。
 *   路由文件只做「认证 / 权限 / 审计 / 响应」薄封装；响应一律经 sanitize，cipher / hash 不出服务端。
 * @file server/utils/talent-member-api.ts
 */
import { createError } from "h3";
import type PocketBase from "pocketbase";
import { z } from "zod";
import {
  TALENT_CHILD_RELATIONS,
  TALENT_MEMBER_GENDERS,
  type TalentChildRecord,
  type TalentMemberBindingItem,
  type TalentMemberBindingsResponse,
  type TalentMemberChildView,
  type TalentMemberListRow,
  type TalentMemberParentView,
  type TalentParentRecord,
} from "~~/shared/types/talent-member";
import type { TalentStatus } from "~~/shared/types/talent";
import { recordError } from "./error-log";
import { escapeFilterValue } from "./pocketbase-client";
import {
  assertTalentChildEditable,
  assertTalentChildRelation,
  assertTalentMemberBirthday,
  assertTalentMemberGender,
  assertTalentMemberIdNo,
  assertTalentMemberIdNoBirthday,
  assertTalentParentNo,
  assertTalentParentNoImmutable,
  buildTalentChildCreateData,
  buildTalentChildRebindData,
  buildTalentChildUnbindPatch,
  buildTalentIdNoTriplet,
  buildTalentMemberChildBindingItem,
  buildTalentMemberSelfBindingItem,
  buildTalentMobileTriplet,
  conflictTalentMember,
  countTalentMemberReports,
  findTalentChildByIdNoHash,
  findTalentParentByMobileHash,
  formatTalentMemberDateTime,
  generateTalentParentNo,
  getTalentChildOrThrow,
  getTalentParentOrThrow,
  invalidTalentMember,
  isTalentParentActive,
  normalizeTalentChildProfile,
  normalizeTalentParentProfile,
  resolveTalentParentByUserId,
  sanitizeTalentChildRecord,
  sanitizeTalentParentRecord,
  shouldRequeryTalentChild,
  TALENT_MEMBER_MAX_CHILDREN_PER_PARENT,
  toTalentMemberListRow,
} from "./talent-member";
import {
  decryptTalentSensitive,
  hashTalentMemberMobile,
  normalizeTalentMobile,
} from "./talent-member-crypto";

/** 列表默认每页 20 条（spec §5.1）。 */
export const TALENT_MEMBER_DEFAULT_PAGE_SIZE = 20;
/** 列表每页上限 100 条（spec §5.1）。 */
export const TALENT_MEMBER_MAX_PAGE_SIZE = 100;
/** 单个家长最多子女数（spec §4.5）。 */
export const TALENT_MEMBER_MAX_CHILDREN = TALENT_MEMBER_MAX_CHILDREN_PER_PARENT;

// ── 路由共用 Zod schema（spec §5.3）：失败统一 422 ─────────────────────────────────

const talentMemberGenderSchema = z.enum(TALENT_MEMBER_GENDERS);
const talentChildRelationSchema = z.enum(TALENT_CHILD_RELATIONS);
const talentMemberMobileSchema = z
  .string()
  .trim()
  .regex(/^1[3-9]\d{9}$/, "手机号格式不正确");
const talentMemberIdNoSchema = z
  .string()
  .trim()
  .regex(/^\d{17}[\dXx]$/, "身份证号应为 18 位");
const talentMemberBirthdaySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "出生日期格式应为 YYYY-MM-DD");
const talentMemberParentNoSchema = z
  .string()
  .trim()
  .regex(/^P\d{12}$/, "会员编号格式应为 P + 12 位数字");

/** 新建会员的子女行。 */
export const talentMemberChildCreateSchema = z.object({
  name: z.string().trim().min(1, "子女姓名不能为空").max(50, "子女姓名不能超过 50 个字符"),
  gender: talentMemberGenderSchema,
  birthday: talentMemberBirthdaySchema,
  relation: talentChildRelationSchema,
  idNo: talentMemberIdNoSchema,
});

/** 新建会员：家长 + 1–10 名子女（spec §5.2 #3）。 */
export const talentMemberCreateSchema = z.object({
  parentNo: talentMemberParentNoSchema.optional(),
  name: z.string().trim().min(1, "家长姓名不能为空").max(50, "家长姓名不能超过 50 个字符"),
  mobile: talentMemberMobileSchema,
  idNo: talentMemberIdNoSchema.optional(),
  gender: talentMemberGenderSchema.optional(),
  birthday: talentMemberBirthdaySchema.optional(),
  remark: z.string().max(500, "备注不能超过 500 个字符").optional(),
  children: z
    .array(talentMemberChildCreateSchema)
    .min(1, "至少添加 1 名子女")
    .max(TALENT_MEMBER_MAX_CHILDREN, `最多添加 ${TALENT_MEMBER_MAX_CHILDREN} 名子女`),
});

/** 编辑家长：至少一项；`mobile` / `idNo` 空串表示不修改（spec §5.3 #4）。 */
export const talentMemberUpdateSchema = z
  .object({
    parentNo: z.string().trim().max(64).optional(),
    name: z.string().trim().min(1, "家长姓名不能为空").max(50, "家长姓名不能超过 50 个字符").optional(),
    mobile: z.union([talentMemberMobileSchema, z.literal("")]).optional(),
    idNo: z.union([talentMemberIdNoSchema, z.literal("")]).optional(),
    gender: z.union([talentMemberGenderSchema, z.literal("")]).optional(),
    birthday: z.union([talentMemberBirthdaySchema, z.literal("")]).optional(),
    remark: z.string().max(500, "备注不能超过 500 个字符").optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "至少提交一个字段");

/** 停用 / 启用：独立状态接口（spec §5.2 #5）。 */
export const talentMemberStatusSchema = z.object({
  status: z.enum(["0", "1"]),
});

/** 编辑子女：至少一项；身份证空串表示不改（spec §5.3 #7）。 */
export const talentMemberChildUpdateSchema = z
  .object({
    name: z.string().trim().min(1, "子女姓名不能为空").max(50, "子女姓名不能超过 50 个字符").optional(),
    gender: talentMemberGenderSchema.optional(),
    birthday: talentMemberBirthdaySchema.optional(),
    relation: talentChildRelationSchema.optional(),
    idNo: z.union([talentMemberIdNoSchema, z.literal("")]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "至少提交一个字段");

// ── 分页：默认 20 / 上限 100 / 最小 1（spec §5.1） ──────────────────────────────────

export function normalizeTalentMemberPagination(query: {
  page?: unknown;
  pageSize?: unknown;
}): {
  page: number;
  pageSize: number;
} {
  const rawPage = Number(query.page);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const rawPageSize = Number(query.pageSize);
  const pageSize =
    Number.isFinite(rawPageSize) && rawPageSize > 0
      ? Math.min(TALENT_MEMBER_MAX_PAGE_SIZE, Math.floor(rawPageSize))
      : TALENT_MEMBER_DEFAULT_PAGE_SIZE;
  return { page, pageSize };
}

// ── 列表：四项筛选交集 + 状态计数（不叠加状态筛选） ─────────────────────────────────

export interface TalentMemberListQueryInput {
  name?: string;
  mobile?: string;
  childName?: string;
  status?: string;
  page?: string;
  pageSize?: string;
}

export interface TalentMemberListResult {
  rows: TalentMemberListRow[];
  total: number;
  page: number;
  pageSize: number;
  statusCounts: Record<TalentStatus, number>;
  statusTotal: number;
}

/** 手机号筛选：完整 11 位按 HMAC 精确匹配，后 4 位按脱敏列后缀匹配。 */
export function buildTalentMemberMobileFilter(mobile: string): string {
  const value = String(mobile ?? "").trim();
  if (!value) return "";
  if (/^\d{4}$/.test(value))
    return `maskedMobile ~ "${escapeFilterValue(`****${value}`)}"`;
  const normalized = normalizeTalentMobile(value);
  if (/^1[3-9]\d{9}$/.test(normalized))
    return `mobileHash = "${escapeFilterValue(hashTalentMemberMobile(normalized))}"`;
  throw createError({
    statusCode: 400,
    message: "手机号筛选应为完整 11 位或后 4 位",
  });
}

/**
 * 会员列表：家长姓名 / 手机号 / 子女姓名 / 状态四项 AND。
 * `statusCounts` 只在「姓名 + 手机号 + 子女姓名」三项下统计，不叠加状态筛选。
 */
export async function listTalentMembers(
  pb: PocketBase,
  input: TalentMemberListQueryInput = {},
): Promise<TalentMemberListResult> {
  const { page, pageSize } = normalizeTalentMemberPagination(input);
  const filters: string[] = [];
  const name = String(input.name ?? "").trim();
  if (name) filters.push(`name ~ "${escapeFilterValue(name)}"`);
  const mobileFilter = buildTalentMemberMobileFilter(String(input.mobile ?? ""));
  if (mobileFilter) filters.push(mobileFilter);
  const childName = String(input.childName ?? "").trim();
  if (childName) {
    const parentIds = await collectTalentMemberParentIdsByChildName(pb, childName);
    if (!parentIds.length) {
      return {
        rows: [],
        total: 0,
        page,
        pageSize,
        statusCounts: { "1": 0, "0": 0 },
        statusTotal: 0,
      };
    }
    const escapedIds = parentIds.map((id) => `id = "${escapeFilterValue(id)}"`);
    filters.push(`(${escapedIds.join(" || ")})`);
  }
  const status = String(input.status ?? "").trim();
  if (status && status !== "0" && status !== "1")
    throw createError({ statusCode: 400, message: "账号状态参数不正确" });
  const baseFilter = filters.join(" && ");
  const filter = [baseFilter, status ? `status = "${escapeFilterValue(status)}"` : ""]
    .filter(Boolean)
    .join(" && ");

  const [result, statusRows] = await Promise.all([
    pb.collection("talent_parents").getList<TalentParentRecord>(page, pageSize, {
      filter: filter || undefined,
      sort: "-created",
      $autoCancel: false,
    }),
    pb.collection("talent_parents").getFullList<TalentParentRecord>({
      filter: baseFilter || undefined,
      fields: "status",
      $autoCancel: false,
    }),
  ]);
  const statusCounts: Record<TalentStatus, number> = { "1": 0, "0": 0 };
  for (const row of statusRows) {
    if (String(row.status) === "0") statusCounts["0"] += 1;
    else statusCounts["1"] += 1;
  }
  const parentIds = result.items.map((row) => row.id).filter(Boolean);
  const [childCounts, reportCounts] = await Promise.all([
    countTalentMemberChildren(pb, parentIds),
    countTalentMemberReports(pb, "self", parentIds),
  ]);
  return {
    rows: result.items.map((record) =>
      toTalentMemberListRow(record, {
        childCount: childCounts.get(record.id) || 0,
        reportCount: reportCounts.get(record.id) || 0,
      }),
    ),
    total: result.totalItems,
    page,
    pageSize,
    statusCounts,
    statusTotal: statusRows.length,
  };
}

/** 子女姓名 → 家长 id 集合（两段查询，避免整表扫描）。 */
async function collectTalentMemberParentIdsByChildName(
  pb: PocketBase,
  childName: string,
): Promise<string[]> {
  const children = await pb.collection("talent_children").getFullList<TalentChildRecord>({
    filter: `name ~ "${escapeFilterValue(childName)}" && status = "1"`,
    fields: "parentId",
    $autoCancel: false,
  });
  return Array.from(
    new Set(
      children
        .map((child) => String(child.parentId || "").trim())
        .filter(Boolean),
    ),
  );
}

/** 每个家长的 `status="1"` 子女数。 */
export async function countTalentMemberChildren(
  pb: PocketBase,
  parentIds: readonly string[],
): Promise<Map<string, number>> {
  const ids = Array.from(new Set(parentIds.map(String).filter(Boolean)));
  const counts = new Map<string, number>(ids.map((id) => [id, 0]));
  if (!ids.length) return counts;
  const filter = `(${ids
    .map((id) => `parentId = "${escapeFilterValue(id)}"`)
    .join(" || ")}) && status = "1"`;
  const rows = await pb.collection("talent_children").getFullList<TalentChildRecord>({
    filter,
    fields: "parentId",
    $autoCancel: false,
  });
  for (const row of rows) {
    const parentId = String(row.parentId || "");
    if (counts.has(parentId)) counts.set(parentId, (counts.get(parentId) || 0) + 1);
  }
  return counts;
}

// ── 详情：家长 + 名下子女（脱敏 + 查询状态 + 报告计数）+ 绑定账号 ─────────────────────

export interface TalentMemberChildDetailView extends TalentMemberChildView {
  reportCount: number;
}

export interface TalentMemberDetailResult {
  parent: TalentMemberParentView;
  children: TalentMemberChildDetailView[];
  counts: { children: number; reports: number };
  account: {
    bound: boolean;
    account?: string;
    displayName?: string;
  };
}

export async function loadTalentMemberDetail(
  pb: PocketBase,
  parentId: string,
): Promise<TalentMemberDetailResult> {
  const parent = await getTalentParentOrThrow(pb, String(parentId ?? ""));
  const children = await pb.collection("talent_children").getFullList<TalentChildRecord>({
    filter: `parentId = "${escapeFilterValue(parent.id)}" && status = "1"`,
    sort: "created",
    $autoCancel: false,
  });
  const [reportCounts, selfReportCounts] = await Promise.all([
    countTalentMemberReports(
      pb,
      "child",
      children.map((child) => child.id),
    ),
    countTalentMemberReports(pb, "self", [parent.id]),
  ]);
  const childViews: TalentMemberChildDetailView[] = children.map((child) => ({
    ...sanitizeTalentChildRecord(child, { parentStatus: parent.status }),
    reportCount: reportCounts.get(child.id) || 0,
  }));
  const reportTotal =
    (selfReportCounts.get(parent.id) || 0) +
    childViews.reduce((sum, child) => sum + child.reportCount, 0);
  const account: TalentMemberDetailResult["account"] = { bound: false };
  const userId = String(parent.userId || "").trim();
  if (userId) {
    try {
      const user = await pb.collection("users").getOne<{
        username?: string;
        email?: string;
        displayName?: string;
      }>(userId, { $autoCancel: false });
      account.bound = true;
      account.account = String(user.username || user.email || "");
      account.displayName = String(user.displayName || "");
    } catch {
      // 账号已被删除时保持未绑定展示，不阻断详情读取。
    }
  }
  return {
    parent: sanitizeTalentParentRecord(parent),
    children: childViews,
    counts: { children: childViews.length, reports: reportTotal },
    account,
  };
}

// ── C 端 bindings：GET 只读（不创建 / 不更新任何记录） ───────────────────────────────

/** 未绑定家长 / 家长停用时统一返回的空信封。 */
export function emptyTalentMemberBindings(): TalentMemberBindingsResponse {
  return {
    items: [],
    currentId: "",
    current: null,
    currentRelationType: "",
  };
}

/**
 * 按登录账号解析家长档案并返回本人 + 已绑定子女的只读对象列表。
 * 只读：本函数不包含任何 create / update / delete 调用。
 */
export async function getTalentMemberBindings(
  pb: PocketBase,
  userId: string,
): Promise<TalentMemberBindingsResponse> {
  const parent = await resolveTalentParentByUserId(pb, String(userId ?? ""));
  if (!parent || !isTalentParentActive(parent.status))
    return emptyTalentMemberBindings();
  const children = await pb.collection("talent_children").getFullList<TalentChildRecord>({
    filter: `parentId = "${escapeFilterValue(parent.id)}" && status = "1"`,
    sort: "created",
    $autoCancel: false,
  });
  const selfView = sanitizeTalentParentRecord(parent);
  const items: TalentMemberBindingItem[] = [
    buildTalentMemberSelfBindingItem(selfView),
    ...children.map((child) =>
      buildTalentMemberChildBindingItem(
        sanitizeTalentChildRecord(child, { parentStatus: parent.status }),
      ),
    ),
  ];
  const current = items[0] ?? null;
  return {
    items,
    currentId: current?.id || "",
    current,
    currentRelationType: current ? "self" : "",
  };
}

// ── C 端 claim：显式认领唯一 parent（GET 不写，POST 只写 userId） ─────────────────────

export const TALENT_MEMBER_CLAIM_STATUSES = [
  "bound",
  "already_bound",
  "no_match",
  "ambiguous",
  "conflict",
  "no_phone",
] as const;
export type TalentMemberClaimStatus =
  (typeof TALENT_MEMBER_CLAIM_STATUSES)[number];

export interface TalentMemberClaimResult {
  status: TalentMemberClaimStatus;
  bindings: TalentMemberBindingsResponse;
}

/** 无手机号 / 未命中 / 同号多档：返回空 items，不写任何记录。 */
function claimResult(
  status: TalentMemberClaimStatus,
  bindings: TalentMemberBindingsResponse = emptyTalentMemberBindings(),
): TalentMemberClaimResult {
  return { status, bindings };
}

/**
 * 用已验证手机号哈希认领唯一 parent：
 * - 0 条 → `no_match`；≥2 条 → `ambiguous`（不写，记 warn）；已绑本账号 → `already_bound`；
 * - 已绑其他账号 → 409 `conflict`；无手机号 → `no_phone`；
 * - 唯一命中且未绑定 → 只写 `userId`，`bound`。
 */
export async function claimTalentMemberBinding(
  pb: PocketBase,
  userId: string,
  mobile: string,
): Promise<TalentMemberClaimResult> {
  const currentUserId = String(userId ?? "").trim();
  const normalizedMobile = normalizeTalentMobile(String(mobile ?? ""));
  if (!currentUserId || !normalizedMobile) return claimResult("no_phone");
  const mobileHash = hashTalentMemberMobile(normalizedMobile);
  const rows = await pb.collection("talent_parents").getFullList<TalentParentRecord>({
    filter: `mobileHash = "${escapeFilterValue(mobileHash)}"`,
    $autoCancel: false,
  });
  if (!rows.length) return claimResult("no_match");
  if (rows.length > 1) {
    console.warn(
      `[talent-member] 手机号命中 ${rows.length} 条家长档案，已拒绝自动认领（需后台核对合并）`,
    );
    await recordError(pb, {
      source: "api",
      level: "warn",
      message: "[talent-member] 手机号命中多个家长档案，认领已拒绝",
      meta: { candidates: rows.length },
    }).catch(() => undefined);
    return claimResult("ambiguous");
  }
  const parent = rows[0] as TalentParentRecord;
  const boundUserId = String(parent.userId || "").trim();
  if (boundUserId && boundUserId !== currentUserId)
    throw conflictTalentMember("该手机号对应的家长档案已绑定其他账号");
  if (boundUserId === currentUserId)
    return {
      status: "already_bound",
      bindings: await getTalentMemberBindings(pb, currentUserId),
    };
  try {
    await pb.collection("talent_parents").update(
      parent.id,
      { userId: currentUserId },
      { $autoCancel: false },
    );
  } catch (error) {
    if (isTalentMemberUniqueError(error))
      throw conflictTalentMember("该手机号对应的家长档案已绑定其他账号");
    throw error;
  }
  return {
    status: "bound",
    bindings: await getTalentMemberBindings(pb, currentUserId),
  };
}

// ── PocketBase 写入错误：唯一冲突映射 409，其余原样抛出（不泄露原始堆栈） ─────────────

/** 判断 PocketBase 错误是否为唯一约束冲突（唯一索引 / 字段 not_unique）。 */
export function isTalentMemberUniqueError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as {
    status?: number;
    statusCode?: number;
    message?: string;
    response?: { data?: unknown; status?: number };
    data?: unknown;
  };
  const status = record.status ?? record.statusCode ?? record.response?.status;
  const payload =
    record.data ??
    (record.response?.data as { data?: unknown } | undefined)?.data ??
    null;
  if (payload && typeof payload === "object") {
    for (const value of Object.values(payload as Record<string, unknown>)) {
      const field = value as { code?: string; message?: string } | null;
      if (String(field?.code || "") === "validation_not_unique") return true;
      if (/not_unique|unique/i.test(String(field?.message || ""))) return true;
    }
  }
  // PB 唯一索引冲突在 v0.38 是 400 + message "Failed to create record."，字段级信息在 data 中；
  // 这里只兜底明确提到唯一 / unique 的错误，避免把普通校验失败误报为 409。
  return status === 400 && /unique|not_unique|唯一/i.test(String(record.message || ""));
}

// ── 新建会员前的同请求去重：同一请求内身份证不得重复（422） ─────────────────────────

/**
 * 校验同一请求内的子女身份证不重复（归一化后比较）；失败抛 422。
 * 只做校验，不返回资料，避免与 `normalizeTalentChildProfile` 的落库数据重复。
 */
export function normalizeTalentMemberCreateChildren(
  children: readonly { idNo: string }[],
): void {
  const seen = new Set<string>();
  for (const child of children) {
    const profile = normalizeTalentChildProfile(child);
    if (seen.has(profile.rawIdNo))
      throw invalidTalentMember("同一请求内子女身份证号不能重复");
    seen.add(profile.rawIdNo);
  }
}


// ── 管理写操作服务层：只落库，权限 / 审计 / 响应由路由负责（spec §5.1） ───────────────

export interface TalentMemberWriteActor {
  /** 当前操作人 `users.id`，写入 `createdBy` / `updatedBy` / `unbindBy`。 */
  userId: string;
}

function talentMemberActorId(actor: TalentMemberWriteActor | undefined): string {
  return String(actor?.userId || "").trim();
}

/** 新建会员：家长 + 1–10 名子女；唯一冲突 409，身份证生日不一致等 422。 */
export async function createTalentMember(
  pb: PocketBase,
  body: {
    parentNo?: string;
    name: string;
    mobile: string;
    idNo?: string;
    gender?: string;
    birthday?: string;
    remark?: string;
    children: Array<{
      name: string;
      gender: string;
      birthday: string;
      relation: string;
      idNo: string;
    }>;
  },
  actor?: TalentMemberWriteActor,
): Promise<{ parent: TalentParentRecord; children: TalentChildRecord[] }> {
  const operatorId = talentMemberActorId(actor);
  normalizeTalentMemberCreateChildren(body.children);
  const profile = normalizeTalentParentProfile({ ...body, source: "admin" });
  const mobileTriplet = profile.mobileTriplet;
  if (!mobileTriplet) throw invalidTalentMember("手机号不能为空");
  const existingMobile = await findTalentParentByMobileHash(
    pb,
    mobileTriplet.mobileHash,
  );
  if (existingMobile)
    throw conflictTalentMember("该手机号已存在家长档案，请在后台核对合并");
  if (profile.idNoTriplet) {
    const existingIdNo = await findTalentParentByIdNoHash(
      pb,
      profile.idNoTriplet.idNoHash,
    );
    if (existingIdNo)
      throw conflictTalentMember("该身份证号已存在家长档案，请核对后合并");
  }

  const now = new Date();
  const baseData: Record<string, unknown> = {
    name: profile.name,
    mobileCipher: mobileTriplet.mobileCipher,
    mobileHash: mobileTriplet.mobileHash,
    maskedMobile: mobileTriplet.maskedMobile,
    idNoCipher: profile.idNoTriplet?.idNoCipher || "",
    idNoHash: profile.idNoTriplet?.idNoHash || "",
    maskedIdNo: profile.idNoTriplet?.maskedIdNo || "",
    gender: profile.gender,
    birthday: profile.birthday,
    source: "admin",
    status: "1",
    registeredAt: formatTalentMemberDateTime(now),
    remark: profile.remark,
    createdBy: operatorId,
    updatedBy: operatorId,
  };
  const manualParentNo = String(body.parentNo || "").trim()
    ? assertTalentParentNo(String(body.parentNo))
    : "";
  let parent: TalentParentRecord | null = null;
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const parentNo = manualParentNo || (await generateTalentParentNo(pb, { now }));
    try {
      parent = await pb
        .collection("talent_parents")
        .create<TalentParentRecord>({ ...baseData, parentNo }, { $autoCancel: false });
      break;
    } catch (error) {
      lastError = error;
      if (!isTalentMemberUniqueError(error)) throw error;
      // 手填编号冲突不重试；自动生成撞号时按当日最大序号重新生成（最多 5 次）。
      if (manualParentNo) throw conflictTalentMember(`会员编号已存在：${manualParentNo}`);
      if (attempt >= 5) break;
    }
  }
  if (!parent) {
    if (isTalentMemberUniqueError(lastError))
      throw conflictTalentMember("会员编号冲突，请重试");
    throw lastError instanceof Error
      ? lastError
      : createError({ statusCode: 500, message: "会员建档失败" });
  }

  const created: TalentChildRecord[] = [];
  for (const child of body.children) {
    const profileChild = normalizeTalentChildProfile(child);
    const existing = await findTalentChildByIdNoHash(pb, profileChild.idNoHash);
    if (!existing) {
      created.push(
        await pb.collection("talent_children").create<TalentChildRecord>(
          {
            ...buildTalentChildCreateData(child, parent.id),
            createdBy: operatorId,
            updatedBy: operatorId,
          },
          { $autoCancel: false },
        ),
      );
      continue;
    }
    let existingParentStatus = "1";
    if (String(existing.parentId || "").trim()) {
      try {
        const existingParent = await pb
          .collection("talent_parents")
          .getOne<{ status?: string }>(String(existing.parentId), {
            fields: "status",
            $autoCancel: false,
          });
        existingParentStatus = String(existingParent.status || "1");
      } catch {
        existingParentStatus = "1";
      }
    }
    const plan = planTalentChildCreate(existing, {
      parentId: parent.id,
      existingParentStatus,
    });
    if (plan.action === "rebind") {
      created.push(
        await pb.collection("talent_children").update<TalentChildRecord>(
          plan.childId,
          {
            ...buildTalentChildRebindData(child, parent.id),
            updatedBy: operatorId,
          },
          { $autoCancel: false },
        ),
      );
      continue;
    }
    created.push(
      await pb.collection("talent_children").create<TalentChildRecord>(
        {
          ...buildTalentChildCreateData(child, parent.id),
          createdBy: operatorId,
          updatedBy: operatorId,
        },
        { $autoCancel: false },
      ),
    );
  }
  return { parent, children: created };
}

/** 按身份证哈希查家长档案（选填身份证去重；不存在返回 null）。 */
export async function findTalentParentByIdNoHash(
  pb: PocketBase,
  idNoHash: string,
): Promise<TalentParentRecord | null> {
  const hash = String(idNoHash || "").trim();
  if (!hash) return null;
  try {
    return await pb
      .collection("talent_parents")
      .getFirstListItem<TalentParentRecord>(
        `idNoHash = "${escapeFilterValue(hash)}"`,
        { $autoCancel: false },
      );
  } catch {
    return null;
  }
}

/** 编辑会员：手机号 / 身份证留空不改；改手机号或证件重算三件套并校验唯一。 */
export async function updateTalentMember(
  pb: PocketBase,
  parentId: string,
  body: {
    parentNo?: string;
    name?: string;
    mobile?: string;
    idNo?: string;
    gender?: string;
    birthday?: string;
    remark?: string;
  },
  actor?: TalentMemberWriteActor,
): Promise<TalentParentRecord> {
  const operatorId = talentMemberActorId(actor);
  const current = await getTalentParentOrThrow(pb, parentId);
  assertTalentParentNoImmutable(current.parentNo, body.parentNo);
  const patch: Record<string, unknown> = { updatedBy: operatorId };
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) throw invalidTalentMember("家长姓名不能为空");
    if (name.length > 50) throw invalidTalentMember("家长姓名不能超过 50 个字符");
    patch.name = name;
  }
  if (body.gender !== undefined) {
    patch.gender = String(body.gender).trim()
      ? assertTalentMemberGender(body.gender)
      : "";
  }
  if (body.remark !== undefined) patch.remark = String(body.remark).trim().slice(0, 500);

  const currentIdNoHash = String(current.idNoHash || "").trim();
  let nextBirthday =
    body.birthday !== undefined
      ? String(body.birthday).trim()
      : String(current.birthday || "").trim();
  const idNoProvided =
    body.idNo !== undefined && String(body.idNo).trim() !== "";
  if (idNoProvided) {
    const normalizedIdNo = assertTalentMemberIdNo(String(body.idNo));
    if (!nextBirthday)
      throw invalidTalentMember("填写身份证时必须填写出生日期");
    assertTalentMemberIdNoBirthday(normalizedIdNo, nextBirthday);
    const triplet = buildTalentIdNoTriplet(normalizedIdNo);
    if (triplet.idNoHash !== currentIdNoHash) {
      const existing = await findTalentParentByIdNoHash(pb, triplet.idNoHash);
      if (existing && existing.id !== current.id)
        throw conflictTalentMember("该身份证号已存在家长档案，请核对后合并");
    }
    patch.idNoCipher = triplet.idNoCipher;
    patch.idNoHash = triplet.idNoHash;
    patch.maskedIdNo = triplet.maskedIdNo;
    patch.birthday = nextBirthday;
  } else if (body.birthday !== undefined) {
    if (!nextBirthday) {
      if (currentIdNoHash)
        throw invalidTalentMember("填写身份证时必须填写出生日期");
      patch.birthday = "";
    } else {
      nextBirthday = assertTalentMemberBirthday(nextBirthday);
      if (currentIdNoHash) {
        // 已有证件时改生日必须与证件第 7–14 位一致；只解密当前证件做校验，不回显明文。
        const currentIdNo = decryptTalentSensitive(current.idNoCipher || "");
        assertTalentMemberIdNoBirthday(currentIdNo, nextBirthday);
      }
      patch.birthday = nextBirthday;
    }
  }

  if (body.mobile !== undefined && String(body.mobile).trim() !== "") {
    const triplet = buildTalentMobileTriplet(String(body.mobile));
    if (triplet.mobileHash !== String(current.mobileHash || "")) {
      const existing = await findTalentParentByMobileHash(pb, triplet.mobileHash);
      if (existing && existing.id !== current.id)
        throw conflictTalentMember("该手机号已存在家长档案，请在后台核对合并");
    }
    patch.mobileCipher = triplet.mobileCipher;
    patch.mobileHash = triplet.mobileHash;
    patch.maskedMobile = triplet.maskedMobile;
  }
  try {
    return await pb
      .collection("talent_parents")
      .update<TalentParentRecord>(current.id, patch, { $autoCancel: false });
  } catch (error) {
    if (isTalentMemberUniqueError(error))
      throw conflictTalentMember("手机号或身份证号已被其他会员档案占用");
    throw error;
  }
}

/** 停用 / 启用：只改 `talent_parents.status`，不双写 `users.status`（ADR 0002-D4）。 */
export async function changeTalentMemberStatus(
  pb: PocketBase,
  parentId: string,
  status: "0" | "1",
  actor?: TalentMemberWriteActor,
): Promise<TalentParentRecord> {
  const current = await getTalentParentOrThrow(pb, parentId);
  return pb
    .collection("talent_parents")
    .update<TalentParentRecord>(
      current.id,
      { status, updatedBy: talentMemberActorId(actor) },
      { $autoCancel: false },
    );
}

/** 新增子女：命中已解绑档案则重绑复用；命中正常档案 409；家长停用 409。 */
export async function createTalentMemberChild(
  pb: PocketBase,
  parentId: string,
  body: {
    name: string;
    gender: string;
    birthday: string;
    relation: string;
    idNo: string;
  },
  actor?: TalentMemberWriteActor,
): Promise<TalentChildRecord> {
  const operatorId = talentMemberActorId(actor);
  const parent = await getTalentParentOrThrow(pb, parentId);
  if (!isTalentParentActive(parent.status))
    throw conflictTalentMember("所属家长档案已停用，不能新增子女");
  const activeCount = await countTalentMemberChildren(pb, [parent.id]);
  if ((activeCount.get(parent.id) || 0) >= TALENT_MEMBER_MAX_CHILDREN_PER_PARENT)
    throw invalidTalentMember(
      `单个家长最多维护 ${TALENT_MEMBER_MAX_CHILDREN_PER_PARENT} 名子女`,
    );
  const profile = normalizeTalentChildProfile(body);
  const existing = await findTalentChildByIdNoHash(pb, profile.idNoHash);
  if (!existing) {
    return pb.collection("talent_children").create<TalentChildRecord>(
      {
        ...buildTalentChildCreateData(body, parent.id),
        createdBy: operatorId,
        updatedBy: operatorId,
      },
      { $autoCancel: false },
    );
  }
  let existingParentStatus = "1";
  if (String(existing.parentId || "").trim()) {
    try {
      const existingParent = await pb
        .collection("talent_parents")
        .getOne<{ status?: string }>(String(existing.parentId), {
          fields: "status",
          $autoCancel: false,
        });
      existingParentStatus = String(existingParent.status || "1");
    } catch {
      existingParentStatus = "1";
    }
  }
  const plan = planTalentChildCreate(existing, {
    parentId: parent.id,
    existingParentStatus,
  });
  if (plan.action === "rebind") {
    return pb.collection("talent_children").update<TalentChildRecord>(
      plan.childId,
      {
        ...buildTalentChildRebindData(body, parent.id),
        updatedBy: operatorId,
      },
      { $autoCancel: false },
    );
  }
  return pb.collection("talent_children").create<TalentChildRecord>(
    {
      ...buildTalentChildCreateData(body, parent.id),
      createdBy: operatorId,
      updatedBy: operatorId,
    },
    { $autoCancel: false },
  );
}

/**
 * 编辑子女：身份证留空不改；姓名 / 性别 / 生日 / 身份证变化时返回 `requery=true`，
 * 调用方负责调用查询状态机（先重置查询字段，避免 `found` 状态拒绝重查）。
 */
export async function updateTalentMemberChild(
  pb: PocketBase,
  childId: string,
  body: {
    name?: string;
    gender?: string;
    birthday?: string;
    relation?: string;
    idNo?: string;
  },
  actor?: TalentMemberWriteActor,
): Promise<{ child: TalentChildRecord; requery: boolean }> {
  const operatorId = talentMemberActorId(actor);
  const current = await getTalentChildOrThrow(pb, childId);
  assertTalentChildEditable(current);
  const patch: Record<string, unknown> = { updatedBy: operatorId };
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) throw invalidTalentMember("子女姓名不能为空");
    if (name.length > 50) throw invalidTalentMember("子女姓名不能超过 50 个字符");
    patch.name = name;
  }
  if (body.gender !== undefined)
    patch.gender = assertTalentMemberGender(body.gender);
  if (body.relation !== undefined)
    patch.relation = assertTalentChildRelation(body.relation);
  const nextBirthday =
    body.birthday !== undefined
      ? assertTalentMemberBirthday(body.birthday, { required: true })
      : String(current.birthday || "");
  if (body.birthday !== undefined) patch.birthday = nextBirthday;
  const idNoProvided =
    body.idNo !== undefined && String(body.idNo).trim() !== "";
  if (idNoProvided) {
    const normalizedIdNo = assertTalentMemberIdNo(String(body.idNo));
    assertTalentMemberIdNoBirthday(normalizedIdNo, nextBirthday);
    const triplet = buildTalentIdNoTriplet(normalizedIdNo);
    if (triplet.idNoHash !== String(current.idNoHash || "")) {
      const existing = await findTalentChildByIdNoHash(pb, triplet.idNoHash);
      if (existing && existing.id !== current.id)
        throw conflictTalentMember("该子女身份证号已存在档案");
    }
    patch.idNoCipher = triplet.idNoCipher;
    patch.idNoHash = triplet.idNoHash;
    patch.maskedIdNo = triplet.maskedIdNo;
  } else if (body.birthday !== undefined && nextBirthday !== current.birthday) {
    // 已有证件时改生日必须与证件一致。
    const currentIdNo = decryptTalentSensitive(current.idNoCipher || "");
    assertTalentMemberIdNoBirthday(currentIdNo, nextBirthday);
  }
  const requery = shouldRequeryTalentChild(current, {
    name: body.name,
    gender: body.gender,
    birthday: body.birthday,
    idNo: body.idNo,
  });
  if (requery) {
    // 关键字段变更无条件重查：先复位查询状态与时间，绕开 found 拒查与 30s 节流。
    patch.query = "unqueried";
    patch.queryReason = "";
    patch.queryStartedAt = "";
    patch.queryAt = "";
  }
  const child = await pb
    .collection("talent_children")
    .update<TalentChildRecord>(current.id, patch, { $autoCancel: false });
  return { child, requery };
}

/** 解绑子女：保留档案、parentId 置空、status="2"；重复解绑幂等。 */
export async function unbindTalentMemberChild(
  pb: PocketBase,
  childId: string,
  actor?: TalentMemberWriteActor,
): Promise<{ child: TalentChildRecord; alreadyUnbound: boolean }> {
  const operatorId = talentMemberActorId(actor);
  const current = await getTalentChildOrThrow(pb, childId);
  if (String(current.status) === "2")
    return { child: current, alreadyUnbound: true };
  const patch = buildTalentChildUnbindPatch(current, {
    operatorId: operatorId || undefined,
  });
  const child = await pb.collection("talent_children").update<TalentChildRecord>(
    current.id,
    { ...patch, updatedBy: operatorId },
    { $autoCancel: false },
  );
  return { child, alreadyUnbound: false };
}

/** 家长身份证全号：未填证件 404，解密失败 500（不降级明文）。 */
export async function readTalentParentIdNo(
  pb: PocketBase,
  parentId: string,
): Promise<{ parentNo: string; name: string; idNo: string }> {
  const parent = await getTalentParentOrThrow(pb, parentId);
  if (!String(parent.idNoCipher || "").trim())
    throw createError({ statusCode: 404, message: "该家长未填写身份证" });
  return {
    parentNo: String(parent.parentNo || ""),
    name: String(parent.name || ""),
    idNo: decryptTalentSensitive(parent.idNoCipher || ""),
  };
}

/** 子女身份证全号：未填证件 404，解密失败 500（不降级明文）。 */
export async function readTalentChildIdNo(
  pb: PocketBase,
  childId: string,
): Promise<{ name: string; idNo: string }> {
  const child = await getTalentChildOrThrow(pb, childId);
  if (!String(child.idNoCipher || "").trim())
    throw createError({ statusCode: 404, message: "该子女未填写身份证" });
  return {
    name: String(child.name || ""),
    idNo: decryptTalentSensitive(child.idNoCipher || ""),
  };
}
