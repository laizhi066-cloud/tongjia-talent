/**
 * @description 空状态组件 — 带操作按钮的空白提示
 * @file app/components/admin/EmptyState.vue
 */
<script setup lang="ts">
import { NButton, NEmpty } from 'naive-ui'

defineProps<{
  description?: string
  actionText?: string
}>()
const emit = defineEmits<{ action: [] }>()
</script>

<template>
  <div class="empty-state">
    <n-empty :description="description || '暂无数据'">
      <template #extra>
        <n-button v-if="actionText" size="small" @click="emit('action')">
          {{ actionText }}
        </n-button>
      </template>
    </n-empty>
  </div>
</template>

<style lang="scss" scoped>
.empty-state {
  padding: 48px 0;
  display: flex;
  justify-content: center;
}
</style>
