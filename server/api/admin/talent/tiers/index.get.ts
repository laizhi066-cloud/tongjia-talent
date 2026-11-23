/**
 * @description 目标档位列表：固定 4 档，含全局默认标记；不提供新增 / 删除。
 * @file server/api/admin/talent/tiers/index.get.ts
 * @route GET /api/admin/talent/tiers
 */
import type { TalentTier } from "~~/shared/types/talent-rule";
import { paginatedQuery } from "~~/server/utils/crud";
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import { withTalentRulePagination } from "~~/server/utils/talent-rule-api";

export default defineEventHandler(async (event) => {
  await requirePermission(event, "talent:tier:list");
  const result = await paginatedQuery<TalentTier>(
    "talent_tiers",
    withTalentRulePagination(getQuery(event)),
    "",
    { sort: "sortOrder" },
  );
  const pb = await getAdminPB();
  const tiers = await pb.collection("talent_tiers").getFullList<TalentTier>({
    sort: "sortOrder",
    $autoCancel: false,
  });
  const defaultTier = tiers.find((tier) => tier.isDefault === true) || null;
  return success(
    {
      ...result.data,
      defaultTierId: defaultTier?.id || "",
      defaultTierName: defaultTier?.name || "",
    },
    "获取成功",
  );
});