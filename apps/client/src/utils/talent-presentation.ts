/**
 * @description C 端天赋展示辅助纯函数：日期、脱敏与状态文案映射。
 *   服务端已派生状态文案时优先使用服务端值，这里只做兜底与格式化。
 * @file src/utils/talent-presentation.ts
 */
import type { TalentChildQuery, TalentReportStatus, TalentVolumeState } from '@/api/talent-types'

/** 报告状态兜底文案（§11.2，不得改写）。 */
export const TALENT_REPORT_STATUS_LABELS: Readonly<Record<TalentReportStatus, string>> = {
  published: '报告已发布',
  pending_publish: '报告整理中',
  retracted: '报告内容更新中',
  none: '该对象暂无基因报告',
}

/** 分册状态文案。 */
export const TALENT_VOLUME_STATE_LABELS: Readonly<Record<TalentVolumeState, string>> = {
  readable: '可读',
  not_open: '未开放',
  not_detected: '未做报告',
}

/** 子女查询状态文案。 */
export const TALENT_CHILD_QUERY_LABELS: Readonly<Record<TalentChildQuery, string>> = {
  unqueried: '尚未查询',
  querying: '结果查询中',
  found: '已查到',
  not_found: '信息待核对',
}

/** 格式化日期：纯日期原样展示，ISO 时间取 YYYY-MM-DD（北京时间）。 */
export function formatTalentDate(value: string | undefined | null): string {
  if (!value)
    return ''
  const text = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(text))
    return text
  const date = new Date(text.includes('T') ? text : text.replace(' ', 'T'))
  if (Number.isNaN(date.getTime()))
    return text
  const shifted = new Date(date.getTime() + 8 * 60 * 60 * 1000)
  return shifted.toISOString().slice(0, 10)
}

/** 手机号脱敏：11 位保留前 3 后 4，其余原样返回。 */
export function maskTalentPhone(phone: string | undefined | null): string {
  const value = String(phone || '')
  return /^\d{11}$/.test(value) ? `${value.slice(0, 3)}****${value.slice(-4)}` : value
}

/** 姓名首字，用作头像占位（空名回退「我」）。 */
export function talentInitial(name: string | undefined | null): string {
  return String(name || '').trim().slice(0, 1) || '我'
}

/** 关系标签：本人 / 子女。 */
export function talentRelationLabel(subjectType: 'self' | 'child'): string {
  return subjectType === 'child' ? '子女' : '本人'
}

/** 性别 · 年龄 组合文案，空值自动省略。 */
export function talentMetaText(genderLabel?: string, ageLabel?: string): string {
  return [genderLabel, ageLabel].filter(Boolean).join(' · ')
}
