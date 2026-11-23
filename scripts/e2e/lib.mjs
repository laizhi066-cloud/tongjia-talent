/**
 * @description 端到端实测公共库：目标地址解析、登录、断言、清理栈、证据产物与安全目标校验。
 *   M9 扩展（不破坏既有 API）：`runId()` / `cleanup()` 栈 / `writeEvidence()` / `expectStatus()` /
 *   `seedMinimal()` / `skip()` / `finishSuite()`；现有 01/02/04/05/06 套件只用原有导出。
 *   证据文件不含 token / 口令 / 明文手机号与身份证（写入前统一脱敏）。
 * @file scripts/e2e/lib.mjs
 */
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { loadDotEnv } from '../_pb.mjs'

loadDotEnv()

/** 目标环境：默认本地，`--target remote` 或 E2E_TARGET=remote 切到测试服（仅 staging）。 */
export function resolveTarget() {
  const target = process.env.E2E_TARGET === 'remote' ? 'remote' : 'local'
  const defaults = target === 'remote'
    ? { admin: process.env.E2E_REMOTE_ADMIN || 'http://127.0.0.1:3000/tongjia-talent', h5: process.env.E2E_REMOTE_H5 || 'http://127.0.0.1:9000/tongjia-talent-h5' }
    : { admin: 'http://127.0.0.1:3000', h5: 'http://127.0.0.1:9000' }
  return {
    target,
    admin: (process.env.ADMIN_ORIGIN || defaults.admin).replace(/\/$/, ''),
    h5: (process.env.H5_ORIGIN || defaults.h5).replace(/\/$/, ''),
  }
}

export const { target, admin: ADMIN, h5: H5 } = resolveTarget()

