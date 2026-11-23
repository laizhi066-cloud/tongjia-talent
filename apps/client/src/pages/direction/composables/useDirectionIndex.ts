/**
 * @description 培养方向主栏视图模型（T3）：推荐 ≤5 / 0 命中回退 / 已选 N/3 页签，
 *   选择、换档、取消后只刷新已选与计数（推荐不变）；报告不可读时只展示状态卡。
 * @file src/pages/direction/composables/useDirectionIndex.ts
 */
import { computed, ref } from 'vue'
import { deleteTalentSelection, getTalentDirections, updateTalentSelection } from '@/api/talent'
import { useAuthStore } from '@/store/auth'
import { useTalentPortalStore } from '@/store/talent-portal'
import { useTalentSession } from '@/modules/talent-portal/composables/useTalentSession'
import { openPage, PORTAL_ROUTES, switchTab } from '@/modules/foundation-portal/navigation'
import { triggerHaptic } from '@/utils/haptics'
import type {
  TalentDirectionItem,
  TalentDirectionsResponse,
  TalentDirectionTier,
  TalentSelectionItem,
} from '@/api/talent-types'
import {
  directionBlockingCopy,
  directionBlockingStateOf,
  directionMutationMessage,
  directionReportCopy,
  tierOptionsForSelection,
} from './direction-utils'
import type { DirectionBlockingCopy, DirectionBlockingState } from './direction-utils'

/** 主栏页签。 */
export type DirectionTab = 'recommend' | 'selected'

/** 页面主状态：ready 之外均为阻断态。 */
export type DirectionPageState = 'loading' | 'ready' | DirectionBlockingState

