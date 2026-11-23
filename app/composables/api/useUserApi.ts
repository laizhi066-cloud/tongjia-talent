/**
 * @description User API module — 用户管理 CRUD + 角色分配 + 重置密码
 * @file app/composables/api/useUserApi.ts
 */

export function useUserApi() {
  const fetchUsers = (params: { page?: number; pageSize?: number; userName?: string; status?: string; deptId?: string }) =>
    useApi<PaginatedResponse<UserEntity>>('/api/admin/user', { params })

  const createUser = (data: {
    email: string; password: string; displayName: string
    phone?: string; deptId?: string | null; status?: string; postIds?: string[]
  }) =>
    useApi<UserEntity>('/api/admin/user', { method: 'POST', body: data, successToast: true })

  const updateUser = (id: string, data: {
    displayName?: string; phone?: string
    deptId?: string | null; status?: string; postIds?: string[]
  }) =>
    useApi<UserEntity>(`/api/admin/user/${id}`, { method: 'PUT', body: data, successToast: true })

  const deleteUser = (id: string) =>
    useApi<null>(`/api/admin/user/${id}`, { method: 'DELETE', successToast: true })

  const getUser = (id: string) =>
    useApi<UserEntity>(`/api/admin/user/${id}`)

  const assignRoles = (userId: string, roleIds: string[]) =>
    useApi<null>(`/api/admin/user/${userId}/roles`, { method: 'PUT', body: { roleIds }, successToast: true })

  const resetPassword = (userId: string, password: string, passwordConfirm: string) =>
    useApi<null>(`/api/admin/user/${userId}/reset-pwd`, { method: 'PUT', body: { password, passwordConfirm }, successToast: true })

  const batchUpdateStatus = (ids: string[], status: string) =>
    useApi<null>('/api/admin/user/batch-status', { method: 'PUT', body: { ids, status }, suppressToast: true })

  return { fetchUsers, createUser, updateUser, deleteUser, getUser, assignRoles, resetPassword, batchUpdateStatus }
}
