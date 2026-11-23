/**
 * @description 验证基础后台只向启用的内置管理员或拥有有效页面菜单的自定义角色开放。
 * @file test/foundation-console-access.test.ts
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { hasConsoleAccess } from '../server/utils/console-access'

const ROOT = resolve(import.meta.dirname, '..')

describe('foundation console role access', () => {
  it('启用的自定义角色拥有启用后台页面菜单时可以登录', () => {
    expect(hasConsoleAccess(
      [{ roleId: 'role-operator', role: { id: 'role-operator', roleKey: 'operator', status: '1' } }],
      [{ roleId: 'role-operator', menu: { menuType: 'C', path: '/admin/overview', status: '1' } }],
    )).toBe(true)
  })

  it('停用角色、停用菜单、菜单分组和按钮权限都不能单独构成后台入口', () => {
    expect(hasConsoleAccess(
      [{ roleId: 'role-disabled', role: { id: 'role-disabled', roleKey: 'operator', status: '0' } }],
      [{ roleId: 'role-disabled', menu: { menuType: 'C', path: '/admin/overview', status: '1' } }],
    )).toBe(false)
    expect(hasConsoleAccess(
      [{ roleId: 'role-active', role: { id: 'role-active', roleKey: 'operator', status: '1' } }],
      [{ roleId: 'role-active', menu: { menuType: 'F', path: '', status: '1' } }],
    )).toBe(false)
    expect(hasConsoleAccess(
      [{ roleId: 'role-active', role: { id: 'role-active', roleKey: 'operator', status: '1' } }],
      [{ roleId: 'role-active', menu: { menuType: 'C', path: '/admin/overview', status: '0' } }],
    )).toBe(false)
  })

  it('仅分配 C 端 user 角色时拒绝登录，即使错误地关联了菜单', () => {
    expect(hasConsoleAccess(
      [{ roleId: 'role-user', role: { id: 'role-user', roleKey: 'user', status: '1' } }],
      [{ roleId: 'role-user', menu: { menuType: 'C', path: '/admin/overview', status: '1' } }],
    )).toBe(false)
  })

  it('内置管理员仍需启用，启用后保持全局后台入口能力', () => {
    expect(hasConsoleAccess(
      [{ roleId: 'role-admin', role: { id: 'role-admin', roleKey: 'admin', status: '1' } }],
      [],
    )).toBe(true)
    expect(hasConsoleAccess(
      [{ roleId: 'role-admin', role: { id: 'role-admin', roleKey: 'admin', status: '0' } }],
      [],
    )).toBe(false)
  })

  it('认证聚合层会过滤停用角色，使既有 Token 也立即失去该角色权限', () => {
    const source = readFileSync(resolve(ROOT, 'server/utils/auth.ts'), 'utf8')

    expect(source).toContain("const enabledUserRoles = userRoles.filter((ur: RecordModel) => ur.expand?.roleId?.status === '1')")
    expect(source).toContain('const roles = enabledUserRoles.map')
  })
})
