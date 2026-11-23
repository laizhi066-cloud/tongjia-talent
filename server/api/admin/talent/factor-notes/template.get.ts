/**
 * @description 下载固定注解导入模板 CSV（6 列，仅表头 + 1 行示例，带 BOM）。
 * @file server/api/admin/talent/factor-notes/template.get.ts
 * @route GET /api/admin/talent/factor-notes/template
 */
import { requirePermission } from "~~/server/utils/permission";
import { talentRuleDownloadHeaders } from "~~/server/utils/talent-rule-api";
import { buildTalentFactorNoteCsvTemplate } from "~~/server/utils/talent-rule-csv";

export default defineEventHandler(async (event) => {
  await requirePermission(event, "talent:rule:export");
  talentRuleDownloadHeaders(event, "talent-factor-notes-template.csv");
  return buildTalentFactorNoteCsvTemplate();
});