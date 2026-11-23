/**
 * @description 全局 Nitro 错误处理 -- 将 PocketBase ClientResponseError 和 h3 createError
 *               统一转换为 JSON 响应，避免 404 显示为 500 等问题
 * @file server/utils/errorHandler.ts
 */
import type { H3Event } from 'h3'

/**
 * 判断是否为 PocketBase ClientResponseError
 * ClientResponseError 有 status 属性，H3Error 只有 statusCode 属性，据此区分
 */
function isPocketBaseError(error: unknown): boolean {
  return !!error && typeof error === 'object' && typeof (error as Record<string, unknown>).status === 'number'
    && typeof (error as Record<string, unknown>).statusCode !== 'number'
}

/**
 * 判断是否为 h3 createError 创建的 H3Error
 */
function isH3Error(error: unknown): boolean {
  return !!error && typeof error === 'object' && typeof (error as Record<string, unknown>).statusCode === 'number'
}

export default async function (error: unknown, event: H3Event) {
  let statusCode = 500
  let message = '服务器内部错误'
  let data: unknown
  const err = error as Record<string, unknown>

  // 1. PocketBase ClientResponseError(如 getOne 找不到记录->404)
  if (isPocketBaseError(error)) {
    const response = err.response as Record<string, unknown> | undefined
    statusCode = (err.status as number) || 500
    message = (response?.message as string) || (err.message as string) || '请求失败'
  }
  // 2. h3 createError(中间件抛出的 401.403 等)
  else if (isH3Error(error)) {
    statusCode = (err.statusCode as number) || 500
    message = (err.statusMessage as string) || (err.message as string) || '服务器内部错误'
    data = err.data
  }
  // 3. 普通 Error
  else if (error instanceof Error) {
    message = error.message || '服务器内部错误'
  }

  // 错误监控采集：仅记录 5xx（4xx 多为预期业务错误，噪音大）。
  // 跳过错误监控自身的端点，避免「记录失败→再触发 errorHandler」成环。
  const reqPath = event.path || ''
  if (statusCode >= 500 && !reqPath.startsWith('/api/admin/monitor/error') && !reqPath.startsWith('/api/client/client-error')) {
    // 在「生产掩码」之前抓真实信息；不 await，不阻塞响应返回
    const realMessage = message
    const stack = error instanceof Error ? error.stack : undefined
    void (async () => {
      try {
        const pb = await getAdminPB()
        await recordError(pb, {
          source: 'api',
          level: 'error',
          message: realMessage,
          stack,
          url: reqPath,
          method: event.method,
          statusCode,
          platform: 'server',
        })
      } catch { /* 采集失败静默，已在 recordError 内兜底 */ }
    })()
  }

  // 生产环境隐藏非显式 H3Error 的 5xx 内部详情，避免暴露底层实现或堆栈信息
  if (statusCode >= 500 && !isH3Error(error) && process.env.NODE_ENV === 'production') {
    message = '服务器内部错误'
  }

  if (event.node.res.writableEnded) return

  // 浏览器直接访问非 API 页面（如未知路由 404）时，交由 Nuxt 渲染 app/error.vue 而非输出裸 JSON
  const accept = String(getHeader(event, 'accept') || '')
  const isApiOrInternal = reqPath.startsWith('/api/') || reqPath.startsWith('/__nuxt_error')
  if (!isApiOrInternal && accept.includes('text/html')) {
    try {
      const html = await event.$fetch<string>('/__nuxt_error', {
        query: {
          url: reqPath,
          statusCode: String(statusCode),
          statusMessage: message,
          message,
        },
      })
      if (event.node.res.writableEnded) return
      setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8')
      event.node.res.statusCode = statusCode
      event.node.res.end(html)
      return
    } catch {
      // HTML 错误页渲染异常时回退到 JSON 输出，避免二次异常
    }
  }

  if (event.node.res.writableEnded) return

  setResponseHeader(event, 'Content-Type', 'application/json; charset=utf-8')
  event.node.res.statusCode = statusCode

  event.node.res.end(JSON.stringify({ code: statusCode, message, data: data ?? null }))
}
