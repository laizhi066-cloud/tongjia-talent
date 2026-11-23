/**
 * @description PUT /api/admin/monitor/error/:id/status — 变更错误记录状态（已解决/已忽略/重新打开）
 * @route PUT /api/admin/monitor/error/:id/status
 */

export default defineEventHandler(async (event) => {
  await requirePlatformOperations(event)
  await requirePermission(event, 'monitor:error:edit')
  return withOperLog(event, { title: '错误监控', operType: OperType.UPDATE }, async () => {
    const id = getRouterParam(event, 'id') as string
    const body = await validateBody(event, errorLogStatusSchema)
    const pb = await getAdminPB()
    return success(await pb.collection('error_logs').update(id, { status: body.status }), '修改成功')
  })
})
