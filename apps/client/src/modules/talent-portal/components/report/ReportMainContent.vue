<!--
 * @description 报告主栏内容（T2）：页签（基因报告 / 培育建议）
 *   + 状态卡 + 固定六册目录 + 按分册建议入口。
 *   数据只来自 M7-B 的 summary / reports / advice 接口；对象切换后按 reportId 重新请求。
 * @file src/modules/talent-portal/components/report/ReportMainContent.vue
-->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { getTalentAdvice, getTalentReport } from '@/api/talent'
import { apiErrorStatus } from '@/http/http'
import { useNetworkStatus } from '@/modules/foundation-portal/composables/useNetworkStatus'
import { openPage, PORTAL_ROUTES, switchTab } from '@/modules/foundation-portal/navigation'
import { adviceBookAvailable, adviceBookMeta, adviceBookStateLabel } from '@/modules/talent-portal/advice-book-state'
import { useTalentSession } from '@/modules/talent-portal/composables/useTalentSession'
import { volumeLetter } from '@/modules/talent-portal/volume-label'
import { useSiteStore } from '@/store/site'
import { useTalentPortalStore } from '@/store/talent-portal'
import ReportStatusCard from './ReportStatusCard.vue'
import {
  buildReportErrorView,
  buildReportStatusView,
  subjectHasReadableReport,
} from './report-support'
import type { ReportErrorView } from './report-support'
import type {
  TalentAdviceBook,
  TalentAdviceResponse,
  TalentReportOverviewResponse,
  TalentReportVolumeSummary,
} from '@/api/talent-types'

const props = withDefaults(defineProps<{
  /** 主栏深链 `?tab=advice` 时直接落在培育建议页签。 */
  initialTab?: 'report' | 'advice'
}>(), { initialTab: 'report' })

const store = useTalentPortalStore()
const siteStore = useSiteStore()
const session = useTalentSession()

type ReportTabKey = 'report' | 'advice'

/** 首屏骨架延迟阈值：避免 300ms 内完成的请求闪烁。 */
const SKELETON_DELAY_MS = 300

const tab = ref<ReportTabKey>(props.initialTab === 'advice' ? 'advice' : 'report')
const overview = ref<TalentReportOverviewResponse | null>(null)
const advice = ref<TalentAdviceResponse | null>(null)
const loading = ref(false)
const adviceLoading = ref(false)
const adviceFailed = ref('')
const errorView = ref<ReportErrorView | null>(null)
const reClaiming = ref(false)
const skeletonReady = ref(false)
let skeletonTimer: ReturnType<typeof setTimeout> | undefined

const current = computed(() => store.current)
const contactPhone = computed(() => siteStore.site.contactPhone || '')
const readable = computed(() => subjectHasReadableReport(current.value))
const reportId = computed(() => current.value?.reportId || '')
const statusView = computed(() => buildReportStatusView(current.value))
const volumes = computed(() => overview.value?.volumes || [])
const reportTabCount = computed(() => {
  if (!readable.value)
    return 0
  return overview.value?.report.readableVolumeCount ?? current.value?.readableVolumeCount ?? 0
})
const volumeHeaderText = computed(() => {
  if (overview.value)
    return overview.value.report.volumeHeaderText
  const total = current.value?.totalVolumeCount || 6
  const readableCount = reportTabCount.value
  return readableCount >= total ? `${total} 册` : `共 ${total} 册 · ${readableCount} 册可读`
})
const adviceBooks = computed(() => advice.value?.books || [])
const adviceEmptyText = computed(() => advice.value?.emptyText || '暂未收到培育建议')
const showSkeleton = computed(() => !store.resolved && skeletonReady.value)
/** 报告不可读时给「去孩子管理」的引导条件。 */
const showChildrenAction = computed(() => statusView.value.showChildren)

/** 本机记住的对象在本次请求后是否仍可查看；失效时 summary 已回退并以 toast 提示。 */

function clearSkeletonTimer(): void {
  if (skeletonTimer) {
    clearTimeout(skeletonTimer)
    skeletonTimer = undefined
  }
}

