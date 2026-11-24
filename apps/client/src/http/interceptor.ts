/**
 * @description C 端集中式 API 请求/响应日志、性能监控、幂等指数退避重试与错误通知拦截器。
 *   通过 uni.addInterceptor('request') 统一记录所有出站请求、入站状态码与耗时，
 *   对幂等请求（GET/HEAD/OPTIONS/PUT/DELETE）在网络失败或临时服务端错误时最多自动指数退避重试 3 次，
 *   并在最终失败且未静默时通过 Wot UI Toast 展示友好错误提示。
 * @file src/http/interceptor.ts
 */
import {
  formatHttpErrorMessage,
  isSilentErrorToastUrl,
  notifyApiError,
  notifyNetworkFailure,
} from './error-notification'
import { diagnosticUrl, errorSummary } from './request-diagnostics'
import {
  calculateClientBackoffDelay,
  DEFAULT_CLIENT_RETRY_BASE_DELAY_MS,
  DEFAULT_CLIENT_RETRY_JITTER_RATIO,
  DEFAULT_CLIENT_RETRY_MAX_DELAY_MS,
  resolveClientMaxRetries,
  shouldRetryClientFailure,
} from './retry'
import { isAccountDisabledCode } from './session'

export interface ClientApiMetricEntry {
  id: string
  method: string
  url: string
  statusCode: number
  durationMs: number
  slow: boolean
  ok: boolean
  timestamp: string
  attempt?: number
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

export interface ClientApiRetryConfig {
  baseDelayMs?: number
  maxDelayMs?: number
  jitterRatio?: number
  random?: () => number
}

const SLOW_THRESHOLD_MS = 1000
const MAX_ENTRIES = 100

let installed = false
let seq = 0
const metricEntries: ClientApiMetricEntry[] = []
let retryConfig: Required<Pick<ClientApiRetryConfig, 'baseDelayMs' | 'maxDelayMs' | 'jitterRatio'>> & {
  random?: () => number
} = {
  baseDelayMs: DEFAULT_CLIENT_RETRY_BASE_DELAY_MS,
  maxDelayMs: DEFAULT_CLIENT_RETRY_MAX_DELAY_MS,
  jitterRatio: DEFAULT_CLIENT_RETRY_JITTER_RATIO,
}

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

/** 检测请求头中是否携带登录令牌（不记录值，仅用于识别会话守卫接管的 401/403）。 */
function hasAuthorizationHeader(header: unknown): boolean {
  if (!header || typeof header !== 'object')
    return false
  for (const [key, value] of Object.entries(header as Record<string, unknown>)) {
    if (key.toLowerCase() === 'authorization' && typeof value === 'string' && value.trim().length > 0)
      return true
  }
  return false
}

/** 从响应体中提取字符串业务错误码（用于识别 ACCOUNT_DISABLED / ACCOUNT_LOCKED）。 */
function extractResponseErrorCode(body: unknown): string {
  if (!body || typeof body !== 'object')
    return ''
  const envelope = body as { code?: unknown, data?: unknown }
  const detail = envelope.data && typeof envelope.data === 'object'
    ? (envelope.data as { code?: unknown })
    : undefined
  if (typeof detail?.code === 'string')
    return detail.code
  if (typeof envelope.code === 'string')
    return envelope.code
  return ''
}

/** 当前是否已安装集中式请求拦截器。 */
export function isClientRequestInterceptorInstalled(): boolean {
  return installed
}

/** 覆盖重试退避配置（便于调试与确定性单元测试）。 */
export function configureClientApiInterceptor(config: ClientApiRetryConfig): void {
  retryConfig = {
    baseDelayMs: config.baseDelayMs ?? retryConfig.baseDelayMs,
    maxDelayMs: config.maxDelayMs ?? retryConfig.maxDelayMs,
    jitterRatio: config.jitterRatio ?? retryConfig.jitterRatio,
    random: config.random ?? retryConfig.random,
  }
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

/** 清空内存态指标与配置（主要用于单元测试重置）。 */
export function resetClientApiInterceptorState(): void {
  installed = false
  seq = 0
  metricEntries.length = 0
  retryConfig = {
    baseDelayMs: DEFAULT_CLIENT_RETRY_BASE_DELAY_MS,
    maxDelayMs: DEFAULT_CLIENT_RETRY_MAX_DELAY_MS,
    jitterRatio: DEFAULT_CLIENT_RETRY_JITTER_RATIO,
  }
}

/** 安装 C 端集中式请求拦截器，记录出站/入站耗时、自动重试幂等失败请求并统一触发错误 Toast。 */
export const requestInterceptor = {
  install(): void {
    if (installed || typeof uni === 'undefined' || typeof uni.addInterceptor !== 'function')
      return
    installed = true

    uni.addInterceptor('request', {
      invoke(args: Record<string, unknown>) {
        const rawUrl = String(args.url || '')
        const hideErrorToast = args.hideErrorToast === true
        const retryOption = typeof args.retry === 'number' || args.retry === false
          ? args.retry
          : undefined
        const retryAttempt = typeof args.__retryAttempt === 'number' ? args.__retryAttempt : 0
        const inheritedId = typeof args.__retryParentId === 'string' ? args.__retryParentId : ''
        const inheritedMaxRetries = typeof args.__retryMaxRetries === 'number' ? args.__retryMaxRetries : undefined

        // 移除内部控制字段，避免透传未知属性到微信小程序 wx.request。
        if ('hideErrorToast' in args)
          delete args.hideErrorToast
        if ('retry' in args)
          delete args.retry
        if ('__retryAttempt' in args)
          delete args.__retryAttempt
        if ('__retryParentId' in args)
          delete args.__retryParentId
        if ('__retryMaxRetries' in args)
          delete args.__retryMaxRetries

        if (rawUrl.includes('/api/client/client-error'))
          return args

        const id = inheritedId || (() => {
          seq += 1
          return `CREQ-${String(seq).padStart(4, '0')}`
        })()
        const method = String(args.method || 'GET').toUpperCase()
        const safeUrl = diagnosticUrl(rawUrl)
        const startedAt = nowMs()
        const silentUrl = isSilentErrorToastUrl(rawUrl)
        const hasAuthHeader = hasAuthorizationHeader(args.header)
        const maxRetries = inheritedMaxRetries ?? resolveClientMaxRetries(method, retryOption)

        const attemptTag = retryAttempt > 0 ? `#${retryAttempt}` : ''
        console.info(`[client:API ->][${id}${attemptTag}] ${method} ${safeUrl}`)

        const originalSuccess = typeof args.success === 'function'
          ? (args.success as (res: Record<string, unknown>) => void)
          : undefined
        const originalFail = typeof args.fail === 'function'
          ? (args.fail as (err: unknown) => void)
          : undefined
        const originalComplete = typeof args.complete === 'function'
          ? (args.complete as (res: unknown) => void)
          : undefined

        // 保留原始业务请求参数快照，用于指数退避重试时重新派发 uni.request。
        const replaySnapshot: Record<string, unknown> = { ...args }

        let scheduledRetry = false

        function tryScheduleRetry(statusCode: number, error?: unknown): boolean {
          if (typeof uni === 'undefined' || typeof uni.request !== 'function')
            return false
          if (!shouldRetryClientFailure({
            method,
            statusCode,
            error,
            attempt: retryAttempt,
            maxRetries,
          })) {
            return false
          }

          scheduledRetry = true
          const nextAttempt = retryAttempt + 1
          const delayMs = calculateClientBackoffDelay(nextAttempt, retryConfig)

          console.warn(
            `[client:API ~][${id}][RETRY ${nextAttempt}/${maxRetries}] ${method} ${safeUrl} (${statusCode || 'NET_ERR'}) waiting ${delayMs}ms`,
          )

          setTimeout(() => {
            uni.request({
              ...(replaySnapshot as UniApp.RequestOptions),
              hideErrorToast,
              __retryAttempt: nextAttempt,
              __retryParentId: id,
              __retryMaxRetries: maxRetries,
              success: originalSuccess,
              fail: originalFail,
              complete: originalComplete,
            } as UniApp.RequestOptions)
          }, delayMs)

          return true
        }

        if (originalComplete) {
          args.complete = (result: unknown) => {
            if (!scheduledRetry)
              originalComplete(result)
          }
        }

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
            ...(retryAttempt > 0 ? { attempt: retryAttempt } : {}),
          })

          const tag = !ok ? 'ERR' : slow ? 'SLOW' : 'OK'
          const logFn = !ok || slow ? console.warn : console.info
          logFn(`[client:API <-][${id}${attemptTag}][${tag}] ${method} ${safeUrl} (${statusCode}) ${durationMs}ms`, {
            statusCode,
            durationMs,
            ...(retryAttempt > 0 ? { retryAttempt } : {}),
            ...(businessCode !== undefined ? { businessCode } : {}),
            ...(slow ? { slow: true, thresholdMs: SLOW_THRESHOLD_MS } : {}),
          })

          if (!ok && tryScheduleRetry(statusCode))
            return

          if (!ok && !hideErrorToast && !silentUrl) {
            const errorCode = extractResponseErrorCode(body)
            const handledBySessionGuard = hasAuthHeader && (
              statusCode === 401
              || (statusCode === 403 && isAccountDisabledCode(errorCode))
            )
            if (!handledBySessionGuard) {
              notifyApiError({
                kind: 'http',
                statusCode,
                method,
                url: safeUrl,
                message: formatHttpErrorMessage(statusCode, body),
              })
            }
          }

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
            ...(retryAttempt > 0 ? { attempt: retryAttempt } : {}),
            errMsg: summary.errMsg,
          })

          console.warn(`[client:API <-][${id}${attemptTag}][NET_ERR] ${method} ${safeUrl} ${durationMs}ms`, {
            durationMs,
            ...(retryAttempt > 0 ? { retryAttempt } : {}),
            errMsg: summary.errMsg,
          })

          if (tryScheduleRetry(0, error))
            return

          if (!hideErrorToast && !silentUrl) {
            notifyNetworkFailure(error, {
              url: safeUrl,
              method,
            })
          }

          originalFail?.(error)
        }

        return args
      },
    })
  },
}


