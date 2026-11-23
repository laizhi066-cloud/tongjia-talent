/**
 * @description 分级执行导入：幂等 upsert（唯一键 `code`），通过行写入、失败行跳过并返回明细。
 *   提交时重新解析并二次校验，以提交结果为准；oper_logs 只记摘要（ADR 0001-D4）。
 * @file server/api/admin/talent/levels/import.post.ts
 * @route POST /api/admin/talent/levels/import
 */
import type { TalentLevel } from "~~/shared/types/talent-rule";
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import {
  readTalentRuleCsvRequest,
  talentRuleRowErrorMessage,
} from "~~/server/utils/talent-rule-api";
import {
  buildTalentLevelImportRecord,
  parseTalentLevelCsv,
} from "~~/server/utils/talent-rule-csv";
import { getNewTalentLevels } from "~~/server/utils/talent-rule";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

export default defineEventHandler(async (event) => {
  await requirePermission(event, "talent:rule:import");
  return withOperLog(
    event,
    {
      title: "分级导入",
      operType: OperType.IMPORT,
      summary: (result) => {
        const data = (result as {
          data: { total: number; success: number; failed: number };
        }).data;
        return `总 ${data.total} / 成功 ${data.success} / 失败 ${data.failed}`;
      },
    },
    async () => {
      const { fileName, csv } = await readTalentRuleCsvRequest(event);
      const pb = await getAdminPB();
      const user = await getCurrentUser(event);
      const levels = await getNewTalentLevels(pb);
      const preview = parseTalentLevelCsv(csv, {
        existingLevelCodes: new Set(levels.map((level) => level.code)),
      });
      const failures: Array<{ rowNumber: number; errors: string[] }> = [];
      let successCount = 0;
      for (const row of preview.rows) {
        if (!row.ok) {
          failures.push({ rowNumber: row.rowNumber, errors: row.errors });
          continue;
        }
        try {
          const data = buildTalentLevelImportRecord(row);
          const current = levels.find((level) => level.code === row.code);
          if (current) {
            await pb
              .collection("talent_levels")
              .update(
                current.id,
                { ...data, updatedBy: user.id },
                { $autoCancel: false },
              );
          } else {
            const created = await pb
              .collection("talent_levels")
              .create<TalentLevel>(
                { ...data, createdBy: user.id, updatedBy: user.id },
                { $autoCancel: false },
              );
            levels.push(created);
          }
          successCount += 1;
        } catch (error) {
          failures.push({
            rowNumber: row.rowNumber,
            errors: [talentRuleRowErrorMessage(error)],
          });
        }
      }
      return success(
        { fileName, total: preview.total, success: successCount, failed: failures.length, failures },
        failures.length
          ? `导入完成：成功 ${successCount} 行 / 失败 ${failures.length} 行`
          : `导入成功：${successCount} 行`,
      );
    },
  );
});