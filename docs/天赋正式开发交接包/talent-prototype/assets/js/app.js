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
  initStore, resetAll, safeDeleteRecord, subscribe, updateRecord, executeApprovalAction
} from './store.js?v=talent-1.0.8'

const root = document.querySelector('#app')
const ui = { modal:null }
let activeRoute = { name:'home', query:{} }

initStore(seedState)
subscribe(() => render())

const resourceById = id => resourceRegistry.find(item => item.id === id)
const displayResourceName = resource => getWorkbenchConfig(resource?.id)?.title || resource?.title || resource?.entity || '业务记录'
const uniqueRelationValues = values => [...new Set(values.filter(Boolean))]

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
  const brand = activeRoute.name === 'home'
    ? `<span class="top-brand current" aria-current="page"><span>TJ</span><div><b>同佳系统二期</b><small>客户评审原型</small></div></span>`
    : `<a class="top-brand" href="#/home"><span>TJ</span><div><b>同佳系统二期</b><small>客户评审原型</small></div></a>`
  return `<header class="app-topbar">${brand}<div class="top-context"><span>当前位置</span><b>${escapeHtml(title)}</b></div><div class="top-actions"><span class="local-badge">● 本地演示数据</span><button class="btn ghost small" data-action="reset-all">恢复初始数据</button></div></header>`
}

function homeShell(content) {
  return `<div class="app-frame">${topbar('四端职责总览')}<main class="home-main">${content}</main>${renderModal()}</div>`
}

function workspaceShell(view) {
  return `<div class="app-frame ${view.shellClass || ''}">${topbar(view.title || '业务工作台')}<div class="workspace-shell">${view.sidebar}<main class="workspace-main">${view.content}</main></div>${renderModal()}</div>`
}

