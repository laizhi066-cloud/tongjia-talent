#!/usr/bin/env node
/**
 * @description M9 建议域验收（spec §4.4 08）：AC-ADM-07-1..4、BR-06/07、AC-M5。
 *   - 15 列 / 5 项检索（含精确周岁，`7-8`/`7岁` 422）/ 版本历史（归档版本只读 + 服务端 409）；
 *   - 发布 / 撤回（可还原种子状态）/ 派生可见性（报告未发布则建议不可见）；
 *   - 接收新版：重复版本 / 版本顺序 / 非法日期 → 409/422 零写入；正向接收需隔离库（默认 skip）；
 *   - CSV 导出 15 列、脱敏、跟随筛选；权限正反（规则配置 403 / 审核 200）；审计无 PII；
 *   - 页面层：15 列表头、历史版本只读横幅与操作隐藏、回到当前生效版。
 *   写入只改「发布状态」并在 finally 还原；不新建版本、不改种子正文。
 * @file scripts/e2e/08-advice-domain.mjs
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
  registerCleanup,
  scanSensitive,
  skip,
} from './lib.mjs'

const SUITE = '08-advice-domain'
const TITLE = '建议域验收（AC-ADM-07 / BR-06/07 / M5）'
const startedAt = Date.now()
assertSafeTarget({ write: true })

const logBeginTime = () => new Date(startedAt - 10_000).toISOString().slice(0, 19).replace('T', ' ')
const SEED_PUBLISHED_REPORT_NO = 'R202611160002'
const SEED_PENDING_REPORT_NO = 'R202611160001'

async function loginAdminPage(page) {
  await page.goto(`${ADMIN}/login`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  const inputs = page.locator('input')
  await inputs.nth(0).fill(ACCOUNTS.superAdmin.identity)
  await inputs.nth(1).fill(ACCOUNTS.superAdmin.password)
  await page.locator('button:has-text("登录")').first().click()
  await page.waitForTimeout(3000)
}

/** 容错清理：目标状态已是期望时忽略 409，其它错误抛出计入清理失败。 */
async function tolerant(api, path, method, body, label) {
  const res = await api(path, { method, ...(body ? { body } : {}) })
  if (res.status === 200 || res.status === 409) return
  throw new Error(`${label} 清理失败：${res.status} ${res.message || ''}`)
}

