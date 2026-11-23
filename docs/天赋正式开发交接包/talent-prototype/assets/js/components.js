import { getActionForm } from './flows.js?v=talent-1.0.8'

export const escapeHtml = value => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;')

export const fieldLabels = {
  name:'名称', code:'编码', owner:'负责人', status:'状态', department:'所属部门', position:'岗位',
  category:'分类', amount:'金额', quantity:'数量', warehouse:'仓库', location:'位置/库位', customer:'客户',
  direction:'方向', externalCode:'外部编码', standardCode:'标准编码', version:'版本', updatedAt:'更新时间', receivedAt:'接收时间',
  generatedAt:'生成完成时间', confirmedAt:'确认时间', publishedAt:'发布时间', withdrawnAt:'撤回时间', archivedAt:'归档时间',
  supplier:'供应商', source:'来源', businessId:'关联单号', expert:'会诊专家', snapshot:'快照编号',
  completeness:'完整性', missingItems:'缺失项目', matchResult:'匹配结果', result:'处理结果', reportBody:'报告正文',
  level:'分级', levelLabel:'分级说明', annotation:'固定注解', resultRange:'结果范围', resultMin:'结果最小值', resultMax:'结果最大值', ageRange:'年龄条件', gender:'适用性别',
  applicableGender:'适用性别', contentSet:'内容库', candidateContent:'候选培养内容', reportType:'报告类型',
  systemNo:'系统编号', inboundNo:'入库单号', purchaseOrder:'来源采购订单', purchaseRequest:'采购申请',
  quoteAmount:'报价金额', comparisonResult:'比价结果', stageStatus:'阶段状态', arrivalQty:'到货数量', actualReceivedQty:'实收数量',
  qualifiedQty:'合格数量', unqualifiedQty:'不合格数量', inspectionResult:'验收结论', qualityLevel:'质量等级', productionDate:'生产日期', expiry:'失效日期',
  warningStatus:'预警状态', businessNo:'业务单号', flowType:'流水类型', beforeQty:'变更前数量', afterQty:'变更后数量', changeQty:'变更数量',
  sourceWarehouse:'调出仓库', sourceLocation:'调出库位', targetWarehouse:'调入仓库', targetLocation:'调入库位', operationType:'作业类型', disposalReason:'报废原因',
  paid:'已收金额', refunded:'已退金额', attempts:'重试次数', createdAt:'创建时间', lastAction:'最近动作',
  id:'记录标识', migrationNote:'迁移说明', period:'期间', metric:'指标', executionRate:'同比/完成率',
  lastRefreshedAt:'最近刷新时间', analysisResult:'分析结果', sourceRecord:'来源记录', matchDescription:'匹配说明'
}

const talentRangePreview = (min, max) => {
  const low = min === '' || min === null || min === undefined ? null : Number(min)
  const high = max === '' || max === null || max === undefined ? null : Number(max)
  if (!Number.isFinite(low) || !Number.isFinite(high)) return '请输入最小值和最大值'
  if (low > high) return '最小值不能大于最大值'
  return `${low}–${high} 分`
}

export function statusBadge(status = '未开始') {
  const tone = /通过|启用|成功|完成|发布|归档|正常|收款|对账|入库|生效/.test(status) ? 'success'
    : /驳回|失败|作废|取消|停用/.test(status) ? 'danger'
      : /待|草稿|进行|转办|退回/.test(status) ? 'warning' : 'neutral'
  return `<span class="status-badge ${tone}">${escapeHtml(status)}</span>`
}

export function formFields(form, values = {}, { resourceFields = [] } = {}) {
  const definition = form || { fields: [] }
  const fields = definition.fields?.length ? definition.fields : resourceFields.map(name => ({ name, label: fieldLabels[name] || name, type: name === 'amount' || name === 'quantity' ? 'number' : 'text', required: name === 'name' }))
  return fields.map((item, index) => {
    if (item.hidden) return ''
    const value = values[item.name] ?? defaultValue(item, index)
    const required = item.required ? ' required' : ''
    const mark = item.required ? '<em>必填</em>' : '<small>选填</small>'
    if (item.system || item.readonly || item.generated) return `<div class="form-field form-field-system"><span>${escapeHtml(item.label)} ${mark}</span><input type="hidden" name="${escapeHtml(item.name)}" value="${escapeHtml(value || item.systemDefault || '')}"><b>${escapeHtml(value || item.systemDefault || '保存后自动生成')}</b><small>${escapeHtml(item.systemHint || '由系统根据当前业务信息自动生成，不能手工填写。')}</small></div>`
    const hint = item.helpText ? `<small class="field-hint">${escapeHtml(item.helpText)}</small>` : ''
    if (item.type === 'switch') return `<label class="form-field form-field-switch"><span>${escapeHtml(item.label)} ${mark}</span><input name="${escapeHtml(item.name)}" type="checkbox" value="已启用"${value === '已启用' ? ' checked' : ''}> <b>${value === '已启用' ? '已启用' : '已停用'}</b>${hint}</label>`
    if (item.type === 'textarea') return `<label class="form-field span-2"><span>${escapeHtml(item.label)} ${mark}</span><textarea name="${escapeHtml(item.name)}"${required}>${escapeHtml(value)}</textarea>${hint}</label>`
    if (['select', 'search-select', 'cascader'].includes(item.type)) {
      const optionLabels = item.optionLabels || {}
      const relationMeta = item.optionsSource
        ? ` data-options-source="${escapeHtml(item.optionsSource)}"${item.emptyText ? ` data-empty-text="${escapeHtml(item.emptyText)}"` : ''}${Object.keys(optionLabels).length ? ` data-option-labels="${escapeHtml(JSON.stringify(optionLabels))}"` : ''}`
        : ''
      const options = (item.options || []).map(option => `<option value="${escapeHtml(option)}" ${String(value) === String(option) ? 'selected' : ''}>${escapeHtml(optionLabels[option] || option)}</option>`).join('')
      const controlType = item.type === 'cascader' ? '级联选择' : item.type === 'search-select' ? '搜索选择' : '下拉选择'
      return `<label class="form-field"><span>${escapeHtml(item.label)} ${mark}</span><select name="${escapeHtml(item.name)}"${required} data-relation-select data-control-type="${controlType}"${item.dependsOn?.length ? ` data-depends-on="${escapeHtml(item.dependsOn.join(','))}"` : ''}${relationMeta}>${options}</select>${hint}</label>`
    }
    const rangePreview = item.name === 'resultMax'
      ? `<div class="form-field form-field-system talent-range-preview"><span>结果范围预览</span><output data-result-range-preview>${escapeHtml(talentRangePreview(values.resultMin ?? '', value))}</output><small>系统根据最小值和最大值自动生成，不能手工填写。</small></div>`
      : ''
    const rangeAttrs = ['resultMin', 'resultMax'].includes(item.name) ? ' data-result-range-input step="any"' : ''
    return `<label class="form-field"><span>${escapeHtml(item.label)} ${mark}</span><input name="${escapeHtml(item.name)}" type="${escapeHtml(item.type || 'text')}" value="${escapeHtml(value)}"${required}${rangeAttrs}>${hint}</label>${rangePreview}`
  }).join('')
}

