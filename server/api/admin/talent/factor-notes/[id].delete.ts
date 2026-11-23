/**
 * @description 删除固定注解：历史报告使用发布时快照，删除不影响已发布报告（spec §4.3）。
 * @file server/api/admin/talent/factor-notes/[id].delete.ts
 * @route DELETE /api/admin/talent/factor-notes/:id
 */
import type { TalentFactorNote } from "~~/shared/types/talent-rule";
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

export default defineEventHandler(async (event) => {
  await requirePermission(event, "talent:rule:delete");
  return withOperLog(
    event,
    { title: "删除固定注解", operType: OperType.DELETE },
    async () => {
      const id = String(getRouterParam(event, "id") || "").trim();
      const pb = await getAdminPB();
      const note = await pb
        .collection("talent_factor_notes")
        .getOne<TalentFactorNote>(id, { $autoCancel: false })
        .catch(() => null);
      if (!note) throw createError({ statusCode: 404, message: "固定注解不存在" });
      await pb.collection("talent_factor_notes").delete(note.id, { $autoCancel: false });
      return success({ id: note.id }, "删除成功");
    },
  );
});