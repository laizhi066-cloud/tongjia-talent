/**
 * @description GET /api/admin/theme — 获取全局主题配置
 * 公开接口，无需登录，用于前端初始化时同步主题
 * @route GET /api/admin/theme
 * @returns { themeId: string, isDark: boolean, primaryColor?: string }
 */
export default defineEventHandler(async (_event) => {
  try {
    const pb = await getAdminPB()
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
  } catch {
    return success({ themeId: 'emerald', isDark: false, primaryColor: undefined })
  }
})
