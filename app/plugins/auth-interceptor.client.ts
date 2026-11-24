/**
 * @description 单实例后台的全局 API 拦截器：统一注入鉴权头、幂等请求指数退避自动重试（最多 3 次）、处理 401/错误提示、集中记录出站请求与入站响应，并驱动长耗时全局加载遮罩。
 * @file app/plugins/auth-interceptor.client.ts
 */
import { createApiMonitor, sanitizeApiUrl, shouldLogApiUrl, type OutgoingRequestRecord } from '~/utils/api-logger'
import { executeWithRetry, shouldRetryFetchError } from '~/utils/api-retry'
import { shouldTrackGlobalLoading } from '~/utils/global-loading'

interface RequestContext {
  request?: unknown
  options?: Record<string, unknown>
}

interface ResponseContext {
  response?: {
    status: number
    _data?: { message?: string, code?: number }
  }
}

interface RequestErrorContext {
  error?: unknown
}

export default defineNuxtPlugin({
  name: 'auth-interceptor',
  dependsOn: ['auth-session'],
  setup() {
    const session = useAuthSession()
    const router = useRouter()
    const globalLoading = useGlobalLoading()
    const originalFetch = globalThis.$fetch
    const monitor = createApiMonitor({ slowThresholdMs: 1000, maxEntries: 100 })

    // 暴露轻量只读调试入口到 window，方便在浏览器 DevTools 查看近期 API 性能指标（不渲染任何可见 UI）
    if (typeof window !== 'undefined') {
      ;(window as unknown as Record<string, unknown>).__API_MONITOR__ = {
        getMetrics: () => monitor.getMetrics(),
        clear: () => monitor.clear(),
      }
    }

    let handlingUnauthorized = false

    function invokeWithInterception(
      invoker: (url: string, options: Record<string, unknown>) => Promise<unknown>,
      url: string,
      options?: Record<string, unknown>,
    ): Promise<unknown> {
      const baseOptions: Record<string, unknown> = { ...(options ?? {}) }
      const userOnRequest = baseOptions.onRequest as ((context: RequestContext) => void) | undefined
      const userOnRequestError = baseOptions.onRequestError as ((context: RequestErrorContext) => void) | undefined
      const userOnResponse = baseOptions.onResponse as ((context: ResponseContext) => void) | undefined
      const userOnResponseError = baseOptions.onResponseError as ((context: ResponseContext) => void) | undefined
      const suppressErrorToast = baseOptions.suppressErrorToast === true || baseOptions.suppressToast === true
      const skipGlobalLoading = baseOptions.skipGlobalLoading === true
      const silentLoading = baseOptions.silentLoading === true
      const loadingText = typeof baseOptions.loadingText === 'string' ? baseOptions.loadingText : undefined
      const retryOption = typeof baseOptions.retry === 'number' || baseOptions.retry === false
        ? baseOptions.retry
        : undefined
      const signal = baseOptions.signal instanceof AbortSignal ? baseOptions.signal : undefined

      delete baseOptions.suppressErrorToast
      delete baseOptions.suppressToast
      delete baseOptions.skipGlobalLoading
      delete baseOptions.silentLoading
      delete baseOptions.loadingText
      delete baseOptions.retry

      const urlStr = String(url)
      const method = String(baseOptions.method || 'GET').toUpperCase()
      const isPublicAuthRequest = urlStr.includes('/api/public/admin-login')
      const trackLog = shouldLogApiUrl(urlStr)
      const trackLoading = shouldTrackGlobalLoading(urlStr, { skipGlobalLoading, silentLoading })

      let loadingToken: string | null = trackLoading ? globalLoading.start(loadingText) : null
      const releaseLoading = () => {
        if (loadingToken) {
          const token = loadingToken
          loadingToken = null
          globalLoading.finish(token)
        }
      }

      const executePromise = executeWithRetry(
        {
          method,
          retry: retryOption,
          signal,
        },
        {
          execute(attempt, maxRetries) {
            const attemptOptions: Record<string, unknown> = {
              ...baseOptions,
              // 关闭 ofetch 内置重试，统一由本拦截器执行指数退避策略避免双重重试
              retry: 0,
            }

            const hadSession = Boolean(session.token.value)
            if (hadSession) {
              attemptOptions.headers = {
                ...(baseOptions.headers as Record<string, string> | undefined),
                Authorization: `Bearer ${session.token.value}`,
              }
            }

            let outgoingRecord: OutgoingRequestRecord | null = null
            let loggedResponse = false

            const ensureOutgoing = () => {
              if (trackLog && !outgoingRecord) {
                outgoingRecord = monitor.logOutgoing({
                  url: urlStr,
                  method,
                  query: attemptOptions.query ?? attemptOptions.params,
                  body: attemptOptions.body,
                  headers: attemptOptions.headers,
                })
              }
            }

            attemptOptions.onRequest = (context: RequestContext) => {
              ensureOutgoing()
              userOnRequest?.(context)
            }

            attemptOptions.onRequestError = (context: RequestErrorContext) => {
              if (trackLog && !loggedResponse) {
                ensureOutgoing()
                loggedResponse = true
                const errMsg = context.error instanceof Error ? context.error.message : String(context.error || '网络请求失败')
                monitor.logIncoming(outgoingRecord!, { status: 0, error: errMsg })
              }

              const willRetry = shouldRetryFetchError({
                method,
                status: 0,
                error: context.error,
                signal,
                attempt,
                maxRetries,
              })
              if (!willRetry) {
                userOnRequestError?.(context)
              }
            }

            attemptOptions.onResponse = (context: ResponseContext) => {
              if (trackLog && !loggedResponse) {
                ensureOutgoing()
                loggedResponse = true
                const status = context.response?.status ?? 0
                const data = context.response?._data
                const error = status >= 400 || (typeof data?.code === 'number' && data.code >= 400)
                  ? (data?.message || `HTTP ${status}`)
                  : undefined
                monitor.logIncoming(outgoingRecord!, { status, data, error })
              }

              const status = context.response?.status ?? 0
              const willRetry = status >= 400 && shouldRetryFetchError({
                method,
                status,
                signal,
                attempt,
                maxRetries,
              })
              if (!willRetry) {
                userOnResponse?.(context)
              }
            }

            attemptOptions.onResponseError = (context: ResponseContext) => {
              const status = context.response?.status ?? 0
              if (trackLog && !loggedResponse) {
                ensureOutgoing()
                loggedResponse = true
                monitor.logIncoming(outgoingRecord!, {
                  status,
                  data: context.response?._data,
                  error: context.response?._data?.message || `HTTP ${status}`,
                })
              }

              const willRetry = shouldRetryFetchError({
                method,
                status,
                signal,
                attempt,
                maxRetries,
              })
              if (willRetry) {
                return
              }

              if (status === 401 && hadSession && !isPublicAuthRequest) {
                session.clear()
                useAuthState().setUnauthenticated()
                useBootstrapCache().clearBootstrapCache()
                usePermissionStore().resetPermissionData()
                if (!handlingUnauthorized) {
                  handlingUnauthorized = true
                  ;(window as { $message?: { warning(message: string): void } }).$message?.warning('登录已过期，请重新登录')
                  const redirect = router.currentRoute.value.fullPath
                  const nav = router.currentRoute.value.path !== '/login'
                    ? router.push({ path: '/login', query: { redirect } })
                    : Promise.resolve()
                  void Promise.resolve(nav).finally(() => {
                    setTimeout(() => { handlingUnauthorized = false }, 500)
                  })
                }
                return
              }

              if (!suppressErrorToast && context.response?._data?.message) {
                ;(window as { $message?: { error(message: string): void } }).$message?.error(context.response._data.message)
              }
              userOnResponseError?.(context)
            }

            return Promise.resolve(invoker(url, attemptOptions))
          },
          onRetry({ retryNumber, maxRetries, delayMs, status }) {
            if (trackLog) {
              const safeUrl = sanitizeApiUrl(urlStr)
              console.warn(`[API ~][RETRY ${retryNumber}/${maxRetries}] ${method} ${safeUrl} (${status || 'NET_ERR'}) waiting ${delayMs}ms`)
            }
          },
        },
      )

      return executePromise.finally(releaseLoading)
    }

    const wrappedFetch = ((url: string, options?: Record<string, unknown>) => {
      // 保留未类型化转发，避免 Nitro 路由泛型在全局拦截器中递归实例化。
      return invokeWithInterception(originalFetch as any, url, options)
    }) as typeof globalThis.$fetch

    wrappedFetch.raw = ((url: string, options?: Record<string, unknown>) => {
      return invokeWithInterception(originalFetch.raw as any, url, options)
    }) as typeof globalThis.$fetch.raw

    wrappedFetch.create = originalFetch.create
    globalThis.$fetch = wrappedFetch
  },
})

