import { resourceRegistry, workbenchRegistry as generatedWorkbenchRegistry } from './catalog-data.js?v=talent-1.0.8'

const catalogById = resourceId => resourceRegistry.find(item => item.id === resourceId)
const catalogBackedResources = new Set([
  'purchase-order',
  'inventory-inbound',
  'asset-category',
  'asset-card',
  'asset-use',
  'asset-return',
  'asset-transfer',
  'asset-maintenance',
  'asset-stocktake',
  'asset-scrap'
])

const actionEnhancements = {
  'finance-payment':['finance-payment'],
  'finance-refund':['finance-refund'],
  'finance-reconciliation':['finance-reconcile'],
  'integration-failure':['integration-retry','integration-compensate'],
  'consultation-room':['consultation-operate'],
  'consultation-conclusion':['consultation-sign']
}

const pageActionEnhancements = {
  'finance-operating-report':['analysis-refresh','analysis-drilldown'],
  'finance-payable-match':['finance-run-match','finance-match-difference']
}

const identityFieldLabels = {
  'hr-employee': { name:'员工姓名', code:'员工工号' },
  'purchase-request': { name:'采购主题', code:'申请编号' },
  'finance-order': { name:'订单主题', code:'订单编号' },
  'consultation-appointment': { name:'会诊主题', code:'会诊编号' },
  'medical-report': { name:'报告名称', code:'报告编号' },
  'talent-report': { name:'报告名称', code:'报告编号' }
  , 'asset-card': { name:'资产名称' }
  , 'asset-use': { name:'领用说明' }
  , 'asset-return': { name:'归还说明' }
  , 'asset-transfer': { name:'调拨说明' }
  , 'asset-maintenance': { name:'维修说明' }
  , 'asset-stocktake': { name:'盘点说明' }
  , 'asset-scrap': { name:'报废说明' }
}

const descriptionOverrides = {
  'hr-employee':'维护员工姓名、工号、部门、岗位、职级和联系方式，并查看在职状态。',
  'purchase-request':'登记采购需求、申请部门、采购类型和预计金额，提交后进入审批与采购执行。',
  'finance-budget':'按成本中心和预算期间维护预算金额，查看审批状态与执行进度。',
  'finance-operating-report':'按期间和经营指标查询金额与完成率，并进入明细核对业务数据。',
  'consultation-appointment':'完成会诊预约、时间冲突检查和专家邀请，并按阶段查看专家回复、会前准备与会诊记录。',
  'talent-factor':'在天赋要素页面维护要素名称和分类；保存后供分级、固定注解和匹配条件选择。',
  'talent-level':'天赋要素来自“天赋要素”页面；分级来自系统统一的 L1–L6 标准，在“要素分级”页面维护对应关系、排序和适用范围。',
  'talent-note':'固定注解在“固定注解”页面维护；选择要素后，只显示该要素已维护的分级。',
  'talent-report':'查看天赋报告接收、发布和撤回状态；发布后由小程序查看。'
}

const pageTypeDescriptions = {
  master: title => `维护${title}的业务信息、启停状态和引用关系。`,
  document: title => `查询并处理${title}，查看业务内容、当前状态和后续流转。`,
  approval: title => `处理${title}，查看申请内容、审批意见和处理结果。`,
  ledger: title => `查询${title}的当前余额、变化结果和关联明细。`,
  analysis: title => `按业务条件查看${title}指标，并进入明细核对数据。`,
  interface: title => `查看${title}的处理状态、失败原因、重试和人工补偿结果。`,
  readonly: title => `查询并查看${title}，不在本页修改历史业务内容。`
}

// 需要客户理解的页面动作使用专属名称，并替换生成目录中的泛化动作，避免同一页面出现重复按钮。
const pageActionOverrides = {
  'finance-payable-match':['finance-run-match','finance-match-difference'],
  'approval-form':['approval-form-design','resource-publish','resource-withdraw'],
  'finance-payment':['finance-payment-confirm','finance-payment-unconfirm'],
  'finance-refund':['finance-refund-confirm'],
  'finance-reconciliation':['finance-reconciliation-submit','finance-reconciliation-confirm','finance-reconciliation-unconfirm'],
  'consultation-room':['consultation-room-confirm','consultation-room-cancel']
}

