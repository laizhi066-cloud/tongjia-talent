/**
 * @description C 端要素解读：按冻结 `factorSnapshot` 取要素名 / 数据熵 / 固定注解 / 适用条件，
 *   并按冻结 `directionSnapshot` 派生「相关培养方向（命中 N/M）」；返回同册上一项 / 下一项序号
 *   （本册内循环，页面取模）。要素不在已开放册 / 不存在 → 404（不泄露存在性）。
 * @file server/api/client/talent/reports/[id]/factors/[factorCode].get.ts
 * @route GET /api/client/talent/reports/:id/factors/:factorCode
 */
import { getCurrentUserBasic } from "~~/server/utils/auth";
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { success } from "~~/server/utils/response";
import {
  assertTalentClientReportAccess,
  buildTalentClientFactor,
  notFoundTalentClientVolume,
} from "~~/server/utils/talent-client-api";

export default defineEventHandler(async (event) => {
  const user = await getCurrentUserBasic(event);
  const pb = await getAdminPB();
  const reportId = String(getRouterParam(event, "id") || "");
  const factorCode = decodeURIComponent(
    String(getRouterParam(event, "factorCode") || ""),
  );
  const { report } = await assertTalentClientReportAccess(
    pb,
    String(user.id || ""),
    reportId,
  );
  const factor = buildTalentClientFactor(report, factorCode);
  if (!factor) throw notFoundTalentClientVolume();
  setHeader(event, "cache-control", "no-store");
  return success(factor, "要素解读");
});