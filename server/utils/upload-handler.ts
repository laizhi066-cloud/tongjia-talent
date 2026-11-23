/**
 * @description 基础版文件上传：仅允许本人头像或通用 uploads 附件。
 * @file server/utils/upload-handler.ts
 */
import { createError, type H3Event } from 'h3'

export interface UploadResult { filename: string, url: string, recordId: string }

const MAX_FOUNDATION_UPLOAD_BYTES = 10 * 1024 * 1024
const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
])
const ATTACHMENT_MIME_TYPES = new Set([
  ...IMAGE_MIME_TYPES,
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
])

export interface FoundationUploadFile {
  data: Uint8Array
  type?: string
}

/**
 * 基础版只接受可安全预览或常见办公文档；头像进一步限定为图片。
 * MIME 由请求元数据提供，服务端仍统一限制类型、大小和目标字段，避免任意二进制写入。
 *
 * @param file 已解析的 multipart 文件。
 * @param collection 目标基础集合。
 * @returns {void}
 */
export function assertFoundationUploadFile(file: FoundationUploadFile, collection: 'users' | 'uploads'): void {
  if (!file.data.length)
    throw createError({ statusCode: 400, message: '请选择文件' })
  if (file.data.length > MAX_FOUNDATION_UPLOAD_BYTES)
    throw createError({ statusCode: 400, message: '文件不能超过 10MB' })

  const mimeType = String(file.type || '').toLowerCase()
  const allowedMimeTypes = collection === 'users' ? IMAGE_MIME_TYPES : ATTACHMENT_MIME_TYPES
  if (!allowedMimeTypes.has(mimeType))
    throw createError({ statusCode: 415, message: collection === 'users' ? '头像仅支持 JPG、PNG、GIF 或 WebP 图片' : '仅支持图片、PDF、文本和常见 Office 文档' })
}

export async function checkUploadPermission(event: H3Event, collection: string, recordId: string, userId: string): Promise<void> {
  if (collection === 'users' && recordId === userId) return
  if (await hasPermission(event, 'system:user:edit')) return
  if (collection === 'uploads' && recordId) {
    const record = await (await getAdminPB()).collection('uploads').getOne(recordId, { fields: 'userId', $autoCancel: false }).catch(() => null)
    if (record?.userId === userId) return
  }
  throw createError({ statusCode: 403, message: '无权限操作' })
}

export async function processUpload(event: H3Event, userId: string, publicUrl: string): Promise<UploadResult> {
  const parts = await readMultipartFormData(event)
  const file = parts?.find(part => part.name === 'file')
  const collection = String(parts?.find(part => part.name === 'collection')?.data?.toString() || 'users')
  let recordId = String(parts?.find(part => part.name === 'recordId')?.data?.toString() || '')
  const field = String(parts?.find(part => part.name === 'field')?.data?.toString() || 'avatar')
  if (!file) throw createError({ statusCode: 400, message: '请选择文件' })
  if (collection !== 'users' && collection !== 'uploads') throw createError({ statusCode: 400, message: '基础版仅支持用户头像和通用附件' })
  if (collection === 'users') {
    recordId ||= userId
    if (field !== 'avatar') throw createError({ statusCode: 400, message: '用户仅支持上传头像' })
  }
  if (collection === 'uploads' && field !== 'file')
    throw createError({ statusCode: 400, message: '通用附件仅支持写入 file 字段' })
  assertFoundationUploadFile(file, collection)
  if (collection === 'uploads' && !recordId) {
    const pb = await getAdminPB()
    const created = await pb.collection('uploads').create({
      filename: file.filename || 'file',
      mimeType: file.type || 'application/octet-stream',
      size: file.data.length,
      userId,
    }, { $autoCancel: false })
    recordId = created.id
  }
  await checkUploadPermission(event, collection, recordId, userId)
  const form = new FormData()
  form.append(field, new File([new Uint8Array(file.data)], file.filename || 'file', { type: file.type || 'application/octet-stream' }))
  if (collection === 'uploads') {
    form.append('filename', file.filename || 'file')
    form.append('mimeType', file.type || 'application/octet-stream')
    form.append('size', String(file.data.length))
  }
  const updated = await (await getAdminPB()).collection(collection).update(recordId, form, { $autoCancel: false })
  const filename = String(updated[field] || '')
  if (!filename) throw createError({ statusCode: 500, message: '上传失败' })
  return { filename, recordId, url: `${publicUrl.replace(/\/+$/, '')}/api/files/${collection}/${recordId}/${encodeURIComponent(filename)}` }
}
