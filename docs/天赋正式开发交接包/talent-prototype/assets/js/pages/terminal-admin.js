import { escapeHtml, firstRecord, metricLink, recordHref, scopeBanner, statusBadge, tableLink, terminalHref, terminalResourcePanel, workbenchLink, workList, workRow } from './terminal-shared.js?v=talent-1.0.8'
import { renderApprovalContent } from './terminal-approval.js?v=talent-1.0.8'
import { renderCheckupSyncPanel, renderIntegrationOverview, renderIntegrationPanel, renderIntelligenceConfigOverview, renderIntelligenceConfigPanel, renderMedicalRulesOverview, renderMedicalRulesPanel } from './health-intelligence.js?v=talent-1.0.8'

const orderBusinessStatusLabels = {
  draft:'待提交方案',
  health_submitted:'已提交健康方案',
  medical_submitted:'已提交医疗方案',
  health_medical_submitted:'已提交健康+医疗方案'
}
const orderBusinessStatusLabel = status => orderBusinessStatusLabels[status] || status || '待提交方案'
const orderCenterDemoRecords = [
  { orderNo:'SO-DEMO-001', sourceLabel:'客户服务订单', sourceNo:'VO-DEMO-001', customer:'周女士', businessStatus:'draft', businessStatusLabel:'待提交方案', fundStatus:'待生成订单', executionStatus:'未执行', orderSummary:'待提交方案', receivableAmount:0, paidAmount:0, refundingAmount:0, refundedAmount:0, invoiceStatus:'待申请', reconciliationStatus:'待对账' },
  { orderNo:'SO-DEMO-002', sourceLabel:'客户服务订单', sourceNo:'VO-DEMO-002', customer:'陈先生', businessStatus:'health_submitted', businessStatusLabel:'已提交健康方案', fundStatus:'待收款', executionStatus:'未执行', orderSummary:'健康方案', receivableAmount:1280, paidAmount:0, refundingAmount:0, refundedAmount:0, invoiceStatus:'待申请', reconciliationStatus:'待对账' },
  { orderNo:'SO-DEMO-003', sourceLabel:'客户服务订单', sourceNo:'VO-DEMO-003', customer:'赵女士', businessStatus:'medical_submitted', businessStatusLabel:'已提交医疗方案', fundStatus:'部分收款', executionStatus:'待护士确认', orderSummary:'医疗方案', receivableAmount:680, paidAmount:300, refundingAmount:0, refundedAmount:0, invoiceStatus:'处理中', reconciliationStatus:'存在差异' },
  { orderNo:'SO-DEMO-004', sourceLabel:'客户服务订单', sourceNo:'VO-DEMO-004', customer:'王先生', businessStatus:'health_medical_submitted', businessStatusLabel:'已提交健康+医疗方案', fundStatus:'已结清', executionStatus:'已确认出库', orderSummary:'健康方案 + 医疗方案', receivableAmount:1960, paidAmount:1960, refundingAmount:0, refundedAmount:0, invoiceStatus:'已开具', reconciliationStatus:'已对账' },
  { orderNo:'SO-DEMO-005', sourceLabel:'客户服务订单', sourceNo:'VO-DEMO-005', customer:'刘女士', businessStatus:'health_medical_submitted', businessStatusLabel:'已提交健康+医疗方案', fundStatus:'退款中', executionStatus:'已保存', orderSummary:'健康方案 + 医疗方案', receivableAmount:1960, paidAmount:1960, refundingAmount:680, refundedAmount:0, invoiceStatus:'已作废', reconciliationStatus:'已确认' },
  { orderNo:'SO-DEMO-006', sourceLabel:'客户服务订单', sourceNo:'VO-DEMO-006', customer:'孙先生', businessStatus:'health_submitted', businessStatusLabel:'已提交健康方案', fundStatus:'已退款', executionStatus:'已保存', orderSummary:'健康方案', receivableAmount:1280, paidAmount:1280, refundingAmount:0, refundedAmount:1280, invoiceStatus:'已作废', reconciliationStatus:'已对账' }
]
const orderCenterDemoInvoices = [
  { id:'INV-DEMO-001', invoiceNo:'-', snapshotVersion:1, status:'待申请' },
  { id:'INV-DEMO-002', invoiceNo:'-', snapshotVersion:1, status:'处理中' },
  { id:'INV-DEMO-003', invoiceNo:'TJ-202609-003', snapshotVersion:1, status:'已开具' },
  { id:'INV-DEMO-004', invoiceNo:'TJ-202609-004', snapshotVersion:1, status:'已作废' }
]
const orderCenterDemoReconciliations = [
  { id:'REC-DEMO-001', snapshotVersion:1, differenceNote:'尚未发起对账', status:'待对账' },
  { id:'REC-DEMO-002', snapshotVersion:1, differenceNote:'收款流水日期不一致', status:'存在差异' },
  { id:'REC-DEMO-003', snapshotVersion:1, differenceNote:'差异已由财务确认', status:'已确认' },
  { id:'REC-DEMO-004', snapshotVersion:1, differenceNote:'本期账单核对完成', status:'已对账' }
]

