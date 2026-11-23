/**
 * @description M8 入站签名触发：培育建议周期检查（spec §8.1 #5）。
 *   只接收 `eventId`，不接收建议正文；异步走 M5「接收新一版」（周期窗口 + 版本唯一键），立即 202。
 * @file server/api/integrations/talent/advice/sync.post.ts
 * @route POST /api/integrations/talent/advice/sync
 */
import type { TalentExternalTriggerResult } from "~~/shared/types/talent-external";
import {
  handleTalentExternalTrigger,
  runTalentAdviceWebhookSync,
} from "~~/server/utils/talent-external-webhook";

export default defineEventHandler(
  async (event): Promise<TalentExternalTriggerResult> =>
    handleTalentExternalTrigger(event, {
      scope: "advice_version",
      start: () => runTalentAdviceWebhookSync(),
    }),
);