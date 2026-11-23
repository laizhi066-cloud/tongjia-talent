/* Shared talent closed-loop domain. UI adapters may call these state mutators. */

const clone = value => value === undefined ? value : JSON.parse(JSON.stringify(value))
import { dataScopeForActor, ensureAccounts, executeAccountAction } from './accounts.js?v=talent-1.0.8'
const now = () => new Date().toISOString()
const active = row => row && !['停用', '已停用', '下架', '已撤回', '已删除'].includes(row.status)
const rows = (state, resource) => (state.resources || (state.resources = {}))[resource] || (state.resources[resource] = [])
const first = (state, resource, predicate) => rows(state, resource).find(predicate)
const idOf = (prefix, state) => {
  const all = Object.values(state.resources || {}).flatMap(value => Array.isArray(value) ? value : [])
  const count = all.filter(item => String(item.id || '').startsWith(prefix)).length + 1
  return `${prefix}-${String(count).padStart(3, '0')}`
}
const addOnce = (list, item) => { if (!list.some(row => row.id === item.id)) list.push(item); return list.find(row => row.id === item.id) }
const memberRows = state => rows(state, 'talent-member')
const childRows = state => rows(state, 'talent-child')
const reportRows = state => rows(state, 'talent-report')
const planRows = state => rows(state, 'talent-plan')
const authorizationRows = state => rows(state, 'talent-authorization')
const selectionRows = state => rows(state, 'talent-selection')
const memberFor = (state, id) => memberRows(state).find(row => row.id === id || row.childId === id || row.externalSubjectId === id || row.idNo === id)
const childForMember = (state, member) => childRows(state).find(row => row.id === member?.childId || row.id === member?.id)
const parentRelation = (state, member) => rows(state, 'talent-member-relation').find(row => row.childId === (member?.childId || member?.id) && row.status === '有效')
const validParent = (state, parentId) => first(state, 'talent-parent', row => row.id === parentId && active(row))
const memberName = member => member?.name || member?.childName || member?.memberName || '-'
const reportMemberId = (state, report) => report.memberId || report.childId || first(state, 'talent-member', row => row.childId === report.childId)?.id
const memberOrg = (state, member) => member?.orgId || member?.organizationId || childForMember(state, member)?.orgId || ''
const actorIsPlatform = actor => !actor?.role || actor.role === 'platform' || actor.role === 'admin'
const actorOrganization = (state, actor) => rows(state, 'talent-organization').find(item => item.id === actor?.orgId)
const actorOrganizationActive = (state, actor) => {
  if (actorIsPlatform(actor)) return true
  const organization = actorOrganization(state, actor)
  if (!organization || !active(organization)) return false
  if (actor.role === 'agent') return ['已通过', '已开通'].includes(organization.agentStatus)
  if (actor.role === 'provider') return organization.providerStatus === '已通过'
  return false
}
const actorCanSeeMember = (state, member, actor = {}) => {
  if (!member) return false
  if (!active(member)) return false
  if (actorIsPlatform(actor)) return true
  if (actor.role === 'agent' || actor.role === 'provider') {
    if (!actorOrganizationActive(state, actor)) return false
    const organization = rows(state, 'talent-organization').find(item => item.id === memberOrg(state, member))
    if (!organization || !active(organization)) return false
  }
  if (actor.role === 'agent') return memberOrg(state, member) === actor.orgId && actorDataScopeAllowsMember(state, member, actor)
  if (actor.role === 'provider') return authorizationRows(state).some(auth => auth.memberId === member.id && auth.orgId === actor.orgId && auth.status === '已授权' && actorDataScopeAllowsMember(state, member, actor, auth))
  if (actor.role === 'client') {
    if (state.terminalDemo?.talent?.loggedIn === false || !validParent(state, actor.parentId)) return false
    const organization = rows(state, 'talent-organization').find(item => item.id === memberOrg(state, member))
    if (organization && !active(organization)) return false
    return Boolean(parentRelation(state, member)?.parentId === actor.parentId || (member.kind === '本人' && member.parentId === actor.parentId))
  }
  return false
}
const actorCanOperateMember = (state, member, actor = {}, allowClient = false) => {
  if (!member) return false
  if (actorIsPlatform(actor)) return true
  if (actor.role === 'client') return allowClient && actorCanSeeMember(state, member, actor)
  return actor.role === 'agent' && actorCanSeeMember(state, member, actor)
}
const actorOwnsPlan = (plan, actor = {}) => actorIsPlatform(actor) || (actor.role === 'provider' && plan.orgId === actor.orgId)
const memberCompleteness = (state, member) => {
  if (!member?.name) return '会员姓名未填写'
  if (!member.externalSubjectId) return '外部受检人标识未填写'
  if (member.kind === '孩子') {
    const relation = parentRelation(state, member)
    const parent = validParent(state, relation?.parentId || member.parentId)
    if (!relation || !parent) return '孩子未绑定有效家长'
    if (!parent.mobile) return '家长手机号未填写'
  } else if (!member.mobile) return '本人手机号未填写'
  return ''
}

const factorAliases = { LOGIC: '逻辑思维', FOCUS: '专注力' }
const factorName = result => factorAliases[result?.factorCode] || result?.factor || result?.factorName || result?.name || result?.factorCode
const toRange = value => {
  if (Array.isArray(value)) return { min:Number(value[0]), max:Number(value[1]) }
  const match = String(value ?? '').match(/(-?\d+(?:\.\d+)?)\s*[–-]\s*(-?\d+(?:\.\d+)?)/)
  return match ? { min:Number(match[1]), max:Number(match[2]) } : null
}
const rangeHit = (row, value) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return false
  const min = Number(row.resultMin ?? toRange(row.resultRange)?.min)
  const max = Number(row.resultMax ?? toRange(row.resultRange)?.max)
  return Number.isFinite(min) && Number.isFinite(max) && number >= min && number <= max
}
const ageAt = (birthDate, at) => {
  if (!birthDate) return null
  const birth = new Date(birthDate); const date = new Date(at || Date.now())
  if (Number.isNaN(birth.getTime()) || Number.isNaN(date.getTime())) return null
  let age = date.getUTCFullYear() - birth.getUTCFullYear()
  if (date.getUTCMonth() < birth.getUTCMonth() || (date.getUTCMonth() === birth.getUTCMonth() && date.getUTCDate() < birth.getUTCDate())) age--
  return age
}
const ageHit = (row, age) => {
  if (age === null || age === undefined) return true
  const range = toRange(row.ageRange || row.scope)
  const min = Number(row.minAge ?? range?.min); const max = Number(row.maxAge ?? range?.max)
  return (!Number.isFinite(min) || age >= min) && (!Number.isFinite(max) || age <= max)
}
const genderHit = (row, gender) => !row.gender || row.gender === '通用' || !gender || row.gender === gender
const memberForPayload = (state, payload = {}) => {
  const member = memberRows(state).find(row => (payload.memberId && row.id === payload.memberId) || (payload.externalSubjectId && row.externalSubjectId === payload.externalSubjectId) || (payload.idNo && row.idNo === payload.idNo))
  if (member) return member
  const child = childRows(state).find(row => (payload.idNo && row.idNo === payload.idNo) || (payload.externalSubjectId && row.externalSubjectId === payload.externalSubjectId))
  return child ? memberFor(state, child.id) : null
}
function upsert(state, resource, values = {}, id) {
  const list = rows(state, resource); const existing = id && list.find(row => row.id === id)
  if (existing) { Object.assign(existing, clone(values)); return existing }
  const record = { id: id || values.id || idOf(resource.toUpperCase(), state), ...clone(values) }; list.unshift(record); return record
}

