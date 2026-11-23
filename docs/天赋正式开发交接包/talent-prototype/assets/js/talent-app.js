import { resourceRegistry, seedState } from './data.js?v=talent-1.0.8'
import { getRouteState, navigate, startRouter } from './router.js?v=talent-1.0.8'
import { actionForm, detailList, escapeHtml, fieldLabels, formFields, modalShell } from './components.js?v=talent-1.0.8'
import { getActionDefinition, getDestructiveDefinition } from './flows.js?v=talent-1.0.8'
import { renderHome } from './pages/home.js?v=talent-1.0.8'
import { getPanelDisplayRecord, renderTerminal } from './pages/terminal.js?v=talent-1.0.8'
import { renderFavoritePlanPicker } from './pages/visit-order.js?v=talent-1.0.8'
import { getRecordEditRestriction, getWorkbenchConfig } from './workbench-data.js?v=talent-1.0.8'
import { helpDefinitionFor, helpTypeLabel } from './help.js?v=talent-1.0.8'
import {
  createRecord, executeResourceAction, executeTerminalAction, executeVisitOrderAction, getRecord, getState,
  initStore, resetAll, safeDeleteRecord, subscribe, updateRecord, executeApprovalAction, executeClosureAction
} from './store.js?v=talent-1.0.8'
import { reportDetailRows, reportInterpretationRows, visibleMembers, visibleReports, visibleReportRecords } from './closure/domain.js?v=talent-1.0.8'

const root = document.querySelector('#app')
const ui = { modal:null }
let activeRoute = { name:'home', query:{} }

initStore(seedState)
subscribe(() => render())

const resourceById = id => resourceRegistry.find(item => item.id === id)
const displayResourceName = resource => getWorkbenchConfig(resource?.id)?.title || resource?.title || resource?.entity || '业务记录'
const uniqueRelationValues = values => [...new Set(values.filter(Boolean))]
const formatTalentDate = value => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).replace('T', ' ').replace(/\.\d{3}Z$/, '')
  const pad = number => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const relationOptions = (source, form) => {
  const state = getState()
  const values = Object.fromEntries([...form.querySelectorAll('[name]')].map(element => [element.name, element.value]))
  const rows = source === 'warehouse-location' ? (state.resources?.['supply-warehouse-location'] || []) : (state.resources?.[source] || [])
  if (source === 'talent-level-standard') {
    const select = [...form.querySelectorAll('[data-relation-select][data-options-source]')].find(item => item.dataset.optionsSource === source)
    return [...(select?.options || [])].map(option => option.value).filter(Boolean)
  }
  if (source === 'talent-factor') return uniqueRelationValues(rows.filter(row => row.status !== '已停用').map(row => row.factor || row.name))
  if (source === 'talent-level') return uniqueRelationValues(rows.filter(row => row.status !== '已停用' && (!values.factor || row.factor === values.factor)).map(row => row.level))
  if (source === 'talent-content-library') return rows.map(row => row.contentSet || row.name).filter(Boolean)
  if (source === 'talent-parent') return rows.filter(row => !['停用', '已停用'].includes(row.status)).map(row => row.id).filter(Boolean)
  if (source === 'talent-child') return rows.filter(row => !['停用', '已停用'].includes(row.status)).map(row => row.id).filter(Boolean)
  if (source === 'talent-report-type') return rows.filter(row => !['停用', '已停用'].includes(row.status)).map(row => row.reportType || row.name).filter(Boolean)
  if (source === 'talent-nurture-content') return rows.filter(row => (!values.factor || row.factor === values.factor) && (!values.level || row.level === values.level) && (!values.contentSet || row.contentSet === values.contentSet)).map(row => row.title || row.name).filter(Boolean)
  if (source === 'warehouse-location') {
    const warehouse = values.warehouse || values.sourceWarehouse || values.targetWarehouse
    return rows.filter(row => !warehouse || row.warehouse === warehouse).map(row => row.location).filter(Boolean)
  }
  if (source === 'inventory-batch') {
    const warehouse = values.warehouse || values.sourceWarehouse || values.targetWarehouse
    const location = values.location || values.sourceLocation || values.targetLocation
    return (state.resources?.['inventory-ledger'] || [])
      .filter(row => (!warehouse || row.warehouse === warehouse) && (!location || row.location === location))
      .map(row => row.batch)
      .filter(Boolean)
  }
  return []
}

function refreshRelationSelects(form) {
  if (!form) return
  for (const select of form.querySelectorAll('[data-relation-select][data-options-source]')) {
    const source = select.dataset.optionsSource
    const values = relationOptions(source, form)
    const current = select.value
    let optionLabels = {}
    try { optionLabels = JSON.parse(select.dataset.optionLabels || '{}') } catch { optionLabels = {} }
    if (source === 'talent-parent') {
      optionLabels = Object.fromEntries((getState().resources?.['talent-parent'] || []).map(row => [row.id, `${row.parentName || row.name} · ${row.mobile || ''}`]))
    }
    if (source === 'talent-child') {
      optionLabels = Object.fromEntries((getState().resources?.['talent-child'] || []).map(row => [row.id, `${row.childName || row.name} · ${row.idNo || ''}`]))
    }
    if (!values.length) {
      if (!select.dataset.emptyText) continue
      select.innerHTML = `<option value="">${escapeHtml(select.dataset.emptyText)}</option>`
      select.value = ''
      select.disabled = true
      continue
    }
    select.disabled = false
    select.innerHTML = values.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(optionLabels[value] || value)}</option>`).join('')
    select.value = values.includes(current) ? current : values[0]
  }
}

function topbar(title) {
  const miniapp = activeRoute.query.terminal === 'miniapp'
  const brandTitle = miniapp ? '天赋查询小程序' : '天赋查询系统'
  const brandSubtitle = miniapp ? '家长端' : '天赋专项'
  const brand = activeRoute.name === 'home'
    ? `<span class="top-brand current" aria-current="page"><span>TJ</span><div><b>${brandTitle}</b><small>${brandSubtitle}</small></div></span>`
    : `<a class="top-brand" href="#/home"><span>TJ</span><div><b>${brandTitle}</b><small>${brandSubtitle}</small></div></a>`
  return `<header class="app-topbar">${brand}<div class="top-context"><span>当前位置</span><b>${escapeHtml(title)}</b></div><div class="top-actions"><span class="local-badge">● 业务数据</span><button class="btn ghost small" data-action="reset-all">恢复初始数据</button></div></header>`
}

function homeShell(content) {
  return `<div class="app-frame">${topbar('天赋查询系统总览')}<main class="home-main">${content}</main>${renderModal()}</div>`
}

function workspaceShell(view) {
  return `<div class="app-frame ${view.shellClass || ''}">${topbar(view.title || '业务工作台')}<div class="workspace-shell">${view.sidebar}<main class="workspace-main">${view.content}</main></div>${renderModal()}</div>`
}

function agentLeadsModal(orgId) {
  const state = getState()
  const organization = (state.resources?.['talent-organization'] || []).find(item => item.id === orgId)
  const parents = state.resources?.['talent-parent'] || []
  const children = state.resources?.['talent-child'] || []
  const members = (state.resources?.['talent-member'] || []).filter(member => member.orgId === orgId || member.organizationId === orgId)
  const publishedReports = state.resources?.['talent-report'] || []
  const rows = members.length
    ? members.map(member => {
      const childId = member.childId || member.id
      const child = children.find(item => item.id === childId)
      const parent = parents.find(item => item.id === (member.parentId || child?.parentId))
      const reports = publishedReports.filter(report => report.status === '已发布' && report.childId === childId)
      const intents = (member.intents || []).map(intent => intent.direction || intent.custom || intent.raw).filter(Boolean).join('、') || '待补充'
      const reportText = reports.length ? reports.map(report => report.name || report.title || '天赋检测报告').join('、') : '暂无已发布报告'
      return `<tr><td>${escapeHtml(member.name || member.childName || child?.childName || '-')}</td><td>${escapeHtml(member.kind || (child ? '孩子' : '本人'))}</td><td>${escapeHtml(parent?.parentName || parent?.name || member.parentId || '未绑定')}</td><td>${escapeHtml(parent?.mobile || member.mobile || '—')}</td><td>${escapeHtml(intents)}</td><td>${escapeHtml(reportText)}</td></tr>`
    }).join('')
    : '<tr><td colspan="6" class="table-empty">暂无本机构引流客户</td></tr>'
  const body = `<div class="talent-closure-callout"><b>访问范围</b><span>只显示 ${escapeHtml(organization?.name || orgId || '当前代理商')} 自己引流的客户及已发布报告，未发布内容和其他机构客户不会出现在这里。</span></div><div class="terminal-table terminal-axure-table"><table><thead><tr><th>客户</th><th>登记对象</th><th>有效家长</th><th>家长手机号</th><th>培养意向</th><th>已发布报告</th></tr></thead><tbody>${rows}</tbody></table></div>`
  return modalShell({ title:'查看引流客户', subtitle:`${organization?.name || '代理商'} · 只读客户范围`, body, footer:'<button class="btn primary" data-action="close-modal">关闭</button>' })
}

const routeActor = () => {
  const terminal = activeRoute.query.terminal
  const state = getState()
  if (terminal === 'talent-agent') return { role:'agent', orgId:'ORG-AGENT-001', userId:'TAL-USER-001' }
  if (terminal === 'talent-provider') return { role:'provider', orgId:'ORG-SERVICE-001', userId:'TAL-USER-003' }
  if (terminal === 'miniapp') return { role:'client', parentId:state.terminalDemo?.talent?.currentParentId || state.terminalDemo?.talent?.parentId || '' }
  return { role:'platform' }
}

function refreshPlanLevelSelect(form) {
  if (!form) return
  const factorSelect = form.querySelector('[data-plan-factor]')
  const levelSelect = form.querySelector('[data-plan-level]')
  if (!factorSelect || !levelSelect) return
  const factor = factorSelect.value
  const levels = [...new Set((getState().resources?.['talent-level'] || [])
    .filter(item => item.status !== '已停用' && (!factor || item.factor === factor))
    .map(item => item.level)
    .filter(Boolean))]
  const current = levelSelect.value
  levelSelect.innerHTML = levels.length
    ? levels.map(level => `<option value="${escapeHtml(level)}">${escapeHtml(level)}</option>`).join('')
    : '<option value="">暂无可用分级</option>'
  levelSelect.value = levels.includes(current) ? current : levels[0] || ''
  levelSelect.disabled = !levels.length
}

function memberDetailBody(member, actor = routeActor()) {
  const state = getState()
  const list = id => state.resources?.[id] || []
  const childId = member.childId || member.id
  const child = list('talent-child').find(item => item.id === childId)
  const parent = list('talent-parent').find(item => item.id === member.parentId)
  const relation = list('talent-member-relation').find(item => item.childId === childId && item.status === '有效')
  const organization = list('talent-organization').find(item => item.id === (member.orgId || member.organizationId))
  const canSeeMember = visibleMembers(state, actor).some(item => item.id === member.id)
  if (!canSeeMember) return '<div class="empty-state"><b>无权查看该会员详情</b><p>当前角色只能查看自己数据范围内的会员。</p></div>'
  const scopedReports = visibleReportRecords(state, actor)
  const scopedById = new Map(scopedReports.map(item => [item.id, item]))
  const reports = list('talent-report')
    .filter(item => (item.memberId === member.id || item.childId === childId) && (actor.role === 'platform' || scopedById.has(item.id)))
    .map(item => actor.role === 'platform' ? item : scopedById.get(item.id))
  const volumes = list('talent-volume')
  const authorizations = list('talent-authorization').filter(item => item.memberId === member.id)
  const aiRecords = list('talent-ai').filter(item => item.memberId === member.id)
  const plans = (member.selectedPlanIds || []).map(id => list('talent-plan').find(plan => plan.id === id)).filter(Boolean)
  const row = (label, value) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value === undefined || value === null || value === '' ? '-' : String(value))}</dd></div>`
  const intents = (member.intents || []).map(intent => `${intent.direction || intent.custom || intent.raw || '-'}${intent.primary ? '（主要）' : ''}${intent.remark ? ` · ${intent.remark}` : ''}`).join('；') || '待补充'
  const reportCards = reports.length
    ? reports.map(report => {
      const allVolumeNames = (report.volumes || []).map(id => volumes.find(volume => volume.id === id)?.name || id).join('、') || '未配置分册'
      const publishedVolumeNames = (report.publishedVolumeIds || []).map(id => volumes.find(volume => volume.id === id)?.name || id).join('、') || '暂无开放分册'
      return `<article class="talent-subpanel"><h3>${escapeHtml(report.name || report.title || '检测报告')}</h3><p>报告类型：${escapeHtml(report.reportType || '-')} · 发布状态：${escapeHtml(report.status || '-')}${report.withdrawnAt ? ' · 已撤回' : ''}</p><p>第三方返回分册：${escapeHtml(allVolumeNames)}</p><p>当前开放分册：${escapeHtml(publishedVolumeNames)}</p><p>PDF：${escapeHtml(report.pdfVisible && report.pdfFileName ? report.pdfFileName : '未发布或不可见')}</p></article>`
    }).join('')
    : '<div class="empty-state"><b>暂无检测报告</b><p>第三方结果接收并发布后会显示在这里。</p></div>'
  const interpretationRows = reportInterpretationRows(state, reports)
  const interpretationTable = interpretationRows.length
    ? `<div class="terminal-table terminal-axure-table"><table><thead><tr><th>要素</th><th>结果值</th><th>分级</th><th>固定注解</th><th>培养内容</th></tr></thead><tbody>${interpretationRows.map(item => `<tr><td>${escapeHtml(item.factor || '-')}</td><td>${escapeHtml(item.resultValue ?? '-')}</td><td>${escapeHtml(item.level || '-')}</td><td>${escapeHtml(item.note || '-')}</td><td>${escapeHtml(item.nurtureContent || '-')}</td></tr>`).join('')}</tbody></table></div>`
    : '<div class="empty-state"><b>暂无要素解读</b><p>结果未匹配或报告未发布时不会展示要素解读。</p></div>'
  const authTable = authorizations.length
    ? `<div class="terminal-table terminal-axure-table"><table><thead><tr><th>服务商</th><th>授权计划</th><th>共享资料</th><th>共享报告</th><th>状态</th></tr></thead><tbody>${authorizations.map(item => `<tr><td>${escapeHtml(list('talent-organization').find(org => org.id === item.orgId)?.name || item.orgId)}</td><td>${escapeHtml((item.planIds || []).map(id => list('talent-plan').find(plan => plan.id === id)?.title || id).join('、'))}</td><td>${item.shareProfile ? '已共享' : '未共享'}</td><td>${item.shareReports ? '已共享' : '未共享'}</td><td>${escapeHtml(item.status || '-')}</td></tr>`).join('')}</tbody></table></div>`
    : '<div class="empty-state"><b>暂无服务商授权</b><p>客户在 C 端确认共享后建立授权。</p></div>'
  const planText = plans.length ? plans.map(plan => `${plan.title || plan.id}（${list('talent-organization').find(org => org.id === plan.orgId)?.name || plan.orgId}）`).join('；') : '客户尚未选择培养计划'
  const aiText = aiRecords.length ? aiRecords.map(item => `${item.type}：${item.status}${item.reason ? ` · ${item.reason}` : ''}`).join('；') : '暂无 AI 建议'
  const serviceBlock = actor.role === 'provider'
    ? `<section class="talent-subpanel"><header><div><h3>客户选择的培养内容</h3><span>仅展示客户选择的计划和平台已发布内容</span></div></header><dl class="detail-list">${row('客户选择计划', planText)}</dl></section>`
    : `<section class="talent-subpanel"><header><div><h3>客户选择与服务商授权</h3><span>客户确认共享后建立授权</span></div></header><dl class="detail-list">${row('客户选择计划', planText)}${row('共享范围', member.shareProfile || member.shareReports ? `资料：${member.shareProfile ? '已确认' : '未确认'} · 报告：${member.shareReports ? '已确认' : '未确认'}` : '客户尚未确认共享')}</dl>${authTable}</section>`
  return `<div class="talent-member-detail"><section class="talent-subpanel"><header><div><h3>基本资料</h3><span>会员身份与外部受检人标识</span></div></header><dl class="detail-list">${row('会员姓名', member.name || member.childName)}${row('登记对象', member.kind || (child ? '孩子' : '本人'))}${row('会员状态', member.status)}${row('联系电话', member.mobile || parent?.mobile)}${row('出生日期', member.birthDate || child?.birthDate)}${row('性别', member.gender || child?.gender)}${row('外部受检人标识', member.externalSubjectId)}</dl></section><section class="talent-subpanel"><header><div><h3>家长关系</h3><span>一个孩子只保留一位有效家长</span></div></header><dl class="detail-list">${row('有效家长', parent?.parentName || parent?.name || member.parentId)}${row('家长手机号', parent?.mobile)}${row('关系类型', relation?.relationType || member.relationType)}${row('关系状态', relation?.status || '未绑定')}</dl></section><section class="talent-subpanel"><header><div><h3>来源与归属</h3><span>代理商引流和来源渠道</span></div></header><dl class="detail-list">${row('所属机构', organization?.name || member.organization)}${row('机构类型', organization?.type)}${row('来源渠道', member.channel || organization?.channel || '代理商引流登记')}</dl></section><section class="talent-subpanel"><header><div><h3>培养意向</h3><span>客户原始描述和标准培养方向</span></div></header>${actor.role === 'provider' ? '<p>培养意向仅用于服务沟通。</p>' : `<dl class="detail-list">${row('培养意向', intents)}${row('AI 辅助处理', aiText)}</dl>`}</section><section class="talent-subpanel"><header><div><h3>检测结果与要素解读</h3><span>原始结果不可被改写，解读按规则匹配</span></div></header>${interpretationTable}</section><section class="talent-subpanel"><header><div><h3>检测报告与分册</h3><span>只展示当前生效版本；撤回后同步隐藏</span></div></header>${reportCards}</section>${serviceBlock}`
}

