/**
 * @description 接收新一版培育建议（PRD §6.7「选同步日期 → 生成新版本，旧版归档，C 端切到新版」）：
 *   `validateBody`（`effectiveAt` 必填，`versionNo` 缺省 `V{YYYY}.{MM}`，`note` 缺省服务端生成）
 *   → `requirePermission("talent:advice:sync")` → withOperLog → success。
 *   领域层在全局锁 `advice:version` 内「建归档占位版本 → 逐条建建议 → 旧 active 归档 → 新行激活」，
 *   失败补偿删除本次写入并恢复旧 active（500 `ADVICE_VERSION_SYNC_FAILED`，旧版保持生效）；
 *   重复版本（版本号 / 生效月份 / 生效日期任一已占用）409 `ADVICE_VERSION_EXISTS`，不写集合、不切版；
 *   `effectiveAt` 不晚于当前生效版本 409 `ADVICE_VERSION_ORDER`；外部源不可用 503 零写入。
 *   同时写 `talent_sync_logs`（`syncScope="advice_version"`）与 1 条 `oper_logs`（摘要只含版本 / 份数）。
 * @file server/api/admin/talent/advice/versions/index.post.ts
 * @route POST /api/admin/talent/advice/versions
 */
import type { TalentAdviceReceiveResult } from "~~/shared/types/talent-advice";
import { getCurrentUser } from "~~/server/utils/auth";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import {
  talentAdviceReceiveAuditSummary,
  talentAdviceReceiveSchema,
} from "~~/server/utils/talent-advice-api";
import { receiveTalentAdviceVersion } from "~~/server/utils/talent-advice";
import { validateBody } from "~~/server/utils/validation";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

export default defineEventHandler(async (event): Promise<unknown> => {
  const body = await validateBody(event, talentAdviceReceiveSchema, {
    statusCode: 422,
  });
  await requirePermission(event, "talent:advice:sync");
  const user = await getCurrentUser(event);
  const operatorId = String(user.id || "");
  const operatorName = String(
    user.displayName || user.username || user.email || "",
  );
  return withOperLog(
    event,
    {
      title: "接收培育建议新版本",
      operType: OperType.INSERT,
      summary: (result) => {
        const payload = (result as { data?: TalentAdviceReceiveResult }).data;
        return payload
          ? talentAdviceReceiveAuditSummary(payload)
          : "接收完成";
      },
    },
    async () => {
      const result = await receiveTalentAdviceVersion({
        effectiveAt: body.effectiveAt,
        versionNo: body.versionNo,
        note: body.note,
        operatorId,
        operatorName,
      });
      return success(result, "新一版培育建议已接收，家长端已切换");
    },
  );
});