function seedOrganizations(state) {
  if (Object.prototype.hasOwnProperty.call(state.resources, 'talent-organization')) return
  addOnce(rows(state, 'talent-organization'), { id:'ORG-AGENT-001', name:'杭州天赋引流中心', type:'代理商', contact:'周经理', mobile:'13800001001', status:'启用', agentStatus:'已通过', providerStatus:'未申请', permissions:{ report:true, interpretation:true, plan:true, pdf:true }, referenced:true })
  addOnce(rows(state, 'talent-organization'), { id:'ORG-SERVICE-001', name:'杭州成长服务机构', type:'服务商', contact:'赵老师', mobile:'13800001002', status:'启用', agentStatus:'未申请', providerStatus:'已通过', qualifications:['培养服务资质'], permissions:{ report:true, interpretation:true, plan:true, pdf:true }, referenced:true })
}
const actorDataScopeAllowsMember = (state, member, actor = {}, authorization = null) => {
  // Legacy callers without a concrete login user retain the existing role filter.
  if (!actor.userId || actorIsPlatform(actor)) return true
  const { dataScope, dataScopes = [dataScope], dataOrgIds } = dataScopeForActor(state, actor)
  const scopedOrganizationId = actor.role === 'provider' && authorization ? authorization.orgId : memberOrg(state, member)
  if (dataScopes.includes('1')) return true
  if (dataScopes.includes('2') && dataOrgIds.includes(scopedOrganizationId)) return true
  if (dataScopes.includes('4') && scopedOrganizationId === actor.orgId) return true
  if (dataScopes.includes('3') && scopedOrganizationId === actor.orgId) return true
  if (dataScopes.includes('5')) return authorization ? authorization.userId === actor.userId : scopedOrganizationId === actor.orgId
  return false
}
function seedUsers(state) {
  if (Object.prototype.hasOwnProperty.call(state.resources, 'talent-user')) return
  ;[
    { id:'TAL-USER-001', username:'agent.zhou', name:'周经理', organizationId:'ORG-AGENT-001', role:'agent', mobile:'13800001001', status:'启用', lastLoginAt:'2026-09-21 09:18' },
    { id:'TAL-USER-002', username:'agent.liu', name:'刘老师', organizationId:'ORG-AGENT-001', role:'agent', mobile:'13800001011', status:'启用', lastLoginAt:'2026-09-20 16:42' },
    { id:'TAL-USER-003', username:'provider.zhao', name:'赵老师', organizationId:'ORG-SERVICE-001', role:'provider', mobile:'13800001002', status:'启用', lastLoginAt:'2026-09-21 10:06' }
  ].forEach(seed => addOnce(rows(state, 'talent-user'), seed))
}
function seedMembers(state) {
  if (Object.prototype.hasOwnProperty.call(state.resources, 'talent-member')) return
  const child = childRows(state).find(row => row.id === 'TAL-CHILD-001') || childRows(state)[0]; if (!child) return
  child.orgId ||= 'ORG-AGENT-001'; child.externalSubjectId ||= 'SUBJECT-CHILD-001'
  const relation = parentRelation(state, { id:child.id, childId:child.id })
  addOnce(memberRows(state), { id:child.id, childId:child.id, name:child.childName || child.name, kind:'孩子', parentId:relation?.parentId || child.parentId || 'TAL-PARENT-001', relationType:relation?.relationType || child.relationType || '监护人', mobile:'', idNo:child.idNo, birthDate:child.birthDate, gender:child.gender, externalSubjectId:child.externalSubjectId, orgId:'ORG-AGENT-001', organization:'杭州天赋引流中心', status:'已提交', paid:true, paidAt:'2026-09-01T10:00:00.000Z', purchasedVolumeIds:['TAL-VOL-001','TAL-VOL-002'], intents:[{ direction:'逻辑思维', custom:'结构化思考', raw:'希望提升逻辑思维', primary:true, order:1, remark:'重点关注日常练习' }, { direction:'专注力', custom:'任务专注', raw:'希望提升专注时间', primary:false, order:2, remark:'' }], referenced:true })
  for (const other of childRows(state).filter(row => row.id !== child.id)) {
    const otherRelation = parentRelation(state, { id:other.id, childId:other.id })
    other.orgId ||= 'ORG-AGENT-001'; other.externalSubjectId ||= `SUBJECT-${other.id}`
    addOnce(memberRows(state), { id:other.id, childId:other.id, name:other.childName || other.name, kind:'孩子', parentId:otherRelation?.parentId || other.parentId || 'TAL-PARENT-001', relationType:otherRelation?.relationType || other.relationType || '监护人', idNo:other.idNo, birthDate:other.birthDate, gender:other.gender, externalSubjectId:other.externalSubjectId, orgId:'ORG-AGENT-001', status:'已提交', paid:true, intents:[], referenced:true })
  }
}
function seedPlans(state) {
  if (Object.prototype.hasOwnProperty.call(state.resources, 'talent-plan')) return
  const seeds = [
    { id:'TAL-PLAN-001', title:'逻辑思维结构化成长计划', direction:'逻辑思维', factor:'逻辑思维', level:'L2', minAge:6, maxAge:11, gender:'通用', summary:'围绕结构化思考建立阶段性训练目标。', content:'通过分类、排序和复盘练习强化结构化思考。', goals:'提升问题拆解、顺序组织和复盘能力。', focusAbilities:['问题拆解','结构化表达'], stages:[{ name:'基础期', content:'完成分类与排序练习' }, { name:'巩固期', content:'完成家庭复盘任务' }], trainingAdvice:'每周安排 2 次 20 分钟练习。', evaluationPoints:'按任务完成度与复盘质量评估。', precautions:'保持低压力、可重复的练习节奏。', source:'服务商提交', status:'已上架', version:1, orgId:'ORG-SERVICE-001', selectionCount:1, history:[] },
    { id:'TAL-PLAN-002', title:'专注力任务成长计划', direction:'专注力', factor:'专注力', level:'L2', minAge:6, maxAge:11, gender:'通用', summary:'以短任务和完成反馈逐步延长专注时间。', content:'以短时清单和完成反馈逐步延长专注时间。', goals:'提升任务启动、持续投入和自我反馈能力。', focusAbilities:['任务启动','持续投入'], stages:[{ name:'基础期', content:'完成短时清单任务' }, { name:'巩固期', content:'逐步增加任务时长' }], trainingAdvice:'先短后长，完成后及时回顾。', evaluationPoints:'记录任务完成率与中断次数。', precautions:'避免一次安排过多任务。', source:'服务商提交', status:'已上架', version:1, orgId:'ORG-SERVICE-001', selectionCount:1, history:[] },
    { id:'TAL-PLAN-003', title:'综合优势巩固计划', direction:'综合发展', factor:'逻辑思维', level:'L2', minAge:6, maxAge:11, gender:'通用', summary:'结合报告优势要素制定家庭协同培养路径。', content:'结合天赋优势制定每周家庭练习。', goals:'将优势迁移到日常学习和生活任务。', focusAbilities:['综合运用','家庭协同'], stages:[{ name:'观察期', content:'记录优势表现' }, { name:'迁移期', content:'完成跨场景练习' }], trainingAdvice:'结合孩子兴趣选择练习材料。', evaluationPoints:'关注迁移场景和持续性。', precautions:'不以分数作为唯一评价。', source:'平台代建', status:'已上架', version:1, orgId:'ORG-SERVICE-001', selectionCount:1, history:[] },
    { id:'TAL-PLAN-004', title:'家庭专注协同计划', direction:'专注力', factor:'专注力', level:'L2', minAge:6, maxAge:11, gender:'通用', summary:'服务商提交的家庭协同方案。', content:'围绕家庭任务建立稳定的专注练习。', goals:'提升家庭支持和任务坚持。', focusAbilities:['任务坚持'], stages:[{ name:'试行期', content:'建立家庭任务清单' }], trainingAdvice:'服务商提交后等待平台审核。', evaluationPoints:'按周复盘执行情况。', precautions:'根据孩子状态调整任务量。', source:'服务商提交', status:'待审核', version:1, orgId:'ORG-SERVICE-001', selectionCount:0, history:[] },
    { id:'TAL-PLAN-005', title:'亲子表达引导计划', direction:'语言表达', factor:'语言表达', level:'L2', minAge:6, maxAge:11, gender:'通用', summary:'根据退回意见补充表达练习和执行说明。', content:'通过亲子对话、复述和情境表达完成阶段训练。', goals:'提升表达清晰度与互动意愿。', focusAbilities:['复述','情境表达'], stages:[{ name:'基础期', content:'完成亲子复述练习' }], trainingAdvice:'补充适用年龄和每周执行说明后重新提交。', evaluationPoints:'记录表达完整度。', precautions:'尊重孩子表达节奏。', source:'服务商提交', status:'已退回', reviewReason:'请补充适用年龄和每周执行说明后重新提交。', version:1, orgId:'ORG-SERVICE-001', selectionCount:0, history:[] }
  ]; seeds.forEach(seed => addOnce(planRows(state), seed))
}
function seedVolumes(state) { if (Object.prototype.hasOwnProperty.call(state.resources, 'talent-volume')) return; for (let i = 1; i <= 6; i++) addOnce(rows(state, 'talent-volume'), { id:`TAL-VOL-${String(i).padStart(3, '0')}`, name:`儿童成长分册 ${i}`, reportType:'儿童成长潜能', requiredFactors:['逻辑思维','专注力'], contentSet:'儿童成长内容库', displayOrder:i, purchaseCondition:'会员完成线下付费后可查看', publishCondition:'报告审核通过并发布', status:'已启用' }) }
function seedDirections(state) {
  ;[
    ['TAL-DIR-001','逻辑思维','认知能力'], ['TAL-DIR-002','专注力','认知能力'], ['TAL-DIR-003','综合发展','综合发展'],
    ['TAL-DIR-004','艺术类','艺术'], ['TAL-DIR-005','舞蹈类','艺术'], ['TAL-DIR-006','篮球','运动'], ['TAL-DIR-007','语言表达','表达沟通']
  ].forEach(([id, name, category], index) => addOnce(rows(state, 'talent-direction'), { id, name, category, displayOrder:index + 1, status:'已启用' }))
  const categories = [...new Set(rows(state, 'talent-factor').map(row => row.category).filter(Boolean))]
  categories.forEach((name, index) => addOnce(rows(state, 'talent-category'), { id:`TAL-CAT-${String(index + 1).padStart(3, '0')}`, name, displayOrder:index + 1, status:'已启用' }))
}
function seedAi(state) {
  if (Object.prototype.hasOwnProperty.call(state.resources, 'talent-ai')) return
  ;[
    { id:'TAL-AI-001', memberId:'TAL-CHILD-001', type:'自定义意向归类', suggestion:'将“结构化思考”归类为“逻辑思维”，建议作为首要培养方向。', status:'待确认', reason:'等待平台人员确认', updatedAt:'2026-09-20T09:00:00.000Z' },
    { id:'TAL-AI-002', memberId:'TAL-CHILD-001', type:'培养方向排序', suggestion:'建议将逻辑思维排在专注力之前，保留客户原始描述供复核。', status:'已确认', reason:'平台已确认建议', updatedAt:'2026-09-19T16:30:00.000Z' },
    { id:'TAL-AI-003', memberId:'TAL-CHILD-001', type:'培养计划草稿', suggestion:'已退回：计划草稿缺少适用年龄和执行周期说明。', status:'已退回', reason:'需补充规则依据后再提交', updatedAt:'2026-09-18T11:20:00.000Z' }
  ].forEach(seed => addOnce(rows(state, 'talent-ai'), seed))
}
function seedAuthorization(state) { if (Object.prototype.hasOwnProperty.call(state.resources, 'talent-authorization')) return; addOnce(authorizationRows(state), { id:'TAL-AUTH-001', memberId:'TAL-CHILD-001', orgId:'ORG-SERVICE-001', userId:'TAL-USER-003', planIds:['TAL-PLAN-001'], shareProfile:true, shareReports:true, scope:['profile','reports','interpretations','plans','pdf'], status:'已授权', createdAt:'2026-09-02T10:00:00.000Z', pushResult:'已推送' }) }
function seedSelection(state) { if (Object.prototype.hasOwnProperty.call(state.resources, 'talent-selection')) return; addOnce(selectionRows(state), { id:'TAL-SELECTION-001', memberId:'TAL-CHILD-001', reportId:'TAL-REPORT-PUBLISHED', reportVersion:1, planId:'TAL-PLAN-001', planVersion:1, recommendationLimit:3, shareProfile:true, shareReports:true, status:'已推送', reviewStatus:'已通过', pushResult:'已推送', createdAt:'2026-09-02T09:50:00.000Z', pushedAt:'2026-09-02T10:00:00.000Z' }) }
function seedException(state) {
  if (rows(state, 'talent-generation').some(row => row.id === 'TAL-RESULT-EXCEPTION')) return
  addOnce(rows(state, 'talent-generation'), { id:'TAL-RESULT-EXCEPTION', name:'未匹配受检人结果', externalReportId:'EXT-EXCEPTION-001', externalSubjectId:'UNKNOWN-SUBJECT', results:[], rawResults:[], source:'接口回传', completeness:'异常', status:'异常', exceptionReason:'未匹配到会员受检人标识', referenced:true })
  addOnce(reportRows(state), { id:'TAL-REPORT-EXCEPTION', name:'异常天赋报告', externalReportId:'EXT-EXCEPTION-001', sourceResultId:'TAL-RESULT-EXCEPTION', status:'异常', exceptionReason:'未匹配到会员受检人标识', rawResults:[], history:[] })
}
function seedPublishedReport(state) {
  const source = reportRows(state).find(row => row.childId === 'TAL-CHILD-001' && row.status === '待发布')
  if (!source || reportRows(state).some(row => row.id === 'TAL-REPORT-PUBLISHED')) return
  addOnce(reportRows(state), { ...clone(source), id:'TAL-REPORT-PUBLISHED', name:'周子涵检测报告（当前生效）', externalReportId:'EXT-REPORT-PUBLISHED', analyzedAt:'2026-08-28T14:30:00', status:'已发布', publishedAt:'2026-09-02T10:00:00.000Z', pdfFileName:'周子涵检测报告.pdf', pdfVisible:true, recommendations:['TAL-PLAN-001','TAL-PLAN-002','TAL-PLAN-003'], volumes:['TAL-VOL-001','TAL-VOL-002','TAL-VOL-003','TAL-VOL-004','TAL-VOL-005','TAL-VOL-006'], publishedVolumeIds:['TAL-VOL-001','TAL-VOL-002','TAL-VOL-003','TAL-VOL-004','TAL-VOL-005','TAL-VOL-006'] })
}

