import { roles, resourceRegistry } from './data.js?v=talent-1.0.8'
import { getActionDefinition, getActionRestriction, isReportLifecycleResource } from './flows.js?v=talent-1.0.8'
import { getRecordEditRestriction, getWorkbenchConfig } from './workbench-data.js?v=talent-1.0.8'
import { ensureClosure, executeClosure } from './closure/domain.js?v=talent-1.0.8'

const STORAGE_KEY = 'tongjia_talent_plan_rework_v1'
const EXPECTED_SCHEMA = '4.0.0'
let state
let seed
let listeners = []
const clone = value => JSON.parse(JSON.stringify(value))
const now = () => new Date().toLocaleString('zh-CN', { hour12: false })
const roleName = roleId => roles.find(role => role.id === roleId)?.name || roleId || '业务系统'
const resourceById = id => resourceRegistry.find(item => item.id === id)
const visitProjectCatalog = {
  'health-sleep': { project:'睡眠管理', material:'睡眠营养包', specification:'30 袋/盒', availableQty:18 },
  'health-exercise': { project:'运动管理', material:'运动恢复营养包', specification:'30 袋/盒', availableQty:18 },
  'medical-ecg': { project:'动态心电图', material:'动态心电监测耗材包', specification:'1 套', availableQty:18 }
}

function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) }
function notify() { listeners.forEach(listener => listener(state)) }
function save() { persist(); notify() }
function nextId(resourceId) {
  state.counters.record += 1
  return resourceId.toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 18) + '-' + state.counters.record
}
function audit(action, targetId = '-', detail = '', actor = roleName(state.currentRole), resourceId = '') {
  state.counters.audit += 1
  state.audit.unshift({ id:'AUD-' + String(state.counters.audit).padStart(4,'0'), time:now(), actor, action, targetId, detail, ...(resourceId ? { resourceId } : {}) })
}

function migrateState(parsed) {
  if (![EXPECTED_SCHEMA, '3.6.0', '3.5.0', '3.4.0'].includes(parsed.schemaVersion)) throw new Error('不支持的数据版本：' + (parsed.schemaVersion || '未知'))

  const migrated = clone(seed)
  migrated.schemaVersion = EXPECTED_SCHEMA
  const resetLegacyTalentState = parsed.schemaVersion !== EXPECTED_SCHEMA
  migrated.currentRole = parsed.currentRole || migrated.currentRole
  migrated.filters = { ...migrated.filters, ...(parsed.filters || {}) }
  migrated.dashboard = { ...migrated.dashboard, ...(parsed.dashboard || {}) }
  migrated.terminalDemo = { ...migrated.terminalDemo, ...(parsed.terminalDemo || {}) }
  migrated.terminalDemo.inquiry = { ...seed.terminalDemo.inquiry, ...(parsed.terminalDemo?.inquiry || {}) }
  migrated.terminalDemo.inventory = { ...seed.terminalDemo.inventory, ...(parsed.terminalDemo?.inventory || {}) }
  migrated.terminalDemo.medicalUse = { ...seed.terminalDemo.medicalUse, ...(parsed.terminalDemo?.medicalUse || {}) }
  const storedMedicalUse = migrated.terminalDemo.medicalUse
  const normalizedMedicalStatus = storedMedicalUse.stockWrittenBack
    ? '已确认出库'
    : storedMedicalUse.status === '已撤回'
      ? '已撤回'
      : parsed.visitOrder?.medical?.status === 'submitted' || storedMedicalUse.planLocked
        ? '待护士确认'
        : '未生成'
  storedMedicalUse.status = normalizedMedicalStatus
  storedMedicalUse.taskStatus = normalizedMedicalStatus
  storedMedicalUse.actualQty = normalizedMedicalStatus === '已确认出库'
    ? Number(storedMedicalUse.actualQty || storedMedicalUse.requestedQty || 0)
    : null
  migrated.terminalDemo.healthPlan = { ...seed.terminalDemo.healthPlan, ...(parsed.terminalDemo?.healthPlan || {}) }
  migrated.terminalDemo.consultation = { ...seed.terminalDemo.consultation, ...(parsed.terminalDemo?.consultation || {}) }
  if (!resetLegacyTalentState) migrated.terminalDemo.talent = { ...seed.terminalDemo.talent, ...(parsed.terminalDemo?.talent || {}) }
  migrated.visitOrder = { ...seed.visitOrder, ...(parsed.visitOrder || {}) }
  migrated.visitOrder.health = { ...seed.visitOrder.health, ...(parsed.visitOrder?.health || {}) }
  migrated.visitOrder.medical = { ...seed.visitOrder.medical, ...(parsed.visitOrder?.medical || {}) }
  migrated.visitOrder.implementationPlans = { ...seed.visitOrder.implementationPlans, ...(parsed.visitOrder?.implementationPlans || {}) }
  migrated.visitOrder.preconditionResult = { ...seed.visitOrder.preconditionResult, ...(parsed.visitOrder?.preconditionResult || {}) }
  migrated.visitOrder.backoffice = { ...seed.visitOrder.backoffice, ...(parsed.visitOrder?.backoffice || {}) }
  migrated.visitOrder.source = { ...seed.visitOrder.source, ...(parsed.visitOrder?.source || {}) }
  migrated.visitOrder.finance = {
    ...seed.visitOrder.finance,
    ...(parsed.visitOrder?.finance || {}),
    snapshots:[...(parsed.visitOrder?.finance?.snapshots || seed.visitOrder.finance.snapshots || [])],
    paymentRecords:[...(parsed.visitOrder?.finance?.paymentRecords || seed.visitOrder.finance.paymentRecords || [])],
    refundRequests:[...(parsed.visitOrder?.finance?.refundRequests || seed.visitOrder.finance.refundRequests || [])],
    invoiceRecords:[...(parsed.visitOrder?.finance?.invoiceRecords || seed.visitOrder.finance.invoiceRecords || [])],
    reconciliationRecords:[...(parsed.visitOrder?.finance?.reconciliationRecords || seed.visitOrder.finance.reconciliationRecords || [])],
    timeline:[...(parsed.visitOrder?.finance?.timeline || seed.visitOrder.finance.timeline || [])]
  }
  const storedFavoriteTemplates = Array.isArray(parsed.favoriteTemplates) ? parsed.favoriteTemplates : []
  const storedFavoriteIds = new Set(storedFavoriteTemplates.map(item => item?.id).filter(Boolean))
  migrated.favoriteTemplates = [
    ...storedFavoriteTemplates,
    ...migrated.favoriteTemplates.filter(item => !storedFavoriteIds.has(item.id))
  ]
  migrated.counters = { ...migrated.counters, ...(parsed.counters || {}) }
  migrated.approval = { ...clone(seed.approval), ...(parsed.approval || {}) }
  for (const key of ['forms', 'flows', 'instances', 'tasks', 'messages', 'notices', 'expressions', 'listeners']) {
    if (!Array.isArray(parsed.approval?.[key])) migrated.approval[key] = clone(seed.approval?.[key] || [])
    else migrated.approval[key] = clone(parsed.approval[key])
  }
  // 3.4.0 仅有通用审批任务时，迁移为 BPM 任务并保留原资源记录。
  if ((!parsed.approval || !Array.isArray(parsed.approval.tasks) || !parsed.approval.tasks.length) && Array.isArray(parsed.resources?.['approval-task'])) {
    migrated.approval.tasks = parsed.resources['approval-task'].map(task => ({
      id: task.id, instanceId: `PI-${task.businessId || task.id}`, businessId: task.businessId, resourceId: task.resourceId || 'finance-refund',
      nodeId: 'legacy-approval', nodeName: '历史审批节点', status: task.status || '待处理', assignee: task.owner || '王主管',
      candidateUsers: [task.owner || '王主管'], createdAt: task.createdAt || task.updatedAt || now(), updatedAt: task.updatedAt || now()
    }))
  }
  const storedAudit = Array.isArray(parsed.audit) ? clone(parsed.audit) : []
  const storedAuditIds = new Set(storedAudit.map(item => item?.id).filter(Boolean))
  migrated.audit = [
    ...storedAudit,
    ...migrated.audit.filter(item => !storedAuditIds.has(item.id))
  ]

  const mergeInto = (targetId, records = []) => {
    if (!migrated.resources[targetId]) return
    const target = migrated.resources[targetId]
    for (const source of records) {
      if (!source?.id) continue
      const existingIndex = target.findIndex(item => item.id === source.id)
      const migratedRecord = existingIndex >= 0
        ? { ...clone(target[existingIndex]), ...clone(source) }
        : clone(source)
      if (existingIndex >= 0) target[existingIndex] = migratedRecord
      else target.unshift(migratedRecord)
    }
  }

  for (const [resourceId, records] of Object.entries(parsed.resources || {})) {
    if (resetLegacyTalentState && resourceId.startsWith('talent-')) continue
    if (migrated.resources[resourceId]) mergeInto(resourceId, records)
  }
  for (const condition of migrated.resources['talent-matching-rule'] || []) {
    const legacyMatch = String(condition.resultRange || '').match(/(-?\d+(?:\.\d+)?)\s*[–-]\s*(-?\d+(?:\.\d+)?)/)
    const min = talentRangeNumber(condition.resultMin ?? legacyMatch?.[1])
    const max = talentRangeNumber(condition.resultMax ?? legacyMatch?.[2])
    if (Number.isFinite(min) && Number.isFinite(max) && min <= max) {
      condition.resultMin = min
      condition.resultMax = max
      condition.resultRange = talentRangeLabel(min, max)
    }
  }

  // 旧浏览器缓存只迁移为当前最小闭环字段，不把修订号、快照或归档状态带回业务页面。
  for (const result of migrated.resources['talent-generation'] || []) {
    delete result.revision
    delete result.resultVersion
    delete result.reportVersion
  }
  for (const report of migrated.resources['talent-report'] || []) {
    if (!Array.isArray(report.results) && Array.isArray(report.contentSnapshot?.factors)) {
      const legacy = report.contentSnapshot
      report.results = legacy.factors.map((factor, index) => ({ factor:factor.factor, resultValue:factor.resultValue, resultRange:factor.resultRange, level:factor.level, note:legacy.notes?.[index] || '', nurtureContent:factor.candidateContent || legacy.nurture?.[index] || '' }))
    }
    delete report.revision
    delete report.reportVersion
    delete report.contentSnapshot
    delete report.attachment
    if (report.status === '已归档') report.status = '已撤回'
  }

  for (const appointment of migrated.resources['consultation-appointment'] || []) {
    const startMs = new Date(appointment.time || '').getTime()
    const endMs = new Date(appointment.endTime || '').getTime()
    if (Number.isFinite(startMs) && (!Number.isFinite(endMs) || endMs <= startMs)) {
      const nextEnd = new Date(startMs + 60 * 60 * 1000)
      const localEnd = new Date(nextEnd.getTime() - nextEnd.getTimezoneOffset() * 60 * 1000)
      appointment.endTime = localEnd.toISOString().slice(0, 16)
    }
    const normalizedStatus = { '待专家确认':'已预约', '待确认':'已预约', '已确认':'已预约', '待重新预约':'已预约' }[appointment.status]
    if (normalizedStatus) appointment.status = normalizedStatus
    if (!appointment.snapshot) appointment.snapshot = '系统按预约开始时间自动生成'
    if (!appointment.duration && Number.isFinite(startMs)) {
      const normalizedEndMs = new Date(appointment.endTime || '').getTime()
      appointment.duration = Number.isFinite(normalizedEndMs) && normalizedEndMs > startMs ? Math.round((normalizedEndMs - startMs) / 60000) : 60
    }
    if (appointment.invitationStatus === '等待专家回复') appointment.invitationStatus = '已通知'
  }
  for (const invitation of migrated.resources['consultation-invitation'] || []) {
    if (invitation.status === '待确认' || invitation.status === '待处理' || invitation.status === '已发送') invitation.status = '已通知'
  }

  return migrated
}

export function initStore(seedState) {
  seed = clone(seedState)
  seed.schemaVersion = EXPECTED_SCHEMA
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) state = clone(seed)
  else {
    try {
      state = migrateState(JSON.parse(raw))
    } catch (error) {
      state = clone(seed)
      if (typeof alert === 'function') queueMicrotask(() => alert('业务数据迁移失败，已恢复初始数据。原因：' + error.message))
    }
  }
  ensureClosure(state)
  if (state.visitOrder) updateFinanceStatus(state.visitOrder)
  persist()
  return state
}

export const getState = () => state
export const subscribe = listener => (listeners.push(listener), () => { listeners = listeners.filter(item => item !== listener) })

export function executeClosureAction(action, payload = {}, actor = { role:'platform' }) {
  const result = executeClosure(state, action, payload, actor)
  if (result?.changed !== false) save()
  return result
}

function recordFor(resourceId, matcher = () => true) { return state.resources[resourceId]?.find(matcher) }
function upsert(resourceId, id, patch) {
  const list = state.resources[resourceId] || (state.resources[resourceId] = [])
  let item = list.find(row => row.id === id)
  if (!item) { item = { id, name:id, code:id, status:'草稿', draft:true, referenced:false, updatedAt:now() }; list.unshift(item) }
  Object.assign(item, patch, { updatedAt:now() })
  return item
}

const talentResource = resourceId => resourceId.startsWith('talent-')
const talentName = (resourceId, values) => {
  const factor = values.factor || '天赋要素'
  if (resourceId === 'talent-factor') return factor
  if (resourceId === 'talent-level') return `${factor} ${values.level || '分级'}`
  if (resourceId === 'talent-note') return `${factor} ${values.level || '分级'}固定注解`
  if (resourceId === 'talent-age-condition') return `${factor} ${values.minAge || '?'}-${values.maxAge || '?'}岁条件`
  if (resourceId === 'talent-gender-condition') return `${factor} ${values.gender || '通用'}条件`
  if (resourceId === 'talent-level-condition') return `${factor} ${values.level || '分级'}匹配规则`
  if (resourceId === 'talent-nurture-content') return values.title || `${factor} ${values.level || '分级'}培养建议`
  if (resourceId === 'talent-content-library') return values.contentSet || '天赋内容库'
  if (resourceId === 'talent-content-binding') return `${values.reportType || '天赋报告'}内容绑定`
  if (resourceId === 'talent-generation') return `${values.customer || '客户'}天赋结果处理`
  if (resourceId === 'talent-report') return `${values.customer || '客户'}${values.reportType || '天赋报告'}`
  return values.name || '天赋业务记录'
}

function validateTalentRelations(resourceId, values, existing = {}) {
  if (!talentResource(resourceId)) return
  const merged = { ...existing, ...values }
  const rows = id => state.resources[id] || []
  const has = (id, predicate) => rows(id).some(predicate)
  if (['talent-level','talent-note','talent-age-condition','talent-gender-condition','talent-level-condition','talent-nurture-content'].includes(resourceId) && !has('talent-factor', row => row.factor === merged.factor)) throw new Error('请选择已存在的天赋要素')
  if (resourceId === 'talent-level') {
    const standards = resourceById('talent-level')?.fields?.find(field => field.name === 'level')?.options || []
    if (!standards.includes(merged.level)) throw new Error('请选择有效的分级标准')
  }
  if (['talent-note','talent-level-condition','talent-nurture-content'].includes(resourceId) && !has('talent-level', row => row.factor === merged.factor && row.level === merged.level)) throw new Error('请选择该要素下已存在的分级')
  if (['talent-age-condition','talent-gender-condition','talent-level-condition','talent-nurture-content','talent-content-binding'].includes(resourceId) && !has('talent-content-library', row => (row.contentSet || row.name) === merged.contentSet)) throw new Error('请选择已存在的内容库')
  if (resourceId === 'talent-level-condition' && merged.candidateContent && !has('talent-nurture-content', row => (row.title || row.name) === merged.candidateContent && row.factor === merged.factor && row.level === merged.level && row.contentSet === merged.contentSet)) throw new Error('候选培养内容与当前要素、分级或内容库不匹配')
  if (resourceId === 'talent-content-binding' && !String(merged.reportType || '').trim()) throw new Error('请选择报告类型')
}

const activeTalentRow = row => !['已停用', '停用', '已解绑', '无效'].includes(row?.status)
const talentRows = resourceId => state.resources[resourceId] || []
const currentTalentParentId = () => state.terminalDemo?.talent?.currentParentId || state.terminalDemo?.talent?.parentId || ''
const talentChildByIdNo = idNo => talentRows('talent-child').find(row => row.idNo === idNo)
const talentChildName = childId => recordFor('talent-child', row => row.id === childId)?.childName || '未匹配孩子'
const talentParentName = parentId => recordFor('talent-parent', row => row.id === parentId)?.parentName || '未匹配家长'

function parseTalentIdNo(idNo) {
  const normalized = String(idNo || '').trim().toUpperCase()
  if (!/^\d{17}[\dX]$/.test(normalized)) throw new Error('请输入有效的 18 位身份证号')
  const birthDate = `${normalized.slice(6, 10)}-${normalized.slice(10, 12)}-${normalized.slice(12, 14)}`
  if (Number.isNaN(new Date(`${birthDate}T00:00:00`).getTime())) throw new Error('身份证号中的出生日期无效')
  return { idNo:normalized, birthDate, gender:Number(normalized[16]) % 2 ? '男' : '女' }
}

const parseAgeRange = value => {
  const match = String(value || '').match(/(\d+)\s*[–-]\s*(\d+)/)
  return match ? { min:Number(match[1]), max:Number(match[2]) } : null
}

const ageAt = (birthDate, analyzedAt) => {
  const birth = new Date(`${birthDate}T00:00:00`)
  const date = new Date(analyzedAt)
  if (Number.isNaN(birth.getTime()) || Number.isNaN(date.getTime())) return null
  let age = date.getFullYear() - birth.getFullYear()
  if (date.getMonth() < birth.getMonth() || (date.getMonth() === birth.getMonth() && date.getDate() < birth.getDate())) age -= 1
  return age
}

function validateTalentMemberRelation(resourceId, values, existing = {}) {
  if (!['talent-child', 'talent-member-relation'].includes(resourceId)) return
  const merged = { ...existing, ...values }
  const parentId = merged.parentId
  const childId = resourceId === 'talent-child' ? existing.id : merged.childId
  if (!parentId || !recordFor('talent-parent', row => row.id === parentId && activeTalentRow(row))) throw new Error('请选择有效的家长账户')
  if (resourceId === 'talent-member-relation' && (!childId || !recordFor('talent-child', row => row.id === childId && activeTalentRow(row)))) throw new Error('请选择有效的孩子档案')
  const duplicateChild = resourceId === 'talent-child' && merged.idNo
    ? talentRows('talent-child').find(row => row.id !== existing.id && row.idNo === merged.idNo)
    : null
  if (duplicateChild) {
    const duplicateRelation = talentRows('talent-member-relation').find(row => row.childId === duplicateChild.id && activeTalentRow(row))
    if (duplicateRelation) {
      if (duplicateRelation.parentId === parentId) throw new Error('孩子已绑定该家长，请勿重复绑定')
      throw new Error(`孩子已绑定${talentParentName(duplicateRelation.parentId)}，请先解绑后再操作`)
    }
    throw new Error('该身份证号已存在孩子档案，请勿重复新增')
  }
  if (!childId) return
  const ignoredRelationId = resourceId === 'talent-member-relation'
    ? existing.id
    : resourceId === 'talent-child'
      ? talentRows('talent-member-relation').find(row => row.childId === existing.id && activeTalentRow(row))?.id
      : ''
  const existingRelation = talentRows('talent-member-relation').find(row => row.childId === childId && activeTalentRow(row) && row.id !== ignoredRelationId)
  if (existingRelation) {
    if (existingRelation.parentId === parentId) throw new Error('孩子已绑定该家长，请勿重复绑定')
    throw new Error(`孩子已绑定${talentParentName(existingRelation.parentId)}，请先解绑后再操作`)
  }
}

function applyTalentMemberIdentity(resourceId, values, existing = {}) {
  if (resourceId !== 'talent-child') return values
  const idNo = values.idNo || existing.idNo
  const identity = parseTalentIdNo(idNo)
  const parent = recordFor('talent-parent', row => row.id === (values.parentId || existing.parentId))
  return { ...values, idNo:identity.idNo, birthDate:identity.birthDate, gender:identity.gender, organization:values.organization || parent?.organization || existing.organization || '', channel:values.channel || parent?.channel || existing.channel || '', relationType:values.relationType || existing.relationType || '监护人' }
}

