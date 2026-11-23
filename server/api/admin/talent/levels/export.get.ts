/**
 * @description 分级导出 CSV：按当前筛选（关键词 / 状态）导出 7 列（含固定注解数），带 BOM。
 * @file server/api/admin/talent/levels/export.get.ts
 * @route GET /api/admin/talent/levels/export
 */
import type { TalentLevel } from "~~/shared/types/talent-rule";
import { escapeFilterValue, getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import {
  buildTalentLevelExportCsv,
  loadTalentNoteLevelCounts,
  talentRuleDownloadHeaders,
} from "~~/server/utils/talent-rule-api";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

export default defineEventHandler(async (event) => {
  await requirePermission(event, "talent:rule:export");
  let exportedRows = 0;
  return withOperLog(
    event,
    { title: "分级导出", operType: OperType.EXPORT, summary: () => `${exportedRows} 行` },
    async () => {
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
      const levels = await pb.collection("talent_levels").getFullList<TalentLevel>({
        filter: filters.join(" && "),
        sort: "sortOrder",
        $autoCancel: false,
      });
      const { levelCounts } = await loadTalentNoteLevelCounts(pb);
      const csv = buildTalentLevelExportCsv(
        levels.map((level) => ({
          code: level.code,
          name: level.name,
          sortOrder: Number(level.sortOrder || 0),
          range: level.range || "",
          tone: level.tone,
          status: String(level.status || "1"),
          noteCount: levelCounts[level.code] || 0,
        })),
      );
      exportedRows = levels.length;
      talentRuleDownloadHeaders(event, "talent-levels.csv");
      return csv;
    },
  );
});