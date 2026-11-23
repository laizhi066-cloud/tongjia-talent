/**
 * @description M4 方向匹配域共享类型：命中 / 推荐 / 档位 / 选择纯函数契约，以及 M3 方向快照结构。
 *   口径见 docs/specs/M4-matching/spec.md §3.1（factorSnapshot 输入）、§3.3（directionSnapshot 输出）、
 *   §3.4（selections）、§4.5（pickTier）、§4.6（resolveDirectionSelection）、§4.9（纯函数签名）与 ADR 0004。
 *   本文件只放类型与常量，不做任何 IO；快照结构由 M4 纯函数产出，M3 不得增删字段。
 * @file shared/types/talent-direction.ts
 */
import type { TalentDirectionRequirement } from "./talent-rule";
import type { TalentStatus } from "./talent";

/** 推荐上限常量（BR-08）：快照 `recommendLimit` 优先，非法时回退该值。 */
export const TALENT_DIRECTION_RECOMMEND_LIMIT = 5;

/** 选择上限常量（BR-08）：快照 `selectionLimit` 优先，非法时回退该值。 */
export const TALENT_DIRECTION_SELECTION_LIMIT = 3;

/** 推荐上限合法区间上界（spec §4.4）。 */
export const TALENT_DIRECTION_RECOMMEND_LIMIT_MAX = 20;

/** 选择上限合法区间上界（spec §4.4）。 */
export const TALENT_DIRECTION_SELECTION_LIMIT_MAX = 10;

/** 自填方向名称长度上限（按 Unicode 码位计，spec §3.5 / §4.6）。 */
export const TALENT_DIRECTION_MANUAL_NAME_MAX = 10;

// ── 输入契约 A：M3 factorSnapshot（M4 只消费 code / levelCode / levelOrder） ──

/**
 * 命中算法的要素输入：M3 发布时冻结的 `factorSnapshot` 单条的 M4 子集。
 * 其余字段（名称 / 注解 / 分册 / 得分）由 M3/M7 负责，M4 透传不参与计算。
 */
export interface TalentMatchFactor {
  /** 要素编码，命中主键（`A-01`–`F-23`）。 */
  code: string;
  /** 实际分级编码（如 `LV3`）。 */
  levelCode: string;
  /** 实际分级级序冻结值；缺失时降级按 `levelOrders[levelCode]` 反查。 */
  levelOrder?: number;
  /** 实际分级展示名，仅透传展示。 */
  levelName?: string;
  /** 要素展示名，仅透传展示。 */
  name?: string;
}

/** factorSnapshot 单条输入的别名（任务卡命名，等价 {@link TalentMatchFactor}）。 */
export type FactorSnapshotItem = TalentMatchFactor;

// ── 输入契约 B：M1 方向 / 档位 / 分级（只读） ────────────────────────────

/** 分级视图：命中比较只用 `sortOrder`；`status` 用于判定「要求分级已停用」。 */
export interface TalentMatchLevel {
  code: string;
  sortOrder: number;
  status: TalentStatus;
  name?: string;
}

/** 目标档位视图（M1 `talent_tiers` 子集，含自填方向的全局默认标记）。 */
export interface TalentMatchTier {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  teacher: string;
  freq: string;
  headline?: string;
  description?: string;
  status: TalentStatus;
  /** 全局默认档位（自填方向的预选档位）；快照内不冻结该字段。 */
  isDefault?: boolean;
  /** 系统预置档位标记，仅透传。 */
  preset?: boolean;
}

/** 培养方向视图（M1 `talent_directions` 子集）。 */
export interface TalentMatchDirection {
  id: string;
  code: string;
  name: string;
  icon?: string;
  description?: string;
  status: TalentStatus;
  version: number;
  requirements: readonly TalentDirectionRequirement[];
  tierIds: readonly string[];
  defaultTierId: string;
}

