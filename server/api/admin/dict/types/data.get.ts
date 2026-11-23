/**
 * @description 按字典类型代码批量读取字典项。
 * @file server/api/admin/dict/types/data.get.ts
 * @route GET /api/admin/dict/types/data
 */
import type { RecordModel } from 'pocketbase'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:dict:list')
  const types = getQuery(event).types
  if (typeof types !== 'string' || !types.trim()) return success({})
  const keys = types.split(',').map(key => key.trim()).filter(Boolean)
  const pb = await getAdminPB()
  const typeRows = await pb.collection('dict_types').getFullList<RecordModel>({
    filter: keys.map(key => `dictType = "${escapeFilterValue(key)}"`).join(' || '), $autoCancel: false,
  })
  if (!typeRows.length) return success({})
  const typeById = new Map(typeRows.map(row => [row.id, String(row.dictType)]))
  const data = await pb.collection('dict_data').getFullList<Record<string, any>>({
    filter: typeRows.map(row => `dictTypeId = "${escapeFilterValue(row.id)}"`).join(' || '), sort: 'dictSort', $autoCancel: false,
  })
  const result: Record<string, Array<Record<string, unknown>>> = {}
  for (const row of data) {
    const dictType = typeById.get(String(row.dictTypeId))
    if (!dictType) continue
    ;(result[dictType] ||= []).push({ ...row, dictType })
  }
  return success(result)
})
