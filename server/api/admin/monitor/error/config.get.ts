/**
 * @description GET /api/admin/monitor/error/config — 读取错误采集与排噪策略。
 * @file server/api/admin/monitor/error/config.get.ts
 * @route GET /api/admin/monitor/error/config
 * @returns ErrorMonitorConfig
 */

export default defineEventHandler(async (event) => {
  await requirePlatformOperations(event)
  await requirePermission(event, 'monitor:error:list')
  return success(await getErrorMonitorConfig(await getAdminPB()), '错误监控配置')
})
