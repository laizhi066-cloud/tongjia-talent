/**
 * @description 基础错误监控 API。
 * @file app/composables/api/useErrorLogApi.ts
 */
export interface ErrorLogStats {
  total: number
  unresolved: number
  resolved: number
  today: number
}

export interface ErrorMonitorConfig {
  enabled: boolean
  ignoreKeywords: string[]
}

export function useErrorLogApi() {
  const fetchErrors = (params: { page?: number, pageSize?: number, source?: string, level?: string, status?: string, keyword?: string }) =>
    useApi<PaginatedResponse<ErrorLogRecord>>('/api/admin/monitor/error', { params })
  const fetchStats = () => useApi<ErrorLogStats>('/api/admin/monitor/error/stats')
  const updateStatus = (id: string, status: 'new' | 'resolved' | 'ignored') =>
    useApi<null>(`/api/admin/monitor/error/${id}/status`, { method: 'PUT', body: { status }, successToast: true })
  const removeError = (id: string) =>
    useApi<null>(`/api/admin/monitor/error/${id}`, { method: 'DELETE', successToast: true })
  const clearErrors = (status: 'new' | 'resolved' | 'ignored' | 'all' = 'resolved') =>
    useApi<{ deleted: number }>('/api/admin/monitor/error/clear', { method: 'POST', body: { status }, successToast: true })
  const fetchErrorMonitorConfig = () =>
    useApi<ErrorMonitorConfig>('/api/admin/monitor/error/config', { suppressErrorToast: true })
  const updateErrorMonitorConfig = (data: ErrorMonitorConfig) =>
    useApi<ErrorMonitorConfig>('/api/admin/monitor/error/config', { method: 'PUT', body: data })
  return { fetchErrors, fetchStats, updateStatus, removeError, clearErrors, fetchErrorMonitorConfig, updateErrorMonitorConfig }
}

interface ErrorLogRecord {
  id: string
  source?: string
  level?: string
  message: string
  stack?: string
  url?: string
  method?: string
  status?: 'new' | 'resolved' | 'ignored'
  statusCode?: number
  platform?: string
  ua?: string
  created: string
}
