/**
 * @description C 端路由常量与导航动作：4 主栏 Tab、20 条注册路由、登录回跳校验与安全返回。
 *   页面只调用这里的函数，不硬编码路由字符串。
 * @file src/modules/foundation-portal/navigation.ts
 */

/** 底部 4 主栏。 */
export type PortalTab = 'home' | 'report' | 'direction' | 'profile'

/** 主栏路由：切换主栏一律 reLaunch，清空页面栈。 */
export const PORTAL_TAB_ROUTES: Readonly<Record<PortalTab, string>> = {
  home: '/pages/home/index',
  report: '/pages/report/index',
  direction: '/pages/direction/index',
  profile: '/pages/profile/index',
}

/** 20 条注册路由（4 主栏 + 16 二级页），与 `pages.json` 一一对应。 */
export const PORTAL_ROUTES = {
  home: '/pages/home/index',
  report: '/pages/report/index',
  direction: '/pages/direction/index',
  profile: '/pages/profile/index',
  login: '/pages/auth/login',
  locked: '/pages/auth/locked',
  subjectPicker: '/pages/subject/picker',
  reportVolume: '/pages/report/volume',
  reportFactor: '/pages/report/factor',
  advice: '/pages/advice/index',
  adviceDetail: '/pages/advice/detail',
  directionDetail: '/pages/direction/detail',
  directionManual: '/pages/direction/manual',
  profileEdit: '/pages/profile/edit',
  profileChildren: '/pages/profile/children',
  profileChildForm: '/pages/profile/child-form',
  profileSettings: '/pages/profile/settings',
  agreement: '/pages/agreement/index',
  privacy: '/pages/privacy/index',
  about: '/pages/about/about',
} as const

/** 游客可浏览的公开页面。 */
const PUBLIC_PATHS = new Set<string>([
  PORTAL_ROUTES.home,
  PORTAL_ROUTES.profile,
  PORTAL_ROUTES.profileSettings,
  PORTAL_ROUTES.login,
  PORTAL_ROUTES.locked,
  PORTAL_ROUTES.agreement,
  PORTAL_ROUTES.privacy,
  PORTAL_ROUTES.about,
])

/** 主栏路由集合，用于判断回跳目标是否需要 reLaunch。 */
const TAB_PATHS = new Set<string>(Object.values(PORTAL_TAB_ROUTES))

/** 去掉 query 后的页面路径。 */
export function pathOf(url: string): string {
  return (url.split('?')[0] || '').split('#')[0] || ''
}

/** 是否为需要登录的业务路由。 */
export function isProtectedPath(url: string): boolean {
  const path = pathOf(url)
  if (!path.startsWith('/pages/'))
    return false
  return !PUBLIC_PATHS.has(path)
}

/** 是否为 4 主栏之一。 */
export function isTabPath(url: string): boolean {
  return TAB_PATHS.has(pathOf(url))
}

/**
 * 校验登录回跳地址，防开放重定向：
 * 仅接受 `/pages/` 开头、不含协议与 `..` 的站内路径。
 */
export function isValidRedirect(redirect: string | undefined | null): redirect is string {
  if (!redirect)
    return false
  const value = String(redirect)
  if (!value.startsWith('/pages/'))
    return false
  if (value.includes('://') || value.includes('..'))
    return false
  return true
}

/** 取当前页面路径 + query，用于 401 回跳与登录后返回。 */
export function currentPageUrl(): string {
  try {
    const pages = getCurrentPages()
    const page = pages[pages.length - 1] as (ReturnType<typeof getCurrentPages>[number] & { options?: Record<string, unknown> }) | undefined
    if (!page)
      return ''
    const route = page.route || ''
    if (!route)
      return ''
    const options = page.options || {}
    const search = Object.entries(options)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&')
    return `/${route}${search ? `?${search}` : ''}`
  }
  catch {
    return ''
  }
}

/** 前往登录页；`redirect` 为登录成功后回跳的站内路径。 */
export function goToLogin(redirect?: string): void {
  const target = isValidRedirect(redirect) ? redirect : ''
  const query = target ? `?redirect=${encodeURIComponent(target)}` : ''
  uni.navigateTo({ url: `${PORTAL_ROUTES.login}${query}` })
}

/** 受保护页面被拦截时用 redirectTo 进入登录页（保留来源栈，登录成功可回跳）。 */
export function redirectToLogin(redirect?: string): void {
  const target = isValidRedirect(redirect) ? redirect : ''
  const query = target ? `?redirect=${encodeURIComponent(target)}` : ''
  uni.redirectTo({ url: `${PORTAL_ROUTES.login}${query}` })
}

/** 切换主栏：reLaunch 清栈，目标主栏作为栈底。 */
export function switchTab(tab: PortalTab): void {
  uni.reLaunch({ url: PORTAL_TAB_ROUTES[tab] })
}

/** 二级页入栈。 */
export function openPage(url: string): void {
  uni.navigateTo({ url })
}

/** 安全返回：栈深为 1（H5 刷新/深链直达）时回落到指定主栏。 */
export function goBackOr(fallbackTab: PortalTab = 'home'): void {
  if (getCurrentPages().length > 1) {
    uni.navigateBack()
    return
  }
  switchTab(fallbackTab)
}

/** 登录成功后消费 redirect：主栏用 reLaunch，二级页用 redirectTo。 */
export function finishLoginNavigation(redirect?: string): void {
  if (isValidRedirect(redirect)) {
    if (isTabPath(redirect))
      uni.reLaunch({ url: redirect })
    else if (getCurrentPages().length > 1)
      uni.redirectTo({ url: redirect })
    else
      uni.reLaunch({ url: redirect })
    return
  }
  switchTab('home')
}
