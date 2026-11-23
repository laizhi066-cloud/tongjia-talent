/**
 * @description 字典徽标样式解析 — 统一 listClass 到 Naive UI Tag 类型的映射
 * @file app/utils/dict-badge-style.ts
 */
export type DictBadgeType = 'success' | 'info' | 'warning' | 'error' | 'default'

const listClassTypeMap: Record<string, DictBadgeType> = {
  default: 'default',
  primary: 'default',
  secondary: 'default',
  danger: 'error',
  error: 'error',
  destructive: 'error',
  info: 'info',
  success: 'success',
  warning: 'warning',
  warn: 'warning',
  outline: 'default',
}

const statusOverrides: Record<string, Record<string, DictBadgeType>> = {
  sys_normal_disable: { 0: 'warning' },
  sys_notice_status: { 0: 'warning' },
  sys_show_hide: { 1: 'warning' },
}

export function resolveDictBadgeType(dictType = '', dictValue: string | number = '', listClass = ''): DictBadgeType | undefined {
  const value = String(dictValue)
  const override = statusOverrides[dictType]?.[value]
  if (override) return override
  return listClassTypeMap[listClass?.toLowerCase() ?? '']
}
