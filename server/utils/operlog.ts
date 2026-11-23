/**
 * @description 操作日志记录助手 — 基于 PocketBase
 * @file server/utils/operlog.ts
 */
import { getAdminPB } from './pocketbase-client'
import { getCurrentUserBasic } from './auth'
import type { H3Event } from 'h3'

/**
 * 记录操作日志
 * @param event - H3 事件
 * @param data - 日志数据
 */
export async function recordOperLog(
  event: H3Event,
  data: {
    title: string
    operType?: string
    method?: string
    requestMethod?: string
    operUrl?: string
    status?: number
    costTime?: number
  },
) {
  try {
    const user = await getCurrentUserBasic(event).catch(() => null)
    const ip = getHeader(event, 'x-forwarded-for') || getHeader(event, 'x-real-ip') || ''
    const pb = await getAdminPB()

    await pb.collection('oper_logs').create({
      title: data.title,
      operType: data.operType ?? '0',
      method: data.method,
      requestMethod: data.requestMethod || event.method,
      operName: user?.displayName || user?.email || 'unknown',
      deptName: user?.dept?.deptName,
      operUrl: data.operUrl || event.path,
      operIp: ip,
      status: data.status ?? 0,
      costTime: data.costTime,
      userId: user?.id,
    })
  } catch (err) {
    if (import.meta.dev) console.warn('[operlog] Failed to record operation log:', (err instanceof Error ? err.message : err))
  }
}
