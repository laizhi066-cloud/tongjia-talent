/**
 * @description M8 入站 webhook 别名：基因报告同步通知（任务约定路径 `/api/integration/.../notify`）。
 *   与 `/api/integrations/talent/gene-reports/sync` 共用处理；只接收 `eventId`，不接收正文。
 * @file server/api/integration/talent/gene-reports/notify.post.ts
 * @route POST /api/integration/talent/gene-reports/notify
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