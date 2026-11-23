/**
 * @description 导出当前分库潜质要素 CSV：行 = 要素 × 分级 × 变体，列同外部文库 9 列，带 BOM。
 *   未同步分库返回 409「该库尚未同步」（spec §7）。
 * @file server/api/admin/talent/factors/export.get.ts
 * @route GET /api/admin/talent/factors/export
 */
import type { TalentFactor, TalentFactorLibrary } from "~~/shared/types/talent-rule";
import { escapeFilterValue, getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import {
  buildTalentFactorLibraryExportCsv,
  talentRuleDownloadHeaders,
} from "~~/server/utils/talent-rule-api";
import {
  assertTalentFactorLibrarySynced,
} from "~~/server/utils/talent-rule-source";
import { getNewTalentLevels } from "~~/server/utils/talent-rule";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

export default defineEventHandler(async (event) => {
  await requirePermission(event, "talent:factor:export");
  let exportedRows = 0;
  return withOperLog(
    event,
    {
      title: "潜质要素导出",
      operType: OperType.EXPORT,
      summary: () => `${exportedRows} 行`,
    },
    async () => {
      const query = getQuery(event);
      const libraryId = String(query.libraryId || "").trim();
      if (!libraryId)
        throw createError({ statusCode: 422, message: "libraryId 不能为空" });
      const pb = await getAdminPB();
      const library = await pb
        .collection("talent_factor_libraries")
        .getOne<TalentFactorLibrary>(libraryId, { $autoCancel: false })
        .catch(() => null);
      if (!library) throw createError({ statusCode: 404, message: "分库不存在" });
      assertTalentFactorLibrarySynced(library);
      const filters = [`libraryId = "${escapeFilterValue(library.id)}"`];
      const category = String(query.category || "").trim();
      if (category) {
        if (!/^[A-F]$/.test(category))
          throw createError({ statusCode: 422, message: "分册编码无效" });
        filters.push(`category = "${escapeFilterValue(category)}"`);
      }
      const keyword = String(query.keyword || "").trim();
      if (keyword)
        filters.push(
          `(code ~ "${escapeFilterValue(keyword)}" || name ~ "${escapeFilterValue(keyword)}")`,
        );
      const factors = await pb.collection("talent_factors").getFullList<TalentFactor>({
        filter: filters.join(" && "),
        sort: "sortOrder",
        $autoCancel: false,
      });
      const levels = await getNewTalentLevels(pb);
      const csv = buildTalentFactorLibraryExportCsv({
        gender: library.gender,
        age: Number(library.age),
        factors,
        levels,
      });
      exportedRows = factors.length * levels.length * 3;
      talentRuleDownloadHeaders(
        event,
        `talent-factor-library-${library.gender}-${Number(library.age)}.csv`,
      );
      return csv;
    },
  );
});