/** 命中算法入参 options（纯函数注入，不读库）。 */
export interface TalentMatchOptions {
  /** 分级编码 → 级序（含停用分级，供要求侧比较）。 */
  levelOrders: Record<string, number>;
  /** 已停用的分级编码：要求侧视为未命中且计入分母。 */
  disabledLevelCodes?: readonly string[];
  /** 是否评估停用方向；默认 false（停用方向不进快照/推荐）。 */
  includeDisabledDirections?: boolean;
  /** 推荐上限注入（默认取常量 5）；M4-A 扩展，便于预览/测试覆盖上限。 */
  recommendLimit?: number;
}

/** 命中算法 options 的别名（任务卡命名，等价 {@link TalentMatchOptions}）。 */
export type DirectionMatchOptions = TalentMatchOptions;

// ── 纯函数内部命中结果（含诊断字段，不直接落快照） ─────────────────────

/** 单条 requirement 的命中明细（含诊断字段；落快照前必须剥离）。 */
export interface TalentDirectionRequirementHit {
  code: string;
  level: string;
  needOrder: number;
  /** 要素展示名；要素缺失时为空串。 */
  factorName: string;
  /** 实际分级编码；要素缺失时为空串。 */
  factorLevel: string;
  /** 实际分级展示名；要素缺失时为 `—`（仅诊断/预览用）。 */
  factorLevelName?: string;
  actualOrder: number;
  met: boolean;
  /** `met ? 0 : max(0, needOrder - actualOrder)`。 */
  gap: number;
  levelDisabled: boolean;
  factorMissing: boolean;
}

/** 单方向的命中结果（全部已评估方向，排序前）。 */
export interface TalentDirectionHit {
  directionId: string;
  code: string;
  name: string;
  version: number;
  status: TalentStatus;
  requirements: TalentDirectionRequirementHit[];
  hitCount: number;
  /** 去重后的配置条数；0 表示「未配置要素」。 */
  total: number;
  /** 原始比值 `hitCount / total`（total=0 时为 0）；仅展示，不参与比较。 */
  hitRate: number;
  tierIds: string[];
  defaultTierId: string;
  emptyRequirements: boolean;
}

/** 方向命中结果的别名（任务卡命名，等价 {@link TalentDirectionHit}）。 */
export type DirectionHit = TalentDirectionHit;

/** 命中警告码（spec §4.8；仅诊断，不落快照）。 */
export type TalentDirectionMatchWarningCode =
  | "DUPLICATE_FACTOR"
  | "DUPLICATE_REQUIREMENT"
  | "DUPLICATE_DIRECTION_CODE"
  | "UNKNOWN_LEVEL"
  | "UNKNOWN_FACTOR_LEVEL"
  | "LEVEL_DISABLED"
  | "EMPTY_REQUIREMENTS";

/** 命中警告：脏数据 / 运行期边界兜底，不阻断计算。 */
export interface TalentMatchWarning {
  code: TalentDirectionMatchWarningCode;
  directionId?: string;
  factorCode?: string;
  message: string;
}

/** `matchDirections` 结果（spec §4.9 的 `{hits, warnings}` + 任务卡要求的空态/上限字段）。 */
export interface DirectionMatchResult {
  /** 全部已评估方向，按四键全序排列（不截断）。 */
  hits: TalentDirectionHit[];
  warnings: TalentMatchWarning[];
  /** 入参方向总数（含停用方向）。 */
  totalDirections: number;
  /** 实际参与评估的方向数（排除停用方向 / 重复编码）。 */
  evaluatedDirections: number;
  /** 无方向可评估（空数组或全部停用）。 */
  noDirections: boolean;
  /** 全部方向均 0 命中且存在有效配置 → 0 命中回退。 */
  fallback: boolean;
  /** 生效的推荐上限（合法 1–20，否则 5）。 */
  recommendLimit: number;
  /** 按上限截断后的推荐（0 命中回退时每项 `fallback=true`）。 */
  recommended: Array<TalentDirectionRecommendationItem<TalentDirectionHit>>;
  /** 空态原因：无方向 / 无有效可推荐方向。 */
  emptyReason: TalentDirectionEmptyReason | null;
}

// ── 排序 / 推荐 ────────────────────────────────────────────────────────

