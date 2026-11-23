/**
 * @description C 端通用账号密码登录，使用 PocketBase 配置的 identity 字段认证。
 * @file server/api/client/auth/phone-login.post.ts
 * @route POST /api/client/auth/phone-login
 */
import { z } from 'zod'
import { loginWxUserByIdentityPassword } from '~~/server/utils/wx-login-service'

const schema = z.object({
  identity: z.string().trim().min(1, '请输入手机号、邮箱或账号').max(255, '账号格式不正确'),
  password: z.string().min(8, '密码至少需要 8 位').max(128, '密码格式不正确'),
})

export default defineEventHandler(async (event) => {
  const body = await validateBody(event, schema)
  const pb = await getAdminPB()
  try {
    const result = await loginWxUserByIdentityPassword(pb, body.identity, body.password)
    await recordLoginAttempt(pb, event, { identity: `identity:${body.identity.slice(0, 3)}***`, status: '0', message: '账号密码登录成功', loginType: 'account', userId: result.user.id })
    return success(result, '登录成功')
  }
  catch (error) {
    await recordLoginAttempt(pb, event, { identity: `identity:${body.identity.slice(0, 3)}***`, status: '1', message: '账号密码登录失败', loginType: 'account' })
    throw error
  }
})
