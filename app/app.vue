<!--
/**
 * @description 应用根节点，承载路由布局和全局确认对话框。
 * @file app/app.vue
 */
-->
<script setup lang="ts">
// 主题由 SSR 插件和客户端缓存共同恢复，避免首屏闪烁。
</script>

<template>
  <AppErrorBoundary>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </AppErrorBoundary>
  <AppGlobalLoading />
  <AppConfirm />
</template>
