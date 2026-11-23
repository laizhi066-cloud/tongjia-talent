#!/usr/bin/env node
/**
 * 客户真实报告包导入（开发/运维工具）：
 *   读取 parse-client-package.py 产出的 JSON，校验并幂等写入 M2/M3/M5。
 *   - 默认 dry-run；--apply 才写库；不接收真实生产库，除非显式 --allow-remote。
 *   - PII 不落仓库；JSON 与日志放 /tmp；脚本只输出计数与不匹配项。
 */
import { createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { basename, join } from 'node:path'
import { pbEnv } from '../_pb.mjs'

const args = process.argv.slice(2)
const input = args.find(a => !a.startsWith('--')) || '/tmp/client-import/package.json'
const apply = args.includes('--apply')
const allowRemote = args.includes('--allow-remote')
const pdfDir = args.includes('--pdf-dir') ? args[args.indexOf('--pdf-dir')+1] : (existsSync('/tmp/client-import/pdf') ? '/tmp/client-import/pdf' : '')
const pkg = JSON.parse(readFileSync(input, 'utf8'))
const { PB_URL, EMAIL, PASS } = pbEnv()
const ADMIN = process.env.ADMIN_ORIGIN || 'http://127.0.0.1:3000'
if (!allowRemote && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(new URL(ADMIN).origin))
  throw new Error('非本地环境需显式 --allow-remote')

const normalize = v => String(v || '').replace(/[\s·•\-—（）()]+/g, '').trim()
const sha256 = v => createHash('sha256').update(v).digest('hex')
const idChecksum = (body17) => {
  const weights = [7,9,10,5,8,4,2,1,6,3,7,9,10,5,8,4,2]
  const codes = '10X98765432'
  return codes[[...body17].reduce((sum, ch, i) => sum + Number(ch) * weights[i], 0) % 11]
}
const makeIdNo = (birthday, seq = '001') => {
  const body = `110101${birthday.replaceAll('-','')}${seq}`
  return body + idChecksum(body)
}
const maskId = id => `${id.slice(0,4)}**********${id.slice(-4)}`

async function pbAuth() {
  const res = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({identity:EMAIL,password:PASS}) })
  const json = await res.json(); if (!json.token) throw new Error('PB 超管认证失败'); return json.token
}
const pbToken = await pbAuth()
async function pbUpload(method, path, fields, filePath) {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) if (value !== undefined) form.append(key, String(value))
  form.append('file', new File([readFileSync(filePath)], basename(filePath), { type: 'application/pdf' }))
  const res = await fetch(`${PB_URL}${path}`, { method, headers:{authorization:pbToken}, body: form })
  const json = await res.json().catch(()=>null)
  if (res.status >= 400) throw new Error(`PB ${method} ${path}: ${res.status} ${json?.message||''} ${JSON.stringify(json?.data||{}).slice(0,200)}`)
  return json
}
async function pb(method, path, body) {
  const res = await fetch(`${PB_URL}${path}`, { method, headers:{authorization:pbToken, ...(body?{'content-type':'application/json'}:{})}, body: body?JSON.stringify(body):undefined })
  const json = await res.json().catch(()=>null)
  if (res.status >= 400) throw new Error(`PB ${method} ${path}: ${res.status} ${json?.message||''} ${JSON.stringify(json?.data||{}).slice(0,300)}`)
  return json
}
async function appLogin() {
  const res = await fetch(`${ADMIN}/api/public/admin-login`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({identity:'superAdmin',password:process.env.SUPERADMIN_PASSWORD||'laizhi066'}) })
  const json = await res.json(); if (!json.data?.token) throw new Error('后台登录失败'); return json.data.token
}
const token = await appLogin()
async function api(method, path, body) {
  const res = await fetch(`${ADMIN}${path}`, { method, headers:{authorization:token, ...(body?{'content-type':'application/json'}:{})}, body: body?JSON.stringify(body):undefined })
  const json = await res.json().catch(()=>null)
  if (res.status >= 400) throw new Error(`API ${method} ${path}: ${res.status} ${JSON.stringify(json).slice(0,300)}`)
  return json.data
}