function validateTalentReportTypeOverlap(values, editingId = '') {
  const range = parseAgeRange(values.ageRange)
  if (!range) throw new Error('适用年龄段需使用“6–11 岁”格式')
  const gender = values.gender || '通用'
  const conflicts = talentRows('talent-report-type').filter(row => row.id !== editingId && activeTalentRow(row))
    .filter(row => ['通用', gender].includes(row.gender || '通用') || gender === '通用')
    .map(row => ({ row, range:parseAgeRange(row.ageRange) }))
    .find(item => item.range && range.min <= item.range.max && item.range.min <= range.max)
  if (conflicts) throw new Error(`年龄和性别条件与“${conflicts.row.reportType}”重叠，请调整匹配范围`)
}

const talentRangeNumber = value => value === '' || value === null || value === undefined ? null : Number(value)
const talentRangeLabel = (min, max) => `${min}–${max} 分`

function normalizeTalentResultRange(resourceId, values, existing = {}) {
  if (resourceId !== 'talent-matching-rule') return values
  const merged = { ...existing, ...values }
  const legacyMatch = String(merged.resultRange || '').match(/(-?\d+(?:\.\d+)?)\s*[–-]\s*(-?\d+(?:\.\d+)?)/)
  const min = talentRangeNumber(merged.resultMin ?? legacyMatch?.[1])
  const max = talentRangeNumber(merged.resultMax ?? legacyMatch?.[2])
  if (!Number.isFinite(min) || !Number.isFinite(max)) throw new Error('结果最小值和结果最大值必须填写数字')
  if (min > max) throw new Error('结果最小值不能大于最大值')
  return { ...values, resultMin:min, resultMax:max, resultRange:talentRangeLabel(min, max) }
}

const conditionRangeIncludes = (condition, value) => {
  const numericValue = Number(value)
  const min = talentRangeNumber(condition?.resultMin)
  const max = talentRangeNumber(condition?.resultMax)
  if (Number.isFinite(min) && Number.isFinite(max)) return numericValue >= min && numericValue <= max
  const match = String(condition?.resultRange || '').match(/(-?\d+(?:\.\d+)?)\s*[–-]\s*(-?\d+(?:\.\d+)?)/)
  return Boolean(match) && numericValue >= Number(match[1]) && numericValue <= Number(match[2])
}

function currentTalentRuleSnapshot(child, webhook, reportType) {
  const factorByCode = { LOGIC:'逻辑思维', FOCUS:'专注力' }
  const results = webhook.results.map(item => ({ ...item, factor:factorByCode[item.factorCode] || item.factorCode }))
  const factorRows = []
  const notes = []
  const nurture = []
  for (const result of results) {
    const condition = talentRows('talent-matching-rule')
      .filter(activeTalentRow)
      .filter(row => row.reportType === reportType.reportType && row.factor === result.factor)
      .filter(row => !row.contentSet || row.contentSet === reportType.contentSet)
      .filter(row => conditionRangeIncludes(row, result.resultValue))
      [0]
    if (!condition) throw new Error(`${result.factor}结果未匹配到生效的报告条件`)
    const level = talentRows('talent-level').find(row => activeTalentRow(row) && row.factor === result.factor && row.level === condition.level)
    const note = talentRows('talent-note').find(row => activeTalentRow(row) && row.factor === result.factor && row.level === condition.level)
    const candidates = talentRows('talent-nurture-content')
      .filter(activeTalentRow)
      .filter(row => row.contentSet === reportType.contentSet && row.factor === result.factor && row.level === condition.level)
      .filter(row => row.minAge == null || Number(row.minAge) <= ageAt(child.birthDate, webhook.analyzedAt))
      .filter(row => row.maxAge == null || Number(row.maxAge) >= ageAt(child.birthDate, webhook.analyzedAt))
      .filter(row => !row.gender || row.gender === '通用' || row.gender === child.gender)
    if (!level || !note || !candidates.length) throw new Error(`${result.factor}缺少分级、固定注解或培养内容配置`)
    const candidate = candidates[Math.floor(Math.random() * candidates.length)]
    factorRows.push({ factor:result.factor, resultValue:result.resultValue, conditionId:condition.id, resultRange:condition.resultRange || talentRangeLabel(condition.resultMin, condition.resultMax), level:condition.level, note:note.annotation, nurtureContent:candidate.title })
    notes.push(note.annotation)
    nurture.push(candidate.title)
  }
  return factorRows
}

function upsertTalentException(webhook, reason, childId = '', existingResult) {
  const receivedAt = now()
  const result = existingResult || {
    id:nextId('talent-generation'), name:'第三方天赋结果', code:'', externalReportId:webhook.externalReportId,
    childId, source:'接口回传', referenced:true, draft:false
  }
  Object.assign(result, {
    name:`${talentChildName(childId)}第三方结果`, childId, analyzedAt:webhook.analyzedAt, reportType:webhook.reportType,
    results:clone(webhook.results || []), receivedAt, completeness:'异常', status:'异常', exceptionReason:reason, result:reason, updatedAt:receivedAt
  })
  if (!existingResult) talentRows('talent-generation').unshift(result)
  let report = talentRows('talent-report').find(row => row.sourceResultId === result.id)
  if (!report) {
    report = { id:nextId('talent-report'), name:`${talentChildName(childId)}天赋报告`, childId, externalReportId:webhook.externalReportId, sourceResultId:result.id, referenced:true, draft:false }
    talentRows('talent-report').unshift(report)
  }
  Object.assign(report, { status:'异常', reportType:'待匹配', analyzedAt:webhook.analyzedAt, generatedAt:'', exceptionReason:reason, updatedAt:receivedAt })
  return { result, report }
}

function receiveTalentResult(webhook, options = {}) {
  const basicFields = ['externalReportId', 'reportType', 'analyzedAt']
  const missingField = basicFields.find(field => webhook?.[field] === undefined || webhook?.[field] === null || webhook?.[field] === '')
  const childIdentityMissing = !String(webhook?.childIdNo || webhook?.externalChildId || '').trim()
  if (missingField || childIdentityMissing || !Array.isArray(webhook?.results)) return { ok:false, status:'异常', reason:`接口字段${missingField || (childIdentityMissing ? 'childIdNo 或 externalChildId' : 'results')}不完整` }
  const existingResult = talentRows('talent-generation').find(row => row.externalReportId === webhook.externalReportId)
  if (existingResult && !options.force) return { ok:true, idempotent:true, resultId:existingResult.id, reportId:talentRows('talent-report').find(row => row.sourceResultId === existingResult.id)?.id || '', status:existingResult.status, summary:'重复回传已按第三方报告编号幂等处理' }
  const child = talentRows('talent-child').find(row => (webhook.childIdNo && row.idNo === webhook.childIdNo) || (webhook.externalChildId && row.externalChildId === webhook.externalChildId))
  if (!child) {
    const exception = upsertTalentException(webhook, '未匹配到孩子身份证号，无法生成报告', '', existingResult)
    save()
    return { ok:false, status:'异常', resultId:exception.result.id, reportId:exception.report.id, reason:exception.result.exceptionReason }
  }
  const resultCodes = new Set(webhook.results.map(item => item.factorCode))
  const missingCodes = ['LOGIC', 'FOCUS'].filter(code => !resultCodes.has(code))
  if (missingCodes.length) {
    const exception = upsertTalentException(webhook, `缺少必填要素结果：${missingCodes.join('、')}`, child.id, existingResult)
    save()
    return { ok:false, status:'异常', resultId:exception.result.id, reportId:exception.report.id, reason:exception.result.exceptionReason }
  }
  const analyzedAge = ageAt(child.birthDate, webhook.analyzedAt)
  const reportType = talentRows('talent-report-type').filter(activeTalentRow).find(row => {
    const range = parseAgeRange(row.ageRange)
    return range && analyzedAge !== null && analyzedAge >= range.min && analyzedAge <= range.max && ['通用', child.gender].includes(row.gender || '通用')
  })
  if (!reportType) {
    const exception = upsertTalentException(webhook, '未匹配到适用年龄和性别的匹配规则', child.id, existingResult)
    save()
    return { ok:false, status:'异常', resultId:exception.result.id, reportId:exception.report.id, reason:exception.result.exceptionReason }
  }
  try {
    const matchedResults = currentTalentRuleSnapshot(child, webhook, reportType)
    const generatedAt = now()
    const result = existingResult || { id:nextId('talent-generation'), code:'', referenced:true, draft:false }
    Object.assign(result, {
      name:`${child.childName}第三方结果`, childId:child.id, externalReportId:webhook.externalReportId, analyzedAt:webhook.analyzedAt,
      reportType:webhook.reportType, results:clone(webhook.results), source:'接口回传', completeness:'完整',
      status:'待发布', generatedAt, result:'身份、完整性、匹配规则和内容条件均已自动匹配', exceptionReason:'', updatedAt:generatedAt
    })
    if (!existingResult) talentRows('talent-generation').unshift(result)
    let report = talentRows('talent-report').find(row => row.sourceResultId === result.id)
    if (!report || (options.force && ['已发布', '已撤回'].includes(report.status))) {
      report = { id:nextId('talent-report'), sourceResultId:result.id, externalReportId:webhook.externalReportId, childId:child.id, referenced:true, draft:false }
      talentRows('talent-report').unshift(report)
    }
    Object.assign(report, {
      name:`${child.childName}${webhook.reportType || reportType.reportType}报告`, childId:child.id, customer:child.childName, externalReportId:webhook.externalReportId,
      reportType:webhook.reportType || reportType.reportType, sourceResultId:result.id, analyzedAt:webhook.analyzedAt, receivedAt:generatedAt,
      generatedAt, reportBody:'已按匹配条件、要素分级、固定注解和候选培养内容自动生成。', results:matchedResults, pdfFileName:'', pdfFileKey:'',
      status:'待发布', exceptionReason:'', updatedAt:generatedAt
    })
    const talent = state.terminalDemo.talent || (state.terminalDemo.talent = {})
    Object.assign(talent, { reportId:report.id, sourceResultId:result.id, selectedChildId:talent.selectedChildId || child.id, currentParentId:talent.currentParentId || currentTalentParentId(), status:'待发布', lastMessage:'第三方结果已自动生成待发布报告。' })
    save()
    return { ok:true, status:'待发布', resultId:result.id, reportId:report.id, summary:'第三方结果已自动校验并生成待发布报告' }
  } catch (error) {
    const exception = upsertTalentException(webhook, error.message, child.id, existingResult)
    save()
    return { ok:false, status:'异常', resultId:exception.result.id, reportId:exception.report.id, reason:exception.result.exceptionReason }
  }
}

export function receiveTalentResultWebhook(webhook) { return receiveTalentResult(webhook) }

function executeIndependentTalentAction(action, payload = {}) {
  const talent = state.terminalDemo.talent || (state.terminalDemo.talent = {})
  const report = payload.reportId && recordFor('talent-report', row => row.id === payload.reportId)
  if (action === 'talent-switch-child') {
    const relation = talentRows('talent-member-relation').find(row => row.parentId === currentTalentParentId() && row.childId === payload.childId && row.status === '有效')
    if (!relation) return { ok:false, reason:'当前家长没有这个孩子的有效绑定关系' }
    talent.selectedChildId = payload.childId
    save()
    return { ok:true, status:'已切换', summary:`已切换至${talentChildName(payload.childId)}` }
  }
  if (action === 'talent-unbind-member') {
    const relation = recordFor('talent-member-relation', row => row.id === payload.relationId)
    if (!relation || relation.status !== '有效') return { ok:false, reason:'未找到有效绑定关系' }
    relation.status = '已解绑'; relation.unboundAt = now(); relation.updatedAt = now()
    const child = recordFor('talent-child', row => row.id === relation.childId)
    if (child?.parentId === relation.parentId) child.parentId = ''
    save()
    return { ok:true, status:'已解绑', summary:'绑定关系已解绑，小程序不再展示该孩子报告' }
  }
  if (action === 'talent-member-import-template') {
    talent.memberImport = '模板已下载：会员导入模板.xlsx'; save(); return { ok:true, status:'模板已下载', summary:'会员 Excel 模板已下载' }
  }
  if (action === 'talent-member-import-preview') {
    talent.memberImport = '预览完成：2 条有效，1 条冲突（孩子已有有效家长）'; save(); return { ok:true, status:'预览完成', summary:'会员导入预览完成，冲突行不会覆盖已有关系' }
  }
  if (action === 'talent-member-import-errors') {
    if (!String(talent.memberImport || '').includes('预览完成')) return { ok:false, reason:'请先完成会员导入预览' }
    talent.memberImport = '错误明细已查看：第 3 行孩子已有有效家长关系'; save(); return { ok:true, status:'错误明细', summary:'已展示冲突行：需先解绑后再导入' }
  }
  if (action === 'talent-member-import-confirm') {
    if (!/(预览完成|错误明细)/.test(String(talent.memberImport || ''))) return { ok:false, reason:'请先完成会员导入预览' }
    talent.memberImport = '导入完成：仅写入有效行，冲突行已拒绝'; save(); return { ok:true, status:'导入完成', summary:'会员有效行已导入，冲突关系未覆盖' }
  }
  if (action === 'talent-upload-report-pdf') {
    if (!report) return { ok:false, reason:'未找到已有报告，不能单独上传 PDF' }
    if (!report.externalReportId || !report.sourceResultId) return { ok:false, reason:'报告缺少第三方结果来源，不能上传 PDF' }
    if (!['待发布', '已发布'].includes(report.status)) return { ok:false, reason:'仅待发布或已发布报告可以上传 PDF' }
    const fileName = String(payload.pdfFileName || payload.fileName || '').trim()
    if (!fileName.toLowerCase().endsWith('.pdf')) return { ok:false, reason:'只支持 PDF 文件' }
    report.pdfFileName = fileName
    report.pdfFileKey = String(payload.pdfFileKey || payload.fileKey || fileName)
    report.pdfUploadedAt = now()
    report.updatedAt = now()
    save()
    return { ok:true, status:report.status, summary:'PDF 附件已上传并替换当前文件' }
  }
  if (action === 'talent-rule-import-template' || action === 'talent-rule-import-preview') {
    talent.ruleImport = action === 'talent-rule-import-template' ? '模板已下载：天赋规则导入模板.xlsx' : '预览完成：格式、重复和关联关系检查通过'
    save()
    return { ok:true, status:action === 'talent-rule-import-template' ? '模板已下载' : '预览完成', summary:talent.ruleImport }
  }
  if (action === 'talent-preview-report') {
    if (!report) return { ok:false, reason:'未找到报告' }
    report.previewedAt = now(); save(); return { ok:true, status:report.status, summary:'报告预览已打开，展示已固化到报告的内容' }
  }
  if (action === 'publish-talent-report') {
    if (!report) return { ok:false, reason:'未找到报告' }
    if (report.status !== '待发布') return { ok:false, reason:'只有完整且待发布的报告可以发布' }
    report.status = '已发布'; report.publishedAt = now(); report.updatedAt = now()
    const source = recordFor('talent-generation', row => row.id === report.sourceResultId)
    if (source) source.status = '已发布'
    state.dashboard.publishedTalent = Number(state.dashboard.publishedTalent || 0) + 1
    save()
    return { ok:true, status:'已发布', summary:'报告已发布，小程序可查看' }
  }
  if (action === 'withdraw-talent-report') {
    if (!report) return { ok:false, reason:'未找到报告' }
    if (report.status !== '已发布') return { ok:false, reason:'只有已发布报告可以撤回' }
    report.status = '已撤回'; report.withdrawnAt = now(); report.updatedAt = now()
    const source = recordFor('talent-generation', row => row.id === report.sourceResultId)
    if (source) source.status = '已撤回'
    state.dashboard.publishedTalent = Math.max(0, Number(state.dashboard.publishedTalent || 0) - 1)
    save()
    return { ok:true, status:'已撤回', summary:'报告已撤回，小程序不再展示' }
  }
  if (action === 'talent-logout') { talent.loggedIn = false; save(); return { ok:true, status:'已退出', summary:'已退出小程序登录' } }
  if (action.startsWith('talent-')) return { ok:false, reason:'该动作不受独立天赋后台支持' }
  return null
}

export function queryRecords(resourceId, filters = {}) {
  const keyword = String(filters.keyword || '').trim().toLowerCase()
  const status = filters.status && filters.status !== '全部' ? filters.status : ''
  return clone((state.resources[resourceId] || []).filter(item => {
    const text = Object.values(item).filter(value => ['string','number'].includes(typeof value)).join(' ').toLowerCase()
    return (!keyword || text.includes(keyword)) && (!status || item.status === status)
  }))
}
export function getRecord(resourceId, id) { return clone(recordFor(resourceId, item => item.id === id) || null) }

function visitOrderStatus(visitOrder) {
  const submitted = new Set(visitOrder.submittedPlanTypes || [])
  if (submitted.has('health') && submitted.has('medical')) return 'health_medical_submitted'
  if (submitted.has('health')) return 'health_submitted'
  if (submitted.has('medical')) return 'medical_submitted'
  return 'draft'
}

const planLabel = planType => planType === 'medical' ? '医疗方案' : '健康管理方案'

function visitOrderLabel(visitOrder) {
  const submitted = new Set(visitOrder.submittedPlanTypes || [])
  if (submitted.has('health') && submitted.has('medical')) return '已开单·健康+医疗方案'
  if (submitted.has('health')) return '已开单·健康方案'
  if (submitted.has('medical')) return '已开单·医疗方案'
  return '待开单'
}

const financeStatusFor = (finance, visitOrder = {}) => {
  const receivable = Number(finance?.receivableAmount || 0)
  const paid = Number(finance?.paidAmount || 0)
  const refunding = Number(finance?.refundingAmount || 0)
  const refunded = Number(finance?.refundedAmount || 0)
  const hasOrder = Boolean(visitOrder.submittedPlanTypes?.length || finance?.snapshots?.length || receivable)
  if (!hasOrder) return '待生成订单'
  if (refunding > 0) return '退款中'
  if (refunded > 0 && refunded >= paid) return '已退款'
  if (!receivable || paid <= 0) return '待收款'
  return paid >= receivable ? '已结清' : '部分收款'
}

function ensureVisitOrderFinance(visitOrder) {
  visitOrder.finance = {
    receivableAmount:0,
    paidAmount:0,
    refundingAmount:0,
    refundedAmount:0,
    financeStatus:'待收款',
    invoiceStatus:'待申请',
    reconciliationStatus:'待对账',
    snapshots:[],
    paymentRecords:[],
    refundRequests:[],
    invoiceRecords:[],
    reconciliationRecords:[],
    timeline:[],
    ...(visitOrder.finance || {})
  }
  const latestSnapshot = visitOrder.finance.snapshots?.at(-1)
  const calculatedReceivable = calculateReceivable(visitOrder)
  if (latestSnapshot) visitOrder.finance.receivableAmount = Number(latestSnapshot.receivableAmount || calculatedReceivable)
  else if (!Number(visitOrder.finance.receivableAmount || 0) && calculatedReceivable) visitOrder.finance.receivableAmount = calculatedReceivable
  visitOrder.finance.financeStatus = financeStatusFor(visitOrder.finance, visitOrder)
  visitOrder.source = { type:'customer-service', label:'客户服务订单', id:visitOrder.id, no:visitOrder.id, ...(visitOrder.source || {}) }
  visitOrder.backoffice = { status:visitOrder.finance.financeStatus, exceptionRecords:[], ...(visitOrder.backoffice || {}) }
  visitOrder.backoffice.status = visitOrder.finance.financeStatus
  return visitOrder.finance
}

function recordFinanceTimeline(visitOrder, action, detail, actor = '后台管理') {
  const finance = ensureVisitOrderFinance(visitOrder)
  const entry = { id:nextId('order-timeline'), time:now(), action, detail, actor }
  finance.timeline.unshift(entry)
  audit(action, visitOrder.orderId || visitOrder.id, detail, actor, 'finance-order')
  return entry
}

function calculateReceivable(visitOrder) {
  return [...new Set(visitOrder.submittedPlanTypes || [])]
    .reduce((sum, type) => sum + Number(visitOrder[type]?.amount || 0), 0)
}

function createOrderSnapshot(visitOrder, reason = '方案提交') {
  const finance = ensureVisitOrderFinance(visitOrder)
  const version = finance.snapshots.length + 1
  const snapshot = {
    reportType,
    createdAt:now(),
    reason,
    locked:false,
    receivableAmount:calculateReceivable(visitOrder),
    plans: (visitOrder.submittedPlanTypes || []).map(type => ({
      type,
      label:planLabel(type),
      amount:Number(visitOrder[type]?.amount || 0),
      servicePeriod:visitOrder[type]?.servicePeriod || '',
      items:clone(visitOrder[type]?.items || []),
      implementationPlan:clone(visitOrder.implementationPlans?.[type] || {})
    }))
  }
  finance.snapshots.push(snapshot)
  finance.currentSnapshotVersion = version
  finance.receivableAmount = snapshot.receivableAmount
  finance.financeStatus = financeStatusFor(finance, visitOrder)
  visitOrder.backoffice.status = finance.financeStatus
  return snapshot
}

