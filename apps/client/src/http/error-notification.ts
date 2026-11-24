/**
 * @description C 端 API 异常通知处理器与 Wot UI Toast 调度桥。
 *   统一将网络中断、请求超时、服务异常等失败转换为面向用户的中文提示，
 *   优先派发到当前活跃页面挂载的 Wot UI `<wd-toast />`，无宿主时安全回退到 `uni.showToast`。
 * @file src/http/error-notification.ts
 */
import { errorSummary } from './request-diagnostics'

export type ApiErrorKind = 'network' | 'timeout' | 'http' | 'config'

export interface ApiErrorNotification {
  kind: ApiErrorKind
  message: string
  duration: number
  url?: string
  method?: string
  statusCode?: number
  errMsg?: string
}

export type ErrorToastDispatcher = (notification: ApiErrorNotification) => void

export interface NotifyApiErrorOptions {
  kind: ApiErrorKind
  message: string
  duration?: number
  url?: string
  method?: string
  statusCode?: number
  errMsg?: string
  /** 跳过短时间内的同文案去重窗口。 */
  force?: boolean
}

const DEFAULT_TOAST_DURATION_MS = 2500
const DEFAULT_DEDUPE_WINDOW_MS = 1500

/** 后台静默接口：轮询或错误上报失败时不弹出 Toast 干扰用户。 */
const SILENT_TOAST_PATH_PATTERNS: readonly RegExp[] = [
  /\/api\/client\/client-error(?:$|[/?#])/,
  /\/api\/client\/config\/site(?:$|[/?#])/,
]

/** 按页面栈顺序维护活跃的 Wot UI Toast 宿主派发器（栈顶即当前可见页面）。 */
const toastHandlers: ErrorToastDispatcher[] = []

let toastHostSeq = 0
let lastToastMessage = ''
let lastToastAt = 0

/** 为每个挂载的 Wot UI `<wd-toast />` 宿主分配唯一 selector，避免多页面栈冲突。 */
export function allocateErrorToastSelector(): string {
  toastHostSeq += 1
  return `portal-api-error-toast-${toastHostSeq}`
}

/** 注册当前页面的 Wot UI Toast 派发器并置为栈顶活跃宿主。 */
export function registerErrorToastHandler(handler: ErrorToastDispatcher): void {
  const existingIndex = toastHandlers.indexOf(handler)
  if (existingIndex >= 0)
    toastHandlers.splice(existingIndex, 1)
  toastHandlers.push(handler)
}

/** 页面重新展示（onShow）时将其 Toast 宿主提升为活跃栈顶。 */
export function activateErrorToastHandler(handler: ErrorToastDispatcher): void {
  registerErrorToastHandler(handler)
}

/** 页面卸载时注销对应的 Toast 宿主，回退到上一层页面宿主。 */
export function unregisterErrorToastHandler(handler: ErrorToastDispatcher): void {
  const index = toastHandlers.indexOf(handler)
  if (index >= 0)
    toastHandlers.splice(index, 1)
}

/** 当前是否存在已挂载的 Wot UI Toast 宿主。 */
export function hasErrorToastHandler(): boolean {
  return toastHandlers.length > 0
}

/** 判断目标请求是否为后台静默接口，避免轮询失败持续弹窗。 */
export function isSilentErrorToastUrl(url: string): boolean {
  if (!url)
    return false
  return SILENT_TOAST_PATH_PATTERNS.some(pattern => pattern.test(url))
}

/** 提取原始错误文案（用于分类，不直接透出给用户）。 */
function extractRawErrorText(error: unknown): string {
  if (!error)
    return ''
  if (typeof error === 'string')
    return error
  if (typeof error === 'object') {
    const value = error as { errMsg?: unknown, message?: unknown, name?: unknown }
    if (typeof value.errMsg === 'string' && value.errMsg)
      return value.errMsg
    if (typeof value.message === 'string' && value.message)
      return value.message
    if (typeof value.name === 'string' && value.name)
      return value.name
  }
  return ''
}

/** 判断是否为调用方主动取消的请求（如页面切换 abort），无需向用户报错。 */
export function isAbortedNetworkError(error: unknown): boolean {
  const raw = extractRawErrorText(error)
  return /\babort(?:ed)?\b|AbortError/i.test(raw)
}

/** 将 uni.request / 网络层失败转换为面向用户的友好中文提示，不暴露技术栈或 URL。 */
export function formatNetworkErrorMessage(error: unknown): { kind: 'network' | 'timeout', message: string } {
  const raw = extractRawErrorText(error)
  if (/timeout|timed\s*out/i.test(raw)) {
    return {
      kind: 'timeout',
      message: '请求超时，请检查网络后重试',
    }
  }
  if (/err_internet_disconnected|offline|network\s*is\s*unreachable|no\s*internet|not\s*connected/i.test(raw)) {
    return {
      kind: 'network',
      message: '当前网络不可用，请检查网络连接',
    }
  }
  if (/\b(?:ssl|tls|cert(?:ificate)?)\b/i.test(raw)) {
    return {
      kind: 'network',
      message: '网络安全连接异常，请稍后重试',
    }
  }
  return {
    kind: 'network',
    message: '网络连接失败，请稍后重试',
  }
}

/** 从 HTTP 异常响应体提取可读错误文案；兼容 Nitro `createError` 与 `{ code, message }` 信封。 */
export function formatHttpErrorMessage(statusCode: number, body: unknown): string {
  const envelope = (body && typeof body === 'object' ? body : {}) as {
    message?: unknown
    statusMessage?: unknown
    msg?: unknown
  }
  const candidate = [envelope.message, envelope.statusMessage, envelope.msg]
    .find((item): item is string => typeof item === 'string' && item.trim().length > 0)

  if (candidate && !/^request:fail/i.test(candidate.trim()))
    return candidate.trim()

  if (statusCode === 401)
    return '登录状态已失效，请重新登录'
  if (statusCode === 403)
    return '当前账号暂时无法查看内容'
  if (statusCode === 404)
    return '内容不可查看'
  if (statusCode === 429)
    return '操作过于频繁，请稍后重试'
  if (statusCode >= 500)
    return '服务暂时不可用，请稍后重试'
  return '请求未完成，请稍后重试'
}

/** 派发一条全局 API 错误 Toast（带短窗口去重、Wot UI 优先与原生回退）。 */
export function notifyApiError(options: NotifyApiErrorOptions): boolean {
  const message = options.message.trim()
  if (!message)
    return false

  const now = Date.now()
  if (!options.force && message === lastToastMessage && now - lastToastAt < DEFAULT_DEDUPE_WINDOW_MS)
    return false

  lastToastMessage = message
  lastToastAt = now

  const notification: ApiErrorNotification = {
    kind: options.kind,
    message,
    duration: options.duration ?? DEFAULT_TOAST_DURATION_MS,
    url: options.url,
    method: options.method,
    statusCode: options.statusCode,
    errMsg: options.errMsg,
  }

  const activeHandler = toastHandlers[toastHandlers.length - 1]
  if (activeHandler) {
    activeHandler(notification)
    return true
  }

  // 页面尚未挂载 Wot UI 宿主（如冷启动阶段）时，回退原生 uni.showToast 避免丢提示。
  if (typeof uni !== 'undefined' && typeof uni.showToast === 'function') {
    uni.showToast({
      title: notification.message,
      icon: 'none',
      duration: notification.duration,
    })
    return true
  }

  return false
}

/** 面向网络请求失败（uni.request fail）的快捷通知入口。 */
export function notifyNetworkFailure(
  error: unknown,
  context: { url?: string, method?: string, force?: boolean } = {},
): boolean {
  if (isAbortedNetworkError(error))
    return false
  const formatted = formatNetworkErrorMessage(error)
  const summary = errorSummary(error)
  return notifyApiError({
    kind: formatted.kind,
    message: formatted.message,
    url: context.url,
    method: context.method,
    statusCode: 0,
    errMsg: summary.errMsg,
    force: context.force,
  })
}

/** 重置 Toast 宿主栈与去重状态（供单元测试清理）。 */
export function resetErrorNotificationState(): void {
  toastHandlers.length = 0
  toastHostSeq = 0
  lastToastMessage = ''
  lastToastAt = 0
}
