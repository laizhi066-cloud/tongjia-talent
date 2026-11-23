/**
 * @description C 端编辑家长资料：昵称 / 头像写中性账户（`users`），姓名 / 性别 / 生日 / 身份证
 *   走 M2 `updateTalentMember`（复用加密、生日一致性、唯一冲突 409 `IDNO_EXISTS`）。
 *   手机号只读，不接收；身份证留空 = 不修改；审计摘要只含会员编号，不含证件 / 手机号。
 * @file server/api/client/talent/profile.put.ts
 * @route PUT /api/client/talent/profile
 * @body { name?, nickname?, avatar?, gender?, birthday?, idNo? }
 */
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { success } from "~~/server/utils/response";
import {
  requireTalentClientParent,
  requireTalentClientUser,
  talentClientProfileSchema,
  updateTalentClientProfile,
  validateTalentClientBody,
} from "~~/server/utils/talent-client-api";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

export default defineEventHandler(async (event) => {
  const user = await requireTalentClientUser(event);
  const body = await validateTalentClientBody(event, talentClientProfileSchema);
  const pb = await getAdminPB();
  const parent = await requireTalentClientParent(pb, user.id);
  return withOperLog(
    event,
    {
      title: "C 端编辑家长资料",
      operType: OperType.UPDATE,
      summary: `会员 ${String(parent.parentNo || "")}`,
    },
    async () => {
      const profile = await updateTalentClientProfile({
        pb,
        account: {
          id: user.id,
          nickname: user.nickname,
          avatar: user.avatar,
        },
        parent,
        body,
        actor: { userId: user.id },
      });
      return success(profile, "已保存");
    },
  );
});