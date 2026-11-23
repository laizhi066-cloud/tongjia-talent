/**
 * @description PUT /api/admin/role/:id/menus — 分配角色菜单权限
 * @route PUT /api/admin/role/:id/menus
 * @body { menuIds: string[] }
 */

import type { RecordModel } from 'pocketbase'
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:role:edit')
  return withOperLog(event, { title: '角色管理', operType: OperType.GRANT }, async () => {
    const id = getRouterParam(event, 'id')
    if (!id) throw createError({ statusCode: 400, message: '缺少角色ID' })
    const { menuIds } = await validateBody(event, assignMenuSchema)
    const pb = await getAdminPB()
    const role = await pb.collection('roles').getOne(id, { $autoCancel: false }).catch(() => null)
    if (!role) throw createError({ statusCode: 404, message: '角色不存在' })
    if (SUPER_ADMIN_ROLE_KEYS.includes(role.roleKey) && !await currentUserIsSuper(event))
      throw createError({ statusCode: 404, message: '角色不存在' })
    await requireSuperForProtectedRole(event, [role.roleKey])
    const visibleMenuIds = await filterVisibleMenuIdsForCurrentUser(event, pb, menuIds || [])
    if ((menuIds || []).some((menuId: string) => !visibleMenuIds.includes(menuId)))
      throw createError({ statusCode: 403, message: '无权分配平台超管专属菜单' })
    const roleId = escapeFilterValue(id)

    // 先清空现有关联
    const existing = await pb.collection('role_menus').getFullList({
      filter: `roleId = "${roleId}"`,
      $autoCancel: false,
    })
    await Promise.all(
      existing.map((rm: RecordModel) => pb.collection('role_menus').delete(rm.id)),
    )

    // 再批量创建新的
    if (menuIds?.length) {
      await Promise.all(
        menuIds.map((menuId: string) =>
          pb.collection('role_menus').create({ roleId: id, menuId }),
        ),
      )
    }
    return success(null, '授权成功')
  })
})
