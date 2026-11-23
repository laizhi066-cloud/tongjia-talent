/**
 * @description DELETE /api/admin/post/:id — 删除岗位
 * @route DELETE /api/admin/post/:id
 */

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:post:delete')
  return withOperLog(event, { title: '岗位管理', operType: OperType.DELETE }, async () => {
    const id = getRouterParam(event, 'id') as string
    const pb = await getAdminPB()

    // 检查是否有用户关联该岗位
    const userResult = await pb.collection('user_posts').getList(1, 1, {
      filter: `postId = "${escapeFilterValue(id)}"`,
      $autoCancel: false,
    })
    if (userResult.totalItems > 0) {
      throw createError({ statusCode: 400, message: '该岗位下存在用户，不允许删除' })
    }

    await pb.collection('posts').delete(id)
    return success(null, '删除成功')
  })
})
