/**
 * @description 管理后台共享分页组件 — 中文标签，每页条数选择，统一分页交互
 * @file app/components/admin/AdminPagination.vue
 *
 * @prop total — 总记录数
 * @prop page — 当前页码（1-based）
 * @prop pageSize — 每页条数
 * @prop pageSizeOptions — 每页条数选项
 * @emits update:page — 页码变更时触发
 * @emits update:pageSize — 每页条数变更时触发
 */
<script setup lang="ts">
import { NPagination, NSelect } from 'naive-ui'

defineProps<{
  total: number
  page: number
  pageSize: number
  pageSizeOptions?: number[]
}>()

const emit = defineEmits<{
  'update:page': [value: number]
  'update:pageSize': [value: number]
}>()
</script>

<template>
  <div v-if="total > 0" class="flex items-center gap-3">
    <span class="text-sm whitespace-nowrap text-muted-foreground">共 {{ total }} 条</span>
    <div class="flex items-center gap-1">
      <span class="text-sm whitespace-nowrap text-muted-foreground">每页</span>
      <n-select
        :value="String(pageSize)"
        :options="(pageSizeOptions || [10, 20, 50, 100]).map(v => ({ label: String(v), value: String(v) }))"
        size="small"
        style="width:80px;"
        @update:value="emit('update:pageSize', Number($event))"
      />
      <span class="text-sm whitespace-nowrap text-muted-foreground">条</span>
    </div>
    <n-pagination
      :page="page"
      :page-size="pageSize"
      :item-count="total"
      @update:page="emit('update:page', $event)"
    />
  </div>
</template>
