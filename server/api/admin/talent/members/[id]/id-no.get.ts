/**
 * @description 查看家长身份证全号（单项、不批量 / 不导出）：独立高敏权限
 *   `talent:parent:idno`，先鉴权再写审计；日志摘要只记会员编号，不记全号。
 * @file server/api/admin/talent/members/[id]/id-no.get.ts
 * @route GET /api/admin/talent/members/:id/id-no
 */
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import { readTalentParentIdNo } from "~~/server/utils/talent-member-api";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

export default defineEventHandler(async (event) => {
  // 先鉴权：无权限 403 时不产生「查看成功」日志。
  await requirePermission(event, "talent:parent:idno");
  let summary = "";
  return withOperLog(
    event,
    {
      title: "查看会员证件全号",
      operType: OperType.EXPORT,
      summary: () => summary,
    },
    async () => {
      const id = String(getRouterParam(event, "id") || "").trim();
      const pb = await getAdminPB();
      const info = await readTalentParentIdNo(pb, id);
      summary = `家长 ${info.parentNo}`;
      return success({ idNo: info.idNo }, "已查看家长身份证全号");
    },
  );
});