function terminalOrderPanel(state, panel, query = {}) {
  const visitOrder = state.visitOrder || {}
  const finance = visitOrder.finance || {}
  const source = visitOrder.source || { type:'customer-service', label:'客户服务订单', no:visitOrder.id }
  const orderNo = visitOrder.orderId || visitOrder.id || '待生成'
  const businessStatus = visitOrder.status || 'draft'
  const businessStatusLabel = orderBusinessStatusLabel(businessStatus)
  const hasOrder = Boolean(visitOrder.orderId || visitOrder.submittedPlanTypes?.length || finance.snapshots?.length || Number(finance.receivableAmount || 0) > 0)
  const fundStatus = hasOrder ? (finance.financeStatus || visitOrder.backoffice?.status || '待收款') : '待生成订单'
  const amount = value => `¥${Number(value || 0).toLocaleString()}`
  const orderSummary = (visitOrder.submittedPlanTypes || []).map(type => type === 'medical' ? '医疗方案' : '健康方案').join(' + ') || '待提交方案'
  const shell = (title, summary, body, badgeStatus = fundStatus) => `<section class="terminal-card terminal-axure-panel order-center-panel" data-terminal-resource="${escapeHtml(panel)}"><header><div><span class="eyebrow">后台管理 · 订单中心</span><h2>${escapeHtml(title)}</h2><p>${escapeHtml(summary)}</p></div>${statusBadge(badgeStatus)}</header>${body}</section>`
  const orderRecord = {
    id:orderNo,
    isPrimary:true,
    sourceLabel:source.label || '客户服务订单',
    sourceNo:source.no || visitOrder.id,
    orderNo,
    customer:visitOrder.customer || '林女士',
    businessStatus,
    businessStatusLabel,
    fundStatus,
    executionStatus:['未生成', '未解锁'].includes(visitOrder.medical?.nurseTaskStatus || visitOrder.implementationPlans?.health?.status) ? '未执行' : (visitOrder.medical?.nurseTaskStatus || visitOrder.implementationPlans?.health?.status || '未执行'),
    orderSummary,
    receivableAmount:finance.receivableAmount || 0,
    paidAmount:finance.paidAmount || 0,
    refundingAmount:finance.refundingAmount || 0,
    refundedAmount:finance.refundedAmount || 0,
    invoiceStatus:finance.invoiceStatus || '待申请',
    reconciliationStatus:finance.reconciliationStatus || '待对账',
    finance,
    visitOrder
  }
  const demoRecords = (state.terminalDemo?.orderCenter?.orders || orderCenterDemoRecords).map(record => ({ ...record, id:record.id || record.orderNo, isPrimary:false, readOnly:true }))
  const orderRecords = [orderRecord, ...demoRecords.filter(record => record.orderNo !== orderRecord.orderNo)]
  const selectedOrderRecord = orderRecords.find(record => record.orderNo === query.record || record.id === query.record)
  const matches = record => {
    const keyword = String(query.keyword || '').trim().toLowerCase()
    return (!query.source || query.source === '全部' || record.sourceLabel === query.source)
      && (!query.customer || record.customer.includes(query.customer))
      && (!query.orderNo || record.orderNo.includes(query.orderNo))
      && (!query.businessStatus || query.businessStatus === '全部' || record.businessStatus === query.businessStatus || record.businessStatusLabel === query.businessStatus)
      && (!query.fundStatus || query.fundStatus === '全部' || record.fundStatus === query.fundStatus)
      && (!keyword || Object.values(record).join(' ').toLowerCase().includes(keyword))
  }
  const businessStatusOptions = Object.entries(orderBusinessStatusLabels).map(([value, label]) => `<option value="${escapeHtml(label)}"${query.businessStatus === value || query.businessStatus === label ? ' selected' : ''}>${escapeHtml(label)}</option>`).join('')
  const fundStatusOptions = [...new Set(orderRecords.map(record => record.fundStatus))].map(status => `<option value="${escapeHtml(status)}"${query.fundStatus === status ? ' selected' : ''}>${escapeHtml(status)}</option>`).join('')
  const orderFilter = `<form class="terminal-filter" data-terminal-filter><label><span>订单来源</span><select name="source"><option value="">全部</option><option value="客户服务订单"${query.source === '客户服务订单' ? ' selected' : ''}>客户服务订单</option><option value="采购订单"${query.source === '采购订单' ? ' selected' : ''}>采购订单</option></select></label><label><span>客户</span><input name="customer" value="${escapeHtml(query.customer || '')}" placeholder="客户姓名"></label><label><span>订单编号</span><input name="orderNo" value="${escapeHtml(query.orderNo || '')}" placeholder="订单编号"></label><label><span>业务状态</span><select name="businessStatus"><option value="">全部</option>${businessStatusOptions}</select></label><label><span>资金状态</span><select name="fundStatus"><option value="">全部</option>${fundStatusOptions}</select></label><button class="btn primary small" type="submit">查询</button><button class="btn ghost small" type="button" data-action="reset-terminal-filter">重置</button></form>`
  const paymentActions = `<button class="btn primary small" type="button" data-order-finance-action="open-payment"${finance.receivableAmount > finance.paidAmount ? '' : ' disabled title="需先提交方案形成应收金额"'}>登记线下收款</button>`
  const refundActions = visitOrder.handoffStatus === '已转后台处理'
    ? `<button class="btn secondary small" type="button" data-order-finance-action="open-refund"${finance.paidAmount > finance.refundedAmount ? '' : ' disabled title="需先有已确认收款"'}>发起退款申请</button>` : ''
  const invoiceActions = finance.invoiceStatus === '待申请'
    ? '<button class="btn secondary small" type="button" data-order-finance-action="invoice-start">申请开票</button>'
    : finance.invoiceStatus === '处理中'
      ? '<button class="btn primary small" type="button" data-order-finance-action="invoice-issue">登记已开具</button>'
      : finance.invoiceStatus === '已开具'
        ? '<button class="btn danger-outline small" type="button" data-order-finance-action="invoice-void">作废发票</button>' : ''
  const reconciliationActions = finance.reconciliationStatus === '待对账'
    ? '<button class="btn secondary small" type="button" data-order-finance-action="reconciliation-difference">登记对账差异</button>'
    : finance.reconciliationStatus === '存在差异'
      ? '<button class="btn primary small" type="button" data-order-finance-action="reconciliation-confirm">确认对账</button>' : ''
  const refundAction = record => record.readOnly
    ? '<span class="disabled-reason">示例数据仅查看</span>'
    : record.status === '草稿'
    ? `<button class="btn-link" type="button" data-order-finance-action="refund-submit" data-record="${escapeHtml(record.id)}">提交审批</button><button class="btn-link" type="button" data-order-finance-action="refund-cancel" data-record="${escapeHtml(record.id)}">取消</button>`
    : record.status === '待审批'
      ? `<button class="btn-link" type="button" data-order-finance-action="refund-approve" data-record="${escapeHtml(record.id)}">审批通过</button><button class="btn-link" type="button" data-order-finance-action="refund-reject" data-record="${escapeHtml(record.id)}">驳回</button><button class="btn-link" type="button" data-order-finance-action="refund-cancel" data-record="${escapeHtml(record.id)}">取消</button>`
      : record.status === '待退款'
        ? `<button class="btn-link" type="button" data-order-finance-action="refund-execute" data-record="${escapeHtml(record.id)}">登记线下退款</button>` : '-'
  const refundDemoRecords = [
    ['RF-DEMO-001', '草稿'], ['RF-DEMO-002', '待审批'], ['RF-DEMO-003', '待退款'],
    ['RF-DEMO-004', '已退款'], ['RF-DEMO-005', '已驳回'], ['RF-DEMO-006', '已取消']
  ].map(([id, status]) => ({ id, status, originalPaymentId:`PAY-${id.slice(-3)}`, amount:200, reason:'状态演示数据', refundAccount:'客户原付款账户', readOnly:true }))
  const refundRecords = [...(finance.refundRequests || []), ...refundDemoRecords]
  const refundRows = refundRecords.map(record => `<tr><td>${escapeHtml(record.id)}</td><td>${escapeHtml(record.originalPaymentId || '-')}</td><td>${amount(record.amount)}</td><td>${escapeHtml(record.reason || '-')}</td><td>${escapeHtml(record.refundAccount || '-')}</td><td>${statusBadge(record.status)}</td><td>${refundAction(record)}</td></tr>`).join('')
  if (panel === 'detail' && selectedOrderRecord && !selectedOrderRecord.isPrimary) {
    const record = selectedOrderRecord
    const snapshotStatus = record.fundStatus === '待生成订单' ? '尚未生成' : 'V1 · 已锁定'
    return shell(`订单详情 · ${record.orderNo}`, '这是状态覆盖的只读演示数据；实际收款、退款、发票和对账请在当前业务订单中处理。', `<dl class="terminal-detail-grid"><div><dt>订单来源</dt><dd>${escapeHtml(record.sourceLabel)}</dd></div><div><dt>来源编号</dt><dd>${escapeHtml(record.sourceNo)}</dd></div><div><dt>订单编号</dt><dd>${escapeHtml(record.orderNo)}</dd></div><div><dt>客户</dt><dd>${escapeHtml(record.customer)}</dd></div><div><dt>业务状态</dt><dd>${statusBadge(record.businessStatusLabel)}</dd></div><div><dt>资金状态</dt><dd>${statusBadge(record.fundStatus)}</dd></div><div><dt>执行状态</dt><dd>${escapeHtml(record.executionStatus)}</dd></div><div><dt>当前快照</dt><dd>${snapshotStatus}</dd></div></dl><section class="terminal-subsection"><h3>健康/医疗方案</h3><p>${escapeHtml(record.orderSummary)}。</p><h3>资金摘要</h3><div class="metric-grid terminal-metric-grid"><article><span>应收</span><b>${amount(record.receivableAmount)}</b></article><article><span>已收</span><b>${amount(record.paidAmount)}</b></article><article><span>退款中</span><b>${amount(record.refundingAmount)}</b></article><article><span>已退款</span><b>${amount(record.refundedAmount)}</b></article><article><span>发票状态</span><b>${escapeHtml(record.invoiceStatus)}</b></article><article><span>对账状态</span><b>${escapeHtml(record.reconciliationStatus)}</b></article></div></section><section class="terminal-operation-record"><header><h3>状态时间线</h3></header><div><span>2026-09-04 10:00</span><b>状态演示</b><small>用于核对订单状态文案与页面呈现，不可执行资金操作。</small></div></section>`, record.fundStatus)
  }
  if (panel === 'detail' && selectedOrderRecord?.isPrimary) {
    const currentSnapshot = finance.snapshots?.at(-1)
    const snapshotRows = (finance.snapshots || []).map(snapshot => `<tr><td>V${snapshot.version}</td><td>${escapeHtml(snapshot.reason)}</td><td>${amount(snapshot.receivableAmount)}</td><td>${snapshot.locked ? '已锁定' : '可修改'}</td><td>${escapeHtml(snapshot.createdAt)}</td></tr>`).join('') || '<tr><td colspan="5" class="table-empty">尚未形成方案快照</td></tr>'
    const timelineRows = (finance.timeline || []).map(item => `<div><span>${escapeHtml(item.time)}</span><b>${escapeHtml(item.action)}</b><small>${escapeHtml(item.detail)}</small></div>`).join('') || '<div><span>-</span><b>暂无操作记录</b><small>订单、收款、退款、发票和对账动作会按时间留痕。</small></div>'
    return shell(`订单详情 · ${orderNo}`, '详情由订单列表携带真实订单编号进入；客户服务订单的业务处理仍回到服务端。', `<dl class="terminal-detail-grid"><div><dt>订单来源</dt><dd>${escapeHtml(orderRecord.sourceLabel)}</dd></div><div><dt>来源编号</dt><dd>${escapeHtml(orderRecord.sourceNo)}</dd></div><div><dt>订单编号</dt><dd>${escapeHtml(orderNo)}</dd></div><div><dt>客户</dt><dd>${escapeHtml(orderRecord.customer)}</dd></div><div><dt>业务状态</dt><dd>${statusBadge(businessStatusLabel)}</dd></div><div><dt>资金状态</dt><dd>${statusBadge(fundStatus)}</dd></div><div><dt>执行状态</dt><dd>${escapeHtml(orderRecord.executionStatus)}</dd></div><div><dt>当前快照</dt><dd>${currentSnapshot ? `V${currentSnapshot.version} · ${currentSnapshot.locked ? '已锁定' : '可修改'}` : '尚未生成'}</dd></div></dl><section class="terminal-subsection"><h3>健康/医疗方案</h3><p>${escapeHtml(orderSummary)}；健康方案 ${amount(visitOrder.health?.amount)}，医疗方案 ${amount(visitOrder.medical?.amount)}。</p><h3>实施计划</h3><p>${escapeHtml(visitOrder.implementationPlans?.health?.title || '健康实施计划')} · ${escapeHtml(visitOrder.implementationPlans?.health?.status || '未解锁')}；${escapeHtml(visitOrder.implementationPlans?.medical?.title || '医疗实施计划')} · ${escapeHtml(visitOrder.implementationPlans?.medical?.status || '未解锁')}。</p></section><section class="terminal-subsection"><h3>历史快照</h3><div class="terminal-table terminal-axure-table"><table><thead><tr><th>版本</th><th>生成原因</th><th>应收金额</th><th>状态</th><th>生成时间</th></tr></thead><tbody>${snapshotRows}</tbody></table></div></section><section class="terminal-subsection"><h3>资金摘要</h3><div class="metric-grid terminal-metric-grid"><article><span>应收</span><b>${amount(finance.receivableAmount)}</b></article><article><span>已收</span><b>${amount(finance.paidAmount)}</b></article><article><span>退款中</span><b>${amount(finance.refundingAmount)}</b></article><article><span>已退款</span><b>${amount(finance.refundedAmount)}</b></article><article><span>发票状态</span><b>${escapeHtml(finance.invoiceStatus || '待申请')}</b></article><article><span>对账状态</span><b>${escapeHtml(finance.reconciliationStatus || '待对账')}</b></article></div><div class="terminal-action-row">${paymentActions}${refundActions}${invoiceActions}${reconciliationActions}</div></section><section class="terminal-subsection"><h3>收款、退款、发票、对账摘要</h3><p>收款 ${finance.paymentRecords?.length || 0} 笔 · 退款申请 ${finance.refundRequests?.length || 0} 笔 · 发票 ${finance.invoiceRecords?.length || 0} 张 · 对账 ${finance.reconciliationRecords?.length || 0} 笔。</p></section><section class="terminal-operation-record"><header><h3>状态时间线</h3></header>${timelineRows}</section>`)
  }
  // 兼容旧链接：收款登记始终从订单列表或订单详情的“资金处理”动作进入，不单独成页。
  if (panel === 'payment') panel = 'list'
  if (panel === 'refund') return shell('退款申请', '退款是独立业务单据：草稿 → 待审批 → 待退款 → 已退款；驳回和取消均留痕，金额不能超过可退余额。提交审批、审批通过、登记线下退款和取消都在当前记录状态下显示。', `<div class="terminal-action-row">${refundActions}</div><div class="order-status-flow"><span>草稿</span><i>→</i><span>待审批</span><i>→</i><span>待退款</span><i>→</i><span>已退款</span><small>分支：已驳回 / 已取消 · 当前角色只能执行合法状态按钮</small></div><div class="terminal-table terminal-axure-table"><table><thead><tr><th>退款编号</th><th>原收款记录</th><th>退款金额</th><th>退款原因</th><th>退款账户</th><th>状态</th><th>当前操作</th></tr></thead><tbody>${refundRows}</tbody></table></div>`)
  if (panel === 'invoice') {
    const invoiceRecords = [...(finance.invoiceRecords || []), ...orderCenterDemoInvoices]
    const reconciliationRecords = [...(finance.reconciliationRecords || []), ...orderCenterDemoReconciliations]
    const invoiceRows = invoiceRecords.map(record => `<tr><td>${escapeHtml(record.id)}</td><td>${escapeHtml(record.invoiceNo || '-')}</td><td>V${escapeHtml(record.snapshotVersion || '-')}</td><td>${statusBadge(record.status)}</td></tr>`).join('')
    const reconciliationRows = reconciliationRecords.map(record => `<tr><td>${escapeHtml(record.id)}</td><td>V${escapeHtml(record.snapshotVersion || '-')}</td><td>${escapeHtml(record.differenceNote || '-')}</td><td>${statusBadge(record.status)}</td></tr>`).join('')
    return shell('发票与对账', '发票按待申请、处理中、已开具、已作废流转；对账按待对账、存在差异、已确认/已对账流转。', `<section class="terminal-subsection"><header><h3>发票</h3><div class="terminal-action-row">${invoiceActions}</div></header><div class="terminal-table terminal-axure-table"><table><thead><tr><th>发票记录</th><th>发票号</th><th>关联快照</th><th>状态</th></tr></thead><tbody>${invoiceRows}</tbody></table></div></section><section class="terminal-subsection"><header><h3>对账</h3><div class="terminal-action-row">${reconciliationActions}</div></header><div class="terminal-table terminal-axure-table"><table><thead><tr><th>对账记录</th><th>关联快照</th><th>差异说明</th><th>状态</th></tr></thead><tbody>${reconciliationRows}</tbody></table></div></section>`)
  }
  const rows = orderRecords.filter(matches).map(record => {
    const action = record.isPrimary ? paymentActions : '<span class="disabled-reason">只读演示</span>'
    return `<tr><td>${escapeHtml(record.sourceLabel)}</td><td>${escapeHtml(record.customer)}</td><td>${escapeHtml(record.orderNo)}</td><td>${escapeHtml(record.sourceNo)}</td><td>${statusBadge(record.businessStatusLabel)}</td><td>${statusBadge(record.fundStatus)}</td><td>${escapeHtml(record.executionStatus)}</td><td><a class="btn-link" href="${terminalHref('admin', 'orders')}&panel=detail&record=${encodeURIComponent(record.id)}">查看订单详情</a> ${action}</td></tr>`
  }).join('') || '<tr><td colspan="8" class="table-empty">没有符合条件的订单</td></tr>'
  return shell('订单列表', '统一检索订单索引；客户服务订单在此查看资金摘要，采购订单预留来源字段并跳回采购模块处理。', `${orderFilter}<div class="terminal-table terminal-axure-table"><table><thead><tr><th>订单来源</th><th>客户</th><th>订单编号</th><th>来源编号</th><th>业务状态</th><th>资金状态</th><th>执行状态</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table></div>`)
}

