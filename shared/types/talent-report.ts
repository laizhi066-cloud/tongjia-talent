/**
 * @description M3 报告域共享类型：外部基因报告（一人一份）、报告三态与快照三件套、
 *   A–F ↔ V1–V6 固定映射、版本链、selections、一键同步三类归因与逐人明细。
 *   `*Record` 含外部原始篇目 / 冻结快照，只允许服务端内部使用；页面与响应只消费映射后的视图类型，
 *   任何集合原始记录都不得直接返回（ADR 0003-D1/D2/D5）。
 *   方向快照与 selections 的结构由 M4 冻结（`shared/types/talent-direction.ts`），本文件只 re-export，
 *   禁止复制第二套定义，避免 M3/M4 结构漂移。
 * @file shared/types/talent-report.ts
 */
import type { TalentStatus } from "./talent";

/** PocketBase 记录公共字段。 */
export interface TalentReportRecordBase {
  id: string;
  created: string;
  updated: string;
}

// ── 测评对象 ──────────────────────────────────────────────────────────────

/** 测评对象：子女（M3 同步对象）/ 家长本人（结构保留，M3 不主动创建）。 */
export const TALENT_REPORT_SUBJECT_TYPES = ["child", "self"] as const;
export type TalentReportSubjectType =
  (typeof TALENT_REPORT_SUBJECT_TYPES)[number];

export const TALENT_REPORT_SUBJECT_TYPE_LABELS: Readonly<
  Record<TalentReportSubjectType, string>
> = {
  child: "子女",
  self: "本人",
};

// ── 固定六册：外部编码 A–F ↔ 内部 V1–V6（BR-04；ADR 0003-D3） ──────────────

export const TALENT_GENE_REPORT_BOOK_CODES = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
] as const;
export type TalentGeneReportBookCode =
  (typeof TALENT_GENE_REPORT_BOOK_CODES)[number];

export const TALENT_REPORT_VOLUME_IDS = [
  "V1",
  "V2",
  "V3",
  "V4",
  "V5",
  "V6",
] as const;
export type TalentReportVolumeId = (typeof TALENT_REPORT_VOLUME_IDS)[number];

/** 六册固定映射（列表用字母、开放范围/快照用 V 号）。 */
export interface TalentReportVolumeDefinition {
  volumeId: TalentReportVolumeId;
  bookCode: TalentGeneReportBookCode;
  /** 册名固定：生长发育 / 智商 / 情商 / 领导商 / 艺术商 / 体育运动商。 */
  name: string;
  sortOrder: number;
}

export const TALENT_REPORT_VOLUME_DEFINITIONS: readonly TalentReportVolumeDefinition[] =
  [
    { volumeId: "V1", bookCode: "A", name: "生长发育", sortOrder: 1 },
    { volumeId: "V2", bookCode: "B", name: "智商", sortOrder: 2 },
    { volumeId: "V3", bookCode: "C", name: "情商", sortOrder: 3 },
    { volumeId: "V4", bookCode: "D", name: "领导商", sortOrder: 4 },
    { volumeId: "V5", bookCode: "E", name: "艺术商", sortOrder: 5 },
    { volumeId: "V6", bookCode: "F", name: "体育运动商", sortOrder: 6 },
  ];

// ── 报告状态机（三态；旧行可含 error，新代码不写） ────────────────────────

export const TALENT_REPORT_STATUSES = [
  "pending_publish",
  "published",
  "retracted",
] as const;
export type TalentReportStatus = (typeof TALENT_REPORT_STATUSES)[number];

/** 旧行遗留状态；新行三态之外不写。 */
export type TalentReportAnyStatus = TalentReportStatus | "error";

export const TALENT_REPORT_STATUS_LABELS: Readonly<
  Record<TalentReportAnyStatus, string>
> = {
  pending_publish: "待发布",
  published: "已发布",
  retracted: "已撤回",
  error: "异常",
};

/** 报告动作：发布 / 撤回 / 恢复 / 补发 / 显式重算 / 方向选择（写版本链）。 */
export const TALENT_REPORT_ACTIONS = [
  "publish",
  "withdraw",
  "restore",
  "reissue",
  "regenerate",
  "selection",
] as const;
export type TalentReportAction = (typeof TALENT_REPORT_ACTIONS)[number];

export const TALENT_REPORT_ACTION_LABELS: Readonly<
  Record<TalentReportAction, string>
