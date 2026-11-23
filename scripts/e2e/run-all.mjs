#!/usr/bin/env node
/**
 * @description 端到端实测入口（M9）：分组执行冒烟 01/02/04/05/06m 与验收 06–10，
 *   支持 `--group smoke|acceptance|all`、`--only 01,06`、单套件超时、`summary.json` 汇总证据。
 *   默认（不传 group/only）仍只跑现行冒烟 5 套件，兼容旧用法；发布门禁用 `--group all`。
 *   目标安全：生产域名硬拒绝；remote 仅 staging，验收组需 `E2E_ALLOW_WRITE=1`。
 * @file scripts/e2e/run-all.mjs
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { EVIDENCE_DIR, RUN_ID, assertSafeTarget, target } from './lib.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)

/** 读取 `--key value` 或 `--key=value`。 */
function readFlag(name, fallback = '') {
  const inline = args.find(item => item.startsWith(`--${name}=`))
  if (inline) return inline.slice(name.length + 3)
  const index = args.indexOf(`--${name}`)
  if (index >= 0) return args[index + 1] && !args[index + 1].startsWith('--') ? args[index + 1] : '1'
  return fallback
}

const requestedGroup = String(readFlag('group', process.env.E2E_GROUP || 'smoke')).toLowerCase()
const onlyRaw = String(readFlag('only', '')).trim()
const only = onlyRaw ? onlyRaw.split(',').map(item => item.trim()).filter(Boolean) : null
const timeoutOverrideMs = Number(readFlag('timeout', '')) || 0
const suiteTarget = target === 'remote' ? 'remote' : 'local'

/**
 * 套件注册表：id → 文件/分组/标题/超时。
 * 注意：`06m` 是现行 M6 清理回归套件（原 `06-m6-cleanup.mjs`）；验收 `06` 是会员域套件。
 * 原因：M9 spec §4.4 规定验收 06 = 会员域，且 `--only 06,07,08,09` 必须落到验收套件。
 */
const SUITES = [
  { id: '01', file: '01-admin-crud.mjs', group: 'smoke', title: '后台新域只读烟测', timeoutMs: 120_000 },
  { id: '02', file: '02-admin-actions.mjs', group: 'smoke', title: '三角色权限正反用例', timeoutMs: 120_000 },
  { id: '04', file: '04-client.mjs', group: 'smoke', title: 'C 端门户烟测', timeoutMs: 180_000 },
  { id: '05', file: '05-admin-ui.mjs', group: 'smoke', title: '后台页面与三角色菜单', timeoutMs: 240_000 },
  { id: '06m', file: '06-m6-cleanup.mjs', group: 'smoke', title: 'M6 旧口径清理回归', timeoutMs: 180_000 },
  { id: '06', file: '06-member-domain.mjs', group: 'acceptance', title: '会员域验收（AC-ADM-02/BR-11）', timeoutMs: 420_000 },
  { id: '07', file: '07-report-domain.mjs', group: 'acceptance', title: '报告域验收（AC-ADM-06/BR-02..05/10）', timeoutMs: 480_000 },
  { id: '08', file: '08-advice-domain.mjs', group: 'acceptance', title: '建议域验收（AC-ADM-07/BR-06/07）', timeoutMs: 420_000 },
  { id: '09', file: '09-direction-domain.mjs', group: 'acceptance', title: '方向域验收（AC-ADM-03/AC-M4/BR-08/09）', timeoutMs: 480_000 },
  { id: '10', file: '10-client-permission-regression.mjs', group: 'acceptance', title: 'C 端与权限回归（AC-APP/AC-M6/AC-M8）', timeoutMs: 540_000 },
]

const GROUPS = { smoke: ['smoke'], acceptance: ['acceptance'], all: ['smoke', 'acceptance'] }
if (!GROUPS[requestedGroup]) {
  console.error(`未知 --group=${requestedGroup}；可选 smoke | acceptance | all`)
  process.exit(2)
}

