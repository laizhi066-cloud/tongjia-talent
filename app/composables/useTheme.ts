/**
 * @description 主题管理 composable — 多主题预设 + 亮色/暗色双模式 + 全局同步
 * 管理员修改主题会保存到服务器，所有用户共享同一套主题
 * @file app/composables/useTheme.ts
 */

import { themes, DEFAULT_THEME_ID, themeToCSSVars, getTheme } from '~/config/themes'
import type { ThemePreset } from '~/config/themes'
import { getReadableForeground, normalizeHexColor } from '../utils/color-contrast'

const STORAGE_KEY_THEME = 'foundation-theme-id'
const STORAGE_KEY_DARK = 'foundation-dark'
const STORAGE_KEY_VARS = 'foundation-css-vars'
const SERVER_FETCHED_KEY = 'foundation-theme-fetched'
let clientThemeBootstrapScheduled = false

interface ClientThemeStorage {
  getItem(key: string): string | null
}

interface ClientThemeInitOptions {
  storage: ClientThemeStorage
  setCurrentThemeId: (themeId: string) => void
  setIsDark: (isDark: boolean) => void
  applyCachedTheme: (themeId: string, isDark: boolean) => void
  fetchFromServer: () => void
}

function isValidPrimaryColor(value: string): boolean {
  return Boolean(normalizeHexColor(value))
}

/** 取皮肤亮色主色作为跨端的唯一品牌色，切换后台亮暗时不会改变 C 端颜色。 */
export function getFoundationThemePrimaryColor(themeId: string): string {
  const theme = getTheme(themeId)
  const color = theme ? themeToCSSVars(theme, false)['--primary'] || '' : ''
  return normalizeHexColor(color)
}

/**
 * 客户端初始化主题：缓存只用于首屏兜底，服务器主题始终是最终真源。
 */
export function initializeClientThemeFromStorage(options: ClientThemeInitOptions): void {
  const localTheme = options.storage.getItem(STORAGE_KEY_THEME)
  const localDark = options.storage.getItem(STORAGE_KEY_DARK)

  if (localTheme) {
    const dark = localDark === 'true'
    options.setCurrentThemeId(localTheme)
    options.setIsDark(dark)
    options.applyCachedTheme(localTheme, dark)
  }

  options.fetchFromServer()
}

