/**
 * @description 获取基础后台用户详情。
 * @file server/api/admin/user/[id].get.ts
 * @route GET /api/admin/user/:id
 */
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:user:query')
  const id = getRouterParam(event, 'id') as string
  const pb = await getAdminPB()
  if (!await currentUserIsSuper(event) && await userHasSuperRole(pb, id))
    throw createError({ statusCode: 404, message: '用户不存在' })
  const user = await pb.collection('users').getOne(id, { expand: 'deptId', $autoCancel: false }).catch(() => null)
  if (!user) throw createError({ statusCode: 404, message: '用户不存在' })
  const [roles, posts] = await Promise.all([
    pb.collection('user_roles').getFullList({ filter: `userId = "${escapeFilterValue(id)}"`, expand: 'roleId', $autoCancel: false }),
    pb.collection('user_posts').getFullList({ filter: `userId = "${escapeFilterValue(id)}"`, expand: 'postId', $autoCancel: false }),
  ])
  return success({ ...resolveFileUrls(user, 'users', ['avatar']), dept: user.expand?.deptId || null, roles: roles.map((row: any) => ({ role: row.expand?.roleId || {} })), posts: posts.map((row: any) => row.expand?.postId || {}) })
})
