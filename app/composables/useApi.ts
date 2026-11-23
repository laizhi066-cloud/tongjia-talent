/**
 * @description 类型安全的 API 调用封装 + 响应拦截器
 *
 * 统一处理 { code, message, data } 响应格式：
 * - code < 400 → 返回 data（调用方直接使用实际载荷）
 * - POST/PUT/DELETE 成功 → 自动弹出后端返回的 message
 * - code >= 400 → 抛出 ApiError
 *
 * @file app/composables/useApi.ts
 */
// toast replaced by naive-ui useMessage (injected via window.$message)

export class ApiError extends Error {
  code: number
  constructor(code: number, message: string) {
    super(message)
    this.code = code
  }
}

export async function useApi<T = any>(
  url: string,
  opts?: Record<string, unknown> & { suppressToast?: boolean },
): Promise<T> {
  const config = useRuntimeConfig().public as Record<string, string>
  const baseUrl = config.apiBaseUrl || ''
  const method = (opts?.method as string) || 'GET'
  // 注意：拦截器会在请求前删除 opts.suppressErrorToast，故须在 await 之前读取
  const suppressErr = (opts as any)?.suppressErrorToast ?? (opts as any)?.suppressToast

  const response: { code: number; message: string; data: T } = await ($fetch as any)(
    `${baseUrl}${url}`,
    opts,
  )

  // 业务错误以 HTTP 200 + code>=400 形态返回时（非 HTTP 错误，拦截器 onResponseError 不触发），
  // 这里兜底弹出错误提示，避免「接口报错却无任何提示」。HTTP 错误路径由拦截器负责，互斥不重复。
  if (response.code >= 400) {
    if (!suppressErr) {
      try { (window as any).$message?.error?.(response.message) } catch { /* SSR/无 provider 时静默 */ }
    }
    throw new ApiError(response.code, response.message)
  }

  // 增删改操作成功后弹后端返回的消息（需显式传入 successToast: true）
  // 心跳等高频或静默操作不传 successToast 则不会弹框
  if (['POST', 'PUT', 'DELETE'].includes(method) && response.message && (opts as any)?.successToast) {
    try {
      // naive-ui injects $message via NMessageProvider
      (window as any).$message?.success?.(response.message);
    } catch {
      // silently ignore during SSR
    }
  }

  return response.data as T
}
