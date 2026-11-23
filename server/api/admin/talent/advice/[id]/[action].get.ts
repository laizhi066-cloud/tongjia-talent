/**
 * @description 建议行只读动作（GET，spec §5.2 #4）：`history`（按人历史版本）。
 *   路由文件按动作聚合：Nitro 每个嵌套动态段都会进入 `$fetch` 路由类型计算，`[id]/` 下多个独立文件
 *   会触发仓库现有 Nitro 路由类型的 TS 递归深度上限（与 M3 `reports/[id]/[action].get.ts` 同一处置），
 *   HTTP 路径与 spec §5.2 完全一致：`GET /advice/:id/history`。
 *   只读，不写库、不写 `oper_logs`。
 * @file server/api/admin/talent/advice/[id]/[action].get.ts
 * @route GET /api/admin/talent/advice/:id/history
 */
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import {
  listTalentAdvicePersonHistory,
  notFoundTalentAdviceDoc,
} from "~~/server/utils/talent-advice";
import {
  assertTalentAdviceDetailSegment,
  resolveTalentAdviceRouteAction,
  resolveTalentAdviceRouteId,
} from "~~/server/utils/talent-advice-api";

type TalentAdviceGetAction = (docId: string) => Promise<unknown>;

/** 只读动作表：新增动作必须同时登记在此（测试会断言 HTTP 路由清单）。 */
export const TALENT_ADVICE_GET_ACTIONS: Readonly<
  Record<string, { handler: TalentAdviceGetAction; message: string }>
> = {
  history: {
    handler: (docId) => listTalentAdvicePersonHistory(docId),
    message: "按人历史版本",
  },
};

export default defineEventHandler(async (event): Promise<unknown> => {
  await requirePermission(event, "talent:advice:view");
  const id = assertTalentAdviceDetailSegment(resolveTalentAdviceRouteId(event));
  const action = resolveTalentAdviceRouteAction(event);
  const definition = TALENT_ADVICE_GET_ACTIONS[action];
  if (!definition) throw notFoundTalentAdviceDoc();
  return success(await definition.handler(id), definition.message);
});