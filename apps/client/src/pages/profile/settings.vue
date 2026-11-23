<!--
 * @description 设置（S16）：收纳低频入口——用户协议、隐私政策、关于与版本、联系客服与注销账号。
 *   主栏「我的」只保留高频操作；协议与版本不再同时出现在「关于」页，避免入口重复。
 * @file src/pages/profile/settings.vue
-->
<script setup lang="ts">
import { shallowRef } from 'vue'
import { deleteAccount } from '@/api/auth'
import { apiErrorMessage } from '@/http/http'
import { resetSessionEvents } from '@/http/session'
import PortalConfirmDialog from '@/modules/foundation-portal/components/PortalConfirmDialog.vue'
import PortalPageHeader from '@/modules/foundation-portal/components/PortalPageHeader.vue'
import { useFoundationBack } from '@/modules/foundation-portal/composables/useFoundationBack'
import { useFoundationPortal } from '@/modules/foundation-portal/composables/useFoundationPortal'
import { openPage, PORTAL_ROUTES } from '@/modules/foundation-portal/navigation'
import { useAuthStore } from '@/store/auth'
import { useTalentPortalStore } from '@/store/talent-portal'

const authStore = useAuthStore()
const store = useTalentPortalStore()
const { site, themeVars, isLoggedIn, contactPhone } = useFoundationPortal()
const { goBack } = useFoundationBack('profile')

const version = import.meta.env.VITE_APP_VERSION || '1.0.0'
const deleteVisible = shallowRef(false)
const submitting = shallowRef(false)

/** 客服拨号（未配置号码时不展示）。 */
function callService(): void {
  if (!contactPhone.value)
    return
  uni.makePhoneCall({ phoneNumber: contactPhone.value })
}

/** 注销账号：确认后清会话并回登录页。 */
async function confirmDelete(): Promise<void> {
  if (submitting.value)
    return
  submitting.value = true
  try {
    await deleteAccount()
    deleteVisible.value = false
    authStore.logout()
    store.resetSession()
    resetSessionEvents()
    uni.showToast({ title: '账户已注销', icon: 'success' })
    uni.reLaunch({ url: PORTAL_ROUTES.login })
  }
  catch (error) {
    uni.showToast({ title: apiErrorMessage(error, '注销失败，请稍后重试'), icon: 'none' })
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <view class="page foundation-portal-page" :style="themeVars">
    <PortalPageHeader title="设置" @back="goBack" />

    <view class="content">
      <wd-cell-group insert custom-class="portal-cell-group">
        <wd-cell title="用户协议" prefix-icon="file" is-link role="button" tabindex="0" aria-label="用户协议" @click="openPage(PORTAL_ROUTES.agreement)" />
        <wd-cell title="隐私政策" prefix-icon="safe" is-link role="button" tabindex="0" aria-label="隐私政策" @click="openPage(PORTAL_ROUTES.privacy)" />
      </wd-cell-group>

      <wd-cell-group insert custom-class="portal-cell-group">
        <wd-cell title="关于同佳天赋" prefix-icon="info-circle" :value="`版本 ${version}`" is-link role="button" tabindex="0" aria-label="关于同佳天赋与版本信息" @click="openPage(PORTAL_ROUTES.about)" />
        <wd-cell v-if="contactPhone" title="联系客服" prefix-icon="phone" :value="contactPhone" is-link role="button" tabindex="0" aria-label="拨打客服电话" @click="callService" />
      </wd-cell-group>

      <template v-if="isLoggedIn">
        <view class="danger">
          <wd-button type="danger" variant="text" size="small" block @click="deleteVisible = true">
            注销账号
          </wd-button>
          <text class="danger__hint">注销后账号与已关联的会员档案不可恢复；如需再次使用，请联系客服重新建档。</text>
        </view>
      </template>

      <view class="footer">
        <text v-if="site.copyright" class="footer__copyright">{{ site.copyright }}</text>
      </view>
    </view>

    <PortalConfirmDialog
      v-model="deleteVisible"
      title="注销账号"
      confirm-text="确认注销"
      danger
      acknowledge-text="我已了解注销不可恢复"
      :loading="submitting"
      @confirm="confirmDelete"
    >
      <text class="dialog-text">注销后不可恢复，且无法再用同一微信/账号登录：</text>
      <text class="dialog-text">1. 已绑定的会员档案、报告、建议将不可查看（后台审计留痕不受影响）；</text>
      <text class="dialog-text">2. 如需再次使用，需联系客服重新建档。</text>
    </PortalConfirmDialog>
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
  gap: var(--sp-3);
  padding: var(--sp-3) var(--foundation-page-padding) var(--foundation-page-bottom);
}
:deep(.portal-cell-group) {
  --wot-cell-group-insert-margin: 0;
  --wot-cell-group-insert-radius: var(--foundation-radius);
  --wot-cell-group-bg: var(--foundation-card);
  --wot-cell-bg: var(--foundation-card);
  --wot-cell-title-color: var(--foundation-text);
  --wot-cell-value-color: var(--foundation-text-muted);
  --wot-cell-icon-color: var(--foundation-interactive);
  --wot-cell-border-color: var(--foundation-border);
}
.danger {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-3) 0 var(--sp-2);
  --wot-button-primary-color: var(--foundation-danger);
  --wot-button-error-color: var(--foundation-danger);
}
.danger__hint {
  padding: 0 var(--sp-2);
  color: var(--foundation-text-muted);
  font-size: var(--fs-tag);
  line-height: 1.6;
  text-align: center;
}
.footer {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--sp-2) 0 var(--sp-4);
  text-align: center;
}
.footer__copyright {
  color: var(--foundation-text-muted);
  font-size: var(--fs-tag);
}
.dialog-text {
  display: block;
  color: var(--foundation-text-secondary);
  font-size: var(--fs-body);
  line-height: 1.7;
}
</style>