> = {
  publish: "发布",
  withdraw: "撤回",
  restore: "恢复发布",
  reissue: "补发新增分册",
  regenerate: "重新生成快照",
  selection: "选择培养方向",
};

// ── 版本链（versions[] 只追加、不修改、不删除） ────────────────────────────

export type TalentReportVersionType = TalentReportAction;

/** `versions[]` 单条；`version` = 动作发生时的 `snapshotVersion`。 */
export interface TalentReportVersionEntry {
  version: number;
  type: TalentReportVersionType;
  summary: string;
  /** 发布/补发涉及的册编码（A–F）；其他动作为空或省略。 */
  books?: string[];
  operatorId: string;
  operatorName: string;
  /** ISO 8601 UTC 字符串。 */
  at: string;
}

/** 版本历史上限；超出保留最近 200 条并给首条加「历史已截断」前缀（spec §3.2.5）。 */
export const TALENT_REPORT_VERSION_LIMIT = 200;

// ── 外部基因报告（一人一份，subjectType + subjectId 唯一） ─────────────────

export const TALENT_GENE_REPORT_STATUSES = ["synced"] as const;
export type TalentGeneReportStatus =
  (typeof TALENT_GENE_REPORT_STATUSES)[number];

export const TALENT_GENE_REPORT_SOURCES = ["mock", "external"] as const;
export type TalentGeneReportSourceKind =
  (typeof TALENT_GENE_REPORT_SOURCES)[number];

/** 外部原始篇目单条（sections[]）；固定注解不在此处（发布时按 M1 当前值冻结）。 */
export interface TalentGeneReportExternalSection {
  bookCode: TalentGeneReportBookCode;
  chapter: string;
  factorCode: string;
  /** 外部要素名；缺失时发布回退 M1 文库当前名。 */
  factorName?: string;
  /** 外部分级编码（LV1–LV4）；未知时原样冻结且不阻断发布。 */
  levelCode: string;
  score?: number;
  condition?: string;
}

/** 外部同步源返回的数据（`TalentGeneReportSource.fetch` 结果）。 */
export interface TalentGeneReportExternalData {
  found: boolean;
  /** `found=false` 时的归因：外部未出结果 / 信息不一致。 */
  reason?: "no_result" | "info_mismatch";
  reportNo?: string;
  issuer?: string;
  filedAt?: string;
  sourceVersion?: string;
  books: TalentGeneReportBookCode[];
  sections: TalentGeneReportExternalSection[];
}

/** 传给外部源的对象（明文身份证/手机号只在内存，不落库、不进日志）。 */
export interface TalentGeneReportSyncSubject {
  subjectType: TalentReportSubjectType;
  subjectId: string;
  parentId: string;
  name: string;
  gender: "male" | "female";
  birthday: string;
  age: number;
  /** 明文仅内存，不落库、不进日志。 */
  idNo: string;
  /** 家长手机号明文，仅内存。 */
  mobile: string;
  existingReportNo?: string;
}

/** 外部基因报告源（M3 固定 Mock；M8 只换实现，不改调用方）。 */
export interface TalentGeneReportSource {
  readonly source: TalentGeneReportSourceKind;
  fetch(subject: TalentGeneReportSyncSubject): Promise<TalentGeneReportExternalData>;
}

/** `talent_gene_reports` 集合记录（含 sections 原始篇目，服务端内部使用）。 */
export interface TalentGeneReportRecord extends TalentReportRecordBase {
  subjectType: TalentReportSubjectType;
  subjectId: string;
  parentId?: string;
  reportNo: string;
  name: string;
  gender: "male" | "female";
  birthday: string;
  age?: number;
  maskedIdNo: string;
  idNoHash?: string;
  issuer?: string;
  filedAt?: string;
  syncedAt: string;
  source: TalentGeneReportSourceKind;
  version?: string;
  /** 外部已出分册编码，规范化大写升序去重（如 `ABC`）。 */
  books: string;
  sections: TalentGeneReportExternalSection[];
  sectionCount?: number;
  status: TalentGeneReportStatus;
  createdBy?: string;
  updatedBy?: string;
}

// ── 快照三件套：factorSnapshot / volumeSnapshot / directionSnapshot ───────

