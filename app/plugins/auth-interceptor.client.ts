/**
 * @description 单实例后台的全局 API 拦截器：统一注入鉴权头、处理 401/错误提示、集中记录出站请求与入站响应，并驱动长耗时全局加载遮罩。
 * @file app/plugins/auth-interceptor.client.ts
 */
import { createApiMonitor, shouldLogApiUrl, type OutgoingRequestRecord } from '~/utils/api-logger'
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

    function buildInterceptedContext(
      url: string,
      options?: Record<string, unknown>,
    ): { fetchOptions: Record<string, unknown>, releaseLoading: () => void } {
      const requestOptions: Record<string, unknown> = { ...(options ?? {}) }
      const userOnRequest = requestOptions.onRequest as ((context: RequestContext) => void) | undefined
      const userOnRequestError = requestOptions.onRequestError as ((context: RequestErrorContext) => void) | undefined
      const userOnResponse = requestOptions.onResponse as ((context: ResponseContext) => void) | undefined
      const userOnResponseError = requestOptions.onResponseError as ((context: ResponseContext) => void) | undefined
      const suppressErrorToast = requestOptions.suppressErrorToast === true || requestOptions.suppressToast === true
      const skipGlobalLoading = requestOptions.skipGlobalLoading === true
      const silentLoading = requestOptions.silentLoading === true
      const loadingText = typeof requestOptions.loadingText === 'string' ? requestOptions.loadingText : undefined
      delete requestOptions.suppressErrorToast
      delete requestOptions.suppressToast
      delete requestOptions.skipGlobalLoading
      delete requestOptions.silentLoading
      delete requestOptions.loadingText

      const hadSession = Boolean(session.token.value)
      if (hadSession) {
        requestOptions.headers = {
          ...(requestOptions.headers as Record<string, string> | undefined),
          Authorization: `Bearer ${session.token.value}`,
        }
      }

      const urlStr = String(url)
      const isPublicAuthRequest = urlStr.includes('/api/public/admin-login')
      const trackLog = shouldLogApiUrl(urlStr)
      const trackLoading = shouldTrackGlobalLoading(urlStr, { skipGlobalLoading, silentLoading })
      let outgoingRecord: OutgoingRequestRecord | null = null
      let loggedResponse = false
      let loadingToken: string | null = trackLoading ? globalLoading.start(loadingText) : null

      const releaseLoading = () => {
        if (loadingToken) {
          const token = loadingToken
          loadingToken = null
          globalLoading.finish(token)
        }
      }

      const ensureOutgoing = () => {
        if (trackLog && !outgoingRecord) {
          outgoingRecord = monitor.logOutgoing({
            url: urlStr,
            method: String(requestOptions.method || 'GET'),
            query: requestOptions.query ?? requestOptions.params,
            body: requestOptions.body,
            headers: requestOptions.headers,
          })
        }
      }

      return {
        releaseLoading,
        fetchOptions: {
          ...requestOptions,
          onRequest(context: RequestContext) {
            ensureOutgoing()
            userOnRequest?.(context)
          },
          onRequestError(context: RequestErrorContext) {
            releaseLoading()
            if (trackLog && !loggedResponse) {
              ensureOutgoing()
              loggedResponse = true
              const errMsg = context.error instanceof Error ? context.error.message : String(context.error || '网络请求失败')
              monitor.logIncoming(outgoingRecord!, { status: 0, error: errMsg })
            }
            userOnRequestError?.(context)
          },
          onResponse(context: ResponseContext) {
            releaseLoading()
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
            userOnResponse?.(context)
          },
          onResponseError(context: ResponseContext) {
            releaseLoading()
            if (trackLog && !loggedResponse) {
              ensureOutgoing()
              loggedResponse = true
              monitor.logIncoming(outgoingRecord!, {
                status: context.response?.status ?? 0,
                data: context.response?._data,
                error: context.response?._data?.message || `HTTP ${context.response?.status ?? 0}`,
              })
            }

            if (context.response?.status === 401 && hadSession && !isPublicAuthRequest) {
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
          },
        },
      }
    }

    const wrappedFetch = ((url: string, options?: Record<string, unknown>) => {
      const { fetchOptions, releaseLoading } = buildInterceptedContext(url, options)
      // 保留未类型化转发，避免 Nitro 路由泛型在全局拦截器中递归实例化。
      try {
        return Promise.resolve((originalFetch as any)(url, fetchOptions)).finally(releaseLoading)
      }
      catch (err) {
        releaseLoading()
        throw err
      }
    }) as typeof globalThis.$fetch

    wrappedFetch.raw = ((url: string, options?: Record<string, unknown>) => {
      const { fetchOptions, releaseLoading } = buildInterceptedContext(url, options)
      try {
        return Promise.resolve((originalFetch.raw as any)(url, fetchOptions)).finally(releaseLoading)
      }
      catch (err) {
        releaseLoading()
        throw err
      }
    }) as typeof globalThis.$fetch.raw

    wrappedFetch.create = originalFetch.create
    globalThis.$fetch = wrappedFetch
  },
})
