#!/usr/bin/env node
/**
 * @description M9 性能基线脚本（spec §5，P-01/02/03/04 + P-07 可测子集）。
 *   默认 `--scale small`：生成 20 会员 / 20 报告 / 20 建议（专用 `PERF-<runId>` 前缀，独立归档版本承载建议），
 *   测完按 id 清理，不写种子数据、不切换生效建议版本；`--scale full` 生成 1000/500/500（需 `--allow-write`，
 *   且必须在隔离实例执行，删除量大）。
 *   测量：每项 3 次预热丢弃 + 10 个样本，输出中位数 / p95 / 门槛 / pass / baselineMet（是否达到 spec 全量规模）。
 *   不达标不伪造：低于全量规模时 `baselineMet=false` 并在 gaps 里写明「样本不足，未达 1000/500」。
 *   P-05/P-06/P-08/P-09/P-10 及「浏览器首屏」未实现，逐条列入 gaps，不冒充通过。
 * @file scripts/perf/m9-perf.mjs
 */
import { performance } from 'node:perf_hooks'
import {
  ADMIN,
  RUN_ID,
  adminLogin,
  assertSafeTarget,
  clientLogin,
  makeApi,
  makeClientApi,
  writeEvidence,
} from '../e2e/lib.mjs'
import { fixturesEnabled, pbCreate, pbList, seedMemberFixture, seedReportSubject } from '../e2e/fixtures.mjs'

const args = process.argv.slice(2)
const readFlag = (name, fallback = '') => {
  const inline = args.find(item => item.startsWith(`--${name}=`))
  if (inline) return inline.slice(name.length + 3)
  const index = args.indexOf(`--${name}`)
  if (index >= 0) return args[index + 1] && !args[index + 1].startsWith('--') ? args[index + 1] : '1'
  return fallback
}
const scale = String(readFlag('scale', 'small')).toLowerCase() === 'full' ? 'full' : 'small'
const samples = Math.max(3, Number(readFlag('samples', '10')) || 10)
const warmup = Math.max(1, Number(readFlag('warmup', '3')) || 3)
const allowWrite = args.includes('--allow-write') || process.env.M9_PERF_ALLOW_WRITE === '1'
const noGenerate = args.includes('--no-generate')

const TARGETS = {
  small: { members: 20, reports: 20, advice: 20, label: 'small（脚本自证规模，未达 spec 1000/500）' },
  full: { members: 1000, reports: 500, advice: 500, label: 'full（spec §5.1 规模）' },
}
const PLAN = TARGETS[scale]
const THRESHOLDS = {
  'P-01': { medianMs: 2000, p95Ms: 2500, label: '/admin/talent/member 列表首屏（1000 条）', dataset: 'members', target: 1000 },
  'P-02': { medianMs: 2000, p95Ms: 2500, label: '/admin/talent/reports 列表首屏（500 条）', dataset: 'reports', target: 500 },
  'P-03': { medianMs: 2000, p95Ms: null, label: '/admin/talent/advice 列表首屏（500 条）', dataset: 'advice', target: 500 },
  'P-04': { medianMs: 800, p95Ms: 1500, label: '列表接口服务端耗时（20 条/页）', dataset: 'any', target: 0 },
  'P-07': { medianMs: null, p95Ms: null, label: '单册 PDF 冷渲染 ≤10s / 缓存命中 ≤2s', dataset: 'pdf', target: 0, coldMs: 10000, hotMs: 2000 },
}
const gaps = []
const metrics = []
const startedAt = Number(process.env.M9_PERF_STARTED_AT || Date.now())

function percentile(sorted, ratio) {
  if (!sorted.length) return 0
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))
  return sorted[index]
}

function summarize(values) {
  const sorted = [...values].sort((left, right) => left - right)
  const median = sorted[Math.floor((sorted.length - 1) / 2)]
  return {
    samples: sorted.length,
    medianMs: Math.round(median * 100) / 100,
    p95Ms: Math.round(percentile(sorted, 0.95) * 100) / 100,
    minMs: Math.round(sorted[0] * 100) / 100,
    maxMs: Math.round(sorted[sorted.length - 1] * 100) / 100,
  }
}