/** `factorSnapshot` 单条（全部外部要素；发布时冻结，之后不可变）。 */
export interface TalentReportFactorSnapshotItem {
  code: string;
  name: string;
  /** 分册编码 A–F。 */
  category: string;
  categoryName: string;
  volumeId: TalentReportVolumeId;
  bookCode: TalentGeneReportBookCode;
  chapter: string;
  levelCode: string;
  levelName: string;
  /** 分级 `sortOrder` 冻结值；未知分级为 0。 */
  levelOrder: number;
  score: number;
  note: string;
  condition: string;
}

/** `volumeSnapshot` 章节内要素（factorSnapshot 的展示子集）。 */
export interface TalentReportVolumeSnapshotFactor {
  code: string;
  name: string;
  levelCode: string;
  levelName: string;
  note: string;
}

export interface TalentReportVolumeSnapshotChapter {
  chapter: string;
  factors: TalentReportVolumeSnapshotFactor[];
}

/** `volumeSnapshot` 单册：固定 6 项，顺序 V1→V6。 */
export interface TalentReportVolumeSnapshot {
  volumeId: TalentReportVolumeId;
  bookCode: TalentGeneReportBookCode;
  name: string;
  sortOrder: number;
  open: boolean;
  chapterCount: number;
  factorCount: number;
  chapters: TalentReportVolumeSnapshotChapter[];
}

/** `selections[]` 上限默认值（快照内 `selectionLimit` 为权威值）。 */
export const TALENT_REPORT_SELECTION_LIMIT_DEFAULT = 3;

// ── 快照构建输入（M1 规则只读 + 外部篇目） ────────────────────────────────

/** M1 潜质要素只读视图（同编码可能存在于多个分库，索引时取首个非空名称）。 */
export interface TalentReportFactorRule {
  code: string;
  name: string;
  category: string;
  categoryName?: string;
}

/** M1 分级只读视图（只认新字段 `code/name/sortOrder`；旧行 `code=""` 由调用方过滤）。 */
export interface TalentReportLevelRule {
  code: string;
  name: string;
  sortOrder: number;
  status: TalentStatus | string;
}

/** M1 固定注解只读视图（`factorCode + levelCode` 唯一）。 */
export interface TalentReportFactorNoteRule {
  factorCode: string;
  levelCode: string;
  note: string;
  status?: TalentStatus | string;
}

/** M1 培养方向只读视图（requirements/tierIds/defaultTierId 由 M1 保证引用完整性）。 */
export interface TalentReportDirectionRule {
  id: string;
  code: string;
  name: string;
  status: TalentStatus | string;
  version: number;
  requirements: ReadonlyArray<{ code: string; level: string }>;
  tierIds: readonly string[];
  defaultTierId: string;
  icon?: string;
  description?: string;
}

/** M1 目标档位只读视图。 */
export interface TalentReportTierRule {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  teacher: string;
  freq: string;
  headline?: string;
  description?: string;
  status: TalentStatus | string;
  isDefault?: boolean;
  preset?: boolean;
}

/** 快照构建依赖的 M1 规则集合（只读，不写回）。 */
export interface TalentReportSnapshotRules {
  factors: readonly TalentReportFactorRule[];
  levels: readonly TalentReportLevelRule[];
  notes: readonly TalentReportFactorNoteRule[];
  directions: readonly TalentReportDirectionRule[];
  tiers: readonly TalentReportTierRule[];
}

/** 快照构建入参：外部已出册 + 外部篇目 + 开放册 + M1 规则。 */
export interface TalentReportSnapshotBuildInput {
  /** 外部已出分册（原始值，内部规范化）。 */
  books: readonly string[];
  sections: readonly TalentGeneReportExternalSection[];
  /** 发布时勾选开放的册（V 号）；未传视为全不开放（用于补发前的构建校验）。 */
  openVolumeIds?: readonly string[];
  rules: TalentReportSnapshotRules;
  /** 冻结进 directionSnapshot 的版本号（镜像报告 `snapshotVersion`）。 */
  snapshotVersion: number;
  at: string;
  operatorId?: string;
  operatorName?: string;
  recommendLimit?: number;
  selectionLimit?: number;
}

export interface TalentReportFactorSnapshotBuildResult {
  items: TalentReportFactorSnapshotItem[];
  warnings: string[];
}

export interface TalentReportSnapshotBuildResult {
  factorSnapshot: TalentReportFactorSnapshotItem[];
  volumeSnapshot: TalentReportVolumeSnapshot[];
  directionSnapshot: import("./talent-direction").TalentDirectionSnapshot;
  factorCount: number;
  warnings: string[];
}

