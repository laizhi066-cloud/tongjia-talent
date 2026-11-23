/**
 * @description 菜单相关工具函数 — 查重等
 * @file server/utils/menu.ts
 */

interface CheckMenuDuplicateParams {
  menuName: string
  menuType: string
  parentId: string | null
  /** 更新时排除自身 ID */
  excludeId?: string
}

/**
 * 检查菜单是否重复（按 menuName + menuType + parentId 判断）
 * 这三个字段构成菜单的唯一键，同名同类型同父级视为重复
 * @param pb - PocketBase 实例
 * @param params - 查重参数
 * @returns 存在的菜单记录或 null
 */
export async function checkMenuDuplicate(
  pb: any,
  params: CheckMenuDuplicateParams,
): Promise<any | null> {
  const escapedName = escapeFilterValue(params.menuName)
  let filter = `menuName = "${escapedName}" && menuType = "${params.menuType}"`

  // parentId 为空时 PocketBase filter 用 null 关键字（不加引号）
  if (params.parentId) {
    filter += ` && parentId = "${escapeFilterValue(params.parentId)}"`
  } else {
    filter += ' && parentId = null'
  }

  if (params.excludeId) {
    filter += ` && id != "${escapeFilterValue(params.excludeId)}"`
  }

  try {
    return await pb.collection('menus').getFirstListItem(filter, { $autoCancel: false })
  } catch {
    return null
  }
}
