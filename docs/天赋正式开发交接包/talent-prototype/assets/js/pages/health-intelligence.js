import { escapeHtml, helpButton, statusBadge, terminalHref, workbenchLink } from './terminal-shared.js?v=talent-1.0.8'
import { assessCheckupValue, criticalValueItems, nameMappings, resolveExternalItem, standardItems } from '../checkup-master-data.js?v=talent-1.0.8'

const text = (value, fallback = '-') => escapeHtml(value === undefined || value === null || value === '' ? fallback : String(value))
const pick = (record, keys, fallback = '-') => text(keys.map(key => record?.[key]).find(value => value !== undefined && value !== null && value !== ''), fallback)
const rowId = (record, index) => text(record?.id || record?.standardCode || record?.sourceName || `ROW-${index + 1}`)
const field = (label, value, className = '') => `<div class="terminal-detail-field ${className}"><dt>${text(label)}</dt><dd>${text(value)}</dd></div>`
const shell = (section, title, summary, body, actions = '') => `<section class="terminal-card terminal-axure-panel health-intelligence-shell" data-terminal-resource="${text(section)}"><header><div><span class="eyebrow">后台管理 · ${text(title)}</span><h2>${text(title)}</h2><p>${text(summary)}</p></div><div class="terminal-action-row">${actions}</div></header>${body}</section>`
const filter = (label, extra = '') => `<form class="terminal-filter" data-terminal-filter><label><span>${text(label)} ${helpButton('field:filter:keyword')}</span><input name="keyword" placeholder="请输入${text(label)}"></label>${extra}<button class="btn primary small" type="submit">查询</button><button class="btn ghost small" type="button" data-action="reset-terminal-filter">重置</button></form>`
const action = (name, resource, label, record = '') => `<button class="btn-link" type="button" data-action="${text(name)}" data-resource="${text(resource)}"${record ? ` data-record="${text(record)}"` : ''}>${text(label)}</button>`
const table = (headers, rows) => `<div class="terminal-table terminal-axure-table"><table><thead><tr>${headers.map(header => `<th>${text(header)}</th>`).join('')}</tr></thead><tbody>${rows || '<tr><td colspan="8" class="table-empty">暂无记录</td></tr>'}</tbody></table></div>`

const intelligenceResourceIds = {
  'intelligence-specialty': 'medical-report-category',
  'intelligence-indicator-map': 'medical-external-item-map',
  'intelligence-analysis-rule': 'medical-item-relation',
  'intelligence-reference': 'medical-followup',
  'intelligence-template': 'medical-report-type',
  'intelligence-model-data': 'integration-project'
}

const resourceIdForPanel = panel => intelligenceResourceIds[panel] || panel

const standardRows = () => standardItems.slice(0, 8).map((item, index) => `<tr><td>${rowId(item, index)}</td><td>${pick(item, ['standardName', 'name'])}</td><td>${pick(item, ['content', 'checkupContent'])}</td><td>${pick(item, ['unit', 'standardUnit'])}</td><td>${pick(item, ['category', 'checkupCategory'])}</td><td>${pick(item, ['referenceRange', 'referenceValue'])}</td><td>${pick(item, ['criticalLow'])}</td><td>${pick(item, ['criticalHigh'])}</td><td>${pick(item, ['physiologicalSystem', 'system'])}</td><td>${action('resource-detail', 'medical-standard-item', '查看详情', item.id || item.standardCode)}</td></tr>`).join('')

const mappingRows = () => nameMappings.slice(0, 8).map((mapping, index) => {
  const resolved = resolveExternalItem(mapping.sourceName || mapping.externalName || mapping.name)
  const status = resolved?.standardCode ? '已映射' : '待处理'
  return `<tr><td>${pick(mapping, ['sourceSystem'], '体检系统')}</td><td>${pick(mapping, ['sourceName', 'externalName', 'name'])}</td><td>${pick(mapping, ['sourceCode', 'externalCode', 'code'])}</td><td>${pick(resolved, ['standardName', 'name'])}</td><td>${pick(resolved, ['standardCode', 'code'])}</td><td>${pick(resolved, ['category', 'checkupCategory'])}</td><td>${statusBadge(status)}</td><td>${action('resource-detail', 'medical-external-item-map', '查看详情', mapping.id || `MAP-${index + 1}`)}${action('resource-update', 'medical-external-item-map', '编辑', mapping.id || `MAP-${index + 1}`)}</td></tr>`
}).join('')

