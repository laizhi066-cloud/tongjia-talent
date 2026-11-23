/**
 * @description PUT /api/admin/monitor/online/offline — 当前用户退出时将在线会话标记为离线
 * @route PUT /api/admin/monitor/online/offline
 */
import { z } from 'zod'
export default defineEventHandler(async (event) => {
  return withOperLog(event, { title: '在线用户', operType: OperType.UPDATE }, async () => {
    await validateBody(event, z.object({}).optional())
    const user = await requireConsoleAccess(event)
    const pb = await getAdminPB()

    const sessions = await pb.collection('user_sessions').getList(1, 1, {
      filter: `userId = "${user.id}" && status = "online"`,
      sort: '-lastActivityTime',
      $autoCancel: false,
    })

    if (sessions.items.length > 0) {
      await pb.collection('user_sessions').update(sessions.items[0]!.id, {
        status: 'offline',
        lastActivityTime: new Date().toISOString(),
      })
    }

    return success(null, '已离线')
  })
})
