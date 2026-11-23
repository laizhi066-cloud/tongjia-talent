/**
 * @description GET /api/admin/dept/tree — 获取部门树（用于管理界面）
 * @route GET /api/admin/dept/tree
 */

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:dept:list')

  const pb = await getAdminPB()
  const depts = await pb.collection('depts').getFullList({
    sort: 'orderNum',
    $autoCancel: false,
  })

  return success(buildDeptTree(depts))
})

function buildDeptTree(items: Record<string, any>[], parentId = ''): Record<string, any>[] {
  return items
    .filter((item) => (item.parentId || '') === parentId)
    .map((item) => ({
      ...item,
      key: item.id,
      children: buildDeptTree(items, item.id),
    }))
}
