/**
 * @description 通用分页查询助手 + 批量操作 — 基于 PocketBase 实现
 * @file server/utils/crud.ts
 */
import { escapeFilterValue, getAdminPB } from './pocketbase-client'
import { success } from './response'
import { publicPbUrl } from './file-url'

export interface PaginatedOptions {
  /** 需要展开的关联字段 */
  expand?: string
  /** 排序字段，默认 -id（PocketBase id 基于时间戳，效果等同 -created） */
  sort?: string
  /** 对每条记录做后处理（字段映射、脱敏、添加计算字段） */
  transform?: (item: any) => any
  /** 需要将文件名替换为完整访问 URL 的文件字段名列表 */
  fileFields?: string[]
  /** 关键词模糊搜索字段：传入后，query.keyword 命中任一字段（OR）即返回（与既有 filter 取 AND） */
  keywordFields?: string[]
}

export interface BatchResult {
  /** 成功数量 */
  success: number
  /** 失败数量 */
  failed: number
  /** 失败详情 */
  errors: string[]
}

/**
 * 通用分页查询
 * @param collectionName - PocketBase 集合名（如 'users', 'roles'）
 * @param query - 请求中的查询参数（page, pageSize）
 * @param filter - PocketBase filter 表达式（如 'status = "0"'）
 * @param options - 可选参数
 */
/** 安全解析正整数分页参数，非数字输入回退到默认值，避免向 PocketBase 传入 NaN。 */
export function parsePositiveInt(raw: unknown, fallback: number, max?: number): number {
  const parsed = Number.parseInt(String(raw ?? ''), 10)
  const valid = Number.isFinite(parsed) && parsed >= 1 ? parsed : fallback
  return max !== undefined ? Math.min(max, valid) : valid
}

function applyFileFieldUrls<T>(items: T[], collectionName: string, fileFields?: string[]): T[] {
  if (!fileFields?.length) return items
  const pbUrl = publicPbUrl()
  return items.map((item: any) => {
    const resolved = { ...item }
    for (const field of fileFields) {
      const value = resolved[field]
      if (typeof value === 'string' && value && !/^https?:\/\//i.test(value)) {
        resolved[field] = `${pbUrl}/api/files/${collectionName}/${resolved.id}/${encodeURIComponent(value)}`
      }
    }
    return resolved
  })
}

export async function paginatedQuery<T = Record<string, unknown>>(
  collectionName: string,
  query: { page?: string; pageSize?: string; exportAll?: string; keyword?: string },
  filter: string = '',
  options?: PaginatedOptions,
) {
  // 返回类型由 success() 推断（data 非空），避免调用方 result.data 被判可空
  const pb = await getAdminPB()

  // 关键词模糊搜索（opt-in）：命中 keywordFields 任一字段即可，与传入 filter 取 AND
  const kw = String(query.keyword || '').trim()
  if (kw && options?.keywordFields?.length) {
    const esc = escapeFilterValue(kw)
    const kwClause = `(${options.keywordFields.map(f => `${f} ~ "${esc}"`).join(' || ')})`
    filter = filter ? `${filter} && ${kwClause}` : kwClause
  }

  // 导出模式：忽略分页，拉取全部匹配数据
  if (query.exportAll === '1') {
    let items = await pb.collection(collectionName).getFullList({
      filter: filter || undefined,
      expand: options?.expand || undefined,
      sort: options?.sort || '-id',
      $autoCancel: false,
    })
    if (options?.transform) {
      items = items.map(options.transform)
    }
    items = applyFileFieldUrls(items, collectionName, options?.fileFields)

    return success({ rows: items as T[], total: items.length, page: 1, pageSize: items.length })
  }

  const page = parsePositiveInt(query.page, 1)
  const pageSize = parsePositiveInt(query.pageSize, 10, 100)

  const result = await pb.collection(collectionName).getList(page, pageSize, {
    filter: filter || undefined,
    expand: options?.expand || undefined,
    sort: options?.sort || '-id',
    $autoCancel: false,
  })

  let items = result.items as T[]
  if (options?.transform) {
    items = items.map(options.transform) as T[]
  }
  items = applyFileFieldUrls(items, collectionName, options?.fileFields)

  return success({ rows: items, total: result.totalItems, page, pageSize })
}

/**
 * 批量删除 — 用 Promise.allSettled 隔离单条失败，不因一条错误导致全部回滚
 * @param collectionName - PocketBase 集合名
 * @param ids - 要删除的记录 ID 列表
 */
export async function batchDelete(
  collectionName: string,
  ids: string[],
): Promise<BatchResult> {
  if (!ids.length) return { success: 0, failed: 0, errors: [] }
  const pb = await getAdminPB()
  const results = await Promise.allSettled(
    ids.map((id) => pb.collection(collectionName).delete(id)),
  )

  const errors: string[] = []
  let success = 0
  for (const r of results) {
    if (r.status === 'fulfilled') success++
    else errors.push(r.reason?.message || 'Unknown error')
  }

  return { success, failed: ids.length - success, errors }
}

/**
 * 批量更新 — 用 Promise.allSettled 隔离单条失败
 * @param collectionName - PocketBase 集合名
 * @param ids - 要更新的记录 ID 列表
 * @param data - 更新数据
 */
export async function batchUpdate<T extends Record<string, unknown>>(
  collectionName: string,
  ids: string[],
  data: T,
): Promise<BatchResult> {
  if (!ids.length) return { success: 0, failed: 0, errors: [] }
  const pb = await getAdminPB()
  const results = await Promise.allSettled(
    ids.map((id) => pb.collection(collectionName).update(id, data)),
  )

  const errors: string[] = []
  let success = 0
  for (const r of results) {
    if (r.status === 'fulfilled') success++
    else errors.push(r.reason?.message || 'Unknown error')
  }

  return { success, failed: ids.length - success, errors }
}
