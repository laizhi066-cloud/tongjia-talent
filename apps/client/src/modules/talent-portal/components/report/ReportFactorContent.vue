<!--
 * @description 要素解读（S5）：数据熵、天赋解读（固定注解）、适用条件、相关培养方向，
 *   并在本册内循环上一项 / 下一项。分册要素一次取回，翻页不再发请求。
 * @file src/modules/talent-portal/components/report/ReportFactorContent.vue
-->
<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { getTalentReportVolume } from '@/api/talent'
import PortalPageHeader from '@/modules/foundation-portal/components/PortalPageHeader.vue'
import PortalStateView from '@/modules/foundation-portal/components/PortalStateView.vue'
import { useFoundationBack } from '@/modules/foundation-portal/composables/useFoundationBack'
import { useNetworkStatus } from '@/modules/foundation-portal/composables/useNetworkStatus'
import { openPage, PORTAL_ROUTES } from '@/modules/foundation-portal/navigation'
import { triggerHaptic } from '@/utils/haptics'
import ReportStatusCard from './ReportStatusCard.vue'
import { buildReportErrorView, entropyTone } from './report-support'
import type { ReportErrorView } from './report-support'
import type { TalentVolumeResponse } from '@/api/talent-types'

const props = defineProps<{
  reportId: string
  volumeId: string
  /** 分册内 0 起序号，由分册页传入。 */
  index: string | number
}>()

const { goBack } = useFoundationBack('report')

const volume = ref<TalentVolumeResponse | null>(null)
const currentIndex = ref(-1)
const loading = ref(false)
const errorView = ref<ReportErrorView | null>(null)

const factors = computed(() => volume.value?.factors || [])
const factor = computed(() => factors.value[currentIndex.value] || null)
const total = computed(() => factors.value.length)
const volumeName = computed(() => volume.value?.volume.name || '分册')
const chapterName = computed(() => {
  const data = volume.value
  if (!data || currentIndex.value < 0)
    return ''
  const chapter = data.chapters.find(item => item.factorIndexes.includes(currentIndex.value))
  return chapter?.chapter || ''
})
const prevIndex = computed(() => (total.value > 0 ? (currentIndex.value - 1 + total.value) % total.value : 0))
const nextIndex = computed(() => (total.value > 0 ? (currentIndex.value + 1) % total.value : 0))
const positionLabel = computed(() => (total.value > 0 ? `第 ${currentIndex.value + 1} / ${total.value} 项` : ''))
/** 顶部上下文行：章节名与册名重复时只显示一次。 */
const contextLabel = computed(() => {
  const chapter = chapterName.value.replace(/^[A-Z]\s*/, '')
  if (!chapter || chapter === volumeName.value)
    return volumeName.value
  return `${volumeName.value} · ${chapter}`
})
const factorTabs = computed(() => factors.value.map((item, index) => ({ index, name: item.name, label: item.name.replace(/潜质$/, '').slice(0, 8) })))

/** 顶部要素 tab 的滚动锚点：先清空再赋值，保证重复进入同一项时也能重新滚到可见位置。 */
const scrollAnchor = ref('')

/** 把当前要素 tab 滚进可视区：页面首次渲染时节点尚未挂载，必须等 nextTick 后再设置 scroll-into-view。 */
async function syncTabAnchor(): Promise<void> {
  if (currentIndex.value < 0)
    return
  const target = currentIndex.value
  await nextTick()
  if (currentIndex.value !== target)
    return
  scrollAnchor.value = ''
  await nextTick()
  if (currentIndex.value !== target)
    return
  scrollAnchor.value = `factor-tab-${target}`
}

/** 要素数据熵配色。 */
function factorTone(level: string) {
  return entropyTone(level)
}

/** 解析并校验册内序号（0 起且小于本册要素数）。 */
function resolveInitialIndex(): number {
  const parsed = Number(props.index)
  if (!Number.isInteger(parsed) || parsed < 0 || parsed >= total.value)
    return -1
  return parsed
}

