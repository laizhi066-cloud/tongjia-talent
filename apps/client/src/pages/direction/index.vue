<!--
 * @description 培养方向（主栏 3）：「推荐方向 / 已选方向」两页签、0 命中回退提示、
 *   选择 / 换档 / 取消 / 自己填写入口；报告不可读时只展示状态卡，不调用方向接口。
 * @file src/pages/direction/index.vue
-->
<script setup lang="ts">
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import { useDialog } from '@wot-ui/ui'
import PortalTabbar from '@/modules/foundation-portal/components/PortalTabbar.vue'
import { useFoundationPortal } from '@/modules/foundation-portal/composables/useFoundationPortal'
import { blockingStateIcon } from '@/modules/foundation-portal/state-icons'
import { useProtectedPage } from '@/modules/foundation-portal/composables/useProtectedPage'
import { triggerHaptic } from '@/utils/haptics'
import {
  currentPageUrl,
  redirectToLogin,
  switchTab,
} from '@/modules/foundation-portal/navigation'
import type { TalentDirectionItem, TalentSelectionItem } from '@/api/talent-types'
import DirectionCard from './components/DirectionCard.vue'
import DirectionStatusCard from './components/DirectionStatusCard.vue'
import SelectionCard from './components/SelectionCard.vue'
import TierPickerPopup from './components/TierPickerPopup.vue'
import { useDirectionIndex } from './composables/useDirectionIndex'

const { isAuthorized } = useProtectedPage()
const { themeVars, handleTab } = useFoundationPortal()
const dialog = useDialog()
const {
  state,
  tab,
  refreshing,
  items,
  selections,
  selectionCount,
  selectionLimit,
  atLimit,
  recommendBadge,
  selectedBadge,
  fallbackNotice,
  emptySnapshot,
  blockingCopy,
  tierPopupVisible,
  tierPopupTiers,
  tierPopupValue,
  tierTarget,
  tierSubmitting,
  cancelSubmitting,
  openDirection,
  openManual,
  openReport,
  setTab,
  openChangeTier,
  confirmChangeTier,
  cancelSelection,
  load,
} = useDirectionIndex()

onShow(() => {
  if (isAuthorized.value)
    void load()
})

onPullDownRefresh(async () => {
  try {
    await load()
    triggerHaptic('light')
  }
  finally {
    uni.stopPullDownRefresh()
  }
})

/** 页签切换：只接受两个合法值。 */
function handleTabChange(event: { index: number, name?: string | number }): void {
  setTab(event.name === 'selected' ? 'selected' : 'recommend')
}

/** 阻断态下一步：按状态回报告 / 首页 / 登录页或重试。 */
function handleBlockingAction(): void {
  if (state.value === 'error') {
    void load()
    return
  }
  if (state.value === 'session') {
    redirectToLogin(currentPageUrl())
    return
  }
  if (state.value === 'unbound') {
    switchTab('home')
    return
  }
  if (state.value === 'empty') {
    openManual()
    return
  }
  if (state.value === 'notfound' || state.value === 'invalid') {
    switchTab('direction')
    return
  }
  openReport()
}

/** 取消选择二次确认：Wot 函数式对话框，确认后调用取消接口。 */
async function askCancel(selection: TalentSelectionItem): Promise<void> {
  try {
    await dialog.confirm({
      title: '取消选择',
      msg: `取消后「${selection.directionName}」不再计入已选，确认取消？`,
      confirmButtonText: '确认取消',
      cancelButtonText: '取消',
    })
  }
  catch {
    return
  }
  await cancelSelection(selection)
}

/** 推荐页卡片点击：打开方向详情。 */
function handleOpenDirection(item: TalentDirectionItem): void {
  openDirection(item)
}
</script>

