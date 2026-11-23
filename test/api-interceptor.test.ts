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
  getClientApiMetrics,
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

describe('uni-app client requestInterceptor', () => {
  afterEach(() => {
    resetClientApiInterceptorState()
    delete (globalThis as Record<string, unknown>).uni
    vi.restoreAllMocks()
  })

  it('通过 uni.addInterceptor("request") 统一记录 C 端出站与入站耗时，且幂等安装', () => {
    let registeredHandler: { invoke?: (args: Record<string, unknown>) => unknown } | null = null
    const addInterceptor = vi.fn((_name: string, handler: { invoke?: (args: Record<string, unknown>) => unknown }) => {
      registeredHandler = handler
    })
    ;(globalThis as Record<string, unknown>).uni = { addInterceptor }

    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    requestInterceptor.install()
    requestInterceptor.install()
    expect(addInterceptor).toHaveBeenCalledTimes(1)
    expect(registeredHandler).not.toBeNull()

    // 模拟一次成功请求
    const onSuccess = vi.fn()
    const reqArgs: Record<string, unknown> = {
      url: 'https://example.com/api/client/config/site?token=secret',
      method: 'GET',
      success: onSuccess,
    }
    registeredHandler!.invoke!(reqArgs)
    ;(reqArgs.success as (res: Record<string, unknown>) => void)({ statusCode: 200, data: { code: 200, data: {} } })
    expect(onSuccess).toHaveBeenCalledTimes(1)

    // 模拟一次网络失败
    const onFail = vi.fn()
    const failArgs: Record<string, unknown> = {
      url: 'https://example.com/api/client/talent/home',
      method: 'GET',
      fail: onFail,
    }
    registeredHandler!.invoke!(failArgs)
    ;(failArgs.fail as (err: unknown) => void)({ errMsg: 'request:fail timeout' })
    expect(onFail).toHaveBeenCalledTimes(1)

    const metrics = getClientApiMetrics()
    expect(metrics.total).toBe(2)
    expect(metrics.failed).toBe(1)
    expect(metrics.recent[0]!.url).toBe('https://example.com/api/client/config/site')
    expect(infoSpy).toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalled()
  })
})
