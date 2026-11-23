/**
 * @description guest 中间件 — 已登录用户访问登录/注册页时自动跳转后台
 *             配合 useAuthState 统一认证状态判断
 * @file app/middleware/guest.ts
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  // 等待 auth 状态初始化（pocketbase 插件在 setup 中设置）
  // 最多等 3 秒防止死循环，超时视为未登录
  const { authState } = useAuthState()
  const start = Date.now()
  while (authState.value === 'pending' && Date.now() - start < 3000) {
    await new Promise(r => setTimeout(r, 50))
  }

  if (authState.value === 'authenticated') {
    const requestedPath = safeAdminRedirect(to.query.redirect)
    const { getBootstrapCache, setBootstrapCache } = useBootstrapCache()
    const cached = getBootstrapCache()
    const bootstrap = cached ?? await useBootstrapApi().fetchBootstrap().then((data) => {
      setBootstrapCache(data)
      return data
    }).catch(() => null)
    const target = requestedPath === '/admin' ? getAdminLandingPath(bootstrap) : requestedPath
    // 登录页在 SSR 阶段先稳定渲染；水合完成后再回到原始受保护页面。
    if (useNuxtApp().isHydrating) {
      onNuxtReady(() => navigateTo(target))
      return
    }
    return navigateTo(target)
  }
})
