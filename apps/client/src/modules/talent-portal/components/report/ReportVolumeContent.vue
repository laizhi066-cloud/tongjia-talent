<!--
 * @description 分册页（S4）：分册总览 + 数据熵筛选 + 章节/要素列表（含固定注解摘要与相关方向数）
 *   + 本册 PDF 下载。
 *   数据来自 M7-B 的 reports/:id 与 volumes/:volumeId；PDF 走 M8-A ticket + 权限代理。
 * @file src/modules/talent-portal/components/report/ReportVolumeContent.vue
-->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getTalentReportVolume } from '@/api/talent'
import {
  apiErrorCode,
  apiErrorStatus,
  post,
  resolveClientApiUrl,
} from '@/http/http'
import PortalPageHeader from '@/modules/foundation-portal/components/PortalPageHeader.vue'
import PortalStateView from '@/modules/foundation-portal/components/PortalStateView.vue'
import { useFoundationBack } from '@/modules/foundation-portal/composables/useFoundationBack'
import { useNetworkStatus } from '@/modules/foundation-portal/composables/useNetworkStatus'
import { openPage, PORTAL_ROUTES } from '@/modules/foundation-portal/navigation'
import { volumeLetter } from '@/modules/talent-portal/volume-label'
import ReportStatusCard from './ReportStatusCard.vue'
import {
  buildReportErrorView,
  entropyTone,
  readVolumeFilter,
  writeVolumeFilter,
} from './report-support'
import type { ReportErrorView } from './report-support'
import type {
  TalentVolumeFactor,
  TalentVolumeResponse,
} from '@/api/talent-types'

const props = defineProps<{
  reportId: string
  volumeId: string
}>()

/** 可进入的分册键：服务端固定 V1–V6（不展示分册字母）。 */
const VALID_VOLUME_IDS = new Set(['V1', 'V2', 'V3', 'V4', 'V5', 'V6'])

const { goBack } = useFoundationBack('report')

const volume = ref<TalentVolumeResponse | null>(null)
const loading = ref(false)
const errorView = ref<ReportErrorView | null>(null)
const activeEntropy = ref('')
const pdfBusy = ref(false)
const pdfError = ref('')

const volumeName = computed(() => volume.value?.volume.name || '分册')
const invalidParam = computed(() => !props.reportId || !VALID_VOLUME_IDS.has(props.volumeId))

const entropyFilters = computed(() => {
  const data = volume.value
  if (!data)
    return []
  return [
    { name: '', label: '全部', count: data.factors.length },
    ...data.entropyOptions.map(item => ({ name: item.name, label: item.name, count: item.count })),
  ]
})

const chapterGroups = computed(() => {
  const data = volume.value
  if (!data)
    return []
  return data.chapters
    .map((chapter) => {
      const factors = chapter.factorIndexes
        .map(index => data.factors[index])
        .filter((factor): factor is TalentVolumeFactor =>
          Boolean(factor) && (!activeEntropy.value || factor.levelName === activeEntropy.value))
      return { chapter: chapter.chapter, factors }
    })
    .filter(group => group.factors.length > 0)
})

const currentSortOrder = computed(() => volume.value?.volume.sortOrder || 0)

/** 分册参数不合法时的状态卡：不发起越权请求。 */
const paramErrorView: ReportErrorView = {
  title: '内容不可查看',
  description: '分册参数有误，请返回报告页重新进入。',
  retryable: false,
  notFound: true,
}

/** 要素行数据熵配色。 */
function factorTone(level: string) {
  return entropyTone(level)
}

/** 要素行相关方向摘要（最多列两个名称，其余给数量）。 */
function directionSummaryOf(factor: TalentVolumeFactor): string {
  const names = factor.relatedDirections.map(item => item.name).filter(Boolean)
  if (!names.length)
    return ''
  const head = names.slice(0, 2).join('、')
  return names.length > 2 ? `相关方向：${head} 等 ${names.length} 个` : `相关方向：${head}`
}

