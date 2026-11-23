/**
 * @description M5 培育建议域共享类型：版本两层（`talent_advice_versions` / `talent_advice_docs`）、
 *   `sections[]` 四段正文、发布状态机、接收新一版分类、派生缓存与派生可见性。
 *   `*Record` 含集合原始记录（`idNoHash` / `sections` 全量），只允许服务端内部使用；
 *   页面、导出与 C 端只消费映射后的视图类型，任何响应都不得直接返回集合原始记录（ADR 0005-D1/D2/D4）。
 *   分册 A–F 与册名映射唯一来源为 `shared/types/talent-report.ts`（本文件 re-export，禁止复制第二套）。
 * @file shared/types/talent-advice.ts
 */
import {
  TALENT_GENE_REPORT_BOOK_CODES,
  TALENT_REPORT_VOLUME_DEFINITIONS,
  type TalentGeneReportBookCode,
  type TalentGeneReportRecord,
  type TalentReportRecord,
  type TalentReportSubjectType,
} from "./talent-report";
import type { TalentChildRecord, TalentParentRecord } from "./talent-member";

/** PocketBase 记录公共字段。 */
export interface TalentAdviceRecordBase {
  id: string;
  created: string;
  updated: string;
}

// ── 版本状态与发布状态（PRD §8.3；ADR 0005-D1/D3） ─────────────────────────

export const TALENT_ADVICE_VERSION_STATUSES = ["active", "archived"] as const;
export type TalentAdviceVersionStatus =
  (typeof TALENT_ADVICE_VERSION_STATUSES)[number];

export const TALENT_ADVICE_VERSION_STATUS_LABELS: Readonly<
  Record<TalentAdviceVersionStatus, string>
> = {
  active: "当前生效",
  archived: "已归档",
};

export const TALENT_ADVICE_PUBLISH_STATUSES = ["published", "withdrawn"] as const;
export type TalentAdvicePublishStatus =
  (typeof TALENT_ADVICE_PUBLISH_STATUSES)[number];

export const TALENT_ADVICE_PUBLISH_STATUS_LABELS: Readonly<
  Record<TalentAdvicePublishStatus, string>
> = {
  published: "已发布",
  withdrawn: "已撤回",
};

/** 版本来源：`mock` 本地演示 / `external` M8 真实源。 */
export const TALENT_ADVICE_SOURCES = ["mock", "external"] as const;
export type TalentAdviceSourceKind = (typeof TALENT_ADVICE_SOURCES)[number];

export const TALENT_ADVICE_SOURCE_LABELS: Readonly<
  Record<TalentAdviceSourceKind, string>
> = {
  mock: "本地演示源",
  external: "外部培育建议系统",
};

/** 建议周期月数（BR-07「默认 4 个月一版」）；版本行创建时冻结，不随配置回写。 */
export const TALENT_ADVICE_CYCLE_MONTHS = 4;

// ── 分册：A–F 与册名唯一映射（与 M3 同一来源） ───────────────────────────

export const TALENT_ADVICE_BOOK_CODES = TALENT_GENE_REPORT_BOOK_CODES;
export type TalentAdviceBookCode = TalentGeneReportBookCode;

/** A–F ↔ 册名固定映射（A 生长发育 / B 智商 / C 情商 / D 领导商 / E 艺术商 / F 体育运动商）。 */
export const TALENT_ADVICE_BOOK_NAMES: Readonly<
  Record<TalentAdviceBookCode, string>
> = Object.fromEntries(
  TALENT_REPORT_VOLUME_DEFINITIONS.map((definition) => [
    definition.bookCode,
    definition.name,
  ]),
) as Record<TalentAdviceBookCode, string>;

// ── 数据熵白名单（M1 U2 两种外部口径都接受、原样保存，不做映射；§14 C1） ──

export const TALENT_ADVICE_ENTROPY_LEVELS = [
  "卓越",
  "优秀",
  "优良",
  "常态",
  "弱态",
  "弱势",
] as const;
export type TalentAdviceEntropyLevel =
  (typeof TALENT_ADVICE_ENTROPY_LEVELS)[number];

// ── sections 契约与限制（spec §3.3） ───────────────────────────────────────