/** 排序所需的最小字段集合（命中结果与快照命中都满足）。 */
export interface TalentDirectionSummary {
  directionId: string;
  code: string;
  hitCount: number;
  total: number;
}

/** 四键全序比较器（命中数 → 命中率交叉相乘 → 配置条数 → 编码 → id）。 */
export type DirectionHitComparator<T extends TalentDirectionSummary = TalentDirectionHit> = (
  a: T,
  b: T,
) => number;

/** 空态原因（spec §4.4）。 */
export type TalentDirectionEmptyReason = "NO_DIRECTIONS" | "NO_ENABLED_DIRECTIONS";

/** 推荐读取项：命中结果 + 是否来自 0 命中回退（不落快照，仅读取层装饰）。 */
export type TalentDirectionRecommendationItem<T extends TalentDirectionSummary = TalentDirectionHit> =
  T & { fallback: boolean };

/** 推荐读取结果（spec §4.4 / §4.9）。 */
export interface TalentDirectionRecommendationResult<
  T extends TalentDirectionSummary = TalentDirectionHit,
> {
  items: Array<TalentDirectionRecommendationItem<T>>;
  fallback: boolean;
  totalCandidates: number;
  emptyReason: TalentDirectionEmptyReason | null;
  /** 生效的推荐上限。 */
  recommendLimit: number;
}

/** 推荐读取 options：显式上限优先于快照/常量。 */
export interface TalentDirectionRecommendationOptions {
  recommendLimit?: number;
}

// ── 输出契约：directionSnapshot（M3 冻结，字段与 M3 spec §3.2.3 逐字一致） ──

/** 快照内单条 requirement（固定 8 键，不含诊断字段）。 */
export interface TalentDirectionSnapshotRequirement {
  code: string;
  level: string;
  factorName: string;
  factorLevel: string;
  actualOrder: number;
  needOrder: number;
  met: boolean;
  gap: number;
}

/** 快照内单方向（固定 10 键）。 */
export interface TalentDirectionSnapshotHit {
  directionId: string;
  code: string;
  name: string;
  version: number;
  tierIds: string[];
  defaultTierId: string;
  total: number;
  hitCount: number;
  hitRate: number;
  requirements: TalentDirectionSnapshotRequirement[];
}

/** 快照内档位（发布时启用档位的冻结视图）。 */
export interface TalentDirectionSnapshotTier {
  id: string;
  code: string;
  name: string;
  teacher: string;
  freq: string;
  headline?: string;
  sortOrder: number;
}

/** 报告 `directionSnapshot` 整体结构（8 个顶层键 + 方向/档位/要求嵌套，M3 不得增删）。 */
export interface TalentDirectionSnapshot {
  version: number;
  at: string;
  operatorId: string;
  operatorName: string;
  recommendLimit: number;
  selectionLimit: number;
  levelOrders: Record<string, number>;
  tiers: TalentDirectionSnapshotTier[];
  directions: TalentDirectionSnapshotHit[];
}

/** 快照 envelope 覆盖项（补发/显式重算时使用）。 */
export interface TalentDirectionSnapshotEnvelope {
  version?: number;
  at?: string;
  operatorId?: string;
  operatorName?: string;
}

// ── 选择域类型（存 talent_reports.selections，结构见 spec §3.4） ─────────

/** 已选培养方向 / 目标档位（冻结名称，之后改名不回写）。 */
export interface TalentSelectionItem {
  /** 正式方向 id；自定义方向为空串。 */
  directionId: string;
  /** 自定义方向请求 id；正式方向为空串。 */
  requestId: string;
  custom: boolean;
  tierId: string;
  directionName: string;
  tierName: string;
  teacher: string;
  freq: string;
  /** 自填原文（≤10 字）；正式方向为空串。 */
  manualName: string;
  selectedAt: string;
}

/** 选择动作（spec §4.6）。 */
export type TalentSelectionAction = "select" | "changeTier" | "cancel";

