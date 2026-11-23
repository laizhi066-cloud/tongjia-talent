/**
 * @description POST /api/admin/monitor/error/clear — 批量清理错误记录（按状态：默认清「已解决」，可清全部）
 * @route POST /api/admin/monitor/error/clear
 * @body { status?: 'new' | 'resolved' | 'ignored' | 'all' }
 */

export default defineEventHandler(async (event) => {
  await requirePlatformOperations(event)
  await requirePermission(event, 'monitor:error:remove')
  return withOperLog(event, { title: '错误监控', operType: OperType.CLEAR }, async () => {
    const body = await validateBody(event, errorLogClearSchema)
    const pb = await getAdminPB()
    const filter = body.status === 'all' ? '' : `status = "${escapeFilterValue(body.status)}"`
    const rows = await pb.collection('error_logs').getFullList({ filter: filter || undefined, $autoCancel: false })
    await Promise.all(rows.map((r: any) => pb.collection('error_logs').delete(r.id).catch(() => null)))
    return success({ deleted: rows.length }, `已清理 ${rows.length} 条`)
  })
})
