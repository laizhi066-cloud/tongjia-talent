/**
 * @description 固定注解导出 CSV：按当前筛选（分级 / 要素编码 / 名称 / 正文关键字）导出 9 列，
 *   要素名与分级名取当前值（不落快照），带 BOM。
 * @file server/api/admin/talent/factor-notes/export.get.ts
 * @route GET /api/admin/talent/factor-notes/export
 */
import type { TalentFactorNote } from "~~/shared/types/talent-rule";
import { escapeFilterValue, getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import {
  buildTalentFactorNoteExportCsv,
  loadTalentRuleLookups,
  talentRuleDownloadHeaders,
} from "~~/server/utils/talent-rule-api";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

export default defineEventHandler(async (event) => {
  await requirePermission(event, "talent:rule:export");
  let exportedRows = 0;
  return withOperLog(
    event,
    { title: "固定注解导出", operType: OperType.EXPORT, summary: () => `${exportedRows} 行` },
    async () => {
      const query = getQuery(event);
      const pb = await getAdminPB();
      const lookups = await loadTalentRuleLookups(pb);
      const filters: string[] = [];
      const factorCode = String(query.factorCode || "").trim();
      if (factorCode)
        filters.push(`factorCode ~ "${escapeFilterValue(factorCode)}"`);
      const keyword = String(query.keyword || "").trim();
      if (keyword)
        filters.push(
          `(code ~ "${escapeFilterValue(keyword)}" || note ~ "${escapeFilterValue(keyword)}")`,
        );
      const name = String(query.name || "").trim();
      if (name) {
        const matchedCodes = [...lookups.factorNames.entries()]
          .filter(([, factorName]) => factorName.includes(name))
          .map(([code]) => code);
        filters.push(
          matchedCodes.length
            ? `(${matchedCodes.map((code) => `factorCode = "${escapeFilterValue(code)}"`).join(" || ")})`
            : 'id = "__none__"',
        );
      }
      const levelCode = String(query.levelCode || "").trim();
      if (levelCode) {
        if (!/^LV\d{1,2}$/.test(levelCode))
          throw createError({ statusCode: 422, message: "分级编码格式必须为 LVn" });
        filters.push(`levelCode = "${escapeFilterValue(levelCode)}"`);
      }
      const notes = await pb.collection("talent_factor_notes").getFullList<TalentFactorNote>({
        filter: filters.length ? filters.join(" && ") : undefined,
        sort: "code",
        $autoCancel: false,
      });
      const csv = buildTalentFactorNoteExportCsv(
        notes.map((note) => ({
          code: note.code,
          factorCode: note.factorCode,
          factorName: lookups.factorNames.get(note.factorCode) || note.factorCode,
          levelCode: note.levelCode,
          levelName: lookups.levelNames.get(note.levelCode) || note.levelCode,
          note: note.note || "",
          ageRange: note.ageRange || "",
          gender: note.gender,
          status: String(note.status || "1"),
        })),
      );
      exportedRows = notes.length;
      talentRuleDownloadHeaders(event, "talent-factor-notes.csv");
      return csv;
    },
  );
});