const statusOptionOverrides = {
  'finance-payment':['待收款','部分收款','已结清','已确认','已冲销'],
  'finance-refund':['草稿','待审批','已通过','已驳回','待退款','已退款','已确认','已取消'],
  'finance-invoice':['待申请','处理中','已开具','已作废'],
  'finance-reconciliation':['草稿','待对账','存在差异','已确认','已对账','已取消'],
  'approval-form':['草稿','已发布','已停用'],
  'approval-flow':['草稿','已发布','已停用'],
  'approval-node':['已启用','已停用'],
  'approval-branch':['已启用','已停用'],
  'hr-schedule':['草稿','待审批','已通过','已生效','已撤回','已取消'],
  'medical-report':['草稿','待映射','待规则判定','待医生确认','待确认','待发布','已发布','已撤回','已归档'],
  'medical-external-item-map':['草稿','待匹配','已启用','已匹配','已停用'],
  'doctor-order':['草稿','待校验','待放行','已提交','已通过','已驳回'],
  'consultation-device':['草稿','待确认','已发送','已接受','已拒绝','已确认','检查通过','进行中','已签字','已归档','已取消'],
  'consultation-conclusion':['草稿','待确认','已发送','已接受','已拒绝','已确认','进行中','已签字归档','已归档','已取消'],
  'talent-generation':['待处理','核对中','待生成','生成中','已完成','失败'],
  'talent-report':['待发布','已发布','已撤回','异常']
}

// 页面级动作沿用统一动作处理器，但按业务对象显示客户可理解的名称。
const semanticIntegrationLabels = {
  'integration-field-map':'校验字段映射',
  'medical-symptom-disease':'调用症状疾病关系',
  'integration-call':'同步业务数据',
  'approval-application':'回写审批结果',
  'intelligence-analysis-rule':'维护智脑分析规则',
  'talent-import':'检查导入数据',
  'talent-generation':'接收并整理天赋数据',
  'integration-failure':'检查失败数据',
  'integration-init':'执行数据初始化',
  'medical-critical-rule':'验证危急值规则',
  'medical-item-relation':'验证医学关系',
  'consultation-member':'同步参会成员'
}

const rowActionOverrides = {
  'consultation-device':['consultation-device-camera','consultation-device-microphone'],
  'consultation-room':['consultation-room-auth','consultation-room-enter','consultation-room-record','consultation-room-control','consultation-room-media','resource-close'],
  'consultation-member':['consultation-member-mute','consultation-member-remove'],
  'finance-payment':['finance-payment','resource-void'],
  'finance-refund':['resource-submit','resource-withdraw','resource-cancel','approval-approve','approval-reject','resource-confirm','finance-refund','resource-delete'],
  'finance-invoice':['finance-issue-invoice','resource-void'],
  'finance-reconciliation':['finance-reconcile'],
  'approval-form':['approval-form-copy','resource-delete','resource-enable','resource-disable'],
  'approval-flow':['approval-flow-copy','resource-delete','resource-enable','resource-disable'],
  'approval-node':['approval-node-sort','resource-delete'],
  'approval-branch':['approval-branch-sort','resource-delete'],
  'doctor-plan':['doctor-plan-favorite-health','doctor-plan-favorite-medical','doctor-plan-apply','doctor-plan-rename','resource-delete'],
  'inventory-inbound':['resource-submit','resource-confirm','resource-withdraw','resource-cancel','resource-delete'],
  'inventory-operations':['resource-submit','resource-confirm','resource-cancel'],
  'inventory-ledger':['inventory-freeze-toggle','resource-export']
}

