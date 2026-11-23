/**
 * @description GET /api/admin/log/oper — 分页操作日志列表（只读）
 * @route GET /api/admin/log/oper
 */

export default defineEventHandler(async (event) => {
  await requirePlatformOperations(event)
  await requirePermission(event, 'system:operlog:list')
  const query = getQuery(event)

  const filters: string[] = []
  if (query.title) filters.push(`title ~ "${escapeFilterValue(query.title as string)}"`)
  if (query.operName) filters.push(`operName ~ "${escapeFilterValue(query.operName as string)}"`)
  if (query.status) filters.push(`status = "${escapeFilterValue(query.status as string)}"`)
  if (query.operType) filters.push(`operType = "${escapeFilterValue(query.operType as string)}"`)
  if (query.beginTime) filters.push(`created >= "${escapeFilterValue(query.beginTime as string)}"`)
  if (query.endTime) filters.push(`created <= "${escapeFilterValue(query.endTime as string)}"`)
  const filter = filters.join(' && ')

  return paginatedQuery('oper_logs', query, filter)
})
