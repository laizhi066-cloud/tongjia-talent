/**
 * @description 重置基础后台用户密码。
 * @file server/api/admin/user/[id]/reset-pwd.put.ts
 * @route PUT /api/admin/user/:id/reset-pwd
 */
import { z } from 'zod'

const schema = z.object({ password: z.string().min(8, '密码至少 8 位'), passwordConfirm: z.string().min(8) }).refine(value => value.password === value.passwordConfirm, { message: '两次密码不一致' })

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:user:resetPwd')
  return withOperLog(event, { title: '用户管理', operType: OperType.RESET_PWD }, async () => {
    const id = getRouterParam(event, 'id') as string
    const body = await validateBody(event, schema)
    const pb = await getAdminPB()
    if (!await currentUserIsSuper(event) && await userHasSuperRole(pb, id)) throw createError({ statusCode: 404, message: '用户不存在' })
    await pb.collection('users').update(id, body, { $autoCancel: false })
    return success(null, '修改成功')
  })
})
