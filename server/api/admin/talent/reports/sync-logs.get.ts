/**
 * @description 最近 20 次一键同步记录（三类计数 / 失败数 / 时间 / 操作人）；
 *   只读 `syncScope="gene_report"` 的日志，旧第三方同步日志不混入。
 * @file server/api/admin/talent/reports/sync-logs.get.ts
 * @route GET /api/admin/talent/reports/sync-logs
 */
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import { listTalentReportSyncLogs } from "~~/server/utils/talent-report-api";

export default defineEventHandler(async (event): Promise<unknown> => {
  await requirePermission(event, "talent:report:sync");
  const pb = await getAdminPB();
  const result = await listTalentReportSyncLogs(pb);
  return success(result, "同步记录");
});