/** 生产/非 staging 主机硬拒绝（spec §4.2：`E2E_TARGET=remote` 仅 staging）。 */
const PROD_HOST_PATTERN = /(^|\.)(tongjia[a-z-]*\.(com|cn)|tianfu[a-z-]*\.(com|cn))$/i
/** 允许的 remote staging 主机：`E2E_STAGING_HOSTS`（逗号分隔），默认当前测试服 IP。 */
function stagingHosts() {
  return String(process.env.E2E_STAGING_HOSTS || '127.0.0.1,localhost')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

/**
 * 校验目标安全：生产域名一律拒绝；remote 只允许 staging 主机；写操作还需 `E2E_ALLOW_WRITE=1`。
 * @param {{ write?: boolean }} [options]
 */
export function assertSafeTarget(options = {}) {
  if (process.env.E2E_ALLOW_PROD)
    throw new Error('E2E 拒绝：不存在 E2E_ALLOW_PROD 逃生门，生产域名一律硬失败')
  for (const [label, origin] of [['ADMIN_ORIGIN', ADMIN], ['H5_ORIGIN', H5]]) {
    let host = ''
    try { host = new URL(origin).hostname } catch { throw new Error(`E2E 目标地址不合法：${label}=${origin}`) }
    if (PROD_HOST_PATTERN.test(host))
      throw new Error(`E2E 拒绝：${label} 指向生产域名 ${host}（只允许本地/隔离/staging）`)
    if (target === 'remote' && !stagingHosts().includes(host))
      throw new Error(`E2E 拒绝：remote 目标 ${host} 不在 E2E_STAGING_HOSTS=${stagingHosts().join(',')} 白名单内`)
  }
  if (target === 'remote' && options.write && process.env.E2E_ALLOW_WRITE !== '1')
    throw new Error('E2E 拒绝：remote 写操作必须显式 E2E_ALLOW_WRITE=1（并确认是 staging）')
  return { target, write: Boolean(options.write) }
}

/** 测试账号密码与 scripts/seed-accounts.mjs 保持同一套环境变量与默认值（M6 四角色）。 */
export const ACCOUNTS = {
  superAdmin: { identity: 'superAdmin', password: process.env.SUPERADMIN_PASSWORD || 'laizhi066' },
  // 平台运营管理员沿用旧 customer-admin roleKey / 账号 admin。
  platformOperator: {
    identity: 'admin',
    password:
      process.env.PLATFORM_OPERATOR_PASSWORD ||
      process.env.CUSTOMER_ADMIN_PASSWORD ||
      'admin123',
  },
  // 兼容旧套件命名（M6-B 起统一用 platformOperator）。
  customerAdmin: {
    identity: 'admin',
    password:
      process.env.PLATFORM_OPERATOR_PASSWORD ||
      process.env.CUSTOMER_ADMIN_PASSWORD ||
      'admin123',
  },
  reportReviewer: { identity: 'reviewer', password: process.env.REPORT_REVIEWER_PASSWORD || 'reviewer123' },
  ruleConfigurator: { identity: 'rule-config', password: process.env.RULE_CONFIGURATOR_PASSWORD || 'ruleconfig123' },
  clientPassword: process.env.TALENT_MOCK_CLIENT_PASSWORD || 'TalentMock123!',
  /** 演示库绑定账号（家长 1 + 子女 2），口令沿用平台运营口令。 */
  clientIdentity: process.env.TALENT_MOCK_CLIENT_IDENTITY || 'admin@tongjia.local',
}

// ── 运行标识 / 数据后缀 ─────────────────────────────────────────────────────────

function formatStamp(date = new Date()) {
  const pad = value => String(value).padStart(2, '0')
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('')
}

/**
 * 本次运行的唯一标识：默认 `m9-<yyyymmddHHMMSS>-<4hex>`；`E2E_RUN_ID` 可复跑同一 ID。
 * 只含字母/数字/短横线，可直接做数据后缀与证据目录名。
 */
export const RUN_ID = (() => {
  const override = String(process.env.E2E_RUN_ID || '').trim()
  if (override) return override.replace(/[^0-9A-Za-z-]/g, '').slice(0, 48)
  return `m9-${formatStamp()}-${createHash('sha256').update(String(Math.random())).digest('hex').slice(0, 4)}`
})()

/** 生成数据后缀：`runId('06')` → `06-<RUN_ID>`。 */
export function runId(prefix = '') {
  return prefix ? `${prefix}-${RUN_ID}` : RUN_ID
}

/** 生成 9 位数字（用于手机号 / 唯一键），同一进程内自增避免碰撞。 */
let digitSeq = Number(String(Date.now()).slice(-5))
export function uniqueDigits(length = 9) {
  digitSeq = (digitSeq + 1) % 100000
  const tail = `${String(digitSeq).padStart(5, '0')}${String(Date.now()).slice(-4)}`
  return tail.slice(-length)
}

/** 生成合法虚构手机号（`13` + 9 位数字）。 */
export function fixtureMobile() {
  return `13${uniqueDigits(9)}`
}

/** 生成合法虚构身份证号（前 14 位含生日，格式 18 位；不做校验位计算）。 */
export function fixtureIdNo(birthday = '1985-06-12', tail = '1234') {
  return `${birthday.replace(/-/g, '')}${tail}`
}

// ── 证据目录 / 脱敏 ────────────────────────────────────────────────────────────

/** 证据目录：`E2E_EVIDENCE_DIR` 或 `/tmp/tj-m9-e2e/<RUN_ID>`（不提交仓库）。 */
export const EVIDENCE_DIR = process.env.E2E_EVIDENCE_DIR
  ? resolve(process.env.E2E_EVIDENCE_DIR)
  : join('/tmp', 'tj-m9-e2e', RUN_ID)

/** 敏感键：token / 口令 / 授权头 / 密钥只允许留在内存，绝不写证据。 */
const SECRET_KEY_PATTERN = /^(token|accesstoken|authorization|password|passwordconfirm|secret|cookie|set-cookie)$/i
/** 脱敏：11 位手机号与 18 位身份证（含 X）中间打码。 */
const PLAIN_MOBILE_PATTERN = /(?<!\d)1[3-9]\d{9}(?!\d)/g
const PLAIN_ID_NO_PATTERN = /(?<!\d)\d{17}[\dXx](?!\d)/g

/** 递归脱敏任意 JSON（用于证据与日志摘要）。 */
export function redactSensitive(value, depth = 0) {
  if (depth > 12) return '[deep]'
  if (typeof value === 'string') {
    return value
      .replace(PLAIN_ID_NO_PATTERN, match => `${match.slice(0, 4)}**********${match.slice(-4)}`)
      .replace(PLAIN_MOBILE_PATTERN, match => `${match.slice(0, 3)}****${match.slice(-4)}`)
  }
  if (Array.isArray(value)) return value.map(item => redactSensitive(item, depth + 1))
  if (value && typeof value === 'object') {
    const output = {}
    for (const [key, item] of Object.entries(value)) {
      output[key] = SECRET_KEY_PATTERN.test(key) ? '[redacted]' : redactSensitive(item, depth + 1)
    }
    return output
  }
  return value
}

/**
 * 写入套件证据 JSON（已脱敏）；返回文件路径。同一 suite 重复调用覆盖。
 * @param {string} suite 套件标识（如 `06-member-domain`）
 * @param {Record<string, unknown>} payload
 */
export function writeEvidence(suite, payload) {
  mkdirSync(EVIDENCE_DIR, { recursive: true })
  const file = join(EVIDENCE_DIR, `${String(suite).replace(/[^0-9A-Za-z-]/g, '-')}.json`)
  writeFileSync(file, `${JSON.stringify(redactSensitive(payload), null, 2)}\n`, 'utf8')
  console.log(`  证据：${file}`)
  return file
}

// ── 会话 / 请求 ────────────────────────────────────────────────────────────────

/** 后台登录，返回 Bearer token。 */
export async function adminLogin(identity = ACCOUNTS.superAdmin.identity, password = ACCOUNTS.superAdmin.password) {
  const res = await fetch(`${ADMIN}/api/public/admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity, password }),
  })
  const body = await res.json().catch(() => null)
  if (!body?.data?.token) throw new Error(`后台登录失败：${res.status} ${JSON.stringify(body).slice(0, 160)}`)
  return body.data.token
}

/** 带 token 的后台 API 调用；raw=true 时 body 原样发送（FormData）。 */
export function makeApi(token) {
  return async function api(path, { method = 'GET', body, raw } = {}) {
    const res = await fetch(`${ADMIN}${path}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body && !raw ? { 'Content-Type': 'application/json' } : {}),
      },
      body: raw ? body : body ? JSON.stringify(body) : undefined,
    })
    let json = null
    try { json = await res.json() } catch { /* 非 JSON 响应 */ }
    return { status: res.status, code: json?.code, message: json?.message, data: json?.data }
  }
}

