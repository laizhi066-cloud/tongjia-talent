/**
 * @description 已同步分库的再同步入口：provider 拉取 → 幂等 upsert 要素与四段槽位、刷新分库计数。
 *   未同步过的库返回 409「该库尚未同步」，首次同步请走 `POST /factor-libraries/sync`。
 * @file server/api/admin/talent/factor-libraries/[id]/sync.post.ts
 * @route POST /api/admin/talent/factor-libraries/:id/sync
 */
import type { TalentFactorLibrary } from "~~/shared/types/talent-rule";
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import {
  syncTalentFactorLibrary,
  talentFactorLibrarySyncSummaryText,
  type TalentFactorLibrarySyncSummary,
} from "~~/server/utils/talent-rule-sync";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

export default defineEventHandler(async (event) => {
  await requirePermission(event, "talent:factor:sync");
  return withOperLog(
    event,
    {
      title: "潜质要素库再同步",
      operType: OperType.UPDATE,
      summary: (result) =>
        talentFactorLibrarySyncSummaryText(
          (result as { data: TalentFactorLibrarySyncSummary }).data,
        ),
    },
    async () => {
      const id = String(getRouterParam(event, "id") || "").trim();
      const pb = await getAdminPB();
      const user = await getCurrentUser(event);
      const library = await pb
        .collection("talent_factor_libraries")
        .getOne<TalentFactorLibrary>(id, { $autoCancel: false })
        .catch(() => null);
      if (!library) throw createError({ statusCode: 404, message: "分库不存在" });
      const summary = await syncTalentFactorLibrary(
        pb,
        { gender: library.gender, age: Number(library.age) },
        { libraryId: library.id, syncedBy: user.id, requireExistingSynced: true },
      );
      return success(
        summary,
        `已更新「${summary.gender === "female" ? "女" : "男"} · ${summary.age} 岁」潜质要素 ${summary.itemCount} 项`,
      );
    },
  );
});