import { resourceRegistry } from '../data.js?v=talent-1.0.8'
import { escapeHtml, fieldLabels, statusBadge } from '../components.js?v=talent-1.0.8'
import { getActionDefinition } from '../flows.js?v=talent-1.0.8'
import { scopeLabels, terminalById } from '../terminal-data.js?v=talent-1.0.8'
import { helpButton } from '../help.js?v=talent-1.0.8'
import { getWorkbenchConfig } from '../workbench-data.js?v=talent-1.0.8'

export const terminalHref = (terminal, section) => `#/terminal?terminal=${terminal}&section=${section}`
export const workbenchLink = (terminal, label, href) => `<a class="btn secondary small" data-terminal-link="${escapeHtml(terminal)}" href="${href}">${escapeHtml(label)} →</a>`
export const tableLink = (label, href) => `<a class="btn-link" href="${href}">${escapeHtml(label)} →</a>`
export const metricLink = ({ label, value, note, href }) => `<a class="terminal-metric-link" href="${href}"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b><small>${escapeHtml(note)}</small><i>进入处理 →</i></a>`
export const firstRecord = (state, resourceId, predicate = () => true) => (state.resources?.[resourceId] || []).find(predicate)
export const recordHref = (base, record) => `${base}${record?.id ? `&record=${encodeURIComponent(record.id)}&mode=detail` : ''}`

export function workList(title, summary, columns, rows) {
  return `<section class="terminal-work-list"><header><div><span class="eyebrow">当前待办</span><h2>${escapeHtml(title)}</h2><p>${escapeHtml(summary)}</p></div></header><div class="terminal-table terminal-work-table"><div>${columns.map(column => `<b>${escapeHtml(column)}</b>`).join('')}</div>${rows.join('')}</div></section>`
}

export const workRow = cells => `<div>${cells.map((cell, index) => `<span>${index === 3 ? statusBadge(cell) : index === 4 ? cell : escapeHtml(cell)}</span>`).join('')}</div>`

export const terminalFlowHelpKey = (terminalId, section) => {
  if (terminalId === 'admin' && section === 'procurement') return 'global-flow:supply-purchase'
  if (terminalId === 'admin' && section === 'orders') return 'global-flow:admin-orders'
  if (terminalId === 'service' && section === 'consultation') return 'global-flow:care-consultation'
  if (terminalId === 'service' && section === 'inquiry') return 'global-flow:medical-inquiry'
  if (terminalId === 'service' && section === 'intelligence') return 'global-flow:health-intelligence'
  if (terminalId === 'service' && section === 'visit-order') return 'global-flow:visit-order'
  return `global-flow:${terminalId}:${section}`
}

export function terminalSidebar(terminal, section, query = {}) {
  const shellLabel = `${terminal.name}菜单`
  const menuItems = terminal.menu.map(item => {
    const active = item.id === section
    const defaultPanel = item.links?.[0]?.href.match(/[?&]panel=([^&]+)/)?.[1]
    const title = active
      ? `<span class="terminal-menu-current active" aria-current="page"><span>${escapeHtml(item.label)}</span><small>${escapeHtml(scopeLabels[item.scope])}</small></span>`
      : `<a href="${item.links?.[0]?.href || terminalHref(terminal.id, item.id)}"><span>${escapeHtml(item.label)}</span><small>${escapeHtml(scopeLabels[item.scope])}</small></a>`
    const localHelp = helpButton(`section:menu:${item.id}`)
    const submenu = ['admin', 'management', 'talent-admin', 'talent-agent', 'talent-provider'].includes(terminal.id) && active && item.links?.length
      ? `<nav class="terminal-submenu" aria-label="${escapeHtml(item.label)}二级菜单">${item.links.map((link, linkIndex) => {
        const panelFor = candidate => candidate.panel || new URLSearchParams(String(candidate.href || '').split('?')[1] || '').get('panel') || ''
        const hasPanelMatch = query.panel && item.links.some(candidate => panelFor(candidate) === query.panel)
        const current = query.panel
          ? panelFor(link) === query.panel || (!hasPanelMatch && linkIndex === 0)
          : panelFor(link) === defaultPanel
        return current
          ? `<span class="active" aria-current="page">${escapeHtml(link.label)}</span>`
          : `<a href="${link.href}">${escapeHtml(link.label)}</a>`
      }).join('')}</nav>`
      : ''
    return `<div class="terminal-menu-group"><div class="terminal-menu-row">${title}${localHelp}</div>${submenu}</div>`
  }).join('')
  return `<aside class="terminal-sidebar" data-terminal="${escapeHtml(terminal.id)}" aria-label="${escapeHtml(shellLabel)}">
    <div class="terminal-side-brand"><span class="terminal-icon tone-${escapeHtml(terminal.tone)}">${escapeHtml(terminal.icon)}</span><div><small>天赋查询系统 · 使用角色</small><h2>${escapeHtml(terminal.name)}</h2><p>${escapeHtml(terminal.audience)}</p></div></div>
    <nav class="terminal-menu-tree" aria-label="${escapeHtml(terminal.name)}菜单">${menuItems}</nav>
  </aside>`
}

