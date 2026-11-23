/**
 * @description Role API module — 角色管理 CRUD + 菜单权限分配
 * @file app/composables/api/useRoleApi.ts
 */

export function useRoleApi() {
  const fetchRoles = (params: { page?: number; pageSize?: number; roleName?: string; status?: string }) =>
    useApi<PaginatedResponse<RoleEntity>>('/api/admin/role', { params })

  const createRole = (data: {
    roleName: string; roleKey: string; roleSort?: number
    dataScope?: string; status?: string; remark?: string; deptScopeIds?: string[]
  }) =>
    useApi<RoleEntity>('/api/admin/role', { method: 'POST', body: data, successToast: true })

  const updateRole = (id: string, data: {
    roleName?: string; roleKey?: string; roleSort?: number
    dataScope?: string; status?: string; remark?: string; deptScopeIds?: string[]
  }) =>
    useApi<RoleEntity>(`/api/admin/role/${id}`, { method: 'PUT', body: data, successToast: true })

  const deleteRole = (id: string) =>
    useApi<null>(`/api/admin/role/${id}`, { method: 'DELETE', successToast: true })

  const getRole = (id: string) =>
    useApi<RoleEntity>(`/api/admin/role/${id}`)

  const assignMenus = (roleId: string, menuIds: string[]) =>
    useApi<null>(`/api/admin/role/${roleId}/menus`, { method: 'PUT', body: { menuIds }, successToast: true })

  return { fetchRoles, createRole, updateRole, deleteRole, getRole, assignMenus }
}