export function ensureClosure(state) {
  if (!state || typeof state !== 'object') throw new TypeError('state is required')
  state.resources ||= {}; state.talentConfig ||= {}; state.talentConfig.recommendationLimit = Math.max(1, Number(state.talentConfig.recommendationLimit || 3)); seedOrganizations(state); seedUsers(state); seedMembers(state); seedPlans(state); seedVolumes(state); seedDirections(state); seedAi(state); seedAuthorization(state); seedException(state); seedPublishedReport(state); seedSelection(state); ensureAccounts(state)
  for (const auth of authorizationRows(state)) if (auth.orgId === 'ORG-SERVICE-001') auth.userId ||= 'TAL-USER-003'
  for (const type of rows(state, 'talent-report-type')) type.requiredFactors ||= ['逻辑思维', '专注力']
  for (const report of reportRows(state)) { const member = memberFor(state, reportMemberId(state, report)); if (member) { report.memberId ||= member.id; report.orgId ||= memberOrg(state, member); report.history ||= [] } if (!Array.isArray(report.volumes) || !report.volumes.length) report.volumes = rows(state, 'talent-volume').filter(volume => active(volume) && (!volume.reportType || !report.reportType || volume.reportType === report.reportType)).map(volume => volume.id); if (!report.contentSnapshot && Array.isArray(report.results) && report.results.length) report.contentSnapshot = { frozen:true, rawResults:clone(report.rawResults || []), factors:clone(report.results), generatedAt:report.generatedAt || report.receivedAt || now() } }
  for (const report of reportRows(state)) if (report.status === '已发布' && !report.recommendationBatch && report.contentSnapshot?.factors?.length) createRecommendationBatch(state, report)
  for (const result of rows(state, 'talent-generation')) { result.rawResults ||= clone(result.results || []); result.history ||= [] }
  return state
}

function matchOne(state, raw, member, reportType, fallbackAt) {
  const factor = factorName(raw); const age = ageAt(member?.birthDate || childForMember(state, member)?.birthDate, raw.analyzedAt || fallbackAt)
  // 客户培养偏好只用于计划推荐；报告要素仍按平台规则逐项匹配。
  const rule = rows(state, 'talent-matching-rule').filter(active).filter(row => (!reportType || !row.reportType || row.reportType === reportType.reportType) && row.factor === factor && rangeHit(row, raw.resultValue) && ageHit(row, age) && genderHit(row, member?.gender)).sort((a, b) => Number(a.priority || 0) - Number(b.priority || 0))[0]
  if (!rule) throw new Error(`${factor}未匹配到生效规则`)
  const level = first(state, 'talent-level', row => active(row) && row.factor === factor && row.level === rule.level && ageHit(row, age) && genderHit(row, member?.gender)); if (!level) throw new Error(`${factor}未配置分级`)
  const note = first(state, 'talent-note', row => active(row) && row.factor === factor && row.level === level.level && ageHit(row, age) && genderHit(row, member?.gender)); if (!note) throw new Error(`${factor}未配置固定注解`)
  const contentSet = rule.contentSet || reportType?.contentSet
  const candidates = rows(state, 'talent-nurture-content').filter(active).filter(row => row.factor === factor && row.level === level.level && (!contentSet || row.contentSet === contentSet) && ageHit(row, age) && genderHit(row, member?.gender)).sort((a, b) => Number(a.priority || 0) - Number(b.priority || 0) || String(a.id).localeCompare(String(b.id)))
  if (!note.annotation?.trim()) throw new Error(`${factor}固定注解正文为空`); if (!candidates.length || !candidates[0].content?.trim()) throw new Error(`${factor}未匹配到平台培养内容`)
  const candidate = candidates[Math.floor(Math.random() * candidates.length)]
  return { factor, resultValue:raw.resultValue, factorCode:raw.factorCode, ruleId:rule.id, conditionId:rule.id, resultRange:rule.resultRange || `${rule.resultMin}–${rule.resultMax} 分`, level:level.level, category:rows(state, 'talent-factor').find(item => item.factor === factor)?.category || '未分类', matchStatus:'已匹配', rawResult:clone(raw), analyzedAge:age, ruleVersion:rule.version || 1, noteId:note.id, noteVersion:note.version || 1, note:note.annotation, nurtureTitle:candidate.title || candidate.name, nurtureContent:candidate.content, nurtureBody:candidate.content, contentId:candidate.id, contentVersion:candidate.version || 1, ruleSnapshot:clone(rule), levelSnapshot:clone(level), noteSnapshot:clone(note), contentSnapshot:clone(candidate) }
}

const unmatchedInterpretation = (raw, reason) => ({
  factor:factorName(raw) || '未识别要素', factorCode:raw?.factorCode, resultValue:raw?.resultValue,
  matchStatus:'未匹配', matchReason:reason, rawResult:clone(raw), note:'', nurtureContent:''
})

const snapshotFor = (payload, member, reportType, interpretations, generatedAt = now()) => ({
  frozen:true, version:1, generatedAt, effectiveAt:payload.analyzedAt || payload.receivedAt || generatedAt, ageTimeSource:payload.analyzedAt ? '检测时间' : '首次接收时间', reportType:reportType?.reportType || payload?.reportType || '',
  member:{ id:member?.id || '', externalSubjectId:member?.externalSubjectId || payload?.externalSubjectId || '', idNo:member?.idNo || payload?.idNo || '', gender:member?.gender || '', birthDate:member?.birthDate || '' },
  rawResults:clone(payload?.results || payload?.rawResults || []),
  factors:clone(interpretations || []).map(item => ({ ...item, rawResult:clone(item.rawResult), ruleSnapshot:clone(item.ruleSnapshot), levelSnapshot:clone(item.levelSnapshot), noteSnapshot:clone(item.noteSnapshot), contentSnapshot:clone(item.contentSnapshot) })),
  rules:clone(interpretations || []).filter(item => item.ruleId).map(item => ({ factor:item.factor, ruleId:item.ruleId, conditionId:item.conditionId, resultRange:item.resultRange, level:item.level })),
  notes:clone(interpretations || []).map(item => item.note || ''),
  nurture:clone(interpretations || []).map(item => item.nurtureContent || '')
})

const createRecommendationBatch = (state, report) => {
  const member = memberFor(state, reportMemberId(state, report))
  const plans = recommendedPlans(state, member?.id, report.contentSnapshot?.factors || report.interpretations || [])
  report.recommendations = plans.map(plan => plan.id)
  report.recommendationBatch = { id:idOf('TAL-RECOMMEND', state), reportId:report.id, reportVersion:report.version || 1, planIds:plans.map(plan => plan.id), planVersions:plans.map(plan => ({ id:plan.id, version:plan.version || 1 })), limit:Number(state.talentConfig?.recommendationLimit || 3), generatedAt:now(), strategy:'规则优先，AI 辅助回退', reasons:plans.map(plan => ({ planId:plan.id, reason:plan.matchReason })) }
  return report.recommendationBatch
}

const revokeReportSelections = (state, reportId) => {
  for (const selection of selectionRows(state).filter(item => item.reportId === reportId && ['待审核','已审核待推送','已推送'].includes(item.status))) {
    selection.status = '已取消'; selection.pushResult = '报告已撤回'; selection.cancelledAt = now()
    for (const auth of authorizationRows(state).filter(item => item.memberId === selection.memberId && item.status === '已授权')) { auth.status = '已取消'; auth.pushResult = '报告已撤回'; auth.cancelledAt = now() }
  }
}

export function previewMatch(state, result = {}) {
  try {
    const member = memberForPayload(state, result); if (!member) return { ok:false, reason:'未匹配到会员受检人标识', interpretations:[] }
    const reportType = rows(state, 'talent-report-type').find(row => active(row) && row.reportType === result.reportType); if (!reportType) return { ok:false, reason:'报告类型不存在', interpretations:[] }
    const volumes = rows(state, 'talent-volume').filter(row => active(row) && (!row.reportType || row.reportType === reportType.reportType)); if (!volumes.length) return { ok:false, reason:'报告分册未配置', interpretations:[] }
    const required = reportType.requiredFactors || rows(state, 'talent-matching-rule').filter(row => (!row.reportType || row.reportType === reportType.reportType) && active(row)).map(row => row.factor).filter(Boolean).filter((factor, index, all) => all.indexOf(factor) === index)
    const suppliedNames = (result.results || []).map(factorName); const supplied = new Set(suppliedNames); const missing = required.filter(factor => !supplied.has(factorAliases[factor] || factor) && !supplied.has(factor));
    const effectiveAt = result.analyzedAt || result.receivedAt || now()
    const interpretations = (result.results || []).map(raw => { try { return matchOne(state, raw, member, reportType, effectiveAt) } catch (error) { return unmatchedInterpretation(raw, error.message) } })
    const hasUnmatched = interpretations.some(item => item.matchStatus === '未匹配')
    const reason = missing.length ? `结果不完整，缺少：${missing.join('、')}` : hasUnmatched ? '存在未匹配要素，请补齐规则或注解后重试' : ''
    return { ok:!missing.length && !hasUnmatched, reason, missing, memberId:member.id, reportType:reportType.reportType, interpretations, contentSnapshot:snapshotFor(result, member, reportType, interpretations), recommendations:recommendedPlans(state, member.id, interpretations) }
  } catch (error) { return { ok:false, reason:error.message, interpretations:[] } }
}

export function reportDetailRows(state, report = {}, source = null) {
  return { rawRows:clone(report.rawResults || source?.rawResults || []), matchedRows:clone(report.contentSnapshot?.factors || []) }
}

export function reportInterpretationRows(state, reports = []) {
  const generations = rows(state, 'talent-generation')
  return reports.flatMap(report => {
    const source = generations.find(item => item.id === report.sourceResultId || item.externalReportId === report.externalReportId)
    return reportDetailRows(state, report, source).matchedRows.map(item => ({
      ...item,
      sourceReportId:report.id,
      externalReportId:report.externalReportId,
      status:report.status
    }))
  })
}

