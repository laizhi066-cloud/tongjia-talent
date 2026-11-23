/**
 * @description 微信小程序认证编排：取得临时 code、换取会话，并交回结果由页面统一收尾。
 *   仅在 MP-WEIXIN 产物中使用；H5 不展示微信授权入口。
 * @file src/modules/foundation-portal/composables/useWechatAuthentication.ts
 */
import { shallowRef } from 'vue'
import { useAuthStore } from '@/store/auth'
import type { FoundationAuthResult } from '../types'

/** 获取小程序临时登录 code。 */
function getMiniProgramCode(): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: (result) => {
        if (result.code)
          resolve(result.code)
        else
          reject(new Error('未获取到微信登录凭证'))
      },
      fail: reject,
    })
  })
}

/** 面板 loading 与失败提示统一放在这里，页面只关心成功结果。 */
export function useWechatAuthentication() {
  const authStore = useAuthStore()
  const loading = shallowRef(false)

  /** 微信小程序授权登录（兜底路径）。 */
  async function loginWithWechat(): Promise<FoundationAuthResult | null> {
    if (loading.value)
      return null
    loading.value = true
    try {
      return await authStore.loginByWechatCode(await getMiniProgramCode())
    }
    catch (error) {
      uni.showToast({
        title: error instanceof Error && error.message ? error.message : '微信登录未完成，请重试',
        icon: 'none',
      })
      return null
    }
    finally {
      loading.value = false
    }
  }

  /** 微信手机号一键登录（主路径）。 */
  async function loginWithWechatPhone(phoneCode: string): Promise<FoundationAuthResult | null> {
    if (loading.value)
      return null
    loading.value = true
    try {
      const loginCode = await getMiniProgramCode()
      return await authStore.loginByWechatPhone(loginCode, phoneCode)
    }
    catch (error) {
      uni.showToast({
        title: error instanceof Error && error.message ? error.message : '手机号授权未完成，请重试',
        icon: 'none',
      })
      return null
    }
    finally {
      loading.value = false
    }
  }

  return { loading, loginWithWechat, loginWithWechatPhone }
}
