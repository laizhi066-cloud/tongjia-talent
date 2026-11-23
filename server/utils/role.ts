/**
 * @description 角色相关工具函数 — 查重等
 * @file server/utils/role.ts
 */
import type { H3Event } from 'h3'
import { requireSuper, SUPER_ADMIN_ROLE_KEYS, SYSTEM_ADMIN_ROLE_KEYS } from './identity-service'

interface CheckRoleDuplicateParams {
  roleKey: string
  /** 更新时排除自身 ID */
  excludeId?: string
}

const PROTECTED_ROLE_KEYS = new Set([...SUPER_ADMIN_ROLE_KEYS, ...SYSTEM_ADMIN_ROLE_KEYS])

/**
 * 检查角色是否重复（按 roleKey 判断）
 * roleKey 是角色的唯一标识（如 admin、common）
 * @param pb - PocketBase 实例
 * @param params - 查重参数
 * @returns 存在的角色记录或 null
 */
export async function checkRoleDuplicate(
  pb: any,
  params: CheckRoleDuplicateParams,
): Promise<any | null> {
  const escapedKey = escapeFilterValue(params.roleKey)
  let filter = `roleKey = "${escapedKey}"`

  if (params.excludeId) {
    filter += ` && id != "${escapeFilterValue(params.excludeId)}"`
  }

  try {
    return await pb.collection('roles').getFirstListItem(filter, { $autoCancel: false })
  } catch {
    return null
  }
}

/** 平台/系统保留角色只能由平台超管管理，避免系统管理员自提权为 superadmin/admin。 */
export function isProtectedRoleKey(roleKey: unknown): boolean {
  return PROTECTED_ROLE_KEYS.has(String(roleKey || ''))
}

/** 若操作涉及保留角色，当前操作者必须是平台超管。 */
export async function requireSuperForProtectedRole(event: H3Event, roleKeys: unknown[]): Promise<void> {
  if (!roleKeys.some(isProtectedRoleKey)) return
  await requireSuper(event)
}

/** 校验一组 roleId 是否包含保留角色。用于用户授权/角色菜单授权等按 id 操作的入口。 */
export async function requireSuperForProtectedRoleIds(event: H3Event, pb: any, roleIds: string[]): Promise<void> {
  if (!roleIds.length) return
  const escaped = roleIds.map(id => `id = "${escapeFilterValue(id)}"`).join(' || ')
  const roles = await pb.collection('roles').getFullList({
    filter: escaped,
    fields: 'id,roleKey',
    $autoCancel: false,
  })
  await requireSuperForProtectedRole(event, roles.map((role: Record<string, any>) => role.roleKey))
}
