/**
 * @description M8 入站签名触发：基因报告同步（spec §8.1 #4，ADR 0008-D2）。
 *   HMAC（`TALENT_EXTERNAL_WEBHOOK_SECRET`）+ 时间窗 + nonce + 限流；只接收 `eventId`，
 *   **不接收报告正文**；异步复用 M3 全量候选同步（锁 + 唯一键幂等），立即 202。
 * @file server/api/integrations/talent/gene-reports/sync.post.ts
 * @route POST /api/integrations/talent/gene-reports/sync
 */
import type { TalentExternalTriggerResult } from "~~/shared/types/talent-external";
import {
  handleTalentExternalTrigger,
  runTalentGeneReportWebhookSync,
} from "~~/server/utils/talent-external-webhook";

export default defineEventHandler(
  async (event): Promise<TalentExternalTriggerResult> =>
    handleTalentExternalTrigger(event, {
      scope: "gene_report",
      start: () => runTalentGeneReportWebhookSync(),
    }),
);