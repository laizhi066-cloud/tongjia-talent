/**
 * @description 验证 C 端资料和错误上报接口不会把客户端输入升级为服务端权限或网络能力。
 * @file test/foundation-client-security.test.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { withAuthenticatedErrorUser } from '../server/utils/client-error-report'
import { resolveProfileAvatarAction } from '../server/utils/profile-avatar'
import { assertFoundationUserCanAuthenticate, findOrCreateWxUser, foundationIdentityHash, resolveFoundationPasswordIdentity } from '../server/utils/wx-login-service'
import { assertFoundationUploadFile } from '../server/utils/upload-handler'

const ROOT = resolve(import.meta.dirname, '..')

describe('foundation client API security contract', () => {
  it('资料接口仅保留既有头像、允许清空，并拒绝任何新的远程头像引用', () => {
    const currentAvatar = 'https://cdn.example.test/api/files/users/current/avatar.png'

    expect(resolveProfileAvatarAction(undefined, currentAvatar)).toBe('keep')
    expect(resolveProfileAvatarAction(currentAvatar, currentAvatar)).toBe('keep')
    expect(resolveProfileAvatarAction('', currentAvatar)).toBe('clear')
    expect(resolveProfileAvatarAction('https://169.254.169.254/latest/meta-data', currentAvatar)).toBe('reject')
  })

  it('资料接口不再下载客户端提交的 URL，头像更新指向受控上传链路', () => {
    const source = readFileSync(resolve(ROOT, 'server/api/client/auth/profile.put.ts'), 'utf8')

    expect(source).not.toContain('fetch(')
    expect(source).toContain('头像仅支持通过上传接口更新')
    expect(source).toContain('resolveProfileAvatarAction')
  })

  it('错误上报只能关联已验证的会话用户，匿名上报保持匿名', () => {
    const anonymous = withAuthenticatedErrorUser({ source: 'client', message: '匿名错误' })
    const authenticated = withAuthenticatedErrorUser({ source: 'console', message: '会话错误' }, 'verified-user')

    expect(anonymous).not.toHaveProperty('userId')
    expect(authenticated.userId).toBe('verified-user')
  })

  it('公开错误上报 schema 不接受客户端指定的 userId，并尝试从 token 获取真实归属', () => {
    const source = readFileSync(resolve(ROOT, 'server/api/client/client-error.post.ts'), 'utf8')

    expect(source).not.toContain('userId: z.string')
    expect(source).toContain('getCurrentUserBasic(event)')
    expect(source).toContain('withAuthenticatedErrorUser')
  })

  it('已注销或停用的账户不能通过微信认证重新获得会话', () => {
    expect(() => assertFoundationUserCanAuthenticate({ status: '1' })).not.toThrow()
    expect(() => assertFoundationUserCanAuthenticate({ status: '0' })).toThrow('账户已停用')
    expect(() => assertFoundationUserCanAuthenticate({})).toThrow('账户已停用')
  })

  it('C 端密码登录接受邮箱，并将手机号映射到用户的 PocketBase identity', async () => {
    const getFirstListItem = vi.fn().mockResolvedValue({ email: 'member@example.com' })
    const pb = { collection: vi.fn(() => ({ getFirstListItem })) }

    await expect(resolveFoundationPasswordIdentity(pb as never, ' member@example.com ')).resolves.toBe('member@example.com')
    expect(getFirstListItem).not.toHaveBeenCalled()
    await expect(resolveFoundationPasswordIdentity(pb as never, '13900000001')).resolves.toBe('member@example.com')
    expect(getFirstListItem).toHaveBeenCalledWith('phone = "13900000001"', { $autoCancel: false })
  })

  it('命中已注销身份 HMAC 时不会重新自动建户', async () => {
    const getFirstListItem = vi.fn().mockResolvedValue({ id: 'deleted-user' })
    const pb = { collection: vi.fn(() => ({ getFirstListItem })) }

    await expect(findOrCreateWxUser(pb as never, 'openid-e2e')).rejects.toThrow('账户已注销')
    expect(getFirstListItem).toHaveBeenCalledWith(
      `deletedOpenidHash = "${foundationIdentityHash('openid-e2e')}"`,
      { $autoCancel: false },
    )
  })

  it('注销会替换认证凭据、移除微信身份并留下不可逆身份标记', () => {
    const source = readFileSync(resolve(ROOT, 'server/api/client/auth/delete-account.post.ts'), 'utf8')

    expect(source).toContain('email: `${anonymised}@foundation.local.invalid`')
    expect(source).toContain('passwordConfirm: deletedPassword')
    expect(source).toContain("openid: '', unionid: ''")
    expect(source).toContain('deletedOpenidHash: foundationIdentityHash(user.openid)')
    expect(foundationIdentityHash('openid-e2e')).toMatch(/^[a-f0-9]{64}$/)
    expect(foundationIdentityHash('openid-e2e')).toBe(foundationIdentityHash('openid-e2e'))
    expect(foundationIdentityHash('')).toBe('')
  })

  it('上传只允许受控文件类型和 10MB 以内的大小，头像只能为图片', () => {
    const oneByte = new Uint8Array([1])

    expect(() => assertFoundationUploadFile({ data: oneByte, type: 'image/png' }, 'users')).not.toThrow()
    expect(() => assertFoundationUploadFile({ data: oneByte, type: 'application/pdf' }, 'uploads')).not.toThrow()
    expect(() => assertFoundationUploadFile({ data: oneByte, type: 'application/pdf' }, 'users')).toThrow('头像仅支持')
    expect(() => assertFoundationUploadFile({ data: oneByte, type: 'text/html' }, 'uploads')).toThrow('仅支持图片')
    expect(() => assertFoundationUploadFile({ data: new Uint8Array(10 * 1024 * 1024 + 1), type: 'image/png' }, 'uploads')).toThrow('不能超过 10MB')
  })
})
