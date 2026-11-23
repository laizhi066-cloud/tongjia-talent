/**
 * @description M7-A 收口后的 C 端结构与守卫回归：4 主栏 / 19 条注册路由、
 *   深链登录拦截、redirect 白名单、401/403 会话事件与旧双 Tab 结构清理。
 * @file test/foundation-client-guard.test.ts
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(import.meta.dirname, '..')
const CLIENT = 'apps/client/src'
const read = (path: string) => readFileSync(resolve(ROOT, CLIENT, path), 'utf8')
const exists = (path: string) => existsSync(resolve(ROOT, CLIENT, path))

/** pages.json 由 vite-plugin-uni-pages 生成，含条件编译行注释，解析前先去掉。 */
function readPagesJson(): { pages: Array<{ path: string, type?: string }>, tabBar?: unknown } {
  return JSON.parse(read('pages.json').replace(/^\s*\/\/.*$/gm, ''))
}

/** 取对象常量（如 PORTAL_ROUTES）中声明的全部 `/pages/...` 路由。 */
function extractRoutes(source: string, constName: string): string[] {
  const block = source.match(new RegExp(`${constName}[^=]*=\\s*\\{([\\s\\S]*?)\\n\\}`))?.[1] || ''
  return [...block.matchAll(/'(\/pages\/[^']+)'/g)].map(match => match[1] as string)
}

/** 取页面路由与常量名的对应关系（如 home → /pages/home/index）。 */
function routeByName(navigation: string): Record<string, string> {
  return Object.fromEntries(
    [...navigation.matchAll(/(\w+): '(\/pages\/[^']+)'/g)].map(match => [match[1] as string, match[2] as string]),
  )
}

