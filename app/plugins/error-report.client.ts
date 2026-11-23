/**
 * @description B 端浏览器错误采集 — 将运行时异常、Promise 拒绝、控制台错误、资源加载失败上报到错误监控。
 * @file app/plugins/error-report.client.ts
 */

interface AdminErrorPayload {
  source: 'client' | 'console'
  level?: 'error' | 'warn'
  message: string
  stack?: string
  url?: string
  meta?: Record<string, unknown>
}

const MAX_PER_SESSION = 30
const sent = new Set<string>()
let count = 0
let reporting = false
let installed = false

function endpoint(): string {
  const baseURL = useRuntimeConfig().app.baseURL || '/'
  return new URL(`${baseURL.replace(/\/+$/, '')}/api/client/client-error`, window.location.origin).toString()
}

function currentUserId(): string {
  try {
    return String(useAuthSession().record.value?.id || '')
  }
  catch {
    return ''
  }
}

function currentUrl(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

function fingerprint(payload: AdminErrorPayload): string {
  return `${payload.source}|${payload.message.slice(0, 160)}|${(payload.url || currentUrl()).split('?')[0]}`
}

function stringifyArg(value: unknown): string {
  if (value instanceof Error)
    return value.message
  if (typeof value === 'string')
    return value
  try {
    return JSON.stringify(value)
  }
  catch {
    return String(value)
  }
}

function reportAdminError(payload: AdminErrorPayload): void {
  try {
    if (reporting || count >= MAX_PER_SESSION || !payload.message)
      return

    const fp = fingerprint(payload)
    if (sent.has(fp))
      return
    sent.add(fp)

    const body = JSON.stringify({
      source: payload.source,
      level: payload.level || 'error',
      message: payload.message.slice(0, 2000),
      stack: (payload.stack || '').slice(0, 8000),
      url: payload.url || currentUrl(),
      platform: 'admin-h5',
      ua: window.navigator.userAgent,
      userId: currentUserId(),
      meta: payload.meta || {},
    })

    reporting = true
    const ok = window.navigator.sendBeacon?.(endpoint(), new Blob([body], { type: 'application/json' }))
    if (!ok) {
      void fetch(endpoint(), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        keepalive: true,
      }).then(() => { count++ }).catch(() => {})
    }
    else {
      count++
    }
  }
  catch { /* 错误上报不能影响业务页面 */ }
  finally {
    reporting = false
  }
}

export default defineNuxtPlugin({
  name: 'error-report',
  dependsOn: ['auth-session'],
  setup() {
    if (installed)
      return
    installed = true

    window.addEventListener('error', (event) => {
      const target = event.target
      if (target instanceof HTMLElement) {
        const resourceUrl = target.getAttribute('src') || target.getAttribute('href') || ''
        reportAdminError({
          source: 'client',
          message: `资源加载失败: ${resourceUrl || target.tagName}`,
          url: resourceUrl || currentUrl(),
          meta: { kind: 'resource', tagName: target.tagName },
        })
        return
      }

      reportAdminError({
        source: 'client',
        message: event.message || 'B端运行时错误',
        stack: event.error instanceof Error ? event.error.stack : '',
        meta: { kind: 'error' },
      })
    }, true)

    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason
      if (reason && typeof reason === 'object' && 'statusCode' in reason && Number(reason.statusCode) === 401) {
        event.preventDefault()
        return
      }
      reportAdminError({
        source: 'client',
        message: `未处理的 Promise 拒绝: ${stringifyArg(reason)}`,
        stack: reason instanceof Error ? reason.stack : '',
        meta: { kind: 'unhandledrejection' },
      })
    })

    const rawConsoleError = console.error.bind(console)
    console.error = (...args: unknown[]) => {
      rawConsoleError(...args)
      if (reporting)
        return
      reportAdminError({
        source: 'console',
        message: args.map(stringifyArg).join(' '),
        stack: args.find((arg): arg is Error => arg instanceof Error)?.stack,
        meta: { kind: 'console.error' },
      })
    }
  },
})
