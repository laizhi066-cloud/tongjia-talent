/**
 * @description 解绑子女：保留档案（`parentId` 置空、`status="2"`、`unbindAt/unbindBy`
 *   落库、`querySeq + 1` 作废在途回执），重复解绑幂等；C 端 bindings 立即剔除。
 * @file server/api/admin/talent/children/[id]/unbind.post.ts
 * @route POST /api/admin/talent/children/:id/unbind
 */
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import { unbindTalentMemberChild } from "~~/server/utils/talent-member-api";
import { sanitizeTalentChildRecord } from "~~/server/utils/talent-member";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

export default defineEventHandler(async (event) => {
  await requirePermission(event, "talent:child:unbind");
  return withOperLog(
    event,
    { title: "解绑子女档案", operType: OperType.UPDATE },
    async () => {
      const id = String(getRouterParam(event, "id") || "").trim();
      const pb = await getAdminPB();
      const user = await getCurrentUser(event);
      const { child, alreadyUnbound } = await unbindTalentMemberChild(pb, id, {
        userId: String(user.id || ""),
      });
      return success(
        {
          child: sanitizeTalentChildRecord(child),
          alreadyUnbound,
        },
        alreadyUnbound ? "该子女已解绑" : "已解绑",
      );
    },
  );
});