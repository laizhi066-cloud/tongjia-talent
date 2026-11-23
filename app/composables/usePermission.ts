/**
 * @description 前端权限校验组合式函数
 * 优先从 bootstrap 共享缓存读取；缓存未就绪时也只请求 bootstrap，避免依赖已移除的独立权限接口。
 * @file app/composables/usePermission.ts
 *
 * 使用方式：
 *   const { hasPermission } = usePermission()
 *   hasPermission('system:user:edit')  // true/false
 */

export function usePermission() {
  const permissions = ref<string[]>([])
  const roles = ref<string[]>([])
  let fetchPromise: Promise<void> | null = null

  const { getPermissionData, setPermissionData } = usePermissionStore()
  const { getBootstrapCache, setBootstrapCache } = useBootstrapCache()

  async function fetchPermissions() {
    // 检查共享缓存（Sidebar/bootstrap 可能已填充）
    const cached = getPermissionData()
    if (cached.fetched) {
      permissions.value = cached.permissions
      roles.value = cached.roles
      return
    }
    // 检查 bootstrap 缓存（permission-guard 已拉取），避免重复初始化请求。
    const bootstrap = getBootstrapCache()
    if (bootstrap) {
      permissions.value = (bootstrap.permissions as string[]) || []
      roles.value = (bootstrap.roles as string[]) || []
      setPermissionData((bootstrap.permissions as string[]) || [], (bootstrap.roles as string[]) || [])
      return
    }
    if (fetchPromise) return fetchPromise

    fetchPromise = useBootstrapApi().fetchBootstrap()
      .then((data) => {
        setBootstrapCache(data)
        permissions.value = Array.isArray(data.permissions) ? data.permissions : []
        roles.value = Array.isArray(data.roles) ? data.roles : []
        setPermissionData(permissions.value, roles.value)
      })
      .catch(() => {
        permissions.value = []
      })

    return fetchPromise
  }

  function hasPermission(code: string): boolean {
    if (permissions.value.includes('*')) return true
    return permissions.value.includes(code)
  }

  function hasRole(roleKey: string): boolean {
    return roles.value.includes(roleKey)
  }

  // 首次调用时立即通过 bootstrap 初始化（后续 await 会等待同一实例的请求）。
  fetchPermissions()

  return { permissions, roles, hasPermission, hasRole, fetchPermissions }
}
