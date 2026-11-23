/**
 * @description E2E 夹具（fixtures）：用 PocketBase 管理端 REST 创建/删除**本进程自己创建**的隔离数据，
 *   给报告域 / 方向域 / C 端权限套件提供可发布、可撤回、可删除的临时对象。
 *   安全约束（与 spec §4.2 / 任务硬约束一致）：
 *   1. 默认只允许本地/隔离实例；`E2E_TARGET=remote` 需同时 `E2E_ALLOW_WRITE=1` 与
 *      `E2E_ALLOW_PB_FIXTURE=1`，且 staging 主机白名单由 `lib.assertSafeTarget()` 校验；
 *   2. 只删除本进程 create 返回并登记过的 id（`tracked`），不接受外部 id；
 *   3. 所有名称/编号带 `runId()` 后缀；不读取、不打印任何口令；不触碰种子数据的既有记录；
 *   4. 生产域名硬拒绝（沿用 lib 的 `assertSafeTarget`）。
 *   说明：报告/建议在业务 API 中没有删除入口，验收若直接改种子报告只能「发布前快照 + 跑后恢复」；
 *   本夹具让 07/09 在**自有临时对象**上完成发布/撤回/补发/选择，结束后按 id 删除，不污染种子。
 * @file scripts/e2e/fixtures.mjs
 */
import { pbEnv } from '../_pb.mjs'
import { ADMIN, RUN_ID, assertSafeTarget, registerCleanup, runId, fixtureMobile, uniqueDigits } from './lib.mjs'

/** 已创建记录（按创建顺序），清理时逆序删除。 */
const tracked = []
let cleanupRegistered = false
let authPromise = null

/** 夹具开关：本地默认开启；remote 必须显式两个开关。 */
export function fixturesEnabled() {
  if (process.env.E2E_ENABLE_PB_FIXTURE === '0') return false
  if (process.env.E2E_TARGET !== 'remote') return true
  return process.env.E2E_ALLOW_WRITE === '1' && process.env.E2E_ALLOW_PB_FIXTURE === '1'
}

function ensureFixtureAllowed() {
  if (!fixturesEnabled())
    throw new Error('PB 夹具被禁用（remote 需 E2E_ALLOW_WRITE=1 且 E2E_ALLOW_PB_FIXTURE=1）')
  assertSafeTarget({ write: true })
  const pb = pbEnv()
  const adminHost = new URL(ADMIN).hostname
  const pbHost = new URL(pb.PB_URL).hostname
  if (adminHost !== pbHost)
    throw new Error(`PB 夹具拒绝：ADMIN_ORIGIN(${adminHost}) 与 POCKETBASE_URL(${pbHost}) 不是同一实例`)
  return pb
}

function track(collection, id) {
  if (!id) throw new Error(`PB 夹具：${collection} 创建未返回 id`)
  tracked.push({ collection, id })
  if (!cleanupRegistered) {
    cleanupRegistered = true
    registerCleanup('PB 夹具记录删除', cleanupFixtures)
  }
  return id
}

/** 已创建的夹具 id 数（证据/断言用）。 */
export function fixtureCount() {
  return tracked.length
}

async function pbAuthToken() {
  if (!authPromise) {
    authPromise = (async () => {
      const { PB_URL, EMAIL, PASS } = ensureFixtureAllowed()
      const res = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: EMAIL, password: PASS }),
      })
      const body = await res.json().catch(() => null)
      if (!body?.token) throw new Error(`PB 夹具认证失败：${res.status}（检查 POCKETBASE_ADMIN_EMAIL/PASSWORD）`)
      return { token: body.token, baseUrl: PB_URL }
    })()
  }
  return authPromise
}

async function pbRequest(path, { method = 'GET', body } = {}) {
  const { token, baseUrl } = await pbAuthToken()
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => null)
  if (res.status >= 400)
    throw new Error(`PB ${method} ${path} 失败：${res.status} ${json?.message || ''} ${JSON.stringify(json?.data || {}).slice(0, 120)}`)
  return json
}

/** PB 创建记录（自动登记清理）。 */
export async function pbCreate(collection, payload) {
  const record = await pbRequest(`/api/collections/${collection}/records`, { method: 'POST', body: payload })
  track(collection, record.id)
  return record
}