/** 递归列出 C 端源码文件，用于旧引用扫描。 */
function walkClient(dir = CLIENT): string[] {
  return readdirSync(resolve(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`
    return entry.isDirectory() ? walkClient(path) : [path]
  })
}

describe('C 端 4 主栏 / 20 页路由', () => {
  it('pages.json 注册 20 条路由，首屏为首页且不注册原生 tabBar', () => {
    const { pages, tabBar } = readPagesJson()

    expect(pages).toHaveLength(20)
    expect(new Set(pages.map(page => page.path)).size).toBe(20)
    expect(pages[0]).toMatchObject({ path: 'pages/home/index', type: 'home' })
    expect(pages.filter(page => page.type === 'home')).toHaveLength(1)
    // 4 主栏由自绘 PortalTabbar 承接，不再注册原生 tabBar。
    expect(tabBar).toBeUndefined()
    for (const page of pages)
      expect(exists(`${page.path}.vue`), `${page.path}.vue 缺失`).toBe(true)
  })

  it('navigation.ts 的 PORTAL_ROUTES 与 pages.json 一一对应，PORTAL_TAB_ROUTES 固定 4 主栏', () => {
    const navigation = read('modules/foundation-portal/navigation.ts')
    const registered = extractRoutes(navigation, 'PORTAL_ROUTES')
    const { pages } = readPagesJson()

    expect(registered).toHaveLength(20)
    expect(new Set(registered).size).toBe(20)
    expect(new Set(registered)).toEqual(new Set(pages.map(page => `/${page.path}`)))
    expect(extractRoutes(navigation, 'PORTAL_TAB_ROUTES')).toEqual([
      '/pages/home/index',
      '/pages/report/index',
      '/pages/direction/index',
      '/pages/profile/index',
    ])
  })

  it('4 个主栏根页各自渲染 PortalTabbar 并标记 active', () => {
    const tabs: Array<[string, string]> = [
      ['home', 'pages/home/index'],
      ['report', 'pages/report/index'],
      ['direction', 'pages/direction/index'],
      ['profile', 'pages/profile/index'],
    ]
    for (const [tab, path] of tabs) {
      const page = read(`${path}.vue`)
      expect(page, path).toContain('<PortalTabbar')
      expect(page, path).toContain(`active="${tab}"`)
    }
  })

  it('PortalTabbar 只提供首页 / 报告 / 培养方向 / 我的 4 项固定主栏', () => {
    const tabbar = read('modules/foundation-portal/components/PortalTabbar.vue')
    const tabs = [...tabbar.matchAll(/\{ name: '(\w+)', title: '([^']+)', icon: '([^']+)' \}/g)]

    expect(tabs.map(tab => tab[1])).toEqual(['home', 'report', 'direction', 'profile'])
    expect(tabs.map(tab => tab[2])).toEqual(['首页', '报告', '培养方向', '我的'])
    expect(tabbar).toContain('wd-tabbar')
    expect(tabbar).toContain('safe-area-inset-bottom')
    expect(tabbar).toContain('if (target && target.name !== props.active)')
  })
})

describe('C 端登录守卫与深链回跳', () => {
  it('未登录直达受保护页面时 redirectTo 登录页并携带回跳地址', () => {
    const guard = read('modules/foundation-portal/composables/useProtectedPage.ts')
    const navigation = read('modules/foundation-portal/navigation.ts')

    expect(guard).toContain("import { onLoad } from '@dcloudio/uni-app'")
    expect(guard).toContain('onLoad(')
    expect(guard).toContain('if (authStore.isLoggedIn)')
    expect(guard).toContain('redirectToLogin(currentPageUrl())')
    expect(guard).toContain('computed(() => authorized.value)')
    expect(navigation).toContain('uni.redirectTo({ url: `${PORTAL_ROUTES.login}${query}` })')
    expect(navigation).toContain('?redirect=${encodeURIComponent(target)}')
  })

  it('12 个受保护页面挂登录守卫，8 个公开页面不做登录拦截', () => {
    const navigation = read('modules/foundation-portal/navigation.ts')
    const allRoutes = extractRoutes(navigation, 'PORTAL_ROUTES')
    const publicBlock = navigation.match(/const PUBLIC_PATHS = new Set<string>\(\[([\s\S]*?)\]\)/)?.[1] || ''
    const publicNames = [...publicBlock.matchAll(/PORTAL_ROUTES\.(\w+)/g)].map(match => match[1] as string)
    const byName = routeByName(navigation)

    expect(new Set(publicNames)).toEqual(
      new Set(['home', 'profile', 'profileSettings', 'login', 'locked', 'agreement', 'privacy', 'about']),
    )
    const publicRoutes = new Set(publicNames.map(name => byName[name] as string))
    expect(allRoutes.length - publicRoutes.size).toBe(12)

    for (const route of allRoutes) {
      const page = read(`${route.replace(/^\//, '')}.vue`)
      if (publicRoutes.has(route)) {
        expect(page, `${route} 不应拦截游客`).not.toContain('useProtectedPage')
      }
      else {
        // 受保护页要么页面直接挂守卫，要么统一复用受保护占位壳。
        expect(
          page.includes('useProtectedPage') || page.includes('ProtectedPendingPage'),
          `${route} 缺少登录守卫`,
        ).toBe(true)
      }
    }
  })

  it('redirect 白名单只接受站内 /pages/ 路径，拒绝协议与 ..', () => {
    const navigation = read('modules/foundation-portal/navigation.ts')
    const start = navigation.indexOf('export function isValidRedirect')
    const whitelist = navigation.slice(start, navigation.indexOf('/** 取当前页面路径', start))

    expect(whitelist).toContain("value.startsWith('/pages/')")
    expect(whitelist).toContain("value.includes('://')")
    expect(whitelist).toContain("value.includes('..')")
    expect(whitelist).toContain('return false')
    // 所有消费 redirect 的入口都必须先过白名单。
    expect(read('modules/foundation-portal/composables/useLoginRedirect.ts')).toContain('isValidRedirect(decoded)')
    expect(read('router/interceptor.ts')).toContain('isValidRedirect(redirect)')
    expect(navigation).toContain('if (isValidRedirect(redirect)) {')
  })

  it('路由拦截器覆盖 navigateTo / redirectTo / reLaunch，未登录直接取消导航', () => {
    const interceptor = read('router/interceptor.ts')

    for (const api of ['navigateTo', 'redirectTo', 'reLaunch'])
      expect(interceptor).toContain(`uni.addInterceptor('${api}', navigateToInterceptor)`)
    expect(interceptor).toContain('if (!url || !isProtectedPath(url))')
    expect(interceptor).toContain('if (useAuthStore().isLoggedIn)')
    expect(interceptor).toContain('return false')
    expect(interceptor).toContain('uni.reLaunch({ url: target })')
    expect(read('main.ts')).toContain('app.use(routeInterceptor)')
  })

  it('登录页消费 redirect：主栏 reLaunch，二级页 redirectTo，非法回首页', () => {
    const navigation = read('modules/foundation-portal/navigation.ts')
    const login = read('pages/auth/login.vue')
    const finish = navigation.slice(navigation.indexOf('export function finishLoginNavigation'))

    expect(login).toContain('useLoginRedirect')
    expect(login).toContain('finish()')
    expect(login).toContain('session.completeLogin()')
    expect(finish).toContain('if (isTabPath(redirect))')
    expect(finish).toContain('uni.redirectTo({ url: redirect })')
    expect(finish).toContain("switchTab('home')")
  })
})

