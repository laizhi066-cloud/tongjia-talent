/**
 * @description 浏览器错误上报的安全归属：客户端载荷不能指定用户，只能附加已验证的会话用户。
 * @file server/utils/client-error-report.ts
 */
import type { ErrorLogInput } from './error-log'

/**
 * 为已校验的会话附加错误归属；匿名错误保持匿名。
 *
 * @param input 已经由 API schema 校验的浏览器错误内容。
 * @param authenticatedUserId Authorization token 对应的真实用户 ID。
 * @returns 可直接交给 error_logs 的安全错误载荷。
 */
export function withAuthenticatedErrorUser(
  input: Omit<ErrorLogInput, 'userId'>,
  authenticatedUserId?: string,
): ErrorLogInput {
  return authenticatedUserId
    ? { ...input, userId: authenticatedUserId }
    : input
}
