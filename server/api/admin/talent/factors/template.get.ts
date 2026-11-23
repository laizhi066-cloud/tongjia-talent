/**
 * @description 下载潜质要素文库模板 CSV（仅表头 + 1 行示例，不提供要素导入）。
 * @file server/api/admin/talent/factors/template.get.ts
 * @route GET /api/admin/talent/factors/template
 */
import { requirePermission } from "~~/server/utils/permission";
import {
  buildTalentFactorLibraryCsvTemplate,
  talentRuleDownloadHeaders,
} from "~~/server/utils/talent-rule-api";

export default defineEventHandler(async (event) => {
  await requirePermission(event, "talent:factor:export");
  talentRuleDownloadHeaders(event, "talent-factor-library-template.csv");
  return buildTalentFactorLibraryCsvTemplate();
});