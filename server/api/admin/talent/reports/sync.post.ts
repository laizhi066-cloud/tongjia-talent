/**
 * @description 一键同步全部报告：`mode=preview` 只读预演（零写入）/
 *   `mode=commit` 写入三类归因 + 同步日志 + 操作日志；commit 全局串行，并发第二个 409，
 *   外部源不可用 503。
 * @file server/api/admin/talent/reports/sync.post.ts
 * @route POST /api/admin/talent/reports/sync
 */
import type { TalentReportSyncResult } from "~~/shared/types/talent-report";
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import {
  commitTalentReportsSync,
  previewTalentReportsSync,
  talentReportSyncSchema,
} from "~~/server/utils/talent-report-api";
import { validateBody } from "~~/server/utils/validation";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

export default defineEventHandler(async (event): Promise<unknown> => {
  const body = await validateBody(event, talentReportSyncSchema, {
    statusCode: 422,
  });
  await requirePermission(event, "talent:report:sync");
  const user = await getCurrentUser(event);
  const operatorId = String(user.id || "");
  // 预演只读：不写任何集合、不写 talent_sync_logs / oper_logs。
  if (body.mode === "preview") {
    const preview = await previewTalentReportsSync({ operatorId });
    return success(preview, "同步预演完成");
  }
  return withOperLog(
    event,
    {
      title: "一键同步全部报告",
      operType: OperType.UPDATE,
      summary: (result) => {
        const value = (result as { data?: TalentReportSyncResult }).data;
        if (!value) return "同步完成";
        return `刷新 ${value.counts.refreshed} / 新建 ${value.counts.created} / 暂无 ${value.counts.empty} / 失败 ${value.counts.failed}`;
      },
    },
    async () => {
      // 明确使用默认 PB 连接（同步模块内部串行 + 日志写入）。
      await getAdminPB();
      const result = await commitTalentReportsSync(
        { previewCounts: body.previewCounts },
        { operatorId },
      );
      return success(result, "同步完成");
    },
  );
});
