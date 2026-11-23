/**
 * @description 分册展示口径：分册序号统一用字母（A / B / C…），不用 01 / 02 数字。
 *   家长端所有分册入口（报告目录、培育建议、建议书页头、分册页元信息）共用本函数。
 * @file src/modules/talent-portal/volume-label.ts
 */

/**
 * 分册序号（1 起）→ 展示字母：1→A，2→B……；非法值返回空串。
 * @param ordinal 1 起的分册序号
 */
export function volumeLetter(ordinal: number): string {
  const value = Math.trunc(Number(ordinal))
  if (!Number.isFinite(value) || value < 1 || value > 26)
    return ''
  return String.fromCharCode(64 + value)
}

/**
 * 分册展示标题：「A 分册 · 生长发育」；缺册名时只返回「A 分册」。
 * @param ordinal 1 起的分册序号
 * @param name 册名
 */
export function volumeLabel(ordinal: number, name?: string): string {
  const letter = volumeLetter(ordinal)
  if (!letter)
    return String(name || '')
  return name ? `${letter} 分册 · ${name}` : `${letter} 分册`
}
