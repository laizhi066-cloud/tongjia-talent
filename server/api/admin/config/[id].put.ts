/**
 * @description PUT /api/admin/config/:id — 修改参数配置
 * @route PUT /api/admin/config/:id
 */

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:config:edit')
  return withOperLog(event, { title: '参数配置', operType: OperType.UPDATE }, async () => {
    const id = getRouterParam(event, 'id') as string
    const body = await validateBody(event, updateConfigSchema)
    const pb = await getAdminPB()

    const existing = await pb.collection('configs').getOne(id, { $autoCancel: false }).catch(() => null)
    if (existing?.configKey === 'wechat_config' || body.configKey === 'wechat_config')
      throw createError({ statusCode: 403, message: '微信配置只能在「微信配置」页面维护' })
    if ((existing && SUPER_CONFIG_KEYS.has(existing.configKey)) || (body.configKey && SUPER_CONFIG_KEYS.has(body.configKey)))
      await requireSuper(event)

    if (body.configKey) {
      let dup = null
      try {
        dup = await pb.collection('configs').getFirstListItem(`configKey = "${escapeFilterValue(body.configKey)}" && id != "${id}"`, { $autoCancel: false })
      } catch (e: unknown) {
        if ((e as Record<string, unknown>).status !== 404) throw e
      }
      if (dup) throw createError({ statusCode: 409, message: '配置键名已存在' })
    }

    const data = {
      configName: body.configName,
      configKey: body.configKey,
      configValue: body.configValue,
      configType: body.configType,
      remark: body.remark,
    }
    const nextConfigKey = body.configKey || existing?.configKey
    const shouldSyncSiteTheme = nextConfigKey === 'site_config'
    const serializedSiteConfig = body.configValue === undefined && existing?.configValue
      ? migrateLegacyFoundationSiteConfigForSave(existing.configValue).configValue
      : body.configValue
    if (shouldSyncSiteTheme && !serializedSiteConfig)
      throw createError({ statusCode: 400, message: '保存站点配置时必须提供 configValue' })
    const record = shouldSyncSiteTheme && serializedSiteConfig
      ? await saveFoundationSiteConfig(pb, serializedSiteConfig, configValue => pb.collection('configs').update(id, { ...data, configValue }, { $autoCancel: false }))
      : await pb.collection('configs').update(id, data, { $autoCancel: false })
    return success(record, '修改成功')
  })
})
