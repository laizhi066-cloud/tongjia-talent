/**
 * @description 固定注解列表：支持分级 / 要素编码 / 潜质要素名称 / 正文关键字筛选，
 *   返回按当前文库解析的要素名与分级下拉计数（632 条全局口径，不按分库隔离）。
 * @file server/api/admin/talent/factor-notes/index.get.ts
 * @route GET /api/admin/talent/factor-notes
 */
import type { TalentFactorNote } from "~~/shared/types/talent-rule";
import { paginatedQuery } from "~~/server/utils/crud";
import { escapeFilterValue, getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import {
  loadTalentNoteLevelCounts,
  loadTalentRuleLookups,
  withTalentRulePagination,
} from "~~/server/utils/talent-rule-api";

export default defineEventHandler(async (event) => {
  await requirePermission(event, "talent:rule:list");
  const query = getQuery(event);
  const pb = await getAdminPB();
  const lookups = await loadTalentRuleLookups(pb);
  const baseFilters: string[] = [];
  const factorCode = String(query.factorCode || "").trim();
  if (factorCode)
    baseFilters.push(`factorCode ~ "${escapeFilterValue(factorCode)}"`);
  const keyword = String(query.keyword || "").trim();
  if (keyword)
    baseFilters.push(
      `(code ~ "${escapeFilterValue(keyword)}" || note ~ "${escapeFilterValue(keyword)}")`,
    );
  const name = String(query.name || "").trim();
  if (name) {
    const matchedCodes = [...lookups.factorNames.entries()]
      .filter(([, factorName]) => factorName.includes(name))
      .map(([code]) => code);
    baseFilters.push(
      matchedCodes.length
        ? `(${matchedCodes.map((code) => `factorCode = "${escapeFilterValue(code)}"`).join(" || ")})`
        : 'id = "__none__"',
    );
  }
  const levelCode = String(query.levelCode || "").trim();
  if (levelCode && !/^LV\d{1,2}$/.test(levelCode))
    throw createError({ statusCode: 422, message: "分级编码格式必须为 LVn" });
  const filters = [
    ...baseFilters,
    ...(levelCode ? [`levelCode = "${escapeFilterValue(levelCode)}"`] : []),
  ];
  // 分级下拉 count 与「除分级外其余筛选」同源，保证下拉数量 = 筛选后条数。
  const { levelCounts, noteTotal } = await loadTalentNoteLevelCounts(
    pb,
    baseFilters.join(" && "),
  );
  const result = await paginatedQuery<TalentFactorNote>(
    "talent_factor_notes",
    withTalentRulePagination(query),
    filters.join(" && "),
    {
      sort: "code",
      transform: (item: TalentFactorNote) => ({
        ...item,
        factorName: lookups.factorNames.get(item.factorCode) || item.factorCode,
        factorNameResolved: lookups.factorNames.has(item.factorCode),
        levelName: lookups.levelNames.get(item.levelCode) || item.levelCode,
      }),
    },
  );
  return success(
    { ...result.data, levelCounts, noteTotal },
    "获取成功",
  );
});