/** C 端 API 调用（Nuxt 同源 `/api/client/*`，Bearer token）。 */
export function makeClientApi(token) {
  return async function clientApi(path, { method = 'GET', body } = {}) {
    const res = await fetch(`${ADMIN}${path}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    let json = null
    try { json = await res.json() } catch { /* 非 JSON 响应 */ }
    return { status: res.status, code: json?.code, message: json?.message, data: json?.data }
  }
}

/** C 端登录，返回客户端 token。 */
export async function clientLogin(identity, password = ACCOUNTS.clientPassword) {
  const res = await fetch(`${ADMIN}/api/client/auth/phone-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity, password }),
  })
  const body = await res.json().catch(() => null)
  if (!body?.data?.token) throw new Error(`C 端登录失败：${res.status} ${JSON.stringify(body).slice(0, 160)}`)
  return body.data.token
}

/** 读取后台 bootstrap（菜单树 + 权限码 + 角色），用于三角色菜单正反用例。 */
export async function adminBootstrap(token) {
  const res = await fetch(`${ADMIN}/api/admin/bootstrap`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await res.json().catch(() => null)
  if (!body?.data) throw new Error(`bootstrap 失败：${res.status}`)
  return body.data
}

/** 把 bootstrap 菜单树拍平成 path / label 列表（含分组）。 */
export function flattenMenuTree(nodes, result = []) {
  for (const node of nodes || []) {
    if (node?.path) result.push({ path: node.path, label: node.label })
    if (node?.children?.length) flattenMenuTree(node.children, result)
  }
  return result
}

/** 超管读取全部菜单行（含停用 / F 行），用于「旧菜单、旧权限码为 0」断言。 */
export async function allMenuRows(superToken) {
  const api = makeApi(superToken)
  const res = await api('/api/admin/menu/tree?all=true')
  const rows = []
  const walk = (nodes) => {
    for (const node of nodes || []) {
      rows.push(node)
      walk(node.children)
    }
  }
  walk(res.data)
  return { status: res.status, rows }
}

/** 列表接口快捷读取（默认拉全量）。 */
export function apiList(api, resource, params = '') {
  return api(`/api/admin/talent/${resource}?page=1&pageSize=100${params}`).then(r => r.data)
}

/** 懒加载 playwright，避免只跑接口用例时也引入浏览器依赖。 */
export async function launchBrowser() {
  const { chromium } = await import('playwright')
  return chromium.launch()
}

// ── 断言 / 跳过 / 汇总 ─────────────────────────────────────────────────────────

const results = []
const skippedChecks = []

export function check(name, ok, detail = '') {
  results.push({ name, ok: Boolean(ok), detail: String(detail).slice(0, 300) })
  console.log(`${ok ? '  ✅' : '  ❌'} ${name}${detail ? `  ${detail}` : ''}`)
  return Boolean(ok)
}

/**
 * 断言 HTTP 状态码；expected 可为数字或数组。
 * @returns {boolean}
 */
export function expectStatus(res, expected, name) {
  const allowed = Array.isArray(expected) ? expected : [expected]
  const detail = `status=${res?.status ?? 'n/a'}${res?.code ? ` code=${res.code}` : ''}${res?.message ? ` msg=${String(res.message).slice(0, 80)}` : ''}`
  return check(name, allowed.includes(res?.status), detail)
}

/**
 * 记录「未执行」的检查（需环境/隔离实例）。不算通过、计入 summary 的 skipped。
 * 使用条件必须写清原因，禁止用 skip 冒充通过（spec §4.2-7）。
 */
export function skip(name, reason = '') {
  skippedChecks.push({ name, reason: String(reason).slice(0, 200) })
  console.log(`  ⊘ ${name}${reason ? `  ${reason}` : ''}`)
  return false
}

/** 读取当前套件的断言结果（供证据写入）。 */
export function getChecks() {
  return results.map(item => ({ ...item }))
}

export function getSkipped() {
  return skippedChecks.map(item => ({ ...item }))
}

/** 打印汇总并返回失败数，供 run-all 汇总退出码。 */
export function summary(title) {
  const failed = results.filter(r => !r.ok)
  console.log(`\n【${title}】${results.length - failed.length}/${results.length} 通过${skippedChecks.length ? `；未执行 ${skippedChecks.length} 项` : ''}`)
  for (const f of failed) console.log(`  ✗ ${f.name} ${f.detail}`)
  for (const s of skippedChecks) console.log(`  ⊘ ${s.name} ${s.reason}`)
  if (failed.length) process.exitCode = 1
  return failed.length
}

/**
 * 套件收尾：执行清理栈 → 记录清理结果 → 汇总 → 写证据。返回失败数。
 * @param {{ suite: string, title: string, startedAt: number, extra?: Record<string, unknown> }} options
 */
export async function finishSuite(options) {
  const { suite, title, startedAt, extra = {} } = options
  const cleanup = await runCleanup()
  if (cleanup.ran > 0 || cleanup.failures.length > 0)
    check(`临时数据清理（${cleanup.ran} 项）`, cleanup.failures.length === 0, cleanup.failures.map(f => `${f.label}: ${f.error}`).join(' | '))
  const failed = summary(title)
  const payload = {
    suite,
    group: process.env.E2E_GROUP || 'all',
    target,
    runId: RUN_ID,
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    environment: {
      adminOrigin: ADMIN,
      h5Origin: H5,
      node: process.version,
      platform: process.platform,
    },
    checks: getChecks(),
    skipped: getSkipped(),
    passed: results.filter(item => item.ok).length,
    failed,
    total: results.length,
    cleanup: { ran: cleanup.ran, failures: cleanup.failures.length },
    ...extra,
  }
  const evidencePath = writeEvidence(suite, payload)
  return { failed, evidencePath, cleanupFailures: cleanup.failures.length }
}

// ── 清理栈（LIFO） ─────────────────────────────────────────────────────────────

const cleanupStack = []

/**
 * 登记清理动作；`finishSuite`/`runCleanup` 按登记逆序执行。
 * @param {string} label
 * @param {() => Promise<unknown> | unknown} fn
 */
export function registerCleanup(label, fn) {
  cleanupStack.push({ label, fn })
  return fn
}

/** 当前清理栈长度。 */
export function cleanupSize() {
  return cleanupStack.length
}

/** 逆序执行清理栈；单条失败不阻断其余。 */
export async function runCleanup() {
  const failures = []
  let ran = 0
  while (cleanupStack.length) {
    const item = cleanupStack.pop()
    try {
      await item.fn()
      ran += 1
    } catch (error) {
      failures.push({ label: item.label, error: String(error?.message || error).slice(0, 200) })
    }
  }
  return { ran, failures }
}

// ── 轮询 / 安全扫描 / 最小种子 ─────────────────────────────────────────────────

/**
 * 轮询等待 predicate 返回真值。
 * @template T
 * @param {() => Promise<T>} predicate
 * @param {{ timeoutMs?: number, intervalMs?: number }} [options]
 * @returns {Promise<T | null>}
 */
export async function waitFor(predicate, options = {}) {
  const timeoutMs = options.timeoutMs ?? 8000
  const intervalMs = options.intervalMs ?? 400
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const value = await predicate().catch(() => null)
    if (value) return value
    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }
  return null
}

