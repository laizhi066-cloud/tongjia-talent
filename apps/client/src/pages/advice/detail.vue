<!--
 * @description 建议书（S7）：字母分册（A/B/C）· 册名页头、数据熵筛选、四段正文只读展示，
 *   底部「看本册要素 / 选培养方向」；空段不渲染，筛选值按分册本机记忆。
 * @file src/pages/advice/detail.vue
-->
<script setup lang="ts">
import { onLoad, onShow } from '@dcloudio/uni-app'
import PortalPageHeader from '@/modules/foundation-portal/components/PortalPageHeader.vue'
import { useFoundationBack } from '@/modules/foundation-portal/composables/useFoundationBack'
import { useFoundationPortal } from '@/modules/foundation-portal/composables/useFoundationPortal'
import { useProtectedPage } from '@/modules/foundation-portal/composables/useProtectedPage'
import { openPage, PORTAL_ROUTES, switchTab } from '@/modules/foundation-portal/navigation'
import AdviceSectionCard from './components/AdviceSectionCard.vue'
import AdviceStatusCard from './components/AdviceStatusCard.vue'
import { useAdviceDetail } from './composables/useAdviceDetail'

const { isAuthorized } = useProtectedPage()
const { goBack } = useFoundationBack('report')
const { themeVars } = useFoundationPortal()
const {
  state,
  reportId,
  book,
  entropy,
  filteredSections,
  entropyOptions,
  bookTitle,
  headerMeta,
  volumeId,
  versionText,
  versionNote,
  blockingCopy,
  setParams,
  toggleEntropy,
  load,
} = useAdviceDetail()

onLoad((options?: Record<string, string>) => {
  setParams(options?.reportId || '', options?.book || '')
})

onShow(() => {
  if (isAuthorized.value)
    void load()
})

/** 看本册要素：A–F 与 V1–V6 固定映射，跳报告分册页。 */
function goVolume(): void {
  if (!reportId.value || !volumeId.value)
    return
  openPage(`${PORTAL_ROUTES.reportVolume}?reportId=${encodeURIComponent(reportId.value)}&volumeId=${encodeURIComponent(volumeId.value)}`)
}

/** 选培养方向：回培养方向主栏。 */
function goDirection(): void {
  switchTab('direction')
}

/** 阻断态下一步：加载失败重试，其余返回来源。 */
function handleBlockingAction(): void {
  if (state.value === 'error') {
    void load()
    return
  }
  goBack()
}
</script>

