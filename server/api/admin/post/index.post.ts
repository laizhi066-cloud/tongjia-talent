/**
 * @description POST /api/admin/post — 新增岗位
 * @route POST /api/admin/post
 * @body {postCode, postName, postSort, status, remark}
 */

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:post:add')
  return withOperLog(event, { title: '岗位管理', operType: OperType.INSERT }, async () => {
    const body = await validateBody(event, createPostSchema)
    const pb = await getAdminPB()

    return success(await pb.collection('posts').create({
      postCode: body.postCode,
      postName: body.postName,
      postSort: body.postSort ?? 0,
      status: body.status ?? '1',
      remark: body.remark ?? '',
    }), '新增成功')
  })
})
