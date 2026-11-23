/**
 * @description 会话事件处理：401 过期回登录（带回跳）、403 账号停用进停用页。
 *   同一次会话内并发多个失败请求只跳转一次；跳转前清空认证与天赋缓存。
 * @file src/modules/foundation-portal/composables/useSessionGuard.ts
 */
import { resetSessionEvents, setSessionEventHandler } from '@/http/session'
import { useAuthStore } from '@/store/auth'
import { useTalentPortalStore } from '@/store/talent-portal'
import { currentPageUrl, isProtectedPath, PORTAL_ROUTES } from '../navigation'

/** 安装全局会话事件处理；在 App.vue onLaunch 中调用一次。 */
export function installSessionGuard(): void {
  setSessionEventHandler((event) => {
    const authStore = useAuthStore()
    const talentStore = useTalentPortalStore()
    const redirect = isProtectedPath(currentPageUrl()) ? currentPageUrl() : ''
    authStore.logout()
    talentStore.resetSession()
    resetSessionEvents()
    if (event === 'disabled') {
      uni.reLaunch({ url: `${PORTAL_ROUTES.locked}?reason=account_disabled` })
      return
    }
    const query = redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''
    uni.reLaunch({ url: `${PORTAL_ROUTES.login}${query}` })
  })
}
