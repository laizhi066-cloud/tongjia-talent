/**
 * @description 外部潜质要素文库源：M1 提供可替换的本地文件 Mock 实现，M8 替换为真实外部接口。
 *   数据来源为客户交付原型 `docs/天赋正式开发交接包/talent-prototype-v2/assets/js/element-lib.js`
 *   （当前仅「男 0 岁」库回填正文，其余库同步后文案仍待外部系统回填）。
 * @file server/utils/talent-rule-source.ts
 */
import { createError } from "h3";
import type {
  TalentFactorLibrary,
  TalentFactorSlots,
  TalentLibraryGender,
} from "~~/shared/types/talent-rule";
import {
  buildTalentFactorLibraryRecord,
  buildTalentFactorRecords,
} from "~~/scripts/talent-rule-seed-data.mjs";

/** 文库源标识；M1 固定 mock 本地文件，M8 换真实来源。 */
export const TALENT_FACTOR_LIBRARY_MOCK_SOURCE = "mock-file";

/** 分库查询条件：性别 + 具体年龄（一岁一库）。 */
export interface TalentFactorLibraryQuery {
  gender: TalentLibraryGender;
  age: number;
}

/** 源返回的单个要素（未落库）。 */
export interface TalentFactorLibrarySourceFactor {
  code: string;
  name: string;
  category: string;
  categoryName: string;
  sortOrder: number;
  slots: TalentFactorSlots;
  slotTotal: number;
  filledSlotCount: number;
  partialSlotCount: number;
}

/** 源返回的分库快照，落库前由服务层计算计数并做幂等 upsert。 */
export interface TalentFactorLibrarySourcePayload {
  gender: TalentLibraryGender;
  age: number;
  source: string;
  version: string;
  itemCount: number;
  slotTotal: number;
  filledCount: number;
  factors: TalentFactorLibrarySourceFactor[];
}

/** M8 真实外部文库接入点：只需实现该接口即可替换 Mock。 */
export interface TalentFactorLibrarySource {
  readonly source: string;
  fetchLibrary(query: TalentFactorLibraryQuery): Promise<TalentFactorLibrarySourcePayload>;
}

/** 校验源查询条件：性别仅 male / female，年龄仅 0–18 整数。 */
export function assertTalentFactorLibraryQuery(
  query: TalentFactorLibraryQuery,
): void {
  if (query.gender !== "male" && query.gender !== "female")
    throw createError({ statusCode: 422, message: "分库性别只能是 male / female" });
  if (!Number.isInteger(query.age) || query.age < 0 || query.age > 18)
    throw createError({ statusCode: 422, message: "分库年龄必须是 0–18 的整数" });
}

/** 同步 / 导出前确认分库已同步；未同步的库不建记录。 */
export function assertTalentFactorLibrarySynced(
  library: Pick<TalentFactorLibrary, "syncedAt" | "itemCount"> | null | undefined,
): void {
  if (!library || !library.syncedAt || Number(library.itemCount || 0) <= 0)
    throw createError({ statusCode: 409, message: "该库尚未同步" });
}

/** 汇总要素计数：分库 filledCount = 各要素四段完整槽位之和。 */
export function summarizeTalentFactorSource(factors: readonly TalentFactorLibrarySourceFactor[]) {
  const slotTotal = factors.reduce(
    (sum, factor) => sum + Number(factor.slotTotal || 0),
    0,
  );
  const filledCount = factors.reduce(
    (sum, factor) => sum + Number(factor.filledSlotCount || 0),
    0,
  );
  const partialCount = factors.reduce(
    (sum, factor) => sum + Number(factor.partialSlotCount || 0),
    0,
  );
  return { itemCount: factors.length, slotTotal, filledCount, partialCount };
}

/** M1 本地文件 Mock：读取客户交付原型，按性别 + 年龄生成文库快照。 */
export function createMockTalentFactorLibrarySource(): TalentFactorLibrarySource {
  return {
    source: TALENT_FACTOR_LIBRARY_MOCK_SOURCE,
    async fetchLibrary(query) {
      assertTalentFactorLibraryQuery(query);
      const factors = buildTalentFactorRecords({
        gender: query.gender,
        age: query.age,
      }) as TalentFactorLibrarySourceFactor[];
      const counters = summarizeTalentFactorSource(factors);
      return {
        gender: query.gender,
        age: query.age,
        source: TALENT_FACTOR_LIBRARY_MOCK_SOURCE,
        version: "v1",
        ...counters,
        factors,
      };
    },
  };
}

/** 已落库要素的比对字段。 */
const TALENT_FACTOR_COMPARE_FIELDS = [
  "name",
  "category",
  "categoryName",
  "sortOrder",
  "slots",
  "slotTotal",
  "filledSlotCount",
  "partialSlotCount",
] as const;

/**
 * 与键序无关的稳定序列化：PocketBase 落库 JSON 会把对象键规范化为字母序，
 * 直接 `JSON.stringify` 比较会把同一份 slots 误判为变化，导致每次同步全量重写。
 */
function stableComparable(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) return `[${value.map(stableComparable).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableComparable(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export interface TalentFactorMergePlan {
  creates: TalentFactorLibrarySourceFactor[];
  updates: Array<{ existingId: string; factor: TalentFactorLibrarySourceFactor }>;
  unchanged: string[];
}

/**
 * 计算要素的幂等合并计划：按 code 匹配，内容相同不写库，内容变化才更新，不删除要素。
 * 同一份源连续执行两次，第二次 creates / updates 均为空。
 */
export function planTalentFactorMerge(
  existing: ReadonlyArray<{ id: string; code: string } & Record<string, unknown>>,
  incoming: readonly TalentFactorLibrarySourceFactor[],
): TalentFactorMergePlan {
  const existingByCode = new Map(
    existing.map((factor) => [String(factor.code), factor]),
  );
  const plan: TalentFactorMergePlan = { creates: [], updates: [], unchanged: [] };
  const seen = new Set<string>();
  for (const factor of incoming) {
    if (seen.has(factor.code))
      throw createError({
        statusCode: 422,
        message: `外部文库要素编码重复：${factor.code}`,
      });
    seen.add(factor.code);
    const current = existingByCode.get(factor.code);
    if (!current) {
      plan.creates.push(factor);
      continue;
    }
    const changed = TALENT_FACTOR_COMPARE_FIELDS.some(
      (field) =>
        stableComparable(current[field] ?? null) !==
        stableComparable(factor[field] ?? null),
    );
    if (changed) plan.updates.push({ existingId: current.id, factor });
    else plan.unchanged.push(factor.code);
  }
  return plan;
}

/** 由源快照生成分库记录（不含 PocketBase 关联 id）；供同步入口与种子复用。 */
export function buildTalentFactorLibraryFromSource(
  payload: TalentFactorLibrarySourcePayload,
) {
  return buildTalentFactorLibraryRecord(payload.factors, {
    gender: payload.gender,
    age: payload.age,
  }) as Omit<TalentFactorLibrary, "id" | "created" | "updated">;
}