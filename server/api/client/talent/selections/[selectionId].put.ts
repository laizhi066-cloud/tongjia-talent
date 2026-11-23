/**
 * @description C 端更换目标档位：`selectionId` = 正式 `directionId` 或自填 `requestId`，
 *   复用 M4 服务层做档位候选 / 已选校验并追加 M3 版本记录（type=selection）。
 *   同档位幂等 `changed=false`；未选 404；非法档位 422。
 * @file server/api/client/talent/selections/[selectionId].put.ts
 * @route PUT /api/client/talent/selections/:selectionId
 * @body { reportId, tierId }
 */
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { success } from "~~/server/utils/response";
import {
  buildTalentClientSelectionResponse,
  mutateTalentClientSelection,
  requireTalentClientUser,
  talentClientSelectionTierSchema,
  validateTalentClientBody,
} from "~~/server/utils/talent-client-api";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

export default defineEventHandler(async (event) => {
  const user = await requireTalentClientUser(event);
  const body = await validateTalentClientBody(
    event,
    talentClientSelectionTierSchema,
  );
  const selectionId = String(getRouterParam(event, "selectionId") || "").trim();
  return withOperLog(
    event,
    {
      title: "C 端更换培养方向档位",
      operType: OperType.UPDATE,
      summary: (result) => {
        const payload = result as {
          data?: { selection?: { directionName?: string; manualName?: string; tierName?: string } };
        };
        const selection = payload?.data?.selection;
        return `更换「${String(selection?.directionName || selection?.manualName || "")}」档位为 ${String(selection?.tierName || "")}`;
      },
    },
    async () => {
      const pb = await getAdminPB();
      const result = await mutateTalentClientSelection({
        pb,
        userId: user.id,
        userName: user.nickname || user.name,
        action: "changeTier",
        reportId: body.reportId,
        selectionId,
        tierId: body.tierId,
      });
      const message = result.changed
        ? `已更新档位为 ${String(result.selection?.tierName ?? "")}`
        : "档位未变化";
      return success(buildTalentClientSelectionResponse(result), message);
    },
  );
});