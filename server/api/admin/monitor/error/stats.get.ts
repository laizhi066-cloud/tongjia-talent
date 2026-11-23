/**
 * @description GET /api/admin/monitor/error/stats — 错误监控概览（未处理/已解决/今日新增/总计）
 * @route GET /api/admin/monitor/error/stats
 */

export default defineEventHandler(async (event) => {
  await requirePlatformOperations(event)
  await requirePermission(event, 'monitor:error:list')
  const pb = await getAdminPB()

  // PocketBase datetime filter 用空格格式
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const todayStr = start.toISOString().replace('T', ' ').slice(0, 19)

  async function countOf(filter: string): Promise<number> {
    const r = await pb.collection('error_logs').getList(1, 1, { filter: filter || undefined, $autoCancel: false })
    return r.totalItems
  }

  const [total, unresolved, resolved, today] = await Promise.all([
    countOf(''),
    countOf('status = "new"'),
    countOf('status = "resolved"'),
    countOf(`lastSeen >= "${todayStr}"`),
  ])

  return success({ total, unresolved, resolved, today })
})