let selected
if (only) {
  const unknown = only.filter(id => !SUITES.some(suite => suite.id === id))
  if (unknown.length) {
    console.error(`未知套件 id：${unknown.join(',')}；可用：${SUITES.map(suite => suite.id).join(',')}`)
    process.exit(2)
  }
  selected = SUITES.filter(suite => only.includes(suite.id))
} else {
  selected = SUITES.filter(suite => GROUPS[requestedGroup].includes(suite.group))
}

// 目标安全校验：写操作组（验收/全量）在 remote 必须显式 E2E_ALLOW_WRITE=1；生产域名硬拒绝。
const writeGroup = selected.some(suite => suite.group === 'acceptance')
try {
  assertSafeTarget({ write: writeGroup })
} catch (error) {
  console.error(`\n❌ ${error.message}`)
  process.exit(2)
}

const startedAt = Date.now()
const runEnv = {
  ...process.env,
  E2E_TARGET: suiteTarget,
  E2E_RUN_ID: RUN_ID,
  E2E_GROUP: only ? 'only' : requestedGroup,
  E2E_EVIDENCE_DIR: EVIDENCE_DIR,
}
mkdirSync(EVIDENCE_DIR, { recursive: true })

console.log(`端到端实测：group=${only ? `only(${only.join('/')})` : requestedGroup}，target=${suiteTarget}，runId=${RUN_ID}`)
console.log(`套件：${selected.map(suite => `${suite.id}(${suite.group})`).join(' ')}`)
console.log(`证据目录：${EVIDENCE_DIR}`)
if (suiteTarget === 'remote')
  console.log('⚠ 目标为测试服/ staging：会读写测试数据，结束后按发布清单恢复演示数据。')

