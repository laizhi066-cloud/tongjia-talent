/**
 * @description PUT /api/admin/monitor/error/config — 保存错误采集与排噪策略。
 * @file server/api/admin/monitor/error/config.put.ts
 * @route PUT /api/admin/monitor/error/config
 * @body { enabled: boolean, ignoreKeywords: string[] }
 * @returns ErrorMonitorConfig
 */

export default defineEventHandler(async (event) => {
  await requirePlatformOperations(event)
  await requirePermission(event, 'monitor:error:edit')
  return withOperLog(event, { title: '错误监控-排噪配置', operType: OperType.UPDATE }, async () => {
    const body = await validateBody(event, errorMonitorConfigSchema)
    return success(await saveErrorMonitorConfig(await getAdminPB(), body), '错误监控配置已保存')
  })
})