/** PB 读取单条记录（夹具内部用，不登记）。 */
export async function pbGet(collection, id) {
  return pbRequest(`/api/collections/${collection}/records/${id}`)
}

/** PB 更新记录（夹具内部用）。 */
export async function pbUpdate(collection, id, payload) {
  return pbRequest(`/api/collections/${collection}/records/${id}`, { method: 'PATCH', body: payload })
}

/** PB 列表查询（夹具内部用）。 */
export async function pbList(collection, filter = '') {
  const query = filter ? `?perPage=200&filter=${encodeURIComponent(filter)}` : '?perPage=200'
  const result = await pbRequest(`/api/collections/${collection}/records${query}`)
  return result?.items || []
}

/** 逆序删除本进程创建的夹具记录；先清依赖行（方向请求 / 建议书），失败重试一次。 */
export async function cleanupFixtures() {
  const failures = []
  const idsOf = collection => tracked.filter(item => item.collection === collection).map(item => item.id)
  const reportIds = idsOf('talent_reports')
  const geneIds = idsOf('talent_gene_reports')
  const parentIds = idsOf('talent_parents')

  // ① 依赖行：业务表里引用夹具对象的行必须先删（PB relation 无级联删除，会 400 阻断）。
  //    注意每张表的字段不同：引用不存在的字段会让整个 filter 400，因此按表给字段。
  const dependentCollections = [
    { collection: 'talent_direction_requests', fields: { reportId: reportIds, parentId: parentIds } },
    { collection: 'talent_advice_docs', fields: { reportId: reportIds, geneReportId: geneIds } },
    // C 端阅读进度 / PDF 渲染记录 / 发布与接收记录：都通过 relation 引用报告，必须先删。
    { collection: 'talent_reading_progress', fields: { reportId: reportIds } },
    { collection: 'talent_report_pdfs', fields: { reportId: reportIds } },
    { collection: 'talent_report_items', fields: { reportId: reportIds } },
    { collection: 'talent_report_publications', fields: { reportId: reportIds } },
    { collection: 'talent_report_receipts', fields: { reportId: reportIds } },
    // 下载留痕是 text 字段（无 relation 约束），一并清掉本次产生的行。
    { collection: 'talent_pdf_downloads', fields: { reportId: reportIds } },
  ]
  for (const { collection, fields } of dependentCollections) {
    const clauses = []
    for (const [field, ids] of Object.entries(fields)) {
      if (ids.length) clauses.push(`(${ids.map(id => `${field} = "${id}"`).join(' || ')})`)
    }
    if (!clauses.length) continue
    try {
      const records = await pbRequest(
        `/api/collections/${collection}/records?perPage=200&filter=${encodeURIComponent(clauses.join(' || '))}`,
      )
      for (const record of records?.items || []) {
        await pbRequest(`/api/collections/${collection}/records/${record.id}`, { method: 'DELETE' })
      }
    } catch { /* 集合不存在或无依赖行：忽略 */ }
  }

  // ② 逆序删除，单条失败继续；③ 失败再重试一轮。
  const removePending = async () => {
    for (let index = tracked.length - 1; index >= 0; index -= 1) {
      const { collection, id } = tracked[index]
      try {
        await pbRequest(`/api/collections/${collection}/records/${id}`, { method: 'DELETE' })
        tracked.splice(index, 1)
      } catch (error) {
        failures.push(`${collection}:${id} ${String(error?.message || error).slice(0, 100)}`)
      }
    }
  }
  await removePending()
  if (tracked.length) {
    failures.length = 0
    await removePending()
  }
  if (tracked.length)
    throw new Error(`夹具清理失败 ${tracked.length} 条：${failures.slice(0, 3).join(' | ')}`)
}

// ── 夹具工厂 ──────────────────────────────────────────────────────────────────

/**
 * 创建隔离 C 端账号（users），返回 { id, email, password }。
 * 口令为本次运行随机值，只存在内存，不写证据。
 */
