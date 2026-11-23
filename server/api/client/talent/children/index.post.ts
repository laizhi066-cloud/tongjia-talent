/**
 * @description C 端新增孩子：复用 M2 建档（身份证唯一 / 已解绑档案重绑 / 单家长上限 10）
 *   并自动发起基因查询；查询失败不影响建档（置「信息待核对 · 接口异常」）。
 *   家长未绑定 / 停用 → 404；身份证冲突 409 `CHILD_IDNO_EXISTS`；字段校验 422。
 * @file server/api/client/talent/children/index.post.ts
 * @route POST /api/client/talent/children
 * @body { name, gender, relation, birthday, idNo }
 */
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { success } from "~~/server/utils/response";
import {
  createTalentClientChild,
  requireTalentClientParent,
  requireTalentClientUser,
  talentClientChildCreateSchema,
  validateTalentClientBody,
} from "~~/server/utils/talent-client-api";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

export default defineEventHandler(async (event) => {
  const user = await requireTalentClientUser(event);
  const body = await validateTalentClientBody(
    event,
    talentClientChildCreateSchema,
  );
  const pb = await getAdminPB();
  const parent = await requireTalentClientParent(pb, user.id);
  return withOperLog(
    event,
    {
      title: "C 端新增孩子",
      operType: OperType.INSERT,
      summary: `孩子 ${String(body.name || "")}`,
    },
    async () => {
      const child = await createTalentClientChild({
        pb,
        parent,
        body: {
          name: body.name,
          gender: body.gender as "male" | "female",
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