function syncFinanceResources(visitOrder) {
  const finance = ensureVisitOrderFinance(visitOrder)
  const order = recordFor('finance-order', row => row.visitOrderId === visitOrder.id || row.id === visitOrder.orderId)
  if (order) {
    order.sourceType = visitOrder.source.type
    order.sourceId = visitOrder.source.id
    order.sourceNo = visitOrder.source.no
    order.businessStatus = visitOrder.status
    order.fundStatus = finance.financeStatus
    order.executionStatus = visitOrder.medical?.nurseTaskStatus || visitOrder.implementationPlans?.health?.status || '未执行'
    order.amount = finance.receivableAmount
    order.receivableAmount = finance.receivableAmount
    order.paid = finance.paidAmount
    order.paidAmount = finance.paidAmount
    order.refunded = finance.refundedAmount
    order.refundedAmount = finance.refundedAmount
    order.refundingAmount = finance.refundingAmount
    order.snapshotVersion = finance.currentSnapshotVersion || 0
    order.invoiceStatus = finance.invoiceStatus
    order.reconciliationStatus = finance.reconciliationStatus
    order.updatedAt = now()
  }
}

function updateFinanceStatus(visitOrder) {
  const finance = ensureVisitOrderFinance(visitOrder)
  finance.paidAmount = finance.paymentRecords
    .filter(item => item.status === '已确认')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)
  finance.refundingAmount = finance.refundRequests
    .filter(item => ['待审批', '待退款'].includes(item.status))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)
  finance.refundedAmount = finance.refundRequests
    .filter(item => item.status === '已退款')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)
  finance.financeStatus = financeStatusFor(finance, visitOrder)
  visitOrder.backoffice.status = finance.financeStatus
  visitOrder.backoffice.updatedAt = now()
  syncFinanceResources(visitOrder)
}

function paymentRecordFor(visitOrder, id) {
  return ensureVisitOrderFinance(visitOrder).paymentRecords.find(item => item.id === id)
    || recordFor('finance-payment', item => item.id === id)
}

function refundRecordFor(visitOrder, id) {
  return ensureVisitOrderFinance(visitOrder).refundRequests.find(item => item.id === id)
    || recordFor('finance-refund', item => item.id === id)
}

/**
 * 运行一期初诊/复诊客单的本地演示状态机，不调用正式 API。
 */
export function executeVisitOrderAction(action, payload = {}) {
  const visitOrder = state.visitOrder
  if (!visitOrder) return { ok:false, reason:'当前业务数据缺少初诊/复诊客单' }
  ensureVisitOrderFinance(visitOrder)
  const demo = state.terminalDemo || {}
  const inventory = demo.inventory
  const healthDemo = demo.healthPlan
  const medicalUse = demo.medicalUse
  const planType = payload.planType === 'medical' ? 'medical' : 'health'
  const syncOrderRecord = () => {
    const record = recordFor('finance-order', row => row.visitOrderId === visitOrder.id || row.id === visitOrder.orderId)
    if (!record) return
    record.name = `${visitOrder.visitType === 'revisit' ? '复诊' : '初诊'}客单 · ${visitOrder.customer}`
    record.planSummary = visitOrderLabel(visitOrder).replace('已开单·', '')
    record.status = visitOrder.handoffStatus === '已转后台处理' ? visitOrder.finance.financeStatus : '待收款'
    record.updatedAt = now()
  }
  const ensureOrder = () => {
    if (!visitOrder.orderId) {
      const existing = recordFor('finance-order', row => row.visitOrderId === visitOrder.id)
      if (existing) visitOrder.orderId = existing.id
      else {
        const orderId = nextId('finance-order')
        state.resources['finance-order'].unshift({
          id:orderId,
          code:orderId,
          name:visitOrderLabel(visitOrder),
          customer:visitOrder.customer,
          service:visitOrder.visitType === 'revisit' ? '复诊服务' : '初诊服务',
          amount:calculateReceivable(visitOrder),
          paid:0,
          status:'待收款',
          sourceType:visitOrder.source.type,
          sourceId:visitOrder.source.id,
          sourceNo:visitOrder.source.no,
          businessStatus:visitOrder.status,
          fundStatus:'待收款',
          executionStatus:'未执行',
          snapshotVersion:0,
          visitOrderId:visitOrder.id,
          referenced:true,
          draft:false,
          createdAt:now(),
          updatedAt:now()
        })
        visitOrder.orderId = orderId
      }
    }
    visitOrder.status = visitOrderStatus(visitOrder)
    ensureVisitOrderFinance(visitOrder)
  }
  if (action === 'update-plan-line') {
    const plan = visitOrder[planType]
    if (visitOrder.finance.snapshots.some(item => item.locked)) return { ok:false, reason:'财务已确认当前快照，方案调整必须走变更/补差流程' }
    const item = plan.items?.[Number(payload.itemIndex || 0)]
    if (!item) return { ok:false, reason:'未找到要修改的方案明细' }
    if (payload.field === 'material') item.material = String(payload.value || '').trim() || item.material
    if (payload.field === 'quantity') {
      const quantity = Math.max(1, Number(payload.value || 1))
      item.quantity = Number.isFinite(quantity) ? quantity : 1
    }
    plan.lastSavedAt = now()
    if (visitOrder.orderId && visitOrder.submittedPlanTypes.includes(planType)) {
      createOrderSnapshot(visitOrder, `${planLabel(planType)}明细调整`)
      syncFinanceResources(visitOrder)
    }
    save()
    return { ok:true, summary:'方案明细已更新' }
  }
  if (action === 'save-health-plan' || action === 'save-medical-plan') {
    visitOrder[planType].status = 'draft'
    visitOrder[planType].lastSavedAt = now()
    if (visitOrder.orderId && visitOrder.submittedPlanTypes.includes(planType)) {
      const current = visitOrder.finance.snapshots.at(-1)
      if (current?.locked) return { ok:false, reason:'财务已确认当前快照，方案调整必须走变更/补差流程' }
      createOrderSnapshot(visitOrder, `${planLabel(planType)}修改`)
      syncFinanceResources(visitOrder)
    }
    audit(`保存${planType === 'health' ? '健康管理' : '医疗'}方案`, visitOrder.id, visitOrder.customer, '客户服务')
    save()
    return { ok:true, summary:`${planType === 'health' ? '健康管理' : '医疗'}方案已保存` }
  }
  if (action === 'save-implementation-plan') {
    const implementationPlan = visitOrder.implementationPlans?.[planType]
    if (!implementationPlan?.unlocked) return { ok:false, reason:`请先提交${planLabel(planType)}，再保存对应实施计划` }
    implementationPlan.status = '已保存'
    implementationPlan.lastSavedAt = now()
    implementationPlan.records = implementationPlan.records || []
    implementationPlan.records.unshift({ time:implementationPlan.lastSavedAt, action:'保存实施计划', actor:'客户服务' })
    audit('保存实施计划', visitOrder.orderId || visitOrder.id, implementationPlan.title, '客户服务')
    save()
    return { ok:true, summary:`${implementationPlan.title}已保存` }
  }
  if (action === 'preview-plan') return { ok:true, summary:`${planLabel(planType)}打印预览已打开` }
  if (['confirm-order-snapshot','lock-order-snapshot'].includes(action)) {
    const finance = ensureVisitOrderFinance(visitOrder)
    const snapshot = finance.snapshots.find(item => item.version === Number(payload.version || finance.currentSnapshotVersion))
    if (!snapshot) return { ok:false, reason:'未找到订单快照' }
    finance.snapshots.forEach(item => { item.locked = item.version === snapshot.version })
    finance.snapshotLocked = true
    recordFinanceTimeline(visitOrder, '财务确认订单快照', `版本 V${snapshot.version}`)
    syncFinanceResources(visitOrder); save()
    return { ok:true, version:snapshot.reportType, summary:`订单快照 V${snapshot.version} 已锁定` }
  }
  if (action === 'favorite-plan') {
    const plan = visitOrder[planType]
    const favorite = { id:'FAV-' + String(state.counters.record + (state.favoriteTemplates?.length || 0) + 1).padStart(4, '0'), scope:'personal', planType, projectIds:[...(plan.projectIds || [])] }
    state.favoriteTemplates = state.favoriteTemplates || []
    state.favoriteTemplates.push(favorite)
    audit('收藏个人方案', favorite.id, `${planType === 'health' ? '健康管理' : '医疗'}方案项目组合`, '客户服务')
    save()
    return { ok:true, favorite:clone(favorite), summary:'个人方案已收藏，仅保存项目组合' }
  }
  if (action === 'select-favorite-plan') {
    const favorite = (state.favoriteTemplates || []).find(item => item.id === payload.favoriteId && item.planType === planType)
    if (!favorite) return { ok:false, reason:`暂无已收藏的${planLabel(planType)}个人方案` }
    visitOrder[planType].projectIds = [...favorite.projectIds]
    const previousItems = visitOrder[planType].items || []
    visitOrder[planType].items = favorite.projectIds.map((projectId, index) => {
      const catalogItem = visitProjectCatalog[projectId] || {}
      const previous = previousItems[index] || {}
      return {
        project:catalogItem.project || previous.project || projectId,
        material:catalogItem.material || previous.material || '待选择',
        materialOptions:previous.materialOptions || [catalogItem.material || previous.material || '待选择'],
        specification:catalogItem.specification || previous.specification || '待填写',
        quantity:previous.quantity || 1,
        availableQty:catalogItem.availableQty ?? previous.availableQty ?? 0
      }
    })
    visitOrder[planType].selectedFavoriteId = favorite.id
    save()
    return { ok:true, summary:`已带入个人${planLabel(planType)}项目组合` }
  }
  if (action === 'forward-to-backoffice') {
    if (!(visitOrder.submittedPlanTypes || []).length) return { ok:false, reason:'请先提交健康方案或医疗方案' }
    ensureOrder()
    visitOrder.handoffStatus = '已转后台处理'
    visitOrder.handoffAt = now()
    visitOrder.backoffice.status = visitOrder.finance.financeStatus
    syncOrderRecord()
    audit('转后台处理客单', visitOrder.orderId, visitOrderLabel(visitOrder), '客户服务')
    save()
    return { ok:true, orderId:visitOrder.orderId, summary:'客单已转后台处理' }
  }
  if (action === 'update-backoffice-status') {
    return { ok:false, reason:'资金状态由收款记录汇总，不能直接覆盖' }
  }
  if (['register-offline-payment','record-offline-payment','register-payment'].includes(action)) {
    const amount = Number(payload.amount || 0)
    const finance = ensureVisitOrderFinance(visitOrder)
    updateFinanceStatus(visitOrder)
    const available = finance.receivableAmount - finance.paidAmount
    if (!Number.isFinite(amount) || amount <= 0) return { ok:false, reason:'收款金额必须大于 0' }
    if (amount > available) return { ok:false, reason:`收款金额不能超过待收余额 ¥${available.toLocaleString()}` }
    const id = nextId('finance-payment')
    const record = {
      id,
      name:`${visitOrder.customer}线下收款 ${id}`,
      orderId:visitOrder.orderId,
      visitOrderId:visitOrder.id,
      snapshotVersion:finance.currentSnapshotVersion || 1,
      amount,
      paymentDate:payload.paymentDate || payload.receivedAt || now(),
      channel:payload.channel || '线下转账',
      transactionNo:payload.transactionNo || payload.serialNo || '',
      operator:payload.operator || '后台经办人',
      confirmer:payload.confirmer || payload.confirmedBy || '后台确认人',
      confirmedBy:payload.confirmed === false ? '' : (payload.confirmer || payload.confirmedBy || '后台确认人'),
      confirmedAt:payload.confirmed === false ? '' : now(),
      voucher:payload.voucher || payload.attachment || '',
      remark:payload.remark || '',
      status:payload.confirmed === false ? '待确认' : '已确认',
      createdAt:now(),
      updatedAt:now(),
      referenced:true,
      draft:false
    }
    finance.paymentRecords.unshift(record)
    state.resources['finance-payment'] = state.resources['finance-payment'] || []
    state.resources['finance-payment'].unshift(record)
    if (record.status === '已确认') {
      const snapshot = finance.snapshots.find(item => item.version === record.snapshotVersion)
      if (snapshot) {
        snapshot.locked = true
        snapshot.lockedAt = record.confirmedAt
        finance.snapshotLocked = true
      }
    }
    updateFinanceStatus(visitOrder)
    recordFinanceTimeline(visitOrder, '登记线下收款', `¥${amount.toLocaleString()} · ${record.channel} · ${record.transactionNo || '无流水号'}`)
    syncOrderRecord()
    save()
    return { ok:true, record:clone(record), status:finance.financeStatus, summary:`已登记线下收款 ¥${amount.toLocaleString()}` }
  }
  if (['confirm-offline-payment','confirm-payment'].includes(action)) {
    const record = paymentRecordFor(visitOrder, payload.recordId || payload.paymentRecordId)
    if (!record) return { ok:false, reason:'未找到收款记录' }
    if (record.status !== '待确认') return { ok:false, reason:'当前收款记录不可确认' }
    record.status = '已确认'
    record.confirmedBy = payload.confirmer || '后台确认人'
    record.confirmedAt = now()
    updateFinanceStatus(visitOrder)
    recordFinanceTimeline(visitOrder, '确认线下收款', record.id)
    syncOrderRecord(); save()
    return { ok:true, status:record.status, summary:'收款记录已确认' }
  }
  if (['reverse-offline-payment','unconfirm-payment'].includes(action)) {
    const record = paymentRecordFor(visitOrder, payload.recordId || payload.paymentRecordId)
    if (!record) return { ok:false, reason:'未找到收款记录' }
    if (record.status !== '已确认') return { ok:false, reason:'当前收款记录不可冲销' }
    record.status = '已冲销'
    record.reversedAt = now()
    record.reverseReason = payload.reason || '人工冲销'
    updateFinanceStatus(visitOrder)
    recordFinanceTimeline(visitOrder, '收款确认撤销/冲销', `${record.id} · ${record.reverseReason}`)
    syncOrderRecord(); save()
    return { ok:true, status:record.status, summary:'收款记录已冲销' }
  }
  if (['create-refund-application','create-refund-request'].includes(action)) {
    if (visitOrder.handoffStatus !== '已转后台处理') return { ok:false, reason:'客单尚未转后台处理' }
    const finance = ensureVisitOrderFinance(visitOrder)
    updateFinanceStatus(visitOrder)
    const amount = Number(payload.amount || 0)
    const available = finance.paidAmount - finance.refundedAmount - finance.refundingAmount
    if (!Number.isFinite(amount) || amount <= 0) return { ok:false, reason:'退款金额必须大于 0' }
    if (amount > available) return { ok:false, reason:`退款金额不能超过可退余额 ¥${available.toLocaleString()}` }
    const payment = paymentRecordFor(visitOrder, payload.paymentRecordId || payload.originalPaymentId)
    if (!payment) return { ok:false, reason:'请先选择原收款记录' }
    const id = nextId('finance-refund')
    const record = {
      id,
      name:`${visitOrder.customer}退款申请 ${id}`,
      orderId:visitOrder.orderId,
      visitOrderId:visitOrder.id,
      originalPaymentId:payment.id,
      snapshotVersion:finance.currentSnapshotVersion || 1,
      amount,
      items:payload.items || '对应原收款项目',
      reason:payload.reason || '',
      refundAccount:payload.refundAccount || '',
      applicant:payload.applicant || '客户服务',
      status:'草稿',
      createdAt:now(),
      updatedAt:now(),
      referenced:true,
      draft:false
    }
    finance.refundRequests.unshift(record)
    state.resources['finance-refund'] = state.resources['finance-refund'] || []
    state.resources['finance-refund'].unshift(record)
    recordFinanceTimeline(visitOrder, '创建退款申请', `${record.id} · ¥${amount.toLocaleString()}`)
    save()
    return { ok:true, record:clone(record), status:record.status, summary:'退款申请已创建' }
  }
  if (['submit-refund-application','submit-refund-request'].includes(action)) {
    const record = refundRecordFor(visitOrder, payload.recordId || payload.refundId)
    if (!record || record.status !== '草稿') return { ok:false, reason:'只有草稿退款申请可以提交审批' }
    record.status = '待审批'; record.submittedAt = now(); record.updatedAt = now()
    updateFinanceStatus(visitOrder); recordFinanceTimeline(visitOrder, '提交退款审批', record.id); syncOrderRecord(); save()
    return { ok:true, status:record.status, summary:'退款申请已提交审批' }
  }
  if (['approve-refund-application','approve-refund-request'].includes(action)) {
    const record = refundRecordFor(visitOrder, payload.recordId || payload.refundId)
    if (!record || record.status !== '待审批') return { ok:false, reason:'只有待审批退款申请可以审批' }
    record.status = '待退款'; record.approver = payload.approver || '财务负责人'; record.approvalOpinion = payload.opinion || '同意退款'; record.approvedAt = now(); record.updatedAt = now()
    updateFinanceStatus(visitOrder); recordFinanceTimeline(visitOrder, '退款申请审批通过', `${record.id} · ${record.approvalOpinion}`); syncOrderRecord(); save()
    return { ok:true, status:record.status, summary:'退款申请已审批通过，待线下执行' }
  }
  if (['reject-refund-application','reject-refund-request'].includes(action)) {
    const record = refundRecordFor(visitOrder, payload.recordId || payload.refundId)
    if (!record || record.status !== '待审批') return { ok:false, reason:'只有待审批退款申请可以驳回' }
    record.status = '已驳回'; record.approvalOpinion = payload.opinion || '审批驳回'; record.updatedAt = now()
    updateFinanceStatus(visitOrder); recordFinanceTimeline(visitOrder, '退款申请已驳回', `${record.id} · ${record.approvalOpinion}`); syncOrderRecord(); save()
    return { ok:true, status:record.status, summary:'退款申请已驳回' }
  }
  if (['cancel-refund-application','cancel-refund-request'].includes(action)) {
    const record = refundRecordFor(visitOrder, payload.recordId || payload.refundId)
    if (!record || !['草稿','待审批'].includes(record.status)) return { ok:false, reason:'当前退款申请不可取消' }
    record.status = '已取消'; record.cancelReason = payload.reason || '申请人取消'; record.updatedAt = now()
    updateFinanceStatus(visitOrder); recordFinanceTimeline(visitOrder, '退款申请已取消', `${record.id} · ${record.cancelReason}`); syncOrderRecord(); save()
    return { ok:true, status:record.status, summary:'退款申请已取消' }
  }
  if (['execute-offline-refund','confirm-refund','confirm-offline-refund'].includes(action)) {
    const record = refundRecordFor(visitOrder, payload.recordId || payload.refundId)
    if (!record || record.status !== '待退款') return { ok:false, reason:'退款申请尚未审批通过或已完成' }
    record.status = '已退款'
    record.refundDate = payload.refundDate || now()
    record.voucherNo = payload.voucherNo || payload.voucher || ''
    record.attachment = payload.attachment || ''
    record.executor = payload.executor || '出纳'
    record.confirmer = payload.confirmer || '财务负责人'
    record.executedAt = now(); record.updatedAt = now()
    updateFinanceStatus(visitOrder); recordFinanceTimeline(visitOrder, '完成线下退款', `${record.id} · ¥${Number(record.amount || 0).toLocaleString()}`); syncOrderRecord(); save()
    return { ok:true, status:record.status, summary:'线下退款已登记完成' }
  }
  if (['start-invoice','invoice-start'].includes(action)) {
    const finance = ensureVisitOrderFinance(visitOrder)
    if (!['待申请','已作废'].includes(finance.invoiceStatus)) return { ok:false, reason:'当前发票状态不可申请' }
    finance.invoiceStatus = '处理中'
    const record = { id:nextId('finance-invoice'), orderId:visitOrder.orderId, snapshotVersion:finance.currentSnapshotVersion || 1, status:'处理中', applicant:payload.applicant || '客户服务', createdAt:now(), updatedAt:now() }
    finance.invoiceRecords.unshift(record)
    state.resources['finance-invoice'] = state.resources['finance-invoice'] || []
    state.resources['finance-invoice'].unshift(record)
    recordFinanceTimeline(visitOrder, '发票申请进入处理', record.id); syncOrderRecord(); save()
    return { ok:true, record:clone(record), status:finance.invoiceStatus, summary:'发票申请已进入处理' }
  }
  if (['issue-invoice','invoice-issue'].includes(action)) {
    const finance = ensureVisitOrderFinance(visitOrder)
    const record = finance.invoiceRecords.find(item => item.id === payload.recordId) || finance.invoiceRecords[0]
    if (!record || record.status !== '处理中') return { ok:false, reason:'当前没有待开具发票' }
    record.status = '已开具'; record.invoiceNo = payload.invoiceNo || 'INV-' + record.id; record.issuedAt = now(); record.updatedAt = now(); finance.invoiceStatus = '已开具'
    recordFinanceTimeline(visitOrder, '发票已开具', record.invoiceNo); syncOrderRecord(); save()
    return { ok:true, status:record.status, summary:'发票已登记开具' }
  }
  if (['void-invoice','invoice-void'].includes(action)) {
    const finance = ensureVisitOrderFinance(visitOrder)
    const record = finance.invoiceRecords.find(item => item.id === payload.recordId) || finance.invoiceRecords.at(-1)
    if (!record || record.status !== '已开具') return { ok:false, reason:'只有已开具发票可以作废' }
    record.status = '已作废'; record.voidReason = payload.reason || '线下作废'; record.voidedAt = now(); record.updatedAt = now(); finance.invoiceStatus = '已作废'
    recordFinanceTimeline(visitOrder, '发票已作废', record.voidReason); syncOrderRecord(); save()
    return { ok:true, status:record.status, summary:'发票已作废' }
  }
  if (['start-reconciliation','reconciliation-start','reconciliation-difference'].includes(action)) {
    const finance = ensureVisitOrderFinance(visitOrder)
    const status = action === 'reconciliation-difference' ? '存在差异' : '待对账'
    finance.reconciliationStatus = status
    const record = { id:nextId('finance-reconciliation'), orderId:visitOrder.orderId, snapshotVersion:finance.currentSnapshotVersion || 1, status, differenceNote:payload.note || (status === '存在差异' ? '待财务复核' : ''), createdAt:now(), updatedAt:now() }
    finance.reconciliationRecords.unshift(record)
    state.resources['finance-reconciliation'] = state.resources['finance-reconciliation'] || []
    state.resources['finance-reconciliation'].unshift(record)
    recordFinanceTimeline(visitOrder, status === '存在差异' ? '对账登记差异' : '发起对账', record.id); syncOrderRecord(); save()
    return { ok:true, record:clone(record), status, summary:status === '存在差异' ? '已登记对账差异' : '对账已发起' }
  }
  if (['confirm-reconciliation','reconciliation-confirm'].includes(action)) {
    const finance = ensureVisitOrderFinance(visitOrder)
    const record = finance.reconciliationRecords.find(item => item.id === payload.recordId) || finance.reconciliationRecords[0]
    if (!record || !['待对账','存在差异'].includes(record.status)) return { ok:false, reason:'当前对账记录不可确认' }
    record.status = '已对账'; record.confirmedBy = payload.confirmer || '财务负责人'; record.confirmedAt = now(); record.updatedAt = now(); finance.reconciliationStatus = '已对账'
    recordFinanceTimeline(visitOrder, '对账已确认', record.id); syncOrderRecord(); save()
    return { ok:true, status:record.status, summary:'对账已确认' }
  }
  if (action === 'record-backoffice-exception') {
    if (visitOrder.handoffStatus !== '已转后台处理') return { ok:false, reason:'客单尚未转后台处理' }
    const record = { id:'EX-' + String((visitOrder.backoffice.exceptionRecords?.length || 0) + 1).padStart(3, '0'), type:payload.type || '作废记录', time:now() }
    visitOrder.backoffice.exceptionRecords = visitOrder.backoffice.exceptionRecords || []
    visitOrder.backoffice.exceptionRecords.push(record)
    syncOrderRecord()
    audit('登记客单异常记录', visitOrder.orderId, record.type, '后台管理')
    save()
    return { ok:true, record:clone(record), summary:`${record.type}已登记` }
  }
  if (action === 'submit-health-plan') {
    ensureOrder()
    const wasSubmitted = visitOrder.submittedPlanTypes.includes('health')
    if (!visitOrder.submittedPlanTypes.includes('health')) {
      const quantity = Number(visitOrder.health.items?.[0]?.quantity || 1)
      if (inventory && !visitOrder.health.inventoryCommitted) {
        if (quantity > Number(inventory.availableQty || 0)) return { ok:false, reason:'健康方案所需物料库存不足，暂不能提交' }
        inventory.availableQty = Math.max(0, Number(inventory.availableQty || 0) - quantity)
        inventory.lastFlow = `健康方案提交扣库存 · ${visitOrder.orderId}`
        inventory.costAmount = Number(inventory.costAmount || 0) + quantity * Number(inventory.unitCost || 0)
        visitOrder.health.inventoryCommitted = true
        if (visitOrder.health.items?.[0]) visitOrder.health.items[0].availableQty = Math.max(0, Number(visitOrder.health.items[0].availableQty || 0) - quantity)
      }
      visitOrder.submittedPlanTypes.push('health')
    }
    visitOrder.health.status = 'submitted'
    visitOrder.health.implementationUnlocked = true
    visitOrder.implementationPlans.health.unlocked = true
    visitOrder.implementationPlans.health.status = '待制定'
    visitOrder.status = visitOrderStatus(visitOrder)
    if (!wasSubmitted) createOrderSnapshot(visitOrder, '首次提交健康方案')
    if (healthDemo) {
      healthDemo.status = '已提交'
      healthDemo.stockChanged = true
      healthDemo.lastMessage = `健康方案已提交，已按一期规则扣减 ${Number(visitOrder.health.items?.[0]?.quantity || 1)} 件物料。`
    }
    syncOrderRecord()
    audit('提交健康管理方案', visitOrder.orderId, visitOrderLabel(visitOrder), '客户服务')
    save()
    return { ok:true, orderId:visitOrder.orderId, status:visitOrder.status, summary:'健康管理方案已提交并形成客单' }
  }
  if (action === 'submit-medical-plan') {
    const storedPreconditions = visitOrder.preconditionResult || { blocking:[], warnings:[] }
    const hasStoredPreconditions = Boolean(storedPreconditions.blocking?.length || storedPreconditions.warnings?.length)
    const preconditionResult = payload.preconditionResult || (hasStoredPreconditions ? storedPreconditions : {
      blocking: [],
      warnings: [{ project:'动态心电图', check:'近期心电报告', reason:'最近一次报告超过建议复核周期，请医生确认后继续。' }]
    })
    visitOrder.preconditionResult = clone(preconditionResult)
    if (preconditionResult.blocking?.length) {
      visitOrder.medical.pendingConfirmation = false
      save()
      return { ok:false, blocked:true, reason:'存在阻止型前置条件，医疗方案未提交', preconditionResult:clone(preconditionResult) }
    }
    if (preconditionResult.warnings?.length && !payload.confirmWarnings) {
      visitOrder.medical.pendingConfirmation = true
      save()
      return { ok:false, requiresConfirmation:true, reason:'存在提示型前置条件，请确认后提交', preconditionResult:clone(preconditionResult) }
    }
    ensureOrder()
    const wasSubmitted = visitOrder.submittedPlanTypes.includes('medical')
    if (!visitOrder.submittedPlanTypes.includes('medical')) visitOrder.submittedPlanTypes.push('medical')
    visitOrder.medical.status = 'submitted'
    visitOrder.medical.pendingConfirmation = false
    visitOrder.medical.nurseTaskStatus = '待护士确认'
    visitOrder.medical.implementationUnlocked = true
    visitOrder.implementationPlans.medical.unlocked = true
    visitOrder.implementationPlans.medical.status = '待制定'
    visitOrder.medical.inventoryCommitted = false
    visitOrder.status = visitOrderStatus(visitOrder)
    if (!wasSubmitted) createOrderSnapshot(visitOrder, visitOrder.finance.snapshots.length ? '提交医疗方案' : '首次提交医疗方案')
    if (medicalUse) {
      medicalUse.status = '待护士确认'
      medicalUse.taskStatus = '待护士确认'
      medicalUse.planLocked = true
      medicalUse.stockWrittenBack = false
      medicalUse.lastMessage = '医疗方案已提交，等待管理端护士核对客户、物料和实际出库数量。'
    }
    syncOrderRecord()
    audit('提交医疗方案并生成护士任务', visitOrder.orderId, visitOrderLabel(visitOrder), '客户服务')
    save()
    return { ok:true, orderId:visitOrder.orderId, status:visitOrder.status, summary:'医疗方案已提交，已生成待护士确认任务' }
  }
  return { ok:false, reason:'未找到初诊/复诊客单操作：' + action }
}

