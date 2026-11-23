/**
 * @description 报告列表：报告编号（模糊）/ 子女姓名（模糊）/ 家长手机号（完整 11 位或后 4 位）/
 *   检验人身份证（完整 18 位或后 4 位）/ 状态五项 AND；分页默认 20 上限 100；
 *   返回 10 列所需数据 + 状态计数（不叠加状态筛选）。
 * @file server/api/admin/talent/reports/index.get.ts
 * @route GET /api/admin/talent/reports
 */
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import { listTalentReports } from "~~/server/utils/talent-report-api";

export default defineEventHandler(async (event): Promise<unknown> => {
  await requirePermission(event, "talent:report:list");
  const query = getQuery(event) as Record<string, unknown>;
  const pb = await getAdminPB();
  const result = await listTalentReports(pb, {
    reportNo: String(query.reportNo || ""),
    childName: String(query.childName || ""),
    parentMobile: String(query.parentMobile || ""),
    idNo: String(query.idNo || ""),
    status: String(query.status || ""),
    subjectType: String(query.subjectType || ""),
    page: String(query.page || ""),
    pageSize: String(query.pageSize || ""),
  });
  return success(result, "报告列表");
});
