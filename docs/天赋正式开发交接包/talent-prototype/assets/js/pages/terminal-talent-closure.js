import { escapeHtml, statusBadge } from './terminal-shared.js?v=talent-1.0.8'
import { renderTalentAdminContent } from './terminal-talent-admin.js?v=talent-1.0.8'
import { renderTalentMemberPanel, renderTalentReportList } from './terminal-talent-admin.js?v=talent-1.0.8'
import { ensureClosure, visibleMembers, visibleReports } from '../closure/domain.js?v=talent-1.0.8'

const rows = (state, id) => state.resources?.[id] || []
const cell = value => escapeHtml(value === undefined || value === null || value === '' ? '-' : String(value))
const action = (name, label, attrs = '') => `<button class="btn secondary small" type="button" data-closure-action="${cell(name)}" ${attrs}>${cell(label)}</button>`
const terminalAction = (name, label, attrs = '') => `<button class="btn secondary small" type="button" data-terminal-action="${cell(name)}" ${attrs}>${cell(label)}</button>`
const uiAction = (name, label, attrs = '') => `<button class="btn secondary small" type="button" data-action="${cell(name)}" ${attrs}>${cell(label)}</button>`
const link = (label, terminal, section, panel) => `<a class="btn-link" href="#/terminal?terminal=${terminal}&section=${section}&panel=${panel}">${cell(label)}</a>`
const shell = (title, summary, body, actions = '') => `<section class="terminal-card talent-closure-panel"><header><div><span class="eyebrow">天赋专项 · ${cell(title)}</span><h2>${cell(title)}</h2><p>${cell(summary)}</p></div><div class="terminal-action-row">${actions}</div></header>${body}</section>`
const filter = query => `<form class="terminal-filter" data-terminal-filter><label><span>关键词</span><input name="keyword" value="${cell(query.keyword || '')}" placeholder="按名称、编号或状态查询"></label><label><span>状态</span><select name="status"><option value="">全部状态</option>${['登记草稿','待付费','已提交','草稿','待确认','待审核','已退回','审核通过','已上架','已下架','已通过','已开通','已发布','已撤回','已授权','已取消','异常','已停用'].map(status => `<option${query.status === status ? ' selected' : ''}>${status}</option>`).join('')}</select></label><button class="btn primary small" type="submit">查询</button><button class="btn ghost small" type="button" data-action="reset-terminal-filter">重置</button></form>`
const matches = (records, query = {}) => {
  const keyword = String(query.keyword || '').trim().toLowerCase()
  const status = String(query.status || '')
  return records.filter(item => (!keyword || Object.values(item).join(' ').toLowerCase().includes(keyword)) && (!status || item.status === status))
}
const table = (records, columns, labels, renderActions = () => '') => `<div class="terminal-table terminal-axure-table"><table><thead><tr>${columns.map(column => `<th>${cell(labels[column] || column)}</th>`).join('')}<th>操作</th></tr></thead><tbody>${records.length ? records.map(item => `<tr>${columns.map(column => `<td>${column === 'status' ? statusBadge(cell(item[column])) : cell(item[column])}</td>`).join('')}<td>${renderActions(item)}</td></tr>`).join('') : `<tr><td colspan="${columns.length + 1}" class="table-empty">暂无记录</td></tr>`}</tbody></table></div>`

const summaryCards = (cards, className = '') => `<div class="terminal-metric-grid ${className}">${cards.map(card => `<article class="terminal-metric-link"><span>${cell(card.label)}</span><b>${cell(card.value)}</b><small>${cell(card.note)}</small></article>`).join('')}</div>`

