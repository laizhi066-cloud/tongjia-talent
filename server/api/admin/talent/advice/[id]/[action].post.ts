/**
 * @description 建议行写动作（POST，spec §5.2 #7 / #8）：`publish`（发布）/ `withdraw`（撤回）。
 *   仅当前生效版本可写（历史版本 409 `ADVICE_VERSION_READONLY`），重复动作 409
 *   （`ADVICE_ALREADY_PUBLISHED` / `ADVICE_ALREADY_WITHDRAWN`），不做静默成功；
 *   两个动作都不改正文 / 分册 / 年龄 / 匹配键（PRD §6.7「正文只同步不改写」）。
 *   统一链路：`publish` 无请求体按 spec §5.1 跳过 `validateBody`；`withdraw` 校验 `reason?` ≤200
 *   → `requirePermission("talent:advice:publish")` → withOperLog → success；
 *   服务层在 `withTalentReportLock("advice:doc:"+id)` 内串行化（spec §4.2）。
 *   路由文件按动作聚合：`[id]/` 下多个独立文件会触发 Nitro 路由类型递归深度上限
 *   （与 M3 `reports/[id]/[action].post.ts` 同一处置），HTTP 路径与 spec §5.2 完全一致。
 * @file server/api/admin/talent/advice/[id]/[action].post.ts
 * @route POST /api/admin/talent/advice/:id/publish
 * @route POST /api/admin/talent/advice/:id/withdraw
 */
import type { z } from "zod";
import type { TalentAdviceDocRecord } from "~~/shared/types/talent-advice";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import {
  createTalentAdviceStore,
  publishTalentAdviceDoc,
  withdrawTalentAdviceDoc,
  type TalentAdviceStore,
} from "~~/server/utils/talent-advice";
import {
  assertTalentAdviceDetailSegment,
  resolveTalentAdviceRouteAction,
  resolveTalentAdviceRouteId,
  talentAdviceDocAuditSummary,
  talentAdviceWithdrawSchema,
} from "~~/server/utils/talent-advice-api";
import { validateBody } from "~~/server/utils/validation";
import { OperType, withOperLog } from "~~/server/utils/withOperLog";

interface TalentAdvicePostAction {
  /** 有请求体的动作才校验；`publish` 按 spec §5.1 跳过。 */
  schema?: z.ZodTypeAny;
  title: string;
  /** 操作日志摘要：只含建议编号 / 版本号 / 姓名（不含正文与证件号；spec §2.4 / §4.2）。 */
  summary: (
    doc: Partial<Pick<TalentAdviceDocRecord, "adviceNo" | "name">> | null,
    versionNo: string,
    reason: string,
  ) => string;
  run: (docId: string, store: TalentAdviceStore) => Promise<{
    message: string;
  }>;
}

/** 写动作表：新增动作必须同时登记在此（测试会断言 HTTP 路由清单）。 */
export const TALENT_ADVICE_POST_ACTIONS: Readonly<
  Record<string, TalentAdvicePostAction>
> = {
  publish: {
    title: "发布培育建议",
    summary: (doc, versionNo) => talentAdviceDocAuditSummary(doc, versionNo),
    run: (docId, store) => publishTalentAdviceDoc(docId, { store }),
  },
  withdraw: {
    schema: talentAdviceWithdrawSchema,
    title: "撤回培育建议",
    summary: (doc, versionNo, reason) => {
      const base = talentAdviceDocAuditSummary(doc, versionNo);
      return reason ? `${base} · 原因：${reason}` : base;
    },
    run: (docId, store) => withdrawTalentAdviceDoc(docId, { store }),
  },
};

export default defineEventHandler(async (event): Promise<unknown> => {
  const id = assertTalentAdviceDetailSegment(resolveTalentAdviceRouteId(event));
  const action = resolveTalentAdviceRouteAction(event);
  const definition = TALENT_ADVICE_POST_ACTIONS[action];
  if (!definition) throw createError({ statusCode: 404, message: "建议操作不存在" });
  const body = definition.schema
    ? await validateBody(event, definition.schema, { statusCode: 422 })
    : ({} as Record<string, unknown>);
  await requirePermission(event, "talent:advice:publish");
  const store = createTalentAdviceStore();
  const doc = await store.getDocById(id);
  const version = doc?.versionId
    ? await store.getVersionById(String(doc.versionId))
    : null;
  const summary = definition.summary(
    doc,
    String(version?.versionNo ?? ""),
    String((body as { reason?: string }).reason ?? "").trim(),
  );
  return withOperLog(
    event,
    {
      title: definition.title,
      operType: OperType.UPDATE,
      summary: () => summary,
    },
    async () => {
      const result = await definition.run(id, store);
      return success(result, result.message);
    },
  );
});