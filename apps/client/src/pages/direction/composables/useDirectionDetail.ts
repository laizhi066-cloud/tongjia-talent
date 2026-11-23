/**
 * @description 方向详情视图模型（S8）：命中 N/M、要素对照、档位单选与确认选择 / 更新档位；
 *   上限、重复、档位、方向不可用等 409/422 统一映射为可读提示。
 * @file src/pages/direction/composables/useDirectionDetail.ts
 */
import { computed, ref } from 'vue'
import { createTalentSelection, deleteTalentSelection, getTalentDirections, updateTalentSelection } from '@/api/talent'
import { useAuthStore } from '@/store/auth'
import type {
  TalentDirectionItem,
  TalentSelectionItem,
} from '@/api/talent-types'
import {
  directionBlockingCopy,
  directionBlockingStateOf,
  directionMutationMessage,
  pickTierId,
  selectionOfDirection,
} from './direction-utils'
import type { DirectionBlockingCopy, DirectionBlockingState } from './direction-utils'

/** 详情主状态。 */
export type DirectionDetailState = 'loading' | 'ready' | DirectionBlockingState

export function useDirectionDetail() {
  const authStore = useAuthStore()

  const state = ref<DirectionDetailState>('loading')
  const reportId = ref('')
  const directionId = ref('')
  const item = ref<TalentDirectionItem | null>(null)
  const selection = ref<TalentSelectionItem | null>(null)
  const chosenTierId = ref('')
  const selectionCount = ref(0)
  const selectionLimit = ref(3)
  const submitting = ref(false)
  const cancelSubmitting = ref(false)
  const errorMessage = ref('')

  const isSelected = computed(() => Boolean(item.value?.selected || selection.value))
  const tiers = computed(() => item.value?.tiers || [])
  const currentTierId = computed(() => item.value?.selectedTierId || selection.value?.tierId || '')
  const sameTier = computed(() => isSelected.value && chosenTierId.value === currentTierId.value)
  const selectable = computed(() => Boolean(item.value?.selectable) && tiers.value.length > 0)
  const atLimit = computed(() => !isSelected.value && selectionCount.value >= selectionLimit.value)
  const hasTier = computed(() => Boolean(chosenTierId.value))
  const canSubmit = computed(() => selectable.value && hasTier.value && !sameTier.value && !submitting.value && !cancelSubmitting.value)
  const submitLabel = computed(() => {
    if (!selectable.value)
      return '该方向暂未开放档位'
    if (isSelected.value)
      return sameTier.value ? '已选择' : '更新档位'
    return '确认选择'
  })
  const hitText = computed(() => item.value ? `${item.value.hitCount}/${item.value.total} 项命中` : '')
  const tierCountText = computed(() => `${tiers.value.length} 个档位`)
  const chosenTierName = computed(() => tiers.value.find(tier => tier.tierId === chosenTierId.value)?.name || '')

  const blockingCopy = computed<DirectionBlockingCopy | null>(() => {
    if (state.value === 'loading' || state.value === 'ready')
      return null
    return directionBlockingCopy(state.value, errorMessage.value)
  })

  /** 页面参数：`reportId` + `directionId`。 */
  function setParams(queryReportId: string, queryDirectionId: string): void {
    reportId.value = String(queryReportId || '').trim()
    directionId.value = String(queryDirectionId || '').trim()
  }

  /** 加载方向详情；参数缺失不发起请求。 */
  async function load(): Promise<void> {
    if (!authStore.isLoggedIn)
      return
    if (!reportId.value || !directionId.value) {
      state.value = 'invalid'
      return
    }
    state.value = 'loading'
    errorMessage.value = ''
    try {
      const response = await getTalentDirections(reportId.value)
      const target = (response.items || []).find(entry => entry.directionId === directionId.value)
      if (!target) {
        state.value = 'notfound'
        return
      }
      item.value = target
      selection.value = selectionOfDirection(response.selections || [], target.directionId) || null
      selectionCount.value = response.selectionCount || 0
      selectionLimit.value = response.selectionLimit || 3
      chosenTierId.value = pickTierId(target.tiers || [], target.selectedTierId || target.defaultTierId)
      state.value = 'ready'
    }
    catch (error) {
      const mapped = directionBlockingStateOf(error)
      state.value = mapped.state
      errorMessage.value = mapped.message
    }
  }

  /** 取消已选方向（详情页二次确认后调用）；幂等成功同样返回。 */
  async function cancelSelection(): Promise<boolean> {
    if (!isSelected.value || !reportId.value || cancelSubmitting.value)
      return false
    const selectionId = selection.value?.selectionId || directionId.value
    if (!selectionId)
      return false
    cancelSubmitting.value = true
    try {
      const result = await deleteTalentSelection(selectionId, reportId.value)
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

  /** 确认选择 / 更新档位；成功后返回培养方向主栏并刷新已选。 */
  async function submit(): Promise<boolean> {
    const target = item.value
    if (!target || !canSubmit.value || !reportId.value)
      return false
    if (!selectable.value) {
      uni.showToast({ title: '该方向暂未开放档位', icon: 'none' })
      return false
    }
    if (atLimit.value) {
      uni.showToast({ title: `最多选择 ${selectionLimit.value} 个方向，请先取消一个`, icon: 'none' })
      return false
    }
    submitting.value = true
    try {
      if (isSelected.value) {
        const selectionId = selection.value?.selectionId || target.directionId
        const result = await updateTalentSelection(selectionId, { reportId: reportId.value, tierId: chosenTierId.value })
        uni.showToast({ title: result.changed === false ? '档位未变化' : '已更新档位', icon: result.changed === false ? 'none' : 'success' })
      }
      else {
        await createTalentSelection({ reportId: reportId.value, directionId: target.directionId, tierId: chosenTierId.value })
        uni.showToast({
          title: `已选择「${target.name}」·目标档位 ${chosenTierName.value}`,
          icon: 'success',
        })
      }
      return true
    }
    catch (error) {
      uni.showToast({ title: directionMutationMessage(error, selectionLimit.value), icon: 'none' })
      return false
    }
    finally {
      submitting.value = false
    }
  }

  return {
    state,
    reportId,
    directionId,
    item,
    selection,
    chosenTierId,
    selectionCount,
    selectionLimit,
    submitting,
    cancelSubmitting,
    isSelected,
    tiers,
    currentTierId,
    sameTier,
    selectable,
    atLimit,
    canSubmit,
    submitLabel,
    hitText,
    tierCountText,
    blockingCopy,
    setParams,
    load,
    submit,
    cancelSelection,
  }
}
