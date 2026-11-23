<!--
 * @description 建议页阻断状态卡：报告未发布 / 更新中 / 无报告 / 越权 / 空建议，附下一步动作。
 *   视觉与文案结构统一由 PortalStateView 承担，本组件只做语义映射。
 * @file src/pages/advice/components/AdviceStatusCard.vue
-->
<script setup lang="ts">
import PortalStateView from '@/modules/foundation-portal/components/PortalStateView.vue'

const props = defineProps<{
  title: string
  message: string
  actionText?: string
  /** 危险 / 错误语义（越权、加载失败）。 */
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
