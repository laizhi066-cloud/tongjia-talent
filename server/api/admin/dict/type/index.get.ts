/**
 * @description GET /api/admin/dict/type — 分页字典类型列表（含数据量统计）
 * @route GET /api/admin/dict/type
 */

import type { RecordModel } from 'pocketbase'
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:dict:list')
  const query = getQuery(event)
  const pb = await getAdminPB()

  const filters: string[] = []
  if (query.dictName) filters.push(`dictName ~ "${escapeFilterValue(query.dictName as string)}"`)
  if (query.dictType) filters.push(`dictType ~ "${escapeFilterValue(query.dictType as string)}"`)
  if (query.status) filters.push(`status = "${escapeFilterValue(query.status as string)}"`)
  const filter = filters.join(' && ')

  // 导出模式：全量拉取
  if ((query as Record<string, string | undefined>).exportAll === '1') {
    const allItems = await pb.collection('dict_types').getFullList({
      filter: filter || undefined,
      sort: '-id',
      $autoCancel: false,
    })
    const rows = allItems.map((item: RecordModel) => ({ ...item, dataCount: 0 }))
    return success({ rows, total: rows.length, page: 1, pageSize: rows.length })
  }

  const page = Math.max(1, parseInt(String(query.page || '1')))
  const pageSize = Math.min(100, Math.max(1, parseInt(String(query.pageSize || '10'))))

  const result = await pb.collection('dict_types').getList(page, pageSize, {
    filter: filter || undefined,
    sort: '-id',
    $autoCancel: false,
  })

  // 统计每个字典类型下的数据量（批量查一次，内存中 groupBy，避免 N+1）
  const items = result.items as RecordModel[]
  const ids = items.map((item) => item.id)
  const countMap = new Map<string, number>()
  if (ids.length > 0) {
    const allData = await pb.collection('dict_data').getFullList({
      filter: ids.map((id) => `dictTypeId = "${id}"`).join(' || '),
      fields: 'dictTypeId',
      $autoCancel: false,
    })
    for (const d of allData) {
      const dt = (d as Record<string, unknown>).dictTypeId as string
      countMap.set(dt, (countMap.get(dt) || 0) + 1)
    }
  }
  const rows = items.map((item) => ({ ...item, dataCount: countMap.get(item.id) || 0 }))

  return success({ rows, total: result.totalItems, page, pageSize })
})