/** 切换数据熵筛选；再点已选项即取消，并按分册记忆。 */
function toggleEntropy(name: string): void {
  activeEntropy.value = activeEntropy.value === name ? '' : name
  writeVolumeFilter(props.volumeId, activeEntropy.value)
}

/** 进入要素解读（本册内 0 起序号）。 */
function openFactor(factor: TalentVolumeFactor): void {
  if (!volume.value)
    return
  openPage(
    `${PORTAL_ROUTES.reportFactor}?reportId=${encodeURIComponent(props.reportId)}&volumeId=${encodeURIComponent(props.volumeId)}&index=${factor.index}`,
  )
}

/** 拉取分册要素。 */
async function load(): Promise<void> {
  if (loading.value)
    return
  if (invalidParam.value) {
    errorView.value = paramErrorView
    return
  }
  loading.value = true
  errorView.value = null
  try {
    const result = await getTalentReportVolume(props.reportId, props.volumeId)
    volume.value = result
    const remembered = readVolumeFilter(props.volumeId)
    activeEntropy.value = remembered && result.entropyOptions.some(item => item.name === remembered)
      ? remembered
      : ''
  }
  catch (error) {
    errorView.value = buildReportErrorView(error)
  }
  finally {
    loading.value = false
  }
}

// ── 本册 PDF（M8-A ticket + 权限代理） ──────────────────────────────────────

interface PdfTicketResponse {
  url: string
  expiresAt: string
  ttlSeconds: number
}

/** 申请 120s 下载 ticket；PDF_NOT_READY 等错误码由下方统一转成可读文案。 */
function requestPdfTicket(): Promise<PdfTicketResponse> {
  return post<PdfTicketResponse>(
    `/api/client/talent/reports/${encodeURIComponent(props.reportId)}/volumes/${encodeURIComponent(props.volumeId)}/pdf-ticket`,
    {},
    { hideErrorToast: true },
  )
}

// #ifdef MP-WEIXIN
/** 小程序：下载临时文件后再交给系统文档预览。 */
function downloadPdfFile(url: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    uni.downloadFile({
      url,
      success: (result) => {
        if (result.statusCode === 200 && result.tempFilePath)
          resolve(result.tempFilePath)
        else
          reject(new Error('pdf download failed'))
      },
      fail: reject,
    })
  })
}

/** 小程序：打开已下载的 PDF。 */
function openPdfDocument(filePath: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    uni.openDocument({
      filePath,
      fileType: 'pdf',
      showMenu: true,
      success: () => resolve(),
      fail: reject,
    })
  })
}
// #endif

/** PDF 失败文案：M8 前 / 渲染关闭按 §11.2 降级，不展示技术错误。 */
function pdfErrorMessage(error: unknown): string {
  const code = apiErrorCode(error)
  if (code === 'PDF_NOT_READY')
    return '本册 PDF 暂不可下载'
  if (code === 'PDF_DOWNLOAD_LIMIT')
    return '下载过于频繁，请稍后重试'
  if (apiErrorStatus(error) === 404 || apiErrorStatus(error) === 409)
    return '本册 PDF 暂不可下载'
  return '文件下载失败，请重试'
}

/** 下载 / 打开本册 PDF：小程序走 downloadFile + openDocument，H5 新窗口打开 ticket 地址。 */
async function downloadPdf(): Promise<void> {
  if (pdfBusy.value)
    return
  pdfBusy.value = true
  pdfError.value = ''
  // H5 需在用户点击的同步调用栈内先占住新窗口，避免异步请求后被浏览器拦截。
  let h5Window: Window | null = null
  // #ifdef H5
  h5Window = window.open('', '_blank')
  // #endif
  try {
    const ticket = await requestPdfTicket()
    const target = resolveClientApiUrl(ticket.url)
    // #ifdef MP-WEIXIN
    const filePath = await downloadPdfFile(target)
    await openPdfDocument(filePath)
    // #endif
    // #ifdef H5
    if (h5Window)
      h5Window.location.href = target
    else
      pdfError.value = '浏览器已拦截新窗口，请允许弹出窗口后重试'
    // #endif
  }
  catch (error) {
    // #ifdef H5
    h5Window?.close()
    // #endif
    pdfError.value = pdfErrorMessage(error)
  }
  finally {
    pdfBusy.value = false
  }
}

