/**
 * @description 新增名下子女：命中已解绑档案则重绑复用，命中正常档案 409；
 *   落库后自动发起查询，返回子女视图与发起结果。
 * @file server/api/admin/talent/members/[id]/children.post.ts
 * @route POST /api/admin/talent/members/:id/children
 */
import type { TalentChildRecord } from "~~/shared/types/talent-member";
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import {
  createTalentMemberChild,
  talentMemberChildCreateSchema,
} from "~~/server/utils/talent-member-api";
import { submitTalentChildQuery } from "~~/server/utils/talent-member-query";
import {
  sanitizeTalentChildRecord,
} from "~~/server/utils/talent-member";
import { validateBody } from "~~/server/utils/validation";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

export default defineEventHandler(async (event) => {
  const body = await validateBody(event, talentMemberChildCreateSchema, {
    statusCode: 422,
  });
  await requirePermission(event, "talent:child:edit");
  return withOperLog(
    event,
    { title: "新增子女档案", operType: OperType.INSERT },
    async () => {
      const parentId = String(getRouterParam(event, "id") || "").trim();
      const pb = await getAdminPB();
      const user = await getCurrentUser(event);
      const created = await createTalentMemberChild(pb, parentId, body, {
        userId: String(user.id || ""),
      });
      const result = await submitTalentChildQuery(created.id);
      const latest = await pb
        .collection("talent_children")
        .getOne<TalentChildRecord>(created.id, { $autoCancel: false });
      return success(
        {
          child: sanitizeTalentChildRecord(latest, {
            parentStatus: "1",
          }),
          requery: true,
          query: { accepted: result.accepted, throttled: result.throttled },
        },
        result.accepted ? "已新增子女，正在查询" : "已新增子女，查询未发起",
      );
    },
  );
});