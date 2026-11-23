/**
 * @description GET /api/admin/dict/type/:id — 获取单个字典类型
 * @route GET /api/admin/dict/type/:id
 */

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:dict:list')
  const id = getRouterParam(event, 'id')
  const pb = await getAdminPB()

  const dictType = await pb.collection('dict_types').getOne(id!, {
    $autoCancel: false,
  })

  if (!dictType) throw createError({ statusCode: 404, message: '字典类型不存在' })

  return success(dictType)
})
