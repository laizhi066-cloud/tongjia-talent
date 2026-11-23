/**
 * @description DELETE /api/admin/dict/type/:id — 删除字典类型及关联数据
 * @route DELETE /api/admin/dict/type/:id
 */

import type { RecordModel } from 'pocketbase'
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:dict:delete')
  return withOperLog(event, { title: '字典类型', operType: OperType.DELETE }, async () => {
    const id = getRouterParam(event, 'id') as string
    const pb = await getAdminPB()

    // 先删除关联的字典数据
    const dataList = await pb.collection('dict_data').getFullList({
      filter: `dictTypeId = "${escapeFilterValue(id)}"`,
      $autoCancel: false,
    })
    const results = await Promise.allSettled(
      dataList.map((item: RecordModel) => pb.collection('dict_data').delete(item.id))
    )
    const failed = results.filter(r => r.status === 'rejected').length
    if (results.length > 0 && failed > 0) {
      if (import.meta.dev) console.warn(`[dict/type/${id}] 删除字典数据：成功 ${results.length - failed} 条，失败 ${failed} 条`)
    }

    // 再删除字典类型
    await pb.collection('dict_types').delete(id)
    return success(null, '删除成功')
  })
})
