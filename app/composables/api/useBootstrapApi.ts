/**
 * @description Bootstrap API module — 初始化数据（权限 + 菜单树 + 路由映射）
 * @file app/composables/api/useBootstrapApi.ts
 */

export function useBootstrapApi() {
  const fetchBootstrap = () =>
    useApi<Record<string, unknown>>('/api/admin/bootstrap')

  return { fetchBootstrap }
}
