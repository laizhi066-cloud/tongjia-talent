<!--
 * @description 登录面板：品牌区 + 协议勾选 + 平台登录方式。
 *   - 小程序：微信手机号一键登录（主）+ 微信快捷登录（次）；不渲染账号密码表单。
 *   - H5：账号密码登录；不渲染微信授权按钮。
 *   未勾选协议时登录按钮禁用，并在行内给出说明。
 * @file src/modules/foundation-portal/components/FoundationLoginPanel.vue
-->
<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import type { FoundationSiteConfig } from '../types'

interface PhoneNumberEvent { detail: { code?: string, errMsg?: string } }

const props = defineProps<{
  site: FoundationSiteConfig
  loading: boolean
  /** 服务端返回的错误文案（账号或密码错误等）。 */
  errorMessage?: string
}>()

const emit = defineEmits<{
  phone: [code: string]
  wechat: []
  password: [identity: string, password: string]
  agreement: []
  privacy: []
  guest: []
}>()

const logoFailed = shallowRef(false)
const identity = shallowRef('')
const password = shallowRef('')
const consent = shallowRef(false)
/** 本地校验失败（未同意协议、字段为空）。 */
const validationError = shallowRef('')
/** 服务端返回的失败原因（账号或密码错误、网络失败等）。 */
const serverError = shallowRef('')
/** 行内提示：本地校验优先，其次是服务端原因。 */
const displayedError = computed(() => validationError.value || serverError.value)

watch(() => props.site.logo, () => {
  logoFailed.value = false
})
watch(consent, (accepted) => {
  if (accepted && validationError.value.includes('协议'))
    validationError.value = ''
})
watch(() => props.errorMessage, (message) => {
  serverError.value = message || ''
})
// 用户重新输入账号或密码后，旧的「账号或密码错误」不应继续挂在页面上。
watch([identity, password], () => {
  serverError.value = ''
})

/** 未勾选协议时按钮仍可点击（禁用的按钮给不出任何说明），点击后内联提示原因。 */
function ensureConsent(): boolean {
  if (consent.value)
    return true
  validationError.value = '请先阅读并同意用户协议和隐私政策'
  return false
}

/** 小程序手机号授权结果：用户取消不循环弹授权。 */
function handlePhoneNumber(event: PhoneNumberEvent): void {
  if (props.loading)
    return
  if (!ensureConsent())
    return
  if (event.detail.code) {
    emit('phone', event.detail.code)
    return
  }
  if (!event.detail.errMsg?.includes('cancel'))
    validationError.value = '未获得手机号授权，可用微信登录或联系客服绑定'
}

/** 未同意协议就点主按钮时，先说明原因而不是让按钮无反应。 */
function handlePrimaryClick(): void {
  if (props.loading)
    return
  ensureConsent()
}

/** 微信快捷登录兜底路径。 */
function handleWechatLogin(): void {
  if (props.loading || !ensureConsent())
    return
  emit('wechat')
}

/** H5 账号密码登录：字段级校验后再发请求。 */
function submitPasswordLogin(): void {
  if (props.loading)
    return
  validationError.value = ''
  serverError.value = ''
  if (!ensureConsent())
    return
  if (!identity.value.trim()) {
    validationError.value = '请输入手机号、邮箱或账号'
    return
  }
  if (!password.value.trim()) {
    validationError.value = '请输入密码'
    return
  }
  emit('password', identity.value.trim(), password.value)
}

function continueAsGuest(): void {
  if (!props.loading)
    emit('guest')
}
</script>