function exceptionResult(state, payload, reason, member, matched = {}) {
  const existing = rows(state, 'talent-generation').find(row => row.externalReportId === payload.externalReportId); const result = existing || upsert(state, 'talent-generation', {}, idOf('TAL-RESULT', state))
  Object.assign(result, { name:`${memberName(member)}第三方结果`, externalReportId:payload.externalReportId, externalSubjectId:payload.externalSubjectId || '', idNo:payload.idNo || '', memberId:member?.id || '', childId:member?.childId || member?.id || '', orgId:memberOrg(state, member), reportType:payload.reportType, analyzedAt:payload.analyzedAt, receivedAt:payload.receivedAt || result.receivedAt || now(), results:clone(payload.results || []), rawResults:clone(payload.results || []), source:'接口回传', completeness:'异常', status:'异常', exceptionReason:reason, updatedAt:now() })
  const report = reportRows(state).find(row => row.sourceResultId === result.id) || upsert(state, 'talent-report', { id:idOf('TALENT-REPORT', state) }); Object.assign(report, { name:`${memberName(member)}检测报告`, sourceResultId:result.id, externalReportId:payload.externalReportId, memberId:member?.id || '', childId:member?.childId || member?.id || '', orgId:memberOrg(state, member), reportType:payload.reportType || '', status:'异常', exceptionReason:reason, rawResults:clone(payload.results || []), interpretations:clone(matched.interpretations || []), contentSnapshot:clone(matched.contentSnapshot), history:report.history || [], updatedAt:now() })
  return { ok:false, status:'异常', reason, missing:matched.missing || [], interpretations:clone(matched.interpretations || []), resultId:result.id, reportId:report.id, record:result }
}

function receiveResult(state, payload) {
  if (!payload?.externalReportId) return { ok:false, status:'异常', reason:'缺少 externalReportId' }; if (!Array.isArray(payload.results)) return { ok:false, status:'异常', reason:'缺少结构化结果' }
  const existing = rows(state, 'talent-generation').find(row => row.externalReportId === payload.externalReportId); if (existing) return { ok:true, idempotent:true, status:existing.status, resultId:existing.id, reportId:reportRows(state).find(row => row.sourceResultId === existing.id)?.id || '' }
  const member = memberForPayload(state, payload); if (!member) return exceptionResult(state, payload, '未匹配到会员 externalSubjectId 或 idNo', null)
  payload = { ...payload, receivedAt:payload.receivedAt || now() }; const matched = previewMatch(state, payload); if (!matched.ok) return exceptionResult(state, payload, matched.reason, member, matched)
  const generatedAt = now(); const result = upsert(state, 'talent-generation', { name:`${memberName(member)}第三方结果`, externalReportId:payload.externalReportId, externalSubjectId:payload.externalSubjectId || member.externalSubjectId, idNo:payload.idNo || member.idNo, memberId:member.id, childId:member.childId || member.id, orgId:memberOrg(state, member), reportType:payload.reportType, analyzedAt:payload.analyzedAt, results:clone(payload.results), rawResults:clone(payload.results), source:'接口回传', completeness:'完整', status:'待发布', generatedAt, updatedAt:generatedAt })
  const report = upsert(state, 'talent-report', { name:`${memberName(member)}检测报告`, externalReportId:payload.externalReportId, sourceResultId:result.id, memberId:member.id, childId:member.childId || member.id, orgId:memberOrg(state, member), reportType:payload.reportType, analyzedAt:payload.analyzedAt, receivedAt:generatedAt, generatedAt, rawResults:clone(payload.results), results:clone(payload.results), interpretations:matched.interpretations, contentSnapshot:matched.contentSnapshot || snapshotFor(payload, member, rows(state, 'talent-report-type').find(row => row.reportType === payload.reportType), matched.interpretations, generatedAt), nurtureContents:matched.interpretations.filter(item => item.nurtureContent).map(item => ({ factor:item.factor, title:item.nurtureContent, contentId:item.contentId })), recommendations:matched.recommendations.map(plan => plan.id), volumes:rows(state, 'talent-volume').filter(volume => active(volume) && (!volume.reportType || volume.reportType === payload.reportType)).map(volume => volume.id), status:'待发布', history:[] })
  return { ok:true, status:'待发布', resultId:result.id, reportId:report.id, record:report }
}

export function planAvailability(state, plan) {
  return Boolean(plan && active(plan) && plan.orgId && actorOrganizationActive(state, { role:'provider', orgId:plan.orgId }))
}

export function recommendedPlans(state, memberId, interpretations = []) {
  const member = memberFor(state, memberId); if (!member) return []; const child = childForMember(state, member); const age = ageAt(member.birthDate || child?.birthDate); const gender = member.gender || child?.gender; const directionRows = rows(state, 'talent-direction'); const directionCategories = new Map(directionRows.map(item => [item.name, item.category]).filter(([, category]) => category)); const intents = member.intents || []; const directions = intents.map(item => item.direction).filter(Boolean); const directionCategoriesForMember = new Set(intents.map(item => item.category || directionCategories.get(item.direction)).filter(Boolean)); const customDirections = intents.map(item => item.custom || item.raw).filter(Boolean)
  const published = reportRows(state).find(report => reportMemberId(state, report) === member.id && report.status === '已发布'); const reportItems = interpretations.length ? interpretations : (published?.interpretations || published?.contentSnapshot?.factors || (published?.recommendations || []).map(id => planRows(state).find(plan => plan.id === id)).filter(Boolean)); if (!reportItems.length) return []; const factors = new Set(reportItems.map(item => factorName(item)).filter(Boolean));
  const matchesConditions = plan => {
    const conditions = Array.isArray(plan.elementConditions) ? plan.elementConditions : []
    if (!conditions.length) return reportItems.some(item => factorName(item) === plan.factor && (!plan.level || item.level === plan.level))
    const matched = conditions.map(condition => reportItems.some(item => factorName(item) === condition.factor && (!condition.level || item.level === condition.level) && (condition.min === undefined || Number(item.resultValue) >= Number(condition.min)) && (condition.max === undefined || Number(item.resultValue) <= Number(condition.max))))
    return plan.conditionMode === 'any' ? matched.some(Boolean) : matched.every(Boolean)
  }
  const candidates = planRows(state).map(plan => {
    const organization = rows(state, 'talent-organization').find(item => item.id === plan.orgId)
    const elementMatch = !factors.size || factors.has(plan.factor) || factors.has(plan.direction) || plan.direction === '综合发展'
    const levelMatch = !plan.level || reportItems.some(item => factorName(item) === plan.factor && item.level === plan.level)
    const planCategory = plan.category || plan.directionCategory || directionCategories.get(plan.direction) || directionCategories.get(plan.factor)
    const customPreferenceHit = customDirections.some(value => [plan.direction, plan.factor, plan.title].filter(Boolean).some(target => String(target).includes(value) || value.includes(String(target))))
    const preferenceHit = directions.includes(plan.direction) || directions.includes(plan.factor) || directionCategoriesForMember.has(planCategory) || customPreferenceHit || plan.direction === '综合发展'
    return plan.status === '已上架' && planAvailability(state, plan) && organization?.status === '启用' && organization.providerStatus === '已通过' && ageHit(plan, age) && genderHit(plan, gender) && matchesConditions(plan)
      ? { plan, preferenceHit, conditionCount:(plan.elementConditions || []).filter(condition => reportItems.some(item => factorName(item) === condition.factor)).length }
      : null
  }).filter(Boolean).sort((a, b) => Number(b.preferenceHit) - Number(a.preferenceHit) || b.conditionCount - a.conditionCount || String(a.plan.id).localeCompare(String(b.plan.id)))
  const limit = Math.max(1, Number(state.talentConfig?.recommendationLimit || 3))
  return candidates.slice(0, limit).map(({ plan, preferenceHit, conditionCount }) => clone({ ...plan, matchMode:'规则优先', preferenceHit, conditionCount, matchReason:`命中 ${conditionCount || 1} 项报告要素${preferenceHit ? '，符合培养偏好' : ''}` }))
}

