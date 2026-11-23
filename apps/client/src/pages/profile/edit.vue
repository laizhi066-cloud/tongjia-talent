<!--
 * @description 编辑资料（S10）：家长资料（头像 / 昵称 / 姓名 / 性别 / 出生日期 / 身份证），
 *   手机号只读并说明原因（M7 spec U1）；保存后返回我的并刷新资料。
 *   数据与保存逻辑在 `useProfileEditor`，表单在 `ProfileEditorPanel`。
 * @file src/pages/profile/edit.vue
-->
<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import type { TalentProfileInput } from '@/api/talent-types'
import PortalPageHeader from '@/modules/foundation-portal/components/PortalPageHeader.vue'
import PortalStateView from '@/modules/foundation-portal/components/PortalStateView.vue'
import { useProfileBack } from './composables/useProfileBack'
import { useProtectedPage } from '@/modules/foundation-portal/composables/useProtectedPage'
import { openPage, PORTAL_ROUTES } from '@/modules/foundation-portal/navigation'
import { useTalentSession } from '@/modules/talent-portal/composables/useTalentSession'
import { useSiteStore } from '@/store/site'
import ProfileEditorPanel from './components/ProfileEditorPanel.vue'
import { useProfileEditor } from './composables/useProfileEditor'
import type { ProfileEditorField } from './composables/useProfileEditor'

const siteStore = useSiteStore()
const { isAuthorized } = useProtectedPage()
const { goBack } = useProfileBack()
const session = useTalentSession()
const {
  profile,
  state,
  errorMessage,
  saving,
  uploadingAvatar,
  load,
  save,
  changeAvatar,
} = useProfileEditor()

const serverError = ref<{ field?: ProfileEditorField, message: string } | null>(null)
const reclaiming = ref(false)

onLoad(() => {
  void load()
})

/** 未绑定会员档案时重新匹配后重新读取资料。 */
async function reclaim(): Promise<void> {
  if (reclaiming.value)
    return
  reclaiming.value = true
  try {
    await session.reClaim()
    await load()
    if (state.value === 'unbound')
      uni.showToast({ title: '仍未匹配到会员档案，请联系客服', icon: 'none' })
  }
  finally {
    reclaiming.value = false
  }
}

/** 保存变化字段；成功后返回我的（onShow 刷新账户卡）。 */
async function handleSave(input: TalentProfileInput): Promise<void> {
  serverError.value = null
  const result = await save(input)
  if (result.ok) {
    uni.showToast({ title: '已保存', icon: 'success' })
    goBack()
    return
  }
  if (result.message)
    serverError.value = { field: result.field, message: result.message }
}

/** 未修改任何字段：不产生写请求。 */
function handleUnchanged(): void {
  uni.showToast({ title: '未修改', icon: 'none' })
  goBack()
}

/** 头像选择后上传；失败保留原头像并提示。 */
function handleAvatar(filePath: string): void {
  void changeAvatar(filePath)
}

function openPrivacy(): void {
  openPage(PORTAL_ROUTES.privacy)
}
</script>

<template>
  <view v-if="isAuthorized" class="page foundation-portal-page" :style="siteStore.themeVars">
    <PortalPageHeader title="编辑资料" @back="goBack" />

    <!-- 读取中：表单骨架 -->
    <view v-if="state === 'loading'" class="state-block" role="status" aria-label="正在读取资料">
      <view class="skeleton-card">
        <wd-skeleton :row-col="[[{ size: '56px', type: 'circle' }, { width: '48%', marginLeft: '12px' }], { width: '70%' }, { width: '56%' }]" animation="gradient" />
      </view>
      <view class="skeleton-card">
        <wd-skeleton theme="paragraph" animation="gradient" />
      </view>
    </view>

    <!-- 未绑定会员档案 -->
    <view v-else-if="state === 'unbound'" class="state-block">
      <PortalStateView
        state="empty"
        icon="info-circle"
        title="暂未关联会员档案"
        message="手机号与后台登记不一致时，请联系客服核对后再编辑资料。"
        retry-text="重新匹配"
        :action-loading="reclaiming"
        @retry="reclaim"
      />
    </view>

    <!-- 读取失败 -->
    <view v-else-if="state === 'error'" class="state-block">
      <PortalStateView
        state="error"
        :message="errorMessage || '资料暂时无法读取'"
        retry-text="重试"
        @retry="load"
      />
    </view>

    <ProfileEditorPanel
      v-else-if="profile"
      :profile="profile"
      :saving="saving"
      :uploading-avatar="uploadingAvatar"
      :server-error="serverError"
      @save="handleSave"
      @unchanged="handleUnchanged"
      @avatar="handleAvatar"
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
</style>
