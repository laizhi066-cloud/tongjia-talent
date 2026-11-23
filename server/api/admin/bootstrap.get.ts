/**
 * @description GET /api/admin/bootstrap — 页面初始化所需全部数据（菜单树 + 权限 + 用户信息）
 * 合并多个 API 调用为一个，减少页面加载时的请求瀑布
 * @route GET /api/admin/bootstrap
 * @returns { menuTree, permissions, roles, user, routePermissionMap }
 */

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event);
  const pb = await getAdminPB();

  // 超管是系统管理员的超集；基础版不再按领域、交付档位或功能模块重写菜单。
  const roleKeys = (user.roles as Array<Record<string, any>>).map(
    (r) => (r.role as Record<string, any>).roleKey,
  );
  const { isSuper: rawSuper, isAdmin, roles } = computeConsoleAccess(roleKeys);
  const isSuper = rawSuper;

  // 1. 权限计算
  let permissions: string[] = [];
  if (isAdmin) {
    permissions = ["*"];
  } else {
    const codes = new Set<string>();
    for (const ur of user.roles) {
      for (const rm of ur.role.menus) {
        if (rm.menu?.permissionCode) codes.add(rm.menu.permissionCode);
      }
    }
    permissions = Array.from(codes);
  }

  // 2. 菜单树 — 非管理员按角色关联过滤菜单
  const allMenus = await pb.collection("menus").getFullList({
    sort: "orderNum",
    $autoCancel: false,
  });

  // M6：机构端已退出，菜单表不再有机构工作区行，bootstrap 不再做机构前缀过滤。
  let menus = allMenus;
  if (!isAdmin) {
    const allowedMenuIds = new Set<string>();
    for (const ur of user.roles) {
      for (const rm of ur.role.menus) {
        if (rm.menu?.id) allowedMenuIds.add(rm.menu.id);
      }
    }
    // 角色通常只关联可访问的叶子菜单；侧边栏建树还需要其目录祖先，
    // 但祖先不增加任何页面或按钮权限，不能把它们误当作额外授权。
    const menuById = new Map(allMenus.map((menu) => [String(menu.id), menu]));
    for (const menuId of Array.from(allowedMenuIds)) {
      let parentId = String(menuById.get(menuId)?.parentId || "");
      while (parentId && !allowedMenuIds.has(parentId)) {
        allowedMenuIds.add(parentId);
        parentId = String(menuById.get(parentId)?.parentId || "");
      }
    }
    menus = allMenus.filter((m) => allowedMenuIds.has(m.id));
  }

  const menuTree = buildMenuTree(menus);

  // 3. 路由→权限映射（菜单有 path 且 permissionCode 时加入映射）
  const routePermissionMap: Record<string, string> = {};
  for (const item of menus) {
    if (item.path && item.permissionCode) {
      routePermissionMap[item.path] = item.permissionCode;
    }
  }

  return success({
    menuTree,
    permissions,
    roles,
    isSuper,
    user,
    routePermissionMap,
  });
});

function buildMenuTree(
  items: Record<string, any>[],
  parentId: string | null = null,
): Record<string, any>[] {
  const isRoot = parentId === null;
  return (
    items
      .filter((item) => (isRoot ? !item.parentId : item.parentId === parentId))
      .filter((item) => item.menuType !== "F")
      .filter((item) => item.status === "1")
      // hidden 明细路由仍留在 routePermissionMap 供系统看板钻取，但不应重复占据侧边栏。
      .filter((item) => item.visible !== "1")
      .map((item) => {
        const children = buildMenuTree(items, item.id);
        const entry: Record<string, any> = {
          key: item.id,
          label: item.menuName,
          icon: item.icon,
          path: item.path,
        };
        if (children.length > 0) {
          entry.children = children;
        }
        return entry;
      })
  );
}