function workbench(state) {
  const reports = rows(state, 'talent-report')
  const plans = rows(state, 'talent-plan')
  const results = rows(state, 'talent-generation')
  const members = rows(state, 'talent-member').length || rows(state, 'talent-child').length
  return `${summaryCards([
    { label:'待处理会员', value:members, note:'登记草稿和待补资料' },
    { label:'待处理结果', value:results.filter(item => !['已发布','已撤回'].includes(item.status)).length, note:'接收、匹配和完整性检查' },
    { label:'匹配异常', value:results.filter(item => ['异常','匹配失败','结果不完整'].includes(item.status)).length, note:'需要人工处理的异常' },
    { label:'待审核培养计划', value:plans.filter(item => item.status === '待审核').length, note:'服务商提交后进入审核' },
    { label:'待发布报告', value:reports.filter(item => item.status === '待发布').length, note:'预览后可发布' },
    { label:'已发布报告', value:reports.filter(item => item.status === '已发布').length, note:'代理商和 C 端可见' }
  ], 'talent-workbench-metrics')}${shell('工作台', '集中处理会员、结果、培养计划和报告发布任务；点击状态可进入对应业务页。', `<div class="talent-closure-callout"><b>正常路径</b><span>机构资格 → 会员登记 → 线下付费 → 结果回传 → 匹配 → 报告发布 → 客户选计划 → 服务商授权</span></div><div class="talent-closure-grid"><article><h3>最近处理记录</h3><p>结果匹配、报告发布和授权操作会写入共享状态，并在刷新后保留。</p>${link('查看报告列表', 'talent-admin', 'reports', 'talent-report')}</article><article><h3>异常数量提醒</h3><p>匹配失败、缺失结果、重复 externalReportId、规则缺口会进入异常列表。</p>${link('查看异常结果', 'talent-admin', 'reports', 'talent-report')}</article><article><h3>访问边界</h3><p>代理商只能看自己引流的已发布内容；服务商只能只读看授权客户。</p>${link('查看授权列表', 'talent-admin', 'members', 'talent-authorizations')}</article></div>`)} `
}

function organizations(state, query) {
  if (query.panel === 'talent-organization-users') return organizationUsers(state, query)
  const records = matches(rows(state, 'talent-organization').map(item => ({ ...item, userCount:rows(state, 'talent-user').filter(user => user.organizationId === item.id && user.status !== '已删除').length })), query)
  const tabs = `<nav class="talent-view-tabs" aria-label="系统设置视图"><a href="#/terminal?terminal=talent-admin&section=settings&panel=talent-organization-users">用户列表</a><a href="#/terminal?terminal=talent-admin&section=settings&panel=talent-roles">角色列表</a><a class="active" href="#/terminal?terminal=talent-admin&section=settings&panel=talent-organizations">机构列表</a></nav>`
  return shell('机构列表', '维护机构资料、机构类型和业务资格；一个机构可以配置多个登录用户。', `${tabs}${filter(query)}${table(records, ['name','type','contact','mobile','userCount','agentStatus','providerStatus','status'], { name:'机构名称', type:'机构类型', contact:'联系人', mobile:'联系电话', userCount:'登录用户', agentStatus:'代理商资格', providerStatus:'服务商资格', status:'机构状态' }, item => `${uiAction('organization-detail', '查看详情', `data-id="${cell(item.id)}"`)}${uiAction('organization-edit', '编辑', `data-id="${cell(item.id)}"`)}${link('查看用户', 'talent-admin', 'settings', 'talent-organization-users')}${action('organization-toggle', item.status === '启用' ? '停用' : '启用', `data-id="${cell(item.id)}"`)}`)}`, action('organization-create', '新增机构'))
}

