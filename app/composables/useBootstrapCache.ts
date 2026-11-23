/**
 * @description Bootstrap 响应共享缓存 — 使用 useState 实现 SSR 安全的缓存共享
 * 首次导航时 permission-guard middleware 拉取后缓存，后续组件直接读取
 * 缓存 TTL 5 分钟，过期自动触发重新拉取
 * @file app/composables/useBootstrapCache.ts
 */

const CACHE_TTL = 5 * 60 * 1000 // 5 分钟
let refreshCounter = 0 // 用于通知外部缓存已刷新

export function useBootstrapCache() {
  const _cache = useState<Record<string,unknown>|null>('bootstrap-cache-v2', () => null)
  const _cacheTime = useState<number>('bootstrap-cache-time-v2', () => 0)
  const _cacheUserId = useState<string>('bootstrap-cache-user-id-v2', () => '')

  function currentUserId(): string {
    return String(useAuthSession().record.value?.id || '')
  }

  function getBootstrapCache(): Record<string,unknown>|null {
    if (_cacheUserId.value !== currentUserId()) {
      clearBootstrapCache()
      return null
    }
    if (Date.now() - _cacheTime.value > CACHE_TTL) {
      return null
    }
    return _cache.value
  }

  function setBootstrapCache(data: Record<string,unknown>): void {
    _cache.value = data
    _cacheTime.value = Date.now()
    _cacheUserId.value = String((data.user as Record<string, unknown> | undefined)?.id || currentUserId())
    refreshCounter++
  }

  function clearBootstrapCache(): void {
    _cache.value = null
    _cacheTime.value = 0
    _cacheUserId.value = ''
  }

  function getCacheVersion(): number {
    return _cacheTime.value
  }

  function getRefreshCounter(): number {
    return refreshCounter
  }

  return { getBootstrapCache, setBootstrapCache, clearBootstrapCache, getCacheVersion, getRefreshCounter }
}
