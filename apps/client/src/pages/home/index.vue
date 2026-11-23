<!--
 * @description 首页（主栏 1）：原生导航「首页」+ 首页内容 + 4 栏底栏。
 * @file src/pages/home/index.vue
-->
<script setup lang="ts">
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import PortalTabbar from '@/modules/foundation-portal/components/PortalTabbar.vue'
import TalentHomeContent from '@/modules/talent-portal/components/TalentHomeContent.vue'
import { useFoundationPortal } from '@/modules/foundation-portal/composables/useFoundationPortal'
import { triggerHaptic } from '@/utils/haptics'

const { themeVars, handleTab, refreshProfile } = useFoundationPortal()

onShow(() => {
  void refreshProfile()
})

onPullDownRefresh(async () => {
  try {
    await refreshProfile()
    triggerHaptic('light')
  }
  finally {
    uni.stopPullDownRefresh()
  }
})
</script>

<template>
  <view class="page foundation-portal-page" :style="themeVars">
    <TalentHomeContent />
    <PortalTabbar active="home" @navigate="handleTab" />
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--foundation-background);
}
</style>

<route lang="json">
{
  "type": "home",
  "style": {
    "navigationStyle": "default",
    "navigationBarTitleText": "首页",
    "navigationBarBackgroundColor": "#FAF8F3",
    "navigationBarTextStyle": "black",
    "enablePullDownRefresh": true
  }
}
</route>
