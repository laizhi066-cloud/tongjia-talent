/**
 * @description 会员列表：家长姓名 / 手机号（完整 11 位或后 4 位）/ 子女姓名 / 状态四项交集，
 *   分页默认 20 上限 100，返回状态计数（不叠加状态筛选）与每行子女数 / 报告数。
 * @file server/api/admin/talent/members/index.get.ts
 * @route GET /api/admin/talent/members
 */
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import { listTalentMembers } from "~~/server/utils/talent-member-api";

export default defineEventHandler(async (event) => {
  await requirePermission(event, "talent:parent:list");
  const query = getQuery(event) as Record<string, unknown>;
  const pb = await getAdminPB();
  const result = await listTalentMembers(pb, {
    name: String(query.name || ""),
    mobile: String(query.mobile || ""),
    childName: String(query.childName || ""),
    status: String(query.status || ""),
    page: String(query.page || ""),
    pageSize: String(query.pageSize || ""),
  });
  return success(result, "会员列表");
});