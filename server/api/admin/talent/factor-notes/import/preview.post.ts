/**
 * @description 固定注解导入预览：只解析与校验，不落库（ADR 0001-D4）。
 *   校验要素编码存在于启用分库、分级启用、正文非空；失败行带行号与原因。
 * @file server/api/admin/talent/factor-notes/import/preview.post.ts
 * @route POST /api/admin/talent/factor-notes/import/preview
 */
import type { TalentFactorNote } from "~~/shared/types/talent-rule";
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import { readTalentRuleCsvRequest } from "~~/server/utils/talent-rule-api";
import { loadTalentDirectionValidationContext } from "~~/server/utils/talent-rule";
import { parseTalentFactorNoteCsv } from "~~/server/utils/talent-rule-csv";

export default defineEventHandler(async (event) => {
  await requirePermission(event, "talent:rule:import");
  const { fileName, csv } = await readTalentRuleCsvRequest(event);
  const pb = await getAdminPB();
  const context = await loadTalentDirectionValidationContext(pb);
  const existingNotes = await pb
    .collection("talent_factor_notes")
    .getFullList<Pick<TalentFactorNote, "code">>({
      fields: "code",
      $autoCancel: false,
    });
  const preview = parseTalentFactorNoteCsv(csv, {
    factorCategories: context.factorCategories,
    enabledLevelCodes: context.enabledLevelCodes,
    existingNoteCodes: new Set(existingNotes.map((note) => note.code)),
  });
  return success(
    { fileName, ...preview },
    preview.failed
      ? `校验完成：通过 ${preview.passed} 行 / 失败 ${preview.failed} 行`
      : `校验完成：${preview.passed} 行全部通过`,
  );
});