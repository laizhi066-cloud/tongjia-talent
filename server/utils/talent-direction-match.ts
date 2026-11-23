/**
 * @description M4 方向匹配纯函数：命中计算、四键全序排序、推荐/0 命中回退、档位选择、
 *   选择/换档/取消、快照全量与补发增量计算。口径见 docs/specs/M4-matching/spec.md §4 与 ADR 0004。
 *   本文件零 IO：不 import PocketBase / h3 / 网络，只依赖 shared/types，保证单测可直接覆盖。
 * @file server/utils/talent-direction-match.ts
 */
import {
  TALENT_DIRECTION_MANUAL_NAME_MAX,
  TALENT_DIRECTION_RECOMMEND_LIMIT,
  TALENT_DIRECTION_RECOMMEND_LIMIT_MAX,
  TALENT_DIRECTION_SELECTION_LIMIT,
  TALENT_DIRECTION_SELECTION_LIMIT_MAX,
  type DirectionMatchResult,
  type TalentDirectionHit,
  type TalentDirectionMatchWarningCode,
  type TalentDirectionRecommendationItem,
  type TalentDirectionRecommendationOptions,
  type TalentDirectionRecommendationResult,
  type TalentDirectionRequirementHit,
  type TalentDirectionSnapshot,
  type TalentDirectionSnapshotEnvelope,
  type TalentDirectionSnapshotHit,
  type TalentDirectionSnapshotRequirement,
  type TalentDirectionSnapshotTier,
  type TalentDirectionSummary,
  type TalentMatchDirection,
  type TalentMatchFactor,
  type TalentMatchLevel,
  type TalentMatchOptions,
  type TalentMatchTier,
  type TalentMatchWarning,
  type TalentSelectionErrorCode,
  type TalentSelectionItem,
  type TalentSelectionResolution,
  type TalentSelectionResolutionInput,
} from "~~/shared/types/talent-direction";

/** 判断字符串是否含控制字符（含 DEL 与 C1 控制符）；自填名称不允许写入 selections / 请求集合。 */
function containsControlCharacter(value: string): boolean {
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) return true;
  }
  return false;
}

// ── 通用工具 ──────────────────────────────────────────────────────────

/** 解析正整数级序；非有限数 / ≤0 一律视为「未知」（null），不把脏值当命中依据。 */
function toPositiveOrder(value: unknown): number | null {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Math.floor(numeric);
}

/**
 * 按 Unicode 码位逐字符比较（不用 localeCompare，避免 ICU / 区域设置造成环境差异）。
 * 返回 <0 表示 a 在前；>0 表示 b 在前；0 表示完全相等。
 */
export function compareByCodePoint(a: string, b: string): number {
  if (a === b) return 0;
  let left = 0;
  let right = 0;
  while (left < a.length && right < b.length) {
    const leftCode = a.codePointAt(left) ?? 0;
    const rightCode = b.codePointAt(right) ?? 0;
    if (leftCode !== rightCode) return leftCode < rightCode ? -1 : 1;
    left += leftCode > 0xffff ? 2 : 1;
    right += rightCode > 0xffff ? 2 : 1;
  }
  if (left < a.length) return 1;
  if (right < b.length) return -1;
  return 0;
}

/** 新增一条诊断警告（调用方负责最终去重，保证同一脏数据只提示一次）。 */
function pushWarning(
  warnings: TalentMatchWarning[],
  code: TalentDirectionMatchWarningCode,
  message: string,
  extra: { directionId?: string; factorCode?: string } = {},
): void {
  warnings.push({ code, message, ...extra });
}

