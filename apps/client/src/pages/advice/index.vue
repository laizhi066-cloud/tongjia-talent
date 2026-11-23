<!--
 * @description 培育建议（S6）：版本周期说明 + 按分册建议书列表 + 「按建议选培养方向」。
 *   报告不可读时只展示状态卡；建议接口 409 / 404 映射为统一阻断态。
 * @file src/pages/advice/index.vue
-->
<script setup lang="ts">
import { onLoad, onShow } from '@dcloudio/uni-app'
import PortalPageHeader from '@/modules/foundation-portal/components/PortalPageHeader.vue'
import { useFoundationBack } from '@/modules/foundation-portal/composables/useFoundationBack'
import { useFoundationPortal } from '@/modules/foundation-portal/composables/useFoundationPortal'
import { adviceBookAvailable } from '@/modules/talent-portal/advice-book-state'
import { blockingStateIcon } from '@/modules/foundation-portal/state-icons'
import { useProtectedPage } from '@/modules/foundation-portal/composables/useProtectedPage'
import {
  currentPageUrl,
  openPage,
  PORTAL_ROUTES,
  redirectToLogin,
  switchTab,
} from '@/modules/foundation-portal/navigation'
import type { TalentAdviceBook } from '@/api/talent-types'
import AdviceBookCard from './components/AdviceBookCard.vue'
import AdviceStatusCard from './components/AdviceStatusCard.vue'
import { adviceBookOrdinal } from './composables/advice-utils'
import { useAdviceList } from './composables/useAdviceList'

const { isAuthorized } = useProtectedPage()
const { goBack } = useFoundationBack('report')
const { themeVars } = useFoundationPortal()
const {
  state,
  books,
  versionText,
  bookCountText,
  refreshing,
  reportId,
  blockingCopy,
  setReportId,
  bookSummary,
  load,
} = useAdviceList()

onLoad((options?: Record<string, string>) => {
  setReportId(options?.reportId || '')
})

onShow(() => {
  if (isAuthorized.value)
    void load()
})

/** 打开建议书；`book` 只作为内部定位键，不展示字母。 */
function openBook(book: TalentAdviceBook): void {
  const targetReportId = reportId.value
  if (!targetReportId || !adviceBookAvailable(book))
    return
  openPage(`${PORTAL_ROUTES.adviceDetail}?reportId=${encodeURIComponent(targetReportId)}&book=${encodeURIComponent(book.book)}`)
}

/** 去培养方向主栏。 */
function goDirection(): void {
  switchTab('direction')
}

/** 阻断态下一步：按状态回到报告 / 首页 / 登录页或重试。 */
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
  if (state.value === 'notfound' || state.value === 'invalid') {
    goBack()
    return
  }
  switchTab('report')
}
</script>

<template>
  <view v-if="isAuthorized" class="page foundation-portal-page" :style="themeVars">
    <PortalPageHeader title="培育建议" @back="goBack" />

    <view class="content">
      <!-- 首屏骨架 -->
      <view v-if="state === 'loading'" class="skeleton" role="status" aria-label="正在加载培育建议">
        <view v-for="index in 3" :key="index" class="skeleton-card">
          <wd-skeleton
            :row-col="[{ width: '55%' }, { width: '80%' }, { width: '35%' }]"
            animation="gradient"
          />
        </view>
      </view>

      <!-- 建议列表 -->
      <template v-else-if="state === 'ready'">
        <view class="version-card">
          <view class="version-card__head">
            <wd-icon name="calendar" size="18px" color="var(--foundation-interactive)" />
            <text class="version-card__title">{{ versionText }}</text>
          </view>
          <text v-if="bookCountText" class="version-card__count">{{ bookCountText }}</text>
        </view>

        <view class="book-list" role="list">
          <view v-for="book in books" :key="book.book" role="listitem">
            <AdviceBookCard
              :book="book"
              :ordinal="adviceBookOrdinal(book.book)"
              :summary="bookSummary(book)"
              @open="openBook(book)"
            />
          </view>
        </view>
      </template>

      <!-- 阻断态 / 空 / 错 -->
      <AdviceStatusCard
        v-else-if="blockingCopy"
        :title="blockingCopy.title"
        :message="blockingCopy.message"
        :action-text="blockingCopy.actionText"
        :alert="state === 'error' || state === 'notfound' || state === 'session'"
        :icon="blockingStateIcon(state)"
        @action="handleBlockingAction"
      />

      <view v-if="refreshing && state === 'ready'" class="refreshing-hint" role="status">
        <wd-loading size="16px" color="var(--foundation-text-muted)" />
        <text>正在刷新…</text>
      </view>
    </view>

    <!-- 底部主操作：按建议选培养方向 -->
    <view v-if="state === 'ready'" class="action-bar">
      <wd-button type="primary" size="large" block @click="goDirection">
        按建议选培养方向
      </wd-button>
    </view>
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
  padding: var(--sp-2) var(--foundation-page-padding) calc(var(--sp-5) + env(safe-area-inset-bottom));
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
.version-card {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  padding: var(--sp-3) var(--sp-4);
  border: 1px solid var(--foundation-border);
  border-radius: var(--foundation-radius-sm);
  background: var(--foundation-card-subtle);
}
.version-card__head {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}
.version-card__title {
  min-width: 0;
  color: var(--foundation-text);
  font-size: var(--fs-body);
  font-weight: var(--fw-semibold);
  line-height: 1.5;
  overflow-wrap: break-word;
}
.version-card__note {
  color: var(--foundation-text-secondary);
  font-size: var(--fs-caption);
  line-height: 1.6;
}
.version-card__count {
  color: var(--foundation-text-muted);
  font-size: var(--fs-tag);
}
.book-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}
.footer-note {
  padding: var(--sp-2) var(--sp-1) 0;
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
.action-bar {
  position: fixed;
  bottom: 0;
  left: 50%;
  width: min(100%, 480px);
  z-index: 15;
  padding: 12px var(--foundation-page-padding) calc(12px + env(safe-area-inset-bottom));
  box-sizing: border-box;
  background: var(--foundation-card);
  box-shadow: var(--foundation-shadow-bar);
  transform: translateX(-50%);
}
</style>
