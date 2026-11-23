/**
 * @description 后台方向选择（选择 / 换档 / 取消，spec §4.6/§5.3.6–§5.3.8 的服务端实现）：
 *   正式方向必须在报告冻结快照内且当前启用；自填方向 upsert 待归并请求；上限取快照
 *   `selectionLimit`（默认 3）；换档同档位 / 取消未选幂等；只有实际变更才写 `selections` 并调用
 *   M3 `recordTalentReportVersion`（不改 `snapshotVersion`）。C 端 `/api/client/talent/selections`
 *   四条路由按 spec 留 M7，本路由提供同一领域能力的后台联调入口。
 * @file server/api/admin/talent/reports/[id]/selection.post.ts
 * @route POST /api/admin/talent/reports/:id/selection
 */
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import {
  resolveTalentDirectionReportId,
  talentDirectionSelectionSchema,
} from "~~/server/utils/talent-direction-api";
import {
  resolveTalentReportDirectionSelection,
  type TalentDirectionActor,
} from "~~/server/utils/talent-direction-selection";
import { validateBody } from "~~/server/utils/validation";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

const ACTION_TITLES: Readonly<Record<string, string>> = {
  select: "选择培养方向",
  changeTier: "更换培养方向档位",
  cancel: "取消培养方向",
};

export default defineEventHandler(async (event): Promise<unknown> => {
  const body = await validateBody(event, talentDirectionSelectionSchema, {
    statusCode: 422,
  });
  await requirePermission(event, "talent:report:view");
  const reportId = resolveTalentDirectionReportId(event);
  const title = ACTION_TITLES[body.action] ?? "更新培养方向选择";
  return withOperLog(
    event,
    {
      title,
      operType: OperType.UPDATE,
      // 摘要只写报告编号与已选数量，不含家长/子女姓名、手机号或方向正文。
      summary: (result) => {
        const payload = (
          result as {
            data?: { reportNo?: string; selectionCount?: number };
          }
        ).data;
        if (!payload) return title;
        return `报告 ${payload.reportNo || ""} 已选 ${Number(payload.selectionCount ?? 0) || 0} 个方向`;
      },
    },
    async () => {
      const pb = await getAdminPB();
      const user = await getCurrentUser(event);
      const actor: TalentDirectionActor = {
        userId: String(user.id || ""),
        userName: String(
          user.displayName || user.username || user.email || "",
        ),
      };
      const result = await resolveTalentReportDirectionSelection(
        pb,
        reportId,
        {
          action: body.action,
          directionId: body.directionId,
          requestId: body.requestId,
          manualName: body.manualName,
          tierId: body.tierId,
        },
        actor,
      );
      const target = result.selection;
      const name = target
        ? target.custom
          ? target.manualName
          : target.directionName
        : "";
      const message =
        body.action === "cancel"
          ? `已取消「${name}」`
          : body.action === "changeTier"
            ? `已更新「${name}」目标档位`
            : target?.custom
              ? `已提交自填方向「${name}」`
              : `已选择「${name}」·目标档位 ${target?.tierName ?? ""}`;
      return success(result, message);
    },
  );
});