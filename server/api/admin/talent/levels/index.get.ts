/**
 * @description 分级列表：只返回 `code != ""` 的新行，附每档固定注解数与下拉聚合。
 * @file server/api/admin/talent/levels/index.get.ts
 * @route GET /api/admin/talent/levels
 */
import type { TalentLevel } from "~~/shared/types/talent-rule";
import { paginatedQuery } from "~~/server/utils/crud";
import { escapeFilterValue, getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import {
  loadTalentNoteLevelCounts,
  withTalentRulePagination,
} from "~~/server/utils/talent-rule-api";

export default defineEventHandler(async (event) => {
  await requirePermission(event, "talent:rule:list");
  const query = getQuery(event);
  const filters = ['code != ""'];
  const status = String(query.status || "").trim();
  if (status === "0" || status === "1")
    filters.push(`status = "${escapeFilterValue(status)}"`);
  const keyword = String(query.keyword || "").trim();
  if (keyword)
    filters.push(
      `(code ~ "${escapeFilterValue(keyword)}" || name ~ "${escapeFilterValue(keyword)}")`,
    );
  const pb = await getAdminPB();
  const { levelCounts, noteTotal } = await loadTalentNoteLevelCounts(pb);
  const result = await paginatedQuery<TalentLevel>(
    "talent_levels",
    withTalentRulePagination(query),
    filters.join(" && "),
    {
      sort: "sortOrder",
      transform: (item: TalentLevel) => ({
        ...item,
        noteCount: levelCounts[item.code] || 0,
      }),
    },
  );
  return success(
    { ...result.data, noteCounts: levelCounts, noteTotal },
    "获取成功",
  );
});