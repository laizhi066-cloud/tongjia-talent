/**
 * @description PUT /api/admin/post/:id — 修改岗位
 * @route PUT /api/admin/post/:id
 */

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:post:edit')
  return withOperLog(event, { title: '岗位管理', operType: OperType.UPDATE }, async () => {
    const id = getRouterParam(event, 'id') as string
    const body = await validateBody(event, updatePostSchema)
    const pb = await getAdminPB()

    return success(await pb.collection('posts').update(id, {
      postCode: body.postCode,
      postName: body.postName,
      postSort: body.postSort,
      status: body.status,
      remark: body.remark,
    }), '修改成功')
  })
})
