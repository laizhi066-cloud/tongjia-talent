/**
 * @description M1 规则域服务端工具：分级 / 固定注解 / 培养方向 / 档位的 Zod 校验、引用保护、
 *   名称解析、版本递增与 PocketBase 查询封装。页面与 API 只通过本模块取规则域语义，
 *   不得自行拼 `code != ""` 等双语义过滤条件（ADR 0001-D1）。
 * @file server/utils/talent-rule.ts
 */
import { createError } from "h3";
import type PocketBase from "pocketbase";
import { z } from "zod";
import {
  TALENT_CATEGORY_NAMES,
  TALENT_LEVEL_CODES,
  TALENT_LEVEL_TONES,
  TALENT_NOTE_GENDERS,
  TALENT_SLOT_SEGMENTS,
  TALENT_SLOT_VARIANTS,
  type TalentDirectionRequirement,
  type TalentFactor,
  type TalentFactorLibrary,
  type TalentFactorNote,
  type TalentFactorSlots,
  type TalentLevel,
  type TalentTier,
} from "~~/shared/types/talent-rule";

/** 规则域统一错误：422 业务校验失败，409 唯一冲突 / 引用保护。 */
export function invalidTalentRule(message: string) {
  return createError({ statusCode: 422, message });
}

export function conflictTalentRule(message: string) {
  return createError({ statusCode: 409, message });
}

// ── Zod：请求体基础结构（路由层 validateBody 直接复用） ────────────────────────────────

const talentStatusSchema = z.enum(["0", "1"]);
const talentLevelCodeSchema = z
  .string()
  .trim()
  .regex(/^LV\d{1,2}$/, "分级编码格式必须为 LVn");
const talentLevelToneSchema = z.enum(TALENT_LEVEL_TONES as [string, ...string[]]);
const talentNoteGenderSchema = z.enum(TALENT_NOTE_GENDERS as [string, ...string[]]);

export const talentFactorLibrarySyncSchema = z.object({
  gender: z.enum(["male", "female"]),
  age: z.number().int().min(0).max(18),
});

export const talentLevelCreateSchema = z.object({
  code: talentLevelCodeSchema,
  name: z.string().trim().min(1, "分级名称不能为空").max(20),
  sortOrder: z.number().int().min(1).max(4),
  range: z.string().max(20).optional(),
  tone: talentLevelToneSchema.optional(),
  status: talentStatusSchema.optional(),
});

export const talentLevelUpdateSchema = z
  .object({
    // 允许提交 code 供服务层校验不可修改；不要在这里直接放行改名。
    code: talentLevelCodeSchema.optional(),
    name: z.string().trim().min(1, "分级名称不能为空").max(20).optional(),
    sortOrder: z.number().int().min(1).max(4).optional(),
    range: z.string().max(20).optional(),
    tone: talentLevelToneSchema.optional(),
    status: talentStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "至少提交一个字段");

export const talentDirectionRequirementSchema = z.object({
  code: z.string().trim().min(1, "要素编码不能为空").max(16),
  level: z.string().trim().min(1, "要求分级不能为空").max(16),
});

const talentDirectionBaseSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[A-Z0-9-]{2,64}$/, "方向编码格式必须为 2–64 位大写字母 / 数字 / 短横线")
    .optional(),
  name: z.string().trim().min(1, "方向名称不能为空").max(100),
  description: z.string().max(500).optional(),
  icon: z.string().max(100).optional(),
  requirements: z.array(talentDirectionRequirementSchema).min(1, "至少配置 1 项要素").max(50),
  tierIds: z.array(z.string().trim().min(1)).min(1, "至少启用 1 个档位").max(4),
  defaultTierId: z.string().trim().min(1, "默认档位不能为空"),
  aliases: z.array(z.string().trim().min(1).max(64)).max(50).optional(),
  status: talentStatusSchema.optional(),
});

export const talentDirectionCreateSchema = talentDirectionBaseSchema;

export const talentDirectionUpdateSchema = talentDirectionBaseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "至少提交一个字段");

