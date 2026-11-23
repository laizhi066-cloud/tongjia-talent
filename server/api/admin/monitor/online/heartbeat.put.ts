/**
 * @description PUT /api/admin/monitor/online/heartbeat — 更新当前用户在线会话的心跳
 * 每 5 分钟由前端 admin 布局调用，保持 lastActivityTime 在 30 分钟内
 * @route PUT /api/admin/monitor/online/heartbeat
 */

import { z } from 'zod'

export default defineEventHandler(async (event) => {
  return withOperLog(event, { title: '在线用户心跳', operType: OperType.UPDATE }, async () => {
    await validateBody(event, z.object({}).optional())
    const user = await requireConsoleAccess(event)
    const pb = await getAdminPB()

    // 查找当前用户最近的一条 online 会话
    const sessions = await pb.collection('user_sessions').getList(1, 1, {
      filter: `userId = "${user.id}" && status = "online"`,
      sort: '-lastActivityTime',
      $autoCancel: false,
    })

    if (sessions.items.length > 0) {
      const session = sessions.items[0]!
      await pb.collection('user_sessions').update(session.id, {
        lastActivityTime: new Date().toISOString(),
      })
      return success(null, '心跳已更新')
    }

    // 无活跃会话（已被强退或超时），不自动重建
    return success(null, '无活跃会话')
  })
})
