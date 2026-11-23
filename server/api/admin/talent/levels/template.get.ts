/**
 * @description 下载分级导入模板 CSV（仅表头 + 1 行示例，带 BOM）。
 * @file server/api/admin/talent/levels/template.get.ts
 * @route GET /api/admin/talent/levels/template
 */
import { requirePermission } from "~~/server/utils/permission";
import { talentRuleDownloadHeaders } from "~~/server/utils/talent-rule-api";
import { buildTalentLevelCsvTemplate } from "~~/server/utils/talent-rule-csv";

export default defineEventHandler(async (event) => {
  await requirePermission(event, "talent:rule:export");
  talentRuleDownloadHeaders(event, "talent-level-template.csv");
  return buildTalentLevelCsvTemplate();
});