<template>
  <view class="login-panel" :class="{ 'is-busy': props.loading }">
    <view class="brand">
      <wd-img
        v-if="props.site.logo && !logoFailed"
        :src="props.site.logo"
        width="56px"
        height="56px"
        radius="16px"
        mode="aspectFit"
        @error="logoFailed = true"
      />
      <view v-else class="brand__fallback" aria-hidden="true">
        <text>{{ props.site.appName.slice(0, 1) || '同' }}</text>
      </view>
      <text class="brand__name">{{ props.site.appName }}</text>
      <text class="brand__slogan">{{ props.site.slogan || '看见天赋，陪伴成长' }}</text>
    </view>

    <view class="auth-surface">
      <!-- #ifdef MP-WEIXIN -->
      <view class="primary-action">
        <wd-button
          class="primary-button"
          type="primary"
          size="large"
          block
          :loading="props.loading"
          :disabled="props.loading"
          :open-type="consent ? 'getPhoneNumber' : undefined"
          @getphonenumber="handlePhoneNumber"
          @click="handlePrimaryClick"
        >
          微信手机号登录
        </wd-button>
      </view>
      <view class="secondary-action">
        <wd-button
          type="primary"
          variant="text"
          size="small"
          :loading="props.loading"
          :disabled="props.loading"
          @click="handleWechatLogin"
        >
          其他方式登录
        </wd-button>
      </view>
      <!-- #endif -->

      <!-- #ifdef H5 -->
      <view class="password-panel">
        <wd-input
          v-model="identity"
          custom-class="password-input"
          :disabled="props.loading"
          type="text"
          :maxlength="255"
          autocomplete="username"
          aria-label="手机号、邮箱或账号"
          placeholder="手机号 / 邮箱 / 账号"
        />
        <wd-input
          v-model="password"
          custom-class="password-input"
          :disabled="props.loading"
          type="text"
          show-password
          :maxlength="128"
          autocomplete="current-password"
          aria-label="密码"
          placeholder="密码"
          confirm-type="done"
          @confirm="submitPasswordLogin"
        />
        <view class="password-action">
          <wd-button
            class="password-submit"
            type="primary"
            size="large"
            block
            :loading="props.loading"
            :disabled="props.loading"
            @click="submitPasswordLogin"
          >
            登录
          </wd-button>
        </view>
      </view>
      <!-- #endif -->
    </view>

    <text v-if="displayedError" class="validation-error" role="alert" aria-live="polite">{{ displayedError }}</text>

    <view class="consent-row">
      <wd-checkbox
        v-model="consent"
        :disabled="props.loading"
        checked-color="var(--foundation-primary)"
        aria-label="同意用户协议和隐私政策"
      >
        <text class="consent-text">我已阅读并同意</text>
      </wd-checkbox>
      <text class="consent-link" role="link" tabindex="0" @click="emit('agreement')" @keyup.enter="emit('agreement')" @keyup.space.prevent="emit('agreement')">《用户协议》</text>
      <text class="consent-text">和</text>
      <text class="consent-link" role="link" tabindex="0" @click="emit('privacy')" @keyup.enter="emit('privacy')" @keyup.space.prevent="emit('privacy')">《隐私政策》</text>
    </view>

    <view class="guest-action">
      <wd-button type="primary" variant="text" size="small" :disabled="props.loading" @click="continueAsGuest">
        先随便看看
      </wd-button>
    </view>

    <view v-if="props.site.contactPhone" class="contact" role="button" tabindex="0" @click="uni.makePhoneCall({ phoneNumber: props.site.contactPhone })">
      <wd-icon name="headset" size="14px" color="var(--foundation-text-muted)" />
      <text class="contact__text">联系客服</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.login-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 480px;
  min-height: calc(100vh - 44px - env(safe-area-inset-top));
  margin: 0 auto;
  padding: var(--sp-6) var(--sp-4) calc(var(--sp-5) + env(safe-area-inset-bottom));
  box-sizing: border-box;
  background: var(--foundation-background);
}
.brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-top: var(--sp-5);
}
.brand__fallback {
  display: flex;
  width: 56px;
  height: 56px;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  color: var(--foundation-on-primary);
  background: var(--foundation-primary);
  font-size: 24px;
  font-weight: var(--fw-bold);
}
.brand__name {
  margin-top: 2px;
  color: var(--foundation-text);
  font-size: var(--fs-hero);
  font-weight: var(--fw-bold);
  line-height: 1.3;
}
.brand__slogan {
  color: var(--foundation-text-muted);
  font-size: var(--fs-caption);
}
.auth-surface {
  width: 100%;
  margin-top: var(--sp-6);
  padding: var(--sp-4);
  box-sizing: border-box;
  border: 1px solid var(--foundation-border);
  border-radius: var(--foundation-radius);
  background: var(--foundation-card);
  box-shadow: var(--foundation-shadow);
}
.primary-action,
.secondary-action,
.password-action {
  width: 100%;
}
.secondary-action {
  display: flex;
  justify-content: center;
  margin-top: var(--sp-3);
}
.password-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: var(--sp-3);
}
:deep(.password-input) {
  width: 100%;
  box-sizing: border-box;
  --wot-input-padding: 0 14px;
  --wot-input-inner-height: 50px;
  --wot-input-inner-font-size: 15px;
  --wot-input-bg: var(--foundation-card-subtle);
  --wot-input-inner-color: var(--foundation-text);
  --wot-input-inner-placeholder-color: var(--foundation-text-muted);
  border: 1px solid var(--foundation-border);
  border-radius: var(--foundation-radius-sm);
  background: var(--foundation-card-subtle);
}
.password-action {
  margin-top: var(--sp-1);
}
.validation-error {
  display: block;
  width: 100%;
  margin-top: var(--sp-3);
  color: var(--foundation-danger);
  font-size: var(--fs-caption);
  line-height: 1.6;
  text-align: center;
}
.consent-row {
  display: flex;
  width: 100%;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 1px;
  margin-top: var(--sp-3);
  --wot-checkbox-label-font-size: var(--fs-caption);
  --wot-checkbox-size: 16px;
}
.consent-text {
  color: var(--foundation-text-secondary);
  font-size: var(--fs-caption);
}
.consent-link {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  color: var(--foundation-primary-deep);
  font-size: var(--fs-caption);
}
.guest-action {
  margin-top: var(--sp-1);
  --wot-button-primary-color: var(--foundation-text-secondary);
}
.contact {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: var(--sp-4);
  padding: var(--sp-2) var(--sp-3);
  border-radius: 999px;
  background: var(--foundation-card);
  border: 1px solid var(--foundation-border);
}
.contact__text {
  color: var(--foundation-text-secondary);
  font-size: var(--fs-caption);
}
.is-busy .primary-button,
.is-busy .password-submit {
  opacity: 0.56;
}
</style>
