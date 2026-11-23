/**
 * @description 通用文件上传 API — 将文件上传到指定 PocketBase 集合记录的指定字段
 * @route POST /api/upload
 */
import { processUpload } from '~~/server/utils/upload-handler'

export default defineEventHandler(async (event) => {
  return withOperLog(event, { title: '文件上传', operType: OperType.INSERT }, async () => {
    const user = await getCurrentUser(event)
    const result = await processUpload(event, user.id, publicPbUrl())
    return success(result)
  })
})
