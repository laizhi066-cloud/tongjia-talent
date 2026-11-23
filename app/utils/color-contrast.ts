/**
 * @description 品牌色规范化与前景色对比度计算，供 SSR 主题覆盖和浏览器主题应用共享。
 * @file app/utils/color-contrast.ts
 */

/** 将合法的三位或六位十六进制颜色统一为六位小写值；非法值返回空字符串。 */
export function normalizeHexColor(value: string): string {
  if (!/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(value)) return ''
  const raw = value.slice(1).toLowerCase()
  return raw.length === 3
    ? `#${raw.split('').map(part => part.repeat(2)).join('')}`
    : `#${raw}`
}

/** 根据 WCAG 相对亮度返回与品牌背景保持至少 4.5:1 对比度的黑白前景。 */
export function getReadableForeground(color: string): string {
  const normalized = normalizeHexColor(color)
  if (!normalized) return '#ffffff'

  const channels = [1, 3, 5].map(index => Number.parseInt(normalized.slice(index, index + 2), 16) / 255)
  const luminance = channels.reduce((total, channel, index) => {
    const linear = channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    return total + linear * [0.2126, 0.7152, 0.0722][index]!
  }, 0)

  return (luminance + 0.05) / 0.05 >= 4.5 ? '#000000' : '#ffffff'
}
