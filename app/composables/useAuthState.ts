/**
 * @description 认证状态管理 — 解决刷新时 SSR 渲染 admin 页面 → client 水合后跳转 login 的闪烁问题
 * @file app/composables/useAuthState.ts
 *
 * 核心逻辑：
 * - pending: 认证状态尚未确定（显示 loading，不渲染 admin 布局）
 * - authenticated: 已登录（正常渲染）
 * - unauthenticated: 未登录（跳转 login）
 *
 * 用法：
 *   const { authState } = useAuthState()
 *   if (authState.value === 'pending') return loading spinner
 *   if (authState.value === 'unauthenticated') return navigateTo('/login')
 */

export type AuthState = 'pending' | 'authenticated' | 'unauthenticated'

export function useAuthState() {
  const authState = useState<AuthState>('auth-state', () => 'pending')

  function setAuthenticated() {
    authState.value = 'authenticated'
  }

  function setUnauthenticated() {
    authState.value = 'unauthenticated'
  }

  /** 检查本地 session 是否持有有效 token */
  function checkAuth(): boolean {
    try {
      return useAuthSession().isValid.value
    } catch {
      return false
    }
  }

  return {
    authState,
    setAuthenticated,
    setUnauthenticated,
    checkAuth,
  }
}
