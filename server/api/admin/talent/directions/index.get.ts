/**
 * @description 培养方向列表：支持方向编码 / 名称筛选，行内展开 requirements 与档位名称。
 * @file server/api/admin/talent/directions/index.get.ts
 * @route GET /api/admin/talent/directions
 */
import type { TalentDirection } from "~~/shared/types/talent-rule";
import { paginatedQuery } from "~~/server/utils/crud";
import { escapeFilterValue, getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import {
  buildTalentDirectionView,
  loadTalentRuleLookups,
  withTalentRulePagination,
} from "~~/server/utils/talent-rule-api";

export default defineEventHandler(async (event) => {
  await requirePermission(event, "talent:direction:list");
  const query = getQuery(event);
  const pb = await getAdminPB();
  const lookups = await loadTalentRuleLookups(pb);
  const filters: string[] = [];
  const code = String(query.code || "").trim();
  if (code) filters.push(`code ~ "${escapeFilterValue(code)}"`);
  const name = String(query.name || "").trim();
  if (name) filters.push(`name ~ "${escapeFilterValue(name)}"`);
  const status = String(query.status || "").trim();
  if (status === "0" || status === "1")
    filters.push(`status = "${escapeFilterValue(status)}"`);
  return paginatedQuery<TalentDirection>(
    "talent_directions",
    withTalentRulePagination(query),
    filters.join(" && "),
    {
      sort: "code",
      transform: (item: TalentDirection) => ({
        ...item,
        ...buildTalentDirectionView(item, lookups),
      }),
    },
  );
});