export function useDirectionIndex() {
  const authStore = useAuthStore()
  const store = useTalentPortalStore()
  const session = useTalentSession()

  const state = ref<DirectionPageState>('loading')
  const tab = ref<DirectionTab>('recommend')
  const data = ref<TalentDirectionsResponse | null>(null)
  const errorMessage = ref('')
  const refreshing = ref(false)

  /** 换档弹层。 */
  const tierPopupVisible = ref(false)
  const tierPopupTiers = ref<TalentDirectionTier[]>([])
  const tierPopupValue = ref('')
  const tierTarget = ref<TalentSelectionItem | null>(null)
  const tierSubmitting = ref(false)

  /** 取消选择提交中（二次确认由页面 useDialog 完成）。 */
  const cancelSubmitting = ref(false)

  let inflight: Promise<void> | null = null
  let lastSubjectId = ''

  const subject = computed(() => store.current)
  const reportId = computed(() => String(subject.value?.reportId || '').trim())
  const items = computed<TalentDirectionItem[]>(() => data.value?.items || [])
  const selections = computed<TalentSelectionItem[]>(() => data.value?.selections || [])
  const selectionCount = computed(() => data.value?.selectionCount || 0)
  const selectionLimit = computed(() => data.value?.selectionLimit || 3)
  const recommendLimit = computed(() => data.value?.recommendLimit || 5)
  const fallback = computed(() => data.value?.fallback === true)
  const emptyReason = computed(() => data.value?.emptyReason || '')
  const atLimit = computed(() => selectionCount.value >= selectionLimit.value)
  const recommendBadge = computed(() => items.value.length ? String(items.value.length) : '')
  const selectedBadge = computed(() => `${selectionCount.value}/${selectionLimit.value}`)
  const fallbackNotice = computed(() => fallback.value ? '当前报告暂无匹配方向，仍可选择或自己填写' : '')
  /** 空快照（NO_DIRECTIONS / NO_ENABLED_DIRECTIONS）。 */
  const emptySnapshot = computed(() => state.value === 'ready' && items.value.length === 0)

  /** 阻断态文案。 */
  const blockingCopy = computed<DirectionBlockingCopy | null>(() => {
    if (state.value === 'loading' || state.value === 'ready')
      return null
    return directionBlockingCopy(state.value, errorMessage.value)
  })

  /** 方向详情。 */
  function openDirection(item: TalentDirectionItem): void {
    if (!reportId.value)
      return
    openPage(`${PORTAL_ROUTES.directionDetail}?reportId=${encodeURIComponent(reportId.value)}&directionId=${encodeURIComponent(item.directionId)}`)
  }

  /** 自己填写（S9）。 */
  function openManual(): void {
    if (!reportId.value)
      return
    openPage(`${PORTAL_ROUTES.directionManual}?reportId=${encodeURIComponent(reportId.value)}`)
  }

  /** 报告主栏。 */
  function openReport(): void {
    switchTab('report')
  }

  /** 推荐页 / 已选页签切换。 */
  function setTab(value: DirectionTab): void {
    tab.value = value
  }

  /** 已选方向：打开换档弹层；无候选档位时给出可读提示。 */
  function openChangeTier(selection: TalentSelectionItem): void {
    const tiers = tierOptionsForSelection(selection, items.value, data.value?.tiers || [])
    if (!tiers.length) {
      uni.showToast({ title: '暂无可更换档位', icon: 'none' })
      return
    }
    tierTarget.value = selection
    tierPopupTiers.value = tiers
    tierPopupValue.value = tiers.some(tier => tier.tierId === selection.tierId) ? selection.tierId : (tiers[0]?.tierId || '')
    tierPopupVisible.value = true
  }

  /** 复用写操作返回：刷新已选与计数，并同步推荐卡的已选标记。 */
  function applyMutation(result: { selections: TalentSelectionItem[], selectionCount: number, selectionLimit: number }): void {
    if (!data.value)
      return
    data.value.selections = result.selections || []
    data.value.selectionCount = result.selectionCount || 0
    data.value.selectionLimit = result.selectionLimit || data.value.selectionLimit
    data.value.items = (data.value.items || []).map((item) => {
      const selected = (result.selections || []).find(entry => !entry.custom && entry.directionId === item.directionId)
      return {
        ...item,
        selected: Boolean(selected),
        selectedTierId: selected?.tierId || '',
      }
    })
  }

  /** 确认换档：同档位直接提示「档位未变化」，避免无意义请求。 */
  async function confirmChangeTier(tierIdInput?: string): Promise<void> {
    const selection = tierTarget.value
    if (!selection || !reportId.value || tierSubmitting.value)
      return
    const tierId = String(tierIdInput || tierPopupValue.value || '')
    if (!tierId)
      return
    tierPopupValue.value = tierId
    if (tierId === selection.tierId) {
      tierPopupVisible.value = false
      uni.showToast({ title: '档位未变化', icon: 'none' })
      return
    }
    tierSubmitting.value = true
    try {
      const result = await updateTalentSelection(selection.selectionId, { reportId: reportId.value, tierId })
      applyMutation(result)
      tierPopupVisible.value = false
      if (result.changed !== false)
        triggerHaptic('medium')
      uni.showToast({ title: result.changed === false ? '档位未变化' : '已更新档位', icon: result.changed === false ? 'none' : 'success' })
    }
    catch (error) {
      uni.showToast({ title: directionMutationMessage(error, selectionLimit.value), icon: 'none' })
    }
    finally {
      tierSubmitting.value = false
    }
  }

  /** 取消选择（页面二次确认后调用）；幂等成功同样刷新计数。 */
  async function cancelSelection(selection: TalentSelectionItem): Promise<boolean> {
    if (!reportId.value || cancelSubmitting.value)
      return false
    cancelSubmitting.value = true
    try {
      const result = await deleteTalentSelection(selection.selectionId, reportId.value)
      applyMutation(result)
      triggerHaptic('light')
      uni.showToast({ title: result.changed === false ? '该方向未选择' : '已取消选择', icon: 'none' })
      return true
    }
    catch (error) {
      uni.showToast({ title: directionMutationMessage(error, selectionLimit.value), icon: 'none' })
      return false
    }
    finally {
      cancelSubmitting.value = false
    }
  }

  /** 加载推荐 / 已选；对象变化时清空旧对象数据，避免串号。 */
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
          uni.reLaunch({ url: `${PORTAL_ROUTES.locked}?reason=parent_disabled` })
          return
        }
        const current = store.current
        if (current?.subjectId && lastSubjectId && lastSubjectId !== current.subjectId) {
          data.value = null
          state.value = 'loading'
        }
        lastSubjectId = current?.subjectId || ''
        if (!current) {
          data.value = null
          state.value = 'unbound'
          return
        }
        const reportCopy = directionReportCopy(current.reportStatus)
        if (reportCopy) {
          data.value = null
          state.value = current.reportStatus === 'pending_publish'
            ? 'pending'
            : current.reportStatus === 'retracted' ? 'retracted' : 'no-report'
          return
        }
        if (!reportId.value) {
          data.value = null
          state.value = 'no-report'
          return
        }
        if (!data.value)
          state.value = 'loading'
        const response = await getTalentDirections(reportId.value)
        data.value = response
        state.value = 'ready'
      }
      catch (error) {
        data.value = null
        const mapped = directionBlockingStateOf(error)
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
    tab,
    data,
    refreshing,
    subject,
    reportId,
    items,
    selections,
    selectionCount,
    selectionLimit,
    recommendLimit,
    fallback,
    emptyReason,
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
  }
}
