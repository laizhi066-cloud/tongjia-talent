#!/usr/bin/env node
/**
 * @description M9 C 端与权限回归验收（spec §4.4 10）：AC-APP-01..15（可测子集）、
 *   AC-M6-01..06/08/09/12、AC-M8-08..16（ticket/门禁）、BR-01/12/13/14。
 *   覆盖：C 端主链 API 与深链回登录、协议门禁、对象切换无串号、390/340 无溢出、console 0、
 *   越权/解绑/停用 404/403、旧路由与旧权限码 0、三角色接口正反与系统/监控仅超管、
 *   PDF ticket（正常/篡改/跨册/无凭据/未开放）、日志无 PII、health/deep。
 *   使用自有夹具账号 + 自有发布报告；结束后删除夹具并还原账号状态。
 *   「停用菜单即时隐藏」「真机/微信胶囊/暗色」「OSS 直连拒绝」等需环境/真机的项显式 skip。
 * @file scripts/e2e/10-client-permission-regression.mjs
 */
import {
  ACCOUNTS,
  ADMIN,
  H5,
  adminBootstrap,
  adminLogin,
  allMenuRows,
  assertSafeTarget,
  check,
  checkNoSensitive,
  clientLogin,
  expectStatus,
  finishSuite,
  flattenMenuTree,
  launchBrowser,
  makeApi,
  makeClientApi,
  registerCleanup,
  scanSensitive,
  skip,
} from './lib.mjs'
import { fixturesEnabled, pbUpdate, seedReportSubject, trackExisting } from './fixtures.mjs'

const SUITE = '10-client-permission-regression'
const TITLE = 'C 端与权限回归（AC-APP / AC-M6 / AC-M8）'
const startedAt = Date.now()
assertSafeTarget({ write: true })

/** spec §2.6 的 22 个旧权限码。 */
const LEGACY_PERMISSION_CODES = [
  'talent:customer:list', 'talent:customer:view', 'talent:customer:add', 'talent:customer:edit',
  'talent:customer:delete', 'talent:customer:import', 'talent:content:list', 'talent:content:add',
  'talent:content:edit', 'talent:content:delete', 'talent:report:revoke', 'talent:report:edit',
  'talent:report:receive', 'talent:institution:list', 'talent:institution:edit', 'talent:plan:list',
  'talent:plan:add', 'talent:plan:edit', 'talent:plan:submit', 'talent:plan:review',
  'talent:service:member', 'talent:sync:manage',
]
const LEGACY_MENU_PATHS = [
  '/admin/talent/authorization', '/admin/talent/plan', '/admin/talent/element', '/admin/talent/matching',
  '/admin/talent/library', '/admin/talent/receive', '/admin/talent/sync', '/admin/talent/category',
  '/admin/talent/level', '/admin/talent/customer', '/admin/talent/report', '/org/talent/members',
  '/org/talent/reports', '/org/talent/plans',
]
const LEGACY_API = [
  '/api/admin/talent/customer', '/api/admin/talent/report', '/api/admin/talent/institution',
  '/api/admin/talent/authorization', '/api/admin/talent/plan', '/api/admin/talent/plan-selections',
  '/api/admin/talent/template', '/api/admin/talent/matching', '/api/admin/talent/sync-config',
  '/api/admin/talent/sync-logs', '/api/admin/talent/category', '/api/admin/talent/element',
  '/api/admin/talent/library', '/api/admin/talent/content', '/api/org/talent/context',
  '/api/org/talent/members', '/api/org/talent/plans', '/api/integrations/talent/reports',
  '/api/client/talent/binding', '/api/client/talent/plans', '/api/client/talent/plan-selections',
]
const LEGACY_H5_PAGES = [
  'pages/index/index', 'pages/me/me', 'pages/talent/binding', 'pages/talent/plans/index',
  'pages/talent/report/list', 'pages/talent/report/overview', 'pages/talent/report/catalog',
  'pages/talent/report/item', 'pages/talent/interpretations/index',
]
const LEGACY_H5_MARKERS = ['报告列表', '报告总览', '报告目录', '要素解读', '培养计划', '我的档案', '服务包']

