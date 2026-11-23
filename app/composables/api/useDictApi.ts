/**
 * @description Dict API module — 字典管理（类型 + 数据）
 * @file app/composables/api/useDictApi.ts
 */

export function useDictApi() {
  // ─── 字典类型 ───
  const fetchDictTypes = (params: { page?: number; pageSize?: number; dictName?: string; dictType?: string; status?: string }) =>
    useApi<PaginatedResponse<DictTypeEntity>>('/api/admin/dict/type', { params })

  const createDictType = (data: { dictName: string; dictType: string; status?: string; remark?: string }) =>
    useApi<DictTypeEntity>('/api/admin/dict/type', { method: 'POST', body: data, successToast: true })

  const updateDictType = (id: string, data: { dictName?: string; dictType?: string; status?: string; remark?: string }) =>
    useApi<DictTypeEntity>(`/api/admin/dict/type/${id}`, { method: 'PUT', body: data, successToast: true })

  const deleteDictType = (id: string) =>
    useApi<null>(`/api/admin/dict/type/${id}`, { method: 'DELETE', successToast: true })

  const getDictType = (id: string) =>
    useApi<DictTypeEntity>(`/api/admin/dict/type/${id}`)

  // ─── 字典数据 ───
  const fetchDictData = (params: { page?: number; pageSize?: number; dictType?: string; dictLabel?: string; status?: string }) =>
    useApi<PaginatedResponse<DictDataEntity>>('/api/admin/dict/data', { params })

  const createDictData = (data: {
    dictType: string; dictLabel: string; dictValue: string; dictSort?: number
    listClass?: string; icon?: string; backgroundColor?: string; color?: string
    isDefault?: string; status?: string; remark?: string; cssClass?: string
  }) =>
    useApi<DictDataEntity>('/api/admin/dict/data', { method: 'POST', body: data, successToast: true })

  const updateDictData = (id: string, data: {
    dictType?: string; dictLabel?: string; dictValue?: string; dictSort?: number
    listClass?: string; icon?: string; backgroundColor?: string; color?: string
    isDefault?: string; status?: string; remark?: string; cssClass?: string
  }) =>
    useApi<DictDataEntity>(`/api/admin/dict/data/${id}`, { method: 'PUT', body: data, successToast: true })

  const deleteDictData = (id: string) =>
    useApi<null>(`/api/admin/dict/data/${id}`, { method: 'DELETE', successToast: true })

  // ─── 批量获取（供前端字典缓存） ───
  const fetchDictBatch = (types: string[]) =>
    useApi<Record<string, DictDataEntity[]>>('/api/admin/dict/types/data', { params: { types: types.join(',') } })

  return {
    fetchDictTypes, createDictType, updateDictType, deleteDictType, getDictType,
    fetchDictData, createDictData, updateDictData, deleteDictData,
    fetchDictBatch,
  }
}
