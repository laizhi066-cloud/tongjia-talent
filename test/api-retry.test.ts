/**
 * @description API 拦截器幂等请求自动重试与指数退避单元测试（覆盖 B 端 `$fetch` 与 C 端 `uni.request` 拦截器）。
 * @file test/api-retry.test.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  calculateBackoffDelay,
  DEFAULT_MAX_RETRIES,
  executeWithRetry,
  isAbortError,
  isIdempotentMethod,
  isRetryableStatus,
  parseRetryAfterMs,
  resolveMaxRetries,
  shouldRetryFetchError,
} from '../app/utils/api-retry'
import {
  registerErrorToastHandler,
  resetErrorNotificationState,
} from '../apps/client/src/http/error-notification'
import {
  configureClientApiInterceptor,
  getClientApiMetrics,
  requestInterceptor,
  resetClientApiInterceptorState,
} from '../apps/client/src/http/interceptor'
import {
  calculateClientBackoffDelay,
  isIdempotentHttpMethod,
  isRetryableHttpStatus,
  resolveClientMaxRetries,
} from '../apps/client/src/http/retry'

describe('admin api-retry exponential backoff utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('准确区分幂等与非幂等 HTTP 方法，并允许按单次请求覆盖重试次数', () => {
    expect(isIdempotentMethod('GET')).toBe(true)
    expect(isIdempotentMethod('get')).toBe(true)
    expect(isIdempotentMethod(undefined)).toBe(true)
    expect(isIdempotentMethod('HEAD')).toBe(true)
    expect(isIdempotentMethod('OPTIONS')).toBe(true)
    expect(isIdempotentMethod('PUT')).toBe(true)
    expect(isIdempotentMethod('DELETE')).toBe(true)

    expect(isIdempotentMethod('POST')).toBe(false)
    expect(isIdempotentMethod('PATCH')).toBe(false)

    expect(resolveMaxRetries('GET')).toBe(DEFAULT_MAX_RETRIES)
    expect(resolveMaxRetries('GET', false)).toBe(0)
    expect(resolveMaxRetries('GET', 0)).toBe(0)
    expect(resolveMaxRetries('GET', 2)).toBe(2)
    expect(resolveMaxRetries('POST')).toBe(0)
    expect(resolveMaxRetries('POST', 3)).toBe(0)
  })

  it('仅对网络失败及临时性 HTTP 状态码重试，拒绝客户端确定性错误与主动取消', () => {
    for (const status of [408, 429, 500, 502, 503, 504])
      expect(isRetryableStatus(status)).toBe(true)

    for (const status of [400, 401, 403, 404, 405, 409, 422])
      expect(isRetryableStatus(status)).toBe(false)

    expect(shouldRetryFetchError({ method: 'GET', status: 0, attempt: 0, maxRetries: 3 })).toBe(true)
    expect(shouldRetryFetchError({ method: 'GET', status: 503, attempt: 2, maxRetries: 3 })).toBe(true)
    expect(shouldRetryFetchError({ method: 'GET', status: 503, attempt: 3, maxRetries: 3 })).toBe(false)
    expect(shouldRetryFetchError({ method: 'GET', status: 404, attempt: 0, maxRetries: 3 })).toBe(false)
    expect(shouldRetryFetchError({ method: 'POST', status: 503, attempt: 0, maxRetries: 3 })).toBe(false)

    const abortErr = new Error('The operation was aborted')
    abortErr.name = 'AbortError'
    expect(isAbortError(abortErr)).toBe(true)
    expect(shouldRetryFetchError({ method: 'GET', status: 0, error: abortErr, attempt: 0, maxRetries: 3 })).toBe(false)
  })

  it('按 2^(n-1) 计算指数退避间隔，支持最大封顶、受控抖动与 Retry-After 响应头', () => {
    expect(calculateBackoffDelay(1, { baseDelayMs: 300, jitterRatio: 0 })).toBe(300)
    expect(calculateBackoffDelay(2, { baseDelayMs: 300, jitterRatio: 0 })).toBe(600)
    expect(calculateBackoffDelay(3, { baseDelayMs: 300, jitterRatio: 0 })).toBe(1200)
    expect(calculateBackoffDelay(10, { baseDelayMs: 300, maxDelayMs: 5000, jitterRatio: 0 })).toBe(5000)

    // 抖动边界检查（random=0 -> 0.8x，random=1 -> 1.2x）
    expect(calculateBackoffDelay(1, { baseDelayMs: 500, jitterRatio: 0.2, random: () => 0 })).toBe(400)
    expect(calculateBackoffDelay(1, { baseDelayMs: 500, jitterRatio: 0.2, random: () => 1 })).toBe(600)

    // Retry-After 秒数与上限保护
    expect(parseRetryAfterMs('2', 10_000)).toBe(2000)
    expect(parseRetryAfterMs('30', 10_000)).toBe(10_000)
    expect(calculateBackoffDelay(1, { baseDelayMs: 300, jitterRatio: 0, retryAfterMs: 1500 })).toBe(1500)
  })

  it('executeWithRetry 对幂等 GET 请求自动指数退避重试，中途恢复后直接返回成功结果', async () => {
    const delays: number[] = []
    let calls = 0

    const promise = executeWithRetry(
      { method: 'GET', baseDelayMs: 300, jitterRatio: 0 },
      {
        async execute() {
          calls += 1
          if (calls <= 2) {
            const err = Object.assign(new Error('Service Unavailable'), { status: 503 })
            throw err
          }
          return { ok: true, attempt: calls }
        },
        onRetry(info) {
          delays.push(info.delayMs)
        },
      },
    )

    // 首次失败 -> 等待 300ms -> 第 1 次重试失败 -> 等待 600ms -> 第 2 次重试成功
    await vi.advanceTimersByTimeAsync(300)
    expect(calls).toBe(2)

    await vi.advanceTimersByTimeAsync(600)
    const result = await promise
    expect(result).toEqual({ ok: true, attempt: 3 })
    expect(calls).toBe(3)
    expect(delays).toEqual([300, 600])
  })

  it('executeWithRetry 最多重试 3 次（共 4 次请求），耗尽后抛出最终错误', async () => {
    const delays: number[] = []
    let calls = 0

    const promise = executeWithRetry(
      { method: 'GET', baseDelayMs: 300, jitterRatio: 0 },
      {
        async execute() {
          calls += 1
          throw new Error(`network down #${calls}`)
        },
        onRetry(info) {
          delays.push(info.delayMs)
        },
      },
    )

    // 避免 fake timers 期间出现未捕获 rejection 告警
    const settled = promise.catch(err => err)

    await vi.advanceTimersByTimeAsync(300 + 600 + 1200)
    const finalError = await settled

    expect(finalError).toBeInstanceOf(Error)
    expect((finalError as Error).message).toBe('network down #4')
    expect(calls).toBe(4)
    expect(delays).toEqual([300, 600, 1200])
  })

  it('executeWithRetry 不重试非幂等 POST、确定性 401/404，并支持退避期间 AbortSignal 立即中断', async () => {
    let postCalls = 0
    await expect(
      executeWithRetry(
        { method: 'POST', baseDelayMs: 300, jitterRatio: 0 },
        {
          async execute() {
            postCalls += 1
            throw Object.assign(new Error('Gateway Timeout'), { status: 504 })
          },
        },
      ),
    ).rejects.toThrow('Gateway Timeout')
    expect(postCalls).toBe(1)

    let notFoundCalls = 0
    await expect(
      executeWithRetry(
        { method: 'GET', baseDelayMs: 300, jitterRatio: 0 },
        {
          async execute() {
            notFoundCalls += 1
            throw Object.assign(new Error('Not Found'), { status: 404 })
          },
        },
      ),
    ).rejects.toThrow('Not Found')
    expect(notFoundCalls).toBe(1)

    // 退避等待期间触发 AbortController.abort() 应立即拒绝
    const controller = new AbortController()
    let abortCalls = 0
    const abortPromise = executeWithRetry(
      { method: 'GET', baseDelayMs: 1000, jitterRatio: 0, signal: controller.signal },
      {
        async execute() {
          abortCalls += 1
          throw new Error('offline')
        },
      },
    )
    const abortSettled = abortPromise.catch(err => err)
    await vi.advanceTimersByTimeAsync(100)
    controller.abort()
    const abortError = await abortSettled
    expect((abortError as Error).name).toBe('AbortError')
    expect(abortCalls).toBe(1)
  })
})

describe('uni-app client requestInterceptor automatic retry with exponential backoff', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    resetClientApiInterceptorState()
    resetErrorNotificationState()
    delete (globalThis as Record<string, unknown>).uni
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  function installMockUniClient(responder: (args: Record<string, unknown>, callIndex: number) => void) {
    let interceptorHandler: { invoke?: (args: Record<string, unknown>) => Record<string, unknown> } | null = null
    const dispatchedArgs: Record<string, unknown>[] = []
    let callCount = 0

    const uniMock = {
      addInterceptor: vi.fn((_name: string, handler: { invoke?: (args: Record<string, unknown>) => Record<string, unknown> }) => {
        interceptorHandler = handler
      }),
      request: vi.fn((rawArgs: Record<string, unknown>) => {
        const cloned = { ...rawArgs }
        const processed = interceptorHandler?.invoke ? interceptorHandler.invoke(cloned) : cloned
        dispatchedArgs.push({ ...processed })
        callCount += 1
        responder(processed, callCount)
      }),
    }

    ;(globalThis as Record<string, unknown>).uni = uniMock
    requestInterceptor.install()
    configureClientApiInterceptor({ baseDelayMs: 300, jitterRatio: 0 })

    return { uniMock, dispatchedArgs }
  }

  it('C 端重试工具准确校验幂等方法、状态码与退避时间', () => {
    expect(isIdempotentHttpMethod('GET')).toBe(true)
    expect(isIdempotentHttpMethod('PUT')).toBe(true)
    expect(isIdempotentHttpMethod('DELETE')).toBe(true)
    expect(isIdempotentHttpMethod('POST')).toBe(false)
    expect(isRetryableHttpStatus(503)).toBe(true)
    expect(isRetryableHttpStatus(400)).toBe(false)
    expect(resolveClientMaxRetries('GET')).toBe(3)
    expect(resolveClientMaxRetries('POST')).toBe(0)
    expect(calculateClientBackoffDelay(1, { baseDelayMs: 300, jitterRatio: 0 })).toBe(300)
    expect(calculateClientBackoffDelay(2, { baseDelayMs: 300, jitterRatio: 0 })).toBe(600)
    expect(calculateClientBackoffDelay(3, { baseDelayMs: 300, jitterRatio: 0 })).toBe(1200)
  })

  it('GET 请求前 2 次网络超时、第 3 次成功：按 300ms / 600ms 退避恢复，且不弹错误 Toast', async () => {
    const toastSpy = vi.fn()
    registerErrorToastHandler(toastSpy)

    const { uniMock, dispatchedArgs } = installMockUniClient((args, callIndex) => {
      if (callIndex <= 2) {
        ;(args.fail as (err: unknown) => void)({ errMsg: 'request:fail timeout' })
        ;(args.complete as ((res: unknown) => void) | undefined)?.({ errMsg: 'request:fail timeout' })
      }
      else {
        const res = { statusCode: 200, data: { code: 200, data: { ok: true } } }
        ;(args.success as (res: Record<string, unknown>) => void)(res)
        ;(args.complete as ((res: unknown) => void) | undefined)?.(res)
      }
    })

    const onSuccess = vi.fn()
    const onFail = vi.fn()
    const onComplete = vi.fn()

    uniMock.request({
      url: 'https://example.com/api/client/talent/home',
      method: 'GET',
      success: onSuccess,
      fail: onFail,
      complete: onComplete,
    })

    // 初始失败后尚未回调用户，也未弹错误 Toast
    expect(uniMock.request).toHaveBeenCalledTimes(1)
    expect(onSuccess).not.toHaveBeenCalled()
    expect(onFail).not.toHaveBeenCalled()
    expect(onComplete).not.toHaveBeenCalled()
    expect(toastSpy).not.toHaveBeenCalled()

    // 299ms 时还未到第 1 次重试时间
    await vi.advanceTimersByTimeAsync(299)
    expect(uniMock.request).toHaveBeenCalledTimes(1)

    // 300ms 触发第 1 次重试（依然失败）
    await vi.advanceTimersByTimeAsync(1)
    expect(uniMock.request).toHaveBeenCalledTimes(2)
    expect(onSuccess).not.toHaveBeenCalled()
    expect(toastSpy).not.toHaveBeenCalled()

    // 600ms 触发第 2 次重试（成功）
    await vi.advanceTimersByTimeAsync(600)
    expect(uniMock.request).toHaveBeenCalledTimes(3)
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onFail).not.toHaveBeenCalled()
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(toastSpy).not.toHaveBeenCalled()

    // 确认内部控制字段不会透传给底层平台请求
    for (const dispatched of dispatchedArgs) {
      expect('__retryAttempt' in dispatched).toBe(false)
      expect('__retryParentId' in dispatched).toBe(false)
      expect('__retryMaxRetries' in dispatched).toBe(false)
      expect('retry' in dispatched).toBe(false)
      expect('hideErrorToast' in dispatched).toBe(false)
    }

    const metrics = getClientApiMetrics()
    expect(metrics.total).toBe(3)
    expect(metrics.failed).toBe(2)
  })

  it('GET 持续失败时最多自动重试 3 次（共 4 次请求），耗尽后仅触发一次 Wot UI 错误 Toast', async () => {
    const toastSpy = vi.fn()
    registerErrorToastHandler(toastSpy)

    const { uniMock } = installMockUniClient((args) => {
      ;(args.fail as (err: unknown) => void)({ errMsg: 'request:fail timeout' })
    })

    const onFail = vi.fn()
    uniMock.request({
      url: 'https://example.com/api/client/talent/report',
      method: 'GET',
      fail: onFail,
    })

    expect(uniMock.request).toHaveBeenCalledTimes(1)
    expect(toastSpy).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(300)
    expect(uniMock.request).toHaveBeenCalledTimes(2)
    expect(toastSpy).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(600)
    expect(uniMock.request).toHaveBeenCalledTimes(3)
    expect(toastSpy).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1200)
    expect(uniMock.request).toHaveBeenCalledTimes(4)
    expect(onFail).toHaveBeenCalledTimes(1)
    expect(toastSpy).toHaveBeenCalledTimes(1)
    expect(toastSpy).toHaveBeenLastCalledWith(expect.objectContaining({
      kind: 'timeout',
      message: '请求超时，请检查网络后重试',
    }))

    // 不再产生额外第 5 次请求
    await vi.advanceTimersByTimeAsync(5000)
    expect(uniMock.request).toHaveBeenCalledTimes(4)
  })

  it('GET 遇到临时 503 自动退避重试，而 POST / 404 / retry:false 均不自动重试', async () => {
    const toastSpy = vi.fn()
    registerErrorToastHandler(toastSpy)

    // 1. GET 503 -> 重试后第 2 次返回 200
    const { uniMock } = installMockUniClient((args, callIndex) => {
      if (args.url === 'https://example.com/api/client/talent/flaky') {
        if (callIndex === 1) {
          ;(args.success as (res: Record<string, unknown>) => void)({ statusCode: 503, data: { code: 503, message: '繁忙' } })
        }
        else {
          ;(args.success as (res: Record<string, unknown>) => void)({ statusCode: 200, data: { code: 200, data: { ok: true } } })
        }
        return
      }
      if (args.url === 'https://example.com/api/client/talent/not-found') {
        ;(args.success as (res: Record<string, unknown>) => void)({ statusCode: 404, data: { code: 404, message: '不存在' } })
        return
      }
      ;(args.fail as (err: unknown) => void)({ errMsg: 'request:fail' })
    })

    const flakySuccess = vi.fn()
    uniMock.request({
      url: 'https://example.com/api/client/talent/flaky',
      method: 'GET',
      success: flakySuccess,
    })
    expect(flakySuccess).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(300)
    expect(flakySuccess).toHaveBeenCalledTimes(1)
    expect(toastSpy).not.toHaveBeenCalled()

    // 2. POST 网络失败不重试，立即弹 Toast
    const postFail = vi.fn()
    uniMock.request({
      url: 'https://example.com/api/client/talent/selections',
      method: 'POST',
      fail: postFail,
    })
    expect(postFail).toHaveBeenCalledTimes(1)
    expect(toastSpy).toHaveBeenCalledTimes(1)

    // 3. GET 404 不重试
    const notFoundSuccess = vi.fn()
    uniMock.request({
      url: 'https://example.com/api/client/talent/not-found',
      method: 'GET',
      success: notFoundSuccess,
    })
    expect(notFoundSuccess).toHaveBeenCalledTimes(1)

    // 4. GET retry: false 不重试
    const noRetryFail = vi.fn()
    uniMock.request({
      url: 'https://example.com/api/client/talent/no-retry',
      method: 'GET',
      retry: false,
      fail: noRetryFail,
    })
    expect(noRetryFail).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(5000)
    // 总派发数 = flaky(2) + post(1) + not-found(1) + no-retry(1) = 5
    expect(uniMock.request).toHaveBeenCalledTimes(5)
  })
})