export const scopeBanner = () => ''

export function summaryHeader(terminal, sectionId, sectionTitle, sectionSummary) {
  return `<header class="terminal-page-head"><div><span class="eyebrow">${escapeHtml(terminal.name)} · 业务工作台</span><h1>${escapeHtml(sectionTitle)}</h1><p>${escapeHtml(sectionSummary)}</p></div><div class="terminal-head-tags">${helpButton(terminalFlowHelpKey(terminal.id, sectionId), '流程说明', 'global')}<span class="status-chip">${escapeHtml(terminal.shortName)}</span><span class="status-chip soft">脱敏业务数据 · 示例数据</span></div></header>`
}

const terminalPanelResources = {
  list: 'finance-order',
  detail: 'finance-order',
  payment: 'finance-order',
  refund: 'finance-refund',
  invoice: 'finance-invoice',
  reconciliation: 'finance-reconciliation',
  'inventory-outbound-list': 'inventory-requisition',
  'inventory-outbound-detail': 'inventory-requisition',
  'supply-warehouse-location': 'supply-warehouse-location',
  'purchase-quote-compare': 'purchase-quote-compare',
  'inventory-inbound': 'inventory-inbound',
  'inventory-operations': 'inventory-operations',
  'asset-lifecycle': 'asset-lifecycle',
  'purchase-comparison': 'finance-payable-match',
  'business-dictionary': 'medical-report-category',
  'inventory-batch-expiry': 'inventory-ledger',
  'inventory-flow': 'inventory-flow',
  'inventory-freeze-alert': 'inventory-ledger',
  'medical-rule-release': 'medical-reference-rule',
  'intelligence-specialty': 'medical-report-category',
  'intelligence-indicator-map': 'medical-external-item-map',
  'intelligence-analysis-rule': 'medical-item-relation',
  'intelligence-reference': 'medical-followup',
  'intelligence-template': 'medical-report-type',
  'intelligence-model-data': 'integration-project',
  'talent-conditions': 'talent-level-condition',
  'talent-content': 'talent-nurture-content',
  'talent-bindings': 'talent-content-binding',
  'talent-import': 'talent-import',
  'talent-generation': 'talent-generation',
  'talent-management': 'talent-report'
}

