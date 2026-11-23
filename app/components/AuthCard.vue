<!--
/**
 * @description 后台登录认证卡片，跟随站点主题配色。
 * @file app/components/AuthCard.vue
 */
-->
<script setup lang="ts">
import { NCard } from 'naive-ui'

const { logoText, logoIcon, logoMark, loadBrand } = useAdminBrand()
const logoMarkError = ref(false)

watch(logoMark, () => {
  logoMarkError.value = false
})

onMounted(() => {
  void loadBrand()
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
  <div class="auth-wrapper relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
    <div class="pointer-events-none absolute -right-37.5 -top-50 h-125 w-125 rounded-full bg-gradient-to-br from-primary/6 to-transparent" />
    <div class="pointer-events-none absolute -bottom-45 -left-30 h-100 w-100 rounded-full bg-gradient-to-br from-primary/8 to-transparent" />
    <n-card class="auth-card relative z-10" :bordered="false">
      <div class="mb-6 text-center">
        <div class="mb-4 flex justify-center">
          <img
            v-if="logoMark && !logoMarkError"
            :src="logoMark"
            :alt="logoText"
            class="auth-logo-image"
            width="52"
            height="52"
            @error="logoMarkError = true"
          >
          <div v-else class="auth-logo flex h-13 w-13 items-center justify-center rounded-xl text-[22px] font-bold shadow-lg">
            {{ logoIcon }}
          </div>
        </div>
        <div class="auth-site-name mb-1 text-sm font-semibold tracking-wide">{{ logoText }}</div>
        <h1 class="m-0 text-2xl font-bold text-foreground">{{ title }}</h1>
        <p class="mt-1 mb-0 text-sm text-muted-foreground">{{ subtitle }}</p>
      </div>
      <div class="px-1 sm:px-2">
        <slot />
      </div>
      <div v-if="switchText && switchLink && switchLinkText" class="mt-6 text-center text-sm text-muted-foreground">
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
  width: 420px;
  max-width: 92vw;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--card) !important;
  box-shadow: 0 12px 32px color-mix(in srgb, var(--foreground) 6%, transparent);
}
.auth-logo-image {
  display: block;
  width: 52px;
  height: 52px;
  border-radius: 12px;
  object-fit: contain;
  box-shadow: 0 8px 20px color-mix(in srgb, var(--primary) 22%, transparent);
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
