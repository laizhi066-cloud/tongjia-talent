/**
 * @description 新增固定注解：编号由 `${要素编码}-${分级编码}` 服务端生成，唯一冲突返回 409。
 *   要素必须存在于启用分库、分级必须启用；分册由要素当前值派生（ADR 0001-D3）。
 * @file server/api/admin/talent/factor-notes/index.post.ts
 * @route POST /api/admin/talent/factor-notes
 */
import type { TalentFactorNote } from "~~/shared/types/talent-rule";
import { escapeFilterValue, getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import {
  buildTalentFactorNoteCode,
  conflictTalentRule,
  loadTalentDirectionValidationContext,
  resolveTalentNoteCategory,
  talentFactorNoteCreateSchema,
} from "~~/server/utils/talent-rule";
import { validateBody } from "~~/server/utils/validation";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

export default defineEventHandler(async (event) => {
  const body = await validateBody(event, talentFactorNoteCreateSchema, { statusCode: 422 });
  await requirePermission(event, "talent:rule:add");
  return withOperLog(
    event,
    { title: "新增固定注解", operType: OperType.INSERT },
    async () => {
      const pb = await getAdminPB();
      const user = await getCurrentUser(event);
      const context = await loadTalentDirectionValidationContext(pb);
      const category = resolveTalentNoteCategory(
        { factorCode: body.factorCode, levelCode: body.levelCode },
        context,
      );
      const code = buildTalentFactorNoteCode(body.factorCode, body.levelCode);
      const existing = await pb
        .collection("talent_factor_notes")
        .getFirstListItem(`code = "${escapeFilterValue(code)}"`, { $autoCancel: false })
        .catch(() => null);
      if (existing) throw conflictTalentRule(`注解编号已存在：${code}`);
      const record = await pb.collection("talent_factor_notes").create<TalentFactorNote>(
        {
          code,
          factorCode: body.factorCode,
          category,
          levelCode: body.levelCode,
          note: body.note || "",
          ageRange: body.ageRange || "",
          gender: body.gender || "通用",
          status: body.status || "1",
          createdBy: user.id,
          updatedBy: user.id,
        },
        { $autoCancel: false },
      );
      return success(record, "新增成功");
    },
  );
});