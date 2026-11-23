/**
 * @description DELETE /api/admin/monitor/error/:id — 删除单条错误记录
 * @route DELETE /api/admin/monitor/error/:id
 */

export default defineEventHandler(async (event) => {
  await requirePlatformOperations(event)
  await requirePermission(event, 'monitor:error:remove')
  return withOperLog(event, { title: '错误监控', operType: OperType.DELETE }, async () => {
    const id = getRouterParam(event, 'id') as string
    const pb = await getAdminPB()
    await pb.collection('error_logs').delete(id)
    return success(null, '删除成功')
  })
})
