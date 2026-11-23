/**
 * @description 注销中性账户并清除可识别信息。
 * @file server/api/client/auth/delete-account.post.ts
 * @route POST /api/client/auth/delete-account
 * @body { confirm: true }
 */
import { z } from 'zod'
import crypto from 'node:crypto'
import { foundationIdentityHash } from '~~/server/utils/wx-login-service'

const schema = z.object({ confirm: z.literal(true, { message: '请确认注销操作' }) })

export default defineEventHandler(async (event) => {
  const user = await getCurrentUserBasic(event)
  return withOperLog(event, { title: '账户注销', operType: OperType.DELETE }, async () => {
    await validateBody(event, schema)
    // users 是认证集合，保留原邮箱或密码会让旧身份仍可被命中；用随机占位凭据释放原身份。
    const anonymised = `del_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
    const deletedPassword = crypto.randomUUID().replace(/-/g, '')
    await (await getAdminPB()).collection('users').update(user.id, {
      status: '0', phone: anonymised, openid: '', unionid: '',
      deletedOpenidHash: foundationIdentityHash(user.openid),
      deletedUnionidHash: foundationIdentityHash(user.unionid),
      deletedPhoneHash: foundationIdentityHash(user.phone),
      email: `${anonymised}@foundation.local.invalid`, username: anonymised,
      password: deletedPassword, passwordConfirm: deletedPassword,
      nickname: '已注销用户', displayName: '已注销用户', avatar: '', gender: '', birthday: '', region: '', bio: '',
    }, { $autoCancel: false })
    return success({ ok: true }, '账号已注销')
  })
})
