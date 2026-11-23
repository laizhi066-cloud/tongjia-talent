<!--
/**
 * @description 默认布局，用于后台登录页面的主题与消息容器。
 * @file app/layouts/default.vue
 */
-->
<script setup lang="ts">
import { darkTheme, NConfigProvider, NMessageProvider, zhCN } from 'naive-ui'
import { buildNaiveOverrides } from '~/config/naive-theme'

const { isDark, currentThemeId, primaryColor } = useTheme()
const naiveOverrides = ref(buildNaiveOverrides(currentThemeId.value, isDark.value, primaryColor.value))

watch([isDark, currentThemeId, primaryColor], () => {
  naiveOverrides.value = buildNaiveOverrides(currentThemeId.value, isDark.value, primaryColor.value)
})
</script>

<template>
  <NConfigProvider :theme="isDark ? darkTheme : null" :theme-overrides="naiveOverrides" :locale="zhCN">
    <NMessageProvider>
      <NaiveMessageBridge />
      <div class="default-layout"><slot /></div>
    </NMessageProvider>
  </NConfigProvider>
</template>

<style lang="scss" scoped>
.default-layout { min-height: 100vh; background: var(--background); }
</style>
