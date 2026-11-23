<!--
 * @description 分册页（S4）：参数解析 + 登录守卫，内容由报告模块组件渲染。
 * @file src/pages/report/volume.vue
-->
<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import ReportVolumeContent from '@/modules/talent-portal/components/report/ReportVolumeContent.vue'
import { useFoundationPortal } from '@/modules/foundation-portal/composables/useFoundationPortal'
import { useProtectedPage } from '@/modules/foundation-portal/composables/useProtectedPage'

const { themeVars } = useFoundationPortal()
const { isAuthorized } = useProtectedPage()

const reportId = ref('')
const volumeId = ref('')

onLoad((query) => {
  reportId.value = String(query?.reportId || '')
  volumeId.value = String(query?.volumeId || '')
})
</script>

<template>
  <view v-if="isAuthorized" class="page foundation-portal-page" :style="themeVars">
    <ReportVolumeContent :report-id="reportId" :volume-id="volumeId" />
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--foundation-background);
}
</style>
