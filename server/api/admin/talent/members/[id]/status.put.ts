/**
 * @description 停用 / 启用会员：只改 `talent_parents.status`（停用唯一真源），
 *   不写 `users.status`、不改子女档案；停用后 C 端 bindings 立即不含本人与子女。
 * @file server/api/admin/talent/members/[id]/status.put.ts
 * @route PUT /api/admin/talent/members/:id/status
 */
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import {
  changeTalentMemberStatus,
  talentMemberStatusSchema,
} from "~~/server/utils/talent-member-api";
import { sanitizeTalentParentRecord } from "~~/server/utils/talent-member";
import { validateBody } from "~~/server/utils/validation";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

export default defineEventHandler(async (event) => {
  const body = await validateBody(event, talentMemberStatusSchema, {
    statusCode: 422,
  });
  await requirePermission(event, "talent:parent:status");
  return withOperLog(
    event,
    {
      title: body.status === "1" ? "启用会员" : "停用会员",
      operType: OperType.UPDATE,
    },
    async () => {
      const id = String(getRouterParam(event, "id") || "").trim();
      const pb = await getAdminPB();
      const user = await getCurrentUser(event);
      const record = await changeTalentMemberStatus(pb, id, body.status, {
        userId: String(user.id || ""),
      });
      return success(
        { parent: sanitizeTalentParentRecord(record) },
        body.status === "1" ? "已启用" : "已停用",
      );
    },
  );
});