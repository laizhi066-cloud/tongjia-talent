<!--
 * @description 关于 / 版本信息（S15）：站点品牌、客户端版本号与版权。
 *   协议、隐私与客服入口统一收在「设置」页，本页不再重复提供，也不展示内部环境、API 地址或构建号。
 * @file src/pages/about/about.vue
-->
<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import PortalPageHeader from '@/modules/foundation-portal/components/PortalPageHeader.vue'
import { useFoundationBack } from '@/modules/foundation-portal/composables/useFoundationBack'
import { useSiteStore } from '@/store/site'

const siteStore = useSiteStore()
const { goBack } = useFoundationBack('profile')
const logoFailed = shallowRef(false)
const version = import.meta.env.VITE_APP_VERSION || '1.0.0'

watch(() => siteStore.site.logo, () => {
  logoFailed.value = false
})
</script>

<template>
  <view class="page foundation-portal-page" :style="siteStore.themeVars">
    <PortalPageHeader title="关于" @back="goBack" />
    <view class="content">
      <view class="brand">
        <wd-img
          v-if="siteStore.site.logo && !logoFailed"
          :src="siteStore.site.logo"
          width="72px"
          height="72px"
          radius="20px"
          mode="aspectFit"
          @error="logoFailed = true"
        />
        <view v-else class="brand__fallback" aria-hidden="true">
          <text>{{ siteStore.site.appName.slice(0, 1) || '同' }}</text>
        </view>
        <text class="brand__name">{{ siteStore.site.appName }}</text>
        <text v-if="siteStore.site.slogan" class="brand__slogan">{{ siteStore.site.slogan }}</text>
        <text class="brand__version">版本 {{ version }}</text>
      </view>

      <text v-if="siteStore.site.copyright" class="copyright">{{ siteStore.site.copyright }}</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--foundation-background);
}
.content {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  padding: var(--sp-4) var(--foundation-page-padding) calc(var(--sp-5) + env(safe-area-inset-bottom));
}
.brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-1);
  padding: var(--sp-5) var(--sp-4);
  border: 1px solid var(--foundation-border);
  border-radius: var(--foundation-radius);
  background: var(--foundation-card);
  text-align: center;
}
.brand__fallback {
  display: flex;
  width: 72px;
  height: 72px;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
  color: var(--foundation-on-primary);
  background: var(--foundation-primary);
  font-size: 30px;
  font-weight: 700;
}
.brand__name {
  margin-top: var(--sp-2);
  color: var(--foundation-text);
  font-size: var(--fs-hero);
  font-weight: 700;
}
.brand__slogan {
  color: var(--foundation-text-secondary);
  font-size: var(--fs-sm);
}
.brand__version {
  margin-top: var(--sp-1);
  color: var(--foundation-text-muted);
  font-size: var(--fs-caption);
}
.copyright {
  color: var(--foundation-text-muted);
  font-size: var(--fs-tag);
  text-align: center;
}
</style>
