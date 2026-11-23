/**
 * @description 天赋会话编排：登录完成后统一刷新资料、认领家长档案、加载 summary；
 *   页面只消费这里的结果，不直接拼请求。
 * @file src/modules/talent-portal/composables/useTalentSession.ts
 */
import { ref } from 'vue'
import { useAuthStore } from '@/store/auth'
import { useTalentPortalStore } from '@/store/talent-portal'
import type { TalentSummarySubject } from '@/api/talent-types'

/** 登录 / 冷启动 / 回到前台时共用的会话编排。 */
export function useTalentSession() {
  const authStore = useAuthStore()
  const store = useTalentPortalStore()
  const bootstrapping = ref(false)

  /**
   * 确保会话与对象状态可用：
   * 1. 未登录直接返回 false（页面展示游客态）；
   * 2. 首次进入先尝试 claim 唯一家长档案（本机已有结果则跳过）；
   * 3. 拉取 summary（服务端未就绪时 store 自动兜底 bindings）。
   */
  async function ensureSession(options: { force?: boolean } = {}): Promise<boolean> {
    if (!authStore.isLoggedIn) {
      store.resetSession()
      return false
    }
    if (bootstrapping.value)
      return store.resolved
    if (!options.force && store.resolved)
      return true
    bootstrapping.value = true
    try {
      await store.claimIfNeeded()
      return await store.loadSummary({ force: options.force })
    }
    finally {
      bootstrapping.value = false
    }
  }

  /** 登录成功后的统一收尾：刷新中性资料 → claim → 拉 summary。 */
  async function completeLogin(): Promise<void> {
    await authStore.refreshProfile()
    await ensureSession({ force: true })
  }

  /** 切换当前对象并刷新（本机记忆，不发写接口）。 */
  async function switchSubject(subject: TalentSummarySubject): Promise<boolean> {
    if (!store.setCurrentSubject(subject.subjectId))
      return false
    await store.loadSummary({ force: true })
    return true
  }

  /** 重新匹配：强制重新认领并刷新对象。 */
  async function reClaim(): Promise<void> {
    await store.claimIfNeeded(true)
    await store.loadSummary({ force: true })
  }

  return { bootstrapping, ensureSession, completeLogin, switchSubject, reClaim }
}
