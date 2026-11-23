/**
 * @description 认证中间件 — 拦截未登录用户访问受保护页面
 *             配合 useAuthState 解决刷新闪烁：
 *             - SSR 阶段跳转到无状态登录页，避免受保护页与客户端登录态产生水合不一致
 *             - Client 阶段等待 authState 确定后再判断
 * @file app/middleware/auth.ts
 */
export default defineNuxtRouteMiddleware(async (to) => {
  // 登录态只在浏览器 localStorage。服务端不能安全确认身份，必须先输出稳定的登录页；
  // 已登录浏览器随后会由 guest middleware 回到原始后台页面，避免渲染受保护页后再替换 DOM。
  if (import.meta.server) return navigateTo({ path: '/login', query: { redirect: to.fullPath } })

  // 等待 auth 状态初始化（auth-session 插件在 setup 中设置）
  // 使用 watch 监听状态变化，最多等 3 秒，超时视为未登录
  const { authState } = useAuthState()
  if (authState.value === 'pending') {
    await new Promise<void>((resolve) => {
      const stop = watch(authState, (val) => {
        if (val !== 'pending') {
          stop()
          resolve()
        }
      })
      setTimeout(() => {
        stop()
        resolve()
      }, 3000)
    })
  }

  if (authState.value !== 'authenticated') {
    const { token } = useAuthSession()
    if (token.value) {
      try {
        ;(window as { $message?: { warning(message: string): void } }).$message?.warning('登录已过期，请重新登录')
      } catch {
        // 消息 provider 尚未挂载时仍正常跳转登录页。
      }
    }
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }
})
