/**
 * @description GET /api/admin/post — 岗位分页列表
 * @route GET /api/admin/post
 * @query {page, pageSize, postName, status}
 */

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:post:list')
  const query = getQuery(event)

  const filters: string[] = []
  if (query.postName) {
    filters.push(`postName ~ "${escapeFilterValue(query.postName as string)}"`)
  }
  if (query.status) {
    filters.push(`status = "${escapeFilterValue(query.status as string)}"`)
  }

  return paginatedQuery('posts', query, filters.join(' && '), { sort: 'postSort' })
})
