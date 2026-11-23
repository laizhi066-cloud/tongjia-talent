/**
 * @description POST /api/admin/settings/wechat/test — 向微信验证当前保存的 AppID 与 AppSecret。
 * @file server/api/admin/settings/wechat/test.post.ts
 * @route POST /api/admin/settings/wechat/test
 * @body {}
 * @returns { ok: boolean }
 */
interface WechatAccessTokenResponse {
  access_token?: string
  errmsg?: string
}

export default defineEventHandler(async (event) => {
  await requireSuper(event)
  return withOperLog(event, { title: '验证微信认证配置', operType: OperType.EXECUTE }, async () => {
    await validateBody(event, testWechatSettingsSchema)
    const { appId, appSecret } = await getWxCreds(await getAdminPB())
    if (!appId || !appSecret) {
      throw createError({
        // 管理员尚未填写配置是可预期的表单状态，不应进入 5xx 错误监控。
        statusCode: 400,
        message: '请先填写小程序 AppID 和 AppSecret',
      })
    }
    // 外部 URL 不在 Nuxt 路由表；显式窄化 $fetch 签名，避免 200+ 条后台路由的重载推断触发 TS2589。
    const fetchWechatToken = $fetch as unknown as (
      url: string,
      options?: { timeout?: number },
    ) => Promise<WechatAccessTokenResponse>
    const result = await fetchWechatToken(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(appSecret)}`,
      { timeout: 10_000 },
    )

    if (!result.access_token) {
      throw createError({
        statusCode: 502,
        message: `微信凭据验证失败：${result.errmsg || '未返回 access_token'}`,
      })
    }

    return success({ ok: true }, '小程序凭据有效')
  })
})
