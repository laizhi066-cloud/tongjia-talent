/**
 * @description Menu API module — 菜单管理 CRUD + 树
 * @file app/composables/api/useMenuApi.ts
 */

export function useMenuApi() {
  const fetchMenuTree = (all?: boolean) =>
    useApi<MenuEntity[]>('/api/admin/menu/tree', { params: all ? { all: 'true' } : undefined })

  const createMenu = (data: {
    parentId?: string | null; menuType: string; menuName: string
    permissionCode?: string; path?: string; component?: string; icon?: string
    orderNum?: number; visible?: string; status?: string
  }) =>
    useApi<MenuEntity>('/api/admin/menu', { method: 'POST', body: data, successToast: true })

  const updateMenu = (id: string, data: {
    parentId?: string | null; menuType?: string; menuName?: string
    permissionCode?: string; path?: string; component?: string; icon?: string
    orderNum?: number; visible?: string; status?: string
  }) =>
    useApi<MenuEntity>(`/api/admin/menu/${id}`, { method: 'PUT', body: data, successToast: true })

  const deleteMenu = (id: string) =>
    useApi<null>(`/api/admin/menu/${id}`, { method: 'DELETE', successToast: true })

  return { fetchMenuTree, createMenu, updateMenu, deleteMenu }
}
