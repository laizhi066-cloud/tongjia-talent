/**
 * @description 分级导入预览：只解析与校验，不落库、不留中间批次（ADR 0001-D4）。
 *   失败行返回行号与原因；同批重复编码在预览标注「后行覆盖前行」。
 * @file server/api/admin/talent/levels/import/preview.post.ts
 * @route POST /api/admin/talent/levels/import/preview
 */
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import { readTalentRuleCsvRequest } from "~~/server/utils/talent-rule-api";
import { parseTalentLevelCsv } from "~~/server/utils/talent-rule-csv";
import { getNewTalentLevels } from "~~/server/utils/talent-rule";

export default defineEventHandler(async (event) => {
  await requirePermission(event, "talent:rule:import");
  const { fileName, csv } = await readTalentRuleCsvRequest(event);
  const pb = await getAdminPB();
  const levels = await getNewTalentLevels(pb);
  const preview = parseTalentLevelCsv(csv, {
    existingLevelCodes: new Set(levels.map((level) => level.code)),
  });
  return success(
    { fileName, ...preview },
    preview.failed
      ? `校验完成：通过 ${preview.passed} 行 / 失败 ${preview.failed} 行`
      : `校验完成：${preview.passed} 行全部通过`,
  );
});