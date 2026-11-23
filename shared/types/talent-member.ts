/**
 * @description M2 会员域共享类型：家长档案 / 子女档案、查询四态与三类归因、与家长关系、来源、
 *   敏感字段三件套（密文 + 哈希 + 脱敏）以及对外视图类型。
 *   `*Record` 含 `*Cipher` / `*Hash`，只允许服务端内部使用；页面与响应只消费 `*View` / 列表行 /
 *   bindings item，任何响应都不得直接返回集合原始记录。
 * @file shared/types/talent-member.ts
 */
import type { TalentStatus } from "./talent";

/** PocketBase 记录公共字段。 */
export interface TalentMemberRecordBase {
  id: string;
  created: string;
  updated: string;
}

/** 性别：与 PRD「男 / 女」一一对应。 */
export const TALENT_MEMBER_GENDERS = ["male", "female"] as const;
export type TalentMemberGender = (typeof TALENT_MEMBER_GENDERS)[number];

/** 与家长关系：语义是「该家长是这名子女的谁」，不得按子女性别反推。 */
export const TALENT_CHILD_RELATIONS = [
  "father",
  "mother",
  "grandfather_paternal",
  "grandmother_paternal",
  "grandfather_maternal",
  "grandmother_maternal",
  "guardian",
] as const;
export type TalentChildRelation = (typeof TALENT_CHILD_RELATIONS)[number];

/** 家长档案来源；`mock` 只用于本地种子，禁止生产写入。 */
export const TALENT_PARENT_SOURCES = ["admin", "wechat", "mock"] as const;
export type TalentParentSource = (typeof TALENT_PARENT_SOURCES)[number];

/** 子女查询四态。 */
export const TALENT_CHILD_QUERIES = [
  "unqueried",
  "querying",
  "found",
  "not_found",
] as const;
export type TalentChildQuery = (typeof TALENT_CHILD_QUERIES)[number];

/** 三类归因；只有 `query="not_found"` 时有值。 */
export const TALENT_QUERY_REASONS = [
  "info_mismatch",
  "api_error",
  "no_result",
] as const;
export type TalentQueryReason = (typeof TALENT_QUERY_REASONS)[number];

/** 子女档案状态：正常 / 已解绑（家长停用由家长状态派生展示，不落子女状态）。 */
export const TALENT_CHILD_STATUSES = ["1", "2"] as const;
export type TalentChildStatus = (typeof TALENT_CHILD_STATUSES)[number];

/** C 端 bindings 对象类型：本人 / 已绑定子女。 */
export const TALENT_MEMBER_BINDING_TYPES = ["self", "child"] as const;
export type TalentMemberBindingType = (typeof TALENT_MEMBER_BINDING_TYPES)[number];

// ── 中文映射：服务端 sanitize 与页面标签统一从这里取，禁止各路由各写一份 ─────────────────

export const TALENT_MEMBER_GENDER_LABELS: Readonly<
  Record<TalentMemberGender, string>
> = {
  male: "男",
  female: "女",
};

export const TALENT_CHILD_RELATION_LABELS: Readonly<
  Record<TalentChildRelation, string>
> = {
  father: "父亲",
  mother: "母亲",
  grandfather_paternal: "祖父",
  grandmother_paternal: "祖母",
  grandfather_maternal: "外祖父",
  grandmother_maternal: "外祖母",
  guardian: "其他监护人",
};

export const TALENT_PARENT_SOURCE_LABELS: Readonly<
  Record<TalentParentSource, string>
> = {
  admin: "后台录入",
  wechat: "小程序注册",
  mock: "本地演示",
};

export const TALENT_PARENT_STATUS_LABELS: Readonly<Record<TalentStatus, string>> =
  {
    "1": "正常",
    "0": "停用",
  };

export const TALENT_CHILD_STATUS_LABELS: Readonly<
  Record<TalentChildStatus, string>
> = {
  "1": "正常",
  "2": "已解绑",
};

/** 家长停用后，子女在详情 / C 端的派生展示文案（不写回子女状态字段）。 */
export const TALENT_CHILD_PARENT_DISABLED_LABEL = "已停用";

export const TALENT_CHILD_QUERY_LABELS: Readonly<
  Record<TalentChildQuery, string>
> = {
  unqueried: "未查询",
  querying: "查询中",
  found: "已查到",
  not_found: "未查到",
};

export const TALENT_QUERY_REASON_LABELS: Readonly<
  Record<TalentQueryReason, string>
> = {
  info_mismatch: "信息不一致",
  api_error: "接口异常",
  no_result: "未出结果",
};

// ── 敏感字段三件套：密文可解、哈希用于唯一键 / 绑定、脱敏是唯一对外形态 ────────────────

/** 单项敏感字段的三件套。 */
export interface TalentSensitiveTriplet {
  /** AES-256-GCM 密文（`iv:tag:cipher` 十六进制），永不进响应。 */
  cipher: string;
  /** HMAC-SHA256 域分离哈希（64 位十六进制），永不进响应。 */
  hash: string;
  /** 前 4 + 后 4 脱敏值，唯一对外形态。 */
  masked: string;
}

