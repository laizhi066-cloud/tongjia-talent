import { escapeHtml, statusBadge } from './terminal-shared.js?v=talent-1.0.8'
import { ensureClosure, visibleMembers, visibleReports, visibleReportRecords } from '../closure/domain.js?v=talent-1.0.8'

const rows = (state, id) => state.resources?.[id] || []
const levelLabels = { L1:'潜能起步', L2:'稳定优势', L3:'明显优势', L4:'高阶优势', L5:'专长表现', L6:'卓越表现' }
const cell = value => escapeHtml(value === undefined || value === null || value === '' ? '-' : String(value))
const createAction = (resourceId, label) => `<button class="btn primary small" type="button" data-action="resource-create" data-resource="${cell(resourceId)}">${cell(label)}</button>`
const editAction = (resourceId, id) => `<button class="btn-link" type="button" data-action="resource-update" data-resource="${cell(resourceId)}" data-record="${cell(id)}">编辑</button>`
const action = (name, label, attrs = '') => `<button class="btn secondary small" type="button" data-terminal-action="${cell(name)}" ${attrs}>${cell(label)}</button>`
const closureAction = (name, label, attrs = '') => `<button class="btn secondary small" type="button" data-closure-action="${cell(name)}" ${attrs}>${cell(label)}</button>`
const uiAction = (name, label, attrs = '') => `<button class="btn-link" type="button" data-action="${cell(name)}" ${attrs}>${cell(label)}</button>`
const shell = (panel, title, summary, body, actions = '') => `<section class="terminal-card terminal-axure-panel talent-closure-panel" data-terminal-resource="${cell(panel)}"><header><div><span class="eyebrow">天赋管理后台 · ${cell(title)}</span><h2>${cell(title)}</h2><p>${cell(summary)}</p></div><div class="terminal-action-row">${actions}</div></header>${body}</section>`
const filter = (query, extra = '') => `<form class="terminal-filter" data-terminal-filter><label><span>关键词</span><input name="keyword" value="${cell(query.keyword || '')}" placeholder="请输入姓名、内容或报告编号"></label>${extra}<button class="btn primary small" type="submit">查询</button><button class="btn ghost small" type="button" data-action="reset-terminal-filter">重置</button></form>`
const matches = (records, query) => {
  const keyword = String(query.keyword || '').trim().toLowerCase()
  return keyword ? records.filter(record => Object.values(record).join(' ').toLowerCase().includes(keyword)) : records
}
const table = (records, columns, labels, renderActions = () => '') => {
  const body = records.length
    ? records.map(record => `<tr>${columns.map(key => `<td>${key === 'status' ? statusBadge(cell(record[key])) : cell(record[key])}</td>`).join('')}<td>${renderActions(record)}</td></tr>`).join('')
    : `<tr><td colspan="${columns.length + 1}" class="table-empty">暂无记录</td></tr>`
  return `<div class="terminal-table terminal-axure-table"><table><thead><tr>${columns.map(key => `<th>${cell(labels[key] || key)}</th>`).join('')}<th>操作</th></tr></thead><tbody>${body}</tbody></table></div>`
}

const reportTable = (records, renderActions) => {
  const body = records.length
    ? records.map(record => `<tr><td>${cell(record.childName)}</td><td>${cell(record.externalReportId)}</td><td>${cell(record.analyzedAt)}</td><td>${cell(record.volumeSummary)}</td><td>${cell(record.pdfFileName)}</td><td>${statusBadge(cell(record.status))}</td><td>${renderActions(record)}</td></tr>`).join('')
    : '<tr><td colspan="7" class="table-empty">暂无报告</td></tr>'
  return `<div class="terminal-table terminal-axure-table talent-report-table"><table><thead><tr><th>孩子</th><th>第三方报告编号</th><th>分析日期</th><th>分册开放范围</th><th>PDF</th><th>报告状态</th><th>操作</th></tr></thead><tbody>${body}</tbody></table></div>`
}