function organizationDetailBody(organization) {
  const state = getState()
  const list = id => state.resources?.[id] || []
  const members = list('talent-member').filter(item => (item.orgId || item.organizationId) === organization.id)
  const reports = list('talent-report').filter(item => item.orgId === organization.id)
  const authorizations = list('talent-authorization').filter(item => item.orgId === organization.id)
  const plans = list('talent-plan').filter(item => item.orgId === organization.id)
  const row = (label, value) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value === undefined || value === null || value === '' ? '-' : String(value))}</dd></div>`
  const permissionText = [['report','检测报告'], ['interpretation','要素解读'], ['plan','培养计划'], ['pdf','PDF']].filter(([key]) => organization.permissions?.[key] !== false).map(([, label]) => label).join('、') || '未配置'
  return `<div class="talent-member-detail"><section class="talent-subpanel"><header><div><h3>机构资料</h3><span>联系人和账号信息</span></div></header><dl class="detail-list">${row('机构名称', organization.name)}${row('机构类型', organization.type)}${row('机构状态', organization.status)}${row('联系人', organization.contact)}${row('联系电话', organization.mobile)}${row('账号', organization.account)}${row('代理商资格', organization.agentStatus)}${row('服务商资格', organization.providerStatus)}${row('可查看内容', permissionText)}</dl></section><section class="talent-subpanel"><header><div><h3>关联业务</h3><span>引流会员、已发布报告、培养计划和授权客户</span></div></header><dl class="detail-list">${row('引流会员', members.length)}${row('检测报告', reports.length)}${row('培养计划', plans.length)}${row('授权客户', authorizations.filter(item => item.status === '已授权').length)}</dl></section></div>`
}

function closurePlanForm(record) {
  const state = getState()
  const factors = [...new Set((state.resources?.['talent-factor'] || []).filter(item => item.status !== '已停用').map(item => item.factor || item.name).filter(Boolean))]
  const levels = [...new Set((state.resources?.['talent-level'] || []).filter(item => item.status !== '已停用').map(item => item.level).filter(Boolean))]
  const providers = (state.resources?.['talent-organization'] || []).filter(item => item.type === '服务商' && item.status === '启用' && item.providerStatus === '已通过')
  const option = (value, selected) => `<option value="${escapeHtml(value)}"${String(value) === String(selected) ? ' selected' : ''}>${escapeHtml(value)}</option>`
  const factorOptions = factors.map(value => option(value, record?.factor || factors[0])).join('') || '<option value="">暂无可用天赋要素</option>'
  const levelOptions = levels.map(value => option(value, record?.level || levels[0])).join('') || '<option value="">暂无可用分级</option>'
  const providerOptions = providers.map(item => `<option value="${escapeHtml(item.id)}"${item.id === (record?.orgId || 'ORG-SERVICE-001') ? ' selected' : ''}>${escapeHtml(item.name)}</option>`).join('')
  const conditions = (record?.elementConditions || [{ factor:record?.factor || factors[0] || '', level:record?.level || levels[0] || '', min:record?.minAge ?? '', max:record?.maxAge ?? '' }])
  const conditionRows = conditions.map((item, index) => `<div class="talent-condition-row" data-condition-row><select name="conditionFactor" data-condition-factor>${factors.map(value => option(value, item.factor)).join('')}</select><select name="conditionLevel">${levels.map(value => option(value, item.level)).join('')}</select><input name="conditionMin" type="number" value="${escapeHtml(item.min ?? '')}" placeholder="最小分"><input name="conditionMax" type="number" value="${escapeHtml(item.max ?? '')}" placeholder="最大分"><button type="button" class="btn-link" data-action="remove-plan-condition" data-index="${index}">删除</button></div>`).join('')
  return `<form class="operation-form" data-closure-form="plan-save">${record ? `<input type="hidden" name="id" value="${escapeHtml(record.id)}">` : ''}<div class="form-grid"><label class="form-field"><span>计划名称 <em>必填</em></span><input name="title" required value="${escapeHtml(record?.title || '')}"></label><label class="form-field"><span>绑定服务商 <em>必填</em></span><select name="orgId" required>${providerOptions}</select></label><label class="form-field"><span>培养方向 <em>必填</em></span><input name="direction" required value="${escapeHtml(record?.direction || '')}"></label><label class="form-field"><span>关联天赋要素 <em>必填</em></span><select name="factor" required>${factorOptions}</select></label><label class="form-field"><span>适用分级</span><select name="level">${levelOptions}</select></label><label class="form-field"><span>年龄下限</span><input name="minAge" type="number" min="0" value="${escapeHtml(record?.minAge ?? 6)}"></label><label class="form-field"><span>年龄上限</span><input name="maxAge" type="number" min="0" value="${escapeHtml(record?.maxAge ?? 11)}"></label><label class="form-field span-2"><span>计划摘要</span><textarea name="summary">${escapeHtml(record?.summary || '')}</textarea></label><label class="form-field span-2"><span>培养目标</span><textarea name="goals">${escapeHtml(record?.goals || '')}</textarea></label><label class="form-field span-2"><span>重点能力</span><input name="focusAbilities" value="${escapeHtml((record?.focusAbilities || []).join('、'))}"></label><label class="form-field span-2"><span>分阶段安排</span><textarea name="stages">${escapeHtml((record?.stages || []).map(stage => `${stage.name || ''}：${stage.content || ''}`).join('\n'))}</textarea></label><label class="form-field span-2"><span>训练建议</span><textarea name="trainingAdvice">${escapeHtml(record?.trainingAdvice || '')}</textarea></label><label class="form-field span-2"><span>评估方式</span><textarea name="evaluationPoints">${escapeHtml(record?.evaluationPoints || '')}</textarea></label><label class="form-field span-2"><span>注意事项</span><textarea name="precautions">${escapeHtml(record?.precautions || '')}</textarea></label><fieldset class="form-field span-2"><legend>要素条件（all / any）</legend><select name="conditionMode"><option value="all"${record?.conditionMode !== 'any' ? ' selected' : ''}>全部条件（all）</option><option value="any"${record?.conditionMode === 'any' ? ' selected' : ''}>任一条件（any）</option></select><div class="talent-condition-list" data-condition-list>${conditionRows}</div><button type="button" class="btn-link" data-action="add-plan-condition">＋添加要素条件</button></fieldset></div><div class="form-submit"><button class="btn ghost" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">${record ? '保存计划修改' : '保存计划草稿'}</button></div></form>`
}