export function getConsultationConflict(values = {}, editingId = '') {
  const experts = consultationPeople(values.participants || values.experts || values.expert)
  const time = String(values.time || values.appointmentTime || '').trim()
  if (!experts.length || experts.includes('待选择') || !time) return '待选择专家和时间后检查'
  const start = new Date(time).getTime()
  if (!Number.isFinite(start)) return '待选择专家和时间后检查'
  const end = new Date(values.endTime || '').getTime() || start + 60 * 60 * 1000
  if (end <= start) return '结束时间必须晚于开始时间'
  const ignoredStatuses = /已取消|已归档|已关闭/
  const conflict = (state?.resources?.['consultation-appointment'] || []).some(item => {
    if (item.id === editingId || ignoredStatuses.test(String(item.status || ''))) return false
    const itemExperts = consultationPeople(item.participants || item.experts || item.expert)
    if (!experts.some(expert => itemExperts.includes(expert))) return false
    const itemStart = new Date(item.time || item.appointmentTime || '').getTime()
    if (!Number.isFinite(itemStart)) return false
    const itemEnd = new Date(item.endTime || '').getTime() || itemStart + 60 * 60 * 1000
    return start < itemEnd && itemStart < end
  })
  return conflict ? '存在冲突，请调整预约时间或更换专家' : '无冲突，可以提交预约'
}

const approvalResourceIds = new Set(['purchase-request', 'finance-refund'])
const approvalActionLabels = {
  draft: '保存审批草稿', save: '保存审批草稿', submit: '提交审批流程', 'submit-start': '提交审批流程',
  approve: '审批通过', reject: '审批驳回', return: '退回上一步', supplement: '补充材料', transfer: '转办审批',
  claim: '认领任务', unclaim: '取消认领', delegate: '委派任务', resolve: '解决委派', assign: '指定办理人'
}

function approvalData() {
  if (!state.approval) state.approval = { forms:[], flows:[], instances:[], tasks:[], messages:[], notices:[], expressions:[], listeners:[] }
  for (const key of ['forms', 'flows', 'instances', 'tasks', 'messages', 'notices', 'expressions', 'listeners']) {
    if (!Array.isArray(state.approval[key])) state.approval[key] = []
  }
  return state.approval
}

function approvalNextId(prefix) {
  state.counters.record += 1
  return `${prefix}-${String(state.counters.record).padStart(4, '0')}`
}

function approvalBusiness(resourceId, businessId) {
  if (!approvalResourceIds.has(resourceId)) return null
  return recordFor(resourceId, row => row.id === businessId)
}

function approvalFlowFor(resourceId, data = approvalData(), flowId = '') {
  const expected = resourceId === 'purchase-request' ? /采购/ : /退款/
  if (flowId) {
    const selected = data.flows.find(flow => flow.id === flowId)
    if (!selected || selected.status !== '已发布' || !expected.test(selected.name)) return null
    return selected
  }
  return data.flows.find(flow => flow.status === '已发布' && expected.test(flow.name)) || null
}

const activeApprovalTaskStatuses = new Set(['待处理', '待认领', '委派中'])
const taskCanHandle = task => activeApprovalTaskStatuses.has(task?.status)

function snapshotApprovalVersion(item, status = item.status) {
  item.versions = item.versions || []
  const version = Number(item.version || 1)
  const existing = item.versions.find(entry => Number(entry.version) === version)
  const snapshot = { reportType, status, savedAt:now() }
  if (existing) Object.assign(existing, snapshot)
  else item.versions.push(snapshot)
}

function createApprovalTask(instance, node, assignee = '') {
  const data = approvalData()
  const duplicate = data.tasks.find(task => task.instanceId === instance.id && task.nodeId === node.id && taskCanHandle(task))
  if (duplicate) return duplicate
  const task = {
    id:approvalNextId('TASK'), instanceId:instance.id, businessId:instance.businessId, resourceId:instance.resourceId,
    nodeId:node.id, nodeName:node.name, status:'待处理', assignee:assignee || node.assignee || '王主管',
    candidateUsers:[...new Set([assignee, ...(node.candidateUsers || []), node.assignee || '王主管'].filter(Boolean))], createdAt:now(), updatedAt:now()
  }
    data.tasks.unshift(task)
  syncApprovalTask(task, instance)
  return task
}

function nextApprovalNode(flow, instance, currentNode) {
  let cursor = currentNode
  const seen = new Set()
  while (cursor && !seen.has(cursor.id)) {
    seen.add(cursor.id)
    let edges = (flow.edges || []).filter(edge => edge.source === cursor.id)
    if (cursor.type === 'condition' && edges.length > 1) {
      const amount = Number(instance.formData?.amount || 0)
      const matching = edges.find(edge => amount > 10000 ? /大于|high|>/.test(edge.label || '') : /不超过|normal|<=/.test(edge.label || ''))
      edges = matching ? [matching] : [edges[0]]
    }
    const next = flow.nodes?.find(node => node.id === edges[0]?.target)
    if (!next) return null
    if (next.type === 'approval' || next.type === 'counterSign') return next
    const transientTask = { nodeId:next.id, nodeName:next.name }
    if (next.type === 'condition') appendApprovalTrace(instance, '条件分支判断', next.expression || edges[0]?.label || '按受控条件选择分支', transientTask)
    else if (next.type === 'cc') appendApprovalTrace(instance, '抄送', next.name, transientTask)
    else if (next.type === 'end') { appendApprovalTrace(instance, '到达结束节点', next.name, transientTask); return next }
    else appendApprovalTrace(instance, '流转节点', next.name, transientTask)
    cursor = next
  }
  return null
}

function appendApprovalTrace(instance, action, detail = '', task = null) {
  const trace = { id: approvalNextId('TRACE'), action, detail, actor: roleName(state.currentRole), time: now(), nodeId: task?.nodeId || instance.currentNodeId || '', nodeName: task?.nodeName || '' }
  instance.history = instance.history || []
  instance.history.push(trace)
  instance.records = instance.records || []
  instance.records.push(trace)
  instance.updatedAt = trace.time
  audit(action, instance.businessId || instance.id, detail || instance.title || instance.id, trace.actor, 'approval-task')
  return trace
}

function approvalMessage(instance, title, content, type = '业务通知') {
  const data = approvalData()
  const message = { id: approvalNextId('APMSG'), instanceId: instance.id, businessId: instance.businessId, type, title, content, unread: true, createdAt: now() }
  data.messages.unshift(message)
  const compatibility = { id: approvalNextId('approval-message'), name: title, code: instance.businessId, businessId: instance.businessId, instanceId: instance.id, messageType: type, audience: instance.initiator, summary: content, status: '未读', unread: true, referenced: true, draft: false, updatedAt: message.createdAt }
  state.resources['approval-message'] = state.resources['approval-message'] || []
  state.resources['approval-message'].unshift(compatibility)
  return message
}

function syncApprovalTask(task, instance) {
  const rows = state.resources['approval-task'] || (state.resources['approval-task'] = [])
  let compatibility = rows.find(row => row.businessId === task.businessId && row.instanceId === task.instanceId)
  if (!compatibility) {
    compatibility = { id: task.id, code: task.id, name: `${instance.title}审批`, businessId: task.businessId, instanceId: task.instanceId, referenced: true, draft: false }
    rows.unshift(compatibility)
  }
  Object.assign(compatibility, { owner: task.assignee || '待认领', status: task.status, node: task.nodeName, updatedAt: now() })
}

function approvalTaskFor(payload, data = approvalData()) {
  return data.tasks.find(task => task.id === payload.taskId) || data.tasks.find(task => task.businessId === payload.businessId && !['已完成', '已驳回', '已退回', '已撤销'].includes(task.status)) || null
}

function approvalFormField(action, payload, data) {
  const form = data.forms.find(item => item.id === payload.formId)
  if (!form) return { ok:false, reason:'未找到审批表单' }
  const fields = form.fields || (form.fields = [])
  if (action === 'add-form-field') {
    const field = { id: approvalNextId('FIELD'), name: payload.field?.name || payload.name || `field${fields.length + 1}`, label: payload.field?.label || payload.label || '未命名字段', type: payload.field?.type || payload.type || 'text', required: Boolean(payload.field?.required ?? payload.required) }
    fields.push(field)
    form.version = Number(form.version || 0) + 1
    audit('新增动态表单字段', form.id, field.label, undefined, 'approval-form')
    return { ok:true, form:clone(form), field:clone(field) }
  }
  const field = fields.find(item => item.id === payload.fieldId)
  if (!field) return { ok:false, reason:'未找到表单字段' }
  if (action === 'update-form-field') Object.assign(field, payload.field || payload.values || {})
  if (action === 'remove-form-field') fields.splice(fields.indexOf(field), 1)
  if (action === 'sort-form-field') {
    const index = fields.indexOf(field)
    const next = Math.max(0, Math.min(fields.length - 1, index + Number(payload.delta || (payload.direction === '下移' ? 1 : -1))))
    fields.splice(index, 1); fields.splice(next, 0, field)
  }
  form.version = Number(form.version || 0) + 1
  audit('维护动态表单字段', form.id, field.label, undefined, 'approval-form')
  return { ok:true, form:clone(form) }
}

function approvalFlowStructure(action, payload, data) {
  const flow = data.flows.find(item => item.id === payload.flowId)
  if (!flow) return { ok:false, reason:'未找到审批流程' }
  flow.nodes = flow.nodes || []; flow.edges = flow.edges || []
  if (action === 'add-flow-node') {
    const node = { id: approvalNextId('NODE'), type: payload.node?.type || payload.type || 'approval', name: payload.node?.name || payload.name || '审批节点', ...(payload.node || {}) }
    flow.nodes.push(node)
    if (payload.sourceId) flow.edges.push({ id: approvalNextId('EDGE'), source: payload.sourceId, target: node.id, label: payload.label || '' })
    audit('新增流程节点', flow.id, node.name, undefined, 'approval-flow')
    return { ok:true, flow:clone(flow), node:clone(node) }
  }
  const node = flow.nodes.find(item => item.id === payload.nodeId)
  if (!node) return { ok:false, reason:'未找到流程节点' }
  if (action === 'update-flow-node') Object.assign(node, payload.node || payload.values || {})
  if (action === 'remove-flow-node') {
    flow.nodes.splice(flow.nodes.indexOf(node), 1)
    flow.edges = flow.edges.filter(edge => edge.source !== node.id && edge.target !== node.id)
  }
  if (action === 'sort-flow-node') {
    const index = flow.nodes.indexOf(node)
    const next = Math.max(0, Math.min(flow.nodes.length - 1, index + Number(payload.delta || (payload.direction === '下移' ? 1 : -1))))
    flow.nodes.splice(index, 1); flow.nodes.splice(next, 0, node)
  }
  if (['add-flow-branch', 'update-flow-branch', 'remove-flow-branch', 'sort-flow-branch'].includes(action)) {
    node.branches = node.branches || []
    if (action === 'add-flow-branch') node.branches.push({ id: approvalNextId('BRANCH'), label: payload.branch?.label || '条件分支', expression: payload.branch?.expression || '' })
    else {
      const branch = node.branches.find(item => item.id === payload.branchId)
      if (!branch) return { ok:false, reason:'未找到条件分支' }
      if (action === 'update-flow-branch') Object.assign(branch, payload.branch || payload.values || {})
      if (action === 'remove-flow-branch') node.branches.splice(node.branches.indexOf(branch), 1)
      if (action === 'sort-flow-branch') {
        const index = node.branches.indexOf(branch)
        const next = Math.max(0, Math.min(node.branches.length - 1, index + Number(payload.delta || (payload.direction === '下移' ? 1 : -1))))
        node.branches.splice(index, 1); node.branches.splice(next, 0, branch)
      }
    }
  }
  flow.version = Number(flow.version || 0) + 1
  audit('维护审批流程结构', flow.id, node.name, undefined, 'approval-flow')
  return { ok:true, flow:clone(flow) }
}

/**
 * 仅驱动业务页面内存与 localStorage 的 BPM 演示状态；审批通过只回写申请状态和消息，不写库存或资金账。
 */
