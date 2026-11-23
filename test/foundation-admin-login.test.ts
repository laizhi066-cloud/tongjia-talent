/**
 * @description 防止基础后台登录页重新指向已移除的旧认证接口。
 * @file test/foundation-admin-login.test.ts
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { safeAdminRedirect } from '../app/utils/safe-admin-redirect'

const ROOT = resolve(import.meta.dirname, '..')
const routePath = resolve(ROOT, 'server/api/public/admin-login.post.ts')
const authApiPath = resolve(ROOT, 'app/composables/api/useAuthApi.ts')
const loginPagePath = resolve(ROOT, 'app/pages/login/index.vue')

describe('foundation admin login contract', () => {
  it('提供管理员专用登录路由，并校验启用角色及后台菜单授权', () => {
    expect(existsSync(routePath)).toBe(true)
    const source = readFileSync(routePath, 'utf8')
    expect(source).toContain("authWithPassword(email, password")
    expect(source).toContain('hasConsoleAccess')
    expect(source).toContain("collection('role_menus')")
    expect(source).toContain("role?.status === '1'")
    expect(source).toContain("authData.record.status !== '1'")
    // 账号名登录：非邮箱时按 users.username 反查邮箱。
    expect(source).toContain('username = ')
  })

  it('登录页只通过管理员登录 API，不再调用已移除的公开认证接口', () => {
    expect(readFileSync(authApiPath, 'utf8')).toContain("'/api/public/admin-login'")
    const page = readFileSync(loginPagePath, 'utf8')
    expect(page).toContain('adminLogin({ identity: identityValue, password: password.value })')
    expect(page).not.toContain('/api/public/email-login')
    expect(page).not.toContain('phoneLogin')
  })

  it('登录后仅回跳到原始后台内部路由，直接刷新二级页不会丢失目标', () => {
    expect(safeAdminRedirect('/admin/profile')).toBe('/admin/profile')
    expect(safeAdminRedirect('/admin/user?page=2')).toBe('/admin/user?page=2')
    // M6：机构端退出后 /org/talent/** 不再作为回跳目标，统一回到天赋工作台。
    expect(safeAdminRedirect('/org/talent/plans')).toBe('/admin/talent/dashboard')
    expect(safeAdminRedirect('/org/talent/reports?type=service_provider')).toBe('/admin/talent/dashboard')
    expect(safeAdminRedirect('https://example.test')).toBe('/admin/talent/dashboard')
    expect(safeAdminRedirect('//example.test')).toBe('/admin/talent/dashboard')
    expect(safeAdminRedirect(undefined)).toBe('/admin/talent/dashboard')
  })
})
