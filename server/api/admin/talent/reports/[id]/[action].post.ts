/**
 * @description 报告写动作（POST，14 条路由中的 #5 / #6 / #7 / #9 / #10）：
 *   `publish`（发布冻结 v1）/ `withdraw`（撤回）/ `restore`（恢复，沿用原快照）/
 *   `publish-new`（补发新增册，v+1）/ `regenerate-snapshot`（按当前配置重算，v+1）。
 *   统一链路：`validateBody`（有请求体的动作）→ `requirePermission("talent:report:publish")`
 *   → 服务层 `withTalentReportLock("report:"+id)` → `withOperLog` → `success`；
 *   路由文件按动作聚合（原因见 `[action].get.ts`），HTTP 路径与 spec §5.2 完全一致。
 * @file server/api/admin/talent/reports/[id]/[action].post.ts
 * @route POST /api/admin/talent/reports/:id/publish
 * @route POST /api/admin/talent/reports/:id/withdraw
 * @route POST /api/admin/talent/reports/:id/restore
 * @route POST /api/admin/talent/reports/:id/publish-new
 * @route POST /api/admin/talent/reports/:id/regenerate-snapshot
 */
import type PocketBase from "pocketbase";
import type { z } from "zod";
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import {
  publishTalentReport,
  regenerateTalentReportSnapshot,
  reissueTalentReport,
  restoreTalentReport,
  talentReportPublishSchema,
  talentReportRegenerateSchema,
  talentReportWithdrawSchema,
  withdrawTalentReport,
  resolveTalentReportRouteAction,
  resolveTalentReportRouteId,
  type TalentReportActionResponse,
  type TalentReportWriteActor,
} from "~~/server/utils/talent-report-api";
import { notFoundTalentReport } from "~~/server/utils/talent-report-snapshot";
import { validateBody } from "~~/server/utils/validation";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

type TalentReportPostAction = {
  /** 有请求体的动作才校验；`restore` / `publish-new` 按 spec 跳过 validateBody。 */
  schema?: z.ZodTypeAny;
  title: string;
  /** 操作日志摘要：只含报告编号与版本 / 分册，不含明文 PII。 */
  summary: (result: TalentReportActionResponse) => string;
  message: (result: TalentReportActionResponse) => string;
  run: (
    pb: PocketBase,
    reportId: string,
    body: Record<string, unknown>,
    actor: TalentReportWriteActor,
  ) => Promise<TalentReportActionResponse>;
};

/** 写动作表：新增动作必须同时登记在此（测试会断言 14 条路由清单）。 */
export const TALENT_REPORT_POST_ACTIONS: Readonly<
  Record<string, TalentReportPostAction>
> = {
  publish: {
    schema: talentReportPublishSchema,
    title: "发布天赋报告",
    summary: (result) =>
      `报告 ${result.report.reportNo} 快照版本 ${result.snapshotVersion}`,
    message: (result) => `已发布，快照版本 ${result.snapshotVersion}`,
    run: (pb, reportId, body, actor) =>
      publishTalentReport(pb, reportId, body.openVolumeIds as string[], actor),
  },
  withdraw: {
    schema: talentReportWithdrawSchema,
    title: "撤回天赋报告",
    summary: (result) =>
      `报告 ${result.report.reportNo} 版本 ${result.snapshotVersion}`,
    message: () => "已撤回，C 端立即不可见",
    run: (pb, reportId, body, actor) =>
      withdrawTalentReport(pb, reportId, { reason: body.reason as string | undefined }, actor),
  },
  restore: {
    title: "恢复发布天赋报告",
    summary: (result) =>
      `报告 ${result.report.reportNo} 版本 ${result.snapshotVersion}`,
    message: () => "已恢复发布",
    run: (pb, reportId, _body, actor) => restoreTalentReport(pb, reportId, actor),
  },
  "publish-new": {
    title: "补发天赋报告分册",
    summary: (result) =>
      `报告 ${result.report.reportNo} 补发 ${(result.addedBooks ?? []).join("、")} 版本 ${result.snapshotVersion}`,
    message: (result) => `已补发 ${result.addedBooks?.length || 0} 册`,
    run: (pb, reportId, _body, actor) => reissueTalentReport(pb, reportId, actor),
  },
  "regenerate-snapshot": {
    schema: talentReportRegenerateSchema,
    title: "重新生成报告快照",
    summary: (result) =>
      `报告 ${result.report.reportNo} 快照版本 ${result.snapshotVersion}`,
    message: (result) =>
      `已按当前配置重新生成快照（版本 ${result.snapshotVersion}）`,
    run: (pb, reportId, body, actor) =>
      regenerateTalentReportSnapshot(
        pb,
        reportId,
        { regenerateFactorNotes: body.regenerateFactorNotes as boolean | undefined },
        actor,
      ),
  },
};

export default defineEventHandler(async (event): Promise<unknown> => {
  const action = resolveTalentReportRouteAction(event);
  const definition = TALENT_REPORT_POST_ACTIONS[action];
  if (!definition) throw notFoundTalentReport("报告操作不存在");
  const body = definition.schema
    ? ((await validateBody(event, definition.schema, { statusCode: 422 })) as Record<
        string,
        unknown
      >)
    : {};
  await requirePermission(event, "talent:report:publish");
  return withOperLog(
    event,
    {
      title: definition.title,
      operType: OperType.UPDATE,
      // withOperLog 的 summary 收到的是 success(envelope)；摘要只写报告编号与版本，不含 PII。
      summary: (result) => {
        const payload = (result as { data?: TalentReportActionResponse }).data;
        return payload ? definition.summary(payload) : definition.title;
      },
    },
    async () => {
      const id = resolveTalentReportRouteId(event, "id");
      const pb = await getAdminPB();
      const user = await getCurrentUser(event);
      const result = await definition.run(pb, id, body, {
        userId: String(user.id || ""),
        userName: String(user.displayName || user.username || user.email || ""),
      });
      return success(result, definition.message(result));
    },
  );
});
