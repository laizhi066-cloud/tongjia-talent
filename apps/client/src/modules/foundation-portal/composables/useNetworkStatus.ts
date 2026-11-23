/**
 * @description 网络状态：断网时顶部提示，恢复后按需触发一次自动重试（防抖 1s）。
 *   仅使用 `uni.onNetworkStatusChange`，H5 与小程序共用，不依赖 DOM。
 * @file src/modules/foundation-portal/composables/useNetworkStatus.ts
 */
import { onHide, onUnload } from '@dcloudio/uni-app'
import { onMounted, ref } from 'vue'

/** 恢复网络的自动重试防抖间隔。 */
const RETRY_DEBOUNCE_MS = 1_000

type NetworkListener = (result: { isConnected: boolean }) => void

/** 监听网络状态并提供一次性恢复重试。 */
export function useNetworkStatus(onRetry?: () => void) {
  const offline = ref(false)
  let lastRetryAt = 0
  let listening = false
  let handler: NetworkListener | undefined

  /** 查询一次当前网络类型，作为首屏兜底。 */
  function readInitialStatus(): void {
    uni.getNetworkType({
      success: (result) => {
        offline.value = result.networkType === 'none'
      },
      fail: () => {
        offline.value = false
      },
    })
  }

  /** 启动监听；重复调用不会重复注册。 */
  function start(): void {
    if (listening)
      return
    listening = true
    handler = (result) => {
      const wasOffline = offline.value
      offline.value = !result.isConnected
      if (!offline.value && wasOffline && onRetry) {
        const now = Date.now()
        if (now - lastRetryAt < RETRY_DEBOUNCE_MS)
          return
        lastRetryAt = now
        onRetry()
      }
    }
    uni.onNetworkStatusChange(handler)
  }

  /** 停止监听并重置状态。 */
  function stop(): void {
    if (!listening)
      return
    listening = false
    if (handler)
      uni.offNetworkStatusChange?.(handler)
    handler = undefined
  }

  onMounted(() => {
    readInitialStatus()
    start()
  })
  onHide(stop)
  onUnload(stop)

  return { offline }
}
