<!--
 * @description 登录页（S1）：协议门禁 + 微信手机号一键 / 微信快捷（小程序）/ 账号密码（H5），
 *   登录成功后消费 redirect 回跳，游客可继续浏览首页。
 * @file src/pages/auth/login.vue
-->
<script setup lang="ts">
import { resetSessionEvents } from '@/http/session'
import { apiErrorMessage, apiErrorStatus } from '@/http/http'
import FoundationLoginPanel from '@/modules/foundation-portal/components/FoundationLoginPanel.vue'
import PortalPageHeader from '@/modules/foundation-portal/components/PortalPageHeader.vue'
import { useFoundationBack } from '@/modules/foundation-portal/composables/useFoundationBack'
import { useLoginRedirect } from '@/modules/foundation-portal/composables/useLoginRedirect'
import { useWechatAuthentication } from '@/modules/foundation-portal/composables/useWechatAuthentication'
import { openPage, PORTAL_ROUTES } from '@/modules/foundation-portal/navigation'
import { useTalentSession } from '@/modules/talent-portal/composables/useTalentSession'
import { useAuthStore } from '@/store/auth'
import { useSiteStore } from '@/store/site'
import { shallowRef } from 'vue'

const authStore = useAuthStore()
const siteStore = useSiteStore()
const session = useTalentSession()
const { loading, loginWithWechat, loginWithWechatPhone } = useWechatAuthentication()
const { finish } = useLoginRedirect()
const { goBack } = useFoundationBack('home')
const errorMessage = shallowRef('')

/** 登录成功后的统一收尾：清事件去重、刷新资料与对象、回跳来源页。 */
async function handleLoginSuccess(): Promise<void> {
  resetSessionEvents()
  errorMessage.value = ''
  await session.completeLogin()
  finish()
}

/** 小程序手机号一键登录。 */
async function handlePhone(phoneCode: string): Promise<void> {
  errorMessage.value = ''
  const result = await loginWithWechatPhone(phoneCode)
  if (!result)
    return
  await handleLoginSuccess()
}

/** 小程序微信快捷登录。 */
async function handleWechat(): Promise<void> {
  errorMessage.value = ''
  const result = await loginWithWechat()
  if (!result)
    return
  await handleLoginSuccess()
}

/** H5 账号密码登录；错误统一为「账号或密码错误」类可读文案。 */
async function handlePassword(identity: string, password: string): Promise<void> {
  errorMessage.value = ''
  if (loading.value)
    return
  loading.value = true
  try {
    await authStore.loginByPassword(identity, password)
    await handleLoginSuccess()
  }
  catch (error) {
    // 401 即账号密码不匹配；服务端文案里的「微信手机号一键登录」在 H5 不适用，改为可执行的提示。
    errorMessage.value = apiErrorStatus(error) === 401
      ? '账号或密码错误，请检查账号和密码后重试'
      : apiErrorMessage(error, '登录失败，请稍后重试')
  }
  finally {
    loading.value = false
  }
}

function openAgreement(): void {
  openPage(PORTAL_ROUTES.agreement)
}

function openPrivacy(): void {
  openPage(PORTAL_ROUTES.privacy)
}

function continueAsGuest(): void {
  finish(false)
}
</script>

<template>
  <view class="page foundation-portal-page" :style="siteStore.themeVars">
    <PortalPageHeader title="登录" @back="goBack" />
    <FoundationLoginPanel
      :site="siteStore.site"
      :loading="loading"
      :error-message="errorMessage"
      @phone="handlePhone"
      @wechat="handleWechat"
      @password="handlePassword"
      @agreement="openAgreement"
      @privacy="openPrivacy"
      @guest="continueAsGuest"
    />
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--foundation-background);
}
</style>