function renderModal() {
  const modal = ui.modal
  if (!modal) return ''
  if (modal.kind === 'talent-member-child-form') {
    const parent = getRecord('talent-parent', modal.parentId)
    const child = modal.childId ? getRecord('talent-child', modal.childId) : null
    const relation = child && (getState().resources?.['talent-member-relation'] || []).find(item => item.parentId === modal.parentId && item.childId === child.id && item.status === '有效')
    if (!parent) return modalShell({ title:'会员孩子管理', subtitle:'会员不存在', body:'<div class="empty-state">未找到当前会员。</div>', footer:'<button class="btn ghost" data-action="close-modal">关闭</button>' })
    const relationTypes = ['母亲','父亲','监护人']
    const body = `<form class="operation-form" data-action="save-talent-member-child" data-parent-id="${escapeHtml(parent.id)}" data-child-id="${escapeHtml(child?.id || '')}" data-relation-id="${escapeHtml(relation?.id || '')}"><div class="form-explain"><b>归属会员</b><p>${escapeHtml(parent.parentName || parent.name)} · 机构和渠道会自动继承会员资料；性别、出生日期由身份证号解析。</p></div><div class="form-grid"><label class="form-field"><span>孩子姓名 <em>必填</em></span><input name="childName" value="${escapeHtml(child?.childName || '')}" required></label><label class="form-field"><span>孩子身份证号 <em>必填</em></span><input name="idNo" value="${escapeHtml(child?.idNo || '')}" required></label><label class="form-field"><span>关系类型 <em>必填</em></span><select name="relationType" required>${relationTypes.map(type => `<option${(relation?.relationType || child?.relationType || '监护人') === type ? ' selected' : ''}>${type}</option>`).join('')}</select></label></div><div class="form-submit"><button class="btn ghost" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">${child ? '保存孩子资料' : '新增孩子'}</button></div></form>`
    return modalShell({ title:child ? '编辑孩子' : '新增孩子', subtitle:'孩子仅可绑定当前会员；一个孩子只允许一位有效家长', body })
  }
  if (modal.kind === 'talent-member-bind-child') {
    const parent = getRecord('talent-parent', modal.parentId)
    const state = getState()
    const relations = state.resources?.['talent-member-relation'] || []
    const children = (state.resources?.['talent-child'] || []).filter(child => child.status !== '已停用' && !relations.some(relation => relation.childId === child.id && relation.status === '有效'))
    if (!parent) return modalShell({ title:'绑定已有孩子', subtitle:'家长不存在', body:'<div class="empty-state">未找到当前家长。</div>', footer:'<button class="btn ghost" data-action="close-modal">关闭</button>' })
    const body = `<form class="operation-form" data-action="save-talent-member-bind-child" data-parent-id="${escapeHtml(parent.id)}"><div class="form-explain"><b>将已有孩子绑定到当前家长</b><p>孩子资料已由后台建档；小程序只读取生效关系。</p></div><div class="form-grid"><label class="form-field"><span>已有孩子 <em>必填</em></span><select name="childId" required><option value="">请选择孩子</option>${children.map(child => `<option value="${escapeHtml(child.id)}">${escapeHtml(child.childName || child.name)} · ${escapeHtml(child.idNo || '-')}</option>`).join('')}</select></label><label class="form-field"><span>关系类型 <em>必填</em></span><select name="relationType" required><option>母亲</option><option>父亲</option><option selected>监护人</option></select></label></div><div class="form-submit"><button class="btn ghost" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">保存绑定关系</button></div></form>`
    return modalShell({ title:'绑定已有孩子', subtitle:'一个孩子只允许一位有效家长', body })
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
    return modalShell({ title:`批量${definition.confirmTitle}`, subtitle:`已选择 ${modal.recordIds.length} 条记录`, body:`<div class="impact-box"><span>处理范围</span><h3>${modal.recordIds.length} 条${escapeHtml(resourceName)}</h3><p>系统将逐条校验状态和演示流程保护，受保护记录不会被破坏。</p></div><div class="impact-message"><b>影响说明</b><p>${escapeHtml(definition.confirmMessage)}</p><small>可选替代：${escapeHtml(definition.alternative)}</small></div>`, footer:`<button class="btn ghost" data-action="close-modal">暂不处理</button><button class="btn danger" data-action="confirm-action" data-confirm-action="${escapeHtml(modal.action)}" data-resource="${escapeHtml(modal.resourceId)}" data-records="${escapeHtml(modal.recordIds.join(','))}">确认批量${escapeHtml(getActionDefinition(modal.action)?.label || '处理')}</button>` })
  }  if (modal.kind === 'destructive') {
    const resource = resourceById(modal.resourceId)
    const record = getRecord(modal.resourceId, modal.recordId)
    const definition = getDestructiveDefinition(modal.action)
    return modalShell({ title:definition.confirmTitle, subtitle:'高影响操作需要明确对象与后果', body:`<div class="impact-box"><span>处理对象</span><h3>${escapeHtml(record?.name || modal.recordId)}</h3><p>编号：${escapeHtml(record?.code || record?.id || '-')} · 当前状态：${escapeHtml(record?.status || '-')}</p></div><div class="impact-message"><b>影响说明</b><p>${escapeHtml(definition.confirmMessage)}</p><small>可选替代：${escapeHtml(definition.alternative)}</small></div>`, footer:`<button class="btn ghost" data-action="close-modal">暂不处理</button><button class="btn danger" data-action="confirm-action" data-confirm-action="${escapeHtml(modal.action)}" data-resource="${escapeHtml(modal.resourceId)}" data-record="${escapeHtml(modal.recordId)}">确认${escapeHtml(getActionDefinition(modal.action)?.label || '处理')}</button>` })
  }
  if (modal.kind === 'restriction') {
    const definition = getActionDefinition(modal.alternativeAction)
    return modalShell({ title:'当前操作受到业务保护', subtitle:'系统没有执行会破坏流程或关键记录的操作', body:`<div class="impact-box"><span>受保护对象</span><h3>${escapeHtml(modal.recordName || modal.recordId)}</h3><p>${escapeHtml(modal.reason)}</p></div><div class="impact-message"><b>可以继续做什么</b><p>${escapeHtml(definition?.label || '查看详情')}不会破坏当前演示流程和历史业务记录。</p></div>`, footer:`<button class="btn ghost" data-action="close-modal">关闭</button><button class="btn primary" data-action="${escapeHtml(modal.alternativeAction || 'resource-detail')}" data-resource="${escapeHtml(modal.resourceId)}" data-record="${escapeHtml(modal.recordId)}">${escapeHtml(definition?.label || '查看详情')}</button>` })
  }
  if (modal.kind === 'reset') {
    return modalShell({ title:'恢复初始演示数据', subtitle:'仅影响当前浏览器中的演示数据', body:'<div class="impact-message"><b>将恢复哪些内容</b><p>采购、库存、客单、会诊、医学规则和天赋报告的页面状态及处理记录都会恢复。</p><small>该操作不会连接或影响任何正式系统。</small></div>', footer:'<button class="btn ghost" data-action="close-modal">取消</button><button class="btn danger" data-action="confirm-action" data-confirm-action="reset-all">确认恢复</button>' })
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
  const state = getState()
  if (routeChanged(previousRoute, activeRoute)) ui.modal = null
  let markup
  if (activeRoute.name === 'terminal') {
    const view = renderTerminal(state, activeRoute.query)
    markup = workspaceShell(view, state)
    document.title = `${view.title || '端职责工作台'}｜同佳系统二期`
  } else {
    markup = homeShell(renderHome(state))
    document.title = '四端职责客户原型｜同佳系统二期'
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
      ...(terminalActionElement.dataset.recordingUrl ? { recordingUrl:terminalActionElement.dataset.recordingUrl } : {}),
      ...(terminalActionElement.dataset.pdfFileName ? { pdfFileName:terminalActionElement.dataset.pdfFileName } : {}),
      ...(terminalActionElement.dataset.pdfFileKey ? { pdfFileKey:terminalActionElement.dataset.pdfFileKey } : {})
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
  const element = event.target.closest('[data-action]')
  if (!element) return
  const action = element.dataset.action
  if (action === 'close-modal') { if (event.target === element || element.tagName === 'BUTTON') closeModal(); return }
  if (action === 'confirm-favorite-plan') return
  if (action === 'reset-all') { openModal({ kind:'reset' }); return }
  if (action === 'open-consultation-create') { openModal({ kind:'consultation-create', customerId:element.dataset.customerId, customer:element.dataset.customer }); return }
  if (action === 'consultation-reschedule') { openModal({ kind:'consultation-reschedule', recordId:element.dataset.record || activeRoute.query.record }); return }
  if (action === 'consultation-cancel') { openModal({ kind:'consultation-cancel', recordId:element.dataset.record || activeRoute.query.record }); return }
  if (action === 'consultation-conclusion') { openModal({ kind:'consultation-conclusion', recordId:element.dataset.record || activeRoute.query.record }); return }
  if (action === 'reset-terminal-filter') {
    navigate('terminal', {
      terminal:activeRoute.query.terminal,
      section:activeRoute.query.section,
      panel:activeRoute.query.panel
    })
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
  if (action === 'talent-member-bind-child') {
    openModal({ kind:'talent-member-bind-child', parentId:element.dataset.parentId || '' })
    return
  }
  if (action === 'confirm-action') {
    const actual = element.dataset.confirmAction
    if (actual === 'reset-all') { ui.modal=null; resetAll(); showToast('已恢复初始演示数据'); return }
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
  if (getActionDefinition(action)) { openResourceAction(action, element); return }
})

root.addEventListener('change', event => {
  if (event.target.matches('[data-relation-select]')) {
    refreshRelationSelects(event.target.closest('form'))
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

root.addEventListener('submit', event => {
  const form = event.target
  if (form.matches('[data-action="save-talent-member-child"]')) {
    event.preventDefault()
    if (!form.reportValidity()) return
    const payload = formPayload(form)
    const parent = getRecord('talent-parent', form.dataset.parentId)
    try {
      if (!parent) throw new Error('会员不存在')
      Object.assign(payload, {
        parentId:form.dataset.parentId,
        organization:parent.organization || '',
        channel:parent.channel || ''
      })
      if (form.dataset.childId) updateRecord('talent-child', form.dataset.childId, payload)
      else createRecord('talent-child', payload)
      ui.modal = null
      showToast(form.dataset.childId ? '孩子资料已保存' : '孩子已新增并完成绑定')
      render()
    } catch (error) { showToast(error.message, 'warning') }
    return
  }
  if (form.matches('[data-action="save-talent-member-bind-child"]')) {
    event.preventDefault()
    if (!form.reportValidity()) return
    const payload = formPayload(form)
    const parent = getRecord('talent-parent', form.dataset.parentId)
    try {
      if (!parent) throw new Error('家长不存在')
      const child = getRecord('talent-child', payload.childId)
      if (!child) throw new Error('孩子不存在')
      createRecord('talent-member-relation', { parentId:parent.id, childId:child.id, relationType:payload.relationType, organization:parent.organization || child.organization || '', channel:parent.channel || child.channel || '', status:'有效' })
      ui.modal = null
      showToast('已有孩子已绑定到当前家长')
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
