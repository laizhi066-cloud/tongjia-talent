import { escapeHtml, firstRecord, helpButton, metricLink, recordHref, scopeBanner, statusBadge, tableLink, terminalHref, workList, workRow } from './terminal-shared.js?v=talent-1.0.8'
import { consultationDetailContentV2, consultationListContentV2 } from './consultation-flow.js?v=talent-1.0.8'
import { renderHealthBrainDetail, renderHealthBrainList } from './health-intelligence.js?v=talent-1.0.8'
import { renderVisitOrder } from './visit-order.js?v=talent-1.0.8'

function consultationDetailContent(state, query = {}) {
  return consultationDetailContentV2(state, query)
}

function consultationListContent(state, query = {}) {
  return consultationListContentV2(state, query)
}

function serviceOverviewContent(state) {
  const entries = [
    { icon:'问', title:'问诊', scope:'一期入口 + 二期衔接', summary:'记录当前客户问诊事实，并在同一详情中进入智脑、会诊和客单。', href:terminalHref('service', 'inquiry') },
    { icon:'智', title:'健康智脑', scope:'二期新增', summary:'基于当前问诊和报告生成建议草稿，采纳后仍由医生修改确认。', href:terminalHref('service', 'intelligence') },
    { icon:'会', title:'会诊', scope:'二期新增', summary:'首页查看我发起或我参与的会诊；新增预约从当前客户问诊详情进入。', href:terminalHref('service', 'consultation') },
    { icon:'单', title:'客单', scope:'二期新增', summary:'先选择初诊/复诊客单，再进入一期客单分别提交方案并解锁对应实施计划。', href:terminalHref('service', 'visit-order') }
  ]
  return `<section class="service-phase2-entry-grid">${entries.map(item => `<a class="service-phase2-entry" href="${item.href}"><span class="service-phase2-icon">${item.icon}</span><div><small>${item.scope}</small><h2>${item.title}</h2><p>${item.summary}</p></div><i>进入 →</i></a>`).join('')}</section>`
}

function orderLabelForService(order) {
  const submitted = new Set(order.submittedPlanTypes || [])
  if (submitted.has('health') && submitted.has('medical')) return '已开单·健康+医疗方案'
  if (submitted.has('health')) return '已开单·健康方案'
  if (submitted.has('medical')) return '已开单·医疗方案'
  return '待开单'
}

function serviceVisitOrderListContent(state, query = {}) {
  const order = state.visitOrder || {}
  const keyword = String(query.keyword || '').trim().toLowerCase()
  const rows = [
    { id: order.orderId || order.id || 'VO-202609-001', customer: order.customer || '林女士', type: order.visitType === 'revisit' ? '复诊' : '初诊', status: orderLabelForService(order), updatedAt: '2026-09-03 09:20' },
    { id: 'VO-202609-002', customer: '王先生', type: '复诊', status: '已开单·健康方案', updatedAt: '2026-09-02 16:10' }
  ].filter(row => !keyword || Object.values(row).some(value => String(value).toLowerCase().includes(keyword)))
  const body = rows.length
    ? rows.map(row => `<tr><td>${escapeHtml(row.id)}</td><td>${escapeHtml(row.customer)}</td><td>${escapeHtml(row.type)}</td><td>${statusBadge(row.status)}</td><td>${escapeHtml(row.updatedAt)}</td><td><a class="btn-link" href="${terminalHref('service', 'visit-order')}&panel=visit-order-health&record=${encodeURIComponent(row.id)}&mode=detail&from=visit-order">查看客单 →</a></td></tr>`).join('')
    : '<tr><td colspan="6"><div class="empty-state"><b>暂无客单记录</b><p>从问诊详情进入初诊/复诊客单后，提交方案会形成客单。</p></div></td></tr>'
  return `${scopeBanner('phase2', '这里查看初诊和复诊客单；进入详情后复用一期客单页面继续提交方案和实施计划。')}<section class="terminal-card visit-order-list-card"><header><div><span class="eyebrow">服务端 · 客单（二期新增）</span><h2>初诊/复诊客单列表</h2><p>第一个方案提交时创建本次客单，第二个方案提交时复用同一张客单。</p></div></header><form class="terminal-filter" data-terminal-filter><label><span>客户/客单编号 ${helpButton('field:filter:keyword')}</span><input name="keyword" value="${escapeHtml(query.keyword || '')}" placeholder="输入客户或客单编号"></label><button class="btn primary small" type="submit">查询</button><button class="btn ghost small" type="button" data-action="reset-terminal-filter">重置</button></form><div class="terminal-table visit-order-list-table"><table><thead><tr><th>客单编号</th><th>客户</th><th>类型</th><th>方案状态</th><th>更新时间</th><th>操作</th></tr></thead><tbody>${body}</tbody></table></div></section>`
}

