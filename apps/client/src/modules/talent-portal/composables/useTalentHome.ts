/**
 * @description 首页视图模型：会话加载、对象卡文案、待核对提示、四宫格入口与最近报告。
 *   页面只渲染这里给出的状态与文案，不直接发请求。
 * @file src/modules/talent-portal/composables/useTalentHome.ts
 */
import { onShow } from '@dcloudio/uni-app'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useAuthStore } from '@/store/auth'
import { useSiteStore } from '@/store/site'
import { useTalentPortalStore } from '@/store/talent-portal'
import { useNetworkStatus } from '@/modules/foundation-portal/composables/useNetworkStatus'
import { useTalentSession } from './useTalentSession'
import {
  currentPageUrl,
  goToLogin,
  openPage,
  PORTAL_ROUTES,
  switchTab,
} from '@/modules/foundation-portal/navigation'
import type { PortalTab } from '@/modules/foundation-portal/navigation'

/** 首页主状态。 */
export type TalentHomeState = 'guest' | 'loading' | 'error' | 'unbound' | 'ready'

/** 四宫格 / 最近报告数据。 */
export interface TalentHomeGridItem {
  key: 'report' | 'advice' | 'direction' | 'children'
  title: string
  /** 金刚区下的短标题（2 字，避免窄屏换行）。 */
  shortTitle: string
  subtitle: string
  icon: string
  /** 图标底色（CSS 变量）：四个入口用不同柔和色，避免首屏一片绿。 */
  iconBg: string
  /** 图标颜色（CSS 变量），与底色配套。 */
  iconColor: string
  /** 未登录或未绑定时的目标需要先登录。 */
  requiresLogin: boolean
  onTap: () => void
}

/** 骨架屏延迟展示阈值：避免 300ms 内完成的请求闪烁。 */
const SKELETON_DELAY_MS = 300

