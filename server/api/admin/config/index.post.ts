/**
 * @description POST /api/admin/config — 新增参数配置
 * @route POST /api/admin/config
 */

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:config:add')
  return withOperLog(event, { title: '参数配置', operType: OperType.INSERT }, async () => {
    const body = await validateBody(event, createConfigSchema)
    if (SUPER_CONFIG_KEYS.has(body.configKey)) await requireSuper(event)
    const pb = await getAdminPB()

    // 检查配置键名是否已存在
    let exists = null
    try {
      exists = await pb.collection('configs').getFirstListItem(`configKey = "${escapeFilterValue(body.configKey)}"`, { $autoCancel: false })
    } catch (e: unknown) {
      if ((e as Record<string, unknown>).status !== 404) throw e
    }
    if (exists) {
      throw createError({ statusCode: 409, message: '配置键名已存在' })
    }

    const data = {
      configName: body.configName,
      configKey: body.configKey,
      configValue: body.configValue,
      configType: body.configType,
      remark: body.remark,
    }
    const record = body.configKey === 'site_config'
      ? await saveFoundationSiteConfig(pb, body.configValue, configValue => pb.collection('configs').create({ ...data, configValue }, { $autoCancel: false }))
      : await pb.collection('configs').create(data, { $autoCancel: false })
    return success(record, '新增成功')
  })
})
