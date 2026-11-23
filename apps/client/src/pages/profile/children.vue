<!--
 * @description 孩子管理（S11）：孩子列表、脱敏证件、查询状态、报告篇数与新增/编辑入口。
 *   数据加载与状态在 `useProfileChildren`，列表渲染在 `ProfileChildrenPanel`。
 * @file src/pages/profile/children.vue
-->
<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import PortalPageHeader from '@/modules/foundation-portal/components/PortalPageHeader.vue'
import { useProfileBack } from './composables/useProfileBack'
import { useProtectedPage } from '@/modules/foundation-portal/composables/useProtectedPage'
import { openPage, PORTAL_ROUTES } from '@/modules/foundation-portal/navigation'
import { useTalentSession } from '@/modules/talent-portal/composables/useTalentSession'
import { useSiteStore } from '@/store/site'
import ProfileChildrenPanel from './components/ProfileChildrenPanel.vue'
import { useProfileChildren } from './composables/useProfileChildren'

const siteStore = useSiteStore()
const { isAuthorized } = useProtectedPage()
const { goBack } = useProfileBack()
const session = useTalentSession()
const {
  items,
  state,
  errorMessage,
  pendingCheckCount,
  boundCount,
  load,
  reload,
} = useProfileChildren()

const reclaiming = ref(false)

onShow(() => {
  // 从孩子信息页返回后自动刷新查询状态（不做轮询）。
  if (isAuthorized.value)
    void load()
})

/** 新增孩子：进入孩子信息页（无 id）。 */
function openCreate(): void {
  openPage(PORTAL_ROUTES.profileChildForm)
}

/** 编辑孩子：携带 id 进入孩子信息页；不在 URL 携带姓名/证件等 PII。 */
function openEdit(id: string): void {
  openPage(`${PORTAL_ROUTES.profileChildForm}?id=${encodeURIComponent(id)}`)
}

/** 未绑定会员档案时重新匹配家长档案。 */
async function reclaim(): Promise<void> {
  if (reclaiming.value)
    return
  reclaiming.value = true
  try {
    await session.reClaim()
    await reload()
    if (state.value === 'unbound')
      uni.showToast({ title: '仍未匹配到会员档案，请联系客服', icon: 'none' })
  }
  finally {
    reclaiming.value = false
  }
}
</script>

<template>
  <view v-if="isAuthorized" class="page foundation-portal-page" :style="siteStore.themeVars">
    <PortalPageHeader title="孩子管理" @back="goBack">
      <template #right>
        <view
          v-if="state === 'ready' || state === 'empty'"
          class="nav-add"
          role="button"
          tabindex="0"
          aria-label="新增孩子"
          @click="openCreate"
          @keyup.enter="openCreate"
          @keyup.space.prevent="openCreate"
        >
          <wd-icon name="plus" size="14px" color="var(--foundation-primary-deep)" />
          <text class="nav-add__text">新增</text>
        </view>
      </template>
    </PortalPageHeader>
    <ProfileChildrenPanel
      :state="state"
      :items="items"
      :error-message="errorMessage"
      :pending-check-count="pendingCheckCount"
      :bound-count="boundCount"
      :reclaiming="reclaiming"
      @edit="openEdit"
      @retry="reload"
      @reclaim="reclaim"
    />
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--foundation-background);
}
.nav-add {
  display: flex;
  min-width: 44px;
  height: 44px;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
}
.nav-add__text {
  color: var(--foundation-primary-deep);
  font-size: var(--fs-caption);
  font-weight: var(--fw-medium);
}
</style>