export const TALENT_ADVICE_SECTION_LIMITS = {
  /** 单份建议书 sections 条数上限。 */
  maxSections: 200,
  /** 整份 sections JSON 序列化字节上限（256KB）。 */
  maxJsonBytes: 256 * 1024,
  /** 四段文案单段字数上限。 */
  maxTextLength: 2000,
  /** 章节名字数上限。 */
  maxChapterLength: 100,
  /** 要素名字数上限。 */
  maxFactorLength: 50,
  /** 建议编号长度上限。 */
  maxAdviceNoLength: 80,
  /** 版本号长度上限。 */
  maxVersionNoLength: 40,
  /** 同步说明长度上限。 */
  maxNoteLength: 500,
  /** 逐人明细上限。 */
  maxDetails: 500,
  /** 接收结果 warnings 上限。 */
  maxWarnings: 10,
} as const;

/** 缺省章节名（外部未出章节时补齐，只用于展示分组）。 */
export const TALENT_ADVICE_DEFAULT_CHAPTER = "专项潜质";

/** `sections[]` 单条（归一化后落库形状；顺序按分册 A–F 升序、册内保持外部原始顺序）。 */
export interface TalentAdviceSection {
  book: TalentAdviceBookCode;
  bookName: string;
  chapter: string;
  /** 要素名称（外部原文）；不存要素编码、不绑定 M1。 */
  factor: string;
  entropy: TalentAdviceEntropyLevel;
  /** 四段家长文案：分级内容 / 分级举例 / 培育方向 / 培育建议；允许空串。 */
  content: string;
  example: string;
  direction: string;
  suggestion: string;
  /** 同一 (book, chapter, factor, entropy) 的话术变体序号，≥1，默认 1。 */
  variant: number;
}

/** 外部源返回的原始 section（字段可选，由服务层归一化）。 */
export interface TalentAdviceRawSection {
  book: string;
  bookName?: string;
  chapter?: string;
  factor: string;
  /** 可带「级」后缀（如「优秀级」），服务层去尾归一化。 */
  entropy: string;
  content?: string;
  example?: string;
  direction?: string;
  suggestion?: string;
  variant?: number;
}

/** 派生缓存字段（只读、可由 sections 重算；spec §3.4）。 */
export interface TalentAdviceDerived {
  sectionCount: number;
  bookCount: number;
  /** 按数据熵等级名计数，如 `{ 优秀: 2, 常态: 1 }`。 */
  entropyCounts: Record<string, number>;
  firstFactorName: string;
}

// ── 集合记录 ──────────────────────────────────────────────────────────────

/** `talent_advice_versions` 原始记录。 */
export interface TalentAdviceVersionRecord extends TalentAdviceRecordBase {
  versionNo: string;
  /** 同一时刻最多一行 `active`（部分唯一索引保证）。 */
  status: TalentAdviceVersionStatus;
  cycle: string;
  /** `YYYY-MM-DD`。 */
  effectiveAt: string;
  /** `YYYY-MM-DD` = effectiveAt + TALENT_ADVICE_CYCLE_MONTHS。 */
  nextUpdateAt: string;
  /** ISO 8601 UTC。 */
  syncedAt: string;
  source: TalentAdviceSourceKind;
  note?: string;
  operatorId?: string;
  operatorName: string;
  createdBy?: string;
  updatedBy?: string;
}

/** `talent_advice_docs` 原始记录（含 `idNoHash` 与 `sections` 全量，禁止直接返回）。 */
export interface TalentAdviceDocRecord extends TalentAdviceRecordBase {
  adviceNo: string;
  geneReportId?: string;
  reportId?: string;
  reportNo: string;
  subjectType: TalentReportSubjectType;
  subjectId: string;
  parentId?: string;
  name: string;
  maskedIdNo: string;
  idNoHash?: string;
  gender: "male" | "female";
  birthday: string;
  /** 同步当日（effectiveAt）精确周岁；0 合法；冻结。 */
  age: number;
  /** 外部匹配键快照 `{name}｜{age} 岁`。 */
  matchKey: string;
  versionId?: string;
  versionName: string;
  publishStatus: TalentAdvicePublishStatus;
  publishedAt?: string;
  withdrawnAt?: string;
  syncedAt: string;
  source: TalentAdviceSourceKind;
  /** 基因报告已出分册快照，规范化大写升序去重（如 `ABCD`）。 */
  books: string;
  sections: TalentAdviceSection[];
  sectionCount?: number;
  bookCount?: number;
  entropyCounts?: Record<string, number>;
  firstFactorName?: string;
  createdBy?: string;
  updatedBy?: string;
}

