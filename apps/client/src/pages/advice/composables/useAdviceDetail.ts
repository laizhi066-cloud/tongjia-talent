/**
 * @description 建议书详情视图模型（S7）：按 `book` 定位分册，四段正文只读渲染，
 *   数据熵筛选按 `adv:<分册>` 本机记忆并与分册页筛选互不干扰。
 * @file src/pages/advice/composables/useAdviceDetail.ts
 */
import { computed, ref } from 'vue'
import { getTalentAdvice } from '@/api/talent'
import { useAuthStore } from '@/store/auth'
import { useTalentPortalStore } from '@/store/talent-portal'
import type {
  TalentAdviceBook,
  TalentAdviceResponse,
  TalentAdviceSection,
} from '@/api/talent-types'

import { volumeLetter } from '@/modules/talent-portal/volume-label'

import {
  adviceBlockingCopy,
  adviceBlockingStateOf,
  adviceBookOrdinal,
  adviceBookVolumeId,
  isValidAdviceBook,
  readAdviceEntropyFilter,
  writeAdviceEntropyFilter,
} from './advice-utils'
import type { AdviceBlockingCopy, AdviceBlockingState } from './advice-utils'

type TalentAdviceOwner = NonNullable<TalentAdviceResponse['owner']>
type TalentAdviceVersion = NonNullable<TalentAdviceResponse['version']>

/** 建议书详情主状态。 */
export type AdviceDetailState = 'loading' | 'ready' | AdviceBlockingState

export function useAdviceDetail() {
  const authStore = useAuthStore()
  const store = useTalentPortalStore()

  const state = ref<AdviceDetailState>('loading')
  const reportId = ref('')
  const bookCode = ref('')
  const book = ref<TalentAdviceBook | null>(null)
  const owner = ref<TalentAdviceOwner | null>(null)
  const version = ref<TalentAdviceVersion | null>(null)
  const entropy = ref('')
  const errorMessage = ref('')
  const emptyText = ref('暂未收到培育建议')

  const userId = computed(() => String(store.userId || authStore.profile?.id || ''))
  const sections = computed<TalentAdviceSection[]>(() => book.value?.sections || [])
  const filteredSections = computed(() => {
    const target = entropy.value
    if (!target)
      return sections.value
    return sections.value.filter(section => section.entropy === target)
  })
  const entropyOptions = computed(() => book.value?.entropyList || [])
  const filterSummary = computed(() => `${filteredSections.value.length} / ${sections.value.length} 项`)
  const bookTitle = computed(() => {
    if (!book.value)
      return ''
    // 分册统一用字母标识（A / B / C…），不用「第 1 分册」数字。
    const letter = String(book.value.book || '').toUpperCase()
      || volumeLetter(adviceBookOrdinal(book.value.book))
    return letter ? `${letter} 分册 · ${book.value.bookName}` : book.value.bookName
  })
  const headerMeta = computed(() => {
    if (!book.value || !owner.value)
      return ''
    // 建议书编号属内部字段，家长端不展示。
    return [owner.value.name, owner.value.ageLabel].filter(Boolean).join(' · ')
  })
  const volumeId = computed(() => book.value ? adviceBookVolumeId(book.value.book) : '')
  const versionText = computed(() => version.value
    ? `本版 ${version.value.versionNo}（${version.value.cycle} 生效）`
    : '')
  const versionNote = computed(() => `每 ${version.value?.cycleMonths || 4} 个月更新一版`)

  /** 阻断态文案：ready / loading 不展示。 */
  const blockingCopy = computed<AdviceBlockingCopy | null>(() => {
    if (state.value === 'loading' || state.value === 'ready')
      return null
    if (state.value === 'empty')
      return { title: '暂未收到培育建议', message: emptyText.value, actionText: '返回建议列表' }
    return adviceBlockingCopy(state.value, errorMessage.value)
  })

  /** 页面参数：`reportId` + `book`（A–F）。 */
  function setParams(queryReportId: string, queryBook: string): void {
    reportId.value = String(queryReportId || '').trim()
    bookCode.value = String(queryBook || '').trim().toUpperCase()
  }

  /** 切换数据熵筛选：再点已选项取消，并写入本机记忆。 */
  function toggleEntropy(name: string): void {
    entropy.value = entropy.value === name ? '' : name
    writeAdviceEntropyFilter(userId.value, book.value?.book || bookCode.value, entropy.value)
  }

  /** 加载建议书；参数非法时不发起请求。 */
  async function load(): Promise<void> {
    if (!authStore.isLoggedIn)
      return
    if (!reportId.value || !isValidAdviceBook(bookCode.value)) {
      state.value = 'invalid'
      return
    }
    state.value = 'loading'
    errorMessage.value = ''
    try {
      const response = await getTalentAdvice(reportId.value)
      if (!response.available) {
        emptyText.value = response.emptyText || '暂未收到培育建议'
        state.value = 'empty'
        return
      }
      const target = (response.books || []).find(item => String(item.book || '').toUpperCase() === bookCode.value)
      if (!target) {
        state.value = 'notfound'
        return
      }
      book.value = target
      owner.value = response.owner || null
      version.value = response.version || null
      const remembered = readAdviceEntropyFilter(userId.value, target.book)
      entropy.value = target.entropyList.some(item => item.name === remembered) ? remembered : ''
      state.value = 'ready'
    }
    catch (error) {
      const mapped = adviceBlockingStateOf(error)
      state.value = mapped.state
      errorMessage.value = mapped.message
    }
  }

  return {
    state,
    reportId,
    book,
    bookCode,
    owner,
    version,
    entropy,
    sections,
    filteredSections,
    entropyOptions,
    filterSummary,
    bookTitle,
    headerMeta,
    volumeId,
    versionText,
    versionNote,
    blockingCopy,
    setParams,
    toggleEntropy,
    load,
  }
}
