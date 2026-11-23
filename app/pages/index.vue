/**
 * @description 根路径中转页 — 未登录跳登录，已登录跳天赋工作台
 * @file app/pages/index.vue
 */
<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

// 等待页面挂载后再导航：SSR 阶段 auth 中间件已经稳定地重定向到登录页，
// 不在 setup 中二次跳转可避免根页的服务端 HTML 与客户端 VDOM 不一致。
onMounted(() => {
  void navigateTo('/admin/talent/dashboard', { replace: true })
})
</script>

<template>
  <div />
</template>
