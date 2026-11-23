<!--
 * @description 受保护占位页壳：登录守卫 + 统一页头 + 占位内容，供 M7-B/C/D/E 页面逐步替换。
 * @file src/modules/talent-portal/components/ProtectedPendingPage.vue
-->
<script setup lang="ts">
import PortalPageHeader from '@/modules/foundation-portal/components/PortalPageHeader.vue'
import { useFoundationBack } from '@/modules/foundation-portal/composables/useFoundationBack'
import { useProtectedPage } from '@/modules/foundation-portal/composables/useProtectedPage'
import type { PortalTab } from '@/modules/foundation-portal/navigation'
import PendingPage from './PendingPage.vue'

const props = defineProps<{
  title: string
  milestone: string
  description?: string
  fallbackTab?: PortalTab
}>()

const { isAuthorized } = useProtectedPage()
const { goBack } = useFoundationBack(props.fallbackTab || 'report')
</script>

<template>
  <view v-if="isAuthorized" class="page foundation-portal-page">
    <PortalPageHeader :title="props.title" @back="goBack" />
    <PendingPage
      :title="props.title"
      :milestone="props.milestone"
      :description="props.description"
      :fallback-tab="props.fallbackTab"
    />
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--foundation-background);
}
</style>
