/**
 * @description 编辑家长：手机号 / 身份证留空不改；改手机号或证件重新校验唯一并重算三件套；
 *   会员编号出现时必须等于库中值（不可修改）。
 * @file server/api/admin/talent/members/[id].put.ts
 * @route PUT /api/admin/talent/members/:id
 */
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import {
  talentMemberUpdateSchema,
  updateTalentMember,
} from "~~/server/utils/talent-member-api";
import { sanitizeTalentParentRecord } from "~~/server/utils/talent-member";
import { validateBody } from "~~/server/utils/validation";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

export default defineEventHandler(async (event) => {
  const body = await validateBody(event, talentMemberUpdateSchema, {
    statusCode: 422,
  });
  await requirePermission(event, "talent:parent:edit");
  return withOperLog(
    event,
    { title: "编辑会员", operType: OperType.UPDATE },
    async () => {
      const id = String(getRouterParam(event, "id") || "").trim();
      const pb = await getAdminPB();
      const user = await getCurrentUser(event);
      const record = await updateTalentMember(pb, id, body, {
        userId: String(user.id || ""),
      });
      return success(
        { parent: sanitizeTalentParentRecord(record) },
        "会员资料已保存",
      );
    },
  );
});