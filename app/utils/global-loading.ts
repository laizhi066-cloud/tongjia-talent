/**
 * @description 全局网络加载状态机：支持并发引用计数、防闪烁延迟展示、最短驻留平滑退场、超时防死锁与后台静默接口过滤。
 * @file app/utils/global-loading.ts
 */

export interface GlobalLoadingSnapshot {
  activeCount: number
  visible: boolean
  message: string
}

export interface GlobalLoadingManagerOptions {
  /** 仅当请求持续超过该阈值才展示遮罩，避免快接口闪烁（默认 300ms） */
  showDelayMs?: number
  /** 一旦展示后至少保留的时长，避免刚出现就瞬间消失造成视觉抖动（默认 240ms） */
  minVisibleMs?: number
  /** 单个请求令牌的最长挂起保护时间，防止异常泄漏导致永久遮罩（默认 30000ms） */
  maxDurationMs?: number
  /** 默认提示文案 */
  defaultMessage?: string
  /** 可注入时钟（便于单元测试） */
  now?: () => number
}

export interface LoadingTrackOptions {
  skipGlobalLoading?: boolean
  silentLoading?: boolean
}

const DEFAULT_SHOW_DELAY_MS = 300
const DEFAULT_MIN_VISIBLE_MS = 240
const DEFAULT_MAX_DURATION_MS = 30_000
const DEFAULT_MESSAGE = '正在加载，请稍候...'

/** 后台静默接口与内部静态资源不触发全局遮罩，避免打断正常阅读与操作。 */
const SILENT_LOADING_PATHS = [
  '/api/admin/monitor/online/heartbeat',
  '/api/client/client-error',
  '/api/admin/theme',
  '/api/client/config/site',
  '/_nuxt/',
  '/__nuxt_error',
]

/** 判断该请求是否应纳入全局长耗时加载遮罩。 */
export function shouldTrackGlobalLoading(url: string, options: LoadingTrackOptions = {}): boolean {
  if (!url)
    return false
  if (options.skipGlobalLoading === true || options.silentLoading === true)
    return false
  if (SILENT_LOADING_PATHS.some((prefix) => url.includes(prefix)))
    return false
  return url.startsWith('/api/') || url.includes('/api/') || /^https?:\/\//i.test(url)
}

/** 创建可订阅的全局加载状态管理器。 */
export function createLoadingManager(options: GlobalLoadingManagerOptions = {}) {
  const showDelayMs = options.showDelayMs ?? DEFAULT_SHOW_DELAY_MS
  const minVisibleMs = options.minVisibleMs ?? DEFAULT_MIN_VISIBLE_MS
  const maxDurationMs = options.maxDurationMs ?? DEFAULT_MAX_DURATION_MS
  const defaultMessage = options.defaultMessage ?? DEFAULT_MESSAGE
  const now = options.now ?? (() => Date.now())

  let tokenSeq = 0
  let visible = false
  let shownAt = 0
  let showTimer: ReturnType<typeof setTimeout> | null = null
  let hideTimer: ReturnType<typeof setTimeout> | null = null

  // 保存所有进行中请求令牌及其提示语与超时保护定时器
  const activeTokens = new Map<string, { message: string, guardTimer: ReturnType<typeof setTimeout> | null }>()
  const listeners = new Set<(snapshot: GlobalLoadingSnapshot) => void>()

  function currentMessage(): string {
    let latest = defaultMessage
    for (const item of activeTokens.values()) {
      if (item.message)
        latest = item.message
    }
    return latest
  }

  function getSnapshot(): GlobalLoadingSnapshot {
    return {
      activeCount: activeTokens.size,
      visible,
      message: currentMessage(),
    }
  }

  function notify(): void {
    const snap = getSnapshot()
    for (const listener of listeners) {
      listener(snap)
    }
  }

  function clearShowTimer(): void {
    if (showTimer !== null) {
      clearTimeout(showTimer)
      showTimer = null
    }
  }

  function clearHideTimer(): void {
    if (hideTimer !== null) {
      clearTimeout(hideTimer)
      hideTimer = null
    }
  }

  function start(message?: string): string {
    tokenSeq += 1
    const token = `LOAD-${tokenSeq}`
    const guardTimer = maxDurationMs > 0
      ? setTimeout(() => {
          finish(token)
        }, maxDurationMs)
      : null

    activeTokens.set(token, {
      message: typeof message === 'string' && message.trim() ? message.trim() : defaultMessage,
      guardTimer,
    })

    // 若遮罩正准备退场但新请求到达，取消退场保持平滑
    clearHideTimer()

    if (!visible && showTimer === null) {
      if (showDelayMs <= 0) {
        visible = true
        shownAt = now()
      }
      else {
        showTimer = setTimeout(() => {
          showTimer = null
          if (activeTokens.size > 0 && !visible) {
            visible = true
            shownAt = now()
            notify()
          }
        }, showDelayMs)
      }
    }

    notify()
    return token
  }

  function finish(token: string): void {
    const record = activeTokens.get(token)
    if (!record)
      return
    if (record.guardTimer !== null)
      clearTimeout(record.guardTimer)
    activeTokens.delete(token)

    if (activeTokens.size === 0) {
      clearShowTimer()
      if (visible) {
        const elapsed = now() - shownAt
        const remaining = minVisibleMs - elapsed
        if (remaining <= 0) {
          visible = false
          shownAt = 0
        }
        else if (hideTimer === null) {
          hideTimer = setTimeout(() => {
            hideTimer = null
            if (activeTokens.size === 0 && visible) {
              visible = false
              shownAt = 0
              notify()
            }
          }, remaining)
        }
      }
    }

    notify()
  }

  function reset(): void {
    clearShowTimer()
    clearHideTimer()
    for (const record of activeTokens.values()) {
      if (record.guardTimer !== null)
        clearTimeout(record.guardTimer)
    }
    activeTokens.clear()
    visible = false
    shownAt = 0
    notify()
  }

  function subscribe(listener: (snapshot: GlobalLoadingSnapshot) => void): () => void {
    listeners.add(listener)
    listener(getSnapshot())
    return () => {
      listeners.delete(listener)
    }
  }

  function dispose(): void {
    reset()
    listeners.clear()
  }

  return {
    start,
    finish,
    reset,
    getSnapshot,
    subscribe,
    dispose,
  }
}
