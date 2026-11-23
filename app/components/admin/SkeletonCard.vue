/**
 * @description 骨架屏卡片 — 用于 Dashboard 统计卡片加载状态
 * @file app/components/admin/SkeletonCard.vue
 */
<script setup lang="ts">
import { NSkeleton } from 'naive-ui'

defineProps<{ rows?: number }>()
</script>

<template>
  <div class="space-y-3 p-4">
    <n-skeleton v-for="i in (rows || 3)" :key="i" :width="'100%'" :class="i === 1 ? 'h-4' : 'h-5'" />
  </div>
</template>
