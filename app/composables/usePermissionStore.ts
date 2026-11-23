/**
 * @description 权限共享存储 — 使用 useState 实现 SSR 安全的权限数据共享
 * 优先于 usePermission 的独立 API 调用，避免同一页面内重复请求
 * @file app/composables/usePermissionStore.ts
 */

export function usePermissionStore() {
  const _permissions = useState<string[]>('perm-permissions', () => [])
  const _roles = useState<string[]>('perm-roles', () => [])
  const _fetched = useState<boolean>('perm-fetched', () => false)
  const _userId = useState<string>('perm-user-id', () => '')

  function currentUserId(): string {
    return String(useAuthSession().record.value?.id || '')
  }

  function setPermissionData(permissions: string[], roles: string[]) {
    _permissions.value = permissions
    _roles.value = roles
    _fetched.value = true
    _userId.value = currentUserId()
  }

  function getPermissionData() {
    if (_userId.value !== currentUserId()) {
      resetPermissionData()
    }
    return { permissions: _permissions.value, roles: _roles.value, fetched: _fetched.value }
  }

  function resetPermissionData() {
    _permissions.value = []
    _roles.value = []
    _fetched.value = false
    _userId.value = ''
  }

  return { setPermissionData, getPermissionData, resetPermissionData }
}
