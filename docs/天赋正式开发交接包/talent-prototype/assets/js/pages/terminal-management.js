import { escapeHtml, statusBadge } from './terminal-shared.js?v=talent-1.0.8'

const outboundStatuses = ['待护士确认', '已确认出库', '已撤回']

function managementOutboundList(state, query = {}) {
  const use = state.terminalDemo?.medicalUse || {}
  const generated = outboundStatuses.includes(use.taskStatus)
  const status = generated ? use.taskStatus : '未生成'
  const keyword = String(query.keyword || '').trim().toLowerCase()
  const selectedStatus = query.status || '全部'
  const matchesKeyword = !keyword || [use.id, use.customer, use.planName, use.material]
    .some(value => String(value || '').toLowerCase().includes(keyword))
  const matchesStatus = selectedStatus === '全部' || selectedStatus === status
  const actionButtons = status === '待护士确认'
    ? '<button class="btn-link" type="button" data-terminal-action="confirm-medical-outbound">确认出库</button>'
    : status === '已确认出库'
      ? '<button class="btn-link" type="button" data-terminal-action="withdraw-medical-use">撤回并回补</button>'
      : ''
  const row = generated && matchesKeyword && matchesStatus
    ? `<tr><td>${escapeHtml(use.id || 'MU-202609-001')}</td><td><a class="table-customer-link" href="#/terminal?terminal=management&section=nurse-outbound&panel=inventory-outbound-detail">${escapeHtml(use.customer || '林女士')}</a></td><td>医疗方案</td><td>${escapeHtml(use.material || '动态心电监测耗材包')}（1 套）× ${escapeHtml(use.requestedQty || 0)}</td><td>陈医生</td><td>${statusBadge(status)}</td><td>2026-09-03 09:20</td><td><a class="btn-link" href="#/terminal?terminal=management&section=nurse-outbound&panel=inventory-outbound-detail">查看</a>${actionButtons}</td></tr>`
    : generated
      ? '<tr><td colspan="8"><div class="empty-state"><b>暂无符合条件的出库申请</b><p>请调整查询条件后重试。</p></div></td></tr>'
      : '<tr><td colspan="8"><div class="terminal-prerequisite"><b>尚未生成出库申请</b><p>医疗方案提交后，出库申请会在这里显示，护士可查看并确认出库。</p><a class="btn-link" href="#/terminal?terminal=service&section=visit-order&panel=visit-order-medical">进入医疗方案提交 →</a></div></td></tr>'
  const statusOptions = ['全部', ...outboundStatuses]
    .map(option => `<option${option === selectedStatus ? ' selected' : ''}>${option}</option>`).join('')
  return `<section class="terminal-card terminal-axure-panel management-outbound-page" data-terminal-resource="inventory-outbound-list"><header><div><span class="eyebrow">库存操作</span><h2>出库确认</h2></div></header><form class="terminal-filter" data-terminal-filter><label><span>出库状态</span><select name="status">${statusOptions}</select></label><label><span>申请单号/客户/产品</span><input name="keyword" value="${escapeHtml(query.keyword || '')}" placeholder="请输入关键词"></label><button class="btn primary small" type="submit">查询</button><button class="btn ghost small" type="button" data-action="reset-terminal-filter">重置</button></form><div class="terminal-table terminal-axure-table"><table><thead><tr><th>申请单号</th><th>客户</th><th>方案类型</th><th>产品/药品</th><th>申请人</th><th>状态</th><th>申请时间</th><th>操作</th></tr></thead><tbody>${row}</tbody></table></div><footer class="terminal-pagination"><span>共 ${generated && matchesKeyword && matchesStatus ? 1 : 0} 条</span><div><button class="btn ghost small" type="button">上一页</button><b>1</b><button class="btn ghost small" type="button">下一页</button></div></footer></section>`
}

