/**
 * @description M3 报告详情第 4 页签「培育建议」挂载数据：当前生效版覆盖册、状态与派生可见性
 *   （不返回 `sections` 全量、不返回证件信息）。参数 `subjectType` + `subjectId`（spec §7.4），
 *   也接受 `reportId` 反查（M3 详情已有该字段），便于 M3 接线时少一层解析。
 *   只读 GET，不写库、不写 `oper_logs`。
 * @file server/api/admin/talent/advice/subject.get.ts
 * @route GET /api/admin/talent/advice/subject?subjectType=&subjectId=
 * @route GET /api/admin/talent/advice/subject?reportId=
 */
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import { loadTalentAdviceSubjectAdvice } from "~~/server/utils/talent-advice-api";

export default defineEventHandler(async (event): Promise<unknown> => {
  await requirePermission(event, "talent:advice:view");
  const query = getQuery(event) as Record<string, unknown>;
  const advice = await loadTalentAdviceSubjectAdvice(query);
  return success(advice, "报告培育建议");
});