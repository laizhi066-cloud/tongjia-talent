/**
 * @description 微信小程序 / 移动端触感反馈工具。
 *   在微信小程序环境调用原生微震动，提升界面点击的物理质感；在非支持环境静默兜底。
 * @file src/utils/haptics.ts
 */

export type HapticType = 'light' | 'medium' | 'heavy'

/**
 * 触发轻量级物理震动触感。
 * @param type 震动强度，默认 light（清脆短震）
 */
export function triggerHaptic(type: HapticType = 'light'): void {
  // #ifdef MP-WEIXIN
  try {
    uni.vibrateShort({ type })
  }
  catch {
    // 忽略真机振动不可用时的报错
  }
  // #endif

  // #ifdef H5
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      const ms = type === 'heavy' ? 30 : type === 'medium' ? 18 : 8
      navigator.vibrate(ms)
    }
  }
  catch {
    // 忽略静默
  }
  // #endif
}
