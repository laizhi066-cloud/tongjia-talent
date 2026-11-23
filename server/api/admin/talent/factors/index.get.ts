/**
 * @description 潜质要素列表：`libraryId` 必传，支持分册与关键词（编号 / 名称）筛选，返回分册数量聚合。
 * @file server/api/admin/talent/factors/index.get.ts
 * @route GET /api/admin/talent/factors
 */
import { paginatedQuery } from "~~/server/utils/crud";
import { escapeFilterValue, getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import {
  loadTalentFactorCategoryCounts,
  withTalentRulePagination,
} from "~~/server/utils/talent-rule-api";

export default defineEventHandler(async (event) => {
  await requirePermission(event, "talent:factor:list");
  const query = getQuery(event);
  const libraryId = String(query.libraryId || "").trim();
  if (!libraryId)
    throw createError({ statusCode: 422, message: "libraryId 不能为空" });
  const filters = [`libraryId = "${escapeFilterValue(libraryId)}"`];
  const category = String(query.category || "").trim();
  if (category) {
    if (!/^[A-F]$/.test(category))
      throw createError({ statusCode: 422, message: "分册编码无效" });
    filters.push(`category = "${escapeFilterValue(category)}"`);
  }
  const pb = await getAdminPB();
  // 分册下拉的 count 与「关键词 + 分册」列表同源，供页面显示「全部分册 + 6 册带数量」。
  const baseFilters = [...filters].slice(0, 1);
  const fill = String(query.fill || "").trim();
  if (fill) {
    if (fill === "complete")
      filters.push("filledSlotCount >= 12");
    else if (fill === "partial")
      filters.push("(partialSlotCount > 0 || (filledSlotCount > 0 && filledSlotCount < 12))");
    else if (fill === "empty")
      filters.push("(filledSlotCount = 0 && partialSlotCount = 0)");
    else
      throw createError({ statusCode: 422, message: "回填状态筛选无效" });
  }
  const keyword = String(query.keyword || "").trim();
  if (keyword)
    baseFilters.push(
      `(code ~ "${escapeFilterValue(keyword)}" || name ~ "${escapeFilterValue(keyword)}")`,
    );
  const { categoryCounts, categoryTotal } = await loadTalentFactorCategoryCounts(
    pb,
    baseFilters.join(" && "),
  );
  const result = await paginatedQuery(
    "talent_factors",
    withTalentRulePagination(query),
    filters.join(" && "),
    { sort: "sortOrder", keywordFields: ["code", "name"] },
  );
  return success(
    { ...result.data, categoryCounts, categoryTotal },
    "获取成功",
  );
});