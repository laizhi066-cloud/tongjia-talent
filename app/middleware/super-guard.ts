/**
 * @description 基础版超管路由守卫 — 站点配置、主题、微信密钥和运行监控等系统级页面专用。
 *   非超管（含系统管理员）直接 URL 访问一律弹回天赋工作台，配合后端 requireSuper 双层兜底。
 * @file app/middleware/super-guard.ts
 */
export default defineNuxtRouteMiddleware(async () => {
  // 登录态存于浏览器 localStorage，SSR 阶段无法带上用户 token。
  // 直接访问超管页面时先放行 SSR，客户端水合后再执行真实鉴权。
  if (import.meta.server) return

  const { getBootstrapCache, setBootstrapCache } = useBootstrapCache()
  let data: Record<string, any> | null = getBootstrapCache() as any
  if (!data) {
    try {
      data = await useBootstrapApi().fetchBootstrap()
      setBootstrapCache(data as any)
    }
    catch {
      data = null
    }
  }
  if (!data?.isSuper) {
    if (import.meta.client)
      (window as any).$message?.error?.('该页面仅平台超管可访问')
    return navigateTo('/admin/talent/dashboard')
  }
})
