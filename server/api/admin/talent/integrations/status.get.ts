/**
 * @description M8 集成状态（后台只读，spec §8.2/§8.4）：按权限裁剪 report / advice 段；
 *   `talent:report:sync` 看基因报告段，`talent:advice:sync` 看建议段，两者皆无 → 403。
 *   不返回基址/密钥/token/对象 key/PII；不写 `oper_logs`（只读接口）。
 * @file server/api/admin/talent/integrations/status.get.ts
 * @route GET /api/admin/talent/integrations/status
 */
import { createError } from "h3";
import type { TalentIntegrationStatusPayload } from "~~/shared/types/talent-external";
import { hasPermission } from "~~/server/utils/permission";
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { success } from "~~/server/utils/response";
import { loadTalentIntegrationStatus } from "~~/server/utils/talent-integration-status";

export default defineEventHandler(
  async (event): Promise<unknown> => {
    const [canReport, canAdvice] = await Promise.all([
      hasPermission(event, "talent:report:sync"),
      hasPermission(event, "talent:advice:sync"),
    ]);
    if (!canReport && !canAdvice)
      throw createError({ statusCode: 403, message: "无权限访问" });
    const pb = await getAdminPB();
    const payload: TalentIntegrationStatusPayload =
      await loadTalentIntegrationStatus(pb, {
        permissions: { report: canReport, advice: canAdvice },
      });
    return success(payload, "集成状态");
  },
);