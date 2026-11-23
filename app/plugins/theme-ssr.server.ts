/**
 * @description 单实例后台主题 SSR 注入，减少初始渲染闪烁。
 * @file app/plugins/theme-ssr.server.ts
 */
import { DEFAULT_THEME_ID, getTheme, themes, themeToCSSVars } from '~/config/themes'
import { getReadableForeground, normalizeHexColor } from '../utils/color-contrast'

export default defineNuxtPlugin(async () => {
  let themeId = DEFAULT_THEME_ID
  let isDark = false
  let primaryColor = ''
  try {
    // 显式窄化 $fetch 签名：后台路由 200+ 条时直接实例化全局 $fetch 重载会触发 TS2589（类型递归过深）。
    const fetchTheme = $fetch as unknown as (url: string) => Promise<{ data?: { themeId?: string, isDark?: boolean, primaryColor?: string } }>
    const response = await fetchTheme('/api/admin/theme')
    if (response.data?.themeId) themeId = response.data.themeId
    isDark = response.data?.isDark === true
    primaryColor = normalizeHexColor(response.data?.primaryColor || '')
  } catch {
    const cookie = useCookie<string>('foundation-theme')
    if (cookie.value) {
      const [cachedThemeId, cachedDark] = cookie.value.split('|')
      if (cachedThemeId) themeId = cachedThemeId
      isDark = cachedDark === '1'
    }
  }

  const theme = getTheme(themeId) ?? themes[0]
  if (!theme) return
  useState<string>('theme-id').value = theme.id
  useState<boolean>('theme-is-dark').value = isDark
  useState<string>('theme-primary-color').value = primaryColor
  const vars = themeToCSSVars(theme, isDark)
  if (primaryColor) {
    vars['--primary'] = primaryColor
    vars['--primary-foreground'] = getReadableForeground(primaryColor)
    vars['--sidebar-primary'] = primaryColor
    vars['--sidebar-primary-foreground'] = getReadableForeground(primaryColor)
  }
  useServerHead({
    htmlAttrs: {
      style: Object.entries(vars).map(([key, value]) => `${key}:${value}`).join(';'),
      class: isDark ? 'dark' : undefined,
    },
  })
})
