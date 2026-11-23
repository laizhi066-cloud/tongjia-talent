/**
 * @description API 统一响应格式 { code, message, data } — 成功响应工具函数
 * @file server/utils/response.ts
 */
import { publicPbUrl } from './file-url'

export function success<T>(data: T, message = '操作成功') {
  return { code: 200, message, data }
}

/**
 * 将记录中的文件名字段替换为完整访问 URL（用于单条记录端点）
 * @param record - 单条记录
 * @param collectionName - PocketBase 集合名
 * @param fileFields - 需要替换的文件字段名列表
 */
export function resolveFileUrls<T extends Record<string, any>>(
  record: T,
  collectionName: string,
  fileFields: string[],
): T {
  const pbUrl = publicPbUrl()
  const resolved = { ...record } as Record<string, any>
  for (const field of fileFields) {
    if (resolved[field]) {
      resolved[field] = `${pbUrl}/api/files/${collectionName}/${resolved.id}/${resolved[field]}`
    }
  }
  return resolved as T
}
