/**
 * @description 分库首次同步入口：body `{ gender, age }`，按唯一键 `gender+age` upsert 分库后再拉取要素。
 * @file server/api/admin/talent/factor-libraries/sync.post.ts
 * @route POST /api/admin/talent/factor-libraries/sync
 */
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import { talentFactorLibrarySyncSchema } from "~~/server/utils/talent-rule";
import {
  syncTalentFactorLibrary,
  talentFactorLibrarySyncSummaryText,
  type TalentFactorLibrarySyncSummary,
} from "~~/server/utils/talent-rule-sync";
import { validateBody } from "~~/server/utils/validation";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

export default defineEventHandler(async (event) => {
  const body = await validateBody(event, talentFactorLibrarySyncSchema, { statusCode: 422 });
  await requirePermission(event, "talent:factor:sync");
  return withOperLog(
    event,
    {
      title: "潜质要素库同步",
      operType: OperType.UPDATE,
      summary: (result) =>
        talentFactorLibrarySyncSummaryText(
          (result as { data: TalentFactorLibrarySyncSummary }).data,
        ),
    },
    async () => {
      const pb = await getAdminPB();
      const user = await getCurrentUser(event);
      const summary = await syncTalentFactorLibrary(
        pb,
        { gender: body.gender, age: body.age },
        { syncedBy: user.id },
      );
      return success(
        summary,
        `已同步「${summary.gender === "female" ? "女" : "男"} · ${summary.age} 岁」潜质要素 ${summary.itemCount} 项`,
      );
    },
  );
});