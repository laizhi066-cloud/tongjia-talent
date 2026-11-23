/**
 * @description PUT /api/admin/profile/password — 通过 PocketBase 修改密码
 * @route PUT /api/admin/profile/password
 */
export default defineEventHandler(async (event) => {
  return withOperLog(event, { title: '个人信息', operType: OperType.RESET_PWD }, async () => {
    const user = await getCurrentUser(event)
    const body = await validateBody(event, updatePasswordSchema)

    // 验证旧密码（新建临时客户端尝试登录，按当前站点连库）
    const tempPb = await getUserPB(event)
    try {
      await tempPb.collection('users').authWithPassword(user.email, body.oldPassword)
    } catch {
      throw createError({ statusCode: 400, message: '旧密码错误' })
    }

    // 用 Admin 客户端更新密码
    const pb = await getAdminPB()
    await pb.collection('users').update(user.id, { password: body.newPassword })

    return success(null, '修改成功')
  })
})