<template>
  <view v-if="isAuthorized" class="page foundation-portal-page" :style="themeVars">
    <PortalPageHeader title="建议书" @back="goBack" />

    <view class="content" :class="{ 'content--with-bar': state === 'ready' }">
      <!-- 骨架 -->
      <view v-if="state === 'loading'" class="skeleton" role="status" aria-label="正在加载建议书">
        <view class="skeleton-card">
          <wd-skeleton :row-col="[{ width: '45%' }, { width: '70%' }]" animation="gradient" />
        </view>
        <view v-for="index in 2" :key="index" class="skeleton-card">
          <wd-skeleton theme="paragraph" animation="gradient" />
        </view>
      </view>

      <!-- 建议书正文 -->
      <template v-else-if="state === 'ready' && book">
        <view class="header-card">
          <view class="header-card__head">
            <text class="header-card__title">{{ bookTitle }}</text>
            <wd-tag type="primary" variant="light" size="small" round>
              建议书
            </wd-tag>
          </view>
          <text v-if="headerMeta" class="header-card__meta">{{ headerMeta }}</text>
          <view v-if="versionText" class="header-card__version">
            <text class="header-card__version-text">{{ versionText }}</text>
            <text class="header-card__version-note">{{ versionNote }}</text>
          </view>
        </view>

        <!-- 数据熵筛选：全部 + 本份实际出现的等级；再点取消 -->
        <view class="filter" role="group" aria-label="按数据熵筛选">
          <view
            class="filter__chip"
            :class="{ 'filter__chip--active': entropy === '' }"
            role="button"
            tabindex="0"
            :aria-pressed="entropy === ''"
            @click="toggleEntropy('')"
            @keyup.enter="toggleEntropy('')"
            @keyup.space.prevent="toggleEntropy('')"
          >
            <text>全部</text>
          </view>
          <view
            v-for="option in entropyOptions"
            :key="option.name"
            class="filter__chip"
            :class="{ 'filter__chip--active': entropy === option.name }"
            role="button"
            tabindex="0"
            :aria-pressed="entropy === option.name"
            @click="toggleEntropy(option.name)"
            @keyup.enter="toggleEntropy(option.name)"
            @keyup.space.prevent="toggleEntropy(option.name)"
          >
            <text>{{ option.name }} {{ option.count }}</text>
          </view>
        </view>

        <view v-if="filteredSections.length" class="section-list" role="list">
          <view v-for="(section, index) in filteredSections" :key="`${section.chapter}-${section.factor}-${index}`" role="listitem">
            <AdviceSectionCard :section="section" />
          </view>
        </view>
        <view v-else class="filter-empty">
          <text class="filter-empty__text">该等级下没有建议内容</text>
        </view>
      </template>

      <!-- 阻断态 / 空 / 错 -->
      <AdviceStatusCard
        v-else-if="blockingCopy"
        :title="blockingCopy.title"
        :message="blockingCopy.message"
        :action-text="blockingCopy.actionText"
        :alert="state === 'error' || state === 'notfound' || state === 'invalid' || state === 'session'"
        :icon="state === 'error' ? 'no-wifi' : undefined"
        @action="handleBlockingAction"
      />
    </view>

    <!-- 底部两项操作 -->
    <view v-if="state === 'ready'" class="action-bar">
      <wd-button variant="soft" size="medium" @click="goVolume">
        看本册要素
      </wd-button>
      <wd-button type="primary" size="medium" @click="goDirection">
        选培养方向
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
.content--with-bar {
  padding-bottom: calc(var(--foundation-action-bar-height) + env(safe-area-inset-bottom) + var(--sp-4));
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
.header-card {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  padding: var(--sp-4);
  border: 1px solid var(--foundation-border);
  border-radius: var(--foundation-radius);
  background: var(--foundation-card);
  box-shadow: var(--foundation-shadow);
}
.header-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
}
.header-card__title {
  min-width: 0;
  color: var(--foundation-text);
  font-size: var(--fs-title-lg);
  font-weight: 700;
  line-height: 1.4;
}
.header-card__meta {
  color: var(--foundation-text-secondary);
  font-size: var(--fs-caption);
  line-height: 1.6;
}
.header-card__version {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: var(--sp-2);
  border-top: 1px solid var(--foundation-hairline);
}
.header-card__version-text {
  color: var(--foundation-text);
  font-size: var(--fs-caption);
}
.header-card__version-note {
  color: var(--foundation-text-muted);
  font-size: var(--fs-tag);
  line-height: 1.5;
}
.filter {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
}
.filter__chip {
  display: flex;
  min-height: 44px;
  align-items: center;
  padding: 0 var(--sp-3);
  border: 1px solid var(--foundation-border);
  border-radius: 999px;
  background: var(--foundation-card);
  color: var(--foundation-text-secondary);
  font-size: var(--fs-caption);
}
.filter__chip--active {
  border-color: var(--foundation-interactive);
  background: var(--foundation-surface);
  color: var(--foundation-interactive);
  font-weight: 600;
}

.section-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}
.filter-empty {
  padding: var(--sp-5) var(--sp-4);
  border: 1px dashed var(--foundation-border);
  border-radius: var(--foundation-radius-sm);
  text-align: center;
}
.filter-empty__text {
  color: var(--foundation-text-muted);
  font-size: var(--fs-sm);
}
.service-note {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  padding: var(--sp-4);
  border: 1px solid var(--foundation-accent-surface);
  border-radius: var(--foundation-radius-sm);
  background: var(--foundation-accent-subtle);
}
.service-note__title {
  color: var(--foundation-accent-text);
  font-size: var(--fs-body);
  font-weight: var(--fw-semibold);
}
.service-note__text {
  color: var(--foundation-accent-text);
  font-size: var(--fs-caption);
  line-height: 1.7;
}
.action-bar {
  position: fixed;
  bottom: 0;
  left: 50%;
  display: flex;
  width: min(100%, 480px);
  z-index: 15;
  box-sizing: border-box;
  gap: var(--sp-2);
  padding: 12px var(--foundation-page-padding) calc(12px + env(safe-area-inset-bottom));
  background: var(--foundation-card);
  box-shadow: var(--foundation-shadow-bar);
  transform: translateX(-50%);
}
.action-bar :deep(.wd-button) {
  flex: 1;
}
</style>
