/**
 * @description GET /api/admin/monitor/online — 在线用户列表（最近30分钟有活动）
 * @route GET /api/admin/monitor/online
 */

export default defineEventHandler(async (event) => {
  await requirePlatformOperations(event)
  await requirePermission(event, 'monitor:online:list')
  const query = getQuery(event)

  // PocketBase 日期存储格式为 YYYY-MM-DD HH:mm:ss.SSSZ，需替换 T → 空格
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString().replace('T', ' ')
  const filter = `lastActivityTime >= "${thirtyMinAgo}" && status = "online"`

  return paginatedQuery('user_sessions', query, filter, {
    sort: '-lastActivityTime',
    expand: 'userId',
    transform: (item: any) => ({
      id: item.id,
      userId: item.userId,
      userName: item.expand?.userId?.displayName || item.expand?.userId?.email || '未知',
      ipaddr: item.ipaddr,
      browser: item.browser,
      os: item.os,
      loginTime: item.loginTime,
      lastActivityTime: item.lastActivityTime,
      status: item.status,
      created: item.created,
    }),
  })
})