export function renderAdminContent(state, section, query = {}) {
  const dashboard = state.dashboard || {}
  if (section === 'approval') return renderApprovalContent(state, query.panel || 'approval-dashboard', query)
  if (section === 'orders' && query.panel) return terminalOrderPanel(state, query.panel, query)
  if (section === 'integration' && query.panel === 'checkup-sync') return renderCheckupSyncPanel(state)
  if (section === 'integration' && query.panel) return renderIntegrationPanel(query.panel, state)
  if (section === 'medical-rules' && query.panel) return renderMedicalRulesPanel(query.panel)
  if (section === 'intelligence-config' && query.panel === 'medical-health-analysis') return renderIntelligenceConfigPanel('intelligence-analysis-rule')
  if (section === 'intelligence-config' && query.panel) return renderIntelligenceConfigPanel(query.panel)
  if (query.panel) return terminalResourcePanel(state, 'admin', section, query.panel, query)
  if (section === 'integration') return renderIntegrationOverview(state)
  if (section === 'intelligence-config') return renderIntelligenceConfigOverview()
    if (section === 'procurement') return `${scopeBanner('phase2', '采购申请、询价比价和采购订单在后台管理连续处理；供应商与物料在业务基础资料维护。')}<section class="terminal-card"><header><div><span class="eyebrow">采购主流程</span><h2>采购申请 → 询价比价 → 采购订单</h2><p>申请、供应商、预算和订单在后台管理统一留痕。</p></div>${workbenchLink('admin', '打开采购申请', '#/terminal?terminal=admin&section=procurement&panel=purchase-request')}</header><div class="terminal-step-row"><span class="done">1 · 采购申请</span><span class="current">2 · 询价比价</span><span>3 · 采购订单</span></div><div class="terminal-table"><div><b>采购申请</b><b>供应商</b><b>预计金额</b><b>状态</b><b>操作</b></div><div><span>体检耗材采购</span><span>安澜医疗用品有限公司</span><span>待核对</span><span>${statusBadge('草稿')}</span><span>${tableLink('进入采购申请', '#/terminal?terminal=admin&section=procurement&panel=purchase-request')}</span></div></div></section>`
  if (section === 'inventory') return `${scopeBanner('phase2', '采购入库按待收货、待验收、待上架、已入库阶段推进；库存余额、库存流水和库存作业在本模块内追溯。管理端仅回写护士出库结果。')}<section class="metric-grid terminal-metric-grid"><article><span>可用库存</span><b>${state.terminalDemo?.inventory?.availableQty ?? dashboard.inventoryQuantity ?? 0}</b><small>动态心电监测耗材包</small></article><article><span>待入库单</span><b>${(state.resources?.['inventory-inbound'] || []).filter(item => /待收货|待验收|待上架/.test(item.status)).length || 3}</b><small>采购入库阶段处理</small></article><article><span>库存流水</span><b>${(state.resources?.['inventory-flow'] || []).length || 2}</b><small>${escapeHtml(state.terminalDemo?.inventory?.lastFlow || '期初库存')}</small></article></section><section class="terminal-card"><header><div><span class="eyebrow">库存管理</span><h2>采购入库 → 库存余额 → 库存作业</h2><p>批次、效期、仓库、库位和库存变化记录在同一套后台台账中。</p></div>${workbenchLink('admin', '打开采购入库', '#/terminal?terminal=admin&section=inventory&panel=inventory-inbound')}</header><div class="terminal-table"><div><b>业务页面</b><b>核心内容</b><b>当前状态</b><b>操作</b></div><div><span>采购入库</span><span>收货、验收、批次效期、上架</span><span>${statusBadge('待验收')}</span><span>${tableLink('进入采购入库', '#/terminal?terminal=admin&section=inventory&panel=inventory-inbound')}</span></div><div><span>库存余额</span><span>批次、效期、仓库、库位、可用数量</span><span>${statusBadge('正常')}</span><span>${tableLink('进入库存余额', '#/terminal?terminal=admin&section=inventory&panel=inventory-ledger')}</span></div><div><span>库存作业</span><span>调拨、盘点、报废页签</span><span>${statusBadge('待处理')}</span><span>${tableLink('进入库存作业', '#/terminal?terminal=admin&section=inventory&panel=inventory-operations')}</span></div></div></section>`
  if (section === 'medical-rules') return renderMedicalRulesOverview()
  if (section === 'orders') return terminalOrderPanel(state, query.panel || 'list', query)
  if (section === 'finance') return `${scopeBanner('phase2', '收款、退款、发票、对账、成本和经营分析继续在后台管理处理。')}<section class="terminal-card"><header><div><span class="eyebrow">资金与经营分析</span><h2>收付款与经营摘要</h2><p>订单资金状态在“订单中心”查看，财务凭证和经营分析在本页处理。</p></div>${workbenchLink('admin', '打开订单中心', '#/terminal?terminal=admin&section=orders')}</header><div class="metric-grid terminal-metric-grid"><article><span>本月已收</span><b>¥24,800</b><small>收款流水已对账</small></article><article><span>待开票</span><b>2</b><small>等待开票处理</small></article><article><span>退款审批</span><b>1</b><small>高影响动作待处理</small></article></div></section>`
  const approval = firstRecord(state, 'approval-task', record => /待|退回/.test(record.status)) || firstRecord(state, 'approval-task')
  const lowStock = firstRecord(state, 'inventory-ledger', record => /不足|预警|冻结/.test(record.status)) || firstRecord(state, 'inventory-ledger')
  const report = firstRecord(state, 'medical-report', record => /待发布|待确认/.test(record.status)) || firstRecord(state, 'medical-report')
  const approvalBase = '#/terminal?terminal=admin&section=overview&panel=approval-task'
  const inventoryBase = '#/terminal?terminal=admin&section=inventory&panel=inventory-ledger'
  const reportBase = '#/terminal?terminal=admin&section=medical-rules&panel=medical-reference-rule'
  const metrics = `<section class="metric-grid terminal-metric-grid terminal-overview-metrics">${metricLink({ label:'待审批任务', value:(state.resources?.['approval-task'] || []).filter(item => /待|退回/.test(item.status)).length, note:'采购、退款和行政审批', href:approvalBase })}${metricLink({ label:'库存预警', value:(state.resources?.['inventory-ledger'] || []).filter(item => /不足|预警|冻结/.test(item.status)).length, note:'批次、效期和可用量', href:inventoryBase })}${metricLink({ label:'待处理医学报告', value:(state.resources?.['medical-report'] || []).filter(item => /待确认|待发布/.test(item.status)).length, note:'确认后才能发布', href:reportBase })}</section>`
  const rows = [
    [approval?.name || '暂无审批任务', '审批任务', approval?.owner || '-', approval?.status || '无待办', tableLink('进入审批任务', recordHref(approvalBase, approval))],
    [lowStock?.name || '暂无库存预警', '库存台账', lowStock?.warehouse || '-', lowStock?.status || '正常', tableLink('查看库存', recordHref(inventoryBase, lowStock))],
    [report?.name || '暂无待处理报告', '医学报告', report?.doctor || '-', report?.status || '无待办', tableLink('处理报告', recordHref(reportBase, report))],
  ].map(workRow)
  return `${scopeBanner('prototype', '首页只聚合今天需要处理的业务事项，点击指标或待办直接进入对应台账。')}${metrics}<div data-terminal-resource="approval-task">${workList('后台管理待办', '审批、库存、医学报告和天赋发布按业务对象列出，不再使用说明卡代替操作。', ['待办事项','业务来源','负责人/位置','状态','操作'], rows)}</div>`
}
