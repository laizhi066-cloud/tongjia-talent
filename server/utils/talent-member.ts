/**
 * @description M2 会员域服务端领域工具：手机号 / 身份证 / 生日 / 枚举校验、会员编号生成与不可改、
 *   敏感字段三件套落库数据、脱敏映射（sanitize）、状态迁移与重绑计划、归属解析与报告计数占位。
 *   纯函数优先；仅少量 PocketBase 查询封装。页面与 API 只通过本模块取会员域语义，
 *   不得直接读取集合原始记录（含 cipher / hash）。
 * @file server/utils/talent-member.ts
 */
import { createError } from "h3";
import type PocketBase from "pocketbase";
import {
  TALENT_CHILD_PARENT_DISABLED_LABEL,
  TALENT_CHILD_QUERIES,
  TALENT_CHILD_RELATIONS,
  TALENT_CHILD_RELATION_LABELS,
  TALENT_CHILD_STATUS_LABELS,
  TALENT_CHILD_QUERY_LABELS,
  TALENT_MEMBER_GENDERS,
  TALENT_MEMBER_GENDER_LABELS,
  TALENT_PARENT_SOURCES,
  TALENT_PARENT_SOURCE_LABELS,
  TALENT_PARENT_STATUS_LABELS,
  TALENT_QUERY_REASONS,
  TALENT_QUERY_REASON_LABELS,
  type TalentChildQuery,
  type TalentChildRecord,
  type TalentChildRelation,
  type TalentChildStatus,
  type TalentMemberBindingItem,
  type TalentMemberChildView,
  type TalentMemberGender,
  type TalentMemberListRow,
  type TalentMemberParentView,
  type TalentParentRecord,
  type TalentParentSource,
  type TalentQueryReason,
} from "~~/shared/types/talent-member";
import type { TalentStatus } from "~~/shared/types/talent";
import { escapeFilterValue } from "./pocketbase-client";
import {
  encryptTalentSensitive,
  hashTalentMemberIdNo,
  hashTalentMemberMobile,
  maskTalentIdNo,
  maskTalentMobile,
  normalizeTalentIdNo,
  normalizeTalentMobile,
} from "./talent-member-crypto";

/** 单个家长最多可维护的子女数（BR / spec §4.5）。 */
export const TALENT_MEMBER_MAX_CHILDREN_PER_PARENT = 10;
/** 会员编号格式：`P` + `YYYYMMDD` + 4 位当日序号。 */
export const TALENT_PARENT_NO_PATTERN = /^P\d{12}$/;
/** 手机号格式。 */
export const TALENT_MEMBER_MOBILE_PATTERN = /^1[3-9]\d{9}$/;
/** 身份证格式：18 位，末位可为 X，不校验校验位。 */
export const TALENT_MEMBER_ID_NO_PATTERN = /^\d{17}[\dX]$/;

// ── 统一错误：422 业务校验 / 409 唯一或状态冲突 / 404 不存在（不泄露存在性） ──────────────

export function invalidTalentMember(message: string) {
  return createError({ statusCode: 422, message });
}

export function conflictTalentMember(message: string) {
  return createError({ statusCode: 409, message });
}

export function notFoundTalentMember(message = "会员档案不存在") {
  return createError({ statusCode: 404, message });
}

// ── 日期工具：生日 / 注册时间 / PB date 字符串 ───────────────────────────────────────