export function executeApprovalAction(action, payload = {}) {
  const data = approvalData()
  const actionAliases = {
    'submit-start': 'submit', save: 'draft', 'approval-draft': 'draft', 'approval-submit-start': 'submit',
    complete: 'approve', 'approval-approve': 'approve', 'approval-reject': 'reject', 'approval-return': 'return', 'approval-supplement': 'supplement',
    'approval-transfer': 'transfer', 'approval-claim': 'claim', 'approval-unclaim': 'unclaim', 'approval-delegate': 'delegate',
    'approval-resolve': 'resolve', 'approval-assign': 'assign',
    'approval-form-field-add': 'add-form-field', 'form-field-add': 'add-form-field',
    'approval-form-field-update': 'update-form-field', 'form-field-update': 'update-form-field',
    'approval-form-field-remove': 'remove-form-field', 'form-field-remove': 'remove-form-field',
    'approval-form-field-sort': 'sort-form-field', 'form-field-sort': 'sort-form-field',
    'approval-flow-node-add': 'add-flow-node', 'flow-node-add': 'add-flow-node',
    'approval-flow-node-update': 'update-flow-node', 'flow-node-update': 'update-flow-node',
    'approval-flow-node-remove': 'remove-flow-node', 'flow-node-remove': 'remove-flow-node',
    'approval-flow-node-sort': 'sort-flow-node', 'flow-node-sort': 'sort-flow-node',
    'approval-flow-branch-add': 'add-flow-branch', 'flow-branch-add': 'add-flow-branch',
    'approval-flow-branch-update': 'update-flow-branch', 'flow-branch-update': 'update-flow-branch',
    'approval-flow-branch-remove': 'remove-flow-branch', 'flow-branch-remove': 'remove-flow-branch',
    'approval-flow-branch-sort': 'sort-flow-branch', 'flow-branch-sort': 'sort-flow-branch',
    'save-form': 'update-form', 'save-flow': 'update-flow', 'form-property-update': 'update-form', 'flow-property-update': 'update-flow',
    'message-read': 'read-message'
  }
  const normalizedAction = actionAliases[action] || action
  if (['add-form-field', 'update-form-field', 'remove-form-field', 'sort-form-field'].includes(normalizedAction)) {
    const result = approvalFormField(normalizedAction, payload, data); if (result.ok) save(); return result
  }
  if (['add-flow-node', 'update-flow-node', 'remove-flow-node', 'sort-flow-node', 'add-flow-branch', 'update-flow-branch', 'remove-flow-branch', 'sort-flow-branch'].includes(normalizedAction)) {
    const result = approvalFlowStructure(normalizedAction, payload, data); if (result.ok) save(); return result
  }
  if (normalizedAction === 'update-form') {
    const form = data.forms.find(item => item.id === payload.formId)
    if (!form) return { ok:false, reason:'未找到审批表单' }
    const values = payload.values || {}
    if (payload.name || values.name) form.name = payload.name || values.name
    if (payload.resourceId || values.resourceId) form.resourceId = payload.resourceId || values.resourceId
    if (payload.fieldId && (payload.field || values.field)) {
      const field = form.fields?.find(item => item.id === payload.fieldId)
      if (field) Object.assign(field, payload.field || values.field)
    }
    form.version = Number(form.version || 0) + 1
    audit('维护审批表单属性', form.id, form.name, undefined, 'approval-form'); save()
    return { ok:true, form:clone(form) }
  }
  if (normalizedAction === 'update-flow') {
    const flow = data.flows.find(item => item.id === payload.flowId)
    if (!flow) return { ok:false, reason:'未找到审批流程' }
    const values = payload.values || {}
    if (payload.formId || values.formId) flow.formId = payload.formId || values.formId
    if (payload.nodeId && (payload.node || values.node)) {
      const node = flow.nodes?.find(item => item.id === payload.nodeId)
      if (node) Object.assign(node, payload.node || values.node)
    }
    flow.version = Number(flow.version || 0) + 1
    audit('维护审批流程属性', flow.id, flow.name, undefined, 'approval-flow'); save()
    return { ok:true, flow:clone(flow) }
  }
  if (['add-expression', 'update-expression', 'remove-expression', 'add-listener', 'update-listener', 'remove-listener'].includes(normalizedAction)) {
    const isExpression = normalizedAction.includes('expression')
    const key = isExpression ? 'expressions' : 'listeners'
    const list = data[key]
    if (normalizedAction.startsWith('add-')) {
      const item = isExpression
        ? { id:approvalNextId('EXPR'), name:payload.name || '新表达式', expression:payload.expression || 'amount > 0', status:'启用' }
        : { id:approvalNextId('LISTENER'), name:payload.name || '新监听器', event:payload.event || '任务完成', handler:payload.handler || '消息通知', status:'启用' }
      list.unshift(item); audit(isExpression ? '新增审批表达式' : '新增流程监听器', item.id, item.name, undefined, isExpression ? 'approval-expression' : 'approval-listener'); save(); return { ok:true, item:clone(item) }
    }
    const item = list.find(row => row.id === payload[isExpression ? 'expressionId' : 'listenerId'] || row.id === payload.id)
    if (!item) return { ok:false, reason:'未找到配置项' }
    if (normalizedAction.startsWith('update-')) Object.assign(item, payload.values || payload.item || {})
    if (normalizedAction.startsWith('remove-')) list.splice(list.indexOf(item), 1)
    audit(isExpression ? '维护审批表达式' : '维护流程监听器', item.id, item.name, undefined, isExpression ? 'approval-expression' : 'approval-listener'); save(); return { ok:true, item:clone(item) }
  }
  if (normalizedAction === 'read-message') {
    const message = data.messages.find(item => item.id === payload.messageId)
    if (!message) return { ok:false, reason:'未找到审批消息' }
    message.unread = false
    const compatibility = (state.resources['approval-message'] || []).find(item => item.id === message.id || (item.businessId === message.businessId && item.summary === message.content))
    if (compatibility) { compatibility.unread = false; compatibility.status = '已读' }
    audit('审批消息标记已读', message.id, message.title, undefined, 'approval-message'); save(); return { ok:true, message:clone(message) }
  }
  if (['publish-form', 'withdraw-form', 'enable-form', 'disable-form', 'copy-form'].includes(normalizedAction)) {
    const form = data.forms.find(item => item.id === payload.formId)
    if (!form) return { ok:false, reason:'未找到审批表单' }
    if (normalizedAction === 'copy-form') {
      const copied = { ...clone(form), id:approvalNextId('FORM'), code:approvalNextId('FORM-CODE'), name:`${form.name}副本`, status:'草稿', version:1, usageRecords:[] }
      data.forms.unshift(copied); audit('复制审批表单', copied.id, copied.name, undefined, 'approval-form'); save(); return { ok:true, form:clone(copied) }
    }
    form.status = { 'publish-form':'已发布', 'withdraw-form':'已撤回', 'enable-form':'已启用', 'disable-form':'已停用' }[normalizedAction]
    form.version = Number(form.version || 0) + 1; snapshotApprovalVersion(form, form.status); audit('维护审批表单', form.id, form.status, undefined, 'approval-form'); save(); return { ok:true, form:clone(form) }
  }
  if (['publish-flow', 'withdraw-flow', 'enable-flow', 'disable-flow', 'copy-flow'].includes(normalizedAction)) {
    const flow = data.flows.find(item => item.id === payload.flowId)
    if (!flow) return { ok:false, reason:'未找到审批流程' }
    if (normalizedAction === 'copy-flow') {
      const copied = { ...clone(flow), id:approvalNextId('FLOW'), code:approvalNextId('FLOW-CODE'), name:`${flow.name}副本`, status:'草稿', version:1, runCount:0 }
      data.flows.unshift(copied); audit('复制审批流程', copied.id, copied.name, undefined, 'approval-flow'); save(); return { ok:true, flow:clone(copied) }
    }
    flow.status = { 'publish-flow':'已发布', 'withdraw-flow':'已撤回', 'enable-flow':'已启用', 'disable-flow':'已停用' }[normalizedAction]
    flow.version = Number(flow.version || 0) + 1; snapshotApprovalVersion(flow, flow.status); audit('维护审批流程', flow.id, flow.status, undefined, 'approval-flow'); save(); return { ok:true, flow:clone(flow) }
  }
  if (['draft', 'submit'].includes(normalizedAction)) {
    const resourceId = payload.resourceId
    const business = approvalBusiness(resourceId, payload.businessId)
    if (!business) return { ok:false, reason:'仅采购申请和退款申请可发起审批流程' }
    const flow = approvalFlowFor(resourceId, data, payload.flowId)
    if (!flow) return { ok:false, reason:'未找到已发布审批流程' }
    let instance = data.instances.find(item => item.businessId === business.id && !['已通过', '已驳回', '已撤销'].includes(item.status))
    if (!instance) {
      instance = { id:approvalNextId('PI'), flowId:flow.id, formId:flow.formId, businessId:business.id, resourceId, title:business.name || business.id, status:'草稿', initiator:payload.initiator || roleName(state.currentRole), currentNodeId:'', formData:{ ...business, ...(payload.formData || {}) }, attachments:payload.attachments || [], history:[], createdAt:now(), updatedAt:now() }
      data.instances.unshift(instance)
    } else Object.assign(instance.formData, payload.formData || {})
    if (normalizedAction === 'draft') {
      business.status = '草稿'; business.approvalInstanceId = instance.id; appendApprovalTrace(instance, '保存草稿', '动态表单草稿已保存'); save(); return { ok:true, instance:clone(instance), status:'草稿' }
    }
    const node = flow.nodes.find(item => item.type === 'approval')
    if (!node) return { ok:false, reason:'流程没有审批节点' }
    instance.status = '审批中'; instance.currentNodeId = node.id; instance.submittedAt = now(); business.status = '待审批'; business.draft = false; business.referenced = true; business.approvalInstanceId = instance.id
    const task = createApprovalTask(instance, node, payload.candidateUser || payload.assignee)
    appendApprovalTrace(instance, '提交审批流程', `已进入${node.name}`, task); approvalMessage(instance, `${instance.title}待审批`, `已提交${node.name}处理`, '待办提醒'); flow.runCount = Number(flow.runCount || 0) + 1; snapshotApprovalVersion(instance, instance.status); flow.usageRecords = flow.usageRecords || []; if (!flow.usageRecords.includes(instance.id)) flow.usageRecords.push(instance.id); const linkedForm = data.forms.find(item => item.id === flow.formId); if (linkedForm) { linkedForm.usageRecords = linkedForm.usageRecords || []; if (!linkedForm.usageRecords.includes(flow.id)) linkedForm.usageRecords.push(flow.id) } save()
    return { ok:true, instance:clone(instance), task:clone(task), status:instance.status }
  }
  const task = approvalTaskFor(payload, data)
  if (!task || !taskCanHandle(task)) return { ok:false, reason:'该审批任务已办理或当前不可操作' }
  if (task.status === '待认领' && !['claim', 'assign'].includes(normalizedAction)) return { ok:false, reason:'任务尚未认领，请先认领或指定办理人' }
  const instance = data.instances.find(item => item.id === task.instanceId)
  const business = instance && approvalBusiness(instance.resourceId, instance.businessId)
  if (!instance || !business) return { ok:false, reason:'审批任务关联的业务申请不存在' }
  const assignee = payload.assignee || payload.transferTo || payload.delegateTo || payload.user || roleName(state.currentRole)
  const attachments = Array.isArray(payload.attachments) ? payload.attachments.filter(Boolean) : []
  if (attachments.length) {
    task.attachments = [...new Set([...(task.attachments || []), ...attachments])]
    instance.attachments = [...new Set([...(instance.attachments || []), ...attachments])]
  }
  if (normalizedAction === 'approve') {
    task.status = '已完成'; task.opinion = payload.opinion || '同意'; task.completedAt = now(); appendApprovalTrace(instance, '审批通过', task.opinion, task); syncApprovalTask(task, instance)
    const flow = data.flows.find(item => item.id === instance.flowId)
    const currentNode = flow?.nodes?.find(node => node.id === task.nodeId)
    const nextNode = flow && nextApprovalNode(flow, instance, currentNode)
    if (nextNode && nextNode.type === 'end') { instance.status = '已通过'; instance.currentNodeId = ''; instance.completedAt = now(); business.status = '已通过'; business.approvedAt = now(); business.approvalNo = instance.id; approvalMessage(instance, `${instance.title}审批通过`, '审批已完成，业务申请状态已回写为已通过。') }
    else if (nextNode) { instance.status = '审批中'; instance.currentNodeId = nextNode.id; const nextTask = createApprovalTask(instance, nextNode, payload.nextAssignee); appendApprovalTrace(instance, '生成下一审批待办', `已进入${nextNode.name}`, nextTask); approvalMessage(instance, `${instance.title}进入${nextNode.name}`, '上一节点已完成，新的审批待办已生成。', '待办提醒') }
    else { instance.status = '审批中'; instance.currentNodeId = ''; approvalMessage(instance, `${instance.title}已完成当前节点`, '等待流程继续处理。', '流程通知') }
    snapshotApprovalVersion(instance, instance.status); save(); return { ok:true, task:clone(task), instance:clone(instance), status:business.status || instance.status }
  }
  if (normalizedAction === 'reject') {
    task.status = '已驳回'; task.reason = payload.reason || payload.opinion || '审批驳回'; instance.status = '已驳回'; business.status = '已驳回'; appendApprovalTrace(instance, '审批驳回', task.reason, task); approvalMessage(instance, `${instance.title}已驳回`, task.reason); syncApprovalTask(task, instance); save(); return { ok:true, task:clone(task), status:business.status }
  }
  if (normalizedAction === 'return') {
    task.status = '已退回'; task.reason = payload.reason || '退回发起人补充'; instance.status = '已退回'; business.status = '已退回'; appendApprovalTrace(instance, '退回上一步', task.reason, task); approvalMessage(instance, `${instance.title}已退回`, task.reason); syncApprovalTask(task, instance); save(); return { ok:true, task:clone(task), status:business.status }
  }
  if (normalizedAction === 'supplement') {
    task.status = '待补充材料'; task.supplementNote = payload.note || payload.reason || '请补充审批材料'; instance.status = '待补充材料'; business.status = '待补充材料'; appendApprovalTrace(instance, '补充材料', task.supplementNote, task); approvalMessage(instance, `${instance.title}需补充材料`, task.supplementNote); syncApprovalTask(task, instance); save(); return { ok:true, task:clone(task), status:business.status }
  }
  if (normalizedAction === 'transfer') { task.transferFrom = task.assignee; task.assignee = assignee; task.status = '待处理'; task.transferReason = payload.reason || ''; }
  else if (normalizedAction === 'claim') { task.assignee = assignee; task.claimedAt = now(); task.status = '待处理'; }
  else if (normalizedAction === 'unclaim') { task.assignee = ''; task.unclaimedAt = now(); task.status = '待认领'; }
  else if (normalizedAction === 'delegate') { task.delegatedFrom = task.assignee; task.delegateTo = assignee; task.assignee = assignee; task.status = '委派中'; }
  else if (normalizedAction === 'resolve') { task.resolvedAt = now(); task.assignee = task.delegatedFrom || task.assignee; task.delegateTo = ''; task.status = '待处理'; }
  else if (normalizedAction === 'assign') { task.assignee = assignee; task.assignedAt = now(); task.status = '待处理'; }
  else return { ok:false, reason:'未识别的审批动作：' + action }
  task.updatedAt = now(); appendApprovalTrace(instance, approvalActionLabels[normalizedAction] || normalizedAction, task.assignee || '待认领', task); syncApprovalTask(task, instance); approvalMessage(instance, `${instance.title}${approvalActionLabels[normalizedAction] || normalizedAction}`, `当前办理人：${task.assignee || '待认领'}`, '任务协同'); save()
  return { ok:true, task:clone(task), instance:clone(instance), status:task.status }
}

function consultationPeople(value) {
  const source = Array.isArray(value) ? value : String(value || '').split(/[，,、;；]/)
  return [...new Set(source.map(item => String(item || '').trim()).filter(Boolean))]
}

function consultationEndTime(time, duration, explicitEnd = '') {
  const startMs = new Date(String(time || '').trim()).getTime()
  if (!Number.isFinite(startMs)) return ''
  const explicitEndMs = new Date(String(explicitEnd || '').trim()).getTime()
  const durationMinutes = Number(duration)
  const minutes = Number.isFinite(durationMinutes) && durationMinutes > 0
    ? durationMinutes
    : Number.isFinite(explicitEndMs) && explicitEndMs > startMs
      ? (explicitEndMs - startMs) / 60000
      : 60
  const end = new Date(startMs + minutes * 60000)
  const localEnd = new Date(end.getTime() - end.getTimezoneOffset() * 60 * 1000)
  return localEnd.toISOString().slice(0, 16)
}

function consultationAppointmentFor(id) {
  return recordFor('consultation-appointment', item => item.id === id)
}

function consultationInvitationFor(id) {
  return recordFor('consultation-invitation', item => item.id === id)
}

function consultationRoomFor(appointmentId) {
  return recordFor('consultation-room', item => item.appointmentId === appointmentId)
}

function ensureConsultationRoom(appointment) {
  const existing = consultationRoomFor(appointment.id)
  if (existing) return existing
  const id = nextId('consultation-room')
  const room = {
    id,
    code:id,
    roomNo:`RTC-${appointment.id}`,
    name:`${appointment.name || appointment.topic || appointment.id} · 会诊房间`,
    appointmentId:appointment.id,
    customerId:appointment.customerId,
    customer:appointment.customer,
    time:appointment.time,
    endTime:appointment.endTime,
    recording:'未开始',
    actualParticipants:[],
    status:'待检查',
    referenced:true,
    draft:false,
    createdAt:now(),
    updatedAt:now()
  }
  state.resources['consultation-room'].unshift(room)
  return room
}

function ensureConsultationDevice(appointment, expert = '') {
  const existing = recordFor('consultation-device', item => item.appointmentId === appointment.id && (!expert || item.expert === expert))
  if (existing) return existing
  const id = nextId('consultation-device')
  const device = {
    id,
    code:id,
    name:`${expert || '参会人'}会前检查`,
    appointmentId:appointment.id,
    customerId:appointment.customerId,
    expert,
    identityCheck:'待检查',
    deviceCheck:'待检查',
    status:'待检查',
    referenced:true,
    draft:false,
    createdAt:now(),
    updatedAt:now()
  }
  state.resources['consultation-device'].unshift(device)
  return device
}

function consultationMessage(appointment, values = {}) {
  const id = nextId('approval-message')
  const message = {
    id,
    code:id,
    name:values.name || `${appointment.name || appointment.topic}会诊通知`,
    messageType:values.messageType || '会诊通知',
    businessId:appointment.id,
    invitationId:values.invitationId || '',
    audience:values.audience || appointment.initiator || '发起医生',
    summary:values.summary || appointment.question || '',
    status:'未读',
    unread:true,
    referenced:true,
    draft:false,
    createdAt:now(),
    updatedAt:now()
  }
  state.resources['approval-message'].unshift(message)
  return message
}

function markConsultationMessageRead(invitationId) {
  for (const message of state.resources['approval-message'] || []) {
    if (message.invitationId !== invitationId) continue
    message.unread = false
    message.status = '已读'
    message.updatedAt = now()
  }
}

/**
 * 运行四端职责演示的本地状态机。它只模拟跨端回写，不调用正式接口。
 */
