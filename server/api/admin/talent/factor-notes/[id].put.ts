/**
 * @description 编辑固定注解：编号 / 要素 / 分级不可改，可改正文、年龄条件、性别条件、状态。
 * @file server/api/admin/talent/factor-notes/[id].put.ts
 * @route PUT /api/admin/talent/factor-notes/:id
 */
import type { TalentFactorNote } from "~~/shared/types/talent-rule";
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import {
  assertTalentFactorNoteIdentityImmutable,
  talentFactorNoteUpdateSchema,
} from "~~/server/utils/talent-rule";
import { validateBody } from "~~/server/utils/validation";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

export default defineEventHandler(async (event) => {
  const body = await validateBody(event, talentFactorNoteUpdateSchema, { statusCode: 422 });
  await requirePermission(event, "talent:rule:edit");
  return withOperLog(
    event,
    { title: "编辑固定注解", operType: OperType.UPDATE },
    async () => {
      const id = String(getRouterParam(event, "id") || "").trim();
      const pb = await getAdminPB();
      const user = await getCurrentUser(event);
      const current = await pb
        .collection("talent_factor_notes")
        .getOne<TalentFactorNote>(id, { $autoCancel: false })
        .catch(() => null);
      if (!current) throw createError({ statusCode: 404, message: "固定注解不存在" });
      assertTalentFactorNoteIdentityImmutable(current, body);
      const record = await pb
        .collection("talent_factor_notes")
        .update<TalentFactorNote>(
          current.id,
          {
            ...(body.note !== undefined ? { note: body.note } : {}),
            ...(body.ageRange !== undefined ? { ageRange: body.ageRange } : {}),
            ...(body.gender !== undefined ? { gender: body.gender } : {}),
            ...(body.status !== undefined ? { status: body.status } : {}),
            updatedBy: user.id,
          },
          { $autoCancel: false },
        );
      return success(record, "保存成功");
    },
  );
});