// ── 对外视图（已删除 `idNoHash`；列表不含 sections） ──────────────────────

/** 15 列列表行（spec §5.4.1；不含 `sections` / `idNoHash` / `matchKey`）。 */
export interface TalentAdviceDocListRow {
  id: string;
  adviceNo: string;
  versionId: string;
  versionName: string;
  name: string;
  maskedIdNo: string;
  gender: "male" | "female";
  genderLabel: string;
  birthday: string;
  age: number;
  ageLabel: string;
  geneReportId: string;
  reportId: string;
  reportNo: string;
  geneBookCount: number;
  geneBookCountLabel: string;
  books: string;
  coveredFactorText: string;
  entropyText: string;
  publishStatus: TalentAdvicePublishStatus;
  publishStatusLabel: string;
  publishedAt: string;
  withdrawnAt: string;
  syncedAt: string;
  source: TalentAdviceSourceKind;
  /** 派生可见性（§4.5）；不落库。 */
  clientVisible: boolean;
  versionReadonly: boolean;
}

/** 建议书详情中的单个分册分组（spec §5.4.2）。 */
export interface TalentAdviceBookGroup {
  book: TalentAdviceBookCode;
  bookName: string;
  /** 一册一份派生的建议书编号 `{adviceNo}-{book}`。 */
  adviceNo: string;
  sectionCount: number;
  entropyCounts: Record<string, number>;
  entropyText: string;
  sections: Array<
    Pick<
      TalentAdviceSection,
      | "chapter"
      | "factor"
      | "entropy"
      | "variant"
      | "content"
      | "example"
      | "direction"
      | "suggestion"
    >
  >;
}

/** 建议书详情（含四段正文，按分册分组；spec §5.4.2）。 */
export interface TalentAdviceDocDetail {
  id: string;
  adviceNo: string;
  version: {
    id: string;
    versionNo: string;
    status: TalentAdviceVersionStatus;
    statusLabel: string;
    cycle: string;
    effectiveAt: string;
    nextUpdateAt: string;
  };
  report: {
    id: string;
    reportNo: string;
    status: string;
    statusLabel: string;
  } | null;
  owner: {
    name: string;
    gender: "male" | "female";
    genderLabel: string;
    birthday: string;
    age: number;
    ageLabel: string;
    matchKey: string;
  };
  books: TalentAdviceBookGroup[];
  publishStatus: TalentAdvicePublishStatus;
  publishStatusLabel: string;
  publishedAt: string;
  withdrawnAt: string;
  syncedAt: string;
  source: TalentAdviceSourceKind;
  booksCovered: string;
  bookCount: number;
  clientVisible: boolean;
  clientVisibleText: string;
  versionReadonly: boolean;
}

/** 版本历史行（spec §5.4.3；份数与发布统计读取时聚合，不落字段）。 */
export interface TalentAdviceVersionView {
  id: string;
  versionNo: string;
  status: TalentAdviceVersionStatus;
  statusLabel: string;
  cycle: string;
  effectiveAt: string;
  nextUpdateAt: string;
  syncedAt: string;
  source: TalentAdviceSourceKind;
  sourceLabel: string;
  note: string;
  operatorName: string;
  docCount: number;
  publishedCount: number;
  withdrawnCount: number;
  isCurrent: boolean;
}

/** 列表「当前查看版本」状态（纯客户端状态，不落库；spec §4.4/§4.6）。 */
export interface TalentAdviceViewingVersion {
  versionId: string;
  versionName: string;
  isCurrent: boolean;
}

/** 版本历史响应。 */
export interface TalentAdviceVersionHistory {
  rows: TalentAdviceVersionView[];
  total: number;
}

