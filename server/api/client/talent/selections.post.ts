/**
 * @description C 端选择培养方向（正式方向或自填方向）：复用 M4 `resolveTalentReportDirectionSelection`
 *   完成上限 / 重复 / 档位 / 方向可用性校验与 M3 版本记录；家长 + 报告归属门禁在路由内先行
 *   （越权 404 / 报告未发布 409），不接受前端 parentId。审计摘要只含方向名与动作，不含 PII。
 * @file server/api/client/talent/selections.post.ts
 * @route POST /api/client/talent/selections
 * @body { reportId, directionId?, manualName?, tierId }
 */
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { success } from "~~/server/utils/response";
import {
  buildTalentClientSelectionResponse,
  mutateTalentClientSelection,
  requireTalentClientUser,
  talentClientSelectionCreateSchema,
  validateTalentClientBody,
} from "~~/server/utils/talent-client-api";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

/** 选择项展示名：正式方向名 / 自填名；摘要与文案共用。 */
function selectionDisplayName(
  name: string | undefined,
  manualName: string | undefined,
): string {
  return String(name || manualName || "");
}

export default defineEventHandler(async (event) => {
  const user = await requireTalentClientUser(event);
  const body = await validateTalentClientBody(
    event,
    talentClientSelectionCreateSchema,
  );
  return withOperLog(
    event,
    {
      title: "C 端选择培养方向",
      operType: OperType.INSERT,
      summary: (result) => {
        const payload = result as {
          data?: { selection?: { directionName?: string; manualName?: string } };
        };
        const selection = payload?.data?.selection;
        return `选择「${selectionDisplayName(selection?.directionName, selection?.manualName)}」`;
      },
    },
    async () => {
      const pb = await getAdminPB();
      const result = await mutateTalentClientSelection({
        pb,
        userId: user.id,
        userName: user.nickname || user.name,
        action: "select",
        reportId: body.reportId,
        directionId: body.directionId,
        manualName: body.manualName,
        tierId: body.tierId,
      });
      const name = selectionDisplayName(
        result.selection?.directionName,
        result.selection?.manualName,
      );
      const message = result.alreadySelected
        ? `已选择「${name}」`
        : result.selection?.custom
          ? `已提交自填方向「${name}」`
          : `已选择「${name}」·目标档位 ${String(result.selection?.tierName ?? "")}`;
      return success(buildTalentClientSelectionResponse(result), message);
    },
  );
});