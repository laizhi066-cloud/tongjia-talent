/**
 * @description M7 C 端 API 响应契约（`/api/client/talent/**`）：与
 *   `apps/client/src/api/talent-types.ts` 字段一一对应，冻结方分别为 M2 / M3 / M4 / M5，
 *   本文件只做服务端投影类型，不新增事实源。
 *   口径见 docs/specs/M7-c-end/spec.md §10.2、§10.4 与 docs/adr/0007-m7-client-portal.md。
 * @file shared/types/talent-client.ts
 */
import type {
  TalentChildQuery,
  TalentQueryReason,
} from "./talent-member";
import type { TalentAdviceClientBookState } from "./talent-advice";
import type { TalentReportSubjectType } from "./talent-report";

/** 账号级状态（summary 派生）：正常 / 未绑定家长 / 家长停用。 */
export type TalentClientAccountState = "active" | "unbound" | "parent_disabled";

/** 报告状态（M3 三态 + 无报告）。 */
export type TalentClientReportStatus =
  | "published"
  | "pending_publish"
  | "retracted"
  | "none";

/** 分册可读状态：可读 / 已检测未开放 / 本次未检测。 */
export type TalentClientVolumeState = "readable" | "not_open" | "not_detected";

// ── summary ────────────────────────────────────────────────────────────────

/** 当前对象的报告视图（不含报告编号 / 证件原文 / cipher / hash）。 */
export interface TalentClientSummarySubject {
  subjectType: TalentReportSubjectType;
  subjectId: string;
  name: string;
  gender: "male" | "female" | "";
  genderLabel: string;
  age: number;
  ageLabel: string;
  relation: string;
  relationLabel: string;
  query: TalentChildQuery | null;
  queryReason: TalentQueryReason | "";
  /** 无报告为空串。 */
  reportId: string;
  reportStatus: TalentClientReportStatus;
  /** 服务端派生脚注文案（§11.2，不得改写）。 */
  statusText: string;
  readableVolumeCount: number;
  totalVolumeCount: number;
  adviceCount: number;
  selectedDirectionCount: number;
  selectionLimit: number;
}

/** 页脚（站点配置只读投影）。 */
export interface TalentClientFooter {
  copyright: string;
  contactPhone: string;
}

/** `GET /api/client/talent/summary` 响应 `data`。 */
export interface TalentClientSummaryResponse {
  accountState: TalentClientAccountState;
  subjects: TalentClientSummarySubject[];
  currentId: string;
  current: TalentClientSummarySubject | null;
  pendingCheckCount: number;
  footer: TalentClientFooter;
}

// ── 报告总览 / 分册 / 要素解读 ──────────────────────────────────────────────

export interface TalentClientReportInfo {
  id: string;
  status: TalentClientReportStatus;
  statusLabel: string;
  publishedAt: string;
  snapshotVersion: number;
  readableVolumeCount: number;
  totalVolumeCount: number;
  volumeHeaderText: string;
  adviceCount: number;
}

export interface TalentClientReportSubject {
  subjectType: TalentReportSubjectType;
  name: string;
  genderLabel: string;
  ageLabel: string;
  relationLabel: string;
}

export interface TalentClientReportVolumeSummary {
  volumeId: string;
  name: string;
  sortOrder: number;
  state: TalentClientVolumeState;
  chapterCount: number;
  factorCount: number;
}

/** `GET /api/client/talent/reports/:id` 响应 `data`。 */
export interface TalentClientReportOverviewResponse {
  report: TalentClientReportInfo;
  subject: TalentClientReportSubject;
  volumes: TalentClientReportVolumeSummary[];
}

/** 要素关联的培养方向（只给展示名与命中数，不含编码）。 */
export interface TalentClientFactorDirection {
  directionId: string;
  name: string;
  hitCount: number;
  total: number;
}

export interface TalentClientVolumeFactor {
  /** 本册内 0 起序号（上一项 / 下一项与深链定位）。 */
  index: number;
  name: string;
  levelName: string;
  note: string;
  condition: string;
  relatedDirections: TalentClientFactorDirection[];
}

export interface TalentClientEntropyOption {
  name: string;
  count: number;
}

export interface TalentClientVolumeChapter {
  chapter: string;
  factorIndexes: number[];
}

export interface TalentClientVolumeSummary {
  volumeId: string;
  name: string;
  sortOrder: number;
  chapterCount: number;
  factorCount: number;
}

/** `GET /api/client/talent/reports/:id/volumes/:volumeId` 响应 `data`。 */
export interface TalentClientVolumeResponse {
  volume: TalentClientVolumeSummary;
  entropyOptions: TalentClientEntropyOption[];
  chapters: TalentClientVolumeChapter[];
  factors: TalentClientVolumeFactor[];
}

/** `GET /api/client/talent/reports/:id/factors/:factorCode` 响应 `data`。 */
export interface TalentClientFactorResponse {
  volume: TalentClientVolumeSummary;
  factor: TalentClientVolumeFactor;
  /** 同册上一项 / 下一项序号（本册内循环，由页面取模即可）。 */
  prevIndex: number;
  nextIndex: number;
}

// ── 培育建议（M5 冻结快照 + 展示别名） ──────────────────────────────────────

