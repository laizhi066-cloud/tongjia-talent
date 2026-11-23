/**
 * @description 培养方向详情：含 requirements / tierIds 展开后的要素名、分级名与档位名。
 * @file server/api/admin/talent/directions/[id].get.ts
 * @route GET /api/admin/talent/directions/:id
 */
import type { TalentDirection } from "~~/shared/types/talent-rule";
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import {
  buildTalentDirectionView,
  loadTalentRuleLookups,
} from "~~/server/utils/talent-rule-api";

export default defineEventHandler(async (event) => {
  await requirePermission(event, "talent:direction:list");
  const id = String(getRouterParam(event, "id") || "").trim();
  const pb = await getAdminPB();
  const direction = await pb
    .collection("talent_directions")
    .getOne<TalentDirection>(id, { $autoCancel: false })
    .catch(() => null);
  if (!direction) throw createError({ statusCode: 404, message: "培养方向不存在" });
  const lookups = await loadTalentRuleLookups(pb);
  return success(
    { ...direction, ...buildTalentDirectionView(direction, lookups) },
    "获取成功",
  );
});