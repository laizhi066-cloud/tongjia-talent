/**
 * @description 基础版唯一站点配置与主题令牌状态。
 * @file src/store/site.ts
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { get } from '@/http/http'
import type { FoundationSiteConfig } from '@/modules/foundation-portal/types'

const DEFAULT_FOUNDATION_SITE: FoundationSiteConfig = {
  appName: '同佳天赋',
  adminName: '同佳天赋管理后台',
  logo: '/brand/tongjia-talent-lockup.svg',
  slogan: '看见天赋，陪伴成长',
  copyright: '© 同佳',
  contactPhone: '',
  primaryColor: '#2F6F5E',
  themeMode: 'light',
}

/** 按系统偏好解析站点 `system` 明暗模式。 */
function systemPrefersDark(): boolean {
  // #ifdef H5
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches || false
  // #endif
  // #ifndef H5
  return uni.getSystemInfoSync().theme === 'dark'
  // #endif
}

/** 将站点主色统一为六位值，保证颜色对比度计算在 H5 与小程序中一致。 */
function normalizePrimaryColor(value: string): string {
  if (!/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(value))
    return ''
  const raw = value.slice(1).toLowerCase()
  return raw.length === 3
    ? `#${raw.split('').map(channel => channel.repeat(2)).join('')}`
    : `#${raw}`
}

/** 为任意品牌底色选择达到 WCAG AA 对比度的黑白内容色。 */
function readablePrimaryForeground(color: string): string {
  const normalized = normalizePrimaryColor(color)
  if (!normalized)
    return '#ffffff'
  const channels = [1, 3, 5].map(index => Number.parseInt(normalized.slice(index, index + 2), 16) / 255)
  const luminance = channels.reduce((total, channel, index) => {
    const linear = channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    return total + linear * [0.2126, 0.7152, 0.0722][index]!
  }, 0)
  return (luminance + 0.05) / 0.05 >= 4.5 ? '#000000' : '#ffffff'
}

/** 根据唯一站点的主色与明暗模式派生门户可继承的设计令牌。 */
function themeVariables(site: FoundationSiteConfig, isDark: boolean): Record<string, string> {
  const primaryColor = normalizePrimaryColor(site.primaryColor)
  const variables: Record<string, string> = {
    '--foundation-background': isDark ? '#1d2824' : '#faf8f3',
    '--foundation-surface': isDark ? '#26332e' : '#f2f7f4',
    '--foundation-card': isDark ? '#304039' : '#fffdf9',
    '--foundation-card-subtle': isDark ? '#374a42' : '#f7fbf8',
    '--foundation-text': isDark ? '#edf5f0' : '#253832',
    '--foundation-text-secondary': isDark ? '#c5d4cc' : '#4f625b',
    '--foundation-text-muted': isDark ? '#b0c3b8' : '#626f69',
    '--foundation-accent-text': isDark ? '#ecd4a0' : '#765923',
    '--foundation-accent-surface': isDark ? '#4c4230' : '#f5ead4',
    '--foundation-accent-subtle': isDark ? '#3d382b' : '#fbf5e9',
    '--foundation-border': isDark ? '#45574e' : '#e2e9e5',
    '--foundation-shadow': isDark ? '0 8px 24px rgba(0, 0, 0, 0.22)' : '0 14px 40px rgba(62, 83, 75, 0.07)',
    '--foundation-shadow-float': isDark ? '0 12px 30px rgba(0, 0, 0, 0.3)' : '0 16px 38px rgba(58, 87, 77, 0.08)',
    '--foundation-on-primary': readablePrimaryForeground(primaryColor),
    // 深色站点主色可能自身偏暗；交互前景改用文字令牌，保证按钮文字、图标和激活 Tab 始终清晰可见。
    '--foundation-interactive': isDark ? 'var(--foundation-text)' : 'var(--foundation-primary)',
    '--foundation-danger': isDark ? '#ffaaa5' : '#b73536',
    '--foundation-success': isDark ? '#9ed7bf' : '#2f6f5e',
    '--foundation-success-surface': isDark ? '#30483e' : '#e4f0eb',
    '--foundation-warning': isDark ? '#ecd4a0' : '#765923',
    '--foundation-warning-surface': isDark ? '#4c4230' : '#f5ead4',
    '--foundation-radius': '18px',
    '--foundation-radius-sm': '14px',
    '--foundation-playful-surface': isDark ? '#493a34' : '#ffede0',
    '--foundation-playful-text': isDark ? '#ffd0b0' : '#8e4628',
    '--foundation-info-surface': isDark ? '#2e3e50' : '#e9f2fc',
    '--foundation-info-text': isDark ? '#c0d9fb' : '#345c85',
    // Wot UI 组件复用门户令牌，避免组件在深色或站点换色后回退成默认蓝白主题。
    '--wot-primary-1': 'var(--foundation-surface)',
    '--wot-primary-2': 'var(--foundation-surface)',
    '--wot-primary-3': 'var(--foundation-primary)',
    '--wot-primary-4': 'var(--foundation-primary)',
    '--wot-primary-5': 'var(--foundation-primary)',
    '--wot-primary-6': 'var(--foundation-primary)',
    '--wot-primary-7': 'var(--foundation-primary)',
    '--wot-button-primary-bg': 'var(--foundation-primary)',
    '--wot-button-main-color': 'var(--foundation-on-primary)',
    '--wot-button-primary-color': 'var(--foundation-interactive)',
    '--wot-button-primary-color-active': 'var(--foundation-interactive)',
    '--wot-button-height-mini': '48px',
    '--wot-button-height-small': '48px',
    '--wot-button-height-medium': '48px',
    '--wot-button-height-large': '48px',
    '--wot-text-main': 'var(--foundation-text)',
    '--wot-text-secondary': 'var(--foundation-text-secondary)',
    '--wot-text-auxiliary': 'var(--foundation-text-muted)',
    '--wot-icon-main': 'var(--foundation-text)',
    '--wot-icon-secondary': 'var(--foundation-text-secondary)',
    '--wot-icon-auxiliary': 'var(--foundation-text-muted)',
    '--wot-border-main': 'var(--foundation-border)',
    '--wot-border-light': 'var(--foundation-border)',
    '--wot-filled-content': 'var(--foundation-surface)',
    '--wot-filled-bottom': 'var(--foundation-background)',
    '--wot-filled-oppo': 'var(--foundation-card)',
    '--wot-feedback-active': 'var(--foundation-surface)',
  }
  variables['--talent-color-primary'] = variables['--foundation-primary'] || primaryColor || '#2f6f5e'
  variables['--talent-color-primary-active'] = isDark ? '#b9d7c9' : '#3f7164'
  variables['--talent-color-primary-soft'] = isDark ? '#30483e' : '#e4f0eb'
  variables['--talent-color-primary-surface'] = isDark ? '#293b34' : '#f2f7f4'
  variables['--talent-color-page'] = variables['--foundation-background']
  variables['--talent-color-surface'] = variables['--foundation-card']
  variables['--talent-color-ink'] = variables['--foundation-text']
  variables['--talent-color-title'] = variables['--foundation-text']
  variables['--talent-color-text'] = variables['--foundation-text-secondary']
  variables['--talent-color-muted'] = variables['--foundation-text-muted']
  variables['--talent-color-border'] = variables['--foundation-border']
  variables['--talent-color-accent'] = isDark ? '#d8bd83' : '#c7a86b'
  if (primaryColor)
    variables['--foundation-primary'] = primaryColor
  return variables
}

