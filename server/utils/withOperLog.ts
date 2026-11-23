/**
 * @description 操作日志通用包装器 — 自动记录操作日志，减少样板代码
 * @file server/utils/withOperLog.ts
 */
import { recordOperLog } from './operlog'
import type { H3Event } from 'h3'

export interface OperLogInfo {
  title: string
  operType: string // 1=新增 2=修改 3=删除 4=授权 5=导出 6=导入 7=强退 8=清空 9=重置密码
  method?: string
  /**
   * 可选摘要：固定文案或按返回值生成（导出 / 导入只记计数，不记正文）。
   * 摘要拼在 title 后并以 oper_logs.title 的 100 字上限截断。
   */
  summary?: string | ((result: unknown) => string)
}

/** 拼接「标题（摘要）」，长度对齐 oper_logs.title 的 max=100。 */
function buildOperLogTitle(title: string, summary: string | undefined): string {
  return (summary ? `${title}（${summary}）` : title).slice(0, 100)
}

/**
 * 包装一个异步操作，自动记录操作日志（含耗时、状态）
 * @param event - H3 事件
 * @param logInfo - 日志信息
 * @param handler - 实际业务逻辑
 * @returns handler 的返回值
 */
export async function withOperLog<T>(
  event: H3Event,
  logInfo: OperLogInfo,
  handler: () => Promise<T>,
): Promise<T> {
  const start = Date.now()
  try {
    const result = await handler()
    const summary =
      typeof logInfo.summary === 'function' ? logInfo.summary(result) : logInfo.summary
    await recordOperLog(event, {
      title: buildOperLogTitle(logInfo.title, summary),
      operType: logInfo.operType,
      method: logInfo.method,
      status: 0,
      costTime: Date.now() - start,
    })
    return result
  } catch (e: unknown) {
    await recordOperLog(event, {
      title: buildOperLogTitle(logInfo.title, '失败'),
      operType: logInfo.operType,
      method: logInfo.method,
      status: 1,
      costTime: Date.now() - start,
    })
    throw e
  }
}

/**
 * 操作类型常量
 */
export const OperType = {
  INSERT: '1',
  UPDATE: '2',
  DELETE: '3',
  GRANT: '4',
  EXPORT: '5',
  IMPORT: '6',
  FORCE_LOGOUT: '7',
  CLEAR: '8',
  RESET_PWD: '9',
  EXECUTE: '10',
} as const