/** 按人历史单条（spec §5.4.4）。 */
export interface TalentAdvicePersonHistoryItem {
  id: string;
  adviceNo: string;
  versionId: string;
  versionNo: string;
  versionStatus: TalentAdviceVersionStatus;
  cycle: string;
  effectiveAt: string;
  matchKey: string;
  age: number;
  entropyText: string;
  publishStatus: TalentAdvicePublishStatus;
  publishStatusLabel: string;
  syncedAt: string;
  isCurrent: boolean;
}

/** 按人历史版本响应（spec §5.4.4）。 */
export interface TalentAdvicePersonHistory {
  reportNo: string;
  name: string;
  maskedIdNo: string;
  items: TalentAdvicePersonHistoryItem[];
}

/** M3 报告详情第 4 页签挂载数据（spec §7.4）。 */
export interface TalentAdviceSubjectAdvice {
  available: boolean;
  version: {
    id: string;
    versionNo: string;
    cycle: string;
    effectiveAt: string;
    nextUpdateAt: string;
  } | null;
  reportReadable: boolean;
  clientVisible: boolean;
  docs: Array<{
    id: string;
    adviceNo: string;
    versionName: string;
    publishStatus: TalentAdvicePublishStatus;
    publishStatusLabel: string;
    books: string;
    bookCount: number;
    sectionCount: number;
    entropyCounts: Record<string, number>;
    clientVisible: boolean;
  }>;
}

// ── C 端只读契约（spec §5.4.8；M5 冻结，M7 实现路由） ────────────────────

export const TALENT_ADVICE_CLIENT_EMPTY_TEXT = "暂未收到培育建议";

/** C 端单册状态：有建议 / 报告已发布但建议未同步 / 报告未开放 / 本次未检测。 */
export type TalentAdviceClientBookState =
  | "available"
  | "pending"
  | "not_published"
  | "not_detected";

