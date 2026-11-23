/**
 * @description 会员详情：家长脱敏资料 + 名下正常子女（查询状态 / 归因 / 报告计数）
 *   + 账号绑定信息；已解绑子女不出现（仍可通过重绑复用档案）。
 * @file server/api/admin/talent/members/[id].get.ts
 * @route GET /api/admin/talent/members/:id
 */
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import { loadTalentMemberDetail } from "~~/server/utils/talent-member-api";

export default defineEventHandler(async (event) => {
  await requirePermission(event, "talent:parent:view");
  const id = String(getRouterParam(event, "id") || "").trim();
  const pb = await getAdminPB();
  const detail = await loadTalentMemberDetail(pb, id);
  return success(detail, "会员详情");
});