function reportDetailBody(report, actor = routeActor()) {
  const state = getState()
  const list = id => state.resources?.[id] || []
  const scopedReport = actor.role === 'platform' ? report : visibleReportRecords(state, actor).find(item => item.id === report.id)
  const visible = Boolean(scopedReport)
  if (!visible) return '<div class="empty-state"><b>无权查看该报告详情</b><p>当前角色只能查看自己数据范围内的已发布报告。</p></div>'
  const viewReport = scopedReport || report
  const source = list('talent-generation').find(item => item.id === viewReport.sourceResultId || item.externalReportId === viewReport.externalReportId)
  const member = list('talent-member').find(item => item.id === (viewReport.memberId || viewReport.childId))
  const child = list('talent-child').find(item => item.id === (viewReport.childId || viewReport.memberId))
  const row = (label, value) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value === undefined || value === null || value === '' ? '-' : String(value))}</dd></div>`
  const { rawRows, matchedRows } = reportDetailRows(state, viewReport, source)
  const rawTable = rawRows.length
    ? `<div class="terminal-table terminal-axure-table"><table><thead><tr><th>检测要素</th><th>原始结果值</th><th>来源</th></tr></thead><tbody>${rawRows.map(item => `<tr><td>${escapeHtml(item.factor || item.factorName || item.factorCode || '-')}</td><td>${escapeHtml(item.resultValue ?? '-')}</td><td>${escapeHtml(source?.source || '第三方结果')}</td></tr>`).join('')}</tbody></table></div>`
    : '<div class="empty-state"><b>暂无原始检测结果</b><p>请先在接收列表完成结果接收。</p></div>'
  const matchedTable = matchedRows.length
    ? `<div class="terminal-table terminal-axure-table"><table><thead><tr><th>天赋要素</th><th>结果值</th><th>命中范围</th><th>命中分级</th><th>固定注解</th><th>培养内容</th><th>命中规则</th></tr></thead><tbody>${matchedRows.map(item => `<tr><td>${escapeHtml(item.factor || item.factorName || '-')}</td><td>${escapeHtml(item.resultValue ?? '-')}</td><td>${escapeHtml(item.resultRange || '-')}</td><td>${escapeHtml(item.level || '-')}</td><td>${escapeHtml(item.note || item.annotation || '-')}</td><td>${escapeHtml(item.nurtureContent || item.candidateContent || '-')}</td><td>${escapeHtml(item.ruleId || item.conditionId || '已命中')}</td></tr>`).join('')}</tbody></table></div>`
    : '<div class="empty-state"><b>暂无命中明细</b><p>可能尚未生成解读，或当前结果存在规则缺口。</p></div>'
  const volumes = (viewReport.volumes || []).map(id => list('talent-volume').find(item => item.id === id)?.name || id)
  const publishedVolumes = new Set(viewReport.publishedVolumeIds || [])
  const recommendations = (viewReport.recommendations || []).map(id => list('talent-plan').find(item => item.id === id)?.title || id)
  const body = `<div class="talent-report-detail"><section class="talent-subpanel"><header><div><h3>报告概览</h3><span>原始检测结果和规则命中结果分开展示</span></div></header><dl class="detail-list">${row('会员/孩子', member?.name || child?.childName || viewReport.customer)}${row('第三方报告编号', viewReport.externalReportId)}${row('分析时间', viewReport.analyzedAt || source?.analyzedAt)}${row('报告状态', viewReport.status)}${row('第三方返回分册', volumes.join('、') || '未配置')}${row('当前开放分册', volumes.filter((_, index) => [...publishedVolumes][index]).join('、') || (viewReport.status === '已发布' ? '按发布记录查看' : '暂无开放分册'))}${row('PDF', viewReport.pdfFileName || viewReport.attachment || '未同步，可补充')}</dl></section><section class="talent-subpanel"><header><div><h3>原始检测结果</h3><span>来自第三方系统，平台不修改原始值</span></div></header>${rawTable}</section><section class="talent-subpanel"><header><div><h3>规则命中明细</h3><span>结果范围 → 分级 → 固定注解 → 培养内容</span></div></header>${matchedTable}</section><section class="talent-subpanel"><header><div><h3>推荐培养计划</h3><span>根据命中要素、分级、培养意向和已审核计划生成</span></div></header>${recommendations.length ? `<p class="talent-detail-copy">${escapeHtml(recommendations.join('、'))}</p>` : '<div class="empty-state"><b>暂无推荐培养计划</b><p>报告发布后，系统会按当前规则和培养计划状态生成推荐结果。</p></div>'}</section></div>`
  return body
}

function renderModal() {
  const modal = ui.modal
  if (!modal) return ''
  if (modal.kind === 'agent-leads') return agentLeadsModal(modal.orgId)
  if (modal.kind === 'member-detail') {
    const member = getRecord('talent-member', modal.id)
    if (!member) return modalShell({ title:'会员详情', subtitle:'会员不存在', body:'<div class="empty-state">未找到当前会员。</div>', footer:'<button class="btn ghost" data-action="close-modal">关闭</button>' })
    const actor = routeActor()
    return modalShell({ title:`${member.name || member.childName || '会员'} · 会员详情`, subtitle:actor.role === 'provider' ? '集中查看客户资料、检测结果、报告、要素解读和培养计划' : '集中查看关系、意向、检测结果、报告、培养计划和授权信息', body:memberDetailBody(member, actor), footer:'<button class="btn ghost" data-action="close-modal">关闭</button>' })
  }
  if (modal.kind === 'report-detail') {
    const report = getRecord('talent-report', modal.id)
    if (!report) return modalShell({ title:'报告详情', subtitle:'报告不存在', body:'<div class="empty-state">未找到当前报告。</div>', footer:'<button class="btn ghost" data-action="close-modal">关闭</button>' })
    return modalShell({ title:`${report.name || report.customer || '天赋报告'} · 报告详情`, subtitle:'查看原始检测结果、规则命中明细、要素解读和推荐培养计划', body:reportDetailBody(report, routeActor()), footer:'<button class="btn primary" data-action="close-modal">关闭详情</button>' })
  }
  if (modal.kind === 'miniapp-volume-detail') {
    const state = getState()
    const report = getRecord('talent-report', modal.reportId)
    const volume = (state.resources?.['talent-volume'] || []).find(item => item.id === modal.volumeId)
    const visible = report && volume && (report.publishedVolumeIds || report.volumes || []).includes(volume.id) && report.status === '已发布'
    if (!visible) return modalShell({ title:'分册内容', subtitle:'当前分册不可见', body:'<div class="empty-state"><b>当前分册暂不可查看</b><p>报告撤回或分册未开放时，内容会同步隐藏。</p></div>', footer:'<button class="btn ghost" data-action="close-modal">关闭</button>' })
    const rows = reportInterpretationRows(state, [report]).filter(item => (volume.requiredFactors || []).length === 0 || volume.requiredFactors.includes(item.factor))
    const body = `<section class="talent-subpanel"><header><div><h3>${escapeHtml(volume.name)}</h3><span>当前生效 · 只读查看</span></div></header><p>分析时间：${escapeHtml(formatTalentDate(report.analyzedAt))} · 本分册展示 ${rows.length} 项相关要素解读</p>${rows.length ? `<div class="terminal-table terminal-axure-table"><table><thead><tr><th>要素</th><th>结果值</th><th>分级</th><th>固定注解</th><th>培养内容</th></tr></thead><tbody>${rows.map(item => `<tr><td>${escapeHtml(item.factor || '-')}</td><td>${escapeHtml(item.resultValue ?? '-')}</td><td>${escapeHtml(item.level || '-')}</td><td>${escapeHtml(item.note || '-')}</td><td>${escapeHtml(item.nurtureContent || '-')}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty-state"><b>本分册暂无结构化解读</b><p>请联系平台确认第三方结果和分册配置。</p></div>'}</section>`
    return modalShell({ title:`${volume.name} · 分册详情`, subtitle:'检测报告分册只读内容', body, footer:'<button class="btn primary" data-action="close-modal">关闭分册</button>' })
  }
  if (modal.kind === 'organization-detail') {
    const organization = getRecord('talent-organization', modal.id)
    if (!organization) return modalShell({ title:'机构详情', subtitle:'机构不存在', body:'<div class="empty-state">未找到当前机构。</div>', footer:'<button class="btn ghost" data-action="close-modal">关闭</button>' })
    return modalShell({ title:`${organization.name} · 机构详情`, subtitle:'机构资料、资格和关联业务范围', body:organizationDetailBody(organization), footer:'<button class="btn ghost" data-action="close-modal">关闭</button>' })
  }
  if (modal.kind === 'plan-detail') {
    const plan = getRecord('talent-plan', modal.id)
    if (!plan) return modalShell({ title:'培养计划详情', subtitle:'计划不存在', body:'<div class="empty-state">未找到当前培养计划。</div>', footer:'<button class="btn ghost" data-action="close-modal">关闭</button>' })
    const state = getState()
    const list = id => state.resources?.[id] || []
    const provider = list('talent-organization').find(org => org.id === plan.orgId)
    const row = (label, value) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value === undefined || value === null || value === '' ? '-' : String(value))}</dd></div>`
    const body = `<div class="talent-member-detail"><section class="talent-subpanel"><header><div><h3>计划信息</h3><span>服务商、方向与适用条件</span></div></header><dl class="detail-list">${row('计划名称', plan.title)}${row('服务商', provider?.name || plan.orgId)}${row('培养方向', plan.direction)}${row('关联要素', plan.factor)}${row('适用分级', plan.level)}${row('适用年龄', `${plan.minAge ?? '-'}–${plan.maxAge ?? '-'} 岁`)}${row('适用性别', plan.gender || '通用')}${row('审核状态', plan.status)}${row('退回原因', plan.reviewReason)}${row('版本', plan.version)}${row('客户选择次数', plan.selectionCount || 0)}${row('计划摘要', plan.summary)}${row('培养目标', plan.goals)}${row('重点能力', (plan.focusAbilities || []).join('、'))}${row('分阶段安排', (plan.stages || []).map(stage => `${stage.name || ''}：${stage.content || ''}`).join('；'))}${row('训练建议', plan.trainingAdvice)}${row('评估方式', plan.evaluationPoints)}${row('注意事项', plan.precautions)}</dl></section></div>`
    return modalShell({ title:`${plan.title} · 计划详情`, subtitle:'平台仅审核合规性，不修改服务商计划正文', body })
  }
  if (modal.kind === 'closure-form') {
    if (modal.action === 'report-publish') {
      const report = getRecord('talent-report', modal.id)
      const state = getState()
      const member = report ? getRecord('talent-member', report.memberId || report.childId) : null
      const volumes = (report?.volumes || [])
        .map(id => state.resources?.['talent-volume']?.find(volume => volume.id === id))
        .filter(volume => volume && !['停用', '已停用', '已删除'].includes(volume.status))
      const selected = new Set(report?.publishedVolumeIds?.length ? report.publishedVolumeIds : volumes.map(volume => volume.id))
      if (!report) return modalShell({ title:'发布检测报告', subtitle:'报告不存在', body:'<div class="empty-state">未找到当前报告。</div>', footer:'<button class="btn ghost" data-action="close-modal">关闭</button>' })
      const volumeBoxes = volumes.length
        ? volumes.map(volume => `<label class="miniapp-check"><input type="checkbox" name="volumeIds" value="${escapeHtml(volume.id)}"${selected.has(volume.id) ? ' checked' : ''}> ${escapeHtml(volume.name)}</label>`).join('')
        : '<span class="field-hint">第三方结果未返回可开放分册，暂不能发布。</span>'
      const paymentConfirmed = Boolean(member?.paid)
      const paymentBlock = `<label class="form-field span-2 miniapp-check"><input type="checkbox" name="paymentConfirmed" value="1"${paymentConfirmed ? ' checked' : ''}${paymentConfirmed ? '' : ' required'}> 我已确认该会员已完成线下付费${paymentConfirmed ? '（已登记）' : ''}</label>`
      const body = `<form class="operation-form" data-closure-form="report-publish"><input type="hidden" name="id" value="${escapeHtml(report.id)}"><div class="form-explain"><b>${escapeHtml(report.name || '检测报告')}</b><p>${escapeHtml(member?.name || report.customer || '当前会员')} · 第三方报告编号：${escapeHtml(report.externalReportId || '-')}</p><p>发布前请确认该会员已完成线下付费；系统不设置续费状态，确认仅用于本次报告发布。</p></div><fieldset class="form-field span-2"><legend>本次开放分册 <em>至少选择一册</em></legend><div class="talent-check-list">${volumeBoxes}</div><small class="field-hint">第三方固定返回 6 册，本次选择的分册会随整份报告一次性发布，后续不支持单独撤回。</small></fieldset>${paymentBlock}<div class="form-explain"><b>PDF 说明</b><p>${escapeHtml(report.pdfFileName || report.attachment || '第三方可能已经同步 PDF；后台上传仅作为补充或预留，不影响结构化报告发布。')}</p></div><div class="form-submit"><button class="btn ghost" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">确认发布整份报告</button></div></form>`
      return modalShell({ title:'发布整份检测报告', subtitle:'选择开放分册并完成发布前付费确认', body })
    }
    if (modal.action === 'plan-edit') {
      const plan = getRecord('talent-plan', modal.id)
      if (!plan) return modalShell({ title:'编辑培养计划', subtitle:'计划不存在', body:'<div class="empty-state">未找到当前培养计划。</div>', footer:'<button class="btn ghost" data-action="close-modal">关闭</button>' })
      return modalShell({ title:'编辑培养计划', subtitle:'维护计划内容并提交平台审核', body:closurePlanForm(plan) })
    }
    if (modal.action === 'report-review-reject') {
      const body = `<form class="operation-form" data-closure-form="report-review-reject"><input type="hidden" name="id" value="${escapeHtml(modal.id || '')}"><label class="form-field span-2"><span>退回原因 <em>必填</em></span><textarea name="reason" required placeholder="请说明报告需要补充或修正的内容"></textarea></label><div class="form-submit"><button class="btn ghost" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">确认退回</button></div></form>`
      return modalShell({ title:'退回检测报告', subtitle:'退回后报告回到异常状态，需修正后重新审核发布', body })
    }
    if (modal.action === 'selection-review' || modal.action === 'selection-review-reject') {
      const approved = modal.action === 'selection-review'
      const body = `<form class="operation-form" data-closure-form="selection-review"><input type="hidden" name="id" value="${escapeHtml(modal.id || '')}"><input type="hidden" name="approved" value="${approved ? 'true' : 'false'}">${approved ? '<p class="form-explain">审核通过后，申请进入待推送状态。</p>' : '<label class="form-field span-2"><span>退回原因 <em>必填</em></span><textarea name="reason" required placeholder="请说明需要调整的内容"></textarea></label>'}<div class="form-submit"><button class="btn ghost" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">${approved ? '审核通过' : '确认退回'}</button></div></form>`
      return modalShell({ title:approved ? '审核客户选择' : '退回客户选择', subtitle:'平台审核通过后仍需单独执行推送。', body })
    }
    if (modal.action === 'organization-update') {
      const organization = getRecord('talent-organization', modal.id)
      if (!organization) return modalShell({ title:'编辑机构', subtitle:'机构不存在', body:'<div class="empty-state">未找到当前机构。</div>', footer:'<button class="btn ghost" data-action="close-modal">关闭</button>' })
      const body = `<form class="operation-form" data-closure-form="organization-save"><input type="hidden" name="id" value="${escapeHtml(organization.id)}"><div class="form-grid"><label class="form-field"><span>机构名称 <em>必填</em></span><input name="name" required value="${escapeHtml(organization.name || '')}"></label><label class="form-field"><span>机构类型 <em>必填</em></span><select name="type"><option${organization.type === '代理商' ? ' selected' : ''}>代理商</option><option${organization.type === '服务商' ? ' selected' : ''}>服务商</option></select></label><label class="form-field"><span>联系人 <em>必填</em></span><input name="contact" required value="${escapeHtml(organization.contact || '')}"></label><label class="form-field"><span>联系电话 <em>必填</em></span><input name="mobile" type="tel" required value="${escapeHtml(organization.mobile || '')}"></label><label class="form-field"><span>机构状态</span><select name="status"><option${organization.status === '启用' ? ' selected' : ''}>启用</option><option${organization.status === '已停用' ? ' selected' : ''}>已停用</option></select></label></div><div class="form-submit"><button class="btn ghost" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">保存机构资料</button></div></form>`
      return modalShell({ title:'编辑机构', subtitle:'机构类型决定业务身份；停用后该机构账号立即失去业务访问', body })
    }
    if (modal.action === 'user-update') {
      const user = getRecord('talent-user', modal.id)
      if (!user) return modalShell({ title:'编辑用户', subtitle:'用户不存在', body:'<div class="empty-state">未找到当前用户。</div>', footer:'<button class="btn ghost" data-action="close-modal">关闭</button>' })
      const organizations = (getState().resources?.['talent-organization'] || []).filter(item => item.status === '启用')
      const body = `<form class="operation-form" data-closure-form="user-save"><input type="hidden" name="id" value="${escapeHtml(user.id)}"><div class="form-grid"><label class="form-field"><span>登录账号 <em>必填</em></span><input name="username" required value="${escapeHtml(user.username || '')}"></label><label class="form-field"><span>用户姓名 <em>必填</em></span><input name="name" required value="${escapeHtml(user.name || '')}"></label><label class="form-field"><span>所属机构 <em>必填</em></span><select name="organizationId" required>${organizations.map(item => `<option value="${escapeHtml(item.id)}"${item.id === user.organizationId ? ' selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}</select></label><label class="form-field"><span>业务角色 <em>必填</em></span><select name="roleIds" multiple size="3" required>${(getState().resources?.['talent-role'] || []).filter(role => role.status === '启用').map(role => `<option value="${escapeHtml(role.id)}"${(user.roleIds || []).includes(role.id) ? ' selected' : ''}>${escapeHtml(role.name)}</option>`).join('')}</select><small class="field-hint">可分配多个同类型角色。</small></label><label class="form-field"><span>手机号</span><input name="mobile" type="tel" value="${escapeHtml(user.mobile || '')}"></label><label class="form-field"><span>账号状态</span><select name="status"><option${user.status === '启用' ? ' selected' : ''}>启用</option><option${user.status === '已停用' ? ' selected' : ''}>已停用</option></select></label></div><div class="form-submit"><button class="btn ghost" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">保存用户</button></div></form>`
      return modalShell({ title:'编辑用户', subtitle:'用户角色决定可进入的业务端；一个机构可以配置多个用户。', body })
    }
    if (modal.action === 'role-update') {
      const role = getRecord('talent-role', modal.id)
      if (!role) return modalShell({ title:'编辑角色', subtitle:'角色不存在', body:'<div class="empty-state">未找到当前角色。</div>', footer:'<button class="btn ghost" data-action="close-modal">关闭</button>' })
      const menus = { platform:[['workbench','工作台'],['settings','系统设置'],['partners','代理商管理'],['providers','服务商管理'],['members','会员管理'],['rules','天赋规则'],['plan-review','计划审核'],['selection-review','客户选择审核'],['reports','报告列表'],['flow','完整业务流程']], agent:[['dashboard','工作台'],['members','会员管理'],['reports','报告列表']], provider:[['dashboard','工作台'],['plans','培养计划'],['clients','已推送客户']] }[role.type] || []
      const organizations = (getState().resources?.['talent-organization'] || []).filter(item => item.status === '启用')
      const body = `<form class="operation-form" data-closure-form="role-save"><input type="hidden" name="id" value="${escapeHtml(role.id)}"><div class="form-grid"><label class="form-field"><span>角色名称 <em>必填</em></span><input name="name" required value="${escapeHtml(role.name || '')}"></label><label class="form-field"><span>角色标识 <em>必填</em></span><input name="code" required value="${escapeHtml(role.code || '')}"></label><label class="form-field"><span>适用机构类型 <em>必填</em></span><select name="type"><option value="agent"${role.type === 'agent' ? ' selected' : ''}>代理商</option><option value="provider"${role.type === 'provider' ? ' selected' : ''}>服务商</option><option value="platform"${role.type === 'platform' ? ' selected' : ''}>平台</option></select></label><label class="form-field"><span>数据范围 <em>必填</em></span><select name="dataScope" required><option value="1"${role.dataScope === '1' ? ' selected' : ''}>全部数据</option><option value="2"${role.dataScope === '2' ? ' selected' : ''}>自定义机构数据</option><option value="3"${role.dataScope === '3' ? ' selected' : ''}>本机构数据</option><option value="4"${role.dataScope === '4' ? ' selected' : ''}>本机构及下属机构数据</option><option value="5"${role.dataScope === '5' ? ' selected' : ''}>仅本人数据</option></select></label><fieldset class="form-field span-2"><legend>自定义数据机构</legend><div class="talent-check-list">${organizations.map(item => `<label><input type="checkbox" name="dataOrgIds" value="${escapeHtml(item.id)}"${(role.dataOrgIds || []).includes(item.id) ? ' checked' : ''}> ${escapeHtml(item.name)}</label>`).join('')}</div><small class="field-hint">仅选择“自定义机构数据”时生效。</small></fieldset><fieldset class="form-field span-2"><legend>可进入菜单 <em>至少选择一个</em></legend><div class="talent-check-list">${menus.map(([id,label]) => `<label><input type="checkbox" name="menuIds" value="${escapeHtml(id)}"${(role.menuIds || []).includes(id) ? ' checked' : ''}> ${escapeHtml(label)}</label>`).join('')}</div></fieldset></div><div class="form-submit"><button class="btn ghost" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">保存角色权限</button></div></form>`
      return modalShell({ title:'编辑角色', subtitle:'角色关联菜单；数据范围由机构和客户分配关系决定。', body })
    }
    if (modal.action === 'user-reset-password') {
      const user = getRecord('talent-user', modal.id)
      if (!user) return modalShell({ title:'重置密码', subtitle:'用户不存在', body:'<div class="empty-state">未找到当前用户。</div>', footer:'<button class="btn ghost" data-action="close-modal">关闭</button>' })
      const body = `<form class="operation-form" data-closure-form="user-reset-password"><input type="hidden" name="id" value="${escapeHtml(user.id)}"><div class="form-grid"><label class="form-field span-2"><span>新密码 <em>必填</em></span><input name="password" type="password" minlength="8" required placeholder="至少 8 位"></label></div><div class="form-submit"><button class="btn ghost" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">确认重置密码</button></div></form>`
      return modalShell({ title:'重置密码', subtitle:`为 ${escapeHtml(user.name || user.username)} 设置新密码。原型只记录重置动作，不保存明文密码。`, body })
    }
    const titleMap = { 'member-create':'新增会员登记', 'organization-create':'新增机构', 'user-create':'新增用户', 'user-update':'编辑用户', 'role-create':'新增角色', 'role-update':'编辑角色', 'plan-create':'新增培养计划', 'plan-edit':'编辑培养计划', 'plan-review-reject':'退回培养计划' }
    const title = titleMap[modal.action] || '业务操作'
    const body = modal.action === 'member-create'
       ? (() => { const parents = (getState().resources?.['talent-parent'] || []).filter(item => !['停用', '已停用'].includes(item.status)); const parentOptions = parents.map(parent => `<option value="${escapeHtml(parent.id)}">${escapeHtml(parent.parentName || parent.name)} · ${escapeHtml(parent.mobile || '未填写手机号')}</option>`).join(''); return `<form class="operation-form" data-closure-form="member-save"><div class="form-grid"><label class="form-field"><span>会员姓名 <em>必填</em></span><input name="name" required value="${escapeHtml(modal.name || '')}"></label><label class="form-field"><span>登记对象 <em>必填</em></span><select name="kind"><option>孩子</option><option>本人</option></select></label><label class="form-field"><span>有效家长（登记孩子必选）</span><select name="parentId"><option value="">请选择家长</option>${parentOptions}</select></label><label class="form-field"><span>家长手机号</span><input name="mobile" type="tel" value="13800001234"></label><label class="form-field"><span>外部受检人标识</span><input name="externalSubjectId" value="EXT-SUBJECT-001"></label><label class="form-field"><span>孩子身份证号</span><input name="idNo" value=""></label>${talentDirectionFields()}</div><div class="form-submit"><button class="btn ghost" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">保存登记草稿</button></div></form>` })()
      : modal.action === 'organization-create'
        ? `<form class="operation-form" data-closure-form="organization-save"><div class="form-grid"><label class="form-field"><span>机构名称 <em>必填</em></span><input name="name" required placeholder="例如：安澜成长服务中心"></label><label class="form-field"><span>机构类型 <em>必填</em></span><select name="type"><option>服务商</option><option>代理商</option></select></label><label class="form-field"><span>联系人 <em>必填</em></span><input name="contact" required></label><label class="form-field"><span>联系电话 <em>必填</em></span><input name="mobile" type="tel" required></label></div><div class="form-submit"><button class="btn ghost" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">保存机构</button></div></form>`
        : modal.action === 'user-create'
          ? (() => { const organizations = (getState().resources?.['talent-organization'] || []).filter(item => item.status === '启用'); const roles = (getState().resources?.['talent-role'] || []).filter(item => item.status === '启用'); return `<form class="operation-form" data-closure-form="user-save"><div class="form-grid"><label class="form-field"><span>登录账号 <em>必填</em></span><input name="username" required placeholder="例如：provider.li"></label><label class="form-field"><span>用户姓名 <em>必填</em></span><input name="name" required></label><label class="form-field"><span>所属机构 <em>必填</em></span><select name="organizationId" required>${organizations.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join('')}</select></label><label class="form-field"><span>业务角色 <em>必填</em></span><select name="roleIds" multiple size="3" required>${roles.map(role => `<option value="${escapeHtml(role.id)}">${escapeHtml(role.name)}</option>`).join('')}</select><small class="field-hint">可分配多个同类型角色。</small></label><label class="form-field"><span>初始密码 <em>必填</em></span><input name="password" type="password" minlength="8" required placeholder="至少 8 位"></label><label class="form-field"><span>手机号</span><input name="mobile" type="tel"></label></div><div class="form-submit"><button class="btn ghost" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">保存用户</button></div></form>` })()
        : modal.action === 'role-create'
          ? `<form class="operation-form" data-closure-form="role-save"><div class="form-grid"><label class="form-field"><span>角色名称 <em>必填</em></span><input name="name" required placeholder="例如：服务商业务账号"></label><label class="form-field"><span>角色标识 <em>必填</em></span><input name="code" required placeholder="例如：talent_provider"></label><label class="form-field"><span>适用机构类型 <em>必填</em></span><select name="type"><option value="provider">服务商</option><option value="agent">代理商</option><option value="platform">平台</option></select></label><label class="form-field"><span>数据范围 <em>必填</em></span><select name="dataScope" required><option value="1">全部数据</option><option value="2">自定义机构数据</option><option value="3" selected>本机构数据</option><option value="4">本机构及下属机构数据</option><option value="5">仅本人数据</option></select></label><fieldset class="form-field span-2"><legend>自定义数据机构</legend><div class="talent-check-list">${(getState().resources?.['talent-organization'] || []).filter(item => item.status === '启用').map(item => `<label><input type="checkbox" name="dataOrgIds" value="${escapeHtml(item.id)}"> ${escapeHtml(item.name)}</label>`).join('')}</div><small class="field-hint">仅选择“自定义机构数据”时生效。</small></fieldset><fieldset class="form-field span-2"><legend>可进入菜单 <em>至少选择一个</em></legend><div class="talent-check-list"><label><input type="checkbox" name="menuIds" value="dashboard" checked> 工作台</label><label><input type="checkbox" name="menuIds" value="plans"> 培养计划</label><label><input type="checkbox" name="menuIds" value="clients"> 已推送客户</label></div></fieldset></div><div class="form-submit"><button class="btn ghost" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">保存角色</button></div></form>`
          : modal.action === 'plan-create'
          ? closurePlanForm(null)
          : `<form class="operation-form" data-closure-form="plan-review-reject"><input type="hidden" name="id" value="${escapeHtml(modal.id || '')}"><label class="form-field span-2"><span>退回原因 <em>必填</em></span><textarea name="reason" required placeholder="请说明需要补充或修改的内容"></textarea></label><div class="form-submit"><button class="btn ghost" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">确认退回</button></div></form>`
    return modalShell({ title, subtitle:'保存后会同步更新对应业务端状态和下一步操作', body })
  }
  if (modal.kind === 'talent-member-child-form') {
    const parent = getRecord('talent-parent', modal.parentId)
    const child = modal.childId ? getRecord('talent-child', modal.childId) : null
    const relation = child && (getState().resources?.['talent-member-relation'] || []).find(item => item.parentId === modal.parentId && item.childId === child.id && item.status === '有效')
    if (!parent) return modalShell({ title:'会员孩子管理', subtitle:'会员不存在', body:'<div class="empty-state">未找到当前会员。</div>', footer:'<button class="btn ghost" data-action="close-modal">关闭</button>' })
    const relationTypes = ['母亲','父亲','监护人']
    const body = `<form class="operation-form" data-action="save-talent-member-child" data-parent-id="${escapeHtml(parent.id)}" data-child-id="${escapeHtml(child?.id || '')}" data-relation-id="${escapeHtml(relation?.id || '')}"><div class="form-explain"><b>归属会员</b><p>${escapeHtml(parent.parentName || parent.name)} · 机构和渠道会自动继承会员资料；性别、出生日期由身份证号解析。</p></div><div class="form-grid"><label class="form-field"><span>孩子姓名 <em>必填</em></span><input name="childName" value="${escapeHtml(child?.childName || '')}" required></label><label class="form-field"><span>孩子身份证号 <em>必填</em></span><input name="idNo" value="${escapeHtml(child?.idNo || '')}" required></label><label class="form-field"><span>关系类型 <em>必填</em></span><select name="relationType" required>${relationTypes.map(type => `<option${(relation?.relationType || child?.relationType || '监护人') === type ? ' selected' : ''}>${type}</option>`).join('')}</select></label></div><div class="form-submit"><button class="btn ghost" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">${child ? '保存孩子资料' : '新增孩子'}</button></div></form>`
    return modalShell({ title:child ? '编辑孩子' : '新增孩子', subtitle:'孩子仅可绑定当前会员；一个孩子只允许一位有效家长', body })
  }
  if (modal.kind === 'help') {
    const definition = helpDefinitionFor(modal.helpKey)
    return modalShell({
      title: definition.title,
      subtitle: helpTypeLabel(definition.type),
      body: `<div class="help-modal-copy"><p>${escapeHtml(definition.text)}</p></div>`,
      footer: '<button class="btn primary" data-action="close-modal">知道了</button>'
    })
  }
  if (modal.kind === 'favorite-plan-picker') {
    return modalShell({
      title: `选择个人${modal.planType === 'medical' ? '医疗' : '健康管理'}方案`,
      subtitle: '只带入项目组合',
      body: renderFavoritePlanPicker(getState(), modal.planType),
      footer: ''
    })
  }
  if (modal.kind === 'consultation-create') {
    const customerId = modal.customerId || 'KH-202609-001'
    const customer = modal.customer || '林女士'
    const durationOptions = [30, 60, 90, 120].map(value => `<option value="${value}"${value === 60 ? ' selected' : ''}>${value} 分钟</option>`).join('')
    const body = `<form class="operation-form consultation-create-form" data-action="save-consultation-create"><input type="hidden" name="customerId" value="${escapeHtml(customerId)}"><input type="hidden" name="customer" value="${escapeHtml(customer)}"><div class="form-explain"><b>当前客户：${escapeHtml(customer)}</b><p>系统会按预约开始时间自动生成会诊资料；提交后向受邀专家发送站内通知。</p></div><div class="form-grid"><label class="form-field"><span>会诊主题 <em>必填</em></span><input name="topic" required placeholder="例如：睡眠与心血管联合会诊"></label><label class="form-field"><span>受邀专家 <em>必填</em></span><input name="expert" required placeholder="多人用顿号分隔"></label><label class="form-field span-2"><span>问题描述 <em>必填</em></span><textarea name="question" required placeholder="描述本次需要专家协同判断的问题"></textarea></label><label class="form-field"><span>会诊时间 <em>必填</em></span><input name="time" type="datetime-local" required></label><label class="form-field"><span>会诊时长 <em>必填</em></span><select name="duration" required>${durationOptions}</select></label><label class="form-field span-2"><span>补充附件</span><input name="attachments" placeholder="文件名用顿号分隔，例如：动态心电报告.pdf"></label></div><div class="form-submit"><button class="btn ghost" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">提交预约并发送通知</button></div></form>`
    return modalShell({ title:'新增会诊', subtitle:'带 * 的内容为必填项，提交前会执行全部受邀专家时间冲突校验', body })
  }
  if (modal.kind === 'consultation-reschedule' || modal.kind === 'consultation-cancel' || modal.kind === 'consultation-conclusion') {
    const isReschedule = modal.kind === 'consultation-reschedule'
    const isConclusion = modal.kind === 'consultation-conclusion'
    const title = isReschedule ? '会诊改期' : isConclusion ? '填写会诊结论' : '取消会诊预约'
    const body = isConclusion
      ? `<form class="operation-form" data-action="save-consultation-conclusion"><input type="hidden" name="appointmentId" value="${escapeHtml(modal.recordId)}"><label class="form-field span-2"><span>会诊结论 <em>必填</em></span><textarea name="conclusion" required placeholder="由发起医生填写会诊结论"></textarea></label><div class="form-submit"><button class="btn ghost" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">保存结论并生成签署任务</button></div></form>`
      : `<form class="operation-form" data-action="save-consultation-schedule"><input type="hidden" name="appointmentId" value="${escapeHtml(modal.recordId)}">${isReschedule ? '<label class="form-field"><span>新会诊时间 <em>必填</em></span><input name="time" type="datetime-local" required></label><label class="form-field"><span>会诊时长 <em>必填</em></span><select name="duration" required><option value="30">30 分钟</option><option value="60" selected>60 分钟</option><option value="90">90 分钟</option><option value="120">120 分钟</option></select></label>' : ''}<label class="form-field span-2"><span>${isReschedule ? '改期原因' : '取消原因'} <em>必填</em></span><textarea name="reason" required></textarea></label><div class="form-submit"><button class="btn ghost" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">${isReschedule ? '保存改期并重新通知' : '确认取消预约'}</button></div></form>`
    return modalShell({ title, subtitle:'原因为必填；改期会重新执行时间冲突校验', body })
  }
  if (modal.kind === 'order-finance') {
    const finance = getState().visitOrder?.finance || {}
    const payment = modal.action === 'open-payment'
    const refund = modal.action === 'open-refund'
    const review = ['refund-approve', 'refund-reject'].includes(modal.action)
    const executeRefund = modal.action === 'refund-execute'
    const reversePayment = modal.action === 'reverse-payment'
    const issueInvoice = modal.action === 'invoice-issue'
    const voidInvoice = modal.action === 'invoice-void'
    const title = payment ? '登记线下收款' : refund ? '发起退款申请' : review ? (modal.action === 'refund-approve' ? '审批退款申请' : '驳回退款申请') : executeRefund ? '登记线下退款' : reversePayment ? '收款确认撤销/冲销' : issueInvoice ? '登记发票开具' : voidInvoice ? '作废发票' : modal.action === 'invoice-start' ? '申请开票' : '登记对账差异'
    const body = payment
      ? `<form class="operation-form" data-action="save-order-finance" data-finance-action="register-offline-payment"><div class="form-grid"><label class="form-field"><span>本次收款金额 <em>必填</em></span><input name="amount" type="number" min="0.01" step="0.01" required></label><label class="form-field"><span>收款日期 <em>必填</em></span><input name="paymentDate" type="date" required></label><label class="form-field"><span>线下渠道 <em>必填</em></span><select name="channel" required><option value="银行转账">银行转账</option><option value="现金">现金</option><option value="POS">POS</option></select></label><label class="form-field"><span>票据/流水号 <em>必填</em></span><input name="transactionNo" required></label><label class="form-field"><span>经办人 <em>必填</em></span><input name="operator" value="后台经办人" required></label><label class="form-field"><span>确认人 <em>必填</em></span><input name="confirmer" value="财务负责人" required></label><label class="form-field span-2"><span>凭证附件</span><input name="voucher" placeholder="例如：收款回单.jpg"></label><label class="form-field span-2"><span>备注</span><textarea name="remark"></textarea></label></div><div class="form-submit"><button class="btn ghost" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">保存收款记录</button></div></form>`
      : refund
        ? `<form class="operation-form" data-action="save-order-finance" data-finance-action="create-refund-application"><div class="form-grid"><label class="form-field"><span>原收款记录 <em>必填</em></span><select name="paymentRecordId" required>${(finance.paymentRecords || []).filter(item => item.status === '已确认').map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.id)} · ¥${Number(item.amount || 0).toLocaleString()}</option>`).join('')}</select></label><label class="form-field"><span>退款金额 <em>必填</em></span><input name="amount" type="number" min="0.01" step="0.01" required></label><label class="form-field span-2"><span>退款原因 <em>必填</em></span><textarea name="reason" required></textarea></label><label class="form-field span-2"><span>退款账户 <em>必填</em></span><input name="refundAccount" required placeholder="原付款账户或指定账户"></label></div><div class="form-submit"><button class="btn ghost" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">保存退款草稿</button></div></form>`
        : review
          ? `<form class="operation-form" data-action="save-order-finance" data-finance-action="${modal.action === 'refund-approve' ? 'approve-refund-application' : 'reject-refund-application'}"><input type="hidden" name="recordId" value="${escapeHtml(modal.recordId || '')}"><div class="form-grid"><label class="form-field span-2"><span>审批意见 <em>必填</em></span><textarea name="opinion" required></textarea></label></div><div class="form-submit"><button class="btn ghost" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">确认提交</button></div></form>`
          : executeRefund
            ? `<form class="operation-form" data-action="save-order-finance" data-finance-action="execute-offline-refund"><input type="hidden" name="recordId" value="${escapeHtml(modal.recordId || '')}"><div class="form-grid"><label class="form-field"><span>线下退款日期 <em>必填</em></span><input name="refundDate" type="date" required></label><label class="form-field"><span>退款凭证号 <em>必填</em></span><input name="voucherNo" required></label><label class="form-field"><span>执行人 <em>必填</em></span><input name="executor" value="出纳" required></label><label class="form-field"><span>确认人 <em>必填</em></span><input name="confirmer" value="财务负责人" required></label><label class="form-field span-2"><span>凭证附件 <em>必填</em></span><input name="attachment" required placeholder="例如：退款回单.pdf"></label></div><div class="form-submit"><button class="btn ghost" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">确认线下退款</button></div></form>`
            : reversePayment
              ? `<form class="operation-form" data-action="save-order-finance" data-finance-action="reverse-offline-payment"><input type="hidden" name="recordId" value="${escapeHtml(modal.recordId || '')}"><div class="form-grid"><label class="form-field span-2"><span>撤销/冲销原因 <em>必填</em></span><textarea name="reason" required></textarea></label></div><div class="form-submit"><button class="btn ghost" type="button" data-action="close-modal">取消</button><button class="btn danger" type="submit">确认冲销</button></div></form>`
              : issueInvoice
                ? `<form class="operation-form" data-action="save-order-finance" data-finance-action="issue-invoice"><div class="form-grid"><label class="form-field"><span>发票号码 <em>必填</em></span><input name="invoiceNo" required></label></div><div class="form-submit"><button class="btn ghost" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">确认已开具</button></div></form>`
                : voidInvoice
                  ? `<form class="operation-form" data-action="save-order-finance" data-finance-action="void-invoice"><div class="form-grid"><label class="form-field span-2"><span>作废原因 <em>必填</em></span><textarea name="reason" required></textarea></label></div><div class="form-submit"><button class="btn ghost" type="button" data-action="close-modal">取消</button><button class="btn danger" type="submit">确认作废</button></div></form>`
        : modal.action === 'invoice-start'
          ? `<form class="operation-form" data-action="save-order-finance" data-finance-action="invoice-start"><div class="form-grid"><label class="form-field"><span>开票申请备注</span><textarea name="remark"></textarea></label></div><div class="form-submit"><button class="btn ghost" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">提交开票申请</button></div></form>`
          : `<form class="operation-form" data-action="save-order-finance" data-finance-action="reconciliation-difference"><div class="form-grid"><label class="form-field span-2"><span>差异说明 <em>必填</em></span><textarea name="note" required></textarea></label></div><div class="form-submit"><button class="btn ghost" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">登记对账差异</button></div></form>`
    return modalShell({ title, subtitle:'线下登记会生成正式业务单据并写入订单时间线', body })
  }
  if (modal.kind === 'detail') {
    const resource = resourceById(modal.resourceId)
    const record = getRecord(modal.resourceId, modal.recordId) || getPanelDisplayRecord(modal.panel, modal.recordId)
    const config = getWorkbenchConfig(resource.id)
    const resourceName = displayResourceName(resource)
    const restriction = getRecordEditRestriction(modal.resourceId, record)
    const pageLocked = ['readonly', 'analysis'].includes(config?.pageType)
    const editRestriction = restriction || (pageLocked ? '当前页面仅提供查询、详情或分析，不支持编辑。' : '')
    const editControl = editRestriction
      ? `<span class="disabled-reason" title="${escapeHtml(editRestriction)}">不可编辑：${escapeHtml(editRestriction)}</span>`
      : `<button class="btn primary" data-action="resource-update" data-resource="${escapeHtml(modal.resourceId)}" data-record="${escapeHtml(modal.recordId)}">编辑这条记录</button>`
    const visibleRecord = modal.resourceId.startsWith('talent-') && record
      ? Object.fromEntries(Object.entries(record)
        .filter(([key]) => !['id','code','snapshot','matchRuleId'].includes(key))
        .map(([key, value]) => [key === 'dataPath' ? 'sourceRecord' : key === 'matchBasis' ? 'matchDescription' : key, value]))
      : record
    return modalShell({ title:resourceName + '详情', subtitle:'查看完整字段、状态与关联信息', body:detailList(visibleRecord), footer:`<button class="btn ghost" data-action="close-modal">关闭</button>${editControl}` })
  }
  if (modal.kind === 'record-form') {
    const resource = resourceById(modal.resourceId)
    const record = modal.recordId ? getRecord(modal.resourceId, modal.recordId) : null
    const config = getWorkbenchConfig(resource.id)
    const resourceName = displayResourceName(resource)
    const activeSections = resource.id === 'inventory-inbound'
      ? (config?.formSections || []).filter(section => section.title === (record?.stageStatus || record?.status || '待收货'))
      : (config?.formSections || [])
    const configuredFields = activeSections.flatMap(section => section.fields) || []
    const form = { fields:(configuredFields.length ? configuredFields : resource.fields.filter(field => field !== 'status').map(name => ({ name, label:fieldLabels[name] || name, type:['amount','quantity'].includes(name) ? 'number' : 'text' }))).map(field => ({ ...field, required:resource.id.startsWith('talent-') ? Boolean(field.required && !field.hidden) : Boolean(field.required) })) }
    const sectionSummary = (activeSections.length ? activeSections : config?.formSections || []).map(section => section.title).join('、') || '业务信息'
    if (resource.id === 'talent-parent' && record) {
      const relations = getState().resources?.['talent-member-relation'] || []
      const children = (getState().resources?.['talent-child'] || []).map(child => ({ child, relation:relations.find(item => item.parentId === record.id && item.childId === child.id && item.status === '有效') })).filter(item => item.relation)
      const childRows = children.length
        ? children.map(({ child, relation }) => `<tr><td>${escapeHtml(child.childName || child.name)}</td><td>${escapeHtml(child.gender || '-')}</td><td>${escapeHtml(child.birthDate || '-')}</td><td>${escapeHtml(relation.relationType || '-')}</td><td><button class="btn-link" type="button" data-action="talent-member-child-update" data-parent-id="${escapeHtml(record.id)}" data-child-id="${escapeHtml(child.id)}">编辑</button><button class="btn-link danger-text" type="button" data-terminal-action="talent-unbind-member" data-relation-id="${escapeHtml(relation.id)}">解绑</button></td></tr>`).join('')
        : '<tr><td colspan="5" class="table-empty">暂无关联孩子</td></tr>'
      const parentFields = formFields({ fields:form.fields.filter(field => !['status'].includes(field.name)) }, record)
      const body = `<form class="operation-form" data-action="save-form" data-form-action="resource-update" data-resource="talent-parent" data-record="${escapeHtml(record.id)}"><div class="form-explain"><b>会员基础信息</b><p>保存后机构和渠道会继续作为本会员新增孩子的继承信息。</p></div><div class="form-grid">${parentFields}</div><div class="form-submit"><button class="btn primary" type="submit">保存会员资料</button></div></form><section class="talent-subsection"><header><div><h3>孩子管理</h3><span>新增、编辑和解绑均在当前会员内维护。</span></div><button class="btn primary small" type="button" data-action="talent-member-child-create" data-parent-id="${escapeHtml(record.id)}">新增孩子</button></header><div class="terminal-table terminal-axure-table"><table><thead><tr><th>孩子姓名</th><th>性别</th><th>出生日期</th><th>关系类型</th><th>操作</th></tr></thead><tbody>${childRows}</tbody></table></div></section>`
      return modalShell({ title:'编辑会员', subtitle:'会员资料与孩子关系分区维护', body, footer:'<button class="btn ghost" data-action="close-modal">关闭</button>' })
    }
    const talentCreateExplanations = {
      'talent-factor':'在这里直接填写新的天赋要素；保存后会成为天赋分级、固定注解和匹配条件的下拉来源。',
      'talent-level':'天赋要素来自“天赋要素”页面；分级来自系统统一的 L1–L6 标准。本页保存的是两者的对应关系。',
      'talent-note':'天赋要素来自“天赋要素”页面；分级只显示“要素分级”页面中已为该要素维护的等级。'
    }
    const createExplanation = talentCreateExplanations[resource.id] || '保存为可编辑草稿，立即出现在当前业务工作台。'
    const body = `<form class="operation-form" data-action="save-form" data-form-action="${record ? 'resource-update' : 'resource-create'}" data-resource="${escapeHtml(resource.id)}" data-record="${escapeHtml(record?.id || '')}"><div class="form-explain"><b>${record ? '修改后同步到哪里' : '新增后会发生什么'}</b><p>${record ? '列表、详情、统计和处理记录会同步更新。' : createExplanation} 表单包含：${escapeHtml(sectionSummary)}。</p></div><div class="form-grid">${formFields(form, record || {})}</div><div class="form-submit"><button class="btn ghost" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">${record ? '保存修改' : '保存并新增到列表'}</button></div></form>`
    return modalShell({ title:(record ? '编辑' : '新增') + resourceName, subtitle:'带 * 的内容为必填项', body })
  }
  if (modal.kind === 'action-form') {
    const resource = resourceById(modal.resourceId)
    const definition = getActionDefinition(modal.action)
    const resourceName = displayResourceName(resource)
    return modalShell({ title:(definition?.label || '处理') + resourceName, subtitle:'处理完成后状态、列表和处理记录会同步变化', body:actionForm({ action:modal.action, resourceId:modal.resourceId, record:getRecord(modal.resourceId, modal.recordId), description:modal.description || '本操作会更新当前记录，并在处理记录中保留过程。' }) })
  }
  if (modal.kind === 'batch-action') {
    const resource = resourceById(modal.resourceId)
    const definition = getActionDefinition(modal.action)
    const first = getRecord(modal.resourceId, modal.recordIds[0])
    const resourceName = displayResourceName(resource)
    const body = actionForm({ action:modal.action, resourceId:modal.resourceId, record:first, description:`将对已勾选的 ${modal.recordIds.length} 条${resourceName}执行“${definition?.label || '处理'}”，每条记录都会更新状态并保留处理记录。` }).replace(`data-record="${escapeHtml(first?.id || '')}"`, `data-records="${escapeHtml(modal.recordIds.join(','))}"`)
    return modalShell({ title:`批量${definition?.label || '处理'}${resourceName}`, subtitle:`已选择 ${modal.recordIds.length} 条记录`, body })
  }
  if (modal.kind === 'batch-destructive') {
    const resource = resourceById(modal.resourceId)
    const definition = getDestructiveDefinition(modal.action)
    const resourceName = displayResourceName(resource)
    return modalShell({ title:`批量${definition.confirmTitle}`, subtitle:`已选择 ${modal.recordIds.length} 条记录`, body:`<div class="impact-box"><span>处理范围</span><h3>${modal.recordIds.length} 条${escapeHtml(resourceName)}</h3><p>系统将逐条校验状态和业务流程保护，受保护记录不会被破坏。</p></div><div class="impact-message"><b>影响说明</b><p>${escapeHtml(definition.confirmMessage)}</p><small>可选替代：${escapeHtml(definition.alternative)}</small></div>`, footer:`<button class="btn ghost" data-action="close-modal">暂不处理</button><button class="btn danger" data-action="confirm-action" data-confirm-action="${escapeHtml(modal.action)}" data-resource="${escapeHtml(modal.resourceId)}" data-records="${escapeHtml(modal.recordIds.join(','))}">确认批量${escapeHtml(getActionDefinition(modal.action)?.label || '处理')}</button>` })
  }  if (modal.kind === 'destructive') {
    const resource = resourceById(modal.resourceId)
    const record = getRecord(modal.resourceId, modal.recordId)
    const definition = getDestructiveDefinition(modal.action)
    return modalShell({ title:definition.confirmTitle, subtitle:'高影响操作需要明确对象与后果', body:`<div class="impact-box"><span>处理对象</span><h3>${escapeHtml(record?.name || modal.recordId)}</h3><p>编号：${escapeHtml(record?.code || record?.id || '-')} · 当前状态：${escapeHtml(record?.status || '-')}</p></div><div class="impact-message"><b>影响说明</b><p>${escapeHtml(definition.confirmMessage)}</p><small>可选替代：${escapeHtml(definition.alternative)}</small></div>`, footer:`<button class="btn ghost" data-action="close-modal">暂不处理</button><button class="btn danger" data-action="confirm-action" data-confirm-action="${escapeHtml(modal.action)}" data-resource="${escapeHtml(modal.resourceId)}" data-record="${escapeHtml(modal.recordId)}">确认${escapeHtml(getActionDefinition(modal.action)?.label || '处理')}</button>` })
  }
  if (modal.kind === 'restriction') {
    const definition = getActionDefinition(modal.alternativeAction)
    return modalShell({ title:'当前操作受到业务保护', subtitle:'系统没有执行会破坏流程或关键记录的操作', body:`<div class="impact-box"><span>受保护对象</span><h3>${escapeHtml(modal.recordName || modal.recordId)}</h3><p>${escapeHtml(modal.reason)}</p></div><div class="impact-message"><b>可以继续做什么</b><p>${escapeHtml(definition?.label || '查看详情')}不会破坏当前业务流程和历史业务记录。</p></div>`, footer:`<button class="btn ghost" data-action="close-modal">关闭</button><button class="btn primary" data-action="${escapeHtml(modal.alternativeAction || 'resource-detail')}" data-resource="${escapeHtml(modal.resourceId)}" data-record="${escapeHtml(modal.recordId)}">${escapeHtml(definition?.label || '查看详情')}</button>` })
  }
  if (modal.kind === 'reset') {
    return modalShell({ title:'恢复初始业务数据', subtitle:'仅影响当前浏览器中的天赋业务页面数据', body:'<div class="impact-message"><b>将恢复哪些内容</b><p>会员关系、内容规则、第三方报告和小程序展示状态都会恢复。</p><small>该操作不会连接或影响任何正式系统。</small></div>', footer:'<button class="btn ghost" data-action="close-modal">取消</button><button class="btn danger" data-action="confirm-action" data-confirm-action="reset-all">确认恢复</button>' })
  }
  return ''
}