function defaultValue(field, index) {
  const defaults = {
    name:'杭州健康管理业务', code:'TJ-' + String(index + 1).padStart(3, '0'), owner:'王主管', department:'健康管理中心', position:'业务专员',
    supplier:'安澜医疗用品有限公司', quantity:10, amount:1280, date:'2026-08-28', shift:'白班 08:00-17:00', subject:'行政用品申请', reason:'用于业务流程演示', note:'演示操作说明', opinion:'同意，按流程继续办理',
    receivedQty:10, inspectionNote:'数量和质量检查通过', warehouse:'杭州一号仓', location:'A-01-08', customer:'林女士', service:'健康管理服务', receiptNo:'PAY-20260828-01', invoiceNo:'INV-20260828-01', statementNo:'ST-20260828-01', refundAmount:100,
    externalReportNo:'EXT-RPT-20260828', externalCode:'EXT-ALT', standardCode:'STD-ALT', ruleVersion:'MED-2026.08', doctorOpinion:'已核对异常指标和医学关系，同意发布。', plan:'心血管复查方案', specialItem:'动态心电图',
    time:'2026-09-01T10:00', expert:'周专家', camera:'通过', network:'通过', signature:'周专家', contentSet:'成人天赋内容方案 A', editorNote:'已核对匹配内容', publishNote:'内容已复核，可发布', batch:'BATCH-20260828', method:'人工补录并复核', operation:'领用', node:'申请人', transferTo:'钱主管'
  }
  if (['resultMin', 'resultMax'].includes(field.name)) return ''
  return defaults[field.name] ?? (field.type === 'number' ? 1 : '')
}

export function modalShell({ title, subtitle = '', body, footer = '' }) {
  return `<div class="modal-backdrop" data-action="close-modal"><section class="modal-panel" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}" data-modal-panel>
    <header class="modal-head"><div><span>业务操作</span><h2>${escapeHtml(title)}</h2>${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}</div><button class="icon-button" type="button" data-action="close-modal" aria-label="关闭">×</button></header>
    <div class="modal-body">${body}</div>${footer ? `<footer class="modal-foot">${footer}</footer>` : ''}
  </section></div>`
}

export function actionForm({ action, resourceId = '', record = null, title = '', description = '' }) {
  const form = getActionForm(action) || { title: title || '执行业务操作', fields: [] }
  return `<form class="operation-form" data-action="save-form" data-form-action="${escapeHtml(action)}" data-resource="${escapeHtml(resourceId)}" data-record="${escapeHtml(record?.id || '')}">
    ${description ? `<div class="form-explain"><b>本次处理会发生什么</b><p>${escapeHtml(description)}</p></div>` : ''}
    <div class="form-grid">${formFields(form, record || {})}</div>
    <div class="form-submit"><button class="btn ghost" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">${escapeHtml(form.title || title || '完成操作')}</button></div>
  </form>`
}

export function detailList(record) {
  if (!record) return '<div class="empty-state">未找到记录</div>'
  const hidden = new Set(['id','code','referenced','draft','lastPayload'])
  return `<dl class="detail-list">${Object.entries(record).filter(([key]) => !hidden.has(key) && !(key === 'systemNo' && record.inboundNo)).map(([key, value]) => `<div><dt>${escapeHtml(fieldLabels[key] || key)}</dt><dd>${escapeHtml(typeof value === 'object' ? JSON.stringify(value) : value)}</dd></div>`).join('')}</dl>`
}

export function emptyState(title, description) {
  return `<div class="empty-state"><div>⌁</div><b>${escapeHtml(title)}</b><p>${escapeHtml(description)}</p></div>`
}