/** 警告去重：同一 code + 方向 + 要素只保留首条。 */
function dedupeWarnings(warnings: readonly TalentMatchWarning[]): TalentMatchWarning[] {
  const seen = new Set<string>();
  const result: TalentMatchWarning[] = [];
  for (const warning of warnings) {
    const key = `${warning.code}|${warning.directionId ?? ""}|${warning.factorCode ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ ...warning });
  }
  return result;
}

/** 解析推荐上限：合法整数 1–20，否则回退常量 5（快照/读取层共用）。 */
export function resolveRecommendLimit(value?: unknown): number {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= TALENT_DIRECTION_RECOMMEND_LIMIT_MAX
    ? value
    : TALENT_DIRECTION_RECOMMEND_LIMIT;
}

/** 解析选择上限：合法整数 1–10，否则回退常量 3（快照/读取层共用）。 */
export function resolveSelectionLimit(value?: unknown): number {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= TALENT_DIRECTION_SELECTION_LIMIT_MAX
    ? value
    : TALENT_DIRECTION_SELECTION_LIMIT;
}

// ── 四键全序排序（命中数 → 命中率交叉相乘 → 配置条数 → 编码 → id） ────────

/**
 * 方向命中比较器（spec §4.3 / ADR 0004-D2）：
 * 1. `hitCount` 降序；2. 命中率降序但用整数交叉相乘（浮点不参与排序）；
 * 3. `total` 降序；4. `code` 按 Unicode 码位升序；5. `directionId` 升序兜底。
 */
export function compareDirectionHits<T extends TalentDirectionSummary>(a: T, b: T): number {
  if (a.hitCount !== b.hitCount) return b.hitCount - a.hitCount;
  // 双方都有配置条数时才比较比值：a/b 命中率大小 ⇔ a.hitCount*b.total vs b.hitCount*a.total。
  if (a.total > 0 && b.total > 0) {
    const rateDiff = b.hitCount * a.total - a.hitCount * b.total;
    if (rateDiff !== 0) return rateDiff < 0 ? -1 : 1;
  }
  if (a.total !== b.total) return b.total - a.total;
  const codeDiff = compareByCodePoint(a.code, b.code);
  if (codeDiff !== 0) return codeDiff;
  return compareByCodePoint(a.directionId, b.directionId);
}

/**
 * 排序入口（唯一排序实现）：返回新数组，不修改入参；全序保证打乱输入顺序结果一致。
 * 泛型同时覆盖命中结果与快照方向（均满足 {@link TalentDirectionSummary}）。
 */
export function rankDirectionHits<T extends TalentDirectionSummary>(hits: readonly T[]): T[] {
  return [...hits].sort((a, b) => compareDirectionHits(a, b));
}

/** {@link rankDirectionHits} 的 spec 别名（spec §4.9 `rankHits`）。 */
export const rankHits = rankDirectionHits;

// ── 命中计算 ──────────────────────────────────────────────────────────

interface FactorIndexEntry {
  factor: TalentMatchFactor;
  /** 冻结级序；null = 无法解析（按 0 处理并告警）。 */
  levelOrder: number | null;
}

/** 建立要素索引：按数组顺序首条生效，重复 code 记诊断。 */
function buildFactorIndex(
  factors: readonly TalentMatchFactor[],
  warnings: TalentMatchWarning[],
): Map<string, FactorIndexEntry> {
  const index = new Map<string, FactorIndexEntry>();
  for (const factor of factors) {
    const code = typeof factor?.code === "string" ? factor.code : "";
    if (code === "") continue;
    if (index.has(code)) {
      pushWarning(warnings, "DUPLICATE_FACTOR", `要素编码重复，仅首条生效：${code}`, {
        factorCode: code,
      });
      continue;
    }
    index.set(code, {
      factor,
      // 快照 levelOrder 优先，缺失时才降级；降级在 requirement 计算时按当前分级表反查。
      levelOrder: toPositiveOrder(factor.levelOrder),
    });
  }
  return index;
}

/** 解析要素实际级序：快照冻结值优先，缺失时按当前分级表反查（兜底，M3 必须冻结）。 */
function resolveActualOrder(entry: FactorIndexEntry | undefined, levelOrders: Record<string, number>): number {
  if (!entry) return 0;
  if (entry.levelOrder !== null) return entry.levelOrder;
  const fallback = toPositiveOrder(levelOrders[entry.factor.levelCode]);
  return fallback ?? 0;
}

/** 建分级编码 → 级序映射（含停用分级；过滤空 code 与非法 sortOrder）。 */
export function buildTalentLevelOrders(levels: readonly TalentMatchLevel[]): Record<string, number> {
  const levelOrders: Record<string, number> = {};
  for (const level of levels) {
    const code = typeof level?.code === "string" ? level.code : "";
    if (code === "" || code in levelOrders) continue;
    const order = toPositiveOrder(level.sortOrder);
    if (order === null) continue;
    levelOrders[code] = order;
  }
  return levelOrders;
}

/**
 * 命中计算（spec §4.2）：
 * - 每个 direction 的 requirements 去重后逐条判断 `actualOrder >= needOrder` 记 1 条；
 * - 要素缺失 / 要求分级停用 / 未知分级 → 未命中且计入分母；
 * - 返回全部已评估方向（含 0 命中、0 配置），排序后由 {@link DirectionMatchResult} 带推荐切片。
 */
export function matchDirections(
  factors: readonly TalentMatchFactor[],
  directions: readonly TalentMatchDirection[],
  options: TalentMatchOptions,
): DirectionMatchResult {
  const factorList = Array.isArray(factors) ? factors : [];
  const directionList = Array.isArray(directions) ? directions : [];
  const levelOrders = options?.levelOrders ?? {};
  const disabledLevelCodes = new Set(
    Array.isArray(options?.disabledLevelCodes) ? options.disabledLevelCodes : [],
  );
  const includeDisabledDirections = options?.includeDisabledDirections === true;

  const warnings: TalentMatchWarning[] = [];
  const factorIndex = buildFactorIndex(factorList, warnings);

  const seenDirectionCodes = new Set<string>();
  const hits: TalentDirectionHit[] = [];

  for (const direction of directionList) {
    if (!direction) continue;
    if (!includeDisabledDirections && direction.status !== "1") continue;
    const directionCode = typeof direction.code === "string" ? direction.code : "";
    if (directionCode !== "") {
      if (seenDirectionCodes.has(directionCode)) {
        pushWarning(
          warnings,
          "DUPLICATE_DIRECTION_CODE",
          `方向编码重复，仅首条生效：${directionCode}`,
          { directionId: direction.id },
        );
        continue;
      }
      seenDirectionCodes.add(directionCode);
    }

    const requirements: TalentDirectionRequirementHit[] = [];
    const seenRequirementCodes = new Set<string>();
    const rawRequirements = Array.isArray(direction.requirements) ? direction.requirements : [];

    for (const requirement of rawRequirements) {
      const code = typeof requirement?.code === "string" ? requirement.code : "";
      const level = typeof requirement?.level === "string" ? requirement.level : "";
      if (code === "") continue;
      if (seenRequirementCodes.has(code)) {
        pushWarning(
          warnings,
          "DUPLICATE_REQUIREMENT",
          `方向 ${directionCode || direction.id} 的要素要求重复，仅首条生效：${code}`,
          { directionId: direction.id, factorCode: code },
        );
        continue;
      }
      seenRequirementCodes.add(code);

      const needOrder = toPositiveOrder(levelOrders[level]);
      const levelKnown = needOrder !== null;
      const entry = factorIndex.get(code);
      const actualOrder = resolveActualOrder(entry, levelOrders);
      const levelDisabled = levelKnown && disabledLevelCodes.has(level);
      const factorMissing = !entry;
      const met =
        !factorMissing && !levelDisabled && levelKnown && actualOrder >= (needOrder ?? 0);
      const gap = met ? 0 : Math.max(0, (needOrder ?? 0) - actualOrder);

      if (!levelKnown) {
        pushWarning(
          warnings,
          "UNKNOWN_LEVEL",
          `方向 ${directionCode || direction.id} 的要求分级未知：${level || "(空)"}`,
          { directionId: direction.id, factorCode: code },
        );
      } else if (levelDisabled) {
        pushWarning(
          warnings,
          "LEVEL_DISABLED",
          `方向 ${directionCode || direction.id} 的要求分级已停用，按未命中计分母：${level}`,
          { directionId: direction.id, factorCode: code },
        );
      }
      if (entry && entry.levelOrder === null && toPositiveOrder(levelOrders[entry.factor.levelCode]) === null) {
        pushWarning(
          warnings,
          "UNKNOWN_FACTOR_LEVEL",
          `要素实际分级未知，按级序 0 处理：${code} / ${entry.factor.levelCode || "(空)"}`,
          { directionId: direction.id, factorCode: code },
        );
      }

      requirements.push({
        code,
        level,
        needOrder: needOrder ?? 0,
        factorName: entry?.factor.name ?? "",
        factorLevel: entry?.factor.levelCode ?? "",
        factorLevelName: entry ? (entry.factor.levelName ?? "") : "—",
        actualOrder,
        met,
        gap,
        levelDisabled,
        factorMissing,
      });
    }

    const total = requirements.length;
    const hitCount = requirements.reduce((count, item) => (item.met ? count + 1 : count), 0);
    const tierIds = Array.isArray(direction.tierIds) ? [...direction.tierIds] : [];
    const emptyRequirements = total === 0;
    if (emptyRequirements) {
      pushWarning(
        warnings,
        "EMPTY_REQUIREMENTS",
        `方向 ${directionCode || direction.id} 未配置要素要求，不进入推荐`,
        { directionId: direction.id },
      );
    }

    hits.push({
      directionId: direction.id,
      code: directionCode,
      name: typeof direction.name === "string" ? direction.name : "",
      version: toPositiveOrder(direction.version) ?? 1,
      status: direction.status === "1" ? "1" : "0",
      requirements,
      hitCount,
      total,
      hitRate: total > 0 ? hitCount / total : 0,
      tierIds,
      defaultTierId: typeof direction.defaultTierId === "string" ? direction.defaultTierId : "",
      emptyRequirements,
    });
  }

  const ranked = rankDirectionHits(hits);
  const recommendation = resolveDirectionRecommendations(ranked, {
    recommendLimit: options?.recommendLimit,
  });

  return {
    hits: ranked,
    warnings: dedupeWarnings(warnings),
    totalDirections: directionList.length,
    evaluatedDirections: ranked.length,
    noDirections: ranked.length === 0,
    fallback: recommendation.fallback,
    recommendLimit: recommendation.recommendLimit,
    recommended: recommendation.items,
    emptyReason: recommendation.emptyReason,
  };
}

// ── 推荐 / 0 命中回退 ─────────────────────────────────────────────────

/** 给命中项补读取层标记（不写回快照，仅响应装饰）。 */
function decorateRecommendation<T extends TalentDirectionSummary>(
  hit: T,
  fallback: boolean,
): TalentDirectionRecommendationItem<T> {
  return { ...hit, fallback };
}

/**
 * 推荐切片（spec §4.4，任务卡 `resolveDirectionRecommendations`）：
 * - 有命中：取 `hitCount>0 && total>0`，排序后截断上限；
 * - 全部 0 命中：回退为全部有效配置方向（仍受上限截断），每项 `fallback=true`；
 * - 无方向 → `NO_DIRECTIONS`；有方向但全部 0 配置 → `NO_ENABLED_DIRECTIONS`。
 */
export function resolveDirectionRecommendations<T extends TalentDirectionSummary>(
  hits: readonly T[],
  options: TalentDirectionRecommendationOptions = {},
): TalentDirectionRecommendationResult<T> {
  const recommendLimit = resolveRecommendLimit(options.recommendLimit);
  const ranked = rankDirectionHits(Array.isArray(hits) ? hits : []);
  if (ranked.length === 0) {
    return {
      items: [],
      fallback: false,
      totalCandidates: 0,
      emptyReason: "NO_DIRECTIONS",
      recommendLimit,
    };
  }

  const eligible = ranked.filter((hit) => hit.total > 0);
  if (eligible.length === 0) {
    return {
      items: [],
      fallback: false,
      totalCandidates: 0,
      emptyReason: "NO_ENABLED_DIRECTIONS",
      recommendLimit,
    };
  }

  const matched = eligible.filter((hit) => hit.hitCount > 0);
  if (matched.length > 0) {
    return {
      items: matched.slice(0, recommendLimit).map((hit) => decorateRecommendation(hit, false)),
      fallback: false,
      totalCandidates: matched.length,
      emptyReason: null,
      recommendLimit,
    };
  }

  return {
    items: eligible.slice(0, recommendLimit).map((hit) => decorateRecommendation(hit, true)),
    fallback: true,
    totalCandidates: eligible.length,
    emptyReason: null,
    recommendLimit,
  };
}

/**
 * 从冻结快照读取推荐（spec §4.4 / §4.9）：不落库、不按当前配置重算。
 * 上限优先级：显式 options → 快照 `recommendLimit`（合法 1–20）→ 常量 5。
 */
export function recommendDirections(
  snapshot: TalentDirectionSnapshot,
  options: TalentDirectionRecommendationOptions = {},
): TalentDirectionRecommendationResult<TalentDirectionSnapshotHit> {
  const directions = Array.isArray(snapshot?.directions) ? snapshot.directions : [];
  const limitSource =
    options.recommendLimit !== undefined ? options.recommendLimit : snapshot?.recommendLimit;
  return resolveDirectionRecommendations(directions, { recommendLimit: limitSource });
}

// ── 档位选择 ──────────────────────────────────────────────────────────

/** 档位排序：`sortOrder` 升序，相同按 id 码位升序（不依赖输入顺序）。 */
function sortTiers(tiers: readonly TalentMatchTier[]): TalentMatchTier[] {
  return [...tiers].sort((a, b) => {
    const orderDiff = (toPositiveOrder(a.sortOrder) ?? Number.MAX_SAFE_INTEGER) -
      (toPositiveOrder(b.sortOrder) ?? Number.MAX_SAFE_INTEGER);
    if (orderDiff !== 0) return orderDiff;
    return compareByCodePoint(a.id, b.id);
  });
}

/**
 * 方向的可选档位候选（spec §4.5）：启用档位 ∩ 方向 `tierIds`，按 `sortOrder` 升序。
 * 入参 tiers 应为「快照档位 ∩ 当前启用档位」的交集，由读取层保证。
 */
export function resolveDirectionTierCandidates(
  direction: Pick<TalentMatchDirection, "tierIds">,
  tiers: readonly TalentMatchTier[],
): TalentMatchTier[] {
  const tierIds = new Set(Array.isArray(direction?.tierIds) ? direction.tierIds : []);
  return sortTiers((Array.isArray(tiers) ? tiers : []).filter((tier) => tier.status === "1" && tierIds.has(tier.id)));
}

/**
 * 选择目标档位（spec §4.5）：requested → current → defaultTierId → 候选第一条。
 * 候选为空返回 null，调用方据此置 `selectable=false` / 422 `TIER_UNAVAILABLE`。
 */
export function pickTier(
  direction: Pick<TalentMatchDirection, "tierIds" | "defaultTierId">,
  tiers: readonly TalentMatchTier[],
  options: { requestedTierId?: string; currentTierId?: string } = {},
): TalentMatchTier | null {
  const candidates = resolveDirectionTierCandidates(direction, tiers);
  if (candidates.length === 0) return null;

  const findInCandidates = (tierId: string | undefined): TalentMatchTier | undefined => {
    const normalized = typeof tierId === "string" ? tierId.trim() : "";
    if (normalized === "") return undefined;
    return candidates.find((tier) => tier.id === normalized);
  };

  return (
    findInCandidates(options.requestedTierId) ??
    findInCandidates(options.currentTierId) ??
    findInCandidates(direction.defaultTierId) ??
    candidates[0] ??
    null
  );
}

/**
 * 自填方向（无方向配置）的档位选择（spec §4.5 末段）：
 * 候选 = 全部启用档位；默认取全局 `isDefault`，无则第一条；requested / current 优先。
 */
export function pickManualTier(
  tiers: readonly TalentMatchTier[],
  options: { requestedTierId?: string; currentTierId?: string } = {},
): TalentMatchTier | null {
  const candidates = sortTiers((Array.isArray(tiers) ? tiers : []).filter((tier) => tier.status === "1"));
  if (candidates.length === 0) return null;

  const findInCandidates = (tierId: string | undefined): TalentMatchTier | undefined => {
    const normalized = typeof tierId === "string" ? tierId.trim() : "";
    if (normalized === "") return undefined;
    return candidates.find((tier) => tier.id === normalized);
  };

  const defaultTier = candidates.find((tier) => tier.isDefault === true) ?? candidates[0] ?? null;
  return findInCandidates(options.requestedTierId) ?? findInCandidates(options.currentTierId) ?? defaultTier;
}

// ── 快照：全量计算 / 补发增量 ─────────────────────────────────────────

/** 构建快照（spec §4.9 `computeTalentDirectionMatches`）：只评估启用方向，返回全部结果不截断。 */
export interface TalentDirectionSnapshotInput {
  factors: readonly TalentMatchFactor[];
  directions: readonly TalentMatchDirection[];
  tiers: readonly TalentMatchTier[];
  levels: readonly TalentMatchLevel[];
  recommendLimit?: number;
  selectionLimit?: number;
  version: number;
  at: string;
  operatorId: string;
  operatorName: string;
}

/** 冻结启用档位：按 sortOrder 升序输出 7 键，停用档位不进快照。 */
function freezeSnapshotTiers(tiers: readonly TalentMatchTier[]): TalentDirectionSnapshotTier[] {
  return sortTiers((Array.isArray(tiers) ? tiers : []).filter((tier) => tier.status === "1")).map(
    (tier) => ({
      id: tier.id,
      code: tier.code,
      name: tier.name,
      teacher: tier.teacher,
      freq: tier.freq,
      headline: tier.headline ?? "",
      sortOrder: toPositiveOrder(tier.sortOrder) ?? 0,
    }),
  );
}

/** 命中结果 → 快照方向：剔除诊断字段，`tierIds` 与发布时启用档位求交。 */
function toSnapshotHit(
  hit: TalentDirectionHit,
  enabledTierIds: ReadonlySet<string>,
): TalentDirectionSnapshotHit {
  const requirements: TalentDirectionSnapshotRequirement[] = hit.requirements.map((requirement) => ({
    code: requirement.code,
    level: requirement.level,
    factorName: requirement.factorName,
    factorLevel: requirement.factorLevel,
    actualOrder: requirement.actualOrder,
    needOrder: requirement.needOrder,
    met: requirement.met,
    gap: requirement.gap,
  }));
  return {
    directionId: hit.directionId,
    code: hit.code,
    name: hit.name,
    version: hit.version,
    tierIds: hit.tierIds.filter((tierId) => enabledTierIds.has(tierId)),
    defaultTierId: hit.defaultTierId,
    total: hit.total,
    hitCount: hit.hitCount,
    hitRate: hit.hitRate,
    requirements,
  };
}

/** 快照方向深拷贝（补发无影响时保持与 base 逐字段一致）。 */
function cloneSnapshotHit(hit: TalentDirectionSnapshotHit): TalentDirectionSnapshotHit {
  return {
    ...hit,
    tierIds: [...hit.tierIds],
    requirements: hit.requirements.map((requirement) => ({ ...requirement })),
  };
}

/** 快照方向重算命中汇总（requirements 已更新）。 */
function summarizeSnapshotHit(
  hit: TalentDirectionSnapshotHit,
  requirements: TalentDirectionSnapshotRequirement[],
): TalentDirectionSnapshotHit {
  const total = requirements.length;
  const hitCount = requirements.reduce((count, item) => (item.met ? count + 1 : count), 0);
  return {
    ...hit,
    total,
    hitCount,
    hitRate: total > 0 ? hitCount / total : 0,
    tierIds: [...hit.tierIds],
    requirements,
  };
}

/**
 * 全量计算方向快照（发布 / 显式重算）：严格按 M3 spec §3.2.3 的 9 个顶层键输出，
 * `directions` 返回全部已评估方向（含 0 命中、含未进推荐前 5 的）。
 */
export function computeTalentDirectionMatches(
  input: TalentDirectionSnapshotInput,
): TalentDirectionSnapshot {
  const levels = Array.isArray(input.levels) ? input.levels : [];
  const levelOrders = buildTalentLevelOrders(levels);
  const disabledLevelCodes = levels
    .filter((level) => typeof level?.code === "string" && level.code !== "" && level.status !== "1")
    .map((level) => level.code);
  const tiers = freezeSnapshotTiers(input.tiers);
  const enabledTierIds = new Set(tiers.map((tier) => tier.id));

  const match = matchDirections(input.factors, input.directions, {
    levelOrders,
    disabledLevelCodes,
    recommendLimit: input.recommendLimit,
  });

  return {
    version: toPositiveOrder(input.version) ?? 1,
    at: String(input.at ?? ""),
    operatorId: String(input.operatorId ?? ""),
    operatorName: String(input.operatorName ?? ""),
    recommendLimit: resolveRecommendLimit(input.recommendLimit),
    selectionLimit: resolveSelectionLimit(input.selectionLimit),
    levelOrders: { ...levelOrders },
    tiers,
    directions: match.hits.map((hit) => toSnapshotHit(hit, enabledTierIds)),
  };
}

/**
 * 补发增量重算（spec §4.9 `refreshDirectionSnapshot`）：
 * `factors` 必须是「新增册要素并入后的完整 factorSnapshot」（同 matchDirections 入参口径），
 * 只重算 `affectedFactorCodes` 命中的 requirement，其余命中明细 / 实际级序原样复制；
 * 重算后重新汇总 hitCount 并按四键全序重排。envelope 可覆盖（版本号动作仍归 M3）。
 */
export function refreshDirectionSnapshot(
  base: TalentDirectionSnapshot,
  factors: readonly TalentMatchFactor[],
  affectedFactorCodes: readonly string[],
  options: TalentDirectionSnapshotEnvelope & { disabledLevelCodes?: readonly string[] } = {},
): TalentDirectionSnapshot {
  const affected = new Set(
    (Array.isArray(affectedFactorCodes) ? affectedFactorCodes : []).filter(
      (code): code is string => typeof code === "string" && code !== "",
    ),
  );
  const warnings: TalentMatchWarning[] = [];
  const factorIndex = buildFactorIndex(Array.isArray(factors) ? factors : [], warnings);
  const disabledLevelCodes = new Set(
    Array.isArray(options.disabledLevelCodes) ? options.disabledLevelCodes : [],
  );
  const levelOrders = base?.levelOrders ?? {};
  const baseDirections = Array.isArray(base?.directions) ? base.directions : [];

  const directions = baseDirections.map((hit) => {
    if (affected.size === 0) return cloneSnapshotHit(hit);
    const requirements = hit.requirements.map((requirement) => {
      if (!affected.has(requirement.code)) return { ...requirement };
      const entry = factorIndex.get(requirement.code);
      const actualOrder = resolveActualOrder(entry, levelOrders);
      const needOrder = toPositiveOrder(requirement.needOrder) ?? 0;
      const levelDisabled = disabledLevelCodes.has(requirement.level);
      const met = !levelDisabled && needOrder > 0 && actualOrder >= needOrder;
      const gap = met ? 0 : Math.max(0, needOrder - actualOrder);
      return {
        ...requirement,
        factorName: entry?.factor.name ?? requirement.factorName,
        factorLevel: entry ? entry.factor.levelCode : requirement.factorLevel,
        actualOrder,
        needOrder,
        met,
        gap,
      };
    });
    return summarizeSnapshotHit(hit, requirements);
  });

  return {
    version: options.version !== undefined ? options.version : base.version,
    at: options.at !== undefined ? options.at : base.at,
    operatorId: options.operatorId !== undefined ? options.operatorId : base.operatorId,
    operatorName: options.operatorName !== undefined ? options.operatorName : base.operatorName,
    recommendLimit: base.recommendLimit,
    selectionLimit: base.selectionLimit,
    levelOrders: { ...levelOrders },
    tiers: (Array.isArray(base.tiers) ? base.tiers : []).map((tier) => ({ ...tier })),
    directions: rankDirectionHits(directions),
  };
}

// ── 自填方向候选 ──────────────────────────────────────────────────────

/**
 * 自填方向下拉候选（spec §4.9 / §7.3）：快照内方向按名称拼音（zh-Hans-CN）升序，
 * 名称相同按 id 兜底；快照为空返回空数组（自填仍可用，档位走 {@link pickManualTier}）。
 */
export function buildManualDirectionOptions(
  snapshot: TalentDirectionSnapshot,
): Array<{ directionId: string; name: string }> {
  const directions = Array.isArray(snapshot?.directions) ? snapshot.directions : [];
  return directions
    .map((direction) => ({ directionId: direction.directionId, name: direction.name }))
    .sort((a, b) => {
      const nameDiff = a.name.localeCompare(b.name, "zh-Hans-CN");
      if (nameDiff !== 0) return nameDiff;
      return compareByCodePoint(a.directionId, b.directionId);
    });
}

// ── 选择 / 换档 / 取消 ────────────────────────────────────────────────

/** 选择上限异常：纯函数层不 import h3，由 API 层映射为 409 `SELECTION_LIMIT_REACHED`。 */
export class TalentSelectionLimitError extends Error {
  readonly code = "LIMIT_REACHED";

  constructor(message = "已达到方向选择上限") {
    super(message);
    this.name = "TalentSelectionLimitError";
  }
}

/** 规整自填方向名称（去首尾空白，按原文保留内部字符）。 */
export function normalizeManualDirectionName(value: unknown): string {
  return String(value ?? "").trim();
}

/** 自填方向名称校验：trim 后 1–10 个 Unicode 码位，且不含控制字符。 */
export function isValidManualDirectionName(value: unknown): boolean {
  const name = normalizeManualDirectionName(value);
  if (containsControlCharacter(name)) return false;
  const length = Array.from(name).length;
  return length >= 1 && length <= TALENT_DIRECTION_MANUAL_NAME_MAX;
}

/**
 * 选择上限断言（任务卡 `assertSelectionLimit`）：已达上限（`length >= limit`）即抛错。
 * 纯函数层用异常表达非法状态，API 层捕获后转 409。
 */
export function assertSelectionLimit(
  selections: readonly TalentSelectionItem[],
  selectionLimit: number = TALENT_DIRECTION_SELECTION_LIMIT,
): void {
  const limit = resolveSelectionLimit(selectionLimit);
  const count = Array.isArray(selections) ? selections.length : 0;
  if (count >= limit) throw new TalentSelectionLimitError(`最多可选择 ${limit} 个方向，请先取消一个`);
}

/** 查找已选项下标：正式方向按 `directionId`，自定义按 `requestId`。 */
function findSelectionIndex(
  selections: readonly TalentSelectionItem[],
  target: { directionId?: string; requestId?: string },
): number {
  const directionId = typeof target.directionId === "string" ? target.directionId.trim() : "";
  const requestId = typeof target.requestId === "string" ? target.requestId.trim() : "";
  return selections.findIndex(
    (item) =>
      (directionId !== "" && item.directionId === directionId) ||
      (requestId !== "" && item.requestId === requestId),
  );
}

/** 构造失败结果（selections 始终为入参的新副本，保证纯函数语义）。 */
function selectionFailure(
  selections: readonly TalentSelectionItem[],
  code: TalentSelectionErrorCode,
  message: string,
): TalentSelectionResolution {
  return {
    ok: false,
    changed: false,
    code,
    message,
    selections: selections.map((item) => ({ ...item })),
  };
}

/** 校验目标档位：必填且（若调用方注入 allowedTierIds）必须属于候选。 */
function validateTargetTier(
  input: TalentSelectionResolutionInput,
  tierId: string,
): string | null {
  if (tierId === "") return "目标档位不能为空";
  const allowedTierIds = input.allowedTierIds;
  if (Array.isArray(allowedTierIds) && !allowedTierIds.includes(tierId))
    return "目标档位不在该方向的候选档位内";
  return null;
}

/**
 * 选择 / 换档 / 取消（spec §4.6，任务卡 `resolveSelection`）：
 * 纯函数输入当前 `selections` 与动作，返回新数组与状态；不触库、不改入参。
 */
export function resolveDirectionSelection(
  input: TalentSelectionResolutionInput,
): TalentSelectionResolution {
  const selections = Array.isArray(input?.selections)
    ? input.selections.map((item) => ({ ...item }))
    : [];
  const selectionLimit = resolveSelectionLimit(input?.selectionLimit);
  const target = input?.target ?? { selectedAt: "" };
  const action = input?.action;

  if (action === "cancel") {
    const index = findSelectionIndex(selections, target);
    if (index < 0) return { ok: true, changed: false, selections };
    const selection = selections[index];
    const next = selections.filter((_, itemIndex) => itemIndex !== index);
    return { ok: true, changed: true, selections: next, selection };
  }

  if (action !== "select" && action !== "changeTier") {
    return selectionFailure(selections, "INVALID_TARGET", "未知的选择动作");
  }

  const directionId = typeof target.directionId === "string" ? target.directionId.trim() : "";
  const requestId = typeof target.requestId === "string" ? target.requestId.trim() : "";
  const manualName = normalizeManualDirectionName(target.manualName);
  const custom = target.custom === true || (directionId === "" && manualName !== "");
  const tierId = typeof target.tierId === "string" ? target.tierId.trim() : "";
  const selectedAt = typeof target.selectedAt === "string" ? target.selectedAt : "";

  if (action === "changeTier") {
    const tierError = validateTargetTier(input, tierId);
    if (tierError !== null) return selectionFailure(selections, "INVALID_TIER", tierError);
    const index = findSelectionIndex(selections, target);
    if (index < 0) return selectionFailure(selections, "NOT_SELECTED", "该方向尚未选择");
    const current = selections[index]!;
    if (current.tierId === tierId) {
      return { ok: true, changed: false, selections, selection: { ...current } };
    }
    const updated: TalentSelectionItem = {
      ...current,
      tierId,
      tierName: typeof target.tierName === "string" ? target.tierName : current.tierName,
      teacher: typeof target.teacher === "string" ? target.teacher : current.teacher,
      freq: typeof target.freq === "string" ? target.freq : current.freq,
    };
    selections[index] = updated;
    return { ok: true, changed: true, selections, selection: { ...updated } };
  }

  // select：先判重复，再判上限（spec §4.6 表顺序）。
  if (custom) {
    if (!isValidManualDirectionName(manualName))
      return selectionFailure(
        selections,
        "INVALID_MANUAL_NAME",
        `自填方向名称需为 1–${TALENT_DIRECTION_MANUAL_NAME_MAX} 个字且不含控制字符`,
      );
    if (
      selections.some(
        (item) => item.custom && normalizeManualDirectionName(item.manualName) === manualName,
      )
    ) {
      return selectionFailure(selections, "DUPLICATE", "该自填方向已选择");
    }
  } else {
    if (directionId === "") return selectionFailure(selections, "INVALID_TARGET", "缺少方向 id");
    if (selections.some((item) => !item.custom && item.directionId === directionId))
      return selectionFailure(selections, "DUPLICATE", "该方向已选择，请使用换档");
  }

  const tierError = validateTargetTier(input, tierId);
  if (tierError !== null) return selectionFailure(selections, "INVALID_TIER", tierError);
  if (selections.length >= selectionLimit)
    return selectionFailure(selections, "LIMIT_REACHED", `最多可选择 ${selectionLimit} 个方向，请先取消一个`);

  const selection: TalentSelectionItem = {
    directionId: custom ? "" : directionId,
    requestId: custom ? requestId : "",
    custom,
    tierId,
    directionName: custom ? "" : typeof target.directionName === "string" ? target.directionName : "",
    tierName: typeof target.tierName === "string" ? target.tierName : "",
    teacher: typeof target.teacher === "string" ? target.teacher : "",
    freq: typeof target.freq === "string" ? target.freq : "",
    manualName: custom ? manualName : "",
    selectedAt,
  };
  return { ok: true, changed: true, selections: [...selections, selection], selection };
}

/** {@link resolveDirectionSelection} 的别名（任务卡命名）。 */
export const resolveSelection = resolveDirectionSelection;
