/**
 * @description 防止基础后台接口仅验证登录态而绕过 RBAC 权限码。
 * @file test/foundation-admin-route-guards.test.ts
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(import.meta.dirname, '..')

describe('foundation admin route guards', () => {
  it('字典读取接口要求字典读取权限，普通 C 端账户不能越过后台 RBAC', () => {
    for (const path of [
      'server/api/admin/dict/data/index.get.ts',
      'server/api/admin/dict/types/data.get.ts',
    ]) {
      const source = readFileSync(resolve(ROOT, path), 'utf8')
      expect(source).toContain("requirePermission(event, 'system:dict:list')")
    }
  })

  it('微信凭据不能经通用参数接口展示、修改或删除', () => {
    const list = readFileSync(resolve(ROOT, 'server/api/admin/config/index.get.ts'), 'utf8')
    const update = readFileSync(resolve(ROOT, 'server/api/admin/config/[id].put.ts'), 'utf8')
    const remove = readFileSync(resolve(ROOT, 'server/api/admin/config/[id].delete.ts'), 'utf8')

    expect(list).toContain("configKey != \"wechat_config\"")
    expect(update).toContain("existing?.configKey === 'wechat_config'")
    expect(remove).toContain("existing?.configKey === 'wechat_config'")
  })

  it('前端权限状态只复用 bootstrap，不请求已裁掉的独立权限接口', () => {
    const source = readFileSync(resolve(ROOT, 'app/composables/usePermission.ts'), 'utf8')
    expect(source).toContain('useBootstrapApi().fetchBootstrap()')
    expect(source).not.toContain('/api/admin/permissions')
    expect(existsSync(resolve(ROOT, 'app/composables/api/usePermissionApi.ts'))).toBe(false)
  })

  it('在线会话仅向仍具备后台访问资格的账户开放', () => {
    for (const path of [
      'server/api/admin/monitor/online/index.post.ts',
      'server/api/admin/monitor/online/heartbeat.put.ts',
      'server/api/admin/monitor/online/offline.put.ts',
    ]) {
      const source = readFileSync(resolve(ROOT, path), 'utf8')
      expect(source).toContain('requireConsoleAccess(event)')
      expect(source).not.toContain('getCurrentUserBasic(event)')
    }
  })

  it('强退只能由重新认证解除，旧 token 不能通过注册在线会话恢复', () => {
    const auth = readFileSync(resolve(ROOT, 'server/utils/auth.ts'), 'utf8')
    const online = readFileSync(resolve(ROOT, 'server/api/admin/monitor/online/index.post.ts'), 'utf8')
    const login = readFileSync(resolve(ROOT, 'server/api/public/admin-login.post.ts'), 'utf8')
    const forceLogout = readFileSync(resolve(ROOT, 'server/api/admin/monitor/online/[id].delete.ts'), 'utf8')

    expect(auth).toContain('if (user.forceLogoutAt)')
    expect(auth).not.toContain('__skipForceLogoutCheck')
    expect(online).not.toContain('forceLogoutAt')
    expect(login).toContain('if (authData.record.forceLogoutAt)')
    expect(forceLogout).toContain('tokenKey: crypto.randomUUID()')
  })
})
