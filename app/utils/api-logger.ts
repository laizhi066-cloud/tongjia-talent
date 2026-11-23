/**
 * @description 前端集中式 API 请求/响应日志与性能监控工具。
 *   统一记录出站请求、入站响应、耗时与慢请求告警，自动脱敏凭据与敏感字段，并维护内存态性能指标环形缓冲。
 * @file app/utils/api-logger.ts
 */

export interface ApiLogEntry {
  id: string
  method: string
  url: string
  status: number
  businessCode?: number
  durationMs: number
  slow: boolean
  ok: boolean
  timestamp: string
  error?: string
}

export interface ApiMonitorMetrics {
  total: number
  failed: number
  slow: number
  avgDurationMs: number
  maxDurationMs: number
  recent: ApiLogEntry[]
}

export interface ApiLoggerOptions {
  /** 慢请求阈值（毫秒），默认 1000ms */
  slowThresholdMs?: number
  /** 内存环形缓冲保留条数，默认 100 */
  maxEntries?: number
  /** 可注入自定义 console（便于单元测试） */
  console?: Pick<Console, 'info' | 'warn'>
  /** 可注入时钟函数（便于单元测试） */
  now?: () => number
}

export interface OutgoingRequestRecord {
  id: string
  method: string
  url: string
  startedAt: number
}

const DEFAULT_SLOW_THRESHOLD_MS = 1000
const DEFAULT_MAX_ENTRIES = 100
const MAX_DEPTH = 3
const MAX_ARRAY_PREVIEW = 10
const MAX_STRING_PREVIEW = 160

const SENSITIVE_KEY_RE = /^(?:authorization|cookie|set-cookie|x-api-key|password|passwordconfirm|oldpassword|newpassword|token|accesstoken|access_token|refreshtoken|refresh_token|secret|appsecret|secretkey|apikey|api_key|idno|idcard|id_card|phone|mobile|openid|unionid|logincode|phonecode)$/i
const SENSITIVE_QUERY_RE = /^(?:token|access_token|refresh_token|password|secret|code|apikey|api_key|key|phone|mobile|idno|idcard)$/i
const SKIP_LOG_PATHS = ['/api/client/client-error', '/_nuxt/', '/__nuxt_error']

let requestSequence = 0

function nextRequestId(): string {
  requestSequence += 1
  return `REQ-${String(requestSequence).padStart(4, '0')}`
}

/** 仅记录真实业务 API 请求，排除错误上报自身与 Nuxt 内部静态资源，避免日志循环或噪音。 */
export function shouldLogApiUrl(url: string): boolean {
  if (!url)
    return false
  if (SKIP_LOG_PATHS.some((prefix) => url.includes(prefix)))
    return false
  return url.startsWith('/api/') || url.includes('/api/') || /^https?:\/\//i.test(url)
}

/** 脱敏 URL 中的内嵌凭据、敏感查询参数、手机号与 18 位证件号。 */
export function sanitizeApiUrl(rawUrl: string): string {
  const maskedInline = rawUrl
    .replace(/^(https?:\/\/)[^/\s@]*@/i, '$1[redacted]@')
    .replace(/\b1[3-9]\d{9}\b/g, '[phone]')
    .replace(/\b[1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]\b/g, '[idcard]')

  const hashIdx = maskedInline.indexOf('#')
  const withoutHash = hashIdx >= 0 ? maskedInline.slice(0, hashIdx) : maskedInline
  const queryIdx = withoutHash.indexOf('?')
  if (queryIdx < 0)
    return withoutHash

  const base = withoutHash.slice(0, queryIdx)
  const rawQuery = withoutHash.slice(queryIdx + 1)
  if (!rawQuery)
    return base

  const sanitizedPairs = rawQuery.split('&').map((pair) => {
    const eqIdx = pair.indexOf('=')
    if (eqIdx < 0)
      return pair
    const key = pair.slice(0, eqIdx)
    const decodedKey = (() => {
      try { return decodeURIComponent(key) } catch { return key }
    })()
    if (SENSITIVE_QUERY_RE.test(decodedKey))
      return `${key}=[redacted]`
    return pair
  })

  return `${base}?${sanitizedPairs.join('&')}`
}

