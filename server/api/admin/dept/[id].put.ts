/**
 * @description PUT /api/admin/dept/:id — 修改部门
 * @route PUT /api/admin/dept/:id
 */

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:dept:edit')
  return withOperLog(event, { title: '部门管理', operType: OperType.UPDATE }, async () => {
    const id = getRouterParam(event, 'id') as string
    const body = await validateBody(event, updateDeptSchema)
    const pb = await getAdminPB()

    return success(await pb.collection('depts').update(id, {
      parentId: body.parentId,
      deptName: body.deptName,
      orderNum: body.orderNum,
      leader: body.leader,
      phone: body.phone,
      email: body.email,
      status: body.status,
    }), '修改成功')
  })
})
