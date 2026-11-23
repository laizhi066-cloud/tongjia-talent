/**
 * @description 培育建议版本历史：全部版本（默认 `-effectiveAt`）+ 每版份数 / 发布 / 撤回统计
 *   （读取时聚合 `talent_advice_docs`，不落字段）+ 周期 / 来源 / 说明 / 是否当前生效。
 *   「查看该版本」只是列表带 `versionId`；「回到当前生效版」只是清空该参数（纯前端，不写库）。
 *   只读 GET，不写库、不写 `oper_logs`（spec §4.4 / §5.4.3）。
 * @file server/api/admin/talent/advice/versions/index.get.ts
 * @route GET /api/admin/talent/advice/versions
 */
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import { loadTalentAdviceVersionHistory } from "~~/server/utils/talent-advice-api";

export default defineEventHandler(async (event): Promise<unknown> => {
  await requirePermission(event, "talent:advice:view");
  const history = await loadTalentAdviceVersionHistory();
  return success(history, "培育建议版本历史");
});