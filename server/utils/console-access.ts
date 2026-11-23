/**
 * @description 基础后台登录访问判定：只认可启用的后台角色及其有效菜单授权。
 * @file server/utils/console-access.ts
 */
import type { H3Event } from 'h3'
import { getCurrentUser } from './auth'
import { SUPER_ADMIN_ROLE_KEYS, SYSTEM_ADMIN_ROLE_KEYS } from './identity-service'

export interface ConsoleRole {
  id: string
  roleKey: string
  status: string
}

export interface ConsoleMenu {
  menuType: string
  path: string
  status: string
}

export interface ConsoleRoleAssignment {
  roleId: string
  role?: ConsoleRole
}

export interface ConsoleRoleMenuAssignment {
  roleId: string
  menu?: ConsoleMenu
}

interface AuthenticatedConsoleRole {
  role?: ConsoleRole & {
    menus?: Array<{ menu?: ConsoleMenu }>
  }
}

interface ConsoleAuthenticatedUser extends Record<string, unknown> {
  id: string
  forceLogoutAt?: string | null
  roles?: AuthenticatedConsoleRole[]
}

/** 内置管理员始终具备后台能力，但仍必须是启用角色。 */
function isEnabledBuiltInConsoleRole(role: ConsoleRole): boolean {
  return role.status === '1'
    && [...SUPER_ADMIN_ROLE_KEYS, ...SYSTEM_ADMIN_ROLE_KEYS].includes(role.roleKey)
}

/** 可进入后台的菜单必须是启用的页面菜单，按钮权限或菜单分组不能单独构成控制台入口。 */
function isEnabledConsolePage(menu: ConsoleMenu | undefined): boolean {
  return Boolean(menu && menu.status === '1' && menu.menuType === 'C' && menu.path)
}

/**
 * 判断用户是否具备基础后台访问资格。
 *
 * `user` 是 C 端中性账户角色，即使被错误关联到菜单也不作为后台角色。
 * 自定义角色必须启用且至少拥有一个启用的后台页面菜单。
 */
export function hasConsoleAccess(
  assignments: readonly ConsoleRoleAssignment[],
  roleMenus: readonly ConsoleRoleMenuAssignment[],
): boolean {
  const enabledCustomRoleIds = new Set<string>()

  for (const assignment of assignments) {
    const role = assignment.role
    if (!role || role.status !== '1') continue
    if (isEnabledBuiltInConsoleRole(role)) return true
    if (role.roleKey !== 'user') enabledCustomRoleIds.add(role.id)
  }

  return roleMenus.some(assignment => enabledCustomRoleIds.has(assignment.roleId) && isEnabledConsolePage(assignment.menu))
}

/**
 * 验证当前会话对应的用户是否仍具备后台访问资格。
 *
 * 后台与 C 端共用中性 users 集合，不能仅凭有效 JWT 放行 admin 路由；
 * 每次校验均以当前启用的角色和菜单为准，角色或菜单被停用后既有 token 立即失效。
 */
export async function requireConsoleAccess(event: H3Event): Promise<ConsoleAuthenticatedUser> {
  const user = await getCurrentUser(event) as ConsoleAuthenticatedUser
  const roles = Array.isArray(user.roles) ? user.roles : []
  const assignments: ConsoleRoleAssignment[] = []
  const roleMenus: ConsoleRoleMenuAssignment[] = []

  for (const entry of roles) {
    const role = entry.role
    if (!role) continue

    assignments.push({ roleId: role.id, role })
    for (const item of role.menus || [])
      roleMenus.push({ roleId: role.id, menu: item.menu })
  }

  if (!hasConsoleAccess(assignments, roleMenus))
    throw createError({ statusCode: 403, message: '该账户无后台访问权限' })

  return user
}
