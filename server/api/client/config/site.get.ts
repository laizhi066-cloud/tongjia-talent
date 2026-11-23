/**
 * @description C 端基础门户站点配置。
 * @file server/api/client/config/site.get.ts
 * @route GET /api/client/config/site
 */
export default defineEventHandler(async () => {
  const pb = await getAdminPB()
  const site = await getSiteConfig(pb)
  // 门户只读取自己的默认外观；后台亮暗模式是独立的本机偏好。
  return success(site, '站点配置')
})
