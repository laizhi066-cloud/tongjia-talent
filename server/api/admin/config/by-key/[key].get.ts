/**
 * @description 按键读取基础配置。
 * @file server/api/admin/config/by-key/[key].get.ts
 * @route GET /api/admin/config/by-key/:key
 */
export default defineEventHandler(async (event) => {
  const key = getRouterParam(event, 'key') as string
  await requirePermission(event, 'system:config:list')
  if (SUPER_CONFIG_KEYS.has(key)) await requireSuper(event)
  // 微信密钥只允许经专用接口以掩码形式读取；通用配置查询永不回传密文或历史明文。
  if (key === 'wechat_config')
    throw createError({ statusCode: 404, message: '请前往微信配置页面维护该项' })
  const record = await (await getAdminPB()).collection('configs').getFirstListItem(
    `configKey = "${escapeFilterValue(key)}"`, { $autoCancel: false },
  ).catch(() => null)
  if (!record) throw createError({ statusCode: 404, message: '配置不存在' })
  return success({
    id: record.id, configName: record.configName, configKey: record.configKey,
    configValue: record.configValue, configType: record.configType, remark: record.remark,
  })
})