try {
  const token = await adminLogin()
  const api = makeApi(token)

  // ── ① 15 列 / 分页 / 版本视图（AC-ADM-07-1、BR-13） ─────────────────────────────
  console.log('\n── ① 建议列表：15 列 / 分页 / 当前版本视图 ──')
  const list = await api('/api/admin/talent/advice?page=1&pageSize=20')
  expectStatus(list, 200, '建议列表 200')
  const rows = list.data?.rows || []
  const COLUMN_FIELDS = [
    'adviceNo', 'versionName', 'name', 'maskedIdNo', 'genderLabel', 'birthday', 'ageLabel',
    'reportNo', 'geneBookCountLabel', 'books', 'coveredFactorText', 'entropyText',
    'publishStatus', 'publishStatusLabel', 'syncedAt',
  ]
  check('列表每行含 15 列字段', rows.length > 0 && rows.every(row => COLUMN_FIELDS.every(key => row[key] !== undefined)), `缺字段行=${rows.filter(row => COLUMN_FIELDS.some(key => row[key] === undefined)).length}`)
  check('分页默认 20', list.data?.pageSize === 20, `pageSize=${list.data?.pageSize}`)
  check('当前版本视图 isCurrent=true', list.data?.viewing?.isCurrent === true, JSON.stringify(list.data?.viewing))
  check('当前版本行 versionReadonly=false', rows.every(row => row.versionReadonly === false), `rows=${rows.length}`)
  check('每行含发布状态与派生可见性', rows.every(row => typeof row.clientVisible === 'boolean' && Boolean(row.publishStatusLabel)), 'ok')
  checkNoSensitive(list.data, '建议列表响应无密文/哈希/明文 PII')
  const capped = await api('/api/admin/talent/advice?page=1&pageSize=500')
  check('每页上限 100', capped.data?.pageSize === 100, `pageSize=${capped.data?.pageSize}`)

  const versions = await api('/api/admin/talent/advice/versions')
  expectStatus(versions, 200, '建议版本历史 200')
  const versionRows = versions.data?.rows || []
  const activeVersion = versionRows.find(item => item.isCurrent)
  const archivedVersion = versionRows.find(item => !item.isCurrent)
  check('存在 1 个当前生效版与 1 个归档版', Boolean(activeVersion) && Boolean(archivedVersion) && versionRows.filter(item => item.isCurrent).length === 1, versionRows.map(item => `${item.versionNo}:${item.status}`).join(','))
  check('建议周期固定 4 个月（生效→下次更新）', (() => {
    if (!activeVersion?.effectiveAt || !activeVersion?.nextUpdateAt) return false
    const from = new Date(activeVersion.effectiveAt)
    const to = new Date(activeVersion.nextUpdateAt)
    const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
    return months === 4
  })(), `${activeVersion?.effectiveAt} -> ${activeVersion?.nextUpdateAt}`)
  check('归档版本状态=已归档且非当前', archivedVersion?.status === 'archived' && archivedVersion?.isCurrent === false, `${archivedVersion?.statusLabel}`)
  check('版本含份数统计（docCount/publishedCount/withdrawnCount）', versionRows.every(item => Number.isFinite(Number(item.docCount)) && Number.isFinite(Number(item.publishedCount)) && Number.isFinite(Number(item.withdrawnCount))), `rows=${versionRows.length}`)

  // ── ② 5 项检索 / 精确周岁（AC-ADM-07-2） ────────────────────────────────────
  console.log('\n── ② 检索：建议编号 / 姓名 / 身份证 / 报告编号 / 精确周岁 ──')
  const sample = rows.find(row => row.reportNo === SEED_PUBLISHED_REPORT_NO) || rows[0]
  const byAdviceNo = await api(`/api/admin/talent/advice?page=1&pageSize=20&adviceNo=${encodeURIComponent(sample.adviceNo)}`)
  check('建议编号检索命中', byAdviceNo.data?.total === 1 && byAdviceNo.data?.rows?.[0]?.adviceNo === sample.adviceNo, `total=${byAdviceNo.data?.total}`)
  const byName = await api(`/api/admin/talent/advice?page=1&pageSize=20&name=${encodeURIComponent(sample.name)}`)
  check('本人姓名检索命中', (byName.data?.rows || []).every(row => row.name.includes(sample.name)), `total=${byName.data?.total}`)
  const byIdNo = await api(`/api/admin/talent/advice?page=1&pageSize=20&idNo=${String(sample.maskedIdNo).slice(-4)}`)
  check('身份证后 4 位检索命中', Number(byIdNo.data?.total) >= 1, `total=${byIdNo.data?.total}`)
  const byReportNo = await api(`/api/admin/talent/advice?page=1&pageSize=20&reportNo=${SEED_PUBLISHED_REPORT_NO}`)
  check('报告编号检索命中', (byReportNo.data?.rows || []).every(row => row.reportNo.includes(SEED_PUBLISHED_REPORT_NO)), `total=${byReportNo.data?.total}`)
  const age7 = await api('/api/admin/talent/advice?page=1&pageSize=100&age=7')
  check('精确周岁 7 只命中 7 岁', age7.data?.total === 1 && (age7.data?.rows || []).every(row => Number(row.age) === 7), `total=${age7.data?.total} ages=${(age7.data?.rows || []).map(row => row.age).join(',')}`)
  const age10 = await api('/api/admin/talent/advice?page=1&pageSize=100&age=10')
  check('精确周岁 10 只命中 10 岁', age10.data?.total === 1 && (age10.data?.rows || []).every(row => Number(row.age) === 10), `total=${age10.data?.total}`)
  for (const bad of ['7-8', '7%E5%B2%81', 'abc', '101']) {
    const res = await api(`/api/admin/talent/advice?page=1&pageSize=20&age=${bad}`)
    check(`年龄非精确整数 422（${decodeURIComponent(bad)}）`, res.status === 422, `status=${res.status}`)
  }
  const andFilter = await api(`/api/admin/talent/advice?page=1&pageSize=20&adviceNo=${encodeURIComponent(sample.adviceNo)}&reportNo=${SEED_PUBLISHED_REPORT_NO}&age=${sample.age}`)
  check('检索条件交集命中', andFilter.data?.total === 1, `total=${andFilter.data?.total}`)
  const badIdNo = await api('/api/admin/talent/advice?page=1&pageSize=20&idNo=123')
  expectStatus(badIdNo, 422, '身份证非 4/18 位 422')
  const reset = await api('/api/admin/talent/advice?page=1&pageSize=100')
  check('重置检索恢复当前版本全量', reset.data?.total === rows.length, `total=${reset.data?.total}`)

  // ── ③ 历史版本只读（AC-ADM-07-4） ───────────────────────────────────────────
  console.log('\n── ③ 历史版本只读：前端标记 + 服务端 409 ──')
  const archivedList = await api(`/api/admin/talent/advice?page=1&pageSize=100&versionId=${archivedVersion.id}`)
  expectStatus(archivedList, 200, '归档版本列表 200')
  const archivedRows = archivedList.data?.rows || []
  check('归档版本 viewing.isCurrent=false', archivedList.data?.viewing?.isCurrent === false && archivedList.data?.viewing?.versionName === archivedVersion.versionNo, JSON.stringify(archivedList.data?.viewing))
  check('归档版本行 versionReadonly=true', archivedRows.length > 0 && archivedRows.every(row => row.versionReadonly === true), `rows=${archivedRows.length}`)
  const archivedDoc = archivedRows[0]
  expectStatus(await api(`/api/admin/talent/advice/${archivedDoc.id}/publish`, { method: 'POST' }), 409, '归档版本发布 409')
  const archivedWithdraw = await api(`/api/admin/talent/advice/${archivedDoc.id}/withdraw`, { method: 'POST', body: { reason: 'E2E 08 历史版本' } })
  expectStatus(archivedWithdraw, 409, '归档版本撤回 409')
  check('归档版本 409 提示只读', String(archivedWithdraw.message || '').includes('只读'), String(archivedWithdraw.message || '').slice(0, 40))
  const archivedAfter = await api(`/api/admin/talent/advice?page=1&pageSize=100&versionId=${archivedVersion.id}`)
  check('归档版本写入失败未改状态', (archivedAfter.data?.rows || []).find(row => row.id === archivedDoc.id)?.publishStatus === archivedDoc.publishStatus, `before=${archivedDoc.publishStatus} after=${archivedAfter.data?.rows?.find(row => row.id === archivedDoc.id)?.publishStatus}`)

  // ── ④ 发布 / 撤回 / 派生可见性（AC-ADM-07-3、BR-06/07） ─────────────────────
  console.log('\n── ④ 发布 / 撤回 / 派生可见性 ──')
  const activeList = await api(`/api/admin/talent/advice?page=1&pageSize=100&versionId=${activeVersion.id}`)
  const activeDocs = activeList.data?.rows || []
  const visibleDoc = activeDocs.find(row => row.reportNo === SEED_PUBLISHED_REPORT_NO)
  const pendingDoc = activeDocs.find(row => row.reportNo === SEED_PENDING_REPORT_NO)
  check('当前版本含两份种子建议（已发布报告 / 待发布报告）', Boolean(visibleDoc) && Boolean(pendingDoc), activeDocs.map(row => `${row.reportNo}:${row.publishStatus}`).join(','))

  const clientToken = await clientLogin(ACCOUNTS.clientIdentity, process.env.PLATFORM_OPERATOR_PASSWORD || ACCOUNTS.platformOperator.password)
  const capi = makeClientApi(clientToken)
  const cReports = await capi('/api/client/talent/reports')
  const visibleReport = (cReports.data?.items || []).find(item => item.reportId)
  check('C 端存在已发布报告对象', Boolean(visibleReport?.reportId), `reportId=${Boolean(visibleReport?.reportId)}`)
  const adviceBaseline = await capi(`/api/client/talent/advice?reportId=${visibleReport.reportId}`)
  expectStatus(adviceBaseline, 200, 'C 端建议基线 200')
  check('C 端建议可用且按分册分组', adviceBaseline.data?.available === true && (adviceBaseline.data?.books || []).length >= 1, `books=${adviceBaseline.data?.books?.length}`)
  const chapterSections = (adviceBaseline.data?.books || []).flatMap(book => book.sections || [])
  check('C 端建议四段文案齐全（正文/示例/方向/建议）', chapterSections.length > 0 && chapterSections.every(section => Boolean(section.content) && Boolean(section.example) && Boolean(section.direction) && Boolean(section.suggestion)), `sections=${chapterSections.length}`)
  check('C 端建议版本含周期与下一版时间', Boolean(adviceBaseline.data?.version?.versionNo) && Boolean(adviceBaseline.data?.version?.nextUpdateAt), `${adviceBaseline.data?.version?.versionNo}`)
  checkNoSensitive(adviceBaseline.data, 'C 端建议响应无 PII/密文')

  if (visibleDoc) {
    // 撤回：C 端建议消失（派生可见性），后台行保留
    const withdraw = await api(`/api/admin/talent/advice/${visibleDoc.id}/withdraw`, { method: 'POST', body: { reason: 'E2E 08 撤回烟测' } })
    expectStatus(withdraw, 200, '撤回已发布建议 200')
    check('撤回后 clientVisible=false', withdraw.data?.clientVisible === false, `clientVisible=${withdraw.data?.clientVisible}`)
    const clientAfterWithdraw = await capi(`/api/client/talent/advice?reportId=${visibleReport.reportId}`)
    check('报告已发布但建议撤回 → C 端空态', clientAfterWithdraw.status === 200 && clientAfterWithdraw.data?.available === false, `available=${clientAfterWithdraw.data?.available}`)
    const listAfterWithdraw = await api(`/api/admin/talent/advice?page=1&pageSize=100&adviceNo=${encodeURIComponent(visibleDoc.adviceNo)}`)
    check('撤回后后台行状态已撤回（记录保留）', (listAfterWithdraw.data?.rows || [])[0]?.publishStatus === 'withdrawn', `status=${(listAfterWithdraw.data?.rows || [])[0]?.publishStatus}`)
    expectStatus(await api(`/api/admin/talent/advice/${visibleDoc.id}/withdraw`, { method: 'POST', body: { reason: '重复撤回' } }), 409, '重复撤回 409')
    registerCleanup('恢复种子建议发布状态', () => tolerant(api, `/api/admin/talent/advice/${visibleDoc.id}/publish`, 'POST', undefined, '恢复建议发布'))
    const republish = await api(`/api/admin/talent/advice/${visibleDoc.id}/publish`, { method: 'POST' })
    expectStatus(republish, 200, '重新发布建议 200')
    const clientAfterPublish = await capi(`/api/client/talent/advice?reportId=${visibleReport.reportId}`)
    check('重新发布后 C 端建议恢复可见', clientAfterPublish.status === 200 && clientAfterPublish.data?.available === true, `available=${clientAfterPublish.data?.available}`)
    expectStatus(await api(`/api/admin/talent/advice/${visibleDoc.id}/publish`, { method: 'POST' }), 409, '重复发布 409')
  }

  if (pendingDoc) {
    // 报告未发布：即使建议已发布也不可见（BR-06 派生可见）
    const publishPending = await api(`/api/admin/talent/advice/${pendingDoc.id}/publish`, { method: 'POST' })
    expectStatus(publishPending, 200, '待发布报告的建议可发布 200')
    check('报告未发布时 clientVisible=false（派生可见）', publishPending.data?.clientVisible === false, `clientVisible=${publishPending.data?.clientVisible}`)
    expectStatus(await api(`/api/admin/talent/advice/${pendingDoc.id}/publish`, { method: 'POST' }), 409, '重复发布 409')
    registerCleanup('还原种子建议撤回状态', () => tolerant(api, `/api/admin/talent/advice/${pendingDoc.id}/withdraw`, 'POST', { reason: 'E2E 08 还原' }, '还原建议撤回'))
    const withdrawBack = await api(`/api/admin/talent/advice/${pendingDoc.id}/withdraw`, { method: 'POST', body: { reason: 'E2E 08 还原种子状态' } })
    expectStatus(withdrawBack, 200, '还原建议撤回状态 200')
    expectStatus(await api(`/api/admin/talent/advice/${pendingDoc.id}/withdraw`, { method: 'POST', body: { reason: '重复' } }), 409, '重复撤回 409')
  }

  // ── ⑤ 接收新版：负向零写入；正向需隔离库（AC-ADM-07、BR-07、AC-M8-06） ─────────
  console.log('\n── ⑤ 接收新一版建议：校验与门禁 ──')
  expectStatus(await api('/api/admin/talent/advice/versions', { method: 'POST', body: {} }), 422, '缺少 effectiveAt 422')
  expectStatus(await api('/api/admin/talent/advice/versions', { method: 'POST', body: { effectiveAt: '2028-13-40' } }), 422, '非法日期 422')
  const duplicate = await api('/api/admin/talent/advice/versions', { method: 'POST', body: { effectiveAt: activeVersion.effectiveAt } })
  expectStatus(duplicate, 409, '重复生效日期 409（零写入）')
  const versionsAfter = await api('/api/admin/talent/advice/versions')
  check('负向接收未新增版本', (versionsAfter.data?.rows || []).length === versionRows.length, `before=${versionRows.length} after=${versionsAfter.data?.rows?.length}`)
  if (process.env.E2E_ALLOW_GLOBAL_WRITE === '1') {
    const receive = await api('/api/admin/talent/advice/versions', { method: 'POST', body: { effectiveAt: '2099-12-12', note: 'E2E 08 隔离库接收新版' } })
    expectStatus(receive, 200, '接收新版 200（隔离库）')
    check('接收新版后旧版归档、当前版切换', Boolean(receive.data?.version), JSON.stringify(receive.data?.version || {}).slice(0, 120))
  } else {
    skip('接收新一版建议（正向）', '会切换全局生效版本、无法回滚旧版；默认跳过，隔离库设 E2E_ALLOW_GLOBAL_WRITE=1 执行')
  }

  // ── ⑥ CSV 导出 15 列 / 脱敏 / 跟随筛选（AC-ADM-07-1/4） ───────────────────────
  console.log('\n── ⑥ 导出：15 列 / 脱敏 / 跟随筛选 ──')
  const exportRes = await fetch(`${ADMIN}/api/admin/talent/advice/export`, { headers: { Authorization: `Bearer ${token}` } })
  check('导出 200 且 Content-Type 为 CSV', exportRes.status === 200 && String(exportRes.headers.get('content-type') || '').includes('csv'), `status=${exportRes.status}`)
  const csvText = await exportRes.text()
  const csvLines = csvText.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean)
  const csvHeader = (csvLines[0] || '').split(',')
  check('导出表头 15 列', csvHeader.length === 15 && csvHeader[0] === '建议编号' && csvHeader[14] === '撤回时间', `cols=${csvHeader.length}`)
  check('导出行数 = 当前版本建议数', csvLines.length - 1 === activeDocs.length, `lines=${csvLines.length - 1} docs=${activeDocs.length}`)
  const exportScan = scanSensitive(csvText)
  check('导出内容无手机号/证件明文/密文列', exportScan.ok && !/cipher|hash/i.test(csvHeader.join(',')), exportScan.violations.join(' | '))
  const exportAge7 = await fetch(`${ADMIN}/api/admin/talent/advice/export?age=7`, { headers: { Authorization: `Bearer ${token}` } })
  const csvAge7 = (await exportAge7.text()).replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean)
  check('导出跟随筛选（age=7 只剩 1 行）', exportAge7.status === 200 && csvAge7.length - 1 === 1, `rows=${csvAge7.length - 1}`)
  const exportLogs = await api(`/api/admin/log/oper?page=1&pageSize=100&title=${encodeURIComponent('导出培育建议')}&beginTime=${encodeURIComponent(logBeginTime())}`)
  const exportLogRows = (exportLogs.data?.rows || []).filter(row => Number(row.status) === 0)
  check('导出写审计（每次 1 条）', exportLogRows.length >= 2, `rows=${exportLogRows.length}`)
  checkNoSensitive(exportLogRows, '导出审计摘要无 PII')

  // ── ⑦ 权限正反 ──────────────────────────────────────────────────────────────
  console.log('\n── ⑦ 建议域权限正反 ──')
  const anon = await fetch(`${ADMIN}/api/admin/talent/advice?page=1&pageSize=5`)
  check('匿名建议列表 401', anon.status === 401, `status=${anon.status}`)
  const operatorApi = makeApi(await adminLogin(ACCOUNTS.platformOperator.identity, ACCOUNTS.platformOperator.password))
  const reviewerApi = makeApi(await adminLogin(ACCOUNTS.reportReviewer.identity, ACCOUNTS.reportReviewer.password))
  const ruleApi = makeApi(await adminLogin(ACCOUNTS.ruleConfigurator.identity, ACCOUNTS.ruleConfigurator.password))
  expectStatus(await operatorApi('/api/admin/talent/advice?page=1&pageSize=5'), 200, '平台运营建议列表 200')
  expectStatus(await reviewerApi('/api/admin/talent/advice?page=1&pageSize=5'), 200, '报告审核员建议列表 200')
  expectStatus(await ruleApi('/api/admin/talent/advice?page=1&pageSize=5'), 403, '规则配置员建议列表 403')
  expectStatus(await reviewerApi('/api/admin/talent/advice/versions', { method: 'POST', body: { effectiveAt: '2026-12-12' } }), 403, '报告审核员接收新版 403')
  expectStatus(await ruleApi('/api/admin/talent/advice/versions', { method: 'POST', body: { effectiveAt: '2026-12-12' } }), 403, '规则配置员接收新版 403')
  expectStatus(await reviewerApi(`/api/admin/talent/advice/${archivedDoc.id}/publish`, { method: 'POST' }), 409, '审核员对归档版本发布 409（先鉴权后只读校验）')
  expectStatus(await ruleApi(`/api/admin/talent/advice/${visibleDoc.id}/withdraw`, { method: 'POST', body: { reason: 'x' } }), 403, '规则配置员撤回建议 403')

  // ── ⑧ 审计无 PII（AC-ADM-08-2、§6.2） ────────────────────────────────────────
  console.log('\n── ⑧ 建议动作审计 ──')
  const auditLogs = await api(`/api/admin/log/oper?page=1&pageSize=200&beginTime=${encodeURIComponent(logBeginTime())}`)
  const adviceAudit = (auditLogs.data?.rows || []).filter(row => /培育建议|建议/.test(String(row.title || '')))
  check('发布/撤回/导出写入审计', adviceAudit.length >= 3, `rows=${adviceAudit.length}`)
  const auditScan = scanSensitive(adviceAudit)
  check('建议审计无手机号/证件明文', auditScan.ok, auditScan.violations.join(' | '))

  // ── ⑨ 页面层：15 列表头 + 历史版本只读横幅 ────────────────────────────────────
  console.log('\n── ⑨ 页面层：15 列 / 历史版本只读 / 回到当前版 ──')
  const browser = await launchBrowser()
  try {
    const ctx = await browser.newContext({ viewport: { width: 1560, height: 960 } })
    const page = await ctx.newPage()
    const pageErrors = []
    page.on('pageerror', error => pageErrors.push(String(error.message).slice(0, 90)))
    await loginAdminPage(page)
    await page.goto(`${ADMIN}/admin/talent/advice`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2600)
    const headers = (await page.locator('thead th').allInnerTexts()).map(text => text.trim())
    const EXPECTED = ['建议编号', '版本', '本人', '身份证', '性别', '出生日期', '年龄', '基因报告', '基因篇数', '分册', '覆盖要素', '数据熵', '发布状态', '同步时间', '操作']
    check('建议页表头 15 列逐列一致', JSON.stringify(headers) === JSON.stringify(EXPECTED), headers.join('|'))
    const versionButton = page.locator('button:has-text("版本历史")').first()
    check('版本历史入口存在', (await versionButton.count()) > 0)
    if (await versionButton.count()) {
      await versionButton.click()
      await page.waitForTimeout(1200)
      const modal = page.locator('.n-modal').first()
      const modalText = await modal.innerText()
      check('版本历史弹层列出两版（当前生效 + 已归档）', modalText.includes('当前生效') && modalText.includes('已归档'), modalText.replace(/\n/g, ' ').slice(0, 80))
      const viewButtons = modal.locator('button:has-text("查看该版本")')
      check('历史版本提供查看入口', (await viewButtons.count()) >= 2)
      if ((await viewButtons.count()) >= 2) {
        await viewButtons.nth((await viewButtons.count()) - 1).click()
        await page.waitForTimeout(1800)
        const bar = page.locator('[data-testid="advice-readonly-bar"]')
        const barVisible = await bar.isVisible().catch(() => false)
        const barText = barVisible ? await bar.innerText() : ''
        check('归档版本显示「历史版本只读」横幅', barVisible && barText.includes('历史版本只读') && barText.includes(archivedVersion.versionNo), barText.replace(/\n/g, ' ').slice(0, 80))
        check('只读视图隐藏发布/撤回操作', (await page.locator('button:has-text("撤回")').count()) === 0 && (await page.locator('button:has-text("发布")').count()) === 0, `withdraw=${await page.locator('button:has-text("撤回")').count()}`)
        const backButton = page.locator('[data-testid="advice-back-current"]')
        check('提供「回到当前生效版」', (await backButton.count()) === 1)
        if (await backButton.count()) {
          await backButton.click()
          await page.waitForTimeout(1600)
          check('回到当前版后只读横幅消失', !(await bar.isVisible().catch(() => false)), 'bar hidden')
        }
      }
    }
    check('建议页无未捕获前端异常', pageErrors.length === 0, pageErrors.join(' | '))
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