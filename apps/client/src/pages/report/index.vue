<!--
 * @description 报告（主栏 2）：原生导航「报告」+ 报告内容（对象条 / 页签 / 分册目录 / 培育建议）+ 4 栏底栏。
 *   页面只做参数解析、会话返回刷新与主栏切换，业务渲染在 talent-portal 报告组件内。
 * @file src/pages/report/index.vue
-->
<script setup lang="ts">
import { onLoad, onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import { nextTick, ref } from 'vue'
import PortalTabbar from '@/modules/foundation-portal/components/PortalTabbar.vue'
import ReportMainContent from '@/modules/talent-portal/components/report/ReportMainContent.vue'
import { useFoundationPortal } from '@/modules/foundation-portal/composables/useFoundationPortal'
import { useProtectedPage } from '@/modules/foundation-portal/composables/useProtectedPage'
import { triggerHaptic } from '@/utils/haptics'

const { themeVars, handleTab } = useFoundationPortal()
const { isAuthorized } = useProtectedPage()

const contentRef = ref<InstanceType<typeof ReportMainContent> | null>(null)
const initialTab = ref<'report' | 'advice'>('report')
// 首次 onShow 由组件自身 onMounted 加载，之后（切换对象返回 / 从二级页返回）再刷新。
let firstShow = true

onLoad((query) => {
  initialTab.value = String(query?.tab || '') === 'advice' ? 'advice' : 'report'
})

onShow(() => {
  if (firstShow) {
    firstShow = false
    return
  }
  if (!isAuthorized.value)
    return
  void nextTick(() => {
    void contentRef.value?.reload()
  })
})

onPullDownRefresh(async () => {
  try {
    if (contentRef.value) {
      await contentRef.value.reload()
      triggerHaptic('light')
    }
  }
  finally {
    uni.stopPullDownRefresh()
  }
})
</script>

<template>
  <view v-if="isAuthorized" class="page foundation-portal-page" :style="themeVars">
    <ReportMainContent ref="contentRef" :initial-tab="initialTab" />
    <PortalTabbar active="report" @navigate="handleTab" />
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
  "style": {
    "navigationStyle": "default",
    "navigationBarTitleText": "报告",
    "navigationBarBackgroundColor": "#FAF8F3",
    "navigationBarTextStyle": "black",
    "enablePullDownRefresh": true
  }
}
</route>
