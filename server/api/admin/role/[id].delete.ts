/**
 * @description DELETE /api/admin/role/:id — 删除角色
 * @route DELETE /api/admin/role/:id
 */

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:role:delete')
  return withOperLog(event, { title: '角色管理', operType: OperType.DELETE }, async () => {
    const id = getRouterParam(event, 'id')
    const pb = await getAdminPB()
    const role = id
      ? await pb.collection('roles').getOne(id, { fields: 'id,roleKey', $autoCancel: false }).catch(() => null)
      : null
    if (!role) throw createError({ statusCode: 404, message: '角色不存在' })
    if (SUPER_ADMIN_ROLE_KEYS.includes(role.roleKey) && !await currentUserIsSuper(event))
      throw createError({ statusCode: 404, message: '角色不存在' })
    await requireSuperForProtectedRoleIds(event, pb, id ? [id] : [])

    // 该角色下存在用户时不允许删除（避免无声剥权）
    const userRoleBound = await pb.collection('user_roles').getList(1, 1, {
      filter: `roleId = "${id}"`,
      $autoCancel: false,
    })
    if (userRoleBound.totalItems > 0) {
      throw createError({ statusCode: 400, message: '该角色下存在用户，不可删除' })
    }

    // 清理关联记录（role_menus, role_depts）
    const [roleMenus, roleDepts] = await Promise.all([
      pb.collection('role_menus').getFullList({ filter: `roleId = "${id}"`, $autoCancel: false }),
      pb.collection('role_depts').getFullList({ filter: `roleId = "${id}"`, $autoCancel: false }),
    ])
    await Promise.allSettled([
      ...roleMenus.map(r => pb.collection('role_menus').delete(r.id)),
      ...roleDepts.map(d => pb.collection('role_depts').delete(d.id)),
    ])

    await pb.collection('roles').delete(id!)
    return success(null, '删除成功')
  })
})
