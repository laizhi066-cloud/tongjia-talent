/**
 * @description M3 报告域快照与版本链纯函数（不读写 PocketBase、不做 HTTP）：
 *   A–F ↔ V1–V6 固定映射、factorSnapshot / volumeSnapshot 构建、directionSnapshot（调用 M4 纯函数）、
 *   增量分册计算、发布 / 撤回 / 恢复 / 补发 / 显式重算 / 方向选择的写计划与版本链。
 *   口径见 docs/specs/M3-reports/spec.md §3.2–§4.5、ADR 0003-D1/D3/D5。
 *   快照构建结果一律深拷贝 + 深冻结（仅内存防误改，落库仍为普通 JSON）；补发只追加新册，
 *   旧册 `volumeSnapshot` 与旧要素 `factorSnapshot` 逐项不变。
 * @file server/utils/talent-report-snapshot.ts
 */
import { createError } from "h3";
import {
  TALENT_GENE_REPORT_BOOK_CODES,
  TALENT_REPORT_VOLUME_DEFINITIONS,
  TALENT_REPORT_VOLUME_IDS,
  TALENT_REPORT_VERSION_LIMIT,
  type TalentGeneReportBookCode,
  type TalentGeneReportExternalSection,
  type TalentReportActionContext,
  type TalentReportDirectionRule,
  type TalentReportFactorSnapshotBuildResult,
  type TalentReportFactorSnapshotItem,
  type TalentReportFactorRule,
  type TalentReportLevelRule,
  type TalentReportPublishPlan,
  type TalentReportPublishPlanInput,
  type TalentReportRecord,
  type TalentReportRegeneratePlan,
  type TalentReportRegeneratePlanInput,
  type TalentReportReissuePlan,
  type TalentReportReissuePlanInput,
  type TalentReportSelectionVersionInput,
  type TalentReportSelectionVersionPlan,
  type TalentReportSnapshotBuildResult,
  type TalentReportSnapshotRules,
  type TalentReportStatusActionInput,
  type TalentReportStatusActionPlan,
  type TalentReportStatus,
  type TalentReportTierRule,
  type TalentReportVersionEntry,
  type TalentReportVolumeDefinition,
  type TalentReportVolumeId,
  type TalentReportVolumeSnapshot,
  type TalentReportVolumeSnapshotChapter,
  type TalentReportVolumeSnapshotFactor,
} from "~~/shared/types/talent-report";
import {
  buildTalentLevelOrders,
  computeTalentDirectionMatches,
  matchDirections,
  refreshDirectionSnapshot,
} from "./talent-direction-match";
import type {
  DirectionMatchResult,
  TalentDirectionSnapshot,
  TalentMatchDirection,
  TalentMatchFactor,
  TalentMatchLevel,
  TalentMatchTier,
} from "~~/shared/types/talent-direction";

/** 版本历史摘要截断前缀（spec §3.2.5）。 */
export const TALENT_REPORT_VERSION_TRUNCATED_PREFIX = "历史已截断；";

/** 单次构建最多回传的 warnings 条数（避免外部脏数据刷爆响应）。 */
const TALENT_REPORT_WARNING_LIMIT = 50;

// ── 错误：领域层抛 h3 错误，API 层直接透传状态码 ─────────────────────────────

/** 409 状态冲突（非法状态迁移 / 无新增册 / 重复动作）。 */
export function conflictTalentReport(message: string) {
  return createError({ statusCode: 409, message });
}

/** 422 参数 / 业务校验失败（开放册为空、非外部已出、重复等）。 */
export function invalidTalentReport(message: string) {
  return createError({ statusCode: 422, message });
}

/** 404 报告不存在。 */
export function notFoundTalentReport(message = "报告不存在") {
  return createError({ statusCode: 404, message });
}

// ── 通用工具 ──────────────────────────────────────────────────────────────

function pushWarning(warnings: string[], seen: Set<string>, message: string): void {
  if (warnings.length >= TALENT_REPORT_WARNING_LIMIT) return;
  if (seen.has(message)) return;
  seen.add(message);
  warnings.push(message);
}

function toIsoString(now?: Date): string {
  return (now ?? new Date()).toISOString();
}

