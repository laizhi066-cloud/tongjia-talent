/**
 * @description 当前登录用户 composable（基于本地 session，前端不直连 PocketBase）
 * @file app/composables/usePB.ts
 */

/**
 * 获取当前登录用户记录（响应式）
 * 数据来自 useAuthSession（服务端登录 API 返回并存于本地），未登录返回 null
 */
export function usePBUser() {
  const { record } = useAuthSession()
  return computed(() => record.value as Record<string, unknown> | null)
}
