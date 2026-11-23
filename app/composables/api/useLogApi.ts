/**
 * @description Log API module — 操作日志 + 登录日志
 * @file app/composables/api/useLogApi.ts
 */

export function useLogApi() {
  const fetchOperLogs = (params: {
    page?: number; pageSize?: number; title?: string; operName?: string
    status?: string; beginTime?: string; endTime?: string
  }) =>
    useApi<PaginatedResponse<OperLogRecord>>('/api/admin/log/oper', { params })

  const fetchLoginLogs = (params: {
    page?: number; pageSize?: number; userName?: string
    status?: string; beginTime?: string; endTime?: string
  }) =>
    useApi<PaginatedResponse<LoginLogRecord>>('/api/admin/log/login', { params })

  const createLoginLog = (data: { status: string; msg: string }) =>
    useApi<null>('/api/admin/log/login', { method: 'POST', body: data })

  return { fetchOperLogs, fetchLoginLogs, createLoginLog }
}

interface OperLogRecord {
  id: string
  title?: string
  operName?: string
  operType?: string
  operUrl?: string
  operIp?: string
  status?: number
  errorMsg?: string
  costTime?: number
  created: string
}

interface LoginLogRecord {
  id: string
  userName?: string
  ipaddr?: string
  status: string
  msg?: string
  loginTime?: string
  loginType?: string
  created: string
}