const inquiryHref = panel => `${terminalHref('service', 'inquiry')}${panel ? `&panel=${panel}` : ''}`

function inquiryCustomerHeader(state, title = '客户问诊') {
  const inquiry = state.terminalDemo?.inquiry || {}
  return `<header class="inquiry-page-head"><h2>${escapeHtml(title)}</h2><div class="inquiry-customer-meta"><span>客户ID：<b>KH-202609-001</b></span><span>姓名：<b>${escapeHtml(inquiry.customer || '林女士')}</b></span><span>性别：<b>女</b></span></div></header>`
}

function inquiryModuleCard({ title, actionText, href = '', action = '', tone = 'primary', extra = '' }) {
  const control = href
    ? `<a class="btn ${tone} small" href="${href}"${action ? ` data-terminal-action="${action}"` : ''}>${actionText}</a>`
    : `<button class="btn ${tone} small" type="button"${action ? ` data-terminal-action="${action}"` : ''}>${actionText}</button>`
  return `<article class="inquiry-module-card"><h3>${title}</h3><div>${control}${extra}</div></article>`
}

function serviceInquiryContent(state, query = {}) {
  const inquiry = state.terminalDemo?.inquiry || {}
  const mainModules = [
    { title:'健康问卷询问', actionText:'进入问卷', href:inquiryHref('health-survey'), tone:'primary' },
    { title:'自身状况问诊', actionText:'进入问诊', href:inquiryHref('self-assessment'), tone:'secondary' },
    { title:'家族遗传问诊', actionText:'进入问诊', href:inquiryHref('family-history'), tone:'secondary' }
  ]
  const extraModules = [
    { title:'人工特情问诊', actionText:'发起会诊', href:`${terminalHref('service', 'consultation')}&customerId=${encodeURIComponent(inquiry.customerId || 'KH-202609-001')}&scope=customer`, action:'start-consultation', tone:'primary', extra:`${helpButton('action:start-consultation')}<a class="inquiry-card-link" href="${terminalHref('service', 'consultation')}&customerId=${encodeURIComponent(inquiry.customerId || 'KH-202609-001')}&scope=customer">查看当前客户会诊记录</a>` },
    { title:'智脑辅助问诊', actionText:'打开健康智脑辅助面板', href:`${terminalHref('service', 'intelligence')}&record=${encodeURIComponent(inquiry.id || 'INQ-202609-001')}&mode=detail`, tone:'secondary' },
    { title:'院外检测报告上传', actionText:'上传报告', href:inquiryHref('report-upload'), tone:'secondary' }
  ]
  const records = [
    { id:inquiry.id || 'INQ-202609-001', customer:inquiry.customer || '林女士', type:'初诊', status:inquiry.status || '编辑中', updatedAt:'2026-09-03 09:20' },
    { id:'INQ-202609-002', customer:'王先生', type:'复诊', status:'已保存', updatedAt:'2026-09-02 16:10' }
  ]
  const list = `<section class="inquiry-record-list terminal-card"><header><div><span class="eyebrow">一期问诊入口</span><h2>问诊记录</h2><p>先从客户问诊记录列表选择本次初诊或复诊，再进入一期问诊详情继续操作。详情包含健康问卷、自身状况、家族遗传、人工特情问诊、智脑辅助问诊、会诊和客单。</p></div></header><form class="terminal-filter" data-terminal-filter><label><span>客户/问诊编号</span><input name="keyword" value="${escapeHtml(query.keyword || '')}" placeholder="请输入客户或编号"></label><label><span>类型</span><select name="status"><option selected>全部</option><option>初诊</option><option>复诊</option></select></label><button class="btn primary small" type="submit">查询</button></form><div class="terminal-table"><table><thead><tr><th>问诊编号</th><th>客户</th><th>类型</th><th>状态</th><th>更新时间</th><th>操作</th></tr></thead><tbody>${records.map(record => `<tr><td>${escapeHtml(record.id)}</td><td>${escapeHtml(record.customer)}</td><td>${escapeHtml(record.type)}</td><td>${statusBadge(record.status)}</td><td>${escapeHtml(record.updatedAt)}</td><td><a class="btn-link" href="${inquiryHref()}&record=${encodeURIComponent(record.id)}&mode=detail">查看详情 →</a></td></tr>`).join('')}</tbody></table></div></section>`
  if (!query.record) return list
  return `<section class="terminal-card customer-inquiry-page" data-terminal-resource="customer-inquiry">${inquiryCustomerHeader(state, '客户问诊详情')}<div class="inquiry-detail-context"><a class="btn-link" href="${inquiryHref()}">← 返回问诊记录</a><b>已选择问诊记录，可继续编辑并发起后续业务。</b></div><div class="inquiry-block-title"><span>问诊流程</span></div><div class="inquiry-module-grid">${mainModules.map(inquiryModuleCard).join('')}</div><section class="inquiry-service-request"><label>本次服务诉求（问诊填写）</label><div><span>1</span><input value="改善睡眠质量，评估白天疲劳原因" aria-label="第一条服务诉求"><button class="inquiry-circle-button" type="button" aria-label="删除服务诉求">−</button></div><div><span>2</span><input value="制定心血管复查与运动安排" aria-label="第二条服务诉求"><button class="inquiry-circle-button" type="button" aria-label="添加服务诉求">＋</button></div></section><div class="inquiry-block-title second"><span>补充问诊</span></div><div class="inquiry-module-grid">${extraModules.map(inquiryModuleCard).join('')}</div><section class="inquiry-signature-grid"><article><span>责任医生</span><div><select aria-label="责任医生"><option>陈医生</option><option>周医生</option></select><b>陈医生（已签字）</b></div></article><article><span>健管师签字</span><div><b>王健管师（已签字）</b></div></article></section><footer class="inquiry-page-actions"><div><span>当前状态</span>${statusBadge(inquiry.status || '编辑中')}<small>${escapeHtml(inquiry.lastMessage || '')}</small></div><div><button class="btn primary" type="button" data-terminal-action="save-inquiry">保存问诊记录</button><a class="btn secondary" href="${terminalHref('service', 'visit-order')}&panel=visit-order-health&record=${encodeURIComponent(orderRecordId(state))}&mode=detail&from=inquiry">进入初诊客单</a>${helpButton('action:submit-order-creation')}</div></footer></section>`
}

