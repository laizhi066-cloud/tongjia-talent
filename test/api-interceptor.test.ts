/**
 * @description 集中式 API 拦截器单元测试：脱敏规则、请求/响应耗时监控、慢请求告警、错误循环排除与 C 端 uni 拦截器。
 * @file test/api-interceptor.test.ts
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createApiMonitor,
  sanitizeApiUrl,
  sanitizePayload,
  shouldLogApiUrl,
  summarizeResponseData,
} from '../app/utils/api-logger'
import {
  activateErrorToastHandler,
  allocateErrorToastSelector,
  formatHttpErrorMessage,
  formatNetworkErrorMessage,
  hasErrorToastHandler,
  isAbortedNetworkError,
  isSilentErrorToastUrl,
  notifyApiError,
  registerErrorToastHandler,
  resetErrorNotificationState,
  unregisterErrorToastHandler,
  type ApiErrorNotification,
} from '../apps/client/src/http/error-notification'
import {
  getClientApiMetrics,
  isClientRequestInterceptorInstalled,
  requestInterceptor,
  resetClientApiInterceptorState,
} from '../apps/client/src/http/interceptor'

describe('api-logger utilities', () => {
  it('shouldLogApiUrl 仅匹配业务 API 并排除错误上报与 Nuxt 内部路径', () => {
    expect(shouldLogApiUrl('/api/admin/theme')).toBe(true)
    expect(shouldLogApiUrl('/api/client/config/site')).toBe(true)
    expect(shouldLogApiUrl('https://api.example.com/v1/health')).toBe(true)
    expect(shouldLogApiUrl('/api/client/client-error')).toBe(false)
    expect(shouldLogApiUrl('/_nuxt/entry.js')).toBe(false)
    expect(shouldLogApiUrl('/__nuxt_error?statusCode=404')).toBe(false)
    expect(shouldLogApiUrl('')).toBe(false)
  })

  it('sanitizeApiUrl 脱敏 URL 凭据、敏感查询参数、手机号与身份证号', () => {
    expect(sanitizeApiUrl('https://user:pass@example.com/api/auth?token=abc&page=2&phone=13800138000#frag'))
      .toBe('https://[redacted]@example.com/api/auth?token=[redacted]&page=2&phone=[redacted]')

    expect(sanitizeApiUrl('/api/admin/members/13912345678?idCard=11010519900101123X&status=1'))
      .toBe('/api/admin/members/[phone]?idCard=[redacted]&status=1')
  })

  it('sanitizePayload 递归脱敏密码/令牌/认证头并裁剪长文本与大数组', () => {
    const sanitized = sanitizePayload({
      identity: 'admin',
      password: 'SuperSecretPassword123',
      headers: {
        Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.secret',
        'Content-Type': 'application/json',
      },
      nested: {
        phone: '13800138000',
        note: 'contact Bearer tok_123456 at 13900001111',
      },
      items: Array.from({ length: 15 }, (_, idx) => idx),
    }) as Record<string, any>

    expect(sanitized.identity).toBe('admin')
    expect(sanitized.password).toBe('[redacted]')
    expect(sanitized.headers.Authorization).toBe('[redacted]')
    expect(sanitized.headers['Content-Type']).toBe('application/json')
    expect(sanitized.nested.phone).toBe('[redacted]')
    expect(sanitized.nested.note).toBe('contact Bearer [redacted] at [phone]')
    expect(sanitized.items.length).toBe(11)
    expect(sanitized.items[10]).toContain('+5 items')
  })

  it('summarizeResponseData 压缩列表响应避免控制台刷屏', () => {
    const summary = summarizeResponseData({
      code: 200,
      message: 'ok',
      data: { items: [{ id: 1 }, { id: 2 }], total: 42 },
    })
    expect(summary).toEqual({
      code: 200,
      message: 'ok',
      data: '{ items: Array(2), total: 42 }',
    })
  })

  it('createApiMonitor 准确记录出站/入站日志、慢请求告警与环形指标统计', () => {
    let clock = 100
    const mockConsole = {
      info: vi.fn(),
      warn: vi.fn(),
    }
    const monitor = createApiMonitor({
      slowThresholdMs: 500,
      maxEntries: 2,
      console: mockConsole,
      now: () => clock,
    })

    // 1. 正常快请求
    const req1 = monitor.logOutgoing({
      url: '/api/admin/theme',
      method: 'get',
      headers: { Authorization: 'Bearer secret-jwt' },
    })
    clock = 185.4
    const res1 = monitor.logIncoming(req1, { status: 200, data: { code: 200, data: { theme: 'jade' } } })
    expect(res1.durationMs).toBe(85.4)
    expect(res1.ok).toBe(true)
    expect(res1.slow).toBe(false)
    expect(mockConsole.info).toHaveBeenCalledTimes(2)
    expect(mockConsole.warn).not.toHaveBeenCalled()

    // 2. 慢请求（>= 500ms 走 warn）
    const req2 = monitor.logOutgoing({ url: '/api/admin/talent/reports', method: 'GET' })
    clock = 820.4
    const res2 = monitor.logIncoming(req2, { status: 200, data: { code: 200, data: [] } })
    expect(res2.slow).toBe(true)
    expect(res2.ok).toBe(true)
    expect(mockConsole.warn).toHaveBeenCalledTimes(1)

    // 3. 失败请求（超出 maxEntries=2 后淘汰最旧的 req1）
    const req3 = monitor.logOutgoing({
      url: '/api/admin/auth/login',
      method: 'POST',
      body: { identity: 'admin', password: 'secret-password' },
    })
    clock = 950.4
    const res3 = monitor.logIncoming(req3, { status: 401, data: { code: 401, message: '账号或密码错误' }, error: '账号或密码错误' })
    expect(res3.ok).toBe(false)
    expect(mockConsole.warn).toHaveBeenCalledTimes(2)

    const metrics = monitor.getMetrics()
    expect(metrics.total).toBe(2)
    expect(metrics.slow).toBe(1)
    expect(metrics.failed).toBe(1)
    expect(metrics.maxDurationMs).toBe(635)
    expect(metrics.recent.map((e) => e.url)).toEqual(['/api/admin/talent/reports', '/api/admin/auth/login'])
  })
})

describe('client error-notification Wot UI Toast bridge', () => {
  afterEach(() => {
    resetErrorNotificationState()
    delete (globalThis as Record<string, unknown>).uni
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('将底层网络与 HTTP 失败映射为可读中文提示并过滤主动取消与静默接口', () => {
    expect(formatNetworkErrorMessage({ errMsg: 'request:fail timeout' })).toEqual({
      kind: 'timeout',
      message: '请求超时，请检查网络后重试',
    })
    expect(formatNetworkErrorMessage({ errMsg: 'request:fail net::ERR_INTERNET_DISCONNECTED' })).toEqual({
      kind: 'network',
      message: '当前网络不可用，请检查网络连接',
    })
    expect(formatNetworkErrorMessage({ errMsg: 'request:fail ssl handshake failed' })).toEqual({
      kind: 'network',
      message: '网络安全连接异常，请稍后重试',
    })
    expect(formatNetworkErrorMessage({ errMsg: 'request:fail url not in domain list' })).toEqual({
      kind: 'network',
      message: '网络连接失败，请稍后重试',
    })

    expect(isAbortedNetworkError({ errMsg: 'request:fail abort' })).toBe(true)
    expect(isAbortedNetworkError({ errMsg: 'request:fail timeout' })).toBe(false)

    expect(isSilentErrorToastUrl('/api/client/config/site')).toBe(true)
    expect(isSilentErrorToastUrl('https://example.com/api/client/client-error')).toBe(true)
    expect(isSilentErrorToastUrl('/api/client/talent/summary')).toBe(false)

    expect(formatHttpErrorMessage(500, { message: '报告服务繁忙' })).toBe('报告服务繁忙')
    expect(formatHttpErrorMessage(502, {})).toBe('服务暂时不可用，请稍后重试')
    expect(formatHttpErrorMessage(429, {})).toBe('操作过于频繁，请稍后重试')
    expect(formatHttpErrorMessage(500, { message: 'request:fail internal' })).toBe('服务暂时不可用，请稍后重试')
  })

  it('按页面栈 LIFO 路由到当前活跃页面的 Wot UI Toast 宿主，并支持 onShow 提升与卸载回退', () => {
    expect(allocateErrorToastSelector()).toBe('portal-api-error-toast-1')
    expect(allocateErrorToastSelector()).toBe('portal-api-error-toast-2')

    const pageA = vi.fn()
    const pageB = vi.fn()

    expect(hasErrorToastHandler()).toBe(false)
    registerErrorToastHandler(pageA)
    registerErrorToastHandler(pageB)
    expect(hasErrorToastHandler()).toBe(true)

    notifyApiError({ kind: 'network', message: '网络连接失败，请稍后重试', force: true })
    expect(pageB).toHaveBeenCalledTimes(1)
    expect(pageA).not.toHaveBeenCalled()

    // 切回页面 A（onShow 提升为栈顶）
    activateErrorToastHandler(pageA)
    notifyApiError({ kind: 'timeout', message: '请求超时，请检查网络后重试', force: true })
    expect(pageA).toHaveBeenCalledTimes(1)
    expect(pageB).toHaveBeenCalledTimes(1)

    // 卸载页面 A 后自动回退到页面 B
    unregisterErrorToastHandler(pageA)
    notifyApiError({ kind: 'http', message: '服务暂时不可用，请稍后重试', force: true })
    expect(pageB).toHaveBeenCalledTimes(2)

    unregisterErrorToastHandler(pageB)
    expect(hasErrorToastHandler()).toBe(false)
  })

  it('短时间内对相同错误文案去重，无 Wot UI 宿主时安全回退到 uni.showToast', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-23T12:00:00.000Z'))

    const wotToastHandler = vi.fn()
    registerErrorToastHandler(wotToastHandler)

    expect(notifyApiError({ kind: 'network', message: '网络连接失败，请稍后重试' })).toBe(true)
    expect(notifyApiError({ kind: 'network', message: '网络连接失败，请稍后重试' })).toBe(false)
    expect(wotToastHandler).toHaveBeenCalledTimes(1)

    // 不同文案立即展示
    expect(notifyApiError({ kind: 'timeout', message: '请求超时，请检查网络后重试' })).toBe(true)
    expect(wotToastHandler).toHaveBeenCalledTimes(2)

    // 超过去重窗口后允许再次提示
    vi.advanceTimersByTime(1600)
    expect(notifyApiError({ kind: 'timeout', message: '请求超时，请检查网络后重试' })).toBe(true)
    expect(wotToastHandler).toHaveBeenCalledTimes(3)

    // 注销所有宿主后回退原生 uni.showToast
    unregisterErrorToastHandler(wotToastHandler)
    const showToast = vi.fn()
    ;(globalThis as Record<string, unknown>).uni = { showToast }

    expect(notifyApiError({ kind: 'network', message: '当前网络不可用，请检查网络连接' })).toBe(true)
    expect(showToast).toHaveBeenCalledWith({
      title: '当前网络不可用，请检查网络连接',
      icon: 'none',
      duration: 2500,
    })
  })
})

describe('uni-app client requestInterceptor', () => {
  afterEach(() => {
    resetClientApiInterceptorState()
    resetErrorNotificationState()
    delete (globalThis as Record<string, unknown>).uni
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('通过 uni.addInterceptor("request") 统一记录出站/入站耗时、触发 Wot UI 错误通知且幂等安装', () => {
    let registeredHandler: { invoke?: (args: Record<string, unknown>) => unknown } | null = null
    const addInterceptor = vi.fn((_name: string, handler: { invoke?: (args: Record<string, unknown>) => unknown }) => {
      registeredHandler = handler
    })
    ;(globalThis as Record<string, unknown>).uni = { addInterceptor }

    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const toastSpy = vi.fn<(payload: ApiErrorNotification) => void>()
    registerErrorToastHandler(toastSpy)

    expect(isClientRequestInterceptorInstalled()).toBe(false)
    requestInterceptor.install()
    requestInterceptor.install()
    expect(isClientRequestInterceptorInstalled()).toBe(true)
    expect(addInterceptor).toHaveBeenCalledTimes(1)
    expect(registeredHandler).not.toBeNull()

    // 1. 模拟一次成功请求（不弹 Toast）
    const onSuccess = vi.fn()
    const reqArgs: Record<string, unknown> = {
      url: 'https://example.com/api/client/config/site?token=secret',
      method: 'GET',
      success: onSuccess,
    }
    registeredHandler!.invoke!(reqArgs)
    ;(reqArgs.success as (res: Record<string, unknown>) => void)({ statusCode: 200, data: { code: 200, data: {} } })
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(toastSpy).not.toHaveBeenCalled()

    // 2. 模拟一次网络超时失败（触发 Wot UI Toast）
    const onFail = vi.fn()
    const failArgs: Record<string, unknown> = {
      url: 'https://example.com/api/client/talent/home',
      method: 'GET',
      fail: onFail,
    }
    registeredHandler!.invoke!(failArgs)
    ;(failArgs.fail as (err: unknown) => void)({ errMsg: 'request:fail timeout' })
    expect(onFail).toHaveBeenCalledTimes(1)
    expect(toastSpy).toHaveBeenCalledTimes(1)
    expect(toastSpy).toHaveBeenLastCalledWith(expect.objectContaining({
      kind: 'timeout',
      message: '请求超时，请检查网络后重试',
      statusCode: 0,
      url: 'https://example.com/api/client/talent/home',
    }))

    // 3. 模拟一次 HTTP 500 失败（触发 Wot UI Toast）
    const serverErrArgs: Record<string, unknown> = {
      url: 'https://example.com/api/client/talent/report',
      method: 'GET',
    }
    registeredHandler!.invoke!(serverErrArgs)
    ;(serverErrArgs.success as (res: Record<string, unknown>) => void)({
      statusCode: 500,
      data: { code: 500, message: '报告服务暂不可用' },
    })
    expect(toastSpy).toHaveBeenCalledTimes(2)
    expect(toastSpy).toHaveBeenLastCalledWith(expect.objectContaining({
      kind: 'http',
      statusCode: 500,
      message: '报告服务暂不可用',
    }))

    const metrics = getClientApiMetrics()
    expect(metrics.total).toBe(3)
    expect(metrics.failed).toBe(2)
    expect(metrics.recent[0]!.url).toBe('https://example.com/api/client/config/site')
    expect(infoSpy).toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalled()
  })

  it('对 hideErrorToast、静默接口、主动取消与会话守卫 401/403 不误弹错误 Toast', () => {
    let registeredHandler: { invoke?: (args: Record<string, unknown>) => unknown } | null = null
    const addInterceptor = vi.fn((_name: string, handler: { invoke?: (args: Record<string, unknown>) => unknown }) => {
      registeredHandler = handler
    })
    ;(globalThis as Record<string, unknown>).uni = { addInterceptor }
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const toastSpy = vi.fn()
    registerErrorToastHandler(toastSpy)
    requestInterceptor.install()

    // 1. hideErrorToast: true 被剥离且不弹窗
    const hiddenArgs: Record<string, unknown> = {
      url: 'https://example.com/api/client/talent/summary',
      method: 'GET',
      hideErrorToast: true,
    }
    registeredHandler!.invoke!(hiddenArgs)
    expect('hideErrorToast' in hiddenArgs).toBe(false)
    ;(hiddenArgs.fail as (err: unknown) => void)({ errMsg: 'request:fail' })
    expect(toastSpy).not.toHaveBeenCalled()

    // 2. 后台站点配置轮询失败不弹窗
    const siteArgs: Record<string, unknown> = {
      url: 'https://example.com/api/client/config/site',
      method: 'GET',
    }
    registeredHandler!.invoke!(siteArgs)
    ;(siteArgs.fail as (err: unknown) => void)({ errMsg: 'request:fail' })
    expect(toastSpy).not.toHaveBeenCalled()

    // 3. 主动取消请求不弹窗
    const abortArgs: Record<string, unknown> = {
      url: 'https://example.com/api/client/talent/advice',
      method: 'GET',
    }
    registeredHandler!.invoke!(abortArgs)
    ;(abortArgs.fail as (err: unknown) => void)({ errMsg: 'request:fail abort' })
    expect(toastSpy).not.toHaveBeenCalled()

    // 4. 已认证 401 / 403 ACCOUNT_DISABLED 交给会话守卫，不弹窗
    const auth401Args: Record<string, unknown> = {
      url: 'https://example.com/api/client/talent/profile',
      method: 'GET',
      header: { Authorization: 'Bearer token-123' },
    }
    registeredHandler!.invoke!(auth401Args)
    ;(auth401Args.success as (res: Record<string, unknown>) => void)({
      statusCode: 401,
      data: { code: 401, message: '未登录' },
    })
    expect(toastSpy).not.toHaveBeenCalled()

    const auth403Args: Record<string, unknown> = {
      url: 'https://example.com/api/client/talent/profile',
      method: 'GET',
      header: { Authorization: 'Bearer token-123' },
    }
    registeredHandler!.invoke!(auth403Args)
    ;(auth403Args.success as (res: Record<string, unknown>) => void)({
      statusCode: 403,
      data: { code: 403, data: { code: 'ACCOUNT_DISABLED' }, message: '账号已停用' },
    })
    expect(toastSpy).not.toHaveBeenCalled()
  })
})

