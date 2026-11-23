/**
 * @description 首页 / 我的 / 公共页面共用的站点主题、认证态与导航动作。
 * @file src/modules/foundation-portal/composables/useFoundationPortal.ts
 */
import { computed } from 'vue'
import { resetSessionEvents } from '@/http/session'
import { useAuthStore } from '@/store/auth'
import { useSiteStore } from '@/store/site'
import { useTalentPortalStore } from '@/store/talent-portal'
import {
  currentPageUrl,
  goToLogin,
  openPage,
  PORTAL_ROUTES,
  switchTab,
} from '../navigation'
import type { PortalTab } from '../navigation'

/** 组合唯一站点与中性账户资料，供薄路由页面向展示组件传值。 */
export function useFoundationPortal() {
  const authStore = useAuthStore()
  const siteStore = useSiteStore()
  const talentStore = useTalentPortalStore()

  const site = computed(() => siteStore.site)
  const themeVars = computed(() => siteStore.themeVars)
  const isDark = computed(() => siteStore.isDark)
  const user = computed(() => authStore.profile)
  const isLoggedIn = computed(() => authStore.isLoggedIn)
  const isSiteLoading = computed(() => !siteStore.loaded)
  const contactPhone = computed(() => siteStore.site.contactPhone || '')

  /** 刷新账户资料；未登录时不做请求。 */
  async function refreshProfile(): Promise<void> {
    await authStore.refreshProfile()
  }

  /** 前往登录页（默认回跳当前页面）。 */
  function goToLoginWithRedirect(redirect?: string): void {
    goToLogin(redirect || currentPageUrl())
  }

  /** 切换 4 主栏。 */
  function handleTab(tab: PortalTab): void {
    switchTab(tab)
  }

  /** 前往个人资料编辑页。 */
  function goToProfile(): void {
    if (!authStore.isLoggedIn) {
      goToLogin(currentPageUrl())
      return
    }
    openPage(PORTAL_ROUTES.profileEdit)
  }

  /** 前往孩子管理页。 */
  function goToChildren(): void {
    if (!authStore.isLoggedIn) {
      goToLogin(currentPageUrl())
      return
    }
    openPage(PORTAL_ROUTES.profileChildren)
  }

  /** 前往隐私政策。 */
  function goToPrivacy(): void {
    openPage(PORTAL_ROUTES.privacy)
  }

  /** 前往用户协议。 */
  function goToAgreement(): void {
    openPage(PORTAL_ROUTES.agreement)
  }

  /** 前往关于页。 */
  function goToAbout(): void {
    openPage(PORTAL_ROUTES.about)
  }

  /** 退出登录：清会话、清天赋缓存，回登录页。 */
  function logout(): void {
    authStore.logout()
    talentStore.resetSession()
    resetSessionEvents()
    uni.reLaunch({ url: PORTAL_ROUTES.login })
  }

  return {
    site,
    themeVars,
    isDark,
    user,
    isLoggedIn,
    isSiteLoading,
    contactPhone,
    refreshProfile,
    goToLogin,
    goToLoginWithRedirect,
    handleTab,
    goToProfile,
    goToChildren,
    goToAgreement,
    goToPrivacy,
    goToAbout,
    logout,
  }
}
