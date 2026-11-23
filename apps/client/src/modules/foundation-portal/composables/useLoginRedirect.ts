/**
 * @description 登录页回跳参数解析：只接受站内 `/pages/` 路径，登录成功后按主栏/二级页选择导航方式。
 * @file src/modules/foundation-portal/composables/useLoginRedirect.ts
 */
import { onLoad } from '@dcloudio/uni-app'
import { shallowRef } from 'vue'
import { finishLoginNavigation, isValidRedirect } from '../navigation'

/** 读取并校验 `redirect` query，提供登录成功后的统一出口。 */
export function useLoginRedirect() {
  const redirect = shallowRef('')

  onLoad((query?: Record<string, string>) => {
    const raw = query?.redirect
    if (typeof raw !== 'string')
      return
    let decoded = raw
    try {
      decoded = decodeURIComponent(raw)
    }
    catch {
      decoded = raw
    }
    redirect.value = isValidRedirect(decoded) ? decoded : ''
  })

  /** 登录成功（或游客继续浏览）后回到来源页或首页。 */
  function finish(withRedirect = true): void {
    finishLoginNavigation(withRedirect ? redirect.value : undefined)
  }

  return { redirect, finish }
}
