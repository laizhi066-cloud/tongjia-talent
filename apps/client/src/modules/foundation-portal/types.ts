/**
 * @description 基础门户共享的站点、认证与个人资料类型。
 * @file src/modules/foundation-portal/types.ts
 */

/** 基础版唯一站点下发的可公开配置。 */
export interface FoundationSiteConfig {
  appName: string
  adminName: string
  logo: string
  slogan: string
  copyright: string
  contactPhone: string
  primaryColor: string
  themeMode: 'light' | 'dark' | 'system'
}

/** 中性账户资料，不携带额外身份字段。 */
export interface FoundationUser {
  id: string
  nickname: string
  avatar: string
  phone?: string
  phoneBound?: boolean
  gender?: 'male' | 'female' | 'secret' | ''
  birthday?: string
  region?: string
  bio?: string
}

/** 微信认证成功的统一响应。 */
export interface FoundationAuthResult {
  token: string
  expiresIn: number
  openid?: string
  isNew: boolean
  user: FoundationUser
}

/** 可编辑的中性个人资料字段。 */
export interface FoundationProfileInput {
  nickname: string
  gender?: 'male' | 'female' | 'secret' | ''
  birthday?: string
  region?: string
  bio?: string
}