describe('C 端 401 / 403 会话事件', () => {
  it('401 过期回登录页并保留回跳地址，403 停用进停用页', () => {
    const guard = read('modules/foundation-portal/composables/useSessionGuard.ts')

    expect(guard).toContain('setSessionEventHandler')
    expect(guard).toContain('isProtectedPath(currentPageUrl())')
    expect(guard).toContain("if (event === 'disabled')")
    expect(guard).toContain('uni.reLaunch({ url: `${PORTAL_ROUTES.locked}?reason=account_disabled` })')
    expect(guard).toContain('?redirect=${encodeURIComponent(redirect)}')
    expect(guard).toContain('authStore.logout()')
    expect(guard).toContain('talentStore.resetSession()')
    expect(guard).toContain('resetSessionEvents()')
    expect(read('App.vue')).toContain('installSessionGuard()')
  })

  it('HTTP 层通过会话事件总线上报 401/403，同类事件只触发一次', () => {
    const session = read('http/session.ts')
    const http = read('http/http.ts')

    expect(session).toContain('notifiedEvents')
    expect(session).toContain("type SessionEvent = 'expired' | 'disabled'")
    expect(session).toContain("code === 'ACCOUNT_DISABLED'")
    expect(session).toContain("code === 'ACCOUNT_LOCKED'")
    expect(http).toContain("notifySessionEvent('expired')")
    expect(http).toContain("notifySessionEvent('disabled')")
    expect(http).toContain('isAccountDisabledCode(requestError.code)')
    expect(http).toContain('readonly statusCode: number')
    expect(http).toContain('readonly code: string')
    expect(http).toContain('readonly state: string')
  })

  it('资料接口明确返回 401/403 时清会话，网络错误保留本地缓存', () => {
    const auth = read('store/auth.ts')

    expect(auth).toContain('function isSessionRejected')
    expect(auth).toContain('[401, 403]')
    expect(auth).toContain('this.logout()')
    expect(auth).toContain('网络短暂失败保留缓存')
  })
})

describe('旧双 Tab / 旧天赋结构不恢复', () => {
  it('旧双 Tab 与旧天赋页面文件已删除', () => {
    const legacyFiles = [
      'store/talent.ts',
      'modules/foundation-portal/composables/useProtectedFoundationPage.ts',
      'modules/foundation-portal/composables/usePortalAccount.ts',
      'modules/foundation-portal/components/PortalAccountContent.vue',
      'modules/foundation-portal/components/PortalReportCover.vue',
      'pages/index/index.vue',
      'pages/me/me.vue',
      'pages/account/delete.vue',
      'pages/talent/binding.vue',
      'pages/talent/report/list.vue',
      'pages/talent/report/overview.vue',
      'pages/talent/report/catalog.vue',
      'pages/talent/report/item.vue',
      'pages/talent/interpretations/index.vue',
      'pages/talent/plans/index.vue',
    ]
    for (const file of legacyFiles)
      expect(exists(file), `${file} 不应恢复`).toBe(false)
  })

  it('pages.json 与 navigation.ts 不含旧双 Tab / 旧天赋路由', () => {
    const navigation = read('modules/foundation-portal/navigation.ts')
    const { pages } = readPagesJson()

    for (const legacy of ['/pages/index/index', '/pages/me/me', '/pages/account/delete', '/pages/talent/'])
      expect(navigation).not.toContain(legacy)
    expect(pages.some(page => page.path.startsWith('pages/talent/'))).toBe(false)
    expect(pages.some(page => page.path === 'pages/index/index' || page.path === 'pages/me/me')).toBe(false)
  })

  it('C 端源码不再引用旧 store / 旧守卫 / 旧绑定切换方法', () => {
    const legacyPatterns: Array<[RegExp, string]> = [
      [/from ['"]@\/store\/talent['"]/, '@/store/talent'],
      [/useProtectedFoundationPage/, 'useProtectedFoundationPage'],
      [/usePortalAccount/, 'usePortalAccount'],
      [/selectTalentCustomer/, 'selectTalentCustomer'],
      [/ensureBinding/, 'ensureBinding'],
    ]
    for (const file of walkClient()) {
      const source = readFileSync(resolve(ROOT, file), 'utf8')
      for (const [pattern, label] of legacyPatterns)
        expect(pattern.test(source), `${file} 仍引用 ${label}`).toBe(false)
    }
  })
})