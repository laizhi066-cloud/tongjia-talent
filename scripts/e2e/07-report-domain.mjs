#!/usr/bin/env node
/**
 * @description M9 报告域验收（spec §4.4 07）：AC-ADM-06-1..5、BR-02/03/04/05/10、AC-M8-03/05 的 M3 侧。
 *   在**自有隔离报告夹具**上完成：10 列 / 五筛 / 发布快照 v1 / 撤回 C 端 409 更新中 / 恢复沿用原快照
 *   （hash 不变）/ 补发只追加旧册 hash 不变 / 重算 v+1 / 发布预览零写入 / 一键同步 preview 零写入 /
 *   权限正反 / 审计无 PII / 页面 10 列与 `?tab=` 深链回落。
 *   全部写入带 `RUN_ID` 后缀，报告/基因报告/账号/会员在 finally 按本进程创建 id 删除，不污染种子。
 *   一键同步 commit 会刷新种子报告，默认跳过；设 `E2E_ALLOW_GLOBAL_WRITE=1` 才在隔离库执行。
 * @file scripts/e2e/07-report-domain.mjs
 */
import {
  ACCOUNTS,
  ADMIN,
  adminLogin,
  assertSafeTarget,
  check,
  checkNoSensitive,
  clientLogin,
  expectStatus,
  finishSuite,
  launchBrowser,
  makeApi,
  makeClientApi,
  scanSensitive,
  skip,
} from './lib.mjs'
import { fixturesEnabled, pbGet, seedReportSubject } from './fixtures.mjs'
import { createHash } from 'node:crypto'

const SUITE = '07-report-domain'
const TITLE = '报告域验收（AC-ADM-06 / BR-02..05/10 / M3）'
const startedAt = Date.now()
assertSafeTarget({ write: true })

const sha256 = value => createHash('sha256').update(JSON.stringify(value ?? null)).digest('hex').slice(0, 16)
const logBeginTime = () => new Date(startedAt - 10_000).toISOString().slice(0, 19).replace('T', ' ')