const orderRecordId = state => state.visitOrder?.orderId || state.visitOrder?.id || 'VO-202609-001'

function inquiryFormShell(state, panel, title, body) {
  return `<section class="customer-inquiry-subpage" data-terminal-resource="${panel}">${inquiryCustomerHeader(state, title)}<div class="terminal-card inquiry-form-card"><header><div><a class="inquiry-back-link" href="${inquiryHref()}">← 返回客户问诊</a><h2>${title}</h2></div><span class="status-chip soft">本次初诊</span></header>${body}<footer class="inquiry-form-actions"><a class="btn ghost" href="${inquiryHref()}">取消</a><button class="btn primary" type="button" data-terminal-action="save-inquiry">保存</button></footer></div></section>`
}

function serviceInquirySubpage(state, panel) {
  if (panel === 'health-survey') {
    const body = `<div class="inquiry-form-sections"><section><h3>健康问卷</h3><div class="inquiry-field-grid"><label><span>睡眠情况</span><select><option>入睡困难</option><option>睡眠正常</option></select></label><label><span>平均睡眠时长</span><input value="6 小时"></label><label><span>饮食规律</span><select><option>基本规律</option><option>不规律</option></select></label><label><span>每周运动次数</span><input value="1 次"></label></div></section><section><h3>问卷记录</h3><textarea>近两周入睡较慢，白天容易疲劳；希望改善睡眠并逐步增加运动量。</textarea></section></div>`
    return inquiryFormShell(state, panel, '健康问卷询问', body)
  }
  if (panel === 'self-assessment') {
    const body = `<div class="inquiry-table-wrap"><table><thead><tr><th>自身状况问诊项目</th><th>当前表现</th><th>持续时间</th><th>补充说明</th></tr></thead><tbody><tr><td>睡眠</td><td><select><option>入睡困难</option></select></td><td><input value="2 周"></td><td><input value="白天疲劳"></td></tr><tr><td>运动耐力</td><td><select><option>轻度下降</option></select></td><td><input value="1 个月"></td><td><input value="活动后易累"></td></tr></tbody></table></div>`
    return inquiryFormShell(state, panel, '自身状况问诊', body)
  }
  if (panel === 'family-history') {
    const body = `<div class="inquiry-table-wrap"><table><thead><tr><th>亲属关系</th><th>疾病名称</th><th>确诊年龄</th><th>目前情况</th><th>备注</th></tr></thead><tbody><tr><td><select><option>父亲</option></select></td><td><input value="高血压"></td><td><input value="52 岁"></td><td><select><option>规律治疗</option></select></td><td><input value="控制稳定"></td></tr></tbody></table><button class="btn secondary small" type="button">新增一行</button></div>`
    return inquiryFormShell(state, panel, '家族遗传问诊', body)
  }
  const body = `<div class="inquiry-upload-page"><section class="inquiry-upload-box"><h3>院外检测报告上传</h3><p>上传客户本次问诊相关的院外检查、检验或影像报告。</p><input type="file" aria-label="选择院外检测报告"><button class="btn secondary" type="button">选择文件</button></section><div class="inquiry-table-wrap"><table><thead><tr><th>文件名称</th><th>报告类型</th><th>上传时间</th><th>状态</th><th>操作</th></tr></thead><tbody><tr><td>院外动态心电报告.pdf</td><td>心电检查</td><td>2026-09-03 09:10</td><td>${statusBadge('已上传')}</td><td><button class="btn-link" type="button">预览</button><button class="btn-link danger-link" type="button">删除</button></td></tr></tbody></table></div></div>`
  return inquiryFormShell(state, panel, '院外检测报告上传', body)
}

