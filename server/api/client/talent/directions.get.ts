/**
 * @description C 端培养方向：推荐（≤5，按冻结快照命中排序，0 命中回退全部已配置方向）、
 *   已选方向、自填候选项（拼音升序）、选择上限与报告版本；`description` / `icon` / 档位明细
 *   取 M1 当前配置装饰（不进快照）。守卫：家长正常 + 报告归属（404）+ 报告已发布（409）。
 * @file server/api/client/talent/directions.get.ts
 * @route GET /api/client/talent/directions?reportId=
 */
import { getCurrentUserBasic } from "~~/server/utils/auth";
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { success } from "~~/server/utils/response";
import {
  assertTalentClientReportAccess,
  buildTalentClientDirections,
  invalidTalentClient,
  loadTalentClientDirectionConfig,
} from "~~/server/utils/talent-client-api";

export default defineEventHandler(async (event) => {
  const user = await getCurrentUserBasic(event);
  const pb = await getAdminPB();
  const query = getQuery(event) as Record<string, unknown>;
  const reportId = String(query.reportId || "").trim();
  if (!reportId)
    throw invalidTalentClient("请提供报告 id（reportId）", "REPORT_ID_REQUIRED");
  const { report } = await assertTalentClientReportAccess(
    pb,
    String(user.id || ""),
    reportId,
  );
  const config = await loadTalentClientDirectionConfig(pb);
  const directions = buildTalentClientDirections({ report, config });
  setHeader(event, "cache-control", "no-store");
  return success(directions, "培养方向");
});