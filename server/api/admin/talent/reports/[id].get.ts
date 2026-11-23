/**
 * @description 报告详情：信息条 + 4 页签（已选培养方向 / 匹配天赋 / 基因报告册摘要 / 培育建议空态）。
 *   不返回 factorSnapshot / volumeSnapshot 全量；单册叠加层走 `GET /reports/:id/volumes/:volumeId`。
 * @file server/api/admin/talent/reports/[id].get.ts
 * @route GET /api/admin/talent/reports/:id
 */
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import {
  assertTalentReportDetailSegment,
  loadTalentReportDetail,
  resolveTalentReportRouteId,
} from "~~/server/utils/talent-report-api";

export default defineEventHandler(async (event): Promise<unknown> => {
  await requirePermission(event, "talent:report:view");
  // 静态段优先：`sync` / `sync-logs` 不得被当成报告 id（spec §5.6-6）。
  // Nitro 在静态路径无匹配方法时可能回落到 `[id].get` 且不注入 params，用 path 兜底。
  const id = assertTalentReportDetailSegment(resolveTalentReportRouteId(event));
  const pb = await getAdminPB();
  const detail = await loadTalentReportDetail(pb, id);
  return success(detail, "报告详情");
});
