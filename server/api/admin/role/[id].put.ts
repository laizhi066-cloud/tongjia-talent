/**
 * @description PUT /api/admin/role/:id — 修改角色（含数据范围部门更新）
 * @route PUT /api/admin/role/:id
 */

import type { RecordModel } from 'pocketbase'
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:role:edit')
  return withOperLog(event, { title: '角色管理', operType: OperType.UPDATE }, async () => {
    const id = getRouterParam(event, 'id')
    if (!id) throw createError({ statusCode: 400, message: '缺少角色ID' })
    const body = await validateBody(event, updateRoleSchema)
    const pb = await getAdminPB()
    const current = await pb.collection('roles').getOne(id, { fields: 'id,roleKey', $autoCancel: false }).catch(() => null)
    if (!current) throw createError({ statusCode: 404, message: '角色不存在' })
    if (SUPER_ADMIN_ROLE_KEYS.includes(current.roleKey) && !await currentUserIsSuper(event))
      throw createError({ statusCode: 404, message: '角色不存在' })
    await requireSuperForProtectedRole(event, [current.roleKey, body.roleKey])

    // 重复性校验：仅当修改了 roleKey 时触发
    if (body.roleKey) {
      const existing = await checkRoleDuplicate(pb, { roleKey: body.roleKey, excludeId: current.id })
      if (existing) {
        throw createError({ statusCode: 409, message: `角色标识 "${body.roleKey}" 已存在` })
      }
    }

    const { deptScopeIds, ...rolePatch } = body
    // updateRoleSchema 是 partial：只更新本次提交的字段，不能把未提交字段重置为停用或空值。
    const role = await pb.collection('roles').update(current.id, rolePatch)

    // 只更新 deptScopeIds 如果传入了（否则保留现有）
    if (deptScopeIds !== undefined) {
      // 先删除旧的数据范围关联
      const existing = await pb.collection('role_depts').getFullList({
        filter: `roleId = "${escapeFilterValue(current.id)}"`,
        $autoCancel: false,
      })
      await Promise.all(
        existing.map((rd: RecordModel) => pb.collection('role_depts').delete(rd.id)),
      )

      // 再创建新的
      if (deptScopeIds.length) {
        await Promise.all(
          deptScopeIds.map((deptId: string) =>
            pb.collection('role_depts').create({ roleId: current.id, deptId }),
          ),
        )
      }
    }

    return success(role, '修改成功')
  })
})
