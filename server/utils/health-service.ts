/**
 * @description 单实例基础版健康快照，输出与后台健康页一致的稳定结构。
 * @file server/utils/health-service.ts
 */
import type PocketBase from 'pocketbase'
import { pbUrl } from './pb-env'
import { isOssEnabled } from './oss-config'

export type HealthLevel = 'healthy' | 'degraded' | 'critical'

export interface FoundationHealthSnapshot {
  overall: HealthLevel
  timestamp: string
  datasource: {
    pbConnected: boolean
    pbVersion: string
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

interface PocketBaseHealthResponse {
  version?: string
  data?: {
    version?: string
  }
}

/**
 * PocketBase 会自动创建 `_` 前缀的内部集合；基础概览只统计本项目声明的数据集合。
 *
 * @param collections PocketBase 返回的集合元数据。
 * @returns 不含 PocketBase 内部集合的基础集合数量。
 */
export function countFoundationCollections(collections: ReadonlyArray<{ name?: string }>): number {
  return collections.filter((collection) => {
    const name = String(collection.name || '')
    return Boolean(name) && !name.startsWith('_')
  }).length
}

export function computeOverall(input: { pbConnected: boolean, requiredEnvMissing: number, unresolvedErrors: number }): HealthLevel {
  if (!input.pbConnected || input.requiredEnvMissing > 0) return 'critical'
  if (input.unresolvedErrors >= 20) return 'degraded'
  return 'healthy'
}

async function count(pb: PocketBase, collection: string, filter = ''): Promise<number> {
  try {
    const page = await pb.collection(collection).getList(1, 1, {
      filter: filter || undefined,
      $autoCancel: false,
    })
    return page.totalItems
  }
  catch {
    return 0
  }
}

function localDayStart(): string {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  return start.toISOString().replace('T', ' ').slice(0, 19)
}

function environmentSnapshot(): FoundationHealthSnapshot['env'] {
  return [
    { key: 'POCKETBASE_ADMIN_EMAIL', label: 'PocketBase 超管邮箱', ok: Boolean(process.env.POCKETBASE_ADMIN_EMAIL), required: true },
    { key: 'POCKETBASE_ADMIN_PASSWORD', label: 'PocketBase 超管密码', ok: Boolean(process.env.POCKETBASE_ADMIN_PASSWORD), required: true },
    { key: 'ENCRYPTION_KEY', label: '敏感配置加密密钥', ok: Boolean(process.env.ENCRYPTION_KEY), required: true },
    { key: 'POCKETBASE_PUBLIC_URL', label: '文件公开地址', ok: Boolean(process.env.POCKETBASE_PUBLIC_URL), required: false },
    { key: 'OSS_ENABLED', label: '报告 PDF OSS 开关', ok: true, required: false },
    { key: 'OSS_ACCESS_KEY_ID', label: 'OSS AccessKey ID', ok: !isOssEnabled() || Boolean(process.env.OSS_ACCESS_KEY_ID), required: isOssEnabled() },
    { key: 'OSS_ACCESS_KEY_SECRET', label: 'OSS AccessKey Secret', ok: !isOssEnabled() || Boolean(process.env.OSS_ACCESS_KEY_SECRET), required: isOssEnabled() },
  ]
}

async function pocketBaseVersion(): Promise<string> {
  try {
    const response = await fetch(`${pbUrl().replace(/\/+$/, '')}/api/health`)
    const body = await response.json() as PocketBaseHealthResponse
    return body.version || body.data?.version || ''
  }
  catch {
    return ''
  }
}

/** 聚合唯一 PocketBase、错误记录和在线会话的健康状态。 */
export async function buildHealthSnapshot(pb: PocketBase): Promise<FoundationHealthSnapshot> {
  let pbConnected = false
  let collections = 0
  try {
    collections = countFoundationCollections(await pb.collections.getFullList({ $autoCancel: false }))
    pbConnected = true
  }
  catch { /* 断连时保持 0，并由 overall 标为异常。 */ }

  const [total, unresolved, today, online, pbVersion] = await Promise.all([
    count(pb, 'error_logs'),
    count(pb, 'error_logs', 'status = "new"'),
    count(pb, 'error_logs', `lastSeen >= "${localDayStart()}"`),
    count(pb, 'user_sessions', `lastActivityTime >= "${new Date(Date.now() - 30 * 60 * 1000).toISOString().replace('T', ' ')}" && status = "online"`),
    pocketBaseVersion(),
  ])
  const env = environmentSnapshot()
  const requiredEnvMissing = env.filter(item => item.required && !item.ok).length

  return {
    timestamp: new Date().toISOString(),
    overall: computeOverall({ pbConnected, requiredEnvMissing, unresolvedErrors: unresolved }),
    datasource: { pbConnected, pbVersion, collections },
    errorSummary: { total, unresolved, today },
    online,
    env,
  }
}
