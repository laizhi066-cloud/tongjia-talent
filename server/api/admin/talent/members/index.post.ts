/**
 * @description 新建会员：家长（姓名 + 手机号必填，身份证 / 生日选填）+ 1–10 名子女；
 *   全部子女先落库再逐个发起查询，单个查询失败不影响建档（该子女置 `not_found/api_error`）。
 * @file server/api/admin/talent/members/index.post.ts
 * @route POST /api/admin/talent/members
 */
import type { TalentChildRecord } from "~~/shared/types/talent-member";
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import {
  createTalentMember,
  talentMemberCreateSchema,
} from "~~/server/utils/talent-member-api";
import {
  markTalentChildQueryFailed,
  submitTalentChildQuery,
} from "~~/server/utils/talent-member-query";
import {
  sanitizeTalentChildRecord,
  sanitizeTalentParentRecord,
} from "~~/server/utils/talent-member";
import { validateBody } from "~~/server/utils/validation";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

export default defineEventHandler(async (event) => {
  const body = await validateBody(event, talentMemberCreateSchema, {
    statusCode: 422,
  });
  await requirePermission(event, "talent:parent:add");
  return withOperLog(
    event,
    { title: "新建会员", operType: OperType.INSERT },
    async () => {
      const pb = await getAdminPB();
      const user = await getCurrentUser(event);
      const { parent, children } = await createTalentMember(pb, body, {
        userId: String(user.id || ""),
      });
      const queries: Array<{
        childId: string;
        accepted: boolean;
        query: string;
        throttled: boolean;
      }> = [];
      let acceptedCount = 0;
      for (const child of children) {
        let latest: TalentChildRecord = child;
        let accepted = false;
        let throttled = false;
        try {
          const result = await submitTalentChildQuery(child.id);
          latest = result.child;
          accepted = result.accepted;
          throttled = result.throttled;
        } catch {
          latest = await markTalentChildQueryFailed(child.id).catch(() => latest);
        }
        if (accepted) acceptedCount += 1;
        queries.push({
          childId: child.id,
          accepted,
          query: String(latest.query || "not_found"),
          throttled,
        });
      }
      const freshChildren = await pb
        .collection("talent_children")
        .getFullList<TalentChildRecord>({
          filter: `parentId = "${parent.id}" && status = "1"`,
          sort: "created",
          $autoCancel: false,
        });
      return success(
        {
          parent: sanitizeTalentParentRecord(parent),
          children: freshChildren.map((child) =>
            sanitizeTalentChildRecord(child, { parentStatus: parent.status }),
          ),
          queries,
        },
        `已创建会员，${acceptedCount} 名子女正在查询`,
      );
    },
  );
});