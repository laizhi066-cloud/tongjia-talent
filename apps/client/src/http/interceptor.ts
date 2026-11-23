/**
 * @description C 端集中式 API 请求/响应日志与性能监控拦截器。
 *   通过 uni.addInterceptor('request') 统一记录所有出站请求、入站状态码与耗时，严格脱敏 URL 与错误信息，不打印正文或令牌。
 * @file src/http/interceptor.ts
 */
import { diagnosticUrl, errorSummary } from './request-diagnostics'

export interface ClientApiMetricEntry {
  id: string
  method: string
  url: string
  statusCode: number
  durationMs: number
  slow: boolean
  ok: boolean
  timestamp: string
  errMsg?: string
}

export interface ClientApiMetricsSnapshot {
  total: number
  failed: number
  slow: number
  avgDurationMs: number
  maxDurationMs: number
  recent: ClientApiMetricEntry[]
}

const SLOW_THRESHOLD_MS = 1000
const MAX_ENTRIES = 100

let installed = false
let seq = 0
const metricEntries: ClientApiMetricEntry[] = []

function nowMs(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now()
}

function recordMetric(entry: ClientApiMetricEntry): void {
  metricEntries.push(entry)
  if (metricEntries.length > MAX_ENTRIES)
    metricEntries.splice(0, metricEntries.length - MAX_ENTRIES)
}

/** 读取 C 端近期 API 耗时与成功率统计（内存态，供调试排查）。 */
export function getClientApiMetrics(): ClientApiMetricsSnapshot {
  const total = metricEntries.length
  let failed = 0
  let slow = 0
  let sum = 0
  let maxDurationMs = 0

  for (const item of metricEntries) {
    if (!item.ok)
      failed += 1
    if (item.slow)
      slow += 1
    sum += item.durationMs
    if (item.durationMs > maxDurationMs)
      maxDurationMs = item.durationMs
  }

  return {
    total,
    failed,
    slow,
    avgDurationMs: total > 0 ? Math.round((sum / total) * 10) / 10 : 0,
    maxDurationMs,
    recent: metricEntries.slice(),
  }
}

/** 清空内存态指标（主要用于单元测试重置）。 */
export function resetClientApiInterceptorState(): void {
  installed = false
  seq = 0
  metricEntries.length = 0
}

/** 安装 C 端集中式请求拦截器，记录全部出站请求与入站响应及性能耗时。 */
export const requestInterceptor = {
  install(): void {
    if (installed || typeof uni === 'undefined' || typeof uni.addInterceptor !== 'function')
      return
    installed = true

    uni.addInterceptor('request', {
      invoke(args: Record<string, unknown>) {
        const rawUrl = String(args.url || '')
        if (rawUrl.includes('/api/client/client-error'))
          return args

        seq += 1
        const id = `CREQ-${String(seq).padStart(4, '0')}`
        const method = String(args.method || 'GET').toUpperCase()
        const safeUrl = diagnosticUrl(rawUrl)
        const startedAt = nowMs()

        console.info(`[client:API ->][${id}] ${method} ${safeUrl}`)

        const originalSuccess = typeof args.success === 'function'
          ? (args.success as (res: Record<string, unknown>) => void)
          : undefined
        const originalFail = typeof args.fail === 'function'
          ? (args.fail as (err: unknown) => void)
          : undefined

        args.success = (response: Record<string, unknown>) => {
          const durationMs = Math.max(0, Math.round((nowMs() - startedAt) * 10) / 10)
          const statusCode = typeof response?.statusCode === 'number' ? response.statusCode : 0
          const body = response?.data as { code?: unknown } | undefined
          const businessCode = body && typeof body === 'object' && typeof body.code === 'number' ? body.code : undefined
          const ok = statusCode >= 200 && statusCode < 400 && (businessCode === undefined || businessCode < 400)
          const slow = durationMs >= SLOW_THRESHOLD_MS

          recordMetric({
            id,
            method,
            url: safeUrl,
            statusCode,
            durationMs,
            slow,
            ok,
            timestamp: new Date().toISOString(),
          })

          const tag = !ok ? 'ERR' : slow ? 'SLOW' : 'OK'
          const logFn = !ok || slow ? console.warn : console.info
          logFn(`[client:API <-][${id}][${tag}] ${method} ${safeUrl} (${statusCode}) ${durationMs}ms`, {
            statusCode,
            durationMs,
            ...(businessCode !== undefined ? { businessCode } : {}),
            ...(slow ? { slow: true, thresholdMs: SLOW_THRESHOLD_MS } : {}),
          })

          originalSuccess?.(response)
        }

        args.fail = (error: unknown) => {
          const durationMs = Math.max(0, Math.round((nowMs() - startedAt) * 10) / 10)
          const summary = errorSummary(error)

          recordMetric({
            id,
            method,
            url: safeUrl,
            statusCode: 0,
            durationMs,
            slow: durationMs >= SLOW_THRESHOLD_MS,
            ok: false,
            timestamp: new Date().toISOString(),
            errMsg: summary.errMsg,
          })

          console.warn(`[client:API <-][${id}][NET_ERR] ${method} ${safeUrl} ${durationMs}ms`, {
            durationMs,
            errMsg: summary.errMsg,
          })

          originalFail?.(error)
        }

        return args
      },
    })
  },
}
