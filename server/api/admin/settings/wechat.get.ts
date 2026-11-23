/**
 * @description GET /api/admin/settings/wechat — 读取唯一站点的微信认证配置。
 * @file server/api/admin/settings/wechat.get.ts
 * @route GET /api/admin/settings/wechat
 * @returns { mp: { appId: string, appSecret: string } }
 */
import { maskSecret } from '~~/server/utils/secret-config'

export default defineEventHandler(async (event) => {
  await requireSuper(event)
  const pb = await getAdminPB()
  const mp = await getWxCreds(pb)

  return success({
    mp: { appId: mp.appId, appSecret: maskSecret(mp.appSecret) },
  }, '微信配置')
})