/** 切换主栏页签；首次进入培育建议时按需拉取建议。 */
function handleTabChange(event: { index: number, name: number | string }): void {
  const next: ReportTabKey = event.name === 'advice' ? 'advice' : 'report'
  if (next === tab.value)
    return
  tab.value = next
  if (next === 'advice')
    void loadAdvice()
}

/** 进入分册页（仅可读册）。 */
function openVolume(volume: TalentReportVolumeSummary): void {
  if (volume.state !== 'readable' || !reportId.value)
    return
  openPage(
    `${PORTAL_ROUTES.reportVolume}?reportId=${encodeURIComponent(reportId.value)}&volumeId=${encodeURIComponent(volume.volumeId)}`,
  )
}

/** 进入建议书详情（仅已发布且已同步到正文的册）。 */
function openAdviceBook(book: TalentAdviceBook): void {
  if (!reportId.value || !adviceBookAvailable(book))
    return
  openPage(
    `${PORTAL_ROUTES.adviceDetail}?reportId=${encodeURIComponent(reportId.value)}&book=${encodeURIComponent(book.book)}`,
  )
}

/** 分册行副文案（未开放 / 未检测给固定说明，不展示分册编码）。 */
function volumeMetaOf(volume: TalentReportVolumeSummary): string {
  if (volume.state === 'readable')
    return `${volume.chapterCount} 章 · ${volume.factorCount} 项要素`
  if (volume.state === 'not_open')
    return '分册未开放，暂不可查看'
  return '本次未检测该分册'
}

/** 未开放 / 未检测册的灰色标签。 */
function volumeTagOf(volume: TalentReportVolumeSummary): string {
  return volume.state === 'not_open' ? '未开放' : '未做报告'
}

/** 拉取当前对象的报告总览；不可读时只渲染状态卡。 */
async function load(): Promise<void> {
  if (loading.value)
    return
  loading.value = true
  errorView.value = null
  adviceFailed.value = ''
  clearSkeletonTimer()
  skeletonTimer = setTimeout(() => {
    skeletonReady.value = true
  }, SKELETON_DELAY_MS)
  try {
    await session.ensureSession({ force: true })
    if (store.isParentDisabled) {
      uni.reLaunch({ url: `${PORTAL_ROUTES.locked}?reason=parent_disabled` })
      return
    }
    overview.value = null
    advice.value = null
    if (!readable.value)
      return
    const targetReportId = reportId.value
    if (tab.value === 'advice')
      void loadAdvice()
    try {
      const response = await getTalentReport(targetReportId)
      if (targetReportId === reportId.value)
        overview.value = response
    }
    catch (error) {
      if (targetReportId === reportId.value)
        errorView.value = buildReportErrorView(error)
    }
  }
  finally {
    loading.value = false
    clearSkeletonTimer()
  }
}

/** 拉取培育建议（按分册）；报告不可读时不发请求。 */
async function loadAdvice(force = false): Promise<void> {
  if (!readable.value || !reportId.value || adviceLoading.value)
    return
  if (advice.value && !force)
    return
  adviceLoading.value = true
  adviceFailed.value = ''
  try {
    advice.value = await getTalentAdvice(reportId.value)
  }
  catch (error) {
    if (apiErrorStatus(error) === 409) {
      errorView.value = buildReportErrorView(error)
      return
    }
    adviceFailed.value = '培育建议暂时无法读取，请稍后重试'
  }
  finally {
    adviceLoading.value = false
  }
}

/** 手动重试当前对象（报告总览与建议一起刷新）。 */
function retry(): void {
  advice.value = null
  void load()
}

/** 未关联会员档案时重新匹配。 */
async function reClaim(): Promise<void> {
  if (reClaiming.value)
    return
  reClaiming.value = true
  try {
    await session.reClaim()
    if (!store.hasSubject)
      uni.showToast({ title: '仍未匹配到会员档案，请联系客服', icon: 'none' })
    else
      void load()
  }
  finally {
    reClaiming.value = false
  }
}

/** 拨打站点客服电话（未配置时隐藏入口）。 */
function callService(): void {
  if (!contactPhone.value)
    return
  uni.makePhoneCall({ phoneNumber: contactPhone.value })
}