export function executeClosure(state, action, payload = {}, actor = { role:'platform' }) {
  ensureClosure(state)
  const accountResult = executeAccountAction(state, action, payload, actor)
  if (accountResult) return accountResult
  payload = {
    ...payload,
    id:payload.id || payload.recordId || payload.record_id || payload.reportId || payload.report_id || payload.planId || payload.plan_id,
    resultId:payload.resultId || payload.result_id,
    memberId:payload.memberId || payload.member_id,
    orgId:payload.orgId || payload.org_id,
    planIds:payload.planIds || payload.plan_ids,
    shareProfile:payload.shareProfile ?? payload.share_profile,
    shareReports:payload.shareReports ?? payload.share_reports,
    externalSubjectId:payload.externalSubjectId || payload.external_subject_id,
    externalReportId:payload.externalReportId || payload.external_report_id
  }
  // Keep the short UI action names as aliases of the domain commands.
  if (action === 'organization-create') action = 'organization-save'
  if (action === 'organization-update') action = 'organization-save'
  if (action === 'agent-qualification' || action === 'provider-qualification') action = 'organization-qualification'
  if (action === 'agent-permissions' || action === 'provider-permissions') action = 'organization-permissions'
  if (action === 'member-create') action = 'member-save'
  if (action === 'member-reassign') action = 'member-relation'
  if (action === 'member-payment-confirm') action = 'member-payment'
  if (action === 'plan-create') action = 'plan-save'
  if (action === 'plan-review-approve') { action = 'plan-review'; payload = { ...payload, approved:true } }
  if (action === 'plan-review-reject') { action = 'plan-review'; payload = { ...payload, approved:false } }
  if (action === 'report-review-approve') { action = 'report-review'; payload = { ...payload, approved:true } }
  if (action === 'report-review-reject') { action = 'report-review'; payload = { ...payload, approved:false } }
  const fail = (reason, extra = {}) => ({ ok:false, reason, ...extra })
  if (actor.role === 'provider' && !actorOrganizationActive(state, actor)) return fail('服务商资格已停用，无法操作')
  if (['result-receive','result-retry','result-retry-all','report-generate'].includes(action) && !actorIsPlatform(actor)) return fail('仅平台可以处理第三方检测结果')
  if (action === 'organization-save') { if (!actorIsPlatform(actor)) return fail('仅平台可以维护机构'); const record = upsert(state, 'talent-organization', payload, payload.id); record.status ||= '启用'; if (record.type === '代理商') { record.agentStatus ||= '待审核'; record.providerStatus ||= '未申请' } else if (record.type === '服务商') { record.providerStatus ||= '待审核'; record.agentStatus ||= '未申请' }; record.permissions ||= { report:true, interpretation:true, plan:true, pdf:true }; return { ok:true, record } }
  if (action === 'organization-toggle') { if (!actorIsPlatform(actor)) return fail('仅平台可以停用机构'); const row = rows(state, 'talent-organization').find(item => item.id === payload.id); if (!row) return fail('机构不存在'); row.status = row.status === '启用' ? '已停用' : '启用'; return { ok:true, record:row } }
  if (action === 'organization-delete') { if (!actorIsPlatform(actor)) return fail('仅平台可以删除机构'); const row = rows(state, 'talent-organization').find(item => item.id === payload.id); if (!row) return fail('机构不存在'); if (memberRows(state).some(member => memberOrg(state, member) === row.id) || planRows(state).some(plan => plan.orgId === row.id) || authorizationRows(state).some(auth => auth.orgId === row.id)) return fail('机构已被业务数据引用，不能删除'); row.status = '已删除'; return { ok:true, record:row } }
  if (action === 'organization-account' || action === 'organization-reset-password') { if (!actorIsPlatform(actor)) return fail('仅平台可以维护机构账号'); const row = rows(state, 'talent-organization').find(item => item.id === payload.id); if (!row) return fail('机构不存在'); row.account = row.account || `${row.id.toLowerCase()}@talent.local`; row.accountInitialized = action === 'organization-account' ? true : row.accountInitialized; row.passwordResetAt = action === 'organization-reset-password' ? now() : row.passwordResetAt; return { ok:true, record:row } }
  if (action === 'organization-permissions') { if (!actorIsPlatform(actor)) return fail('仅平台可以配置机构查看权限'); const row = rows(state, 'talent-organization').find(item => item.id === payload.id); if (!row) return fail('机构不存在'); row.permissions = { ...(row.permissions || {}), ...(payload.permissions || {}) }; return { ok:true, record:row } }
  if (action === 'user-save') { if (!actorIsPlatform(actor)) return fail('仅平台可以维护机构用户'); if (!payload.username || !payload.name || !payload.organizationId || !payload.role) return fail('请填写登录账号、用户姓名、所属机构和业务角色'); const organization = rows(state, 'talent-organization').find(item => item.id === payload.organizationId); if (!organization || !active(organization)) return fail('所属机构不存在或已停用'); const duplicate = rows(state, 'talent-user').find(item => item.username === payload.username && item.id !== payload.id); if (duplicate) return fail('登录账号已存在'); const record = upsert(state, 'talent-user', { ...payload, status:payload.status || '启用' }, payload.id); return { ok:true, record } }
  if (action === 'user-toggle') { if (!actorIsPlatform(actor)) return fail('仅平台可以停用机构用户'); const row = rows(state, 'talent-user').find(item => item.id === payload.id); if (!row) return fail('用户不存在'); row.status = row.status === '启用' ? '已停用' : '启用'; return { ok:true, record:row } }
  if (action === 'user-reset-password') { if (!actorIsPlatform(actor)) return fail('仅平台可以重置机构用户密码'); const row = rows(state, 'talent-user').find(item => item.id === payload.id); if (!row) return fail('用户不存在'); row.passwordResetAt = now(); return { ok:true, record:row } }
  if (action === 'organization-qualification') { if (!actorIsPlatform(actor)) return fail('仅平台可以审核机构资质'); const row = rows(state, 'talent-organization').find(item => item.id === (payload.id || payload.orgId)); if (!row) return fail('机构不存在'); const approved = payload.approved !== false; if (!approved && !String(payload.reason || '').trim()) return fail('退回资质必须填写原因'); row[row.type === '代理商' ? 'agentStatus' : 'providerStatus'] = approved ? '已通过' : '已退回'; row.reviewReason = payload.reason || ''; return { ok:true, record:row } }
  if (action === 'parent-save') {
    if (!actorIsPlatform(actor) && (actor.role !== 'agent' || !actorOrganizationActive(state, actor))) return fail('仅有效代理商可以维护家长')
    if (payload.orgId && !actorIsPlatform(actor) && payload.orgId !== actor.orgId) return fail('不能维护其他机构家长')
    const existing = payload.id && rows(state, 'talent-parent').find(row => row.id === payload.id); if (existing && !actorIsPlatform(actor) && existing.orgId && existing.orgId !== actor.orgId) return fail('不能维护其他机构家长')
    if (payload.mobile && rows(state, 'talent-parent').some(row => row.mobile === payload.mobile && row.id !== payload.id) || payload.mobile && memberRows(state).some(row => row.mobile === payload.mobile && row.id !== payload.id)) return fail('手机号已存在')
    const record = existing || upsert(state, 'talent-parent', { id:payload.id || undefined }); const values = Object.fromEntries(Object.entries(payload).filter(([key]) => !['id','status','orgId','organizationId'].includes(key))); Object.assign(record, values, { orgId:record.orgId || actor.orgId || '', status:existing?.status || '启用', updatedAt:now() }); return { ok:true, record }
  }
  if (action === 'parent-toggle') {
    if (!actorIsPlatform(actor)) return fail('仅平台可以停用或恢复家长会员')
    const record = rows(state, 'talent-parent').find(row => row.id === payload.id)
    if (!record) return fail('家长会员不存在')
    record.status = record.status === '已停用' ? '启用' : '已停用'
    return { ok:true, record }
  }
  if (action === 'member-save') {
    const existing = payload.id && memberFor(state, payload.id)
    if (existing && !actorCanOperateMember(state, existing, actor)) return fail('无权维护其他机构会员')
    if (!existing && !actorIsPlatform(actor) && actor.role !== 'agent') return fail('仅平台或代理商可以登记会员')
    if (actor.role === 'agent' && !actorOrganizationActive(state, actor)) return fail('代理商机构未通过或已停用')
    if (payload.orgId && !actorIsPlatform(actor) && payload.orgId !== actor.orgId) return fail('不能登记其他机构会员')
    if (existing && payload.orgId && payload.orgId !== memberOrg(state, existing)) return fail('不能变更会员所属机构')
    if (payload.parentId && !validParent(state, payload.parentId)) return fail('请选择有效家长')
    const knownChildId = existing?.childId || payload.childId || payload.id
    const knownRelation = knownChildId && rows(state, 'talent-member-relation').find(row => row.childId === knownChildId && row.status === '有效')
    if (knownRelation && payload.parentId && knownRelation.parentId !== payload.parentId) return fail('孩子已绑定其他有效家长')
    const protectedFields = new Set(['paid','paymentStatus','paymentMethod','paidAt','status','selectedPlanIds','shareProfile','shareReports','selectionConfirmedAt','authorizationStatus','authorizationId'])
    const values = Object.fromEntries(Object.entries(payload).filter(([key]) => !protectedFields.has(key)))
    delete values.orgId
    delete values.organizationId
    if ((values.kind || existing?.kind) === '孩子') delete values.mobile
    if (values.externalSubjectId && memberRows(state).some(row => row.externalSubjectId === values.externalSubjectId && row.id !== existing?.id)) return fail('外部受检人标识已存在')
    if ((values.kind || existing?.kind) === '本人' && values.mobile && [...memberRows(state), ...rows(state, 'talent-parent')].some(row => row.mobile === values.mobile && row.id !== existing?.id)) return fail('手机号已存在')
    const record = existing || upsert(state, 'talent-member', {}, payload.id)
    Object.assign(record, values, { kind:values.kind || record.kind || '孩子', orgId:memberOrg(state, record) || actor.orgId || '', status:existing?.status || '登记草稿', intents:clone(values.intents || record.intents || []), updatedAt:now() })
    if (record.kind === '孩子' && record.parentId && validParent(state, record.parentId)) {
      const childId = record.childId || record.id; const child = childRows(state).find(row => row.id === childId) || upsert(state, 'talent-child', { id:childId })
      Object.assign(child, { id:childId, name:record.name || child.name, childName:record.name || child.childName, parentId:record.parentId, idNo:record.idNo || child.idNo, externalSubjectId:record.externalSubjectId || child.externalSubjectId, birthDate:record.birthDate || child.birthDate, gender:record.gender || child.gender, orgId:record.orgId || child.orgId, status:child.status || '启用' })
      const existingRelation = parentRelation(state, record); if (!existingRelation) upsert(state, 'talent-member-relation', { id:idOf('TAL-REL', state), name:`${record.parentId}与${memberName(record)}`, parentId:record.parentId, childId:childId, relationType:record.relationType || '监护人', status:'有效' })
    }
    return { ok:true, record }
  }
  if (action === 'member-submit') { const member = memberFor(state, payload.id || payload.memberId); if (!actorCanOperateMember(state, member, actor)) return fail('无权提交其他机构会员'); const incomplete = memberCompleteness(state, member); if (incomplete) return fail(incomplete); member.status = '已提交'; member.submittedAt = now(); return { ok:true, status:member.status, record:member } }
  if (action === 'member-payment' || action === 'member-pay') { if (!actorIsPlatform(actor)) return fail('线下付费确认仅由平台后台处理'); const member = memberFor(state, payload.id || payload.memberId); if (!member) return fail('会员不存在'); if (payload.paid === false) { member.paid = false; member.paymentStatus = '待付费'; member.status = '待付费'; return { ok:true, record:member } }; const incomplete = memberCompleteness(state, member); if (incomplete) return fail(`资料不完整：${incomplete}`); member.paid = true; member.paymentStatus = '已线下付费'; member.paymentMethod = payload.method || '线下付费'; member.paidAt = now(); member.status = '已提交'; return { ok:true, status:'已付费', record:member } }
  if (action === 'member-volume-purchase') { if (!actorIsPlatform(actor)) return fail('报告分册付费确认仅由平台后台处理'); const member = memberFor(state, payload.id || payload.memberId); if (!member) return fail('会员不存在'); const ids = [...new Set(payload.volumeIds || [])]; if (!ids.length) return fail('请至少选择一个已购买分册'); if (ids.some(id => !rows(state, 'talent-volume').some(volume => volume.id === id && active(volume)))) return fail('存在未启用报告分册'); member.purchasedVolumeIds = ids; member.volumePaidAt = now(); return { ok:true, status:'分册付费已更新', record:member } }
  if (action === 'member-relation') { const member = memberFor(state, payload.memberId || payload.id); if (!actorCanOperateMember(state, member, actor)) return fail('无权维护其他机构会员关系'); if (member.kind !== '孩子') return fail('孩子会员不存在'); if (!validParent(state, payload.parentId)) return fail('请选择有效家长'); rows(state, 'talent-member-relation').filter(row => row.childId === (member.childId || member.id) && row.status === '有效').forEach(row => { row.status = '已解绑'; row.unboundAt = now() }); const relation = upsert(state, 'talent-member-relation', { name:`${payload.parentId}与${memberName(member)}`, parentId:payload.parentId, childId:member.childId || member.id, relationType:payload.relationType || '监护人', status:'有效' }, payload.relationId); member.parentId = payload.parentId; member.relationType = relation.relationType; return { ok:true, record:relation } }
  if (action === 'member-unbind') { const member = memberFor(state, payload.memberId || payload.id); if (!actorCanOperateMember(state, member, actor)) return fail('无权解绑其他机构会员关系'); if (member.kind !== '孩子') return fail('孩子会员不存在'); rows(state, 'talent-member-relation').filter(row => row.childId === (member.childId || member.id) && row.status === '有效').forEach(row => { row.status = '已解绑'; row.unboundAt = now() }); member.parentId = ''; member.relationType = ''; return { ok:true, status:'已解绑', record:member } }
  if (action === 'member-toggle') { const member = memberFor(state, payload.id || payload.memberId); if (!actorCanOperateMember(state, member, actor)) return fail('无权停用其他机构会员'); member.status = member.status === '已停用' ? '已提交' : '已停用'; return { ok:true, record:member } }
  if (action === 'member-delete') { const member = memberFor(state, payload.id || payload.memberId); if (!actorCanOperateMember(state, member, actor)) return fail('无权删除其他机构会员'); if (reportRows(state).some(report => reportMemberId(state, report) === member.id)) return fail('会员已有报告引用，不能删除'); member.status = '已删除'; return { ok:true, record:member } }
  if (action === 'import-preview') {
    const records = Array.isArray(payload.records) ? payload.records : []; const mobiles = new Set([...memberRows(state), ...rows(state, 'talent-parent')].map(row => row.mobile).filter(Boolean)); const subjects = new Set(memberRows(state).map(row => row.externalSubjectId).filter(Boolean)); const errors = []
    records.forEach((row, index) => {
      const line = index + 1
      if (!row || !['孩子','本人'].includes(row.kind)) errors.push(`第${line}行会员类型无效`)
      if (!String(row?.name || '').trim()) errors.push(`第${line}行姓名不能为空`)
      if (!String(row?.externalSubjectId || '').trim()) errors.push(`第${line}行外部受检人标识不能为空`)
      if (actor.role === 'agent' && !actorOrganizationActive(state, actor)) errors.push('代理商机构未通过或已停用')
      if (row?.orgId && !actorIsPlatform(actor) && row.orgId !== actor.orgId) errors.push(`第${line}行不能登记其他机构会员`)
      if (row?.kind === '孩子' && !validParent(state, row.parentId)) errors.push(`第${line}行孩子未绑定有效家长`)
      if (row?.kind === '本人' && !row.mobile) errors.push(`第${line}行本人手机号不能为空`)
      if (row?.mobile && mobiles.has(row.mobile)) errors.push(`第${line}行手机号重复`)
      if (row?.externalSubjectId && subjects.has(row.externalSubjectId)) errors.push(`第${line}行外部受检人标识重复`)
      if (row?.mobile) mobiles.add(row.mobile); if (row?.externalSubjectId) subjects.add(row.externalSubjectId)
    })
    state.closureImport = { records:clone(records), errors, status:'预览完成' }; return { ok:errors.length === 0, status:'预览完成', errors, validCount:records.length - errors.length }
  }
  if (action === 'import-confirm') {
    if (!state.closureImport || state.closureImport.status !== '预览完成') return fail('请先完成导入预览')
    if (state.closureImport.errors.length) return fail('导入存在错误，请修正后重新上传', { errors:state.closureImport.errors })
    const before = clone(state.resources); const imported = []
    for (const row of state.closureImport.records) { const result = executeClosure(state, 'member-save', row, actor); if (!result.ok) { state.resources = before; return fail('导入存在错误，未导入任何会员', { errors:[result.reason] }) }; imported.push(result.record) }
    state.closureImport.status = '已确认'; return { ok:true, status:'导入完成', records:imported }
  }
  if (action === 'result-retry-all') {
    const exceptions = rows(state, 'talent-generation').filter(row => row.status === '异常')
    if (!exceptions.length) return fail('当前没有可重试的异常结果')
    const results = exceptions.map(row => executeClosure(state, 'result-retry', { id:row.id }, actor))
    const succeeded = results.filter(result => result.ok).length
    const failed = results.length - succeeded
    return { ok:failed === 0, status:failed ? '部分完成' : '已完成', summary:`异常结果重试完成：成功 ${succeeded} 条${failed ? `，失败 ${failed} 条` : ''}`, results }
  }
  if (action === 'result-receive' || action === 'result-retry') {
    if (action === 'result-retry') {
      const existing = rows(state, 'talent-generation').find(row => row.id === (payload.id || payload.resultId))
      if (!existing) return fail('异常结果不存在')
      if (existing.status !== '异常') return fail('只有异常结果可以重试')
      const member = memberForPayload(state, existing)
      const retryPayload = { ...existing, externalReportId:existing.externalReportId, results:clone(existing.rawResults || existing.results || []) }
      const matched = previewMatch(state, retryPayload)
      if (!matched.ok) {
        return exceptionResult(state, retryPayload, matched.reason, member, matched)
      }
      const updatedAt = now()
      Object.assign(existing, { memberId:member.id, childId:member.childId || member.id, orgId:memberOrg(state, member), results:clone(retryPayload.results), rawResults:clone(retryPayload.results), completeness:'完整', status:'待发布', exceptionReason:'', updatedAt })
      const report = reportRows(state).find(row => row.sourceResultId === existing.id) || upsert(state, 'talent-report', { sourceResultId:existing.id })
      Object.assign(report, { memberId:member.id, childId:member.childId || member.id, orgId:memberOrg(state, member), reportType:existing.reportType, analyzedAt:existing.analyzedAt, rawResults:clone(retryPayload.results), results:clone(retryPayload.results), interpretations:matched.interpretations, contentSnapshot:matched.contentSnapshot || snapshotFor(retryPayload, member, rows(state, 'talent-report-type').find(row => row.reportType === existing.reportType), matched.interpretations, updatedAt), nurtureContents:matched.interpretations.filter(item => item.nurtureContent).map(item => ({ factor:item.factor, title:item.nurtureContent, contentId:item.contentId })), recommendations:matched.recommendations.map(plan => plan.id), volumes:rows(state, 'talent-volume').filter(volume => active(volume) && (!volume.reportType || volume.reportType === existing.reportType)).map(volume => volume.id), status:'待发布', updatedAt })
      return { ok:true, status:'待发布', retry:true, resultId:existing.id, reportId:report.id, record:report }
    }
    return receiveResult(state, payload)
  }
  if (action === 'report-generate') { const source = rows(state, 'talent-generation').find(row => row.id === payload.resultId || row.externalReportId === payload.externalReportId); if (!source) return fail('未找到第三方结果'); const existingReport = reportRows(state).find(row => row.sourceResultId === source.id); if (existingReport?.status === '已发布') return fail('已发布报告不能被重新生成覆盖'); const member = memberFor(state, source.memberId || source.childId); const match = previewMatch(state, { ...source, results:source.rawResults || source.results }); if (!match.ok) return exceptionResult(state, source, match.reason, member, match); const report = existingReport || upsert(state, 'talent-report', {}); Object.assign(report, { memberId:member?.id || '', childId:member?.childId || member?.id || '', interpretations:match.interpretations, contentSnapshot:match.contentSnapshot || snapshotFor(source, member, rows(state, 'talent-report-type').find(row => row.reportType === source.reportType), match.interpretations), nurtureContents:match.interpretations.filter(item => item.nurtureContent).map(item => ({ factor:item.factor, title:item.nurtureContent, contentId:item.contentId })), recommendations:match.recommendations.map(plan => plan.id), status:'待发布', rawResults:clone(source.rawResults || source.results) }); source.status = '待发布'; source.completeness = '完整'; return { ok:true, status:'待发布', reportId:report.id, record:report } }
  if (action === 'report-review') { if (!actorIsPlatform(actor)) return fail('仅平台可以审核报告'); const report = reportRows(state).find(row => row.id === payload.id || row.externalReportId === payload.externalReportId); if (!report) return fail('报告不存在'); if (payload.approved === false && !String(payload.reason || '').trim()) return fail('退回报告必须填写原因'); report.status = payload.approved === false ? '异常' : '待发布'; report.reviewStatus = payload.approved === false ? '已退回' : '已通过'; report.reviewReason = payload.reason || ''; const source = rows(state, 'talent-generation').find(row => row.id === report.sourceResultId); if (source) source.status = report.status; return { ok:true, status:report.status, record:report } }
  if (action === 'report-update') { if (!actorIsPlatform(actor)) return fail('服务商和代理商只能只读查看报告'); const report = reportRows(state).find(row => row.id === payload.id || row.externalReportId === payload.externalReportId); if (!report) return fail('报告不存在'); report.history ||= []; report.history.push({ ...clone(report), archivedAt:now() }); const update = { ...payload }; delete update.id; delete update.externalReportId; delete update.rawResults; delete update.results; Object.assign(report, clone(update), { status:'待审核', pdfVisible:false, updatedAt:now() }); const source = rows(state, 'talent-generation').find(row => row.id === report.sourceResultId); if (source) source.status = '待审核'; return { ok:true, status:report.status, record:report } }
  if (action === 'report-publish') {
    if (!actorIsPlatform(actor)) return fail('仅平台可以发布报告')
    const report = reportRows(state).find(row => row.id === payload.id || row.externalReportId === payload.externalReportId)
    if (!report) return fail('报告不存在')
    if (report.status !== '待发布') return fail('报告必须审核通过后才能发布')
    const memberId = reportMemberId(state, report)
    const member = memberFor(state, memberId)
    if (!member) return fail('报告未关联有效会员')
    const availableVolumeIds = [...new Set((report.volumes || []).filter(id => rows(state, 'talent-volume').some(volume => volume.id === id && active(volume))))]
    const selectedVolumeIds = [...new Set(Array.isArray(payload.volumeIds) && payload.volumeIds.length ? payload.volumeIds : availableVolumeIds)]
    if (!selectedVolumeIds.length) return fail('请至少选择一册后再发布')
    if (selectedVolumeIds.some(id => !availableVolumeIds.includes(id))) return fail('所选分册不属于当前报告或已停用')
    if (!member.paid && payload.paymentConfirmed !== true) return fail('发布前请确认该会员已完成线下付费')
    if (!member.paid) {
      member.paid = true
      member.paymentStatus = '已线下付费'
      member.paymentMethod = '线下付费'
      member.paidAt = now()
      if (member.status === '待付费') member.status = '已提交'
    }
    if (!report.contentSnapshot?.factors?.length || report.contentSnapshot.factors.some(item => item.matchStatus !== '已匹配' || !item.note || !item.nurtureContent)) return fail('解读完整性检查未通过'); if (!report.recommendationBatch) createRecommendationBatch(state, report)
    report.version ||= 1
    report.status = '已发布'
    report.publishedAt = now()
    report.pdfVisible = Boolean(report.pdfFileName || report.pdfFileKey || report.attachment)
    report.publishedVolumeIds = selectedVolumeIds
    member.purchasedVolumeIds = selectedVolumeIds
    member.volumePublishedAt = report.publishedAt
    const source = rows(state, 'talent-generation').find(row => row.id === report.sourceResultId)
    if (source) source.status = '已发布'
    return { ok:true, status:report.status, record:report }
  }
  if (action === 'report-volume-publish' || action === 'report-volume-withdraw') { if (!actorIsPlatform(actor)) return fail('仅平台可以发布或撤回报告分册'); const report = reportRows(state).find(row => row.id === payload.id || row.id === payload.reportId || row.externalReportId === payload.externalReportId); if (!report) return fail('报告不存在'); const volumeId = payload.volumeId; if (!volumeId || !(report.volumes || []).includes(volumeId)) return fail('分册不属于当前报告'); if (action === 'report-volume-publish' && report.status !== '已发布') return fail('报告发布后才可单独发布分册'); const published = new Set(report.publishedVolumeIds || []); if (action === 'report-volume-publish') published.add(volumeId); else published.delete(volumeId); report.publishedVolumeIds = [...published]; report.volumeUpdatedAt = now(); return { ok:true, record:report, status:action === 'report-volume-publish' ? '分册已发布' : '分册已撤回' } }
  if (action === 'report-withdraw') { if (!actorIsPlatform(actor)) return fail('仅平台可以撤回报告'); const report = reportRows(state).find(row => row.id === payload.id || row.externalReportId === payload.externalReportId); if (!report) return fail('报告不存在'); if (report.status !== '已发布') return fail('只有已发布报告可以撤回'); report.status = '已撤回'; revokeReportSelections(state, report.id); report.withdrawnAt = now(); report.pdfVisible = false; report.publishedVolumeIds = []; const member = memberFor(state, reportMemberId(state, report)); if (member) { const remainingVolumeIds = reportRows(state).filter(item => item.id !== report.id && item.status === '已发布' && reportMemberId(state, item) === member.id).flatMap(item => item.publishedVolumeIds || []); member.purchasedVolumeIds = [...new Set(remainingVolumeIds)]; member.volumePublishedAt = remainingVolumeIds.length ? member.volumePublishedAt : ''; } const source = rows(state, 'talent-generation').find(row => row.id === report.sourceResultId); if (source) { source.status = '已撤回'; source.withdrawnAt = report.withdrawnAt } return { ok:true, status:report.status, record:report } }
  if (action === 'report-pdf' || action === 'report-upload-pdf') { if (!actorIsPlatform(actor)) return fail('服务商和代理商不能修改报告附件'); const report = reportRows(state).find(row => row.id === payload.id || row.externalReportId === payload.externalReportId); if (!report) return fail('PDF 只能上传到已有报告'); const fileName = payload.fileName || payload.pdfFileName; if (!String(fileName || '').toLowerCase().endsWith('.pdf')) return fail('只支持 PDF 文件'); report.history ||= []; report.history.push({ ...clone(report), archivedAt:now() }); report.pdfFileName = fileName; report.pdfFileKey = payload.fileKey || payload.pdfFileKey || fileName; report.status = '待审核'; report.pdfVisible = false; report.updatedAt = now(); const source = rows(state, 'talent-generation').find(row => row.id === report.sourceResultId); if (source) source.status = '待审核'; return { ok:true, status:report.status, record:report } }
  if (action === 'plan-save') {
    const isPlatformPlan = actorIsPlatform(actor)
    if (!isPlatformPlan && actor?.role !== 'provider') return fail('仅平台或服务商可以维护培养计划')
    const planOrgId = isPlatformPlan ? (payload.orgId || 'ORG-SERVICE-001') : actor.orgId
    if (!isPlatformPlan && !actorOrganizationActive(state, actor)) return fail('服务商机构未通过或已停用')
    const existing = payload.id && planRows(state).find(row => row.id === payload.id); if (existing && !actorOwnsPlan(existing, actor)) return fail('不能修改其他服务商计划')
    const wasPublished = existing?.status === '已上架'
    const values = Object.fromEntries(Object.entries(payload).filter(([key]) => !['id','orgId','status','version','history','selectionCount','institutionIds','courseIds'].includes(key)))
    if (!String(payload.title ?? existing?.title ?? '').trim() || !String(payload.content ?? existing?.content ?? '').trim() || !String(payload.direction ?? existing?.direction ?? '').trim()) return fail('计划名称、培养方向和正文不能为空')
    if (payload.elementConditions !== undefined && (!Array.isArray(payload.elementConditions) || payload.elementConditions.some(condition => !condition.factor))) return fail('要素条件必须逐项绑定要素')
    const record = existing || upsert(state, 'talent-plan', { id:payload.id || undefined, orgId:planOrgId })
    if (existing && wasPublished && !isPlatformPlan) { existing.pendingRevision = { ...clone(values), version:Number(existing.version || 1) + 1, submittedAt:'' }; return { ok:true, record } }
    if (existing) { existing.history ||= []; existing.history.push({ ...clone(existing), history:undefined, archivedAt:now() }) }
    Object.assign(record, values, { orgId:record.orgId || planOrgId, status:isPlatformPlan ? (wasPublished ? '已上架' : '已上架') : (wasPublished ? '待审核' : (existing?.status === '已退回' ? '已退回' : '草稿')), version:Number(record.version || 1) + (existing ? 1 : 0), history:record.history || [], providerId:record.orgId || planOrgId })
    return { ok:true, record }
  }
  if (action === 'plan-submit') { const plan = planRows(state).find(row => row.id === payload.id); if (!plan) return fail('培养计划不存在'); if (actor.role !== 'provider' || !actorOwnsPlan(plan, actor)) return fail('仅所属服务商可以提交培养计划'); if (!planAvailability(state, plan)) return fail('服务商资格已停用'); if (!plan.pendingRevision && (!plan.title || !plan.direction || !plan.content)) return fail('培养计划资料不完整，请填写名称、方向和正文'); plan.status = '待审核'; plan.submittedAt = now(); if (plan.pendingRevision) plan.pendingRevision.submittedAt = plan.submittedAt; return { ok:true, status:plan.status, record:plan } }
  if (action === 'plan-review') { if (!actorIsPlatform(actor)) return fail('仅平台可以审核培养计划'); const plan = planRows(state).find(row => row.id === payload.id); if (!plan) return fail('培养计划不存在'); if (plan.status !== '待审核') return fail('只有待审核培养计划可以审核'); if (payload.approved === false && !String(payload.reason || '').trim()) return fail('退回培养计划必须填写原因'); if (payload.approved !== false && plan.pendingRevision) { plan.history ||= []; plan.history.push({ ...clone(plan), pendingRevision:undefined, archivedAt:now() }); Object.assign(plan, clone(plan.pendingRevision)); delete plan.pendingRevision } if (payload.approved === false) delete plan.pendingRevision; plan.status = payload.approved === false ? '已退回' : '审核通过'; plan.reviewReason = payload.reason || ''; plan.reviewedAt = now(); return { ok:true, status:plan.status, record:plan } }
  if (action === 'plan-publish' || action === 'plan-unpublish') { const plan = planRows(state).find(row => row.id === payload.id); if (!plan) return fail('培养计划不存在'); if (actor.role !== 'provider' || !actorOwnsPlan(plan, actor)) return fail('仅所属服务商可以操作培养计划'); if (action === 'plan-publish' && !planAvailability(state, plan)) return fail('服务商资格已停用'); if (action === 'plan-publish' && plan.status !== '审核通过') return fail('培养计划需审核通过后才能上架'); plan.status = action === 'plan-publish' ? '已上架' : '已下架'; return { ok:true, status:plan.status, record:plan } }
  if (action === 'plan-delete') { const plan = planRows(state).find(row => row.id === payload.id); if (!plan) return fail('培养计划不存在'); if (actor.role !== 'provider' || !actorOwnsPlan(plan, actor)) return fail('仅所属服务商可以删除培养计划'); if (plan.selectionCount) return fail('已被客户选择，不能删除'); plan.status = '已删除'; return { ok:true, record:plan } }
  if (action === 'plan-ai-draft') {
    if (!['platform','provider'].includes(actor.role)) return fail('仅平台或服务商可以生成培养计划草稿')
    if (actor.role === 'provider' && !actorOrganizationActive(state, actor)) return fail('服务商资格已停用')
    const direction = String(payload.direction || '综合发展').trim(); const orgId = actor.role === 'provider' ? actor.orgId : (payload.orgId || 'ORG-SERVICE-001')
    const failed = payload.simulateFailure === true || payload.simulateFailure === 'true'
    const record = upsert(state, 'talent-plan', { id:idOf('TAL-PLAN-AI', state), title:`${direction}培养计划草稿`, orgId, providerId:orgId, direction, factor:payload.factor || direction, level:payload.level || 'L2', minAge:payload.minAge ?? 6, maxAge:payload.maxAge ?? 11, gender:payload.gender || '通用', summary:failed ? `规则回退生成的${direction}培养计划摘要。` : `AI 辅助生成的${direction}培养计划摘要。`, content:failed ? `基于命中要素与年龄条件生成${direction}培养建议，请人工确认。` : `AI 根据命中要素生成${direction}培养计划初稿，请人工编辑确认。`, goals:'待人工确认培养目标', focusAbilities:[], stages:[], trainingAdvice:'待人工确认训练建议', evaluationPoints:'待人工确认评估要点', precautions:'待人工补充注意事项', elementConditions:payload.elementConditions || [], conditionMode:payload.conditionMode || 'all', source:failed ? '规则回退' : 'AI 草稿', aiStatus:failed ? '失败后规则回退' : '待人工确认', status:'草稿', version:1, selectionCount:0, history:[] })
    return { ok:true, aiFallback:failed, status:'草稿', record }
  }
  if (action === 'selection-apply') {
    if (actor.role !== 'client') return fail('只有客户可以提交培养计划选择')
    const member = memberFor(state, payload.memberId); if (!member || !actorCanSeeMember(state, member, actor)) return fail('当前家长无权操作该会员')
    const planId = payload.planId; const report = reportRows(state).find(row => row.id === payload.reportId && reportMemberId(state, row) === member.id && row.status === '已发布')
    const plan = planRows(state).find(row => row.id === planId)
    if (!report || !plan || plan.status !== '已上架' || !(report.recommendations || []).includes(plan.id)) return fail('只能选择当前报告推荐的有效培养计划')
    const existing = selectionRows(state).find(row => row.memberId === member.id && ['待审核','已审核待推送','已推送'].includes(row.status))
    if (existing?.status === '已推送') return fail('已有已推送培养计划，请先取消共享后再改选')
    if (existing && existing.planId === plan.id && existing.reportId === report.id && existing.shareProfile === Boolean(payload.shareProfile) && existing.shareReports === Boolean(payload.shareReports)) return { ok:true, idempotent:true, status:existing.status, record:existing }
    const record = existing || upsert(state, 'talent-selection', {})
    if (!payload.shareProfile || !payload.shareReports) return fail('请确认共享资料和已发布报告')
    Object.assign(record, { memberId:member.id, reportId:report.id, reportVersion:report.version || 1, planId:plan.id, planVersion:plan.version || 1, recommendationLimit:state.talentConfig.recommendationLimit, shareProfile:true, shareReports:true, status:'待审核', reviewStatus:'待审核', reviewReason:'', pushResult:'待审核', createdAt:record.createdAt || now(), updatedAt:now() })
    return { ok:true, status:record.status, record }
  }
  if (action === 'selection-review') {
    if (!actorIsPlatform(actor)) return fail('仅平台可以审核客户选择')
    const record = selectionRows(state).find(row => row.id === payload.id); if (!record) return fail('客户选择申请不存在')
    if (record.status !== '待审核') return fail('当前申请不在待审核状态')
    if (payload.approved === false && !String(payload.reason || '').trim()) return fail('退回客户选择必须填写原因')
    record.status = payload.approved === false ? '已退回' : '已审核待推送'; record.reviewReason = payload.reason || ''; record.reviewedAt = now(); record.updatedAt = now()
    return { ok:true, status:record.status, record }
  }
  if (action === 'selection-push') {
    if (!actorIsPlatform(actor)) return fail('仅平台可以推送客户选择')
    const record = selectionRows(state).find(row => row.id === payload.id); if (!record) return fail('客户选择申请不存在')
    if (record.status !== '已审核待推送') return fail('客户选择尚未审核通过')
    const member = memberFor(state, record.memberId); const plan = planRows(state).find(row => row.id === record.planId)
    if (payload.simulateFailure === true || payload.simulateFailure === 'true') { record.pushResult = '推送失败'; record.status = '已审核待推送'; record.pushError = '原型模拟推送失败'; return { ok:false, status:record.status, reason:record.pushError, record } }
    if (!member || !plan || plan.status !== '已上架') { record.pushResult = '推送失败'; return fail('计划或客户已失效') }
    const existingAuth = authorizationRows(state).find(row => row.memberId === member.id && row.orgId === plan.orgId); const hadAuth = existingAuth?.status === '已授权'; const auth = existingAuth || upsert(state, 'talent-authorization', {})
    Object.assign(auth, { memberId:member.id, orgId:plan.orgId, planIds:[plan.id], shareProfile:true, shareReports:true, scope:['profile','reports','interpretations','plans','pdf'], status:'已授权', createdAt:auth.createdAt || now(), cancelledAt:'', pushResult:'已推送' })
    member.selectedPlanIds = [plan.id]; member.selectionConfirmedAt = now(); member.shareProfile = true; member.shareReports = true; plan.selectionCount = Number(plan.selectionCount || 0) + (hadAuth ? 0 : 1)
    record.status = '已推送'; record.pushResult = '已推送'; record.pushedAt = now(); record.updatedAt = now()
    return { ok:true, status:record.status, record, authorization:auth }
  }
  if (action === 'selection-cancel') {
    if (actor.role !== 'client') return fail('只有客户可以取消选择'); const member = memberFor(state, payload.memberId); if (!member || !actorCanSeeMember(state, member, actor)) return fail('当前家长无权操作该会员'); const selection = selectionRows(state).find(row => row.id === payload.id || (row.memberId === member.id && ['待审核','已审核待推送','已推送'].includes(row.status))); if (selection) { selection.status = '已取消'; selection.pushResult = '已取消共享'; selection.cancelledAt = now() }; for (const id of member.selectedPlanIds || []) { const plan = planRows(state).find(plan => plan.id === id); if (plan) plan.selectionCount = Math.max(0, Number(plan.selectionCount || 0) - 1) }; for (const auth of authorizationRows(state).filter(row => row.memberId === member.id && row.status === '已授权')) { auth.status = '已取消'; auth.cancelledAt = now(); auth.pushResult = '已取消访问' }; member.selectedPlanIds = []; member.selectionConfirmedAt = ''; member.shareProfile = false; member.shareReports = false; return { ok:true, status:'已取消', record:member, selection }
  }
  if (action === 'authorization-cancel') { if (!actorIsPlatform(actor) && !['client','provider'].includes(actor.role)) return fail('无权取消客户授权'); const auth = authorizationRows(state).find(row => row.id === payload.id || (row.memberId === payload.memberId && row.orgId === (payload.orgId || actor.orgId))); if (!auth) return fail('授权不存在'); const member = memberFor(state, auth.memberId); if (actor.role === 'client' && !actorCanSeeMember(state, member, actor)) return fail('当前家长无权取消该授权'); if (actor.role === 'provider' && auth.orgId !== actor.orgId) return fail('不能取消其他服务商授权'); auth.status = '已取消'; auth.cancelledAt = now(); auth.pushResult = '已取消访问'; return { ok:true, status:auth.status, record:auth } }
  if (action === 'ai-generate') { const record = upsert(state, 'talent-ai', { memberId:payload.memberId, type:payload.type || '培养计划草稿', direction:payload.direction || '', category:payload.category || '', suggestion:payload.suggestion || '根据会员资料生成培养方向建议', status:'待确认', updatedAt:now() }); return { ok:true, record } }
  if (action === 'ai-confirm' || action === 'ai-reject') {
    if (!actorIsPlatform(actor)) return fail('仅平台可以确认 AI 建议')
    const record = rows(state, 'talent-ai').find(row => row.id === payload.id)
    if (!record) return fail('AI 建议不存在')
    if (record.status !== '待确认') return fail('当前 AI 建议已经处理')
    record.status = action === 'ai-confirm' ? '已确认' : '已退回'
    record.reason = payload.reason || (action === 'ai-confirm' ? '平台已确认，已生成待配置草稿' : '平台退回，需补充方向依据')
    record.updatedAt = now()
    if (action === 'ai-confirm' && record.type === '缺失培养方向' && record.direction) {
      const direction = upsert(state, 'talent-direction', { id:`TAL-DIR-AI-${record.id}`, name:record.direction, category:record.category || '待归类', displayOrder:999, status:'待配置', aiSourceId:record.id, referenced:true })
      const rule = upsert(state, 'talent-matching-rule', { id:`TAL-RULE-AI-${record.id}`, factor:record.direction, direction:record.direction, category:record.category || '待归类', resultRange:'待配置', level:'待配置', contentSet:'儿童成长内容库', candidateContent:'待补充培养内容', status:'已停用', aiSourceId:record.id, referenced:true })
      const plan = upsert(state, 'talent-plan', { id:`TAL-PLAN-AI-${record.id}`, title:`${record.direction}培养计划草稿`, direction:record.direction, factor:record.direction, level:'待配置', minAge:'', maxAge:'', gender:'通用', content:'待人工补充培养目标和阶段内容', attachments:[], status:'草稿', orgId:'ORG-SERVICE-001', selectionCount:0, version:1, history:[], aiSourceId:record.id, referenced:true })
      record.generatedResourceIds = { directionId:direction.id, ruleId:rule.id, planId:plan.id }
    }
    return { ok:true, status:record.status, record }
  }
  return fail(`不支持的闭环动作：${action}`)
}

