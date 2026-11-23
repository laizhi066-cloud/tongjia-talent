/**
 * @description GET /api/admin/role — 分页角色列表
 * @route GET /api/admin/role
 */

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:role:list')
  const query = getQuery(event)
  const pb = await getAdminPB()
  const isSuper = await currentUserIsSuper(event)

  const filters: string[] = []
  if (query.roleName) filters.push(`roleName ~ "${escapeFilterValue(query.roleName as string)}"`)
  if (query.status) filters.push(`status = "${escapeFilterValue(query.status as string)}"`)
  if (!isSuper) {
    for (const roleKey of SUPER_ADMIN_ROLE_KEYS)
      filters.push(`roleKey != "${escapeFilterValue(roleKey)}"`)
  }
  const filter = filters.join(' && ')

  const result = await paginatedQuery('roles', query, filter)

  // 统计每个角色下的用户数（批量查一次，内存中 groupBy，避免 N+1）
  const rows = result.data!.rows as Record<string, any>[]
  const ids = rows.map((item) => item.id)
  if (ids.length > 0) {
    const allRoles = await pb.collection('user_roles').getFullList({
      filter: ids.map((id) => `roleId = "${id}"`).join(' || '),
      fields: 'roleId',
      $autoCancel: false,
    })
    const countMap = new Map<string, number>()
    for (const ur of allRoles) {
      const rid = (ur as Record<string, any>).roleId as string
      countMap.set(rid, (countMap.get(rid) || 0) + 1)
    }
    const finalRows = rows.map((item) => ({ ...item, userCount: countMap.get(item.id) || 0 }))
    return { ...result, data: { ...result.data!, rows: finalRows } }
  }

  return { ...result, data: { ...result.data!, rows: rows.map((item) => ({ ...item, userCount: 0 })) } }
})
