/**
 * @description 根据当前后台账户已授权的菜单计算登录后的首个业务页面。
 * @file app/utils/admin-landing.ts
 */

interface AdminBootstrapLike {
  menuTree?: unknown
  permissions?: unknown
}

interface AdminMenuNode {
  path?: string
  children?: unknown
}

const DEFAULT_ADMIN_PATH = '/admin/talent/dashboard'

function canAccess(path: string, permissions: Set<string>): boolean {
  if (permissions.has('*')) return true
  return permissions.size > 0
}

function findFirstAccessiblePath(nodes: unknown, permissions: Set<string>): string | null {
  if (!Array.isArray(nodes)) return null
  for (const item of nodes) {
    if (!item || typeof item !== 'object') continue
    const node = item as AdminMenuNode
    const path = typeof node.path === 'string' ? node.path : ''
    if (path && canAccess(path, permissions)) return path
    const childPath = findFirstAccessiblePath(node.children, permissions)
    if (childPath) return childPath
  }
  return null
}

/**
 * 返回当前账户可进入的后台首个页面；无 bootstrap 时回到天赋工作台。
 * @param bootstrap 当前账户的 bootstrap 响应
 */
export function getAdminLandingPath(bootstrap: AdminBootstrapLike | null | undefined): string {
  const permissions = new Set(
    Array.isArray(bootstrap?.permissions)
      ? bootstrap.permissions.filter((value): value is string => typeof value === 'string')
      : [],
  )
  return findFirstAccessiblePath(bootstrap?.menuTree, permissions) || DEFAULT_ADMIN_PATH
}
