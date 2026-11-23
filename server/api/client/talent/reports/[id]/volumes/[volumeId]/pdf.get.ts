/**
 * @description C 端分册 PDF 代理（M7 路由 + M8 seam）：Bearer（小程序 `uni.downloadFile` /
 *   已登录 H5）或 120s HMAC ticket（H5 新窗口）两条路径，同一门禁：账号 / 家长 / 子女归属、
 *   报告已发布、本册 `open=true`、渲染开关。命中缓存不重渲；下载写 `talent_pdf_downloads`
 *   与一条 oper_logs 摘要（不含 HTML / PII / 存储地址）。
 *   docs/specs/M8-external/spec.md §6.5–§6.11、ADR 0008-D4。
 * @file server/api/client/talent/reports/[id]/volumes/[volumeId]/pdf.get.ts
 * @route GET /api/client/talent/reports/:id/volumes/:volumeId/pdf
 */
import { buildTalentPdfResponse, downloadTalentReportPdf } from "~~/server/utils/talent-pdf-service";

export default defineEventHandler(async (event) => {
  const reportId = getRouterParam(event, "id") || "";
  const volumeId = getRouterParam(event, "volumeId") || "";
  const ticket = String(getQuery(event).ticket || "");
  const payload = await downloadTalentReportPdf(event, { reportId, volumeId, ticket });
  return buildTalentPdfResponse(event, payload);
});