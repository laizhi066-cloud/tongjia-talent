/**
 * @description 基础后台身份工具：仅处理后台角色与超管隔离。
 * @file server/utils/identity-service.ts
 */
import type { H3Event } from 'h3'
import { getCurrentUser } from './auth'

/** 基础版保留一个部署所有者角色，用于品牌、微信和监控等系统级配置。 */
export const SUPER_ADMIN_ROLE_KEYS = ['superadmin']
export const SYSTEM_ADMIN_ROLE_KEYS = ['admin']
export const SUPER_CONFIG_KEYS = new Set(['site_config', 'system_theme', 'wechat_config', 'error_monitor'])

function roleKeys(user: Record<string, any>): string[] {
  return (user.roles as Array<Record<string, any>> || [])
    .map(item => String(item.role?.roleKey || ''))
    .filter(Boolean)
}

export async function currentUserIsSuper(event: H3Event): Promise<boolean> {
  return roleKeys(await getCurrentUser(event)).some(key => SUPER_ADMIN_ROLE_KEYS.includes(key))
}

export async function requireSuper(event: H3Event): Promise<void> {
  if (!await currentUserIsSuper(event))
    throw createError({ statusCode: 403, message: '仅系统所有者可访问' })
}

/** 监控与基础设置均属于单实例系统所有者能力。 */
export const requirePlatformOperations = requireSuper

export function computeConsoleAccess(keys: string[]): { isSuper: boolean, isAdmin: boolean, roles: string[] } {
  const isSuper = keys.some(key => SUPER_ADMIN_ROLE_KEYS.includes(key))
  const isAdmin = isSuper || keys.some(key => SYSTEM_ADMIN_ROLE_KEYS.includes(key))
  return { isSuper, isAdmin, roles: isAdmin ? (isSuper ? ['superadmin', 'admin'] : ['admin']) : keys }
}

export async function getSuperUserIds(pb: any): Promise<string[]> {
  const roles = await pb.collection('roles').getFullList({ filter: 'roleKey = "superadmin"', fields: 'id', $autoCancel: false })
  if (!roles.length) return []
  const filter = roles.map((role: Record<string, any>) => `roleId = "${escapeFilterValue(role.id)}"`).join(' || ')
  const assignments = await pb.collection('user_roles').getFullList({ filter, fields: 'userId', $autoCancel: false })
  return assignments.map((assignment: Record<string, any>) => String(assignment.userId)).filter(Boolean)
}

export async function userHasSuperRole(pb: any, userId: string): Promise<boolean> {
  const rows = await pb.collection('user_roles').getFullList({
    filter: `userId = "${escapeFilterValue(userId)}"`, expand: 'roleId', $autoCancel: false,
  })
  return rows.some((row: Record<string, any>) => row.expand?.roleId?.roleKey === 'superadmin')
}

export function filterSuperOnlyMenus<T>(menus: T[]): T[] {
  return menus
}

export function isSuperOnlyPath(_path: unknown): boolean {
  return false
}

export function isSuperOnlyPermission(_permission: unknown): boolean {
  return false
}

export async function filterVisibleMenuIdsForCurrentUser(_event: H3Event, _pb: any, ids: string[]): Promise<string[]> {
  return ids
}