function organizationUsers(state, query) {
  const records = matches(rows(state, 'talent-user').map(item => ({
    ...item,
    organizationName:rows(state, 'talent-organization').find(org => org.id === item.organizationId)?.name || item.organizationId || '-',
    roleLabel:item.role === 'provider' ? '服务商账号' : item.role === 'agent' ? '代理商账号' : '平台账号'
  })), query)
  const tabs = `<nav class="talent-view-tabs" aria-label="系统设置视图"><a class="active" href="#/terminal?terminal=talent-admin&section=settings&panel=talent-organization-users">用户列表</a><a href="#/terminal?terminal=talent-admin&section=settings&panel=talent-roles">角色列表</a><a href="#/terminal?terminal=talent-admin&section=settings&panel=talent-organizations">机构列表</a></nav>`
  const actions = item => `${uiAction('user-edit', '编辑', `data-id="${cell(item.id)}"`)}${action('user-reset-password', '重置密码', `data-id="${cell(item.id)}"`)}${action('user-toggle', item.status === '启用' ? '停用' : '启用', `data-id="${cell(item.id)}"`)}`
  return shell('用户列表', '为机构配置登录账号；用户角色决定可进入的业务端，机构类型用于标识机构业务属性。', `${tabs}${filter(query)}${table(records, ['username','name','organizationName','roleLabel','mobile','status','lastLoginAt'], { username:'登录账号', name:'用户姓名', organizationName:'所属机构', roleLabel:'业务角色', mobile:'手机号', status:'账号状态', lastLoginAt:'最近登录' }, actions)}`, action('user-create', '新增用户'))
}

function roles(state, query) {
  const menuNames = { workbench:'工作台', settings:'系统设置', partners:'代理商管理', providers:'服务商管理', members:'会员管理', rules:'天赋规则', reports:'报告列表', flow:'完整业务流程', dashboard:'工作台', plans:'培养计划', clients:'已推送客户', 'plan-review':'计划审核', 'selection-review':'客户选择审核' }
  const scopeNames = { '1':'全部数据', '2':'自定义机构数据', '3':'本机构数据', '4':'本机构及下属机构数据', '5':'仅本人数据' }
  const records = matches(rows(state, 'talent-role').map(item => ({ ...item, typeLabel:item.type === 'provider' ? '服务商' : item.type === 'agent' ? '代理商' : '平台', menuText:(item.menuIds || []).map(id => menuNames[id] || id).join('、'), scopeLabel:scopeNames[item.dataScope] || '未配置' })), query)
  const tabs = `<nav class="talent-view-tabs" aria-label="系统设置视图"><a href="#/terminal?terminal=talent-admin&section=settings&panel=talent-organization-users">用户列表</a><a class="active" href="#/terminal?terminal=talent-admin&section=settings&panel=talent-roles">角色列表</a><a href="#/terminal?terminal=talent-admin&section=settings&panel=talent-organizations">机构列表</a></nav>`
  const actions = item => `${uiAction('role-edit', '编辑', `data-id="${cell(item.id)}"`)}${action('role-toggle', item.status === '启用' ? '停用' : '启用', `data-id="${cell(item.id)}"`)}${item.builtin ? '' : action('role-delete', '删除', `data-id="${cell(item.id)}"`)}`
  return shell('角色列表', '角色关联菜单和操作权限；数据范围决定角色可见业务数据，用户归属机构后再叠加客户分配关系。', `${tabs}${filter(query)}${table(records, ['name','code','typeLabel','scopeLabel','menuText','status'], { name:'角色名称', code:'角色标识', typeLabel:'适用机构类型', scopeLabel:'数据范围', menuText:'可进入菜单', status:'角色状态' }, actions)}`, action('role-create', '新增角色'))
}

