/**
 * @description C 端路由守卫：受保护页面未登录时跳登录页并携带回跳地址。
 *   支持 navigateTo / redirectTo / reLaunch；拦截器内不直接嵌套导航，避免递归拦截。
 * @file src/router/interceptor.ts
 */
import { useAuthStore } from '@/store/auth'
import {
  isProtectedPath,
  isValidRedirect,
  PORTAL_ROUTES,
} from '@/modules/foundation-portal/navigation'

interface NavigationOptions {
  url?: string
}

/** 生成登录页地址（附带合法回跳地址）。 */
function loginUrl(redirect: string): string {
  const query = isValidRedirect(redirect) ? `?redirect=${encodeURIComponent(redirect)}` : ''
  return `${PORTAL_ROUTES.login}${query}`
}

/** 未登录进入受保护页面：取消原导航并在当前调用栈结束后跳登录页。 */
function guardNavigation(options: NavigationOptions): boolean | void {
  const url = String(options.url || '')
  if (!url || !isProtectedPath(url))
    return
  if (useAuthStore().isLoggedIn)
    return
  const target = loginUrl(url)
  // 拦截器内直接导航会再次进入拦截器；延后到当前调用栈结束后执行。
  setTimeout(() => {
    if (getCurrentPages().length > 1)
      uni.redirectTo({ url: target })
    else
      uni.reLaunch({ url: target })
  }, 0)
  return false
}

export const navigateToInterceptor = { invoke: guardNavigation }

/** 注册页面导航的统一认证守卫。 */
export const routeInterceptor = {
  install(): void {
    uni.addInterceptor('navigateTo', navigateToInterceptor)
    uni.addInterceptor('redirectTo', navigateToInterceptor)
    uni.addInterceptor('reLaunch', navigateToInterceptor)
  },
}