/** 单接口计时：先 warmup 次预热丢弃，再 samples 次采样（含 HTTP 状态校验）。 */
async function measureApi(label, path) {
  const times = []
  for (let index = 0; index < warmup; index += 1) {
    const res = await fetch(`${ADMIN}${path}`, { headers: { Authorization: `Bearer ${perfToken}` } })
    if (res.status !== 200) throw new Error(`${label} 预热失败：${path} status=${res.status}`)
    await res.arrayBuffer()
  }
  for (let index = 0; index < samples; index += 1) {
    const started = performance.now()
    const res = await fetch(`${ADMIN}${path}`, { headers: { Authorization: `Bearer ${perfToken}` } })
    await res.arrayBuffer()
    const elapsed = performance.now() - started
    if (res.status !== 200) throw new Error(`${label} 采样失败：${path} status=${res.status}`)
    times.push(elapsed)
  }
  return summarize(times)
}

function recordMetric(id, stats, dataset, datasetTarget, extra = {}) {
  const threshold = THRESHOLDS[id]
  const medianPass = threshold.medianMs === null ? true : stats.medianMs <= threshold.medianMs
  const p95Pass = threshold.p95Ms === null ? true : stats.p95Ms <= threshold.p95Ms
  const pass = medianPass && p95Pass
  const baselineMet = datasetTarget > 0 ? dataset >= datasetTarget : true
  metrics.push({
    id,
    label: threshold.label,
    dataset,
    datasetTarget,
    ...stats,
    thresholds: { medianMs: threshold.medianMs, p95Ms: threshold.p95Ms, ...(threshold.coldMs ? { coldMs: threshold.coldMs, hotMs: threshold.hotMs } : {}) },
    pass,
    baselineMet,
    ...extra,
  })
  console.log(`  ${pass ? '✅' : '❌'} ${id} ${threshold.label}  median=${stats.medianMs}ms p95=${stats.p95Ms}ms  数据集=${dataset}${datasetTarget ? `（目标 ${datasetTarget}）` : ''}`)
  return pass
}

let perfToken = ''
const createdCounts = { members: 0, reports: 0, advice: 0 }
const dataset = { members: 0, reports: 0, advice: 0 }

async function generateDataset(api) {
  console.log(`\n▶ 生成 ${PLAN.label} 数据集（前缀 PERF-${RUN_ID}）`)
  const seedBase = Number(String(RUN_ID).replace(/\D/g, '').slice(-4)) || 1000
  const createdMembers = []
  for (let index = 0; index < PLAN.members; index += 1) {
    let member = null
    for (let attempt = 0; attempt < 5 && !member; attempt += 1) {
      try {
        member = await seedMemberFixture(api, { suite: `perf-m${index}-${attempt}`, child: undefined })
      } catch (error) {
        if (String(error?.message || '').includes('409')) continue
        throw error
      }
    }
    if (!member) throw new Error(`生成第 ${index + 1} 个性能会员失败（唯一键冲突 5 次）`)
    createdMembers.push(member)
    createdCounts.members += 1
    if (createdCounts.members % 100 === 0) console.log(`  会员 ${createdCounts.members}/${PLAN.members}`)
  }
  // 报告：为每个性能会员的子女建 pending 报告（PB 夹具，一人一份，不发布、不影响 C 端）。
  for (const member of createdMembers.slice(0, PLAN.reports)) {
    const childRow = (await pbList('talent_children', `parentId = "${member.parent.id}"`))[0]
    if (!childRow) continue
    await createPerfReport(member.parent, childRow, createdCounts.reports)
    createdCounts.reports += 1
    if (createdCounts.reports % 100 === 0) console.log(`  报告 ${createdCounts.reports}/${PLAN.reports}`)
  }
  // 建议：建一个归档夹具版本承载 500 条建议行（不改当前生效版本、不影响 C 端）。
  const version = await pbCreate('talent_advice_versions', {
    versionNo: `PERF-${String(RUN_ID).slice(-8)}`,
    status: 'archived',
    cycle: '2020-01 ~ 2020-04',
    effectiveAt: '2020-01-01',
    nextUpdateAt: '2020-05-01',
    syncedAt: new Date().toISOString(),
    source: 'mock',
    note: `M9 性能夹具（${RUN_ID}）`,
    operatorId: '',
    operatorName: '性能夹具',
  })
  const template = (await pbList('talent_advice_docs'))[0]
  for (let index = 0; index < PLAN.advice; index += 1) {
    await pbCreate('talent_advice_docs', {
      adviceNo: `PERF${String(RUN_ID).slice(-6)}-${String(index).padStart(4, '0')}`,
      reportNo: `PERF-${seedBase}-${index}`,
      subjectType: 'child',
      subjectId: `perf-subject-${index}`,
      name: `性能子女${index}`,
      maskedIdNo: '1101**********1234',
      idNoHash: String(template?.idNoHash || ''),
      gender: index % 2 === 0 ? 'female' : 'male',
      birthday: '2018-04-09',
      age: 7,
      matchKey: `性能子女${index}｜7 岁`,
      versionName: version.versionNo,
      publishStatus: 'published',
      publishedAt: new Date().toISOString(),
      withdrawnAt: '',
      syncedAt: new Date().toISOString(),
      source: 'mock',
      books: String(template?.books || 'AB'),
      sections: template?.sections || [],
      sectionCount: Number(template?.sectionCount || 0),
      bookCount: Number(template?.bookCount || 2),
      entropyCounts: template?.entropyCounts || {},
      firstFactorName: String(template?.firstFactorName || ''),
      versionId: version.id,
    })
    createdCounts.advice += 1
    if (createdCounts.advice % 100 === 0) console.log(`  建议 ${createdCounts.advice}/${PLAN.advice}`)
  }
  dataset.adviceVersionId = version.id
}

