/**
 * @description 后台登录认证卡片，跟随站点主题配色。
 * @file app/components/AuthCard.vue
 */
<script setup lang="ts">
import { NCard } from 'naive-ui'

const { logoText, logoIcon, loadBrand } = useAdminBrand()

onMounted(() => {
  loadBrand()
})

defineProps<{
  title: string
  subtitle: string
  switchText?: string
  switchLink?: string
  switchLinkText?: string
}>()
</script>

<template>
  <div class="auth-wrapper relative flex min-h-screen items-center justify-center overflow-hidden px-4">
    <div class="pointer-events-none absolute -right-37.5 -top-50 h-125 w-125 rounded-full bg-gradient-to-br from-primary/6 to-transparent" />
    <div class="pointer-events-none absolute -bottom-45 -left-30 h-100 w-100 rounded-full bg-gradient-to-br from-primary/8 to-transparent" />
    <n-card class="auth-card relative z-10" style="width:420px;max-width:90vw;" :bordered="false">
      <div class="text-center mb-6">
        <div class="mb-4 flex justify-center">
          <div class="auth-logo flex h-13 w-13 items-center justify-center rounded-xl text-[22px] font-bold shadow-lg">
            {{ logoIcon }}
          </div>
        </div>
        <div class="auth-site-name mb-1 text-sm font-semibold tracking-wide">{{ logoText }}</div>
        <div class="text-2xl font-bold text-foreground">{{ title }}</div>
        <div class="text-sm mt-1 text-muted-foreground">{{ subtitle }}</div>
      </div>
      <div class="px-2">
        <slot />
      </div>
      <div v-if="switchText && switchLink && switchLinkText" class="text-center text-sm mt-6 text-muted-foreground">
        {{ switchText }}<NuxtLink :to="switchLink" class="auth-link ml-1 font-medium hover:underline">{{ switchLinkText }}</NuxtLink>
      </div>
    </n-card>
  </div>
</template>

<style lang="scss" scoped>
.auth-wrapper {
  background: var(--background);
}
.auth-card {
  background: var(--card) !important;
}
.auth-logo {
  background: var(--primary);
  color: var(--primary-foreground);
}
.auth-site-name {
  color: var(--primary);
}
.auth-link {
  color: var(--primary);
}
</style>
