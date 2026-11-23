/**
 * @description C 端取消已选方向（幂等）：`?reportId=` 定位报告，`selectionId` = 正式
 *   `directionId` 或自填 `requestId`；未选返回 200 `changed=false`。取消自填不回退待归并请求。
 *   复用 M4 服务层，变更时追加 M3 版本记录（type=selection）。
 * @file server/api/client/talent/selections/[selectionId].delete.ts
 * @route DELETE /api/client/talent/selections/:selectionId?reportId=
 */
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { success } from "~~/server/utils/response";
import {
  buildTalentClientSelectionResponse,
  invalidTalentClient,
  mutateTalentClientSelection,
  requireTalentClientUser,
} from "~~/server/utils/talent-client-api";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

export default defineEventHandler(async (event) => {
  const user = await requireTalentClientUser(event);
  const query = getQuery(event) as Record<string, unknown>;
  const reportId = String(query.reportId || "").trim();
  if (!reportId)
    throw invalidTalentClient("请提供报告 id（reportId）", "REPORT_ID_REQUIRED");
  const selectionId = String(getRouterParam(event, "selectionId") || "").trim();
  return withOperLog(
    event,
    {
      title: "C 端取消培养方向",
      operType: OperType.DELETE,
      summary: (result) => {
        const payload = result as {
          data?: { selection?: { directionName?: string; manualName?: string } };
        };
        const selection = payload?.data?.selection;
        return `取消「${String(selection?.directionName || selection?.manualName || "")}」`;
      },
    },
    async () => {
      const pb = await getAdminPB();
      const result = await mutateTalentClientSelection({
        pb,
        userId: user.id,
        userName: user.nickname || user.name,
        action: "cancel",
        reportId,
        selectionId,
      });
      return success(
        buildTalentClientSelectionResponse(result),
        result.changed ? "已取消选择" : "该方向未选择",
      );
    },
  );
});