export function executeTerminalAction(action, payload = {}) {
  const demo = state.terminalDemo
  if (!demo) return { ok:false, reason:'当前业务数据缺少四端状态' }
  const use = demo.medicalUse
  const inventory = demo.inventory
  const inquiry = demo.inquiry
  const consultation = demo.consultation
  const talent = demo.talent
  const visitOrder = state.visitOrder
  let result = { ok:true, status:'已完成', summary:'操作已完成' }
  const independentTalentResult = executeIndependentTalentAction(action, payload)
  if (independentTalentResult) return independentTalentResult
  const currentTalentResult = () => recordFor('talent-generation', row => row.id === payload.resultId || row.id === talent.sourceResultId) || recordFor('talent-generation')
  const syncTalentRecord = patch => {
    const record = recordFor('talent-report', row => row.id === payload.reportId || row.id === talent.reportId || row.sourceResultId === talent.sourceResultId) || recordFor('talent-report')
    if (record) Object.assign(record, patch, { updatedAt:now() })
    return record
  }
  const selectedReport = payload.reportId && recordFor('talent-report', row => row.id === payload.reportId)
  if (selectedReport) {
    const source = recordFor('talent-generation', row => row.id === selectedReport.sourceResultId)
    Object.assign(talent, {
      reportId:selectedReport.id,
      sourceResultId:selectedReport.sourceResultId,
      status:selectedReport.status,
      snapshot:selectedReport.snapshot || '',
      generationCount:Number(selectedReport.generationCount || (selectedReport.snapshot ? 1 : 0)),
      completeness:{ status:source?.completeness === '完整' ? '完整' : source?.completeness || '待校验', missingCount:source?.completeness === '缺失' ? 1 : 0 },
      contentMatched:source?.matchResult === '规则匹配成功'
    })
  }
  const selectedResult = payload.resultId && recordFor('talent-generation', row => row.id === payload.resultId)
  if (selectedResult) {
    const relatedReport = recordFor('talent-report', row => row.sourceResultId === selectedResult.id)
    Object.assign(talent, {
      sourceResultId:selectedResult.id,
      reportId:relatedReport?.id || '',
      status:relatedReport?.status || selectedResult.status,
      snapshot:relatedReport?.snapshot || '',
      generationCount:Number(relatedReport?.generationCount || (relatedReport?.snapshot ? 1 : 0)),
      completeness:{ status:selectedResult.completeness || '待校验', missingCount:selectedResult.completeness === '缺失' ? 1 : 0 },
      contentMatched:selectedResult.matchResult === '规则匹配成功'
    })
  }

  if (action === 'save-inquiry') {
    if (!inquiry.id) inquiry.id = 'INQ-' + String(state.counters.record + 1).padStart(6, '0')
    inquiry.status = '已保存'
    inquiry.lastMessage = '问诊记录已保存，可关联发起会诊。'
    audit('保存问诊记录', inquiry.id, inquiry.lastMessage, '服务端')
    result = { ...result, status:inquiry.status, summary:'问诊记录已保存' }
  } else if (action === 'accept-brain-draft') {
    inquiry.brainDraftAccepted = true
    inquiry.lastMessage = '智脑建议已采纳到问诊草稿，仍需医生逐条确认。'
    audit('采纳智脑建议草稿', inquiry.id || '未保存问诊', inquiry.lastMessage, '服务端')
    result = { ...result, status:inquiry.status, summary:'智脑建议已带入问诊草稿' }
  } else if (action === 'create-consultation') {
    const required = [
      ['customerId','客户'], ['topic','会诊主题'], ['question','问题描述'], ['expert','受邀专家'],
      ['time','会诊时间'], ['duration','会诊时长']
    ]
    const missing = required.find(([name]) => !String(payload[name] || '').trim())
    if (missing) return { ok:false, reason:`${missing[1]}不能为空` }
    const experts = consultationPeople(payload.expert || payload.experts || payload.participants)
    const endTime = consultationEndTime(payload.time, payload.duration, payload.endTime)
    if (!endTime) return { ok:false, reason:'会诊时间格式不正确' }
    const conflict = getConsultationConflict({ ...payload, time:payload.time, endTime, participants:experts })
    if (conflict !== '无冲突，可以提交预约') return { ok:false, reason:conflict }
    const id = nextId('consultation-appointment')
    const appointment = {
      id,
      code:id,
      name:String(payload.topic).trim(),
      topic:String(payload.topic).trim(),
      question:String(payload.question).trim(),
      customerId:String(payload.customerId).trim(),
      customer:String(payload.customer || inquiry.customer || '当前客户').trim(),
      initiator:String(payload.initiator || consultation.viewer || '陈医生').trim(),
      inquiryId:inquiry.id || '',
      expert:experts[0],
      participants:experts,
      time:String(payload.time).trim(),
      endTime,
      duration:Number(payload.duration),
      snapshot:'系统按预约开始时间自动生成',
      attachments:consultationPeople(payload.attachments || payload.attachment),
      result:conflict,
      status:'已预约',
      invitationStatus:'已通知',
      recordingStatus:'未开始',
      archiveStatus:'未归档',
      referenced:true,
      draft:false,
      createdAt:now(),
      updatedAt:now()
    }
    state.resources['consultation-appointment'].unshift(appointment)
    for (const expert of experts) {
      const invitationId = nextId('consultation-invitation')
      state.resources['consultation-invitation'].unshift({
        id:invitationId,
        code:invitationId,
        name:`${expert}会诊邀请`,
        appointmentId:id,
        customerId:appointment.customerId,
        expert,
        time:appointment.time,
        endTime:appointment.endTime,
        status:'已通知',
        result:'等待会诊开始',
        unread:true,
        referenced:true,
        draft:false,
        createdAt:now(),
        updatedAt:now()
      })
      consultationMessage(appointment, {
        name:`${expert}收到新的会诊邀请`,
        messageType:'会诊邀请',
        invitationId,
        audience:expert,
        summary:`${appointment.customer} · ${appointment.topic} · ${appointment.time}`
      })
    }
    inquiry.consultationStarted = true
    inquiry.consultationId = id
    consultation.id = id
    consultation.customer = appointment.customer
    consultation.expert = appointment.expert
    consultation.status = appointment.status
    consultation.lastMessage = '会诊预约已创建，专家邀请和未读站内消息已生成。'
    audit('创建会诊预约', id, `已邀请：${experts.join('、')}`, '服务端', 'consultation-appointment')
    result = { ...result, id, status:appointment.status, summary:'会诊预约已创建，专家通知已发送' }
  } else if (action === 'consultation-reschedule') {
    const appointment = consultationAppointmentFor(payload.appointmentId)
    if (!appointment) return { ok:false, reason:'未找到需要改期的会诊预约' }
    if (!String(payload.reason || '').trim()) return { ok:false, reason:'改期原因不能为空' }
    const nextEndTime = consultationEndTime(payload.time, payload.duration, payload.endTime)
    if (!nextEndTime) return { ok:false, reason:'新会诊时间格式不正确' }
    const nextValues = { ...appointment, time:payload.time, endTime:nextEndTime }
    const conflict = getConsultationConflict(nextValues, appointment.id)
    if (conflict !== '无冲突，可以提交预约') return { ok:false, reason:conflict }
    Object.assign(appointment, {
      time:String(payload.time).trim(),
      endTime:nextEndTime,
      duration:Number(payload.duration) || Math.round((new Date(nextEndTime).getTime() - new Date(payload.time).getTime()) / 60000),
      rescheduleReason:String(payload.reason).trim(),
      result:conflict,
      status:'已预约',
      invitationStatus:'已通知',
      updatedAt:now()
    })
    for (const invitation of state.resources['consultation-invitation'] || []) {
      if (invitation.appointmentId !== appointment.id || /已归档|已取消/.test(invitation.status)) continue
      invitation.time = appointment.time
      invitation.endTime = appointment.endTime
      invitation.status = '已通知'
      invitation.result = '预约已更新，请按新时间参加'
      invitation.unread = true
      invitation.updatedAt = now()
      consultationMessage(appointment, { name:`${invitation.expert}收到会诊改期通知`, messageType:'会诊改期', invitationId:invitation.id, audience:invitation.expert, summary:appointment.rescheduleReason })
    }
    audit('会诊改期', appointment.id, appointment.rescheduleReason, '发起医生', 'consultation-appointment')
    result = { ...result, id:appointment.id, status:appointment.status, summary:'会诊已改期，专家将收到更新通知' }
  } else if (action === 'consultation-cancel') {
    const appointment = consultationAppointmentFor(payload.appointmentId)
    if (!appointment) return { ok:false, reason:'未找到需要取消的会诊预约' }
    if (!String(payload.reason || '').trim()) return { ok:false, reason:'取消原因不能为空' }
    if (/进行中|待填写结论|待签署|已签署|已归档/.test(appointment.status)) return { ok:false, reason:'会诊已经开始，不能再取消预约' }
    appointment.status = '已取消'
    appointment.cancelReason = String(payload.reason).trim()
    appointment.updatedAt = now()
    for (const invitation of state.resources['consultation-invitation'] || []) {
      if (invitation.appointmentId !== appointment.id || invitation.status === '已归档') continue
      invitation.status = '已取消'
      invitation.result = appointment.cancelReason
      invitation.updatedAt = now()
      consultationMessage(appointment, { name:`${invitation.expert}收到会诊取消通知`, messageType:'会诊取消', invitationId:invitation.id, audience:invitation.expert, summary:appointment.cancelReason })
    }
    audit('取消会诊预约', appointment.id, appointment.cancelReason, '发起医生', 'consultation-appointment')
    result = { ...result, id:appointment.id, status:appointment.status, summary:'会诊预约已取消，参与人已收到通知' }
  } else if (action === 'consultation-message-read') {
    markConsultationMessageRead(payload.invitationId)
    result = { ...result, status:'已读', summary:'会诊邀请消息已标记为已读' }
  } else if (action === 'consultation-enter') {
    const invitation = consultationInvitationFor(payload.invitationId)
    if (!invitation) return { ok:false, reason:'未找到会诊邀请' }
    if (['已拒绝', '时间冲突'].includes(invitation.status)) return { ok:false, reason:'当前通知已标记为不可参与，请联系发起医生' }
    const appointment = consultationAppointmentFor(invitation.appointmentId)
    if (!appointment) return { ok:false, reason:'未找到会诊预约' }
    const enteredAt = String(payload.at || new Date().toISOString())
    const enteredMs = new Date(enteredAt).getTime()
    const startMs = new Date(appointment.time).getTime()
    const endMs = new Date(appointment.endTime).getTime()
    if (!Number.isFinite(enteredMs) || enteredMs < startMs - 15 * 60 * 1000) return { ok:false, reason:'预约开始前 15 分钟才开放参与会诊' }
    if (Number.isFinite(endMs) && enteredMs > endMs) return { ok:false, reason:'当前预约时间已经结束，请联系发起人改期' }
    const device = ensureConsultationDevice(appointment, invitation.expert)
    Object.assign(device, { identityCheck:'通过', cameraCheck:'正常', microphoneCheck:'正常', networkCheck:'正常', deviceCheck:'摄像头、麦克风和网络检查通过', status:'检查通过', checkedAt:enteredAt, updatedAt:now() })
    const room = ensureConsultationRoom(appointment)
    const actualParticipants = Array.isArray(room.actualParticipants) ? room.actualParticipants : []
    if (!actualParticipants.some(item => item.name === invitation.expert)) actualParticipants.push({ name:invitation.expert, invitationId:invitation.id, joinedAt:enteredAt, leftAt:'' })
    Object.assign(room, { actualParticipants, status:'进行中', recording:room.recording === '未开始' ? '录制准备完成' : room.recording, enteredAt, updatedAt:now() })
    appointment.actualParticipants = actualParticipants.map(item => item.name)
    appointment.status = '进行中'
    appointment.recordingStatus = room.recording
    invitation.status = '已参与'
    invitation.unread = false
    markConsultationMessageRead(invitation.id)
    appointment.updatedAt = now()
    audit('参与会诊', appointment.id, `${invitation.expert}完成设备和身份校验并入会`, invitation.expert, 'consultation-room')
    result = { ...result, id:appointment.id, roomId:room.id, status:appointment.status, summary:'设备和身份校验通过，已进入会诊' }
  } else if (action === 'consultation-finish') {
    const appointment = consultationAppointmentFor(payload.appointmentId)
    const room = appointment && consultationRoomFor(appointment.id)
    if (!appointment || !room || appointment.status !== '进行中') return { ok:false, reason:'当前没有进行中的会诊' }
    const finishedAt = String(payload.at || new Date().toISOString())
    room.actualParticipants = (room.actualParticipants || []).map(item => item.leftAt ? item : { ...item, leftAt:finishedAt })
    room.status = '已结束'
    room.finishedAt = finishedAt
    room.recording = '回调处理中'
    room.updatedAt = now()
    appointment.status = '待填写结论'
    appointment.actualParticipants = room.actualParticipants.map(item => item.name)
    appointment.recordingStatus = '回调处理中'
    appointment.updatedAt = now()
    audit('结束会诊', appointment.id, '实际参会和入离会时间已记录，等待发起医生填写结论', appointment.initiator, 'consultation-room')
    result = { ...result, id:appointment.id, status:appointment.status, summary:'会诊已结束，请由发起医生填写结论' }
  } else if (action === 'consultation-save-conclusion') {
    const appointment = consultationAppointmentFor(payload.appointmentId)
    if (!appointment) return { ok:false, reason:'未找到会诊预约' }
    if (!String(payload.conclusion || '').trim()) return { ok:false, reason:'会诊结论不能为空' }
    const room = consultationRoomFor(appointment.id)
    if (!room || room.status !== '已结束') return { ok:false, reason:'会诊结束后才能填写结论' }
    let conclusion = recordFor('consultation-conclusion', item => item.appointmentId === appointment.id)
    if (!conclusion) {
      const id = nextId('consultation-conclusion')
      conclusion = { id, code:id, name:`${appointment.name} · 会诊结论`, appointmentId:appointment.id, customerId:appointment.customerId, customer:appointment.customer, roomNo:room.roomNo, referenced:true, draft:false, createdAt:now() }
      state.resources['consultation-conclusion'].unshift(conclusion)
    }
    const actualParticipants = (room.actualParticipants || []).map(item => item.name)
    Object.assign(conclusion, {
      opinion:String(payload.conclusion).trim(),
      author:appointment.initiator,
      status:'待签署',
      signature:'',
      signatureTasks:actualParticipants.map(participant => ({ participant, status:'待签署', signedAt:'' })),
      updatedAt:now()
    })
    appointment.status = '待签署'
    appointment.conclusionStatus = '待签署'
    appointment.updatedAt = now()
    audit('填写会诊结论', appointment.id, '已按实际参会人生成签署任务', appointment.initiator, 'consultation-conclusion')
    result = { ...result, id:appointment.id, conclusionId:conclusion.id, status:appointment.status, summary:'会诊结论已保存，实际参会医生进入签署任务' }
  } else if (action === 'consultation-sign') {
    const appointment = consultationAppointmentFor(payload.appointmentId)
    const conclusion = appointment && recordFor('consultation-conclusion', item => item.appointmentId === appointment.id)
    const participant = String(payload.participant || '').trim()
    if (!appointment || !conclusion) return { ok:false, reason:'请先由发起医生填写会诊结论' }
    const task = (conclusion.signatureTasks || []).find(item => item.participant === participant)
    if (!task) return { ok:false, reason:'只有实际进入 RTC 的参与医生需要签署' }
    task.status = '已签署'
    task.signedAt = now()
    const signed = conclusion.signatureTasks.filter(item => item.status === '已签署')
    conclusion.signature = signed.map(item => item.participant).join('、')
    conclusion.status = signed.length === conclusion.signatureTasks.length ? '已签署' : '签署中'
    conclusion.updatedAt = now()
    appointment.signatureStatus = conclusion.status
    appointment.status = conclusion.status === '已签署' ? '待归档' : '待签署'
    appointment.updatedAt = now()
    audit('签署会诊结论', appointment.id, `${participant}已完成签署`, participant, 'consultation-conclusion')
    result = { ...result, id:appointment.id, status:appointment.status, summary:`${participant}已完成会诊结论签署` }
  } else if (action === 'consultation-recording-ready') {
    const appointment = consultationAppointmentFor(payload.appointmentId)
    const room = appointment && consultationRoomFor(appointment.id)
    if (!appointment || !room) return { ok:false, reason:'未找到会诊房间' }
    room.recording = '已保存'
    room.recordingUrl = String(payload.recordingUrl || 'prototype://consultation-recording')
    room.recordingCallbackAt = now()
    room.updatedAt = now()
    appointment.recordingStatus = '已保存'
    appointment.recordingUrl = room.recordingUrl
    appointment.updatedAt = now()
    audit('录像回调完成', appointment.id, '云端录像已保存，回看仍需独立权限', '系统', 'consultation-room')
    result = { ...result, id:appointment.id, status:'录像已保存', summary:'录像回调已完成，等待归档' }
  } else if (action === 'consultation-archive') {
    const appointment = consultationAppointmentFor(payload.appointmentId)
    const room = appointment && consultationRoomFor(appointment.id)
    const conclusion = appointment && recordFor('consultation-conclusion', item => item.appointmentId === appointment.id)
    if (!appointment || !conclusion || conclusion.status !== '已签署') return { ok:false, reason:'实际参会医生完成结论签署后才能归档' }
    if (!room || room.recording !== '已保存') return { ok:false, reason:'录像回调完成后才能归档' }
    let report = recordFor('consultation-report', item => item.appointmentId === appointment.id)
    if (!report) {
      const id = nextId('consultation-report')
      report = { id, code:id, name:`${appointment.name} · 会诊归档`, appointmentId:appointment.id, customerId:appointment.customerId, customer:appointment.customer, expert:appointment.expert, referenced:true, draft:false, createdAt:now() }
      state.resources['consultation-report'].unshift(report)
    }
    Object.assign(report, { roomNo:room.roomNo, signature:conclusion.signature, actualParticipants:room.actualParticipants, recordingStatus:room.recording, status:'已归档', archivedAt:now(), updatedAt:now() })
    appointment.status = '已归档'
    appointment.archiveStatus = '已归档'
    appointment.archivedAt = now()
    appointment.updatedAt = now()
    state.dashboard.archivedConsultations = Number(state.dashboard.archivedConsultations || 0) + 1
    audit('归档会诊', appointment.id, '结论、签署、实际参会记录和录像已归档', appointment.initiator, 'consultation-report')
    result = { ...result, id:appointment.id, reportId:report.id, status:appointment.status, summary:'会诊已完成归档' }
  } else if (action === 'start-consultation') {
    if (!inquiry.id) return { ok:false, reason:'请先保存问诊记录，取得关联编号后再发起会诊' }
    inquiry.consultationStarted = true
    consultation.inquiryId = inquiry.id
    consultation.status = '待预约'
    consultation.lastMessage = '会诊已关联当前问诊记录，等待填写预约信息。'
    audit('从问诊发起会诊', consultation.id, `关联问诊 ${inquiry.id}`, '服务端')
    result = { ...result, status:consultation.status, summary:'已从当前问诊发起会诊' }
  } else if (action === 'save-health-plan') {
    const visitResult = executeVisitOrderAction('submit-health-plan')
    return { ...visitResult, status:demo.healthPlan?.status || visitResult.status, summary:visitResult.summary || '健康管理方案已提交' }
  } else if (action === 'submit-medical-use') {
    const visitResult = executeVisitOrderAction('submit-medical-plan', { confirmWarnings:true })
    return { ...visitResult, status:demo.medicalUse?.status || '待护士确认', taskStatus:demo.medicalUse?.taskStatus || '待护士确认', summary:visitResult.summary || '医疗方案耗用申请已提交' }
  } else if (action === 'confirm-medical-outbound') {
    if (use.taskStatus !== '待护士确认') return { ok:false, reason:'当前没有待护士确认的库存操作申请' }
    const requestedQty = Number(use.requestedQty || 0)
    const actualQty = Math.max(0, Math.min(Number(payload.actualQty || requestedQty), requestedQty))
    if (!actualQty) return { ok:false, reason:'实际出库数量必须大于 0' }
    if (actualQty > inventory.availableQty) {
      return { ok:false, status:use.status, taskStatus:use.taskStatus, reason:`库存不足，当前可用 ${inventory.availableQty}，申请 ${actualQty}。` }
    }
    use.actualQty = actualQty
    use.status = '已确认出库'
    use.taskStatus = '已确认出库'
    use.stockWrittenBack = true
    use.lastMessage = `实际出库 ${actualQty} 件，后台管理已回写库存与成本。`
    inventory.availableQty -= actualQty
    inventory.costAmount += actualQty * inventory.unitCost
    inventory.lastFlow = `医疗方案耗用出库 · ${use.id}`
    if (visitOrder?.medical) {
      visitOrder.medical.nurseTaskStatus = use.status
      visitOrder.medical.inventoryCommitted = true
      if (visitOrder.medical.items?.[0]) visitOrder.medical.items[0].availableQty = inventory.availableQty
    }
    audit('护士确认实际出库', use.id, use.lastMessage, '管理端')
    result = { ...result, status:use.status, taskStatus:use.taskStatus, actualQty, summary:'护士已确认出库，库存和成本流水已回写' }
  } else if (action === 'withdraw-medical-use') {
    if (use.status !== '已确认出库') return { ok:false, reason:'当前方案没有可撤回的已确认出库结果' }
    if (use.stockWrittenBack && use.actualQty) {
      inventory.availableQty += Number(use.actualQty)
      inventory.costAmount = Math.max(0, inventory.costAmount - Number(use.actualQty) * inventory.unitCost)
      inventory.lastFlow = `撤回回补 · ${use.id}`
    }
    use.status = '已撤回'
    use.taskStatus = '已撤回'
    use.planLocked = false
    use.stockWrittenBack = false
    use.actualQty = 0
    use.lastMessage = '耗用申请已撤回，库存已回补，方案重新解锁。'
    if (visitOrder?.medical) {
      visitOrder.medical.nurseTaskStatus = '已撤回'
      visitOrder.medical.inventoryCommitted = false
      if (visitOrder.medical.items?.[0]) visitOrder.medical.items[0].availableQty = inventory.availableQty
    }
    audit('撤回医疗方案耗用申请', use.id, use.lastMessage, '服务端')
    result = { ...result, status:use.status, taskStatus:use.taskStatus, summary:'耗用申请已撤回，库存已回补' }
  } else {
    return { ok:false, reason:'未找到四端演示操作：' + action }
  }
  save()
  return result
}

