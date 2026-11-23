/**
 * @description M8 入站查询回执（M2，spec §3.5/§8.1 #6）：HMAC + 时间窗 + nonce + 限流；
 *   校验幂等键 `${childId}:${seq}` → M2 `applyTalentGeneQueryReceipt` 守卫落库 →
 *   写 `talent_sync_logs`（`syncScope="gene_query"`、`trigger="webhook"`）→ 200 `{result}`。
 *   旧 seq / 未知子女 / 已解绑 / 重复一律 `discarded`，不返回具体原因（防探测）。
 * @file server/api/integrations/talent/gene-query/receipts.post.ts
 * @route POST /api/integrations/talent/gene-query/receipts
 */
import { handleTalentGeneQueryReceiptWebhook } from "~~/server/utils/talent-external-webhook";

export default defineEventHandler(
  async (event): Promise<{ result: "applied" | "discarded" }> =>
    handleTalentGeneQueryReceiptWebhook(event),
);