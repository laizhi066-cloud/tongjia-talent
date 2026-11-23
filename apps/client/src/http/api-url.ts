/**
 * @description C 端接口基地址选择与小程序 URL 校验；不读取密钥或切换数据源。
 * @file src/http/api-url.ts
 */
export type WeixinEnvVersion = 'develop' | 'trial' | 'release'

export interface ApiBaseEnvironment {
  VITE_SERVER_BASEURL?: string
  VITE_SERVER_BASEURL__WEIXIN_DEVELOP?: string
  VITE_SERVER_BASEURL__WEIXIN_TRIAL?: string
  VITE_SERVER_BASEURL__WEIXIN_RELEASE?: string
}

/** 微信运行环境的专用地址优先；未配置时使用同一应用的通用地址。 */
export function selectApiBaseUrl(env: ApiBaseEnvironment, version?: WeixinEnvVersion): { baseUrl: string, source: string } {
  const key = version ? `VITE_SERVER_BASEURL__WEIXIN_${version.toUpperCase()}` as keyof ApiBaseEnvironment : undefined
  const source = key && env[key]?.trim() ? key : 'VITE_SERVER_BASEURL'
  return { baseUrl: (env[source] || '').trim(), source }
}

/** 小程序没有浏览器同源地址；拒绝相对路径、凭据和 query/hash，体验/正式环境必须 HTTPS。 */
export function assertMiniProgramBaseUrl(baseUrl: string, source: string, version: WeixinEnvVersion): void {
  // 不依赖小程序基础库中未必可用的 URL 构造器。
  if (!/^https?:\/\/[^\s/?#@:]+(?::\d{1,5})?(?:\/[^\s?#]*)?$/i.test(baseUrl)) {
    throw new Error(`小程序接口地址不合法：${source} 必须是完整 http(s) URL，不能使用 / 或相对路径`)
  }
  if (version !== 'develop' && !/^https:\/\//i.test(baseUrl))
    throw new Error(`小程序 ${version} 环境的 ${source} 必须使用 HTTPS 地址`)
}

/** 拼接接口路径，H5 的 / 同源前缀保持为 /api/...。 */
export function joinApiUrl(baseUrl: string, path: string): string {
  if (/^https?:\/\//i.test(path))
    return path
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}