const TALENT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** 是否为合法日历日期（拒绝 `2026-02-30` 这类格式正确但不存在的日期）。 */
export function isTalentMemberDate(value: string): boolean {
  const raw = String(value ?? "").trim();
  if (!TALENT_DATE_PATTERN.test(raw)) return false;
  const year = Number(raw.slice(0, 4));
  const month = Number(raw.slice(5, 7));
  const day = Number(raw.slice(8, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** 本地日期 `YYYY-MM-DD`（业务「当日」按服务器本地时区）。 */
export function formatTalentMemberDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** PocketBase `date` 字段格式：`YYYY-MM-DD HH:mm:ss.sssZ`。 */
export function formatTalentMemberDateTime(date: Date): string {
  return date.toISOString().replace("T", " ");
}

/** 校验出生日期：`YYYY-MM-DD`、合法日期、不得晚于今天；`required` 时空值报错。 */
export function assertTalentMemberBirthday(
  input: string,
  options: { required?: boolean } = {},
): string {
  const value = String(input ?? "").trim();
  if (!value) {
    if (options.required) throw invalidTalentMember("出生日期不能为空");
    return "";
  }
  if (!isTalentMemberDate(value))
    throw invalidTalentMember("出生日期格式应为 YYYY-MM-DD");
  if (value > formatTalentMemberDate(new Date()))
    throw invalidTalentMember("出生日期不能晚于今天");
  return value;
}

// ── 基础校验：手机号 / 身份证 / 枚举 ────────────────────────────────────────────────

/** 校验并归一化手机号（去空格 / 连字符 / `+86`），格式错误 422。 */
export function assertTalentMemberMobile(input: string): string {
  const value = normalizeTalentMobile(input);
  if (!TALENT_MEMBER_MOBILE_PATTERN.test(value))
    throw invalidTalentMember("手机号格式不正确");
  return value;
}

/** 校验并归一化身份证（18 位、末位可为 X、不校验校验位），格式错误 422。 */
export function assertTalentMemberIdNo(input: string): string {
  const value = normalizeTalentIdNo(input);
  if (!TALENT_MEMBER_ID_NO_PATTERN.test(value))
    throw invalidTalentMember("身份证号应为 18 位");
  return value;
}

/** 取身份证第 7–14 位生日；日期不合法时 422。 */
export function extractTalentMemberIdNoBirthday(idNo: string): string {
  const value = assertTalentMemberIdNo(idNo);
  const birthday = `${value.slice(6, 10)}-${value.slice(10, 12)}-${value.slice(12, 14)}`;
  if (!isTalentMemberDate(birthday))
    throw invalidTalentMember("身份证号中的出生日期不合法");
  return birthday;
}

/** 强校验身份证中的生日与填写的 `birthday` 一致（BR-11）。 */
export function assertTalentMemberIdNoBirthday(
  idNo: string,
  birthday: string,
): void {
  const fromIdNo = extractTalentMemberIdNoBirthday(idNo);
  const normalized = assertTalentMemberBirthday(birthday, { required: true });
  if (fromIdNo !== normalized)
    throw invalidTalentMember("身份证号与出生日期不一致");
}

/**
 * 家长「身份证（选填）+ 生日」成对校验：
 * 填身份证必须填生日且一致；不填身份证时生日可空。
 */
export function assertTalentParentIdNoPair(input: {
  idNo?: string;
  birthday?: string;
}): { idNo: string; birthday: string } {
  const rawIdNo = String(input.idNo ?? "").trim();
  const rawBirthday = String(input.birthday ?? "").trim();
  if (!rawIdNo) {
    return {
      idNo: "",
      birthday: rawBirthday ? assertTalentMemberBirthday(rawBirthday) : "",
    };
  }
  if (!rawBirthday)
    throw invalidTalentMember("填写身份证时必须填写出生日期");
  const idNo = assertTalentMemberIdNo(rawIdNo);
  assertTalentMemberIdNoBirthday(idNo, rawBirthday);
  return { idNo, birthday: rawBirthday };
}

export function assertTalentMemberGender(input: unknown): TalentMemberGender {
  const value = String(input ?? "").trim();
  if (!(TALENT_MEMBER_GENDERS as readonly string[]).includes(value))
    throw invalidTalentMember("性别只能是 male / female");
  return value as TalentMemberGender;
}

export function assertTalentChildRelation(input: unknown): TalentChildRelation {
  const value = String(input ?? "").trim();
  if (!(TALENT_CHILD_RELATIONS as readonly string[]).includes(value))
    throw invalidTalentMember("与家长关系不在允许范围内");
  return value as TalentChildRelation;
}

export function assertTalentParentSource(input: unknown): TalentParentSource {
  const value = String(input ?? "").trim();
  if (!(TALENT_PARENT_SOURCES as readonly string[]).includes(value))
    throw invalidTalentMember("会员来源不在允许范围内");
  return value as TalentParentSource;
}

export function assertTalentParentStatus(input: unknown): TalentStatus {
  const value = String(input ?? "").trim();
  if (value !== "0" && value !== "1")
    throw invalidTalentMember("会员状态只能是 0（停用）或 1（正常）");
  return value;
}

// ── 会员编号：生成 / 格式 / 不可改 ──────────────────────────────────────────────────

export function assertTalentParentNo(input: string): string {
  const value = String(input ?? "").trim();
  if (!TALENT_PARENT_NO_PATTERN.test(value))
    throw invalidTalentMember("会员编号格式应为 P + 12 位数字");
  return value;
}

/** 由日期与当日序号拼出会员编号，如 `P202611160001`。 */
export function formatTalentParentNo(today: string, sequence: number): string {
  if (!isTalentMemberDate(today))
    throw invalidTalentMember("会员编号日期不合法");
  const seq = Number(sequence);
  if (!Number.isInteger(seq) || seq < 1 || seq > 9999)
    throw invalidTalentMember("会员编号当日序号必须在 1–9999 之间");
  return `P${today.replace(/-/g, "")}${String(seq).padStart(4, "0")}`;
}

/** 当日已有编号的最大序号；同一天之外或格式不合法的编号忽略。 */
export function maxTalentParentNoSequence(
  existingNos: readonly string[],
  today: string,
): number {
  const prefix = `P${String(today).replace(/-/g, "")}`;
  let max = 0;
  for (const raw of existingNos) {
    const value = String(raw ?? "").trim();
    if (!value.startsWith(prefix)) continue;
    const seq = Number(value.slice(prefix.length));
    if (Number.isInteger(seq) && seq > max) max = seq;
  }
  return max;
}

/** 下一个会员编号：当日最大序号 + 1；冲突重试由调用方负责（最多 5 次）。 */
export function nextTalentParentNo(
  existingNos: readonly string[],
  today: string,
): string {
  return formatTalentParentNo(today, maxTalentParentNoSequence(existingNos, today) + 1);
}

/** 编辑时会员编号不可修改：出现且与库中不同 → 422。 */
export function assertTalentParentNoImmutable(
  currentNo: string,
  nextNo: string | undefined,
): void {
  if (
    nextNo !== undefined &&
    String(nextNo).trim() !== "" &&
    String(nextNo).trim() !== String(currentNo).trim()
  )
    throw invalidTalentMember("会员编号不可修改");
}

// ── 敏感字段三件套落库数据（明文只在内存出现） ─────────────────────────────────────

export function buildTalentMobileTriplet(mobile: string): {
  mobileCipher: string;
  mobileHash: string;
  maskedMobile: string;
} {
  const normalized = assertTalentMemberMobile(mobile);
  return {
    mobileCipher: encryptTalentSensitive(normalized),
    mobileHash: hashTalentMemberMobile(normalized),
    maskedMobile: maskTalentMobile(normalized),
  };
}

export function buildTalentIdNoTriplet(idNo: string): {
  idNoCipher: string;
  idNoHash: string;
  maskedIdNo: string;
} {
  const normalized = assertTalentMemberIdNo(idNo);
  return {
    idNoCipher: encryptTalentSensitive(normalized),
    idNoHash: hashTalentMemberIdNo(normalized),
    maskedIdNo: maskTalentIdNo(normalized),
  };
}

// ── 档案资料归一化（新建 / 编辑共用） ───────────────────────────────────────────────

export interface TalentParentProfileInput {
  name?: string;
  mobile?: string;
  idNo?: string;
  birthday?: string;
  gender?: string;
  remark?: string;
  source?: string;
}

/**
 * 归一化家长资料。`mobile` 为空表示「编辑时不修改手机号」；
 * 身份证为空表示「未填写 / 不修改身份证」。
 */
export function normalizeTalentParentProfile(
  input: TalentParentProfileInput,
): {
  name: string;
  mobile: string;
  mobileTriplet?: {
    mobileCipher: string;
    mobileHash: string;
    maskedMobile: string;
  };
  idNo: string;
  idNoTriplet?: {
    idNoCipher: string;
    idNoHash: string;
    maskedIdNo: string;
  };
  birthday: string;
  gender: TalentMemberGender | "";
  source: TalentParentSource;
  remark: string;
} {
  const name = String(input.name ?? "").trim();
  if (!name) throw invalidTalentMember("家长姓名不能为空");
  if (name.length > 50) throw invalidTalentMember("家长姓名不能超过 50 个字符");
  const rawMobile = String(input.mobile ?? "").trim();
  const mobile = rawMobile ? assertTalentMemberMobile(rawMobile) : "";
  const { idNo, birthday } = assertTalentParentIdNoPair(input);
  const gender = input.gender ? assertTalentMemberGender(input.gender) : "";
  const source = input.source
    ? assertTalentParentSource(input.source)
    : "admin";
  const remark = String(input.remark ?? "").trim().slice(0, 500);
  return {
    name,
    mobile,
    mobileTriplet: mobile ? buildTalentMobileTriplet(mobile) : undefined,
    idNo,
    idNoTriplet: idNo ? buildTalentIdNoTriplet(idNo) : undefined,
    birthday,
    gender,
    source,
    remark,
  };
}

export interface TalentChildProfileInput {
  name?: string;
  gender?: string;
  birthday?: string;
  relation?: string;
  idNo?: string;
}

/** 归一化子女资料（姓名 / 性别 / 关系 / 生日 / 身份证 + 证件三件套）。 */
export function normalizeTalentChildProfile(input: TalentChildProfileInput): {
  name: string;
  gender: TalentMemberGender;
  birthday: string;
  relation: TalentChildRelation;
  rawIdNo: string;
  idNoCipher: string;
  idNoHash: string;
  maskedIdNo: string;
} {
  const name = String(input.name ?? "").trim();
  if (!name) throw invalidTalentMember("子女姓名不能为空");
  if (name.length > 50) throw invalidTalentMember("子女姓名不能超过 50 个字符");
  const gender = assertTalentMemberGender(input.gender);
  const relation = assertTalentChildRelation(input.relation);
  const birthday = assertTalentMemberBirthday(input.birthday || "", {
    required: true,
  });
  const rawIdNo = assertTalentMemberIdNo(input.idNo || "");
  assertTalentMemberIdNoBirthday(rawIdNo, birthday);
  return {
    name,
    gender,
    birthday,
    relation,
    rawIdNo,
    ...buildTalentIdNoTriplet(rawIdNo),
  };
}

/** 新建子女落库数据：查询状态由 query 模块的发起流程推进，初始为未查询。 */
export function buildTalentChildCreateData(
  input: TalentChildProfileInput,
  parentId: string,
): Record<string, unknown> {
  const profile = normalizeTalentChildProfile(input);
  return {
    parentId: String(parentId),
    name: profile.name,
    gender: profile.gender,
    birthday: profile.birthday,
    relation: profile.relation,
    idNoCipher: profile.idNoCipher,
    idNoHash: profile.idNoHash,
    maskedIdNo: profile.maskedIdNo,
    query: "unqueried",
    queryReason: "",
    querySeq: 0,
    queryAttempts: 0,
    status: "1",
  };
}

/** 重绑已解绑档案落库数据：复用原档案 id，重置查询并清空解绑信息。 */
export function buildTalentChildRebindData(
  input: TalentChildProfileInput,
  parentId: string,
): Record<string, unknown> {
  return {
    ...buildTalentChildCreateData(input, parentId),
    status: "1",
    unbindAt: "",
    unbindBy: "",
    queryStartedAt: "",
    queryAt: "",
  };
}

// ── 一孩一家长 / 重绑计划（纯函数，PB 查询由调用方完成） ─────────────────────────────

export type TalentChildCreatePlan =
  | { action: "create" }
  | { action: "rebind"; childId: string };

/**
 * 新增子女命中同 `idNoHash` 时的计划：
 * - 未命中 → 新建；
 * - 命中已解绑档案 → 重绑复用；
 * - 命中正常档案 → 409（同家长提示直接编辑，其他家长提示先解绑 / 核对，父家长停用单独提示）。
 */
export function planTalentChildCreate(
  existing:
    | Pick<TalentChildRecord, "id" | "status" | "parentId">
    | null
    | undefined,
  options: { parentId: string; existingParentStatus?: string },
): TalentChildCreatePlan {
  if (!existing) return { action: "create" };
  if (String(existing.status) === "2")
    return { action: "rebind", childId: existing.id };
  if (String(existing.parentId || "") === String(options.parentId))
    throw conflictTalentMember("该子女档案已存在，请直接在名下子女中编辑");
  if (String(options.existingParentStatus || "1") !== "1")
    throw conflictTalentMember("该子女档案所属家长已停用");
  throw conflictTalentMember(
    "该子女档案已关联其他家长，请先解绑或核对档案",
  );
}

/** 解绑落库数据：保留档案、置空归属、querySeq + 1 作废在途回执。 */
export function buildTalentChildUnbindPatch(
  child: Pick<TalentChildRecord, "querySeq">,
  options: { now?: Date; operatorId?: string } = {},
): {
  parentId: "";
  status: "2";
  unbindAt: string;
  querySeq: number;
  unbindBy?: string;
} {
  const now = options.now ?? new Date();
  const seq = Number(child.querySeq || 0);
  return {
    parentId: "",
    status: "2",
    unbindAt: formatTalentMemberDateTime(now),
    querySeq: Number.isFinite(seq) ? seq + 1 : 1,
    ...(options.operatorId ? { unbindBy: String(options.operatorId) } : {}),
  };
}

/** 编辑子女时是否需要重查：仅姓名 / 性别 / 生日 / 身份证变化触发；只改关系不重查。 */
export function shouldRequeryTalentChild(
  current: Pick<
    TalentChildRecord,
    "name" | "gender" | "birthday" | "idNoHash"
  >,
  patch: TalentChildProfileInput,
): boolean {
  if (patch.name !== undefined && String(patch.name).trim() !== current.name)
    return true;
  if (patch.gender !== undefined && String(patch.gender) !== current.gender)
    return true;
  if (
    patch.birthday !== undefined &&
    String(patch.birthday) !== current.birthday
  )
    return true;
  if (patch.idNo !== undefined && String(patch.idNo).trim() !== "") {
    const nextHash = hashTalentMemberIdNo(String(patch.idNo));
    if (nextHash !== current.idNoHash) return true;
  }
  return false;
}

// ── 状态迁移 ────────────────────────────────────────────────────────────────────

export function isTalentParentActive(status: unknown): boolean {
  return String(status ?? "") === "1";
}

export function isTalentChildActive(status: unknown): boolean {
  return String(status ?? "") === "1";
}

/** 已解绑子女不可编辑 / 不可重查（409）。 */
export function assertTalentChildEditable(
  child: Pick<TalentChildRecord, "status">,
): void {
  if (String(child.status) === "2")
    throw conflictTalentMember("该子女已解绑，不能编辑或重新查询");
}

/** 停用家长不可再发起新查询（409）。 */
export function assertTalentParentQueryable(
  parent: Pick<TalentParentRecord, "status"> | null | undefined,
): void {
  if (!parent || !isTalentParentActive(parent.status))
    throw conflictTalentMember("所属家长档案不存在或已停用，不能发起查询");
}

// ── 归属解析：C 端只按 userId 解析，不接受前端传 parentId ────────────────────────────

/** 纯函数归属校验：不存在 / 不属于当前家长 / 子女或家长非正常 → 统一 404。 */
export function assertTalentChildOwnership(
  parent: Pick<TalentParentRecord, "id" | "status"> | null | undefined,
  child: Pick<TalentChildRecord, "parentId" | "status"> | null | undefined,
): void {
  if (
    !parent ||
    !isTalentParentActive(parent.status) ||
    !child ||
    !isTalentChildActive(child.status) ||
    String(child.parentId || "") !== parent.id
  )
    throw notFoundTalentMember("子女档案不存在");
}

/** 按登录账号解析家长档案；未认领返回 null。 */
export async function resolveTalentParentByUserId(
  pb: PocketBase,
  userId: string,
): Promise<TalentParentRecord | null> {
  const id = String(userId ?? "").trim();
  if (!id) return null;
  try {
    return await pb
      .collection("talent_parents")
      .getFirstListItem<TalentParentRecord>(
        `userId = "${escapeFilterValue(id)}"`,
        { $autoCancel: false },
      );
  } catch {
    return null;
  }
}

/** 按手机号哈希查家长（claim / 重号检测）。 */
export async function findTalentParentByMobileHash(
  pb: PocketBase,
  mobileHash: string,
): Promise<TalentParentRecord | null> {
  const hash = String(mobileHash ?? "").trim();
  if (!hash) return null;
  try {
    return await pb
      .collection("talent_parents")
      .getFirstListItem<TalentParentRecord>(
        `mobileHash = "${escapeFilterValue(hash)}"`,
        { $autoCancel: false },
      );
  } catch {
    return null;
  }
}

/** 按身份证哈希查子女档案（新增 / 重绑去重）。 */
export async function findTalentChildByIdNoHash(
  pb: PocketBase,
  idNoHash: string,
): Promise<TalentChildRecord | null> {
  const hash = String(idNoHash ?? "").trim();
  if (!hash) return null;
  try {
    return await pb
      .collection("talent_children")
      .getFirstListItem<TalentChildRecord>(
        `idNoHash = "${escapeFilterValue(hash)}"`,
        { $autoCancel: false },
      );
  } catch {
    return null;
  }
}

/** 查询单个子女档案；不存在 → 404。 */
export async function getTalentChildOrThrow(
  pb: PocketBase,
  childId: string,
): Promise<TalentChildRecord> {
  try {
    return await pb
      .collection("talent_children")
      .getOne<TalentChildRecord>(String(childId), { $autoCancel: false });
  } catch {
    throw notFoundTalentMember("子女档案不存在");
  }
}

/** 查询单个家长档案；不存在 → 404。 */
export async function getTalentParentOrThrow(
  pb: PocketBase,
  parentId: string,
): Promise<TalentParentRecord> {
  try {
    return await pb
      .collection("talent_parents")
      .getOne<TalentParentRecord>(String(parentId), { $autoCancel: false });
  } catch {
    throw notFoundTalentMember("会员档案不存在");
  }
}

/**
 * C 端子女访问断言：按登录账号解析家长，再校验子女归属；
 * 任一不满足（不存在 / 不属于 / 子女解绑 / 家长停用）→ 404，不区分「不存在」与「无权限」。
 */
export async function assertTalentChildAccess(
  pb: PocketBase,
  userId: string,
  childId: string,
): Promise<{ parent: TalentParentRecord; child: TalentChildRecord }> {
  const parent = await resolveTalentParentByUserId(pb, userId);
  if (!parent || !isTalentParentActive(parent.status))
    throw notFoundTalentMember("子女档案不存在");
  const child = await getTalentChildOrThrow(pb, childId);
  assertTalentChildOwnership(parent, child);
  return { parent, child };
}

/** 生成会员编号：`P{YYYYMMDD}{4 位当日序号}`。 */
export async function generateTalentParentNo(
  pb: PocketBase,
  options: { now?: Date } = {},
): Promise<string> {
  const now = options.now ?? new Date();
  const today = formatTalentMemberDate(now);
  const prefix = `P${today.replace(/-/g, "")}`;
  let existingNos: string[] = [];
  try {
    const rows = await pb.collection("talent_parents").getFullList({
      filter: `parentNo ~ "${escapeFilterValue(prefix)}"`,
      fields: "parentNo",
      $autoCancel: false,
    });
    existingNos = rows.map((row) => String(row.parentNo || ""));
  } catch {
    existingNos = [];
  }
  return nextTalentParentNo(existingNos, today);
}

// ── 关联报告过渡读法（M3 前恒为 0；禁止读旧 customerId） ─────────────────────────────

export type TalentMemberReportSubjectType = "self" | "child";

/**
 * 按 `subjectType + subjectId` 统计报告数（为 M3 预留）：
 * 特性探测 `talent_reports` 是否已有这两个字段；不存在时返回全 0，绝不按旧 `customerId` 回查。
 */
export async function countTalentMemberReports(
  pb: PocketBase,
  subjectType: TalentMemberReportSubjectType,
  subjectIds: readonly string[],
): Promise<Map<string, number>> {
  const ids = Array.from(
    new Set(
      subjectIds.map((value) => String(value ?? "").trim()).filter(Boolean),
    ),
  );
  const counts = new Map<string, number>(ids.map((id) => [id, 0]));
  if (!ids.length) return counts;
  let fieldNames: string[] = [];
  try {
    const collection = await pb.collections.getOne("talent_reports");
    fieldNames = (collection.fields || []).map((field: { name: string }) =>
      String(field.name),
    );
  } catch {
    return counts;
  }
  if (!fieldNames.includes("subjectType") || !fieldNames.includes("subjectId"))
    return counts;
  const filter = `subjectType = "${escapeFilterValue(subjectType)}" && (${ids
    .map((id) => `subjectId = "${escapeFilterValue(id)}"`)
    .join(" || ")})`;
  try {
    const rows = await pb
      .collection("talent_reports")
      .getFullList({ filter, fields: "subjectId", $autoCancel: false });
    for (const row of rows) {
      const id = String(row.subjectId || "");
      if (counts.has(id)) counts.set(id, Number(counts.get(id) || 0) + 1);
    }
  } catch {
    return new Map(ids.map((id) => [id, 0]));
  }
  return counts;
}

// ── 脱敏映射：响应 / 页面唯一入口，删除 cipher / hash，补中文标签 ─────────────────────

function lookupLabel<T extends string>(
  labels: Readonly<Record<T, string>>,
  value: string | undefined,
): string {
  if (!value) return "";
  return (labels as Readonly<Record<string, string | undefined>>)[value] ?? "";
}

function resolveTalentMemberGender(value: unknown): TalentMemberGender | "" {
  const raw = String(value ?? "");
  return (TALENT_MEMBER_GENDERS as readonly string[]).includes(raw)
    ? (raw as TalentMemberGender)
    : "";
}

function resolveTalentChildStatus(value: unknown): TalentChildStatus {
  return String(value ?? "") === "2" ? "2" : "1";
}

function resolveTalentChildQuery(value: unknown): TalentChildQuery {
  const raw = String(value ?? "");
  return (TALENT_CHILD_QUERIES as readonly string[]).includes(raw)
    ? (raw as TalentChildQuery)
    : "unqueried";
}

function resolveTalentQueryReason(value: unknown): TalentQueryReason | "" {
  const raw = String(value ?? "");
  return (TALENT_QUERY_REASONS as readonly string[]).includes(raw)
    ? (raw as TalentQueryReason)
    : "";
}

/** 家长记录 → 对外视图；结果中不含任何 cipher / hash 字段。 */
export function sanitizeTalentParentRecord(
  record: TalentParentRecord,
): TalentMemberParentView {
  const maskedIdNo = String(record.maskedIdNo || "");
  return {
    id: String(record.id || ""),
    parentNo: String(record.parentNo || ""),
    name: String(record.name || ""),
    maskedMobile: String(record.maskedMobile || ""),
    maskedIdNo,
    idNoMissing: maskedIdNo === "",
    gender: resolveTalentMemberGender(record.gender),
    genderLabel: lookupLabel(
      TALENT_MEMBER_GENDER_LABELS,
      resolveTalentMemberGender(record.gender),
    ),
    birthday: String(record.birthday || ""),
    source: record.source,
    sourceLabel: lookupLabel(TALENT_PARENT_SOURCE_LABELS, record.source),
    status: record.status,
    statusLabel: lookupLabel(TALENT_PARENT_STATUS_LABELS, record.status),
    registeredAt: String(record.registeredAt || ""),
    remark: String(record.remark || ""),
    accountBound: String(record.userId || "").trim() !== "",
    createdAt: String(record.created || ""),
    updatedAt: String(record.updated || ""),
  };
}

/**
 * 子女记录 → 对外视图；结果中不含任何 cipher / hash 字段。
 * `options.parentStatus="0"` 时把正常子女派生展示为「已停用」，但不改 `status` 字段值。
 */
export function sanitizeTalentChildRecord(
  record: TalentChildRecord,
  options: { parentStatus?: string } = {},
): TalentMemberChildView {
  const status = resolveTalentChildStatus(record.status);
  const query = resolveTalentChildQuery(record.query);
  const queryReason =
    query === "not_found" ? resolveTalentQueryReason(record.queryReason) : "";
  let statusLabel = lookupLabel(TALENT_CHILD_STATUS_LABELS, status);
  if (status === "1" && String(options.parentStatus ?? "") === "0")
    statusLabel = TALENT_CHILD_PARENT_DISABLED_LABEL;
  return {
    id: String(record.id || ""),
    name: String(record.name || ""),
    gender: record.gender,
    genderLabel: lookupLabel(TALENT_MEMBER_GENDER_LABELS, record.gender),
    birthday: String(record.birthday || ""),
    relation: record.relation,
    relationLabel: lookupLabel(TALENT_CHILD_RELATION_LABELS, record.relation),
    maskedIdNo: String(record.maskedIdNo || ""),
    query,
    queryLabel: lookupLabel(TALENT_CHILD_QUERY_LABELS, query),
    queryReason,
    queryReasonLabel: lookupLabel(TALENT_QUERY_REASON_LABELS, queryReason),
    queryAt: String(record.queryAt || ""),
    queryAttempts: Number(record.queryAttempts || 0),
    status,
    statusLabel,
    createdAt: String(record.created || ""),
    updatedAt: String(record.updated || ""),
  };
}

/** 家长视图 + 聚合计数 → 列表行（`reportCount` 在 M3 前恒为 0）。 */
export function toTalentMemberListRow(
  record: TalentParentRecord,
  counts: { childCount?: number; reportCount?: number } = {},
): TalentMemberListRow {
  return {
    ...sanitizeTalentParentRecord(record),
    childCount: Number(counts.childCount || 0),
    reportCount: Number(counts.reportCount || 0),
  };
}

/** 本人 → C 端 bindings item（家长不做基因查询，`query` 固定 null）。 */
export function buildTalentMemberSelfBindingItem(
  view: TalentMemberParentView,
): TalentMemberBindingItem {
  return {
    id: view.id,
    objectType: "self",
    name: view.name,
    gender: view.gender,
    genderLabel: view.genderLabel,
    birthday: view.birthday,
    relation: "",
    relationLabel: "",
    maskedIdNo: view.maskedIdNo,
    query: null,
    queryReason: "",
    reportAvailable: false,
  };
}

/** 子女 → C 端 bindings item。 */
export function buildTalentMemberChildBindingItem(
  view: TalentMemberChildView,
): TalentMemberBindingItem {
  return {
    id: view.id,
    objectType: "child",
    name: view.name,
    gender: view.gender,
    genderLabel: view.genderLabel,
    birthday: view.birthday,
    relation: view.relation,
    relationLabel: view.relationLabel,
    maskedIdNo: view.maskedIdNo,
    query: view.query,
    queryReason: view.queryReason,
    reportAvailable: false,
  };
}