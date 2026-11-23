/**
 * @description PUT /api/admin/profile — 更新当前用户个人信息
 * @route PUT /api/admin/profile
 */

export default defineEventHandler(async (event) => {
  return withOperLog(event, { title: '个人信息', operType: OperType.UPDATE }, async () => {
    const user = await getCurrentUser(event)
    const body = await validateBody(event, updateProfileSchema)
    const pb = await getAdminPB()

    return success(await pb.collection('users').update(user.id, {
      displayName: body.displayName,
      nickname: body.nickname,
      phone: body.phone,
    }), '修改成功')
  })
})
