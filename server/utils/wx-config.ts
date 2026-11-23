/**
 * @description 微信凭据读取：唯一站点的 configs.wechat_config。
 * @file server/utils/wx-config.ts
 */
import { decryptMaybe } from './secret-config'

export interface WxCreds { appId: string, appSecret: string }
export type WxKind = 'mp'

export async function getWxCreds(pb: any): Promise<WxCreds> {
  const record = await pb.collection('configs').getFirstListItem('configKey = "wechat_config"', { $autoCancel: false }).catch(() => null)
  if (!record) return { appId: '', appSecret: '' }
  try {
    const config = JSON.parse(record.configValue || '{}') as Record<string, unknown>
    return {
      appId: String(config.mpAppId || '').trim(),
      appSecret: decryptMaybe(String(config.mpAppSecret || '')).trim(),
    }
  }
  catch {
    return { appId: '', appSecret: '' }
  }
}

export async function assertWxConfigured(pb: any, _kind: WxKind): Promise<WxCreds> {
  const credentials = await getWxCreds(pb)
  if (credentials.appId && credentials.appSecret) return credentials
  throw createError({ statusCode: 503, message: '未配置小程序 AppID/AppSecret', data: { code: 'WX_MP_CONFIG_MISSING' } })
}
