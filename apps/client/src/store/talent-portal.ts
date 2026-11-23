/**
 * @description C 端天赋会话状态：启动聚合 summary、当前报告对象（本机记忆）、claim 认领与兜底读取。
 *   - 归属真源在服务端（`talent_parents.userId`），本机只记「当前对象」视图偏好；
 *   - 本机记忆按 `userId` 隔离，退出/注销/切换账号清空，防跨账号串号；
 *   - summary 路由未就绪时退化为 M2 bindings 读取（保留对象列表与状态，计数显示为未知）。
 * @file src/store/talent-portal.ts
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  claimTalentBinding,
  getTalentBindings,
  getTalentSummary,
} from '@/api/talent'
import type {
  TalentAccountState,
  TalentBindingItem,
  TalentBindingsResponse,
  TalentClaimStatus,
  TalentQueryReason,
  TalentReportStatus,
  TalentSubjectType,
  TalentSummaryResponse,
  TalentSummarySubject,
} from '@/api/talent-types'
import { apiErrorCode, apiErrorStatus } from '@/http/http'
import { useAuthStore } from '@/store/auth'

const SUBJECT_STORAGE_PREFIX = 'foundation:talent:subject'
const CLAIM_STORAGE_PREFIX = 'foundation:talent:claim'

interface StoredSubject {
  subjectType: TalentSubjectType
  subjectId: string
  at: number
}

/** 读取本机 JSON 缓存，存储不可用时返回 null。 */
function readStoredJson<T>(key: string): T | null {
  try {
    const raw = uni.getStorageSync(key)
    if (!raw)
      return null
    return (typeof raw === 'string' ? JSON.parse(raw) : raw) as T
  }
  catch {
    return null
  }
}

/** 写入本机 JSON 缓存；失败只影响下次冷启动的默认值。 */
function writeStoredJson(key: string, value: unknown): void {
  try {
    uni.setStorageSync(key, JSON.stringify(value))
  }
  catch {
    // 存储配额不可用时忽略，当前会话仍可正常使用。
  }
}

/** 移除本机缓存。 */
function removeStored(key: string): void {
  try {
    uni.removeStorageSync(key)
  }
  catch {
    // 忽略存储不可用。
  }
}

/** 由生日计算周岁；生日缺失返回 0。 */
function ageOfBirthday(birthday: string): number {
  const [year, month, day] = String(birthday || '').split('-').map(Number)
  if (!year || !month || !day)
    return 0
  const today = new Date()
  let age = today.getFullYear() - year
  const beforeBirthday = today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)
  if (beforeBirthday)
    age -= 1
  return Math.max(0, age)
}

/** 子女查询状态文案（§11.2，不得改写）。 */
function queryStatusText(query: TalentBindingItem['query'], reportAvailable: boolean): string {
  if (query === 'querying')
    return '结果查询中'
  if (query === 'not_found')
    return '信息待核对'
  if (query === 'found')
    return reportAvailable ? '报告可查看' : '报告待同步'
  if (query === 'unqueried')
    return '尚未查询'
  return reportAvailable ? '报告可查看' : '该对象暂无基因报告'
}

/** 把 M2 bindings 行映射为 summary 对象视图（仅兜底模式使用）。 */
function bindingToSubject(item: TalentBindingItem, selectionLimit = 3): TalentSummarySubject {
  const age = ageOfBirthday(item.birthday)
  const reportStatus: TalentReportStatus = item.reportAvailable ? 'published' : 'none'
  return {
    subjectType: item.objectType,
    subjectId: item.id,
    name: item.name,
    gender: item.gender,
    genderLabel: item.genderLabel,
    age,
    ageLabel: age ? `${age} 岁` : '',
    relation: item.relation,
    relationLabel: item.relationLabel,
    query: item.query,
    queryReason: (item.queryReason || '') as TalentQueryReason,
    reportId: '',
    reportStatus,
    statusText: item.objectType === 'self'
      ? (item.reportAvailable ? '报告可查看' : '该对象暂无基因报告')
      : queryStatusText(item.query, item.reportAvailable),
    readableVolumeCount: 0,
    totalVolumeCount: 0,
    adviceCount: 0,
    selectedDirectionCount: 0,
    selectionLimit,
  }
}