const panelDisplayOverrides = {
  'purchase-quote-compare': {
    title: '询价比价',
    filterLabel: '采购申请/供应商报价/物料',
    columns: ['purchaseRequest', 'supplier', 'material', 'quoteAmount', 'comparisonResult', 'status'],
    labels: { purchaseRequest: '采购申请', supplier: '供应商', material: '物料', quoteAmount: '报价金额', comparisonResult: '比价结果', status: '状态' },
    rows: [
      { id: 'QCP-202609-001', purchaseRequest: 'PR-202609-001 · 动态心电监测耗材采购', supplier: '安澜医疗用品有限公司', material: '动态心电监测耗材包', quoteAmount: '¥12,800', comparisonResult: '最低报价', status: '待确认' },
      { id: 'QCP-202609-002', purchaseRequest: 'PR-202609-002 · 真空采血管采购', supplier: '明康检验设备有限公司', material: '真空采血管', quoteAmount: '¥18,600', comparisonResult: '存在差异', status: '待复核' }
    ],
    statusOptions: ['待确认', '待复核', '已采纳']
  },
  'supply-warehouse-location': {
    title: '仓库与库位',
    filterLabel: '仓库/库位/所属组织',
    columns: ['warehouse', 'location', 'organization', 'owner', 'scope', 'status'],
    labels: { warehouse: '仓库', location: '库位', organization: '所属组织', owner: '负责人', scope: '容量/用途', status: '状态' },
    rows: [
      { id: 'WH-202609-001', warehouse: '杭州一号仓', location: 'A-01-08', organization: '健康管理中心', owner: '王主管', scope: '常温耗材 · 1200 箱', status: '已启用' },
      { id: 'WH-202609-002', warehouse: '滨江冷链仓', location: 'B-03-02', organization: '医学服务部', owner: '刘护士', scope: '冷链试剂 · 240 箱', status: '已启用' }
    ]
  },
  'inventory-inbound': {
    title: '采购入库',
    filterLabel: '入库单号/采购订单/供应商/物料',
    columns: ['inboundNo', 'purchaseOrder', 'supplier', 'stageStatus', 'actualReceivedQty', 'warehouse', 'location', 'batch', 'expiry', 'status'],
    labels: { inboundNo: '入库单号', purchaseOrder: '来源采购订单', supplier: '供应商', stageStatus: '阶段状态', actualReceivedQty: '实收数量', warehouse: '仓库', location: '库位', batch: '批次', expiry: '失效日期', status: '状态' },
    statusOptions: ['待收货', '待验收', '待上架', '已入库', '异常'],
    rows: [
      { id: 'IN-202609-001', inboundNo: 'IN-202609-001', purchaseOrder: 'PO-202609-001', supplier: '安澜医疗用品有限公司', stageStatus: '待收货', actualReceivedQty: '-', warehouse: '杭州一号仓', location: '待分配', batch: '待收货录入', expiry: '-', status: '待收货' },
      { id: 'IN-202609-002', inboundNo: 'IN-202609-002', purchaseOrder: 'PO-202609-002', supplier: '明康检验设备有限公司', stageStatus: '待验收', actualReceivedQty: '118', warehouse: '滨江冷链仓', location: '待验收', batch: 'BATCH-202608-A', expiry: '2028-08-01', status: '待验收' },
      { id: 'IN-202609-003', inboundNo: 'IN-202609-003', purchaseOrder: 'PO-202609-003', supplier: '嘉禾健康科技有限公司', stageStatus: '待上架', actualReceivedQty: '36', warehouse: '杭州一号仓', location: 'A-02-03', batch: 'BATCH-202607-C', expiry: '2026-10-10', status: '待上架' },
      { id: 'IN-202609-004', inboundNo: 'IN-202609-004', purchaseOrder: 'PO-202608-009', supplier: '华信医用耗材有限公司', stageStatus: '已入库', actualReceivedQty: '120', warehouse: '杭州一号仓', location: 'A-01-08', batch: 'BATCH-202608-A', expiry: '2028-08-01', status: '已入库' }
    ]
  },
  'inventory-operations': {
    title: '库存作业',
    filterLabel: '业务单号/物料/仓库',
    columns: ['operationType', 'businessNo', 'warehouse', 'material', 'status'],
    labels: { operationType: '作业类型', businessNo: '业务单号', warehouse: '仓库', material: '物料', status: '状态' },
    statusOptions: ['草稿', '待审批', '盘点中', '已完成', '已作废'],
    rows: [
      { id: 'TR-202609-001', operationType: '调拨', businessNo: 'TR-202609-001', warehouse: '杭州一号仓 → 宁波周转仓', material: '动态心电监测耗材包', status: '待审批' },
      { id: 'ST-202609-001', operationType: '盘点', businessNo: 'ST-202609-001', warehouse: '滨江冷链仓', material: '真空采血管', status: '盘点中' },
      { id: 'SC-202609-001', operationType: '报废', businessNo: 'SC-202609-001', warehouse: '杭州一号仓', material: '一次性采血针', status: '待审批' }
    ]
  },
  'asset-use': {
    title: '领用借还',
    filterLabel: '资产/业务单号/员工',
    columns: ['operationType', 'businessNo', 'assetCode', 'handler', 'location', 'status'],
    labels: { operationType:'业务类型', businessNo:'业务单号', assetCode:'资产', handler:'领用/归还人', location:'当前位置', status:'状态' }
  },
  'asset-maintenance': {
    title: '维修调拨',
    filterLabel: '资产/业务单号/维修单位',
    columns: ['operationType', 'businessNo', 'assetCode', 'handler', 'location', 'status'],
    labels: { operationType:'业务类型', businessNo:'业务单号', assetCode:'资产', handler:'维修单位/调入组织', location:'当前位置', status:'状态' }
  },
  'purchase-comparison': {
    title: '比价/需求汇总',
    filterLabel: '采购需求/供应商',
    columns: ['purchaseRequest', 'supplierQuote', 'quotedAmount', 'comparisonResult', 'status'],
    labels: { purchaseRequest: '采购需求', supplierQuote: '供应商报价', quotedAmount: '报价金额', comparisonResult: '比价结果', status: '状态' },
    rows: [
      { id: 'PC-202609-001', purchaseRequest: '动态心电监测耗材采购', supplierQuote: '安澜医疗用品有限公司 · 报价单 Q-001', quotedAmount: '¥12,800', comparisonResult: '最低报价', status: '待确认' },
      { id: 'PC-202609-002', purchaseRequest: '真空采血管采购', supplierQuote: '明康检验设备有限公司 · 报价单 Q-002', quotedAmount: '¥18,600', comparisonResult: '存在差异', status: '待复核' }
    ]
  },
  'inventory-batch-expiry': {
    title: '批次效期',
    filterLabel: '物料/批次号',
    columns: ['material', 'batch', 'productionDate', 'expiryDate', 'availableQty', 'status'],
    labels: { material: '物料', batch: '批次号', productionDate: '生产日期', expiryDate: '失效日期', availableQty: '可用数量', status: '状态' },
    rows: [
      { id: 'IB-202609-001', material: '动态心电监测耗材包', batch: 'BATCH-202608-A', productionDate: '2026-08-01', expiryDate: '2028-08-01', availableQty: '120', status: '正常' },
      { id: 'IB-202609-002', material: '一次性采血针', batch: 'BATCH-202607-C', productionDate: '2026-07-10', expiryDate: '2026-10-10', availableQty: '36', status: '临近效期' }
    ]
  },
  'inventory-requisition': {
    title: '领用与客户耗用',
    filterLabel: '单号/领用人/客户/项目',
    columns: ['businessType', 'documentNo', 'costObject', 'material', 'requestedQty', 'outboundQty', 'remainingQty', 'status'],
    labels: { businessType: '业务类型', documentNo: '业务单号', costObject: '成本对象', material: '物料', requestedQty: '申请数量', outboundQty: '实际出库', remainingQty: '未出数量', status: '状态' },
    rows: [
      { id: 'CON-202609-001', businessType: '领用申请', documentNo: 'REQ-202609-001', costObject: '体检中心 · 孙护士', material: '一次性采血针', requestedQty: '12 盒', outboundQty: '12 盒', remainingQty: '0', status: '已完成' },
      { id: 'CON-202609-002', businessType: '客户耗用', documentNo: 'MU-202609-001', costObject: '林女士 · 医疗方案', material: '动态心电监测耗材包', requestedQty: '2 套', outboundQty: '1 套', remainingQty: '1 套', status: '部分出库' },
      { id: 'CON-202609-003', businessType: '项目耗用', documentNo: 'PRJ-202609-006', costObject: '睡眠改善项目', material: '睡眠营养包', requestedQty: '6 盒', outboundQty: '0', remainingQty: '6 盒', status: '缺货待处理' },
      { id: 'CON-202609-004', businessType: '领用申请', documentNo: 'REQ-202609-004', costObject: '护理部 · 王护士', material: '医用外科口罩', requestedQty: '20 盒', outboundQty: '0', remainingQty: '0', status: '已取消' }
    ]
  },
  'asset-lifecycle': {
    title: '生命周期记录',
    filterLabel: '资产编号/业务单号',
    columns: ['assetCode', 'businessType', 'businessNo', 'previousCustodian', 'currentCustodian', 'location', 'occurredAt', 'status'],
    labels: { assetCode: '资产编号', businessType: '业务类型', businessNo: '业务单号', previousCustodian: '原保管人', currentCustodian: '新保管人', location: '当前位置', occurredAt: '发生时间', status: '状态' },
    rows: [
      { id: 'AL-202609-001', assetCode: 'AST-ECG-006', businessType: '领用', businessNo: 'AU-202609-001', previousCustodian: '杭州一号仓', currentCustodian: '陈医生', location: '心电检查室', occurredAt: '2026-09-01 09:20', status: '已完成' },
      { id: 'AL-202609-002', assetCode: 'AST-BP-012', businessType: '维修调拨', businessNo: 'AM-202609-003', previousCustodian: '王护士', currentCustodian: '设备维修商', location: '维修中心', occurredAt: '2026-09-02 14:35', status: '维修中' }
    ]
  },
  'inventory-flow': {
    title: '库存流水',
    filterLabel: '业务单号/物料',
    columns: ['flowType', 'businessNo', 'material', 'changeQty', 'warehouse', 'createdAt'],
    labels: { flowType: '流水类型', businessNo: '业务单号', material: '物料', changeQty: '变更数量', warehouse: '仓库', createdAt: '发生时间' },
    rows: [
      { id: 'IF-202609-001', flowType: '采购入库', businessNo: 'PO-202608-009', material: '动态心电监测耗材包', changeQty: '+120', warehouse: '杭州一号仓', createdAt: '2026-09-02 10:20' },
      { id: 'IF-202609-002', flowType: '客户耗用出库', businessNo: 'MU-202609-001', material: '动态心电监测耗材包', changeQty: '-2', warehouse: '杭州一号仓', createdAt: '2026-09-03 09:20' }
    ]
  },
  'inventory-freeze-alert': {
    title: '冻结与预警',
    filterLabel: '物料/仓库',
    columns: ['material', 'warehouse', 'alertLevel', 'freezeReason', 'availableQty', 'status'],
    labels: { material: '物料', warehouse: '仓库', alertLevel: '预警级别', freezeReason: '冻结原因', availableQty: '可用数量', status: '处理状态' },
    rows: [
      { id: 'IA-202609-001', material: '一次性采血针', warehouse: '杭州一号仓', alertLevel: '低库存', freezeReason: '低于安全库存', availableQty: '36', status: '待补货' },
      { id: 'IA-202609-002', material: '冷链试剂', warehouse: '滨江冷链仓', alertLevel: '冻结', freezeReason: '待质量复核', availableQty: '0', status: '已冻结' }
    ]
  },
  'medical-rule-release': {
    title: '版本发布与使用记录',
    filterLabel: '规则版本/发布人',
    columns: ['ruleVersion', 'publishStatus', 'publisher', 'publishedAt', 'usageRecord'],
    labels: { ruleVersion: '规则版本', publishStatus: '发布状态', publisher: '发布人', publishedAt: '发布时间', usageRecord: '使用记录' },
    rows: [
      { id: 'MR-202609-001', ruleVersion: 'MED-2026.09', publishStatus: '已发布', publisher: '陈医生', publishedAt: '2026-09-01 18:00', usageRecord: '已用于 24 份报告' },
      { id: 'MR-202609-002', ruleVersion: 'MED-2026.10', publishStatus: '草稿', publisher: '医学规则组', publishedAt: '-', usageRecord: '尚未使用' }
    ]
  },
  'intelligence-specialty': {
    title: '专业分类',
    filterLabel: '专业分类/报告类型',
    columns: ['specialty', 'reportType', 'description', 'status'],
    labels: { specialty: '专业分类', reportType: '适用报告类型', description: '分类说明', status: '状态' },
    rows: [
      { id: 'IS-202609-001', specialty: '心血管健康', reportType: '成人综合体检报告', description: '心血管相关指标分析', status: '启用' },
      { id: 'IS-202609-002', specialty: '睡眠与压力', reportType: '慢病随访报告', description: '睡眠、压力和恢复能力', status: '启用' }
    ]
  },
  'intelligence-indicator-map': {
    title: '指标映射',
    filterLabel: '指标名称/标准项目',
    columns: ['indicator', 'standardItem', 'mappingRule', 'mappingStatus'],
    labels: { indicator: '指标名称', standardItem: '标准项目', mappingRule: '映射规则', mappingStatus: '映射状态' },
    rows: [
      { id: 'IM-202609-001', indicator: '谷丙转氨酶 ALT', standardItem: 'STD-ALT-01', mappingRule: '按编码精确匹配', mappingStatus: '已映射' },
      { id: 'IM-202609-002', indicator: '空腹血糖', standardItem: 'STD-GLU-03', mappingRule: '按名称+单位匹配', mappingStatus: '待确认' }
    ]
  },
  'medical-health-analysis': {
    title: '分析规则',
    filterLabel: '规则名称/适用场景',
    columns: ['analysisRule', 'hitBasis', 'suggestion', 'ruleVersion', 'status'],
    labels: { analysisRule: '分析规则', hitBasis: '命中依据', suggestion: '建议结果', ruleVersion: '规则版本', status: '状态' },
    rows: [
      { id: 'MA-202609-001', analysisRule: '睡眠风险提示', hitBasis: '睡眠时长 < 6 小时且疲劳评分 ≥ 3', suggestion: '建议安排睡眠与运动复查', ruleVersion: 'MED-2026.09', status: '已发布' },
      { id: 'MA-202609-002', analysisRule: '肝功能复查建议', hitBasis: 'ALT 超过参考上限', suggestion: '建议六个月内复查肝功能', ruleVersion: 'MED-2026.09', status: '草稿' }
    ]
  },
  'intelligence-reference': {
    title: '参考资料',
    filterLabel: '资料名称/类型',
    columns: ['referenceName', 'referenceType', 'source', 'referenceStatus'],
    labels: { referenceName: '参考资料', referenceType: '资料类型', source: '来源', referenceStatus: '引用状态' },
    rows: [
      { id: 'IR-202609-001', referenceName: '睡眠管理指南（2026）', referenceType: '专业指南', source: '医学服务部', referenceStatus: '已引用' },
      { id: 'IR-202609-002', referenceName: '心血管复查建议', referenceType: '内部资料', source: '规则中心', referenceStatus: '待审核' }
    ]
  },
  'intelligence-template': {
    title: '报告模板',
    filterLabel: '模板名称/版本',
    columns: ['templateName', 'templateVersion', 'applicableReport', 'publishStatus'],
    labels: { templateName: '报告模板', templateVersion: '模板版本', applicableReport: '适用报告类型', publishStatus: '发布状态' },
    rows: [
      { id: 'IT-202609-001', templateName: '成人综合健康分析模板', templateVersion: 'V2.1', applicableReport: '成人综合体检报告', publishStatus: '已发布' },
      { id: 'IT-202609-002', templateName: '慢病随访建议模板', templateVersion: 'V1.0', applicableReport: '慢病随访报告', publishStatus: '草稿' }
    ]
  },
  'intelligence-model-data': {
    title: '模型与数据设置',
    filterLabel: '模型配置/数据来源',
    columns: ['modelConfig', 'dataSource', 'environment', 'connectionStatus'],
    labels: { modelConfig: '模型配置', dataSource: '数据来源', environment: '运行环境', connectionStatus: '连接状态' },
    rows: [
      { id: 'ID-202609-001', modelConfig: '健康分析建议模型', dataSource: '已发布医学规则 + 问诊资料', environment: '演示环境', connectionStatus: '已连接' },
      { id: 'ID-202609-002', modelConfig: '报告生成服务', dataSource: '报告模板与客户档案', environment: '演示环境', connectionStatus: '待校验' }
    ]
  },
  'doctor-plan': {
    title: '项目资料',
    filterLabel: '项目组合/方案类型',
    columns: ['projectSet', 'planType', 'scenario', 'items', 'status'],
    labels: { projectSet: '项目组合', planType: '方案类型', scenario: '适用场景', items: '项目明细', status: '状态' },
    rows: [
      { id: 'DP-202609-001', projectSet: '睡眠改善基础组合', planType: '健康方案', scenario: '初诊客户', items: '营养支持、运动指导', status: '已收藏' },
      { id: 'DP-202609-002', projectSet: '心血管复查组合', planType: '医疗方案', scenario: '复诊客户', items: '动态心电图、专科问诊', status: '已启用' }
    ]
  },
  'business-dictionary': {
    title: '业务字典',
    filterLabel: '字典类型/字典值',
    columns: ['dictionaryType', 'dictionaryCode', 'dictionaryValue', 'status'],
    labels: { dictionaryType: '字典类型', dictionaryCode: '字典编码', dictionaryValue: '字典值', status: '状态' },
    rows: [
      { id: 'BD-202609-001', dictionaryType: '报告来源', dictionaryCode: 'REPORT_SOURCE_EXTERNAL', dictionaryValue: '院外检测报告', status: '启用' },
      { id: 'BD-202609-002', dictionaryType: '方案类型', dictionaryCode: 'PLAN_TYPE_MEDICAL', dictionaryValue: '医疗方案', status: '启用' }
    ]
  }
}

