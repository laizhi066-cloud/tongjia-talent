/**
 * @description 登录态初始化插件 — 从本地存储恢复 token 并设置全局 auth 状态（解决刷新闪烁）
 *             前端不再实例化 PocketBase SDK，仅用 useAuthSession 读取本地 token。
 * @file app/plugins/auth-session.client.ts
 */
export default defineNuxtPlugin({
  name: 'auth-session',
  setup() {
    const session = useAuthSession()

    // microtask 确保 useState 已从 localStorage 恢复，再通知全局 auth 状态
    Promise.resolve().then(() => {
      const { authState } = useAuthState()
      authState.value = session.isValid.value ? 'authenticated' : 'unauthenticated'
    })
  },
})