export function visibleMembers(state, actor = { role:'platform' }) { ensureClosure(state); return memberRows(state).filter(member => active(member) && actorCanSeeMember(state, member, actor)).map(clone) }

// 统一报告数据范围：平台查看全部；代理商只能查询自己引流且已发布的报告；服务商查看已授权会员的待发布和已发布报告。
export function visibleReportRecords(state, actor = { role:'platform' }) {
  ensureClosure(state)
  return reportRows(state).filter(report => {
    if (['已撤回', '已删除', '异常'].includes(report.status)) return false
    const member = memberFor(state, reportMemberId(state, report))
    if (!member || !actorCanSeeMember(state, member, actor)) return false
    if (actor.role === 'provider') {
      const auth = authorizationRows(state).find(item => item.memberId === member.id && item.orgId === actor.orgId && item.status === '已授权')
      return Boolean(report.status === '已发布' && auth?.pushResult === '已推送' && auth?.shareReports && (auth.scope || []).includes('reports'))
    }
    if (actor.role === 'agent') {
      if (report.status !== '已发布') return false
      const org = rows(state, 'talent-organization').find(item => item.id === actor.orgId)
      return memberOrg(state, member) === actor.orgId && org?.permissions?.report !== false
    }
    return true
  }).map(report => {
    const visible = clone(report)
    if (actor.role === 'provider') {
      const auth = authorizationRows(state).find(item => item.memberId === visible.memberId && item.orgId === actor.orgId && item.status === '已授权')
      const scope = auth?.scope || []
      visible.pdfVisible = visible.pdfVisible !== false && scope.includes('pdf')
      if (!scope.includes('interpretations')) { delete visible.interpretations; delete visible.results; delete visible.rawResults; delete visible.nurtureContents; delete visible.contentSnapshot }
      if (!scope.includes('plans')) delete visible.recommendations
      if (!scope.includes('pdf')) { delete visible.pdfFileName; delete visible.pdfFileKey }
    } else if (actor.role === 'agent') {
      const org = rows(state, 'talent-organization').find(item => item.id === actor.orgId)
      const permissions = org?.permissions || {}
      visible.pdfVisible = visible.pdfVisible !== false && permissions.pdf !== false
      if (permissions.interpretation === false) { delete visible.interpretations; delete visible.results; delete visible.rawResults; delete visible.nurtureContents; delete visible.contentSnapshot }
      if (permissions.plan === false) delete visible.recommendations
      if (permissions.pdf === false) { delete visible.pdfFileName; delete visible.pdfFileKey }
    } else visible.pdfVisible = visible.pdfVisible !== false
    return visible
  })
}

export function visibleReports(state, actor = { role:'platform' }) {
  return visibleReportRecords(state, actor).filter(report => report.status === '已发布')
}

export default { ensureClosure, executeClosure, visibleMembers, visibleReportRecords, visibleReports, recommendedPlans, previewMatch, reportDetailRows, reportInterpretationRows }
