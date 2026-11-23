/**
 * @description GET /api/admin/monitor/health — 站点健康快照（平台超管一屏排障）
 * @file server/api/admin/monitor/health.get.ts
 * @route GET /api/admin/monitor/health
 * @returns { overall, datasource, errors, online, env }
 */
import { buildHealthSnapshot } from '~~/server/utils/health-service'

export default defineEventHandler(async (event) => {
  await requirePlatformOperations(event) // 健康快照含渠道/env 状态，仅平台超管可见（与 self-check 同口径）
  const pb = await getAdminPB()
  return success(await buildHealthSnapshot(pb), '健康快照')
})
