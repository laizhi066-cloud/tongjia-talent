#!/usr/bin/env node
/**
 * @description M9 会员域验收（spec §4.4 06）：AC-ADM-02-1..5、BR-11、M2 会员域。
 *   - 8 列 / 四筛交集与重置 / 详情 3 段（子女 / 关联报告 / 账号）；
 *   - 新建会员（家长 + 子女）、子女就地编辑（身份证留空不改）、查询状态机（查询中 → 回执 → 已查到）、
 *     解绑即时失效与幂等；
 *   - 全号查看权限（superAdmin 200 / 审核员与规则配置 403）、审计 1 条且摘要无明文；
 *   - 响应递归扫描无 `*Cipher` / `*Hash` / 明文手机号 / 明文证件；C 端 bindings 只读且无敏感字段；
 *   - 页面层：表头 8 列逐列、详情 3 页签、新建弹层可开。
 *   写入全部带 `RUN_ID` 后缀，并在 finally 用 PB 管理端按本进程创建的精确 id 删除（业务 API 无删除入口）。
 * @file scripts/e2e/06-member-domain.mjs
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
  uniqueDigits,
  waitFor,
} from './lib.mjs'
import { fixtureCount, fixturesEnabled, seedMemberFixture, trackExisting } from './fixtures.mjs'

const SUITE = '06-member-domain'
const TITLE = '会员域验收（AC-ADM-02 / BR-11 / M2）'
const startedAt = Date.now()
assertSafeTarget({ write: true })

const SEED_PARENT_NO = 'P202611160001'
const SEED_NAME = '演示家长'
const SEED_MOBILE = '13800000001'

/** 操作日志 beginTime（UTC，PB 存储格式），回退 10 秒避免边界。 */
function logBeginTime() {
  return new Date(startedAt - 10_000).toISOString().slice(0, 19).replace('T', ' ')
}

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
  if (!fixturesEnabled()) throw new Error('会员域验收需要 PB 夹具（本地/隔离实例）；remote 需 E2E_ALLOW_WRITE=1 + E2E_ALLOW_PB_FIXTURE=1')
  const token = await adminLogin()
  const api = makeApi(token)

  // ── ① 列表 8 列 / 分页 / 状态计数（AC-ADM-02-1、BR-13） ──────────────────────────
  console.log('\n── ① 会员列表：8 列 / 分页 20 / 状态计数 ──')
  const list = await api('/api/admin/talent/members?page=1&pageSize=20')
  expectStatus(list, 200, '会员列表 200')
  const rows = list.data?.rows || []
  check('列表返回 rows 数组且分页 20', Array.isArray(rows) && list.data?.pageSize === 20, `rows=${rows.length} pageSize=${list.data?.pageSize}`)
  const COLUMN_FIELDS = ['parentNo', 'name', 'maskedMobile', 'maskedIdNo', 'childCount', 'reportCount', 'status', 'statusLabel']
  const missingFieldRows = rows.filter(row => COLUMN_FIELDS.some(key => row[key] === undefined))
  check('每行含 8 列字段（一列一字段）', rows.length > 0 && missingFieldRows.length === 0, `缺字段行=${missingFieldRows.length}`)
  const seedRow = rows.find(row => row.parentNo === SEED_PARENT_NO)
  check('种子会员在列表中', Boolean(seedRow), seedRow ? `parentNo=${seedRow.parentNo}` : '未找到')
  if (seedRow) {
    check('手机号脱敏（前 4 + 后 4）', seedRow.maskedMobile === '1380****0001', `maskedMobile=${seedRow.maskedMobile}`)
    check('身份证脱敏且无明文', /^1101\*+1234$/.test(String(seedRow.maskedIdNo)) && !String(seedRow.maskedIdNo).includes('19880312'), `maskedIdNo=${seedRow.maskedIdNo}`)
    check('名下子女数 = 2', Number(seedRow.childCount) === 2, `childCount=${seedRow.childCount}`)
    // M2 spec §8：列表「关联报告」列在 M3 列表聚合接入前恒为 0（详情 counts.reports 已由 M3 提供）。
    check('关联报告列（M2 过渡读法恒 0）', Number(seedRow.reportCount) === 0, `reportCount=${seedRow.reportCount}`)
    check('账号状态标签正常', seedRow.status === '1' && seedRow.statusLabel === '正常', `status=${seedRow.status} label=${seedRow.statusLabel}`)
  }
  const capped = await api('/api/admin/talent/members?page=1&pageSize=500')
  check('每页上限 100（pageSize=500 被截断）', capped.data?.pageSize === 100, `pageSize=${capped.data?.pageSize}`)
  const counts = list.data?.statusCounts || {}
  check('状态计数之和 = 总数', Number(counts['0'] || 0) + Number(counts['1'] || 0) === Number(list.data?.total), JSON.stringify(counts))
  check('statusTotal = 列表总数', Number(list.data?.statusTotal) === Number(list.data?.total), `statusTotal=${list.data?.statusTotal} total=${list.data?.total}`)
  checkNoSensitive(list.data, '会员列表响应无密文/哈希/明文 PII')

  // ── ② 四筛交集与重置（AC-ADM-02-2） ─────────────────────────────────────────────
  console.log('\n── ② 四筛（姓名 / 手机号 / 子女姓名 / 状态）──')
  const byName = await api(`/api/admin/talent/members?page=1&pageSize=20&name=${encodeURIComponent(SEED_NAME)}`)
  check('姓名筛选命中种子家长', byName.data?.total === 1 && (byName.data?.rows || []).every(row => row.name.includes(SEED_NAME)), `total=${byName.data?.total}`)
  const byNameMiss = await api(`/api/admin/talent/members?page=1&pageSize=20&name=${encodeURIComponent('E2E不存在姓名')}`)
  check('不存在的姓名 total=0', byNameMiss.data?.total === 0, `total=${byNameMiss.data?.total}`)
  const byMobileTail = await api('/api/admin/talent/members?page=1&pageSize=20&mobile=0001')
  check('手机号后 4 位筛选命中', byMobileTail.data?.total === 1 && String(byMobileTail.data?.rows?.[0]?.maskedMobile).endsWith('0001'), `total=${byMobileTail.data?.total}`)
  const byMobileFull = await api(`/api/admin/talent/members?page=1&pageSize=20&mobile=${SEED_MOBILE}`)
  check('手机号完整 11 位筛选命中', byMobileFull.data?.total === 1, `total=${byMobileFull.data?.total}`)
  const byMobileBad = await api('/api/admin/talent/members?page=1&pageSize=20&mobile=12345')
  expectStatus(byMobileBad, 400, '手机号筛选格式错误 400（实现现状；spec 期望 422 记为缺口）')
  const byChild = await api(`/api/admin/talent/members?page=1&pageSize=20&childName=${encodeURIComponent('演示子女一')}`)
  check('子女姓名筛选命中', byChild.data?.total === 1 && Number(byChild.data?.rows?.[0]?.childCount) === 2, `total=${byChild.data?.total}`)
  const byChildMiss = await api(`/api/admin/talent/members?page=1&pageSize=20&childName=${encodeURIComponent('E2E不存在子女')}`)
  check('不存在的子女姓名 total=0', byChildMiss.data?.total === 0, `total=${byChildMiss.data?.total}`)
  const byStatus1 = await api('/api/admin/talent/members?page=1&pageSize=20&status=1')
  check('状态=正常 条数 = statusCounts.1', byStatus1.data?.total === Number(counts['1'] || 0), `total=${byStatus1.data?.total} counts1=${counts['1']}`)
  const byStatus0 = await api('/api/admin/talent/members?page=1&pageSize=20&status=0')
  check('状态=停用 条数 = statusCounts.0', byStatus0.data?.total === Number(counts['0'] || 0), `total=${byStatus0.data?.total} counts0=${counts['0']}`)
  const byStatusBad = await api('/api/admin/talent/members?page=1&pageSize=20&status=9')
  expectStatus(byStatusBad, 400, '非法状态参数 400')
  const andFilter = await api(`/api/admin/talent/members?page=1&pageSize=20&name=${encodeURIComponent(SEED_NAME)}&mobile=0001&childName=${encodeURIComponent('演示子女一')}&status=1`)
  check('四筛交集命中种子家长', andFilter.data?.total === 1, `total=${andFilter.data?.total}`)
  const reset = await api('/api/admin/talent/members?page=1&pageSize=20')
  check('重置筛选恢复全量', reset.data?.total === list.data?.total, `reset=${reset.data?.total} all=${list.data?.total}`)

  // ── ③ 详情 3 段（AC-ADM-02-1/3） ────────────────────────────────────────────────
  console.log('\n── ③ 会员详情：家长 + 子女 + 账号 ──')
  const seedDetail = await api(`/api/admin/talent/members/${seedRow?.id || ''}`)
  expectStatus(seedDetail, 200, '种子会员详情 200')
  const detail = seedDetail.data || {}
  check('详情含 parent/children/counts/account 四段', Boolean(detail.parent && Array.isArray(detail.children) && detail.counts && detail.account), Object.keys(detail).join(','))
  check('详情 counts.children=2 / counts.reports=2', Number(detail.counts?.children) === 2 && Number(detail.counts?.reports) === 2, JSON.stringify(detail.counts))
  check('详情账号已绑定', detail.account?.bound === true, JSON.stringify(detail.account?.account || ''))
  const childNames = (detail.children || []).map(child => child.name)
  check('详情列出 2 名子女（演示子女一/二）', childNames.includes('演示子女一') && childNames.includes('演示子女二'), childNames.join(','))
  const queryStates = (detail.children || []).map(child => child.query).sort()
  check('查询状态含 found 与 not_found 两态', queryStates.includes('found') && queryStates.includes('not_found'), queryStates.join(','))
  const foundChild = (detail.children || []).find(child => child.query === 'found')
  check('found 子女 queryLabel 已查到', foundChild?.queryLabel === '已查到', String(foundChild?.queryLabel || ''))
  const mismatchChild = (detail.children || []).find(child => child.query === 'not_found')
  check('not_found 子女带归因原因', Boolean(mismatchChild?.queryReason) && Boolean(mismatchChild?.queryReasonLabel), `${mismatchChild?.queryReason || ''}`)
  check('详情不含密文/哈希/明文 PII', checkNoSensitive(detail, '会员详情响应无密文/哈希/明文'))
  const notFoundDetail = await api('/api/admin/talent/members/notexist123456')
  expectStatus(notFoundDetail, 404, '不存在的会员详情 404')

  // ── ④ 新建 / 子女编辑 / 查询状态机 / 解绑（AC-ADM-02-3/4/5、BR-11） ─────────────
  console.log('\n── ④ 新建会员 + 子女编辑 + 查询状态 + 解绑 ──')
  const fixture = await seedMemberFixture(api, { suite: '06', withParentIdNo: true })
  const parentId = fixture.parent.id
  const firstChild = fixture.children[0]
  check('新建会员返回家长编号（P+12 位）', /^P\d{12}$/.test(String(fixture.parent.parentNo || '')), `parentNo=${fixture.parent.parentNo}`)
  check('新建会员返回 1 名子女且已发起查询', fixture.children.length === 1 && fixture.queries?.[0]?.accepted === true, JSON.stringify(fixture.queries?.[0] || {}))
  check('新建子女初始状态为查询中', fixture.children?.[0]?.query === 'querying', `query=${fixture.children?.[0]?.query}`)
  const badMobile = await api('/api/admin/talent/members', { method: 'POST', body: { name: 'E2E非法', mobile: '123', children: [] } })
  expectStatus(badMobile, 422, '非法手机号 / 空子女 422')
  const badIdNo = await api('/api/admin/talent/members', {
    method: 'POST',
    body: { name: 'E2E非法', mobile: `136${Date.now().toString().slice(-8)}`, children: [{ name: 'E2E子', gender: 'male', birthday: '2018-04-09', relation: 'mother', idNo: '11010120180409123' }] },
  })
  expectStatus(badIdNo, 422, '17 位身份证 422')
  const mismatchBirthday = await api('/api/admin/talent/members', {
    method: 'POST',
    body: { name: 'E2E非法', mobile: `135${Date.now().toString().slice(-8)}`, children: [{ name: 'E2E子', gender: 'male', birthday: '2018-04-10', relation: 'mother', idNo: '110101201804091234' }] },
  })
  expectStatus(mismatchBirthday, 422, '身份证生日与填写生日不一致 422（BR-11）')

  const settled = await waitFor(async () => {
    const current = await api(`/api/admin/talent/members/${parentId}`)
    const child = (current.data?.children || []).find(item => item.id === firstChild.id)
    return child && child.query !== 'querying' ? child : null
  }, { timeoutMs: 10_000 })
  check('查询状态机：查询中 → 回执就绪', Boolean(settled), settled ? `query=${settled.query} label=${settled.queryLabel}` : '10s 未就绪')
  check('Mock 回执结果已查到', settled?.query === 'found', `query=${settled?.query || ''}`)

  const childTail = uniqueDigits(4)
  const secondBirthday = '2020-07-15'
  const addChild = await api(`/api/admin/talent/members/${parentId}/children`, {
    method: 'POST',
    body: { name: `烟测子二${fixture.tag}`.slice(0, 50), gender: 'male', birthday: secondBirthday, relation: 'mother', idNo: `11010120200715${childTail}` },
  })
  expectStatus(addChild, 200, '新增子女 200')
  const secondChildId = addChild.data?.child?.id
  if (secondChildId) await trackExisting('talent_children', secondChildId)
  check('新增子女后进入查询中', addChild.data?.child?.query === 'querying', `query=${addChild.data?.child?.query}`)

  const maskedBefore = settled?.maskedIdNo
  const editChild = await api(`/api/admin/talent/children/${firstChild.id}`, { method: 'PUT', body: { name: `烟测子一改${fixture.tag}`.slice(0, 50), idNo: '' } })
  expectStatus(editChild, 200, '子女编辑（身份证留空不改）200')
  const afterEditDetail = await api(`/api/admin/talent/members/${parentId}`)
  const editedChild = (afterEditDetail.data?.children || []).find(item => item.id === firstChild.id)
  check('编辑后姓名已保存（就地编辑）', String(editedChild?.name || '').includes('改'), `name=${editedChild?.name || ''}`)
  check('身份证留空不改：密文脱敏值不变', Boolean(maskedBefore) && editedChild?.maskedIdNo === maskedBefore, `before=${maskedBefore} after=${editedChild?.maskedIdNo}`)
  const editMismatch = await api(`/api/admin/talent/children/${firstChild.id}`, { method: 'PUT', body: { idNo: `11010120190521${uniqueDigits(4)}`, birthday: '2019-05-22' } })
  expectStatus(editMismatch, 422, '子女身份证生日不一致 422')
  const throttled = await api(`/api/admin/talent/children/${firstChild.id}/query`, { method: 'POST' })
  expectStatus(throttled, 200, '30s 内重复查询幂等 200')
  check('重复查询不重复发起（throttled=true）', throttled.data?.throttled === true && throttled.data?.accepted === false, JSON.stringify(throttled.data))
  const queryMissing = await api('/api/admin/talent/children/notexist123/query', { method: 'POST' })
  expectStatus(queryMissing, 404, '不存在子女重新查询 404')

  const unbind = await api(`/api/admin/talent/children/${firstChild.id}/unbind`, { method: 'POST' })
  expectStatus(unbind, 200, '解绑子女 200')
  check('解绑后子女状态=已解绑', unbind.data?.child?.status === '2' && unbind.data?.child?.statusLabel === '已解绑', JSON.stringify({ status: unbind.data?.child?.status, label: unbind.data?.child?.statusLabel }))
  const afterUnbind = await api(`/api/admin/talent/members/${parentId}`)
  check('解绑后详情不再含该子女', !(afterUnbind.data?.children || []).some(item => item.id === firstChild.id), `children=${(afterUnbind.data?.children || []).length}`)
  const unbindAgain = await api(`/api/admin/talent/children/${firstChild.id}/unbind`, { method: 'POST' })
  check('重复解绑幂等（alreadyUnbound=true）', unbindAgain.status === 200 && unbindAgain.data?.alreadyUnbound === true, `status=${unbindAgain.status}`)
  const unbindMissing = await api('/api/admin/talent/children/notexist123/unbind', { method: 'POST' })
  expectStatus(unbindMissing, 404, '不存在子女解绑 404')

  const disable = await api(`/api/admin/talent/members/${parentId}/status`, { method: 'PUT', body: { status: '0' } })
  expectStatus(disable, 200, '停用会员 200')
  const afterDisable = await api(`/api/admin/talent/members/${parentId}`)
  check('停用后家长状态=停用', afterDisable.data?.parent?.status === '0', `status=${afterDisable.data?.parent?.status}`)
  const enable = await api(`/api/admin/talent/members/${parentId}/status`, { method: 'PUT', body: { status: '1' } })
  expectStatus(enable, 200, '启用会员 200')
  const badStatus = await api(`/api/admin/talent/members/${parentId}/status`, { method: 'PUT', body: { status: 'x' } })
  expectStatus(badStatus, 422, '非法状态值 422')

  // ── ⑤ 全号权限 / 审计日志（BR-11、AC-ADM-08-2） ────────────────────────────────
  console.log('\n── ⑤ 证件全号：权限 + 审计 + 无明文日志 ──')
  const idNoRes = await api(`/api/admin/talent/members/${parentId}/id-no`)
  expectStatus(idNoRes, 200, 'superAdmin 查看证件全号 200')
  const fullIdNo = String(idNoRes.data?.idNo || '')
  check('全号接口返回 18 位单项', /^\d{17}[\dXx]$/.test(fullIdNo) && Object.keys(idNoRes.data || {}).length <= 4, `len=${fullIdNo.length} keys=${Object.keys(idNoRes.data || {}).join(',')}`)
  const reviewerApi = makeApi(await adminLogin(ACCOUNTS.reportReviewer.identity, ACCOUNTS.reportReviewer.password))
  expectStatus(await reviewerApi(`/api/admin/talent/members/${parentId}/id-no`), 403, '报告审核员查看全号 403')
  const ruleApi = makeApi(await adminLogin(ACCOUNTS.ruleConfigurator.identity, ACCOUNTS.ruleConfigurator.password))
  expectStatus(await ruleApi(`/api/admin/talent/members/${parentId}/id-no`), 403, '规则配置员查看全号 403')
  const anonIdNo = await fetch(`${ADMIN}/api/admin/talent/members/${parentId}/id-no`)
  check('匿名查看全号 401', anonIdNo.status === 401, `status=${anonIdNo.status}`)

  const logs = await api(`/api/admin/log/oper?page=1&pageSize=100&title=${encodeURIComponent('查看会员证件')}&beginTime=${encodeURIComponent(logBeginTime())}`)
  expectStatus(logs, 200, '操作日志可检索')
  const logRows = (logs.data?.rows || []).filter(row => String(row.title || '').includes(`家长 ${fixture.parent.parentNo}`))
  const successRows = logRows.filter(row => Number(row.status) === 0)
  const failedRows = logRows.filter(row => Number(row.status) !== 0)
  check('全号查看成功审计恰好 1 条', successRows.length === 1, `rows=${logRows.length} success=${successRows.length}`)
  check('无权限请求不产生成功/失败审计', failedRows.length === 0, `failed=${failedRows.length}`)
  const logScan = checkNoSensitive(logRows, '审计日志无手机号/证件明文')
  check('审计摘要仅业务编号', successRows.every(row => !String(row.jsonResult || '').match(/\d{11}|\d{18}/)), logScan ? 'ok' : 'scan-failed')

  // ── ⑥ C 端 bindings 只读（BR-11、AC-APP-15） ──────────────────────────────────
  console.log('\n── ⑥ C 端 bindings：只读 + 无敏感字段 ──')
  const clientToken = await clientLogin(ACCOUNTS.clientIdentity, process.env.PLATFORM_OPERATOR_PASSWORD || ACCOUNTS.platformOperator.password)
  const capi = makeClientApi(clientToken)
  const bindings1 = await capi('/api/client/talent/bindings')
  expectStatus(bindings1, 200, 'C 端 bindings 200')
  check('bindings 返回本人 + 已绑子女', Array.isArray(bindings1.data?.items) && bindings1.data.items.length >= 2, `items=${bindings1.data?.items?.length}`)
  const bindings2 = await capi('/api/client/talent/bindings')
  const ids1 = (bindings1.data?.items || []).map(item => item.id).join(',')
  const ids2 = (bindings2.data?.items || []).map(item => item.id).join(',')
  check('bindings GET 只读（两次对象一致）', ids1 === ids2 && Boolean(ids1), `ids=${ids1.split(',').length}`)
  check('bindings 只返回脱敏身份证', (bindings1.data?.items || []).every(item => !item.idNo && (item.maskedIdNo === undefined || /^[\d*]+$/.test(item.maskedIdNo))), 'keys=' + Object.keys(bindings1.data?.items?.[0] || {}).join(','))
  checkNoSensitive(bindings1.data, 'bindings 响应无密文/哈希/明文 PII')
  const anonBindings = await fetch(`${ADMIN}/api/client/talent/bindings`)
  check('匿名 bindings 401', anonBindings.status === 401, `status=${anonBindings.status}`)
  const claim = await capi('/api/client/talent/bindings/claim', { method: 'POST' })
  expectStatus(claim, 200, 'bindings claim 200')
  const claimStatus = String(claim.data?.claim?.status || '')
  check('claim 结果为无副作用状态', ['already_bound', 'no_phone', 'no_match'].includes(claimStatus), `claim=${claimStatus}`)

  // ── ⑦ 页面层：8 列表头 + 详情 3 页签 + 新建弹层 ────────────────────────────────
  console.log('\n── ⑦ 页面层：表头 8 列 / 详情 3 页签 / 新建弹层 ──')
  const browser = await launchBrowser()
  try {
    const ctx = await browser.newContext({ viewport: { width: 1500, height: 940 } })
    const page = await ctx.newPage()
    const pageErrors = []
    page.on('pageerror', error => pageErrors.push(String(error.message).slice(0, 90)))
    await loginAdminPage(page)
    await page.goto(`${ADMIN}/admin/talent/member`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)
    const headers = (await page.locator('thead th').allInnerTexts()).map(text => text.trim())
    const EXPECTED_HEADERS = ['会员编号', '家长', '手机号', '家长身份证', '名下子女', '关联报告', '账号状态', '操作']
    check('页面表头 8 列逐列一致', JSON.stringify(headers) === JSON.stringify(EXPECTED_HEADERS), headers.join('|'))
    const firstNameLink = page.locator('tbody tr').first().locator('.link-button').first()
    check('列表存在家长详情入口', (await firstNameLink.count()) > 0)
    if (await firstNameLink.count()) {
      await firstNameLink.click()
      await page.waitForTimeout(1500)
      const tabs = (await page.locator('.n-tabs-tab').allInnerTexts()).map(text => text.trim())
      check('会员详情 3 页签', tabs.length === 3 && tabs[0].includes('名下子女') && tabs[1].includes('关联报告') && tabs[2].includes('账号资料'), tabs.join('|'))
      await page.locator('.n-tabs-tab').nth(2).click()
      await page.waitForTimeout(600)
      const accountPanel = await page.locator('.n-modal').first().innerText()
      check('账号资料页签可切换且有内容', accountPanel.includes('账号') || accountPanel.includes('绑定'), accountPanel.replace(/\n/g, ' ').slice(0, 60))
      check('详情弹层无密文/证件明文', !/mobileCipher|idNoCipher|idNoHash/.test(accountPanel) && !/\b\d{17}[\dXx]\b/.test(accountPanel), 'ok')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(400)
    }
    const createButton = page.locator('button:has-text("新建会员")').first()
    check('新建会员入口存在', (await createButton.count()) > 0)
    if (await createButton.count()) {
      await createButton.click()
      await page.waitForTimeout(1000)
      const modalText = await page.locator('.n-modal').first().innerText()
      check('新建弹层含家长与子女字段', modalText.includes('家长姓名') && modalText.includes('手机号') && modalText.includes('添加子女'), modalText.replace(/\n/g, ' ').slice(0, 80))
      await page.keyboard.press('Escape')
    }
    check('会员页无未捕获前端异常', pageErrors.length === 0, pageErrors.join(' | '))
    await ctx.close()
  } finally {
    await browser.close()
  }

  console.log(`\n夹具记录：${fixtureCount()} 条（收尾按 id 删除）`)
} catch (error) {
  check('套件执行未抛异常', false, String(error?.message || error).slice(0, 300))
} finally {
  const result = await finishSuite({ suite: SUITE, title: TITLE, startedAt })
  process.exit(result.failed ? 1 : 0)
}