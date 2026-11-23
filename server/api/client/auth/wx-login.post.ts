/**
 * @description C 端微信小程序登录：通过 code 创建或登录中性账户。
 * @file server/api/client/auth/wx-login.post.ts
 * @route POST /api/client/auth/wx-login
 * @body { code: string }
 * @returns { token: string, openid: string, user: object, isNew: boolean }
 */
import { z } from 'zod'
import { wxCode2Session, findOrCreateWxUser } from '~~/server/utils/wx-login-service'

const wxLoginSchema = z.object({
  code: z.string({ message: 'code 不能为空' }).min(1, 'code 不能为空'),
})

export default defineEventHandler(async (event) => {
  const body = await validateBody(event, wxLoginSchema)

  const adminPB = await getAdminPB()
  let openid = ''
  let audited = false
  try {
    const wxRes = await wxCode2Session(adminPB, body.code)

    if (!wxRes.openid || wxRes.errcode) {
      await recordLoginAttempt(adminPB, event, { identity: wechatLoginIdentity(''), status: '1', message: '微信授权校验失败', loginType: 'wechat' })
      audited = true
      throw createError({ statusCode: 400, message: `微信登录失败: ${wxRes.errmsg || '未获取到 openid'}` })
    }

    openid = wxRes.openid
    const result = await findOrCreateWxUser(adminPB, openid, wxRes.unionid)
    await recordLoginAttempt(adminPB, event, { identity: wechatLoginIdentity(openid), status: '0', message: '微信登录成功', loginType: 'wechat', userId: result.user.id })
    audited = true
    return success(result, result.isNew ? '注册成功' : '登录成功')
  }
  catch (error) {
    if (!audited)
      await recordLoginAttempt(adminPB, event, { identity: wechatLoginIdentity(openid), status: '1', message: '微信登录处理失败', loginType: 'wechat' })
    throw error
  }
})
