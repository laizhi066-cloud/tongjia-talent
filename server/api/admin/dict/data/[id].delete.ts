/**
 * @description DELETE /api/admin/dict/data/:id — 删除字典数据
 * @route DELETE /api/admin/dict/data/:id
 */

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:dict:delete')
  return withOperLog(event, { title: '字典数据', operType: OperType.DELETE }, async () => {
    const id = getRouterParam(event, 'id') as string
    const pb = await getAdminPB()
    await pb.collection('dict_data').delete(id)
    return success(null, '删除成功')
  })
})
