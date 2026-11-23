/**
 * @description 自己填写方向视图模型（S9）：方向下拉（拼音序 + 末位「其他」）、
 *   ≤10 字输入、培养目标单选与提交生成待归并请求；报告不可读时只展示状态卡。
 * @file src/pages/direction/composables/useDirectionManual.ts
 */
import { computed, ref, watch } from 'vue'
import { createTalentSelection, getTalentDirections } from '@/api/talent'
import { useAuthStore } from '@/store/auth'
import type {
  TalentDirectionTier,
  TalentManualOption,
  TalentSelectionItem,
} from '@/api/talent-types'
import {
  directionBlockingCopy,
  directionBlockingStateOf,
  directionMutationMessage,
  pickTierId,
} from './direction-utils'
import type { DirectionBlockingCopy, DirectionBlockingState } from './direction-utils'

/** 下拉末位「其他（自己填写）」的内部值。 */
const OTHER_OPTION_VALUE = '__other__'

/** 自填页主状态。 */
export type DirectionManualState = 'loading' | 'ready' | DirectionBlockingState

export function useDirectionManual() {
  const authStore = useAuthStore()

  const state = ref<DirectionManualState>('loading')
  const reportId = ref('')
  const manualOptions = ref<TalentManualOption[]>([])
  const tiers = ref<TalentDirectionTier[]>([])
  const manualLimit = ref(10)
  const selectionCount = ref(0)
  const selectionLimit = ref(3)
  const selectionItems = ref<TalentSelectionItem[]>([])
  const pickerValue = ref<string[]>([])
  const customName = ref('')
  const chosenTierId = ref('')
  const directionError = ref('')
  const nameError = ref('')
  const tierError = ref('')
  const submitting = ref(false)
  const errorMessage = ref('')

  const directionOptions = computed(() => [
    ...manualOptions.value.map(option => ({ label: option.name, value: option.directionId })),
    { label: '其他（自己填写）', value: OTHER_OPTION_VALUE },
  ])
  const usesOther = computed(() => pickerValue.value[0] === OTHER_OPTION_VALUE)
  const selectedOption = computed<TalentManualOption | null>(() =>
    manualOptions.value.find(option => option.directionId === pickerValue.value[0]) || null,
  )
  const directionLabel = computed(() => {
    if (usesOther.value)
      return '其他（自己填写）'
    return selectedOption.value?.name || ''
  })
  const manualName = computed(() => usesOther.value ? customName.value.trim() : (selectedOption.value?.name || ''))
  const nameLength = computed(() => usesOther.value ? customName.value.length : 0)
  const atLimit = computed(() => selectionCount.value >= selectionLimit.value)
  const hasTier = computed(() => tiers.value.length > 0)
  /** 允许点击提交（缺方向/超长由行内校验拦截，不发请求）。 */
  const canSubmit = computed(() =>
    state.value === 'ready'
    && hasTier.value
    && !submitting.value
    && !atLimit.value,
  )

  const blockingCopy = computed<DirectionBlockingCopy | null>(() => {
    if (state.value === 'loading' || state.value === 'ready')
      return null
    return directionBlockingCopy(state.value, errorMessage.value)
  })

  /** 页面参数：`reportId`（缺省时由当前对象报告补齐）。 */
  function setReportId(value: string): void {
    reportId.value = String(value || '').trim()
  }

  watch(pickerValue, () => {
    directionError.value = ''
    if (!usesOther.value)
      nameError.value = ''
  })
  watch(customName, () => {
    nameError.value = ''
  })
  watch(chosenTierId, () => {
    tierError.value = ''
  })

  /** 加载自填选项与培养目标（档位）。 */
  async function load(): Promise<void> {
    if (!authStore.isLoggedIn)
      return
    if (!reportId.value) {
      state.value = 'invalid'
      return
    }
    state.value = 'loading'
    errorMessage.value = ''
    try {
      const response = await getTalentDirections(reportId.value)
      manualOptions.value = response.manualOptions || []
      /** 培养目标候选取全局启用档位（快照 ∩ 当前启用），不再依赖推荐项自带档位。 */
      tiers.value = (response.manualTiers?.length ? response.manualTiers : response.tiers) || []
      manualLimit.value = response.manualLimit || 10
      selectionCount.value = response.selectionCount || 0
      selectionLimit.value = response.selectionLimit || 3
      selectionItems.value = response.selections || []
      chosenTierId.value = pickTierId(tiers.value, '')
      state.value = 'ready'
    }
    catch (error) {
      const mapped = directionBlockingStateOf(error)
      state.value = mapped.state
      errorMessage.value = mapped.message
    }
  }

  /** 行内校验：方向必选、自填 ≤10 字、培养目标必选。 */
  function validate(): boolean {
    directionError.value = ''
    nameError.value = ''
    tierError.value = ''
    if (!pickerValue.value[0]) {
      directionError.value = '请选择培养方向'
      return false
    }
    if (usesOther.value) {
      if (!customName.value.trim()) {
        nameError.value = '请填写方向名称'
        return false
      }
      if (customName.value.trim().length > manualLimit.value) {
        nameError.value = `方向名称最多 ${manualLimit.value} 个字`
        return false
      }
    }
    if (!chosenTierId.value) {
      tierError.value = '请选择培养目标'
      return false
    }
    return true
  }

  /** 提交自填方向：成功后返回培养方向主栏并刷新已选。 */
  async function submit(): Promise<boolean> {
    if (state.value !== 'ready' || submitting.value)
      return false
    if (atLimit.value) {
      uni.showToast({ title: `最多选择 ${selectionLimit.value} 个方向，请先取消一个`, icon: 'none' })
      return false
    }
    if (!hasTier.value) {
      uni.showToast({ title: '暂未开放培养目标', icon: 'none' })
      return false
    }
    if (!validate())
      return false
    submitting.value = true
    try {
      await createTalentSelection({
        reportId: reportId.value,
        manualName: manualName.value,
        tierId: chosenTierId.value,
      })
      uni.showToast({ title: `已提交自填方向「${manualName.value}」`, icon: 'success' })
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
    manualOptions,
    tiers,
    manualLimit,
    selectionCount,
    selectionLimit,
    selectionItems,
    pickerValue,
    customName,
    chosenTierId,
    directionError,
    nameError,
    tierError,
    submitting,
    directionOptions,
    usesOther,
    directionLabel,
    manualName,
    nameLength,
    atLimit,
    hasTier,
    canSubmit,
    blockingCopy,
    setReportId,
    load,
    submit,
  }
}
