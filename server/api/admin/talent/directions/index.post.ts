/**
 * @description 新增培养方向：`version = 1`；requirements / tierIds / defaultTierId 由服务层统一校验。
 *   编码缺省时按 `DIR-xxx` 序号生成，唯一冲突返回 409。
 * @file server/api/admin/talent/directions/index.post.ts
 * @route POST /api/admin/talent/directions
 */
import type { TalentDirection } from "~~/shared/types/talent-rule";
import { escapeFilterValue, getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import {
  conflictTalentRule,
  loadTalentDirectionValidationContext,
  talentDirectionCreateSchema,
  validateTalentDirectionConfig,
} from "~~/server/utils/talent-rule";
import { generateTalentDirectionCode } from "~~/server/utils/talent-rule-api";
import { validateBody } from "~~/server/utils/validation";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

export default defineEventHandler(async (event) => {
  const body = await validateBody(event, talentDirectionCreateSchema, { statusCode: 422 });
  await requirePermission(event, "talent:direction:add");
  return withOperLog(
    event,
    { title: "新增培养方向", operType: OperType.INSERT },
    async () => {
      const pb = await getAdminPB();
      const user = await getCurrentUser(event);
      const context = await loadTalentDirectionValidationContext(pb);
      const normalized = validateTalentDirectionConfig(
        {
          requirements: body.requirements,
          tierIds: body.tierIds,
          defaultTierId: body.defaultTierId,
        },
        context,
      );
      const code = String(body.code || "").trim() || (await generateTalentDirectionCode(pb));
      const existing = await pb
        .collection("talent_directions")
        .getFirstListItem(`code = "${escapeFilterValue(code)}"`, { $autoCancel: false })
        .catch(() => null);
      if (existing) throw conflictTalentRule(`方向编码已存在：${code}`);
      const record = await pb.collection("talent_directions").create<TalentDirection>(
        {
          code,
          name: body.name,
          description: body.description || "",
          icon: body.icon || "",
          requirements: normalized.requirements,
          tierIds: normalized.tierIds,
          defaultTierId: normalized.defaultTierId,
          aliases: body.aliases || [],
          version: 1,
          status: body.status || "1",
          createdBy: user.id,
          updatedBy: user.id,
        },
        { $autoCancel: false },
      );
      return success(record, "新增成功");
    },
  );
});