// 1) M1 因子映射
const libs = await api('GET','/api/admin/talent/factor-libraries?page=1&pageSize=5&gender=male&age=0')
const libraryId = libs.rows?.[0]?.id
if (!libraryId) throw new Error('找不到 male 0 岁要素库')
const factorRows = []
for (let page = 1; page <= 5; page += 1) {
  const result = await api('GET',`/api/admin/talent/factors?libraryId=${libraryId}&page=${page}&pageSize=100`)
  factorRows.push(...(result.rows || []))
  if (factorRows.length >= Number(result.total || 0)) break
}
const factorByKey = new Map(factorRows.map(f => [normalize(f.name), f]))
const factorByCode = new Map(factorRows.map(f => [f.code, f]))
const bookName = {A:'生长发育',B:'智商',C:'情商',D:'领导商',E:'艺术商',F:'体育运动商'}

// 2) 报告因子/等级
let unmatched = []
const books = []
for (const report of pkg.reports) {
  const sections = []
  for (const item of report.factors) {
    // 外部报告按分册内序号列出要素；M1 编码与报告序号一一对应（A-01…F-21），名称可能微调。
    const code = `${report.book}-${String(item.sequence || '').padStart(2, '0')}`
    const factor = factorByCode.get(code)
    if (!factor) { unmatched.push(`${report.book}:${item.name}`); continue }
    sections.push({ bookCode: report.book, chapter: `${report.book} ${bookName[report.book]}`, factorCode: factor.code, factorName: factor.name, levelCode: item.levelCode, score: null, condition: '' })
  }
  books.push({ book: report.book, sections, count: sections.length })
}
console.log('因子映射:', books.map(b=>`${b.book}=${b.count}`).join(' '), '未匹配:', unmatched.length)
if (unmatched.length) console.log('未匹配样例:', unmatched.slice(0,10))
if (!apply) { console.log('dry-run：未写库；确认后加 --apply'); process.exit(0) }

// 2.1) 把报告里的「潜质表型要点」写回 M1 固定注解（同一 factor+level 的真实解读）
let noteUpdated = 0
const noteMissing = []
for (const report of pkg.reports) {
  for (const item of report.factors) {
    if (!item.note || !item.levelCode) continue
    const code = `${report.book}-${String(item.sequence || '').padStart(2, '0')}`
    const existing = (await pb('GET',`/api/collections/talent_factor_notes/records?perPage=1&filter=${encodeURIComponent(`factorCode="${code}" && levelCode="${item.levelCode}"`)}`)).items?.[0]
    if (!existing) { noteMissing.push(`${code}/${item.levelCode}`); continue }
    if (String(existing.note || '') !== item.note) {
      await pb('PATCH',`/api/collections/talent_factor_notes/records/${existing.id}`, { note: item.note })
      noteUpdated += 1
    }
  }
}
console.log('解读文案回填:', noteUpdated, '条；未找到注解行:', noteMissing.length)

// 3) 找到/更新演示家长与孩子（保留加密字段，仅改展示字段）
const members = await api('GET','/api/admin/talent/members?page=1&pageSize=5')
const member = members.rows?.[0]
if (!member) throw new Error('演示库没有家长，请先 talent:member:seed')
const detail = await api('GET',`/api/admin/talent/members/${member.id}`)
const child = detail.children?.[0]
if (!child) throw new Error('演示家长没有子女')
const subject = pkg.subject
const childIdNo = makeIdNo(subject.birthday || '2015-09-17')
await api('PUT',`/api/admin/talent/members/${member.id}`, { name: subject.parentName || member.name, remark:'客户真实报告导入' })
await api('PUT',`/api/admin/talent/children/${child.id}`, { name: subject.name || child.name, gender: subject.gender || 'male', birthday: subject.birthday || child.birthday, relation: ({'母子':'mother','父子':'father','祖孙':'grandfather_paternal'}[String(subject.relation||'')] || child.relation || 'mother'), idNo: childIdNo })
const parentAfter = await api('GET',`/api/admin/talent/members/${member.id}`)
const parentRecord = parentAfter.parent || parentAfter
const childAfter = (parentAfter.children || []).find(c=>c.id===child.id)
// 演示库：把家长绑定到 admin 账号，便于 C 端直接登录查看；生产由真实 claim 流程绑定。
const adminUsers = (await pb('GET',`/api/collections/users/records?perPage=1&filter=${encodeURIComponent('email="admin@tongjia.local"')}`)).items || []
if (adminUsers[0]?.id) {
  const others = (await pb('GET',`/api/collections/talent_parents/records?perPage=20&filter=${encodeURIComponent(`userId="${adminUsers[0].id}"`)}`)).items || []
  for (const other of others) if (other.id !== parentRecord.id) await pb('PATCH',`/api/collections/talent_parents/records/${other.id}`, { userId: '' })
  await pb('PATCH',`/api/collections/talent_parents/records/${parentRecord.id}`, { userId: adminUsers[0].id })
  console.log('已绑定 C 端演示账号: admin@tongjia.local')
}
if (!parentRecord?.id || !childAfter?.id) throw new Error('家长/孩子详情解析失败')
console.log('家长/孩子:', parentRecord.name, '/', childAfter.name, childAfter.birthday)

