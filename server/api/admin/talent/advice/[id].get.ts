/**
 * @description 建议书详情：信息条 + 按分册分组的四段家长文案（只读同步原文，无编辑态）。
 *   `versions` / `subject` / `export` 静态段不得被当成建议书 id（静态优先守卫，spec §5.7）。
 *   只读 GET，不写库、不写 `oper_logs`。
 * @file server/api/admin/talent/advice/[id].get.ts
 * @route GET /api/admin/talent/advice/:id
 */
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import {
  assertTalentAdviceDetailSegment,
  resolveTalentAdviceRouteId,
} from "~~/server/utils/talent-advice-api";
import { getTalentAdviceDocDetail } from "~~/server/utils/talent-advice";

export default defineEventHandler(async (event): Promise<unknown> => {
  await requirePermission(event, "talent:advice:view");
  const id = assertTalentAdviceDetailSegment(resolveTalentAdviceRouteId(event));
  const detail = await getTalentAdviceDocDetail(id);
  return success(detail, "建议书详情");
});