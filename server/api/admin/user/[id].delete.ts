/**
 * @description 删除基础后台用户及其 RBAC/会话关联。
 * @file server/api/admin/user/[id].delete.ts
 * @route DELETE /api/admin/user/:id
 */
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:user:delete')
  return withOperLog(event, { title: '用户管理', operType: OperType.DELETE }, async () => {
    const id = getRouterParam(event, 'id') as string
    const current = await getCurrentUserBasic(event)
    if (!id) throw createError({ statusCode: 400, message: '缺少用户 ID' })
    if (id === current.id) throw createError({ statusCode: 400, message: '不能删除当前登录账号' })
    const pb = await getAdminPB()
    if (!await currentUserIsSuper(event) && await userHasSuperRole(pb, id)) throw createError({ statusCode: 404, message: '用户不存在' })
    const [roles, posts, sessions] = await Promise.all([
      pb.collection('user_roles').getFullList({ filter: `userId = "${escapeFilterValue(id)}"`, $autoCancel: false }),
      pb.collection('user_posts').getFullList({ filter: `userId = "${escapeFilterValue(id)}"`, $autoCancel: false }),
      pb.collection('user_sessions').getFullList({ filter: `userId = "${escapeFilterValue(id)}"`, $autoCancel: false }).catch(() => []),
    ])
    await Promise.allSettled([
      ...roles.map((row: any) => pb.collection('user_roles').delete(row.id, { $autoCancel: false })),
      ...posts.map((row: any) => pb.collection('user_posts').delete(row.id, { $autoCancel: false })),
      ...sessions.map((row: any) => pb.collection('user_sessions').delete(row.id, { $autoCancel: false })),
    ])
    await pb.collection('users').delete(id, { $autoCancel: false })
    return success(null, '删除成功')
  })
})
