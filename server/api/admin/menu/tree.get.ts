/**
 * @description GET /api/admin/menu/tree — 获取菜单树
 * 侧边栏和菜单管理页共用此接口
 * @route GET /api/admin/menu/tree
 */

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:menu:list')
  const pb = await getAdminPB()
  const isSuper = await currentUserIsSuper(event)

  let menus = await pb.collection('menus').getFullList({
    sort: 'orderNum',
    $autoCancel: false,
  })
  if (!isSuper) menus = filterSuperOnlyMenus(menus)

  const query = getQuery(event)
  // ?all=true 时返回所有数据（含按钮、禁用），用于菜单管理页
  const showAll = query.all === 'true'

  return success(buildMenuTree(menus, null, showAll))
})

function buildMenuTree(items: Record<string, any>[], parentId: string | null = null, showAll = false): Record<string, any>[] {
  const isRoot = parentId === null
  return items
    .filter((item) => isRoot ? !item.parentId : item.parentId === parentId)
    .filter((item) => showAll || item.menuType !== 'F') // 菜单管理页显示按钮
    .filter((item) => showAll || item.status === '1')    // 非管理页只显示启用菜单
    .map((item) => {
      const children = buildMenuTree(items, item.id, showAll)
      const entry: Record<string, any> = {
        key: item.id,
        label: item.menuName,
        icon: item.icon,
        path: item.path,
        // 完整记录字段（菜单管理页用）
        id: item.id,
        menuName: item.menuName,
        menuType: item.menuType,
        permissionCode: item.permissionCode,
        status: item.status,
        visible: item.visible,
        parentId: item.parentId,
        orderNum: item.orderNum,
        component: item.component,
      }
      if (children.length > 0) {
        entry.children = children
      }
      return entry
    })
}
