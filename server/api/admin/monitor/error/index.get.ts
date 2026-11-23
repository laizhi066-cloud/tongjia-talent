/**
 * @description GET /api/admin/monitor/error — 分页错误日志列表（按来源/级别/状态/关键词筛选）
 * @route GET /api/admin/monitor/error
 */

export default defineEventHandler(async (event) => {
  await requirePlatformOperations(event)
  await requirePermission(event, 'monitor:error:list')
  const query = getQuery(event)
  const filters: string[] = []
  if (query.source) filters.push(`source = "${escapeFilterValue(query.source as string)}"`)
  if (query.level) filters.push(`level = "${escapeFilterValue(query.level as string)}"`)
  if (query.status) filters.push(`status = "${escapeFilterValue(query.status as string)}"`)
  return paginatedQuery('error_logs', query, filters.join(' && '), {
    sort: '-lastSeen',
    keywordFields: ['message', 'url'],
  })
})