const checkupSyncRows = () => nameMappings.slice(0, 8).map((mapping, index) => {
  const sourceName = mapping.sourceName || mapping.externalName || mapping.name
  const resolved = resolveExternalItem(sourceName)
  const item = resolved?.item
  const rawUnit = item?.unit || '-'
  const rawValue = index === 0 ? 15 : index === 4 ? '未提供' : '-'
  const conclusion = item && typeof rawValue === 'number'
    ? assessCheckupValue({ itemCode:item.code, value:rawValue, unit:rawUnit }).status
    : (resolved?.standardCode ? '未判定' : '待处理')
  const status = resolved?.standardCode ? '已映射' : '待处理'
  return `<tr><td>${pick(mapping, ['sourceSystem'], '体检系统')}</td><td>${pick(mapping, ['sourceName', 'externalName', 'name'])}</td><td>${pick(mapping, ['sourceCode', 'externalCode', 'code'], `EXT-${String(index + 1).padStart(3, '0')}`)}</td><td>${text(rawUnit)}</td><td>${text(rawValue)}</td><td>${pick(resolved, ['standardName', 'name'])}</td><td>${pick(resolved, ['standardCode', 'code'])}</td><td>${pick(resolved, ['standardUnit', 'unit'])}</td><td>${pick(resolved, ['referenceRange', 'referenceValue'])}</td><td>${text(conclusion)}</td><td>${pick(resolved, ['category', 'checkupCategory'])}</td><td>${pick(resolved, ['physiologicalSystem', 'system'])}</td><td>MAP-2026.08</td><td>${statusBadge(status)}</td><td>${action('resource-detail', 'medical-external-item-map', '查看详情', mapping.id || `MAP-${index + 1}`)}</td></tr>`
}).join('')

const unmatchedRows = () => {
  const rows = nameMappings.filter(mapping => {
    const resolved = resolveExternalItem(mapping.sourceName || mapping.externalName || mapping.name)
    return !resolved?.standardCode
  }).slice(0, 6)
  return rows.map((mapping, index) => `<tr><td>${pick(mapping, ['sourceName', 'externalName', 'name'])}</td><td>${pick(mapping, ['sourceCode', 'externalCode', 'code'])}</td><td>${pick(mapping, ['sourceSystem'], '体检系统')}</td><td>${statusBadge('待处理')}</td><td>不进入标准数据和健康智脑分析</td><td>${action('resource-detail', 'medical-unmatched-item', '查看详情', mapping.id || `UNMATCHED-${index + 1}`)}${action('resource-update', 'medical-unmatched-item', '确认映射', mapping.id || `UNMATCHED-${index + 1}`)}</td></tr>`).join('')
}

const criticalRows = () => criticalValueItems.slice(0, 8).map((item, index) => `<tr><td>${pick(item, ['standardName', 'name'])}</td><td>${pick(item, ['standardCode', 'code'])}</td><td>${pick(item, ['unit'])}</td><td>${pick(item, ['criticalLowExpression', 'criticalLow'])}</td><td>${pick(item, ['criticalHighExpression', 'criticalHigh'])}</td><td>成人（18 岁以上）</td><td>MED-2026.08</td><td>${pick(item, ['physiologicalSystem', 'system'])}</td><td>${statusBadge('已发布')}</td><td>${action('resource-detail', 'medical-critical-rule', '查看详情', item.id || item.standardCode || `CRITICAL-${index + 1}`)}</td></tr>`).join('')