export const talentFactorNoteCreateSchema = z.object({
  factorCode: z.string().trim().min(1, "要素编码不能为空").max(16),
  levelCode: talentLevelCodeSchema,
  note: z.string().max(2000).optional(),
  ageRange: z.string().max(50).optional(),
  gender: talentNoteGenderSchema.optional(),
  status: talentStatusSchema.optional(),
});

export const talentFactorNoteUpdateSchema = z
  .object({
    factorCode: z.string().trim().max(16).optional(),
    levelCode: talentLevelCodeSchema.optional(),
    note: z.string().max(2000).optional(),
    ageRange: z.string().max(50).optional(),
    gender: talentNoteGenderSchema.optional(),
    status: talentStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "至少提交一个字段");

export const talentTierUpdateSchema = z
  .object({
    name: z.string().trim().min(1, "档位名称不能为空").max(20).optional(),
    teacher: z.string().trim().min(1).max(50).optional(),
    freq: z.string().trim().min(1).max(50).optional(),
    headline: z.string().max(100).optional(),
    description: z.string().max(1000).optional(),
    isDefault: z.boolean().optional(),
    status: talentStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "至少提交一个字段");

// ── 双语义过滤：talent_levels 旧行 code 为空，新业务只认 code != "" ─────────────────────

/** 是否为新语义分级行（旧 Mock 行 code 为空）。 */
export function isNewTalentLevel(
  row: Pick<TalentLevel, "code"> | Record<string, unknown>,
): boolean {
  return String((row as { code?: unknown }).code || "").trim() !== "";
}

export function filterNewTalentLevels<T extends { code?: string }>(rows: readonly T[]): T[] {
  return rows.filter((row) => isNewTalentLevel(row));
}

// ── 分级：唯一性 / 编码不可改 / 级序 ────────────────────────────────────────────────

export function assertTalentLevelCodeFormat(code: string): string {
  const normalized = String(code || "").trim();
  if (!/^LV\d{1,2}$/.test(normalized))
    throw invalidTalentRule("分级编码格式必须为 LVn");
  return normalized;
}

/** 编辑时不允许修改 code（code 是槽位键与方向 requirements 的引用目标）。 */
export function assertTalentLevelCodeImmutable(
  currentCode: string,
  nextCode: string | undefined,
): void {
  if (nextCode !== undefined && String(nextCode).trim() !== String(currentCode).trim())
    throw invalidTalentRule("分级编码不可修改");
}

/** 校验新分级与现存新行的唯一约束；返回 409，message 指明冲突字段。 */
export function assertTalentLevelUniqueness(
  input: { code?: string; sortOrder?: number },
  existing: ReadonlyArray<Pick<TalentLevel, "id" | "code" | "sortOrder">>,
  currentId = "",
): void {
  const code = String(input.code || "").trim();
  if (code && existing.some((row) => row.id !== currentId && row.code === code))
    throw conflictTalentRule(`分级编码已存在：${code}`);
  if (
    input.sortOrder !== undefined &&
    existing.some(
      (row) => row.id !== currentId && Number(row.sortOrder) === input.sortOrder,
    )
  )
    throw conflictTalentRule(`级序已存在：${input.sortOrder}`);
}

// ── 槽位：结构 / 四段完整计数 ───────────────────────────────────────────────────────

/** 创建 4 档 × 3 变体的空 slots。 */
export function createTalentFactorSlots(
  levelCodes: readonly string[] = TALENT_LEVEL_CODES,
): TalentFactorSlots {
  return Object.fromEntries(
    levelCodes.map((code) => [
      code,
      Array.from({ length: TALENT_SLOT_VARIANTS }, () => ({
        content: "",
        example: "",
        direction: "",
        suggestion: "",
      })),
    ]),
  );
}

/** 结构校验：四档键齐全、每档 3 变体、每变体四段均为字符串。 */
export function assertTalentFactorSlots(
  slots: unknown,
  levelCodes: readonly string[] = TALENT_LEVEL_CODES,
): asserts slots is TalentFactorSlots {
  if (!slots || typeof slots !== "object" || Array.isArray(slots))
    throw invalidTalentRule("要素文案结构必须是对象");
  for (const code of levelCodes) {
    const variants = (slots as Record<string, unknown>)[code];
    if (!Array.isArray(variants))
      throw invalidTalentRule(`要素文案缺少分级 ${code}`);
    if (variants.length !== TALENT_SLOT_VARIANTS)
      throw invalidTalentRule(`分级 ${code} 必须包含 ${TALENT_SLOT_VARIANTS} 个变体`);
    for (const variant of variants) {
      if (!variant || typeof variant !== "object" || Array.isArray(variant))
        throw invalidTalentRule(`分级 ${code} 的变体必须是对象`);
      for (const segment of TALENT_SLOT_SEGMENTS) {
        if (typeof (variant as Record<string, unknown>)[segment] !== "string")
          throw invalidTalentRule(`分级 ${code} 的变体缺少文案段 ${segment}`);
      }
    }
  }
}

/** 汇总槽位计数：四段全非空计入完整，任一非空但未填满计入部分回填。 */
export function summarizeTalentSlots(
  slots: TalentFactorSlots,
  levelCodes: readonly string[] = TALENT_LEVEL_CODES,
): { slotTotal: number; filledSlotCount: number; partialSlotCount: number } {
  let slotTotal = 0;
  let filledSlotCount = 0;
  let partialSlotCount = 0;
  for (const code of levelCodes) {
    const variants = Array.isArray(slots?.[code]) ? slots[code] : [];
    slotTotal += TALENT_SLOT_VARIANTS;
    for (const variant of variants) {
      const values = TALENT_SLOT_SEGMENTS.map((segment) =>
        String(variant?.[segment] ?? "").trim(),
      );
      const filled = values.filter(Boolean).length;
      if (filled === 0) continue;
      if (filled === values.length) filledSlotCount += 1;
      else partialSlotCount += 1;
    }
  }
  return { slotTotal, filledSlotCount, partialSlotCount };
}

// ── 固定注解：编号生成 / 引用 / 不可改身份 ───────────────────────────────────────────

/** 注解编号 = 要素编码 + 分级编码，服务端生成且唯一。 */
export function buildTalentFactorNoteCode(factorCode: string, levelCode: string): string {
  return `${String(factorCode).trim()}-${String(levelCode).trim()}`;
}

/** 编辑注解时要素 / 分级不可改（编号由二者派生，且已被列表与导出引用）。 */
export function assertTalentFactorNoteIdentityImmutable(
  current: Pick<TalentFactorNote, "factorCode" | "levelCode">,
  input: { factorCode?: string; levelCode?: string },
): void {
  if (
    (input.factorCode !== undefined &&
      input.factorCode !== current.factorCode) ||
    (input.levelCode !== undefined && input.levelCode !== current.levelCode)
  )
    throw invalidTalentRule("注解的要素与分级不可修改");
}

export interface TalentFactorReferenceIndex {
  /** 启用分库中的要素编码 → 分册编码。 */
  factorCategories: Map<string, string>;
  /** 启用中的分级编码。 */
  enabledLevelCodes: ReadonlySet<string>;
}

/** 校验注解引用的要素编码存在、分级启用，并返回派生的分册编码。 */
export function resolveTalentNoteCategory(
  input: { factorCode: string; levelCode: string },
  index: TalentFactorReferenceIndex,
): string {
  const category = index.factorCategories.get(input.factorCode);
  if (!category)
    throw invalidTalentRule(`要素编码不存在或文库未同步：${input.factorCode}`);
  if (!index.enabledLevelCodes.has(input.levelCode))
    throw invalidTalentRule(`分级不存在或已停用：${input.levelCode}`);
  return category;
}

// ── 培养方向：要素 / 分级 / 档位校验，版本递增 ─────────────────────────────────────

export interface TalentDirectionValidationContext {
  factorCategories: Map<string, string>;
  enabledLevelCodes: ReadonlySet<string>;
  enabledTierIds: ReadonlySet<string>;
}

export interface NormalizedTalentDirectionConfig {
  requirements: TalentDirectionRequirement[];
  tierIds: string[];
  defaultTierId: string;
}

/**
 * 校验方向配置并归一化：
 * requirements 1–50 且编码去重、要素存在于启用分库、分级启用；
 * tierIds 1–4 且去重、档位启用，defaultTierId 必须 ∈ tierIds。
 */
export function validateTalentDirectionConfig(
  input: {
    requirements: TalentDirectionRequirement[];
    tierIds: string[];
    defaultTierId: string;
  },
  context: TalentDirectionValidationContext,
): NormalizedTalentDirectionConfig {
  const requirements = Array.isArray(input.requirements) ? input.requirements : [];
  if (requirements.length < 1)
    throw invalidTalentRule("至少配置 1 项要素");
  if (requirements.length > 50)
    throw invalidTalentRule("方向要素不能超过 50 项");
  const seenRequirementCodes = new Set<string>();
  const normalizedRequirements = requirements.map((requirement) => {
    const code = String(requirement?.code || "").trim();
    const level = String(requirement?.level || "").trim();
    if (!code) throw invalidTalentRule("要素编码不能为空");
    if (seenRequirementCodes.has(code))
      throw invalidTalentRule(`同一要素不能重复配置：${code}`);
    seenRequirementCodes.add(code);
    if (!context.factorCategories.has(code))
      throw invalidTalentRule(`要素编码不存在或文库未同步：${code}`);
    if (!context.enabledLevelCodes.has(level))
      throw invalidTalentRule(`要求分级不存在或已停用：${level}`);
    return { code, level };
  });

  const tierIds = Array.from(
    new Set(
      (Array.isArray(input.tierIds) ? input.tierIds : [])
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );
  if (tierIds.length < 1) throw invalidTalentRule("至少启用 1 个档位");
  if (tierIds.length > 4) throw invalidTalentRule("启用档位不能超过 4 个");
  for (const tierId of tierIds) {
    if (!context.enabledTierIds.has(tierId))
      throw invalidTalentRule(`档位不存在或已停用：${tierId}`);
  }
  const defaultTierId = String(input.defaultTierId || "").trim();
  if (!defaultTierId) throw invalidTalentRule("默认档位不能为空");
  if (!tierIds.includes(defaultTierId))
    throw invalidTalentRule("默认档位必须在启用档位中");

  return { requirements: normalizedRequirements, tierIds, defaultTierId };
}

/** 编辑方向时 code 不可修改。 */
export function assertTalentDirectionCodeImmutable(
  currentCode: string,
  nextCode: string | undefined,
): void {
  if (nextCode !== undefined && String(nextCode).trim() !== String(currentCode).trim())
    throw invalidTalentRule("方向编码不可修改");
}

/** 保存配置后版本 +1（停用 / 启用不改版本）。 */
export function nextTalentDirectionVersion(currentVersion: unknown): number {
  const value = Number(currentVersion);
  const base = Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
  return base + 1;
}

// ── 引用保护：分级删除 / 方向删除 ──────────────────────────────────────────────────

export interface TalentLevelReferenceContext {
  notes: ReadonlyArray<Pick<TalentFactorNote, "levelCode">>;
  directions: ReadonlyArray<{ requirements?: unknown }>;
}

/** 统计分级被固定注解、方向 requirements 引用的次数。 */
export function collectTalentLevelReferences(
  levelCode: string,
  context: TalentLevelReferenceContext,
): { notes: number; directions: number } {
  const notes = context.notes.filter((note) => note.levelCode === levelCode).length;
  const directions = context.directions.filter((direction) =>
    talentDirectionRequirements(direction).some(
      (requirement) => requirement.level === levelCode,
    ),
  ).length;
  return { notes, directions };
}

/** 分级被引用时只允许停用，返回 409。 */
export function assertTalentLevelDeletable(
  levelCode: string,
  context: TalentLevelReferenceContext,
): void {
  const references = collectTalentLevelReferences(levelCode, context);
  if (references.notes > 0 || references.directions > 0)
    throw conflictTalentRule("该分级已被引用，只允许停用");
}

/** 递归判断方向 id 是否出现在报告快照 JSON 中（M3 集合存在时才调用）。 */
export function talentDirectionReferencedIn(value: unknown, directionId: string): boolean {
  if (value === directionId) return true;
  if (Array.isArray(value)) return value.some((item) => talentDirectionReferencedIn(item, directionId));
  if (value && typeof value === "object")
    return Object.values(value as Record<string, unknown>).some((item) =>
      talentDirectionReferencedIn(item, directionId),
    );
  return false;
}

/** 报告 `selections` 引用方向时只允许停用，返回 409；talent_reports 不存在时传空数组。 */
export function assertTalentDirectionDeletable(
  directionId: string,
  reportRows: ReadonlyArray<{ selections?: unknown }>,
): void {
  if (reportRows.some((row) => talentDirectionReferencedIn(row.selections, directionId)))
    throw conflictTalentRule("该方向已被报告引用，只允许停用");
}

// ── 档位：全局默认唯一 ──────────────────────────────────────────────────────────────

/** 设置全局默认档位时，返回需要写入的 isDefault 更新（其余档位一并置 false）。 */
export function buildTalentTierDefaultUpdates(
  tiers: ReadonlyArray<Pick<TalentTier, "id" | "isDefault" | "status">>,
  targetId: string,
): Array<{ id: string; isDefault: boolean }> {
  const target = tiers.find((tier) => tier.id === targetId);
  if (!target) throw invalidTalentRule("档位不存在");
  if (target.status !== "1") throw invalidTalentRule("停用的档位不能设为全局默认");
  return tiers.map((tier) => ({ id: tier.id, isDefault: tier.id === targetId }));
}

/** 全局仅允许 1 条 isDefault = true。 */
export function assertSingleTalentTierDefault(
  tiers: ReadonlyArray<Pick<TalentTier, "isDefault">>,
): void {
  const count = tiers.filter((tier) => tier.isDefault === true).length;
  if (count !== 1) throw conflictTalentRule("全局默认档位必须且只能有 1 个");
}

// ── 名称解析：编码 → 当前文库 / 分级名称（不落快照） ────────────────────────────────

/** 取启用库中 syncedAt 最近的分库；没有启用 / 已同步的库返回 null。 */
export function pickLatestSyncedTalentLibrary(
  libraries: ReadonlyArray<Pick<TalentFactorLibrary, "id" | "status" | "syncedAt">>,
): Pick<TalentFactorLibrary, "id" | "status" | "syncedAt"> | null {
  const candidates = libraries
    .filter((library) => library.status === "1" && library.syncedAt)
    .sort(
      (left, right) =>
        Date.parse(String(right.syncedAt)) - Date.parse(String(left.syncedAt)),
    );
  return candidates[0] || null;
}

/** 构建「要素编码 → 当前名称」映射（以最近同步库为准）。 */
export function buildTalentFactorNameLookup(
  factors: ReadonlyArray<Pick<TalentFactor, "libraryId" | "code" | "name">>,
  libraryId: string,
): Map<string, string> {
  return new Map(
    factors
      .filter((factor) => factor.libraryId === libraryId)
      .map((factor) => [factor.code, factor.name]),
  );
}

export interface ResolvedTalentFactorName {
  code: string;
  name: string;
  resolved: boolean;
}

/**
 * 按编码解析要素名称：命中返回当前文库名，未命中回退显示编码并标记数据异常。
 * 固定注解全局按 factorCode 共用，不落 factorName 快照（ADR 0001-D3）。
 */
export function resolveTalentFactorNames(
  codes: readonly string[],
  lookup: ReadonlyMap<string, string>,
): { rows: ResolvedTalentFactorName[]; anomalies: string[] } {
  const rows = codes.map((code) => {
    const name = lookup.get(code);
    return { code, name: name || code, resolved: Boolean(name) };
  });
  return { rows, anomalies: rows.filter((row) => !row.resolved).map((row) => row.code) };
}

export function buildTalentLevelNameLookup(
  levels: ReadonlyArray<Pick<TalentLevel, "code" | "name">>,
): Map<string, string> {
  return new Map(
    levels
      .filter((level) => isNewTalentLevel(level))
      .map((level) => [level.code, level.name]),
  );
}

/** 分级名称解析：找不到时回退编码，避免列表因脏数据空白。 */
export function resolveTalentLevelName(
  lookup: ReadonlyMap<string, string>,
  code: string,
): string {
  return lookup.get(code) || code;
}

// ── PocketBase 查询封装（M1-B 路由复用；不做页面直连） ─────────────────────────────

/** 只返回新语义分级（code != ""），旧行不会出现在新列表。 */
export async function getNewTalentLevels(pb: PocketBase): Promise<TalentLevel[]> {
  return pb.collection("talent_levels").getFullList<TalentLevel>({
    filter: 'code != ""',
    sort: "sortOrder",
    $autoCancel: false,
  });
}

/** 汇总方向校验上下文：启用分库要素编码 → 分册、启用分级编码、启用档位 id。 */
export async function loadTalentDirectionValidationContext(
  pb: PocketBase,
): Promise<TalentDirectionValidationContext> {
  const libraries = await pb.collection("talent_factor_libraries").getFullList<TalentFactorLibrary>({
    filter: 'status = "1"',
    $autoCancel: false,
  });
  const latest = pickLatestSyncedTalentLibrary(libraries);
  const factors = latest
    ? await pb.collection("talent_factors").getFullList<TalentFactor>({
        filter: `libraryId = "${latest.id}"`,
        $autoCancel: false,
      })
    : [];
  const levels = await pb.collection("talent_levels").getFullList<TalentLevel>({
    filter: 'code != "" && status = "1"',
    $autoCancel: false,
  });
  const tiers = await pb.collection("talent_tiers").getFullList<TalentTier>({
    filter: 'status = "1"',
    $autoCancel: false,
  });
  return {
    factorCategories: new Map(factors.map((factor) => [factor.code, factor.category])),
    enabledLevelCodes: new Set(levels.map((level) => level.code)),
    enabledTierIds: new Set(tiers.map((tier) => tier.id)),
  };
}

/** 删除分级前扫描固定注解与方向 requirements；被引用返回 409「只允许停用」。 */
export async function assertTalentLevelDeletableInStore(
  pb: PocketBase,
  level: Pick<TalentLevel, "id" | "code">,
): Promise<void> {
  const notes = await pb.collection("talent_factor_notes").getFullList<TalentFactorNote>({
    filter: `levelCode = "${level.code}"`,
    fields: "id,levelCode",
    $autoCancel: false,
  });
  const directions = await pb.collection("talent_directions").getFullList<{
    requirements?: TalentDirectionRequirement[];
  }>({ fields: "id,requirements", $autoCancel: false });
  assertTalentLevelDeletable(level.code, { notes, directions });
}

/**
 * 删除方向前扫描 talent_reports（M3 集合）：集合不存在时不报错，按无引用处理。
 * 渐进式引用扫描避免 M1 依赖尚未交付的报告域结构。
 */
export async function assertTalentDirectionDeletableInStore(
  pb: PocketBase,
  directionId: string,
): Promise<void> {
  let reports: Array<{ selections?: unknown }> = [];
  try {
    reports = await pb.collection("talent_reports").getFullList<{ selections?: unknown }>({
      fields: "id,selections",
      $autoCancel: false,
    });
  } catch {
    // 集合尚未创建（M3 未交付）：按无引用处理。
    reports = [];
  }
  assertTalentDirectionDeletable(directionId, reports);
}

/** 从方向记录中安全读取 requirements 数组，忽略脏 JSON。 */
export function talentDirectionRequirements(direction: {
  requirements?: unknown;
}): TalentDirectionRequirement[] {
  if (!Array.isArray(direction.requirements)) return [];
  return direction.requirements.filter(
    (item): item is TalentDirectionRequirement =>
      Boolean(item) &&
      typeof item === "object" &&
      typeof (item as TalentDirectionRequirement).code === "string" &&
      typeof (item as TalentDirectionRequirement).level === "string",
  );
}

/** 读取分册名称；未知分册回退编码。 */
export function resolveTalentCategoryName(category: string): string {
  return TALENT_CATEGORY_NAMES[category] || category;
}
