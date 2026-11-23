/**
 * @description 基因报告元数据与篇目（行内「基因报告」按钮）：只返回元数据 + 六册章节/要素计数，
 *   不返回 sections 全量与身份证明文/哈希。
 * @file server/api/admin/talent/gene-reports/[id].get.ts
 * @route GET /api/admin/talent/gene-reports/:id
 */
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import {
  loadTalentGeneReportDetail,
  resolveTalentReportRouteId,
} from "~~/server/utils/talent-report-api";

export default defineEventHandler(async (event): Promise<unknown> => {
  await requirePermission(event, "talent:report:view");
  const id = resolveTalentReportRouteId(event, "id");
  const pb = await getAdminPB();
  const detail = await loadTalentGeneReportDetail(pb, id);
  return success(detail, "基因报告");
});
