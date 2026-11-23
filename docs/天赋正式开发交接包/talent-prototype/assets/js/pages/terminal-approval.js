import { escapeHtml, statusBadge } from '../components.js?v=talent-1.0.8'
import { roles } from '../data.js?v=talent-1.0.8'

const approvalHref = panel => `#/terminal?terminal=admin&section=approval&panel=${encodeURIComponent(panel)}`
const text = value => escapeHtml(value === undefined || value === null || value === '' ? '-' : value)
const approvalState = state => state.approval || { forms:[], flows:[], instances:[], tasks:[], messages:[], notices:[], expressions:[], listeners:[] }
const button = (label, attrs = '', tone = 'secondary') => `<button class="btn ${tone} small" type="button" ${attrs}>${escapeHtml(label)}</button>`
const routeButton = (label, panel, tone = 'secondary') => button(label, `data-approval-route="${escapeHtml(panel)}"`, tone)
const panelResource = {
  'BPM 工作台':'approval-dashboard', '流程表单':'approval-form-list', '表单设计':'approval-form-designer',
  '表单预览':'approval-form-preview', '版本记录':'approval-form-version', '流程定义':'approval-flow-list',
  '流程设计':'approval-flow-editor', '流程发起':'approval-start', '我的待办':'approval-todo',
  '已办任务':'approval-done', '我发起的流程':'approval-my-process', '流程详情':'approval-detail',
  '消息与公告':'approval-message', '表达式管理':'approval-expression', '监听器管理':'approval-listener'
}

const panelShell = (eyebrow, title, summary, body, actions = '') => `<section class="terminal-card terminal-axure-panel approval-bpm-panel" data-terminal-resource="${escapeHtml(panelResource[eyebrow] || 'approval-dashboard')}"><header><div><span class="eyebrow">审批协同 · ${escapeHtml(eyebrow)}</span><h2>${escapeHtml(title)}</h2><p>${escapeHtml(summary)}</p></div><div class="terminal-action-row approval-bpm-actions">${actions}</div></header>${body}</section>`

