/**
 * @description 培育建议 CSV 导出：跟随当前筛选与 `versionId`（历史版本视图导出历史快照），
 *   UTF-8 + BOM，15 列（建议编号 / 版本 / 本人 / 身份证脱敏 / 性别 / 出生日期 / 年龄 / 基因报告 /
 *   基因篇数 / 分册 / 覆盖要素 / 数据熵 / 发布状态 / 同步时间 / 撤回时间）；上限 10000 行，
 *   超出 422 `ADVICE_EXPORT_TOO_LARGE`；写 1 条 `oper_logs`（EXPORT + 行数，spec §5.4.7）。
 * @file server/api/admin/talent/advice/export.get.ts
 * @route GET /api/admin/talent/advice/export
 */
import { requirePermission } from "~~/server/utils/permission";
import {
  exportTalentAdviceCsv,
  talentAdviceDownloadHeaders,
} from "~~/server/utils/talent-advice-api";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

export default defineEventHandler(async (event): Promise<unknown> => {
  await requirePermission(event, "talent:advice:export");
  const query = getQuery(event) as Record<string, unknown>;
  let exportedRows = 0;
  return withOperLog(
    event,
    {
      title: "导出培育建议",
      operType: OperType.EXPORT,
      summary: () => `${exportedRows} 行`,
    },
    async () => {
      const result = await exportTalentAdviceCsv(query);
      exportedRows = result.rows;
      talentAdviceDownloadHeaders(event, result.fileName);
      return result.csv;
    },
  );
});