/**
 * @description 培育建议列表视图模型（S6）：对象切换后强制重拉 summary 与建议，报告不可读时
 *   直接进入状态卡而不调用建议接口；接口 409 / 404 映射为统一阻断状态。
 * @file src/pages/advice/composables/useAdviceList.ts
 */
import { computed, ref } from 'vue'
import { getTalentAdvice } from '@/api/talent'
import { useAuthStore } from '@/store/auth'
import { useTalentPortalStore } from '@/store/talent-portal'
import { adviceBookMeta } from '@/modules/talent-portal/advice-book-state'
import { useTalentSession } from '@/modules/talent-portal/composables/useTalentSession'
import { PORTAL_ROUTES } from '@/modules/foundation-portal/navigation'
import type { TalentAdviceBook, TalentAdviceResponse } from '@/api/talent-types'
import {
  adviceBlockingCopy,
  adviceBlockingStateOf,
} from './advice-utils'
import type { AdviceBlockingCopy, AdviceBlockingState } from './advice-utils'

/** 建议列表主状态：ready 之外均为阻断态。 */
export type AdviceListState = 'loading' | 'ready' | AdviceBlockingState

export function useAdviceList() {
  const authStore = useAuthStore()
  const store = useTalentPortalStore()
  const session = useTalentSession()

  const state = ref<AdviceListState>('loading')
  const advice = ref<TalentAdviceResponse | null>(null)
  const errorMessage = ref('')
  const refreshing = ref(false)
  /** 深链传入的 reportId；summary 可用时以当前对象为准。 */
  const queryReportId = ref('')

  let inflight: Promise<void> | null = null
  let lastSubjectId = ''

  const subject = computed(() => store.current)
  const reportId = computed(() => String(subject.value?.reportId || queryReportId.value || '').trim())
  const books = computed<TalentAdviceBook[]>(() => advice.value?.books || [])
  const version = computed(() => advice.value?.version || null)
  /** 有效期；周期里的半角波浪线换成短横线，读起来更像日期区间。版本号与起始期重复，不再展示。 */
  const cycleText = computed(() => String(version.value?.cycle || '')
    .replace(/(\d{4})-(\d{2})\s*~\s*(\d{4})-(\d{2})/, '$1.$2 – $3.$4'))
  const versionText = computed(() => cycleText.value || String(version.value?.versionNo || ''))
  const bookCountText = computed(() => books.value.length ? `${books.value.length} 份建议书` : '')

  /** 阻断态文案：ready / loading 不展示。 */
  const blockingCopy = computed<AdviceBlockingCopy | null>(() => {
    if (state.value === 'loading' || state.value === 'ready')
      return null
    return adviceBlockingCopy(state.value, errorMessage.value)
  })

  /** 写入深链参数（页面 onLoad 调用）。 */
  function setReportId(reportId: string): void {
    queryReportId.value = String(reportId || '').trim()
  }

  /** 建议列表摘要：可读册给要素/数据熵，其余给置灰原因。 */
  function bookSummary(book: TalentAdviceBook): string {
    return adviceBookMeta(book)
  }

  /** 加载建议列表；对象变化时先清空旧对象内容，避免切换瞬间串号。 */
  async function load(): Promise<void> {
    if (!authStore.isLoggedIn)
      return
    if (inflight)
      return inflight
    const task = (async (): Promise<void> => {
      refreshing.value = true
      errorMessage.value = ''
      try {
        await session.ensureSession({ force: true })
        if (store.isParentDisabled) {
          state.value = 'loading'
          uni.reLaunch({ url: `${PORTAL_ROUTES.locked}?reason=parent_disabled` })
          return
        }
        const current = store.current
        if (current?.subjectId && lastSubjectId && lastSubjectId !== current.subjectId) {
          advice.value = null
          state.value = 'loading'
        }
        lastSubjectId = current?.subjectId || ''
        if (!current && !queryReportId.value) {
          advice.value = null
          state.value = 'unbound'
          return
        }
        if (current && current.reportStatus !== 'published') {
          advice.value = null
          state.value = current.reportStatus === 'pending_publish'
            ? 'pending'
            : current.reportStatus === 'retracted' ? 'retracted' : 'no-report'
          return
        }
        const reportId = String(current?.reportId || queryReportId.value || '').trim()
        if (!reportId) {
          advice.value = null
          state.value = 'no-report'
          return
        }
        if (!advice.value)
          state.value = 'loading'
        const response = await getTalentAdvice(reportId)
        advice.value = response
        state.value = response.available ? 'ready' : 'empty'
      }
      catch (error) {
        advice.value = null
        const mapped = adviceBlockingStateOf(error)
        state.value = mapped.state
        errorMessage.value = mapped.message
      }
      finally {
        refreshing.value = false
      }
    })()
    inflight = task
    try {
      await task
    }
    finally {
      if (inflight === task)
        inflight = null
    }
  }

  return {
    state,
    advice,
    books,
    version,
    versionText,
    bookCountText,
    errorMessage,
    refreshing,
    subject,
    reportId,
    blockingCopy,
    setReportId,
    bookSummary,
    load,
  }
}
