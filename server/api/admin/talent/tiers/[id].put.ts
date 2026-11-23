/**
 * @description 编辑档位 / 停用启用 / 设全局默认：名称全局唯一（含停用），全局默认必须启用且仅 1 条。
 *   不提供新增 / 删除接口（spec §3.6）。
 * @file server/api/admin/talent/tiers/[id].put.ts
 * @route PUT /api/admin/talent/tiers/:id
 */
import type { TalentTier } from "~~/shared/types/talent-rule";
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import {
  buildTalentTierDefaultUpdates,
  conflictTalentRule,
  invalidTalentRule,
  talentTierUpdateSchema,
} from "~~/server/utils/talent-rule";
import { validateBody } from "~~/server/utils/validation";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

export default defineEventHandler(async (event) => {
  const body = await validateBody(event, talentTierUpdateSchema, { statusCode: 422 });
  await requirePermission(event, "talent:tier:edit");
  return withOperLog(
    event,
    { title: "编辑目标档位", operType: OperType.UPDATE },
    async () => {
      const id = String(getRouterParam(event, "id") || "").trim();
      const pb = await getAdminPB();
      const user = await getCurrentUser(event);
      const tiers = await pb.collection("talent_tiers").getFullList<TalentTier>({
        sort: "sortOrder",
        $autoCancel: false,
      });
      const target = tiers.find((tier) => tier.id === id);
      if (!target) throw createError({ statusCode: 404, message: "档位不存在" });
      if (
        body.name !== undefined &&
        tiers.some((tier) => tier.id !== target.id && tier.name === body.name)
      )
        throw conflictTalentRule(`档位名称已存在：${body.name}`);
      const nextStatus = body.status ?? target.status;
      if (target.isDefault && nextStatus !== "1")
        throw invalidTalentRule("全局默认档位不能停用，请先设置其他档位为默认");
      if (body.isDefault === true) {
        if (nextStatus !== "1") throw invalidTalentRule("停用的档位不能设为全局默认");
        // 先撤销其他档位的默认标记，再写目标行，避免部分唯一索引出现两条 true。
        for (const update of buildTalentTierDefaultUpdates(tiers, target.id)) {
          if (update.id === target.id) continue;
          const row = tiers.find((tier) => tier.id === update.id);
          if (row?.isDefault === update.isDefault) continue;
          await pb
            .collection("talent_tiers")
            .update(update.id, { isDefault: update.isDefault }, { $autoCancel: false });
        }
      }
      if (body.isDefault === false && target.isDefault)
        throw invalidTalentRule("请通过设置其他档位为全局默认来切换默认档位");
      const updated = await pb.collection("talent_tiers").update<TalentTier>(
        target.id,
        {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.teacher !== undefined ? { teacher: body.teacher } : {}),
          ...(body.freq !== undefined ? { freq: body.freq } : {}),
          ...(body.headline !== undefined ? { headline: body.headline } : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
          ...(body.isDefault !== undefined ? { isDefault: body.isDefault } : {}),
          ...(body.status !== undefined ? { status: body.status } : {}),
          updatedBy: user.id,
        },
        { $autoCancel: false },
      );
      return success(updated, "保存成功");
    },
  );
});