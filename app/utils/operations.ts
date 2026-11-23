/**
 * @description 运维中心共用展示常量；日志类型只在此处维护，概览与生命周期面板共用。
 * @file app/utils/operations.ts
 */

export type OperationsLogKey = 'oper_logs' | 'login_logs' | 'error_logs' | 'sms_send_logs'

export const OPERATIONS_LOG_LABELS: Readonly<Record<OperationsLogKey, string>> = {
  oper_logs: '操作日志',
  login_logs: '登录日志',
  error_logs: '错误日志',
  sms_send_logs: '短信日志',
}
