/**
 * @description Config API module — 参数配置管理 CRUD
 * @file app/composables/api/useConfigApi.ts
 */

export function useConfigApi() {
  const fetchConfigs = (params: { page?: number; pageSize?: number; configName?: string; configKey?: string; configType?: string }) =>
    useApi<PaginatedResponse<ConfigEntity>>('/api/admin/config', { params })

  const createConfig = (data: {
    configName: string; configKey: string; configValue: string
    configType?: string; remark?: string
  }) =>
    useApi<ConfigEntity>('/api/admin/config', { method: 'POST', body: data, successToast: true })

  const updateConfig = (id: string, data: {
    configName?: string; configKey?: string; configValue?: string
    configType?: string; remark?: string
  }) =>
    useApi<ConfigEntity>(`/api/admin/config/${id}`, { method: 'PUT', body: data, successToast: true })

  const deleteConfig = (id: string) =>
    useApi<null>(`/api/admin/config/${id}`, { method: 'DELETE', successToast: true })

  const getConfigByKey = (key: string) =>
    useApi<{ id: string; configName: string; configKey: string; configValue: string; configType: string; remark: string }>(`/api/admin/config/by-key/${key}`, { suppressErrorToast: true })

  return { fetchConfigs, createConfig, updateConfig, deleteConfig, getConfigByKey }
}
