/**
 * @description M8 入站 webhook 别名：培育建议周期通知（任务约定路径 `/api/integration/.../notify`）。
 *   与 `/api/integrations/talent/advice/sync` 共用处理；只接收 `eventId`，不接收建议正文。
 * @file server/api/integration/talent/advice/notify.post.ts
 * @route POST /api/integration/talent/advice/notify
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