const referenceRows = () => standardItems.filter(item => item.referenceRange).slice(0, 8).map((item, index) => `<tr><td>${pick(item, ['standardName', 'name'])}</td><td>${pick(item, ['standardCode', 'code'])}</td><td>${pick(item, ['unit'])}</td><td>${pick(item, ['referenceRange', 'referenceValue'])}</td><td>成人（18 岁以上）</td><td>MED-2026.08</td><td>${pick(item, ['category', 'checkupCategory'])}</td><td>${pick(item, ['physiologicalSystem', 'system'])}</td><td>${statusBadge('已发布')}</td><td>${action('resource-detail', 'medical-reference-rule', '查看详情', item.id || item.standardCode || `REF-${index + 1}`)}</td></tr>`).join('')

export function renderIntegrationOverview(state) {
  return renderCheckupSyncPanel(state)
}

/**
 * 历史 integration-* URL 仅保留兼容跳转，避免旧入口重新暴露连接配置。
 */
export function renderIntegrationPanel(_panel, state) {
  return renderCheckupSyncPanel(state)
}

export function renderCheckupSyncPanel(state = {}) {
  const direct = resolveExternalItem('血清直接胆红素测定')
  const records = state.resources?.['checkup-sync'] || []
  const current = records.find(item => item.id === 'SYNC-PREVIEW-001') || records[0] || {}
  const pendingCount = Number(current.pendingCount ?? nameMappings.filter(item => !resolveExternalItem(item.sourceName || item.externalName || item.name)?.standardCode).length)
  const filteredCount = Number(current.filteredCount ?? 3)
  const failureCount = Number(current.failureCount ?? 1)
  const receivedCount = Number(current.receivedCount ?? 133)
  const completedCount = Number(current.standardizedCount ?? Math.max(receivedCount - filteredCount - pendingCount - failureCount, 0))
  const nameMappedCount = Number(current.nameMappedCount ?? (nameMappings.length - pendingCount))
  const syncStatus = current.status || '待确认'
  const batchId = current.batchId || current.id || 'SYNC-PREVIEW-001'
  const batchResult = current.result || '等待预览'
  const fieldMapping = current.fieldMapping || '项目名称、项目代码、单位、结果值、参考值'
  const itemMapping = current.itemMapping || '同步名称/代码 → 标准项目代码'
  const classificationRule = current.classificationRule || '排除项目过滤；其余项目按体检分类和生理系统归属'
  const body = `
    <div class="metric-grid terminal-metric-grid">
      <article><span>标准项目</span><b>${standardItems.length}</b><small>来自 20260828 体检基线</small></article>
      <article><span>名称对照</span><b>${nameMappings.length}</b><small>同步名称 → 标准名称</small></article>
      <article><span>名称映射状态</span><b>${nameMappedCount} / ${nameMappings.length}</b><small>名称对照基线已映射</small></article>
      <article><span>本批次处理</span><b>${receivedCount}</b><small>接收体检结果项目</small></article>
      <article><span>成功处理</span><b>${completedCount}</b><small>进入医学规则判定</small></article>
      <article><span>已排除</span><b>${filteredCount}</b><small>不进入业务和智脑</small></article>
      <article><span>待处理</span><b>${pendingCount}</b><small>未匹配不进入 AI</small></article>
      <article><span>失败</span><b>${failureCount}</b><small>结果区域可重试或补偿</small></article>
    </div>
    <section class="health-intelligence-section">
      <header><div><h3>规则配置</h3><p>在本页完成字段映射、项目映射、排除和分类归属。</p></div></header>
      <div class="health-intelligence-module-grid">
        <article class="health-intelligence-module-card"><b>字段映射</b><p>${text(fieldMapping)}</p><button class="btn-link" type="button" data-action="checkup-config-field" data-resource="checkup-sync" data-record="${text(current.id || 'SYNC-PREVIEW-001')}">配置字段映射</button></article>
        <article class="health-intelligence-module-card"><b>项目映射</b><p>${text(itemMapping)}</p><button class="btn-link" type="button" data-action="checkup-config-item" data-resource="checkup-sync" data-record="${text(current.id || 'SYNC-PREVIEW-001')}">配置项目映射</button></article>
        <article class="health-intelligence-module-card"><b>排除与归类</b><p>${text(classificationRule)}</p><button class="btn-link" type="button" data-action="checkup-config-classify" data-resource="checkup-sync" data-record="${text(current.id || 'SYNC-PREVIEW-001')}">配置排除与归类</button></article>
      </div>
    </section>
    <div class="terminal-filter-row">${filter('同步名称')}</div>
    <section class="health-intelligence-callout"><b>同步结果预览</b><span>血清直接胆红素测定 → ${pick(direct, ['standardName', 'name'])} · ${pick(direct, ['standardCode', 'code'])} · ${pick(direct, ['standardUnit', 'unit'])} · 参考值 ${pick(direct, ['referenceRange'])} · 危急高值 ${pick(direct, ['criticalHigh'])} · ${pick(direct, ['category', 'checkupCategory'])} · ${pick(direct, ['physiologicalSystem', 'system'])}</span><small>排除项目在同步处理阶段直接过滤；未匹配项目进入待处理队列。</small></section>
    <div class="terminal-action-row"><button class="btn secondary" type="button" data-action="integration-preview" data-resource="checkup-sync" data-record="${text(current.id || 'SYNC-PREVIEW-001')}">预览同步</button><button class="btn primary" type="button" data-action="integration-confirm" data-resource="checkup-sync" data-record="${text(current.id || 'SYNC-PREVIEW-001')}">确认同步</button></div>
    <section class="health-intelligence-callout"><b>同步处理结果</b><span>批次 ${text(batchId)} · ${statusBadge(syncStatus)} · ${text(batchResult)}</span>${failureCount ? `<small>${text(failureCount)} 项单位标准化失败，可在此重试或登记人工补偿。</small><div class="terminal-action-row">${action('integration-retry', 'checkup-sync', '重试', current.id || 'SYNC-PREVIEW-001')}${action('integration-compensate', 'checkup-sync', '人工补偿', current.id || 'SYNC-PREVIEW-001')}</div>` : '<small>当前批次没有失败结果。</small>'}</section>
    ${table(['来源系统', '同步名称', '来源代码', '原始单位', '原始值', '标准项目', '标准代码', '标准单位', '参考范围', '危急判定', '体检分类', '生理系统', '映射版本', '映射状态', '操作'], checkupSyncRows())}
    <div class="terminal-operation-record"><header><h3>同步批次留痕</h3></header><div><span>${text(batchId)}</span><b>${text(syncStatus)}</b><small>接收 ${receivedCount} 项，成功处理 ${completedCount} 项，名称映射已映射 ${nameMappedCount} / ${nameMappings.length} 条，过滤数量 ${filteredCount} 项，待处理 ${pendingCount} 项，失败 ${failureCount} 项；映射版本 MAP-2026.08。</small></div></div>`
  return shell('checkup-sync', '体检系统同步', '在同一页面完成字段映射、项目映射、排除、体检分类、生理系统归属和同步结果处理。', body)
}

