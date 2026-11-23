/**
 * @description 文件字段清洗 — PocketBase 的 file 字段只能由 multipart 上传端点写入，
 *   JSON 创建/更新端点若把已存在文件的 URL 字符串(http.../api/files/...)回传给 pb.update，
 *   会触发 validation_invalid_file。此处在写库前剔除这类"URL 值"，保持原文件不变。
 * @file server/utils/file-fields.ts
 */

/** 是否为"已上传文件的引用值"（完整 URL / api/files 路径），而非新文件 */
function isUploadedFileRef(v: unknown): boolean {
  return typeof v === 'string' && (v.startsWith('http') || v.includes('/api/files/'))
}

/**
 * 从写库数据中剔除 file 字段的 URL 值（保留空串以便清空、保留非 URL 的真实值）。
 * @param data 待写库对象（原地修改并返回）
 * @param fields file 字段名列表，如 ['imageUrl','coverUrl','avatar']
 */
export function pruneFileUrlFields<T extends Record<string, any>>(data: T, fields: string[]): T {
  for (const f of fields) {
    if (f in data && isUploadedFileRef(data[f]))
      Reflect.deleteProperty(data, f)
  }
  return data
}