function routeChanged(previous, next) {
  if (!previous || !next) return false
  if (previous.name !== next.name) return true
  if (next.name === 'terminal') {
    return previous.query.terminal !== next.query.terminal ||
      previous.query.section !== next.query.section ||
      previous.query.panel !== next.query.panel ||
      previous.query.record !== next.query.record ||
      previous.query.mode !== next.query.mode
  }
  return false
}

function render() {
  const previousRoute = activeRoute
  activeRoute = getRouteState()
  if (activeRoute.name === 'terminal' && !['talent-admin', 'talent-agent', 'talent-provider', 'miniapp'].includes(activeRoute.query.terminal)) {
    navigate('home')
    return
  }
  const state = getState()
  if (routeChanged(previousRoute, activeRoute)) ui.modal = null
  let markup
  if (activeRoute.name === 'terminal') {
    const view = renderTerminal(state, activeRoute.query)
    markup = workspaceShell(view, state)
    document.title = `${view.title || '天赋查询系统'}｜天赋专项`
  } else {
    markup = homeShell(renderHome(state))
    document.title = '天赋专项'
  }
  root.innerHTML = markup
  refreshRelationSelects(root.querySelector('[data-action="save-form"]'))
  root.dataset.ready = 'true'
}

function showToast(message, type = 'success') {
  let region = document.querySelector('.toast-region')
  if (!region) { region = document.createElement('div'); region.className = 'toast-region'; document.body.append(region) }
  const toast = document.createElement('div'); toast.className = 'toast ' + type; toast.textContent = (type === 'success' ? '✓ ' : '！ ') + message; region.append(toast)
  setTimeout(() => toast.remove(), 3200)
}

