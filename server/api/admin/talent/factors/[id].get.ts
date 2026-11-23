/**
 * @description 潜质要素详情：含 12 槽位 × 四段文案与当前 4 档缓存键，页面只读。
 * @file server/api/admin/talent/factors/[id].get.ts
 * @route GET /api/admin/talent/factors/:id
 */
import type { TalentFactor } from "~~/shared/types/talent-rule";
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import { getNewTalentLevels } from "~~/server/utils/talent-rule";

export default defineEventHandler(async (event) => {
  await requirePermission(event, "talent:factor:list");
  const id = String(getRouterParam(event, "id") || "").trim();
  const pb = await getAdminPB();
  const factor = await pb
    .collection("talent_factors")
    .getOne<TalentFactor>(id, { $autoCancel: false })
    .catch(() => null);
  if (!factor) throw createError({ statusCode: 404, message: "要素不存在" });
  // 文案弹层按当前 4 档渲染页签，分级改名后按 code 取名称，不落快照。
  const levels = await getNewTalentLevels(pb);
  return success(
    {
      ...factor,
      levels: levels.map((level) => ({
        code: level.code,
        name: level.name,
        sortOrder: level.sortOrder,
      })),
    },
    "获取成功",
  );
});