<!--
 * @description 方向页阻断状态卡：报告未发布 / 更新中 / 无推荐 / 越权 / 加载失败，附下一步动作。
 *   视觉与文案结构统一由 PortalStateView 承担，本组件只做语义映射。
 * @file src/pages/direction/components/DirectionStatusCard.vue
-->
<script setup lang="ts">
import PortalStateView from '@/modules/foundation-portal/components/PortalStateView.vue'

const props = defineProps<{
  title: string
  message: string
  actionText?: string
  alert?: boolean
  icon?: string
}>()

const emit = defineEmits<{ action: [] }>()
</script>

<template>
  <PortalStateView
    :state="props.alert ? 'error' : 'empty'"
    :title="props.title"
    :message="props.message"
    :retry-text="props.actionText"
    :icon="props.icon"
    @retry="emit('action')"
  />
</template>
