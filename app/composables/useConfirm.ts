/**
 * @description 确认对话框 composable — 配合 AppConfirm.vue 使用 AlertDialog 样式
 * 导出全局 confirmEvent 状态，供 AppConfirm 组件消费
 * @file app/composables/useConfirm.ts
 */
import { ref } from 'vue'

export interface ConfirmOptions {
  title?: string
  content: string
  confirmText?: string
  cancelText?: string
}

interface ConfirmEvent {
  visible: boolean
  options: ConfirmOptions
  onConfirm: () => void
  onCancel: () => void
}

/** 全局确认对话框状态 — AppConfirm.vue 读取此状态渲染 AlertDialog */
export const confirmEvent = ref<ConfirmEvent>({
  visible: false,
  options: { content: '' },
  onConfirm: () => {},
  onCancel: () => {},
})

export function useConfirm() {
  function confirm(options: ConfirmOptions): Promise<boolean> {
    if (confirmEvent.value.visible) {
      confirmEvent.value.onCancel()
    }
    return new Promise((resolve) => {
      let settled = false
      const settle = (value: boolean) => {
        if (settled) return
        settled = true
        resolve(value)
      }
      confirmEvent.value = {
        visible: true,
        options: { title: '确认操作', confirmText: '确认', cancelText: '取消', ...options },
        onConfirm: () => settle(true),
        onCancel: () => settle(false),
      }
    })
  }

  return { confirm }
}