function memberPanel(state, query) {
  const relations = rows(state, 'talent-member-relation')
  const parents = rows(state, 'talent-parent')
  const children = rows(state, 'talent-child')
  const relationForChild = child => relations.find(relation => relation.childId === child.id && relation.status === '有效')
  const parentForChild = child => parents.find(parent => parent.id === (relationForChild(child)?.parentId || child.parentId))
  const childrenForParent = parent => children.filter(child => {
    const relation = relations.find(item => item.parentId === parent.id && item.childId === child.id && item.status === '有效')
    return Boolean(relation)
  })
  const importStatus = state.terminalDemo?.talent?.memberImport || ''
  const importPanel = importStatus
    ? `<section class="talent-subpanel talent-import-status"><header><div><h3>最近一次导入</h3><span>导入预览、错误明细和确认结果会保留在当前演示数据中。</span></div><div class="terminal-action-row">${/预览完成|错误明细/.test(importStatus) ? action('talent-member-import-errors', '查看错误明细') : ''}${/预览完成|错误明细/.test(importStatus) ? action('talent-member-import-confirm', '确认导入有效行') : ''}</div></header><p>${cell(importStatus)}</p></section>`
    : ''
  const parentRows = parents.map(parent => {
    const linkedChildren = childrenForParent(parent)
    return {
      ...parent,
      recordType:'parent',
      member:parent.parentName || parent.name,
      kind:'本人',
      parentName:'本人',
      relationSummary:linkedChildren.map(child => `${child.childName || child.name}（${child.gender || '-'}，${child.birthDate || '-'}）`).join('、') || '暂无关联孩子',
      intentText:'—',
      externalSubjectId:'—',
       paymentStatus:'—'
    }
  })
  const childRows = rows(state, 'talent-member').map(member => {
    const child = children.find(item => item.id === (member.childId || member.id))
    const parent = parentForChild(child || member)
    const relation = child ? relationForChild(child) : null
    return {
      ...member,
      recordType:'child',
      member:member.name || member.memberName || member.childName || child?.childName,
      kind:'孩子',
      parentName:parent?.parentName || parent?.name || member.parentId || '未绑定',
      mobile:parent?.mobile || member.mobile || '—',
      relationSummary:relation ? `${relation.relationType || '监护人'} · ${parent?.parentName || parent?.name || member.parentId || '未绑定'}` : '未绑定有效家长',
      intentText:(member.intents || []).map(intent => intent.direction || intent.custom || intent.raw).filter(Boolean).join('、') || '待补充',
      externalSubjectId:member.externalSubjectId || child?.externalSubjectId || '—',
       paymentStatus:member.paid ? '已确认' : '待确认'
    }
  })
  const closureMembers = matches([...parentRows, ...childRows], query)
  const rowActions = item => item.recordType === 'parent'
    ? `${editAction('talent-parent', item.id)}${uiAction('talent-member-child-create', '新增孩子', `data-parent-id="${cell(item.id)}"`)}${closureAction('parent-toggle', item.status === '已停用' ? '恢复会员' : '停用会员', `data-id="${cell(item.id)}"`)}`
     : `${uiAction('member-detail', '查看详情', `data-id="${cell(item.id)}"`)}${closureAction('member-submit', '提交会员', `data-id="${cell(item.id)}"`)}${closureAction('member-toggle', item.status === '已停用' ? '恢复会员' : '停用会员', `data-id="${cell(item.id)}"`)}`
  const closureSection = `<section class="talent-subpanel"><header><div><h3>统一会员登记</h3><span>家长和孩子共用一张会员表；这里维护会员资料、有效家长关系、培养意向和外部受检人标识。报告付费确认与分册发布在“报告列表”的发布操作中处理。</span></div></header>${table(closureMembers, ['member','kind','parentName','mobile','relationSummary','intentText','externalSubjectId','status'], { member:'会员', kind:'登记对象', parentName:'有效家长', mobile:'家长手机号', relationSummary:'家长/孩子关系', intentText:'培养意向', externalSubjectId:'外部受检人标识', status:'会员状态' }, rowActions)}</section>`
  return shell('talent-members', '会员管理', '统一维护本人或孩子会员、有效家长关系、培养意向和外部受检人标识；付费确认不在会员列表中操作。', `${filter(query)}${importPanel}${closureSection}`, `${action('talent-member-import-template', '下载 Excel 模板')}${action('talent-member-import-preview', '导入预览')}${createAction('talent-parent', '新增会员')}`)
}

