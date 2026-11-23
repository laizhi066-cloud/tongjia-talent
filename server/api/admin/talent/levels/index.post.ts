/**
 * @description 新增分级：`code` 唯一、`sortOrder` 唯一；新行镜像旧字段以兼容旧唯一索引（ADR 0001-D1）。
 * @file server/api/admin/talent/levels/index.post.ts
 * @route POST /api/admin/talent/levels
 */
import type { TalentLevel } from "~~/shared/types/talent-rule";
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import {
  assertTalentLevelUniqueness,
  getNewTalentLevels,
  talentLevelCreateSchema,
} from "~~/server/utils/talent-rule";
import { validateBody } from "~~/server/utils/validation";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

export default defineEventHandler(async (event) => {
  const body = await validateBody(event, talentLevelCreateSchema, { statusCode: 422 });
  await requirePermission(event, "talent:rule:add");
  return withOperLog(
    event,
    { title: "新增分级", operType: OperType.INSERT },
    async () => {
      const pb = await getAdminPB();
      const user = await getCurrentUser(event);
      const existing = await getNewTalentLevels(pb);
      assertTalentLevelUniqueness(
        { code: body.code, sortOrder: body.sortOrder },
        existing,
      );
      const record = await pb.collection("talent_levels").create<TalentLevel>(
        {
          code: body.code,
          name: body.name,
          sortOrder: body.sortOrder,
          range: body.range || "",
          tone: body.tone || "default",
          status: body.status || "1",
          // 旧字段镜像：旧唯一索引 (elementId, levelCode) 仍在，新行键为 ("", LVn)。
          levelCode: body.code,
          levelName: body.name,
          createdBy: user.id,
          updatedBy: user.id,
        },
        { $autoCancel: false },
      );
      return success(record, "新增成功");
    },
  );
});