import { escapeHtml, statusBadge } from '../components.js?v=talent-1.0.8'
import { helpButton } from '../help.js?v=talent-1.0.8'

const tabHref = (query, tab) => {
  const panels = {
    health:'visit-order-health',
    medical:'visit-order-medical',
    'health-implementation':'visit-order-health-implementation',
    'medical-implementation':'visit-order-medical-implementation'
  }
  return `#/terminal?terminal=${query.terminal || 'service'}&section=${query.section || 'visit-order'}&panel=${panels[tab]}`
}

const planLabel = planType => planType === 'medical' ? '医疗方案' : '健康管理方案'
const favoriteProjectLabels = {
  'health-sleep': '睡眠管理',
  'health-exercise': '运动管理',
  'medical-ecg': '动态心电图'
}
const orderLabel = order => {
  const submitted = new Set(order.submittedPlanTypes || [])
  if (submitted.has('health') && submitted.has('medical')) return '已开单·健康+医疗方案'
  if (submitted.has('health')) return '已开单·健康方案'
  if (submitted.has('medical')) return '已开单·医疗方案'
  return '待开单'
}
const planStatus = plan => plan?.status === 'submitted' ? '已提交' : '草稿'

function planItems(plan, planType) {
  return `<div class="visit-order-line-head"><span>项目</span><span>产品/药品/物料</span><span>规格</span><span>数量</span><span>可用库存 ${helpButton('field:available-stock')}</span></div>${(plan.items || []).map((item, index) => {
    const options = item.materialOptions || [item.material]
    const materialControl = options.length > 1
      ? `<select data-plan-material data-plan-type="${planType}" data-item-index="${index}" data-field="material" aria-label="选择${escapeHtml(item.project)}物料">${options.map(option => `<option value="${escapeHtml(option)}"${option === item.material ? ' selected' : ''}>${escapeHtml(option)}</option>`).join('')}</select>`
      : `<span>${escapeHtml(item.material)}</span>`
    return `<div class="visit-order-line"><b>${escapeHtml(item.project)}</b><span class="visit-order-material-cell">${materialControl}</span><span>${escapeHtml(item.specification)}</span><input class="visit-order-quantity" data-plan-quantity data-plan-type="${planType}" data-item-index="${index}" data-field="quantity" type="number" min="1" value="${escapeHtml(item.quantity)}" aria-label="${escapeHtml(item.project)}数量"><span>${escapeHtml(item.availableQty)}</span></div>`
  }).join('')}`
}