export async function createFixtureUser(suite = 'e2e') {
  ensureFixtureAllowed()
  const suffix = `${runId(suite).replace(/[^0-9a-z]/gi, '').toLowerCase().slice(-12)}${Math.random().toString(16).slice(2, 6)}`
  const password = `E2e!${Math.random().toString(36).slice(2, 12)}A9`
  // 显示名只用字母：避免随机后缀里的连续数字被「日志 PII」扫描误判为手机号。
  const alphabetOnly = Array.from({ length: 10 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join('')
  const user = await pbCreate('users', {
    email: `e2e-${suffix}@example.com`,
    username: `e2e_${suffix}`,
    password,
    passwordConfirm: password,
    displayName: `E2E 烟测账号 ${alphabetOnly}`,
    nickname: `E2E${alphabetOnly.slice(0, 4)}`,
    status: '1',
  })
  return { id: user.id, email: user.email, password }
}

/** 把自有家长档案绑定到夹具账号（只更新本进程创建/指定的 parentId）。 */
export async function bindParentUser(parentId, userId) {
  ensureFixtureAllowed()
  await pbUpdate('talent_parents', parentId, { userId })
}

/**
 * 创建「一人一份」报告夹具：talent_gene_reports + talent_reports（status=pending_publish）。
 * 用 Mock 源同等口径的要素行（A-01…/LV1–LV4），可被业务 API 发布、撤回、恢复、重算、补发。
 * @param {{ suite: string, parentId: string, childId: string, books?: string[], sectionCodes?: string[], reportNo?: string }} input
 */
export async function createPendingReportFixture(input) {
  ensureFixtureAllowed()
  const books = input.books || ['A', 'B']
  const child = await pbGet('talent_children', input.childId)
  const sectionCodes = input.sectionCodes || []
  const sections = []
  if (sectionCodes.length) {
    sectionCodes.forEach((code, index) => {
      sections.push({
        bookCode: books[index % books.length],
        chapter: `E2E 烟测章节 ${index + 1}`,
        factorCode: code,
        levelCode: `LV${(index % 4) + 1}`,
        score: 60 + index,
        condition: '',
      })
    })
  } else {
    books.forEach((bookCode, bookIndex) => {
      for (let n = 1; n <= 2; n += 1) {
        sections.push({
          bookCode,
          chapter: `${bookIndex + 1}.${n} E2E 烟测章节`,
          factorCode: `${bookCode}-0${n}`,
          levelCode: `LV${((bookIndex + n) % 4) + 1}`,
          score: 60 + bookIndex * 5 + n,
          condition: '',
        })
      }
    })
  }
  const reportNo = input.reportNo || `E2E${RUN_ID.replace(/[^0-9]/g, '').slice(-10)}${Math.floor(Math.random() * 90 + 10)}`
  const gene = await pbCreate('talent_gene_reports', {
    subjectType: 'child',
    subjectId: input.childId,
    parentId: input.parentId,
    reportNo,
    name: String(child.name || ''),
    gender: String(child.gender || 'female'),
    birthday: String(child.birthday || ''),
    age: 8,
    maskedIdNo: String(child.maskedIdNo || ''),
    idNoHash: String(child.idNoHash || ''),
    issuer: 'E2E 烟测机构（虚构）',
    filedAt: new Date().toISOString().slice(0, 10),
    syncedAt: new Date().toISOString(),
    source: 'mock',
    version: 'v1',
    books: books.join(''),
    sections,
    sectionCount: sections.length,
    status: 'synced',
  })
  const report = await pbCreate('talent_reports', {
    reportNo,
    reportType: 'gene_report',
    title: `${String(child.name || '对象')}·E2E 烟测报告`,
    customerId: '',
    status: 'pending_publish',
    subjectType: 'child',
    subjectId: input.childId,
    parentId: input.parentId,
    geneReportId: gene.id,
    factorCount: 0,
    snapshotVersion: 0,
    snapshotAt: '',
    queriedAt: new Date().toISOString(),
    openVolumeIds: [],
    factorSnapshot: [],
    volumeSnapshot: [],
    directionSnapshot: null,
    selections: [],
    versions: [],
    totalItems: 0,
    publishedAt: '',
    withdrawnAt: '',
    restoredAt: '',
  })
  return { reportId: report.id, geneReportId: gene.id, reportNo }
}

/**
 * 一步创建「隔离会员 + 子女 + 夹具账号绑定 + 待发布报告」。
 * 会员走真实后台 API（保证 encrypt/hash 三件套由业务代码写入），账号/报告走 PB 夹具。
 * @param {ReturnType<typeof import('./lib.mjs').makeApi>} api
 * @param {{ suite?: string, withClientUser?: boolean }} [options]
 */
export async function seedReportSubject(api, options = {}) {
  const suite = options.suite || '07'
  const tag = runId(suite).slice(0, 40)
  const mobile = fixtureMobile()
  // 身份证尾号按运行序列生成，避免与其他套件/历史烟测档案的 idNoHash 唯一键冲突。
  const parentIdNo = `11010119850612${uniqueDigits(4)}`
  const childBirthday = '2018-04-09'
  const childIdNo = `11010120180409${uniqueDigits(4)}`
  const created = await api('/api/admin/talent/members', {
    method: 'POST',
    body: {
      name: `烟测家长${tag}`.slice(0, 50),
      mobile,
      gender: 'male',
      birthday: '1985-06-12',
      idNo: parentIdNo,
      children: [
        {
          name: `烟测子${tag}`.slice(0, 50),
          gender: 'female',
          birthday: childBirthday,
          relation: 'father',
          idNo: childIdNo,
        },
      ],
    },
  })
  if (created.status !== 200 || !created.data?.parent?.id)
    throw new Error(`夹具会员创建失败：${created.status} ${created.message || ''}`)
  const parent = created.data.parent
  const child = (created.data.children || [])[0]
  // 会员/子女由业务 API 创建，业务 API 无删除入口：登记 PB 精确 id 删除（仅本进程创建的对象）。
  await trackExisting('talent_parents', parent.id)
  if (child?.id) await trackExisting('talent_children', child.id)
  const clientUser = options.withClientUser ? await createFixtureUser(suite) : null
  if (clientUser) await bindParentUser(parent.id, clientUser.id)
  const report = await createPendingReportFixture({ suite, parentId: parent.id, childId: child.id })
  return { parent, child, mobile, clientUser, parentIdNo, childIdNo, childBirthday, ...report }
}

/** 把「由业务 API 创建、但需删除」的自有记录登记进夹具清理栈。 */
export async function trackExisting(collection, id) {
  ensureFixtureAllowed()
  return track(collection, id)
}

/** 业务 API 已删除的记录从清理栈移除（避免收尾时重复删除 404）。 */
export function forgetTracked(collection, id) {
  const index = tracked.findIndex(item => item.collection === collection && item.id === id)
  if (index >= 0) tracked.splice(index, 1)
  return index >= 0
}

/**
 * 会员域夹具：走真实后台 API 新建家长（+1 名子女），立即登记精确 id 删除。
 * 业务 API 没有删除会员/子女入口，因此「跑后清理」用 PB 管理端按本进程创建 id 删除；
 * 会员的加密/哈希/脱敏三件套仍由业务代码写入，不绕过实现。
 * @param {ReturnType<typeof import('./lib.mjs').makeApi>} api
 * @param {{ suite?: string, withParentIdNo?: boolean, child?: Record<string, unknown> }} [options]
 */
export async function seedMemberFixture(api, options = {}) {
  ensureFixtureAllowed()
  const tag = runId(options.suite || '06').slice(0, 40)
  const mobile = fixtureMobile()
  const childBirthday = '2018-04-09'
  const childIdNo = `11010120180409${uniqueDigits(4)}`
  const child = options.child || {
    name: `烟测子${tag}`.slice(0, 50),
    gender: 'female',
    birthday: childBirthday,
    relation: 'mother',
    idNo: childIdNo,
  }
  const body = {
    name: `烟测家长${tag}`.slice(0, 50),
    mobile,
    gender: 'male',
    children: [child],
  }
  if (options.withParentIdNo) {
    body.birthday = '1985-06-12'
    body.idNo = `11010119850612${uniqueDigits(4)}`
  }
  const created = await api('/api/admin/talent/members', { method: 'POST', body })
  if (created.status !== 200 || !created.data?.parent?.id)
    throw new Error(`夹具会员创建失败：${created.status} ${created.message || ''}`)
  const parent = created.data.parent
  await trackExisting('talent_parents', parent.id)
  for (const item of created.data.children || []) await trackExisting('talent_children', item.id)
  return {
    parent,
    children: created.data.children || [],
    queries: created.data.queries || [],
    mobile,
    parentIdNo: body.idNo || '',
    parentBirthday: body.birthday || '',
    childIdNo: child.idNo || '',
    childBirthday: child.birthday || '',
    tag,
  }
}