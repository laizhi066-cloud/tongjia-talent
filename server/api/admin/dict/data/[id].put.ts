/**
 * @description 更新字典数据并支持 dictType 代码重新映射。
 * @file server/api/admin/dict/data/[id].put.ts
 * @route PUT /api/admin/dict/data/:id
 */
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:dict:edit')
  return withOperLog(event, { title: '字典数据', operType: OperType.UPDATE }, async () => {
    const id = getRouterParam(event, 'id') as string
    const body = await validateBody(event, updateDictDataSchema)
    const pb = await getAdminPB()
    const { dictType, ...patch } = body
    if (dictType !== undefined) {
      const type = await pb.collection('dict_types').getFirstListItem(`dictType = "${escapeFilterValue(dictType)}"`, { $autoCancel: false }).catch(() => null)
      if (!type) throw createError({ statusCode: 400, message: `字典类型「${dictType}」不存在` })
      ;(patch as Record<string, unknown>).dictTypeId = type.id
    }
    const record = await pb.collection('dict_data').update(id, patch, { expand: 'dictTypeId', $autoCancel: false })
    return success({ ...record, dictType: record.expand?.dictTypeId?.dictType || dictType || '' }, '修改成功')
  })
})