async function createPerfReport(parent, child, index) {
  const reportNo = `PERF${String(RUN_ID).slice(-6)}${String(index).padStart(4, '0')}`
  const books = ['A', 'B']
  const sections = []
  books.forEach((bookCode, bookIndex) => {
    for (let n = 1; n <= 2; n += 1) {
      sections.push({
        bookCode,
        chapter: `${bookIndex + 1}.${n} 性能夹具章节`,
        factorCode: `${bookCode}-0${n}`,
        levelCode: `LV${((bookIndex + n) % 4) + 1}`,
        score: 60 + bookIndex + n,
        condition: '',
      })
    }
  })
  const gene = await pbCreate('talent_gene_reports', {
    subjectType: 'child',
    subjectId: child.id,
    parentId: parent.id,
    reportNo,
    name: String(child.name || ''),
    gender: String(child.gender || 'female'),
    birthday: String(child.birthday || ''),
    age: 7,
    maskedIdNo: String(child.maskedIdNo || ''),
    idNoHash: String(child.idNoHash || ''),
    issuer: '性能夹具（虚构）',
    filedAt: new Date().toISOString().slice(0, 10),
    syncedAt: new Date().toISOString(),
    source: 'mock',
    version: 'v1',
    books: books.join(''),
    sections,
    sectionCount: sections.length,
    status: 'synced',
  })
  await pbCreate('talent_reports', {
    reportNo,
    reportType: 'gene_report',
    title: `${String(child.name || '对象')}·性能夹具报告`,
    customerId: '',
    status: 'pending_publish',
    subjectType: 'child',
    subjectId: child.id,
    parentId: parent.id,
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
}

async function measurePdf() {
  console.log('\n▶ P-07 PDF 冷/热渲染')
  const fixture = await seedReportSubject(makeApi(perfToken), { suite: 'perf-pdf', withClientUser: true })
  const api = makeApi(perfToken)
  const publish = await api(`/api/admin/talent/reports/${fixture.reportId}/publish`, { method: 'POST', body: { openVolumeIds: ['V1'] } })
  if (publish.status !== 200) throw new Error(`PDF 夹具报告发布失败：${publish.status}`)
  const capi = makeClientApi(await clientLogin(fixture.clientUser.email, fixture.clientUser.password))
  const ticket = await capi(`/api/client/talent/reports/${fixture.reportId}/volumes/V1/pdf-ticket`, { method: 'POST' })
  if (ticket.status !== 200) throw new Error(`PDF ticket 失败：${ticket.status}`)
  const url = `${ADMIN}${ticket.data.url}`
  // 冷：首次下载（该报告此前从未渲染）。热：随后 3 次取中位数。
  const coldStart = performance.now()
  const coldRes = await fetch(url)
  const coldBytes = Buffer.from(await coldRes.arrayBuffer())
  const coldMs = performance.now() - coldStart
  const hotTimes = []
  for (let index = 0; index < 3; index += 1) {
    const started = performance.now()
    const res = await fetch(url)
    const bytes = Buffer.from(await res.arrayBuffer())
    hotTimes.push(performance.now() - started)
    if (res.status !== 200 || !bytes.equals(coldBytes)) throw new Error('PDF 热缓存下载字节不一致')
  }
  const hotMedian = hotTimes.sort((a, b) => a - b)[Math.floor((hotTimes.length - 1) / 2)]
  const coldPass = coldRes.status === 200 && coldMs <= THRESHOLDS['P-07'].coldMs && coldBytes.slice(0, 4).toString() === '%PDF'
  const hotPass = hotMedian <= THRESHOLDS['P-07'].hotMs
  metrics.push({
    id: 'P-07',
    label: THRESHOLDS['P-07'].label,
    dataset: 1,
    datasetTarget: 0,
    coldMs: Math.round(coldMs * 100) / 100,
    hotMedianMs: Math.round(hotMedian * 100) / 100,
    hotSamples: hotTimes.length,
    thresholds: { coldMs: THRESHOLDS['P-07'].coldMs, hotMs: THRESHOLDS['P-07'].hotMs },
    pass: coldPass && hotPass,
    baselineMet: true,
  })
  console.log(`  ${coldPass && hotPass ? '✅' : '❌'} P-07 冷=${Math.round(coldMs)}ms（≤10000）/ 热中位=${Math.round(hotMedian)}ms（≤2000）`)
  return coldPass && hotPass
}

async function main() {
  console.log(`M9 性能基线：scale=${scale}（${PLAN.label}），samples=${samples}，warmup=${warmup}，runId=${RUN_ID}`)
  console.log(`环境：${ADMIN} | node ${process.version} | ${process.platform}`)
  assertSafeTarget({ write: true })
  if (!fixturesEnabled()) throw new Error('性能脚本需要 PB 夹具（本地/隔离实例）')
  if (scale === 'full' && !allowWrite)
    throw new Error('--scale full 会写 1000/500/500 数据：请在隔离实例执行并显式加 --allow-write（或 M9_PERF_ALLOW_WRITE=1）')

  perfToken = await adminLogin()
  const api = makeApi(perfToken)

  if (!noGenerate) {
    await generateDataset(api)
  } else {
    console.log('\n▶ --no-generate：只测现有数据（数据集规模见下）')
  }

  // 数据集规模（本进程清理前读取）
  const membersTotal = Number((await api('/api/admin/talent/members?page=1&pageSize=1')).data?.total || 0)
  const reportsTotal = Number((await api('/api/admin/talent/reports?page=1&pageSize=1')).data?.total || 0)
  const adviceParams = dataset.adviceVersionId ? `&versionId=${dataset.adviceVersionId}` : ''
  const adviceTotal = Number((await api(`/api/admin/talent/advice?page=1&pageSize=1${adviceParams}`)).data?.total || 0)
  dataset.members = membersTotal
  dataset.reports = reportsTotal
  dataset.advice = adviceTotal
  console.log(`\n数据集：member=${membersTotal} / reports=${reportsTotal} / advice=${adviceTotal}（本次生成 member=${createdCounts.members} report=${createdCounts.reports} advice=${createdCounts.advice}）`)

  if (membersTotal >= 1) {
    const stats = await measureApi('P-01', '/api/admin/talent/members?page=1&pageSize=20')
    recordMetric('P-01', stats, membersTotal, THRESHOLDS['P-01'].target)
  }
  if (reportsTotal >= 1) {
    const stats = await measureApi('P-02', '/api/admin/talent/reports?page=1&pageSize=20')
    recordMetric('P-02', stats, reportsTotal, THRESHOLDS['P-02'].target)
  }
  if (adviceTotal >= 1) {
    const stats = await measureApi('P-03', `/api/admin/talent/advice?page=1&pageSize=20${adviceParams}`)
    recordMetric('P-03', stats, adviceTotal, THRESHOLDS['P-03'].target, { note: 'API 层；后台页面首屏未测' })
  }
  // P-04：三个列表接口 20 条/页合并统计
  const p04Times = []
  for (const path of [
    '/api/admin/talent/members?page=1&pageSize=20',
    '/api/admin/talent/reports?page=1&pageSize=20',
    `/api/admin/talent/advice?page=1&pageSize=20${adviceParams}`,
  ]) {
    for (let index = 0; index < warmup; index += 1) await fetch(`${ADMIN}${path}`, { headers: { Authorization: `Bearer ${perfToken}` } })
    for (let index = 0; index < samples; index += 1) {
      const started = performance.now()
      const res = await fetch(`${ADMIN}${path}`, { headers: { Authorization: `Bearer ${perfToken}` } })
      await res.arrayBuffer()
      if (res.status !== 200) throw new Error(`P-04 采样失败：${path} status=${res.status}`)
      p04Times.push(performance.now() - started)
    }
  }
  const p04Stats = summarize(p04Times)
  const p04Threshold = THRESHOLDS['P-04']
  const p04Pass = p04Stats.medianMs <= p04Threshold.medianMs && p04Stats.p95Ms <= p04Threshold.p95Ms
  metrics.push({
    id: 'P-04',
    label: p04Threshold.label,
    dataset: dataset.members + dataset.reports + dataset.advice,
    datasetTarget: 0,
    ...p04Stats,
    thresholds: { medianMs: p04Threshold.medianMs, p95Ms: p04Threshold.p95Ms },
    pass: p04Pass,
    baselineMet: true,
  })
  console.log(`  ${p04Pass ? '✅' : '❌'} P-04 ${p04Threshold.label}  median=${p04Stats.medianMs}ms p95=${p04Stats.p95Ms}ms`)

  await measurePdf()

  // 未实现项：明确写缺口，不冒充通过。
  gaps.push(
    'P-01/P-02/P-03 只测 API 列表（含 20 条/页），浏览器首屏（Playwright 首屏可见时间）未测 → 需浏览器探针。',
    'P-05 C 端报告首屏（4G 模拟 + 冷启动）未测：需 Playwright 网络节流。',
    'P-06 C 端分册/要素按需加载未测。',
    'P-08 Mock 同步 100/500 人耗时未测：需隔离库执行 sync commit（会刷新种子报告）。',
    'P-09 列表无 N+1（单页网络请求/接口调用数）未测：需 Playwright Network 统计。',
    'P-10 连续 10 分钟压测 RSS 未测。',
    `建议数量测口径：本次在「归档夹具版本」上生成 ${createdCounts.advice} 条，用 versionId 过滤测量，避免切换当前生效版本；与 spec「500 份建议」的正式数据集在页面层仍有差异。`,
  )
  if (scale === 'small')
    gaps.push(`本次 scale=small：仅生成 ${PLAN.members}/${PLAN.members}/${PLAN.advice}，未达 spec §5.1 的 1000 会员 / 500 报告 / 500 建议，P-01/P-02/P-03 的 baselineMet=false。`)

  const measuredPasses = metrics.map(item => item.pass)
  const baselineMetAll = metrics.filter(item => ['P-01', 'P-02', 'P-03'].includes(item.id)).every(item => item.baselineMet)
  const allPass = measuredPasses.every(Boolean)
  const payload = {
    suite: 'm9-perf',
    runId: RUN_ID,
    scale,
    scaleLabel: PLAN.label,
    origin: ADMIN,
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      cpuCount: (await import('node:os')).cpus().length,
      totalMemMb: Math.round((await import('node:os')).totalmem() / 1024 / 1024),
    },
    method: {
      warmup,
      samples,
      timing: 'HTTP 往返耗时（同机 127.0.0.1，含 Node/Nitro/PB 处理）',
      pageFirstPaint: '未测',
    },
    dataset: { ...dataset, requested: PLAN, generated: createdCounts },
    metrics,
    baselineMet: baselineMetAll,
    allPass,
    gaps,
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
  }
  const evidence = writeEvidence('perf-m9', payload)
  console.log('\n' + '='.repeat(64))
  for (const item of metrics) console.log(`${item.pass ? '✅' : '❌'} ${item.id} ${item.label}  ${item.medianMs !== undefined ? `median=${item.medianMs}ms p95=${item.p95Ms}ms` : ''}${item.coldMs !== undefined ? ` cold=${item.coldMs}ms hot=${item.hotMedianMs}ms` : ''}${item.baselineMet ? '' : '（样本不足）'}`)
  console.log(`\n结论：测量项 ${metrics.filter(item => item.pass).length}/${metrics.length} 达标；全量规模 baselineMet=${baselineMetAll}`)
  console.log(`证据：${evidence}`)
  console.log('\n未测/缺口：')
  for (const gap of gaps) console.log(`  - ${gap}`)
  return allPass ? 0 : 1
}

try {
  const code = await main()
  process.exitCode = code
} catch (error) {
  console.error(`\n❌ 性能脚本失败：${error?.message || error}`)
  process.exitCode = 2
} finally {
  try {
    const { runCleanup } = await import('../e2e/lib.mjs')
    const result = await runCleanup()
    if (result.failures.length) console.error(`清理失败 ${result.failures.length} 项：${result.failures.slice(0, 3).map(item => `${item.label}: ${item.error}`).join(' | ')}`)
    else console.log(`\n✔ 已清理本次生成的夹具数据（${result.ran} 项）`)
  } catch (error) {
    console.error(`清理异常：${error?.message || error}`)
    process.exitCode = 2
  }
}