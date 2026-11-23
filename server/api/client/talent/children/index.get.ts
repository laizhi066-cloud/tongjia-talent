/**
 * @description C 端孩子列表：只返回当前家长名下 `status="1"` 的子女，脱敏（证件只给掩码）、
 *   查询状态与归因、周岁文案、报告篇数；家长未绑定 / 停用 → 404。
 * @file server/api/client/talent/children/index.get.ts
 * @route GET /api/client/talent/children
 */
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { success } from "~~/server/utils/response";
import {
  loadTalentClientChildrenForUser,
  requireTalentClientUser,
} from "~~/server/utils/talent-client-api";

export default defineEventHandler(async (event) => {
  const user = await requireTalentClientUser(event);
  const pb = await getAdminPB();
  const children = await loadTalentClientChildrenForUser(pb, user.id);
  setHeader(event, "cache-control", "no-store");
  return success(children, "孩子列表");
});