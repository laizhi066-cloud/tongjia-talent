/**
 * @description 我的子页面统一返回：安全返回（栈深为 1 时回落到「我的」主栏）。
 *   `PortalPageHeader` 已保证返回只派发一次，这里不再需要时间窗口去重。
 * @file src/pages/profile/composables/useProfileBack.ts
 */
import { useFoundationBack } from '@/modules/foundation-portal/composables/useFoundationBack'
import type { PortalTab } from '@/modules/foundation-portal/navigation'

/** 我的子页面返回动作（默认回落到「我的」主栏）。 */
export function useProfileBack(fallbackTab: PortalTab = 'profile') {
  return useFoundationBack(fallbackTab)
}
