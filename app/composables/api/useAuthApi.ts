/**
 * @description 后台管理员认证 API。
 * @file app/composables/api/useAuthApi.ts
 */

export function useAuthApi() {
  const adminLogin = (data: { identity: string, password: string }) =>
    useApi<{ token: string, record: Record<string, unknown> }>('/api/public/admin-login', {
      method: 'POST',
      body: data,
    })

  return { adminLogin }
}