function planPanel(order, planType) {
  const plan = order[planType]
  const label = planLabel(planType)
  const submitted = (order.submittedPlanTypes || []).includes(planType)
  const warning = planType === 'medical' && order.preconditionResult?.warnings?.length
    ? `<div class="visit-order-warning"><b>提交前提示</b>${order.preconditionResult.warnings.map(item => `<p>${escapeHtml(item.project)} · ${escapeHtml(item.check)}：${escapeHtml(item.reason)}</p>`).join('')}</div>`
    : ''
  const blocking = planType === 'medical' && order.preconditionResult?.blocking?.length
    ? `<div class="visit-order-blocking"><b>存在阻止型前置条件，暂不能提交</b>${order.preconditionResult.blocking.map(item => `<p>${escapeHtml(item.project)} · ${escapeHtml(item.check)}：${escapeHtml(item.reason)}</p>`).join('')}</div>`
    : ''
  const submitButton = submitted
    ? '<span class="visit-order-submitted-note">已提交，内容只读</span>'
    : plan.pendingConfirmation
      ? '<button class="btn primary" data-visit-order-action="submit-medical-plan" data-confirm-warnings="true">确认提示并提交医疗方案</button>'
      : `<button class="btn primary" data-visit-order-action="submit-${planType}-plan">提交${label}</button>${helpButton('action:submit-order-creation')}`
  const info = `<dl class="visit-order-plan-info"><div><dt>服务周期</dt><dd>${escapeHtml(plan.servicePeriod || '待填写')}</dd></div><div><dt>方案金额</dt><dd>¥${Number(plan.amount || 0).toLocaleString()}</dd></div><div><dt>医生签字</dt><dd>${escapeHtml(plan.doctorSignature || '待医生签字')}</dd></div><div><dt>客户签字</dt><dd>${escapeHtml(plan.customerSignature || '待客户签字')}</dd></div></dl>`
  const submitHelp = planType === 'medical' ? helpButton('action:submit-medical-plan') : ''
  return `<section class="visit-order-plan-panel"><header><div><span class="eyebrow">一期客单 · ${label}</span><h2>${label}</h2><p>方案独立保存、独立提交；项目明细直接选择产品、规格和数量。</p></div>${statusBadge(planStatus(plan))}</header>${warning}${blocking}<div class="visit-order-lines">${planItems(plan, planType)}</div>${info}<div class="visit-order-plan-actions"><button class="btn ghost" data-visit-order-action="favorite-plan" data-plan-type="${planType}">收藏方案</button>${helpButton('action:favorite-plan')}<button class="btn secondary" data-visit-order-action="select-favorite-plan" data-plan-type="${planType}">选择个人方案</button>${helpButton('action:select-favorite-plan')}<button class="btn ghost" data-visit-order-action="save-${planType}-plan">保存${label}</button><button class="btn ghost" data-visit-order-action="preview-plan" data-plan-type="${planType}">打印预览</button>${submitButton}${submitHelp}</div>${planType === 'medical' ? '<small class="visit-order-hint">医疗前置条件只在点击提交时检查；提示型条件确认后仍可提交。</small>' : '<small class="visit-order-hint">健康方案提交后按一期规则直接扣库存。</small>'}</section>`
}

function implementationPanel(order, planType) {
  const plan = order.implementationPlans?.[planType]
  const label = plan?.title || (planType === 'medical' ? '医学治疗方案实施计划' : '健康管理方案实施计划')
  const details = `<dl class="visit-order-plan-info"><div><dt>执行周期</dt><dd>${escapeHtml(plan?.cycle || '待填写')}</dd></div><div><dt>执行人</dt><dd>${escapeHtml(plan?.executor || '待分配')}</dd></div><div><dt>提醒规则</dt><dd>${escapeHtml(plan?.reminder || '待设置')}</dd></div><div><dt>处理记录</dt><dd>${plan?.records?.length || 0} 条</dd></div></dl>`
  return `<section class="visit-order-implementation-panel"><header><div><span class="eyebrow">方案提交后的下一步</span><h2>${escapeHtml(label)}</h2><p>${plan?.unlocked ? '对应方案已提交，可以继续查看和编辑实施计划。' : `提交${planLabel(planType)}后解锁本页。`}</p></div>${statusBadge(plan?.unlocked ? '已解锁' : '未解锁')}</header>${plan?.unlocked ? `<div class="visit-order-implementation-body"><b>实施计划已解锁</b><p>保留一期实施计划的周期、执行人、提醒和处理记录。</p>${details}<button class="btn primary" data-visit-order-action="save-implementation-plan" data-plan-type="${planType}">保存实施计划</button></div>` : '<div class="visit-order-locked"><b>暂未解锁</b><p>先提交对应方案，系统只解锁与该方案对应的实施计划。</p></div>'}</section>`
}