// 4) 基因报告 + 报告 + 发布
const reportNo = `ZJ-${subject.reportId || Date.now()}`
const geneExisting = await pb('GET',`/api/collections/talent_gene_reports/records?perPage=1&filter=${encodeURIComponent(`reportNo="${reportNo}"`)}`).catch(()=>null)
const allSections = books.flatMap(b=>b.sections)
const geneBySubject = (await pb('GET',`/api/collections/talent_gene_reports/records?perPage=1&filter=${encodeURIComponent(`subjectType="child" && subjectId="${childAfter.id}"`)}`)).items?.[0]
let gene = geneBySubject || geneExisting?.items?.[0]
const genePayload = {
  subjectType:'child', subjectId:childAfter.id, parentId:parentRecord.id, reportNo,
  name:childAfter.name, gender:subject.gender||'male', birthday:childAfter.birthday, age:11,
  maskedIdNo:maskId(childIdNo), source:'external', books:'ABCDEF', sections:allSections,
  sectionCount:allSections.length, status:'synced', syncedAt:new Date().toISOString(),
}
if (!gene) gene = await pb('POST','/api/collections/talent_gene_reports/records', genePayload)
else gene = await pb('PATCH',`/api/collections/talent_gene_reports/records/${gene.id}`, genePayload)
const reportBySubject = (await pb('GET',`/api/collections/talent_reports/records?perPage=1&filter=${encodeURIComponent(`subjectType="child" && subjectId="${childAfter.id}"`)}`)).items?.[0]
let report = reportBySubject || (await pb('GET',`/api/collections/talent_reports/records?perPage=1&filter=${encodeURIComponent(`reportNo="${reportNo}"`)}`)).items?.[0]
const reportPayload = {
  reportNo, reportType:'gene_report', title:`${childAfter.name}·基因报告`, status:'pending_publish',
  totalItems:0, subjectType:'child', subjectId:childAfter.id, parentId:parentRecord.id, geneReportId:gene.id,
  factorCount:0, snapshotVersion:0, snapshotAt:null, openVolumeIds:[], factorSnapshot:[], volumeSnapshot:[], directionSnapshot:null, selections:[], versions:[],
}
if (!report) report = await pb('POST','/api/collections/talent_reports/records', reportPayload)
else report = await pb('PATCH',`/api/collections/talent_reports/records/${report.id}`, reportPayload)
try {
  await api('POST',`/api/admin/talent/reports/${report.id}/publish`, { openVolumeIds:['V1','V2','V3','V4','V5','V6'] })
  console.log('报告已发布:', reportNo)
} catch (error) {
  if (!String(error).includes('409')) throw error
  console.log('报告已是已发布状态:', reportNo)
}