/** 本册内切换上一项 / 下一项并回到顶部；不重新请求。 */
function moveTo(index: number): void {
  if (total.value <= 0)
    return
  triggerHaptic('light')
  currentIndex.value = index
  uni.pageScrollTo({ scrollTop: 0, duration: 0 })
  void syncTabAnchor()
}

/** 触摸滑动手势支持：左右滑动自然翻页。 */
let touchStartX = 0
let touchStartY = 0

function handleTouchStart(e: TouchEvent): void {
  const touch = e.touches[0]
  if (touch) {
    touchStartX = touch.clientX
    touchStartY = touch.clientY
  }
}

function handleTouchEnd(e: TouchEvent): void {
  const touch = e.changedTouches[0]
  if (!touch)
    return
  const deltaX = touch.clientX - touchStartX
  const deltaY = touch.clientY - touchStartY
  // 水平位移 > 50px 且明显大于垂直滚动幅度，判定为横向切卡手势
  if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
    if (deltaX < 0)
      moveTo(nextIndex.value)
    else
      moveTo(prevIndex.value)
  }
}

/** 进入相关方向详情（M7-D 页承载方向内容）。 */
function openDirection(directionId: string): void {
  if (!directionId || !props.reportId)
    return
  openPage(
    `${PORTAL_ROUTES.directionDetail}?reportId=${encodeURIComponent(props.reportId)}&directionId=${encodeURIComponent(directionId)}`,
  )
}

/** 拉取分册要素并定位到当前项。 */
async function load(): Promise<void> {
  if (loading.value)
    return
  if (!props.reportId || !props.volumeId) {
    errorView.value = {
      title: '内容不可查看',
      description: '要素参数有误，请返回分册页重新进入。',
      retryable: false,
      notFound: true,
    }
    return
  }
  loading.value = true
  errorView.value = null
  try {
    const response = await getTalentReportVolume(props.reportId, props.volumeId)
    volume.value = response
    const initial = resolveInitialIndex()
    if (initial < 0) {
      errorView.value = {
        title: '要素不存在',
        description: '该要素不存在或已不可查看，请返回分册页重新选择。',
        retryable: false,
        notFound: true,
      }
      return
    }
    currentIndex.value = initial
    await syncTabAnchor()
  }
  catch (error) {
    errorView.value = buildReportErrorView(error)
  }
  finally {
    loading.value = false
  }
}

const { offline } = useNetworkStatus(() => {
  if (!factor.value)
    void load()
})

onMounted(() => {
  void load()
})
</script>