export function useTheme() {
  const currentThemeId = useState<string>('theme-id', () => DEFAULT_THEME_ID)
  const isDark = useState<boolean>('theme-is-dark', () => false)
  /** 唯一站点与后台共用的品牌主色；后台亮暗模式始终独立。 */
  const primaryColor = useState<string>('theme-primary-color', () => '')

  /** 是否已从服务器同步 */
  const serverSynced = ref(false)
  /** 是否正在加载服务器主题 */
  const loading = ref(true)

  /** 当前主题预设对象 */
  const currentTheme = computed<ThemePreset>(() => {
    return getTheme(currentThemeId.value) ?? themes[0]!
  })

  const themeName = computed(() => currentTheme.value.name)
  const themeLabel = computed(() => isDark.value ? '暗色' : '明亮')

  function safeStorageGet(key: string): string | null {
    try { return localStorage.getItem(key) } catch { return null }
  }

  function safeStorageSet(key: string, value: string): void {
    try { localStorage.setItem(key, value) } catch { /* 隐私模式或受限存储时静默降级 */ }
  }

  /**
   * 应用主题 CSS 变量到 document.documentElement 并持久化到 localStorage
   */
  function applyTheme(themeId: string, dark: boolean, color = primaryColor.value) {
    const theme = getTheme(themeId) || themes[0]
    if (!theme) return

    const vars = themeToCSSVars(theme, dark)
    const normalizedPrimary = normalizeHexColor(color)
    if (normalizedPrimary) {
      const foreground = getReadableForeground(normalizedPrimary)
      vars['--primary'] = normalizedPrimary
      vars['--primary-foreground'] = foreground
      vars['--sidebar-primary'] = normalizedPrimary
      vars['--sidebar-primary-foreground'] = foreground
    }
    const root = document.documentElement
    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value)
    }
    if (dark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    // 持久化 CSS 变量到 localStorage，供首次渲染前的同步脚本恢复
    safeStorageSet(STORAGE_KEY_VARS, JSON.stringify(vars))
    // 同步写入 cookie，供 SSR 首次渲染使用（消除 FOUC）
    document.cookie = `foundation-theme=${themeId}|${dark ? '1' : '0'}; Path=/; Max-Age=31536000; SameSite=Lax`
  }

  /**
   * 从服务器获取全局主题并应用
   */
  async function fetchFromServer() {
    try {
      const data = await useThemeApi().fetchTheme()
      currentThemeId.value = data.themeId
      isDark.value = data.isDark
      primaryColor.value = normalizeHexColor(data.primaryColor || '')
      serverSynced.value = true

      // 缓存到 localStorage 作为离线回退
      if (import.meta.client) {
        safeStorageSet(STORAGE_KEY_THEME, data.themeId)
        safeStorageSet(STORAGE_KEY_DARK, String(data.isDark))
        safeStorageSet(SERVER_FETCHED_KEY, 'true')
        applyTheme(data.themeId, data.isDark, primaryColor.value)
      }
    } catch {
      // 服务器不可用时，使用 localStorage 缓存
      if (import.meta.client) {
        const localTheme = safeStorageGet(STORAGE_KEY_THEME)
        const localDark = safeStorageGet(STORAGE_KEY_DARK)
        const wasFetched = safeStorageGet(SERVER_FETCHED_KEY)

        // 如果之前成功同步过服务器主题，则使用服务器主题
        // 否则使用用户本地的 localStorage 值
        if (wasFetched === 'true') {
          // 已经有服务器缓存，继续使用
        } else if (localTheme) {
          currentThemeId.value = localTheme
          isDark.value = localDark === 'true'
          applyTheme(localTheme, localDark === 'true')
        }
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * 保存主题到服务器（所有用户共享），失败时仅本地生效
   */
  async function saveThemeToServer(themeId: string, dark: boolean, color = primaryColor.value): Promise<void> {
    try {
      await useThemeApi().updateTheme({
        themeId,
        isDark: dark,
        ...(isValidPrimaryColor(color) ? { primaryColor: color } : {}),
      })
      safeStorageSet(SERVER_FETCHED_KEY, 'true')
    } catch {
      if (import.meta.dev) console.warn('[theme] 保存到服务器失败，仅本地生效')
    }
  }

  /**
   * 切换到指定主题预设（管理员调用，保存到服务器全局生效）
   */
  async function setTheme(themeId: string): Promise<void> {
    currentThemeId.value = themeId
    primaryColor.value = getFoundationThemePrimaryColor(themeId)
    if (!import.meta.client) return

    applyTheme(themeId, isDark.value, primaryColor.value)
    safeStorageSet(STORAGE_KEY_THEME, themeId)

    await saveThemeToServer(themeId, isDark.value, primaryColor.value)
  }

  /**
   * 切换亮/暗模式（同上，同步服务器）
   */
  async function toggleDark(): Promise<void> {
    const next = !isDark.value
    isDark.value = next
    if (!import.meta.client) return

    applyTheme(currentThemeId.value, next)
    safeStorageSet(STORAGE_KEY_DARK, String(next))

    await saveThemeToServer(currentThemeId.value, next)
  }

  /**
   * 设置亮/暗模式（同上，同步服务器）
   */
  async function setDark(dark: boolean): Promise<void> {
    isDark.value = dark
    if (!import.meta.client) return

    applyTheme(currentThemeId.value, dark)
    safeStorageSet(STORAGE_KEY_DARK, String(dark))

    await saveThemeToServer(currentThemeId.value, dark)
  }

  /** 保存站点主色时即时更新后台色彩，但绝不改变后台亮暗偏好。 */
  async function setPrimaryColor(color: string): Promise<void> {
    const normalizedPrimary = normalizeHexColor(color)
    if (!normalizedPrimary) return
    primaryColor.value = normalizedPrimary
    if (!import.meta.client) return

    applyTheme(currentThemeId.value, isDark.value, normalizedPrimary)
    await saveThemeToServer(currentThemeId.value, isDark.value, normalizedPrimary)
  }

  // 等 hydration 完成后再读 localStorage。SSR 插件已把本站主题序列化进 useState；
  // 若在 setup 期间抢先用旧缓存覆盖，就会让首屏 VDOM 与服务端 HTML 不一致。
  if (import.meta.client && !clientThemeBootstrapScheduled) {
    clientThemeBootstrapScheduled = true
    onNuxtReady(() => {
      initializeClientThemeFromStorage({
        storage: localStorage,
        setCurrentThemeId: themeId => {
          currentThemeId.value = themeId
        },
        setIsDark: dark => {
          isDark.value = dark
        },
        applyCachedTheme: applyTheme,
        fetchFromServer,
      })
    })
  }

  return {
    currentThemeId,
    primaryColor,
    currentTheme,
    isDark,
    themeName,
    themeLabel,
    loading,
    themes,
    setTheme,
    toggleDark,
    setDark,
    setPrimaryColor,
    /** 手动刷新服务器主题 */
    refreshFromServer: fetchFromServer,
  }
}
