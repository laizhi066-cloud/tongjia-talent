/**
 * @description 我的 / 孩子资料页共用字段常量与校验：性别、与孩子关系、查询状态标签、
 *   出生日期与身份证（18 位、生日一致）规则。页面与表单组件只引用这里，避免规则分叉。
 * @file src/pages/profile/profile-fields.ts
 */
import type { TalentChildItem } from '@/api/talent-types'

/** 家长 / 孩子性别值。 */
export type ProfileGenderValue = 'male' | 'female'

/** 性别选项（与 M2 `talent_parents.gender` / `talent_children.gender` 枚举一致）。 */
export const PROFILE_GENDER_OPTIONS: ReadonlyArray<{ value: ProfileGenderValue, label: string }> = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
]

/** 与家长关系：7 项，中文标签与 M2 `TALENT_CHILD_RELATION_LABELS` 一致。 */
export const CHILD_RELATION_OPTIONS: ReadonlyArray<{ value: string, label: string }> = [
  { value: 'father', label: '父亲' },
  { value: 'mother', label: '母亲' },
  { value: 'grandfather_paternal', label: '祖父' },
  { value: 'grandmother_paternal', label: '祖母' },
  { value: 'grandfather_maternal', label: '外祖父' },
  { value: 'grandmother_maternal', label: '外祖母' },
  { value: 'guardian', label: '其他监护人' },
]

/** 身份证格式：18 位，末位可为 X（与服务端 M2 规则一致，不校验校验位）。 */
const ID_NO_PATTERN = /^\d{17}[\dX]$/

/** 去掉空白并转大写，与服务端归一化保持一致。 */
export function normalizeIdNo(value: string): string {
  return String(value || '').trim().replace(/\s/g, '').toUpperCase()
}

/** 身份证是否为 18 位合法形态。 */
export function isValidIdNo(value: string): boolean {
  return ID_NO_PATTERN.test(normalizeIdNo(value))
}

/** 身份证第 7–14 位生日；格式或日期不合法时返回空串。 */
export function idNoBirthday(value: string): string {
  const idNo = normalizeIdNo(value)
  if (!ID_NO_PATTERN.test(idNo))
    return ''
  const birthday = `${idNo.slice(6, 10)}-${idNo.slice(10, 12)}-${idNo.slice(12, 14)}`
  return isValidBirthday(birthday) ? birthday : ''
}

/** 两位补零。 */
function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/** 本地今天（`YYYY-MM-DD`）。 */
export function todayDateString(): string {
  const date = new Date()
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

/** 毫秒时间戳 → 本地 `YYYY-MM-DD`。 */
export function timestampToDateString(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

/** `YYYY-MM-DD` → 本地毫秒时间戳；非法日期回落到 2000-01-01，避免选择器崩溃。 */
export function dateStringToTimestamp(value: string): number {
  const [year, month, day] = String(value || '').split('-').map(Number)
  if (!year || !month || !day)
    return new Date(2000, 0, 1).getTime()
  return new Date(year, month - 1, day).getTime()
}

/** 出生日期是否为合法的 `YYYY-MM-DD`（1900 起）。 */
export function isValidBirthday(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || '')))
    return false
  const [year, month, day] = value.split('-').map(Number)
  if (!year || year < 1900 || !month || !day)
    return false
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

/** 出生日期不能晚于今天。 */
export function isFutureBirthday(value: string): boolean {
  return isValidBirthday(value) && value > todayDateString()
}

/** 性别中文标签（用于只读展示兜底）。 */
export function genderLabelOf(gender: string | undefined): string {
  return PROFILE_GENDER_OPTIONS.find(option => option.value === gender)?.label || ''
}

/** 与家长关系中文标签。 */
export function relationLabelOf(relation: string | undefined): string {
  return CHILD_RELATION_OPTIONS.find(option => option.value === relation)?.label || ''
}

/** 查询状态标签语义（Wot `wd-tag` 类型 + 文本色）。 */
export interface ChildQueryMeta {
  /** 状态文案，未查到时拼接原因（如「信息待核对 · 信息不一致」）。 */
  label: string
  tagType: 'default' | 'primary' | 'success' | 'warning'
  tone: 'muted' | 'info' | 'success' | 'warning'
}

/**
 * 孩子查询状态文案（M7 spec §11.2 / §9.3：查询中、未查到含原因、未查询）。
 * `found` 显示「已查到」；报告是否可读由报告页呈现，避免与报告状态文案混淆。
 */
export function childQueryMeta(item: Pick<TalentChildItem, 'query' | 'queryReasonLabel'>): ChildQueryMeta {
  if (item.query === 'querying')
    return { label: '结果查询中', tagType: 'primary', tone: 'info' }
  if (item.query === 'not_found') {
    return {
      label: item.queryReasonLabel || '信息待核对',
      tagType: 'warning',
      tone: 'warning',
    }
  }
  if (item.query === 'found')
    return { label: '已查到', tagType: 'success', tone: 'success' }
  return { label: '尚未查询', tagType: 'default', tone: 'muted' }
}

/** 查询状态说明（孩子管理页底部固定文案）。 */
export const CHILD_QUERY_FOOTNOTE = '新增或修改孩子信息后会自动发起查询，状态先显示「结果查询中」；返回本页会自动刷新，不做轮询。'
