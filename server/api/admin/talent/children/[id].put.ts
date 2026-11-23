/**
 * @description 编辑子女：身份证留空不改；姓名 / 性别 / 生日 / 身份证变更后自动重查
 *   （先复位查询状态，绕过 found 拒查与 30s 节流），仅改「与家长关系」不重查。
 * @file server/api/admin/talent/children/[id].put.ts
 * @route PUT /api/admin/talent/children/:id
 */
import type { TalentChildRecord } from "~~/shared/types/talent-member";
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import {
  talentMemberChildUpdateSchema,
  updateTalentMemberChild,
} from "~~/server/utils/talent-member-api";
import { submitTalentChildQuery } from "~~/server/utils/talent-member-query";
import { sanitizeTalentChildRecord } from "~~/server/utils/talent-member";
import { validateBody } from "~~/server/utils/validation";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

export default defineEventHandler(async (event) => {
  const body = await validateBody(event, talentMemberChildUpdateSchema, {
    statusCode: 422,
  });
  await requirePermission(event, "talent:child:edit");
  return withOperLog(
    event,
    { title: "编辑子女档案", operType: OperType.UPDATE },
    async () => {
      const id = String(getRouterParam(event, "id") || "").trim();
      const pb = await getAdminPB();
      const user = await getCurrentUser(event);
      const { child, requery } = await updateTalentMemberChild(pb, id, body, {
        userId: String(user.id || ""),
      });
      let latest: TalentChildRecord = child;
      let query: { accepted: boolean; throttled: boolean } | null = null;
      if (requery) {
        const result = await submitTalentChildQuery(child.id);
        latest = result.child;
        query = { accepted: result.accepted, throttled: result.throttled };
      }
      return success(
        {
          child: sanitizeTalentChildRecord(latest),
          requery,
          query,
        },
        requery ? "子女资料已保存，正在重新查询" : "子女资料已保存",
      );
    },
  );
});