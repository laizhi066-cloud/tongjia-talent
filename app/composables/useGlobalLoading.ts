/**
 * @description 全局网络加载状态 Composable — 与 API 拦截器共享单例状态，供遮罩组件与业务异步流程使用。
 * @file app/composables/useGlobalLoading.ts
 */
import { readonly, ref } from 'vue'
import { createLoadingManager } from '~/utils/global-loading'

const sharedManager = createLoadingManager({
  showDelayMs: 300,
  minVisibleMs: 240,
  maxDurationMs: 30_000,
})

const visibleState = ref(false)
const activeCountState = ref(0)
const messageState = ref('正在加载，请稍候...')

sharedManager.subscribe((snapshot) => {
  visibleState.value = snapshot.visible
  activeCountState.value = snapshot.activeCount
  messageState.value = snapshot.message
})

export function useGlobalLoading() {
  function start(message?: string): string {
    return sharedManager.start(message)
  }

  function finish(token: string): void {
    sharedManager.finish(token)
  }

  async function track<T>(task: Promise<T> | (() => Promise<T>), message?: string): Promise<T> {
    const token = sharedManager.start(message)
    try {
      return await (typeof task === 'function' ? task() : task)
    }
    finally {
      sharedManager.finish(token)
    }
  }

  function reset(): void {
    sharedManager.reset()
  }

  return {
    visible: readonly(visibleState),
    activeCount: readonly(activeCountState),
    message: readonly(messageState),
    start,
    finish,
    track,
    reset,
  }
}