export function renderMedicalRulesOverview() {
  return shell('medical-rules', '医学规则中心', '医学规则中心维护统一标准项目、参考范围、危急值和医学关系，所有模块只引用已发布版本。', `<div class="health-intelligence-flow"><span>标准项目</span><i>→</i><span>参考范围/危急值</span><i>→</i><span>医学关系</span><i>→</i><span>发布版本</span></div><div class="metric-grid terminal-metric-grid"><article><span>标准项目</span><b>${standardItems.length}</b><small>检验分类、单位和系统</small></article><article><span>危急值项目</span><b>${criticalValueItems.length}</b><small>低值/高值阈值</small></article><article><span>映射名称</span><b>${nameMappings.length}</b><small>由体检同步维护</small></article><article><span>当前版本</span><b>MED-2026.08</b><small>已发布并可被引用</small></article></div><div class="health-intelligence-module-grid"><article class="health-intelligence-module-card"><b>标准项目库</b><p>查看 133 个标准检验项目及体检分类、单位、生理系统。</p>${workbenchLink('admin', '打开标准项目库', terminalHref('admin', 'medical-rules') + '&panel=medical-standard-item')}</article><article class="health-intelligence-module-card"><b>参考范围与危急值</b><p>独立维护参考值、危急低值和危急高值。</p>${workbenchLink('admin', '打开阈值配置', terminalHref('admin', 'medical-rules') + '&panel=medical-reference-rule')}</article><article class="health-intelligence-module-card"><b>未匹配项目</b><p>未匹配数据必须先处理，不能直接进入健康智脑分析。</p>${workbenchLink('admin', '打开待处理队列', terminalHref('admin', 'medical-rules') + '&panel=medical-unmatched-item')}</article></div>`)
}

