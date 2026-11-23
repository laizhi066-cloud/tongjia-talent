/**
 * @description Theme API module — 全局主题管理（GET/PUT）
 * @file app/composables/api/useThemeApi.ts
 */

export function useThemeApi() {
  const fetchTheme = () =>
    useApi<{ themeId: string; isDark: boolean; primaryColor?: string }>('/api/admin/theme')

  const updateTheme = (data: { themeId: string; isDark: boolean; primaryColor?: string }) =>
    useApi<null>('/api/admin/theme', { method: 'PUT', body: data })

  return { fetchTheme, updateTheme }
}