function openModal(modal) { ui.modal = modal; render() }
function closeModal() { ui.modal = null; render() }
function currentResourceId(element) { return element.dataset.resource || activeRoute.query.resource || getState().filters.resource }
function currentRecordId(element, resourceId) { return element.dataset.record || activeRoute.query.record || getState().resources[resourceId]?.[0]?.id || '' }
function formPayload(form) {
  return Object.fromEntries([...form.querySelectorAll('[name]')].map(element => [
    element.name,
    element.type === 'checkbox' ? (element.checked ? '已启用' : '已停用') : element.value
  ]))
}

function talentDirectionFields() {
  const directions = (getState().resources?.['talent-direction'] || []).filter(item => item.status !== '已停用')
  const groups = directions.reduce((result, item) => {
    const category = item.category || '其他方向'
    ;(result[category] ||= []).push(item)
    return result
  }, {})
  const groupMarkup = Object.entries(groups).map(([category, items]) => `<div class="talent-direction-group"><b>${escapeHtml(category)}</b><div class="talent-check-list">${items.map(item => `<label><input type="checkbox" name="directionIds" value="${escapeHtml(item.id)}" data-direction="${escapeHtml(item.name)}" data-category="${escapeHtml(category)}"> ${escapeHtml(item.name)}</label>`).join('')}</div></div>`).join('')
  return `<fieldset class="form-field span-2"><legend>培养方向（可多选）</legend><div class="talent-direction-groups">${groupMarkup || '<p class="field-hint">暂无已启用的标准方向。</p>'}</div><label class="form-field"><span>其他方向（可选）</span><input name="customDirection" placeholder="没有合适类别时填写，例如：街舞编舞"></label><small class="field-hint">标准方向用于计划匹配；其他方向会保留原文，后续可由平台归类。</small></fieldset>`
}

