/**
 * @description PUT /api/admin/theme — 保存全局主题配置（仅平台超管）
 * @route PUT /api/admin/theme
 * @body { themeId: string, isDark: boolean, primaryColor?: string }
 * @returns { themeId: string, isDark: boolean, primaryColor?: string }
 */
export default defineEventHandler(async (event) => {
  return withOperLog(event, { title: '主题配置', operType: OperType.UPDATE }, async () => {
    await requireSuper(event)
    const body = await validateBody(event, updateThemeSchema)

    const pb = await getAdminPB()
    const configs = pb.collection('configs')
    let existing: { id: string, configValue: string } | null = null
    try {
      existing = await configs.getFirstListItem<{ id: string, configValue: string }>('configKey = "system_theme"', {
        $autoCancel: false,
      })
    } catch (e: unknown) {
      if ((e as Record<string, unknown>).status !== 404)
        throw createError({ statusCode: 500, message: '读取主题配置失败' })
    }

    let current: Record<string, unknown> = {}
    try {
      const parsed = JSON.parse(existing?.configValue || '{}') as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) current = parsed as Record<string, unknown>
    } catch {
      // 损坏的旧配置不应阻止超管恢复成有效主题。
    }
    const configValue = JSON.stringify({
      ...current,
      themeId: body.themeId,
      isDark: body.isDark,
      ...(body.primaryColor ? { primaryColor: body.primaryColor } : {}),
    })
    const saved = existing
      ? await configs.update(existing.id, { configValue }, { $autoCancel: false })
      : await configs.create({
          configName: '系统主题',
          configKey: 'system_theme',
          configValue,
          configType: 'Y',
          remark: '后台皮肤与亮暗偏好；品牌主色同步到唯一站点配置',
        }, { $autoCancel: false })

    if (body.primaryColor) {
      try {
        await synchronizeFoundationSitePrimaryColor(pb, body.primaryColor)
      } catch (error) {
        // 两个配置记录无法使用跨集合事务；站点同步失败时恢复后台主题，避免 B/C 品牌色分叉。
        if (existing)
          await configs.update(existing.id, { configValue: existing.configValue }, { $autoCancel: false }).catch(() => {})
        else
          await configs.delete(saved.id, { $autoCancel: false }).catch(() => {})
        console.error('[theme] 同步站点品牌主色失败', error)
        throw createError({ statusCode: 500, message: '同步站点品牌主色失败' })
      }
    }

    return success(saved)
  })
})
