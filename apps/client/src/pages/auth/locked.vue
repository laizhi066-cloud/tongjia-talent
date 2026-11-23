<!--
 * @description 账号停用页（S2）：展示停用说明、客服与退出登录；不展示内部错误码。
 * @file src/pages/auth/locked.vue
-->
<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { resetSessionEvents } from '@/http/session'
import PortalPageHeader from '@/modules/foundation-portal/components/PortalPageHeader.vue'
import PortalStateView from '@/modules/foundation-portal/components/PortalStateView.vue'
import { useFoundationBack } from '@/modules/foundation-portal/composables/useFoundationBack'
import { PORTAL_ROUTES } from '@/modules/foundation-portal/navigation'
import { useAuthStore } from '@/store/auth'
import { useSiteStore } from '@/store/site'
import { useTalentPortalStore } from '@/store/talent-portal'

const authStore = useAuthStore()
const siteStore = useSiteStore()
const talentStore = useTalentPortalStore()
const { goBack } = useFoundationBack('home')

/** 停用原因只影响文案，不展示内部状态码。 */
const reason = shallowRef<'account_disabled' | 'parent_disabled'>('account_disabled')

const description = computed(() => reason.value === 'parent_disabled'
  ? '该家长档案暂时无法查看报告与培养方向，请联系客服处理。'
  : '该账号暂时无法查看报告与培养方向，请联系客服处理。')

onLoad((query?: Record<string, string>) => {
  if (query?.reason === 'parent_disabled')
    reason.value = 'parent_disabled'
})

/** 客服拨号（未配置号码时不展示按钮）。 */
function callService(): void {
  const phone = String(siteStore.site.contactPhone || '')
  if (!phone)
    return
  uni.makePhoneCall({ phoneNumber: phone })
}

/** 退出登录：清会话与天赋缓存，回登录页（清栈）。 */
function logout(): void {
  authStore.logout()
  talentStore.resetSession()
  resetSessionEvents()
  uni.reLaunch({ url: PORTAL_ROUTES.login })
}
</script>

<template>
  <view class="page foundation-portal-page" :style="siteStore.themeVars">
    <PortalPageHeader title="账号状态" @back="goBack" />
    <view class="locked">
      <PortalStateView state="error" title="账号已停用" :message="description" icon="lock">
        <template #actions>
          <wd-button
            v-if="siteStore.site.contactPhone"
            type="primary"
            size="medium"
            icon="service"
            @click="callService"
          >
            联系客服
          </wd-button>
          <wd-button variant="soft" size="medium" @click="logout">
            退出登录
          </wd-button>
        </template>
      </PortalStateView>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--foundation-background);
}
.locked {
  margin: var(--sp-5) var(--foundation-page-padding);
}
</style>