export function renderMedicalRulesPanel(panel) {
  if (panel === 'medical-report-category') return shell(panel, '报告分类', '医学规则中心 · 体检报告大类：维护数据范围和报告分类，供标准项目与报告模板引用。', `${filter('报告大类')} ${table(['分类编码', '报告大类', '数据范围', '状态', '操作'], '<tr><td>CHECKUP-ADULT</td><td>成人综合体检</td><td>成人体检检验、影像和问卷数据</td><td>' + statusBadge('已发布') + '</td><td>' + action('resource-detail', 'medical-report-category', '查看详情', 'CHECKUP-ADULT') + '</td></tr><tr><td>CHECKUP-REVISIT</td><td>复诊复查报告</td><td>复诊检验与复查建议数据</td><td>' + statusBadge('草稿') + '</td><td>' + action('resource-detail', 'medical-report-category', '查看详情', 'CHECKUP-REVISIT') + '</td></tr>')}`, action('resource-create', 'medical-report-category', '新增报告分类'))
  if (panel === 'medical-item-relation') return shell(panel, '医学关系', '维护标准项目之间的医学关系、前置条件和人工关注提示；健康智脑只引用已发布版本。', `${filter('标准项目')} ${table(['标准项目', '医学关系', '前置条件', '人工关注', '规则版本', '发布状态', '操作'], '<tr><td>血压 / LDL-C</td><td>心血管风险联合关注</td><td>同批次均已标准化</td><td>是</td><td>MED-2026.08</td><td>' + statusBadge('已发布') + '</td><td>' + action('resource-detail', 'medical-item-relation', '查看详情', 'REL-202608-001') + '</td></tr><tr><td>危急值项目</td><td>转人工复核</td><td>命中危急低值或高值</td><td>必须</td><td>MED-2026.08</td><td>' + statusBadge('已发布') + '</td><td>' + action('resource-detail', 'medical-item-relation', '查看详情', 'REL-202608-002') + '</td></tr>')}`, action('resource-create', 'medical-item-relation', '新增医学关系'))
  if (panel === 'medical-standard-item') return shell(panel, '标准项目', '全量维护标准检验项目、体检分类、单位、参考范围和生理系统。', `${filter('项目名称/代码')} ${table(['项目代码', '检验项目', '体检内容', '单位', '体检分类', '参考值', '危急低值', '危急高值', '生理系统', '操作'], standardRows())}`, action('resource-create', 'medical-standard-item', '新增标准项目'))
  if (panel === 'medical-external-item-map') return shell(panel, '外部项目映射', '查看三方系统同步名称到标准项目的映射结果；维护入口位于“三方系统对接 · 体检系统同步”。', `${filter('同步名称', '<label><span>映射状态</span><select name="status"><option>全部</option><option>已映射</option><option>待处理</option></select></label>')} ${table(['来源系统', '同步名称', '来源代码', '标准项目', '标准代码', '体检分类', '状态', '操作'], mappingRows())}`, action('resource-create', 'medical-external-item-map', '新增映射'))
  if (panel === 'medical-unmatched-item') return shell(panel, '未匹配项目', '未匹配项目保留在待处理队列，不参与标准化、危急值判定或健康智脑分析。', `${filter('同步名称')} ${table(['同步名称', '来源代码', '来源系统', '状态', '处理规则', '操作'], unmatchedRows())}`)
  if (panel === 'medical-reference-rule') return shell(panel, '参考范围', '按标准项目维护单位、适用范围和参考范围，分析任务只引用已发布版本。', `${filter('项目名称/代码')} ${table(['标准项目', '标准代码', '单位', '参考值', '适用范围', '生效版本', '体检分类', '生理系统', '发布状态', '操作'], referenceRows())}`, action('resource-create', 'medical-reference-rule', '新增参考范围'))
  if (panel === 'medical-critical-rule') return shell(panel, '危急值', '按标准项目维护适用范围、危急低值和危急高值，并在任务中形成明确的危急状态。', `${filter('项目名称/代码')} ${table(['标准项目', '标准代码', '单位', '危急低值', '危急高值', '适用范围', '生效版本', '生理系统', '发布状态', '操作'], criticalRows())}`, action('resource-create', 'medical-critical-rule', '新增危急值'))
  if (panel === 'medical-rule-release') return shell(panel, '版本发布与使用记录', '发布医学规则后，体检同步和健康智脑任务只能引用已发布版本。', `${filter('规则版本')} ${table(['规则版本', '包含内容', '发布状态', '发布人', '发布时间', '使用记录', '操作'], '<tr><td>MED-2026.08</td><td>标准项目、映射、参考值、危急值、医学关系</td><td>' + statusBadge('已发布') + '</td><td>医学规则组</td><td>2026-08-28 18:00</td><td>已用于心血管 POC</td><td>' + action('resource-detail', 'medical-rule-release', '查看详情', 'MR-202608-001') + '</td></tr>')}`)
  return shell(panel, panel, '医学规则维护页面。', `${filter('关键词')} ${table(['项目', '状态', '操作'], standardItems.slice(0, 3).map((item, index) => `<tr><td>${pick(item, ['standardName', 'name'])}</td><td>${statusBadge('已发布')}</td><td>${action('resource-detail', panel, '查看详情', item.id || `RULE-${index + 1}`)}</td></tr>`).join(''))}`)
}

