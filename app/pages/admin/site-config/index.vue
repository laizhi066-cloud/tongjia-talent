<!--
/**
 * @description 单实例基础站点配置：品牌、门户默认外观和后台主题。
 * @file app/pages/admin/site-config/index.vue
 */
-->
<script setup lang="ts">
import { NButton, NCard, NColorPicker, NForm, NFormItem, NInput, NSpin, useMessage } from 'naive-ui'
import PortalAppearancePicker from './components/PortalAppearancePicker.vue'

definePageMeta({ layout: 'admin', middleware: ['auth', 'permission-guard', 'super-guard'] })

interface FoundationSiteConfig {
  appName: string
  adminName: string
  logo: string
  slogan: string
  copyright: string
  contactPhone: string
  primaryColor: string
  themeMode: 'light' | 'dark' | 'system'
}

interface SiteConfigRecord {
  id: string
  configValue: string
}

const message = useMessage()
const api = useConfigApi()
const loading = ref(true)
const saving = ref(false)
const configId = ref('')
const { setPrimaryColor } = useTheme()
const form = reactive<FoundationSiteConfig>({
  appName: '',
  adminName: '',
  logo: '',
  slogan: '',
  copyright: '',
  contactPhone: '',
  primaryColor: '',
  themeMode: 'system',
})

function normalizeThemeMode(value: unknown): FoundationSiteConfig['themeMode'] {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system'
}

function applySiteConfig(value: string): void {
  try {
    const parsed = JSON.parse(value) as Partial<FoundationSiteConfig>
    Object.assign(form, {
      appName: parsed.appName ?? '',
      adminName: parsed.adminName ?? '',
      logo: parsed.logo ?? '',
      slogan: parsed.slogan ?? '',
      copyright: parsed.copyright ?? '',
      contactPhone: parsed.contactPhone ?? '',
      primaryColor: parsed.primaryColor ?? '',
      // 旧版 `auto` 与基础 schema 的 `system` 统一在下次保存时完成收敛。
      themeMode: normalizeThemeMode(parsed.themeMode),
    })
  } catch {
    message.warning('站点配置格式无法识别，已使用基础默认值')
  }
}

async function load(): Promise<void> {
  loading.value = true
  try {
    const record = await api.getConfigByKey('site_config') as SiteConfigRecord
    configId.value = record.id
    applySiteConfig(record.configValue)
  } catch {
    // 首次初始化时没有记录，保存会自动创建。
  } finally {
    loading.value = false
  }
}

function validate(): boolean {
  if (!form.appName.trim()) {
    message.warning('请填写站点名称')
    return false
  }
  if (form.contactPhone && !/^1\d{10}$/.test(form.contactPhone)) {
    message.warning('联系电话格式不正确')
    return false
  }
  return true
}

/** 后台皮肤会即时写入全局主题；同步内存表单，避免随后保存其它字段时回退品牌主色。 */
function syncPrimaryColorFromSkin(color: string): void {
  if (color) form.primaryColor = color
}

async function save(): Promise<void> {
  if (!validate()) return
  saving.value = true
  try {
    const payload = {
      configName: '站点配置',
      configKey: 'site_config',
      configValue: JSON.stringify(form),
      configType: 'Y',
      remark: '基础版站点品牌与主题配置',
    }
    if (configId.value) await api.updateConfig(configId.value, payload)
    else {
      const created = await api.createConfig(payload)
      configId.value = created.id
    }
    if (form.primaryColor) await setPrimaryColor(form.primaryColor)
    message.success('站点配置已保存，品牌主色已同步；后台与门户亮暗模式保持独立')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="site-config-page admin-scroll-page">
    <header class="site-config-page__header">
      <div>
        <h1 class="site-config-page__title">站点配置</h1>
        <p class="site-config-page__description">设置唯一站点的品牌信息与 C 端默认外观；品牌主色会同步到后台，亮暗模式由两端各自保存。微信 AppID 和密钥请在独立的安全配置页维护。</p>
      </div>
      <NButton type="primary" :loading="saving" :disabled="loading" @click="save">保存配置</NButton>
    </header>

    <NSpin :show="loading">
      <div class="site-config-page__grid">
        <NCard title="品牌信息">
          <NForm label-placement="top" class="site-config-form">
            <NFormItem label="站点名称" required>
              <NInput v-model:value="form.appName" placeholder="用于 C 端首页与页面标题" />
            </NFormItem>
            <NFormItem label="后台名称">
              <NInput v-model:value="form.adminName" placeholder="留空时使用站点名称" />
            </NFormItem>
            <NFormItem label="品牌标语">
              <NInput v-model:value="form.slogan" placeholder="简短说明站点定位" />
            </NFormItem>
            <NFormItem label="联系电话">
              <NInput v-model:value="form.contactPhone" placeholder="11 位手机号码" inputmode="tel" />
            </NFormItem>
            <NFormItem label="版权信息" class="site-config-form__wide">
              <NInput v-model:value="form.copyright" placeholder="显示在 C 端关于页面" />
            </NFormItem>
          </NForm>
        </NCard>

        <NCard title="门户主题">
          <NForm label-placement="top" class="site-config-form">
            <NFormItem label="品牌主色">
              <NColorPicker v-model:value="form.primaryColor" :show-alpha="false" />
            </NFormItem>
            <NFormItem label="品牌 Logo" class="site-config-form__wide">
              <div class="site-config-logo-field">
                <AppUpload v-model="form.logo" standalone mode="cover" :size="84" :disabled="loading || saving" />
                <NInput v-model:value="form.logo" placeholder="上传图片或粘贴图片地址；留空时使用站点名称首字" />
              </div>
            </NFormItem>
            <div class="site-config-form__wide">
              <PortalAppearancePicker v-model="form.themeMode" :disabled="loading || saving" />
            </div>
            <NFormItem label="微信认证" class="site-config-form__wide">
              <NButton @click="navigateTo('/admin/settings/wechat')">配置微信小程序</NButton>
            </NFormItem>
          </NForm>
        </NCard>

        <NCard class="site-config-page__appearance" title="后台外观">
          <AdminSkinPicker @primary-color-change="syncPrimaryColorFromSkin" />
        </NCard>
      </div>
    </NSpin>
  </div>
</template>

<style lang="scss" scoped>
.site-config-page { display: flex; flex: 1; flex-direction: column; gap: 20px; }
.site-config-page__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.site-config-page__title { margin: 0; font-size: 22px; }
.site-config-page__description { max-width: 720px; margin: 6px 0 0; color: var(--muted-foreground); font-size: 14px; line-height: 1.6; }
.site-config-page__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.site-config-page__appearance { grid-column: 1 / -1; }
.site-config-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 24px; }
.site-config-form__wide { grid-column: 1 / -1; }
.site-config-logo-field { display: flex; align-items: center; gap: 16px; width: 100%; }
.site-config-logo-field :deep(.n-input) { flex: 1; min-width: 0; }
@media (max-width: 760px) {
  .site-config-page__header { flex-direction: column; }
  .site-config-page__grid, .site-config-form { grid-template-columns: 1fr; }
  .site-config-form__wide { grid-column: auto; }
  .site-config-logo-field { align-items: flex-start; flex-direction: column; }
  .site-config-logo-field :deep(.n-input) { width: 100%; }
}
</style>