function scopedMemberPanel(state, query, actor) {
  const members = visibleMembers(state, actor).map(member => {
    const parent = rows(state, 'talent-parent').find(item => item.id === member.parentId)
    const reports = visibleReports(state, actor).filter(report => report.memberId === member.id || report.childId === (member.childId || member.id))
    const authorization = rows(state, 'talent-authorization').find(item => item.memberId === member.id && item.orgId === actor.orgId && item.status === '已授权')
    const planNames = (member.selectedPlanIds?.length ? member.selectedPlanIds : (authorization?.planIds || [])).map(id => rows(state, 'talent-plan').find(plan => plan.id === id)?.title || id).filter(Boolean)
    return {
      ...member,
      parentName:parent?.parentName || parent?.name || '未绑定',
      parentMobile:parent?.mobile || member.mobile || '—',
      intentText:(member.intents || []).map(item => item.direction || item.custom || item.raw).filter(Boolean).join('、') || '待补充',
      planText:planNames.join('、') || '未选择培养计划',
      reportSummary:reports.length ? `${reports.map(report => report.name || report.title || '检测报告').join('、')} · 可只读查看要素解读` : '暂无已发布报告'
    }
  })
  const actions = item => `${uiAction('member-detail', '查看详情', `data-id="${cell(item.id)}"`)}${actor.role === 'agent' && ['登记草稿','待补资料','待提交'].includes(item.status) ? closureAction('member-submit', '提交会员', `data-id="${cell(item.id)}"`) : ''}`
  const summary = actor.role === 'agent'
    ? '与平台会员列表使用同一会员数据；本机构可新增登记、查看详情并提交所属会员。'
    : '已推送客户：与平台会员列表使用同一会员数据；仅展示平台审核客户选择后推送给本机构的会员，详情和已发布内容按权限只读查看。'
  const create = actor.role === 'agent' ? closureAction('member-create', '新增会员登记') : ''
  return shell('talent-members', actor.role === 'provider' ? '已推送客户' : '会员管理', summary, `${filter(query)}${table(matches(members, query), ['name','kind','parentName','parentMobile','intentText','planText','reportSummary','status'], { name:'会员/孩子', kind:'登记对象', parentName:'有效家长', parentMobile:'家长手机号', intentText:'培养意向', planText:'已选培养计划', reportSummary:'已发布报告', status:'会员状态' }, actions)}`, create)
}

export function renderTalentMemberPanel(state, query = {}, actor = { role:'platform' }) {
  ensureClosure(state)
  return actor.role === 'platform' ? memberPanel(state, query) : scopedMemberPanel(state, query, actor)
}

const talentHref = (panel, params = {}) => {
  const search = new URLSearchParams({ terminal:'talent-admin', section:'rules', panel, ...params })
  return `#/terminal?${search.toString()}`
}

function masterDetail(aside, content) {
  return `<div class="talent-master-detail"><aside class="talent-inner-sidebar">${aside}</aside><div class="talent-inner-content">${content}</div></div>`
}

function masterLink(label, href, active, meta = '') {
  return `<a class="talent-master-link${active ? ' active' : ''}" href="${href}"${active ? ' aria-current="page"' : ''}><span>${cell(label)}</span>${meta ? `<small>${cell(meta)}</small>` : ''}</a>`
}

function factorPanel(state, query) {
  const factors = rows(state, 'talent-factor')
  const categories = [...new Set(factors.map(item => item.category).filter(Boolean))]
  const category = query.category || categories[0] || ''
  const selected = matches(factors.filter(item => !category || item.category === category), query)
  const aside = `<div class="talent-inner-heading"><span>分类</span><b>${categories.length} 个分类</b></div>${categories.map(item => masterLink(item, talentHref('talent-factor', { category:item }), item === category, `${factors.filter(factor => factor.category === item).length} 个要素`)).join('')}`
  const body = `<div class="talent-inner-head"><div><span class="eyebrow">分类与要素</span><h2>${cell(category || '全部要素')}</h2><p>左侧选择分类，右侧维护该分类下的天赋要素；正式报告按同一目录展示 100+ 项要素。</p></div>${createAction('talent-factor', '新增天赋要素')}</div>${filter({ ...query, keyword:query.keyword || '' }, `<input type="hidden" name="category" value="${cell(category)}">`)}${table(selected, ['factor','description','displayInfo','displayOrder','status'], { factor:'要素名称', description:'基础说明', displayInfo:'展示信息', displayOrder:'展示顺序', status:'状态' }, item => editAction('talent-factor', item.id))}`
  return shell('talent-factor', '分类与要素', '按分类维护天赋要素目录，左侧选择、右侧编辑，页面结构与正式项目的分类主从页一致。', masterDetail(aside, body))
}

