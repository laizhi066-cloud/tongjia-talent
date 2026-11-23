/**
 * @description 服务端登录审计：统一记录成功/失败、来源 IP、UA 和登录类型，绝不记录密码或验证码。
 * @file server/utils/login-audit.ts
 */
import type { H3Event } from 'h3'
import { getRequestHeader } from 'h3'

export type LoginAuditStatus = '0' | '1'
/** 基础版记录微信认证、通用账号密码认证和后台控制台认证。 */
export type LoginAuditType = 'wechat' | 'account' | 'console'

export interface LoginAuditInput {
  identity: string
  status: LoginAuditStatus
  message: string
  loginType: LoginAuditType
  userId?: string
}

interface LoginLogRecord {
  userName: string
  ipaddr: string
  status: LoginAuditStatus
  msg: string
  loginTime: string
  loginType: LoginAuditType
  userAgent: string
  userId?: string
}

interface LoginLogCollection {
  create(record: LoginLogRecord, options: { $autoCancel: false }): Promise<LoginLogRecord>
}

export interface LoginAuditClient {
  collection(name: 'login_logs'): LoginLogCollection
}

/** 登录标识供系统所有者审计定位；仅规范空白，绝不混入密码或验证码。 */
export function normalizeLoginAuditIdentity(identity: string): string {
  return identity.trim()
}

/** 微信登录日志以带前缀的 openid 关联；平台超管才能读取登录审计。 */
export function wechatLoginIdentity(openid: string): string {
  return `wx:${openid}`
}

function clip(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength) : value
}

/** 记录失败时静默降级，不能让审计库异常改变原登录响应或暴露内部细节。 */
export async function recordLoginAttempt(client: LoginAuditClient, event: H3Event, input: LoginAuditInput): Promise<void> {
  const record: LoginLogRecord = {
    userName: clip(normalizeLoginAuditIdentity(input.identity), 100),
    ipaddr: clip((getRequestHeader(event, 'x-forwarded-for') || getRequestHeader(event, 'x-real-ip') || event.node.req.socket.remoteAddress || '').split(',')[0]!.trim(), 50),
    status: input.status,
    msg: clip(input.message, 500),
    loginTime: new Date().toISOString(),
    loginType: input.loginType,
    userAgent: clip(getRequestHeader(event, 'user-agent') || '', 500),
    ...(input.userId ? { userId: input.userId } : {}),
  }
  try {
    await client.collection('login_logs').create(record, { $autoCancel: false })
  }
  catch {
    // 审计失败不影响认证；平台仍可从请求错误监控/服务日志定位基础设施问题。
  }
}
