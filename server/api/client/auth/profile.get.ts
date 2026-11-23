/**
 * @description C 端读取当前中性账户资料。
 * @file server/api/client/auth/profile.get.ts
 * @route GET /api/client/auth/profile
 */
export default defineEventHandler(async (event) => {
  const user = await getCurrentUserBasic(event)
  return success({
    id: user.id,
    phone: user.phone || '',
    phoneBound: Boolean(user.phone),
    nickname: user.nickname || '',
    avatar: user.avatar ? pocketBaseFileUrl('users', user.id, user.avatar) : '',
    openid: user.openid || '',
    status: user.status,
    gender: user.gender || '',
    birthday: user.birthday || '',
    region: user.region || '',
    bio: user.bio || '',
  })
})
