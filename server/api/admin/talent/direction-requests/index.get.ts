/**
 * @description 自定义方向待归并列表（spec §5.2 #1）：关键词（自填方向 / 家长姓名 / 子女姓名）、
 *   状态（默认 `待归并`）与分页；列表读取复用 `talent:direction:list`，只读、不写日志。
 *   同一服务函数另挂在任务卡口径 `/directions/requests`（别名）。
 * @file server/api/admin/talent/direction-requests/index.get.ts
 * @route GET /api/admin/talent/direction-requests
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