/**
 * @description 删除培养方向：被报告 selections 引用时返回 409「只允许停用」；
 *   `talent_reports` 集合不存在时按无引用处理（M3 未交付的渐进式处理）。
 * @file server/api/admin/talent/directions/[id].delete.ts
 * @route DELETE /api/admin/talent/directions/:id
 */
import type { TalentDirection } from "~~/shared/types/talent-rule";
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import { assertTalentDirectionDeletableInStore } from "~~/server/utils/talent-rule";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

export default defineEventHandler(async (event) => {
  await requirePermission(event, "talent:direction:delete");
  return withOperLog(
    event,
    { title: "删除培养方向", operType: OperType.DELETE },
    async () => {
      const id = String(getRouterParam(event, "id") || "").trim();
      const pb = await getAdminPB();
      const direction = await pb
        .collection("talent_directions")
        .getOne<TalentDirection>(id, { $autoCancel: false })
        .catch(() => null);
      if (!direction) throw createError({ statusCode: 404, message: "培养方向不存在" });
      await assertTalentDirectionDeletableInStore(pb, direction.id);
      await pb.collection("talent_directions").delete(direction.id, { $autoCancel: false });
      return success({ id: direction.id }, "删除成功");
    },
  );
});