/** 递归脱敏并裁剪请求头 / 请求体 / 响应体摘要，杜绝凭据泄漏或大对象阻塞控制台。 */
export function sanitizePayload(value: unknown, depth = 0): unknown {
  if (value == null)
    return value

  if (typeof value === 'string') {
    const redacted = value
      .replace(/\bBearer\s+[^\s"',;]+/gi, 'Bearer [redacted]')
      .replace(/\b1[3-9]\d{9}\b/g, '[phone]')
    return redacted.length > MAX_STRING_PREVIEW
      ? `${redacted.slice(0, MAX_STRING_PREVIEW)}…(${redacted.length} chars)`
      : redacted
  }

  if (typeof value === 'number' || typeof value === 'boolean')
    return value

  if (typeof FormData !== 'undefined' && value instanceof FormData) {
    const keys: string[] = []
    value.forEach((_, key) => {
      if (keys.length < MAX_ARRAY_PREVIEW)
        keys.push(key)
    })
    return `[FormData keys=${keys.join(',')}]`
  }

  if (typeof Blob !== 'undefined' && value instanceof Blob)
    return `[Blob type=${value.type || 'unknown'} size=${value.size}]`

  if (value instanceof URLSearchParams)
    return sanitizeApiUrl(`?${value.toString()}`).slice(1)

  if (depth >= MAX_DEPTH)
    return Array.isArray(value) ? `[Array(${value.length})]` : '[Object]'

  if (Array.isArray(value)) {
    const preview = value.slice(0, MAX_ARRAY_PREVIEW).map((item) => sanitizePayload(item, depth + 1))
    if (value.length > MAX_ARRAY_PREVIEW)
      preview.push(`…(+${value.length - MAX_ARRAY_PREVIEW} items)`)
    return preview
  }

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    const entries = Object.entries(value as Record<string, unknown>)
    for (const [key, item] of entries.slice(0, 25)) {
      if (SENSITIVE_KEY_RE.test(key)) {
        out[key] = '[redacted]'
      }
      else {
        out[key] = sanitizePayload(item, depth + 1)
      }
    }
    if (entries.length > 25)
      out.__truncatedKeys = entries.length - 25
    return out
  }

  return String(value)
}

/** 构造响应体轻量摘要，避免在控制台展开超大列表数据。 */
export function summarizeResponseData(data: unknown): Record<string, unknown> | undefined {
  if (data == null)
    return undefined
  if (typeof Blob !== 'undefined' && data instanceof Blob)
    return { type: 'blob', size: data.size, mime: data.type || 'application/octet-stream' }
  if (typeof data !== 'object')
    return { preview: sanitizePayload(data) }

  const record = data as Record<string, unknown>
  const summary: Record<string, unknown> = {}
  if (typeof record.code === 'number' || typeof record.code === 'string')
    summary.code = record.code
  if (typeof record.message === 'string' && record.message)
    summary.message = sanitizePayload(record.message)
  if ('data' in record) {
    const inner = record.data
    if (Array.isArray(inner)) {
      summary.data = `[Array(${inner.length})]`
    }
    else if (inner && typeof inner === 'object') {
      const innerObj = inner as Record<string, unknown>
      if (Array.isArray(innerObj.items))
        summary.data = `{ items: Array(${innerObj.items.length}), total: ${String(innerObj.total ?? '?')} }`
      else if (Array.isArray(innerObj.rows))
        summary.data = `{ rows: Array(${innerObj.rows.length}), total: ${String(innerObj.total ?? '?')} }`
      else
        summary.dataKeys = Object.keys(innerObj).slice(0, 12)
    }
    else {
      summary.data = sanitizePayload(inner)
    }
  }
  return Object.keys(summary).length > 0 ? summary : { keys: Object.keys(record).slice(0, 12) }
}

/** 创建可复用的集中式 API 日志与性能监控实例。 */
export function createApiMonitor(options: ApiLoggerOptions = {}) {
  const slowThresholdMs = options.slowThresholdMs ?? DEFAULT_SLOW_THRESHOLD_MS
  const maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES
  const logger = options.console ?? console
  const now = options.now ?? (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()))

  const entries: ApiLogEntry[] = []

  function recordEntry(entry: ApiLogEntry): void {
    entries.push(entry)
    if (entries.length > maxEntries)
      entries.splice(0, entries.length - maxEntries)
  }

  function logOutgoing(params: {
    url: string
    method?: string
    query?: unknown
    body?: unknown
    headers?: unknown
  }): OutgoingRequestRecord {
    const id = nextRequestId()
    const method = String(params.method || 'GET').toUpperCase()
    const url = sanitizeApiUrl(params.url)
    const startedAt = now()

    const details: Record<string, unknown> = {}
    if (params.query !== undefined)
      details.query = sanitizePayload(params.query)
    if (params.body !== undefined)
      details.body = sanitizePayload(params.body)
    if (params.headers !== undefined)
      details.headers = sanitizePayload(params.headers)

    if (Object.keys(details).length > 0)
      logger.info(`[API ->][${id}] ${method} ${url}`, details)
    else
      logger.info(`[API ->][${id}] ${method} ${url}`)

    return { id, method, url, startedAt }
  }

  function logIncoming(
    req: OutgoingRequestRecord,
    params: {
      status: number
      data?: unknown
      error?: string
    },
  ): ApiLogEntry {
    const durationMs = Math.max(0, Math.round((now() - req.startedAt) * 10) / 10)
    const businessCode = params.data && typeof params.data === 'object' && typeof (params.data as Record<string, unknown>).code === 'number'
      ? Number((params.data as Record<string, unknown>).code)
      : undefined
    const ok = params.status >= 200 && params.status < 400 && (businessCode === undefined || businessCode < 400) && !params.error
    const slow = durationMs >= slowThresholdMs

    const entry: ApiLogEntry = {
      id: req.id,
      method: req.method,
      url: req.url,
      status: params.status,
      ...(businessCode !== undefined ? { businessCode } : {}),
      durationMs,
      slow,
      ok,
      timestamp: new Date().toISOString(),
      ...(params.error ? { error: String(sanitizePayload(params.error)) } : {}),
    }

    recordEntry(entry)

    const summary = summarizeResponseData(params.data)
    const tag = !ok ? 'ERR' : slow ? 'SLOW' : 'OK'
    const label = `[API <-][${req.id}][${tag}] ${req.method} ${req.url} (${params.status || 'NET_ERR'}) ${durationMs}ms`
    const meta = {
      durationMs,
      status: params.status,
      ...(businessCode !== undefined ? { businessCode } : {}),
      ...(slow ? { slow: true, thresholdMs: slowThresholdMs } : {}),
      ...(entry.error ? { error: entry.error } : {}),
      ...(summary ? { response: summary } : {}),
    }

    // 统一使用 info / warn，避免用 console.error 触发 error-report.client.ts 的二次上报循环
    if (!ok || slow)
      logger.warn(label, meta)
    else
      logger.info(label, meta)

    return entry
  }

  function getMetrics(): ApiMonitorMetrics {
    const total = entries.length
    let failed = 0
    let slow = 0
    let sumDuration = 0
    let maxDurationMs = 0

    for (const item of entries) {
      if (!item.ok)
        failed += 1
      if (item.slow)
        slow += 1
      sumDuration += item.durationMs
      if (item.durationMs > maxDurationMs)
        maxDurationMs = item.durationMs
    }

    return {
      total,
      failed,
      slow,
      avgDurationMs: total > 0 ? Math.round((sumDuration / total) * 10) / 10 : 0,
      maxDurationMs,
      recent: entries.slice(),
    }
  }

  function clear(): void {
    entries.length = 0
  }

  return {
    logOutgoing,
    logIncoming,
    getMetrics,
    clear,
  }
}