function partners(state, query, kind) {
  const organizations = rows(state, 'talent-organization').filter(item => kind === 'agent' ? ['已开通','已通过'].includes(item.agentStatus) : item.providerStatus === '已通过')
  const members = rows(state, 'talent-member').length ? rows(state, 'talent-member') : rows(state, 'talent-child')
  const permissionLabel = permissions => {
    const labels = [['report','检测报告'], ['interpretation','要素解读'], ['plan','培养计划'], ['pdf','PDF']]
    return labels.filter(([key]) => permissions?.[key] !== false).map(([, label]) => label).join('、') || '未配置'
  }
  const records = matches(organizations.map(item => ({
    ...item,
    leadCount:members.filter(member => member.orgId === item.id || member.organizationId === item.id).length,
    permissionsLabel:permissionLabel(item.permissions),
    planCount:rows(state, 'talent-plan').filter(plan => plan.orgId === item.id).length,
    authCount:rows(state, 'talent-authorization').filter(auth => auth.orgId === item.id && auth.status === '已授权').length
  })), query)
  const title = kind === 'agent' ? '代理商管理' : '服务商管理'
  const actionName = kind === 'agent' ? 'agent-qualification' : 'provider-qualification'
  return shell(title, kind === 'agent' ? '代理商只能查看自己引流客户的基础资料和已发布内容。机构资料、账号和角色在系统设置维护。' : '服务商须通过资格审核；培养计划审核通过上架后，客户共享确认才建立授权。机构资料、账号和角色在系统设置维护。', `${filter(query)}${table(records, ['name','contact','mobile','leadCount', kind === 'agent' ? 'agentStatus' : 'providerStatus', kind === 'agent' ? 'permissionsLabel' : 'planCount', kind === 'agent' ? 'status' : 'authCount'], { name:'机构名称', contact:'联系人', mobile:'联系电话', leadCount:'引流客户', agentStatus:'代理商资格', providerStatus:'服务商资格', permissionsLabel:'可查看内容', planCount:'培养计划数', status:'机构状态', authCount:'授权客户' }, item => `${action(actionName, kind === 'agent' ? '调整资格' : '审核资格', `data-id="${cell(item.id)}"`)}${kind === 'agent' ? uiAction('agent-leads', '查看引流客户', `data-org-id="${cell(item.id)}"`) : link('查看会员', 'talent-provider', 'members', 'provider-members')}`)}`)
}

function plans(state, query, role = 'platform') {
  const tab = role === 'platform' ? (query.tab || 'all') : ''
  const tabs = role === 'platform'
    ? `<nav class="talent-view-tabs" aria-label="培养计划视图"><a class="${tab === 'all' ? 'active' : ''}" href="#/terminal?terminal=talent-admin&section=rules&panel=talent-plans&tab=all">全部计划</a><a class="${tab === 'review' ? 'active' : ''}" href="#/terminal?terminal=talent-admin&section=rules&panel=talent-plans&tab=review">待审核</a><a class="${tab === 'ai' ? 'active' : ''}" href="#/terminal?terminal=talent-admin&section=rules&panel=talent-plans&tab=ai">AI 辅助建议</a></nav>`
    : ''
  if (role === 'platform' && tab === 'ai') return aiPanel(state, query, tabs)
  const source = rows(state, 'talent-plan').filter(item => {
    if (role === 'provider') {
      const provider = rows(state, 'talent-organization').find(org => org.id === item.orgId)
      return item.orgId === 'ORG-SERVICE-001' && provider?.status === '启用' && provider.providerStatus === '已通过'
    }
    if (tab === 'review') return item.status === '待审核'
    return true
  })
  const records = matches(source.map(item => ({ ...item, providerName:item.providerName || rows(state, 'talent-organization').find(org => org.id === item.orgId)?.name || item.orgId || '-', reviewReason:item.reviewReason || '-' })), query)
  const actions = item => {
    const buttons = [`${uiAction('plan-detail', '查看详情', `data-id="${cell(item.id)}"`)}`]
    if (role === 'provider') {
      if (['草稿','已退回'].includes(item.status)) buttons.push(uiAction('plan-edit', '编辑', `data-id="${cell(item.id)}"`), action('plan-submit', '提交审核', `data-id="${cell(item.id)}"`))
      if (item.status === '审核通过') buttons.push(action('plan-publish', '上架', `data-id="${cell(item.id)}"`))
      if (item.status === '已上架') buttons.push(action('plan-unpublish', '下架', `data-id="${cell(item.id)}"`))
      if (!item.selectionCount) buttons.push(action('plan-delete', '删除', `data-id="${cell(item.id)}"`))
    } else if (item.status === '待审核') buttons.push(action('plan-review-approve', '审核通过', `data-id="${cell(item.id)}"`), action('plan-review-reject', '退回', `data-id="${cell(item.id)}"`))
    return buttons.join('')
  }
  const enriched = records
  const title = role === 'provider' ? '培养计划' : '培养计划'
  const summary = role === 'provider' ? '服务商维护计划方向、要素、分级和培养内容，保存草稿后提交平台审核。' : '平台可新增平台培养计划；服务商提交的计划进入待审核，审核通过后才可上架推荐。'
  const create = `${action('plan-create', '新增培养计划')}${role === 'platform' ? action('plan-ai-draft', 'AI生成可编辑草稿', 'data-direction="逻辑思维"') : ''}`
  const columns = role === 'provider' ? ['title','direction','factor','level','status','reviewReason','version'] : ['title','providerName','direction','factor','level','status','reviewReason','version']
  const labels = { title:'计划名称', providerName:'服务商', direction:'培养方向', factor:'关联要素', level:'分级', status:'审核状态', reviewReason:'退回原因', version:'版本' }
  return shell(title, summary, `${tabs}${filter(query)}${table(enriched, columns, labels, actions)}`, role === 'provider' ? create : role === 'platform' ? create : '')
}

