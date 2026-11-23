<!--
 * @description 要素解读（S5）：参数解析（reportId / volumeId / index）+ 登录守卫。
 * @file src/pages/report/factor.vue
-->
<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import ReportFactorContent from '@/modules/talent-portal/components/report/ReportFactorContent.vue'
import { useFoundationPortal } from '@/modules/foundation-portal/composables/useFoundationPortal'
import { useProtectedPage } from '@/modules/foundation-portal/composables/useProtectedPage'

const { themeVars } = useFoundationPortal()
const { isAuthorized } = useProtectedPage()

const reportId = ref('')
const volumeId = ref('')
const index = ref('')

onLoad((query) => {
  reportId.value = String(query?.reportId || '')
  volumeId.value = String(query?.volumeId || '')
  index.value = String(query?.index ?? '')
})
</script>

<template>
  <view v-if="isAuthorized" class="page foundation-portal-page" :style="themeVars">
    <ReportFactorContent :report-id="reportId" :volume-id="volumeId" :index="index" />
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--foundation-background);
}
</style>