const brainConfig = {
  'intelligence-specialty': { title:'专业分类', summary:'统一定义健康智脑分析专题；首期范围只启用心血管健康。', headers:['专业分类', '范围状态', '说明', '状态', '操作'], rows:[['心血管健康', '首期 POC', '心血管相关标准项目和复查建议', '已启用'], ['睡眠与压力', '后续扩展示例', '不属于本期确认范围', '未启用']] },
  'intelligence-indicator-map': { title:'指标纳入与映射', summary:'选择医学规则中心已发布的标准项目，配置是否纳入心血管分析。', headers:['专业分类', '标准项目', '体检分类', '生理系统', '纳入分析', '规则版本', '操作'], rows:[['心血管健康', '血清肌酸激酶测定（CK）', '血液检查', '循环系统', '是', 'MED-2026.08'], ['心血管健康', '血清直接胆红素测定 → 直接胆红素(钒酸盐氧化法）', '血液检查', '消化腺系统', '否', 'MED-2026.08']] },
  'intelligence-analysis-rule': { title:'分析规则', summary:'配置触发条件、命中依据、建议结果和人工关注，只维护配置，不执行运行任务。', headers:['专业分类', '规则类型', '触发条件', '人工关注', '优先级', '版本', '状态', '操作'], rows:[['心血管健康', '异常指标提示', '循环系统项目超出参考范围', '是', '高', 'BRAIN-2026.08', '已发布'], ['心血管健康', '危急值转人工', '命中危急低值或高值', '必须', '最高', 'BRAIN-2026.08', '已发布']] },
  'intelligence-reference': { title:'参考资料', summary:'管理经过审核、可受控引用的专题资料。', headers:['专业分类', '资料名称', '资料来源', '版本', '有效期', '引用状态', '操作'], rows:[['心血管健康', '心血管健康管理指南', '医学服务部', '2026', '2026-12-31', '已审核可引用'], ['心血管健康', '复查建议说明', '规则中心', 'MED-2026.08', '长期有效', '已审核可引用']] },
  'intelligence-template': { title:'报告模板', summary:'按专业分类组织报告章节、排序和固定说明。', headers:['专业分类', '报告类型', '章节', '排序', '模板版本', '发布状态', '操作'], rows:[['心血管健康', '心血管健康分析报告', '异常指标 / 风险提示 / 复查建议', '1-3', 'TPL-2026.08', '已发布']] },
  'intelligence-model-data': { title:'模型与数据策略', summary:'只配置模型使用策略和数据安全边界，模型通过后端统一网关调用。', headers:['专业分类', '可用场景', '候选模型', '字段白名单', '脱敏规则', '网关调用开关', '额度', '状态', '操作'], rows:[['心血管健康', '报告草案生成', '健康分析模型', '标准体检值、问诊摘要、家族史', '姓名/电话脱敏', '开启', '100 次/日', '已发布']] }
}

