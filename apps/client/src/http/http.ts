/**
 * @description 基础版 uni.request 封装：统一鉴权头、API 响应解包、错误模型（statusCode / code / state / message）
 *   与会话失效事件。C 端只调用 `/api/client/**`，不直连 PocketBase。
 * @file src/http/http.ts
 */
import { assertMiniProgramBaseUrl, joinApiUrl, selectApiBaseUrl } from './api-url'
import type { WeixinEnvVersion } from './api-url'
import { formatNetworkErrorMessage, notifyApiError, notifyNetworkFailure } from './error-notification'
import { isClientRequestInterceptorInstalled } from './interceptor'
import { errorSummary, logRequestFailure } from './request-diagnostics'
import { isAccountDisabledCode, notifySessionEvent } from './session'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'
type RequestBody = object

/** 普通请求默认超时；上传能力由调用方单独设置 60s。 */
const DEFAULT_TIMEOUT_MS = 15_000

export interface RequestOptions {
  /** 认证接口等场景跳过 Authorization 注入。 */
  skipAuth?: boolean
  /** 由页面自行展示错误时关闭统一 toast（如登录页行内提示）。 */
  hideErrorToast?: boolean
  /** 覆盖默认 15s 超时。 */
  timeoutMs?: number
  /** 幂等请求自动重试次数覆盖（false 或 0 关闭自动重试；默认最多重试 3 次）。 */
  retry?: number | false
}

interface ApiEnvelope<T> {
  code: number | string
  data?: T
  message?: string
  msg?: string
  statusCode?: number
  statusMessage?: string
}

/** C 端统一错误模型；`code` / `state` 来自响应体 `data.code` / `data.state`。 */
export class ApiRequestError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly state: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

/** 判断任意异常是否为本项目统一 API 错误。 */
export function isApiRequestError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError
}

/** 读取异常中的业务错误码；非 API 错误返回空串。 */
export function apiErrorCode(error: unknown): string {
  return isApiRequestError(error) ? error.code : ''
}

/** 读取异常中的报告/资源状态；非 API 错误返回空串。 */
export function apiErrorState(error: unknown): string {
  return isApiRequestError(error) ? error.state : ''
}

/** 读取 HTTP 状态码；网络失败或非 API 错误返回 0。 */
export function apiErrorStatus(error: unknown): number {
  return isApiRequestError(error) ? error.statusCode : 0
}

/** 读取可展示的错误文案；不暴露技术错误码。 */
export function apiErrorMessage(error: unknown, fallback = '请求未完成，请稍后重试'): string {
  if (isApiRequestError(error) && error.message)
    return error.message
  if (error instanceof Error && error.message && !/^request:fail/i.test(error.message))
    return error.message
  return fallback
}

/** 是否为「内容不可查看」类的 404。 */
export function isNotFoundError(error: unknown): boolean {
  return apiErrorStatus(error) === 404
}

const TOKEN_STORAGE_KEY = 'foundation_access_token'

/** 读取微信开发者工具 / 真机当前运行环境。 */
function getWeixinEnvVersion(): WeixinEnvVersion {
  try {
    const version = uni.getAccountInfoSync?.().miniProgram?.envVersion
    return version === 'release' || version === 'trial' ? version : 'develop'
  }
  catch {
    return 'develop'
  }
}

interface ResolvedUrl {
  url: string
  baseUrlSource: string
  envVersion?: WeixinEnvVersion
}

/** 将相对 API 路径变为当前运行环境可请求的地址，并拒绝小程序非法相对地址。 */
function resolveUrl(path: string): ResolvedUrl {
  if (path.startsWith('http://') || path.startsWith('https://'))
    return { url: path, baseUrlSource: 'explicit' }

  // #ifdef H5
  if (import.meta.env.VITE_APP_PROXY_ENABLE === 'true')
    return { url: `${import.meta.env.VITE_APP_PROXY_PREFIX}${path}`, baseUrlSource: 'H5 proxy' }
  // #endif

  const fallback = import.meta.env.VITE_SERVER_BASEURL
  // #ifdef MP-WEIXIN
  const envVersion = getWeixinEnvVersion()
  const selected = selectApiBaseUrl(import.meta.env, envVersion)
  assertMiniProgramBaseUrl(selected.baseUrl, selected.source, envVersion)
  return { url: joinApiUrl(selected.baseUrl, path), baseUrlSource: selected.source, envVersion }
  // #endif

  return { url: joinApiUrl(fallback, path), baseUrlSource: 'VITE_SERVER_BASEURL' }
}

/** 为上传等非 request API 复用同一套平台地址解析。 */
export function resolveClientApiUrl(path: string): string {
  return resolveUrl(path).url
}

