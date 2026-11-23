/**
 * @description C 端会话状态事件总线：统一 401 过期与 403 账号停用的跳转，
 *   避免同一次会话内并发多个失败请求重复导航。
 * @file src/http/session.ts
 */

/** 需要全局处理的会话事件。 */
export type SessionEvent = 'expired' | 'disabled'

type SessionEventHandler = (event: SessionEvent) => void

let sessionEventHandler: SessionEventHandler | undefined

/** 每类事件在本次会话内只上报一次，防止并发 401 重复 reLaunch 登录页。 */
const notifiedEvents = new Set<SessionEvent>()

/** 由应用启动处注册唯一的会话事件处理函数。 */
export function setSessionEventHandler(handler: SessionEventHandler | undefined): void {
  sessionEventHandler = handler
}

/** 上报一次会话事件；同一事件在当前会话内只处理一次。 */
export function notifySessionEvent(event: SessionEvent): void {
  if (notifiedEvents.has(event))
    return
  notifiedEvents.add(event)
  sessionEventHandler?.(event)
}

/** 登录成功或主动退出后重置事件去重状态。 */
export function resetSessionEvents(): void {
  notifiedEvents.clear()
}

/** 判断给定错误码是否表示账号被停用。 */
export function isAccountDisabledCode(code: string): boolean {
  return code === 'ACCOUNT_DISABLED' || code === 'ACCOUNT_LOCKED'
}
