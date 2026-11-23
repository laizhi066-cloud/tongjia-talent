<!--
/**
 * @description 微信小程序认证配置 — AppID·AppSecret（密钥加密存）。
 * @file app/pages/admin/settings/wechat/index.vue
 */
-->
<script setup lang="ts">
import { NAlert, NButton, NCard, NForm, NFormItem, NInput, useMessage } from 'naive-ui'
import SecretField from '~/components/admin/SecretField.vue'

definePageMeta({ layout: 'admin', middleware: ['auth', 'permission-guard', 'super-guard'] })

const message = useMessage()
const { fetchWechatSettings, saveWechatSettings, testWechatSettings } = useSettingsApi()
const loading = ref(true)
const saving = ref(false)
const testingMp = ref(false)
const form = ref({
  mp: { appId: '', appSecret: '' },
})

async function load() {
  loading.value = true
  try {
    const r = await fetchWechatSettings()
    if (r?.mp) form.value.mp = { appId: r.mp.appId || '', appSecret: r.mp.appSecret || '' }
  }
  catch { /* 不存在则保存时创建 */ }
  loading.value = false
}
onMounted(load)

/** 填了 AppID 则对应 AppSecret 必填（掩码值视为已填）。返回首个缺失项提示，无缺失返回 null */
function validate(): string | null {
  if (form.value.mp.appId?.trim() && !form.value.mp.appSecret?.trim()) return '微信小程序：请填写 AppSecret'
  return null
}

async function save() {
  const err = validate()
  if (err) {
    message.warning(err)
    return
  }
  saving.value = true
  try {
    await saveWechatSettings(form.value)
    message.success('已保存')
    await load() // 重新拉取，密钥回显掩码
  }
  catch { /* 拦截器已提示 */ }
  finally { saving.value = false }
}

async function test() {
  testingMp.value = true
  try {
    const r = await testWechatSettings()
    message.success(r?.ok ? '小程序凭据有效 ✓' : '验证完成')
  }
  catch { /* 拦截器已提示具体错误（凭据无效/未配置/网络） */ }
  finally { testingMp.value = false }
}
</script>

<template>
  <div class="space-y-4 form-fill admin-scroll-page">
    <h1 class="text-xl font-bold">微信配置</h1>
    <NAlert type="info" :bordered="false">
      在此填写微信<b>小程序</b>的 AppID / AppSecret，后端用于小程序授权登录和手机号一键登录。
      AppSecret 加密存储、回显掩码。修改后无需改代码、无需重启即可生效。
    </NAlert>

    <NCard size="small" title="微信小程序">
      <template #header-extra>
        <span class="text-xs text-muted-foreground">登录 / 手机号一键获取</span>
      </template>
      <NForm label-placement="left" label-width="110">
        <NFormItem label="AppID">
          <NInput v-model:value="form.mp.appId" placeholder="wx 开头，小程序后台 → 开发管理 → 开发设置" />
        </NFormItem>
        <NFormItem label="AppSecret">
          <SecretField v-model="form.mp.appSecret" />
        </NFormItem>
        <div class="flex items-center gap-3">
          <NButton :loading="testingMp" :disabled="loading" @click="test">
            验证小程序凭据
          </NButton>
          <span class="text-xs text-muted-foreground">用于微信授权和手机号一键登录</span>
        </div>
      </NForm>
    </NCard>

    <div class="flex gap-3">
      <NButton type="primary" :loading="saving" :disabled="loading" @click="save">
        保存微信配置
      </NButton>
    </div>
  </div>
</template>
