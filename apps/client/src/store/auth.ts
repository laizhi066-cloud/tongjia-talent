/**
 * @description 基础门户认证状态，仅管理微信会话与中性账户资料。
 * @file src/store/auth.ts
 */
import { defineStore } from 'pinia'
import { getProfile, passwordLogin, wxLogin, wxPhoneLogin } from '@/api/auth'
import type { FoundationAuthResult, FoundationUser } from '@/modules/foundation-portal/types'

const TOKEN_STORAGE_KEY = 'foundation_access_token'
const EXPIRES_STORAGE_KEY = 'foundation_access_expires_at'
const PROFILE_STORAGE_KEY = 'foundation_profile'
const OPENID_STORAGE_KEY = 'foundation_openid'

interface StoredProfile extends FoundationUser {}

interface ApiRequestError {
  statusCode?: number
}

/** 判断资料接口是否明确拒绝了现有会话，而不是临时网络异常。 */
function isSessionRejected(error: object): boolean {
  return [401, 403].includes((error as ApiRequestError).statusCode ?? 0)
}

/** 将 token、过期时间和资料持久化为下一次冷启动可恢复的会话。 */
function persistSession(token: string, expiresAt: number, profile: FoundationUser, openid: string): void {
  uni.setStorageSync(TOKEN_STORAGE_KEY, token)
  uni.setStorageSync(EXPIRES_STORAGE_KEY, expiresAt)
  uni.setStorageSync(PROFILE_STORAGE_KEY, profile)
  if (openid)
    uni.setStorageSync(OPENID_STORAGE_KEY, openid)
}

/** 清理基础版会话的全部本地数据。 */
function clearPersistedSession(): void {
  uni.removeStorageSync(TOKEN_STORAGE_KEY)
  uni.removeStorageSync(EXPIRES_STORAGE_KEY)
  uni.removeStorageSync(PROFILE_STORAGE_KEY)
  uni.removeStorageSync(OPENID_STORAGE_KEY)
}

export const useAuthStore = defineStore('foundation-auth', {
  state: () => ({
    token: '',
    expiresAt: 0,
    profile: null as FoundationUser | null,
    openid: '',
  }),

  getters: {
    /** 当前 token 是否仍有效。 */
    isLoggedIn: state => Boolean(state.token) && state.expiresAt > Date.now(),
  },

  actions: {
    /** 从本地恢复仍有效的基础门户会话。 */
    restore(): void {
      const token = String(uni.getStorageSync(TOKEN_STORAGE_KEY) || '')
      const expiresAt = Number(uni.getStorageSync(EXPIRES_STORAGE_KEY) || 0)
      const profile = uni.getStorageSync(PROFILE_STORAGE_KEY) as StoredProfile | ''
      const openid = String(uni.getStorageSync(OPENID_STORAGE_KEY) || '')
      if (!token || expiresAt <= Date.now() || !profile) {
        clearPersistedSession()
        return
      }
      this.token = token
      this.expiresAt = expiresAt
      this.profile = profile
      this.openid = openid
    },

    /** 写入一次后端认证结果。 */
    saveAuth(result: FoundationAuthResult): void {
      const expiresAt = Date.now() + result.expiresIn * 1000
      this.token = result.token
      this.expiresAt = expiresAt
      this.profile = result.user
      this.openid = result.openid || ''
      persistSession(this.token, this.expiresAt, result.user, this.openid)
    },

    /** 以当前微信小程序登录 code 换取基础门户会话。 */
    async loginByWechatCode(code: string): Promise<FoundationAuthResult> {
      const result = await wxLogin({ code })
      this.saveAuth(result)
      return result
    },

    /** 以微信手机号能力换取基础门户会话。 */
    async loginByWechatPhone(loginCode: string, phoneCode: string): Promise<FoundationAuthResult> {
      const result = await wxPhoneLogin({ loginCode, phoneCode })
      this.saveAuth(result)
      return result
    },

    /** 使用 PocketBase identity 和密码登录 C 端账户。 */
    async loginByPassword(identity: string, password: string): Promise<FoundationAuthResult> {
      const result = await passwordLogin({ identity, password })
      this.saveAuth(result)
      return result
    },

    /** 从服务端刷新个人资料，并同步本地持久化会话。 */
    async refreshProfile(): Promise<void> {
      if (!this.isLoggedIn)
        return
      try {
        const profile = await getProfile()
        this.profile = profile
        persistSession(this.token, this.expiresAt, profile, this.openid)
      }
      catch (error) {
        // 网络短暂失败保留缓存；服务端明确拒绝时立即清除失效 token，不能继续展示为“已登录”。
        if (error !== null && typeof error === 'object' && isSessionRejected(error)) {
          this.logout()
          uni.showToast({ title: '登录状态已失效，请重新登录', icon: 'none' })
        }
      }
    },

    /** 将保存后的个人资料同步到 store。 */
    updateProfile(profile: FoundationUser): void {
      this.profile = profile
      if (this.token)
        persistSession(this.token, this.expiresAt, profile, this.openid)
    },

    /** 退出当前账户并清理本地会话。 */
    logout(): void {
      this.token = ''
      this.expiresAt = 0
      this.profile = null
      this.openid = ''
      clearPersistedSession()
    },
  },
})