function managementOutboundDetail(state) {
  const use = state.terminalDemo?.medicalUse || {}
  const generated = outboundStatuses.includes(use.taskStatus)
  if (!generated) {
    return `<section class="terminal-card management-outbound-detail" data-terminal-resource="inventory-outbound-detail"><header class="outbound-detail-head"><a class="btn ghost small" href="#/terminal?terminal=management&section=nurse-outbound&panel=inventory-outbound-list">返回</a><div><span class="eyebrow">OUTBOUND APPLICATION</span><h2>出库申请（待生成）</h2></div><span class="status-badge neutral">未生成</span></header><div class="outbound-detail-grid"><section class="terminal-card outbound-info-card"><h3>申请信息</h3><dl><div><dt>申请单号</dt><dd>待生成</dd></div><div><dt>客户</dt><dd>待医疗方案提交</dd></div><div><dt>方案类型</dt><dd>医疗方案</dd></div><div><dt>当前状态</dt><dd>未生成</dd></div></dl></section><section class="terminal-card outbound-medicine-card"><h3>药品明细</h3><div class="empty-state"><b>暂无出库明细</b><p>提交医疗方案后，产品、规格、申请数量和库存信息会显示在此。</p></div></section></div><div class="terminal-prerequisite"><b>请先提交医疗方案</b><p>提交后会生成出库申请，护士可在本页确认出库。</p><a class="btn-link" href="#/terminal?terminal=service&section=visit-order&panel=visit-order-medical">进入医疗方案提交 →</a></div></section>`
  }
  const status = use.taskStatus
  const actions = status === '待护士确认'
    ? '<button class="btn primary" type="button" data-terminal-action="confirm-medical-outbound">确认出库并扣减库存</button>'
    : status === '已确认出库'
      ? '<button class="btn secondary" type="button" data-terminal-action="withdraw-medical-use">撤回并回补库存</button>'
      : ''
  return `<section class="management-outbound-detail" data-terminal-resource="inventory-outbound-detail"><header class="outbound-detail-head"><a class="btn ghost small" href="#/terminal?terminal=management&section=nurse-outbound&panel=inventory-outbound-list">返回</a><div><span class="eyebrow">OUTBOUND APPLICATION</span><h2>出库申请 #${escapeHtml(use.id || 'MU-202609-001')}</h2></div>${statusBadge(status)}</header><div class="outbound-detail-grid"><section class="terminal-card outbound-info-card"><h3>申请信息</h3><dl><div><dt>申请单号</dt><dd>${escapeHtml(use.id || 'MU-202609-001')}</dd></div><div><dt>客户</dt><dd>${escapeHtml(use.customer || '林女士')}</dd></div><div><dt>方案类型</dt><dd>医疗方案</dd></div><div><dt>申请人</dt><dd>陈医生</dd></div><div><dt>申请时间</dt><dd>2026-09-03 09:20</dd></div><div><dt>处理说明</dt><dd>${escapeHtml(use.lastMessage || '等待护士确认')}</dd></div></dl></section><section class="terminal-card outbound-medicine-card"><h3>药品明细</h3><article><div><b>${escapeHtml(use.material || '动态心电监测耗材包')}</b><span>规格：1 套 · 单位：套</span></div><div><span>申请数量</span><strong>${escapeHtml(use.requestedQty || 0)} 套</strong><small>确认数量：${escapeHtml(use.actualQty || 0)} 套</small></div></article></section></div><div class="outbound-detail-actions">${actions}</div></section>`
}

function managementOverviewContent() {
  return '<section class="management-home-baseline"><header class="management-welcome"><span>2026年09月03日 星期四</span><b>09:30</b><span>上午好，工作顺利</span></header><div class="management-home-card-grid"><a class="management-home-card" href="#/terminal?terminal=management&section=nurse-outbound&panel=inventory-outbound-list"><span>库</span><div><h2>库存操作</h2><p>护士查看并确认医疗方案出库申请</p></div><b>进入 →</b></a></div></section>'
}

export function renderManagementContent(state, section, query = {}) {
  if (section === 'nurse-outbound' && (!query.panel || query.panel === 'inventory-outbound-list')) return managementOutboundList(state, query)
  if (section === 'nurse-outbound' && query.panel === 'inventory-outbound-detail') return managementOutboundDetail(state)
  return managementOverviewContent()
}