export const useSiteStore = defineStore('foundation-site', () => {
  const site = ref<FoundationSiteConfig>({ ...DEFAULT_FOUNDATION_SITE })
  const loaded = ref(false)
  const loading = ref(false)
  const systemDark = ref(systemPrefersDark())

  /** 门户只依据站点默认外观，不读取或改变后台独立的亮暗偏好。 */
  const sitePrefersDark = computed(() => {
    return site.value.themeMode === 'dark' || (site.value.themeMode === 'system' && systemDark.value)
  })
  const isDark = computed(() => sitePrefersDark.value)
  const themeVars = computed(() => themeVariables(site.value, isDark.value))
  let hasSystemThemeListener = false

  /** 在 H5 根节点同步主题变量，小程序页面则通过 `themeVars` 行内继承。 */
  function applyTheme(): void {
    // #ifdef H5
    Object.entries(themeVars.value).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value)
    })
    document.documentElement.dataset.foundationTheme = isDark.value ? 'dark' : 'light'
    document.documentElement.style.colorScheme = isDark.value ? 'dark' : 'light'
    document.title = site.value.appName
    // #endif
  }

  /** 页面重新展示时刷新系统偏好，覆盖 H5 与小程序的明暗外观切换。 */
  function refreshSystemTheme(): void {
    systemDark.value = systemPrefersDark()
    applyTheme()
  }

  /** H5 在系统明暗模式变化时立即更新本机门户外观。 */
  function watchSystemTheme(): void {
    // #ifdef H5
    if (hasSystemThemeListener || !window.matchMedia)
      return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = (event: MediaQueryListEvent): void => {
      systemDark.value = event.matches
      applyTheme()
    }
    if (typeof media.addEventListener === 'function')
      media.addEventListener('change', sync)
    else
      media.addListener(sync)
    hasSystemThemeListener = true
    // #endif
  }

  /** 拉取唯一站点的基础品牌、主题与微信公开配置。 */
  async function loadSite(): Promise<void> {
    watchSystemTheme()
    if (loading.value)
      return
    loading.value = true
    try {
      const response = await get<Partial<FoundationSiteConfig>>('/api/client/config/site', { hideErrorToast: true })
      site.value = { ...DEFAULT_FOUNDATION_SITE, ...response }
    }
    catch {
      site.value = { ...DEFAULT_FOUNDATION_SITE }
    }
    finally {
      loaded.value = true
      loading.value = false
      refreshSystemTheme()
      applyTheme()
    }
  }

  return {
    site,
    loaded,
    loading,
    isDark,
    themeVars,
    refreshSystemTheme,
    watchSystemTheme,
    loadSite,
  }
})
