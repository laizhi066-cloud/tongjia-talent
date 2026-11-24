/**
 * @description 集中式 API 自动重试与指数退避策略（用于后台 Nuxt `$fetch` 拦截器）。
 *   仅对幂等 HTTP 方法（GET/HEAD/OPTIONS/PUT/DELETE）在网络异常或临时服务端故障时自动重试，默认最多重试 3 次。
 * @file app/utils/api-retry.ts
 */

export const DEFAULT_MAX_RETRIES = 3
export const DEFAULT_RETRY_BASE_DELAY_MS = 300
export const DEFAULT_RETRY_MAX_DELAY_MS = 10_000
export const DEFAULT_RETRY_JITTER_RATIO = 0.2

const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'])
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504])

export interface BackoffDelayOptions {
  baseDelayMs?: number
  maxDelayMs?: number
  /** 抖动比例（0 表示无抖动；0.2 表示在 [0.8x, 1.2x] 之间随机抖动以防止惊群） */
  jitterRatio?: number
  /** 可注入随机数源（便于单元测试） */
  random?: () => number
  /** 若服务端返回了 Retry-After 毫秒值，优先取不小于退避时间的等待值（受 maxDelayMs 上限保护） */
  retryAfterMs?: number | null
}

export interface RetryDecisionParams {
  method?: string
  status?: number
  error?: unknown
  signal?: AbortSignal
  /** 已完成的重试次数（首次请求失败时为 0） */
  attempt: number
  maxRetries: number
}

export interface RetryExecutionCallbacks<T> {
  /** 执行单次底层请求；`isFinalAttempt` 为 true 时表示这是最后一次机会（不可再重试） */
  execute: (attempt: number, maxRetries: number) => Promise<T>
  /** 从抛出的异常中提取 HTTP 状态码（网络层错误返回 0 或 undefined） */
  extractStatus?: (error: unknown) => number | undefined
  /** 从抛出的异常中提取 Retry-After 响应头 */
  extractRetryAfter?: (error: unknown) => string | null | undefined
  /** 即将进入下一次退避重试时回调（用于日志记录） */
  onRetry?: (info: { retryNumber: number, maxRetries: number, delayMs: number, status?: number, error: unknown }) => void
}

export interface ExecuteWithRetryOptions {
  method?: string
  retry?: number | false
  signal?: AbortSignal
  baseDelayMs?: number
  maxDelayMs?: number
  jitterRatio?: number
  random?: () => number
}

/** 判断 HTTP 方法是否为 RFC 9110 定义的幂等方法。 */
export function isIdempotentMethod(method?: string): boolean {
  const normalized = String(method || 'GET').trim().toUpperCase()
  return IDEMPOTENT_METHODS.has(normalized)
}

/** 判断 HTTP 状态码是否为适合退避重试的临时性故障。 */
export function isRetryableStatus(status?: number): boolean {
  if (typeof status !== 'number' || !Number.isFinite(status))
    return false
  return RETRYABLE_STATUS_CODES.has(status)
}

/** 判断异常是否源于调用方主动取消（AbortSignal / AbortError）。 */
export function isAbortError(error: unknown, signal?: AbortSignal): boolean {
  if (signal?.aborted)
    return true
  if (!error || typeof error !== 'object')
    return false
  const candidate = error as { name?: unknown, message?: unknown, cause?: unknown }
  if (candidate.name === 'AbortError')
    return true
  if (typeof candidate.message === 'string' && /\babort(?:ed)?\b|AbortError/i.test(candidate.message))
    return true
  if (candidate.cause && candidate.cause !== error)
    return isAbortError(candidate.cause)
  return false
}

/** 结合 HTTP 方法与单次请求覆盖项，计算允许的最大重试次数。 */
export function resolveMaxRetries(method?: string, retryOption?: number | false): number {
  if (!isIdempotentMethod(method))
    return 0
  if (retryOption === false)
    return 0
  if (typeof retryOption === 'number') {
    if (!Number.isFinite(retryOption) || retryOption <= 0)
      return 0
    return Math.min(Math.floor(retryOption), 5)
  }
  return DEFAULT_MAX_RETRIES
}

/** 解析 Retry-After 响应头（支持秒数或 HTTP 日期），返回受上限约束的毫秒数。 */
export function parseRetryAfterMs(headerValue?: string | null, maxDelayMs = DEFAULT_RETRY_MAX_DELAY_MS): number | null {
  if (!headerValue)
    return null
  const trimmed = headerValue.trim()
  if (!trimmed)
    return null

  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    const seconds = Number(trimmed)
    if (Number.isFinite(seconds) && seconds >= 0)
      return Math.min(Math.round(seconds * 1000), maxDelayMs)
  }

  const parsedDate = Date.parse(trimmed)
  if (Number.isFinite(parsedDate)) {
    const delta = parsedDate - Date.now()
    if (delta > 0)
      return Math.min(delta, maxDelayMs)
  }

  return null
}