/** 运行单个套件：实时转发输出并写日志文件；超时先 SIGTERM 再 SIGKILL。 */
function runSuite(suite) {
  return new Promise((resolvePromise) => {
    const logFile = join(EVIDENCE_DIR, `${suite.id}-${suite.file.replace(/\.mjs$/, '')}.log`)
    const logLines = []
    const timeoutMs = timeoutOverrideMs || suite.timeoutMs
    const child = spawn(process.execPath, [resolve(HERE, suite.file)], {
      env: { ...runEnv, E2E_SUITE_ID: suite.id },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let timedOut = false
    const timeoutTimer = setTimeout(() => {
      timedOut = true
      child.kill('SIGTERM')
      setTimeout(() => child.kill('SIGKILL'), 5_000).unref()
    }, timeoutMs)
    const forward = (chunk) => {
      const text = chunk.toString()
      logLines.push(text)
      process.stdout.write(text)
    }
    child.stdout.on('data', forward)
    child.stderr.on('data', forward)
    child.on('close', (code, signal) => {
      clearTimeout(timeoutTimer)
      try { writeFileSync(logFile, `${logLines.join('')}\n`, 'utf8') } catch { /* 忽略日志写入失败 */ }
      resolvePromise({ code: code ?? 1, signal, timedOut, logFile, timeoutMs })
    })
  })
}

/** 读取套件证据 JSON（不存在返回 null）。 */
function readSuiteEvidence(suite) {
  const file = join(EVIDENCE_DIR, `${suite.file.replace(/\.mjs$/, '')}.json`)
  if (!existsSync(file)) return null
  try { return { file, json: JSON.parse(readFileSync(file, 'utf8')) } } catch { return null }
}

/**
 * 旧套件（01/02/04/05/06m）不写 evidence JSON：从日志尾部解析汇总行
 * `【标题】x/y 通过；未执行 n 项`，让 summary.json 对冒烟组同样有 checks/passed/failed。
 */
function parseLegacyCounts(logFile) {
  if (!existsSync(logFile)) return { checks: null, passed: null, failed: null, skipped: 0 }
  const text = readFileSync(logFile, 'utf8')
  const matches = [...text.matchAll(/【[^】]+】(\d+)\/(\d+) 通过(?:；未执行 (\d+) 项)?/g)]
  if (!matches.length) return { checks: null, passed: null, failed: null, skipped: 0 }
  const last = matches[matches.length - 1]
  const passed = Number(last[1])
  const total = Number(last[2])
  const skipped = Number(last[3] || 0)
  return { checks: total, passed, failed: Math.max(0, total - passed), skipped }
}

const suiteResults = []
for (const suite of selected) {
  console.log(`\n${'='.repeat(64)}\n▶ ${suite.id} ${suite.title}（${suite.file}）\n${'='.repeat(64)}`)
  const suiteStartedAt = Date.now()
  const result = await runSuite(suite)
  const durationMs = Date.now() - suiteStartedAt
  const evidence = readSuiteEvidence(suite)
  const legacyCounts = evidence ? { checks: null, passed: null, failed: null, skipped: 0 } : parseLegacyCounts(result.logFile)
  const skippedCount = evidence?.json?.skipped?.length ?? legacyCounts.skipped
  const passedCount = evidence?.json?.passed ?? legacyCounts.passed
  const failedCount = evidence?.json?.failed ?? legacyCounts.failed ?? (result.code === 0 ? 0 : null)
  const checksCount = evidence?.json?.total ?? legacyCounts.checks
  const status = result.timedOut ? 'timeout' : result.code === 0 ? 'passed' : 'failed'
  suiteResults.push({
    suite: suite.id,
    file: suite.file,
    title: suite.title,
    group: suite.group,
    status,
    exitCode: result.code,
    timedOut: result.timedOut,
    durationMs,
    timeoutMs: result.timeoutMs,
    checks: checksCount,
    passed: passedCount,
    failed: failedCount,
    skipped: skippedCount,
    evidence: evidence?.file ? evidence.file : null,
    log: result.logFile,
    skippedChecks: evidence?.json?.skipped ?? [],
  })
}

const totals = {
  suites: suiteResults.length,
  passedSuites: suiteResults.filter(item => item.status === 'passed').length,
  failedSuites: suiteResults.filter(item => item.status !== 'passed').length,
  checks: suiteResults.reduce((sum, item) => sum + (item.checks || 0), 0),
  passed: suiteResults.reduce((sum, item) => sum + (item.passed || 0), 0),
  failed: suiteResults.reduce((sum, item) => sum + (item.failed || 0), 0),
  skipped: suiteResults.reduce((sum, item) => sum + (item.skipped || 0), 0),
}
const summaryPayload = {
  runId: RUN_ID,
  group: only ? 'only' : requestedGroup,
  target: suiteTarget,
  adminOrigin: process.env.ADMIN_ORIGIN || '',
  h5Origin: process.env.H5_ORIGIN || '',
  startedAt: new Date(startedAt).toISOString(),
  finishedAt: new Date().toISOString(),
  durationMs: Date.now() - startedAt,
  environment: { node: process.version, platform: process.platform },
  suites: suiteResults,
  totals,
}
const summaryFile = join(EVIDENCE_DIR, 'summary.json')
writeFileSync(summaryFile, `${JSON.stringify(summaryPayload, null, 2)}\n`, 'utf8')

console.log(`\n${'='.repeat(64)}`)
for (const item of suiteResults) {
  const flag = item.status === 'passed' ? '✅' : item.status === 'timeout' ? '⏱' : '❌'
  const counts = item.checks === null ? '断言数未知' : `${item.passed}/${item.checks} 通过${item.skipped ? `，未执行 ${item.skipped}` : ''}`
  console.log(`${flag} ${item.suite} ${item.title}  ${counts}  ${Math.round(item.durationMs / 1000)}s`)
}
console.log(`\n汇总：套件 ${totals.passedSuites}/${totals.suites} 通过；断言 ${totals.passed}/${totals.checks} 通过；未执行 ${totals.skipped}`)
console.log(`summary.json：${summaryFile}`)

const failedSuites = suiteResults.filter(item => item.status !== 'passed')
if (failedSuites.length) {
  console.log(`\n❌ 失败套件：${failedSuites.map(item => `${item.suite}${item.status === 'timeout' ? '（超时）' : ''}`).join('、')}`)
  process.exit(1)
}
console.log('\n✅ 所选套件全部通过')
process.exit(0)