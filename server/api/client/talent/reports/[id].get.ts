/**
 * @description C 端报告总览（M3 冻结契约投影）：报告状态 + 固定六册摘要 + 建议份数 + 对象脱敏信息。
 *   守卫：家长正常 + 报告归属一致 + 子女未解绑（越权 404）；未发布 / 已撤回 409 + `state`；
 *   只读冻结快照，不重算方向、不返回 `factorSnapshot` 全量 / 报告编号 / 要素编码。
 * @file server/api/client/talent/reports/[id].get.ts
 * @route GET /api/client/talent/reports/:id
 */
import { getCurrentUserBasic } from "~~/server/utils/auth";
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { success } from "~~/server/utils/response";
import {
  assertTalentClientReportAccess,
  buildTalentClientReportOverview,
  loadTalentClientAdviceBookCounts,
  loadTalentClientReportSubject,
} from "~~/server/utils/talent-client-api";

export default defineEventHandler(async (event) => {
  const user = await getCurrentUserBasic(event);
  const pb = await getAdminPB();
  const reportId = String(getRouterParam(event, "id") || "");
  const { report } = await assertTalentClientReportAccess(
    pb,
    String(user.id || ""),
    reportId,
  );
  const [subject, adviceCounts] = await Promise.all([
    loadTalentClientReportSubject(pb, String(user.id || ""), report),
    loadTalentClientAdviceBookCounts(pb),
  ]);
  const overview = buildTalentClientReportOverview({
    report,
    subject,
    adviceCount: adviceCounts.get(String(report.id ?? "")) ?? 0,
  });
  setHeader(event, "cache-control", "no-store");
  return success(overview, "报告总览");
});