/**
 * @description C 端分册要素（M3 冻结快照投影）：章节分组、要素名 / 数据熵 / 固定注解 /
 *   适用条件、本册相关培养方向；`index` 为册内 0 起序号（上一项 / 下一项与深链定位）。
 *   守卫：报告已发布（未发布 / 已撤回 409）+ 本册 `open=true`（未开放 / 越权 404）。
 * @file server/api/client/talent/reports/[id]/volumes/[volumeId].get.ts
 * @route GET /api/client/talent/reports/:id/volumes/:volumeId
 */
import { getCurrentUserBasic } from "~~/server/utils/auth";
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { success } from "~~/server/utils/response";
import {
  assertTalentClientReportAccess,
  buildTalentClientVolume,
  notFoundTalentClientVolume,
  resolveTalentClientVolumeState,
} from "~~/server/utils/talent-client-api";

export default defineEventHandler(async (event) => {
  const user = await getCurrentUserBasic(event);
  const pb = await getAdminPB();
  const reportId = String(getRouterParam(event, "id") || "");
  const volumeId = String(getRouterParam(event, "volumeId") || "").trim();
  const { report } = await assertTalentClientReportAccess(
    pb,
    String(user.id || ""),
    reportId,
  );
  if (!volumeId || resolveTalentClientVolumeState(report, volumeId) !== "readable")
    throw notFoundTalentClientVolume();
  const volume = buildTalentClientVolume(report, volumeId);
  if (!volume) throw notFoundTalentClientVolume();
  setHeader(event, "cache-control", "no-store");
  return success(volume, "分册要素");
});