function applySystemFields(resourceId, item, editingId = '') {
  const config = getWorkbenchConfig(resourceId)
  for (const field of config?.fields || []) {
    if (field.name === 'status') continue
    if (resourceId === 'consultation-appointment' && field.name === 'result') {
      item.result = getConsultationConflict(item, editingId)
      continue
    }
    if (field.system && (item[field.name] == null || item[field.name] === '')) item[field.name] = field.generated ? (editingId || item.id) : (field.systemDefault || '待系统处理')
  }
  return item
}

function editableValues(resourceId, values = {}) {
  const systemNames = new Set((getWorkbenchConfig(resourceId)?.fields || []).filter(field => field.system).map(field => field.name))
  return Object.fromEntries(Object.entries(values).filter(([name]) => !systemNames.has(name) && !['code', 'status'].includes(name)))
}

function validateRequiredFields(resourceId, values, existing = {}) {
  const config = getWorkbenchConfig(resourceId)
  const merged = { ...existing, ...values }
  const fields = (config?.formSections || []).flatMap(section => section.fields || []).map(field => typeof field === 'string' ? config.fields.find(item => item.name === field) : field).filter(Boolean)
  for (const field of fields) {
    if (field.required && !String(merged[field.name] ?? '').trim()) throw new Error((field.label || field.name) + '不能为空')
  }
}
export function createRecord(resourceId, values = {}) {
  const resource = resourceById(resourceId)
  if (!resource) throw new Error('未识别的业务资源')
  if (resourceId === 'talent-report') throw new Error('天赋报告只能由客户结果处理生成')
  let editable = editableValues(resourceId, values)
  editable = applyTalentMemberIdentity(resourceId, editable)
  editable = normalizeTalentResultRange(resourceId, editable)
  const hasNameField = resource.fields?.some(field => field.name === 'name')
  if (!talentResource(resourceId) && hasNameField && !String(editable.name || '').trim()) throw new Error(resource.entity + '名称不能为空')
  if (talentResource(resourceId)) editable.name = talentName(resourceId, editable)
  validateTalentRelations(resourceId, editable)
  validateTalentMemberRelation(resourceId, editable)
  if (resourceId === 'talent-report-type') validateTalentReportTypeOverlap(editable)
  validateRequiredFields(resourceId, editable)
  const config = getWorkbenchConfig(resourceId)
  const statusField = config?.fields?.find(field => field.name === 'status')
  const initialStatus = resourceId === 'consultation-invitation'
    ? '待确认'
    : statusField?.systemDefault || (config?.pageType === 'master' ? '已启用' : '草稿')
  const item = { id:nextId(resourceId), status:initialStatus, draft:initialStatus === '草稿', referenced:false, createdAt:now(), updatedAt:now(), ...editable }
  if (resourceId === 'talent-member-relation') item.status = '有效'
  if (!item.name) item.name = [item.material, item.supplier, item.warehouse, item.customer, item.purchaseOrder, resource.entity].filter(Boolean).slice(0, 2).join(' · ')
  applySystemFields(resourceId, item)
  state.resources[resourceId].unshift(item)
  if (resourceId === 'talent-child' && item.parentId) {
    const relation = { id:nextId('talent-member-relation'), name:`${talentParentName(item.parentId)}与${item.childName}`, parentId:item.parentId, childId:item.id, relationType:item.relationType || '监护人', organization:item.organization || '', channel:item.channel || '', status:'有效', referenced:true, draft:false, createdAt:now(), updatedAt:now() }
    state.resources['talent-member-relation'].unshift(relation)
  }
  if (!talentResource(resourceId)) audit('新增' + resource.entity, item.id, item.name, undefined, resourceId)
  save(); return clone(item)
}
export function updateRecord(resourceId, id, values = {}) {
  const item = recordFor(resourceId, row => row.id === id)
  if (!item) throw new Error('记录不存在')
  const editRestriction = getRecordEditRestriction(resourceId, item)
  if (editRestriction) throw new Error(editRestriction)
  let editable = editableValues(resourceId, values)
  editable = applyTalentMemberIdentity(resourceId, editable, item)
  editable = normalizeTalentResultRange(resourceId, editable, item)
  validateRequiredFields(resourceId, editable, item)
  if (talentResource(resourceId)) {
    Object.assign(editable, { name:talentName(resourceId, { ...item, ...editable }) })
    validateTalentRelations(resourceId, editable, item)
  }
  validateTalentMemberRelation(resourceId, editable, item)
  if (resourceId === 'talent-report-type') validateTalentReportTypeOverlap({ ...item, ...editable }, id)
  Object.assign(item, editable, { updatedAt:now() })
  if (resourceId === 'talent-child') {
    const relation = recordFor('talent-member-relation', row => row.childId === item.id && row.status === '有效')
    if (relation) Object.assign(relation, { relationType:item.relationType || relation.relationType, organization:item.organization || relation.organization, channel:item.channel || relation.channel, name:`${talentParentName(relation.parentId)}与${item.childName}`, updatedAt:now() })
  }
  applySystemFields(resourceId, item, id)
  if (!talentResource(resourceId)) audit('修改' + resourceById(resourceId).entity, id, editable.note || item.name, undefined, resourceId)
  save(); return clone(item)
}
function alternativeFor(resource, item) {
  // 基础资料被引用或已生效时统一停用，不能因为同时具备提交/撤回能力而误导为流程动作。
  if (resource.pageType === 'master' && resource.capabilities.includes('disable')) return 'resource-disable'
  const candidates = [
    ['withdraw','resource-withdraw'], ['cancel','resource-cancel'], ['void','resource-void'],
    ['archive','resource-archive'], ['disable','resource-disable']
  ]
  if (/已发布|已完成|已归档|已入库|验收通过/.test(item.status) && resource.capabilities.includes('archive')) return 'resource-archive'
  return candidates.find(([capability]) => resource.capabilities.includes(capability))?.[1] || 'resource-disable'
}

export function safeDeleteRecord(resourceId, id) {
  const resource = resourceById(resourceId)
  const list = state.resources[resourceId] || []
  const index = list.findIndex(item => item.id === id)
  if (index < 0) return { ok:false, mode:'missing', message:'记录不存在' }
  const item = list[index]
  const critical = ['finance-order','finance-payment','finance-refund','finance-invoice','finance-reconciliation','medical-report','doctor-order','consultation-appointment','consultation-room','consultation-conclusion','consultation-report','talent-report'].includes(resourceId)
  const physical = !critical && !item.referenced && (resource.pageType === 'master' || Boolean(item.draft) || ['草稿','未启用','待新建'].includes(item.status))
  if (physical) {
    list.splice(index, 1)
    if (!talentResource(resourceId)) audit('删除' + resource.entity, id, '草稿或未引用资料已物理删除', undefined, resourceId)
    save(); return { ok:true, mode:'deleted', message:item.name + '已删除' }
  }
  const alternativeAction = alternativeFor(resource, item)
  if (alternativeAction !== 'resource-disable') {
    return { ok:false, mode:'restricted', reason:'该记录属于已提交、已生效或关键业务数据，不能物理删除。', alternativeAction, message:'请使用允许的替代业务动作' }
  }
  item.status = '已停用'; item.updatedAt = now()
  if (!talentResource(resourceId)) audit('停用' + resource.entity, id, '记录已被引用或生效，未执行物理删除', undefined, resourceId)
  save(); return { ok:true, mode:'disabled', alternativeAction, message:item.name + '已被业务引用，已改为停用并保留历史' }
}

function inventoryBalanceKey(values = {}) {
  return [values.material, values.warehouse, values.location, values.batch].map(value => String(value || '')).join('|')
}

function inventoryBalanceFor(values = {}) {
  const key = inventoryBalanceKey(values)
  return (state.resources['inventory-ledger'] || []).find(item => inventoryBalanceKey(item) === key)
}

function inventoryQuantity(item) {
  return Number(item?.availableQty ?? item?.quantity ?? 0)
}

function changeInventoryBalance(values = {}) {
  const changeQty = Number(values.changeQty || 0)
  const existing = inventoryBalanceFor(values)
  const beforeQty = existing ? inventoryQuantity(existing) : 0
  const afterQty = beforeQty + changeQty
  if (afterQty < 0) return { ok:false, reason:'可用库存不足，不能完成本次库存变更' }
  if (existing) {
    existing.availableQty = afterQty
    existing.quantity = afterQty
    existing.updatedAt = now()
  } else if (afterQty > 0) {
    addGeneratedResource('inventory-ledger', {
      material:values.material,
      warehouse:values.warehouse,
      location:values.location,
      batch:values.batch,
      productionDate:values.productionDate || '',
      expiry:values.expiry || '',
      availableQty:afterQty,
      quantity:afterQty,
      source:values.sourceNo || values.businessNo || '库存调整',
      status:'正常',
      warningStatus:'正常',
      referenced:true,
      draft:false
    })
  }
  state.dashboard.inventoryQuantity = Math.max(0, Number(state.dashboard.inventoryQuantity || 0) + changeQty)
  return { ok:true, beforeQty, afterQty, existing:existing || inventoryBalanceFor(values) }
}

function writeInventoryFlow(values = {}) {
  return addGeneratedResource('inventory-flow', {
    flowType:values.flowType || '库存调整',
    businessNo:values.businessNo || values.sourceNo || '-',
    material:values.material || '',
    warehouse:values.warehouse || '',
    location:values.location || '',
    batch:values.batch || '',
    productionDate:values.productionDate || '',
    expiry:values.expiry || '',
    beforeQty:Number(values.beforeQty || 0),
    changeQty:Number(values.changeQty || 0),
    afterQty:Number(values.afterQty || 0),
    status:'已记账',
    referenced:true,
    draft:false
  })
}

function assetForCode(assetCode) {
  return (state.resources['asset-card'] || []).find(item => String(item.assetCode || item.id) === String(assetCode || ''))
}

function writeAssetLifecycle(asset, item, businessType, patch = {}) {
  if (!asset) return null
  return addGeneratedResource('asset-lifecycle', {
    assetCode:asset.assetCode || asset.id,
    businessType,
    businessNo:item.systemNo || item.businessNo || item.code || item.id,
    previousCustodian:patch.previousCustodian ?? asset.custodian ?? '',
    currentCustodian:patch.currentCustodian ?? asset.custodian ?? '',
    location:patch.location ?? asset.location ?? '',
    occurredAt:now(),
    status:patch.status || '已完成',
    referenced:true,
    draft:false
  })
}

function syncAssetAction(resourceId, item) {
  if (!['asset-use','asset-return','asset-transfer','asset-maintenance','asset-stocktake','asset-scrap','asset-depreciation'].includes(resourceId)) return null
  const asset = assetForCode(item.assetCode)
  if (!asset) return { ok:false, reason:'未找到关联资产档案' }
  const previousCustodian = asset.custodian || ''
  if (resourceId === 'asset-use') {
    asset.status = '使用中'
    asset.custodian = item.employee || item.custodian || asset.custodian || ''
    asset.department = item.department || item.requestDepartment || asset.department || ''
    asset.location = item.location || asset.location || ''
    writeAssetLifecycle(asset, item, '领用', { previousCustodian, currentCustodian:asset.custodian })
  } else if (resourceId === 'asset-return') {
    asset.status = '可用'
    asset.custodian = ''
    asset.department = ''
    asset.location = item.location || asset.location || ''
    writeAssetLifecycle(asset, item, '归还', { previousCustodian, currentCustodian:'' })
  } else if (resourceId === 'asset-transfer') {
    asset.organization = item.organization || asset.organization || ''
    asset.department = item.department || asset.department || ''
    asset.location = item.location || asset.location || ''
    writeAssetLifecycle(asset, item, '调拨', { previousCustodian, currentCustodian:asset.custodian })
  } else if (resourceId === 'asset-maintenance') {
    asset.status = item.maintenanceStatus === '已完成' ? '可用' : '维修中'
    writeAssetLifecycle(asset, item, '维修', { previousCustodian, currentCustodian:item.maintenanceVendor || asset.custodian, location:item.location || asset.location, status:asset.status === '维修中' ? '处理中' : '已完成' })
  } else if (resourceId === 'asset-stocktake') {
    writeAssetLifecycle(asset, item, '盘点', { previousCustodian, currentCustodian:asset.custodian, location:asset.location, status:'已完成' })
  } else if (resourceId === 'asset-scrap') {
    asset.status = '已报废'
    writeAssetLifecycle(asset, item, '报废', { previousCustodian, currentCustodian:'', status:'已完成' })
  } else if (resourceId === 'asset-depreciation') {
    const period = item.period || ''
    const duplicate = (state.resources['asset-depreciation'] || []).some(row => row !== item && row.assetCode === item.assetCode && row.period === period && row.status === '已计提')
    if (duplicate) return { ok:false, reason:'同一资产同一期间已计提折旧，不能重复确认' }
    const opening = Number(asset.netValue ?? asset.assetValue ?? 0)
    const usefulLife = Math.max(1, Number(asset.usefulLife || asset.depreciationYears * 12 || 60))
    const residualRate = Number(asset.residualRate || 0)
    const depreciation = Math.min(opening, Math.max(0, (Number(asset.assetValue || opening) * (1 - residualRate / 100)) / usefulLife))
    item.openingNetValue = opening
    item.depreciationAmount = Number(depreciation.toFixed(2))
    item.closingNetValue = Number(Math.max(0, opening - depreciation).toFixed(2))
    item.status = '已计提'
    asset.netValue = item.closingNetValue
    writeAssetLifecycle(asset, item, '折旧', { previousCustodian, currentCustodian:asset.custodian, status:'已完成' })
  }
  asset.updatedAt = now()
  return { ok:true, asset }
}

function requisitionAllocations(item) {
  if (Array.isArray(item.allocations) && item.allocations.length) return item.allocations
  return [{
    warehouse:item.warehouse,
    location:item.location,
    batch:item.batch,
    quantity:Number(item.quantity || item.requestedQty || 0)
  }]
}

function restoreRequisitionAllocations(item) {
  const allocations = Array.isArray(item.outboundAllocations) ? item.outboundAllocations : []
  for (const allocation of allocations) {
    const quantity = Number(allocation.outboundQty || allocation.quantity || 0)
    if (quantity <= 0) continue
    const changed = changeInventoryBalance({
      material:item.material,
      warehouse:allocation.warehouse,
      location:allocation.location,
      batch:allocation.batch,
      expiry:allocation.expiry,
      changeQty:quantity,
      businessNo:item.systemNo || item.businessNo || item.id,
      sourceNo:item.systemNo || item.businessNo || item.id
    })
    if (!changed.ok) return changed
    writeInventoryFlow({
      flowType:'撤回回补',
      businessNo:item.systemNo || item.businessNo || item.id,
      material:item.material,
      warehouse:allocation.warehouse,
      location:allocation.location,
      batch:allocation.batch,
      beforeQty:changed.beforeQty,
      changeQty:quantity,
      afterQty:changed.afterQty
    })
  }
  item.outboundAllocations = []
  item.outboundQty = 0
  item.remainingQty = Number(item.requestedQty || item.quantity || 0)
  return { ok:true }
}

