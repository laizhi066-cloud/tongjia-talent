/**
 * @description DELETE /api/admin/dept/:id — 删除部门（有子部门或用户时不允许删除）
 * @route DELETE /api/admin/dept/:id
 */

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:dept:delete')
  return withOperLog(event, { title: '部门管理', operType: OperType.DELETE }, async () => {
    const id = getRouterParam(event, 'id') as string
    const pb = await getAdminPB()

    // 检查是否有子部门
    const childResult = await pb.collection('depts').getList(1, 1, {
      filter: `parentId = "${escapeFilterValue(id)}"`,
      $autoCancel: false,
    })
    if (childResult.totalItems > 0) {
      throw createError({ statusCode: 400, message: '存在子部门，不允许删除' })
    }

    // 检查是否有用户关联
    const userResult = await pb.collection('users').getList(1, 1, {
      filter: `deptId = "${escapeFilterValue(id)}"`,
      $autoCancel: false,
    })
    if (userResult.totalItems > 0) {
      throw createError({ statusCode: 400, message: '部门下存在用户，不允许删除' })
    }

    await pb.collection('depts').delete(id)
    return success(null, '删除成功')
  })
})
