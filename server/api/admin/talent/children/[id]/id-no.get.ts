/**
 * @description 查看子女身份证全号（单项）：独立高敏权限 `talent:parent:idno`，
 *   先鉴权再写审计；日志摘要只记子女姓名，不记全号。
 * @file server/api/admin/talent/children/[id]/id-no.get.ts
 * @route GET /api/admin/talent/children/:id/id-no
 */
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import { readTalentChildIdNo } from "~~/server/utils/talent-member-api";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

export default defineEventHandler(async (event) => {
  // 先鉴权：无权限 403 时不产生「查看成功」日志。
  await requirePermission(event, "talent:parent:idno");
  let summary = "";
  return withOperLog(
    event,
    {
      title: "查看子女证件全号",
      operType: OperType.EXPORT,
      summary: () => summary,
    },
    async () => {
      const id = String(getRouterParam(event, "id") || "").trim();
      const pb = await getAdminPB();
      const info = await readTalentChildIdNo(pb, id);
      summary = `子女 ${info.name}`;
      return success({ idNo: info.idNo }, "已查看子女身份证全号");
    },
  );
});