/** 前往孩子管理核对信息。 */
function openChildren(): void {
  openPage(PORTAL_ROUTES.profileChildren)
}

const { offline } = useNetworkStatus(() => {
  if (store.hasSubject)
    retry()
})

onMounted(() => {
  void load()
})

onUnmounted(() => {
  clearSkeletonTimer()
})

defineExpose({ reload: load })
</script>

<template>
  <view class="report-main">
    <wd-notice-bar
      v-if="offline"
      type="warning"
      prefix="warn"
      :scrollable="false"
      wrapable
      text="网络已断开，恢复后将自动重试"
      custom-class="report-main__offline"
    />

    <!-- 首屏骨架 -->
    <view v-if="showSkeleton" class="report-main__skeleton" role="status" aria-label="正在加载报告">
      <view class="skeleton-card">
        <wd-skeleton :row-col="[[{ size: '44px', type: 'rect' }, { width: '50%', marginLeft: '12px' }], { width: '35%' }]" animation="gradient" />
      </view>
      <view class="skeleton-card">
        <wd-skeleton theme="paragraph" animation="gradient" />
      </view>
      <view class="skeleton-card">
        <wd-skeleton theme="paragraph" :row-col="[{ width: '40%' }, { width: '100%' }, { width: '100%' }, { width: '100%' }]" animation="gradient" />
      </view>
    </view>

    <template v-else>
      <!-- 未关联会员档案 -->
      <ReportStatusCard
        v-if="!store.hasSubject && store.isUnbound"
        title="暂未关联会员档案"
        description="请确认手机号与后台登记一致；如仍未匹配，请联系客服核对会员档案。"
        tone="empty"
        icon="user"
      >
        <template #actions>
          <wd-button type="primary" size="medium" :loading="reClaiming" @click="reClaim">
            重新匹配
          </wd-button>
          <wd-button v-if="contactPhone" variant="soft" size="medium" @click="callService">
            联系客服
          </wd-button>
        </template>
      </ReportStatusCard>

      <!-- 对象读取失败 -->
      <ReportStatusCard
        v-else-if="!store.hasSubject && store.errorMessage"
        title="报告对象暂时无法读取"
        description="请检查网络连接后重试；若持续失败，请联系客服核对会员档案。"
        tone="error"
      >
        <template #actions>
          <wd-button type="primary" size="medium" @click="retry">
            重试
          </wd-button>
        </template>
      </ReportStatusCard>

      <template v-else-if="store.hasSubject">
        <!-- 页签：基因报告（可读册数）/ 培育建议（份数） -->
        <wd-tabs
          :model-value="tab"
          sticky
          custom-class="report-main__tabs"
          @change="handleTabChange"
        >
          <wd-tab name="report" title="基因报告" />
          <wd-tab name="advice" title="培育建议" />
        </wd-tabs>

        <!-- 基因报告页签 -->
        <template v-if="tab === 'report'">
          <view v-if="loading && readable && !overview && !errorView" class="report-main__inline" role="status">
            <wd-loading size="24px" color="var(--foundation-interactive)" />
            <text class="report-main__inline-text">正在加载分册…</text>
          </view>

          <ReportStatusCard
            v-else-if="errorView"
            :title="errorView.title"
            :description="errorView.description"
            tone="error"
          >
            <template #actions>
              <wd-button v-if="errorView.retryable" type="primary" size="medium" @click="retry">
                刷新
              </wd-button>
              <wd-button v-else variant="soft" size="medium" @click="switchTab('profile')">
                去我的切换
              </wd-button>
            </template>
          </ReportStatusCard>

          <ReportStatusCard
            v-else-if="!readable"
            :title="statusView.title"
            :description="statusView.description"
            tone="pending"
          >
            <template #actions>
              <wd-button type="primary" size="medium" :loading="loading" @click="retry">
                刷新
              </wd-button>
              <wd-button v-if="showChildrenAction" variant="soft" size="medium" @click="openChildren">
                去孩子管理
              </wd-button>
            </template>
          </ReportStatusCard>

          <template v-else>
            <view class="volume-block">
              <view class="section-head">
                <text class="section-head__title">分册目录</text>
                <text class="section-head__meta">{{ volumeHeaderText }}</text>
              </view>
              <view class="volume-list">
                <view
                  v-for="(volume, index) in volumes"
                  :key="volume.volumeId"
                  class="volume-row"
                  :class="{ 'volume-row--disabled': volume.state !== 'readable' }"
                  :role="volume.state === 'readable' ? 'button' : 'listitem'"
                  :tabindex="volume.state === 'readable' ? 0 : undefined"
                  :aria-label="volume.state === 'readable' ? `查看${volume.name}分册` : `${volume.name}${volumeTagOf(volume)}`"
                  @click="openVolume(volume)"
                  @keyup.enter="openVolume(volume)"
                  @keyup.space.prevent="openVolume(volume)"
                >
                  <text class="volume-row__no">{{ volumeLetter(index + 1) }}</text>
                  <view class="volume-row__main">
                    <view class="volume-row__title">
                      <text class="volume-row__name">{{ volume.name }}</text>
                      <text v-if="volume.state !== 'readable'" class="volume-row__tag">{{ volumeTagOf(volume) }}</text>
                    </view>
                    <text class="volume-row__meta">{{ volumeMetaOf(volume) }}</text>
                  </view>
                  <wd-icon
                    v-if="volume.state === 'readable'"
                    name="arrow-right"
                    size="16px"
                    color="var(--foundation-text-muted)"
                  />
                </view>
                <view v-if="!volumes.length" class="volume-block__empty">
                  <text class="volume-block__empty-text">报告分册正在整理，请稍后刷新</text>
                </view>
              </view>
            </view>
          </template>
        </template>

        <!-- 培育建议页签 -->
        <template v-else>
          <view v-if="adviceLoading && !advice" class="report-main__inline" role="status">
            <wd-loading size="24px" color="var(--foundation-interactive)" />
            <text class="report-main__inline-text">正在加载培育建议…</text>
          </view>

          <ReportStatusCard
            v-else-if="errorView"
            :title="errorView.title"
            :description="errorView.description"
            tone="error"
          >
            <template #actions>
              <wd-button v-if="errorView.retryable" type="primary" size="medium" @click="retry">
                刷新
              </wd-button>
              <wd-button v-else variant="soft" size="medium" @click="switchTab('profile')">
                去我的切换
              </wd-button>
            </template>
          </ReportStatusCard>

          <ReportStatusCard
            v-else-if="!readable"
            :title="statusView.title"
            :description="statusView.description"
            tone="pending"
          >
            <template #actions>
              <wd-button type="primary" size="medium" :loading="loading" @click="retry">
                刷新
              </wd-button>
              <wd-button v-if="showChildrenAction" variant="soft" size="medium" @click="openChildren">
                去孩子管理
              </wd-button>
            </template>
          </ReportStatusCard>

          <ReportStatusCard
            v-else-if="adviceFailed"
            title="培育建议暂时无法读取"
            :description="adviceFailed"
            tone="error"
          >
            <template #actions>
              <wd-button type="primary" size="medium" @click="loadAdvice(true)">
                重试
              </wd-button>
            </template>
          </ReportStatusCard>

          <ReportStatusCard
            v-else-if="advice && !advice.available"
            :title="adviceEmptyText"
            description="建议与报告同时发布，按分册推送。"
            tone="empty"
          >
            <template #actions>
              <wd-button variant="soft" size="medium" @click="handleTabChange({ index: 0, name: 'report' })">
                查看基因报告
              </wd-button>
            </template>
          </ReportStatusCard>

          <template v-else-if="advice && advice.books?.length">
            <view class="volume-list">
              <view
                v-for="book in adviceBooks"
                :key="book.book"
                class="volume-row"
                :class="{ 'volume-row--disabled': !adviceBookAvailable(book) }"
                :role="adviceBookAvailable(book) ? 'button' : undefined"
                :tabindex="adviceBookAvailable(book) ? 0 : undefined"
                :aria-label="adviceBookAvailable(book)
                  ? `查看${book.book}分册培育建议`
                  : `${book.bookName}${adviceBookStateLabel(book.state)}`"
                @click="openAdviceBook(book)"
                @keyup.enter="openAdviceBook(book)"
                @keyup.space.prevent="openAdviceBook(book)"
              >
                <text class="volume-row__no">{{ book.book }}</text>
                <view class="volume-row__main">
                  <view class="volume-row__title">
                    <text class="volume-row__name">{{ book.bookName }}</text>
                    <text v-if="!adviceBookAvailable(book)" class="volume-row__tag">{{ adviceBookStateLabel(book.state) }}</text>
                  </view>
                  <text class="volume-row__meta">{{ adviceBookMeta(book) }}</text>
                </view>
                <wd-icon
                  v-if="adviceBookAvailable(book)"
                  name="arrow-right"
                  size="16px"
                  color="var(--foundation-text-muted)"
                />
              </view>
            </view>
          </template>
        </template>
      </template>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.report-main {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-2) var(--foundation-page-padding) var(--foundation-page-bottom);
  box-sizing: border-box;
}
.report-main__offline {
  margin: 0 calc(-1 * var(--foundation-page-padding));
  --wot-notice-bar-padding: 8px var(--foundation-page-padding);
}
.report-main__skeleton {
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
.report-main__inline {
  display: flex;
  min-height: 120px;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
}
.report-main__inline-text {
  color: var(--foundation-text-secondary);
  font-size: var(--fs-sm);
}
.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--sp-2);
  padding: 0 var(--sp-1);
}
.section-head__title {
  color: var(--foundation-text-secondary);
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
}
.section-head__meta {
  color: var(--foundation-text-muted);
  font-size: var(--fs-caption);
}
.report-main__tabs {
  --wot-tabs-nav-bg: var(--foundation-background);
}
.volume-block {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}
/* 分册目录与建议列表：单列列表，一张白卡包住多行、行间分隔线；A-F 字母块 + 名称 + meta + 箭头。 */
.volume-list {
  overflow: hidden;
  border: 1px solid var(--foundation-border);
  border-radius: var(--foundation-radius);
  background: var(--foundation-card);
  box-shadow: var(--foundation-shadow);
}
.volume-row {
  display: flex;
  min-height: 68px;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-4);
  border-bottom: 1px solid var(--foundation-hairline);
  box-sizing: border-box;
  transition: background-color 140ms ease;
}
.volume-row:last-child {
  border-bottom: 0;
}
.volume-row:active {
  background: var(--foundation-card-subtle);
}
.volume-row--disabled {
  background: var(--foundation-card-subtle);
}
.volume-row__no {
  display: flex;
  width: 32px;
  height: 32px;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--foundation-primary-tint) 0%, #d8ece2 100%);
  color: var(--foundation-primary-deep);
  font-size: var(--fs-body);
  font-weight: var(--fw-bold);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
}
.volume-row--disabled .volume-row__no {
  background: var(--foundation-disabled-bg);
  color: var(--foundation-text-muted);
  box-shadow: none;
}
.volume-row__main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 3px;
}
.volume-row__title {
  display: flex;
  align-items: center;
  gap: 6px;
}
.volume-row__name {
  overflow: hidden;
  color: var(--foundation-text);
  font-size: var(--fs-body-lg);
  font-weight: var(--fw-semibold);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.volume-row--disabled .volume-row__name {
  color: var(--foundation-text-secondary);
}
.volume-row__tag {
  flex: none;
  padding: 1px 7px;
  border: 1px solid var(--foundation-hairline);
  border-radius: 999px;
  background: var(--foundation-surface);
  color: var(--foundation-text-muted);
  font-size: var(--fs-tag);
  line-height: 1.6;
}
.volume-row__meta {
  overflow: hidden;
  color: var(--foundation-text-muted);
  font-size: var(--fs-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.volume-block__empty {
  padding: var(--sp-5) var(--sp-4);
  text-align: center;
}
.volume-block__empty-text {
  color: var(--foundation-text-muted);
  font-size: var(--fs-sm);
}
</style>
