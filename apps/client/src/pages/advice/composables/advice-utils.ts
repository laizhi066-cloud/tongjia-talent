/**
 * @description 培育建议页共用纯工具与错误映射：分册序号 / 分册页映射、数据熵筛选本机记忆、
 *   报告状态与接口错误到页面状态的映射（不依赖页面实例）。
 * @file src/pages/advice/composables/advice-utils.ts
 */
import { apiErrorCode, apiErrorMessage, apiErrorState, apiErrorStatus } from '@/http/http'
import type { TalentEntropyOption } from '@/api/talent-types'

/** 建议页可展示的异常 / 前置状态。 */
export type AdviceBlockingState = 'empty' | 'no-report' | 'pending' | 'retracted' | 'unbound' | 'notfound' | 'invalid' | 'error' | 'session'

/** 页面阻断状态文案（标题 + 说明 + 可选动作）。 */
export interface AdviceBlockingCopy {
  title: string
  message: string
  actionText: string
}

const BOOK_ORDER = 'ABCDEF'

/** A–F 内部键 → 1 起的展示序号；非法键返回 0。 */
export function adviceBookOrdinal(book: string): number {
  const index = BOOK_ORDER.indexOf(String(book || '').toUpperCase())
  return index >= 0 ? index + 1 : 0
}

/** A–F → 报告分册 V1–V6（与 M3 固定映射一致）；非法键返回空串。 */
export function adviceBookVolumeId(book: string): string {
  const ordinal = adviceBookOrdinal(book)
  return ordinal ? `V${ordinal}` : ''
}

/** 是否为合法建议书内部键 A–F（只用于定位，不展示字母）。 */
export function isValidAdviceBook(book: string): boolean {
  return adviceBookOrdinal(book) > 0
}

/** 数据熵摘要：`卓越 1 / 优秀 2`，无等级返回空串。 */
export function entropySummaryOf(options: TalentEntropyOption[]): string {
  return (options || [])
    .filter(item => Boolean(item.name))
    .map(item => `${item.name} ${item.count}`)
    .join(' / ')
}

/** 数据熵标签语义色。 */
export function entropyTagType(level: string): 'primary' | 'success' | 'warning' | 'danger' | 'default' {
  if (level === '卓越')
    return 'warning'
  if (level === '优秀')
    return 'success'
  if (level === '优良')
    return 'primary'
  if (level === '弱态' || level === '弱势')
    return 'danger'
  return 'default'
}

/** 筛选记忆 key：按账号 + 分册隔离，切换账号不会串用。 */
export function adviceFilterStorageKey(userId: string, book: string): string {
  return `foundation:talent:adv:${userId || 'anonymous'}:${String(book || '').toUpperCase()}`
}

/** 读取本机记住的数据熵筛选；存储不可用时回退「全部」。 */
export function readAdviceEntropyFilter(userId: string, book: string): string {
  try {
    const raw = uni.getStorageSync(adviceFilterStorageKey(userId, book))
    return typeof raw === 'string' ? raw : ''
  }
  catch {
    return ''
  }
}

/** 写入数据熵筛选；空串代表「全部」并清除记忆。 */
export function writeAdviceEntropyFilter(userId: string, book: string, entropy: string): void {
  try {
    if (entropy)
      uni.setStorageSync(adviceFilterStorageKey(userId, book), entropy)
    else
      uni.removeStorageSync(adviceFilterStorageKey(userId, book))
  }
  catch {
    // 存储不可用只影响下次进入时的默认筛选，不影响当前页面。
  }
}

/** 报告状态阻断文案（§11.2 固定口径，不改写）。 */
export function adviceBlockingCopy(state: AdviceBlockingState, message = ''): AdviceBlockingCopy {
  switch (state) {
    case 'no-report':
      return { title: '暂无基因报告', message: '建议与报告同时发布，报告生成后会按分册推送。', actionText: '先看基因报告' }
    case 'pending':
      return { title: '报告整理中', message: '报告正在整理中，发布后即可查看培育建议。', actionText: '返回报告' }
    case 'retracted':
      return { title: '报告内容更新中', message: '报告内容正在更新，完成后恢复查看培育建议。', actionText: '返回报告' }
    case 'unbound':
      return { title: '暂未关联会员档案', message: '请确认手机号与后台登记一致；如仍未匹配，请联系客服核对会员档案。', actionText: '返回首页' }
    case 'notfound':
      return { title: '内容不可查看', message: '该对象的报告或建议暂不可查看，请返回报告页重试。', actionText: '返回报告' }
    case 'empty':
      return { title: '暂未收到培育建议', message: '建议与报告同时发布，按分册推送。', actionText: '返回报告' }
    case 'invalid':
      return { title: '内容不可查看', message: '链接参数不完整或已失效，请从建议列表重新进入。', actionText: '返回建议列表' }
    case 'session':
      return { title: '登录状态已失效', message: '请重新登录后查看培育建议。', actionText: '重新登录' }
    case 'error':
    default:
      return { title: '培育建议暂时无法读取', message: message || '请稍后重试。', actionText: '重试' }
  }
}

/**
 * 把接口异常映射为页面阻断状态：
 * 409 → 报告整理中 / 更新中；404 → 内容不可查看；401/403 → 会话接管。
 */
export function adviceBlockingStateOf(error: unknown): { state: AdviceBlockingState, message: string } {
  const status = apiErrorStatus(error)
  const code = apiErrorCode(error)
  const reportState = apiErrorState(error)
  if (status === 409) {
    return {
      state: reportState === 'retracted' || code === 'report_retracted' ? 'retracted' : 'pending',
      message: '',
    }
  }
  if (status === 404)
    return { state: 'notfound', message: '' }
  if (status === 401 || status === 403)
    return { state: 'session', message: '' }
  return {
    state: 'error',
    message: apiErrorMessage(error, '培育建议暂时无法读取，请稍后重试。'),
  }
}
