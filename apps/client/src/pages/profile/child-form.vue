<!--
 * @description 孩子信息（S12）：新增 / 编辑孩子档案；保存后返回孩子管理并刷新。
 *   编辑时证件留空表示不修改；提交与错误映射在 `useProfileChildForm`，表单在 `ProfileChildFormPanel`。
 * @file src/pages/profile/child-form.vue
-->
<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import type { TalentChildInput } from '@/api/talent-types'
import PortalPageHeader from '@/modules/foundation-portal/components/PortalPageHeader.vue'
import { useProfileBack } from './composables/useProfileBack'
import { useProtectedPage } from '@/modules/foundation-portal/composables/useProtectedPage'
import { openPage, PORTAL_ROUTES } from '@/modules/foundation-portal/navigation'
import { useSiteStore } from '@/store/site'
import ProfileChildFormPanel from './components/ProfileChildFormPanel.vue'
import { useProfileChildForm } from './composables/useProfileChildForm'
import type { ChildFormField } from './composables/useProfileChildForm'

const siteStore = useSiteStore()
const { isAuthorized } = useProtectedPage()
const { goBack } = useProfileBack()
const {
  child,
  state,
  errorMessage,
  submitting,
  loadForEdit,
  startCreate,
  submit,
  normalizeInput,
} = useProfileChildForm()

const mode = ref<'create' | 'edit'>('create')
const childId = ref('')
const serverError = ref<{ field?: ChildFormField, message: string } | null>(null)

onLoad((options?: Record<string, string>) => {
  const id = String(options?.id || '').trim()
  if (id) {
    mode.value = 'edit'
    childId.value = id
    void loadForEdit(id)
    return
  }
  startCreate()
})

/** 重试读取孩子档案（编辑模式）。 */
function retry(): void {
  if (mode.value === 'edit' && childId.value)
    void loadForEdit(childId.value)
  else
    startCreate()
}

/** 提交新增 / 编辑；成功后返回孩子管理（onShow 自动刷新）。 */
async function handleSubmit(input: TalentChildInput | Partial<TalentChildInput>): Promise<void> {
  serverError.value = null
  const result = await submit(normalizeInput(input), mode.value === 'edit' ? childId.value : undefined)
  if (result.ok) {
    uni.showToast({ title: '已保存，正在查询结果', icon: 'success' })
    goBack()
    return
  }
  if (result.message)
    serverError.value = { field: result.field, message: result.message }
}

/** 编辑未修改任何字段：不产生写请求。 */
function handleUnchanged(): void {
  uni.showToast({ title: '未修改', icon: 'none' })
  goBack()
}

function openPrivacy(): void {
  openPage(PORTAL_ROUTES.privacy)
}
</script>

<template>
  <view v-if="isAuthorized" class="page foundation-portal-page" :style="siteStore.themeVars">
    <PortalPageHeader title="孩子信息" @back="goBack" />

    <!-- 读取中：表单骨架 -->
    <view v-if="state === 'loading'" class="state-block" role="status" aria-label="正在读取孩子档案">
      <view class="skeleton-card">
        <wd-skeleton :row-col="[{ width: '40%' }, { width: '72%' }, { width: '56%' }, { width: '64%' }]" animation="gradient" />
      </view>
      <view class="skeleton-card">
        <wd-skeleton theme="paragraph" animation="gradient" />
      </view>
    </view>

    <!-- 越权 / 已解绑 / 读取失败 -->
    <view v-else-if="state === 'notfound' || state === 'error'" class="state-block" role="alert">
      <wd-empty :icon="state === 'error' ? 'no-wifi' : 'no-content'" :tip="errorMessage || '内容不可查看'" />
      <view class="state-block__action">
        <wd-button v-if="state === 'error'" type="primary" variant="soft" size="medium" @click="retry">
          重试
        </wd-button>
        <wd-button type="primary" variant="text" size="medium" @click="goBack">
          返回孩子管理
        </wd-button>
      </view>
    </view>

    <ProfileChildFormPanel
      v-else
      :mode="mode"
      :child="child"
      :submitting="submitting"
      :server-error="serverError"
      @submit="handleSubmit"
      @unchanged="handleUnchanged"
      @clear-error="serverError = null"
      @open-privacy="openPrivacy"
    />
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--foundation-background);
}
.state-block {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-2) var(--foundation-page-padding) calc(var(--sp-5) + env(safe-area-inset-bottom));
  box-sizing: border-box;
}
.skeleton-card {
  padding: var(--sp-4);
  border: 1px solid var(--foundation-border);
  border-radius: var(--foundation-radius);
  background: var(--foundation-card);
}
.state-block__action {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  width: min(100%, 280px);
  align-self: center;
}
</style>
