/**
 * @description POST /api/admin/dict/type — 新增字典类型
 * @route POST /api/admin/dict/type
 */

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:dict:add')
  return withOperLog(event, { title: '字典类型', operType: OperType.INSERT }, async () => {
    const body = await validateBody(event, createDictTypeSchema)
    const pb = await getAdminPB()

    return success(await pb.collection('dict_types').create({
      dictName: body.dictName,
      dictType: body.dictType,
      status: body.status || '1',
      remark: body.remark,
    }), '新增成功')
  })
})
