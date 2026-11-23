/**
 * @description C 端启动聚合：账号状态 + 对象列表 + 当前对象 + 待核对数 + 报告 / 建议计数 + 页脚。
 *   未绑定返回 `accountState="unbound"`（200 空结构）；家长停用返回 `parent_disabled`；
 *   `?subjectId=` 非法 / 越权 → 404（不泄露存在性）。单请求聚合，首页不并发四次。
 * @file server/api/client/talent/summary.get.ts
 * @route GET /api/client/talent/summary?subjectId=
 */
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { success } from "~~/server/utils/response";
import { loadTalentClientSummary } from "~~/server/utils/talent-client-api";
import { getCurrentUserBasic } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const user = await getCurrentUserBasic(event);
  const pb = await getAdminPB();
  const query = getQuery(event) as Record<string, unknown>;
  const subjectId = String(query.subjectId || "").trim();
  const userId = String(user.id || "");
  const summary = await loadTalentClientSummary(pb, userId, { subjectId });
  setHeader(event, "cache-control", "no-store");
  const message =
    summary.accountState === "unbound"
      ? "未绑定会员档案"
      : summary.accountState === "parent_disabled"
        ? "会员档案已停用"
        : "首页聚合";
  return success(summary, message);
});