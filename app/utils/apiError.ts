/**
 * @description 统一提取后端 API 错误信息（ofetch FetchError 形态）
 * @file app/utils/apiError.ts
 *
 * 后端统一返回 { code, message, data }，ofetch 把响应体放在 err.data，
 * 而非 err.response.data。这里按优先级取出友好 message，过滤掉
 * "[POST] \"/api/...\": 400 Bad Request" 这类裸错误串。
 */

/** 从捕获到的请求错误中取出可展示的中文 message */
export function getApiErrorMessage(err: unknown, fallback = '操作失败，请重试'): string {
  const e = err as Record<string, any>
  const raw
    = e?.data?.message // ofetch: 响应体
      || e?.response?._data?.message // ofetch raw 响应
      || e?.statusMessage // h3 createError
      || ''
  if (raw) return cleanApiErrorMessage(raw)
  // e.message 多为 "[POST] \"/api/x\": 400 Bad Request"，无信息量 → 用兜底
  const msg = e?.message || ''
  if (msg && !/^\[\w+\]\s|Bad Request|Failed to fetch/i.test(msg)) return msg
  return fallback
}

/** 清洗后端原始信息：去 Zod 字段前缀、映射认证类错误 */
export function cleanApiErrorMessage(raw: string): string {
  if (!raw) return ''
  const cleaned = raw.replace(/^\w+:\s*/, '')
  if (/authenticate|Invalid login|invalid credentials/i.test(cleaned)) return '账号或密码错误'
  return cleaned
}
