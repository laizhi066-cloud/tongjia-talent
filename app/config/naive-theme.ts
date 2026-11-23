/**
 * @description Naive UI 主题覆盖 — 从主题预设纯计算，确保 SSR 与浏览器 hydration 使用同一组颜色
 * @file app/config/naive-theme.ts
 *
 * 主题预设本身使用 HEX；禁止在初始化阶段读取 document 的 CSS 变量，
 * 否则服务端的无 DOM 回退值会与浏览器已注入的站点主题不同，造成 hydration mismatch。
 */
import type { GlobalThemeOverrides } from 'naive-ui'
import { DEFAULT_THEME_ID, getTheme, themeToCSSVars, themes } from '~/config/themes'
import { getReadableForeground, normalizeHexColor } from '../utils/color-contrast'

/** 将主题变量转为带透明度颜色；预设值为 HEX，避免依赖浏览器 canvas。 */
function cssVarAlpha(vars: Record<string, string>, varName: string, alpha: number): string {
  const hex = vars[varName] || '#0d9488'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

/**
 * 从明确主题 ID 构建 Naive UI 主题覆盖；同一入参在 SSR/客户端必须得到相同输出。
 * @param themeId 主题预设 ID
 * @param dark 是否暗色模式
 */
export function buildNaiveOverrides(themeId: string, dark: boolean, primaryColor = ''): GlobalThemeOverrides {
  const theme = getTheme(themeId) || getTheme(DEFAULT_THEME_ID) || themes[0]
  if (!theme) return {}
  const vars = themeToCSSVars(theme, dark)
  const normalizedPrimary = normalizeHexColor(primaryColor)
  if (normalizedPrimary) vars['--primary'] = normalizedPrimary
  const cssVar = (varName: string) => vars[varName] || '#0d9488'
  const primary = cssVar('--primary')
  const primaryForeground = getReadableForeground(primary)
  const foreground = cssVar('--foreground')
  const background = cssVar('--background')
  const card = cssVar('--card')
  const muted = cssVar('--muted')
  const border = cssVar('--border')
  const mutedFg = cssVar('--muted-foreground')
  const destructive = cssVar('--destructive')
  const warning = cssVar('--warning')
  const info = cssVar('--info')

  // 从 primary 推导 hover/pressed 变体
  const primaryR = parseInt(primary.slice(1, 3), 16)
  const primaryG = parseInt(primary.slice(3, 5), 16)
  const primaryB = parseInt(primary.slice(5, 7), 16)
  const primaryHover = `#${Math.min(255, primaryR + 20).toString(16).padStart(2, '0')}${Math.min(255, primaryG + 25).toString(16).padStart(2, '0')}${Math.min(255, primaryB + 15).toString(16).padStart(2, '0')}`
  const primaryPressed = `#${Math.max(0, primaryR - 15).toString(16).padStart(2, '0')}${Math.max(0, primaryG - 15).toString(16).padStart(2, '0')}${Math.max(0, primaryB - 10).toString(16).padStart(2, '0')}`

  return {
    common: {
      primaryColor: primary,
      primaryColorHover: primaryHover,
      primaryColorPressed: primaryPressed,
      primaryColorSuppl: primary,
      bodyColor: background,
      cardColor: card,
      modalColor: card,
      popoverColor: card,
      tableColor: card,
      inputColor: dark ? muted : card,
      textColorBase: foreground,
      textColor1: foreground,
      textColor2: mutedFg,
      textColor3: cssVarAlpha(vars, '--muted-foreground', 0.55),
      borderColor: border,
      dividerColor: cssVarAlpha(vars, '--border', 0.6),
      successColor: primary,
      warningColor: warning,
      errorColor: destructive,
      infoColor: info,
      borderRadius: '8px',
      fontSize: '14px',
      fontSizeSmall: '12px',
      fontSizeMini: '11px',
      heightMedium: '36px',
    },
    Button: {
      textColorGhost: foreground,
      textColorPrimary: primaryForeground,
      colorPrimary: primary,
      colorHoverPrimary: primaryHover,
      colorPressedPrimary: primaryPressed,
      fontWeight: '600',
    },
    DataTable: {
      tdColor: card,
      thColor: muted,
      thTextColor: foreground,
      tdTextColor: foreground,
      borderColor: border,
      thFontWeight: '600',
      tdFontSize: '13px',
    },
    Card: {
      color: card,
      borderColor: border,
      borderRadius: '12px',
    },
    Modal: { color: card, borderRadius: '12px' },
    Drawer: { color: card },
    Switch: { railColorActive: primary },
    Tag: {
      colorBorderedSuccess: cssVarAlpha(vars, '--primary', 0.12),
      textColorSuccess: primary,
      colorBorderedWarning: cssVarAlpha(vars, '--warning', 0.12),
      textColorWarning: warning,
      colorBorderedError: cssVarAlpha(vars, '--destructive', 0.12),
      textColorError: destructive,
      colorBorderedInfo: cssVarAlpha(vars, '--info', 0.12),
      textColorInfo: info,
      colorBorderedPrimary: cssVarAlpha(vars, '--primary', 0.12),
      textColorPrimary: primary,
    },
    Pagination: {
      itemColor: card,
      itemTextColor: foreground,
      itemColorActive: primary,
      itemTextColorActive: primaryForeground,
    },
    Input: {
      color: dark ? muted : card,
      textColor: foreground,
      border: `1px solid ${border}`,
      borderHover: `1px solid ${primary}`,
      borderFocus: `1px solid ${primary}`,
      placeholderColor: mutedFg,
    },
    Select: { menuColor: card },
    // color 覆盖为浅色卡片后，必须同时覆盖 textColor，否则沿用 Naive 深色 tooltip 的白字 → 白底白字看不见
    Tooltip: { color: dark ? muted : card, textColor: foreground },
    Popover: { color: card, textColor: foreground },
    Notification: { color: card },
    Dropdown: { color: card },
    Menu: {
      itemColorActive: cssVarAlpha(vars, '--primary', 0.08),
      itemTextColorActive: primary,
      arrowColorActive: primary,
    },
    Dialog: { color: card },
  }
}