export function renderIntelligenceConfigOverview() {
  return shell('intelligence-config', '智脑配置', '一个一级菜单内管理专业分类、指标纳入、分析编排、资料、模板和模型数据策略；医学事实统一引用医学规则中心。', `<div class="health-intelligence-flow"><span>专业分类</span><i>→</i><span>指标纳入</span><i>→</i><span>分析规则</span><i>→</i><span>资料/模板</span><i>→</i><span>模型策略</span></div><div class="health-intelligence-module-grid">${Object.entries(brainConfig).map(([panel, config]) => `<article class="health-intelligence-module-card"><b>${text(config.title)}</b><p>${text(config.summary)}</p>${workbenchLink('admin', `进入${config.title}`, terminalHref('admin', 'intelligence-config') + `&panel=${panel}`)}</article>`).join('')}</div>`)
}

export function renderIntelligenceConfigPanel(panel) {
  const config = brainConfig[panel]
  if (!config) return renderIntelligenceConfigOverview()
  const resourceId = resourceIdForPanel(panel)
  const rows = config.rows.map((values, index) => `<tr>${values.map((value, valueIndex) => `<td>${valueIndex === values.length - 1 ? statusBadge(value) : text(value)}</td>`).join('')}<td>${action('resource-detail', resourceId, '查看详情', `${panel.toUpperCase()}-${index + 1}`)}${action('resource-update', resourceId, '编辑', `${panel.toUpperCase()}-${index + 1}`)}</td></tr>`).join('')
  return shell(panel, config.title, config.summary, `${filter('专业分类')} ${table(config.headers, rows)}`, action('resource-create', resourceId, `新增${config.title}`))
}

export function renderHealthBrainList() {
  return shell('intelligence-task-list', '分析任务 / 报告列表', '服务端查看健康智脑分析任务和报告结果；首期演示心血管健康 POC，最终结论由医生确认。', `<div class="metric-grid terminal-metric-grid"><article><span>心血管 POC</span><b>1</b><small>待医生确认</small></article><article><span>已冻结版本</span><b>4</b><small>同步/映射/规则/智脑</small></article><article><span>待处理项目</span><b>3</b><small>未匹配，不进入 AI</small></article></div>${filter('客户/问诊编号')} ${table(['分析任务', '客户', '专业分类', '状态', '版本快照', '更新时间', '操作'], '<tr><td>AI-202609-001</td><td>林女士</td><td>心血管健康</td><td>' + statusBadge('待医生确认') + '</td><td>SYNC-20260828-001 / MAP-2026.08 / MED-2026.08 / BRAIN-2026.08</td><td>2026-09-03 09:20</td><td><a class="btn-link" href="' + terminalHref('service', 'intelligence') + '&record=INQ-202609-001&mode=detail">查看详情 →</a></td></tr>')}`)
}

