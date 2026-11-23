/**
 * @description 删除分级：被固定注解或方向 requirements 引用时返回 409「只允许停用」。
 * @file server/api/admin/talent/levels/[id].delete.ts
 * @route DELETE /api/admin/talent/levels/:id
 */
import type { TalentLevel } from "~~/shared/types/talent-rule";
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import {
  assertTalentLevelDeletableInStore,
  isNewTalentLevel,
} from "~~/server/utils/talent-rule";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

export default defineEventHandler(async (event) => {
  await requirePermission(event, "talent:rule:delete");
  return withOperLog(
    event,
    { title: "删除分级", operType: OperType.DELETE },
    async () => {
      const id = String(getRouterParam(event, "id") || "").trim();
      const pb = await getAdminPB();
      const level = await pb
        .collection("talent_levels")
        .getOne<TalentLevel>(id, { $autoCancel: false })
        .catch(() => null);
      if (!level || !isNewTalentLevel(level))
        throw createError({ statusCode: 404, message: "分级不存在" });
      await assertTalentLevelDeletableInStore(pb, level);
      await pb.collection("talent_levels").delete(level.id, { $autoCancel: false });
      return success({ id: level.id }, "删除成功");
    },
  );
});