/**
 * @description PUT /api/admin/menu/:id — 修改菜单
 * @route PUT /api/admin/menu/:id
 */

export default defineEventHandler(async (event) => {
  await requireSuper(event)
  await requirePermission(event, 'system:menu:edit')
  return withOperLog(event, { title: '菜单管理', operType: OperType.UPDATE }, async () => {
    const id = getRouterParam(event, 'id')
    const body = await validateBody(event, updateMenuSchema)
    const pb = await getAdminPB()
    const current = await pb.collection('menus').getOne(id!, { $autoCancel: false }).catch(() => null)
    if (!current) throw createError({ statusCode: 404, message: '菜单不存在' })
    // 重复性校验：仅在请求修改了唯一键字段时触发
    if (body.menuName || body.menuType || body.parentId !== undefined) {
      const existing = await checkMenuDuplicate(pb, {
        menuName: body.menuName ?? current.menuName,
        menuType: body.menuType ?? current.menuType,
        parentId: body.parentId !== undefined ? (body.parentId || null) : (current.parentId || null),
        excludeId: id!,
      })
      if (existing) {
        throw createError({
          statusCode: 409,
          message: `菜单 "${body.menuName ?? current.menuName}" 已存在`,
        })
      }
    }

    return success(await pb.collection('menus').update(id!, {
      parentId: body.parentId,
      menuType: body.menuType,
      menuName: body.menuName,
      permissionCode: body.permissionCode,
      path: body.path,
      component: body.component,
      icon: body.icon,
      orderNum: body.orderNum,
      visible: body.visible,
      status: body.status,
    }), '修改成功')
  })
})
