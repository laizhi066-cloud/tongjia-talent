/**
 * @description Post API module — 岗位管理 CRUD
 * @file app/composables/api/usePostApi.ts
 */

export function usePostApi() {
  const fetchPosts = (params: { page?: number; pageSize?: number; postName?: string; postCode?: string; status?: string }) =>
    useApi<PaginatedResponse<PostEntity>>('/api/admin/post', { params })

  const createPost = (data: {
    postCode: string; postName: string; postSort?: number; status?: string; remark?: string
  }) =>
    useApi<PostEntity>('/api/admin/post', { method: 'POST', body: data, successToast: true })

  const updatePost = (id: string, data: {
    postCode?: string; postName?: string; postSort?: number; status?: string; remark?: string
  }) =>
    useApi<PostEntity>(`/api/admin/post/${id}`, { method: 'PUT', body: data, successToast: true })

  const deletePost = (id: string) =>
    useApi<null>(`/api/admin/post/${id}`, { method: 'DELETE', successToast: true })

  return { fetchPosts, createPost, updatePost, deletePost }
}