function openResourceAction(action, element) {
  const resourceId = currentResourceId(element)
  const recordIds = String(element.dataset.records || '').split(',').filter(Boolean)
  if (recordIds.length) {
    if (getDestructiveDefinition(action)) return openModal({ kind:'batch-destructive', action, resourceId, recordIds })
    return openModal({ kind:'batch-action', action, resourceId, recordIds })
  }
  const recordId = currentRecordId(element, resourceId)
  if (action === 'resource-query') { document.querySelector('#resource-table')?.scrollIntoView({ behavior:'smooth', block:'start' }); showToast('已按当前条件刷新结果列表'); return }
  if (action === 'resource-detail') { if (!recordId) return showToast('当前没有可查看的记录', 'warning'); return openModal({ kind:'detail', resourceId, recordId, panel:element.dataset.panel || activeRoute.query.panel }) }
  if (action === 'resource-create') return openModal({ kind:'record-form', resourceId, parentId:element.dataset.parentId || '' })
  if (action === 'resource-update') { if (!recordId) return showToast('请先新增或选择一条记录', 'warning'); const restriction = getRecordEditRestriction(resourceId, getRecord(resourceId, recordId)); if (restriction) return showToast(restriction, 'warning'); return openModal({ kind:'record-form', resourceId, recordId }) }
  if (getDestructiveDefinition(action)) { if (!recordId) return showToast('当前没有可处理的记录', 'warning'); return openModal({ kind:'destructive', action, resourceId, recordId }) }
  if (!recordId) return showToast('当前没有可处理的记录，请先新增记录', 'warning')
  if (action === 'analysis-drilldown') return openModal({ kind:'detail', resourceId, recordId })
  if (action === 'analysis-refresh') {
    const result = executeResourceAction(resourceId, recordId, action, {})
    showToast(result.summary || result.reason, result.ok ? 'success' : 'warning')
    return
  }
  openModal({ kind:'action-form', action, resourceId, recordId, description:'' })
}

