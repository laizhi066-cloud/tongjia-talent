/**
 * @description DELETE /api/admin/monitor/online/:id — 强制下线
 * @route DELETE /api/admin/monitor/online/:id
 */
import crypto from 'node:crypto'

export default defineEventHandler(async (event) => {
  await requirePlatformOperations(event)
  await requirePermission(event, 'monitor:online:forceLogout')
  return withOperLog(event, { title: '在线用户', operType: OperType.FORCE_LOGOUT }, async () => {
    const id = getRouterParam(event, 'id') as string
    const pb = await getAdminPB()

    // 查找会话以获取用户 ID
    let session
    try {
      session = await pb.collection('user_sessions').getOne(id, { $autoCancel: false })
    } catch {
      throw createError({ statusCode: 404, message: '会话不存在' })
    }

    // 轮换 PB tokenKey 使所有既有 JWT 立刻失效；时间仅保留为可追溯的强退标记。
    // 不能只依赖 forceLogoutAt：重新认证后清除该标记会让泄露的旧 token 再次生效。
    await pb.collection('users').update(session.userId, {
      forceLogoutAt: new Date().toISOString(),
      tokenKey: crypto.randomUUID().replace(/-/g, ''),
    })

    // 将会话标记为离线，避免心跳重建
    await pb.collection('user_sessions').update(id, {
      status: 'offline',
      lastActivityTime: new Date().toISOString(),
    })

    return success(null, '操作成功')
  })
})
