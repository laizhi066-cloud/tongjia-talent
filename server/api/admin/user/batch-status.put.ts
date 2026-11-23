/**
 * @description 批量启用或停用基础后台用户。
 * @file server/api/admin/user/batch-status.put.ts
 * @route PUT /api/admin/user/batch-status
 */
import { z } from 'zod'

const schema = z.object({ ids: z.array(z.string()).min(1).max(100), status: z.enum(['0', '1']) })

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:user:edit')
  return withOperLog(event, { title: '用户管理', operType: OperType.UPDATE }, async () => {
    const { ids, status } = await validateBody(event, schema)
    const pb = await getAdminPB()
    if (!await currentUserIsSuper(event)) {
      const protectedIds = new Set(await getSuperUserIds(pb))
      if (ids.some(id => protectedIds.has(id))) throw createError({ statusCode: 404, message: '用户不存在' })
    }
    const result = await batchUpdate('users', ids, { status })
    if (result.failed) throw createError({ statusCode: 500, message: `成功 ${result.success} 条，失败 ${result.failed} 条` })
    return success({ updated: result.success })
  })
})