const integrationActionOverrides = {
  'finance-payable-match':['finance-run-match'],
  'consultation-device':['consultation-device-camera','consultation-device-microphone'],
  'consultation-room':['consultation-room-auth','consultation-room-enter','consultation-room-record','consultation-room-control','consultation-room-media'],
  'consultation-member':['consultation-member-mute','consultation-member-remove']
}

// 客户表单只填写业务事实；状态和检查/处理结果由提交、审批、重试等动作自动回写。
// 只读档案和统计分析只提供查询、详情、导出或下钻，不展示会误导客户的写操作。
const readOnlyActionSet = new Set(['resource-create','resource-update','resource-delete','resource-submit','resource-withdraw','resource-cancel','resource-confirm','resource-void','resource-archive','resource-publish','resource-generate','approval-approve','approval-reject','approval-return','approval-transfer','integration-execute','integration-retry','integration-compensate'])

const systemFieldEnhancements = {
  'integration-call': { result:{ label:'调用结果', systemDefault:'待系统处理', systemHint:'由接口调用后自动回写，不能手工填写。' } },
  'integration-failure': { result:{ label:'处理结果', systemDefault:'待系统处理', systemHint:'由重试或人工补偿后自动回写，不能手工填写。' } },
  'integration-init': { result:{ label:'初始化结果', systemDefault:'待系统处理', systemHint:'由初始化任务执行后自动回写，不能手工填写。' } },
  'finance-payable-match': { matchResult:{ label:'三单匹配结果', systemDefault:'待匹配', systemHint:'由系统根据采购订单、收货和发票自动匹配。' } },
  'medical-unmatched-item': { result:{ label:'匹配处理结果', systemDefault:'待处理', systemHint:'由项目映射处理后自动回写。' } },
  'intelligence-analysis-rule': { result:{ label:'规则配置状态', systemDefault:'待发布', systemHint:'由医学规则中心发布后供健康智脑引用。' } },
  'medical-report': { result:{ label:'报告处理结果', systemDefault:'待处理', systemHint:'由医学判定和报告发布动作自动回写。' } },
  'doctor-order': { safetyCheck:{ label:'医疗项目提交检查', systemDefault:'提交时检查', systemHint:'仅在医疗方案提交时检查前置条件。' } },
  'consultation-invitation': { result:{ label:'邀请处理结果', systemDefault:'待处理', systemHint:'由专家接受或拒绝邀请后自动回写。' } },
  'consultation-device': { deviceCheck:{ label:'会前检查结果', systemDefault:'待检查', systemHint:'由摄像头、麦克风和网络检查自动回写。' }, result:{ label:'进入会诊结果', systemDefault:'待处理', systemHint:'由设备检查和进入会诊动作自动回写。' } },
  'consultation-room': { recording:{ label:'会诊过程记录', systemDefault:'待开始', systemHint:'由进入会诊、录制和结束会诊动作自动回写。' } },
  'talent-import': { result:{ label:'导入结果', systemDefault:'待导入', systemHint:'由导入任务完成后自动回写。' } },
  'talent-generation': { result:{ label:'结果摘要', systemDefault:'待处理', systemHint:'由核对、匹配和报告生成动作自动回写。' } },
  'talent-report': { result:{ label:'报告处理结果', systemDefault:'待发布', systemHint:'由结果回传、发布和撤回动作自动回写。' } }
}