function planReview(state, query) {
  const pending = matches(rows(state, 'talent-plan').filter(item => item.status === '待审核').map(item => ({
    ...item,
    providerName:rows(state, 'talent-organization').find(org => org.id === item.orgId)?.name || item.orgId || '-',
    reviewReason:item.reviewReason || '-'
  })), query)
  const actions = item => `${action('plan-review-approve', '审核通过', `data-id="${cell(item.id)}"`)}${action('plan-review-reject', '退回', `data-id="${cell(item.id)}"`)}`
  return shell('计划审核', '审核服务商提交的培养计划，审核通过后由平台上架并推荐给客户。', `${filter(query)}${table(pending, ['title','providerName','direction','factor','level','status','reviewReason'], { title:'计划名称', providerName:'服务商', direction:'培养方向', factor:'关联要素', level:'分级', status:'审核状态', reviewReason:'退回原因' }, actions)}`)
}

function selectionReview(state, query) {
  const selections = rows(state, 'talent-selection').map(selection => {
    const member = rows(state, 'talent-member').find(item => item.id === selection.memberId) || {}
    const parent = rows(state, 'talent-parent').find(item => item.id === member.parentId)
    const plan = rows(state, 'talent-plan').find(item => item.id === selection.planId)
    return { ...selection, name:member.name || member.childName || selection.memberId, parentName:parent?.parentName || parent?.name || '-', planNames:plan?.title || selection.planId, selectionStatus:selection.status || '待审核', reviewReason:selection.reviewReason || '-', pushResult:selection.pushResult || '-', orgId:plan?.orgId || '' }
  })
  const records = matches(selections, query)
  const actions = item => item.selectionStatus === '待审核'
    ? `${action('selection-review', '审核', `data-id="${cell(item.id)}"`)}${action('selection-review-reject', '退回', `data-id="${cell(item.id)}"`)}`
    : item.selectionStatus === '已审核待推送'
      ? `${action('selection-push', '推送客户', `data-id="${cell(item.id)}"`)}${action('selection-push', '模拟失败', `data-id="${cell(item.id)}" data-simulate-failure="true"`)}`
      : `<span class="status-chip ${item.selectionStatus === '已推送' ? 'success' : 'neutral'}">${cell(item.selectionStatus)}</span>`
  return shell('客户选择审核', '审核客户选择的培养计划和共享范围；审核通过后再单独推送给服务商。', `${filter(query)}${table(records, ['name','parentName','planNames','shareProfile','shareReports','selectionStatus','reviewReason','pushResult'], { name:'客户/孩子', parentName:'家长', planNames:'已选择培养计划', shareProfile:'共享资料', shareReports:'共享报告', selectionStatus:'审核状态', reviewReason:'退回原因', pushResult:'推送结果' }, actions)}`)
}