export const getPanelDisplayRecord = (panel, recordId) => panelDisplayOverrides[panel]?.rows?.find(row => row.id === recordId) || null

const dynamicPanelIds = new Set([
  'purchase-quote-compare',
  'supply-warehouse-location',
  'inventory-inbound',
  'inventory-requisition',
  'inventory-flow',
  'asset-lifecycle'
])

function inventoryOperationRows(state) {
  return [
    ['inventory-transfer', '调拨'],
    ['inventory-stocktake', '盘点'],
    ['inventory-scrap', '报废']
  ].flatMap(([resourceId, operationType]) => (state.resources?.[resourceId] || []).map(record => ({
    ...record,
    resourceId,
    operationType:record.operationType || operationType,
    businessNo:record.businessNo || record.systemNo || record.id,
    warehouse:record.warehouse || [record.sourceWarehouse, record.targetWarehouse].filter(Boolean).join(' → '),
    material:record.material || '-',
    status:record.status || '草稿'
  })))
}

function assetOperationRows(state, panel) {
  const definitions = panel === 'asset-use'
    ? [['asset-use', '领用'], ['asset-return', '归还']]
    : [['asset-maintenance', '维修'], ['asset-transfer', '调拨']]
  return definitions.flatMap(([resourceId, operationType]) => (state.resources?.[resourceId] || []).map(record => ({
    ...record,
    resourceId,
    operationType,
    businessNo:record.systemNo || record.businessNo || record.id,
    handler:record.employee || record.maintenanceVendor || record.organization || '-',
    location:record.location || '-',
    status:record.status || '草稿'
  })))
}