<template>
  <view class="factor-page">
    <PortalPageHeader title="要素解读" @back="goBack" />

    <wd-notice-bar
      v-if="offline"
      type="warning"
      prefix="warn"
      :scrollable="false"
      wrapable
      text="网络已断开，恢复后将自动重试"
      custom-class="factor-page__offline"
    />

    <view
      class="factor-page__body"
      @touchstart="handleTouchStart"
      @touchend="handleTouchEnd"
    >
      <PortalStateView
        v-if="loading && !factor"
        state="loading"
        loading-text="正在加载要素解读…"
      />

      <ReportStatusCard
        v-else-if="errorView"
        :title="errorView.title"
        :description="errorView.description"
        :tone="errorView.notFound ? 'empty' : 'error'"
      >
        <template #actions>
          <wd-button v-if="errorView.retryable" type="primary" size="medium" :loading="loading" @click="load">
            重试
          </wd-button>
          <wd-button variant="soft" size="medium" @click="goBack">
            返回分册
          </wd-button>
        </template>
      </ReportStatusCard>

      <template v-else-if="factor">
        <!-- 要素标题 + 数据熵 -->
        <view class="factor-hero">
          <text class="factor-hero__eyebrow">{{ contextLabel }}</text>
          <view class="factor-hero__title">
            <text class="factor-hero__name">{{ factor.name }}</text>
            <wd-tag
              size="small"
              :color="factorTone(factor.levelName).color"
              :bg-color="factorTone(factor.levelName).background"
            >
              {{ factor.levelName }}
            </wd-tag>
          </view>
        </view>

        <!-- 本册要素快速切换 -->
        <scroll-view
          v-if="total > 1"
          scroll-x
          class="factor-tabs"
          :scroll-into-view="scrollAnchor"
          :scroll-with-animation="true"
          :show-scrollbar="false"
          enable-flex
        >
          <view class="factor-tabs__inner">
            <view
              v-for="item in factorTabs"
              :id="`factor-tab-${item.index}`"
              :key="item.index"
              class="factor-tab"
              :class="{ 'is-active': item.index === currentIndex }"
              role="button"
              tabindex="0"
              :aria-label="`切换到${item.name}`"
              @click="moveTo(item.index)"
              @keyup.enter="moveTo(item.index)"
              @keyup.space.prevent="moveTo(item.index)"
            >
              {{ item.label }}
            </view>
          </view>
        </scroll-view>

        <!-- 天赋解读（固定注解） -->
        <view v-if="factor.note" class="content-card">
          <text class="content-card__label">天赋解读</text>
          <text class="content-card__text">{{ factor.note }}</text>
        </view>

        <!-- 适用条件 -->
        <view v-if="factor.condition" class="content-card">
          <text class="content-card__label">适用条件</text>
          <text class="content-card__text">{{ factor.condition }}</text>
        </view>

        <!-- 相关培养方向 -->
        <view class="content-card">
          <view class="content-card__head">
            <text class="content-card__label">相关培养方向</text>
            <text v-if="factor.relatedDirections.length" class="content-card__meta">
              {{ factor.relatedDirections.length }} 个
            </text>
          </view>
          <view v-if="factor.relatedDirections.length" class="direction-list">
            <view
              v-for="direction in factor.relatedDirections"
              :key="direction.directionId"
              class="direction-row"
              role="button"
              tabindex="0"
              :aria-label="`查看${direction.name}方向详情`"
              @click="openDirection(direction.directionId)"
              @keyup.enter="openDirection(direction.directionId)"
              @keyup.space.prevent="openDirection(direction.directionId)"
            >
              <view class="direction-row__main">
                <text class="direction-row__name">{{ direction.name }}</text>
                <text class="direction-row__meta">命中 {{ direction.hitCount }}/{{ direction.total }} 项</text>
              </view>
              <wd-icon name="right" size="16px" color="var(--foundation-text-muted)" />
            </view>
          </view>
          <text v-else class="content-card__empty">暂无相关方向</text>
        </view>
      </template>
    </view>

    <!-- 底部固定翻页：图标 + 位置，减少按钮文字 -->
    <view v-if="factor" class="factor-pager">
      <view
        class="factor-pager__btn"
        role="button"
        tabindex="0"
        :aria-label="`上一项${factors[prevIndex]?.name || ''}`"
        @click="moveTo(prevIndex)"
        @keyup.enter="moveTo(prevIndex)"
        @keyup.space.prevent="moveTo(prevIndex)"
      >
        <wd-icon name="left" size="20px" color="var(--foundation-text)" />
      </view>
      <text class="factor-pager__position">{{ positionLabel }}</text>
      <view
        class="factor-pager__btn"
        role="button"
        tabindex="0"
        :aria-label="`下一项${factors[nextIndex]?.name || ''}`"
        @click="moveTo(nextIndex)"
        @keyup.enter="moveTo(nextIndex)"
        @keyup.space.prevent="moveTo(nextIndex)"
      >
        <wd-icon name="right" size="20px" color="var(--foundation-text)" />
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.factor-page {
  min-height: 100vh;
  background: var(--foundation-background);
}
.factor-page__offline {
  --wot-notice-bar-padding: 8px var(--foundation-page-padding);
}

