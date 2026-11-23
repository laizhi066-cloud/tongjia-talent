/**
 * @description 保存方向配置：要素 / 档位子集 / 默认档位全面校验，`version + 1`；编码不可改。
 * @file server/api/admin/talent/directions/[id].put.ts
 * @route PUT /api/admin/talent/directions/:id
 */
import type { TalentDirection } from "~~/shared/types/talent-rule";
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import {
  assertTalentDirectionCodeImmutable,
  loadTalentDirectionValidationContext,
  nextTalentDirectionVersion,
  talentDirectionRequirements,
  talentDirectionUpdateSchema,
  validateTalentDirectionConfig,
} from "~~/server/utils/talent-rule";
import { validateBody } from "~~/server/utils/validation";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

export default defineEventHandler(async (event) => {
  const body = await validateBody(event, talentDirectionUpdateSchema, { statusCode: 422 });
  await requirePermission(event, "talent:direction:edit");
  return withOperLog(
    event,
    { title: "保存方向配置", operType: OperType.UPDATE },
    async () => {
      const id = String(getRouterParam(event, "id") || "").trim();
      const pb = await getAdminPB();
      const user = await getCurrentUser(event);
      const current = await pb
        .collection("talent_directions")
        .getOne<TalentDirection>(id, { $autoCancel: false })
        .catch(() => null);
      if (!current) throw createError({ statusCode: 404, message: "培养方向不存在" });
      assertTalentDirectionCodeImmutable(current.code, body.code);
      const context = await loadTalentDirectionValidationContext(pb);
      const normalized = validateTalentDirectionConfig(
        {
          requirements: body.requirements ?? talentDirectionRequirements(current),
          tierIds:
            body.tierIds ??
            (Array.isArray(current.tierIds) ? current.tierIds.map(String) : []),
          defaultTierId: body.defaultTierId ?? String(current.defaultTierId || ""),
        },
        context,
      );
      const record = await pb.collection("talent_directions").update<TalentDirection>(
        current.id,
        {
          name: body.name ?? current.name,
          description: body.description ?? current.description ?? "",
          icon: body.icon ?? current.icon ?? "",
          requirements: normalized.requirements,
          tierIds: normalized.tierIds,
          defaultTierId: normalized.defaultTierId,
          aliases:
            body.aliases ??
            (Array.isArray(current.aliases) ? current.aliases.map(String) : []),
          status: body.status ?? current.status,
          version: nextTalentDirectionVersion(current.version),
          updatedBy: user.id,
        },
        { $autoCancel: false },
      );
      return success(record, "方向配置已保存，已生成新版本");
    },
  );
});