// ── 动作计划（领域层产出，API 层直接落库 / 测试直接断言） ─────────────────

/** 写动作公共上下文。 */
export interface TalentReportActionContext {
  now?: Date;
  operatorId?: string;
  operatorName?: string;
}

export interface TalentReportPublishPlanInput
  extends TalentReportActionContext {
  report: TalentReportRecord;
  geneReport: TalentGeneReportRecord;
  /** 本次勾选开放的分册（V1–V6）；1–6 个、去重、必须 ⊆ 外部已出且有要素。 */
  openVolumeIds: readonly string[];
  rules: TalentReportSnapshotRules;
  recommendLimit?: number;
  selectionLimit?: number;
}

export interface TalentReportPublishPlan {
  status: "published";
  openVolumeIds: TalentReportVolumeId[];
  factorSnapshot: TalentReportFactorSnapshotItem[];
  volumeSnapshot: TalentReportVolumeSnapshot[];
  directionSnapshot: import("./talent-direction").TalentDirectionSnapshot;
  factorCount: number;
  totalItems: number;
  snapshotVersion: number;
  snapshotAt: string;
  publishedAt: string;
  versions: TalentReportVersionEntry[];
  versionEntry: TalentReportVersionEntry;
  warnings: string[];
}

export interface TalentReportReissuePlanInput
  extends TalentReportActionContext {
  report: TalentReportRecord;
  geneReport: TalentGeneReportRecord;
  rules: TalentReportSnapshotRules;
  recommendLimit?: number;
  selectionLimit?: number;
}

export interface TalentReportReissuePlan {
  status: "published";
  openVolumeIds: TalentReportVolumeId[];
  addedBooks: TalentGeneReportBookCode[];
  addedVolumeIds: TalentReportVolumeId[];
  factorSnapshot: TalentReportFactorSnapshotItem[];
  volumeSnapshot: TalentReportVolumeSnapshot[];
  directionSnapshot: import("./talent-direction").TalentDirectionSnapshot;
  factorCount: number;
  totalItems: number;
  snapshotVersion: number;
  snapshotAt: string;
  versions: TalentReportVersionEntry[];
  versionEntry: TalentReportVersionEntry;
  warnings: string[];
}

export interface TalentReportRegeneratePlanInput
  extends TalentReportActionContext {
  report: TalentReportRecord;
  geneReport?: TalentGeneReportRecord | null;
  rules: TalentReportSnapshotRules;
  recommendLimit?: number;
  selectionLimit?: number;
  /** 默认 true：刷新 M1 注解 / 级序；false 时只重算方向快照。 */
  regenerateFactorNotes?: boolean;
}

export interface TalentReportRegeneratePlan {
  factorSnapshot: TalentReportFactorSnapshotItem[];
  volumeSnapshot: TalentReportVolumeSnapshot[];
  directionSnapshot: import("./talent-direction").TalentDirectionSnapshot;
  factorCount: number;
  totalItems: number;
  snapshotVersion: number;
  snapshotAt: string;
  versions: TalentReportVersionEntry[];
  versionEntry: TalentReportVersionEntry;
  warnings: string[];
}

export interface TalentReportStatusActionInput
  extends TalentReportActionContext {
  report: TalentReportRecord;
  /** 撤回原因（≤200），写入版本摘要。 */
  reason?: string;
}

export interface TalentReportStatusActionPlan {
  status: TalentReportStatus;
  withdrawnAt?: string;
  restoredAt?: string;
  versions: TalentReportVersionEntry[];
  versionEntry: TalentReportVersionEntry;
  snapshotVersion: number;
}

export interface TalentReportSelectionVersionInput
  extends TalentReportActionContext {
  report: TalentReportRecord;
  summary: string;
}

export interface TalentReportSelectionVersionPlan {
  versions: TalentReportVersionEntry[];
  versionEntry: TalentReportVersionEntry;
  snapshotVersion: number;
}

// ── 报告集合记录（旧字段原样保留 + M3 增量字段） ──────────────────────────

/**
 * `talent_reports` 记录：旧字段（reportNo/reportType/title/status/publishedAt/withdrawnAt/
 * totalItems/customerId/pdfUrl 等）保留到 M6；新代码只读写 M3 增量字段，不读不写 `customerId`。
 */
