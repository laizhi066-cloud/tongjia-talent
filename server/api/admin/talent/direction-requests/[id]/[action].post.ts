/**
 * @description 自定义方向待归并处理（spec §5.2 #2/#3）：`merge` 归并到正式方向（写 aliases，
 *   不 bump 方向 version）/ `promote` 转正式（生成停用待配置方向，绕过 M1 保存校验）。
 *   权限 `talent:direction:merge`；两个动作均 `withOperLog`，摘要只记方向名，不含家长/子女姓名、
 *   手机号与身份证等敏感信息。HTTP 路径与 spec §5.2 一致（动作聚合，避免多动态段放大路由类型）。
 * @file server/api/admin/talent/direction-requests/[id]/[action].post.ts
 * @route POST /api/admin/talent/direction-requests/:id/merge
 * @route POST /api/admin/talent/direction-requests/:id/promote
 */
import type { z } from "zod";
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import {
  notFoundTalentDirection,
  resolveTalentDirectionRequestAction,
  resolveTalentDirectionRequestId,
  talentDirectionMergeSchema,
  talentDirectionPromoteSchema,
} from "~~/server/utils/talent-direction-api";
import {
  mergeTalentDirectionRequest,
  promoteTalentDirectionRequest,
  type TalentDirectionActor,
} from "~~/server/utils/talent-direction-selection";
import { validateBody } from "~~/server/utils/validation";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

interface ActionDefinition {
  schema: z.ZodTypeAny;
  title: string;
  summary: (result: { direction: { name: string } }) => string;
  message: (result: { direction: { name: string } }) => string;
}

const ACTION_DEFINITIONS: Readonly<Record<string, ActionDefinition>> = {
  merge: {
    schema: talentDirectionMergeSchema,
    title: "归并自定义方向",
    summary: (result) => `归并到「${result.direction.name}」`,
    message: (result) => `已归并到「${result.direction.name}」`,
  },
  promote: {
    schema: talentDirectionPromoteSchema,
    title: "自定义方向转正式",
    summary: (result) => `生成停用方向「${result.direction.name}」`,
    message: (result) =>
      `已生成停用方向「${result.direction.name}」，请补充要素与要求分级后启用`,
  },
};

export default defineEventHandler(async (event): Promise<unknown> => {
  const action = resolveTalentDirectionRequestAction(event);
  const definition = ACTION_DEFINITIONS[action];
  if (!definition) throw notFoundTalentDirection("方向处理动作不存在");
  await requirePermission(event, "talent:direction:merge");
  const body = (await validateBody(event, definition.schema, {
    statusCode: 422,
  })) as Record<string, unknown>;
  const requestId = resolveTalentDirectionRequestId(event);
  return withOperLog(
    event,
    {
      title: definition.title,
      operType: OperType.UPDATE,
      // withOperLog 的 summary 收到 success 包装；只写目标方向名，不含家长/子女姓名与正文。
      summary: (result) => {
        const payload = (
          result as {
            data?: { direction?: { name?: string } };
          }
        ).data;
        return payload?.direction?.name
          ? definition.summary({
              direction: { name: String(payload.direction.name) },
            })
          : definition.title;
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
      if (action === "merge") {
        const result = await mergeTalentDirectionRequest(
          pb,
          requestId,
          body.targetDirectionId,
          actor,
        );
        return success(result, definition.message(result));
      }
      const result = await promoteTalentDirectionRequest(pb, requestId, actor);
      return success(result, definition.message(result));
    },
  );
});