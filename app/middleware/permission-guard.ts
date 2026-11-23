/**
 * @description 基础后台权限路由守卫，只根据 bootstrap 的路由权限表判定。
 * @file app/middleware/permission-guard.ts
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/admin' || to.path.startsWith('/admin/profile')) return

  const { getBootstrapCache, setBootstrapCache } = useBootstrapCache()
  const { setPermissionData } = usePermissionStore()
  let routePermissionMap: Record<string, string> = {}
  let bootstrap: Record<string, unknown> | null = null
  const cached = getBootstrapCache()

  if (cached) {
    bootstrap = cached
    routePermissionMap = (cached.routePermissionMap ?? {}) as Record<string, string>
  } else {
    try {
      const data = await useBootstrapApi().fetchBootstrap() as Record<string, unknown>
      bootstrap = data
      setBootstrapCache(data)
      setPermissionData(
        Array.isArray(data.permissions) ? data.permissions as string[] : [],
        Array.isArray(data.roles) ? data.roles as string[] : [],
      )
      routePermissionMap = (data.routePermissionMap ?? {}) as Record<string, string>
    } catch {
      routePermissionMap = {}
    }
  }

  const { hasPermission, fetchPermissions } = usePermission()
  await fetchPermissions()

  const matchedRoute = Object.keys(routePermissionMap)
    .filter(route => to.path === route || to.path.startsWith(`${route}/`))
    .sort((left, right) => right.length - left.length)[0]

  if (matchedRoute) {
    const permissionCode = routePermissionMap[matchedRoute]
    if (!permissionCode || !hasPermission(permissionCode)) {
      return navigateTo(getAdminLandingPath(bootstrap), { replace: true })
    }
    return
  }

  // bootstrap 只返回当前自定义角色已授权的路由；没有命中的管理页对该角色即为未授权。
  // 内置管理员权限为 *，仍可访问没有登记菜单的兼容页面。
  if (!hasPermission('*')) return navigateTo(getAdminLandingPath(bootstrap), { replace: true })
})
