/**
 * @description 更新基础后台用户及岗位关联。
 * @file server/api/admin/user/[id].put.ts
 * @route PUT /api/admin/user/:id
 */
import { z } from 'zod'

const schema = z.object({
  displayName: z.string().min(1).max(60), nickname: z.string().max(60).optional().default(''), phone: z.string().max(20).optional().default(''),
  deptId: z.string().nullable().optional(), status: z.enum(['0', '1']), postIds: z.array(z.string()).max(20).optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:user:edit')
  return withOperLog(event, { title: '用户管理', operType: OperType.UPDATE }, async () => {
    const id = getRouterParam(event, 'id') as string
    const body = await validateBody(event, schema)
    const pb = await getAdminPB()
    if (!await currentUserIsSuper(event) && await userHasSuperRole(pb, id))
      throw createError({ statusCode: 404, message: '用户不存在' })
    const { postIds, ...data } = body
    const user = await pb.collection('users').update(id, data, { $autoCancel: false })
    if (postIds !== undefined) {
      const existing = await pb.collection('user_posts').getFullList({ filter: `userId = "${escapeFilterValue(id)}"`, $autoCancel: false })
      await Promise.all(existing.map((row: any) => pb.collection('user_posts').delete(row.id, { $autoCancel: false })))
      await Promise.all(postIds.map(postId => pb.collection('user_posts').create({ userId: id, postId }, { $autoCancel: false })))
    }
    return success(user, '修改成功')
  })
})