/** 数据熵筛选（M5 快照 `level` 同时补 `name` 展示别名，兼容两种消费口径）。 */
export interface TalentClientEntropyLevel {
  name: string;
  level: string;
  count: number;
}

/** C 端建议书单册（M5 `TalentAdviceClientBook` 的投影）。 */
export interface TalentClientAdviceBook {
  book: string;
  bookName: string;
  state: TalentAdviceClientBookState;
  adviceNo: string;
  sectionCount: number;
  total: number;
  entropyList: TalentClientEntropyLevel[];
  sections: Array<{
    chapter: string;
    factor: string;
    entropy: string;
    content: string;
    example: string;
    direction: string;
    suggestion: string;
  }>;
}

/** 建议版本 / 周期（M5 冻结字段）。 */
export interface TalentClientAdviceVersion {
  versionNo: string;
  cycle: string;
  effectiveAt: string;
  nextUpdateAt: string;
  cycleMonths: number;
}

/** 建议书对象（脱敏，只给姓名 / 性别 / 周岁）。 */
export interface TalentClientAdviceOwner {
  name: string;
  gender: "male" | "female";
  genderLabel: string;
  age: number;
  ageLabel: string;
}

/** `GET /api/client/talent/advice?reportId=` 响应 `data`。 */
export type TalentClientAdviceResponse =
  | { available: false; emptyText: string }
  | {
      available: true;
      version: TalentClientAdviceVersion;
      owner: TalentClientAdviceOwner;
      books: TalentClientAdviceBook[];
      emptyText: string;
    };

// ── 培养方向 / 选择（M4 冻结契约） ──────────────────────────────────────────

export interface TalentClientDirectionRequirement {
  factorName: string;
  needLevelName: string;
  actualLevelName: string;
  met: boolean;
  gap: number;
}

export interface TalentClientDirectionTier {
  tierId: string;
  name: string;
  teacher: string;
  freq: string;
  headline: string;
  description: string;
  default: boolean;
}

export interface TalentClientDirectionItem {
  directionId: string;
  name: string;
  description: string;
  icon: string;
  hitCount: number;
  total: number;
  hitRate: number;
  selected: boolean;
  selectedTierId: string;
  requirements: TalentClientDirectionRequirement[];
  tiers: TalentClientDirectionTier[];
  defaultTierId: string;
  selectable: boolean;
  fallback: boolean;
}

export interface TalentClientSelectionItem {
  selectionId: string;
  directionId: string;
  requestId: string;
  custom: boolean;
  directionName: string;
  tierId: string;
  tierName: string;
  teacher: string;
  freq: string;
  manualName: string;
  selectedAt: string;
}

export interface TalentClientManualOption {
  directionId: string;
  name: string;
}

/** `GET /api/client/talent/directions?reportId=` 响应 `data`。 */
export interface TalentClientDirectionsResponse {
  reportId: string;
  snapshotVersion: number;
  publishedAt: string;
  recommendLimit: number;
  selectionLimit: number;
  selectionCount: number;
  fallback: boolean;
  emptyReason: string | null;
  items: TalentClientDirectionItem[];
  selections: TalentClientSelectionItem[];
  /** 全局启用档位（快照 `tiers` ∩ 当前启用；字段与 `items[].tiers` 一致，供换档 / 详情兜底）。 */
  tiers: TalentClientDirectionTier[];
  /** 自填页培养目标候选（与 `tiers` 同源；快照无档位时回退当前启用档位）。 */
  manualTiers: TalentClientDirectionTier[];
  manualOptions: TalentClientManualOption[];
  manualLimit: number;
}

/** 选择 / 换档 / 取消的公共响应。 */
export interface TalentClientSelectionMutationResponse {
  selection?: TalentClientSelectionItem;
  selections: TalentClientSelectionItem[];
  selectionCount: number;
  selectionLimit: number;
  alreadySelected?: boolean;
  changed?: boolean;
}

// ── 家长资料 / 孩子（M2 加密与脱敏） ────────────────────────────────────────

export interface TalentClientProfileResponse {
  id: string;
  /** 中性账户 id（avatar / nickname 真源）。 */
  userId: string;
  nickname: string;
  avatar: string;
  name: string;
  gender: "male" | "female" | "";
  genderLabel: string;
  birthday: string;
  /** 脱敏手机号，只读。 */
  maskedMobile: string;
  /** 脱敏身份证；未填写为空串。 */
  maskedIdNo: string;
  hasIdNo: boolean;
}

export interface TalentClientProfileInput {
  name?: string;
  nickname?: string;
  avatar?: string;
  gender?: "male" | "female";
  birthday?: string;
  idNo?: string;
}

export interface TalentClientChildItem {
  id: string;
  name: string;
  gender: "male" | "female" | "";
  genderLabel: string;
  birthday: string;
  age: number;
  ageLabel: string;
  relation: string;
  relationLabel: string;
  maskedIdNo: string;
  query: TalentChildQuery;
  queryReason: TalentQueryReason | "";
  queryReasonLabel: string;
  reportCount: number;
}

export interface TalentClientChildrenResponse {
  items: TalentClientChildItem[];
}

export interface TalentClientChildInput {
  name: string;
  gender: "male" | "female";
  relation: string;
  birthday: string;
  /** 新增必填；编辑留空表示不修改。 */
  idNo?: string;
}