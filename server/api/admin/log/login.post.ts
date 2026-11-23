/**
 * @description POST /api/admin/log/login — 记录登录日志
 * @route POST /api/admin/log/login
 */

import { z } from 'zod'

const loginLogSchema = z.object({
  userId: z.string().optional(),
  userName: z.string().optional().default(''),
  ipaddr: z.string().optional().default(''),
  status: z.enum(['0', '1']).optional().default('0'),
  msg: z.string().optional().default(''),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:loginlog:add')
  return withOperLog(event, { title: '登录日志', operType: OperType.INSERT }, async () => {
    const body = await validateBody(event, loginLogSchema)
    const pb = await getAdminPB()

    // 仅后台有权限用户可手工补录；实际认证审计由 recordLoginAttempt 统一写入。
    let userId = body.userId
    let userName = body.userName
    try {
      const user = await getCurrentUser(event)
      userId = user.id
      userName = userName || user.username || user.email
    } catch { /* 权限守卫已认证，此处仅保留审计降级 */ }

    return success(await pb.collection('login_logs').create({
      userName,
      ipaddr: body.ipaddr,
      status: body.status || '0',
      msg: body.msg,
      userId,
      loginTime: new Date().toISOString(),
    }))
  })
})
