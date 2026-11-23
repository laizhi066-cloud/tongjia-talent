/**
 * @description Monitor API module — 在线用户管理 + 心跳
 * @file app/composables/api/useMonitorApi.ts
 */

export function useMonitorApi() {
  const fetchOnlineUsers = (params: { page?: number; pageSize?: number; userName?: string }) =>
    useApi<PaginatedResponse<OnlineUserRecord>>('/api/admin/monitor/online', { params })

  const heartbeat = () =>
    useApi<null>('/api/admin/monitor/online/heartbeat', { method: 'PUT', suppressErrorToast: true })

  const forceLogout = (id: string) =>
    useApi<null>(`/api/admin/monitor/online/${id}`, { method: 'DELETE', successToast: true })

  const recordOnline = () =>
    useApi<null>('/api/admin/monitor/online', { method: 'POST' })

  const goOffline = () =>
    useApi<null>('/api/admin/monitor/online/offline', { method: 'PUT', suppressErrorToast: true })

  return { fetchOnlineUsers, heartbeat, forceLogout, recordOnline, goOffline }
}

interface OnlineUserRecord {
  id: string
  userId: string
  userName?: string
  ipaddr?: string
  browser?: string
  os?: string
  loginTime?: string
  lastActivityTime?: string
  status: string
}
