/**
 * @description POST /api/admin/menu — 新增菜单
 * @route POST /api/admin/menu
 * @body {parentId, menuType, menuName, permissionCode, path, component, icon, orderNum, visible}
 */

export default defineEventHandler(async (event) => {
  await requireSuper(event)
  await requirePermission(event, 'system:menu:add')
  return withOperLog(event, { title: '菜单管理', operType: OperType.INSERT }, async () => {
    const body = await validateBody(event, createMenuSchema)
    const pb = await getAdminPB()
    if (!await currentUserIsSuper(event)) {
      if (isSuperOnlyPath(body.path) || isSuperOnlyPermission(body.permissionCode))
        throw createError({ statusCode: 403, message: '无权创建平台超管专属菜单' })
      if (body.parentId) {
        const visibleParentIds = await filterVisibleMenuIdsForCurrentUser(event, pb, [body.parentId])
        if (!visibleParentIds.includes(body.parentId))
          throw createError({ statusCode: 403, message: '无权在平台超管专属菜单下创建' })
      }
    }

    // 重复性校验：同名同类型同父级视为重复
    const existing = await checkMenuDuplicate(pb, {
      menuName: body.menuName,
      menuType: body.menuType,
      parentId: body.parentId || null,
    })
    if (existing) {
      throw createError({ statusCode: 409, message: `菜单 "${body.menuName}" 已存在` })
    }

    return success(await pb.collection('menus').create({
      parentId: body.parentId || null,
      menuType: body.menuType,
      menuName: body.menuName,
      permissionCode: body.permissionCode ?? '',
      path: body.path ?? '',
      component: body.component ?? '',
      icon: body.icon ?? '',
      orderNum: body.orderNum ?? 0,
      visible: body.visible ?? '0',
      status: body.status ?? '0',
    }), '新增成功')
  })
})