.factor-tabs {
  width: 100%;
  white-space: nowrap;
}
.factor-tabs__inner {
  display: inline-flex;
  gap: 8px;
  padding: 2px 0;
}
.factor-tab {
  display: inline-flex;
  flex: 0 0 auto;
  max-width: 140px;
  min-height: 34px;
  align-items: center;
  padding: 0 12px;
  overflow: hidden;
  border: 1px solid var(--foundation-border);
  border-radius: 999px;
  background: var(--foundation-card);
  box-shadow: 0 1px 2px rgba(31, 45, 40, 0.03);
  color: var(--foundation-text-secondary);
  font-size: var(--fs-caption);
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: all 140ms ease;
}
.factor-tab:active {
  transform: scale(0.96);
}
.factor-tab.is-active {
  border-color: var(--foundation-interactive);
  background: var(--foundation-interactive);
  color: var(--foundation-on-primary, #fff);
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(47, 111, 94, 0.24);
}
.factor-pager {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  min-height: 56px;
  padding: 0 var(--foundation-page-padding) env(safe-area-inset-bottom);
  background: var(--foundation-card);
  box-shadow: var(--foundation-shadow-bar);
}
.factor-pager__btn {
  display: flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--foundation-border);
  border-radius: 50%;
  background: var(--foundation-surface);
  box-shadow: 0 2px 6px rgba(31, 45, 40, 0.05);
  transition: transform 140ms ease, background-color 140ms ease;
}
.factor-pager__btn:active {
  background: var(--foundation-card-subtle);
  transform: scale(0.92);
}
.factor-pager__position {
  min-width: 72px;
  color: var(--foundation-text-secondary);
  font-size: var(--fs-caption);
  font-weight: var(--fw-medium);
  text-align: center;
}
.factor-page__body {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--foundation-page-padding) calc(96px + env(safe-area-inset-bottom));
  box-sizing: border-box;
}
.factor-hero {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--sp-4);
  border: 1px solid var(--foundation-border);
  border-radius: var(--foundation-radius);
  background: var(--foundation-card);
  box-shadow: var(--foundation-shadow);
}
.factor-hero__eyebrow {
  color: var(--foundation-text-muted);
  font-size: var(--fs-caption);
  line-height: 1.5;
}
.factor-hero__title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--sp-2);
}
.factor-hero__name {
  color: var(--foundation-text);
  font-size: var(--fs-hero);
  font-weight: var(--fw-semibold);
  line-height: 1.35;
}
.content-card {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  padding: var(--sp-4);
  border: 1px solid var(--foundation-border);
  border-radius: var(--foundation-radius);
  background: var(--foundation-card);
  box-shadow: var(--foundation-shadow);
}
.content-card__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--sp-2);
}
.content-card__label {
  color: var(--foundation-text);
  font-size: var(--fs-body-lg);
  font-weight: var(--fw-semibold);
}
.content-card__meta {
  color: var(--foundation-text-muted);
  font-size: var(--fs-tag);
}
.content-card__text {
  color: var(--foundation-text-secondary);
  font-size: var(--fs-body);
  line-height: 1.8;
  overflow-wrap: break-word;
}
.content-card__empty {
  color: var(--foundation-text-muted);
  font-size: var(--fs-sm);
  line-height: 1.7;
}
.direction-list {
  display: flex;
  flex-direction: column;
}
.direction-row {
  display: flex;
  min-height: 48px;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) 0;
  border-top: 1px solid var(--foundation-hairline);
}
.direction-row:first-child {
  border-top: 0;
}
.direction-row:active {
  opacity: 0.8;
}
.direction-row__main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}
.direction-row__name {
  color: var(--foundation-text);
  font-size: var(--fs-body);
  font-weight: var(--fw-semibold);
}
.direction-row__meta {
  color: var(--foundation-text-muted);
  font-size: var(--fs-tag);
}
</style>