function positiveOrder(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : 0;
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStatus(value: unknown): "0" | "1" {
  return String(value ?? "") === "0" ? "0" : "1";
}

function operatorOf(context: TalentReportActionContext): {
  operatorId: string;
  operatorName: string;
} {
  return {
    operatorId: normalizeText(context.operatorId),
    operatorName: normalizeText(context.operatorName),
  };
}

// ── 深拷贝 / 深冻结（快照不可变的内存保证） ────────────────────────────────

/**
 * 深拷贝快照值；读接口返回深拷贝，禁止把内部冻结对象直接交给调用方复用。
 */
export function cloneTalentReportSnapshot<T>(value: T): T {
  return structuredClone(value);
}

function deepFreeze<T>(value: T, seen: WeakSet<object>): T {
  if (value === null || typeof value !== "object") return value;
  const target = value as unknown as object;
  if (seen.has(target) || Object.isFrozen(target)) return value;
  seen.add(target);
  for (const key of Object.keys(target)) {
    const child = (target as Record<string, unknown>)[key];
    if (child !== null && typeof child === "object") deepFreeze(child, seen);
  }
  return Object.freeze(value);
}

/**
 * 深拷贝后逐层 `Object.freeze`：仅用于内存防误改，落库是普通 JSON。
 * `structuredClone` 保证不冻结调用方传入的 PB 记录。
 */
export function freezeTalentReportSnapshot<T>(value: T): T {
  return deepFreeze(structuredClone(value), new WeakSet<object>());
}

// ── A–F ↔ V1–V6 固定映射（ADR 0003-D3，集中一处常量） ─────────────────────

export function isTalentGeneReportBookCode(
  value: unknown,
): value is TalentGeneReportBookCode {
  return (
    typeof value === "string" &&
    (TALENT_GENE_REPORT_BOOK_CODES as readonly string[]).includes(value)
  );
}

export function isTalentReportVolumeId(
  value: unknown,
): value is TalentReportVolumeId {
  return (
    typeof value === "string" &&
    (TALENT_REPORT_VOLUME_IDS as readonly string[]).includes(value)
  );
}

export function getTalentReportVolumeDefinition(
  volumeId: unknown,
): TalentReportVolumeDefinition | undefined {
  return TALENT_REPORT_VOLUME_DEFINITIONS.find(
    (item) => item.volumeId === String(volumeId ?? ""),
  );
}

export function getTalentReportVolumeDefinitionByBook(
  bookCode: unknown,
): TalentReportVolumeDefinition | undefined {
  return TALENT_REPORT_VOLUME_DEFINITIONS.find(
    (item) => item.bookCode === String(bookCode ?? ""),
  );
}

export function resolveTalentReportVolumeId(
  bookCode: unknown,
): TalentReportVolumeId | "" {
  return getTalentReportVolumeDefinitionByBook(bookCode)?.volumeId ?? "";
}

export function resolveTalentReportBookCode(
  volumeId: unknown,
): TalentGeneReportBookCode | "" {
  return getTalentReportVolumeDefinition(volumeId)?.bookCode ?? "";
}

function bookRank(bookCode: string): number {
  const index = (
    TALENT_GENE_REPORT_BOOK_CODES as readonly string[]
  ).indexOf(bookCode);
  return index < 0 ? TALENT_GENE_REPORT_BOOK_CODES.length : index;
}

function volumeRank(volumeId: string): number {
  const index = (TALENT_REPORT_VOLUME_IDS as readonly string[]).indexOf(volumeId);
  return index < 0 ? TALENT_REPORT_VOLUME_IDS.length : index;
}

/** 规范化外部已出分册：大写、去重、去非法字符、按 A–F 升序。 */
export function normalizeTalentReportBookCodes(
  input: unknown,
): TalentGeneReportBookCode[] {
  const candidates: unknown[] = Array.isArray(input)
    ? input
    : typeof input === "string"
      ? [...input]
      : [];
  const found = new Set<TalentGeneReportBookCode>();
  for (const candidate of candidates) {
    const code = String(candidate ?? "").trim().toUpperCase();
    if (isTalentGeneReportBookCode(code)) found.add(code);
  }
  return [...found].sort(
    (left, right) => bookRank(left) - bookRank(right),
  );
}

/** 规范化开放册 V 号：去重、去非法值、按 V1→V6 升序。 */
export function normalizeTalentReportVolumeIds(
  input: unknown,
): TalentReportVolumeId[] {
  const candidates = Array.isArray(input) ? input : [];
  const found = new Set<TalentReportVolumeId>();
  for (const candidate of candidates) {
    const volumeId = String(candidate ?? "").trim();
    if (isTalentReportVolumeId(volumeId)) found.add(volumeId);
  }
  return [...found].sort(
    (left, right) => volumeRank(left) - volumeRank(right),
  );
}

/** 开放册 → 对应外部册编码（A–F 升序）。 */
export function resolveTalentReportOpenBookCodes(
  openVolumeIds: unknown,
): TalentGeneReportBookCode[] {
  return normalizeTalentReportVolumeIds(openVolumeIds)
    .map((volumeId) => resolveTalentReportBookCode(volumeId))
    .filter((bookCode): bookCode is TalentGeneReportBookCode => bookCode !== "")
    .sort((left, right) => bookRank(left) - bookRank(right));
}

/** 新增分册 = 外部已出 − 已开放（按 A–F 升序）。 */
export function computeTalentReportNewBooks(
  externalBooks: unknown,
  openVolumeIds: unknown,
): TalentGeneReportBookCode[] {
  const published = new Set(resolveTalentReportOpenBookCodes(openVolumeIds));
  return normalizeTalentReportBookCodes(externalBooks).filter(
    (bookCode) => !published.has(bookCode),
  );
}

/** 新增分册对应的 V 号（按 V1→V6 升序）。 */
export function computeTalentReportNewVolumeIds(
  externalBooks: unknown,
  openVolumeIds: unknown,
): TalentReportVolumeId[] {
  return normalizeTalentReportVolumeIds(
    computeTalentReportNewBooks(externalBooks, openVolumeIds).map((bookCode) =>
      resolveTalentReportVolumeId(bookCode),
    ),
  );
}

// ── 快照构建：factorSnapshot ──────────────────────────────────────────────

interface TalentReportRulesIndex {
  factorByName: Map<string, TalentReportFactorRule>;
  levelByCode: Map<string, TalentReportLevelRule>;
  noteByKey: Map<string, string>;
}

function buildTalentReportRulesIndex(
  rules: TalentReportSnapshotRules | undefined | null,
): TalentReportRulesIndex {
  const factorByName = new Map<string, TalentReportFactorRule>();
  for (const factor of rules?.factors ?? []) {
    const code = normalizeText(factor?.code);
    if (!code) continue;
    const existing = factorByName.get(code);
    // 同一编码存在于多个分库：优先保留已有非空名称（调用方按启用库顺序传入）。
    if (existing && normalizeText(existing.name) !== "") continue;
    factorByName.set(code, factor);
  }
  const levelByCode = new Map<string, TalentReportLevelRule>();
  for (const level of rules?.levels ?? []) {
    const code = normalizeText(level?.code);
    if (!code) continue;
    if (!levelByCode.has(code)) levelByCode.set(code, level);
  }
  const noteByKey = new Map<string, string>();
  for (const note of rules?.notes ?? []) {
    const factorCode = normalizeText(note?.factorCode);
    const levelCode = normalizeText(note?.levelCode);
    if (!factorCode || !levelCode) continue;
    if (normalizeStatus(note?.status) === "0") continue;
    const key = `${factorCode}-${levelCode}`;
    if (!noteByKey.has(key)) noteByKey.set(key, String(note?.note ?? ""));
  }
  return { factorByName, levelByCode, noteByKey };
}

/**
 * 构建 `factorSnapshot`：覆盖**外部全部分册**的要素（不限开放册）。
 * 排序：分册 A–F 升序 → 章节首次出现顺序 → sections 原顺序。
 * 级序 / 分级名 / 注解 / 分册名取发布时 M1 当前值；要素名优先外部名，缺失回退 M1 文库名。
 */
export function buildTalentReportFactorSnapshot(input: {
  books: readonly string[];
  sections: readonly TalentGeneReportExternalSection[];
  rules: TalentReportSnapshotRules;
}): TalentReportFactorSnapshotBuildResult {
  const warnings: string[] = [];
  const warned = new Set<string>();
  const books = normalizeTalentReportBookCodes(input.books);
  const booksSet = new Set<string>(books);
  const { factorByName, levelByCode, noteByKey } = buildTalentReportRulesIndex(
    input.rules,
  );
  const chapterFirstIndex = new Map<string, number>();
  const sectionIndexByCode = new Map<string, number>();
  const usedCodes = new Set<string>();
  const items: TalentReportFactorSnapshotItem[] = [];

  input.sections.forEach((section, index) => {
    const bookCode = normalizeText(section?.bookCode).toUpperCase();
    const chapter = normalizeText(section?.chapter);
    if (!isTalentGeneReportBookCode(bookCode)) return;
    if (!booksSet.has(bookCode)) {
      pushWarning(
        warnings,
        warned,
        `外部篇目分册 ${bookCode} 不在已出分册内，已跳过`,
      );
      return;
    }
    const code = normalizeText(section?.factorCode);
    const levelCode = normalizeText(section?.levelCode);
    if (!code || !levelCode) return;
    if (usedCodes.has(code)) {
      pushWarning(warnings, warned, `外部篇目要素编码重复，仅首条生效：${code}`);
      return;
    }
    usedCodes.add(code);
    sectionIndexByCode.set(code, index);
    if (chapter !== "") {
      const chapterKey = `${bookCode}|${chapter}`;
      if (!chapterFirstIndex.has(chapterKey)) chapterFirstIndex.set(chapterKey, index);
    }
    const volume = getTalentReportVolumeDefinitionByBook(bookCode);
    const factorRule = factorByName.get(code);
    const levelRule = levelByCode.get(levelCode);
    if (!levelRule) {
      pushWarning(
        warnings,
        warned,
        `要素 ${code} 的分级 ${levelCode} 不在当前启用分级中，按原编码冻结`,
      );
    }
    const noteKey = `${code}-${levelCode}`;
    const note = noteByKey.get(noteKey);
    if (note === undefined) {
      pushWarning(
        warnings,
        warned,
        `要素 ${code} 缺少 ${levelCode} 固定注解，按空串冻结`,
      );
    }
    const externalName = normalizeText(section?.factorName);
    const m1Name = normalizeText(factorRule?.name);
    const score = Number(section?.score);
    items.push({
      code,
      name: externalName || m1Name || code,
      category: bookCode,
      categoryName:
        normalizeText(factorRule?.categoryName) ||
        volume?.name ||
        "",
      volumeId:
        (volume?.volumeId ?? resolveTalentReportVolumeId(bookCode)) as TalentReportVolumeId,
      bookCode,
      chapter,
      levelCode,
      levelName: normalizeText(levelRule?.name),
      levelOrder: positiveOrder(levelRule?.sortOrder),
      score: Number.isFinite(score) ? score : 0,
      note: note ?? "",
      condition: String(section?.condition ?? ""),
    });
  });

  items.sort((left, right) => {
    const bookDiff = bookRank(left.bookCode) - bookRank(right.bookCode);
    if (bookDiff !== 0) return bookDiff;
    const leftChapter =
      chapterFirstIndex.get(`${left.bookCode}|${left.chapter}`) ??
      sectionIndexByCode.get(left.code) ??
      0;
    const rightChapter =
      chapterFirstIndex.get(`${right.bookCode}|${right.chapter}`) ??
      sectionIndexByCode.get(right.code) ??
      0;
    if (leftChapter !== rightChapter) return leftChapter - rightChapter;
    return (
      (sectionIndexByCode.get(left.code) ?? 0) -
      (sectionIndexByCode.get(right.code) ?? 0)
    );
  });

  return {
    items: freezeTalentReportSnapshot(items),
    warnings,
  };
}

/** 按 M1 当前值刷新要素级序 / 分级名 / 注解 / 分册名；**不改变**要素集合与章节（显式重算）。 */
export function refreshTalentReportFactorSnapshot(
  factorSnapshot: readonly TalentReportFactorSnapshotItem[],
  rules: TalentReportSnapshotRules,
): TalentReportFactorSnapshotBuildResult {
  const warnings: string[] = [];
  const warned = new Set<string>();
  const { factorByName, levelByCode, noteByKey } = buildTalentReportRulesIndex(rules);
  const items: TalentReportFactorSnapshotItem[] = [];
  for (const item of Array.isArray(factorSnapshot) ? factorSnapshot : []) {
    if (!item || typeof item !== "object") continue;
    const code = normalizeText(item.code);
    if (!code) continue;
    const levelCode = normalizeText(item.levelCode);
    const levelRule = levelByCode.get(levelCode);
    const factorRule = factorByName.get(code);
    const note = noteByKey.get(`${code}-${levelCode}`);
    if (!levelRule) {
      pushWarning(
        warnings,
        warned,
        `要素 ${code} 的分级 ${levelCode} 不在当前启用分级中，保留原冻结值`,
      );
    }
    if (note === undefined) {
      pushWarning(
        warnings,
        warned,
        `要素 ${code} 缺少 ${levelCode} 固定注解，按空串冻结`,
      );
    }
    items.push({
      ...item,
      name: normalizeText(item.name) || normalizeText(factorRule?.name) || code,
      categoryName:
        normalizeText(factorRule?.categoryName) ||
        getTalentReportVolumeDefinitionByBook(item.bookCode)?.name ||
        normalizeText(item.categoryName),
      levelName: levelRule
        ? normalizeText(levelRule.name)
        : normalizeText(item.levelName),
      levelOrder: levelRule
        ? positiveOrder(levelRule.sortOrder)
        : positiveOrder(item.levelOrder),
      note: note ?? "",
    });
  }
  return {
    items: freezeTalentReportSnapshot(items),
    warnings,
  };
}

// ── 快照构建：volumeSnapshot（固定六册） ──────────────────────────────────

export interface TalentReportVolumeSnapshotInput {
  factorSnapshot: readonly TalentReportFactorSnapshotItem[];
  /** 外部已出分册（规范化后使用）。 */
  books: readonly string[];
  openVolumeIds?: readonly string[];
}

function groupTalentReportVolumeChapters(
  items: readonly TalentReportFactorSnapshotItem[],
): TalentReportVolumeSnapshotChapter[] {
  const chapters: TalentReportVolumeSnapshotChapter[] = [];
  const indexByName = new Map<string, number>();
  for (const item of items) {
    const chapterName = normalizeText(item.chapter);
    let chapterIndex = indexByName.get(chapterName);
    if (chapterIndex === undefined) {
      chapterIndex = chapters.length;
      indexByName.set(chapterName, chapterIndex);
      chapters.push({ chapter: chapterName, factors: [] });
    }
    const factor: TalentReportVolumeSnapshotFactor = {
      code: item.code,
      name: item.name,
      levelCode: item.levelCode,
      levelName: item.levelName,
      note: item.note,
    };
    chapters[chapterIndex]!.factors.push(factor);
  }
  return chapters;
}

/**
 * 构建 `volumeSnapshot`：固定 6 项、顺序 V1→V6；外部未出/未关联的册 `open=false`、空章节。
 * 展示子集由 `factorSnapshot` 生成（同一事实源）。
 */
export function buildTalentReportVolumeSnapshot(
  input: TalentReportVolumeSnapshotInput,
): TalentReportVolumeSnapshot[] {
  const books = normalizeTalentReportBookCodes(input.books);
  const booksSet = new Set<string>(books);
  const openSet = new Set(normalizeTalentReportVolumeIds(input.openVolumeIds));
  const itemsByBook = new Map<string, TalentReportFactorSnapshotItem[]>();
  for (const item of Array.isArray(input.factorSnapshot)
    ? input.factorSnapshot
    : []) {
    const bookCode = normalizeText(item?.bookCode).toUpperCase();
    if (!booksSet.has(bookCode)) continue;
    if (!isTalentGeneReportBookCode(bookCode)) continue;
    const bucket = itemsByBook.get(bookCode) ?? [];
    bucket.push(item);
    itemsByBook.set(bookCode, bucket);
  }
  const volumes = TALENT_REPORT_VOLUME_DEFINITIONS.map((definition) => {
    const items = itemsByBook.get(definition.bookCode) ?? [];
    const chapters = groupTalentReportVolumeChapters(items);
    return {
      volumeId: definition.volumeId,
      bookCode: definition.bookCode,
      name: definition.name,
      sortOrder: definition.sortOrder,
      open: booksSet.has(definition.bookCode) && openSet.has(definition.volumeId),
      chapterCount: chapters.length,
      factorCount: items.length,
      chapters,
    };
  });
  return freezeTalentReportSnapshot(volumes);
}

// ── 快照构建：directionSnapshot（调用 M4 纯函数，不实现算法） ──────────────

function toTalentMatchFactors(
  factorSnapshot: readonly TalentReportFactorSnapshotItem[],
): TalentMatchFactor[] {
  return (Array.isArray(factorSnapshot) ? factorSnapshot : []).map((item) => ({
    code: item.code,
    levelCode: item.levelCode,
    levelOrder: item.levelOrder,
    levelName: item.levelName,
    name: item.name,
  }));
}

function toTalentMatchLevels(
  rules: TalentReportSnapshotRules,
): TalentMatchLevel[] {
  return (rules.levels ?? [])
    .filter((level) => normalizeText(level?.code) !== "")
    .map((level) => ({
      code: normalizeText(level.code),
      sortOrder: positiveOrder(level.sortOrder),
      status: normalizeStatus(level.status),
      name: normalizeText(level.name),
    }));
}

function toTalentMatchDirections(
  rules: TalentReportSnapshotRules,
): TalentMatchDirection[] {
  return (rules.directions ?? [])
    .filter((direction) => direction && typeof direction === "object")
    .map((direction: TalentReportDirectionRule) => ({
      id: String(direction.id ?? ""),
      code: normalizeText(direction.code),
      name: normalizeText(direction.name),
      icon: normalizeText(direction.icon),
      description: normalizeText(direction.description),
      status: normalizeStatus(direction.status),
      version: positiveOrder(direction.version) || 1,
      requirements: (direction.requirements ?? [])
        .filter((requirement) => normalizeText(requirement?.code) !== "")
        .map((requirement) => ({
          code: normalizeText(requirement.code),
          level: normalizeText(requirement.level),
        })),
      tierIds: (direction.tierIds ?? []).map((tierId) => String(tierId ?? "")),
      defaultTierId: String(direction.defaultTierId ?? ""),
    }));
}

function toTalentMatchTiers(rules: TalentReportSnapshotRules): TalentMatchTier[] {
  return (rules.tiers ?? [])
    .filter((tier) => tier && typeof tier === "object")
    .map((tier: TalentReportTierRule) => ({
      id: String(tier.id ?? ""),
      code: normalizeText(tier.code),
      name: normalizeText(tier.name),
      sortOrder: positiveOrder(tier.sortOrder),
      teacher: String(tier.teacher ?? ""),
      freq: String(tier.freq ?? ""),
      headline: normalizeText(tier.headline),
      description: normalizeText(tier.description),
      status: normalizeStatus(tier.status),
      isDefault: tier.isDefault === true,
      preset: tier.preset === true,
    }));
}

function disabledTalentLevelCodes(
  rules: TalentReportSnapshotRules,
): string[] {
  return (rules.levels ?? [])
    .filter(
      (level) =>
        normalizeText(level?.code) !== "" &&
        normalizeStatus(level?.status) === "0",
    )
    .map((level) => normalizeText(level.code));
}

export interface TalentReportDirectionSnapshotBuildInput {
  factorSnapshot: readonly TalentReportFactorSnapshotItem[];
  rules: TalentReportSnapshotRules;
  snapshotVersion: number;
  at: string;
  operatorId?: string;
  operatorName?: string;
  recommendLimit?: number;
  selectionLimit?: number;
}

/**
 * 构建 `directionSnapshot`：发布 / 显式重算走全量 `computeTalentDirectionMatches`
 * （内部即 M4 `matchDirections`），结构由 M4 产出，M3 不增删字段。
 */
export function buildTalentReportDirectionSnapshot(
  input: TalentReportDirectionSnapshotBuildInput,
): TalentDirectionSnapshot {
  return freezeTalentReportSnapshot(
    computeTalentDirectionMatches({
      factors: toTalentMatchFactors(input.factorSnapshot),
      directions: toTalentMatchDirections(input.rules),
      tiers: toTalentMatchTiers(input.rules),
      levels: toTalentMatchLevels(input.rules),
      recommendLimit: input.recommendLimit,
      selectionLimit: input.selectionLimit,
      version: positiveOrder(input.snapshotVersion) || 1,
      at: input.at,
      operatorId: normalizeText(input.operatorId),
      operatorName: normalizeText(input.operatorName),
    }),
  );
}

export interface TalentReportDirectionMatchInput {
  factorSnapshot: readonly TalentReportFactorSnapshotItem[];
  rules: TalentReportSnapshotRules;
  recommendLimit?: number;
}

/**
 * 当前配置下重新命中（详情「匹配天赋」页签 / 方向预览用）：直接调用 M4 `matchDirections`，
 * 不落库、不改快照。
 */
export function matchTalentReportDirections(
  input: TalentReportDirectionMatchInput,
): DirectionMatchResult {
  const levels = toTalentMatchLevels(input.rules);
  return matchDirections(
    toTalentMatchFactors(input.factorSnapshot),
    toTalentMatchDirections(input.rules),
    {
      levelOrders: buildTalentLevelOrders(levels),
      disabledLevelCodes: disabledTalentLevelCodes(input.rules),
      recommendLimit: input.recommendLimit,
    },
  );
}

// ── 一次构建三件套 ────────────────────────────────────────────────────────

/** 构建 factor / volume / direction 三件套（发布与补发前的校验共用）。 */
export function buildTalentReportSnapshot(
  input: import("~~/shared/types/talent-report").TalentReportSnapshotBuildInput,
): TalentReportSnapshotBuildResult {
  const built = buildTalentReportFactorSnapshot({
    books: input.books,
    sections: input.sections,
    rules: input.rules,
  });
  const volumeSnapshot = buildTalentReportVolumeSnapshot({
    factorSnapshot: built.items,
    books: input.books,
    openVolumeIds: input.openVolumeIds,
  });
  const directionSnapshot = buildTalentReportDirectionSnapshot({
    factorSnapshot: built.items,
    rules: input.rules,
    snapshotVersion: input.snapshotVersion,
    at: input.at,
    operatorId: input.operatorId,
    operatorName: input.operatorName,
    recommendLimit: input.recommendLimit,
    selectionLimit: input.selectionLimit,
  });
  return {
    factorSnapshot: built.items,
    volumeSnapshot,
    directionSnapshot,
    factorCount: built.items.length,
    warnings: built.warnings,
  };
}

// ── 版本链 ────────────────────────────────────────────────────────────────

/** 创建版本条目（`version` 由调用方注入动作发生时的 `snapshotVersion`）。 */
export function createTalentReportVersionEntry(input: {
  version: number;
  type: TalentReportVersionEntry["type"];
  summary: string;
  books?: readonly string[];
  operatorId?: string;
  operatorName?: string;
  at: string;
}): TalentReportVersionEntry {
  const entry: TalentReportVersionEntry = {
    version: positiveOrder(input.version),
    type: input.type,
    summary: normalizeText(input.summary),
    operatorId: normalizeText(input.operatorId),
    operatorName: normalizeText(input.operatorName),
    at: input.at,
  };
  if (input.books && input.books.length) entry.books = [...input.books];
  return entry;
}

/**
 * 追加版本记录：只追加、不修改、不删除；超过 200 条保留最近 200 条，
 * 并在首条摘要加「历史已截断；」前缀（spec §3.2.5）。
 */
export function appendTalentReportVersion(
  versions: readonly TalentReportVersionEntry[] | undefined | null,
  entry: TalentReportVersionEntry,
): TalentReportVersionEntry[] {
  const current = (Array.isArray(versions) ? versions : []).map((item) => ({
    ...item,
    ...(Array.isArray(item?.books) ? { books: [...item.books] } : {}),
  }));
  const next = [
    ...current,
    { ...entry, ...(Array.isArray(entry?.books) ? { books: [...entry.books] } : {}) },
  ];
  if (next.length <= TALENT_REPORT_VERSION_LIMIT) return next;
  const kept = next.slice(next.length - TALENT_REPORT_VERSION_LIMIT);
  const first = kept[0]!;
  if (!String(first.summary ?? "").startsWith(TALENT_REPORT_VERSION_TRUNCATED_PREFIX)) {
    kept[0] = {
      ...first,
      summary: `${TALENT_REPORT_VERSION_TRUNCATED_PREFIX}${first.summary ?? ""}`,
    };
  }
  return kept;
}

// ── 状态机守卫 ────────────────────────────────────────────────────────────

function currentReportStatus(report: TalentReportRecord | null | undefined): string {
  return String(report?.status ?? "");
}

function assertTalentReportStatus(
  report: TalentReportRecord | null | undefined,
  expected: readonly TalentReportStatus[],
  actionLabel: string,
): void {
  const status = currentReportStatus(report);
  if ((expected as readonly string[]).includes(status)) return;
  const expectedText = expected
    .map((item) => `「${TALENT_STATUS_NAMES[item]}」`)
    .join("或");
  throw conflictTalentReport(
    `当前状态不支持该操作：${actionLabel}仅支持${expectedText}报告`,
  );
}

const TALENT_STATUS_NAMES: Readonly<Record<TalentReportStatus, string>> = {
  pending_publish: "待发布",
  published: "已发布",
  retracted: "已撤回",
};

// ── 状态动作计划：撤回 / 恢复 ─────────────────────────────────────────────

export function planTalentReportWithdraw(
  input: TalentReportStatusActionInput,
): TalentReportStatusActionPlan {
  assertTalentReportStatus(input.report, ["published"], "撤回");
  const at = toIsoString(input.now);
  const { operatorId, operatorName } = operatorOf(input);
  const reason = normalizeText(input.reason);
  const versionEntry = createTalentReportVersionEntry({
    version: input.report.snapshotVersion ?? 0,
    type: "withdraw",
    summary: reason
      ? `撤回：${reason.slice(0, 200)}`
      : "撤回报告，C 端立即不可见",
    operatorId,
    operatorName,
    at,
  });
  return {
    status: "retracted",
    withdrawnAt: at,
    versions: appendTalentReportVersion(input.report.versions, versionEntry),
    versionEntry,
    snapshotVersion: input.report.snapshotVersion ?? 0,
  };
}

export function planTalentReportRestore(
  input: TalentReportStatusActionInput,
): TalentReportStatusActionPlan {
  assertTalentReportStatus(input.report, ["retracted"], "恢复发布");
  const at = toIsoString(input.now);
  const { operatorId, operatorName } = operatorOf(input);
  const versionEntry = createTalentReportVersionEntry({
    version: input.report.snapshotVersion ?? 0,
    type: "restore",
    summary: "恢复发布，沿用原快照",
    operatorId,
    operatorName,
    at,
  });
  return {
    status: "published",
    restoredAt: at,
    versions: appendTalentReportVersion(input.report.versions, versionEntry),
    versionEntry,
    snapshotVersion: input.report.snapshotVersion ?? 0,
  };
}

// ── 方向选择的版本记录（M4 写 selections，M3 只追加版本） ──────────────────

export function planTalentReportSelectionVersion(
  input: TalentReportSelectionVersionInput,
): TalentReportSelectionVersionPlan {
  assertTalentReportStatus(input.report, ["published"], "选择培养方向");
  const at = toIsoString(input.now);
  const { operatorId, operatorName } = operatorOf(input);
  const versionEntry = createTalentReportVersionEntry({
    version: input.report.snapshotVersion ?? 0,
    type: "selection",
    summary: normalizeText(input.summary) || "更新已选培养方向",
    operatorId,
    operatorName,
    at,
  });
  return {
    versions: appendTalentReportVersion(input.report.versions, versionEntry),
    versionEntry,
    snapshotVersion: input.report.snapshotVersion ?? 0,
  };
}

// ── 发布计划 ──────────────────────────────────────────────────────────────

/**
 * 发布校验：至少 1 册、去重、必须 ⊆ 外部已出、且该册有可解析要素。
 * 返回规范化后的 V 号（V1→V6 升序）。
 */
export function assertTalentReportOpenVolumeIds(
  openVolumeIds: unknown,
  externalBooks: unknown,
  factorSnapshot: readonly TalentReportFactorSnapshotItem[],
): TalentReportVolumeId[] {
  const raw = Array.isArray(openVolumeIds) ? openVolumeIds : [];
  const normalized = normalizeTalentReportVolumeIds(raw);
  if (normalized.length === 0) throw invalidTalentReport("请至少开放 1 个分册");
  if (normalized.length !== raw.length)
    throw invalidTalentReport("开放分册不能重复或包含非法值");
  const books = new Set<string>(normalizeTalentReportBookCodes(externalBooks));
  const factorBooks = new Set<string>(
    (factorSnapshot ?? []).map((item) => normalizeText(item?.bookCode).toUpperCase()),
  );
  for (const volumeId of normalized) {
    const definition = getTalentReportVolumeDefinition(volumeId);
    const bookCode = definition?.bookCode ?? "";
    if (!definition || !books.has(bookCode))
      throw invalidTalentReport(`分册 ${bookCode || volumeId} 外部暂无此册`);
    if (!factorBooks.has(bookCode))
      throw invalidTalentReport(`分册 ${bookCode} 暂无可解析要素`);
  }
  return normalized;
}

export function planTalentReportPublish(
  input: TalentReportPublishPlanInput,
): TalentReportPublishPlan {
  assertTalentReportStatus(input.report, ["pending_publish"], "发布");
  const at = toIsoString(input.now);
  const { operatorId, operatorName } = operatorOf(input);
  const externalBooks = normalizeTalentReportBookCodes(input.geneReport.books);
  if (externalBooks.length === 0)
    throw invalidTalentReport("基因报告暂无已出分册，不能发布");
  const built = buildTalentReportFactorSnapshot({
    books: externalBooks,
    sections: input.geneReport.sections ?? [],
    rules: input.rules,
  });
  const openVolumeIds = assertTalentReportOpenVolumeIds(
    input.openVolumeIds,
    externalBooks,
    built.items,
  );
  const volumeSnapshot = buildTalentReportVolumeSnapshot({
    factorSnapshot: built.items,
    books: externalBooks,
    openVolumeIds,
  });
  const snapshotVersion = 1;
  const directionSnapshot = buildTalentReportDirectionSnapshot({
    factorSnapshot: built.items,
    rules: input.rules,
    snapshotVersion,
    at,
    operatorId,
    operatorName,
    recommendLimit: input.recommendLimit,
    selectionLimit: input.selectionLimit,
  });
  const openBookCodes = resolveTalentReportOpenBookCodes(openVolumeIds);
  const versionEntry = createTalentReportVersionEntry({
    version: snapshotVersion,
    type: "publish",
    summary: `发布，开放 ${openVolumeIds.length} 册（${openBookCodes.join("、")}）`,
    books: openBookCodes,
    operatorId,
    operatorName,
    at,
  });
  const versions = appendTalentReportVersion(input.report.versions, versionEntry);
  return {
    status: "published",
    openVolumeIds,
    factorSnapshot: built.items,
    volumeSnapshot,
    directionSnapshot,
    factorCount: built.items.length,
    totalItems: built.items.length,
    snapshotVersion,
    snapshotAt: at,
    publishedAt: at,
    versions,
    versionEntry,
    warnings: built.warnings,
  };
}

// ── 补发计划（只追加新增册；旧快照逐项不变） ──────────────────────────────

/** 旧快照里已冻结的册编码集合；缺失快照时按开放册回退。 */
function frozenBookCodesOfReport(report: TalentReportRecord): Set<string> {
  const frozen = new Set<string>();
  for (const item of Array.isArray(report.factorSnapshot)
    ? report.factorSnapshot
    : []) {
    const bookCode = normalizeText(item?.bookCode).toUpperCase();
    if (isTalentGeneReportBookCode(bookCode)) frozen.add(bookCode);
  }
  return frozen;
}

export function planTalentReportReissue(
  input: TalentReportReissuePlanInput,
): TalentReportReissuePlan {
  assertTalentReportStatus(input.report, ["published"], "补发新增分册");
  const at = toIsoString(input.now);
  const { operatorId, operatorName } = operatorOf(input);
  const externalBooks = normalizeTalentReportBookCodes(input.geneReport.books);
  const newBooks = computeTalentReportNewBooks(
    externalBooks,
    input.report.openVolumeIds,
  );
  if (newBooks.length === 0) throw conflictTalentReport("当前没有新增分册");

  const oldFactors = Array.isArray(input.report.factorSnapshot)
    ? cloneTalentReportSnapshot(input.report.factorSnapshot)
    : [];
  const newSections = (input.geneReport.sections ?? []).filter((section) =>
    newBooks.includes(
      normalizeText(section?.bookCode).toUpperCase() as TalentGeneReportBookCode,
    ),
  );
  const builtNew = buildTalentReportFactorSnapshot({
    books: newBooks,
    sections: newSections,
    rules: input.rules,
  });
  const combinedFactors =
    oldFactors.length > 0
      ? freezeTalentReportSnapshot([...oldFactors, ...builtNew.items])
      : (() => {
          // 防御：已发布但快照缺失（历史脏数据）→ 按外部全部分册重建，保证可读。
          return buildTalentReportFactorSnapshot({
            books: externalBooks,
            sections: input.geneReport.sections ?? [],
            rules: input.rules,
          }).items;
        })();

  const openVolumeIds = normalizeTalentReportVolumeIds([
    ...normalizeTalentReportVolumeIds(input.report.openVolumeIds),
    ...newBooks.map((bookCode) => resolveTalentReportVolumeId(bookCode)),
  ]);
  const volumeSnapshot = buildTalentReportVolumeSnapshot({
    factorSnapshot: combinedFactors,
    books: externalBooks,
    openVolumeIds,
  });
  const snapshotVersion = positiveOrder(input.report.snapshotVersion) + 1;
  const baseDirection = input.report.directionSnapshot;
  const affectedCodes = builtNew.items.map((item) => item.code);
  const directionSnapshot =
    baseDirection && Array.isArray(baseDirection.directions)
      ? freezeTalentReportSnapshot(
          refreshDirectionSnapshot(
            cloneTalentReportSnapshot(baseDirection),
            toTalentMatchFactors(combinedFactors),
            affectedCodes,
            {
              version: snapshotVersion,
              at,
              operatorId,
              operatorName,
              disabledLevelCodes: disabledTalentLevelCodes(input.rules),
            },
          ),
        )
      : buildTalentReportDirectionSnapshot({
          factorSnapshot: combinedFactors,
          rules: input.rules,
          snapshotVersion,
          at,
          operatorId,
          operatorName,
          recommendLimit: input.recommendLimit,
          selectionLimit: input.selectionLimit,
        });

  const addedVolumeIds = newBooks
    .map((bookCode) => resolveTalentReportVolumeId(bookCode))
    .filter((volumeId): volumeId is TalentReportVolumeId => volumeId !== "");
  const versionEntry = createTalentReportVersionEntry({
    version: snapshotVersion,
    type: "reissue",
    summary: `补发 ${newBooks.length} 册（${newBooks.join("、")}）`,
    books: newBooks,
    operatorId,
    operatorName,
    at,
  });
  return {
    status: "published",
    openVolumeIds,
    addedBooks: newBooks,
    addedVolumeIds,
    factorSnapshot: combinedFactors,
    volumeSnapshot,
    directionSnapshot,
    factorCount: combinedFactors.length,
    totalItems: combinedFactors.length,
    snapshotVersion,
    snapshotAt: at,
    versions: appendTalentReportVersion(input.report.versions, versionEntry),
    versionEntry,
    warnings: builtNew.warnings,
  };
}

// ── 显式重算计划（唯一允许回写历史要素命中的动作） ────────────────────────

export function planTalentReportRegenerate(
  input: TalentReportRegeneratePlanInput,
): TalentReportRegeneratePlan {
  assertTalentReportStatus(
    input.report,
    ["published", "retracted"],
    "重新生成快照",
  );
  const at = toIsoString(input.now);
  const { operatorId, operatorName } = operatorOf(input);
  const oldFactors = Array.isArray(input.report.factorSnapshot)
    ? input.report.factorSnapshot
    : [];
  if (oldFactors.length === 0)
    throw conflictTalentReport("报告尚未生成快照，无法重新生成");
  const refreshNotes = input.regenerateFactorNotes !== false;
  const refreshed = refreshNotes
    ? refreshTalentReportFactorSnapshot(oldFactors, input.rules)
    : {
        items: freezeTalentReportSnapshot(
          cloneTalentReportSnapshot(oldFactors),
        ),
        warnings: [] as string[],
      };
  const frozenBooks = [
    ...frozenBookCodesOfReport(input.report),
  ];
  const snapshotVersion = positiveOrder(input.report.snapshotVersion) + 1;
  const volumeSnapshot = buildTalentReportVolumeSnapshot({
    factorSnapshot: refreshed.items,
    books: frozenBooks,
    openVolumeIds: input.report.openVolumeIds,
  });
  const directionSnapshot = buildTalentReportDirectionSnapshot({
    factorSnapshot: refreshed.items,
    rules: input.rules,
    snapshotVersion,
    at,
    operatorId,
    operatorName,
    recommendLimit: input.recommendLimit,
    selectionLimit: input.selectionLimit,
  });
  const versionEntry = createTalentReportVersionEntry({
    version: snapshotVersion,
    type: "regenerate",
    summary: refreshNotes
      ? "按当前配置重新生成快照（含要素注解/级序）"
      : "按当前配置重新生成方向命中快照",
    operatorId,
    operatorName,
    at,
  });
  return {
    factorSnapshot: refreshed.items,
    volumeSnapshot,
    directionSnapshot,
    factorCount: refreshed.items.length,
    totalItems: refreshed.items.length,
    snapshotVersion,
    snapshotAt: at,
    versions: appendTalentReportVersion(input.report.versions, versionEntry),
    versionEntry,
    warnings: refreshed.warnings,
  };
}

// ── 兼容别名（与 M3 spec §3.2.5 的 helper 命名对齐） ───────────────────────

/** 与 M4 spec 的 `recordTalentReportVersion` 对齐的纯函数别名（落库由 API/M4 完成）。 */
export { planTalentReportSelectionVersion as planRecordTalentReportVersion };

/** 供调用方判断快照是否已冻结（发布后 `snapshotVersion >= 1`）。 */
export function hasTalentReportSnapshot(
  report: Pick<TalentReportRecord, "snapshotVersion" | "factorSnapshot"> | null,
): boolean {
  return (
    positiveOrder(report?.snapshotVersion) > 0 &&
    Array.isArray(report?.factorSnapshot) &&
    (report?.factorSnapshot?.length ?? 0) > 0
  );
}