export function renderHealthBrainDetail() {
  const direct = resolveExternalItem('血清直接胆红素测定')
  const dataRows = standardItems.filter(item => /循环系统|消化腺系统/.test(item.physiologicalSystem || item.system || '')).slice(0, 5).map((item, index) => `<tr><td>${pick(item, ['standardName', 'name'])}</td><td>${pick(item, ['standardCode', 'code'])}</td><td>${pick(item, ['unit'])}</td><td>${pick(item, ['referenceRange', 'referenceValue'])}</td><td>${index === 1 ? statusBadge('超出参考范围') : statusBadge('正常')}</td><td>${pick(item, ['physiologicalSystem', 'system'])}</td></tr>`).join('')
  return `<div class="terminal-card terminal-axure-panel health-brain-detail" data-terminal-resource="health-brain-detail"><header><div><span class="eyebrow">服务端 · 健康智脑 · 心血管健康 POC</span><h2>林女士 · 心血管健康分析任务</h2><p>AI 只生成草案；医生编辑、确认后才能发布正式报告。</p></div><span class="status-chip soft">待医生确认</span></header><div class="terminal-step-row"><span class="done">1 · 资料确认</span><span class="done">2 · 标准数据</span><span class="done">3 · 规则依据</span><span class="current">4 · AI 草案</span><span>5 · 医生确认</span><span>6 · 发布/归档</span></div><section class="health-brain-section"><h3>资料范围确认</h3><p>本次使用：体检报告、健康问卷、既往史、家族史；未授权资料不会发送给模型。</p><div class="health-brain-checks"><label><input type="checkbox" checked> 体检报告</label><label><input type="checkbox" checked> 健康问卷</label><label><input type="checkbox" checked> 家族史</label><label><input type="checkbox"> 院外报告</label></div></section><section class="health-brain-section"><h3>标准化数据</h3><h3>异常与危急指标</h3>${table(['标准项目', '代码', '单位', '参考范围', '判定', '生理系统'], dataRows)}<div class="health-intelligence-callout"><b>映射依据</b><span>血清直接胆红素测定 → ${pick(direct, ['standardName', 'name'])}（${pick(direct, ['standardCode', 'code'])}）</span><small>同步批次 SYNC-20260828-001 · 映射 MAP-2026.08 · 医学规则 MED-2026.08</small></div></section><section class="health-brain-section"><h3>规则命中依据</h3><div class="health-brain-evidence"><article><b>命中规则</b><p>循环系统项目超出参考范围时提示医生关注，并优先检查危急值。</p></article><article><b>人工关注</b><p>未匹配项目 3 条，已阻断 AI 分析；需在体检系统同步菜单完成映射。</p></article></div></section><section class="health-brain-section"><h3>AI 报告草案</h3><div class="health-brain-draft"><label>风险提示<textarea>当前标准数据中发现 1 项超出参考范围，建议结合问诊、家族史和医生判断进一步评估。</textarea></label><label>复查建议<textarea>由医生确认复查项目、时间和承接方式，不自动生成诊断或处方。</textarea></label></div></section><section class="health-brain-section"><h3>医生编辑确认</h3><div class="health-brain-draft"><label>医生确认备注<textarea>请结合当前资料和医学规则依据完成确认。</textarea></label></div><h3>版本快照与生命周期</h3><dl class="terminal-detail-grid">${field('同步批次', 'SYNC-20260828-001')}${field('映射版本', 'MAP-2026.08')}${field('医学规则版本', 'MED-2026.08')}${field('智脑配置版本', 'BRAIN-2026.08')}${field('模型策略版本', 'MODEL-2026.08')}${field('报告版本', 'REPORT-DRAFT-001')}</dl><div class="terminal-action-row"><button class="btn secondary" type="button">保存医生修改</button><button class="btn primary" type="button">确认并发布</button><button class="btn danger-outline" type="button">撤回报告</button><button class="btn ghost" type="button">归档</button></div><div class="terminal-operation-record"><header><h3>历史版本与复查承接</h3></header><div><span>REPORT-DRAFT-001</span><b>当前草案</b><small>医生确认后生成正式版本；复查建议承接到现有复诊/随访。</small></div></div></section></div>`
}