root.addEventListener('click', event => {
  const approvalSubmit = event.target.closest('[data-approval-submit]')
  if (approvalSubmit && approvalSubmit.tagName === 'BUTTON') {
    event.preventDefault()
    const form = approvalSubmit.closest('form[data-approval-submit]')
    if (form) {
      form.dataset.approvalSubmit = approvalSubmit.dataset.approvalSubmit
      form.requestSubmit()
    }
    return
  }
  const approvalRoute = event.target.closest('[data-approval-route]')
  if (approvalRoute) {
    event.preventDefault()
    navigate('terminal', { terminal:'admin', section:'approval', panel:approvalRoute.dataset.approvalRoute })
    return
  }
  const approvalActionElement = event.target.closest('[data-approval-action]')
  if (approvalActionElement) {
    event.preventDefault()
    const action = approvalActionElement.dataset.approvalAction
    const payload = {
      formId:approvalActionElement.dataset.formId,
      flowId:approvalActionElement.dataset.flowId,
      taskId:approvalActionElement.dataset.taskId,
      nodeId:approvalActionElement.dataset.nodeId,
      fieldId:approvalActionElement.dataset.fieldId,
      messageId:approvalActionElement.dataset.messageId,
      expressionId:approvalActionElement.dataset.expressionId,
      listenerId:approvalActionElement.dataset.listenerId,
      opinion:root.querySelector('[data-approval-task-opinion]')?.value || '',
      reason:root.querySelector('[data-approval-task-opinion]')?.value || '',
      note:root.querySelector('[data-approval-task-opinion]')?.value || '',
      assignee:root.querySelector('[data-approval-task-assignee]')?.value || '',
      transferTo:root.querySelector('[data-approval-task-assignee]')?.value || '',
      delegateTo:root.querySelector('[data-approval-task-assignee]')?.value || '',
      attachments:String(root.querySelector('[data-approval-task-attachments]')?.value || '').split(/[，,、]/).filter(Boolean),
      name:root.querySelector('[data-approval-config-name]')?.value || '',
      expression:root.querySelector('[data-approval-config-content]')?.value || '',
      event:root.querySelector('[data-approval-config-content]')?.value || '',
      handler:root.querySelector('[data-approval-config-content]')?.value || '',
      values:root.querySelector('[data-approval-config-name]') ? {
        name:root.querySelector('[data-approval-config-name]')?.value || '',
        expression:root.querySelector('[data-approval-config-content]')?.value || '',
        event:root.querySelector('[data-approval-config-content]')?.value || '',
        handler:root.querySelector('[data-approval-config-content]')?.value || ''
      } : undefined,
      type:approvalActionElement.dataset.nodeType || approvalActionElement.dataset.fieldType,
      delta:Number(approvalActionElement.dataset.delta || 0),
      field:approvalActionElement.dataset.fieldType ? { type:approvalActionElement.dataset.fieldType, label:approvalActionElement.dataset.fieldType === 'text' ? '单行文本' : undefined } : undefined,
      node:approvalActionElement.dataset.nodeType ? { type:approvalActionElement.dataset.nodeType, name:approvalActionElement.dataset.nodeType === 'condition' ? '条件分支' : '审批节点' } : undefined
    }
    if (action === 'update-form') {
      payload.values = {
        name:root.querySelector('[data-approval-form-name]')?.value,
        resourceId:root.querySelector('[data-approval-form-resource]')?.value,
        field: { label:root.querySelector('[data-approval-field-label]')?.value, required:Boolean(root.querySelector('[data-approval-field-required]')?.checked) }
      }
    }
    if (action === 'update-flow') {
      payload.values = {
        formId:root.querySelector('[data-approval-flow-form]')?.value,
        node: { assigneeType:root.querySelector('[data-approval-assignee-source]')?.value }
      }
    }
    const actionMap = { 'save-form':'update-form', 'save-flow':'update-flow' }
    const result = executeApprovalAction(actionMap[action] || action, payload)
    showToast(result.summary || result.reason || '操作已完成', result.ok ? 'success' : 'warning')
    if (result.ok) render()
    return
  }
  const helpElement = event.target.closest('[data-help-key]')
  if (helpElement) {
    event.preventDefault()
    event.stopPropagation()
    openModal({ kind:'help', helpKey:helpElement.dataset.helpKey })
    return
  }
  const homeScrollElement = event.target.closest('[data-scroll-target]')
  if (homeScrollElement) {
    event.preventDefault()
    document.querySelector(`#${homeScrollElement.dataset.scrollTarget}`)?.scrollIntoView({ behavior:'smooth', block:'start' })
    return
  }
  const visitOrderActionElement = event.target.closest('[data-visit-order-action]')
  if (visitOrderActionElement) {
    const visitOrderAction = visitOrderActionElement.dataset.visitOrderAction
    const planType = visitOrderActionElement.dataset.planType || (visitOrderAction.includes('medical') ? 'medical' : 'health')
    if (visitOrderAction === 'select-favorite-plan') {
      openModal({ kind:'favorite-plan-picker', planType })
      return
    }
    const result = executeVisitOrderAction(visitOrderAction, {
      planType,
      confirmWarnings:visitOrderActionElement.dataset.confirmWarnings === 'true',
      status:visitOrderActionElement.dataset.backofficeStatus,
      type:visitOrderActionElement.dataset.exceptionType
    })
    showToast(result.summary || result.reason, result.ok ? 'success' : 'warning')
    if (result.ok || result.requiresConfirmation || result.blocked) render()
    return
  }
  const orderFinanceElement = event.target.closest('[data-order-finance-action]')
  if (orderFinanceElement) {
    event.preventDefault()
    const action = orderFinanceElement.dataset.orderFinanceAction
    const recordId = orderFinanceElement.dataset.record
    const modalActions = ['open-payment','open-refund','invoice-start','reconciliation-difference','refund-approve','refund-reject','refund-execute','reverse-payment','invoice-issue','invoice-void']
    if (modalActions.includes(action)) {
      openModal({ kind:'order-finance', action, recordId })
      return
    }
    const actionMap = {
      'reverse-payment':'reverse-offline-payment',
      'refund-submit':'submit-refund-application',
      'refund-approve':'approve-refund-application',
      'refund-reject':'reject-refund-application',
      'refund-cancel':'cancel-refund-application',
      'refund-execute':'execute-offline-refund',
      'invoice-issue':'issue-invoice',
      'invoice-void':'void-invoice',
      'reconciliation-confirm':'confirm-reconciliation'
    }
    const result = executeVisitOrderAction(actionMap[action] || action, { recordId })
    showToast(result.summary || result.reason, result.ok ? 'success' : 'warning')
    if (result.ok) render()
    return
  }
  const terminalActionElement = event.target.closest('[data-terminal-action]')
  if (terminalActionElement) {
    const actionHref = terminalActionElement.tagName === 'A' ? terminalActionElement.getAttribute('href') : ''
    event.preventDefault()
    const terminalAction = terminalActionElement.dataset.terminalAction
    const payload = {
      ...(terminalActionElement.dataset.reportId ? { reportId:terminalActionElement.dataset.reportId } : {}),
      ...(terminalActionElement.dataset.resultId ? { resultId:terminalActionElement.dataset.resultId } : {}),
      ...(terminalActionElement.dataset.childId ? { childId:terminalActionElement.dataset.childId } : {}),
      ...(terminalActionElement.dataset.relationId ? { relationId:terminalActionElement.dataset.relationId } : {}),
      ...(terminalActionElement.dataset.actualQty ? { actualQty:Number(terminalActionElement.dataset.actualQty) } : {}),
      ...(terminalActionElement.dataset.invitationId ? { invitationId:terminalActionElement.dataset.invitationId } : {}),
      ...(terminalActionElement.dataset.appointmentId ? { appointmentId:terminalActionElement.dataset.appointmentId } : {}),
      ...(terminalActionElement.dataset.participant ? { participant:terminalActionElement.dataset.participant } : {}),
      ...(terminalActionElement.dataset.at ? { at:terminalActionElement.dataset.at } : {}),
      ...(terminalActionElement.dataset.conclusion ? { conclusion:terminalActionElement.dataset.conclusion } : {}),
      ...(terminalActionElement.dataset.recordingUrl ? { recordingUrl:terminalActionElement.dataset.recordingUrl } : {})
    }
    if (terminalAction === 'talent-preview-report') {
      if (!payload.reportId) { showToast('当前没有可查看的报告', 'warning'); return }
      const preview = executeTerminalAction(terminalAction, payload)
      if (!preview.ok) { showToast(preview.summary || preview.reason || '报告无法打开', 'warning'); return }
      openModal({ kind:'report-detail', id:payload.reportId })
      return
    }
    if (terminalAction === 'talent-member-import-template') {
      const result = executeTerminalAction(terminalAction, payload)
      if (result.ok) {
        const content = '\uFEFF姓名,登记对象,家长手机号,关系类型,外部受检人标识,出生日期,性别,培养意向\n示例孩子,孩子,13800001234,母亲,SUBJECT-EXAMPLE-001,2015-09-12,女,逻辑思维、专注力\n'
        const blob = new Blob([content], { type:'text/csv;charset=utf-8' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = '天赋会员导入模板.csv'
        link.click()
        URL.revokeObjectURL(link.href)
      }
      showToast(result.summary || result.reason, result.ok ? 'success' : 'warning')
      if (result.ok) render()
      return
    }
    const result = executeTerminalAction(terminalAction, payload)
    showToast(result.summary || result.reason, result.ok ? 'success' : 'warning')
    if (result.ok || (terminalAction === 'start-consultation' && actionHref && actionHref.includes('scope=customer'))) {
      if (actionHref && actionHref.startsWith('#/')) location.hash = actionHref.slice(1)
      else render()
    }
    return
  }
  const panelTab = event.target.closest('[data-panel-tab]')
  if (panelTab) {
    event.preventDefault()
    if (panelTab.getAttribute('aria-current') === 'page') return
    navigate('terminal', { ...activeRoute.query, panel:panelTab.dataset.panelTab })
    return
  }
  const closureElement = event.target.closest('[data-closure-action]')
  if (closureElement) {
    event.preventDefault()
    const action = closureElement.dataset.closureAction
    if (['member-create','organization-create','user-create','user-update','user-reset-password','role-create','role-update','plan-create','plan-edit','plan-review-reject','report-review-reject','report-publish','selection-review','selection-review-reject'].includes(action)) {
      openModal({ kind:'closure-form', action, id:closureElement.dataset.id || '' })
      return
    }
    const payload = Object.fromEntries(Object.entries(closureElement.dataset).filter(([key]) => key !== 'closureAction'))
    if (typeof payload.results === 'string') { try { payload.results = JSON.parse(payload.results) } catch { /* invalid result payload will be rejected by domain validation */ } }
    if (action === 'selection-apply') {
      payload.planId = root.querySelector('[data-plan-select]:checked')?.value || ''
      payload.reportId = closureElement.dataset.reportId || ''
      payload.shareProfile = Boolean(root.querySelector('[data-share-profile]')?.checked)
      payload.shareReports = Boolean(root.querySelector('[data-share-reports]')?.checked)
    }
    if (action === 'selection-push') payload.simulateFailure = closureElement.dataset.simulateFailure === 'true'
    const terminal = activeRoute.query.terminal
    const actor = terminal === 'talent-agent' ? { role:'agent', orgId:'ORG-AGENT-001', userId:'TAL-USER-001' } : terminal === 'talent-provider' ? { role:'provider', orgId:'ORG-SERVICE-001', userId:'TAL-USER-003' } : terminal === 'miniapp' ? { role:'client', parentId:getState().terminalDemo?.talent?.currentParentId || getState().terminalDemo?.talent?.parentId || '' } : { role:'platform' }
    if (actor.orgId && ['member-save','plan-save','organization-save'].includes(action)) payload.orgId ||= actor.orgId
    const result = executeClosureAction(action, payload, actor)
    showToast(result.message || result.summary || result.reason || (result.ok ? '操作已完成' : '操作未完成'), result.ok ? 'success' : 'warning')
    if (result.ok || result.changed || action === 'selection-push') render()
    return
  }
  const element = event.target.closest('[data-action]')
  if (!element) return
  const action = element.dataset.action
  if (action === 'close-modal') { if (event.target === element || element.tagName === 'BUTTON') closeModal(); return }
  if (action === 'miniapp-volume-detail') {
    ui.modal = { kind:'miniapp-volume-detail', reportId:element.dataset.reportId || '', volumeId:element.dataset.volumeId || '' }
    render()
    return
  }
  if (action === 'agent-leads') { ui.modal = { kind:'agent-leads', orgId:element.dataset.orgId || '' }; render(); return }
  if (action === 'confirm-favorite-plan') return
  if (action === 'reset-all') { openModal({ kind:'reset' }); return }
  if (action === 'open-consultation-create') { openModal({ kind:'consultation-create', customerId:element.dataset.customerId, customer:element.dataset.customer }); return }
  if (action === 'add-plan-condition') {
    const list = element.closest('form')?.querySelector('[data-condition-list]')
    const source = list?.firstElementChild
    if (list && source) {
      const clone = source.cloneNode(true)
      clone.querySelectorAll('input').forEach(input => { input.value = '' })
      list.appendChild(clone)
    }
    return
  }
  if (action === 'remove-plan-condition') {
    const list = element.closest('[data-condition-list]')
    if (list?.children.length > 1) element.closest('[data-condition-row]')?.remove()
    return
  }
  if (action === 'consultation-reschedule') { openModal({ kind:'consultation-reschedule', recordId:element.dataset.record || activeRoute.query.record }); return }
  if (action === 'consultation-cancel') { openModal({ kind:'consultation-cancel', recordId:element.dataset.record || activeRoute.query.record }); return }
  if (action === 'consultation-conclusion') { openModal({ kind:'consultation-conclusion', recordId:element.dataset.record || activeRoute.query.record }); return }
  if (action === 'reset-terminal-filter') {
    const hadFilter = Object.entries(activeRoute.query || {}).some(([key, value]) => ['keyword', 'status', 'tab', 'category', 'level'].includes(key) && value)
    navigate('terminal', {
      terminal:activeRoute.query.terminal,
      section:activeRoute.query.section,
      panel:activeRoute.query.panel
    })
    showToast(hadFilter ? '筛选条件已重置' : '当前已是默认筛选', 'success')
    return
  }
  if (action === 'talent-member-child-create') {
    openModal({ kind:'talent-member-child-form', parentId:element.dataset.parentId || '' })
    return
  }
  if (action === 'talent-member-child-update') {
    openModal({ kind:'talent-member-child-form', parentId:element.dataset.parentId || '', childId:element.dataset.childId || '' })
    return
  }
  if (action === 'confirm-action') {
    const actual = element.dataset.confirmAction
    if (actual === 'reset-all') { ui.modal=null; resetAll(); showToast('已恢复初始业务数据'); return }
    const resourceId = element.dataset.resource; const recordId = element.dataset.record
    const recordIds = String(element.dataset.records || '').split(',').filter(Boolean)
    ui.modal = null
    if (recordIds.length) {
      const results = recordIds.map(id => executeResourceAction(resourceId, id, actual, {}))
      const succeeded = results.filter(result => result.ok).length
      const failed = results.length - succeeded
      navigate('terminal', { ...activeRoute.query, selected:'', record:'', mode:'' })
      showToast(`批量处理完成：成功 ${succeeded} 条${failed ? `，受限 ${failed} 条` : ''}`, failed ? 'warning' : 'success')
      return
    }
    const result = actual === 'resource-delete' ? safeDeleteRecord(resourceId, recordId) : executeResourceAction(resourceId, recordId, actual, {})
    if (!result.ok && result.alternativeAction) {
      const record = getRecord(resourceId, recordId)
      ui.modal = { kind:'restriction', resourceId, recordId, recordName:record?.name, reason:result.reason || result.message, alternativeAction:result.alternativeAction }
      render()
    } else if (!result.ok) render()
    showToast(result.message || result.summary || (result.ok ? '操作已完成' : result.reason), result.ok ? 'success' : 'warning'); return
  }
  if (['plan-detail','member-detail','organization-detail'].includes(action)) {
    if (!element.dataset.id) { showToast('当前没有可查看的记录', 'warning'); return }
    openModal({ kind:action, id:element.dataset.id })
    return
  }
  if (['organization-edit','user-create','user-edit','role-create','role-edit','plan-create','plan-edit'].includes(action)) {
    const normalized = { 'organization-edit':'organization-update', 'user-edit':'user-update', 'role-edit':'role-update' }[action] || action
    openModal({ kind:'closure-form', action:normalized, id:element.dataset.id || '' })
    return
  }
  if (getActionDefinition(action)) { openResourceAction(action, element); return }
})

root.addEventListener('change', event => {
  if (event.target.matches('[data-relation-select]')) {
    refreshRelationSelects(event.target.closest('form'))
    return
  }
  if (event.target.matches('[data-plan-factor]')) {
    refreshPlanLevelSelect(event.target.closest('form'))
    return
  }
  const control = event.target.closest('[data-plan-material], [data-plan-quantity]')
  if (!control) return
  const result = executeVisitOrderAction('update-plan-line', {
    planType:control.dataset.planType,
    itemIndex:Number(control.dataset.itemIndex || 0),
    field:control.dataset.field,
    value:control.value
  })
  showToast(result.summary || result.reason, result.ok ? 'success' : 'warning')
  if (result.ok) render()
})

root.addEventListener('input', event => {
  if (!event.target.matches('[data-result-range-input]')) return
  const form = event.target.closest('form')
  const min = form?.querySelector('[name="resultMin"]')?.value || ''
  const max = form?.querySelector('[name="resultMax"]')?.value || ''
  const preview = form?.querySelector('[data-result-range-preview]')
  if (!preview) return
  const low = min === '' ? null : Number(min)
  const high = max === '' ? null : Number(max)
  preview.textContent = !Number.isFinite(low) || !Number.isFinite(high)
    ? '请输入最小值和最大值'
    : low > high
      ? '最小值不能大于最大值'
      : `${low}–${high} 分`
})

root.addEventListener('submit', event => {
  const form = event.target
  if (form.matches('[data-mini-filter]')) {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(form))
    navigate('terminal', { ...activeRoute.query, section:'interpretations', panel:'miniapp-interpretations', category:values.category || '', level:values.level || '', keyword:values.keyword || '' })
    return
  }
  if (form.matches('[data-closure-form]')) {
    event.preventDefault()
    if (!form.reportValidity()) return
    const action = form.dataset.closureForm
    const payload = formPayload(form)
    if (action === 'user-save') payload.roleIds = [...form.querySelectorAll('[name="roleIds"]')].flatMap(input => input.tagName === 'SELECT' ? [...input.selectedOptions].map(option => option.value) : (input.checked ? [input.value] : []))
    if (action === 'role-save') payload.menuIds = [...form.querySelectorAll('[name="menuIds"]:checked')].map(input => input.value)
    if (action === 'role-save') payload.dataOrgIds = [...form.querySelectorAll('[name="dataOrgIds"]:checked')].map(input => input.value)
    if (action === 'member-save') {
      const selectedDirections = [...form.querySelectorAll('[name="directionIds"]:checked')].map((input, index) => ({ directionId:input.value, direction:input.dataset.direction || input.value, category:input.dataset.category || '其他方向', order:index + 1 }))
      const customDirection = String(form.querySelector('[name="customDirection"]')?.value || '').trim()
      payload.intents = customDirection
        ? [...selectedDirections, { direction:'其他', category:'自定义', custom:customDirection, raw:customDirection, order:selectedDirections.length + 1 }]
        : selectedDirections
    }
    if (action === 'plan-save') {
      payload.focusAbilities = String(payload.focusAbilities || '').split(/[，,、\n]/).map(value => value.trim()).filter(Boolean)
      payload.stages = String(payload.stages || '').split(/\n/).map(value => value.trim()).filter(Boolean).map(value => { const [name, ...rest] = value.split('：'); return { name:name.trim(), content:rest.join('：').trim() } })
      payload.elementConditions = [...form.querySelectorAll('[data-condition-row]')].map(row => ({ factor:row.querySelector('[name="conditionFactor"]')?.value || '', level:row.querySelector('[name="conditionLevel"]')?.value || '', min:row.querySelector('[name="conditionMin"]')?.value === '' ? undefined : Number(row.querySelector('[name="conditionMin"]')?.value), max:row.querySelector('[name="conditionMax"]')?.value === '' ? undefined : Number(row.querySelector('[name="conditionMax"]')?.value) })).filter(item => item.factor)
    }
    if (action === 'selection-apply') {
      payload.planId = form.querySelector('[data-plan-select]:checked')?.value || ''
      payload.reportId = form.dataset.reportId || payload.reportId || ''
      payload.shareProfile = Boolean(form.querySelector('[name="shareProfile"]')?.checked)
      payload.shareReports = Boolean(form.querySelector('[name="shareReports"]')?.checked)
    }
    if (action === 'report-publish') {
      payload.volumeIds = [...form.querySelectorAll('[name="volumeIds"]:checked')].map(input => input.value)
      payload.paymentConfirmed = Boolean(form.querySelector('[name="paymentConfirmed"]')?.checked)
    }
    if (action === 'selection-review') payload.approved = form.querySelector('[name="approved"]')?.value === 'true'
    const terminal = activeRoute.query.terminal
    const actor = terminal === 'talent-agent' ? { role:'agent', orgId:'ORG-AGENT-001', userId:'TAL-USER-001' } : terminal === 'talent-provider' ? { role:'provider', orgId:'ORG-SERVICE-001', userId:'TAL-USER-003' } : terminal === 'miniapp' ? { role:'client', parentId:getState().terminalDemo?.talent?.currentParentId || getState().terminalDemo?.talent?.parentId || '' } : { role:'platform' }
    const result = executeClosureAction(action, payload, actor)
    showToast(result.message || result.summary || result.reason || (result.ok ? '已保存' : '保存失败'), result.ok ? 'success' : 'warning')
    if (result.ok) { ui.modal = null; render() }
    return
  }
  if (form.matches('[data-action="save-talent-member-child"]')) {
    event.preventDefault()
    if (!form.reportValidity()) return
    const payload = formPayload(form)
    const parent = getRecord('talent-parent', form.dataset.parentId)
    try {
      if (!parent) throw new Error('会员不存在')
      const existingChild = form.dataset.childId ? getRecord('talent-child', form.dataset.childId) : null
      const child = existingChild || createRecord('talent-child', {
        childName:payload.childName,
        name:payload.childName,
        idNo:payload.idNo,
        parentId:form.dataset.parentId,
        organization:parent.organization || '',
        channel:parent.channel || ''
      })
      const result = executeClosureAction('member-save', {
        id:child.id,
        childId:child.id,
        name:payload.childName,
        kind:'孩子',
        parentId:form.dataset.parentId,
        relationType:payload.relationType,
        idNo:payload.idNo,
        externalSubjectId:existingChild?.externalSubjectId || child.externalSubjectId || '',
        organization:parent.organization || '',
        channel:parent.channel || ''
      }, { role:'platform' })
      if (!result.ok) throw new Error(result.reason || '孩子资料保存失败')
      ui.modal = null
      showToast(form.dataset.childId ? '孩子资料已保存' : '孩子已新增并完成绑定')
      render()
    } catch (error) { showToast(error.message, 'warning') }
    return
  }
  if (form.matches('[data-approval-submit]')) {
    event.preventDefault()
    if (!form.reportValidity()) return
    const payload = formPayload(form)
    const action = form.dataset.approvalSubmit || 'submit'
    const result = executeApprovalAction(action, {
      resourceId:payload.resourceId,
      businessId:payload.businessId,
      formId:payload.formId,
      flowId:payload.flowId,
      formData:payload,
      candidateUser:payload.candidateUser || '',
      candidateUsers:payload.candidateUser ? [payload.candidateUser] : [],
      attachments:payload.attachments ? String(payload.attachments).split(/[，,、]/).filter(Boolean) : []
    })
    showToast(result.summary || result.reason || (result.ok ? '审批流程已提交' : '审批流程未提交'), result.ok ? 'success' : 'warning')
    if (result.ok) navigate('terminal', { terminal:'admin', section:'approval', panel:action === 'draft' ? 'approval-my-process' : 'approval-todo' })
    return
  }
  if (form.matches('[data-action="save-order-finance"]')) {
    event.preventDefault()
    if (!form.reportValidity()) return
    const result = executeVisitOrderAction(form.dataset.financeAction, formPayload(form))
    if (!result.ok) { showToast(result.reason, 'warning'); return }
    ui.modal = null
    showToast(result.summary)
    render()
    return
  }
  if (form.matches('[data-favorite-plan-form]')) {
    event.preventDefault()
    const payload = formPayload(form)
    const result = executeVisitOrderAction('select-favorite-plan', {
      planType:form.dataset.planType,
      favoriteId:payload.favoriteId
    })
    ui.modal = null
    showToast(result.summary || result.reason, result.ok ? 'success' : 'warning')
    render()
    return
  }
  if (form.matches('[data-action="save-consultation-create"]')) {
    const payload = formPayload(form)
    const result = executeTerminalAction('create-consultation', payload)
    if (!result.ok) { showToast(result.reason, 'warning'); return }
    ui.modal = null
    showToast(result.summary)
    navigate('terminal', { terminal:'service', section:'consultation', customerId:payload.customerId, scope:'customer' })
    return
  }
  if (form.matches('[data-action="save-consultation-schedule"]')) {
    const payload = formPayload(form)
    const actionName = payload.time ? 'consultation-reschedule' : 'consultation-cancel'
    const result = executeTerminalAction(actionName, payload)
    if (!result.ok) { showToast(result.reason, 'warning'); return }
    ui.modal = null
    showToast(result.summary)
    render()
    return
  }
  if (form.matches('[data-action="save-consultation-conclusion"]')) {
    const result = executeTerminalAction('consultation-save-conclusion', formPayload(form))
    if (!result.ok) { showToast(result.reason, 'warning'); return }
    ui.modal = null
    showToast(result.summary)
    render()
    return
  }
  if (form.matches('[data-terminal-filter]')) {
    event.preventDefault()
    const payload = formPayload(form)
    navigate('terminal', { ...activeRoute.query, ...payload, record:'', mode:'' })
    return
  }
  const action = form.dataset.action
  if (!action) return
  event.preventDefault()
  if (!form.reportValidity()) return
  if (action === 'resource-query') {
    const payload = formPayload(form); navigate('terminal', { ...activeRoute.query, ...payload, page:1, record:'', mode:'' }); return
  }
  if (action !== 'save-form') return
  const businessAction = form.dataset.formAction
  const payload = formPayload(form)
  const resourceId = form.dataset.resource
  const recordId = form.dataset.record
  try {
    ui.modal = null
    const recordIds = String(form.dataset.records || '').split(',').filter(Boolean)
    if (recordIds.length) {
      const results = recordIds.map(id => executeResourceAction(resourceId, id, businessAction, payload))
      const succeeded = results.filter(result => result.ok).length
      const failed = results.length - succeeded
      navigate('terminal', { ...activeRoute.query, selected:'', record:'', mode:'' })
      showToast(`批量处理完成：成功 ${succeeded} 条${failed ? `，受限 ${failed} 条` : ''}`, failed ? 'warning' : 'success')
      return
    }
    if (businessAction === 'resource-create') {
      const created = createRecord(resourceId, payload)
      showToast(created.name + '已新增到列表')
      navigate(activeRoute.name, activeRoute.name === 'terminal'
        ? { ...activeRoute.query, record:'', mode:'' }
        : { ...activeRoute.query, resource:resourceId, record:created.id, mode:'detail' })
      return
    }
    if (businessAction === 'resource-update') {
      const updated = updateRecord(resourceId, recordId, payload)
      showToast(updated.name + '已保存')
      navigate(activeRoute.name, activeRoute.name === 'terminal'
        ? { ...activeRoute.query, record:'', mode:'' }
        : { ...activeRoute.query, resource:resourceId, record:updated.id, mode:'detail' })
      return
    }
    const result = executeResourceAction(resourceId, recordId, businessAction, payload)
    if (!result.ok) render()
    showToast(result.summary || result.reason, result.ok ? 'success' : 'warning')
  } catch (error) { ui.modal = { kind:'record-form', resourceId, recordId }; render(); showToast(error.message, 'warning') }
})

root.addEventListener('change', event => {
  if (event.target.matches('[data-approval-flow-select]')) {
    navigate('terminal', { terminal:'admin', section:'approval', panel:'approval-start', flowId:event.target.value })
    return
  }
  if (event.target.matches('[data-action="toggle-record-selection"], [data-action="toggle-page-selection"]')) {
    const selected = new Set(String(activeRoute.query.selected || '').split(',').filter(Boolean))
    const ids = event.target.dataset.records ? event.target.dataset.records.split(',').filter(Boolean) : [event.target.dataset.record].filter(Boolean)
    for (const id of ids) event.target.checked ? selected.add(id) : selected.delete(id)
    navigate('terminal', { ...activeRoute.query, selected:[...selected].join(',') })
  }
})

root.addEventListener('click', event => {
  const panel = event.target.closest('[data-modal-panel]')
  if (panel) event.stopPropagation()
})

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && ui.modal) closeModal()
})

startRouter(render)
