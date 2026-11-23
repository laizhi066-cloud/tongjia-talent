/**
 * @description C 端基础认证与中性个人资料 API 封装。
 * @file src/api/auth.ts
 */
import { get, post, put, resolveClientApiUrl } from '@/http/http'
import type { FoundationAuthResult, FoundationProfileInput, FoundationUser } from '@/modules/foundation-portal/types'

interface UploadEnvelope {
  code: number
  data?: { url?: string }
  message?: string
}

/** 微信小程序 code 登录。 */
export function wxLogin(data: { code: string }): Promise<FoundationAuthResult> {
  return post('/api/client/auth/wx-login', data, { skipAuth: true, hideErrorToast: true })
}

/** 微信手机号一键登录。 */
export function wxPhoneLogin(data: { loginCode: string, phoneCode: string }): Promise<FoundationAuthResult> {
  return post('/api/client/auth/wx-phone-login', data, { skipAuth: true, hideErrorToast: true })
}

/** 使用 PocketBase 配置的 identity 和密码登录 C 端账户。 */
export function passwordLogin(data: { identity: string, password: string }): Promise<FoundationAuthResult> {
  return post('/api/client/auth/phone-login', data, { skipAuth: true, hideErrorToast: true })
}

/** 获取当前中性账户资料。 */
export function getProfile(): Promise<FoundationUser> {
  return get('/api/client/auth/profile')
}

/** 更新当前中性账户资料。 */
export function updateProfile(data: FoundationProfileInput): Promise<FoundationUser> {
  return put('/api/client/auth/profile', data)
}

/** 通过受控上传接口更新当前用户头像；客户端不直接写 PocketBase。 */
export function uploadAvatar(filePath: string): Promise<{ url: string }> {
  return new Promise<{ url: string }>((resolve, reject) => {
    const token = String(uni.getStorageSync('foundation_access_token') || '')
    uni.uploadFile({
      url: resolveClientApiUrl('/api/upload'),
      filePath,
      name: 'file',
      formData: { collection: 'users', field: 'avatar' },
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success: (response) => {
        try {
          const payload = JSON.parse(response.data) as UploadEnvelope
          if (response.statusCode >= 200 && response.statusCode < 300 && payload.code === 200 && payload.data?.url) {
            resolve({ url: payload.data.url })
            return
          }
          reject(new Error(payload.message || '头像上传失败'))
        }
        catch { reject(new Error('头像上传失败')) }
      },
      fail: error => reject(new Error(error?.errMsg || '头像上传失败，请稍后重试')),
    })
  })
}

/** 注销当前账户。 */
export function deleteAccount(): Promise<{ ok: boolean }> {
  return post('/api/client/auth/delete-account', { confirm: true })
}
