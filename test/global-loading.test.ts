/**
 * @description 全局加载状态管理器单元测试：防闪烁延迟、最短驻留、并发计数、幂等释放、超时防死锁与静默接口过滤。
 * @file test/global-loading.test.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createLoadingManager, shouldTrackGlobalLoading } from '../app/utils/global-loading'

describe('shouldTrackGlobalLoading', () => {
  it('默认追踪业务 API 请求，排除静默接口、内部路径与显式跳过选项', () => {
    expect(shouldTrackGlobalLoading('/api/admin/talent/members')).toBe(true)
    expect(shouldTrackGlobalLoading('/api/public/admin-login')).toBe(true)
    expect(shouldTrackGlobalLoading('https://api.example.com/v1/export')).toBe(true)

    expect(shouldTrackGlobalLoading('/api/admin/monitor/online/heartbeat')).toBe(false)
    expect(shouldTrackGlobalLoading('/api/client/client-error')).toBe(false)
    expect(shouldTrackGlobalLoading('/api/admin/theme')).toBe(false)
    expect(shouldTrackGlobalLoading('/api/client/config/site')).toBe(false)
    expect(shouldTrackGlobalLoading('/_nuxt/entry.js')).toBe(false)
    expect(shouldTrackGlobalLoading('/api/admin/users', { skipGlobalLoading: true })).toBe(false)
    expect(shouldTrackGlobalLoading('/api/admin/users', { silentLoading: true })).toBe(false)
  })
})

describe('createLoadingManager', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-23T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('快请求在防闪烁阈值内完成时绝不显示遮罩', () => {
    const manager = createLoadingManager({ showDelayMs: 300, minVisibleMs: 240 })
    const token = manager.start()

    vi.advanceTimersByTime(250)
    expect(manager.getSnapshot().visible).toBe(false)
    expect(manager.getSnapshot().activeCount).toBe(1)

    manager.finish(token)
    vi.advanceTimersByTime(500)
    expect(manager.getSnapshot().visible).toBe(false)
    expect(manager.getSnapshot().activeCount).toBe(0)
    manager.dispose()
  })

  it('长耗时请求超过阈值自动显示遮罩，并遵守最短展示时间防止瞬间闪烁', () => {
    const manager = createLoadingManager({ showDelayMs: 300, minVisibleMs: 240 })
    const token = manager.start('正在同步报告...')

    vi.advanceTimersByTime(299)
    expect(manager.getSnapshot().visible).toBe(false)

    vi.advanceTimersByTime(1)
    expect(manager.getSnapshot().visible).toBe(true)
    expect(manager.getSnapshot().message).toBe('正在同步报告...')

    // 展示 40ms 后请求完成：应再保留 200ms 再隐藏
    vi.advanceTimersByTime(40)
    manager.finish(token)
    expect(manager.getSnapshot().activeCount).toBe(0)
    expect(manager.getSnapshot().visible).toBe(true)

    vi.advanceTimersByTime(199)
    expect(manager.getSnapshot().visible).toBe(true)

    vi.advanceTimersByTime(1)
    expect(manager.getSnapshot().visible).toBe(false)
    manager.dispose()
  })

  it('支持并发请求计数与幂等 finish，直到全部请求结束才隐藏', () => {
    const manager = createLoadingManager({ showDelayMs: 200, minVisibleMs: 0 })
    const t1 = manager.start()
    const t2 = manager.start()

    vi.advanceTimersByTime(200)
    expect(manager.getSnapshot().visible).toBe(true)
    expect(manager.getSnapshot().activeCount).toBe(2)

    // 重复释放 t1 不会影响 t2
    manager.finish(t1)
    manager.finish(t1)
    expect(manager.getSnapshot().activeCount).toBe(1)
    expect(manager.getSnapshot().visible).toBe(true)

    manager.finish(t2)
    expect(manager.getSnapshot().activeCount).toBe(0)
    expect(manager.getSnapshot().visible).toBe(false)
    manager.dispose()
  })

  it('退场缓冲期间若有新请求到达则取消退场保持平滑', () => {
    const manager = createLoadingManager({ showDelayMs: 200, minVisibleMs: 300 })
    const t1 = manager.start()
    vi.advanceTimersByTime(250)
    expect(manager.getSnapshot().visible).toBe(true)

    manager.finish(t1)
    vi.advanceTimersByTime(100)
    expect(manager.getSnapshot().visible).toBe(true)

    const t2 = manager.start()
    vi.advanceTimersByTime(400)
    expect(manager.getSnapshot().visible).toBe(true)
    expect(manager.getSnapshot().activeCount).toBe(1)

    manager.finish(t2)
    expect(manager.getSnapshot().visible).toBe(false)
    manager.dispose()
  })

  it('单请求超时保护自动释放泄漏令牌，避免界面永久卡死在遮罩态', () => {
    const manager = createLoadingManager({ showDelayMs: 200, minVisibleMs: 0, maxDurationMs: 5000 })
    manager.start()

    vi.advanceTimersByTime(200)
    expect(manager.getSnapshot().visible).toBe(true)

    vi.advanceTimersByTime(4800)
    expect(manager.getSnapshot().activeCount).toBe(0)
    expect(manager.getSnapshot().visible).toBe(false)
    manager.dispose()
  })
})
