/**
 * @description GET /api/admin/log/login — 分页登录日志列表（只读）
 * @route GET /api/admin/log/login
 */

export default defineEventHandler(async (event) => {
  await requirePlatformOperations(event)
  await requirePermission(event, 'system:loginlog:list')
  const query = getQuery(event)

  const filters: string[] = []
  if (query.userName) filters.push(`userName ~ "${escapeFilterValue(query.userName as string)}"`)
  if (query.status) filters.push(`status = "${escapeFilterValue(query.status as string)}"`)
  if (query.ipaddr) filters.push(`ipaddr ~ "${escapeFilterValue(query.ipaddr as string)}"`)
  if (query.beginTime) filters.push(`created >= "${escapeFilterValue(query.beginTime as string)}"`)
  if (query.endTime) filters.push(`created <= "${escapeFilterValue(query.endTime as string)}"`)
  const filter = filters.join(' && ')

  return paginatedQuery('login_logs', query, filter)
})