function authorizations(state, query, role = 'platform') {
  let records = rows(state, 'talent-authorization')
  if (role === 'provider') { const memberIds = new Set(visibleMembers(state, { role:'provider', orgId:'ORG-SERVICE-001', userId:'TAL-USER-003' }).map(item => item.id)); records = records.filter(item => item.orgId === 'ORG-SERVICE-001' && item.status === '已授权' && memberIds.has(item.memberId)) }
  records = matches(records.map(item => ({ ...item, memberName:rows(state, 'talent-member').find(member => member.id === item.memberId)?.name || rows(state, 'talent-child').find(member => member.id === item.memberId)?.childName || item.memberId, providerName:rows(state, 'talent-organization').find(org => org.id === item.orgId)?.name || item.orgId, planNames:(item.planIds || []).map(planId => rows(state, 'talent-plan').find(plan => plan.id === planId)?.title || planId).join('、') })), query)
  return shell(role === 'provider' ? '已推送客户' : '客户选择审核', role === 'provider' ? '只读查看平台推送客户和已选培养计划。' : '审核客户选择申请后再推送给服务商。', `${filter(query)}${table(records, ['memberName','providerName','planNames','shareProfile','shareReports','status','createdAt'], { memberName:'客户/孩子', providerName:'服务商', planNames:'已选择培养计划', shareProfile:'共享资料', shareReports:'共享报告', status:'推送状态', createdAt:'推送时间' }, item => item.status === '已授权' ? action('authorization-cancel', '取消推送', `data-id="${cell(item.id)}"`) : '')}`)
}

function agentMembers(state, query) {
  return renderTalentMemberPanel(state, query, { role:'agent', orgId:'ORG-AGENT-001', userId:'TAL-USER-001' })
}

function agentReports(state, query) {
  return renderTalentReportList(state, query, { role:'agent', orgId:'ORG-AGENT-001', userId:'TAL-USER-001' })
}

function providerMembers(state, query) {
  return renderTalentMemberPanel(state, query, { role:'provider', orgId:'ORG-SERVICE-001', userId:'TAL-USER-003' })
}

function flowPanel() {
  return shell('天赋专项完整业务流程图', '按平台管理端、机构业务端、第三方结果和 C 端四条泳道展示正常路径；异常统一回到平台处理，不改写第三方检测原文。', `<div class="talent-flow-card"><div class="talent-flow-image-wrap"><img class="talent-flow-image" src="./assets/images/talent-full-closure-flow.png" alt="同佳天赋专项完整业务闭环流程图"></div><section class="talent-flow-branches"><h3>闭环判定</h3><div><span>会员资料可追溯</span><span>结果可匹配</span><span>报告先审核再发布</span><span>客户确认共享后授权</span><span>撤回后各端不可见；取消授权同步生效</span></div></section></div>`)
}

function aiPanel(state, query, tabs = '') {
  const records = matches(rows(state, 'talent-ai'), query)
  const guide = `<section class="talent-subpanel talent-business-guide"><header><div><h3>AI 建议如何进入业务</h3><span>AI 只生成待确认草稿，不直接修改检测结论，也不直接发布专业内容。</span></div></header><ol><li>会员登记时填写自定义培养意向，例如“笛子”。</li><li>AI 建议归入已有方向（如吹奏类），并生成方向、匹配规则或培养计划草稿。</li><li>平台人员人工确认或退回；确认后才进入正式规则、内容或计划。</li><li>若方向仍未配置，建议会保留在这里，等待补充后再参与报告匹配。</li></ol></section>`
  return shell('AI 辅助建议', 'AI 用于处理自定义意向和缺失培养方向，所有建议必须人工确认后才能进入培养计划或匹配规则。', `${tabs}${guide}${filter(query)}${table(records, ['type','suggestion','status','reason','updatedAt'], { type:'建议类型', suggestion:'AI 建议', status:'确认状态', reason:'处理说明', updatedAt:'更新时间' }, item => `${item.status === '待确认' ? action('ai-confirm', '人工确认', `data-id="${cell(item.id)}"`) : ''}${item.status === '待确认' ? action('ai-reject', '退回', `data-id="${cell(item.id)}"`) : ''}`)}`, action('ai-generate', '生成“笛子”方向建议', `data-type="缺失培养方向" data-direction="笛子" data-category="吹奏类" data-suggestion="系统中暂未配置“笛子”方向，建议归入吹奏类，生成方向和匹配规则草稿后由平台人工确认。"`))
}

