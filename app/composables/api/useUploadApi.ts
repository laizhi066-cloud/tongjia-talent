/**
 * @description Upload API module — 文件上传
 * @file app/composables/api/useUploadApi.ts
 */

export function useUploadApi() {
  const uploadFile = (formData: FormData) =>
    useApi<{ filename: string; url: string; recordId?: string }>('/api/upload', {
      method: 'POST',
      body: formData,
    })

  // 独立媒体上传：落 uploads 集合并自动建记录，返回公开绝对 URL，不绑业务记录/用户头像。
  // 用于站点 Logo 等「无宿主记录」的基础图片。
  const uploadFormFile = (formData: FormData) =>
    useApi<{ url: string; name: string }>('/api/upload/form', {
      method: 'POST',
      body: formData,
    })

  // 清除已落库的 file 字段（移除图片），与 uploadFile 对称
  const clearFile = (body: { collection: string; recordId: string; field: string }) =>
    useApi<null>('/api/upload/clear', { method: 'POST', body })

  return { uploadFile, uploadFormFile, clearFile }
}
