/**
 * @description C 端编辑孩子：`assertTalentChildAccess` 归属门禁（越权 / 已解绑 404）；
 *   身份证留空 = 不修改；姓名 / 性别 / 生日 / 证件变更后自动重查（复用 M2 服务层，
 *   先复位查询状态绕开 found 拒查与节流）。冲突 409 `CHILD_IDNO_EXISTS`；字段校验 422。
 * @file server/api/client/talent/children/[id].put.ts
 * @route PUT /api/client/talent/children/:id
 * @body { name?, gender?, relation?, birthday?, idNo? }
 */
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { success } from "~~/server/utils/response";
import {
  requireTalentClientUser,
  talentClientChildUpdateSchema,
  updateTalentClientChild,
  validateTalentClientBody,
} from "~~/server/utils/talent-client-api";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

export default defineEventHandler(async (event) => {
  const user = await requireTalentClientUser(event);
  const body = await validateTalentClientBody(
    event,
    talentClientChildUpdateSchema,
  );
  const childId = String(getRouterParam(event, "id") || "").trim();
  return withOperLog(
    event,
    {
      title: "C 端编辑孩子",
      operType: OperType.UPDATE,
      summary: `孩子 ${String(body.name || childId)}`,
    },
    async () => {
      const pb = await getAdminPB();
      const child = await updateTalentClientChild({
        pb,
        userId: user.id,
        childId,
        body: {
          name: body.name,
          gender: body.gender as "male" | "female" | undefined,
          relation: body.relation,
          birthday: body.birthday,
          idNo: body.idNo,
        },
        actor: { userId: user.id },
      });
      return success(child, "已保存，正在查询结果");
    },
  );
});