const formTypeLabel = type => ({ text:'单行文本', textarea:'多行文本', number:'数字', money:'金额', date:'日期', datetime:'日期时间', time:'时间', select:'下拉', radio:'单选', checkbox:'多选', switch:'开关', user:'人员', department:'部门', file:'附件', detail:'明细表格', readonly:'只读文本' }[type] || String(type || '未知控件'))
const formControl = (field, attributes = '') => {
  const name = `name="${escapeHtml(field.name)}" ${attributes}`
  const options = (field.options || ['选项一','选项二']).map(option => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join('')
  if (field.type === 'textarea') return `<textarea ${name}></textarea>`
  if (field.type === 'number' || field.type === 'money') return `<input ${name} type="number" step="${field.type === 'money' ? '0.01' : '1'}">`
  if (field.type === 'date') return `<input ${name} type="date">`
  if (field.type === 'datetime') return `<input ${name} type="datetime-local">`
  if (field.type === 'time') return `<input ${name} type="time">`
  if (field.type === 'select') return `<select ${name}><option value="">请选择</option>${options}</select>`
  if (field.type === 'radio') return `<span class="approval-bpm-choice"><label><input ${name} type="radio" value="选项一">选项一</label><label><input ${name} type="radio" value="选项二">选项二</label></span>`
  if (field.type === 'checkbox') return `<span class="approval-bpm-choice"><label><input ${name} type="checkbox" value="选项一">选项一</label><label><input ${name} type="checkbox" value="选项二">选项二</label></span>`
  if (field.type === 'switch') return `<label class="approval-bpm-switch"><input ${name} type="checkbox"><i></i><span>启用</span></label>`
  if (field.type === 'user') return `<select ${name}><option value="">请选择人员</option>${roles.map(role => `<option value="${escapeHtml(role.name)}">${escapeHtml(role.name)}</option>`).join('')}</select>`
  if (field.type === 'department') return `<select ${name}><option value="">请选择部门</option><option>采购管理部</option><option>财务经营部</option><option>健康管理中心</option></select>`
  if (field.type === 'file') return `<input ${name} type="file">`
  if (field.type === 'detail') return `<textarea ${name} placeholder="明细表格：物料、数量、单价（每行一条）"></textarea>`
  if (field.type === 'readonly') return `<input ${name} value="系统自动带入" readonly>`
  return `<input ${name} type="text">`
}

function renderDashboard(state) {
  const data = approvalState(state)
  const pending = data.tasks.filter(item => !['已完成','已驳回','已退回','已撤销'].includes(item.status)).length
  const running = data.instances.filter(item => /审批中|待补充/.test(item.status)).length
  const unread = data.messages.filter(item => item.unread).length
  const cards = [
    ['待处理任务', pending, '待办审批、认领和转办', 'approval-todo'],
    ['运行中流程', running, '流程实例及当前节点', 'approval-my-process'],
    ['未读消息', unread, '待办提醒与业务通知', 'approval-message'],
    ['已发布定义', data.flows.filter(item => item.status === '已发布').length, '流程版本与运行记录', 'approval-flow-list']
  ].map(([label, value, note, panel]) => `<a class="approval-bpm-metric" href="${approvalHref(panel)}"><span>${label}</span><b>${value}</b><small>${note}</small><i>进入处理 →</i></a>`).join('')
  const steps = [['1','表单设计','配置动态字段、校验和版本'],['2','流程设计','BPMN 节点、条件和审批人'],['3','流程发起','渲染表单并提交候选人'],['4','审批闭环','待办办理、轨迹、消息回写']].map(([n,t,d]) => `<article><b>${n}</b><div><strong>${t}</strong><span>${d}</span></div></article>`).join('')
  const summaryRows = data.instances.map(instance => `<tr><td>${text(instance.title)}</td><td>${text(instance.resourceId)}</td><td>${statusBadge(text(instance.status))}</td><td><a class="btn-link" href="${approvalHref('approval-detail')}&record=${encodeURIComponent(instance.id)}">查看流程详情</a></td></tr>`).join('') || '<tr><td colspan="4" class="table-empty">暂无流程实例</td></tr>'
  return panelShell('BPM 工作台', '审批协同工作台', '从流程表单到业务状态回写，在一个受控 BPM 闭环内完成审批协同。', `<div class="approval-bpm-metric-grid">${cards}</div><div class="approval-bpm-journey"><header><h3>采购申请审批闭环</h3><span>采购申请为主演示链路，退款申请用于高风险审批</span></header><div>${steps}</div></div><div class="approval-bpm-quick-links">${routeButton('设计流程表单','approval-form-list','primary')}${routeButton('打开流程定义','approval-flow-list')}${routeButton('发起采购申请','approval-start')}${routeButton('处理我的待办','approval-todo')}</div><div class="terminal-table terminal-axure-table approval-bpm-summary"><table><thead><tr><th>流程实例</th><th>业务对象</th><th>状态</th><th>操作</th></tr></thead><tbody>${summaryRows}</tbody></table></div>`)
}

function renderFormRows(data, mode = 'list') {
  return data.forms.map(form => `<tr><td><b>${text(form.name)}</b><small>${text(form.code)}</small></td><td>V${text(form.version)}</td><td>${form.fields?.length || 0} 个字段</td><td>${statusBadge(text(form.status))}</td><td>${form.usageRecords?.length || 0} 个流程</td><td>${mode === 'list' ? `<a class="btn-link" href="${approvalHref('approval-form-designer')}&record=${encodeURIComponent(form.id)}">设计</a><a class="btn-link" href="${approvalHref('approval-form-preview')}&record=${encodeURIComponent(form.id)}">预览</a><button class="btn-link" data-approval-action="copy-form" data-form-id="${escapeHtml(form.id)}">复制</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="6" class="table-empty">暂无审批表单</td></tr>'
}

function renderFormList(state) {
  const data = approvalState(state)
  const body = `<div class="approval-bpm-toolbar"><label>关键词 <input placeholder="表单名称/编码" data-approval-filter></label>${routeButton('新建表单','approval-form-designer','primary')}<span>支持设计、预览、发布、撤回、版本和使用记录</span></div><div class="terminal-table terminal-axure-table"><table><thead><tr><th>表单名称</th><th>版本</th><th>字段</th><th>状态</th><th>使用流程</th><th>操作</th></tr></thead><tbody>${renderFormRows(data)}</tbody></table></div>`
  return panelShell('流程表单', '流程表单管理', '管理动态表单定义，发布后由流程发起页面按字段配置渲染。', body)
}

function renderFieldEditor(form) {
  const fields = form.fields || []
  const palette = ['text','textarea','number','money','date','datetime','time','select','radio','checkbox','switch','user','department','file','detail','readonly']
  const paletteHtml = palette.map(type => `<button type="button" class="approval-bpm-palette-item" draggable="true" data-approval-action="add-form-field" data-form-id="${escapeHtml(form.id)}" data-field-type="${escapeHtml(type)}"><span>${text(formTypeLabel(type))}</span><small>${text(type)}</small></button>`).join('')
  const rows = fields.map((field,index) => `<article class="approval-bpm-field-row" draggable="true" data-field-id="${escapeHtml(field.id)}"><div class="approval-bpm-drag">☷</div><div><b>${text(field.label)}</b><span>${text(formTypeLabel(field.type))} · ${field.required ? '必填' : '选填'}</span></div><div class="approval-bpm-field-actions"><button class="btn-link" type="button" data-approval-action="sort-form-field" data-form-id="${escapeHtml(form.id)}" data-field-id="${escapeHtml(field.id)}" data-delta="-1" ${index === 0 ? 'disabled' : ''}>上移</button><button class="btn-link" type="button" data-approval-action="sort-form-field" data-form-id="${escapeHtml(form.id)}" data-field-id="${escapeHtml(field.id)}" data-delta="1" ${index === fields.length - 1 ? 'disabled' : ''}>下移</button><button class="btn-link danger" type="button" data-approval-action="remove-form-field" data-form-id="${escapeHtml(form.id)}" data-field-id="${escapeHtml(field.id)}">删除</button></div></article>`).join('') || '<div class="approval-bpm-empty">从左侧拖入或点击控件，开始设计动态表单</div>'
  const selectedField = fields[0]
  const fieldProperties = selectedField ? `<label>字段名称<input value="${text(selectedField.label)}" data-approval-field-label></label><label><span>字段必填</span><input type="checkbox" data-approval-field-required ${selectedField.required ? 'checked' : ''}></label><button class="btn primary small" type="button" data-approval-action="update-form" data-form-id="${escapeHtml(form.id)}" data-field-id="${escapeHtml(selectedField.id)}">保存表单与字段属性</button>` : ''
  return `<div class="approval-bpm-designer"><aside class="approval-bpm-palette"><h3>控件库</h3><p>拖拽/点击添加字段</p>${paletteHtml}</aside><section class="approval-bpm-canvas"><header><div><span class="eyebrow">${text(form.code)}</span><h3>${text(form.name)}</h3><span>V${text(form.version)} · ${text(form.status)}</span></div><div>${routeButton('预览','approval-form-preview')}${routeButton('版本记录','approval-form-version')}</div></header><div class="approval-bpm-field-list">${rows}</div></section><aside class="approval-bpm-properties"><h3>表单属性</h3><label>表单名称<input value="${text(form.name)}" data-approval-form-name data-form-id="${escapeHtml(form.id)}"></label><label>关联业务<select data-approval-form-resource data-form-id="${escapeHtml(form.id)}"><option value="purchase-request"${form.resourceId === 'purchase-request' ? ' selected' : ''}>采购申请</option><option value="finance-refund"${form.resourceId === 'finance-refund' ? ' selected' : ''}>退款申请</option></select></label>${fieldProperties}<div class="approval-bpm-property-note"><b>安全校验</b><span>仅允许受控字段和业务字典，不执行任意脚本。</span></div></aside></div>`
}

function renderFormDesigner(state, query) {
  const data = approvalState(state)
  const form = data.forms.find(item => item.id === query.record) || data.forms[0] || { id:'FORM-NEW', name:'新建审批表单', code:'FORM-NEW', version:1, status:'草稿', fields:[] }
  const actions = `${button('保存草稿', `data-approval-action="save-form" data-form-id="${escapeHtml(form.id)}"`, 'primary')}${button('发布表单', `data-approval-action="publish-form" data-form-id="${escapeHtml(form.id)}"`)}${routeButton('返回列表','approval-form-list')}`
  return panelShell('表单设计', '动态表单设计器', '支持拖入、排序、复制、删除、必填校验、预览、JSON 版本和使用记录。', renderFieldEditor(form), actions)
}

function renderFormPreview(state, query) {
  const data = approvalState(state)
  const form = data.forms.find(item => item.id === query.record) || data.forms[0]
  if (!form) return panelShell('表单预览', '动态表单预览', '暂无可预览表单', '<div class="approval-bpm-empty">请先设计并保存表单。</div>')
  const controls = (form.fields || []).map(field => `<label class="approval-bpm-preview-field"><span>${text(field.label)}${field.required ? ' *' : ''}</span>${formControl(field, `placeholder="${text(field.label)}"`)}</label>`).join('')
  return panelShell('表单预览', text(form.name), '以正式发起页面的动态渲染结果预览字段、校验和附件入口。', `<div class="approval-bpm-preview"><div class="approval-bpm-preview-meta"><span>V${text(form.version)}</span>${statusBadge(text(form.status))}<small>提交后将进入关联流程</small></div><div class="approval-bpm-preview-grid">${controls}</div><div class="approval-bpm-preview-actions">${routeButton('返回设计','approval-form-designer')}${routeButton('发起此流程','approval-start','primary')}</div></div>`)
}

function renderFormVersion(state, query) {
  const data = approvalState(state)
  const form = data.forms.find(item => item.id === query.record) || data.forms[0]
  const versions = form?.versions || [{ version:form?.version || 1, status:form?.status || '草稿' }]
  const rows = versions.map(item => `<tr><td>V${text(item.version)}</td><td>${statusBadge(text(item.status))}</td><td>${item.version === form?.version ? '当前版本' : '历史快照'}</td><td><button class="btn-link" data-approval-action="restore-form-version" data-form-id="${escapeHtml(form?.id || '')}" data-version="${escapeHtml(item.version)}">查看快照</button></td></tr>`).join('')
  return panelShell('版本记录', `${text(form?.name)} · 版本`, '每次发布、撤回或字段调整都会形成可追溯版本，并记录使用流程。', `<div class="terminal-table terminal-axure-table"><table><thead><tr><th>版本</th><th>状态</th><th>说明</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table></div><div class="approval-bpm-usage"><b>使用记录</b><span>${(form?.usageRecords || []).join('、') || '暂无关联流程'}</span></div>`, routeButton('返回设计','approval-form-designer'))
}

const nodeLabel = node => ({ start:'开始', approval:'审批', condition:'条件', cc:'抄送', counterSign:'会签', end:'结束' }[node.type] || node.name)

function renderFlowCanvas(flow) {
  const nodes = flow?.nodes || []
  const edges = flow?.edges || []
  const nodeHtml = nodes.map(node => `<article class="approval-bpm-node approval-bpm-node-${escapeHtml(node.type)}" data-node-id="${escapeHtml(node.id)}"><span>${text(nodeLabel(node))}</span><b>${text(node.name)}</b><small>${node.type === 'approval' || node.type === 'counterSign' ? `审批人：${text(node.assignee || node.assigneeType || '候选用户')}` : node.type === 'condition' ? `表达式：${text(node.expression)}` : node.type === 'cc' ? `抄送：${text(node.assignee || '指定人员')}` : '流程节点'}</small><div>${button('上移', `data-approval-action="sort-flow-node" data-flow-id="${escapeHtml(flow.id)}" data-node-id="${escapeHtml(node.id)}" data-delta="-1"`)} ${button('删除', `data-approval-action="remove-flow-node" data-flow-id="${escapeHtml(flow.id)}" data-node-id="${escapeHtml(node.id)}"`, 'danger-outline')}</div></article>`).join('')
  const edgeHtml = edges.map(edge => `<span class="approval-bpm-edge"><i>${text(edge.source)}</i> → <i>${text(edge.target)}</i>${edge.label ? ` · ${text(edge.label)}` : ''}</span>`).join('')
  const branchNode = nodes.find(node => node.type === 'condition')
  const branches = (branchNode?.branches || []).map(branch => `<li>${text(branch.label)} <code>${text(branch.expression)}</code></li>`).join('') || '<li>暂无条件分支</li>'
  const nodePalette = [
    ['start','开始'], ['approval','审批'], ['condition','条件'], ['cc','抄送'], ['counterSign','会签'], ['end','结束']
  ].map(([type,label]) => button(`新增${label}`, `data-approval-action="add-flow-node" data-flow-id="${escapeHtml(flow.id)}" data-node-type="${type}"`, type === 'approval' ? 'primary' : 'secondary')).join('')
  const addBranchAttrs = `data-approval-action="add-flow-branch" data-flow-id="${escapeHtml(flow.id)}" data-node-id="${escapeHtml(branchNode?.id || '')}"`
  const approvalNode = nodes.find(node => node.type === 'approval' || node.type === 'counterSign')
  return `<div class="approval-bpm-flow-layout"><section class="approval-bpm-flow-canvas"><div class="approval-bpm-flow-toolbar"><span>拖拽节点 · 连线 connection / edge</span>${nodePalette}</div><div class="approval-bpm-node-list">${nodeHtml}</div><div class="approval-bpm-edges"><b>连线</b>${edgeHtml}</div></section><aside class="approval-bpm-flow-properties"><h3>节点属性</h3><label>关联表单<select data-approval-flow-form data-flow-id="${escapeHtml(flow.id)}">${['FORM-PURCHASE-001','FORM-REFUND-001'].map(id => `<option value="${id}"${flow.formId === id ? ' selected' : ''}>${id}</option>`).join('')}</select></label><label>审批人来源<select data-approval-assignee-source>${['指定人员','候选用户','岗位/角色','部门负责人','发起人上级','表单字段'].map(label => `<option value="${label}"${approvalNode?.assigneeType === label ? ' selected' : ''}>${label}</option>`).join('')}</select></label><button class="btn primary small" type="button" data-approval-action="update-flow" data-flow-id="${escapeHtml(flow.id)}" data-node-id="${escapeHtml(approvalNode?.id || '')}">保存表单关联与审批人</button><div class="approval-bpm-branch-box"><b>条件分支</b><ul>${branches}</ul>${button('新增分支', addBranchAttrs)}</div><div class="approval-bpm-property-note"><b>表达式</b><span>${(flow?.expressions || []).map(text).join('、') || 'amount > 10000'}</span><b>监听器</b><span>${(flow?.listeners || []).map(text).join('、') || '任务完成监听器'}</span></div></aside></div>`
}

function renderFlowList(state) {
  const data = approvalState(state)
  const rows = data.flows.map(flow => `<tr><td><b>${text(flow.name)}</b><small>${text(flow.code)}</small></td><td>V${text(flow.version)}</td><td>${text(flow.formId)}</td><td>${flow.nodes?.length || 0} 节点 / ${flow.edges?.length || 0} 连线</td><td>${statusBadge(text(flow.status))}</td><td>${text(flow.runCount || 0)}</td><td><a class="btn-link" href="${approvalHref('approval-flow-editor')}&record=${encodeURIComponent(flow.id)}">设计</a><button class="btn-link" data-approval-action="copy-flow" data-flow-id="${escapeHtml(flow.id)}">复制</button><button class="btn-link" data-approval-action="publish-flow" data-flow-id="${escapeHtml(flow.id)}">发布</button><button class="btn-link" data-approval-action="withdraw-flow" data-flow-id="${escapeHtml(flow.id)}">撤回</button><button class="btn-link" data-approval-action="enable-flow" data-flow-id="${escapeHtml(flow.id)}">启用</button><button class="btn-link" data-approval-action="disable-flow" data-flow-id="${escapeHtml(flow.id)}">停用</button></td></tr>`).join('') || '<tr><td colspan="7" class="table-empty">暂无流程定义</td></tr>'
  return panelShell('流程定义', 'BPM 流程定义管理', '维护流程版本、节点、审批人、条件分支、启停状态和运行记录。', `<div class="approval-bpm-toolbar">${routeButton('新建流程','approval-flow-editor','primary')}<span>开始、审批、条件、抄送、会签、结束及连线均可在设计器维护。</span></div><div class="terminal-table terminal-axure-table"><table><thead><tr><th>流程名称</th><th>版本</th><th>关联表单</th><th>结构</th><th>状态</th><th>运行次数</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table></div>`)
}

function renderFlowEditor(state, query) {
  const data = approvalState(state)
  const flow = data.flows.find(item => item.id === query.record) || data.flows[0] || { id:'FLOW-NEW', name:'新建审批流程', formId:'FORM-PURCHASE-001', version:1, status:'草稿', nodes:[], edges:[] }
  const saveAttrs = `data-approval-action="save-flow" data-flow-id="${escapeHtml(flow.id)}"`
  const publishAttrs = `data-approval-action="publish-flow" data-flow-id="${escapeHtml(flow.id)}"`
  return panelShell('流程设计', 'BPM 流程设计器', '以静态 BPMN 画布呈现节点、连线、条件、审批人、表达式、监听器和动态表单关联。', renderFlowCanvas(flow), `${button('保存草稿', saveAttrs, 'primary')}${button('发布流程', publishAttrs)}${routeButton('运行记录','approval-my-process')}${routeButton('返回列表','approval-flow-list')}`)
}

function renderStart(state, query = {}) {
  const data = approvalState(state)
  const flows = data.flows.filter(item => item.status === '已发布')
  const selectedFlow = flows.find(item => item.id === query.flowId) || flows[0]
  const form = data.forms.find(item => item.id === selectedFlow?.formId) || data.forms.find(item => item.status === '已发布')
  const fields = (form?.fields || []).map(field => `<label class="approval-bpm-preview-field"><span>${text(field.label)}${field.required ? ' *' : ''}</span>${formControl(field, field.required ? 'required' : '')}</label>`).join('')
  const candidates = roles.filter(role => ['approver','finance','buyer','hr'].includes(role.id)).map(role => `<option value="${escapeHtml(role.name)}">${escapeHtml(role.name)}</option>`).join('')
  const isRefund = selectedFlow?.name?.includes('退款')
  const resourceId = isRefund ? 'finance-refund' : 'purchase-request'
  const businessId = isRefund ? 'RF-202608-004' : 'PR-202608-012'
  return panelShell('流程发起', '发起审批流程', '选择已发布流程，动态加载业务表单，保存草稿或提交后生成下一节点待办。', `<form class="approval-bpm-start-form" data-approval-submit="submit"><div class="approval-bpm-start-head"><label>流程<select name="flowId" data-approval-flow-select>${flows.map(item => `<option value="${escapeHtml(item.id)}"${item.id === selectedFlow?.id ? ' selected' : ''}>${text(item.name)}</option>`).join('')}</select></label><label>业务单据<select name="resourceId"><option value="${resourceId}">${isRefund ? '退款申请' : '采购申请'}</option></select></label><label>业务编号<input name="businessId" value="${businessId}" required></label><label>下一节点候选人<select name="candidateUser"><option value="">按流程默认审批人</option>${candidates}</select></label></div><div class="approval-bpm-preview-grid">${fields}</div><label class="approval-bpm-wide-field"><span>审批附件</span><input name="attachments" placeholder="报价单、合同或退款凭证文件名"></label><div class="approval-bpm-preview-actions"><button class="btn ghost" type="button" data-approval-submit="draft">保存草稿</button><button class="btn primary" type="submit">提交审批并选择下一节点候选人</button></div></form>`)
}

function taskRows(tasks, data) {
  return tasks.map(task => { const instance = data.instances.find(item => item.id === task.instanceId); return `<tr><td><b>${text(instance?.title || task.businessId)}</b><small>${text(task.id)}</small></td><td>${text(task.nodeName)}</td><td>${text(task.assignee || '待认领')}</td><td>${statusBadge(text(task.status))}</td><td>${text(task.updatedAt || task.createdAt)}</td><td><a class="btn-link" href="${approvalHref('approval-detail')}&record=${encodeURIComponent(task.instanceId)}">查看详情</a>${task.status === '待处理' ? `<button class="btn-link" data-approval-action="approve" data-task-id="${escapeHtml(task.id)}">同意</button><button class="btn-link" data-approval-action="return" data-task-id="${escapeHtml(task.id)}">退回</button>` : ''}</td></tr>` }).join('') || '<tr><td colspan="6" class="table-empty">暂无任务</td></tr>'
}

function renderTasks(state, type) {
  const data = approvalState(state)
  const tasks = type === 'todo' ? data.tasks.filter(item => !['已完成','已驳回','已退回','已撤销'].includes(item.status)) : data.tasks.filter(item => ['已完成','已驳回','已退回'].includes(item.status))
  const title = type === 'todo' ? '我的待办' : '已办任务'
  return panelShell(title, title, type === 'todo' ? '认领、取消认领、同意、驳回、退回、补充材料、转办和委派任务。' : '只展示已完成或已退回的任务，不复用审批申请列表。', `<div class="approval-bpm-toolbar">${type === 'todo' ? routeButton('发起流程','approval-start','primary') : routeButton('查看我发起流程','approval-my-process')}<span>任务来源：采购申请、退款申请及行政审批</span></div><div class="terminal-table terminal-axure-table"><table><thead><tr><th>流程</th><th>当前节点</th><th>办理人</th><th>状态</th><th>更新时间</th><th>操作</th></tr></thead><tbody>${taskRows(tasks, data)}</tbody></table></div>`)
}

function renderMyProcess(state) {
  const data = approvalState(state)
  const currentRoleName = roles.find(role => role.id === state.currentRole)?.name || state.currentRole
  const rows = data.instances.filter(instance => !instance.initiator || instance.initiator === currentRoleName).map(instance => `<tr><td><b>${text(instance.title)}</b><small>${text(instance.id)}</small></td><td>${text(instance.resourceId)}</td><td>${text(instance.initiator)}</td><td>${text(instance.currentNodeId || '已结束')}</td><td>${statusBadge(text(instance.status))}</td><td><a class="btn-link" href="${approvalHref('approval-detail')}&record=${encodeURIComponent(instance.id)}">查看流程详情</a></td></tr>`).join('') || '<tr><td colspan="6" class="table-empty">当前角色暂无发起流程</td></tr>'
  return panelShell('我发起的流程', '我发起的流程 / 流程实例', `仅展示当前角色（${currentRoleName}）发起的流程实例；可查看动态表单、流程图和流转轨迹。`, `<div class="terminal-table terminal-axure-table"><table><thead><tr><th>流程实例</th><th>业务对象</th><th>发起人</th><th>当前节点</th><th>状态</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table></div>`)
}

function renderDetail(state, query) {
  const data = approvalState(state)
  const instance = data.instances.find(item => item.id === query.record) || data.instances[0]
  const flow = data.flows.find(item => item.id === instance?.flowId)
  const task = data.tasks.find(item => item.instanceId === instance?.id && !['已完成','已驳回','已退回'].includes(item.status))
  if (!instance) return panelShell('流程详情', '流程详情', '暂无流程实例', '<div class="approval-bpm-empty">请先发起审批流程。</div>')
  const formRows = Object.entries(instance.formData || {}).filter(([key]) => !['id','status','updatedAt'].includes(key)).map(([key,value]) => `<div><dt>${text(key)}</dt><dd>${text(value)}</dd></div>`).join('')
  const traceRows = (instance.history || instance.records || []).map(item => `<li><b>${text(item.action)}</b><span>${text(item.nodeName || item.nodeId)} · ${text(item.actor)} · ${text(item.time)}</span><small>${text(item.detail)}</small></li>`).join('') || '<li>暂无流转轨迹</li>'
  const recordRows = (instance.records || instance.history || []).map(item => `<tr><td>${text(item.nodeName || item.nodeId)}</td><td>${text(item.action)}</td><td>${text(item.actor)}</td><td>${text(item.time)}</td><td>${text(item.detail)}</td></tr>`).join('')
  const taskOptions = roles.map(role => `<option value="${escapeHtml(role.name)}">${escapeHtml(role.name)}</option>`).join('')
  const taskInputs = task ? `<div class="approval-bpm-task-inputs"><label>审批意见 / 处理说明<textarea data-approval-task-opinion placeholder="请填写同意、驳回、退回或协同处理说明"></textarea></label><label>转办 / 委派 / 指定办理人<select data-approval-task-assignee><option value="">按当前角色处理</option>${taskOptions}</select></label><label>审批附件<input data-approval-task-attachments placeholder="补充材料、凭证文件名（逗号分隔）"></label></div>` : ''
  const actions = task ? `${button('同意', `data-approval-action="approve" data-task-id="${escapeHtml(task.id)}"`, 'primary')}${button('驳回', `data-approval-action="reject" data-task-id="${escapeHtml(task.id)}"`, 'danger-outline')}${button('退回', `data-approval-action="return" data-task-id="${escapeHtml(task.id)}"`)}${button('补充材料', `data-approval-action="supplement" data-task-id="${escapeHtml(task.id)}"`)}${button('认领', `data-approval-action="claim" data-task-id="${escapeHtml(task.id)}"`)}${button('取消认领', `data-approval-action="unclaim" data-task-id="${escapeHtml(task.id)}"`)}${button('转办', `data-approval-action="transfer" data-task-id="${escapeHtml(task.id)}"`)}${button('委派', `data-approval-action="delegate" data-task-id="${escapeHtml(task.id)}"`)}${button('解决委派', `data-approval-action="resolve" data-task-id="${escapeHtml(task.id)}"`)}${button('指定办理人', `data-approval-action="assign" data-task-id="${escapeHtml(task.id)}"`)}` : ''
  const diagram = (flow?.nodes || []).map(node => `<span class="approval-bpm-detail-node approval-bpm-node-${escapeHtml(node.type)}">${text(nodeLabel(node))}<small>${text(node.name)}</small></span>`).join('<i>→</i>')
  const messageRows = data.messages.filter(item => item.instanceId === instance.id || item.businessId === instance.businessId).map(item => `<li>${text(item.title)} · ${text(item.content)} · ${text(item.createdAt)}</li>`).join('') || '<li>暂无消息</li>'
  const auditRows = (state.audit || []).filter(item => item.targetId === instance.businessId || item.targetId === instance.id || item.resourceId === 'approval-task').slice(0, 8).map(item => `<li>${text(item.time)} · ${text(item.actor)} · ${text(item.action)} · ${text(item.detail)}</li>`).join('') || '<li>暂无审计记录</li>'
  return panelShell('流程详情', text(instance.title), '流程实例详情：动态表单、BPMN 流程图、节点轨迹、审批记录、附件、消息和审计。', `<div class="approval-bpm-detail-grid"><section><h3>动态表单 / 业务单据</h3><dl class="approval-bpm-detail-dl">${formRows}</dl><div class="approval-bpm-attachments"><b>审批附件</b><span>${(instance.attachments || []).map(text).join('、') || '暂无附件'}</span></div></section><section><h3>流程图 BPMN diagram</h3><div class="approval-bpm-detail-diagram">${diagram}</div><div class="approval-bpm-current-node"><b>当前节点</b><span>${text(instance.currentNodeId || '流程已结束')}</span></div></section></div><section class="approval-bpm-trace"><h3>节点轨迹 / 流转轨迹 timeline</h3><ol>${traceRows}</ol></section><section class="approval-bpm-records"><h3>审批记录 / 处理记录</h3><div class="terminal-table terminal-axure-table"><table><thead><tr><th>节点</th><th>动作</th><th>处理人</th><th>时间</th><th>意见</th></tr></thead><tbody>${recordRows || '<tr><td colspan="5">暂无审批记录</td></tr>'}</tbody></table></div></section><section class="approval-bpm-audit"><h3>消息通知与审计 audit</h3><div class="approval-bpm-audit-columns"><ul>${messageRows}</ul><ul>${auditRows}</ul></div></section>${taskInputs}<div class="approval-bpm-detail-actions">${actions}${routeButton('返回待办','approval-todo')}${routeButton('返回流程实例','approval-my-process')}</div>`)
}

function renderMessages(state) {
  const data = approvalState(state)
  const messages = data.messages.map(item => `<article class="approval-bpm-message ${item.unread ? 'is-unread' : ''}"><div><b>${text(item.title)}</b><span>${text(item.type)} · ${text(item.createdAt)}</span></div><p>${text(item.content)}</p><button class="btn-link" data-approval-action="read-message" data-message-id="${escapeHtml(item.id)}">${item.unread ? '标记已读' : '已读'}</button></article>`).join('') || '<div class="approval-bpm-empty">暂无审批消息</div>'
  const notices = data.notices.map(item => `<article class="approval-bpm-notice"><b>${text(item.title)}</b><span>${text(item.status)} · ${text(item.createdAt)}</span><p>${text(item.content)}</p></article>`).join('')
  return panelShell('消息与公告', '流程消息/公告', '聚合待办提醒、业务通知、超时提醒、公告和审批审计消息。', `<div class="approval-bpm-message-grid"><section><h3>业务消息</h3>${messages}</section><section><h3>公告</h3>${notices || '<div class="approval-bpm-empty">暂无公告</div>'}</section></div>`)
}

function renderAuxList(state, type) {
  const rows = approvalState(state)[type].map(item => `<tr><td><b>${text(item.name || item.title)}</b></td><td>${text(item.expression || item.event || item.handler || item.content)}</td><td>${statusBadge(text(item.status || '启用'))}</td><td><button class="btn-link" data-approval-action="update-${type.slice(0,-1)}" data-${type.slice(0,-1)}-id="${escapeHtml(item.id)}">编辑</button></td></tr>`).join('') || '<tr><td colspan="4" class="table-empty">暂无配置</td></tr>'
  const title = type === 'expressions' ? '表达式管理' : '监听器管理'
  const configFields = type === 'expressions'
    ? '<label>名称<input data-approval-config-name value="采购金额条件"></label><label>受控条件<input data-approval-config-content value="amount > 10000"></label>'
    : '<label>名称<input data-approval-config-name value="审批消息监听器"></label><label>事件处理器<input data-approval-config-content value="任务完成 / 消息通知"></label>'
  return panelShell(title, title, type === 'expressions' ? '受控表达式仅用于条件分支判断，不执行任意脚本。' : '维护流程提交、任务完成、审批通过等事件监听器。', `<div class="approval-bpm-toolbar">${configFields}${button(type === 'expressions' ? '新增表达式' : '新增监听器', `data-approval-action="add-${type.slice(0,-1)}"`, 'primary')}<span>配置变更会形成审计记录</span></div><div class="terminal-table terminal-axure-table"><table><thead><tr><th>名称</th><th>${type === 'expressions' ? '表达式' : '事件/处理器'}</th><th>状态</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table></div>`)
}

export function renderApprovalContent(state, panel = 'approval-dashboard', query = {}) {
  if (panel === 'approval-dashboard' || panel === 'approval-workbench') return renderDashboard(state)
  if (panel === 'approval-form-list' || panel === 'approval-form') return renderFormList(state)
  if (panel === 'approval-form-designer') return renderFormDesigner(state, query)
  if (panel === 'approval-form-preview') return renderFormPreview(state, query)
  if (panel === 'approval-form-version') return renderFormVersion(state, query)
  if (panel === 'approval-flow-list' || panel === 'approval-flow') return renderFlowList(state)
  if (panel === 'approval-flow-editor') return renderFlowEditor(state, query)
  if (panel === 'approval-start') return renderStart(state, query)
  if (panel === 'approval-todo' || panel === 'approval-task') return renderTasks(state, 'todo')
  if (panel === 'approval-done') return renderTasks(state, 'done')
  if (panel === 'approval-my-process' || panel === 'approval-application') return renderMyProcess(state)
  if (panel === 'approval-detail') return renderDetail(state, query)
  if (panel === 'approval-message' || panel === 'approval-notice') return renderMessages(state)
  if (panel === 'approval-expression') return renderAuxList(state, 'expressions')
  if (panel === 'approval-listener') return renderAuxList(state, 'listeners')
  return renderDashboard(state)
}
