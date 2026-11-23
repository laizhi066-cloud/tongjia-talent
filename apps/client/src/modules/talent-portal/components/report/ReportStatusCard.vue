<!--
 * @description 报告状态卡：整理中 / 更新中 / 无报告 / 查询态 / 报告级错误的统一展示。
 *   卡片只在报告不可读或请求失败时出现，动作由调用方通过 actions 插槽给出；
 *   排版统一由 PortalStateView 承担，避免报告页与方向 / 建议页出现两种状态样式。
 * @file src/modules/talent-portal/components/report/ReportStatusCard.vue
-->
<script setup lang="ts">
import { computed } from 'vue'
import PortalStateView from '@/modules/foundation-portal/components/PortalStateView.vue'

const props = withDefaults(defineProps<{
  title: string
  description?: string
  /** 卡片语气：pending 整理/更新、error 错误、empty 空态。 */
  tone?: 'pending' | 'error' | 'empty'
  /** 覆盖语气默认图标（如未绑定用 user）。 */
  icon?: string
}>(), { description: '', tone: 'empty', icon: '' })

const iconName = computed(() => {
  if (props.icon)
    return props.icon
  if (props.tone === 'error')
    return 'no-wifi'
  if (props.tone === 'pending')
    return 'clock-circle'
  return 'info-circle'
})
</script>

<template>
  <PortalStateView
    :state="props.tone === 'error' ? 'error' : 'empty'"
    :title="props.title"
    :message="props.description"
    :icon="iconName"
  >
    <template #actions>
      <slot name="actions" />
    </template>
  </PortalStateView>
</template>
