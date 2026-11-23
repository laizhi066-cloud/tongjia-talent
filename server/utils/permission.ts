/**
 * @description 服务端权限校验工具
 * @file server/utils/permission.ts
 */
import { getCurrentUser } from './auth'
import type { H3Event } from 'h3'

export async function hasPermission(event: H3Event, permissionCode: string): Promise<boolean> {
  const user = await getCurrentUser(event)

  // 超管(superadmin)是系统管理员(admin)的超集 → 同样通配放行所有权限码
  if ((user.roles as Array<Record<string, any>>).some((r) => ['admin', 'superadmin'].includes((r.role as Record<string, any>).roleKey))) return true

  const codes = new Set<string>()
  for (const ur of user.roles) {
    for (const rm of ur.role.menus) {
      if (rm.menu.permissionCode) codes.add(rm.menu.permissionCode)
    }
  }
  return codes.has(permissionCode)
}

export async function requirePermission(event: H3Event, permissionCode: string) {
  if (!(await hasPermission(event, permissionCode))) {
    throw createError({ statusCode: 403, message: '无权限访问' })
  }
}
