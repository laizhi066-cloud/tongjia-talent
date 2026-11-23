/**
 * @description 单实例后台的登录态本地存储。
 * @file app/composables/useAuthSession.ts
 */

interface AuthRecord {
  id?: string
  [key: string]: unknown
}

interface SessionData {
  token: string
  record: AuthRecord | null
}

const STORAGE_KEY = 'pocketbase_auth'

/** 读取 JWT 过期时间；非 JWT 令牌由服务端 401 兜底。 */
function jwtExp(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as { exp?: unknown }
    return typeof payload.exp === 'number' ? payload.exp : 0
  } catch {
    return 0
  }
}

export function useAuthSession() {
  const session = useState<SessionData | null>('auth-session', () => null)

  if (import.meta.client && session.value === null) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) session.value = JSON.parse(raw) as SessionData
    } catch {
      session.value = null
    }
  }

  const token = computed(() => session.value?.token ?? '')
  const record = computed(() => session.value?.record ?? null)
  const isValid = computed(() => {
    if (!token.value) return false
    const exp = jwtExp(token.value)
    return exp === 0 || exp * 1000 > Date.now()
  })

  function save(nextToken: string, nextRecord: AuthRecord | null): void {
    session.value = { token: nextToken, record: nextRecord }
    if (import.meta.client) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session.value))
      } catch {
        // 隐私模式下仍保持当前会话可用。
      }
    }
  }

  function clear(): void {
    session.value = null
    if (import.meta.client) {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        // 浏览器禁止写入时无需额外处理。
      }
    }
  }

  return { token, record, isValid, save, clear }
}