export function executeResourceAction(resourceId, id, action, payload = {}) {
  if (action === 'resource-delete') return safeDeleteRecord(resourceId, id)
  if (resourceId === 'talent-report' && action === 'resource-archive') return { ok:false, reason:'天赋报告不支持归档，撤回后保持已撤回状态' }
  const definition = getActionDefinition(action)
  const resource = resourceById(resourceId)
  const item = recordFor(resourceId, row => row.id === id)
  if (!definition || !resource || !item) return { ok:false, reason:'未找到业务记录或动作' }
  if (resourceId === 'consultation-appointment' && ['resource-submit','resource-confirm'].includes(action)) {
    const conflict = getConsultationConflict(item, item.id)
    if (conflict !== '无冲突，可以提交预约') throw new Error(conflict)
  }
  const blocked = getActionRestriction(action, item, resourceId)
  const requisitionCanRecall = resourceId === 'inventory-requisition' && ['resource-withdraw','resource-cancel'].includes(action) && ['已确认','已完成','部分出库','缺货待处理'].includes(item.status)
  if (blocked && !requisitionCanRecall) return { ok:false, reason:blocked }
  if (resourceId === 'consultation-appointment' && action === 'resource-submit') {
    item.status = '已发送'
    item.draft = false
    item.referenced = true
    item.result = '无冲突，可以提交预约'
    item.invitationStatus = '等待专家回复'
    const existingInvitation = recordFor('consultation-invitation', row => row.appointmentId === item.id && !['已拒绝','已取消','已归档'].includes(row.status))
    if (!existingInvitation) {
      const invitationId = nextId('consultation-invitation')
      state.resources['consultation-invitation'].unshift({
        id:invitationId,
        name:(item.expert || '专家') + '会诊邀请',
        code:invitationId,
        expert:item.expert,
        time:item.time,
        endTime:item.endTime,
        customerId:item.customerId,
        customer:item.customer,
        appointmentId:item.id,
        status:'待确认',
        result:'等待专家处理',
        unread:true,
        referenced:true,
        draft:false,
        createdAt:now(),
        updatedAt:now()
      })
      audit('发送专家邀请', invitationId, '预约无时间冲突，等待专家回复', undefined, 'consultation-invitation')
      consultationMessage(item, { name:`${item.expert || '专家'}收到新的会诊邀请`, messageType:'会诊邀请', invitationId, audience:item.expert, summary:`${item.customer || ''} · ${item.name || item.id} · ${item.time || ''}` })
    }
    audit('发送专家邀请', item.id, '预约已提交，已生成专家待确认邀请', undefined, resourceId)
    item.updatedAt = now()
    item.lastAction = '发送专家邀请'
    save()
    return { ok:true, message:'预约已提交，专家邀请已发送' }
  }

  if (action === 'approval-form-design') {
    const components = Array.isArray(item.designComponents) ? [...item.designComponents] : []
    const component = payload.component || '文本输入框'
    const fieldLabel = payload.fieldLabel || '未命名字段'
    components.push({ component, fieldLabel, required:payload.required !== '否', order:components.length + 1 })
    item.designComponents = components
    item.designSummary = components.map(entry => `${entry.fieldLabel}（${entry.component}）`).join('、')
    item.layoutVersion = Number(item.layoutVersion || 0) + 1
    item.lastAction = '设计表单'
    item.updatedAt = now()
    audit('设计业务表单', id, `新增${fieldLabel}，当前共${components.length}个控件`, undefined, resourceId)
    save()
    return { ok:true, item:clone(item), summary:'表单设计已保存', impact:'表单控件、版本和详情已同步更新' }
  }

  if (['approval-form-copy','approval-flow-copy','doctor-plan-favorite-health','doctor-plan-favorite-medical'].includes(action)) {
    const copiedId = nextId(resourceId)
    const copyName = payload.name || `${item.name || resource.entity}副本`
    const copied = {
      ...clone(item),
      id:copiedId,
      code:copiedId,
      name:copyName,
      status:action.startsWith('doctor-plan-favorite') ? '已通过' : '草稿',
      draft:!action.startsWith('doctor-plan-favorite'),
      referenced:false,
      createdAt:now(),
      updatedAt:now(),
      copiedFrom:id,
      favoriteType:action === 'doctor-plan-favorite-health' ? '健康管理方案' : action === 'doctor-plan-favorite-medical' ? '医疗方案' : undefined
    }
    delete copied.lastAction
    state.resources[resourceId].unshift(copied)
    audit(getActionDefinition(action).label, copiedId, `由${item.name}复制生成`, undefined, resourceId)
    save()
    return { ok:true, item:clone(copied), summary:copyName + '已生成', impact:'新记录已加入当前列表，可继续编辑' }
  }

  if (action === 'approval-node-sort' || action === 'approval-branch-sort') {
    const current = Number(item.sortOrder || 1)
    item.sortOrder = Math.max(1, current + (payload.direction === '下移' ? 1 : -1))
    item.lastAction = action === 'approval-node-sort' ? '调整节点顺序' : '调整分支顺序'
    item.updatedAt = now()
    audit(item.lastAction, id, `顺序调整为${item.sortOrder}`, undefined, resourceId)
    save()
    return { ok:true, item:clone(item), summary:item.lastAction + '已保存', impact:'详情中的顺序号已更新' }
  }

  if (action === 'doctor-plan-apply') {
    const order = recordFor('doctor-order', row => row.id === payload.orderNo || row.code === payload.orderNo) || recordFor('doctor-order')
    if (!order) return { ok:false, reason:'当前没有可带入的医生开单记录，请先创建开单' }
    order.plan = item.plan || item.name
    order.content = item.content || item.plan || item.name
    order.planSource = item.name
    order.updatedAt = now()
    item.lastAppliedOrder = order.id
    item.updatedAt = now()
    audit('带入当前开单', order.id, `已带入${item.name}`, undefined, 'doctor-order')
    save()
    return { ok:true, item:clone(item), summary:'常用方案已带入当前开单', impact:'医生开单内容已同步更新' }
  }

  if (action === 'doctor-plan-rename') {
    const oldName = item.name
    item.name = payload.name || oldName
    item.updatedAt = now()
    audit('重命名常用方案', id, `${oldName} → ${item.name}`, undefined, resourceId)
    save()
    return { ok:true, item:clone(item), summary:'常用方案名称已更新', impact:'列表和详情已同步显示新名称' }
  }

  if (resourceId === 'checkup-sync' && action === 'integration-preview') {
    item.status = '待确认'
    item.result = Number(item.failureCount || 0) > 0 ? `${item.failureCount} 项单位标准化失败，待重试` : '预览完成，等待确认'
    item.previewedAt = now()
    item.lastAction = '预览同步'
    item.updatedAt = now()
    audit('预览体检系统同步', id, item.result, undefined, resourceId)
    save()
    return { ok:true, item:clone(item), status:item.status, summary:'体检系统同步预览已完成' }
  }

  if (resourceId === 'checkup-sync' && action === 'integration-confirm') {
    if (!item.previewedAt) return { ok:false, reason:'请先预览同步结果' }
    const failureCount = Number(item.failureCount || 0)
    item.status = failureCount > 0 ? '部分完成' : '已完成'
    item.result = failureCount > 0 ? `${failureCount} 项失败结果保留待处理` : '同步完成'
    item.confirmedAt = now()
    item.lastAction = '确认同步'
    item.updatedAt = now()
    audit('确认同步体检结果', id, item.result, undefined, resourceId)
    save()
    return { ok:true, item:clone(item), status:item.status, summary:'体检结果已确认同步' }
  }

  if (resourceId === 'checkup-sync' && action === 'integration-retry') {
    item.attempts = Number(item.attempts || 0) + 1
    item.failureCount = Math.max(0, Number(item.failureCount || 0) - 1)
    item.status = item.failureCount ? '部分完成' : '已完成'
    item.result = item.failureCount ? `${item.failureCount} 项失败结果待处理` : '失败结果已重试成功'
    item.lastAction = '失败重试'
    item.updatedAt = now()
    audit('重试体检同步失败结果', id, item.result, undefined, resourceId)
    save()
    return { ok:true, item:clone(item), status:item.status, summary:'体检同步失败结果已重试' }
  }

  if (resourceId === 'checkup-sync' && action === 'integration-compensate') {
    item.compensation = payload.note || payload.method || '人工补偿已登记'
    item.failureCount = Math.max(0, Number(item.failureCount || 0) - 1)
    item.status = item.failureCount ? '待处理' : '已完成'
    item.result = item.failureCount ? `${item.failureCount} 项失败结果待处理，人工补偿已登记` : '失败结果已登记人工补偿'
    item.lastAction = '人工补偿'
    item.updatedAt = now()
    audit('登记体检同步人工补偿', id, item.compensation, undefined, resourceId)
    save()
    return { ok:true, item:clone(item), status:item.status, summary:'人工补偿已登记' }
  }

  if (resourceId === 'checkup-sync' && ['checkup-config-field', 'checkup-config-item', 'checkup-config-classify'].includes(action)) {
    const fields = {
      'checkup-config-field': ['fieldMapping', '字段映射'],
      'checkup-config-item': ['itemMapping', '项目映射'],
      'checkup-config-classify': ['classificationRule', '排除与归类规则']
    }
    const [key, label] = fields[action]
    const value = String(payload[key] || '').trim()
    if (!value) return { ok:false, reason:`请输入${label}` }
    item[key] = value
    item.mappingVersion = item.mappingVersion || 'MAP-2026.08'
    item.lastAction = label
    item.updatedAt = now()
    audit(`保存${label}`, id, value, undefined, resourceId)
    save()
    return { ok:true, item:clone(item), summary:`${label}已保存` }
  }

  const previousStatus = item.status
  if (definition.status) item.status = definition.status
  if (resourceId === 'inventory-ledger' && action === 'inventory-freeze-toggle') {
    item.status = item.status === '冻结' ? '正常' : '冻结'
    item.warningStatus = item.status === '冻结' ? '已冻结' : '正常'
    item.freezeReason = item.status === '冻结' ? (payload.reason || '待质量复核') : ''
  }
  if (resourceId === 'inventory-inbound' && ['resource-submit','resource-confirm','resource-withdraw','resource-cancel'].includes(action)) {
    const currentStage = item.stageStatus || item.status
    const stageNext = {
      '待收货': '待验收',
      '待验收': '待上架',
      '待上架': '已入库'
    }
    if (action === 'resource-confirm') {
      const nextStage = stageNext[currentStage]
      if (!nextStage) return { ok:false, reason:`当前阶段“${currentStage}”没有可推进的入库操作` }
      item.stageStatus = nextStage
      item.status = nextStage
      item.lastStageAction = nextStage === '待验收' ? '收货确认' : nextStage === '待上架' ? '验收通过' : '上架完成'
      if (nextStage === '待验收') item.actualReceivedQty = Number(item.actualReceivedQty || item.arrivalQty || 0)
      if (nextStage === '待上架') {
        item.qualifiedQty = Number(item.qualifiedQty ?? item.actualReceivedQty ?? 0)
        item.unqualifiedQty = Math.max(0, Number(item.actualReceivedQty || 0) - item.qualifiedQty)
        item.receivedQty = Number(item.receivedQty || item.qualifiedQty || 0)
      }
      if (nextStage === '已入库') {
        item.batch = item.batch || 'BATCH-202609-A'
        item.expiry = item.expiry || '2028-09-01'
        item.warehouse = item.warehouse || '杭州一号仓'
        item.location = item.location || 'A-01-08'
        const qualifiedQty = Number(item.qualifiedQty || item.receivedQty || 0)
        const putawayQty = Math.max(0, Math.min(qualifiedQty, Number(payload.putawayQty || item.putawayQty || qualifiedQty)))
        const alreadyPutaway = Number(item.putawayQty || 0)
        const delta = Math.max(0, putawayQty - alreadyPutaway)
        if (delta > 0) {
          const changed = changeInventoryBalance({
            material:item.material,
            warehouse:item.warehouse,
            location:item.location,
            batch:item.batch,
            expiry:item.expiry,
            productionDate:item.productionDate,
            changeQty:delta,
            businessNo:item.systemNo || item.inboundNo || item.id,
            sourceNo:item.systemNo || item.inboundNo || item.id
          })
          if (!changed.ok) return changed
          writeInventoryFlow({
            flowType:'采购入库',
            businessNo:item.systemNo || item.inboundNo || item.id,
            material:item.material,
            warehouse:item.warehouse,
            location:item.location,
            batch:item.batch,
            expiry:item.expiry,
            productionDate:item.productionDate,
            beforeQty:changed.beforeQty,
            changeQty:delta,
            afterQty:changed.afterQty
          })
        }
        item.putawayQty = alreadyPutaway + delta
        const remaining = Math.max(0, qualifiedQty - item.putawayQty)
        item.remainingPutawayQty = remaining
        if (remaining > 0) {
          item.stageStatus = '待上架'
          item.status = '待上架'
          item.lastStageAction = '部分上架'
        }
      }
    }
    if (action === 'resource-submit') {
      item.stageStatus = '待收货'
      item.status = '待收货'
      item.referenced = true
    }
    if (action === 'resource-withdraw') {
      item.stageStatus = '已撤回'
      item.status = '已撤回'
    }
    if (action === 'resource-cancel') {
      item.stageStatus = '异常'
      item.status = '异常'
      item.exceptionReason = payload.reason || '入库阶段异常，待后台处理'
    }
  }
  if (action === 'resource-confirm' && resourceId === 'inventory-transfer') {
    const quantity = Number(item.quantity || 0)
    const source = changeInventoryBalance({ material:item.material, warehouse:item.sourceWarehouse, location:item.sourceLocation, batch:item.batch, changeQty:-quantity })
    if (!source.ok) return source
    const target = changeInventoryBalance({ material:item.material, warehouse:item.targetWarehouse, location:item.targetLocation, batch:item.batch, expiry:item.expiry, changeQty:quantity, businessNo:item.systemNo || item.id, sourceNo:item.systemNo || item.id })
    if (!target.ok) return target
    writeInventoryFlow({ flowType:'调拨出库', businessNo:item.systemNo || item.id, material:item.material, warehouse:item.sourceWarehouse, location:item.sourceLocation, batch:item.batch, beforeQty:source.beforeQty, changeQty:-quantity, afterQty:source.afterQty })
    writeInventoryFlow({ flowType:'调拨入库', businessNo:item.systemNo || item.id, material:item.material, warehouse:item.targetWarehouse, location:item.targetLocation, batch:item.batch, beforeQty:target.beforeQty, changeQty:quantity, afterQty:target.afterQty })
  }
  if (action === 'resource-confirm' && resourceId === 'inventory-stocktake') {
    const values = { material:item.material, warehouse:item.warehouse, location:item.location, batch:item.batch }
    const ledger = inventoryBalanceFor(values)
    const beforeQty = ledger ? inventoryQuantity(ledger) : 0
    const actualQty = Number(item.quantity || 0)
    const differenceQty = actualQty - beforeQty
    item.availableQty = beforeQty
    item.differenceQty = differenceQty
    if (differenceQty !== 0) {
      const changed = changeInventoryBalance({ ...values, changeQty:differenceQty, businessNo:item.systemNo || item.id, sourceNo:item.systemNo || item.id })
      if (!changed.ok) return changed
      writeInventoryFlow({ flowType:'盘点调整', businessNo:item.systemNo || item.id, material:item.material, warehouse:item.warehouse, location:item.location, batch:item.batch, beforeQty:changed.beforeQty, changeQty:differenceQty, afterQty:changed.afterQty })
    }
  }
  if (action === 'resource-confirm' && resourceId === 'inventory-scrap') {
    const quantity = Number(item.quantity || 0)
    const changed = changeInventoryBalance({ material:item.material, warehouse:item.warehouse, location:item.location, batch:item.batch, changeQty:-quantity })
    if (!changed.ok) return changed
    writeInventoryFlow({ flowType:'报废出库', businessNo:item.systemNo || item.id, material:item.material, warehouse:item.warehouse, location:item.location, batch:item.batch, beforeQty:changed.beforeQty, changeQty:-quantity, afterQty:changed.afterQty })
  }
  if (action === 'resource-confirm') {
    const assetResult = syncAssetAction(resourceId, item)
    if (assetResult && !assetResult.ok) return assetResult
  }
  if (resourceId === 'inventory-requisition' && action === 'resource-confirm') {
    const requestedQty = Number(item.requestedQty || item.quantity || 0)
    const allocations = requisitionAllocations(item)
    const outboundAllocations = []
    let outboundQty = 0
    for (const allocation of allocations) {
      const wanted = Number(allocation.quantity || 0)
      if (wanted <= 0) continue
      const ledger = inventoryBalanceFor({ material:item.material, warehouse:allocation.warehouse, location:allocation.location, batch:allocation.batch })
      const available = ledger ? inventoryQuantity(ledger) : 0
      const actual = Math.min(wanted, available)
      if (actual <= 0) continue
      const changed = changeInventoryBalance({ material:item.material, warehouse:allocation.warehouse, location:allocation.location, batch:allocation.batch, expiry:allocation.expiry, changeQty:-actual })
      if (!changed.ok) return changed
      outboundAllocations.push({ ...allocation, outboundQty:actual })
      outboundQty += actual
      writeInventoryFlow({ flowType:'客户耗用出库', businessNo:item.systemNo || item.businessNo || item.id, material:item.material, warehouse:allocation.warehouse, location:allocation.location, batch:allocation.batch, beforeQty:changed.beforeQty, changeQty:-actual, afterQty:changed.afterQty })
    }
    item.requestedQty = requestedQty
    item.outboundQty = outboundQty
    item.remainingQty = Math.max(0, requestedQty - outboundQty)
    item.outboundAllocations = outboundAllocations
    item.status = item.remainingQty === 0 ? '已完成' : outboundQty > 0 ? '部分出库' : '缺货待处理'
    item.draft = false
    item.referenced = true
    item.updatedAt = now()
    item.lastAction = '确认出库'
    audit('确认客户耗用出库', item.id, `实际出库 ${outboundQty}，剩余 ${item.remainingQty}`, undefined, resourceId)
    save()
    return { ok:true, item:clone(item), status:item.status, summary:'客户耗用已处理', impact:'按批次扣减库存并生成库存流水' }
  }
  if (resourceId === 'inventory-requisition' && ['resource-withdraw','resource-cancel'].includes(action)) {
    const restored = restoreRequisitionAllocations(item)
    if (!restored.ok) return restored
    item.status = action === 'resource-cancel' ? '已取消' : '已撤回'
    item.draft = false
    item.updatedAt = now()
    item.lastAction = action === 'resource-cancel' ? '取消耗用申请' : '撤回耗用申请'
    audit(item.lastAction, item.id, '已回补已出库批次库存', undefined, resourceId)
    save()
    return { ok:true, item:clone(item), status:item.status, summary:item.lastAction + '并回补库存', impact:'原出库批次已逐条回补并生成撤回回补流水' }
  }
  item.draft = item.status === '草稿'
  item.updatedAt = now()
  item.lastAction = definition.label
  item.lastPayload = payload
  if (action === 'resource-enable') item.status = '已启用'
  if (action === 'resource-disable') item.status = '已停用'
  if (action === 'resource-void' && resourceId === 'finance-payment') item.status = '已冲销'
  if (action === 'resource-void' && resourceId === 'finance-invoice') item.status = '已作废'
  if (action === 'resource-submit' && resourceId !== 'inventory-inbound') {
    item.status = '待审批'; item.referenced = true
    const approvalId = nextId('approval-task')
    state.resources['approval-task'].unshift({ id:approvalId, name:resource.entity + '审批', code:approvalId, businessId:item.id, owner:'王主管', status:'待处理', referenced:true, draft:false, updatedAt:now() })
  }
  if (action === 'consultation-accept' || action === 'consultation-decline' || action === 'consultation-conflict') {
    const accepted = action === 'consultation-accept'
    const conflict = action === 'consultation-conflict'
    item.status = accepted ? '已接受' : conflict ? '时间冲突' : '已拒绝'
    item.result = accepted ? '专家已接受会诊邀请' : (payload.reason || (conflict ? '专家反馈时间冲突' : '专家拒绝本次会诊邀请'))
    item.responseNote = accepted ? (payload.note || '') : (payload.reason || '')
    if (payload.alternativeTime) item.alternativeTime = payload.alternativeTime
    item.unread = false
    markConsultationMessageRead(item.id)
    const appointment = recordFor('consultation-appointment', row => row.id === item.appointmentId)
    if (appointment) {
      appointment.invitationStatus = accepted ? '专家已接受' : conflict ? '专家反馈时间冲突' : '专家已拒绝，需重新邀请'
      appointment.updatedAt = now()
      if (appointment.status === '待确认' || appointment.status === '待专家确认' || appointment.status === '待重新预约' || appointment.status === '已确认') appointment.status = '已预约'
      consultationMessage(appointment, { name:`${appointment.initiator || '发起医生'}收到专家响应`, messageType:'会诊邀请响应', audience:appointment.initiator, summary:item.result })
    }
  }
  if (action === 'resource-withdraw') {
    if (isReportLifecycleResource(resourceId)) {
      item.status = '已撤回'; item.draft = false; item.withdrawnAt = now()
      if (resourceId === 'medical-report') state.dashboard.publishedMedical = Math.max(0, Number(state.dashboard.publishedMedical || 0) - 1)
      if (resourceId === 'talent-report') {
        state.dashboard.publishedTalent = Math.max(0, Number(state.dashboard.publishedTalent || 0) - 1)
        item.handoff = '发布已撤回，小程序暂不可查看'
      }
    } else {
      item.status = '草稿'; item.draft = true
      const task = recordFor('approval-task', row => row.businessId === item.id && ['待处理','待审批'].includes(row.status))
      if (task) task.status = '已撤销'
    }
  }
  if (action.startsWith('approval-') && item.businessId) {
    const linked = Object.values(state.resources).flat().find(row => row.id === item.businessId)
    if (linked && action === 'approval-approve') linked.status = '已通过'
    if (linked && action === 'approval-reject') linked.status = '已驳回'
    if (linked && action === 'approval-return') linked.status = '已退回'
    if (action === 'approval-transfer') item.owner = payload.transferTo || item.owner
    if (linked) linked.updatedAt = now()
    state.resources['approval-message'].unshift({ id:nextId('approval-message'), name:resource.entity + definition.label + '通知', code:item.businessId, businessId:item.businessId, status:'已发送', referenced:true, draft:false, updatedAt:now() })
  }
  if (action === 'analysis-refresh') { item.lastRefreshedAt = now(); item.analysisResult = '已按当前筛选条件刷新经营指标' }
  if (action === 'finance-run-match') { item.matchResult = '三单匹配通过'; item.status = '已匹配'; item.matchedAt = now() }
  if (action === 'finance-match-difference') {
    item.matchResult = `${payload.differenceType || '匹配'}差异已提交处理`
    item.differenceNote = payload.note || '待业务人员复核'
    item.status = '待复核'
    const approvalId = nextId('approval-task')
    state.resources['approval-task'].unshift({ id:approvalId, name:'三单匹配差异审批', code:approvalId, businessId:item.id, owner:'王主管', status:'待处理', referenced:true, draft:false, updatedAt:now() })
  }
  if (action === 'consultation-device-camera') { item.cameraCheck = '正常'; item.deviceCheck = item.microphoneCheck === '正常' ? '摄像头、麦克风检查通过' : '摄像头正常，待检查麦克风'; item.result = '会前检查处理中' }
  if (action === 'consultation-device-microphone') { item.microphoneCheck = '正常'; item.deviceCheck = item.cameraCheck === '正常' ? '摄像头、麦克风检查通过' : '麦克风正常，待检查摄像头'; item.result = '会前检查处理中' }
  if (action === 'consultation-room-auth') { item.authResult = '身份与时段校验通过'; item.status = '已就绪' }
  if (action === 'consultation-room-enter') { item.enteredAt = now(); item.status = '进行中'; item.roomResult = '已进入会诊' }
  if (action === 'consultation-room-record') { item.recording = '云端录制中'; item.recordingStartedAt = now(); item.status = '录制中' }
  if (action === 'consultation-room-control') { item.lastControl = payload.operation || '会中状态检查'; item.controlNote = payload.note || ''; item.controlledAt = now() }
  if (action === 'consultation-room-media') { item.mediaStatus = '多人音视频连接正常'; item.status = '进行中' }
  if (action === 'consultation-member-mute') { item.operation = '已静音'; item.operationNote = payload.note || ''; item.status = '已静音' }
  if (action === 'consultation-member-remove') { item.operation = '已移出'; item.operationNote = payload.reason || ''; item.status = '已移出' }
  if (action === 'integration-retry') { item.attempts = Number(item.attempts || 0) + 1; item.status = '成功' }
  if (action === 'integration-compensate') item.compensation = payload.note || payload.method || '人工补偿已登记'
  if (action === 'finance-payment') { item.paid = Number(item.paid || 0) + Number(payload.amount || 0); state.dashboard.paid += Number(payload.amount || 0); item.status = '已收款' }
  if (action === 'finance-refund') { item.refunded = Number(item.refunded || 0) + Number(payload.amount || 0); state.dashboard.refunded += Number(payload.amount || 0); item.status = '已退款' }
  if (action === 'resource-publish' && resourceId === 'medical-report') state.dashboard.publishedMedical += 1
  if (action === 'resource-publish' && resourceId === 'talent-report') { state.dashboard.publishedTalent += 1; item.handoff = '发布后由小程序查看' }
  if (action === 'consultation-sign') state.dashboard.archivedConsultations += 1
  if (!talentResource(resourceId)) audit(definition.label + resource.entity, id, (previousStatus || '-') + ' → ' + item.status, undefined, resourceId)
  save()
  return { ok:true, item:clone(item), previousStatus, status:item.status, summary:definition.label + '已完成', impact:'列表、详情、状态和处理记录已同步更新' }
}

function addGeneratedResource(resourceId, values) {
  const resource = resourceById(resourceId)
  const generatedId = nextId(resourceId)
  const item = { id:generatedId, name:values.name || resource.entity + '演示记录', code:values.code || generatedId, owner:roleName(state.currentRole), status:values.status || '草稿', draft:values.status ? values.status === '草稿' : true, referenced:Boolean(values.referenced), updatedAt:now(), ...values }
  applySystemFields(resourceId, item, item.id)
  state.resources[resourceId].unshift(item)
  return item
}

export function resetAll() {
  state = clone(seed)
  ensureClosure(state)
  audit('恢复初始业务数据', 'ALL', '采购、库存、客单、会诊、医学规则和天赋报告状态已恢复', '业务页面操作')
  save()
}
