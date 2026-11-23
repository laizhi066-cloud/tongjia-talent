/**
 * @description 单实例后台的全局 API 鉴权与错误提示拦截器。
 * @file app/plugins/auth-interceptor.client.ts
 */
interface ResponseErrorContext {
  response?: {
    status: number
    _data?: { message?: string }
  }
}

export default defineNuxtPlugin({
  name: 'auth-interceptor',
  dependsOn: ['auth-session'],
  setup() {
    const session = useAuthSession()
    const router = useRouter()
    const originalFetch = globalThis.$fetch

    let handlingUnauthorized = false

    globalThis.$fetch = ((url: string, options?: Record<string, unknown>) => {
      const requestOptions: Record<string, unknown> = { ...(options ?? {}) }
      const onResponseError = requestOptions.onResponseError as ((context: ResponseErrorContext) => void) | undefined
      const suppressErrorToast = requestOptions.suppressErrorToast === true || requestOptions.suppressToast === true
      delete requestOptions.suppressErrorToast
      delete requestOptions.suppressToast

      if (session.token.value) {
        requestOptions.headers = {
          ...(requestOptions.headers as Record<string, string> | undefined),
          Authorization: `Bearer ${session.token.value}`,
        }
      }

      // 保留未类型化转发，避免 Nitro 路由泛型在全局拦截器中递归实例化。
      return (originalFetch as any)(url, {
        ...requestOptions,
        onResponseError(context: ResponseErrorContext) {
          if (context.response?.status === 401) {
            session.clear()
            useAuthState().setUnauthenticated()
            useBootstrapCache().clearBootstrapCache()
            usePermissionStore().reset()
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
          onResponseError?.(context)
        },
      })
    }) as typeof globalThis.$fetch

    globalThis.$fetch.raw = originalFetch.raw
    globalThis.$fetch.create = originalFetch.create
  },
})
