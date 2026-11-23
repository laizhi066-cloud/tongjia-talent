/**
 * @description GET /api/admin/role/:id — 获取单个角色（含已分配菜单 ID）
 * @route GET /api/admin/role/:id
 */

import type { RecordModel } from 'pocketbase'
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:role:query')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: '缺少角色ID' })
  const pb = await getAdminPB()

  const role = await pb.collection('roles').getOne(id, { $autoCancel: false }).catch(() => null)
  if (!role) throw createError({ statusCode: 404, message: '角色不存在' })
  if (SUPER_ADMIN_ROLE_KEYS.includes(role.roleKey) && !await currentUserIsSuper(event))
    throw createError({ statusCode: 404, message: '角色不存在' })

  // 查询关联的菜单和部门数据范围
  const safeRoleId = escapeFilterValue(role.id)
  const [menuAssociations, deptAssociations] = await Promise.all([
    pb.collection('role_menus').getFullList({
      filter: `roleId = "${safeRoleId}"`,
      $autoCancel: false,
    }),
    pb.collection('role_depts').getFullList({
      filter: `roleId = "${safeRoleId}"`,
      $autoCancel: false,
    }),
  ])

  const menuIds = menuAssociations.map((m: RecordModel) => m.menuId)
  const visibleMenuIds = await filterVisibleMenuIdsForCurrentUser(event, pb, menuIds)

  return success({
    ...role,
    menuIds: visibleMenuIds,
    deptIds: deptAssociations.map((d: RecordModel) => d.deptId),
  })
})
