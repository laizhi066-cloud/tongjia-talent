/**
 * @description 后台方向命中预览：按报告冻结 `factorSnapshot` + 当前 M1 配置全量重算，返回
 *   全部已评估方向（含 0 命中与诊断）、推荐（含 0 命中回退）与 warnings；只读、不写库 / 不写日志。
 *   路由归 M4-B（M3 另有 `reports/:id/direction-preview` 的 frozen/current/diff 契约）。
 * @file server/api/admin/talent/directions/preview.get.ts
 * @route GET /api/admin/talent/directions/preview?reportId=
 */
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import {
  buildTalentDirectionPreview,
  readTalentDirectionPreviewReportId,
  readTalentDirectionQuery,
} from "~~/server/utils/talent-direction-api";

export default defineEventHandler(async (event) => {
  await requirePermission(event, "talent:report:view");
  const reportId = readTalentDirectionPreviewReportId(readTalentDirectionQuery(event));
  const pb = await getAdminPB();
  return success(await buildTalentDirectionPreview(pb, reportId), "方向预览");
});