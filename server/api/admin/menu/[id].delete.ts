/**
 * @description DELETE /api/admin/menu/:id — 删除菜单及其子菜单
 * @route DELETE /api/admin/menu/:id
 */

export default defineEventHandler(async (event) => {
  await requireSuper(event)
  await requirePermission(event, 'system:menu:delete')
  return withOperLog(event, { title: '菜单管理', operType: OperType.DELETE }, async () => {
    const id = getRouterParam(event, 'id')
    const pb = await getAdminPB()
    if (!id) throw createError({ statusCode: 400, message: '缺少菜单ID' })
    // 递归删除子菜单并清理 role_menus 关联
    async function deleteChildren(parentId: string) {
      const children = await pb.collection('menus').getFullList({
        filter: `parentId = "${parentId}"`,
        $autoCancel: false,
      })
      for (const child of children) {
        await deleteChildren(child.id)
      }
      // 清理引用该菜单的 role_menus 记录
      const roleMenus = await pb.collection('role_menus').getFullList({
        filter: `menuId = "${parentId}"`,
        $autoCancel: false,
      })
      await Promise.allSettled(
        roleMenus.map(rm => pb.collection('role_menus').delete(rm.id)),
      )
      await pb.collection('menus').delete(parentId)
    }

    await deleteChildren(id)
    return success(null, '删除成功')
  })
})
