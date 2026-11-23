/**
 * @description DELETE /api/admin/config/:id — 删除参数配置
 * @route DELETE /api/admin/config/:id
 */

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:config:delete')
  return withOperLog(event, { title: '参数配置', operType: OperType.DELETE }, async () => {
    const id = getRouterParam(event, 'id') as string
    const pb = await getAdminPB()
    const existing = await pb.collection('configs').getOne(id, { $autoCancel: false }).catch(() => null)
    if (existing?.configKey === 'wechat_config')
      throw createError({ statusCode:403, message: '微信配置不能从参数设置中删除' })
    if (existing && SUPER_CONFIG_KEYS.has(existing.configKey)) await requireSuper(event)
    await pb.collection('configs').delete(id)
    return success(null, '删除成功')
  })
})