/** 递归键扫描：禁止 `*Cipher` / `*Hash` 等未脱敏字段出现在响应里。 */
const FORBIDDEN_RESPONSE_KEY = /(cipher|hash|token|password)/i
const ALLOWED_MASKED_KEY = /^masked/i

function collectSensitive(value, trail, found, depth = 0) {
  if (depth > 12 || value === null || value === undefined) return
  if (typeof value === 'string') {
    if (PLAIN_ID_NO_PATTERN.test(value)) found.push(`${trail}: 18 位身份证明文`)
    PLAIN_ID_NO_PATTERN.lastIndex = 0
    if (PLAIN_MOBILE_PATTERN.test(value)) found.push(`${trail}: 11 位手机号明文`)
    PLAIN_MOBILE_PATTERN.lastIndex = 0
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectSensitive(item, `${trail}[${index}]`, found, depth + 1))
    return
  }
  if (typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (FORBIDDEN_RESPONSE_KEY.test(key) && !ALLOWED_MASKED_KEY.test(key))
        found.push(`${trail}.${key}: 响应含密文/哈希/令牌键`)
      collectSensitive(item, trail ? `${trail}.${key}` : key, found, depth + 1)
    }
  }
}

/**
 * 扫描响应对象：不得含 `*Cipher` / `*Hash` / token 键，也不得含 11 位手机号 / 18 位证件明文。
 * @returns {{ ok: boolean, violations: string[] }}
 */
