/**
 * @description C 端 bindings（新契约）：按登录账号解析家长档案，返回本人 + 已绑定子女的
 *   只读对象列表。**GET 不创建 / 不更新任何记录**；未绑定或家长停用时返回空 items。
 * @file server/api/client/talent/bindings.get.ts
 * @route GET /api/client/talent/bindings
 */
import { getCurrentUserBasic } from "~~/server/utils/auth";
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { success } from "~~/server/utils/response";
import { getTalentMemberBindings } from "~~/server/utils/talent-member-api";

export default defineEventHandler(async (event) => {
  const user = await getCurrentUserBasic(event);
  const pb = await getAdminPB();
  const bindings = await getTalentMemberBindings(pb, String(user.id || ""));
  setHeader(event, "cache-control", "no-store");
  return success(bindings, "会员绑定列表");
});