export function renderServiceContent(state, section, query = {}) {
  if (section === 'overview') return serviceOverviewContent(state)
  if (section === 'visit-order') {
    if (!query.panel) return serviceVisitOrderListContent(state, query)
    const tabs = {
      'visit-order-health':'health',
      'visit-order-medical':'medical',
      'visit-order-health-implementation':'health-implementation',
      'visit-order-medical-implementation':'medical-implementation'
    }
    return renderVisitOrder(state, { ...query, terminal:'service', section:'visit-order', panel:query.panel || 'visit-order-health', tab:tabs[query.panel] || 'health' })
  }
  if (section === 'intelligence') return query.record && query.mode === 'detail' ? renderHealthBrainDetail(state, query) : renderHealthBrainList(state, query)
  if (section === 'consultation') {
    if ((query.record && query.mode === 'detail') || (query.invitation && query.mode === 'invitation')) return consultationDetailContent(state, query)
    return consultationListContent(state, query)
  }
  if (section === 'inquiry' && query.panel) return serviceInquirySubpage(state, query.panel)
  if (section === 'inquiry') return serviceInquiryContent(state, query)
  const report = firstRecord(state, 'medical-report', record => /待确认|待发布/.test(record.status)) || firstRecord(state, 'medical-report')
  const visitOrder = state.visitOrder || {}
  const appointment = firstRecord(state, 'consultation-appointment', record => !/已归档|已完成/.test(record.status)) || firstRecord(state, 'consultation-appointment')
  const consultationDate = appointment?.time?.slice(0, 10)
  const consultationCount = (state.resources?.['consultation-appointment'] || []).filter(item => consultationDate ? item.time?.startsWith(consultationDate) : false).length
  const use = state.terminalDemo.medicalUse || {}
  const planPending = use.status && !['已出库', '部分出库', '缺货', '已撤回'].includes(use.status) ? 1 : 0
  const reportBase = '#/terminal?terminal=service&section=inquiry'
  const planBase = '#/terminal?terminal=service&section=visit-order&panel=visit-order-medical'
  const consultationBase = terminalHref('service', 'consultation')
  const metrics = `<section class="metric-grid terminal-metric-grid terminal-overview-metrics service-overview-metrics">${metricLink({ label:'待确认报告', value:(state.resources?.['medical-report'] || []).filter(item => /待确认/.test(item.status)).length, note:'查看分析结果并确认报告', href:recordHref(reportBase, report) })}${metricLink({ label:'方案待处理', value:planPending, note:'跟进医疗方案耗用状态', href:planBase })}${metricLink({ label:'近期会诊', value:consultationCount, note:consultationDate ? `${consultationDate}预约，含接受与冲突` : '暂无预约记录', href:recordHref(consultationBase, appointment) })}</section>`
  const planStatus = visitOrder.medical?.status === 'submitted' ? visitOrder.medical?.nurseTaskStatus || '已提交' : visitOrder.medical?.status === 'draft' ? '草稿' : '待处理'
  const rows = [
    [report?.name || '暂无待确认报告', '报告与智脑结果', report?.customer || '-', report?.status || '无待办', tableLink('处理报告', recordHref(reportBase, report))],
    [`${visitOrder.customer || use.customer || '当前客户'} · 初诊/复诊客单`, '医疗方案', visitOrder.customer || use.customer || '-', planStatus, tableLink('处理方案', planBase)],
    [appointment?.name || '暂无会诊安排', '会诊预约', appointment?.expert || '-', appointment?.status || '无安排', tableLink('进入会诊预约', recordHref(consultationBase, appointment))]
  ].map(workRow)
  return `${scopeBanner('prototype', '首页只聚合客户服务待办，点击指标或列表直接进入报告、初诊/复诊客单和会诊页面。')}${metrics}${workList('客户服务待办', '待确认报告、客单方案处理和会诊安排来自同一份业务数据，可直接进入对应页面处理。', ['待办事项','业务类型','客户/专家','状态','操作'], rows)}`
}
