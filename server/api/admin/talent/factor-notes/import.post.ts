/**
 * @description 固定注解执行导入：唯一键 = 要素编码 + 分级编码，幂等 upsert 覆盖正文 / 条件 / 状态；
 *   通过行写入、失败行跳过并返回明细；oper_logs 只记摘要（ADR 0001-D4）。
 * @file server/api/admin/talent/factor-notes/import.post.ts
 * @route POST /api/admin/talent/factor-notes/import
 */
import type { TalentFactorNote } from "~~/shared/types/talent-rule";
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import {
  readTalentRuleCsvRequest,
  talentRuleRowErrorMessage,
} from "~~/server/utils/talent-rule-api";
import { loadTalentDirectionValidationContext } from "~~/server/utils/talent-rule";
import {
  buildTalentFactorNoteImportRecord,
  parseTalentFactorNoteCsv,
} from "~~/server/utils/talent-rule-csv";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

export default defineEventHandler(async (event) => {
  await requirePermission(event, "talent:rule:import");
  return withOperLog(
    event,
    {
      title: "固定注解导入",
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
      const context = await loadTalentDirectionValidationContext(pb);
      const existingList = await pb.collection("talent_factor_notes").getFullList<TalentFactorNote>({
        fields: "id,code",
        $autoCancel: false,
      });
      const existingByCode = new Map(
        existingList.map((note) => [note.code, note]),
      );
      const preview = parseTalentFactorNoteCsv(csv, {
        factorCategories: context.factorCategories,
        enabledLevelCodes: context.enabledLevelCodes,
        existingNoteCodes: new Set(existingByCode.keys()),
      });
      const failures: Array<{ rowNumber: number; errors: string[] }> = [];
      let successCount = 0;
      for (const row of preview.rows) {
        if (!row.ok) {
          failures.push({ rowNumber: row.rowNumber, errors: row.errors });
          continue;
        }
        try {
          const category = context.factorCategories.get(row.factorCode) || "";
          const data = buildTalentFactorNoteImportRecord(row, category);
          const existing = existingByCode.get(row.code);
          if (existing) {
            await pb
              .collection("talent_factor_notes")
              .update(existing.id, { ...data, updatedBy: user.id }, { $autoCancel: false });
          } else {
            const created = await pb.collection("talent_factor_notes").create<TalentFactorNote>(
              { ...data, createdBy: user.id, updatedBy: user.id },
              { $autoCancel: false },
            );
            existingByCode.set(created.code, created);
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