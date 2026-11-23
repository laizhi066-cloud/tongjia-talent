/**
 * @description 基础后台用户列表。
 * @file server/api/admin/user/index.get.ts
 * @route GET /api/admin/user
 */
export default defineEventHandler(async (event) => {
  await requirePermission(event, "system:user:list");
  const query = getQuery(event);
  const filters: string[] = [];
  if (query.userName) {
    const value = escapeFilterValue(String(query.userName));
    filters.push(
      `(displayName ~ "${value}" || nickname ~ "${value}" || email ~ "${value}")`,
    );
  }
  if (query.status)
    filters.push(`status = "${escapeFilterValue(String(query.status))}"`);
  if (query.deptId)
    filters.push(`deptId = "${escapeFilterValue(String(query.deptId))}"`);
  if (!(await currentUserIsSuper(event))) {
    const superUserIds = await getSuperUserIds(await getAdminPB());
    for (const superUserId of superUserIds)
      filters.push(`id != "${escapeFilterValue(superUserId)}"`);
  }
  const result = await paginatedQuery("users", query, filters.join(" && "), {
    expand: "deptId",
    fileFields: ["avatar"],
  });
  const rows = (result.data?.rows as Array<Record<string, any>>) || [];
  const ids = rows.map((row) => String(row.id)).filter(Boolean);
  if (!ids.length) return result;
  const pb = await getAdminPB();
  const assignments = await pb.collection("user_roles").getFullList({
    filter: ids.map((id) => `userId = "${escapeFilterValue(id)}"`).join(" || "),
    expand: "roleId",
    $autoCancel: false,
  });
  const roles = new Map<string, Array<Record<string, unknown>>>();
  for (const assignment of assignments as Array<Record<string, any>>) {
    const list = roles.get(assignment.userId) || [];
    list.push({ role: assignment.expand?.roleId || {} });
    roles.set(assignment.userId, list);
  }
  return {
    ...result,
    data: {
      ...result.data!,
      rows: rows.map((row) => ({
        ...row,
        dept: row.expand?.deptId || null,
        roles: roles.get(String(row.id)) || [],
      })),
    },
  };
});