export interface TalentReportRecord extends TalentReportRecordBase {
  reportNo: string;
  reportType?: string;
  title?: string;
  /** 旧行可能为 `error`（旧代码遗留），新代码不写。 */
  status: TalentReportAnyStatus;
  publishedAt?: string;
  withdrawnAt?: string;
  totalItems?: number;
  /** 旧会员关系；新行空串，新代码不读不写（ADR 0003-D6）。 */
  customerId?: string;
  subjectType?: TalentReportSubjectType;
  subjectId?: string;
  parentId?: string;
  geneReportId?: string;
  factorCount?: number;
  /** 发布前 0；发布 1；补发/显式重算 +1（撤回/恢复/选择不变）。 */
  snapshotVersion?: number;
  snapshotAt?: string;
  queriedAt?: string;
  openVolumeIds?: TalentReportVolumeId[];
  factorSnapshot?: TalentReportFactorSnapshotItem[];
  volumeSnapshot?: TalentReportVolumeSnapshot[];
  directionSnapshot?: import("./talent-direction").TalentDirectionSnapshot | null;
  selections?: import("./talent-direction").TalentSelectionItem[];
  versions?: TalentReportVersionEntry[];
  restoredAt?: string;
}

// ── 一键同步：三类归因 + 单条失败 + 逐人明细 ──────────────────────────────

export const TALENT_REPORT_SYNC_ACTIONS = [
  "refresh",
  "created",
  "empty",
  "failed",
] as const;
export type TalentReportSyncAction =
  (typeof TALENT_REPORT_SYNC_ACTIONS)[number];

export const TALENT_REPORT_SYNC_ACTION_LABELS: Readonly<
  Record<TalentReportSyncAction, string>
> = {
  refresh: "刷新同步",
  created: "新建报告",
  empty: "外部暂无数据",
  failed: "单条失败",
};

export type TalentReportSyncEmptyReason = "no_result" | "info_mismatch";

export interface TalentReportSyncCounts {
  refreshed: number;
  created: number;
  empty: number;
  failed: number;
}

/** 逐人明细（≤500 条；不含明文身份证/手机号，`message` 为脱敏摘要）。 */
export interface TalentReportSyncSubjectDetail {
  subjectType: TalentReportSubjectType;
  subjectId: string;
  subjectName: string;
  maskedIdNo: string;
  reportNo: string;
  action: TalentReportSyncAction;
  /** 外部已出分册编码（如 `ABCD`）。 */
  booksTotal: string;
  /** 外部已出 − 已开放（如 `CD`）；无新增为空串。 */
  booksAdded: string;
  reason: TalentReportSyncEmptyReason | "";
  message: string;
}

export interface TalentReportSyncPreview {
  mode: "preview";
  source: TalentGeneReportSourceKind;
  /** ISO 8601 UTC。 */
  at: string;
  scanned: number;
  counts: TalentReportSyncCounts;
  details: TalentReportSyncSubjectDetail[];
  truncated: boolean;
}

export interface TalentReportSyncPreviewCounts {
  refreshed: number;
  created: number;
  empty: number;
  failed: number;
}

export interface TalentReportSyncResult {
  mode: "commit";
  source: TalentGeneReportSourceKind;
  /** 同步日志 id；日志写入失败时为空串（不影响主流程）。 */
  syncLogId: string;
  durationMs: number;
  scanned: number;
  counts: TalentReportSyncCounts;
  details: TalentReportSyncSubjectDetail[];
  truncated: boolean;
  /** 请求带 `previewCounts` 且实际计数不同 → true。 */
  changedSincePreview: boolean;
}

/** 同步日志写入载荷（`talent_sync_logs` 扩展字段，spec §3.3）。 */
export interface TalentReportSyncLogInput {
  trigger: "manual" | "auto" | "webhook";
  status: "success" | "partial" | "failed";
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  scanned: number;
  counts: TalentReportSyncCounts;
  details: TalentReportSyncSubjectDetail[];
  truncated: boolean;
  operatorId: string;
  message: string;
}

/** 同步候选（服务端内部：含已有基因报告 / 报告行，供归因与增量 Mock 使用）。 */
export interface TalentReportSyncCandidate extends TalentGeneReportSyncSubject {
  existingReportNo?: string;
  geneReport?: TalentGeneReportRecord | null;
  report?: TalentReportRecord | null;
  /** 候选自身不可处理（如解密失败）的脱敏原因；出现即归入 failed。 */
  blockedReason?: string;
}