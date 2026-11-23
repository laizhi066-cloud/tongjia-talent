/**
 * @description 上传不绑定业务实体的通用附件。
 * @file server/api/upload/form.post.ts
 * @route POST /api/upload/form
 */
import { assertFoundationUploadFile } from '~~/server/utils/upload-handler'

export default defineEventHandler(async (event) => {
  const user = await getCurrentUserBasic(event)
  return withOperLog(event, { title: '通用附件上传', operType: OperType.INSERT }, async () => {
    const parts = await readMultipartFormData(event)
    const file = parts?.find(part => part.name === 'file')
    if (!file) throw createError({ statusCode: 400, message: '未收到文件' })
    assertFoundationUploadFile(file, 'uploads')
    const form = new FormData()
    form.append('file', new File([new Uint8Array(file.data)], file.filename || 'file', { type: file.type || 'application/octet-stream' }))
    form.append('filename', file.filename || 'file')
    form.append('mimeType', file.type || 'application/octet-stream')
    form.append('size', String(file.data.length))
    form.append('userId', user.id)
    const record = await (await getAdminPB()).collection('uploads').create(form, { $autoCancel: false })
    return success({ id: record.id, name: file.filename || 'file', url: pocketBaseFileUrl('uploads', record.id, record.file) })
  })
})