function levelNotePanel(state, query) {
  const factors = rows(state, 'talent-factor')
  const levels = rows(state, 'talent-level')
  const notes = rows(state, 'talent-note')
  const factor = query.factor || factors[0]?.factor || ''
  const selectedLevels = matches(levels.filter(item => !factor || item.factor === factor), query).map(item => ({ ...item, levelLabel:`${item.level} · ${levelLabels[item.level] || ''}` }))
  const selectedNotes = notes.filter(item => !factor || item.factor === factor)
  const aside = `<div class="talent-inner-heading"><span>天赋要素</span><b>${factors.length} 项</b></div>${factors.slice(0, 120).map(item => masterLink(item.factor, talentHref('talent-level', { factor:item.factor }), item.factor === factor, item.category)).join('')}`
  const body = `<div class="talent-inner-head"><div><span class="eyebrow">分级与固定注解</span><h2>${cell(factor || '请选择天赋要素')}</h2><p>分级和固定注解在同一阅读工作区维护，避免在页面间来回跳转。</p></div><div class="terminal-action-row">${createAction('talent-level', '新增分级')}${createAction('talent-note', '新增固定注解')}</div></div><section class="talent-subpanel"><header><div><h3>分级标准</h3><span>L1～L6 作为报告中的统一分级。</span></div></header>${table(selectedLevels, ['levelLabel','displayOrder','scope','status'], { levelLabel:'分级标准', displayOrder:'展示顺序', scope:'适用范围', status:'状态' }, item => editAction('talent-level', item.id))}</section><section class="talent-subpanel"><header><div><h3>固定注解</h3><span>按当前要素和分级保存固定解释文本。</span></div></header>${table(selectedNotes, ['level','annotation','status'], { level:'分级', annotation:'注解正文', status:'状态' }, item => editAction('talent-note', item.id))}</section>`
  return shell('talent-level', '分级与固定注解', '先选天赋要素，再在右侧同时查看和维护分级、固定注解。', masterDetail(aside, body))
}

function contentPanel(state, query) {
  const libraries = rows(state, 'talent-content-library')
  const selectedSet = query.contentSet || libraries[0]?.contentSet || ''
  const contents = matches(rows(state, 'talent-nurture-content').filter(item => !selectedSet || item.contentSet === selectedSet), query)
  const aside = `<div class="talent-inner-heading"><span>内容库</span><b>${libraries.length} 个库</b></div>${libraries.map(item => masterLink(item.contentSet, talentHref('talent-content-library', { contentSet:item.contentSet }), item.contentSet === selectedSet, `${rows(state, 'talent-nurture-content').filter(content => content.contentSet === item.contentSet).length} 条培养内容`)).join('')}`
  const body = `<div class="talent-inner-head"><div><span class="eyebrow">内容库与培养内容</span><h2>${cell(selectedSet || '请选择内容库')}</h2><p>左侧选择内容库，右侧维护候选池；生成报告时随机选择一条并保存到报告结果。</p></div><div class="terminal-action-row">${createAction('talent-content-library', '新增内容库')}${createAction('talent-nurture-content', '新增培养内容')}</div></div>${filter({ ...query, keyword:query.keyword || '' }, `<input type="hidden" name="contentSet" value="${cell(selectedSet)}">`)}${table(contents, ['factor','level','minAge','maxAge','gender','title','status'], { factor:'天赋要素', level:'分级', minAge:'年龄下限', maxAge:'年龄上限', gender:'适用性别', title:'培养内容', status:'状态' }, item => editAction('talent-nurture-content', item.id))}`
  return shell('talent-content-library', '内容库与培养内容', '内容库和培养内容合并为正式项目的主从页面，候选池数据一眼可见。', masterDetail(aside, body))
}

