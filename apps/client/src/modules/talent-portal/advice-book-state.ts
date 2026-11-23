/**
 * @description C 端分册建议状态文案：与报告开放册一一对应，未开放 / 未检测 / 更新中置灰。
 * @file src/modules/talent-portal/advice-book-state.ts
 */
import type { TalentAdviceBook, TalentAdviceBookState } from '@/api/talent-types'

/** 只有「已发布且有正文」的册可进入建议书详情。 */
export function adviceBookAvailable(book: TalentAdviceBook): boolean {
  return book.state === 'available' && book.sectionCount > 0
}

/** 置灰标签；可阅读册不展示标签。 */
export function adviceBookStateLabel(state: TalentAdviceBookState): string {
  if (state === 'pending')
    return '更新中'
  if (state === 'not_published')
    return '未开放'
  if (state === 'not_detected')
    return '未做报告'
  return ''
}

/** 行副文案：家长视角，不暴露同步 / 版本 / 发布等后台词。 */
export function adviceBookMeta(book: TalentAdviceBook): string {
  if (book.state === 'pending')
    return '内容更新中，完成后即可查看'
  if (book.state === 'not_published')
    return '分册未开放，暂不可查看'
  if (book.state === 'not_detected')
    return '本次未检测该分册'
  const names = (book.entropyList || []).map(item => item.name).filter(Boolean)
  const entropy = names.length ? names.slice(0, 3).join(' / ') : '数据熵待补'
  return `${book.sectionCount} 项要素 · ${entropy}`
}