const generatedWorkbench = generatedWorkbenchRegistry.map(config => {
  const catalog = catalogBackedResources.has(config.resourceId) ? catalogById(config.resourceId) : null
  const sourceFields = catalog?.fields || config.fields || []
  const sourceColumns = catalog?.columns || config.columns || []
  const sourceFilters = catalog?.filters || config.filters || []
  const additions = actionEnhancements[config.resourceId] || []
  const fieldEnhancements = systemFieldEnhancements[config.resourceId] || {}
  const rowActions = rowActionOverrides[config.resourceId]
    ? [...rowActionOverrides[config.resourceId]]
    : [...new Set([...(config.rowActions || []), ...additions])]
  const integrationActions = integrationActionOverrides[config.resourceId] || ((config.integrationActions || []).length ? config.integrationActions : (config.pageActions || []).includes('integration-execute') ? ['integration-execute'] : [])
  const importExportActions = (config.batchActions || []).filter(action => ['resource-import','resource-export'].includes(action))
  const pageActions = pageActionOverrides[config.resourceId]
    ? [...new Set([...pageActionOverrides[config.resourceId], ...importExportActions])]
    : [...new Set([...(config.pageActions || []), ...importExportActions, ...(pageActionEnhancements[config.resourceId] || [])])]
  const semanticLabel = semanticIntegrationLabels[config.resourceId]
  const actionLabels = semanticLabel ? { ...(config.actionLabels || {}), 'integration-execute':semanticLabel } : (config.actionLabels || {})
  const columns = config.resourceId === 'inventory-ledger'
    ? [...new Set([...sourceColumns.filter(column => !['availableQty', 'warningStatus', 'status'].includes(column)), 'batch', 'productionDate', 'expiry', 'availableQty', 'warningStatus', 'status'])]
    : sourceColumns
  const fields = sourceFields.map(field => {
    const enhancement = fieldEnhancements[field.name]
    const identityLabels = identityFieldLabels[config.resourceId] || {}
    if (config.resourceId.startsWith('talent-') && ['name','code'].includes(field.name)) return { ...field, hidden:true, required:false }
    if (field.name === 'name') return { ...field, label:identityLabels.name || `${config.title}${config.pageType === 'document' ? '主题' : '名称'}` }
    if (field.name === 'code') return { ...field, hidden:true, required:false, system:true }
    if (field.name === 'status') {
      const options = statusOptionOverrides[config.resourceId] || (config.pageType === 'master' ? (field.options || []).filter(option => option !== '草稿') : field.options)
      return { ...field, required:false, system:true, options, systemDefault:options?.[0] || '草稿', systemHint:'状态由提交、审批、确认、发布等业务动作更新，不能在表单中手工修改。' }
    }
    if (field.name === 'result' && config.resourceId === 'consultation-appointment') return { ...field, label:'时间冲突检查结果', type:'select', options:['待选择专家和时间','无冲突','存在冲突'], required:false, system:true, systemDefault:'待选择专家和时间', systemHint:'选择专家和预约时间后，系统自动检查是否与已有会诊冲突。' }
    return enhancement ? { ...field, ...enhancement, required:false, system:true } : field
  }).filter(field => !(config.resourceId === 'inventory-inbound' && field.name === 'systemNo'))
  const catalogStageFields = catalog?.stageFields
  const formSections = catalogStageFields
    ? Object.entries(catalogStageFields).map(([title, names]) => ({ title, fields:names.map(name => fields.find(item => item.name === name)).filter(Boolean) }))
    : catalog
      ? [{ title:'业务信息', fields }]
      : (config.formSections || []).map(section => ({ ...section, fields:(section.fields || []).map(field => {
    const name = typeof field === 'string' ? field : field?.name
    return fields.find(item => item.name === name) || ((config.resourceId === 'inventory-inbound' && name === 'systemNo') ? null : field)
  }).filter(Boolean) }))
  const filters = sourceFilters.map(filter => filter.name === 'status' && statusOptionOverrides[config.resourceId]
    ? { ...filter, options:['全部', ...statusOptionOverrides[config.resourceId]] }
    : filter)
  return {
    ...config,
    columns,
    fields,
    filters,
    formSections,
    title: config.resourceId === 'consultation-report' ? '会诊归档记录' : config.resourceId === 'consultation-invitation' ? '邀请处理' : config.title,
    description: descriptionOverrides[config.resourceId] || (config.resourceId === 'consultation-report' ? '集中查看已完成会诊的参与人员、专家意见、资料、签署和归档结果；进行中的会诊过程请在“会诊预约”页签内查看。' : (pageTypeDescriptions[config.pageType]?.(config.title) || `查询并处理${config.title}。`)),
    createLabel: config.resourceId === 'consultation-report' ? '新增补充记录' : config.resourceId === 'consultation-invitation' ? '发起专家邀请' : config.resourceId === 'consultation-appointment' ? '新建会诊预约' : `新增${config.title}`,
    actionLabels: {
      ...actionLabels,
      ...(config.resourceId === 'consultation-appointment' ? {
        'resource-submit':'发送专家邀请',
        'resource-confirm':'确认预约',
        'resource-withdraw':'撤回预约',
        'resource-cancel':'取消预约',
        'resource-close':'结束会诊'
      } : {}),
      ...(config.resourceId === 'consultation-invitation' ? {
        'resource-submit':'发送邀请',
        'resource-withdraw':'撤回邀请',
        'resource-cancel':'取消邀请'
      } : {}),
      ...(config.domainId === 'finance' ? { 'resource-void':config.resourceId === 'finance-invoice' ? '作废发票' : '冲销' } : {})
      ,...(config.resourceId === 'inventory-inbound' ? { 'resource-confirm':'处理当前阶段', 'resource-withdraw':'撤回入库单', 'resource-cancel':'登记入库异常' } : {})
      ,...(config.resourceId === 'inventory-operations' ? { 'resource-submit':'提交库存作业', 'resource-confirm':'完成库存作业', 'resource-cancel':'作废库存作业' } : {})
    },
    rowActions:rowActions.filter(action => !['readonly','analysis'].includes(config.pageType) || !readOnlyActionSet.has(action)),
    statusActions:[...new Set([...(config.statusActions || []), ...additions])]
      .filter(action => rowActions.includes(action))
      .filter(action => !['readonly','analysis'].includes(config.pageType) || !readOnlyActionSet.has(action)),
    integrationActions,
    coverageIntegrationActions:integrationActionOverrides[config.resourceId] || (config.coverageIntegrationActions || []),
    batchActions:(config.batchActions || []).filter(action => !['readonly','analysis'].includes(config.pageType) || !readOnlyActionSet.has(action)),
    pageActions
  }
})