/** 手机号三件套在家长档案上的字段形态。 */
export interface TalentMobileTripletFields {
  mobileCipher: string;
  mobileHash: string;
  maskedMobile: string;
}

/** 身份证三件套在档案上的字段形态。 */
export interface TalentIdNoTripletFields {
  idNoCipher: string;
  idNoHash: string;
  maskedIdNo: string;
}

// ── 集合原始记录：仅服务端内部使用（含 cipher / hash，禁止直接返回） ────────────────────

/** `talent_parents` 原始记录。 */
export interface TalentParentRecord
  extends TalentMemberRecordBase,
    TalentMobileTripletFields {
  parentNo: string;
  name: string;
  idNoCipher?: string;
  idNoHash?: string;
  maskedIdNo?: string;
  gender?: TalentMemberGender | "";
  /** `YYYY-MM-DD`；填身份证时必填且与证件第 7–14 位一致。 */
  birthday?: string;
  source: TalentParentSource;
  /** 停用唯一真源；`"1"` 正常 / `"0"` 停用。 */
  status: TalentStatus;
  registeredAt: string;
  /** 登录账号绑定（一账号一家长档案）；为空表示尚未认领。 */
  userId?: string;
  remark?: string;
  createdBy?: string;
  updatedBy?: string;
}

/** `talent_children` 原始记录。 */
export interface TalentChildRecord
  extends TalentMemberRecordBase,
    TalentIdNoTripletFields {
  /** 解绑后置空；`maxSelect: 1`。 */
  parentId?: string;
  name: string;
  gender: TalentMemberGender;
  birthday: string;
  relation: TalentChildRelation;
  query: TalentChildQuery;
  queryReason?: TalentQueryReason | "";
  /** 当前发起序号（0 起）；回执幂等键 `${childId}:${seq}`。 */
  querySeq: number;
  queryAttempts: number;
  queryStartedAt?: string;
  queryAt?: string;
  status: TalentChildStatus;
  unbindAt?: string;
  unbindBy?: string;
  createdBy?: string;
  updatedBy?: string;
}

// ── 对外视图：已删除 cipher / hash，可以安全返回页面与 C 端 ─────────────────────────────

/** 家长对外视图（列表行 / 详情 / 新建响应共用）。 */
export interface TalentMemberParentView {
  id: string;
  parentNo: string;
  name: string;
  maskedMobile: string;
  maskedIdNo: string;
  /** 未填家长身份证时为 true（列表显示 `—`，详情不显示查看入口）。 */
  idNoMissing: boolean;
  gender: TalentMemberGender | "";
  genderLabel: string;
  birthday: string;
  source: TalentParentSource;
  sourceLabel: string;
  status: TalentStatus;
  statusLabel: string;
  registeredAt: string;
  remark: string;
  /** 是否已绑定登录账号；不展示账号状态（账号状态归 M6）。 */
  accountBound: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 子女对外视图（详情 / 新建 / 编辑 / 查询 / 解绑响应共用）。 */
export interface TalentMemberChildView {
  id: string;
  name: string;
  gender: TalentMemberGender;
  genderLabel: string;
  birthday: string;
  relation: TalentChildRelation;
  relationLabel: string;
  maskedIdNo: string;
  query: TalentChildQuery;
  queryLabel: string;
  queryReason: TalentQueryReason | "";
  queryReasonLabel: string;
  queryAt: string;
  queryAttempts: number;
  status: TalentChildStatus;
  /** 家长停用时派生为「已停用」，不改变 `status` 字段值。 */
  statusLabel: string;
  createdAt: string;
  updatedAt: string;
}

/** 会员列表行：家长视图 + 聚合计数（`reportCount` 在 M3 前恒为 0）。 */
export interface TalentMemberListRow extends TalentMemberParentView {
  childCount: number;
  reportCount: number;
}

/** C 端 bindings 单个对象（本人或已绑定子女），只含脱敏信息。 */
export interface TalentMemberBindingItem {
  id: string;
  objectType: TalentMemberBindingType;
  name: string;
  gender: TalentMemberGender | "";
  genderLabel: string;
  birthday: string;
  relation: TalentChildRelation | "";
  relationLabel: string;
  maskedIdNo: string;
  /** 本人不做基因查询，固定为 null。 */
  query: TalentChildQuery | null;
  queryReason: TalentQueryReason | "";
  /** M3 接入前恒为 false。 */
  reportAvailable: boolean;
}

/** `GET /api/client/talent/bindings` 与 `claim` 沿用的信封。 */
export interface TalentMemberBindingsResponse {
  items: TalentMemberBindingItem[];
  currentId: string;
  current: TalentMemberBindingItem | null;
  currentRelationType: TalentMemberBindingType | "";
}

/** 子女一次查询发起结果（新建 / 编辑 / 重查接口共用）。 */
export interface TalentMemberQuerySubmitResult {
  accepted: boolean;
  throttled: boolean;
}

/** 统一分页壳（与既有列表接口一致）。 */
export interface TalentMemberPaginatedRows<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}