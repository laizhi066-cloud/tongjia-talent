/**
 * @description 潜质要素分库列表（性别 / 年龄 / 状态筛选）。
 * @file server/api/admin/talent/factor-libraries/index.get.ts
 * @route GET /api/admin/talent/factor-libraries
 */
import { paginatedQuery } from "~~/server/utils/crud";
import { escapeFilterValue } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import {
  talentLibraryGenderLabel,
  withTalentRulePagination,
} from "~~/server/utils/talent-rule-api";

export default defineEventHandler(async (event) => {
  await requirePermission(event, "talent:factor:list");
  const query = getQuery(event);
  const filters: string[] = [];
  const gender = String(query.gender || "").trim();
  if (gender === "male" || gender === "female")
    filters.push(`gender = "${escapeFilterValue(gender)}"`);
  const age = Number(query.age);
  if (Number.isInteger(age) && age >= 0 && age <= 18) filters.push(`age = ${age}`);
  const status = String(query.status || "").trim();
  if (status === "0" || status === "1")
    filters.push(`status = "${escapeFilterValue(status)}"`);
  return paginatedQuery(
    "talent_factor_libraries",
    withTalentRulePagination(query),
    filters.join(" && "),
    {
      sort: "gender,age",
      transform: (item: Record<string, unknown>) => ({
        ...item,
        genderLabel: talentLibraryGenderLabel(String(item.gender || "")),
      }),
    },
  );
});