/** 选择动作的输入目标；`selectedAt` / 名称类字段由调用方注入（便于测试）。 */
export interface TalentSelectionTarget {
  directionId?: string;
  requestId?: string;
  custom?: boolean;
  tierId?: string;
  manualName?: string;
  directionName?: string;
  tierName?: string;
  teacher?: string;
  freq?: string;
  selectedAt: string;
}

/** `resolveDirectionSelection` 入参。 */
export interface TalentSelectionResolutionInput {
  action: TalentSelectionAction;
  /** 已冻结名称的当前数组（纯函数不改入参）。 */
  selections: readonly TalentSelectionItem[];
  /** 选择上限（默认 3，调用方注入快照值）。 */
  selectionLimit: number;
  target: TalentSelectionTarget;
  /**
   * 目标方向的候选档位 id（换档 / 选择时校验用）。
   * spec §4.6 签名省略了该参数，这里显式注入以保证 INVALID_TIER 可纯函数校验。
   */
  allowedTierIds?: readonly string[];
}

/** 选择动作失败码（spec §4.6 + INVALID_TARGET 脏输入兜底）。 */
export type TalentSelectionErrorCode =
  | "LIMIT_REACHED"
  | "INVALID_TIER"
  | "INVALID_MANUAL_NAME"
  | "DUPLICATE"
  | "NOT_SELECTED"
  | "INVALID_TARGET";

/** `resolveDirectionSelection` 结果。 */
export interface TalentSelectionResolution {
  ok: boolean;
  changed: boolean;
  selections: TalentSelectionItem[];
  /** 本次新增 / 更新的选择项；取消时为被移除项。 */
  selection?: TalentSelectionItem;
  code?: TalentSelectionErrorCode;
  message?: string;
}

// ── 自定义方向待归并请求（M4-B 新集合 talent_direction_requests） ────────────

/** 待归并集合名（唯一新集合；业务字段只落 `talent_*`）。 */
export const TALENT_DIRECTION_REQUEST_COLLECTION = "talent_direction_requests";

/** 待归并请求状态（中文枚举，spec §3.0/§3.5）。 */
export const TALENT_DIRECTION_REQUEST_STATUSES = [
  "待归并",
  "已归并",
  "已转正式",
] as const;

/** 待归并请求状态。 */
export type TalentDirectionRequestStatus =
  (typeof TALENT_DIRECTION_REQUEST_STATUSES)[number];

/** 待归并默认筛选状态。 */
export const TALENT_DIRECTION_REQUEST_STATUS_PENDING = "待归并" as const;

/** 待归并请求（PocketBase 记录；字段见 spec §3.5）。 */
export interface TalentDirectionRequestRecord {
  id: string;
  created: string;
  updated: string;
  /** 提交自填方向的报告。 */
  reportId: string;
  /** 与报告 `subjectType` 一致：`self` / `child`。 */
  subjectType: string;
  /** 报告对象 id（`talent_parents.id` 或 `talent_children.id`）。 */
  subjectId: string;
  /** 提交家长（`talent_parents.id`，不接受前端传入）。 */
  parentId: string;
  /** 家长填写原文（trim 后 1–10 字）。 */
  manualName: string;
  /** 提交时选择的目标档位（当前启用档位 id）。 */
  tierId: string;
  status: TalentDirectionRequestStatus | string;
  /** `已归并`：目标正式方向 id；`已转正式`：新建方向 id。 */
  targetDirectionId?: string;
  mergedAt?: string;
  mergedBy?: string;
  createdBy?: string;
}

/** 待归并列表 / 归并 / 转正响应的行视图（不含家长/子女姓名以外的敏感字段）。 */
export interface TalentDirectionRequestRow {
  id: string;
  reportId: string;
  reportNo: string;
  subjectType: string;
  subjectName: string;
  parentName: string;
  /** 家长脱敏手机号（前 4 + 后 4），绝不返回原文。 */
  maskedMobile: string;
  manualName: string;
  tierId: string;
  tierName: string;
  status: string;
  targetDirectionId: string;
  targetDirectionName: string;
  createdAt: string;
  mergedAt: string;
  mergedByName: string;
}