/** 返回报告主栏（保留页签由来源页 onShow 处理）。 */
function backToReport(): void {
  goBack()
}

const { offline } = useNetworkStatus(() => {
  if (!volume.value)
    void load()
})

onMounted(() => {
  void load()
})
</script>

<template>
  <view class="volume-page">
    <PortalPageHeader :title="volumeName" @back="goBack" />

    <wd-notice-bar
      v-if="offline"
      type="warning"
      prefix="warn"
      :scrollable="false"
      wrapable
      text="网络已断开，恢复后将自动重试"
      custom-class="volume-page__offline"
    />

    <view class="volume-page__body">
      <PortalStateView
        v-if="loading && !volume"
        state="loading"
        loading-text="正在加载分册…"
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
          <wd-button variant="soft" size="medium" @click="backToReport">
            返回报告
          </wd-button>
        </template>
      </ReportStatusCard>

      <template v-else-if="volume">
        <!-- 分册元信息（册名已由导航栏承载，避免重复） -->
        <text class="volume-meta">
          {{ volumeLetter(currentSortOrder) }} 分册 · {{ volume.volume.chapterCount }} 章 · {{ volume.volume.factorCount }} 项要素
        </text>

        <!-- 数据熵筛选：再点取消，按分册记忆 -->
        <view class="entropy-bar" role="group" aria-label="按数据熵筛选">
          <view
            v-for="option in entropyFilters"
            :key="option.name || 'all'"
            class="chip"
            :class="{ 'chip--active': activeEntropy === option.name }"
            :style="option.name && activeEntropy === option.name
              ? { color: factorTone(option.name).color, background: factorTone(option.name).background, borderColor: factorTone(option.name).color }
              : {}"
            role="button"
            tabindex="0"
            :aria-pressed="activeEntropy === option.name"
            :aria-label="`筛选${option.label}，${option.count} 项`"
            @click="toggleEntropy(option.name)"
            @keyup.enter="toggleEntropy(option.name)"
            @keyup.space.prevent="toggleEntropy(option.name)"
          >
            <text class="chip__label">{{ option.label }}</text>
            <text class="chip__count">{{ option.count }}</text>
          </view>
        </view>

        <!-- 章节 + 要素列表 -->
        <template v-if="chapterGroups.length">
          <view v-for="group in chapterGroups" :key="group.chapter" class="chapter">
            <view v-if="chapterGroups.length > 1" class="chapter__head">
              <text class="chapter__name">{{ group.chapter }}</text>
              <text class="chapter__count">{{ group.factors.length }} 项</text>
            </view>
            <view class="chapter__card">
              <view
                v-for="factor in group.factors"
                :key="factor.index"
                class="factor-row"
                role="button"
                tabindex="0"
                :aria-label="`查看${factor.name}的要素解读`"
                @click="openFactor(factor)"
                @keyup.enter="openFactor(factor)"
                @keyup.space.prevent="openFactor(factor)"
              >
                <view class="factor-row__main">
                  <view class="factor-row__title">
                    <text class="factor-row__name">{{ factor.name }}</text>
                    <wd-tag
                      size="small"
                      :color="factorTone(factor.levelName).color"
                      :bg-color="factorTone(factor.levelName).background"
                    >
                      {{ factor.levelName }}
                    </wd-tag>
                  </view>
                  <text v-if="factor.note" class="factor-row__note">{{ factor.note }}</text>
                  <text v-if="factor.relatedDirections.length" class="factor-row__dirs">
                    {{ directionSummaryOf(factor) }}
                  </text>
                </view>
                <wd-icon name="right" size="16px" color="var(--foundation-text-muted)" />
              </view>
            </view>
          </view>
        </template>

        <PortalStateView
          v-else
          state="empty"
          :title="activeEntropy ? `「${activeEntropy}」等级下没有要素` : '本册暂无要素内容'"
          :message="activeEntropy ? '可切换其他数据熵等级，或查看全部要素。' : '内容由检测机构同步，稍后刷新再试。'"
          icon="file"
        >
          <template v-if="activeEntropy" #actions>
            <wd-button variant="soft" size="medium" @click="toggleEntropy(activeEntropy)">
              查看全部要素
            </wd-button>
          </template>
        </PortalStateView>
      </template>
    </view>

    <!-- 底部固定操作条：本册 PDF + 安全区 -->
    <view v-if="volume && !errorView" class="action-bar">
      <wd-button type="primary" size="large" block :loading="pdfBusy" :disabled="pdfBusy" @click="downloadPdf">
        预览 / 下载本册 PDF
      </wd-button>
      <text v-if="pdfError" class="action-bar__error" role="alert">{{ pdfError }}</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.volume-page {
  min-height: 100vh;
  background: var(--foundation-background);
}
.volume-page__offline {
  --wot-notice-bar-padding: 8px var(--foundation-page-padding);
}
.volume-page__body {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--foundation-page-padding) calc(120px + env(safe-area-inset-bottom));
  box-sizing: border-box;
}
.volume-meta {
  padding: 0 var(--sp-1);
  color: var(--foundation-text-muted);
  font-size: var(--fs-tag);
  line-height: 1.6;
}
.entropy-bar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
}
.chip {
  display: flex;
  min-height: 40px;
  align-items: center;
  gap: 4px;
  padding: 0 14px;
  border: 1px solid var(--foundation-border);
  border-radius: 999px;
  background: var(--foundation-card);
  box-shadow: 0 1px 3px rgba(31, 45, 40, 0.03);
  box-sizing: border-box;
  transition: transform 140ms ease, background-color 140ms ease, border-color 140ms ease;
}
.chip:active {
  transform: scale(0.96);
}
.chip--active {
  border-color: var(--foundation-interactive);
  background: var(--foundation-surface);
  color: var(--foundation-interactive);
  font-weight: var(--fw-medium);
}
.chip__label {
  font-size: var(--fs-sm);
}
.chip__count {
  font-size: var(--fs-tag);
  opacity: 0.72;
}
.chapter {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}
.chapter__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--sp-2);
  padding: 0 var(--sp-1);
}
.chapter__name {
  color: var(--foundation-text);
  font-size: var(--fs-body);
  font-weight: var(--fw-semibold);
  line-height: 1.5;
}
.chapter__count {
  flex: none;
  color: var(--foundation-text-muted);
  font-size: var(--fs-tag);
}
.chapter__card {
  overflow: hidden;
  border: 1px solid var(--foundation-border);
  border-radius: var(--foundation-radius);
  background: var(--foundation-card);
  box-shadow: var(--foundation-shadow);
}
.factor-row {
  display: flex;
  min-height: 68px;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-4);
  border-bottom: 1px solid var(--foundation-hairline);
  box-sizing: border-box;
  transition: background-color 140ms ease;
}
.factor-row:last-child {
  border-bottom: 0;
}
.factor-row:active {
  background: var(--foundation-card-subtle);
}
.factor-row__main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 3px;
}
.factor-row__title {
  display: flex;
  align-items: center;
  gap: 6px;
}
.factor-row__name {
  overflow: hidden;
  color: var(--foundation-text);
  font-size: var(--fs-body-lg);
  font-weight: var(--fw-semibold);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.factor-row__note {
  overflow: hidden;
  color: var(--foundation-text-secondary);
  font-size: var(--fs-caption);
  line-height: 1.6;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.factor-row__dirs {
  color: var(--foundation-text-muted);
  font-size: var(--fs-tag);
}
.action-bar {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  padding: 12px var(--foundation-page-padding) calc(12px + env(safe-area-inset-bottom));
  background: var(--foundation-card);
  box-shadow: var(--foundation-shadow-bar);
  box-sizing: border-box;
}
.action-bar__error {
  color: var(--foundation-danger);
  font-size: var(--fs-caption);
  text-align: center;
}
@media screen and (min-width: 768px) {
  .action-bar {
    right: auto;
    left: calc(50% - 240px);
    width: 480px;
    max-width: 480px;
  }
}
</style>
