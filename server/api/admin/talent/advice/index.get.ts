/**
 * @description 培育建议列表：15 列数据 + 5 项检索（建议编号 / 子女姓名 / 身份证 / 报告编号 / 年龄，
 *   AND 交集）+ `versionId` 版本视图 + 分页（默认 20 / 上限 100）。
 *   历史版本视图只读：`viewing.isCurrent=false`、行级 `versionReadonly=true`，页面据此隐藏发布/撤回。
 *   只读 GET，不写库、不写 `oper_logs`（spec §5.1）。
 * @file server/api/admin/talent/advice/index.get.ts
 * @route GET /api/admin/talent/advice
 */
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import { listTalentAdviceDocs } from "~~/server/utils/talent-advice-api";

export default defineEventHandler(async (event): Promise<unknown> => {
  await requirePermission(event, "talent:advice:list");
  const query = getQuery(event) as Record<string, unknown>;
  const result = await listTalentAdviceDocs(query);
  return success(result, "培育建议列表");
});