export function renderTalentClosureContent(state, terminalId, section, query = {}) {
  ensureClosure(state)
  if (terminalId === 'talent-admin') {
    if (section === 'workbench') return workbench(state)
    if (section === 'organizations') return organizations(state, query)
    if (section === 'settings') {
      if (query.panel === 'talent-roles') return roles(state, query)
      if (query.panel === 'talent-organization-users') return organizationUsers(state, query)
      return organizations(state, { ...query, panel:'talent-organizations' })
    }
    if (section === 'partners') return partners(state, query, 'agent')
    if (section === 'providers') return partners(state, query, 'provider')
    if (section === 'plans') return plans(state, query)
    if (section === 'plan-review') return planReview(state, query)
    if (section === 'selection-review') return selectionReview(state, query)
    if (section === 'authorizations') return authorizations(state, query)
    if (section === 'members' && query.panel === 'talent-authorizations') return authorizations(state, query)
    if (section === 'rules' && query.panel === 'talent-plans') return plans(state, query)
    if (section === 'flow') return flowPanel()
    if (section === 'rules' && query.panel === 'talent-ai') return plans(state, { ...query, tab:'ai' })
    return renderTalentAdminContent(state, section, query)
  }
  if (terminalId === 'talent-agent') {
    if (section === 'members') return agentMembers(state, query)
    if (section === 'reports') return agentReports(state, query)
    return shell('代理商工作台', '处理会员列表中的登记草稿、待补资料、提交状态和所属会员报告。', `${summaryCards([{ label:'登记草稿', value:rows(state, 'talent-member').filter(item => item.status === '登记草稿').length, note:'可继续编辑' }, { label:'待提交会员', value:rows(state, 'talent-member').filter(item => ['待补资料','待提交','待付费'].includes(item.status)).length, note:'补齐资料后提交' }, { label:'报告列表', value:rows(state, 'talent-report').filter(item => item.status === '已发布').length, note:'仅自己的引流客户' }])}${link('进入会员管理', 'talent-agent', 'members', 'agent-members')} ${link('查看报告列表', 'talent-agent', 'reports', 'agent-reports')}`)
  }
  if (section === 'plans') return plans(state, query, 'provider')
  if (section === 'members' || section === 'clients') return providerMembers(state, query)
  if (section === 'reports') return shell('已推送客户', '服务商只查看平台推送客户及其报告和要素解读，报告发布由平台统一处理。', '')
    return shell('服务商工作台', '维护培养计划，并查看平台审核客户选择后推送的客户资料、报告、要素解读和培养内容。', `${summaryCards([{ label:'我的计划', value:rows(state, 'talent-plan').length, note:'草稿、审核和上架状态' }, { label:'待审核', value:rows(state, 'talent-plan').filter(item => item.status === '待审核').length, note:'等待平台处理' }, { label:'已推送客户', value:visibleMembers(state, { role:'provider', orgId:'ORG-SERVICE-001', userId:'TAL-USER-003' }).length, note:'平台审核后推送' }])}${link('进入培养计划', 'talent-provider', 'plans', 'provider-plans')} ${link('进入已推送客户', 'talent-provider', 'clients', 'provider-clients')}`)
}
