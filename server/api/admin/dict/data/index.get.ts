/**
 * @description 分页读取字典数据；对外使用 dictType 代码，库内使用 dictTypeId 关系。
 * @file server/api/admin/dict/data/index.get.ts
 * @route GET /api/admin/dict/data
 */
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:dict:list')
  const query = getQuery(event)
  const pb = await getAdminPB()
  const filters: string[] = []
  if (query.dictLabel) filters.push(`dictLabel ~ "${escapeFilterValue(String(query.dictLabel))}"`)
  if (query.status) filters.push(`status = "${escapeFilterValue(String(query.status))}"`)
  if (query.dictType) {
    const type = await pb.collection('dict_types').getFirstListItem(`dictType = "${escapeFilterValue(String(query.dictType))}"`, { $autoCancel: false }).catch(() => null)
    if (!type) return success({ rows: [], total: 0, page: 1, pageSize: 10 })
    filters.push(`dictTypeId = "${escapeFilterValue(type.id)}"`)
  }
  return paginatedQuery('dict_data', query, filters.join(' && '), {
    sort: 'dictSort', expand: 'dictTypeId', transform: (row: Record<string, any>) => ({ ...row, dictType: row.expand?.dictTypeId?.dictType || '' }),
  })
})
