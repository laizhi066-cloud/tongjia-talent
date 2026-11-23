<!--
 * @description 用户协议（S13）：静态文档 v1 占位，标注版本与生效日期，游客可访问。
 * @file src/pages/agreement/index.vue
-->
<script setup lang="ts">
import { computed } from 'vue'
import PortalDocument from '@/modules/foundation-portal/components/PortalDocument.vue'
import PortalPageHeader from '@/modules/foundation-portal/components/PortalPageHeader.vue'
import { useFoundationBack } from '@/modules/foundation-portal/composables/useFoundationBack'
import { AGREEMENT_VERSION, buildAgreementContent } from '@/modules/foundation-portal/documents'
import { useSiteStore } from '@/store/site'

const siteStore = useSiteStore()
const { goBack } = useFoundationBack('home')
const content = computed(() => buildAgreementContent(siteStore.site.appName, siteStore.site.contactPhone))
</script>

<template>
  <view class="page foundation-portal-page" :style="siteStore.themeVars">
    <PortalPageHeader title="用户协议" @back="goBack" />
    <PortalDocument :content="content" :version-label="AGREEMENT_VERSION" />
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--foundation-background);
}
</style>
