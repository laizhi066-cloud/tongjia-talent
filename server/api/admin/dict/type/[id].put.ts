/**
 * @description PUT /api/admin/dict/type/:id — 修改字典类型
 * @route PUT /api/admin/dict/type/:id
 */

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:dict:edit')
  return withOperLog(event, { title: '字典类型', operType: OperType.UPDATE }, async () => {
    const id = getRouterParam(event, 'id') as string
    const body = await validateBody(event, updateDictTypeSchema)
    const pb = await getAdminPB()

    return success(await pb.collection('dict_types').update(id, {
      dictName: body.dictName,
      dictType: body.dictType,
      status: body.status,
      remark: body.remark,
    }), '修改成功')
  })
})