/**
 * 计算第 N 次重试（从 1 开始）的指数退避等待毫秒数：
 * `baseDelayMs * 2^(retryNumber - 1)`，叠加受控抖动并受 `maxDelayMs` 封顶。
 */
export function calculateBackoffDelay(retryNumber: number, options: BackoffDelayOptions = {}): number {
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_RETRY_BASE_DELAY_MS
  const maxDelayMs = options.maxDelayMs ?? DEFAULT_RETRY_MAX_DELAY_MS
  const jitterRatio = options.jitterRatio ?? DEFAULT_RETRY_JITTER_RATIO
  const random = options.random ?? Math.random

  const exponent = Math.max(0, Math.floor(retryNumber) - 1)
  const rawExponential = Math.min(baseDelayMs * (2 ** exponent), maxDelayMs)

  let delay = rawExponential
  if (jitterRatio > 0) {
    // 将 [0, 1) 映射到 [-jitterRatio, +jitterRatio]
    const factor = 1 + ((random() * 2 - 1) * jitterRatio)
    delay = Math.round(rawExponential * factor)
  }

  if (typeof options.retryAfterMs === 'number' && Number.isFinite(options.retryAfterMs) && options.retryAfterMs > delay)
    delay = options.retryAfterMs

  return Math.max(0, Math.min(delay, maxDelayMs))
}

/** 综合判断当前失败是否应触发下一次重试。 */
export function shouldRetryFetchError(params: RetryDecisionParams): boolean {
  if (params.maxRetries <= 0 || params.attempt >= params.maxRetries)
    return false
  if (!isIdempotentMethod(params.method))
    return false
  if (isAbortError(params.error, params.signal))
    return false

  // 无 HTTP 状态码（或 0）表示传输层/网络层失败，幂等请求可安全重试
  if (params.status === undefined || params.status === 0)
    return true

  return isRetryableStatus(params.status)
}

/** 支持 AbortSignal 及时中断的退避等待。 */
export function sleepWithAbort(delayMs: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    const abortErr = new Error('The operation was aborted')
    abortErr.name = 'AbortError'
    return Promise.reject(abortErr)
  }
  if (delayMs <= 0)
    return Promise.resolve()

  return new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer)
      const abortErr = new Error('The operation was aborted')
      abortErr.name = 'AbortError'
      reject(abortErr)
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, delayMs)

    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/** 提取 ofetch / FetchError 常见的 HTTP 状态码。 */
export function extractFetchErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object')
    return undefined
  const err = error as { status?: unknown, statusCode?: unknown, response?: { status?: unknown } }
  if (typeof err.response?.status === 'number')
    return err.response.status
  if (typeof err.status === 'number')
    return err.status
  if (typeof err.statusCode === 'number')
    return err.statusCode
  return undefined
}

/** 提取 ofetch / FetchError 响应中的 Retry-After 头。 */
export function extractFetchRetryAfter(error: unknown): string | null {
  if (!error || typeof error !== 'object')
    return null
  const response = (error as { response?: { headers?: Headers | Record<string, string> } }).response
  const headers = response?.headers
  if (!headers)
    return null
  if (typeof (headers as Headers).get === 'function')
    return (headers as Headers).get('retry-after')
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === 'retry-after')
      return value
  }
  return null
}

/** 执行带指数退避自动重试的异步请求，仅对幂等方法生效。 */
export async function executeWithRetry<T>(
  options: ExecuteWithRetryOptions,
  callbacks: RetryExecutionCallbacks<T>,
): Promise<T> {
  const maxRetries = resolveMaxRetries(options.method, options.retry)
  const extractStatus = callbacks.extractStatus ?? extractFetchErrorStatus
  const extractRetryAfter = callbacks.extractRetryAfter ?? extractFetchRetryAfter

  let attempt = 0
  while (true) {
    try {
      return await callbacks.execute(attempt, maxRetries)
    }
    catch (error) {
      const status = extractStatus(error)
      const canRetry = shouldRetryFetchError({
        method: options.method,
        status,
        error,
        signal: options.signal,
        attempt,
        maxRetries,
      })

      if (!canRetry)
        throw error

      const retryNumber = attempt + 1
      const retryAfterMs = parseRetryAfterMs(
        extractRetryAfter(error),
        options.maxDelayMs ?? DEFAULT_RETRY_MAX_DELAY_MS,
      )
      const delayMs = calculateBackoffDelay(retryNumber, {
        baseDelayMs: options.baseDelayMs,
        maxDelayMs: options.maxDelayMs,
        jitterRatio: options.jitterRatio,
        random: options.random,
        retryAfterMs,
      })

      callbacks.onRetry?.({
        retryNumber,
        maxRetries,
        delayMs,
        status,
        error,
      })

      await sleepWithAbort(delayMs, options.signal)
      attempt = retryNumber
    }
  }
}
