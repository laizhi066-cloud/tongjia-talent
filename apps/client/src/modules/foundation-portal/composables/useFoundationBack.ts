/**
 * @description 基础门户安全返回动作：栈深为 1（H5 刷新/深链直达）时回落到所属主栏。
 * @file src/modules/foundation-portal/composables/useFoundationBack.ts
 */
import { goBackOr } from '../navigation'
import type { PortalTab } from '../navigation'

/**
 * 为二级页提供稳定的返回入口。
 *
 * @param fallbackTab 没有上一页时回落的主栏，默认首页。
 * @returns 返回动作。
 */
export function useFoundationBack(fallbackTab: PortalTab = 'home') {
  /** 根据当前页面栈返回上一页，或回落主栏。 */
  function goBack(): void {
    goBackOr(fallbackTab)
  }

  return { goBack }
}
