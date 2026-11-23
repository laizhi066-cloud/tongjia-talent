/**
 * @description C 端报告列表（当前家长视角）：本人 + 已绑定子女各一行，含报告状态派生、
 *   六册快照摘要、开放册与建议份数；无报告对象也给空摘要（前端直接渲染「该对象暂无基因报告」）。
 *   数据只来自 M3 冻结快照投影，不含报告编号 / 证件原文 / 要素编码；未绑定 → 404。
 * @file server/api/client/talent/reports/index.get.ts
 * @route GET /api/client/talent/reports
 */
import { getCurrentUserBasic } from "~~/server/utils/auth";
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { success } from "~~/server/utils/response";
import { loadTalentClientReportList } from "~~/server/utils/talent-client-api";

export default defineEventHandler(async (event) => {
  const user = await getCurrentUserBasic(event);
  const pb = await getAdminPB();
  const list = await loadTalentClientReportList(pb, String(user.id || ""));
  setHeader(event, "cache-control", "no-store");
  return success(list, "报告列表");
});