function rulesPanel(state, panel, query) {
  if (panel === 'talent-factor') return factorPanel(state, query)
  if (panel === 'talent-level' || panel === 'talent-note') return levelNotePanel(state, query)
  if (panel === 'talent-content-library' || panel === 'talent-nurture-content') return contentPanel(state, query)
  if (panel === 'talent-report-type') return rulesPanel(state, 'talent-matching-rule', query)
  const records = matches(rows(state, 'talent-matching-rule'), query).map(item => ({ ...item, matchAction:'按条件命中分级、固定注解和平台培养内容' }))
  const guide = `<section class="talent-subpanel talent-business-guide"><header><div><h3>这个页面做什么</h3><span>第三方结果回传后，系统用这里的条件判断“结果值属于哪个分级、使用哪条固定注解、关联哪条平台培养内容”。</span></div><a class="btn-link" href="#/terminal?terminal=talent-admin&section=rules&panel=talent-plans&tab=ai">查看 AI 辅助建议</a></header><ol><li>按天赋要素和结果范围定位规则。</li><li>结合年龄、性别和培养方向筛选适用规则。</li><li>命中后台分级、固定注解和平台培养内容。</li><li>生成要素解读；规则缺口进入异常，等待人工补充。</li></ol></section>`
  return shell('talent-matching-rule', '匹配规则', '维护检测结果到分级、固定注解和平台培养内容的对应关系；它是报告生成时的判断依据，不是另一个报告页面。', `${guide}${filter(query)}${table(records, ['factor','resultRange','level','contentSet','candidateContent','matchAction','priority','status'], { factor:'天赋要素', resultRange:'结果范围', level:'目标分级', contentSet:'内容库', candidateContent:'候选培养内容', matchAction:'命中后处理', priority:'排序参考', status:'状态' }, item => editAction('talent-matching-rule', item.id))}`, createAction('talent-matching-rule', '新增匹配规则'))
}

function reportPanel(state, query) {
  const reports = matches(rows(state, 'talent-report'), query).map(item => {
    const child = rows(state, 'talent-child').find(record => record.id === item.childId)
    const source = rows(state, 'talent-generation').find(record => record.id === item.sourceResultId)
    const member = rows(state, 'talent-member').find(record => record.id === (item.memberId || item.childId))
    const volumes = (item.volumes || []).map(id => rows(state, 'talent-volume').find(volume => volume.id === id)?.name || id)
    const publishedVolumes = new Set(item.publishedVolumeIds || [])
    return {
      ...item,
      childName:child?.childName || item.customer,
      resultSource:source?.source || '接口回传',
      analyzedAt:item.analyzedAt || source?.analyzedAt || '-',
      volumeSummary:volumes.length ? `${publishedVolumes.size}/${volumes.length} 册已发布` : '待接收分册',
      paymentSummary:member?.paid ? '已确认线下付费' : '发布前请确认付费',
      pdfFileName:item.pdfFileName || item.attachment || '第三方未同步，可补充上传'
    }
  })
  const reportActions = item => {
    const attrs = `data-report-id="${cell(item.id)}"`
    if (item.status === '待发布') return `${closureAction('report-publish', '发布整份报告', `data-id="${cell(item.id)}"`)}${closureAction('report-pdf', '补充/预留 PDF', `data-id="${cell(item.id)}" data-file-name="${cell((item.name || '天赋报告') + '.pdf')}"`)}${action('talent-preview-report', '查看详情', attrs)}`
    if (item.status === '待审核') return `${closureAction('report-review-approve', '审核通过', `data-id="${cell(item.id)}"`)}${closureAction('report-review-reject', '退回', `data-id="${cell(item.id)}"`)}${action('talent-preview-report', '查看详情', attrs)}`
    if (item.status === '已发布') return `${closureAction('report-withdraw', '撤回整份报告', `data-id="${cell(item.id)}"`)}${closureAction('report-pdf', '补充/替换 PDF', `data-id="${cell(item.id)}" data-file-name="${cell((item.name || '天赋报告') + '.pdf')}"`)}${action('talent-preview-report', '查看详情', attrs)}`
    if (item.status === '已撤回') return action('talent-preview-report', '查看详情', attrs)
    if (item.status === '异常') return action('talent-preview-report', '查看详情', attrs)
    return action('talent-preview-report', '查看详情', attrs)
  }
  const resultRows = matches(rows(state, 'talent-generation'), query).map(item => ({ ...item, childName:rows(state, 'talent-child').find(child => child.id === item.childId)?.childName || item.childName || '未匹配会员', missingItems:item.missingItems || item.exceptionReason || '-', matchStatus:item.completeness || item.status }))
  const sampleResults = JSON.stringify([{ factorCode:'LOGIC', resultValue:82 }, { factorCode:'FOCUS', resultValue:76 }])
  const resultTable = `<section class="talent-subpanel"><header><div><h3>接收列表</h3><span>展示外部报告编号、受检人标识、原始/结构化结果、完整性和处理状态；相同 externalReportId 只保留一条。</span></div><div class="terminal-action-row">${closureAction('result-receive', '接收示例结果', `data-external-report-id="EXT-NEW-001" data-external-subject-id="SUBJECT-CHILD-001" data-report-type="儿童成长潜能" data-analyzed-at="2026-09-20T10:00:00Z" data-results="${cell(sampleResults)}"`)}${closureAction('result-retry-all', '重试全部异常')}</div></header>${table(resultRows, ['childName','externalReportId','reportType','analyzedAt','matchStatus','missingItems','status'], { childName:'匹配会员', externalReportId:'外部报告编号', reportType:'报告类型', analyzedAt:'分析时间', matchStatus:'完整性', missingItems:'缺失/异常', status:'处理状态' }, item => item.status === '异常' ? closureAction('result-retry', '重试', `data-id="${cell(item.id)}"`) : '')}</section>`
  const flow = `<section class="talent-flow-card" aria-labelledby="talent-report-flow-title"><header class="talent-flow-card-head"><div><span class="eyebrow">报告处理说明</span><h3 id="talent-report-flow-title">先接收，后确认付费，再整份发布</h3><p>第三方结果进入接收列表；报告完整并审核通过后，在发布弹框中确认线下付费并选择本次开放的分册，所有选中分册一次性发布。</p></div><span class="talent-flow-badge">整份报告</span></header><div class="talent-process-summary"><div><span>发布前</span><b>检查会员资料、报告审核状态和线下付费</b></div><div><span>发布操作</span><b>一次选择需要开放的分册，不能单独发布某一册</b></div><div><span>撤回操作</span><b>撤回整份报告，已开放分册同步隐藏</b></div><div><span>PDF</span><b>第三方可能已经同步；后台上传只作为补充或预留</b></div></div></section>`
  const view = query.view === 'receive' ? 'receive' : 'reports'
  const tabs = `<nav class="talent-view-tabs" aria-label="报告列表视图"><a class="${view === 'reports' ? 'active' : ''}" href="#/terminal?terminal=talent-admin&section=reports&panel=talent-report&view=reports">报告列表</a><a class="${view === 'receive' ? 'active' : ''}" href="#/terminal?terminal=talent-admin&section=reports&panel=talent-report&view=receive">接收列表</a></nav>`
  return shell('talent-report', '报告列表', '集中处理第三方结果、报告审核、线下付费提示、整份报告发布和整份报告撤回。', `${tabs}${filter(query)}${view === 'receive' ? resultTable : `${flow}${reportTable(reports, reportActions)}`}`)
}