export function useTalentHome() {
  const authStore = useAuthStore()
  const siteStore = useSiteStore()
  const store = useTalentPortalStore()
  const session = useTalentSession()

  const skeletonReady = ref(false)
  const refreshing = ref(false)
  let skeletonTimer: ReturnType<typeof setTimeout> | undefined

  const site = computed(() => siteStore.site)
  const isLoggedIn = computed(() => authStore.isLoggedIn)
  const user = computed(() => authStore.profile)
  const subject = computed(() => store.current)
  const pendingCheckCount = computed(() => store.pendingCheckCount)

  /** 主状态：登录态与 summary 结果共同决定，优先级见 M7 spec §5.2。 */
  const state = computed<TalentHomeState>(() => {
    if (!isLoggedIn.value)
      return 'guest'
    if (store.errorMessage && !store.hasSubject)
      return 'error'
    if (!store.resolved && !skeletonReady.value)
      return 'loading'
    if (store.errorMessage)
      return 'error'
    if (!store.hasSubject)
      return store.isUnbound || store.resolved ? 'unbound' : 'loading'
    return 'ready'
  })

  /** 首屏骨架：仅在尚未解析出任何对象时展示。 */
  const showSkeleton = computed(() => state.value === 'loading' && skeletonReady.value)

  /** 当前对象是否已有可读报告。 */
  const hasReadableReport = computed(() => {
    const current = subject.value
    if (!current)
      return false
    if (current.reportStatus === 'published')
      return current.readableVolumeCount > 0 || store.degraded
    return false
  })

  /** 报告入口副标题（§5.1 四宫格口径）。 */
  const reportSubtitle = computed(() => {
    const current = subject.value
    if (!current)
      return '待同步'
    if (current.reportStatus === 'pending_publish')
      return '整理中'
    if (current.reportStatus === 'retracted')
      return '更新中'
    if (current.reportStatus === 'none')
      return '待同步'
    if (store.degraded)
      return '可读'
    return `${current.readableVolumeCount} 册可读`
  })

  /** 建议入口副标题。 */
  const adviceSubtitle = computed(() => {
    const current = subject.value
    if (!current || current.reportStatus !== 'published')
      return '暂未发布'
    if (store.degraded)
      return '可读'
    return current.adviceCount > 0 ? `${current.adviceCount} 份` : '暂未发布'
  })

  /** 方向入口副标题。 */
  const directionSubtitle = computed(() => {
    const current = subject.value
    if (!current)
      return '按命中项数选择'
    const limit = current.selectionLimit || 3
    if (current.selectedDirectionCount > 0)
      return `已选 ${current.selectedDirectionCount}/${limit}`
    return '待选择'
  })

  /** 孩子管理副标题。 */
  const childrenSubtitle = computed(() => {
    if (!isLoggedIn.value)
      return '建档后可查看'
    if (pendingCheckCount.value > 0)
      return `${pendingCheckCount.value} 个待核对`
    return store.childCount > 0 ? `${store.childCount} 人` : '暂未添加'
  })

  /** 待核对提示：条件 = 子女查询状态非 found 的数量。 */
  const pendingCheckText = computed(() =>
    pendingCheckCount.value > 0 ? `${pendingCheckCount.value} 个孩子的检测结果待核对` : '',
  )

  /** 最近报告卡：给首页主视觉用的一句话结论 + 状态。 */
  const recentReport = computed(() => {
    const current = subject.value
    if (!current)
      return null
    const published = current.reportStatus === 'published'
    const readable = published && (current.readableVolumeCount > 0 || store.degraded)
    const read = current.readableVolumeCount || 0
    const total = current.totalVolumeCount || 0
    let headline = '等待检测报告'
    if (current.reportStatus === 'pending_publish')
      headline = '报告整理中'
    else if (current.reportStatus === 'retracted')
      headline = '报告更新中'
    else if (readable)
      headline = total > 0 ? `${read} 册内容已就绪` : '报告已发布'
    return {
      readable,
      statusText: published ? '已发布' : '待发布',
      headline,
      title: readable ? '基因报告' : '报告状态',
      caption: readable ? '分册阅读 · 要素解读' : '发布后可查看分册与要素解读',
    }
  })

  /** 未登录访问业务入口：进登录页并回跳目标主栏。 */
  function requireLogin(target?: string): void {
    goToLogin(target || currentPageUrl())
  }

  /** 四宫格入口定义；未登录时点击进登录页。 */
  const gridItems = computed<TalentHomeGridItem[]>(() => [
    {
      key: 'report',
      title: '报告与分册',
      shortTitle: '报告',
      subtitle: isLoggedIn.value ? reportSubtitle.value : '登录后按分册阅读',
      icon: 'file',
      iconBg: 'var(--foundation-primary-tint)',
      iconColor: 'var(--foundation-primary-deep)',
      requiresLogin: true,
      onTap: () => {
        if (!isLoggedIn.value) {
          requireLogin(PORTAL_ROUTES.report)
          return
        }
        switchTab('report')
      },
    },
    {
      key: 'advice',
      title: '培育建议',
      shortTitle: '建议',
      subtitle: isLoggedIn.value ? adviceSubtitle.value : '登录后查看建议书',
      icon: 'bulb',
      iconBg: 'var(--foundation-playful-surface)',
      iconColor: 'var(--foundation-playful-text)',
      requiresLogin: true,
      onTap: () => {
        if (!isLoggedIn.value) {
          requireLogin(PORTAL_ROUTES.advice)
          return
        }
        const reportId = subject.value?.reportId
        openPage(reportId ? `${PORTAL_ROUTES.advice}?reportId=${encodeURIComponent(reportId)}` : PORTAL_ROUTES.advice)
      },
    },
    {
      key: 'direction',
      title: '培养方向',
      shortTitle: '方向',
      subtitle: isLoggedIn.value ? directionSubtitle.value : '登录后选择方向',
      icon: 'locate',
      iconBg: 'var(--foundation-info-surface)',
      iconColor: 'var(--foundation-info-text)',
      requiresLogin: true,
      onTap: () => {
        if (!isLoggedIn.value) {
          requireLogin(PORTAL_ROUTES.direction)
          return
        }
        switchTab('direction')
      },
    },
    {
      key: 'children',
      title: '孩子管理',
      shortTitle: '孩子',
      subtitle: childrenSubtitle.value,
      icon: 'user-group',
      iconBg: 'var(--foundation-accent-surface)',
      iconColor: 'var(--foundation-accent-text)',
      requiresLogin: true,
      onTap: () => {
        if (!isLoggedIn.value) {
          requireLogin(PORTAL_ROUTES.profileChildren)
          return
        }
        openPage(PORTAL_ROUTES.profileChildren)
      },
    },
  ])

  /** 前往孩子管理（待核对提示）。 */
  function openChildren(): void {
    if (!isLoggedIn.value) {
      requireLogin(PORTAL_ROUTES.profileChildren)
      return
    }
    openPage(PORTAL_ROUTES.profileChildren)
  }

  /** 报告主栏。 */
  function openReportTab(): void {
    if (!isLoggedIn.value) {
      requireLogin(PORTAL_ROUTES.report)
      return
    }
    switchTab('report')
  }

  /** 我的主栏。 */
  function openProfileTab(): void {
    switchTab('profile')
  }

  /** 客服拨号（未配置号码时隐藏入口）。 */
  function callService(): void {
    const phone = String(site.value.contactPhone || '')
    if (!phone)
      return
    uni.makePhoneCall({ phoneNumber: phone })
  }

  /** 重新匹配未绑定的家长档案。 */
  async function reClaim(): Promise<void> {
    if (refreshing.value)
      return
    refreshing.value = true
    try {
      await session.reClaim()
      if (!store.hasSubject)
        uni.showToast({ title: store.claimStatus === 'ambiguous' ? '匹配到多份档案，请联系客服核对合并' : '仍未匹配到会员档案，请联系客服', icon: 'none' })
    }
    finally {
      refreshing.value = false
    }
  }

  /** 拉取首页数据（onShow / 网络恢复 / 手动重试共用）。 */
  async function refresh(options: { silent?: boolean } = {}): Promise<void> {
    if (!isLoggedIn.value) {
      store.resetSession()
      return
    }
    await session.ensureSession({ force: true })
    void options
  }

  /** 手动重试：给用户明确反馈，避免点了没反应。 */
  async function retry(): Promise<void> {
    if (refreshing.value)
      return
    refreshing.value = true
    try {
      await refresh()
    }
    finally {
      refreshing.value = false
    }
  }

  const { offline } = useNetworkStatus(() => {
    if (isLoggedIn.value)
      void refresh()
  })

  /** 登录态变化：登录后自动拉取，退出后清缓存。 */
  watch(isLoggedIn, (loggedIn) => {
    if (loggedIn)
      void refresh()
    else
      store.resetSession()
  }, { immediate: true })

  onMounted(() => {
    skeletonTimer = setTimeout(() => {
      skeletonReady.value = true
    }, SKELETON_DELAY_MS)
  })
  onUnmounted(() => {
    if (skeletonTimer)
      clearTimeout(skeletonTimer)
  })

  // H5 首次进入不一定触发 onShow，补一次；ensureSession 内部有并发与缓存保护。
  onShow(() => {
    if (isLoggedIn.value)
      void refresh()
  })

  return {
    site,
    user,
    isLoggedIn,
    subject,
    pendingCheckText,
    pendingCheckCount,
    state,
    showSkeleton,
    offline,
    hasReadableReport,
    reportSubtitle,
    adviceSubtitle,
    directionSubtitle,
    childrenSubtitle,
    recentReport,
    gridItems,
    refreshing,
    openChildren,
    openReportTab,
    openProfileTab,
    callService,
    reClaim,
    retry,
    refresh,
    handleTab: (tab: PortalTab) => switchTab(tab),
  }
}
