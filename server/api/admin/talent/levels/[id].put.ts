/**
 * @description 编辑分级：编码不可改；名称 / 级序 / 范围 / 色位 / 状态可改，级序唯一。
 * @file server/api/admin/talent/levels/[id].put.ts
 * @route PUT /api/admin/talent/levels/:id
 */
import type { TalentLevel } from "~~/shared/types/talent-rule";
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import {
  assertTalentLevelCodeImmutable,
  assertTalentLevelUniqueness,
  getNewTalentLevels,
  isNewTalentLevel,
  talentLevelUpdateSchema,
} from "~~/server/utils/talent-rule";
import { validateBody } from "~~/server/utils/validation";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

export default defineEventHandler(async (event) => {
  const body = await validateBody(event, talentLevelUpdateSchema, { statusCode: 422 });
  await requirePermission(event, "talent:rule:edit");
  return withOperLog(
    event,
    { title: "编辑分级", operType: OperType.UPDATE },
    async () => {
      const id = String(getRouterParam(event, "id") || "").trim();
      const pb = await getAdminPB();
      const user = await getCurrentUser(event);
      const current = await pb
        .collection("talent_levels")
        .getOne<TalentLevel>(id, { $autoCancel: false })
        .catch(() => null);
      // 双语义期：旧行（code 为空）不属于新分级，按不存在处理。
      if (!current || !isNewTalentLevel(current))
        throw createError({ statusCode: 404, message: "分级不存在" });
      assertTalentLevelCodeImmutable(current.code, body.code);
      const existing = await getNewTalentLevels(pb);
      assertTalentLevelUniqueness(
        { sortOrder: body.sortOrder },
        existing,
        current.id,
      );
      const record = await pb.collection("talent_levels").update<TalentLevel>(
        current.id,
        {
          ...(body.name !== undefined
            ? { name: body.name, levelName: body.name }
            : {}),
          ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
          ...(body.range !== undefined ? { range: body.range } : {}),
          ...(body.tone !== undefined ? { tone: body.tone } : {}),
          ...(body.status !== undefined ? { status: body.status } : {}),
          updatedBy: user.id,
        },
        { $autoCancel: false },
      );
      return success(record, "保存成功");
    },
  );
});