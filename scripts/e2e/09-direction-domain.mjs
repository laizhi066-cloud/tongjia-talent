#!/usr/bin/env node
/**
 * @description M9 方向域验收（spec §4.4 09）：AC-ADM-03-1..4、AC-M4-01..08、BR-08/09。
 *   在自有临时方向 + 自有隔离报告上完成：7 列 / 要素 158 与 6 册数量 / 配置校验 422 /
 *   引用删除保护 409（无引用可删）/ 命中预览排序与 0 命中回退（推荐 ≤5）/ 已选 ≤3 与换档/取消幂等 /
 *   自填待归并（归并写别名、转正生成待配置方向）/ C 端方向与选择契约 / 权限正反 / 审计无 PII / 页面 7 列与配置弹层 158。
 *   所有新增方向与报告在 finally 按 id 删除；被报告引用的方向随报告删除后可清，不污染种子方向。
 * @file scripts/e2e/09-direction-domain.mjs
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
} from './lib.mjs'
import {
  createPendingReportFixture,
  fixturesEnabled,
  forgetTracked,
  seedMemberFixture,
  seedReportSubject,
  trackExisting,
} from './fixtures.mjs'

const SUITE = '09-direction-domain'
const TITLE = '方向域验收（AC-ADM-03 / AC-M4 / BR-08/09）'
const startedAt = Date.now()
assertSafeTarget({ write: true })

const logBeginTime = () => new Date(startedAt - 10_000).toISOString().slice(0, 19).replace('T', ' ')
const SEED_CODES = ['DIR-001', 'DIR-002', 'DIR-003', 'DIR-004', 'DIR-005', 'DIR-006']

async function loginAdminPage(page) {
  await page.goto(`${ADMIN}/login`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  const inputs = page.locator('input')
  await inputs.nth(0).fill(ACCOUNTS.superAdmin.identity)
  await inputs.nth(1).fill(ACCOUNTS.superAdmin.password)
  await page.locator('button:has-text("登录")').first().click()
  await page.waitForTimeout(3000)
}

/** 四键排序断言：命中数降序 → 命中率降序（整数交叉相乘）→ 配置条数降序。 */
function assertHitOrdering(items) {
  for (let index = 1; index < items.length; index += 1) {
    const prev = items[index - 1]
    const curr = items[index]
    if (Number(prev.hitCount) !== Number(curr.hitCount)) {
      if (Number(prev.hitCount) < Number(curr.hitCount)) return false
      continue
    }
    if (Number(prev.total) > 0 && Number(curr.total) > 0) {
      const rateDiff = Number(curr.hitCount) * Number(prev.total) - Number(prev.hitCount) * Number(curr.total)
      if (rateDiff > 0) return false
    }
    if (Number(prev.total) !== Number(curr.total) && Number(prev.total) < Number(curr.total)) return false
  }
  return true
}

