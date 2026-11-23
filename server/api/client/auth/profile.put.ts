/**
 * @description C 端更新当前中性账户资料。
 * @file server/api/client/auth/profile.put.ts
 * @route PUT /api/client/auth/profile
 * @body { nickname?, avatar?, gender?, birthday?, region?, bio? }
 */
import { z } from 'zod'
import { resolveProfileAvatarAction } from '~~/server/utils/profile-avatar'

const schema = z.object({
  nickname: z.string().max(60).optional(),
  avatar: z.string().max(2048).optional(),
  gender: z.enum(['male', 'female', 'secret']).optional(),
  birthday: z.string().max(10).optional(),
  region: z.string().max(100).optional(),
  bio: z.string().max(200).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await getCurrentUserBasic(event)
  return withOperLog(event, { title: '账户资料', operType: OperType.UPDATE }, async () => {
    const body = await validateBody(event, schema)
    const patch: Record<string, unknown> = {}
    for (const key of ['nickname', 'gender', 'birthday', 'region', 'bio'] as const) {
      if (body[key] !== undefined) patch[key] = body[key]
    }
    const currentAvatarUrl = user.avatar ? pocketBaseFileUrl('users', user.id, String(user.avatar)) : ''
    const avatarAction = resolveProfileAvatarAction(body.avatar, currentAvatarUrl)
    if (avatarAction === 'clear') patch.avatar = ''
    if (avatarAction === 'reject')
      throw createError({ statusCode: 400, message: '头像仅支持通过上传接口更新' })
    const updated = await (await getAdminPB()).collection('users').update(user.id, patch, { $autoCancel: false })
    return success({
      id: updated.id, phone: updated.phone || '', phoneBound: Boolean(updated.phone), nickname: updated.nickname || '',
      avatar: updated.avatar ? pocketBaseFileUrl('users', updated.id, updated.avatar) : '', openid: updated.openid || '',
      status: updated.status, gender: updated.gender || '', birthday: updated.birthday || '', region: updated.region || '', bio: updated.bio || '',
    }, '修改成功')
  })
})
