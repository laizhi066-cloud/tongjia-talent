/**
 * @description POST /api/admin/dept — 新增部门
 * @route POST /api/admin/dept
 * @body {parentId, deptName, orderNum, leader, phone, email, status}
 */

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:dept:add')
  return withOperLog(event, { title: '部门管理', operType: OperType.INSERT }, async () => {
    const body = await validateBody(event, createDeptSchema)
    const pb = await getAdminPB()

    return success(await pb.collection('depts').create({
      parentId: body.parentId || null,
      deptName: body.deptName,
      orderNum: body.orderNum ?? 0,
      leader: body.leader ?? '',
      phone: body.phone ?? '',
      email: body.email ?? '',
      status: body.status ?? '0',
    }), '新增成功')
  })
})