export function renderVisitOrder(state, query = {}) {
  const order = state.visitOrder || { customer:'林女士', status:'draft', submittedPlanTypes:[], health:{ items:[] }, medical:{ items:[] }, implementationPlans:{} }
  const tab = ['health', 'medical', 'health-implementation', 'medical-implementation'].includes(query.tab) ? query.tab : 'health'
  const tabs = [
    ['health', '健康管理方案'],
    ['medical', '医疗方案'],
    ['health-implementation', '健康管理方案实施计划'],
    ['medical-implementation', '医学治疗方案实施计划']
  ]
  const body = tab === 'health'
    ? planPanel(order, 'health')
    : tab === 'medical'
      ? planPanel(order, 'medical')
      : implementationPanel(order, tab === 'medical-implementation' ? 'medical' : 'health')
  const visitLabel = order.visitType === 'revisit' ? '复诊' : '初诊'
  const orderTitle = order.orderId ? `${visitLabel}客单详情` : `${visitLabel}客单编辑`
  return `<div class="visit-order-page"><div class="visit-order-back-row"><a class="btn secondary small" href="${inquiryBackHref(query)}">返回</a></div><header class="visit-order-context"><div><span class="eyebrow">${visitLabel}客单 · 一期客单主现场</span><h1>${orderTitle}</h1><p>客户详情 → ${visitLabel} → 客单 → 方案提交 → 实施计划</p></div><div class="visit-order-context-tools">${helpButton('global-flow:visit-order', '流程说明', 'global')}<div class="visit-order-customer-meta"><span>客户ID</span><b>KH-202609-001</b><span>姓名</span><b>${escapeHtml(order.customer || '林女士')}</b><span>性别</span><b>女</b></div><div class="visit-order-context-meta"><span>客单编号</span><b>${escapeHtml(order.orderId || '待生成')}</b><span>${statusBadge(orderLabel(order))}</span></div></div></header><section class="visit-order-toolbar"><div><b>当前方案摘要</b><span>${escapeHtml(orderLabel(order))}</span><small>${order.handoffStatus === '已转后台处理' ? '已转后台处理' : '客户页面只负责方案和客单提交'}</small></div><div><button class="btn secondary" data-visit-order-action="favorite-plan" data-plan-type="${tab.startsWith('medical') ? 'medical' : 'health'}">收藏方案</button>${helpButton('action:favorite-plan')}<button class="btn secondary" data-visit-order-action="select-favorite-plan" data-plan-type="${tab.startsWith('medical') ? 'medical' : 'health'}">选择个人方案</button>${helpButton('action:select-favorite-plan')}<button class="btn primary" data-visit-order-action="forward-to-backoffice">转后台处理</button>${helpButton('action:forward-to-backoffice')}</div></section><nav class="visit-order-tabs" aria-label="一期客单页签">${tabs.map(([id, label]) => id === tab ? `<span class="active" aria-current="page">${label}</span>` : `<a href="${tabHref(query, id)}">${label}</a>`).join('')}</nav><div class="visit-order-detail-table">${body}</div></div>`
}

const inquiryBackHref = query => query.terminal === 'service'
  ? query.from === 'inquiry' ? '#/terminal?terminal=service&section=inquiry' : '#/terminal?terminal=service&section=visit-order'
  : '#/home'

export function renderFavoritePlanPicker(state, planType = 'health') {
  const label = planLabel(planType)
  const templates = (state.favoriteTemplates || []).filter(item => item.scope === 'personal' && item.planType === planType)
  if (!templates.length) return `<div class="favorite-plan-picker"><p>暂无已收藏的个人${escapeHtml(label)}，请先在当前方案中收藏项目组合。</p></div>`
  return `<form class="favorite-plan-picker" data-favorite-plan-form data-plan-type="${planType}"><h3>选择个人${escapeHtml(label)}</h3><p>选择后只带入项目组合，客户、金额、周期、签字和实施计划不会被带入。</p><div class="favorite-plan-options">${templates.map((item, index) => `<label><input type="radio" name="favoriteId" value="${escapeHtml(item.id)}" ${index === 0 ? 'checked' : ''}><span><b>${escapeHtml(label)}个人模板 ${index + 1}</b><small>${escapeHtml(item.projectIds.map(projectId => favoriteProjectLabels[projectId] || projectId).join('、') || '未配置项目')}</small></span></label>`).join('')}</div><div class="form-submit"><button class="btn ghost" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">确认带入</button></div></form>`
}
