/**
 * @description 基础系统健康检查 API。
 * @file app/composables/api/useHealthApi.ts
 */
export interface FoundationHealthSnapshot {
  overall: 'healthy' | 'degraded' | 'critical'
  timestamp: string
  datasource: {
    pbConnected: boolean
    pbVersion?: string
    collections: number
  }
  errorSummary: {
    total: number
    unresolved: number
    today: number
  }
  online: number
  env: Array<{
    key: string
    label: string
    ok: boolean
    required: boolean
  }>
}

export function useHealthApi() {
  const fetchHealth = (options: { suppressErrorToast?: boolean } = {}) =>
    useApi<FoundationHealthSnapshot>('/api/admin/monitor/health', options)
  return { fetchHealth }
}
