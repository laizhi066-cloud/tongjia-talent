<!--
/**
 * @description 列表页搜索操作按钮组 — 统一「搜索 / 重置 / 导出」样式(带图标)
 * @file app/components/AdminSearchActions.vue
 *
 * 放进 AdminListPage 的 #searchActions 插槽；导出按钮通过 exportable 控制显隐，
 * 额外按钮可塞进默认插槽。用法：AdminSearchActions exportable @search @reset @export。
 */
-->
<script setup lang="ts">
import { NButton, NIcon } from 'naive-ui'
import { SearchOutline, RefreshOutline, DownloadOutline } from '@vicons/ionicons5'

withDefaults(defineProps<{ exportable?: boolean }>(), { exportable: false })

const emit = defineEmits<{
  search: []
  reset: []
  export: []
}>()
</script>

<template>
  <NButton type="primary" size="small" @click="emit('search')">
    <template #icon>
      <NIcon :component="SearchOutline" />
    </template>
    搜索
  </NButton>
  <NButton secondary size="small" @click="emit('reset')">
    <template #icon>
      <NIcon :component="RefreshOutline" />
    </template>
    重置
  </NButton>
  <NButton v-if="exportable" secondary size="small" @click="emit('export')">
    <template #icon>
      <NIcon :component="DownloadOutline" />
    </template>
    导出
  </NButton>
  <slot />
</template>
