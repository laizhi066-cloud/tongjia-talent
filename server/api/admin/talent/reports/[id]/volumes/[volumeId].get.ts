/**
 * @description 单册叠加层：章节 + 要素（编码 / 名称 / 分级 / 数据熵=分级名 / 固定注解）。
 *   已发布/已撤回读取冻结 `volumeSnapshot`；待发布按基因报告篇目 + M1 当前值实时只读展示。
 *   后台可查看全部 6 册（含未开放册），未开放册由 `open=false` 标注。
 * @file server/api/admin/talent/reports/[id]/volumes/[volumeId].get.ts
 * @route GET /api/admin/talent/reports/:id/volumes/:volumeId
 */
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import {
  loadTalentReportVolume,
  resolveTalentReportRouteId,
  resolveTalentReportRouteVolumeId,
} from "~~/server/utils/talent-report-api";

export default defineEventHandler(async (event): Promise<unknown> => {
  await requirePermission(event, "talent:report:view");
  const reportId = resolveTalentReportRouteId(event, "id");
  const volumeId = resolveTalentReportRouteVolumeId(event);
  const pb = await getAdminPB();
  const volume = await loadTalentReportVolume(pb, reportId, volumeId);
  return success(volume, "分册详情");
});
