<!--
/**
 * @description 全局错误兜底页 — 捕获未知路由(404)与运行时错误(500)，避免落到 Nuxt 空白默认页。
 *   典型场景：平台超管点到「聚合支付」等指向独立部署的菜单时给出可理解页面+返回入口。
 * @file app/error.vue
 */
-->
<script setup lang="ts">
import { darkTheme, NButton, NConfigProvider, NResult, zhCN } from 'naive-ui'
import type { NuxtError } from '#app'
import { buildNaiveOverrides } from '~/config/naive-theme'

const props = defineProps<{ error: NuxtError }>()
const { isDark, currentThemeId, primaryColor } = useTheme()
const naiveOverrides = computed(() =>
  buildNaiveOverrides(currentThemeId.value, isDark.value, primaryColor.value),
)

const is404 = computed(() => props.error?.statusCode === 404)
const title = computed(() => (is404.value ? '页面不存在' : '出错了'))
const desc = computed(() =>
  is404.value
    ? '该地址没有对应页面，可能是入口已调整或该功能属于独立部署模块。'
    : (props.error?.statusMessage || '发生了未预期的错误，请返回后重试。'),
)

function goHome() {
  clearError({ redirect: '/admin/talent/dashboard' })
}
</script>

<template>
  <NConfigProvider :theme="isDark ? darkTheme : null" :theme-overrides="naiveOverrides" :locale="zhCN">
    <main class="error-page">
      <div class="error-card">
        <NResult :status="is404 ? '404' : 'error'" :title="title" :description="desc">
          <template #footer>
            <NButton type="primary" size="large" @click="goHome">
              返回工作台
            </NButton>
          </template>
        </NResult>
      </div>
    </main>
  </NConfigProvider>
</template>

<style scoped>
.error-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--background);
  color: var(--foreground);
}

.error-card {
  width: 100%;
  max-width: 460px;
  padding: 36px 28px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--card);
  box-shadow: 0 12px 32px color-mix(in srgb, var(--foreground) 6%, transparent);
}
</style>