/** C 端单册分组（不返回版本 id / 报告编号 / 匹配键 / 同步时间 / 发布状态 / 来源）。 */
export interface TalentAdviceClientBook {
  book: TalentAdviceBookCode;
  bookName: string;
  state: TalentAdviceClientBookState;
  adviceNo: string;
  sectionCount: number;
  total: number;
  entropyList: Array<{ level: string; count: number }>;
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

export type TalentAdviceClientSnapshot =
  | {
      available: false;
      emptyText: string;
    }
  | {
      available: true;
      version: {
        versionNo: string;
        cycle: string;
        effectiveAt: string;
        nextUpdateAt: string;
        cycleMonths: number;
      };
      owner: {
        name: string;
        gender: "male" | "female";
        genderLabel: string;
        age: number;
        ageLabel: string;
      };
      books: TalentAdviceClientBook[];
      emptyText: string;
    };

// ── 外部源契约（M5 冻结；M8 只换实现，不改调用方） ────────────────────────

/** 传给外部源的对象；身份证明文不在本契约里（M5 不读明文、不调用解密）。 */
export interface TalentAdviceSyncSubject {
  geneReportId: string;
  reportNo: string;
  subjectType: TalentReportSubjectType;
  subjectId: string;
  parentId: string;
  name: string;
  gender: "male" | "female";
  birthday: string;
  /** 按 effectiveAt 计算的精确周岁。 */
  age: number;
  /** 仅脱敏值；不向外部源传明文证件号。 */
  maskedIdNo: string;
}

export interface TalentAdviceMatchResult {
  found: boolean;
  /** 外部已出分册（大写升序去重）；与基因报告不一致时以基因报告为准并记 warning。 */
  books?: string;
  sections?: TalentAdviceRawSection[];
  reason?: "no_result" | "info_mismatch";
  /** 外部版本/批次号，仅留痕（不落集合）。 */
  version?: string;
}

export interface TalentAdviceSource {
  readonly name: string;
  match(subject: TalentAdviceSyncSubject): Promise<TalentAdviceMatchResult>;
}

// ── 同步候选 / 分类 / 结果 ────────────────────────────────────────────────

/** 候选（服务端内部：基因报告 + 对应报告行 + 脱敏身份）。 */
export interface TalentAdviceSyncCandidate {
  geneReport: TalentGeneReportRecord;
  /** 同一基因报告对应的报告行；缺失即 `failed(report_missing)`。 */
  report: TalentReportRecord | null;
  geneReportId: string;
  reportNo: string;
  subjectType: TalentReportSubjectType;
  subjectId: string;
  parentId: string;
  name: string;
  gender: "male" | "female";
  birthday: string;
  maskedIdNo: string;
  idNoHash: string;
}

/** 单条失败原因（spec §5.5；`empty_sections` 为 §3.3 的细化口径）。 */
export const TALENT_ADVICE_SYNC_REASONS = [
  "report_missing",
  "no_result",
  "info_mismatch",
  "sections_invalid",
  "empty_sections",
  "source_error",
  "duplicate",
] as const;
export type TalentAdviceSyncReason =
  (typeof TALENT_ADVICE_SYNC_REASONS)[number];

export const TALENT_ADVICE_SYNC_REASON_LABELS: Readonly<
  Record<TalentAdviceSyncReason, string>
> = {
  report_missing: "报告缺失",
  no_result: "外部暂无建议",
  info_mismatch: "信息不一致",
  sections_invalid: "建议正文不合法",
  empty_sections: "建议正文为空",
  source_error: "外部源异常",
  duplicate: "重复建议",
};

export const TALENT_ADVICE_SYNC_ACTIONS = ["created", "empty", "failed"] as const;
export type TalentAdviceSyncAction =
  (typeof TALENT_ADVICE_SYNC_ACTIONS)[number];

export const TALENT_ADVICE_SYNC_ACTION_LABELS: Readonly<
  Record<TalentAdviceSyncAction, string>
> = {
  created: "新建建议书",
  empty: "暂无建议",
  failed: "单条失败",
};

/** 逐人脱敏明细（≤500 条；不含明文身份证/手机号）。 */
export interface TalentAdviceSyncDetail {
  reportNo: string;
  name: string;
  maskedIdNo: string;
  action: TalentAdviceSyncAction;
  reason: TalentAdviceSyncReason | "";
  message: string;
}

/** 接收新一版预演（只读、零写入）。 */
export interface TalentAdviceSyncPreview {
  mode: "preview";
  source: TalentAdviceSourceKind;
  effectiveAt: string;
  versionNo: string;
  cycle: string;
  nextUpdateAt: string;
  /** ISO 8601 UTC。 */
  at: string;
  scanned: number;
  createdCount: number;
  emptyCount: number;
  failedCount: number;
  details: TalentAdviceSyncDetail[];
  truncated: boolean;
  warnings: string[];
  /** 预演时发现的重复版本（commit 必然 409）；无重复为空串。 */
  duplicateVersionId: string;
  duplicateVersionNo: string;
}

/** 接收新一版结果（spec §5.4.5）。 */
export interface TalentAdviceReceiveResult {
  version: TalentAdviceVersionView;
  docCount: number;
  emptyCount: number;
  failedCount: number;
  archivedVersionId: string;
  syncLogId: string;
  warnings: string[];
  details: TalentAdviceSyncDetail[];
  truncated: boolean;
  changedSincePreview: boolean;
}

/** 同步日志写入载荷（`talent_sync_logs.syncScope="advice_version"`）。 */
export interface TalentAdviceSyncLogInput {
  /** 触发来源：手动 / 定时 / 入站签名（M8 补充，旧行缺省 manual）。 */
  trigger?: "manual" | "auto" | "webhook";
  status: "success" | "partial" | "failed";
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  received: number;
  generated: number;
  skipped: number;
  failedCount: number;
  details: TalentAdviceSyncDetail[];
  truncated: boolean;
  operatorId: string;
  message: string;
}

/** 发布 / 撤回结果（spec §5.4.6）。 */
export interface TalentAdvicePublishResult {
  id: string;
  adviceNo: string;
  publishStatus: TalentAdvicePublishStatus;
  publishStatusLabel: string;
  publishedAt: string;
  withdrawnAt: string;
  clientVisible: boolean;
  message: string;
}

/** C 端可读上下文（M7 守卫复用）。 */
export interface TalentAdviceReadableContext {
  report: TalentReportRecord;
  parent: TalentParentRecord;
  child: TalentChildRecord | null;
}