/** 待归并列表查询参数（已归一化）。 */
export interface TalentDirectionRequestListQuery {
  keyword: string;
  status: string;
  page: number;
  pageSize: number;
}

/** 待归并列表响应 `{ rows, total, page, pageSize }`。 */
export interface TalentDirectionRequestListResult {
  rows: TalentDirectionRequestRow[];
  total: number;
  page: number;
  pageSize: number;
}

/** 归并 / 转正后的方向摘要（不含配置正文）。 */
export interface TalentDirectionBrief {
  id: string;
  code: string;
  name: string;
  status: string;
  version: number;
  aliases: string[];
}

/** 归并结果（spec §5.3.2）。 */
export interface TalentDirectionMergeResult {
  request: TalentDirectionRequestRow;
  direction: TalentDirectionBrief;
}

/** 转正结果（spec §5.3.3）。 */
export interface TalentDirectionPromoteResult {
  request: TalentDirectionRequestRow;
  direction: TalentDirectionBrief;
}

// ── 后台方向预览（推荐 / 0 命中回退 / 诊断；不落库） ─────────────────────

/** 预览内单条 requirement（含诊断字段，不落快照）。 */
export interface TalentDirectionPreviewRequirement {
  code: string;
  level: string;
  factorName: string;
  factorLevel: string;
  actualOrder: number;
  needOrder: number;
  met: boolean;
  gap: number;
  levelDisabled: boolean;
  factorMissing: boolean;
}

/** 预览内单方向命中（全部已评估方向，按四键排序）。 */
export interface TalentDirectionPreviewHit {
  directionId: string;
  code: string;
  name: string;
  version: number;
  status: string;
  hitCount: number;
  total: number;
  hitRate: number;
  tierIds: string[];
  defaultTierId: string;
  emptyRequirements: boolean;
  requirements: TalentDirectionPreviewRequirement[];
}

/** 预览推荐项（0 命中回退时 `fallback=true`）。 */
export interface TalentDirectionPreviewRecommendationItem {
  directionId: string;
  code: string;
  name: string;
  hitCount: number;
  total: number;
  hitRate: number;
  fallback: boolean;
}

/** 后台方向预览结果（`GET /api/admin/talent/directions/preview?reportId=`）。 */
export interface TalentDirectionPreviewResult {
  reportId: string;
  reportNo: string;
  status: string;
  snapshotVersion: number;
  /** 报告是否已有发布快照（未发布时仍有当前配置预览）。 */
  hasSnapshot: boolean;
  /** 报告冻结的要素条数（预览输入）。 */
  factorCount: number;
  /** 入参方向总数（含停用方向）。 */
  totalDirections: number;
  /** 实际参与评估的方向数（排除停用方向）。 */
  evaluatedDirections: number;
  /** 无方向可评估（空库或全部停用）。 */
  noDirections: boolean;
  recommendation: {
    items: TalentDirectionPreviewRecommendationItem[];
    fallback: boolean;
    totalCandidates: number;
    emptyReason: TalentDirectionEmptyReason | null;
    recommendLimit: number;
  };
  hits: TalentDirectionPreviewHit[];
  warnings: TalentMatchWarning[];
  generatedAt: string;
}

// ── 后台方向选择（选择 / 换档 / 取消；复用 C 端领域逻辑） ─────────────────

/** 后台方向选择动作输入（`POST /api/admin/talent/reports/:id/selection`）。 */
export interface TalentDirectionSelectionInput {
  action: TalentSelectionAction;
  directionId?: string;
  requestId?: string;
  manualName?: string;
  tierId?: string;
}

/** 后台方向选择结果；`alreadySelected` 为真时不追加版本记录。 */
export interface TalentDirectionSelectionResult {
  reportId: string;
  /** 报告编号（审计摘要用，不含家长/子女 PII）。 */
  reportNo: string;
  selection?: TalentSelectionItem;
  selections: TalentSelectionItem[];
  selectionCount: number;
  selectionLimit: number;
  changed: boolean;
  alreadySelected: boolean;
  /** 自填方向对应的待归并请求 id（正式方向为空串）。 */
  requestId: string;
}
