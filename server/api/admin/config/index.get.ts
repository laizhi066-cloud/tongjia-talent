/**
 * @description GET /api/admin/config — 分页参数配置列表（支持 configName/configKey 搜索）
 * @route GET /api/admin/config
 */

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:config:list')
  const query = getQuery(event)
  const isSuper = await currentUserIsSuper(event)

  const filters: string[] = []
  if (query.configName) filters.push(`configName ~ "${escapeFilterValue(query.configName as string)}"`)
  if (query.configKey) filters.push(`configKey ~ "${escapeFilterValue(query.configKey as string)}"`)
  if (query.configType) filters.push(`configType = "${escapeFilterValue(query.configType as string)}"`)
  // 微信凭据只允许从专用设置页读取和写入，通用列表既不展示掩码行也不提供误编辑入口。
  filters.push('configKey != "wechat_config"')
  if (!isSuper) {
    for (const key of SUPER_CONFIG_KEYS)
      filters.push(`configKey != "${escapeFilterValue(key)}"`)
  }

  const result = await paginatedQuery('configs', query, filters.join(' && '))
  return result
})
