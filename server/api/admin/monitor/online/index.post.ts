/**
 * @description POST /api/admin/monitor/online — 注册登录会话，记录 IP 和 UA
 * @route POST /api/admin/monitor/online
 */

import type { H3Event } from 'h3'
import { z } from 'zod'
export default defineEventHandler(async (event) => {
  return withOperLog(event, { title: '在线用户', operType: OperType.INSERT }, async () => {
    // 心跳注册没有额外参数，仍显式校验空请求体以保持写接口边界一致。
    await validateBody(event, z.object({}).optional())
    const user = await requireConsoleAccess(event)

    const pb = await getAdminPB()

    const headers = getHeaders(event)
    const userAgent = headers['user-agent'] || ''

    // 简单解析浏览器和 OS
    const browser = userAgent.includes('Chrome') ? 'Chrome'
      : userAgent.includes('Firefox') ? 'Firefox'
      : userAgent.includes('Safari') ? 'Safari'
      : userAgent.includes('Edge') ? 'Edge'
      : '未知'

    const os = userAgent.includes('Windows') ? 'Windows'
      : userAgent.includes('Mac') ? 'macOS'
      : userAgent.includes('Linux') ? 'Linux'
      : userAgent.includes('Android') ? 'Android'
      : userAgent.includes('iOS') ? 'iOS'
      : '未知'

    const ipaddr = getIP(event) // 从 headers 获取 IP

    // 复用已有在线会话，避免同一用户产生多条记录
    const existing = await pb.collection('user_sessions').getList(1, 1, {
      filter: `userId = "${escapeFilterValue(user.id)}" && status = "online"`,
      sort: '-lastActivityTime',
      $autoCancel: false,
    })

    if (existing.items.length > 0) {
      await pb.collection('user_sessions').update(existing.items[0]!.id, {
        ipaddr,
        browser,
        os,
        lastActivityTime: new Date().toISOString(),
      })
    } else {
      await pb.collection('user_sessions').create({
        userId: user.id,
        ipaddr,
        browser,
        os,
        loginTime: new Date().toISOString(),
        lastActivityTime: new Date().toISOString(),
        status: 'online',
      })
    }

    return success(null, '操作成功')
  })
})

/**
 * 从 X-Forwarded-For 或 remoteAddress 获取 IP
 * @param event H3 事件
 */
function getIP(event: H3Event): string {
  const forwarded: string | undefined = getHeader(event, 'x-forwarded-for') as string | undefined
  if (!forwarded) {
    const remote = event.node?.req?.socket?.remoteAddress
    return remote || '127.0.0.1'
  }
  return forwarded.split(',')[0]!.trim()
}
