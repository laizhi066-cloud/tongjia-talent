/**
 * @description 清除本人头像或通用附件的文件字段。
 * @file server/api/upload/clear.post.ts
 * @route POST /api/upload/clear
 */
import { z } from 'zod'
import { checkUploadPermission } from '~~/server/utils/upload-handler'

const schema = z.object({ collection: z.enum(['users', 'uploads']), recordId: z.string().min(1), field: z.string().min(1) })

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  return withOperLog(event, { title: '清除文件', operType: OperType.UPDATE }, async () => {
    const body = await validateBody(event, schema)
    if (body.collection === 'users' && body.field !== 'avatar') throw createError({ statusCode: 400, message: '用户仅支持清除头像' })
    if (body.collection === 'uploads' && body.field !== 'file') throw createError({ statusCode: 400, message: '通用附件仅支持清除 file 字段' })
    await checkUploadPermission(event, body.collection, body.recordId, user.id)
    await (await getAdminPB()).collection(body.collection).update(body.recordId, { [body.field]: null }, { $autoCancel: false })
    return success(null, '已移除')
  })
})
