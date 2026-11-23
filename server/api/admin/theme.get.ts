/**
 * @description GET /api/admin/theme — 获取全局主题配置
 * 公开接口，无需登录，用于前端初始化时同步主题
 * @route GET /api/admin/theme
 * @returns { themeId: string, isDark: boolean, primaryColor?: string }
 */
export default defineEventHandler(async (_event) => {
  const pb = await getAdminPB()

  try {
    const record = await pb.collection('configs').getFirstListItem('configKey = "system_theme"', {
      $autoCancel: false,
    })
    const value = JSON.parse(record.configValue || '{}')
    const primaryColor = typeof value.primaryColor === 'string' && /^#(?:[\dA-Fa-f]{3}|[\dA-Fa-f]{6})$/.test(value.primaryColor)
      ? value.primaryColor
      : undefined
    return success({
      themeId: value.themeId || 'emerald',
      isDark: value.isDark === true,
      primaryColor,
    })
  } catch (e: unknown) {
    // 404 = 还没有主题配置，使用默认值
    if ((e as Record<string, unknown>).status === 404) {
      return success({ themeId: 'emerald', isDark: false, primaryColor: undefined })
    }
    throw createError({ statusCode: 500, message: '获取主题配置失败' })
  }
})
