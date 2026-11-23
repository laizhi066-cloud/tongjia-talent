/**
 * @description 任务卡口径别名：`GET /api/admin/talent/directions/requests`
 *   （spec §5.2 #1 为 `/direction-requests`，两条路径共用同一服务函数与权限码）。
 * @file server/api/admin/talent/directions/requests/index.get.ts
 * @route GET /api/admin/talent/directions/requests
 */
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import {
  listTalentDirectionRequests,
  readTalentDirectionQuery,
} from "~~/server/utils/talent-direction-api";

export default defineEventHandler(async (event) => {
  await requirePermission(event, "talent:direction:list");
  const pb = await getAdminPB();
  return success(
    await listTalentDirectionRequests(pb, readTalentDirectionQuery(event)),
    "待归并方向列表",
  );
});