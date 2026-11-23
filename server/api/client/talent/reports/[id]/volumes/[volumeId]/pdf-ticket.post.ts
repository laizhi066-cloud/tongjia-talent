/**
 * @description 签发 H5 新窗口 PDF 下载 ticket（120s HMAC，绑定 reportId / volumeId / userId /
 *   parentId）。必须 Bearer，且签发前先过与下载相同的门禁；不写下载留痕（真正下载时写）。
 *   docs/specs/M8-external/spec.md §6.8/§8.1、ADR 0008-D4。
 * @file server/api/client/talent/reports/[id]/volumes/[volumeId]/pdf-ticket.post.ts
 * @route POST /api/client/talent/reports/:id/volumes/:volumeId/pdf-ticket
 */
import { success } from "~~/server/utils/response";
import { createTalentReportPdfTicket } from "~~/server/utils/talent-pdf-service";

export default defineEventHandler(async (event) => {
  const reportId = getRouterParam(event, "id") || "";
  const volumeId = getRouterParam(event, "volumeId") || "";
  setHeader(event, "cache-control", "no-store");
  return success(await createTalentReportPdfTicket(event, { reportId, volumeId }), "PDF 下载地址");
});