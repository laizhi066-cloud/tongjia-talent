/**
 * @description 单实例 PocketBase 文件 URL 工具。
 * @file server/utils/file-url.ts
 */
import type { H3Event } from 'h3'
import { pbPublicUrl } from './pb-env'

/** 单一公开 PocketBase 地址。 */
export function publicPbUrl(): string {
  return pbPublicUrl()
}

export function pocketBaseFileUrlFromBase(baseUrl: string, collection: string, recordId: string, filename: string): string {
  if (!baseUrl || !collection || !recordId || !filename) return ''
  const base = baseUrl.replace(/\/+$/, '')
  const segments = [collection, recordId, filename].map(value => encodeURIComponent(String(value)))
  return `${base}/api/files/${segments.join('/')}`
}

/** event 参数只为既有调用兼容，URL 不再随请求或站点变化。 */
export function pocketBaseFileUrl(collection: string, recordId: string, filename: string, _event?: H3Event): string {
  return pocketBaseFileUrlFromBase(pbPublicUrl(), collection, recordId, filename)
}

export function toRelativeFileUrl(value: unknown): unknown {
  if (typeof value !== 'string' || !value) return value
  return value.replace(/^https?:\/\/[^/]+(?=\/api\/files\/)/, '')
}

export function toAbsoluteFileUrl(value: unknown): unknown {
  if (typeof value !== 'string' || !value.startsWith('/api/files/')) return value
  return `${pbPublicUrl().replace(/\/+$/, '')}${value}`
}

export function mapFileUrlArrayToRelative(value: unknown): unknown {
  return Array.isArray(value) ? value.map(toRelativeFileUrl) : value
}

export function mapFileUrlArrayToAbsolute(value: unknown): unknown {
  return Array.isArray(value) ? value.map(toAbsoluteFileUrl) : value
}