function panelRows(state, panel, resourceId, display) {
  if (panel === 'inventory-operations') return inventoryOperationRows(state)
  if (['asset-use', 'asset-maintenance'].includes(panel)) return assetOperationRows(state, panel)
  if (dynamicPanelIds.has(panel) || dynamicPanelIds.has(resourceId)) return state.resources?.[resourceId] || []
  return display?.rows || state.resources?.[resourceId] || []
}

function terminalResourcePanel(state, terminalId, section, panel, query = {}) {
  const resourceId = terminalPanelResources[panel] || panel
  const resourceDefinition = resourceRegistry.find(item => item.id === resourceId)
  const config = getWorkbenchConfig(resourceId) || resourceDefinition
  const capabilities = config?.capabilities || resourceDefinition?.capabilities || []
  const display = panelDisplayOverrides[`${terminalId}:${section}:${panel}`] || panelDisplayOverrides[panel] || panelDisplayOverrides[resourceId]
  const terminal = terminalById(terminalId)
  const menu = terminal.menu.find(item => item.id === section)
  const menuLink = menu?.links?.find(link => link.href.includes(`panel=${panel}`))
  const title = display?.title || menuLink?.label || config?.title || menu?.label || panel
  const businessName = display?.title || config?.title || title
  const columns = display?.columns?.length ? display.columns : config?.columns?.length ? config.columns : ['name', 'code', 'status']
  const labelFor = name => display?.labels?.[name] || config?.fields?.find(field => field.name === name)?.label || fieldLabels[name] || name
  const valueFor = (record, name) => {
    const value = record?.[name]
    return value === undefined || value === null || value === '' ? '-' : typeof value === 'object' ? JSON.stringify(value) : String(value)
  }
  const sourceRows = panelRows(state, panel, resourceId, display)
  const keyword = String(query.keyword || '').trim().toLowerCase()
  const selectedStatus = query.status || '全部'
  const selectedOperation = query.operationType || '全部'
  const rows = sourceRows.filter(record => {
    const matchesKeyword = !keyword || Object.values(record).some(value => String(value ?? '').toLowerCase().includes(keyword))
    const matchesStatus = selectedStatus === '全部' || !display || record.status === selectedStatus
    const matchesOperation = selectedOperation === '全部' || !display || record.operationType === selectedOperation
    return matchesKeyword && matchesStatus && matchesOperation
  })
  const businessActionButtons = record => {
    const rowResourceId = record.resourceId || resourceId
    const rowConfig = getWorkbenchConfig(rowResourceId) || config
    const rowActions = terminalId === 'management' ? [] : (rowConfig?.rowActions || []).filter(action => !['resource-delete'].includes(action)).slice(0, 2).map(action => ({ action, label:rowConfig?.actionLabels?.[action] || getActionDefinition(action)?.label || '处理' }))
    return rowActions.map(item => `<button class="btn-link terminal-business-action" type="button" data-action="${escapeHtml(item.action)}" data-resource="${escapeHtml(rowResourceId)}" data-record="${escapeHtml(record.id)}">${escapeHtml(item.label)}</button>`).join('')
  }
  const canEdit = capabilities.includes('update') && resourceId !== 'inventory-operations'
  const statusColumns = new Set(['status', 'publishStatus', 'mappingStatus', 'connectionStatus', 'referenceStatus'])
  const rowsMarkup = rows.length
    ? rows.map(record => {
      const rowResourceId = record.resourceId || resourceId
      const rowConfig = getWorkbenchConfig(rowResourceId) || config
      const rowDefinition = resourceRegistry.find(item => item.id === rowResourceId)
      const rowCapabilities = rowConfig?.capabilities || rowDefinition?.capabilities || []
      const rowCanEdit = rowCapabilities.includes('update') && resourceId !== 'inventory-operations'
      return `<tr><td><input type="checkbox" data-terminal-record="${escapeHtml(record.id)}"></td>${columns.map(name => `<td>${statusColumns.has(name) ? statusBadge(valueFor(record, name)) : escapeHtml(valueFor(record, name))}</td>`).join('')}<td><button class="btn-link" type="button" data-action="resource-detail" data-resource="${escapeHtml(rowResourceId)}" data-panel="${escapeHtml(panel)}" data-record="${escapeHtml(record.id)}">查看详情</button>${rowCanEdit ? `<button class="btn-link" type="button" data-action="resource-update" data-resource="${escapeHtml(rowResourceId)}" data-panel="${escapeHtml(panel)}" data-record="${escapeHtml(record.id)}">编辑</button>` : ''}${businessActionButtons(record)}</td></tr>`
    }).join('')
    : `<tr><td colspan="${columns.length + 2}"><div class="empty-state"><b>暂无${escapeHtml(title)}记录</b><p>当前页面保留一期 Axure 列表结构，可从新增或查询操作继续。</p></div></td></tr>`
  const filter = config?.filters?.[0]
  const filterLabel = display?.filterLabel || filter?.label || '关键词'
  const talent = state.terminalDemo?.talent
  const pageAction = resourceId === 'talent-report'
    ? talent?.status === '已发布'
      ? '<button class="btn danger-outline" data-terminal-action="withdraw-talent-report">撤回报告</button>'
      : '<button class="btn primary" data-terminal-action="publish-talent-report">发布报告</button>'
    : resourceId === 'inventory-inbound'
      ? '<button class="btn secondary" type="button" data-action="resource-confirm" data-resource="inventory-inbound">处理当前阶段</button>'
      : resourceId === 'inventory-ledger'
        ? '<button class="btn ghost" type="button" data-action="inventory-freeze-toggle" data-resource="inventory-ledger">冻结/解冻</button>'
        : ''
  const pageTabs = resourceId === 'inventory-operations'
    ? `<nav class="terminal-panel-tabs" aria-label="库存作业类型"><a class="${!query.operationType ? 'active' : ''}" href="#/terminal?terminal=admin&section=inventory&panel=inventory-operations">全部</a><a class="${query.operationType === '调拨' ? 'active' : ''}" href="#/terminal?terminal=admin&section=inventory&panel=inventory-operations&operationType=调拨">调拨</a><a class="${query.operationType === '盘点' ? 'active' : ''}" href="#/terminal?terminal=admin&section=inventory&panel=inventory-operations&operationType=盘点">盘点</a><a class="${query.operationType === '报废' ? 'active' : ''}" href="#/terminal?terminal=admin&section=inventory&panel=inventory-operations&operationType=报废">报废</a></nav>`
    : panel === 'asset-use'
      ? `<nav class="terminal-panel-tabs" aria-label="领用借还类型"><a class="${!query.operationType ? 'active' : ''}" href="#/terminal?terminal=admin&section=assets&panel=asset-use">全部</a><a class="${query.operationType === '领用' ? 'active' : ''}" href="#/terminal?terminal=admin&section=assets&panel=asset-use&operationType=领用">领用/借出</a><a class="${query.operationType === '归还' ? 'active' : ''}" href="#/terminal?terminal=admin&section=assets&panel=asset-use&operationType=归还">归还</a></nav>`
      : panel === 'asset-maintenance'
        ? `<nav class="terminal-panel-tabs" aria-label="维修调拨类型"><a class="${!query.operationType ? 'active' : ''}" href="#/terminal?terminal=admin&section=assets&panel=asset-maintenance">全部</a><a class="${query.operationType === '维修' ? 'active' : ''}" href="#/terminal?terminal=admin&section=assets&panel=asset-maintenance&operationType=维修">维修</a><a class="${query.operationType === '调拨' ? 'active' : ''}" href="#/terminal?terminal=admin&section=assets&panel=asset-maintenance&operationType=调拨">调拨</a></nav>`
        : ''
  const operationGuide = resourceId === 'inventory-operations'
    ? `<section class="inventory-operation-guide"><header><div><span class="eyebrow">库存作业字段</span><h3>${escapeHtml(query.operationType || '调拨、盘点、报废')}</h3><p>入口合并为一个页面，选择页签后按对应单据字段新增、查看和处理；每类单据仍保留独立业务单号和库存流水。</p></div></header><div class="inventory-operation-guide-grid">${(query.operationType ? [query.operationType] : ['调拨','盘点','报废']).map(type => {
      const definitions = {
        '调拨': { fields:'调出仓库、调出库位、调入仓库、调入库位、批次、调拨数量', resource:'inventory-transfer' },
        '盘点': { fields:'仓库、库位、物料、批次、账面数量、实盘数量、差异数量、盘点日期', resource:'inventory-stocktake' },
        '报废': { fields:'物料、仓库、库位、批次、报废数量、报废原因、处理说明', resource:'inventory-scrap' }
      }[type]
      return `<article><div><b>${type}</b><span>${definitions.fields}</span></div><button class="btn secondary small" type="button" data-action="resource-create" data-resource="${definitions.resource}">新增${type}单</button></article>`
    }).join('')}</div></section>`
    : panel === 'asset-use'
      ? `<section class="inventory-operation-guide"><div class="inventory-operation-guide-grid"><article><div><b>领用/借出</b><span>选择资产、领用人、部门和当前位置</span></div><button class="btn secondary small" type="button" data-action="resource-create" data-resource="asset-use">新增领用单</button></article><article><div><b>归还</b><span>选择资产和归还人，确认后恢复资产可用状态</span></div><button class="btn secondary small" type="button" data-action="resource-create" data-resource="asset-return">新增归还单</button></article></div></section>`
      : panel === 'asset-maintenance'
        ? `<section class="inventory-operation-guide"><div class="inventory-operation-guide-grid"><article><div><b>维修</b><span>选择资产、维修单位、维修状态和金额</span></div><button class="btn secondary small" type="button" data-action="resource-create" data-resource="asset-maintenance">新增维修单</button></article><article><div><b>调拨</b><span>选择资产、调入组织、部门和位置</span></div><button class="btn secondary small" type="button" data-action="resource-create" data-resource="asset-transfer">新增调拨单</button></article></div></section>`
        : ''
  const recentAudit = (state.audit || []).filter(item => item.resourceId === resourceId).slice(0, 3)
  const auditMarkup = resourceId.startsWith('talent-') ? '' : `<section class="terminal-operation-record"><header><h3>操作记录</h3></header>${recentAudit.length ? recentAudit.map(item => `<div><span>${escapeHtml(item.time || '-')}</span><b>${escapeHtml(item.action || '处理')}</b><small>${escapeHtml(item.detail || item.targetId || '-')}</small></div>`).join('') : '<div><span>-</span><b>暂无操作记录</b><small>新增、编辑或状态处理后将在这里记录。</small></div>'}</section>`
  const canCreate = capabilities.includes('create') && !['readonly', 'analysis'].includes(config?.pageType) && !['inventory-operations', 'asset-use', 'asset-maintenance'].includes(resourceId)
  const createAction = canCreate ? `<button class="btn primary" type="button" data-action="resource-create" data-resource="${escapeHtml(resourceId)}">新增${escapeHtml(businessName)}</button>` : ''
  const statusOptions = display
    ? (display.statusOptions || config?.filters?.find(item => item.name === 'status')?.options || []).filter(option => option !== '全部')
    : (config?.filters?.find(item => item.name === 'status')?.options || []).filter(option => option !== '全部')
  const statusFilter = display && !display.columns.includes('status')
    ? ''
    : `<label><span>状态 ${helpButton('field:filter:status')}</span><select name="status"><option${selectedStatus === '全部' ? ' selected' : ''}>全部</option>${statusOptions.map(option => `<option${option === selectedStatus ? ' selected' : ''}>${escapeHtml(option)}</option>`).join('')}</select></label>`
  return `<section class="terminal-card terminal-axure-panel" data-terminal-resource="${escapeHtml(panel)}"><header><div><span class="eyebrow">${escapeHtml(menu?.label || '业务菜单')} · ${escapeHtml(businessName)}</span><h2>${escapeHtml(title)}</h2></div><div class="terminal-action-row">${pageAction}${createAction}</div></header>${pageTabs}${operationGuide}<form class="terminal-filter" data-terminal-filter><label><span>${escapeHtml(filterLabel)} ${helpButton('field:filter:keyword')}</span><input name="keyword" value="${escapeHtml(query.keyword || '')}" placeholder="请输入${escapeHtml(filterLabel)}"></label>${statusFilter}<button class="btn primary small" type="submit">查询</button><button class="btn ghost small" type="button" data-action="reset-terminal-filter">重置</button></form><div class="terminal-table terminal-axure-table" id="resource-table"><table><thead><tr><th><input type="checkbox" aria-label="全选"></th>${columns.map(name => `<th>${escapeHtml(labelFor(name))}</th>`).join('')}<th>操作</th></tr></thead><tbody>${rowsMarkup}</tbody></table></div>${auditMarkup}</section>`
}


export { escapeHtml, fieldLabels, statusBadge, helpButton, scopeLabels, terminalById, terminalResourcePanel }
