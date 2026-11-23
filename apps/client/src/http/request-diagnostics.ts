/**
 * @description C 端请求失败诊断，只记录脱敏地址和错误摘要，不记录请求/响应正文与认证信息。
 * @file src/http/request-diagnostics.ts
 */
interface RequestFailureContext {
  stage: 'config' | 'request' | 'network' | 'response' | 'wechat-login'
  method: string
  url: string
  mode?: string
  envVersion?: string
  baseUrlSource?: string
  statusCode?: number
  businessCode?: number
}

/** URL 只保留协议、主机和路径；移除 URL 内嵌凭据、query 与 hash。 */
export function diagnosticUrl(url: string): string {
  return url.split(/[?#]/)[0]!
    .replace(/^(https?:\/\/)[^/\s]*@/i, '$1[redacted]@')
    .replace(/\b1[3-9]\d{9}\b/g, '[phone]')
}

/** 平台错误可能夹带 URL 或凭据；仅输出脱敏文本，限制长度以免刷屏。 */
export function diagnosticMessage(message: string): string {
  return message
    .replace(/https?:\/\/[^\s"'<>]+/gi, diagnosticUrl)
    .replace(/\/[^\s"'<>]*[?#][^\s"'<>]*/g, diagnosticUrl)
    .replace(/\bBearer\s+[^\s"',;]+/gi, 'Bearer [redacted]')
    .replace(/(["']?(?:password|passwordConfirm|token|access_token|refresh_token|appSecret|secret|code|loginCode|phoneCode|openid|unionid)["']?\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi, '$1[redacted]')
    .replace(/\b1[3-9]\d{9}\b/g, '[phone]')
    .slice(0, 500)
}

/** 从 uni.request / uni.login 的普通对象或 Error 中摘取安全的错误字段。 */
export function errorSummary(error: unknown): { errMsg: string, errCode?: number } {
  if (!error || typeof error !== 'object')
    return { errMsg: typeof error === 'string' ? diagnosticMessage(error) : '未知错误' }
  const value = error as { errMsg?: unknown, message?: unknown, errCode?: unknown }
  const message = typeof value.errMsg === 'string' ? value.errMsg : typeof value.message === 'string' ? value.message : '未知错误'
  return {
    errMsg: diagnosticMessage(message),
    ...(typeof value.errCode === 'number' ? { errCode: value.errCode } : {}),
  }
}

/** hideErrorToast 只控制 UI，不隐藏诊断；禁止把 error 原对象或请求参数直接传给 console。 */
export function logRequestFailure(context: RequestFailureContext, error: unknown): void {
  console.error('[client:request-failed]', {
    stage: context.stage,
    method: context.method,
    url: diagnosticUrl(context.url),
    mode: context.mode,
    envVersion: context.envVersion,
    baseUrlSource: context.baseUrlSource,
    statusCode: context.statusCode,
    businessCode: context.businessCode,
    ...errorSummary(error),
  })
}