// 4.1) 上传客户原版 PDF（可选；--pdf-dir 存在时）
if (pdfDir) {
  const volumeByBook = { A:'V1', B:'V2', C:'V3', D:'V4', E:'V5', F:'V6' }
  for (const book of ['A','B','C','D','E','F']) {
    const filePath = join(pdfDir, `${book}.pdf`)
    if (!existsSync(filePath)) { console.log('原版 PDF 缺失:', filePath); continue }
    const volumeId = volumeByBook[book]
    const bytes = readFileSync(filePath)
    const checksum = sha256(bytes)
    const existing = (await pb('GET',`/api/collections/talent_report_source_pdfs/records?perPage=1&filter=${encodeURIComponent(`reportId="${report.id}" && volumeId="${volumeId}"`)}`)).items?.[0]
    const payload = { reportId:report.id, geneReportId:gene.id, volumeId, originalName:`${childAfter.name}·${book}篇·基因报告.pdf`, byteSize:bytes.byteLength, checksum, source:'client', importedAt:new Date().toISOString() }
    if (existing) await pbUpload('PATCH',`/api/collections/talent_report_source_pdfs/records/${existing.id}`, payload, filePath)
    else await pbUpload('POST','/api/collections/talent_report_source_pdfs/records', payload, filePath)
    console.log('原版 PDF 已导入:', volumeId, book, Math.round(bytes.byteLength/1024)+'KB')
  }
}

// 5) 培育建议：挂到当前生效版本
const versions = await api('GET','/api/admin/talent/advice/versions')
const active = (versions.items||versions.rows||[]).find(v=>v.status==='active')
if (!active) throw new Error('没有 active 建议版本')
const adviceSections = pkg.advice.map(a=>{
  const factor = factorByKey.get(normalize(a.factor))
  const book = factor?.category || a.book || 'A'
  return { book, bookName:bookName[book]||'', chapter:`${book} ${bookName[book]||''}`, factor:a.factor, entropy:a.entropy, content:a.content, example:a.example, direction:a.direction, suggestion:a.suggestion, variant:a.variant }
})
const advNo = `ADV-${reportNo}`
const existingAdv = (await pb('GET',`/api/collections/talent_advice_docs/records?perPage=1&filter=${encodeURIComponent(`versionId="${active.id}" && geneReportId="${gene.id}"`)}`)).items?.[0]
if (!existingAdv) {
  await pb('POST','/api/collections/talent_advice_docs/records', {
    adviceNo:advNo, reportNo, subjectType:'child', subjectId:childAfter.id, name:childAfter.name,
    maskedIdNo:maskId(childIdNo), gender:subject.gender||'male', birthday:childAfter.birthday, age:11,
    matchKey:`${childAfter.name}|11 岁`, versionName:active.versionNo, versionId:active.id,
    reportId:report.id, geneReportId:gene.id, parentId:parentRecord.id,
    publishStatus:'published', publishedAt:new Date().toISOString(), syncedAt:new Date().toISOString(), source:'external',
    books:[...new Set(adviceSections.map(s=>s.book))].sort().join(''), sections:adviceSections,
    sectionCount:adviceSections.length, bookCount:new Set(adviceSections.map(s=>s.book)).size,
    entropyCounts:adviceSections.reduce((m,s)=>(m[s.entropy]=(m[s.entropy]||0)+1,m),{}),
    firstFactorName:adviceSections[0]?.factor||'',
  })
  console.log('建议已导入:', advNo, 'sections=', adviceSections.length)
} else {
  await pb('PATCH',`/api/collections/talent_advice_docs/records/${existingAdv.id}`, { adviceNo:advNo, reportNo, name:childAfter.name, maskedIdNo:maskId(childIdNo), gender:subject.gender||'male', birthday:childAfter.birthday, age:11, matchKey:`${childAfter.name}|11 岁`, versionName:active.versionNo, reportId:report.id, geneReportId:gene.id, parentId:parentRecord.id, publishStatus:'published', publishedAt:new Date().toISOString(), syncedAt:new Date().toISOString(), source:'external', books:[...new Set(adviceSections.map(s=>s.book))].sort().join(''), sections:adviceSections, sectionCount:adviceSections.length, bookCount:new Set(adviceSections.map(s=>s.book)).size, entropyCounts:adviceSections.reduce((m,s)=>(m[s.entropy]=(m[s.entropy]||0)+1,m),{}), firstFactorName:adviceSections[0]?.factor||'' })
  console.log('建议已更新:', advNo, 'sections=', adviceSections.length)
}
console.log('完成：报告', reportNo, '因子', allSections.length, '建议', adviceSections.length)
