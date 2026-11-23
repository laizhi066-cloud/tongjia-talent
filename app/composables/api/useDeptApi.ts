/**
 * @description Dept API module — 部门管理 CRUD + 树
 * @file app/composables/api/useDeptApi.ts
 */

export function useDeptApi() {
  const fetchDeptTree = () =>
    useApi<DeptEntity[]>('/api/admin/dept/tree')

  const createDept = (data: {
    parentId?: string | null; deptName: string; orderNum?: number
    leader?: string; phone?: string; email?: string; status?: string
  }) =>
    useApi<DeptEntity>('/api/admin/dept', { method: 'POST', body: data, successToast: true })

  const updateDept = (id: string, data: {
    parentId?: string | null; deptName?: string; orderNum?: number
    leader?: string; phone?: string; email?: string; status?: string
  }) =>
    useApi<DeptEntity>(`/api/admin/dept/${id}`, { method: 'PUT', body: data, successToast: true })

  const deleteDept = (id: string) =>
    useApi<null>(`/api/admin/dept/${id}`, { method: 'DELETE', successToast: true })

  return { fetchDeptTree, createDept, updateDept, deleteDept }
}