/** C 端天赋会话 store。 */
export const useTalentPortalStore = defineStore('talent-portal', () => {
  const authStore = useAuthStore()

  const summary = ref<TalentSummaryResponse | null>(null)
  const subjects = ref<TalentSummarySubject[]>([])
  const current = ref<TalentSummarySubject | null>(null)
  const accountState = ref<TalentAccountState>('active')
  const pendingCheckCount = ref(0)
  const loading = ref(false)
  const resolved = ref(false)
  const errorMessage = ref('')
  /** summary 路由尚未就绪时为 true：对象与状态可用，分册/建议计数显示为未知。 */
  const degraded = ref(false)
  const claimStatus = ref<TalentClaimStatus | ''>('')

  let inflight: Promise<boolean> | null = null

  const userId = computed(() => String(authStore.profile?.id || ''))
  const isLoggedIn = computed(() => authStore.isLoggedIn)
  const hasSubject = computed(() => Boolean(current.value))
  const subjectCount = computed(() => subjects.value.length)
  const childCount = computed(() => subjects.value.filter(item => item.subjectType === 'child').length)
  const canSwitch = computed(() => subjects.value.length > 1)
  const isUnbound = computed(() => accountState.value === 'unbound')
  const isParentDisabled = computed(() => accountState.value === 'parent_disabled')
  const siteFooter = computed(() => summary.value?.footer || { copyright: '', contactPhone: '' })

  /** 本机对象记忆 key：按 userId 隔离，避免多账号串号。 */
  const subjectStorageKey = computed(() => `${SUBJECT_STORAGE_PREFIX}:${userId.value}`)
  const claimStorageKey = computed(() => `${CLAIM_STORAGE_PREFIX}:${userId.value}`)

  /** 读取本机记住的对象 id；只接受当前账号的存储。 */
  function readRememberedSubjectId(): string {
    if (!userId.value)
      return ''
    const stored = readStoredJson<StoredSubject>(subjectStorageKey.value)
    return stored?.subjectId || ''
  }

  /** 写入本机当前对象。 */
  function persistCurrentSubject(subject: TalentSummarySubject | null): void {
    if (!userId.value)
      return
    if (!subject) {
      removeStored(subjectStorageKey.value)
      return
    }
    writeStoredJson(subjectStorageKey.value, {
      subjectType: subject.subjectType,
      subjectId: subject.subjectId,
      at: Date.now(),
    } satisfies StoredSubject)
  }

  /** 应用 summary 响应：对象列表、当前对象与本机记忆保持一致。 */
  function applySummary(response: TalentSummaryResponse): void {
    summary.value = response
    accountState.value = response.accountState
    subjects.value = response.accountState === 'active' ? (response.subjects || []) : []
    pendingCheckCount.value = response.pendingCheckCount || 0
    degraded.value = false
    const remembered = readRememberedSubjectId()
    const rememberedSubject = remembered
      ? subjects.value.find(item => item.subjectId === remembered)
      : undefined
    const firstReadable = subjects.value.find(item => Boolean(item.reportId))
    const target = response.accountState === 'active'
      ? (rememberedSubject || firstReadable || response.current || subjects.value[0] || null)
      : null
    current.value = target
    if (target)
      persistCurrentSubject(target)
    else if (response.accountState === 'unbound')
      removeStored(subjectStorageKey.value)
  }

  /** 兜底：用 M2 bindings 组装对象列表（summary 路由缺失或暂不可用时）。 */
  function applyBindings(response: TalentBindingsResponse): void {
    const items = response.items || []
    const mapped = items.map(item => bindingToSubject(item))
    subjects.value = mapped
    accountState.value = mapped.length ? 'active' : 'unbound'
    pendingCheckCount.value = 0
    degraded.value = true
    const rememberedId = response.currentId || readRememberedSubjectId()
    const target = mapped.find(item => item.subjectId === rememberedId)
      || mapped.find(item => Boolean(item.reportId))
      || mapped[0]
      || null
    current.value = target
    if (target)
      persistCurrentSubject(target)
    else
      removeStored(subjectStorageKey.value)
  }

  /** 服务端当前对象是否仍可查看；失效时回退本人并提示。 */
  function reconcileCurrentSubject(rememberedId: string): boolean {
    if (!rememberedId)
      return true
    const exists = subjects.value.some(item => item.subjectId === rememberedId)
    if (exists)
      return true
    removeStored(subjectStorageKey.value)
    uni.showToast({ title: '该对象已不可查看', icon: 'none' })
    return false
  }

  /** 请求 summary；本机 remember 的对象失效时自动回退本人。 */
  async function requestSummary(rememberedId: string): Promise<TalentSummaryResponse> {
    try {
      return await getTalentSummary(rememberedId || undefined)
    }
    catch (error) {
      // 记录的对象已被解绑/停用：清掉本机记忆后用默认对象重试一次。
      if (rememberedId && apiErrorStatus(error) === 404) {
        removeStored(subjectStorageKey.value)
        return await getTalentSummary()
      }
      throw error
    }
  }

  /** 加载启动聚合；返回是否成功拿到可展示状态。 */
  async function loadSummary(options: { force?: boolean, silent?: boolean } = {}): Promise<boolean> {
    if (!authStore.isLoggedIn) {
      resetSession()
      return false
    }
    if (inflight && !options.force)
      return inflight
    const task = (async (): Promise<boolean> => {
      if (!options.silent)
        loading.value = true
      errorMessage.value = ''
      const rememberedId = readRememberedSubjectId()
      try {
        const response = await requestSummary(rememberedId)
        applySummary(response)
        reconcileCurrentSubject(rememberedId)
        resolved.value = true
        return true
      }
      catch (error) {
        // summary 路由未就绪（M7 服务端未落地）时，退化为 bindings 读取对象列表。
        if (apiErrorStatus(error) === 404) {
          try {
            applyBindings(await getTalentBindings())
            resolved.value = true
            return true
          }
          catch (fallbackError) {
            errorMessage.value = ''
            failed(fallbackError)
            return false
          }
        }
        failed(error)
        return false
      }
      finally {
        loading.value = false
      }
    })()
    inflight = task
    try {
      return await task
    }
    finally {
      if (inflight === task)
        inflight = null
    }
  }

  /** 统一记录失败信息：401/403 由会话事件接管跳转，页面只保留可读错误。 */
  function failed(error: unknown): void {
    const status = apiErrorStatus(error)
    errorMessage.value = status === 401 || status === 403
      ? ''
      : '报告对象暂时无法读取，请稍后重试'
  }

  /** 首次登录/冷启动时认领唯一家长档案；本机已有结果则跳过。 */
  async function claimIfNeeded(force = false): Promise<TalentClaimStatus | ''> {
    if (!authStore.isLoggedIn || !userId.value)
      return ''
    if (!force) {
      const cached = readStoredJson<{ status: TalentClaimStatus, at: number }>(claimStorageKey.value)
      if (cached?.status) {
        claimStatus.value = cached.status
        return cached.status
      }
    }
    try {
      const response = await claimTalentBinding()
      const status = response.claim?.status || ''
      if (status) {
        claimStatus.value = status
        writeStoredJson(claimStorageKey.value, { status, at: Date.now() })
      }
      return status
    }
    catch (error) {
      const code = apiErrorCode(error)
      if (code === 'conflict') {
        claimStatus.value = 'conflict'
        writeStoredJson(claimStorageKey.value, { status: 'conflict', at: Date.now() })
        return 'conflict'
      }
      return ''
    }
  }

  /** 切换当前对象（只写本机记忆）。 */
  function setCurrentSubject(subjectId: string): boolean {
    const target = subjects.value.find(item => item.subjectId === subjectId)
    if (!target)
      return false
    current.value = target
    persistCurrentSubject(target)
    return true
  }

  /** 清空本机会话数据（退出登录 / 注销 / 切换账号）。 */
  function resetSession(): void {
    if (userId.value) {
      removeStored(subjectStorageKey.value)
      removeStored(claimStorageKey.value)
    }
    summary.value = null
    subjects.value = []
    current.value = null
    accountState.value = 'active'
    pendingCheckCount.value = 0
    loading.value = false
    resolved.value = false
    errorMessage.value = ''
    degraded.value = false
    claimStatus.value = ''
    inflight = null
  }

  return {
    summary,
    subjects,
    current,
    accountState,
    pendingCheckCount,
    loading,
    resolved,
    errorMessage,
    degraded,
    claimStatus,
    userId,
    isLoggedIn,
    hasSubject,
    subjectCount,
    childCount,
    canSwitch,
    isUnbound,
    isParentDisabled,
    siteFooter,
    loadSummary,
    claimIfNeeded,
    setCurrentSubject,
    resetSession,
    readRememberedSubjectId,
  }
})
