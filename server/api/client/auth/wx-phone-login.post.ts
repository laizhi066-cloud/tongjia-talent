/**
 * @description C 端微信手机号一键登录：通过 getPhoneNumber 授权创建或登录中性账户。
 * @file server/api/client/auth/wx-phone-login.post.ts
 * @route POST /api/client/auth/wx-phone-login
 * @body { loginCode: string, phoneCode: string }  // loginCode=uni.login 取 openid；phoneCode=getPhoneNumber 回调 code
 * @returns { token, openid, user, isNew }
 * 同一手机号始终复用同一个中性账户，并补齐小程序 openid。
 */
import { z } from 'zod'
import { findOrCreateWxUserByPhone, wxCode2Session, wxGetPhoneNumber } from '~~/server/utils/wx-login-service'

const schema = z.object({
  loginCode: z.string({ message: 'loginCode 不能为空' }).min(1, 'loginCode 不能为空'),
  phoneCode: z.string({ message: 'phoneCode 不能为空' }).min(1, 'phoneCode 不能为空'),
})

export default defineEventHandler(async (event) => {
  const body = await validateBody(event, schema)

  const adminPB = await getAdminPB()
  let openid = ''
  let audited = false

  try {
    // 1) 先判断小程序 AppID/AppSecret 是否完整；未配置直接返回 503 + WX_MP_CONFIG_MISSING 给前端提示
    //    配置完整后再 loginCode → openid，避免把后台配置问题伪装成微信 code 失败。
    const wxRes = await wxCode2Session(adminPB, body.loginCode)
    if (!wxRes.openid || wxRes.errcode) {
      await recordLoginAttempt(adminPB, event, { identity: wechatLoginIdentity(''), status: '1', message: '微信授权校验失败', loginType: 'wechat' })
      audited = true
      throw createError({ statusCode: 400, message: `微信登录失败: ${wxRes.errmsg || '未获取到 openid'}` })
    }
    openid = wxRes.openid

    // 2) phoneCode → 手机号（需微信配置 + 企业认证，未配置会抛 503）
    const phone = await wxGetPhoneNumber(adminPB, body.phoneCode)

    // 3) 以手机号为统一身份查/建用户并绑定 openid
    const result = await findOrCreateWxUserByPhone(adminPB, openid, phone)
    await recordLoginAttempt(adminPB, event, { identity: wechatLoginIdentity(openid), status: '0', message: '微信一键登录成功', loginType: 'wechat', userId: result.user.id })
    audited = true
    return success(result, result.isNew ? '注册成功' : '登录成功')
  }
  catch (error) {
    if (!audited)
      await recordLoginAttempt(adminPB, event, { identity: wechatLoginIdentity(openid), status: '1', message: '微信一键登录失败', loginType: 'wechat' })
    throw error
  }
})
