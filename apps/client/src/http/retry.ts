/**
 * @description C 端 API 幂等请求自动重试与指数退避策略。
 *   仅对幂等 HTTP 方法（GET/HEAD/OPTIONS/PUT/DELETE）在网络失败或临时服务端故障时自动重试，默认最多重试 3 次。
 * @file src/http/retry.ts
 */
import { isAbortedNetworkError } from './error-notification'

export const DEFAULT_CLIENT_MAX_RETRIES = 3
export const DEFAULT_CLIENT_RETRY_BASE_DELAY_MS = 300
export const DEFAULT_CLIENT_RETRY_MAX_DELAY_MS = 10_000
export const DEFAULT_CLIENT_RETRY_JITTER_RATIO = 0.2

const IDEMPOTENT_HTTP_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'])
const RETRYABLE_HTTP_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504])

export interface ClientBackoffOptions {
  baseDelayMs?: number
  maxDelayMs?: number
  /** 抖动比例（0 表示无抖动；0.2 表示在 [0.8x, 1.2x] 之间抖动） */
  jitterRatio?: number
  random?: () => number
}

export interface ClientRetryDecisionParams {
  method?: string
  statusCode?: number
  error?: unknown
  /** 已完成的重试次数（首次请求失败时为 0） */
  attempt: number
  maxRetries: number
}

/** 判断 HTTP 方法是否为幂等方法。 */
export function isIdempotentHttpMethod(method?: string): boolean {
  const normalized = String(method || 'GET').trim().toUpperCase()
  return IDEMPOTENT_HTTP_METHODS.has(normalized)
}

/** 判断 HTTP 状态码是否为适合重试的临时服务端/限流/超时错误。 */
export function isRetryableHttpStatus(statusCode?: number): boolean {
  if (typeof statusCode !== 'number' || !Number.isFinite(statusCode))
    return false
  return RETRYABLE_HTTP_STATUS_CODES.has(statusCode)
}

/** 解析单次请求允许的最大重试次数（非幂等方法恒为 0）。 */
export function resolveClientMaxRetries(method?: string, retryOption?: number | false): number {
  if (!isIdempotentHttpMethod(method))
    return 0
  if (retryOption === false)
    return 0
  if (typeof retryOption === 'number') {
    if (!Number.isFinite(retryOption) || retryOption <= 0)
      return 0
    return Math.min(Math.floor(retryOption), 5)
  }
  return DEFAULT_CLIENT_MAX_RETRIES
}

/** 计算第 N 次重试（从 1 开始）的指数退避毫秒数：`baseDelayMs * 2^(retryNumber - 1)`。 */
export function calculateClientBackoffDelay(retryNumber: number, options: ClientBackoffOptions = {}): number {
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_CLIENT_RETRY_BASE_DELAY_MS
  const maxDelayMs = options.maxDelayMs ?? DEFAULT_CLIENT_RETRY_MAX_DELAY_MS
  const jitterRatio = options.jitterRatio ?? DEFAULT_CLIENT_RETRY_JITTER_RATIO
  const random = options.random ?? Math.random

  const exponent = Math.max(0, Math.floor(retryNumber) - 1)
  const rawExponential = Math.min(baseDelayMs * (2 ** exponent), maxDelayMs)

  let delay = rawExponential
  if (jitterRatio > 0) {
    const factor = 1 + ((random() * 2 - 1) * jitterRatio)
    delay = Math.round(rawExponential * factor)
  }

  return Math.max(0, Math.min(delay, maxDelayMs))
}

/** 判断本次 C 端请求失败是否应进入下一次指数退避重试。 */
export function shouldRetryClientFailure(params: ClientRetryDecisionParams): boolean {
  if (params.maxRetries <= 0 || params.attempt >= params.maxRetries)
    return false
  if (!isIdempotentHttpMethod(params.method))
    return false
  if (isAbortedNetworkError(params.error))
    return false

  // 网络层失败（statusCode === 0 或未返回状态码）可安全重试
  if (params.statusCode === undefined || params.statusCode === 0)
    return true

  return isRetryableHttpStatus(params.statusCode)
}
