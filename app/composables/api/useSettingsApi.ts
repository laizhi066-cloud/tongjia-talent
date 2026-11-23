/**
 * @description 微信认证配置 API。
 * @file app/composables/api/useSettingsApi.ts
 */
export interface WechatCredential {
  appId: string
  appSecret: string
}

export interface WechatSettings {
  mp: WechatCredential
}

export function useSettingsApi() {
  const fetchWechatSettings = (options: { suppressErrorToast?: boolean } = {}) =>
    useApi<WechatSettings>('/api/admin/settings/wechat', options)
  const saveWechatSettings = (body: WechatSettings) =>
    useApi<WechatSettings>('/api/admin/settings/wechat', { method: 'POST', body })
  const testWechatSettings = () =>
    useApi<{ ok: boolean }>('/api/admin/settings/wechat/test', { method: 'POST', body: {} })
  return { fetchWechatSettings, saveWechatSettings, testWechatSettings }
}
