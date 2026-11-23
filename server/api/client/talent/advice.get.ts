/**
 * @description C 端培育建议（M5 冻结契约）：当前生效版本 + 已发布建议书，按分册分组，
 *   四段文案原样返回；可见性派生 = 已发布 ∧ 当前生效版 ∧ 报告 published ∧ 归属正常
 *   （未发布 / 撤回 / 非生效版 / 无已发布建议 → `available=false` 空态，不提示撤回原因）。
 *   守卫：家长正常 + 报告归属 + 报告可读；越权 / 解绑 404；报告未发布 / 撤回 409 + `state`。
 * @file server/api/client/talent/advice.get.ts
 * @route GET /api/client/talent/advice?reportId=
 */
import { getCurrentUserBasic } from "~~/server/utils/auth";
import { success } from "~~/server/utils/response";
import {
  invalidTalentClient,
  loadTalentClientAdvice,
} from "~~/server/utils/talent-client-api";

export default defineEventHandler(async (event) => {
  const user = await getCurrentUserBasic(event);
  const query = getQuery(event) as Record<string, unknown>;
  const reportId = String(query.reportId || "").trim();
  if (!reportId)
    throw invalidTalentClient("请提供报告 id（reportId）", "REPORT_ID_REQUIRED");
  const advice = await loadTalentClientAdvice(String(user.id || ""), reportId);
  setHeader(event, "cache-control", "no-store");
  return success(advice, advice.available ? "培育建议" : advice.emptyText);
});