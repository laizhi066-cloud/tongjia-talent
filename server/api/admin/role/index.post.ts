/**
 * @description POST /api/admin/role — 新增角色（含数据范围部门分配）
 * @route POST /api/admin/role
 */

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:role:add')
  return withOperLog(event, { title: '角色管理', operType: OperType.INSERT }, async () => {
    const body = await validateBody(event, createRoleSchema)
    const pb = await getAdminPB()
    await requireSuperForProtectedRole(event, [body.roleKey])

    // 重复性校验：roleKey 是唯一标识
    const existing = await checkRoleDuplicate(pb, { roleKey: body.roleKey })
    if (existing) {
      throw createError({ statusCode: 409, message: `角色标识 "${body.roleKey}" 已存在` })
    }

    const { deptScopeIds, ...roleData } = body
    const role = await pb.collection('roles').create(roleData)

    if (deptScopeIds?.length) {
      await Promise.all(
        deptScopeIds.map((deptId: string) =>
          pb.collection('role_depts').create({ roleId: role.id, deptId }),
        ),
      )
    }

    return success(role, '新增成功')
  })
})
