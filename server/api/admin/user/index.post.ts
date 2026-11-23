/**
 * @description 创建基础后台用户。
 * @file server/api/admin/user/index.post.ts
 * @route POST /api/admin/user
 */
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('邮箱格式不正确'), password: z.string().min(8, '密码至少 8 位'),
  displayName: z.string().min(1, '请输入姓名').max(60), nickname: z.string().max(60).optional().default(''),
  phone: z.string().max(20).optional().default(''), deptId: z.string().nullable().optional(), status: z.enum(['0', '1']).default('1'),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:user:add')
  return withOperLog(event, { title: '用户管理', operType: OperType.INSERT }, async () => {
    const body = await validateBody(event, schema)
    const user = await (await getAdminPB()).collection('users').create({ ...body, passwordConfirm: body.password }, { $autoCancel: false })
    return success(user, '新增成功')
  })
})