<template>
  <view v-if="isAuthorized" class="page foundation-portal-page" :style="themeVars">
    <view class="content">
      <!-- 骨架 -->
      <view v-if="state === 'loading'" class="skeleton" role="status" aria-label="正在加载培养方向">
        <view v-for="index in 3" :key="index" class="skeleton-card">
          <wd-skeleton
            :row-col="[{ width: '45%' }, { width: '75%' }, { width: '30%' }]"
            animation="gradient"
          />
        </view>
      </view>

      <!-- 推荐 / 已选 -->
      <template v-else-if="state === 'ready'">
        <wd-tabs
          :model-value="tab"
          custom-class="direction-tabs"
          @change="handleTabChange"
        >
          <wd-tab
            :title="recommendBadge ? `推荐方向 ${recommendBadge}` : '推荐方向'"
            name="recommend"
          >
            <view class="tab-panel">
              <wd-notice-bar
                v-if="fallbackNotice"
                type="warning"
                prefix="warn"
                :scrollable="false"
                wrapable
                :text="fallbackNotice"
              />

              <view v-if="emptySnapshot" class="recommend-empty">
                <DirectionStatusCard
                  title="暂无可推荐方向"
                  message="暂无可推荐方向，可自己填写培养方向。"
                  action-text="自己填写"
                  @action="openManual"
                />
              </view>

              <view v-else class="card-list" role="list">
                <view v-for="item in items" :key="item.directionId" role="listitem">
                  <DirectionCard :item="item" @open="handleOpenDirection(item)" />
                </view>
              </view>

              <view v-if="atLimit" class="limit-hint" role="status">
                <wd-icon name="info-circle" size="16px" color="var(--foundation-warning)" />
                <text class="limit-hint__text">最多选择 {{ selectionLimit }} 个方向，请先取消一个</text>
              </view>

              <view v-if="!emptySnapshot" class="manual-entry">
                <wd-button type="primary" variant="text" size="small" block @click="openManual">
                  没有合适的？自己填写
                </wd-button>
              </view>
            </view>
          </wd-tab>

          <wd-tab
            :title="`已选方向 ${selectedBadge}`"
            name="selected"
          >
            <view class="tab-panel">
              <view v-if="selections.length" class="card-list" role="list">
                <view v-for="selection in selections" :key="selection.selectionId" role="listitem">
                  <SelectionCard
                    :selection="selection"
                    :disabled="tierSubmitting || cancelSubmitting"
                    @change-tier="openChangeTier(selection)"
                    @cancel="askCancel(selection)"
                  />
                </view>
              </view>

              <view v-else class="selected-empty">
                <view class="selected-empty__icon" aria-hidden="true">
                  <wd-icon name="compass" size="28px" color="var(--foundation-text-muted)" />
                </view>
                <text class="selected-empty__title">还没有选择方向</text>
                <text class="selected-empty__desc">从推荐方向中选择，或自己填写一个方向；最多选择 {{ selectionLimit }} 个。</text>
                <view class="selected-empty__actions">
                  <wd-button type="primary" size="medium" @click="setTab('recommend')">
                    去推荐方向
                  </wd-button>
                  <wd-button variant="soft" size="medium" @click="openManual">
                    自己填写
                  </wd-button>
                </view>
              </view>

              <text class="selected-note">已选 {{ selectionCount }}/{{ selectionLimit }} 个方向；更换档位与取消选择会立即生效。</text>
            </view>
          </wd-tab>
        </wd-tabs>

        <view v-if="refreshing" class="refreshing-hint" role="status">
          <wd-loading size="16px" color="var(--foundation-text-muted)" />
          <text>正在刷新…</text>
        </view>
      </template>

      <!-- 阻断态 / 空 / 错 -->
      <DirectionStatusCard
        v-else-if="blockingCopy"
        :title="blockingCopy.title"
        :message="blockingCopy.message"
        :action-text="blockingCopy.actionText"
        :alert="state === 'error' || state === 'notfound' || state === 'invalid' || state === 'session'"
        :icon="blockingStateIcon(state)"
        @action="handleBlockingAction"
      />
    </view>

    <PortalTabbar active="direction" @navigate="handleTab" />

    <!-- 换档弹层 -->
    <TierPickerPopup
      v-model="tierPopupVisible"
      :tiers="tierPopupTiers"
      :selected-tier-id="tierTarget?.tierId || ''"
      :loading="tierSubmitting"
      :title="tierTarget ? `更换「${tierTarget.directionName}」目标档位` : '更换目标档位'"
      @confirm="confirmChangeTier"
    />

    <!-- 函数式对话框挂载点（取消选择二次确认） -->
    <wd-dialog />
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
  padding: var(--sp-2) var(--foundation-page-padding) var(--foundation-page-bottom);
}
.skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}
.skeleton-card {
  padding: var(--sp-4);
  border: 1px solid var(--foundation-border);
  border-radius: var(--foundation-radius);
  background: var(--foundation-card);
}
:deep(.direction-tabs) {
  --wot-tabs-nav-bg: transparent;
  --wot-tabs-nav-item-padding: 0 var(--sp-4);
  --wot-tabs-nav-color: var(--foundation-text-secondary);
  --wot-tabs-nav-color-active: var(--foundation-text);
  --wot-tabs-nav-line-bg: var(--foundation-interactive);
  padding: 0;
  background: transparent;
}
:deep(.direction-tabs .wd-tabs__nav) {
  border-bottom: 1px solid var(--foundation-hairline);
}
/* 页签可点区域 ≥44px（移动端触控基线）。 */
:deep(.direction-tabs .wd-tabs__nav-item) {
  display: flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
}
:deep(.direction-tabs .wd-tabs__container) {
  overflow: visible;
}
.tab-panel {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding-top: var(--sp-3);
}
.card-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}
.recommend-empty {
  padding-top: var(--sp-1);
}
.limit-hint {
  display: flex;
  min-height: 44px;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--foundation-radius-sm);
  background: var(--foundation-warning-surface);
}
.limit-hint__text {
  flex: 1;
  color: var(--foundation-warning);
  font-size: var(--fs-caption);
  line-height: 1.6;
}
.manual-entry {
  padding-top: var(--sp-1);
}
.selected-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-5) var(--sp-4);
  border: 1px solid var(--foundation-border);
  border-radius: var(--foundation-radius);
  background: var(--foundation-card);
  text-align: center;
}
.selected-empty__icon {
  display: flex;
  width: 56px;
  height: 56px;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  background: var(--foundation-surface);
}
.selected-empty__title {
  color: var(--foundation-text);
  font-size: var(--fs-title);
  font-weight: var(--fw-semibold);
}
.selected-empty__desc {
  max-width: 300px;
  color: var(--foundation-text-secondary);
  font-size: var(--fs-sm);
  line-height: 1.7;
}
.selected-empty__actions {
  display: flex;
  width: 100%;
  gap: var(--sp-2);
  margin-top: var(--sp-2);
}
.selected-empty__actions :deep(.wd-button) {
  flex: 1;
}
.selected-note {
  color: var(--foundation-text-muted);
  font-size: var(--fs-tag);
  line-height: 1.6;
}
.refreshing-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-1);
  color: var(--foundation-text-muted);
  font-size: var(--fs-tag);
}
</style>

<route lang="json">
{
  "style": {
    "navigationStyle": "default",
    "navigationBarTitleText": "培养方向",
    "navigationBarBackgroundColor": "#FAF8F3",
    "navigationBarTextStyle": "black",
    "enablePullDownRefresh": true
  }
}
</route>
