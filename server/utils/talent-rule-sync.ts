/**
 * @description M1 规则域分库同步：外部文库源（M1 本地 Mock，M8 可替换）→ 分库 upsert → 要素幂等合并。
 *   同步不清空、不删除要素：同编码覆盖文案，不新增重复行（spec §5.2 #2/#3）。
 *   两条入口（无 id 首同步 / 有 id 再同步）共用本实现，避免逻辑分叉。
 * @file server/utils/talent-rule-sync.ts
 */
import { createError } from "h3";
import type PocketBase from "pocketbase";
import type { TalentFactor, TalentFactorLibrary } from "~~/shared/types/talent-rule";
import { escapeFilterValue } from "~~/server/utils/pocketbase-client";
import {
  assertTalentFactorLibrarySynced,
  buildTalentFactorLibraryFromSource,
  createMockTalentFactorLibrarySource,
  planTalentFactorMerge,
  summarizeTalentFactorSource,
  type TalentFactorLibraryQuery,
  type TalentFactorLibrarySourceFactor,
} from "~~/server/utils/talent-rule-source";

export interface TalentFactorLibrarySyncOptions {
  /** 有 id 入口（已存在分库的再同步）。 */
  libraryId?: string;
  /** 最近同步操作人（users 关联 id）。 */
  syncedBy?: string;
  /** 再同步入口要求分库已同步过；首同步入口（无 id）传 false。 */
  requireExistingSynced?: boolean;
}

export interface TalentFactorLibrarySyncSummary {
  libraryId: string;
  gender: string;
  age: number;
  itemCount: number;
  slotTotal: number;
  filledCount: number;
  /** 部分回填槽位数（只进同步摘要与 oper_logs，不落库）。 */
  partialCount: number;
  created: number;
  updated: number;
  unchanged: number;
}

/** 要素落库字段（不含 libraryId）。 */
function factorFields(factor: TalentFactorLibrarySourceFactor) {
  return {
    code: factor.code,
    name: factor.name,
    category: factor.category,
    categoryName: factor.categoryName,
    sortOrder: factor.sortOrder,
    slots: factor.slots,
    slotTotal: factor.slotTotal,
    filledSlotCount: factor.filledSlotCount,
    partialSlotCount: factor.partialSlotCount,
  };
}

/**
 * 执行分库同步：
 * - 无 libraryId：按唯一键 `gender + age` upsert 分库（库不存在时创建）；
 * - 有 libraryId：只同步该库，未同步过的库拒绝（409「该库尚未同步」）。
 * 要素按 code 合并：新编码创建、内容变化更新、内容相同跳过，不删除历史要素。
 */
export async function syncTalentFactorLibrary(
  pb: PocketBase,
  query: TalentFactorLibraryQuery,
  options: TalentFactorLibrarySyncOptions = {},
): Promise<TalentFactorLibrarySyncSummary> {
  let existing: TalentFactorLibrary | null = null;
  if (options.libraryId) {
    existing = await pb
      .collection("talent_factor_libraries")
      .getOne<TalentFactorLibrary>(options.libraryId, { $autoCancel: false })
      .catch(() => null);
    if (!existing) throw createError({ statusCode: 404, message: "分库不存在" });
    if (existing.gender !== query.gender || Number(existing.age) !== Number(query.age))
      throw createError({ statusCode: 422, message: "同步性别 / 年龄与分库不一致" });
    if (options.requireExistingSynced) assertTalentFactorLibrarySynced(existing);
  } else {
    existing = await pb
      .collection("talent_factor_libraries")
      .getFirstListItem<TalentFactorLibrary>(
        `gender = "${escapeFilterValue(query.gender)}" && age = ${Number(query.age)}`,
        { $autoCancel: false },
      )
      .catch(() => null);
  }

  const payload = await createMockTalentFactorLibrarySource().fetchLibrary(query);
  const libraryData = {
    ...buildTalentFactorLibraryFromSource(payload),
    syncedAt: new Date().toISOString(),
    ...(options.syncedBy ? { syncedBy: options.syncedBy } : {}),
  };
  const library = existing
    ? await pb
        .collection("talent_factor_libraries")
        .update<TalentFactorLibrary>(existing.id, libraryData, { $autoCancel: false })
    : await pb
        .collection("talent_factor_libraries")
        .create<TalentFactorLibrary>(libraryData, { $autoCancel: false });

  const existingFactors = await pb.collection("talent_factors").getFullList<TalentFactor>({
    filter: `libraryId = "${escapeFilterValue(library.id)}"`,
    $autoCancel: false,
  });
  const plan = planTalentFactorMerge(
    existingFactors as unknown as Array<{ id: string; code: string } & Record<string, unknown>>,
    payload.factors,
  );
  for (const factor of plan.creates)
    await pb
      .collection("talent_factors")
      .create({ libraryId: library.id, ...factorFields(factor) }, { $autoCancel: false });
  for (const { existingId, factor } of plan.updates)
    await pb
      .collection("talent_factors")
      .update(existingId, factorFields(factor), { $autoCancel: false });

  const partialCount = summarizeTalentFactorSource(payload.factors).partialCount;
  return {
    libraryId: library.id,
    gender: payload.gender,
    age: payload.age,
    itemCount: payload.itemCount,
    slotTotal: payload.slotTotal,
    filledCount: payload.filledCount,
    partialCount,
    created: plan.creates.length,
    updated: plan.updates.length,
    unchanged: plan.unchanged.length,
  };
}

/** 同步结果摘要文案：只记计数，不记文库正文（ADR 0001-D4）。 */
export function talentFactorLibrarySyncSummaryText(
  summary: TalentFactorLibrarySyncSummary,
): string {
  const genderLabel = summary.gender === "female" ? "女" : "男";
  return `${genderLabel} · ${summary.age} 岁：要素 ${summary.itemCount}、完整槽位 ${summary.filledCount}、部分回填 ${summary.partialCount}（新增 ${summary.created} / 更新 ${summary.updated} / 未变 ${summary.unchanged}）`;
}