async function loginAdminPage(page) {
  await page.goto(`${ADMIN}/login`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  const inputs = page.locator('input')
  await inputs.nth(0).fill(ACCOUNTS.superAdmin.identity)
  await inputs.nth(1).fill(ACCOUNTS.superAdmin.password)
  await page.locator('button:has-text("登录")').first().click()
  await page.waitForTimeout(3000)
}

try {
  if (!fixturesEnabled()) throw new Error('报告域验收需要 PB 夹具（本地/隔离实例）')
  const token = await adminLogin()
  const api = makeApi(token)
  const fixture = await seedReportSubject(api, { suite: '07', withClientUser: true })
  const { reportId, reportNo, child, clientUser, mobile } = fixture
  const capi = makeClientApi(await clientLogin(clientUser.email, clientUser.password))
  const childIdNo = fixture.childIdNo

  // ── ① 列表 10 列 / 分页 / 状态计数（AC-ADM-06-1、BR-13） ─────────────────────────
  console.log('\n── ① 报告列表：10 列 / 分页 / 状态计数 ──')
  const list = await api('/api/admin/talent/reports?page=1&pageSize=20')
  expectStatus(list, 200, '报告列表 200')
  const rows = list.data?.rows || []
  const COLUMN_FIELDS = ['reportNo', 'parentName', 'childName', 'maskedMobile', 'maskedIdNo', 'geneBookCount', 'booksText', 'newBookCount', 'newBooksText', 'status', 'statusLabel']
  check('列表每行含 10 列字段', rows.length > 0 && rows.every(row => COLUMN_FIELDS.every(key => row[key] !== undefined)), `缺字段行=${rows.filter(row => COLUMN_FIELDS.some(key => row[key] === undefined)).length}`)
  check('分页默认 20', list.data?.pageSize === 20, `pageSize=${list.data?.pageSize}`)
  const capped = await api('/api/admin/talent/reports?page=1&pageSize=500')
  check('每页上限 100', capped.data?.pageSize === 100, `pageSize=${capped.data?.pageSize}`)
  const statusCounts = list.data?.statusCounts || {}
  check('状态计数之和 = 总数', Number(statusCounts.pending_publish || 0) + Number(statusCounts.published || 0) + Number(statusCounts.retracted || 0) === Number(list.data?.total), JSON.stringify(statusCounts))
  check('statusTotal = 总数', Number(list.data?.statusTotal) === Number(list.data?.total), `statusTotal=${list.data?.statusTotal}`)
  checkNoSensitive(list.data, '报告列表响应无密文/哈希/明文 PII')

  // ── ② 五筛交集（AC-ADM-06-1） ─────────────────────────────────────────────────
  console.log('\n── ② 五筛（报告号 / 子女 / 手机号 / 身份证 / 状态）──')
  const byReportNo = await api(`/api/admin/talent/reports?page=1&pageSize=20&reportNo=${encodeURIComponent(reportNo)}`)
  check('报告编号筛选命中夹具报告', byReportNo.data?.total === 1 && byReportNo.data?.rows?.[0]?.reportNo === reportNo, `total=${byReportNo.data?.total}`)
  const byChild = await api(`/api/admin/talent/reports?page=1&pageSize=20&childName=${encodeURIComponent(child.name)}`)
  check('子女姓名筛选命中', byChild.data?.total === 1 && byChild.data?.rows?.[0]?.id === reportId, `total=${byChild.data?.total}`)
  const byMobile = await api(`/api/admin/talent/reports?page=1&pageSize=20&parentMobile=${mobile}`)
  check('家长手机号完整 11 位筛选命中', byMobile.data?.total === 1, `total=${byMobile.data?.total}`)
  const byMobileTail = await api(`/api/admin/talent/reports?page=1&pageSize=20&parentMobile=${mobile.slice(-4)}`)
  check('家长手机号后 4 位筛选命中', byMobileTail.data?.total === 1, `total=${byMobileTail.data?.total}`)
  const byIdNo = await api(`/api/admin/talent/reports?page=1&pageSize=20&idNo=${childIdNo}`)
  check('检验人身份证完整 18 位筛选命中', byIdNo.data?.total === 1, `total=${byIdNo.data?.total}`)
  const byIdNoTail = await api(`/api/admin/talent/reports?page=1&pageSize=20&idNo=${childIdNo.slice(-4)}`)
  check('检验人身份证后 4 位筛选命中', Number(byIdNoTail.data?.total) >= 1, `total=${byIdNoTail.data?.total}`)
  const byStatus = await api('/api/admin/talent/reports?page=1&pageSize=100&status=pending_publish')
  check('状态筛选只返回待发布', (byStatus.data?.rows || []).every(row => row.status === 'pending_publish'), `total=${byStatus.data?.total}`)
  const andFilter = await api(`/api/admin/talent/reports?page=1&pageSize=20&reportNo=${encodeURIComponent(reportNo)}&childName=${encodeURIComponent(child.name)}&parentMobile=${mobile}&status=pending_publish`)
  check('五筛交集命中', andFilter.data?.total === 1, `total=${andFilter.data?.total}`)
  expectStatus(await api('/api/admin/talent/reports?page=1&pageSize=20&parentMobile=12345'), 422, '手机号筛选格式错误 422')
  expectStatus(await api('/api/admin/talent/reports?page=1&pageSize=20&idNo=123'), 422, '身份证筛选格式错误 422')
  const badStatusFilter = await api('/api/admin/talent/reports?page=1&pageSize=20&status=nope')
  expectStatus(badStatusFilter, 422, '状态筛选非法 422')

  // ── ③ 详情 4 页签 + 发布预览零写入（AC-ADM-06-5、BR-03） ────────────────────────
  console.log('\n── ③ 详情 4 页签 / 发布预览零写入 ──')
  const detailBefore = await api(`/api/admin/talent/reports/${reportId}`)
  expectStatus(detailBefore, 200, '报告详情 200（待发布）')
  const before = detailBefore.data || {}
  check('待发布报告 snapshotVersion=0', Number(before.report?.snapshotVersion) === 0, `v=${before.report?.snapshotVersion}`)
  check('详情 4 页签齐全', ['selections', 'matching', 'geneReport', 'advice'].every(key => before.tabs && key in before.tabs), Object.keys(before.tabs || {}).join(','))
  check('基因报告页签固定六册', (before.tabs?.geneReport?.volumes || []).length === 6, `volumes=${before.tabs?.geneReport?.volumes?.length}`)
  check('匹配天赋页签结构完整（frozen/current/diff/configChanged）', Boolean(before.tabs?.matching) && 'current' in before.tabs.matching && Array.isArray(before.tabs.matching.diff) && typeof before.tabs.matching.configChanged === 'boolean', Object.keys(before.tabs?.matching || {}).join(','))
  check('培育建议页签空态', before.tabs?.advice?.available === false, String(before.tabs?.advice?.emptyText || ''))
  check('待发布报告无新增分册口径之前不显示已开放册', (before.report?.openVolumeIds || []).length === 0, JSON.stringify(before.report?.openVolumeIds))

  const beforeRaw = await pbGet('talent_reports', reportId)
  const preview = await api(`/api/admin/talent/reports/${reportId}/publish-preview`)
  expectStatus(preview, 200, '发布预览 200')
  check('发布预览给出 6 册可选与快照版本 0', preview.data?.snapshotVersion === 0 && (preview.data?.volumes || []).length === 6, `v=${preview.data?.snapshotVersion} vols=${preview.data?.volumes?.length}`)
  const afterPreview = await pbGet('talent_reports', reportId)
  check('发布预览零写入（状态/版本不变）', afterPreview.status === beforeRaw.status && Number(afterPreview.snapshotVersion) === Number(beforeRaw.snapshotVersion), `${beforeRaw.status}->${afterPreview.status}`)
  const previewLogs = await api(`/api/admin/log/oper?page=1&pageSize=100&beginTime=${encodeURIComponent(logBeginTime())}`)
  const previewLogRows = (previewLogs.data?.rows || []).filter(row => String(row.title || '').includes(reportNo))
  check('发布预览不写操作日志', previewLogRows.length === 0, `logs=${previewLogRows.length}`)
  expectStatus(await api(`/api/admin/talent/reports/${reportId}/publish`, { method: 'POST', body: { openVolumeIds: [] } }), 422, '发布缺开放分册 422')
  expectStatus(await api(`/api/admin/talent/reports/${reportId}/publish`, { method: 'POST', body: { openVolumeIds: ['V9'] } }), 422, '发布非法分册 422')

  // ── ④ 发布：快照冻结 + C 端可读（AC-ADM-06-2、BR-03/04） ──────────────────────
  console.log('\n── ④ 发布：快照 v1 / C 端可读 ──')
  const publish = await api(`/api/admin/talent/reports/${reportId}/publish`, { method: 'POST', body: { openVolumeIds: ['V1'] } })
  expectStatus(publish, 200, '发布报告 200')
  check('发布后快照版本 = 1', Number(publish.data?.snapshotVersion) === 1, `v=${publish.data?.snapshotVersion}`)
  check('发布后状态已发布且有发布时间', publish.data?.report?.status === 'published' && Boolean(publish.data?.report?.publishedAt), `status=${publish.data?.report?.status}`)
  const publishedRaw = await pbGet('talent_reports', reportId)
  check('快照含要素与六册投影', (publishedRaw.factorSnapshot || []).length === 4 && (publishedRaw.volumeSnapshot || []).length === 6, `factor=${publishedRaw.factorSnapshot?.length} volumes=${publishedRaw.volumeSnapshot?.length}`)
  check('方向快照冻结（含 6 方向与档位）', Array.isArray(publishedRaw.directionSnapshot?.directions) && publishedRaw.directionSnapshot.directions.length === 6, `directions=${publishedRaw.directionSnapshot?.directions?.length}`)
  const afterPublishDetail = await api(`/api/admin/talent/reports/${reportId}`)
  check('发布后匹配天赋页签冻结 6 个方向', (afterPublishDetail.data?.tabs?.matching?.frozen || []).length === 6, `frozen=${afterPublishDetail.data?.tabs?.matching?.frozen?.length}`)
  check('列表/详情新增分册列 = B（1 册）', Number(afterPublishDetail.data?.report?.newBookCount) === 1 && afterPublishDetail.data?.report?.newBooksText === 'B', `new=${afterPublishDetail.data?.report?.newBooksText}`)
  const listAfterPublish = await api(`/api/admin/talent/reports?page=1&pageSize=100&reportNo=${encodeURIComponent(reportNo)}`)
  const rowAfterPublish = listAfterPublish.data?.rows?.[0]
  check('列表行状态已发布且新增分册文本 B', rowAfterPublish?.status === 'published' && rowAfterPublish?.newBooksText === 'B', `status=${rowAfterPublish?.status} new=${rowAfterPublish?.newBooksText}`)

  const cReports = await capi('/api/client/talent/reports')
  const cRow = (cReports.data?.items || []).find(item => item.reportId === reportId)
  check('C 端报告列表看到已发布报告', cRow?.reportStatus === 'published', `status=${cRow?.reportStatus} text=${cRow?.statusText}`)
  check('C 端可读分册数 = 1 / 总册 6', Number(cRow?.readableVolumeCount) === 1 && Number(cRow?.totalVolumeCount) === 6, `readable=${cRow?.readableVolumeCount}/${cRow?.totalVolumeCount}`)
  const overview = await capi(`/api/client/talent/reports/${reportId}`)
  expectStatus(overview, 200, 'C 端报告总览 200')
  check('C 端总览六册全列且仅 1 册可读', (overview.data?.volumes || []).length === 6 && Number(overview.data?.report?.readableVolumeCount) === 1, `vols=${overview.data?.volumes?.length}`)
  const volume = await capi(`/api/client/talent/reports/${reportId}/volumes/V1`)
  expectStatus(volume, 200, 'C 端分册 200')
  const volumeText = JSON.stringify(volume.data || {})
  check('C 端分册不含要素编码（BR-12）', !/[A-F]-\d{2}/.test(volumeText), 'no factor code')
  check('C 端分册要素行可用', (volume.data?.factors || []).length === 2, `factors=${volume.data?.factors?.length}`)
  const closedVolume = await capi(`/api/client/talent/reports/${reportId}/volumes/V2`)
  check('未开放分册 C 端 404 不泄露', closedVolume.status === 404, `status=${closedVolume.status} code=${closedVolume.code}`)
  const ticket = await capi(`/api/client/talent/reports/${reportId}/volumes/V1/pdf-ticket`, { method: 'POST' })
  expectStatus(ticket, 200, 'PDF ticket 签发 200')
  check('ticket 120s 且同源相对地址', Number(ticket.data?.ttlSeconds) === 120 && String(ticket.data?.url || '').startsWith('/api/'), `ttl=${ticket.data?.ttlSeconds}`)
  expectStatus(await capi(`/api/client/talent/reports/${reportId}/volumes/V2/pdf-ticket`, { method: 'POST' }), 404, '未开放分册 ticket 404')

  const directions = await capi(`/api/client/talent/directions?reportId=${reportId}`)
  expectStatus(directions, 200, 'C 端方向接口 200')
  check('C 端推荐 ≤5 且选择上限 3', (directions.data?.items || []).length <= 5 && Number(directions.data?.selectionLimit) === 3, `items=${directions.data?.items?.length} limit=${directions.data?.selectionLimit}`)

  // ── ⑤ 撤回 / 恢复：C 端不可见 + 原快照不变（AC-ADM-06-3、BR-10） ───────────────
  console.log('\n── ⑤ 撤回 / 恢复：C 端 409 更新中 / 快照 hash 不变 ──')
  const snapshotHashBefore = sha256(publishedRaw.volumeSnapshot)
  const withdraw = await api(`/api/admin/talent/reports/${reportId}/withdraw`, { method: 'POST', body: { reason: 'E2E 07 撤回烟测' } })
  expectStatus(withdraw, 200, '撤回报告 200')
  check('撤回后后台状态已撤回（仍保留记录）', withdraw.data?.report?.status === 'retracted', `status=${withdraw.data?.report?.status}`)
  const cOverviewWithdrawn = await capi(`/api/client/talent/reports/${reportId}`)
  check('撤回后 C 端 409 报告内容更新中', cOverviewWithdrawn.status === 409 && cOverviewWithdrawn.data?.code === 'report_retracted' && cOverviewWithdrawn.data?.state === 'retracted', `status=${cOverviewWithdrawn.status} code=${cOverviewWithdrawn.data?.code}`)
  expectStatus(await capi(`/api/client/talent/reports/${reportId}/volumes/V1`), 409, '撤回后 C 端分册 409')
  expectStatus(await capi(`/api/client/talent/reports/${reportId}/volumes/V1/pdf-ticket`, { method: 'POST' }), 409, '撤回后 PDF ticket 409')
  const cReportsWithdrawn = await capi('/api/client/talent/reports')
  const retiredRow = (cReportsWithdrawn.data?.items || []).find(item => item.reportId === reportId)
  check('C 端列表撤回态文案', retiredRow?.reportStatus === 'retracted' && String(retiredRow?.statusText || '').length > 0, `status=${retiredRow?.reportStatus} text=${retiredRow?.statusText}`)
  expectStatus(await api(`/api/admin/talent/reports/${reportId}/withdraw`, { method: 'POST', body: { reason: '重复撤回' } }), 409, '重复撤回 409')
  const restore = await api(`/api/admin/talent/reports/${reportId}/restore`, { method: 'POST' })
  expectStatus(restore, 200, '恢复发布 200')
  const restoredRaw = await pbGet('talent_reports', reportId)
  check('恢复后状态已发布且版本不变', restoredRaw.status === 'published' && Number(restoredRaw.snapshotVersion) === 1, `status=${restoredRaw.status} v=${restoredRaw.snapshotVersion}`)
  check('恢复沿用原快照（volumeSnapshot hash 不变）', sha256(restoredRaw.volumeSnapshot) === snapshotHashBefore, `${snapshotHashBefore} -> ${sha256(restoredRaw.volumeSnapshot)}`)
  expectStatus(await capi(`/api/client/talent/reports/${reportId}`), 200, '恢复后 C 端 200')
  expectStatus(await api(`/api/admin/talent/reports/${reportId}/publish`, { method: 'POST', body: { openVolumeIds: ['V1'] } }), 409, '已发布再发布 409（一人一份幂等）')

  // ── ⑥ 补发只追加 / 重算 v+1（AC-ADM-06-4、BR-05） ──────────────────────────────
  console.log('\n── ⑥ 补发只追加新增册 / 重算快照 ──')
  const v1VolumeHashMap = {}
  for (const item of restoredRaw.volumeSnapshot || []) v1VolumeHashMap[item.volumeId || item.bookCode] = sha256(item)
  const reissuePreview = await api(`/api/admin/talent/reports/${reportId}/reissue-preview`)
  expectStatus(reissuePreview, 200, '补发预览 200')
  check('补发预览新增册 = B', reissuePreview.data?.newBooksText === 'B' && (reissuePreview.data?.newVolumes || []).length === 1, `new=${reissuePreview.data?.newBooksText}`)
  const afterReissuePreview = await pbGet('talent_reports', reportId)
  check('补发预览零写入', Number(afterReissuePreview.snapshotVersion) === 1 && JSON.stringify(afterReissuePreview.openVolumeIds) === JSON.stringify(['V1']), `v=${afterReissuePreview.snapshotVersion} open=${afterReissuePreview.openVolumeIds}`)
  const publishNew = await api(`/api/admin/talent/reports/${reportId}/publish-new`, { method: 'POST' })
  expectStatus(publishNew, 200, '补发新增册 200')
  const afterPublishNew = await pbGet('talent_reports', reportId)
  check('补发后版本 +1（1→2）', Number(afterPublishNew.snapshotVersion) === 2, `v=${afterPublishNew.snapshotVersion}`)
  check('补发只追加：开放分册 V1 + V2', JSON.stringify([...(afterPublishNew.openVolumeIds || [])].sort()) === JSON.stringify(['V1', 'V2']), JSON.stringify(afterPublishNew.openVolumeIds))
  check('补发后新增分册列归零', Number((await api(`/api/admin/talent/reports/${reportId}`)).data?.report?.newBookCount) === 0)
  const oldVolumeUnchanged = (afterPublishNew.volumeSnapshot || []).filter(item => (item.volumeId || item.bookCode) === 'V1' || item.bookCode === 'A').every(item => v1VolumeHashMap[item.volumeId || item.bookCode] === sha256(item))
  check('补发后旧册投影 hash 不变（BR-05/BR-03）', oldVolumeUnchanged, 'V1/A hash')
  const versionTypes = (afterPublishNew.versions || []).map(item => item.type)
  check('版本历史记录 publish/reissue', versionTypes.includes('publish') && versionTypes.includes('reissue'), versionTypes.join(','))
  const cOverviewReissued = await capi(`/api/client/talent/reports/${reportId}`)
  check('补发后 C 端可读册数 = 2', Number(cOverviewReissued.data?.report?.readableVolumeCount) === 2, `readable=${cOverviewReissued.data?.report?.readableVolumeCount}`)
  const regen = await api(`/api/admin/talent/reports/${reportId}/regenerate-snapshot`, { method: 'POST', body: { regenerateFactorNotes: false } })
  expectStatus(regen, 200, '重算快照 200')
  const afterRegen = await pbGet('talent_reports', reportId)
  check('重算后版本 +1（2→3）且状态不变', Number(afterRegen.snapshotVersion) === 3 && afterRegen.status === 'published', `v=${afterRegen.snapshotVersion} status=${afterRegen.status}`)
  check('重算写入 regenerate 版本记录', (afterRegen.versions || []).some(item => item.type === 'regenerate'), (afterRegen.versions || []).map(item => item.type).join(','))
  expectStatus(await api('/api/admin/talent/reports/notexist123/regenerate-snapshot', { method: 'POST', body: {} }), 404, '不存在报告重算 404')

  // ── ⑦ 一键同步 preview 零写入 / commit 需隔离库（AC-M8-03/05） ────────────────
  console.log('\n── ⑦ 一键同步：preview 零写入 / commit 门禁 ──')
  const syncBefore = await pbGet('talent_reports', reportId)
  const totalBefore = (await api('/api/admin/talent/reports?page=1&pageSize=1')).data?.total
  const syncPreview = await api('/api/admin/talent/reports/sync', { method: 'POST', body: { mode: 'preview' } })
  expectStatus(syncPreview, 200, '一键同步 preview 200')
  check('preview 返回 scanned 与三类计数', Number.isFinite(Number(syncPreview.data?.scanned)) && Boolean(syncPreview.data?.counts), `scanned=${syncPreview.data?.scanned}`)
  const syncAfter = await pbGet('talent_reports', reportId)
  const totalAfter = (await api('/api/admin/talent/reports?page=1&pageSize=1')).data?.total
  check('preview 零写入（版本/状态/报告总数不变）', Number(syncAfter.snapshotVersion) === Number(syncBefore.snapshotVersion) && syncAfter.status === syncBefore.status && totalAfter === totalBefore, `v=${syncAfter.snapshotVersion} total=${totalBefore}->${totalAfter}`)
  const syncLogs = await api('/api/admin/talent/reports/sync-logs?page=1&pageSize=5')
  expectStatus(syncLogs, 200, '同步日志 200')
  const syncRows = syncLogs.data?.rows || []
  check('同步日志字段完整（trigger/status/counts/耗时）', syncRows.every(row => row.at && row.status && Number.isFinite(Number(row.refreshed)) && Number.isFinite(Number(row.durationMs))), `rows=${syncRows.length}`)
  checkNoSensitive(syncRows, '同步日志无 PII')
  if (process.env.E2E_ALLOW_GLOBAL_WRITE === '1') {
    const commit = await api('/api/admin/talent/reports/sync', { method: 'POST', body: { mode: 'commit' } })
    expectStatus(commit, 200, '一键同步 commit 200（隔离库）')
    check('commit 写入三类计数与同步日志', Boolean(commit.data?.counts) && Number(commit.data?.counts?.refreshed) >= 0, JSON.stringify(commit.data?.counts || {}))
  } else {
    skip('一键同步 commit', '全局写会刷新种子报告；默认跳过，隔离库设 E2E_ALLOW_GLOBAL_WRITE=1 执行')
  }

  // ── ⑧ 权限正反（§6.1 越权矩阵） ────────────────────────────────────────────────
  console.log('\n── ⑧ 报告域权限正反 ──')
  const anon = await fetch(`${ADMIN}/api/admin/talent/reports?page=1&pageSize=5`)
  check('匿名报告列表 401', anon.status === 401, `status=${anon.status}`)
  const operatorApi = makeApi(await adminLogin(ACCOUNTS.platformOperator.identity, ACCOUNTS.platformOperator.password))
  const reviewerApi = makeApi(await adminLogin(ACCOUNTS.reportReviewer.identity, ACCOUNTS.reportReviewer.password))
  const ruleApi = makeApi(await adminLogin(ACCOUNTS.ruleConfigurator.identity, ACCOUNTS.ruleConfigurator.password))
  expectStatus(await operatorApi('/api/admin/talent/reports?page=1&pageSize=5'), 200, '平台运营报告列表 200')
  expectStatus(await reviewerApi('/api/admin/talent/reports?page=1&pageSize=5'), 200, '报告审核员报告列表 200')
  expectStatus(await ruleApi('/api/admin/talent/reports?page=1&pageSize=5'), 403, '规则配置员报告列表 403')
  expectStatus(await operatorApi('/api/admin/talent/reports/notexist123/publish', { method: 'POST', body: { openVolumeIds: ['V1'] } }), 404, '平台运营发布（不存在）404')
  expectStatus(await reviewerApi('/api/admin/talent/reports/notexist123/publish', { method: 'POST', body: { openVolumeIds: ['V1'] } }), 404, '报告审核员发布（不存在）404')
  expectStatus(await ruleApi('/api/admin/talent/reports/notexist123/publish', { method: 'POST', body: { openVolumeIds: ['V1'] } }), 403, '规则配置员发布 403')
  const anonPublish = await fetch(`${ADMIN}/api/admin/talent/reports/notexist123/publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ openVolumeIds: ['V1'] }) })
  check('匿名发布 401', anonPublish.status === 401, `status=${anonPublish.status}`)
  expectStatus(await operatorApi('/api/admin/talent/reports/sync', { method: 'POST', body: { mode: 'preview' } }), 200, '平台运营同步 preview 200')
  expectStatus(await reviewerApi('/api/admin/talent/reports/sync', { method: 'POST', body: { mode: 'preview' } }), 403, '报告审核员同步 403')
  expectStatus(await ruleApi('/api/admin/talent/reports/sync', { method: 'POST', body: { mode: 'preview' } }), 403, '规则配置员同步 403')

  // ── ⑨ 审计无 PII（AC-ADM-08-2、§6.2） ─────────────────────────────────────────
  console.log('\n── ⑨ 报告动作审计 ──')
  const auditLogs = await api(`/api/admin/log/oper?page=1&pageSize=200&beginTime=${encodeURIComponent(logBeginTime())}`)
  const auditRows = (auditLogs.data?.rows || []).filter(row => String(row.title || '').includes(reportNo))
  const titles = [...new Set(auditRows.map(row => String(row.title).replace(/（.*$/, '')))]
  check('发布/撤回/恢复/补发/重算均写审计', auditRows.length >= 5 && titles.length >= 4, `rows=${auditRows.length} titles=${titles.join('|')}`)
  check('审计状态均为成功', auditRows.every(row => Number(row.status) === 0), `failed=${auditRows.filter(row => Number(row.status) !== 0).length}`)
  const auditScan = scanSensitive(auditRows)
  check('审计内容无手机号/证件明文', auditScan.ok, auditScan.violations.join(' | '))

  // ── ⑩ 页面层：10 列表头 / 新增分册列 / 详情 4 页签 / 旧 tab 回落 ────────────────
  console.log('\n── ⑩ 页面层：10 列 / 新增分册 / 4 页签 / tab 回落 ──')
  const browser = await launchBrowser()
  try {
    const ctx = await browser.newContext({ viewport: { width: 1560, height: 960 } })
    const page = await ctx.newPage()
    const pageErrors = []
    page.on('pageerror', error => pageErrors.push(String(error.message).slice(0, 90)))
    await loginAdminPage(page)
    await page.goto(`${ADMIN}/admin/talent/reports`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)
    const headers = (await page.locator('thead th').allInnerTexts()).map(text => text.trim())
    const EXPECTED = ['报告编号', '家长', '子女', '家长手机号', '检验人身份证', '基因篇数', '分册', '新增分册', '状态', '操作']
    check('报告页表头 10 列逐列一致', JSON.stringify(headers) === JSON.stringify(EXPECTED), headers.join('|'))
    const fixtureRow = page.locator('tbody tr', { hasText: reportNo }).first()
    check('夹具报告行可见', (await fixtureRow.count()) > 0, reportNo)
    if (await fixtureRow.count()) {
      const cells = (await fixtureRow.locator('td').allInnerTexts()).map(text => text.trim())
      check('新增分册列仅在有新增时给内容（补发后为 —）', cells.length === 10 && (cells[7] === '—' || cells[7] === ''), `cell7=${cells[7]}`)
      check('状态列显示已发布', cells[8].includes('已发布'), `status=${cells[8]}`)
    }
    for (const [tab, expectText] of [['matching', '匹配天赋'], ['selected', '已选培养方向'], ['gene', '基因报告'], ['advice', '培育建议'], ['snapshot', '已选培养方向'], ['unknown', '已选培养方向']]) {
      await page.goto(`${ADMIN}/admin/talent/reports?report=${reportId}&tab=${tab}`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1600)
      const tabs = (await page.locator('.n-tabs-tab').allInnerTexts()).map(text => text.trim())
      const active = (await page.locator('.n-tabs-tab.n-tabs-tab--active').allInnerTexts()).map(text => text.trim()).join('')
      check(`详情 4 页签 + ?tab=${tab} 落位（${expectText}）`, tabs.length === 4 && active.includes(expectText.slice(0, 4)), `active=${active} tabs=${tabs.length}`)
    }
    check('报告页无未捕获前端异常', pageErrors.length === 0, pageErrors.join(' | '))
    await ctx.close()
  } finally {
    await browser.close()
  }
} catch (error) {
  check('套件执行未抛异常', false, String(error?.message || error).slice(0, 300))
} finally {
  const result = await finishSuite({ suite: SUITE, title: TITLE, startedAt })
  process.exit(result.failed ? 1 : 0)
}