/**
 * @description 重新查询子女结果：`querying` 或 30s 节流期内幂等返回（200、
 *   `accepted=false`、`throttled=true`）；`found` 再查 422、已解绑 / 家长停用 409。
 * @file server/api/admin/talent/children/[id]/query.post.ts
 * @route POST /api/admin/talent/children/:id/query
 */
import type { TalentChildRecord } from "~~/shared/types/talent-member";
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import { submitTalentChildQuery } from "~~/server/utils/talent-member-query";
import { sanitizeTalentChildRecord } from "~~/server/utils/talent-member";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

export default defineEventHandler(async (event) => {
  await requirePermission(event, "talent:child:query");
  return withOperLog(
    event,
    { title: "重新查询子女结果", operType: OperType.UPDATE },
    async () => {
      const id = String(getRouterParam(event, "id") || "").trim();
      const pb = await getAdminPB();
      const result = await submitTalentChildQuery(id);
      const latest = await pb
        .collection("talent_children")
        .getOne<TalentChildRecord>(id, { $autoCancel: false });
      return success(
        {
          child: sanitizeTalentChildRecord(latest),
          accepted: result.accepted,
          throttled: result.throttled,
        },
        result.accepted
          ? "已发起查询"
          : "查询进行中或处于节流期，请稍候",
      );
    },
  );
});