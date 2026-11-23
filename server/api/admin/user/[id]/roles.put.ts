/**
 * @description 分配基础后台用户角色。
 * @file server/api/admin/user/[id]/roles.put.ts
 * @route PUT /api/admin/user/:id/roles
 */
import { z } from 'zod'

const schema = z.object({ roleIds: z.array(z.string()).max(20) })

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:user:edit')
  return withOperLog(event, { title: '用户管理', operType: OperType.GRANT }, async () => {
    const id = getRouterParam(event, 'id') as string
    const { roleIds } = await validateBody(event, schema)
    const pb = await getAdminPB()
    if (!await currentUserIsSuper(event) && await userHasSuperRole(pb, id))
      throw createError({ statusCode: 404, message: '用户不存在' })
    if (roleIds.length) await requireSuperForProtectedRoleIds(event, pb, roleIds)
    const rows = await pb.collection('user_roles').getFullList({ filter: `userId = "${escapeFilterValue(id)}"`, $autoCancel: false })
    await Promise.all(rows.map((row: any) => pb.collection('user_roles').delete(row.id, { $autoCancel: false })))
    await Promise.all(roleIds.map(roleId => pb.collection('user_roles').create({ userId: id, roleId }, { $autoCancel: false })))
    return success(null, '授权成功')
  })
})