export function scanSensitive(payload, options = {}) {
  const found = []
  collectSensitive(payload, options.root || 'response', found)
  return { ok: found.length === 0, violations: found.slice(0, 8) }
}

/** 在套件里直接断言「响应无明文/密文」。 */
export function checkNoSensitive(payload, name, options = {}) {
  const scan = scanSensitive(payload, options)
  return check(name, scan.ok, scan.violations.join(' | '))
}

/**
 * 最小种子：用真实 API 新建 1 名家长（可选身份证）+ 1–N 名子女，名称/手机号带 RUN_ID 后缀。
 * 登记清理：解绑子女（幂等）+ 停用家长（列表仍保留记录，但不再进入 C 端）。
 * @param {ReturnType<typeof makeApi>} api
 * @param {{ suite?: string, children?: Array<Record<string, unknown>>, withParentIdNo?: boolean, waitQuery?: boolean }} [options]
 */
export async function seedMinimal(api, options = {}) {
  const suite = options.suite || 'gen'
  const tag = runId(suite).slice(0, 40)
  const children = options.children || [
    {
      name: `烟测子${tag}`.slice(0, 50),
      gender: 'female',
      birthday: '2018-04-09',
      relation: 'mother',
      idNo: fixtureIdNo('2018-04-09', '1234'),
    },
  ]
  const body = {
    name: `烟测家长${tag}`.slice(0, 50),
    mobile: fixtureMobile(),
    gender: 'male',
    children,
  }
  if (options.withParentIdNo) {
    body.birthday = '1985-06-12'
    body.idNo = fixtureIdNo('1985-06-12', '5678')
  }
  const created = await api('/api/admin/talent/members', { method: 'POST', body })
  if (created.status !== 200 || !created.data?.parent?.id)
    throw new Error(`seedMinimal 新建会员失败：${created.status} ${created.message || ''}`)
  const parent = created.data.parent
  const createdChildren = created.data.children || []
  for (const child of createdChildren) {
    registerCleanup(`unbind-child-${child.id}`, () => api(`/api/admin/talent/children/${child.id}/unbind`, { method: 'POST' }))
  }
  registerCleanup(`disable-parent-${parent.id}`, () => api(`/api/admin/talent/members/${parent.id}/status`, { method: 'PUT', body: { status: '0' } }))
  return {
    parent,
    children: createdChildren,
    queries: created.data.queries || [],
    mobile: body.mobile,
    parentIdNo: body.idNo || '',
    parentBirthday: body.birthday || '',
    tag,
  }
}