try {
  if (!fixturesEnabled()) throw new Error('方向域验收需要 PB 夹具（本地/隔离实例）')
  const token = await adminLogin()
  const api = makeApi(token)
  const tiers = (await api('/api/admin/talent/tiers?page=1&pageSize=10')).data?.rows || []
  check('目标档位可读（≥3 个启用档位）', tiers.length >= 3, `tiers=${tiers.length}`)
  const tierIds = tiers.map(tier => tier.id)

  // ── ① 方向列表 7 列 / 筛选（AC-ADM-03-1、BR-13） ───────────────────────────────
  console.log('\n── ① 方向列表：7 列 / 筛选 ──')
  const list = await api('/api/admin/talent/directions?page=1&pageSize=20')
  expectStatus(list, 200, '方向列表 200')
  const seedDirections = (list.data?.rows || []).filter(row => SEED_CODES.includes(row.code))
  check('种子方向 6 条且均启用', seedDirections.length === 6 && seedDirections.every(row => row.status === '1'), `rows=${seedDirections.length}`)
  const COLUMN_FIELDS = ['code', 'name', 'requirements', 'requirementNames', 'tiers', 'defaultTierName', 'status']
  check('方向行含 7 列数据字段', seedDirections.length > 0 && seedDirections.every(row => COLUMN_FIELDS.every(key => row[key] !== undefined)), `缺字段=${seedDirections.filter(row => COLUMN_FIELDS.some(key => row[key] === undefined)).length}`)
  check('关联要素与要求分级已解析名称', seedDirections.every(row => (row.requirementNames || []).length === (row.requirements || []).length && (row.requirementNames || []).every(item => Boolean(item.factorName) && Boolean(item.levelName))), 'requirementNames')
  check('启用档位与默认档位已解析', seedDirections.every(row => (row.tiers || []).length === (row.tierIds || []).length && Boolean(row.defaultTierName)), 'tiers')
  const byCode = await api('/api/admin/talent/directions?page=1&pageSize=20&code=DIR-001')
  check('方向编码筛选命中', byCode.data?.total === 1 && byCode.data?.rows?.[0]?.code === 'DIR-001', `total=${byCode.data?.total}`)
  const byName = await api(`/api/admin/talent/directions?page=1&pageSize=20&name=${encodeURIComponent('舞蹈')}`)
  check('方向名称模糊筛选命中', Number(byName.data?.total) >= 1, `total=${byName.data?.total}`)
  const enabledOnly = await api('/api/admin/talent/directions?page=1&pageSize=100&status=1')
  check('状态筛选只返回启用方向', (enabledOnly.data?.rows || []).every(row => row.status === '1'), `total=${enabledOnly.data?.total}`)
  const disabledOnly = await api('/api/admin/talent/directions?page=1&pageSize=100&status=0')
  check('状态=停用当前 0 条', disabledOnly.data?.total === 0, `total=${disabledOnly.data?.total}`)

  // ── ② 要素 158 / 6 分册 / 12 槽位（AC-ADM-03-2、AC-ADM-04-1） ────────────────
  console.log('\n── ② 要素 158 项 / 6 分册 / 12 槽位 ──')
  const libraries = await api('/api/admin/talent/factor-libraries?page=1&pageSize=10')
  expectStatus(libraries, 200, '要素文库 200')
  const library = (libraries.data?.rows || [])[0]
  check('要素文库存档 158 项 / 12 槽位（1896）', Number(library?.itemCount) === 158 && Number(library?.slotTotal) === 1896, `itemCount=${library?.itemCount} slotTotal=${library?.slotTotal}`)
  const factorsPage1 = await api(`/api/admin/talent/factors?libraryId=${library.id}&page=1&pageSize=100`)
  expectStatus(factorsPage1, 200, '要素列表 200')
  check('要素总数 158', factorsPage1.data?.total === 158, `total=${factorsPage1.data?.total}`)
  const expectedCategoryCounts = { A: 26, B: 39, C: 27, D: 25, E: 18, F: 23 }
  check('A–F 分册数量 26/39/27/25/18/23', JSON.stringify(factorsPage1.data?.categoryCounts) === JSON.stringify(expectedCategoryCounts), JSON.stringify(factorsPage1.data?.categoryCounts))
  check('每页上限 100（158 需两页）', factorsPage1.data?.rows?.length === 100 && Number(factorsPage1.data?.pageSize) === 100, `rows=${factorsPage1.data?.rows?.length}`)
  const factorsPage2 = await api(`/api/admin/talent/factors?libraryId=${library.id}&page=2&pageSize=100`)
  check('第二页返回剩余 58 项', factorsPage2.data?.rows?.length === 58, `rows=${factorsPage2.data?.rows?.length}`)
  expectStatus(await api('/api/admin/talent/factors?page=1&pageSize=20'), 422, '要素列表缺 libraryId 422')
  const categoryA = await api(`/api/admin/talent/factors?libraryId=${library.id}&page=1&pageSize=100&category=A`)
  check('分册筛选 A 只返回 A 册', categoryA.data?.total === 26 && (categoryA.data?.rows || []).every(row => row.category === 'A'), `total=${categoryA.data?.total}`)

  // ── ③ 新建 / 配置校验 / 版本（AC-ADM-03-3） ────────────────────────────────────
  console.log('\n── ③ 新建方向 / 配置校验 / 版本递增 ──')
  const baseBody = { requirements: [{ code: 'A-01', level: 'LV1' }], tierIds: [tierIds[0]], defaultTierId: tierIds[0], status: '1' }
  expectStatus(await api('/api/admin/talent/directions', { method: 'POST', body: { ...baseBody, name: '烟测非法方向', requirements: [] } }), 422, '缺要素 422')
  expectStatus(await api('/api/admin/talent/directions', { method: 'POST', body: { ...baseBody, name: '烟测非法方向', requirements: [{ code: 'Z-99', level: 'LV1' }] } }), 422, '要素编码不存在 422')
  expectStatus(await api('/api/admin/talent/directions', { method: 'POST', body: { ...baseBody, name: '烟测非法方向', defaultTierId: tierIds[1], tierIds: [tierIds[0]] } }), 422, '默认档位不在启用档位 422')
  expectStatus(await api('/api/admin/talent/directions', { method: 'POST', body: { ...baseBody, name: '烟测非法方向', requirements: [{ code: 'A-01', level: 'LV9' }] } }), 422, '非法要求分级 422')
  const created1 = await api('/api/admin/talent/directions', {
    method: 'POST',
    body: { name: `烟测方向A${RUN_TAG()}`, requirements: [{ code: 'A-01', level: 'LV1' }, { code: 'A-02', level: 'LV2' }], tierIds: [tierIds[0], tierIds[1]], defaultTierId: tierIds[0], status: '1' },
  })
  expectStatus(created1, 200, '新建方向 200')
  const direction1 = created1.data || {}
  await trackExisting('talent_directions', direction1.id)
  check('新建方向编码 DIR-nnn 且版本 1', /^DIR-\d{3,}$/.test(String(direction1.code)) && Number(direction1.version) === 1, `code=${direction1.code} v=${direction1.version}`)
  check('新建方向要素 / 档位落库', (direction1.requirements || []).length === 2 && (direction1.tierIds || []).length === 2, `req=${direction1.requirements?.length} tiers=${direction1.tierIds?.length}`)
  const created2 = await api('/api/admin/talent/directions', {
    method: 'POST',
    body: { name: `烟测方向B${RUN_TAG()}`, requirements: [{ code: 'A-02', level: 'LV1' }], tierIds: [tierIds[0]], defaultTierId: tierIds[0], status: '1' },
  })
  expectStatus(created2, 200, '新建第二个方向 200')
  const direction2 = created2.data || {}
  await trackExisting('talent_directions', direction2.id)
  const update1 = await api(`/api/admin/talent/directions/${direction1.id}`, { method: 'PUT', body: { description: 'E2E 09 烟测描述' } })
  expectStatus(update1, 200, '保存方向配置 200')
  check('保存配置后版本 +1', Number(update1.data?.version) === 2 && update1.data?.description === 'E2E 09 烟测描述', `v=${update1.data?.version}`)
  expectStatus(await api(`/api/admin/talent/directions/${direction1.id}`, { method: 'PUT', body: { code: 'DIR-999' } }), 422, '方向编码不可修改 422')
  const detail1 = await api(`/api/admin/talent/directions/${direction1.id}`)
  check('方向详情解析要素名称与档位名', (detail1.data?.requirementNames || []).length === 2 && (detail1.data?.tiers || []).length === 2 && Boolean(detail1.data?.defaultTierName), `reqNames=${detail1.data?.requirementNames?.length}`)

  // ── ④ 隔离报告（含新方向快照）+ 命中预览排序（AC-M4-01/06、BR-08） ─────────────
  console.log('\n── ④ 命中预览：命中排序 / 推荐 ≤5 ──')
  const fixture = await seedReportSubject(api, { suite: '09', withClientUser: true })
  const reportId = fixture.reportId
  const publish = await api(`/api/admin/talent/reports/${reportId}/publish`, { method: 'POST', body: { openVolumeIds: ['V1'] } })
  expectStatus(publish, 200, '发布隔离报告 200')
  const preview = await api(`/api/admin/talent/directions/preview?reportId=${reportId}`)
  expectStatus(preview, 200, '方向命中预览 200')
  const previewData = preview.data || {}
  check('预览评估全部方向（8 个）', Number(previewData.totalDirections) === 8 && Number(previewData.evaluatedDirections) === 8, `total=${previewData.totalDirections} evaluated=${previewData.evaluatedDirections}`)
  check('预览给出每个方向的命中明细', (previewData.hits || []).length === 8, `hits=${previewData.hits?.length}`)
  check('推荐不超过 5 条', (previewData.recommendation?.items || []).length <= 5, `items=${previewData.recommendation?.items?.length}`)
  check('推荐按四键排序（命中数→命中率→配置条数）', assertHitOrdering(previewData.recommendation?.items || []), (previewData.recommendation?.items || []).map(item => `${item.code}:${item.hitCount}/${item.total}`).join(','))
  const orderedIds = (previewData.recommendation?.items || []).map(item => item.directionId)
  const previewAgain = await api(`/api/admin/talent/directions/preview?reportId=${reportId}`)
  const orderedAgain = (previewAgain.data?.recommendation?.items || []).map(item => item.directionId)
  check('命中排序稳定（两次请求顺序一致，四键全序）', orderedIds.length > 0 && JSON.stringify(orderedIds) === JSON.stringify(orderedAgain), orderedIds.join(','))
  check('新方向进入冻结快照并参与命中', (previewData.hits || []).some(hit => hit.directionId === direction1.id), 'direction1 in hits')
  check('命中方向含要求明细（met/gap）', (previewData.hits || []).every(hit => (hit.requirements || []).length === Number(hit.total)), 'requirements')

  // 0 命中回退：另建未知要素编码的报告（不命中任何方向）
  const zeroMember = await seedMemberFixture(api, { suite: '09z' })
  const zeroReport = await createPendingReportFixture({
    suite: '09z',
    parentId: zeroMember.parent.id,
    childId: zeroMember.children[0].id,
    books: ['A'],
    sectionCodes: ['Z-01', 'Z-02'],
  })
  const zeroPublish = await api(`/api/admin/talent/reports/${zeroReport.reportId}/publish`, { method: 'POST', body: { openVolumeIds: ['V1'] } })
  expectStatus(zeroPublish, 200, '0 命中隔离报告发布 200')
  const zeroPreview = await api(`/api/admin/talent/directions/preview?reportId=${zeroReport.reportId}`)
  const zeroRec = zeroPreview.data?.recommendation || {}
  check('0 命中回退：fallback=true 且无方向命中', zeroRec.fallback === true && (zeroRec.items || []).every(item => Number(item.hitCount) === 0), JSON.stringify({ fallback: zeroRec.fallback, items: zeroRec.items?.length }))
  check('0 命中回退列全部（截断 5）并标 fallback', (zeroRec.items || []).length === 5 && (zeroRec.items || []).every(item => item.fallback === true), `items=${zeroRec.items?.length} recommendLimit=${zeroRec.recommendLimit}`)
  check('0 命中时 noDirections=false（方向已配置）', zeroPreview.data?.noDirections === false, `noDirections=${zeroPreview.data?.noDirections}`)
  expectStatus(await api('/api/admin/talent/directions/preview?reportId=notexist123'), 404, '不存在报告的方向预览 404')

  // ── ⑤ 已选 ≤3 / 换档 / 取消 / 引用删除保护（AC-M4-02/03/05、AC-ADM-03-4） ─────
  console.log('\n── ⑤ 已选 ≤3 / 换档 / 取消 / 删除保护 ──')
  const select = body => api(`/api/admin/talent/reports/${reportId}/selection`, { method: 'POST', body })
  const selectD1 = await select({ action: 'select', directionId: direction1.id, tierId: tierIds[0] })
  expectStatus(selectD1, 200, '选择方向 200')
  check('选择后数量 1 且返回展示名/档位名', selectD1.data?.selectionCount === 1 && selectD1.data?.selection?.directionName === direction1.name && Boolean(selectD1.data?.selection?.tierName), JSON.stringify({ count: selectD1.data?.selectionCount }))
  const selectRepeat = await select({ action: 'select', directionId: direction1.id, tierId: tierIds[0] })
  check('重复选择幂等（alreadySelected / changed=false）', selectRepeat.status === 200 && selectRepeat.data?.alreadySelected === true && selectRepeat.data?.changed === false, `changed=${selectRepeat.data?.changed}`)
  const seedA = seedDirections[0]
  const seedB = seedDirections[1]
  const seedC = seedDirections[2]
  expectStatus(await select({ action: 'select', directionId: seedA.id, tierId: seedA.tierIds[0] }), 200, '选择第 2 个方向 200')
  expectStatus(await select({ action: 'select', directionId: seedB.id, tierId: seedB.tierIds[0] }), 200, '选择第 3 个方向 200')
  const fourth = await select({ action: 'select', directionId: seedC.id, tierId: seedC.tierIds[0] })
  check('第 4 个选择被拦截（上限 3）', fourth.status === 409 && String(fourth.message || '').includes('最多可选择 3'), `status=${fourth.status} code=${fourth.data?.code || fourth.code}`)
  const changeTier = await select({ action: 'changeTier', directionId: seedA.id, tierId: seedA.tierIds[1] || tierIds[1] })
  expectStatus(changeTier, 200, '换档 200')
  check('换档 changed=true 且档位名更新', changeTier.data?.changed === true && changeTier.data?.selection?.tierId === (seedA.tierIds[1] || tierIds[1]), `tier=${changeTier.data?.selection?.tierName}`)
  const changeTierSame = await select({ action: 'changeTier', directionId: seedA.id, tierId: seedA.tierIds[1] || tierIds[1] })
  check('同档位换档幂等（changed=false）', changeTierSame.status === 200 && changeTierSame.data?.changed === false, `changed=${changeTierSame.data?.changed}`)
  const cancelB = await select({ action: 'cancel', directionId: seedB.id })
  expectStatus(cancelB, 200, '取消选择 200')
  check('取消后数量减 1', cancelB.data?.selectionCount === 2 && cancelB.data?.changed === true, `count=${cancelB.data?.selectionCount}`)
  const cancelAgain = await select({ action: 'cancel', directionId: seedB.id })
  check('取消未选方向幂等（changed=false）', cancelAgain.status === 200 && cancelAgain.data?.changed === false, `changed=${cancelAgain.data?.changed}`)
  const deleteReferenced = await api(`/api/admin/talent/directions/${direction1.id}`, { method: 'DELETE' })
  check('被报告引用的方向不可删除（409）', deleteReferenced.status === 409 && String(deleteReferenced.message || '').includes('引用'), `status=${deleteReferenced.status}`)
  const freeDirection = await api('/api/admin/talent/directions', {
    method: 'POST',
    body: { name: `烟测方向C${RUN_TAG()}`, requirements: [{ code: 'A-01', level: 'LV1' }], tierIds: [tierIds[0]], defaultTierId: tierIds[0], status: '1' },
  })
  expectStatus(freeDirection, 200, '新建无引用方向 200')
  const deleteFree = await api(`/api/admin/talent/directions/${freeDirection.data.id}`, { method: 'DELETE' })
  check('无引用方向可删除（200）', deleteFree.status === 200, `status=${deleteFree.status}`)
  forgetTracked('talent_directions', freeDirection.data.id)

  // ── ⑥ 自填 / 归并 / 转正（AC-M4-02、BR-09） ───────────────────────────────────
  console.log('\n── ⑥ 自填待归并 / 归并写别名 / 转正 ──')
  const manualName = `烟测自填${RUN_TAG().slice(-4)}`
  const manualSelect = await select({ action: 'select', manualName, tierId: tierIds[0] })
  expectStatus(manualSelect, 200, '自填方向提交 200')
  check('自填占已选名额并生成待归并请求', manualSelect.data?.selectionCount === 3 && Boolean(manualSelect.data?.requestId), `count=${manualSelect.data?.selectionCount}`)
  const requests = await api('/api/admin/talent/direction-requests?page=1&pageSize=20')
  expectStatus(requests, 200, '待归并方向列表 200')
  const requestRow = (requests.data?.rows || []).find(row => row.manualName === manualName)
  check('待归并列表带报告号/家长脱敏手机号', Boolean(requestRow?.reportNo) && /^\d{3,4}\*{4}\d{4}$/.test(String(requestRow?.maskedMobile)), `masked=${requestRow?.maskedMobile}`)
  check('待归并状态=待归并', requestRow?.status === '待归并', `status=${requestRow?.status}`)
  const merged = await api(`/api/admin/talent/direction-requests/${requestRow.id}/merge`, { method: 'POST', body: { targetDirectionId: direction2.id } })
  expectStatus(merged, 200, '归并到正式方向 200')
  check('归并返回目标方向', merged.data?.direction?.id === direction2.id, `target=${merged.data?.direction?.code}`)
  const direction2Detail = await api(`/api/admin/talent/directions/${direction2.id}`)
  check('归并写入方向别名', (direction2Detail.data?.aliases || []).includes(manualName), JSON.stringify(direction2Detail.data?.aliases || []))
  const requestsAfter = await api(`/api/admin/talent/direction-requests?page=1&pageSize=20&status=${encodeURIComponent('已归并')}`)
  check('归并后请求状态=已归并', (requestsAfter.data?.rows || []).find(row => row.id === requestRow.id)?.status === '已归并', `status=${(requestsAfter.data?.rows || []).find(row => row.id === requestRow.id)?.status}`)
  // 取消自填 → 再自填一次用于转正
  const cancelManual = await select({ action: 'cancel', requestId: requestRow.id })
  expectStatus(cancelManual, 200, '取消自填选择 200')
  const manualName2 = `${manualName}转`
  const manualSelect2 = await select({ action: 'select', manualName: manualName2, tierId: tierIds[0] })
  expectStatus(manualSelect2, 200, '第二次自填提交 200')
  const requests2 = await api('/api/admin/talent/direction-requests?page=1&pageSize=20')
  const requestRow2 = (requests2.data?.rows || []).find(row => row.manualName === manualName2)
  check('第二笔待归并请求可查', Boolean(requestRow2?.id), requestRow2?.status)
  const promoted = await api(`/api/admin/talent/direction-requests/${requestRow2.id}/promote`, { method: 'POST', body: {} })
  expectStatus(promoted, 200, '转正式 200')
  const promotedDirection = promoted.data?.direction || {}
  if (promotedDirection.id) await trackExisting('talent_directions', promotedDirection.id)
  check('转正生成待配置方向（停用 + 新编码）', promotedDirection.id !== direction1.id && /^DIR-\d{3,}$/.test(String(promotedDirection.code)), `code=${promotedDirection.code} status=${promotedDirection.status}`)
  const promotedDetail = await api(`/api/admin/talent/directions/${promotedDirection.id}`)
  check('转正方向默认停用待配置', promotedDetail.data?.status === '0' && (promotedDetail.data?.requirements || []).length === 0, `status=${promotedDetail.data?.status} req=${promotedDetail.data?.requirements?.length}`)
  const requests3 = await api(`/api/admin/talent/direction-requests?page=1&pageSize=20&status=${encodeURIComponent('已转正式')}`)
  check('转正后请求状态=已转正式', (requests3.data?.rows || []).find(row => row.id === requestRow2.id)?.status === '已转正式', (requests3.data?.rows || []).find(row => row.id === requestRow2.id)?.status)

  // ── ⑦ C 端方向契约（AC-APP-09/10、BR-09） ────────────────────────────────────
  console.log('\n── ⑦ C 端方向：推荐 ≤5 / 已选 ≤3 / 换档取消 ──')
  const capi = makeClientApi(await clientLogin(fixture.clientUser.email, fixture.clientUser.password))
  // 先清空后台已选，保证 C 端从 0 开始
  const reportDetailForSel = await api(`/api/admin/talent/reports/${reportId}`)
  for (const selection of reportDetailForSel.data?.report?.selections || []) {
    await select(selection.custom
      ? { action: 'cancel', requestId: selection.requestId }
      : { action: 'cancel', directionId: selection.directionId })
  }
  const clearedSelections = await api(`/api/admin/talent/reports/${reportId}`)
  check('清空已选后 C 端起始状态为 0', (clearedSelections.data?.report?.selections || []).length === 0, `count=${(clearedSelections.data?.report?.selections || []).length}`)
  const cDirections = await capi(`/api/client/talent/directions?reportId=${reportId}`)
  expectStatus(cDirections, 200, 'C 端方向接口 200')
  check('C 端推荐 ≤5 且已选上限 3', (cDirections.data?.items || []).length <= 5 && Number(cDirections.data?.selectionLimit) === 3, `items=${cDirections.data?.items?.length} limit=${cDirections.data?.selectionLimit}`)
  check('C 端推荐排序与后台一致（命中数降序）', assertHitOrdering((cDirections.data?.items || []).map(item => ({ ...item, code: item.name }))), (cDirections.data?.items || []).map(item => `${item.name}:${item.hitCount}`).join(','))
  check('C 端自填候选按拼音升序', (() => {
    const options = (cDirections.data?.manualOptions || []).map(item => String(item.name))
    const sorted = [...options].sort((left, right) => left.localeCompare(right, 'zh-Hans-CN'))
    return options.length >= 6 && JSON.stringify(options) === JSON.stringify(sorted)
  })(), (cDirections.data?.manualOptions || []).map(item => item.name).join(','))
  check('C 端自填上限 10', Number(cDirections.data?.manualLimit) === 10, `manualLimit=${cDirections.data?.manualLimit}`)
  check('C 端方向不返回要素编码', !/[A-F]-\d{2}/.test(JSON.stringify(cDirections.data || {})), 'no factor code')
  checkNoSensitive(cDirections.data, 'C 端方向响应无 PII/密文')
  const clientSelect = body => capi('/api/client/talent/selections', { method: 'POST', body: { reportId, ...body } })
  const cSel1 = await clientSelect({ directionId: seedA.id, tierId: seedA.tierIds[0] })
  expectStatus(cSel1, 200, 'C 端选择方向 200')
  check('C 端选择返回 selectionId 与展示文案', Boolean(cSel1.data?.selection?.selectionId) && Boolean(cSel1.data?.selection?.directionName), `sid=${Boolean(cSel1.data?.selection?.selectionId)}`)
  expectStatus(await clientSelect({ directionId: seedB.id, tierId: seedB.tierIds[0] }), 200, 'C 端选择第 2 个方向 200')
  expectStatus(await clientSelect({ directionId: seedC.id, tierId: seedC.tierIds[0] }), 200, 'C 端选择第 3 个方向 200')
  const cFourth = await clientSelect({ directionId: seedDirections[3].id, tierId: seedDirections[3].tierIds[0] })
  check('C 端第 4 个选择 409 上限拦截', cFourth.status === 409 && cFourth.data?.code === 'SELECTION_LIMIT_REACHED', `status=${cFourth.status} code=${cFourth.data?.code}`)
  const selectionId = cSel1.data?.selection?.selectionId
  const changeTierClient = await capi(`/api/client/talent/selections/${selectionId}`, { method: 'PUT', body: { reportId, tierId: seedA.tierIds[1] || tierIds[1] } })
  expectStatus(changeTierClient, 200, 'C 端换档 200')
  check('C 端换档 changed=true', changeTierClient.data?.changed === true, `changed=${changeTierClient.data?.changed}`)
  const cancelSel = await capi(`/api/client/talent/selections/${selectionId}?reportId=${reportId}`, { method: 'DELETE' })
  expectStatus(cancelSel, 200, 'C 端取消选择 200')
  check('C 端取消后数量减 1', cancelSel.data?.selectionCount === 2 && cancelSel.data?.changed === true, `count=${cancelSel.data?.selectionCount}`)
  const cancelAgain2 = await capi(`/api/client/talent/selections/${selectionId}?reportId=${reportId}`, { method: 'DELETE' })
  check('C 端取消未选方向幂等', cancelAgain2.status === 200 && cancelAgain2.data?.changed === false, `changed=${cancelAgain2.data?.changed}`)
  const cManual = await clientSelect({ manualName: `烟测手填${RUN_TAG().slice(-3)}`, tierId: tierIds[0] })
  expectStatus(cManual, 200, 'C 端自填方向 200')
  check('C 端自填 custom=true 且生成 requestId', cManual.data?.selection?.custom === true && Boolean(cManual.data?.selection?.requestId), `custom=${cManual.data?.selection?.custom}`)
  const cDirectionsAfter = await capi(`/api/client/talent/directions?reportId=${reportId}`)
  check('C 端自填后已选数量含自填（共享 3 名额）', Number(cDirectionsAfter.data?.selectionCount) === 3 && (cDirectionsAfter.data?.selections || []).some(item => item.custom === true), `count=${cDirectionsAfter.data?.selectionCount}`)
  expectStatus(await capi(`/api/client/talent/directions?reportId=notexist123`), 404, '不存在的报告 C 端方向 404')

  // ── ⑧ 权限正反 ──────────────────────────────────────────────────────────────
  console.log('\n── ⑧ 方向域权限正反 ──')
  const anon = await fetch(`${ADMIN}/api/admin/talent/directions?page=1&pageSize=5`)
  check('匿名方向列表 401', anon.status === 401, `status=${anon.status}`)
  const operatorApi = makeApi(await adminLogin(ACCOUNTS.platformOperator.identity, ACCOUNTS.platformOperator.password))
  const reviewerApi = makeApi(await adminLogin(ACCOUNTS.reportReviewer.identity, ACCOUNTS.reportReviewer.password))
  const ruleApi = makeApi(await adminLogin(ACCOUNTS.ruleConfigurator.identity, ACCOUNTS.ruleConfigurator.password))
  expectStatus(await operatorApi('/api/admin/talent/directions?page=1&pageSize=5'), 200, '平台运营方向列表 200')
  expectStatus(await ruleApi('/api/admin/talent/directions?page=1&pageSize=5'), 200, '规则配置员方向列表 200')
  expectStatus(await reviewerApi('/api/admin/talent/directions?page=1&pageSize=5'), 403, '报告审核员方向列表 403')
  const createBody = { name: `权限烟测${RUN_TAG()}`, requirements: [{ code: 'A-01', level: 'LV1' }], tierIds: [tierIds[0]], defaultTierId: tierIds[0], status: '1' }
  expectStatus(await reviewerApi('/api/admin/talent/directions', { method: 'POST', body: createBody }), 403, '报告审核员新建方向 403')
  expectStatus(await operatorApi('/api/admin/talent/directions', { method: 'POST', body: { ...createBody, requirements: [] } }), 422, '平台运营新建方向缺要素 422（域内允许，参数校验生效）')
  expectStatus(await ruleApi(`/api/admin/talent/reports/${reportId}/selection`, { method: 'POST', body: { action: 'select', directionId: seedA.id, tierId: seedA.tierIds[0] } }), 403, '规则配置员选择方向 403')
  expectStatus(await reviewerApi(`/api/admin/talent/directions/${direction1.id}`, { method: 'DELETE' }), 403, '报告审核员删除方向 403')

  // ── ⑨ 审计无 PII ────────────────────────────────────────────────────────────
  console.log('\n── ⑨ 方向动作审计 ──')
  const logs = await api(`/api/admin/log/oper?page=1&pageSize=200&beginTime=${encodeURIComponent(logBeginTime())}`)
  const rowsLogs = logs.data?.rows || []
  const directionAudit = rowsLogs.filter(row => /培养方向|待归并|归并|转正式|选择/.test(String(row.title || '')))
  const titles = [...new Set(directionAudit.map(row => String(row.title).replace(/（.*$/, '')))]
  check('新建/配置/删除/选择/归并/转正均写审计', directionAudit.length >= 6 && titles.length >= 5, `rows=${directionAudit.length} titles=${titles.join('|')}`)
  const auditScan = scanSensitive(directionAudit)
  check('方向审计无手机号/证件明文', auditScan.ok, auditScan.violations.join(' | '))
  check('归并/转正审计摘要不含家长/子女姓名', directionAudit.filter(row => /归并|转正式/.test(String(row.title))).every(row => !String(row.title).includes('烟测家长') && !String(row.title).includes('烟测子')), 'summary ok')

  // ── ⑩ 页面层：7 列表头 / 配置弹层 158 / 待归并入口 ───────────────────────────
  console.log('\n── ⑩ 页面层：7 列 / 配置弹层 158 / 待归并入口 ──')
  const browser = await launchBrowser()
  try {
    const ctx = await browser.newContext({ viewport: { width: 1560, height: 960 } })
    const page = await ctx.newPage()
    const pageErrors = []
    page.on('pageerror', error => pageErrors.push(String(error.message).slice(0, 90)))
    await loginAdminPage(page)
    await page.goto(`${ADMIN}/admin/talent/rules/direction`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2600)
    const headers = (await page.locator('thead th').allInnerTexts()).map(text => text.trim())
    const EXPECTED = ['编码', '培养方向', '关联要素与要求分级', '启用档位', '默认档位', '状态', '操作']
    check('方向页表头 7 列逐列一致', JSON.stringify(headers) === JSON.stringify(EXPECTED), headers.join('|'))
    const directionTotal = Number((await api('/api/admin/talent/directions?page=1&pageSize=20')).data?.total || 0)
    const rowCount = await page.locator('tbody tr').count()
    check('方向页行数 = 方向总数（≤20）', rowCount === directionTotal && directionTotal <= 20, `rows=${rowCount} total=${directionTotal}`)
    const configButton = page.locator('tbody tr').first().locator('button:has-text("配置")')
    check('配置入口存在', (await configButton.count()) > 0)
    if (await configButton.count()) {
      await configButton.first().click()
      await page.waitForTimeout(2600)
      const modalText = await page.locator('.n-modal').first().innerText()
      check('配置弹层只列 158 项要素', modalText.includes('全部分册（158）'), modalText.includes('全部分册（158）') ? 'ok' : modalText.replace(/\n/g, ' ').slice(0, 80))
      check('配置弹层显示已选 / 上限 50', /已选 \d+ \/ 50 项/.test(modalText), (modalText.match(/已选 \d+ \/ 50 项/) || [''])[0])
      await page.keyboard.press('Escape')
      await page.waitForTimeout(600)
    }
    const requestsButton = page.locator('button:has-text("待归并")').first()
    check('待归并入口存在', (await requestsButton.count()) > 0)
    if (await requestsButton.count()) {
      await requestsButton.click()
      await page.waitForTimeout(1200)
      const requestsText = await page.locator('.n-modal').first().innerText().catch(() => '')
      check('待归并弹层可打开且含处理入口', requestsText.includes('待归并') || requestsText.includes('归并'), requestsText.replace(/\n/g, ' ').slice(0, 60))
      await page.keyboard.press('Escape')
    }
    check('方向页无未捕获前端异常', pageErrors.length === 0, pageErrors.join(' | '))
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

/** 本次运行短标签（方向名称后缀，避免与种子/并发冲突）。 */
function RUN_TAG() {
  return `E2E${String(Date.now()).slice(-6)}${Math.random().toString(16).slice(2, 4)}`
}