// 机构端沿用平台报告列表的字段和详情入口，只按角色收敛数据范围与可执行操作。
export function renderTalentReportList(state, query = {}, actor = { role:'agent' }) {
  ensureClosure(state)
  const reports = matches(visibleReportRecords(state, actor), query).map(item => {
    const child = rows(state, 'talent-child').find(record => record.id === item.childId)
    const source = rows(state, 'talent-generation').find(record => record.id === item.sourceResultId)
    const member = rows(state, 'talent-member').find(record => record.id === (item.memberId || item.childId))
    const volumes = (item.volumes || []).map(id => rows(state, 'talent-volume').find(volume => volume.id === id)?.name || id)
    const publishedVolumes = new Set(item.publishedVolumeIds || [])
    return { ...item, childName:child?.childName || item.customer || member?.name || '-', analyzedAt:item.analyzedAt || source?.analyzedAt || '-', volumeSummary:volumes.length ? `${publishedVolumes.size}/${volumes.length} 册已发布` : '待接收分册', paymentSummary:member?.paid ? '已确认线下付费' : '平台待确认线下付费', pdfFileName:item.pdfFileName || item.attachment || '第三方未同步，可补充上传' }
  })
  const reportActions = item => {
    const attrs = `data-report-id="${cell(item.id)}"`
    const buttons = []
    buttons.push(action('talent-preview-report', '查看详情', attrs))
    return buttons.join('')
  }
  const title = actor.role === 'provider' ? '报告列表' : '报告列表'
  const summary = actor.role === 'provider'
    ? '查看平台审核后推送客户的已发布报告、要素解读和培养内容；报告发布由平台统一处理。'
    : '查询本机构引流客户的报告；仅展示已发布内容，不能发布、撤回或修改报告。'
  return shell('talent-report', title, summary, `${filter(query)}${reportTable(reports, reportActions)}`)
}

export function renderTalentAdminContent(state, section, query = {}) {
  ensureClosure(state)
  if (section === 'members') return renderTalentMemberPanel(state, query)
  if (section === 'rules') return rulesPanel(state, query.panel || 'talent-factor', query)
  return reportPanel(state, query)
}
