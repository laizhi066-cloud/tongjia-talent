/**
 * @description 受保护页面守卫：深链/刷新直达业务页时校验登录态，未登录带 redirect 跳登录页。
 *   与路由拦截器共用同一套导航规则（`navigation.ts`），避免两处行为不一致。
 * @file src/modules/foundation-portal/composables/useProtectedPage.ts
 */
import { onLoad } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import { useAuthStore } from '@/store/auth'
import { currentPageUrl, redirectToLogin } from '../navigation'

/** 页面级登录守卫：未登录时 `redirectTo` 登录页并携带当前页面回跳地址。 */
export function useProtectedPage() {
  const authStore = useAuthStore()
  const authorized = ref(authStore.isLoggedIn)
  let blocked = false

  onLoad(() => {
    if (authStore.isLoggedIn) {
      authorized.value = true
      return
    }
    authorized.value = false
    if (blocked)
      return
    blocked = true
    redirectToLogin(currentPageUrl())
  })

  return { isAuthorized: computed(() => authorized.value) }
}