export const workbenchRegistry = generatedWorkbench

const resourceConfig = resourceId => workbenchRegistry.find(item => item.resourceId === resourceId)

// 客户页面按业务域组织；已从二期评审移除的旧页面不进入客户模块。
const customerModuleDefinitions = [
  { id:'people-admin', title:'人事、行政与基础资料', subtitle:'组织、员工、岗位、排班与行政资源', icon:'人', groupIds:['people-org','people-schedule','people-admin'] },
  { id:'procurement-inventory', title:'采购、进销存与库存作业', subtitle:'供应商、物料、仓库、采购、收货、领用、调拨、盘点与报废', icon:'采', groupIds:['supply-master','supply-purchase','supply-receipt','supply-inventory'] },
  { id:'asset', title:'固定资产管理', subtitle:'资产分类、资产卡片、领用、归还、调拨、维修、盘点与处置', icon:'资', groupIds:['supply-asset'] },
  { id:'finance', title:'订单、资金与经营分析', subtitle:'订单、收付款、发票、对账、成本、预算与经营报表', icon:'财', groupIds:['finance-order-group','finance-analysis-group','finance-operating'] },
  { id:'visit-order', title:'初诊/复诊客单', subtitle:'客户详情内完成健康方案、医疗方案、实施计划和客单提交', icon:'单', groupIds:['medical-doctor-group'] },
  { id:'approval', title:'审批流程与业务协同', subtitle:'业务表单、审批流程、审批任务、公告与业务消息', icon:'审', groupIds:['people-approval'] },
  { id:'integration', title:'三方系统对接', subtitle:'体检系统同步：字段映射、项目映射、排除、分类归属与结果处理', icon:'联', groupIds:['supply-integration'], resourceIds:['checkup-sync'] },
  { id:'health-rules', title:'健康智脑与医学数据规则', subtitle:'体检分类、外部映射、参考值、危急值、医学关系与健康报告', icon:'规', groupIds:['medical-master-group','medical-mapping-group','medical-rule-group','medical-report-group'] },
  { id:'consultation', title:'线上视频会诊', subtitle:'预约、专家邀请、时间冲突、设备检查、会诊过程、意见签字与归档', icon:'会', groupIds:['care-consultation'] },
  { id:'talent', title:'天赋报告后台管理', subtitle:'天赋规则、内容库、数据导入、报告生成、发布与撤回', icon:'天', groupIds:['care-talent-rule','care-talent-report'] }
]

