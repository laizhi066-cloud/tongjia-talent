/**
 * @description 新增字典数据并将 dictType 代码映射为 dictTypeId 关系。
 * @file server/api/admin/dict/data/index.post.ts
 * @route POST /api/admin/dict/data
 */
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:dict:add')
  return withOperLog(event, { title: '字典数据', operType: OperType.INSERT }, async () => {
    const body = await validateBody(event, createDictDataSchema)
    const pb = await getAdminPB()
    const type = await pb.collection('dict_types').getFirstListItem(`dictType = "${escapeFilterValue(body.dictType)}"`, { $autoCancel: false }).catch(() => null)
    if (!type) throw createError({ statusCode: 400, message: `字典类型「${body.dictType}」不存在` })
    const record = await pb.collection('dict_data').create({
      dictTypeId: type.id, dictSort: body.dictSort ?? 0, dictLabel: body.dictLabel, dictValue: body.dictValue,
      cssClass: body.cssClass || '', listClass: body.listClass || '', icon: body.icon || '', backgroundColor: body.backgroundColor || '', color: body.color || '',
      isDefault: body.isDefault || 'N', status: body.status || '1', remark: body.remark || '',
    }, { $autoCancel: false })
    return success({ ...record, dictType: body.dictType }, '新增成功')
  })
})
