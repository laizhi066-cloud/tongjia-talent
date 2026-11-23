/**
 * @description 后台登录后的安全回跳地址校验，仅允许本地管理路由。
 * @file app/utils/safe-admin-redirect.ts
 */
import type { LocationQueryValue } from 'vue-router'

type RedirectQueryValue = LocationQueryValue | LocationQueryValue[] | undefined

/**
 * 过滤登录 URL 中的回跳地址，避免开放跳转并为无效目标提供稳定兜底。
 *
 * @param value 路由查询参数中的 redirect 值。
 * @returns 可安全跳转的后台内部路径。
 */
export function safeAdminRedirect(value: RedirectQueryValue): string {
  const candidate = Array.isArray(value) ? value[0] : value
  if (typeof candidate !== 'string') return '/admin/talent/dashboard'
  // 登录回跳只允许站内后台；机构端已随 M6 退出，/org/** 不再放行，
  // 同时不接受协议、域名或其他站外跳转地址。
  if (candidate === '/admin' || candidate.startsWith('/admin/')) return candidate
  return '/admin/talent/dashboard'
}