export const customerModuleRegistry = customerModuleDefinitions.map(item => {
  const resources = item.resourceIds || workbenchRegistry
    .filter(config => item.groupIds.includes(config.groupId))
    .map(config => config.resourceId)
  return { ...item, resourceIds:resources }
})

export const customerModuleById = id => customerModuleRegistry.find(item => item.id === id)
export const customerModuleForResource = resourceId => customerModuleRegistry.find(item => item.resourceIds.includes(resourceId))
export const customerModuleForGroup = groupId => customerModuleRegistry.find(item => item.groupIds.includes(groupId))

// 客户导航按业务阶段组织；底层技术资源仅供内部覆盖核对使用。
export const customerNavigation = {
  'medical-doctor-group': {
    resourceIds: ['doctor-order'],
    labels: { 'doctor-order': '初诊/复诊客单' }
  },
  'care-consultation': {
    resourceIds: ['consultation-appointment', 'consultation-invitation', 'consultation-report'],
    labels: {
      'consultation-appointment': '会诊预约',
      'consultation-invitation': '邀请处理',
      'consultation-report': '会诊归档记录'
    }
  }
}

const consultationTabSets = {
  'consultation-appointment': [
    { resourceId:'consultation-appointment', panel:'appointment', label:'预约信息' },
    { resourceId:'consultation-invitation', panel:'expert-reply', label:'专家回复' },
    { resourceId:'consultation-device', panel:'device-check', label:'会前准备' },
    { resourceId:'consultation-room', panel:'consultation-record', label:'会诊记录' }
  ],
  'consultation-invitation': [
    { resourceId:'consultation-appointment', panel:'appointment', label:'预约信息' },
    { resourceId:'consultation-invitation', panel:'expert-reply', label:'专家回复' }
  ],
  'consultation-report': [
    { resourceId:'consultation-appointment', panel:'appointment', label:'预约信息' },
    { resourceId:'consultation-invitation', panel:'expert-reply', label:'专家回复' },
    { resourceId:'consultation-room', panel:'consultation-record', label:'会诊记录' },
    { resourceId:'consultation-report', panel:'consultation-record', label:'会诊记录' }
  ]
}

export const customerNavigationResources = groupId => customerNavigation[groupId]?.resourceIds || null
export const customerResourceLabel = (groupId, resourceId) => customerNavigation[groupId]?.labels?.[resourceId] || resourceConfig(resourceId)?.title || resourceId
export const consultationTabsFor = resourceId => consultationTabSets[resourceId] || null

export const getWorkbenchConfig = resourceId => resourceConfig(resourceId)

export const getRecordEditRestriction = (resourceId, record) => {
  const config = getWorkbenchConfig(resourceId)
  if (!record) return ''
  const consultationPages = new Set([
    'consultation-appointment', 'consultation-room', 'consultation-opinion',
    'consultation-conclusion', 'consultation-report'
  ])
  if (consultationPages.has(resourceId) && /归档|签字/.test(record.status || '')) {
    return '该会诊记录已签字归档，不能继续编辑；如需更正，请新增补充记录。'
  }
  if (config?.editLockedStatuses?.includes(record.status)) return `当前状态“${record.status}”不允许继续编辑。`
  return ''
}
