/**
 * @description 字典数据 Badge 渲染组件 — 根据 listClass/backgroundColor/color 展示样式
 * @file app/components/admin/DictBadge.vue
 */
<script setup lang="ts">
import { NTag } from 'naive-ui'
import { resolveDictBadgeType } from '~/utils/dict-badge-style'

const props = withDefaults(defineProps<{
  dictLabel?: string
  dictType?: string
  dictValue?: string | number
  listClass?: string
  icon?: string
  backgroundColor?: string
  color?: string
}>(), {
  dictLabel: '',
  dictType: '',
  dictValue: '',
  listClass: '',
  icon: '',
  backgroundColor: '',
  color: '',
})

const type = computed(() => {
  return resolveDictBadgeType(props.dictType, props.dictValue, props.listClass)
})

const hasCustomStyle = computed(() => !!props.backgroundColor || !!props.color)
</script>

<template>
  <n-tag
    v-bind="hasCustomStyle ? {} : { type }"
    :style="hasCustomStyle ? {
      backgroundColor: backgroundColor || undefined,
      color: color || undefined,
      borderColor: 'transparent',
    } : undefined"
    size="small"
    :bordered="false"
  >
    {{ dictLabel }}
  </n-tag>
</template>
