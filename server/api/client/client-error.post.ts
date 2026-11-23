/**
 * @description 浏览器运行时错误上报；匿名允许且永远以成功响应结束，避免上报自身再次触发前端错误。
 * @file server/api/client/client-error.post.ts
 * @route POST /api/client/client-error
 * @body { source, level?, message, stack?, url?, platform?, ua?, meta? }
 * @returns { recorded: boolean }
 */
import { z } from 'zod'
import type { H3Event } from 'h3'
import { withAuthenticatedErrorUser } from '~~/server/utils/client-error-report'

const clientErrorSchema = z.object({
  source: z.enum(['client', 'console']).default('client'),
  level: z.enum(['error', 'warn']).default('error'),
  message: z.string({ message: '缺少错误信息' }).trim().min(1, '缺少错误信息').max(2000),
  stack: z.string().max(8000).optional(),
  url: z.string().max(500).optional(),
  platform: z.string().max(30).optional(),
  ua: z.string().max(500).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
})

/** 公开上报端点允许匿名访问；携带有效 Bearer token 时才记录真实会话用户。 */
async function authenticatedUserId(event: H3Event): Promise<string | undefined> {
  try {
    return String((await getCurrentUserBasic(event)).id || '') || undefined
  }
  catch {
    return undefined
  }
}

export default defineEventHandler(async (event) => {
  try {
    const body = await validateBody(event, clientErrorSchema)
    const recorded = await recordError(
      await getAdminPB(),
      withAuthenticatedErrorUser(body, await authenticatedUserId(event)),
    )
    return success({ recorded }, 'ok')
  }
  catch {
    // 错误上报不得向浏览器抛出异常，否则会形成「上报失败 → 新错误」循环。
    return success({ recorded: false }, 'ignored')
  }
})
