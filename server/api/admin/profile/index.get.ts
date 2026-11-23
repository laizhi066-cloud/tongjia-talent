/**
 * @description GET /api/admin/profile — 获取当前用户个人信息
 * @route GET /api/admin/profile
 */

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  return success(resolveFileUrls(user, 'users', ['avatar']))
})
