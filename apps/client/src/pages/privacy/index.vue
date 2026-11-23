<!--
 * @description 隐私政策（S14）：静态文档 v1 占位，标注版本与生效日期，游客可访问。
 * @file src/pages/privacy/index.vue
-->
<script setup lang="ts">
import { computed } from 'vue'
import PortalDocument from '@/modules/foundation-portal/components/PortalDocument.vue'
import PortalPageHeader from '@/modules/foundation-portal/components/PortalPageHeader.vue'
import { useFoundationBack } from '@/modules/foundation-portal/composables/useFoundationBack'
import { buildPrivacyContent, PRIVACY_VERSION } from '@/modules/foundation-portal/documents'
import { useSiteStore } from '@/store/site'

const siteStore = useSiteStore()
const { goBack } = useFoundationBack('home')
const content = computed(() => buildPrivacyContent(siteStore.site.appName, siteStore.site.contactPhone))
</script>

<template>
  <view class="page foundation-portal-page" :style="siteStore.themeVars">
    <PortalPageHeader title="隐私政策" @back="goBack" />
    <PortalDocument :content="content" :version-label="PRIVACY_VERSION" />
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--foundation-background);
}
</style>
