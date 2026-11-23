<!--
/**
 * @description 把 NMessageProvider 注入的 message 实例挂到 window.$message，
 * 供非组件上下文（useApi 成功提示 / auth-interceptor 错误提示 / useExport）调用。
 * 必须渲染在 <n-message-provider> 子树内，否则 useMessage() 取不到 provider 上下文。
 * @file app/components/NaiveMessageBridge.vue
 */
-->
<script setup lang="ts">
import { useMessage } from 'naive-ui'

const message = useMessage()
if (import.meta.client) {
  ;(window as any).$message = message
}
onBeforeUnmount(() => {
  if (import.meta.client && (window as any).$message === message) {
    (window as any).$message = undefined
  }
})
</script>

<template>
  <span class="hidden" aria-hidden="true" />
</template>
