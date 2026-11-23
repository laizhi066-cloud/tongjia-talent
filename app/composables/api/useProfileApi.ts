/**
 * @description Profile API module — 个人中心信息 + 密码修改
 * @file app/composables/api/useProfileApi.ts
 */

export function useProfileApi() {
  const fetchProfile = () =>
    useApi<Record<string, any>>('/api/admin/profile')

  const updateProfile = (data: { displayName?: string; phone?: string }) =>
    useApi<Record<string, any>>('/api/admin/profile', { method: 'PUT', body: data })

  const changePassword = (data: { oldPassword: string; newPassword: string }) =>
    useApi<null>('/api/admin/profile/password', { method: 'PUT', body: data })

  return { fetchProfile, updateProfile, changePassword }
}
