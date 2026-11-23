/**
 * @description 静态段只读探针：子女档案详情（脱敏）。用于验证 `/api/admin/talent/children/:id`
 *   静态段优先于旧 `[resource]` 动态路由（spec §5.7 第 3 条：不存在时返回「子女档案不存在」，
 *   而不是旧路由的「天赋资源不存在」）。B 端详情页仍以 `GET /members/:id` 的子女列表为准。
 * @file server/api/admin/talent/children/[id].get.ts
 * @route GET /api/admin/talent/children/:id
 */
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";
import {
  getTalentChildOrThrow,
  sanitizeTalentChildRecord,
} from "~~/server/utils/talent-member";

export default defineEventHandler(async (event) => {
  await requirePermission(event, "talent:parent:view");
  const id = String(getRouterParam(event, "id") || "").trim();
  const pb = await getAdminPB();
  const child = await getTalentChildOrThrow(pb, id);
  let parentStatus = "1";
  if (String(child.parentId || "").trim()) {
    const parent = await pb
      .collection("talent_parents")
      .getOne<{ status?: string }>(String(child.parentId), {
        fields: "status",
        $autoCancel: false,
      })
      .catch(() => null);
    parentStatus = String(parent?.status || "1");
  }
  return success(
    { child: sanitizeTalentChildRecord(child, { parentStatus }) },
    "子女档案",
  );
});