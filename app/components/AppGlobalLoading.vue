<!--
/**
 * @description 全局网络加载遮罩组件 — 当长耗时请求超过防闪烁阈值时自动展示主题感知的加载指示器。
 * @file app/components/AppGlobalLoading.vue
 */
-->
<script setup lang="ts">
import { darkTheme, NConfigProvider, NSpin, zhCN } from 'naive-ui'
import { computed } from 'vue'
import { buildNaiveOverrides } from '~/config/naive-theme'

const { visible, activeCount, message } = useGlobalLoading()
const { isDark, currentThemeId, primaryColor } = useTheme()
const naiveOverrides = computed(() =>
  buildNaiveOverrides(currentThemeId.value, isDark.value, primaryColor.value),
)
</script>

<template>
  <ClientOnly>
    <NConfigProvider
      :theme="isDark ? darkTheme : null"
      :theme-overrides="naiveOverrides"
      :locale="zhCN"
    >
      <Transition name="global-loading-fade">
        <div
          v-if="visible"
          class="global-loading-overlay"
          role="status"
          aria-live="polite"
          aria-busy="true"
          data-testid="global-loading-overlay"
        >
          <div class="global-loading-card">
            <NSpin size="medium" />
            <div class="global-loading-copy">
              <div class="global-loading-message">{{ message }}</div>
              <div v-if="activeCount > 1" class="global-loading-sub">
                正在处理 {{ activeCount }} 项请求
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </NConfigProvider>
  </ClientOnly>
</template>

<style scoped>
.global-loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 2500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: color-mix(in srgb, var(--background) 58%, transparent);
  backdrop-filter: blur(3px);
}

.global-loading-card {
  display: flex;
  align-items: center;
  gap: 14px;
  max-width: min(340px, calc(100vw - 32px));
  padding: 16px 22px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--card);
  color: var(--foreground);
  box-shadow: 0 14px 34px color-mix(in srgb, var(--foreground) 12%, transparent);
}

.global-loading-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.global-loading-message {
  color: var(--foreground);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}

.global-loading-sub {
  color: var(--muted-foreground);
  font-size: 12px;
  line-height: 1.4;
  font-variant-numeric: tabular-nums;
}

.global-loading-fade-enter-active,
.global-loading-fade-leave-active {
  transition: opacity 180ms ease;
}

.global-loading-fade-enter-active .global-loading-card,
.global-loading-fade-leave-active .global-loading-card {
  transition: transform 180ms ease;
}

.global-loading-fade-enter-from,
.global-loading-fade-leave-to {
  opacity: 0;
}

.global-loading-fade-enter-from .global-loading-card,
.global-loading-fade-leave-to .global-loading-card {
  transform: scale(0.97);
}
</style>