async function loginH5(page, identity, password) {
  await page.goto(`${H5}/#/pages/auth/login`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  const inputs = page.locator('input')
  await inputs.nth(0).fill(identity)
  await inputs.nth(1).fill(password)
  return page.locator('.wd-button:has-text("登录")').last()
}

try {
  if (!fixturesEnabled()) throw new Error('C 端回归需要 PB 夹具（本地/隔离实例）')
  const superToken = await adminLogin()
  const api = makeApi(superToken)
  const fixture = await seedReportSubject(api, { suite: '10', withClientUser: true })
  const { reportId, parent, child, clientUser } = fixture
  const publish = await api(`/api/admin/talent/reports/${reportId}/publish`, { method: 'POST', body: { openVolumeIds: ['V1'] } })
  expectStatus(publish, 200, '夹具报告发布 200')
  const capi = makeClientApi(await clientLogin(clientUser.email, clientUser.password))
  const seedClientToken = await clientLogin(ACCOUNTS.clientIdentity, process.env.PLATFORM_OPERATOR_PASSWORD || ACCOUNTS.platformOperator.password)
  const seedCapi = makeClientApi(seedClientToken)
  const reportsAdmin = await api('/api/admin/talent/reports?page=1&pageSize=100')
  const seedReport = (reportsAdmin.data?.rows || []).find(row => row.reportNo === 'R202611160002')

  // ── ① 匿名 401 / 受保护接口（AC-APP-13/15） ──────────────────────────────────
  console.log('\n── ① 匿名访问 C 端接口 → 401 ──')
  const CLIENT_ENDPOINTS = [
    ['summary', '/api/client/talent/summary'],
    ['reports', '/api/client/talent/reports'],
    ['advice', `/api/client/talent/advice?reportId=${reportId}`],
    ['directions', `/api/client/talent/directions?reportId=${reportId}`],
    ['bindings', '/api/client/talent/bindings'],
    ['profile', '/api/client/talent/profile'],
    ['children', '/api/client/talent/children'],
  ]
  for (const [label, path] of CLIENT_ENDPOINTS) {
    const res = await fetch(`${ADMIN}${path}`)
    check(`匿名 ${label} 401`, res.status === 401, `status=${res.status}`)
  }

  // ── ② C 端主链 API（AC-APP-03/04/05/06/07/08/09/15） ───────────────────────
  console.log('\n── ② C 端主链 API ──')
  const summary = await capi('/api/client/talent/summary')
  expectStatus(summary, 200, 'C 端首页聚合 200')
  check('聚合返回 2 个对象（本人 + 子女）', (summary.data?.subjects || []).length === 2 && Boolean(summary.data?.currentId), `subjects=${summary.data?.subjects?.length}`)
  const summaryChild = (summary.data?.subjects || []).find(item => item.subjectId === child.id)
  check('子女对象含报告状态与可读册数', summaryChild?.reportStatus === 'published' && Number(summaryChild?.readableVolumeCount) === 1, `status=${summaryChild?.reportStatus} vols=${summaryChild?.readableVolumeCount}`)
  check('聚合含待核对/建议/已选方向字段', (summary.data?.subjects || []).every(item => 'adviceCount' in item && 'selectedDirectionCount' in item && 'statusText' in item), 'fields ok')
  check('聚合含页脚配置', Boolean(summary.data?.footer), JSON.stringify(Object.keys(summary.data?.footer || {})))
  const summaryByChild = await capi(`/api/client/talent/summary?subjectId=${child.id}`)
  check('切换对象：subjectId 生效且无串号', summaryByChild.status === 200 && summaryByChild.data?.current?.subjectId === child.id, `current=${summaryByChild.data?.current?.subjectId === child.id}`)
  expectStatus(await capi('/api/client/talent/summary?subjectId=notexist123'), 404, '非法 subjectId 404（不泄露存在性）')
  expectStatus(await capi('/api/client/talent/summary?subjectId=g6798smdqts0iav'), 404, '跨账号 subjectId 404')

  const cReports = await capi('/api/client/talent/reports')
  expectStatus(cReports, 200, 'C 端报告列表 200')
  const cReportRow = (cReports.data?.items || []).find(item => item.reportId === reportId)
  check('报告列表含发布报告且六册摘要', cReportRow?.reportStatus === 'published' && Number(cReportRow?.totalVolumeCount) === 6, `status=${cReportRow?.reportStatus} vols=${cReportRow?.totalVolumeCount}`)
  check('报告列表不含报告编号/证件原文', !JSON.stringify(cReports.data || {}).includes('E2E') && !JSON.stringify(cReports.data || {}).match(/\d{17}[\dXx]/), 'no reportNo/idNo')
  const overview = await capi(`/api/client/talent/reports/${reportId}`)
  check('报告总览 200 且六册全列', overview.status === 200 && (overview.data?.volumes || []).length === 6, `vols=${overview.data?.volumes?.length}`)
  const volume = await capi(`/api/client/talent/reports/${reportId}/volumes/V1`)
  expectStatus(volume, 200, '分册内容 200')
  check('分册章节分组 + 无要素编码（BR-12）', (volume.data?.chapters || []).length >= 1 && !/[A-F]-\d{2}/.test(JSON.stringify(volume.data || {})), `chapters=${volume.data?.chapters?.length}`)
  const factor = await capi(`/api/client/talent/reports/${reportId}/factors/A-01`)
  expectStatus(factor, 200, '要素解读 200')
  const factorCount = Number(volume.data?.factors?.length || 0)
  check('要素解读上下项在本册内循环', Number(factor.data?.nextIndex) >= 0 && Number(factor.data?.nextIndex) < factorCount && Number(factor.data?.prevIndex) === factorCount - 1, `prev=${factor.data?.prevIndex} next=${factor.data?.nextIndex} total=${factorCount}`)
  expectStatus(await capi(`/api/client/talent/reports/${reportId}/factors/Z-99`), 404, '不存在要素 404')
  const advice = await capi(`/api/client/talent/advice?reportId=${reportId}`)
  expectStatus(advice, 200, 'C 端建议 200')
  check('无已发布建议 → 空态 available=false', advice.data?.available === false && Boolean(advice.data?.emptyText), `available=${advice.data?.available}`)
  const directions = await capi(`/api/client/talent/directions?reportId=${reportId}`)
  expectStatus(directions, 200, 'C 端方向 200')
  check('方向推荐 ≤5、已选上限 3、自填上限 10', (directions.data?.items || []).length <= 5 && Number(directions.data?.selectionLimit) === 3 && Number(directions.data?.manualLimit) === 10, `items=${directions.data?.items?.length}`)
  check('方向回退标记与 0 命中一致', directions.data?.fallback === true && (directions.data?.items || []).every(item => Number(item.hitCount) === 0), `fallback=${directions.data?.fallback}`)
  const bindings = await capi('/api/client/talent/bindings')
  expectStatus(bindings, 200, 'C 端 bindings 200')
  check('bindings 仅本人 + 已绑子女（2 项）', (bindings.data?.items || []).length === 2, `items=${bindings.data?.items?.length}`)
  const profile = await capi('/api/client/talent/profile')
  check('C 端资料只返回脱敏手机号/身份证', profile.status === 200 && /^\d{3,4}\*{4}\d{4}$/.test(String(profile.data?.maskedMobile)) && !profile.data?.idNo, `masked=${profile.data?.maskedMobile}`)
  checkNoSensitive(bindings.data, 'bindings 无密文/哈希/明文 PII')
  checkNoSensitive(profile.data, '资料页无密文/哈希/明文 PII')

  // 越权：跨账号报告 / 分册 / 建议 / 方向
  expectStatus(await capi(`/api/client/talent/reports/${seedReport?.id || 'x'}`), 404, '跨账号访问他人报告 404')
  expectStatus(await capi(`/api/client/talent/reports/${seedReport?.id || 'x'}/volumes/V1`), 404, '跨账号访问他人分册 404')
  expectStatus(await capi(`/api/client/talent/advice?reportId=${seedReport?.id || 'x'}`), 404, '跨账号访问他人建议 404')
  expectStatus(await capi(`/api/client/talent/directions?reportId=${seedReport?.id || 'x'}`), 404, '跨账号访问他人方向 404')
  expectStatus(await seedCapi(`/api/client/talent/reports/${reportId}`), 404, '种子账号访问夹具报告 404')
  expectStatus(await seedCapi(`/api/client/talent/reports/${reportId}/volumes/V1`), 404, '种子账号访问夹具分册 404')

  // 孩子管理：新增 → 查询中（AC-APP-11）
  const addChild = await capi('/api/client/talent/children', {
    method: 'POST',
    body: { name: `烟测C端子${String(Date.now()).slice(-5)}`, gender: 'male', birthday: '2019-08-08', relation: 'mother', idNo: `11010120190808${String(Date.now()).slice(-4)}` },
  })
  expectStatus(addChild, 200, 'C 端新增孩子 200')
  const cendChild = addChild.data?.child || addChild.data
  check('新增孩子进入查询中（结果查询中）', cendChild?.query === 'querying' || String(cendChild?.queryLabel || '').includes('查询'), `query=${cendChild?.query}`)
  if (cendChild?.id) await trackExisting('talent_children', cendChild.id)
  expectStatus(await capi('/api/client/talent/children/notexist123', { method: 'PUT', body: { name: 'x' } }), 404, '改他人孩子 404')

  // 停用账号：403 且不泄露业务数据（AC-APP-02）
  await pbUpdate('users', clientUser.id, { status: '0' })
  registerCleanup('恢复夹具账号启用', () => pbUpdate('users', clientUser.id, { status: '1' }))
  expectStatus(await capi('/api/client/talent/summary'), 403, '停用账号访问 403')
  const lockedReports = await capi('/api/client/talent/reports')
  check('停用账号不返回业务数据', lockedReports.status === 403 && !lockedReports.data, `status=${lockedReports.status}`)
  await pbUpdate('users', clientUser.id, { status: '1' })

  // ── ③ PDF ticket 门禁（AC-M8-08..14、AC-M9-07） ──────────────────────────────
  console.log('\n── ③ PDF ticket：正常 / 篡改 / 跨册 / 无凭据 / 未开放 ──')
  const ticket = await capi(`/api/client/talent/reports/${reportId}/volumes/V1/pdf-ticket`, { method: 'POST' })
  expectStatus(ticket, 200, 'PDF ticket 200')
  check('ticket TTL=120 且同源相对地址（无直链）', Number(ticket.data?.ttlSeconds) === 120 && String(ticket.data?.url || '').startsWith('/api/') && !/oss\.|https?:/i.test(String(ticket.data?.url || '')), `ttl=${ticket.data?.ttlSeconds}`)
  const pdf1 = await fetch(`${ADMIN}${ticket.data.url}`)
  const bytes1 = Buffer.from(await pdf1.arrayBuffer())
  check('ticket 下载 PDF 200 且为 %PDF 字节', pdf1.status === 200 && String(pdf1.headers.get('content-type')).includes('pdf') && bytes1.slice(0, 4).toString() === '%PDF', `bytes=${bytes1.length}`)
  const pdf2 = await fetch(`${ADMIN}${ticket.data.url}`)
  const bytes2 = Buffer.from(await pdf2.arrayBuffer())
  check('重复下载命中缓存（字节一致）', pdf2.status === 200 && bytes2.equals(bytes1), `hot=${bytes2.length}`)
  const ticketValue = String(ticket.data.url).match(/[?&]ticket=([^&]+)/)?.[1] || ''
  const tamperedTicket = `${ticketValue.slice(0, -4)}${ticketValue.slice(-4) === 'AAAA' ? 'BBBB' : 'AAAA'}`
  const tamperedRes = await fetch(`${ADMIN}/api/client/talent/reports/${reportId}/volumes/V1/pdf?ticket=${tamperedTicket}`)
  check('篡改 ticket 403', tamperedRes.status === 403, `status=${tamperedRes.status}`)
  const crossVolumeRes = await fetch(`${ADMIN}${String(ticket.data.url).replace('volumes/V1', 'volumes/V2')}`)
  check('ticket 跨册复用 403', crossVolumeRes.status === 403, `status=${crossVolumeRes.status}`)
  const noTicketRes = await fetch(`${ADMIN}/api/client/talent/reports/${reportId}/volumes/V1/pdf`)
  check('无 ticket 直连 401', noTicketRes.status === 401, `status=${noTicketRes.status}`)
  expectStatus(await capi(`/api/client/talent/reports/${reportId}/volumes/V2/pdf-ticket`, { method: 'POST' }), 404, '未开放分册 ticket 404')
  expectStatus(await seedCapi(`/api/client/talent/reports/${reportId}/volumes/V1/pdf-ticket`, { method: 'POST' }), 404, '他人报告 ticket 404')

  // ── ④ 旧入口 / 旧路由 0（AC-M6-01/03/08、BR-14） ──────────────────────────────
  console.log('\n── ④ 旧路由 404 / 旧菜单与旧权限码 0 ──')
  for (const path of LEGACY_API) {
    const res = await api(path)
    check(`旧 API 404 ${path}`, res.status === 404, `status=${res.status}`)
  }
  const menuResult = await allMenuRows(superToken)
  expectStatus({ status: menuResult.status }, 200, '超管菜单树 all=true')
  const pathSet = new Set(menuResult.rows.map(row => String(row.path || '')).filter(Boolean))
  const codeSet = new Set(menuResult.rows.map(row => String(row.permissionCode || '')).filter(Boolean))
  for (const path of LEGACY_MENU_PATHS) check(`旧菜单 path 0 行 ${path}`, !pathSet.has(path))
  for (const code of LEGACY_PERMISSION_CODES) check(`旧权限码 0 行 ${code}`, !codeSet.has(code))
  const talentCodes = [...codeSet].filter(code => code.startsWith('talent:')).sort()
  check('在册 talent 权限码 = 35', talentCodes.length === 35, `count=${talentCodes.length}`)
  check('旧集合/旧重置入口 0（无机构/套餐/培养计划入口）', ![...pathSet].some(path => /institution|plan|package|billing|org\//.test(path)), 'no legacy path')

  // ── ⑤ 三角色接口正反 / 系统监控仅超管（AC-M6-04/05/06/12） ────────────────────
  console.log('\n── ⑤ 三角色接口正反 / 系统与监控仅超管 ──')
  const ROLE_CASES = [
    {
      label: '平台运营管理员',
      account: ACCOUNTS.platformOperator,
      expectedPaths: ['/admin/talent/dashboard', '/admin/talent/member', '/admin/talent/rules/factor', '/admin/talent/rules/level', '/admin/talent/rules/direction', '/admin/talent/reports', '/admin/talent/advice'],
    },
    {
      label: '报告审核员',
      account: ACCOUNTS.reportReviewer,
      expectedPaths: ['/admin/talent/dashboard', '/admin/talent/member', '/admin/talent/reports', '/admin/talent/advice'],
    },
    {
      label: '规则配置员',
      account: ACCOUNTS.ruleConfigurator,
      expectedPaths: ['/admin/talent/dashboard', '/admin/talent/rules/factor', '/admin/talent/rules/level', '/admin/talent/rules/direction'],
    },
  ]
  const SYSTEM_PATHS = ['/api/admin/user?page=1&pageSize=5', '/api/admin/role?page=1&pageSize=5', '/api/admin/menu/tree', '/api/admin/monitor/health', '/api/admin/log/oper?page=1&pageSize=5']
  for (const role of ROLE_CASES) {
    const roleToken = await adminLogin(role.account.identity, role.account.password)
    const roleApi = makeApi(roleToken)
    const bootstrap = await adminBootstrap(roleToken)
    const paths = flattenMenuTree(bootstrap.menuTree).map(item => item.path)
    const businessPaths = paths.filter(path => path.startsWith('/admin/talent/'))
    check(`${role.label} 业务菜单精确匹配`, JSON.stringify(businessPaths.sort()) === JSON.stringify([...role.expectedPaths].sort()), businessPaths.join(','))
    for (const forbidden of ['/admin/user', '/admin/menu', '/admin/role', '/admin/monitor/health', '/admin/log/oper-log'])
      check(`${role.label} 菜单无系统/监控 ${forbidden}`, !paths.includes(forbidden))
    for (const path of SYSTEM_PATHS) {
      const res = await roleApi(path)
      check(`${role.label} 系统接口 403 ${path.split('?')[0]}`, res.status === 403, `status=${res.status}`)
    }
  }
  for (const path of SYSTEM_PATHS) expectStatus(await api(path), 200, `superAdmin 系统接口 200 ${path.split('?')[0]}`)
  const ruleApi = makeApi(await adminLogin(ACCOUNTS.ruleConfigurator.identity, ACCOUNTS.ruleConfigurator.password))
  expectStatus(await ruleApi('/api/admin/talent/dashboard'), 200, '工作台拆码：规则配置员 dashboard 200')
  expectStatus(await ruleApi('/api/admin/talent/reports?page=1&pageSize=5'), 403, '工作台拆码：规则配置员 reports 403')
  expectStatus(await api('/api/admin/talent/reports?page=1&pageSize=5'), 200, '超管 reports 200')

  // ── ⑥ 日志无 PII / health（AC-M9-06/09） ─────────────────────────────────────
  console.log('\n── ⑥ 日志无 PII / health ──')
  const operLogs = await api('/api/admin/log/oper?page=1&pageSize=200')
  expectStatus(operLogs, 200, '操作日志 200')
  // 排除本任务自建夹具账号名（随机后缀数字可能被 PII 正则误判），其余行必须无明文。
  const logRows = operLogs.data?.rows || []
  const businessLogRows = logRows.filter(row => !String(row.operName || '').includes('E2E 烟测账号'))
  const logScan = scanSensitive(businessLogRows)
  check(`操作日志 ${businessLogRows.length} 条无手机号/证件明文（排除夹具账号名）`, logScan.ok, logScan.violations.join(' | '))
  const health = await fetch(`${ADMIN}/api/health`)
  const healthJson = await health.json().catch(() => null)
  check('health 200 且 status=ok', health.status === 200 && healthJson?.data?.status === 'ok', `status=${health.status}`)
  const healthDeep = await fetch(`${ADMIN}/api/health?deep=1`)
  const deepJson = await healthDeep.json().catch(() => null)
  check('health?deep=1 200 且 PB up', healthDeep.status === 200 && String(deepJson?.data?.pocketbase || '').includes('up'), JSON.stringify(deepJson?.data || {}).slice(0, 120))

  // ── ⑦ H5 深链 / 协议门禁 / 登录 / 对象切换 / 双宽度（AC-APP-01/11/12/13/14） ──
  console.log('\n── ⑦ H5：深链回登录 / 协议门禁 / 对象切换 / 390·340 ──')
  const browser = await launchBrowser()
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await ctx.newPage()
    const consoleErrors = []
    page.on('pageerror', error => consoleErrors.push(String(error.message).slice(0, 90)))
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 90)) })

    await page.goto(`${H5}/#/pages/report/index`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1800)
    const gateBody = await page.locator('body').innerText()
    check('未登录深链回登录页', page.url().includes('pages/auth/login') && gateBody.includes('账号密码登录'), page.url().slice(-48))
    check('未登录不落 token', (await page.evaluate(() => Object.keys(localStorage))).every(key => !key.includes('access_token')), 'no token')

    const loginButton = await loginH5(page, clientUser.email, clientUser.password)
    await loginButton.click()
    await page.waitForTimeout(1500)
    const noAgreeToken = await page.evaluate(() => localStorage.getItem('foundation_access_token'))
    check('未勾选协议不可登录（无 token）', page.url().includes('pages/auth/login') && !noAgreeToken, `token=${Boolean(noAgreeToken)}`)
    await page.locator('.wd-checkbox').first().click()
    await page.waitForTimeout(300)
    await loginButton.click()
    await page.waitForTimeout(3000)
    const homeBody = await page.locator('body').innerText()
    const tokenStored = await page.evaluate(() => localStorage.getItem('foundation_access_token'))
    check('勾选协议后登录成功回首页', !page.url().includes('pages/auth/login') && homeBody.includes(parent.name), page.url().slice(-40))
    check('token 只在受控 localStorage key（不写 URL）', Boolean(tokenStored) && !page.url().includes('token'), 'localStorage only')

    // 对象切换：报告页 → 切换 → 选子女 → 回报告页
    await page.goto(`${H5}/#/pages/report/index`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1800)
    await page.locator('text=切换').first().click()
    await page.waitForTimeout(1500)
    check('对象切换页可打开', page.url().includes('pages/subject/picker'), page.url().slice(-40))
    const childOption = page.getByText(child.name).first()
    check('切换页列出绑定子女', (await childOption.count()) > 0, child.name.slice(0, 12))
    await childOption.click()
    await page.waitForTimeout(2200)
    const reportBody = await page.locator('body').innerText()
    check('切换后回到来源页且展示子女报告', page.url().includes('pages/report/index') && reportBody.includes(child.name) && /可读|分册/.test(reportBody), page.url().slice(-40))
    check('切换后无串号（本人仍显示暂无报告）', reportBody.includes('该对象暂无基因报告') && reportBody.includes('当前'), 'no mix')

    // 390 / 340 双宽度页面矩阵
    for (const [width, label] of [[390, '390'], [340, '340']]) {
      await page.setViewportSize({ width, height: 844 })
      for (const [path, marker] of [['home/index', '同佳'], ['report/index', '报告'], ['advice/index', '培育建议'], ['direction/index', '培养方向'], ['profile/index', '我的']]) {
        await page.goto(`${H5}/#/pages/${path}`, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(1500)
        const body = await page.locator('body').innerText()
        const overflow = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }))
        check(`${label} 宽 ${path} 无横向溢出`, overflow.scroll <= overflow.client + 2 && body.length > 0, `scroll=${overflow.scroll} client=${overflow.client}`)
        check(`${label} 宽 ${path} 内容标记存在`, body.includes(marker), body.replace(/\n/g, ' ').slice(0, 40))
      }
    }
    await page.setViewportSize({ width: 390, height: 844 })

    // 旧 H5 路由不再提供服务
    for (const legacyPath of LEGACY_H5_PAGES) {
      await page.goto(`${H5}/#/${legacyPath}`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1200)
      const body = await page.locator('body').innerText()
      const stillLegacy = LEGACY_H5_MARKERS.some(marker => body.includes(marker))
      check(`旧 H5 页已下线 ${legacyPath}`, !stillLegacy || page.url().includes('pages/home/index'), body.replace(/\n/g, ' ').slice(0, 40))
    }
    check('H5 全流程无未捕获异常/console error', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '))
    await ctx.close()
  } finally {
    await browser.close()
  }

  // 需真机/隔离环境的项显式记录未执行原因（不得 skip 冒充通过）
  skip('停用菜单后侧栏即时隐藏', '需要改菜单状态并恢复；E2E 06m/05 已覆盖 bootstrap 菜单矩阵，改停用会留历史行，隔离库执行')
  skip('真机 / 微信胶囊 / 暗色 / wxss 编译', '无真机与微信开发者工具；本机亦缺 wcsc，M7 acceptance 已登记 B8')

  // ── ⑧ 夹具删除后可访问性（解绑即时失效，AC-APP-15） ─────────────────────────
  console.log('\n── ⑧ 解绑即时失效（C 端 bindings 不再含该子女） ──')
  const unbind = await api(`/api/admin/talent/children/${child.id}/unbind`, { method: 'POST' })
  expectStatus(unbind, 200, '后台解绑子女 200')
  const bindingsAfter = await capi('/api/client/talent/bindings')
  check('解绑后 C 端 bindings 立即不含该子女', !(bindingsAfter.data?.items || []).some(item => item.id === child.id), `items=${bindingsAfter.data?.items?.length}`)
  expectStatus(await capi(`/api/client/talent/reports/${reportId}`), 404, '解绑后报告即时不可读（记录保留，归属失效）')
} catch (error) {
  check('套件执行未抛异常', false, String(error?.message || error).slice(0, 300))
} finally {
  const result = await finishSuite({ suite: SUITE, title: TITLE, startedAt })
  process.exit(result.failed ? 1 : 0)
}