/** 从响应体中提取错误信封；兼容 Nitro `createError` 与旧 `{ code, message }` 形状。 */
function normalizeFailure(statusCode: number, body: unknown): ApiRequestError {
  const envelope = (body && typeof body === 'object' ? body : {}) as ApiEnvelope<never> & { data?: unknown }
  const detail = (envelope.data && typeof envelope.data === 'object' ? envelope.data : {}) as { code?: unknown, state?: unknown }
  const rawCode = typeof detail.code === 'string'
    ? detail.code
    : typeof envelope.code === 'string'
      ? envelope.code
      : ''
  const message = String(
    envelope.message || envelope.statusMessage || envelope.msg
    || (statusCode === 404
      ? '内容不可查看'
      : statusCode === 401
        ? '登录状态已失效，请重新登录'
        : statusCode === 403
          ? '当前账号暂时无法查看内容'
          : '请求未完成，请稍后重试'),
  )
  return new ApiRequestError(
    statusCode,
    rawCode,
    typeof detail.state === 'string' ? detail.state : '',
    message,
  )
}

/** 发起基础 API 请求并解包统一响应。 */
function request<T>(method: HttpMethod, path: string, data?: RequestBody, options: RequestOptions = {}): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const token = options.skipAuth ? '' : String(uni.getStorageSync(TOKEN_STORAGE_KEY) || '')
    let resolved: ResolvedUrl
    try {
      resolved = resolveUrl(path)
    }
    catch (error) {
      logRequestFailure({ stage: 'config', method, url: path }, error)
      if (!options.hideErrorToast) {
        notifyApiError({
          kind: 'config',
          method,
          url: path,
          message: errorSummary(error).errMsg,
        })
      }
      reject(error)
      return
    }
    const requestParams: UniApp.RequestOptions & { hideErrorToast?: boolean, retry?: number | false } = {
      url: resolved.url,
      method,
      data,
      timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      header: token ? { Authorization: `Bearer ${token}` } : {},
      hideErrorToast: options.hideErrorToast,
      retry: options.retry,
      success: (response) => {
        const body = response.data as ApiEnvelope<T> | undefined
        const successCode = body && typeof body === 'object' ? body.code : undefined
        if (response.statusCode >= 200 && response.statusCode < 300 && (successCode === 200 || successCode === undefined || successCode === '200')) {
          resolve((body && typeof body === 'object' && 'data' in body ? body.data : body) as T)
          return
        }
        const requestError = normalizeFailure(response.statusCode, body)
        logRequestFailure({
          stage: 'response',
          method,
          url: resolved.url,
          baseUrlSource: resolved.baseUrlSource,
          envVersion: resolved.envVersion,
          statusCode: response.statusCode,
          // 业务码是字符串码（如 REPORT_NOT_FOUND），日志只记录可解析为数字的码。
          businessCode: requestError.code !== '' && Number.isFinite(Number(requestError.code))
            ? Number(requestError.code)
            : undefined,
        }, requestError)
        // 只有携带登录态的请求才交给全局会话守卫：登录 / 匿名接口的 401 是页面内可解释的
        // 业务失败（如账号密码错误），不能被当成会话过期重新 reLaunch，否则登录页错误提示会被清掉。
        const authenticatedRequest = !options.skipAuth && Boolean(token)
        if (authenticatedRequest && response.statusCode === 403 && isAccountDisabledCode(requestError.code))
          notifySessionEvent('disabled')
        else if (authenticatedRequest && response.statusCode === 401)
          notifySessionEvent('expired')
        else if (!options.hideErrorToast && !isClientRequestInterceptorInstalled())
          notifyApiError({
            kind: 'http',
            statusCode: response.statusCode,
            method,
            url: resolved.url,
            message: requestError.message,
          })
        reject(requestError)
      },
      fail: (error) => {
        const errMsg = error && typeof error === 'object' && 'errMsg' in error
          ? String(error.errMsg || '')
          : ''
        const { message } = formatNetworkErrorMessage(error)
        const failure = new ApiRequestError(0, '', '', message)
        logRequestFailure({ stage: 'network', method, url: resolved.url, baseUrlSource: resolved.baseUrlSource, envVersion: resolved.envVersion }, error)
        if (!options.hideErrorToast && !isClientRequestInterceptorInstalled())
          notifyNetworkFailure(error, { url: resolved.url, method })
        // 保留原始 errMsg 供诊断日志使用，但不进入面向用户的文案。
        void errMsg
        reject(failure)
      },
    }
    uni.request(requestParams)
  })
}

/** GET 请求。 */
export function get<T>(path: string, options?: RequestOptions): Promise<T> {
  return request<T>('GET', path, undefined, options)
}

/** POST 请求。 */
export function post<T>(path: string, data: RequestBody, options?: RequestOptions): Promise<T> {
  return request<T>('POST', path, data, options)
}

/** PUT 请求。 */
export function put<T>(path: string, data: RequestBody, options?: RequestOptions): Promise<T> {
  return request<T>('PUT', path, data, options)
}

/** DELETE 请求。 */
export function del<T>(path: string, options?: RequestOptions): Promise<T> {
  return request<T>('DELETE', path, undefined, options)
}
