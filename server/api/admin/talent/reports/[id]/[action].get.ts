/**
 * @description 报告只读动作（GET，14 条路由中的 #4 / #8 / #11）：
 *   `publish-preview`（待发布报告发布弹层）/ `reissue-preview`（补发弹层）/
 *   `direction-preview`（冻结快照 vs 当前配置 diff）；全部只读、不写库、不写日志。
 *   路由文件按动作聚合（Nitro 每个嵌套动态段都会进入 `$fetch` 路由类型计算，14 个独立文件会
 *   触发仓库现有 Nitro 路由类型的 TS 递归深度上限；HTTP 路径与 spec §5.2 完全一致）。
 * @file server/api/admin/talent/reports/[id]/[action].get.ts
 * @route GET /api/admin/talent/reports/:id/publish-preview
 * @route GET /api/admin/talent/reports/:id/reissue-preview
 * @route GET /api/admin/talent/reports/:id/direction-preview
 */
import type PocketBase from "pocketbase";
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import {
  buildTalentReportDirectionPreview,
  buildTalentReportPublishPreview,
  buildTalentReportReissuePreview,
  resolveTalentReportRouteAction,
  resolveTalentReportRouteId,
} from "~~/server/utils/talent-report-api";
import { notFoundTalentReport } from "~~/server/utils/talent-report-snapshot";

type TalentReportGetAction = (
  pb: PocketBase,
  reportId: string,
) => Promise<unknown>;

/** 只读动作表：新增动作必须同时登记在此（测试会断言 14 条路由清单）。 */
export const TALENT_REPORT_GET_ACTIONS: Readonly<
  Record<string, { handler: TalentReportGetAction; message: string }>
> = {
  "publish-preview": {
    handler: buildTalentReportPublishPreview,
    message: "发布预览",
  },
  "reissue-preview": {
    handler: buildTalentReportReissuePreview,
    message: "补发预览",
  },
  "direction-preview": {
    handler: buildTalentReportDirectionPreview,
    message: "方向预览",
  },
};

export default defineEventHandler(async (event): Promise<unknown> => {
  await requirePermission(event, "talent:report:view");
  const id = resolveTalentReportRouteId(event, "id");
  const action = resolveTalentReportRouteAction(event);
  const definition = TALENT_REPORT_GET_ACTIONS[action];
  if (!definition) throw notFoundTalentReport("报告操作不存在");
  const pb = await getAdminPB();
  return success(await definition.handler(pb, id), definition.message);
});
