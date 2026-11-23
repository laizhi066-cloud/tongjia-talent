/**
 * @description 停用 / 启用培养方向：独立状态接口，不改配置版本（spec §4.2）。
 * @file server/api/admin/talent/directions/[id]/status.put.ts
 * @route PUT /api/admin/talent/directions/:id/status
 */
import { z } from "zod";
import type { TalentDirection } from "~~/shared/types/talent-rule";
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import { validateBody } from "~~/server/utils/validation";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

const bodySchema = z.object({ status: z.enum(["0", "1"]) });

export default defineEventHandler(async (event) => {
  const body = await validateBody(event, bodySchema, { statusCode: 422 });
  await requirePermission(event, "talent:direction:edit");
  return withOperLog(
    event,
    { title: "培养方向状态", operType: OperType.UPDATE },
    async () => {
      const id = String(getRouterParam(event, "id") || "").trim();
      const pb = await getAdminPB();
      const user = await getCurrentUser(event);
      const current = await pb
        .collection("talent_directions")
        .getOne<TalentDirection>(id, { $autoCancel: false })
        .catch(() => null);
      if (!current) throw createError({ statusCode: 404, message: "培养方向不存在" });
      const record = await pb.collection("talent_directions").update<TalentDirection>(
        current.id,
        { status: body.status, updatedBy: user.id },
        { $autoCancel: false },
      );
      return success(record, body.status === "1" ? "已启用" : "已停用");
    },
  );
});