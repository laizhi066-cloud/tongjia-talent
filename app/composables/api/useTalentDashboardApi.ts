/**
 * @description 平台天赋工作台 API 封装。
 * @file app/composables/api/useTalentDashboardApi.ts
 */

export interface TalentDashboardData {
  parents: { total: number; boundChildren: number }
  children: { found: number; pending: number; total: number }
  reports: { published: number; pending: number; withdrawn: number; total: number }
  pending: { total: number; pendingReports: number; pendingChildren: number }
  recent: Array<{
    id: string
    time: string
    operator: string
    title: string
    status: number
  }>
}

export function useTalentDashboardApi() {
  return {
    fetchDashboard: () => useApi<TalentDashboardData>('/api/admin/talent/dashboard'),
  }
}
