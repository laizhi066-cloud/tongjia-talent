import { domainRegistry as catalogDomains, groupRegistry, resourceRegistry } from './catalog-data.js?v=talent-1.0.8'
export { groupRegistry, resourceRegistry }

export const roles = [
  { id: 'customer-service', name: '客户服务人员', scope: '所负责客户、会诊与通知记录' },
  { id: 'hr', name: '人事行政人员', scope: '组织、员工、排班、调班与行政事务' },
  { id: 'buyer', name: '采购人员', scope: '供应商、采购申请、订单与到货记录' },
  { id: 'warehouse', name: '仓库人员', scope: '收货、验收、库存与资产入账' },
  { id: 'finance', name: '资金经营人员', scope: '订单、收退款、对账和经营数据' },
  { id: 'doctor', name: '医生', scope: '本人客户、医生开单与医学报告' },
  { id: 'approver', name: '业务审批人', scope: '授权范围内的业务审批待办' },
  { id: 'medical-admin', name: '医学规则维护人员', scope: '医学基础资料、映射和规则版本' },
  { id: 'expert', name: '会诊专家', scope: '受邀会诊、专家意见和签字记录' },
  { id: 'talent-editor', name: '天赋内容维护人员', scope: '天赋内容、匹配、报告生成和发布' }
]

export const domainRegistry = catalogDomains


const sampleValues = {
  organization:'健康管理中心', parentName:'同佳健康', department:'健康管理中心', position:'业务专员', rank:'P3', employee:'陈医生', mobile:'138****2468',
  scope:'本组织业务数据', module:'业务管理', operation:'查看与维护', effectiveTime:'2026-08-28 09:00', shiftTime:'08:00-17:00', date:'2026-08-28', startDate:'2026-08-28', endDate:'2026-09-28', shift:'白班', reason:'业务安排调整',
  supplier:'安澜医疗用品有限公司', supplierLevel:'A 级', contact:'李经理', material:'一次性采血针', specification:'20 支/盒', unit:'盒', warehouse:'杭州一号仓', location:'A-01-08', quantity:10, availableQty:1200, batch:'BATCH-202608', amount:1280, currency:'人民币', applicant:'孙琪', requestDepartment:'健康管理中心', purchaseType:'常规采购', quotationDeadline:'2026-09-01', taxRate:'6%', orderNo:'SO-202608-026', arrivalDate:'2026-08-29', receivedQty:10, inspectionResult:'合格', qualityLevel:'合格',
  assetCategory:'医疗设备', assetCode:'AST-202608-001', brandModel:'便携式心电设备 A1', custodian:'设备管理员', assetValue:6800, depreciationYears:5, customer:'林女士', service:'健康管理服务', paid:0, refunded:0, invoiceNo:'INV-202608-001', channel:'直营网点', costCenter:'健康管理中心', period:'2026-08', allocationMethod:'按收入占比', budgetAmount:100000, executionRate:'68%', payableAmount:1280, matchResult:'匹配通过', metric:'客户服务收入', targetValue:100000,
  reportType:'成人综合体检报告', externalCode:'EXT-ADULT-01', standardCode:'STD-ALT-01', sourceSystem:'外部体检系统', unitType:'数值', lowerLimit:'0', upperLimit:'40', criticalValue:'80', relationType:'关联疾病', ruleVersion:'MED-2026.08', doctor:'陈医生', plan:'心血管复查方案', specialItem:'动态心电图', safetyCheck:'校验通过', releaseReason:'专家评估后放行', followupPeriod:'六个月',
  expert:'周专家', time:'2026-08-29T10:00', roomNo:'RTC-006', deviceCheck:'通过', opinion:'建议持续随访', signature:'周专家', recording:'已保存', contentSet:'成人天赋内容方案 A', factor:'逻辑思维', level:'L2', annotation:'表现稳定', ageRange:'18-45 岁', gender:'通用', condition:'分值达到 70', content:'逻辑思维培养建议', fileName:'业务数据导入表.xlsx', attempts:0, direction:'接收', endpoint:'/api/tongjia/v2', mappingRule:'按编码精确匹配', errorMessage:'连接超时', result:'处理成功', businessId:'TJ-BIZ-202608-001', audience:'相关业务人员', node:'部门负责人', assignee:'王主管', expression:'金额大于 10000', formCode:'FORM-TJ-001', messageType:'业务通知', vehicleNo:'浙A·12345', meetingRoom:'一号会议室', sealType:'合同章', contractParty:'安澜医疗用品有限公司', archiveNo:'ARC-202608-001', expenseType:'办公费用', balance:12800, differenceQty:0, disposalMethod:'合规报废', maintenanceVendor:'杭州设备服务有限公司', sourceMode:'接收检测结果', dataPath:'/talent/result/GENE-202608-017', snapshot:'TA-202608-017-S1'
}

const businessValueSeeds = {
  name: ['杭州健康管理中心', '华东医学服务部', '滨江运营中心', '宁波服务团队', '嘉兴合作中心', '年度服务配置'],
  code: ['TJ-HZ-001', 'TJ-HZ-002', 'TJ-HZ-003', 'TJ-NB-004', 'TJ-JX-005', 'TJ-2026-006'],
  owner: ['王主管', '林女士', '陈医生', '周专家', '赵老师', '刘护士'],
  organization: ['健康管理中心', '医学服务部', '客户服务部', '采购管理部', '财务经营部', '行政管理部'],
  employee: ['陈医生', '刘敏', '孙琪', '方媛', '周宁', '何师傅'],
  rank: ['P1', 'P2', 'P3', 'P4', 'M1', 'M2'],
  mobile: ['138****2468', '139****5172', '137****8841', '136****3096', '135****6725', '188****4210'],
  department: ['健康管理中心', '医学服务部', '客户服务部', '采购管理部', '财务经营部', '行政管理部'],
  position: ['运营主管', '医生', '客户经理', '采购专员', '资金专员', '行政专员'],
  meetingRoom: ['一号会议室', '二号会议室', '三号会议室', '多功能会议室', '视频会议室', '培训室'],
  supplier: ['安澜医疗用品有限公司', '明康检验设备有限公司', '嘉禾健康科技有限公司', '华信医用耗材有限公司', '云杉服务供应商', '东篱设备服务商'],
  material: ['一次性采血针', '便携式心电设备', '真空采血管', '医用外科口罩', '健康评估试纸', '检查耗材套装'],
  warehouse: ['杭州一号仓', '宁波周转仓', '滨江冷链仓', '嘉兴备件仓', '华东综合仓', '临时待验区'],
  location: ['A-01-08', 'A-02-03', 'B-01-05', 'B-03-02', 'C-01-01', '待分配'],
  customer: ['林女士', '王先生', '赵女士', '陈先生', '周女士', '刘先生'],
  service: ['成人综合健康管理', '心血管复查服务', '企业年度体检', '家庭健康评估', '慢病随访服务', '专项检查服务'],
  metric: ['客户服务收入', '订单回款率', '库存周转率', '退款金额', '医学报告发布量', '会诊完成率'],
  costCenter: ['健康管理中心', '医学服务部', '客户服务部', '采购管理部', '财务经营部', '行政管理部'],
  period: ['2026-08', '2026-09', '2026-Q3', '2026-Q4', '2027-01', '2027-Q1'],
  shift: ['早班 08:00-16:00', '中班 10:00-18:00', '晚班 14:00-22:00', '周末班 09:00-17:00', '机动班', '夜间值守'],
  expert: ['周专家', '陈专家', '李专家', '赵专家', '孙专家', '顾专家'],
  reportType: ['成人综合体检报告', '心血管专项报告', '企业健康筛查报告', '女性健康报告', '慢病随访报告', '儿童成长评估报告'],
  contentSet: ['成人天赋内容方案 A', '逻辑思维培养方案', '儿童成长内容方案', '家庭教育内容方案', '职业倾向内容方案', '综合发展内容方案'],
  factor: ['逻辑思维', '空间感知', '语言表达', '专注力', '情绪感知', '行动规划'],
  level: ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'],
  fileName: ['体检项目映射表.xlsx', '天赋内容导入表.xlsx', '供应商资料导入表.xlsx', '规则配置导入表.xlsx', '历史报告数据.xlsx', '库存初始化清单.xlsx'],
  orderNo: ['SO-202608-026', 'PO-202608-009', 'SO-202608-031', 'PO-202608-014', 'SO-202608-038', 'PO-202608-021'],
  businessId: ['TJ-BIZ-202608-001', 'TJ-BIZ-202608-002', 'TJ-BIZ-202608-003', 'TJ-BIZ-202608-004', 'TJ-BIZ-202608-005', 'TJ-BIZ-202608-006'],
  amount: [1280, 18600, 3560, 42800, 7600, 22500],
  quantity: [12, 120, 36, 240, 18, 60],
  receivedQty: [12, 118, 36, 238, 18, 60],
  availableQty: [1180, 860, 420, 1560, 275, 690],
  balance: [86, 42, 135, 27, 68, 110],
  assetValue: [6800, 12800, 35600, 9200, 48600, 15600],
  budgetAmount: [100000, 80000, 150000, 60000, 120000, 90000],
  payableAmount: [1280, 18600, 3560, 42800, 7600, 22500],
  targetValue: [100000, 95, 12, 25000, 180, 92],
  differenceQty: [0, 2, -1, 5, 0, -3],
  executionRate: ['68%', '82%', '94%', '57%', '76%', '103%'],
  assetCode: ['AST-202608-001', 'AST-202608-002', 'AST-202608-003', 'AST-202608-004', 'AST-202608-005', 'AST-202608-006'],
  brandModel: ['便携式心电设备 A1', '全自动血压仪 B2', '超声诊断设备 U3', '肺功能检测仪 P1', '健康一体机 H5', '冷链存储柜 C2'],
  externalCode: ['EXT-ALT-01', 'EXT-AST-02', 'EXT-GLU-03', 'EXT-HDL-04', 'EXT-LDL-05', 'EXT-HOMA2'],
  standardCode: ['STD-ALT-01', 'STD-AST-02', 'STD-GLU-03', 'STD-HDL-04', 'STD-LDL-05', 'STD-HOMA-06']
}

function fieldValue(field, index, resource) {
  const values = businessValueSeeds[field.name]
  if (values) return values[(index - 1) % values.length]
  if (field.name in sampleValues) return sampleValues[field.name]
  if (field.type === 'number') return index * 10
  if (field.type === 'date') return '2026-08-' + String(20 + index).padStart(2, '0')
  if (field.type === 'datetime-local') return '2026-08-29T' + String(8 + index).padStart(2, '0') + ':00'
  if (field.type === 'select') return (field.options || []).find(item => item !== '全部') || '草稿'
  return field.label + '示例' + index
}

function statusFor(resource, index) {
  const options = resource.fields.find(field => field.name === 'status')?.options || ['草稿']
  const usable = resource.pageType === 'master' ? options.filter(item => item !== '草稿') : options
  return usable[(index - 1) % usable.length] || options[0] || '草稿'
}

const displayResourceTitle = resource => resource.title
const directNameField = {
  'hr-organization':'organization', 'hr-employee':'employee', 'hr-position':'position', 'hr-rank':'rank', 'hr-shift':'shift',
  'hr-office-supply':'material', 'hr-meeting-room':'meetingRoom', 'supply-supplier':'supplier', 'supply-material':'material',
  'supply-warehouse':'warehouse', 'supply-location':'location', 'asset-card':'brandModel', 'finance-metric-library':'metric',
  'medical-report-type':'reportType', 'medical-standard-item':'standardCode', 'consultation-expert':'expert',
  'talent-factor':'factor', 'talent-level':'level', 'talent-content-library':'contentSet'
}
const recordName = (resource, index, fields) => {
  const direct = directNameField[resource.id]
  const directValue = direct && (fields[direct] ?? businessValueSeeds[direct]?.[(index - 1) % businessValueSeeds[direct].length] ?? sampleValues[direct])
  if (directValue) return String(directValue)
  const anchor = ['metric','customer','material','supplier','orderNo','expert','employee','businessId','reportType','fileName','period','contentSet','organization','department','position'].find(name => fields[name])
  return `${displayResourceTitle(resource)} · ${anchor ? fields[anchor] : businessValueSeeds.name[(index - 1) % businessValueSeeds.name.length]}`
}
const recordCode = (resource, index) => {
  const prefix = resource.id.split('-').map(part => part.slice(0, 3).toUpperCase()).join('-').slice(0, 13)
  return `${prefix}-${String(index).padStart(3, '0')}`
}

const sample = (resource, index = 1, overrides = {}) => {
  const fields = Object.fromEntries(resource.fields.map(field => [field.name, fieldValue(field, index, resource)]))
  const status = statusFor(resource, index)
  const item = {
    id: resource.id.toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 18) + '-' + String(index).padStart(3, '0'),
    ...fields,
    name: recordName(resource, index, fields),
    code: recordCode(resource, index),
    owner: businessValueSeeds.owner[(index - 1) % businessValueSeeds.owner.length],
    status,
    updatedAt: '2026-08-28 09:' + String(10 + index).padStart(2, '0'), referenced:index === 1, draft:status === '草稿', ...overrides
  }
  for (const field of resource.fields) {
    if (field.generated && (item[field.name] == null || item[field.name] === '')) item[field.name] = item.id
  }
  return item
}

const resourceData = Object.fromEntries(resourceRegistry.map(resource => [resource.id, Array.from({ length:6 }, (_, index) => sample(resource, index + 1))]))
const resource = id => resourceRegistry.find(item => item.id === id)
Object.assign(resourceData, {
  'hr-organization': [sample(resource('hr-organization'),1,{id:'ORG-001',name:'健康管理中心',code:'ORG-HM',owner:'王主管',referenced:true}), ...resourceData['hr-organization'].slice(1)],
  'supply-supplier': [sample(resource('supply-supplier'),1,{id:'SUP-001',name:'安澜医疗用品有限公司',supplierLevel:'A 级',status:'已启用',referenced:true}), ...resourceData['supply-supplier'].slice(1)],
  'purchase-request': [sample(resource('purchase-request'),1,{id:'PR-202608-012',name:'体检耗材采购',supplier:'安澜医疗用品有限公司',quantity:120,amount:18600,status:'草稿',referenced:true,draft:true}), ...resourceData['purchase-request'].slice(1)],
  'purchase-order': resourceData['purchase-order'].map((item, index) => ({ ...item, purchaseRequest:`PR-202609-00${index + 1}`, selectedQuote:`QCP-202609-00${index + 1}`, expectedArrivalDate:`2026-09-${String(10 + index).padStart(2, '0')}`, costCenter:index % 2 ? '医学服务部' : '健康管理中心' })),
  'supply-warehouse-location': [
    sample(resource('supply-warehouse-location'),1,{id:'WH-202609-001',warehouse:'杭州一号仓',location:'A-01-08',organization:'健康管理中心',owner:'王主管',scope:'常温耗材 · 1200 箱',status:'已启用',referenced:true,draft:false}),
    sample(resource('supply-warehouse-location'),2,{id:'WH-202609-002',warehouse:'滨江冷链仓',location:'B-03-02',organization:'医学服务部',owner:'刘护士',scope:'冷链试剂 · 240 箱',status:'已启用',referenced:true,draft:false})
  ],
  'purchase-quote-compare': [
    sample(resource('purchase-quote-compare'),1,{id:'QCP-202609-001',purchaseRequest:'PR-202609-001 · 动态心电监测耗材采购',supplier:'安澜医疗用品有限公司',material:'动态心电监测耗材包',quoteAmount:12800,comparisonResult:'最低报价',status:'待确认',referenced:true,draft:false}),
    sample(resource('purchase-quote-compare'),2,{id:'QCP-202609-002',purchaseRequest:'PR-202609-002 · 真空采血管采购',supplier:'明康检验设备有限公司',material:'真空采血管',quoteAmount:18600,comparisonResult:'存在差异',status:'待复核',referenced:true,draft:false})
  ],
  'inventory-inbound': [
    sample(resource('inventory-inbound'),1,{id:'IN-202609-001',inboundNo:'IN-202609-001',purchaseOrder:'PO-202609-001',supplier:'安澜医疗用品有限公司',material:'动态心电监测耗材包',stageStatus:'待收货',arrivalQty:120,actualReceivedQty:0,warehouse:'杭州一号仓',location:'待分配',status:'待收货',referenced:true,draft:false}),
    sample(resource('inventory-inbound'),2,{id:'IN-202609-002',inboundNo:'IN-202609-002',purchaseOrder:'PO-202609-002',supplier:'明康检验设备有限公司',material:'真空采血管',stageStatus:'待验收',arrivalQty:120,actualReceivedQty:118,batch:'BATCH-202608-A',expiry:'2028-08-01',warehouse:'滨江冷链仓',status:'待验收',referenced:true,draft:false}),
    sample(resource('inventory-inbound'),3,{id:'IN-202609-003',inboundNo:'IN-202609-003',purchaseOrder:'PO-202609-003',supplier:'嘉禾健康科技有限公司',material:'一次性采血针',stageStatus:'待上架',arrivalQty:36,actualReceivedQty:36,batch:'BATCH-202607-C',expiry:'2026-10-10',warehouse:'杭州一号仓',location:'A-02-03',status:'待上架',referenced:true,draft:false}),
    sample(resource('inventory-inbound'),4,{id:'IN-202609-004',inboundNo:'IN-202609-004',purchaseOrder:'PO-202608-009',supplier:'华信医用耗材有限公司',material:'动态心电监测耗材包',stageStatus:'已入库',arrivalQty:120,actualReceivedQty:120,batch:'BATCH-202608-A',expiry:'2028-08-01',warehouse:'杭州一号仓',location:'A-01-08',status:'已入库',referenced:true,draft:false})
  ],
  'inventory-flow': [
    sample(resource('inventory-flow'),1,{id:'IF-202609-001',flowType:'采购入库',businessNo:'IN-202609-004',material:'动态心电监测耗材包',changeQty:120,beforeQty:0,afterQty:120,warehouse:'杭州一号仓',location:'A-01-08',batch:'BATCH-202608-A',status:'已记账',referenced:true,draft:false}),
    sample(resource('inventory-flow'),2,{id:'IF-202609-002',flowType:'客户耗用出库',businessNo:'MU-202609-001',material:'动态心电监测耗材包',changeQty:-2,beforeQty:120,afterQty:118,warehouse:'杭州一号仓',location:'A-01-08',batch:'BATCH-202608-A',status:'已记账',referenced:true,draft:false})
  ],
  'inventory-requisition': [
    sample(resource('inventory-requisition'),1,{id:'CON-202609-001',systemNo:'REQ-202609-001',businessType:'领用申请',documentNo:'REQ-202609-001',costObject:'体检中心 · 孙护士',applicant:'孙琪',requestDepartment:'健康管理中心',businessNo:'VO-202609-001',material:'一次性采血针',warehouse:'杭州一号仓',location:'A-01-08',batch:'BATCH-202608-A',quantity:12,requestedQty:12,outboundQty:12,remainingQty:0,status:'已完成',referenced:true,draft:false}),
    sample(resource('inventory-requisition'),2,{id:'CON-202609-002',systemNo:'MU-202609-001',businessType:'客户耗用',documentNo:'MU-202609-001',costObject:'林女士 · 医疗方案',customer:'林女士',businessNo:'VO-202609-002',material:'动态心电监测耗材包',warehouse:'杭州一号仓',location:'A-01-08',batch:'BATCH-202608-A',quantity:2,requestedQty:2,outboundQty:1,remainingQty:1,status:'部分出库',referenced:true,draft:false}),
    sample(resource('inventory-requisition'),3,{id:'CON-202609-003',systemNo:'PRJ-202609-006',businessType:'项目耗用',documentNo:'PRJ-202609-006',costObject:'睡眠改善项目',businessNo:'PRJ-202609-006',material:'检查耗材套装',warehouse:'杭州一号仓',location:'A-02-03',batch:'BATCH-202607-C',quantity:6,requestedQty:6,outboundQty:0,remainingQty:6,status:'缺货待处理',referenced:true,draft:false}),
    sample(resource('inventory-requisition'),4,{id:'CON-202609-004',systemNo:'REQ-202609-004',businessType:'领用申请',documentNo:'REQ-202609-004',costObject:'护理部 · 王护士',applicant:'王主管',requestDepartment:'护理部',businessNo:'VO-202609-001',material:'医用外科口罩',warehouse:'杭州一号仓',location:'A-01-08',batch:'BATCH-202608-A',quantity:20,requestedQty:20,outboundQty:0,remainingQty:0,status:'已取消',referenced:true,draft:false})
  ],
  'inventory-operations': [
    sample(resource('inventory-operations'),1,{id:'TR-202609-001',operationType:'调拨',businessNo:'TR-202609-001',warehouse:'杭州一号仓 → 宁波周转仓',material:'动态心电监测耗材包',status:'待审批',referenced:true,draft:false}),
    sample(resource('inventory-operations'),2,{id:'ST-202609-001',operationType:'盘点',businessNo:'ST-202609-001',warehouse:'滨江冷链仓',material:'真空采血管',status:'盘点中',referenced:true,draft:false}),
    sample(resource('inventory-operations'),3,{id:'SC-202609-001',operationType:'报废',businessNo:'SC-202609-001',warehouse:'杭州一号仓',material:'一次性采血针',status:'待审批',referenced:true,draft:false})
  ],
  'inventory-ledger': [sample(resource('inventory-ledger'),1,{id:'LOT-260820-A',name:'一次性采血针',warehouse:'杭州一号仓',quantity:1200,availableQty:1180,status:'正常',source:'期初库存'}), ...resourceData['inventory-ledger'].slice(1)],
  'asset-card': [sample(resource('asset-card'),1,{id:'AST-202608-006',name:'便携式心电设备',organization:'健康管理中心',department:'医学服务部',custodian:'设备管理员',location:'杭州中心',assetValue:6800,netValue:6800,depreciationMethod:'平均年限法',usefulLife:60,residualRate:5,status:'使用中'}), ...resourceData['asset-card'].slice(1)],
  'finance-order': [sample(resource('finance-order'),1,{id:'SO-202608-026',name:'健康管理服务订单',customer:'林女士',amount:12800,paid:0,refunded:0,status:'待收款'}), ...resourceData['finance-order'].slice(1)],
  'finance-payment': [sample(resource('finance-payment'),1,{id:'PAY-202608-001',name:'健康管理服务首笔收款',orderId:'SO-202608-026',amount:3200,paymentDate:'2026-08-28',channel:'银行转账',transactionNo:'BANK-20260828-001',status:'已确认',confirmedBy:'王主管',confirmedAt:'2026-08-28 10:20'}), ...resourceData['finance-payment'].slice(1)],
  'finance-refund': [sample(resource('finance-refund'),1,{id:'RF-202608-004',name:'健康管理服务退款申请',orderId:'SO-202608-026',amount:800,reason:'客户取消未执行服务',refundAccount:'原付款账户',status:'待审批'}), ...resourceData['finance-refund'].slice(1)],
  'approval-task': [sample(resource('approval-task'),1,{id:'AP-202608-042',name:'退款申请审批',businessId:'RF-202608-004',owner:'王主管',status:'待处理'}), ...resourceData['approval-task'].slice(1)],
  'approval-message': [
    sample(resource('approval-message'),1,{id:'MSG-VC-001',name:'周专家收到新的会诊邀请',code:'MSG-VC-001',messageType:'会诊邀请',businessId:'VC-202608-006',invitationId:'VC-INV-001',audience:'周专家',status:'未读',unread:true,summary:'林女士心血管专家会诊 · 2026-09-10 12:00',referenced:true,draft:false}),
    ...resourceData['approval-message'].slice(1)
  ],
  'medical-report': [sample(resource('medical-report'),1,{id:'PE-202608-017',name:'成人综合体检报告',customer:'林女士',status:'待确认'}), ...resourceData['medical-report'].slice(1)],
  'consultation-appointment': [
    sample(resource('consultation-appointment'),1,{id:'VC-202608-006',name:'林女士心血管专家会诊',topic:'林女士心血管专家会诊',question:'评估睡眠问题、复查节奏与运动安排',customerId:'KH-202609-001',customer:'林女士',initiator:'陈医生',expert:'周专家',participants:['周专家','王健管师'],time:'2026-09-10T12:00',endTime:'2026-09-10T13:00',snapshot:'系统按预约开始时间自动生成',attachments:['院外动态心电报告.pdf'],result:'无冲突，可以提交预约',status:'已预约',invitationStatus:'待响应',recordingStatus:'未开始',archiveStatus:'未归档',referenced:true,draft:false}),
    sample(resource('consultation-appointment'),2,{id:'VC-202608-007',name:'林女士复查会诊',topic:'林女士复查会诊',question:'确认复查指标与后续干预方案',customerId:'KH-202609-001',customer:'林女士',initiator:'王医生',expert:'周专家',participants:['周专家'],time:'2026-09-10T10:00',endTime:'2026-09-10T11:00',snapshot:'系统按预约开始时间自动生成',attachments:[],result:'无冲突，可以提交预约',status:'已预约',invitationStatus:'待响应',recordingStatus:'未开始',archiveStatus:'未归档',referenced:true,draft:false}),
    sample(resource('consultation-appointment'),3,{id:'VC-202608-008',name:'王先生会诊预约已取消',topic:'王先生会诊预约已取消',question:'原预约时间与专家日程冲突，已取消后重新安排',customerId:'KH-202609-002',customer:'王先生',initiator:'陈医生',expert:'李专家',participants:['李专家'],time:'2026-09-10T16:00',endTime:'2026-09-10T17:00',snapshot:'系统按预约开始时间自动生成',attachments:[],result:'预约已取消，待重新安排',status:'已取消',invitationStatus:'已取消',recordingStatus:'未开始',archiveStatus:'未归档',cancelReason:'原预约时间与专家日程冲突',referenced:true,draft:false}),
    sample(resource('consultation-appointment'),4,{id:'VC-202608-005',name:'林女士睡眠联合会诊',topic:'林女士睡眠联合会诊',question:'复盘睡眠干预效果并调整后续安排',customerId:'KH-202608-005',customer:'林女士',initiator:'陈医生',expert:'周专家',participants:['周专家'],time:'2026-08-29T10:00',endTime:'2026-08-29T11:00',snapshot:'系统按预约开始时间自动生成',attachments:[],result:'无冲突，可以提交预约',status:'已归档',invitationStatus:'专家已参与',recordingStatus:'已保存',recordingUrl:'prototype://consultation-recording',archiveStatus:'已归档',referenced:true,draft:false}),
    sample(resource('consultation-appointment'),5,{id:'VC-202609-001',name:'林女士睡眠管理复盘会诊',topic:'林女士睡眠管理复盘会诊',question:'复盘睡眠干预效果并确认后续执行安排',customerId:'KH-202609-001',customer:'林女士',initiator:'陈医生',expert:'周专家、王健管师',participants:['周专家','王健管师'],time:'2026-09-01T10:00',endTime:'2026-09-01T11:00',snapshot:'系统按预约开始时间自动生成',attachments:['睡眠监测报告.pdf'],result:'会诊已完成归档',status:'已归档',invitationStatus:'专家已参与',recordingStatus:'已保存',recordingUrl:'prototype://consultation-recording-completed',archiveStatus:'已归档',signatureStatus:'已签署',completedAt:'2026-09-01 11:00:00',archivedAt:'2026-09-01 11:30:00',referenced:true,draft:false}),
    ...resourceData['consultation-appointment'].slice(3)
  ],
  'consultation-invitation': [
    sample(resource('consultation-invitation'),1,{id:'VC-INV-001',name:'周专家会诊通知',code:'VC-INV-001',expert:'周专家',time:'2026-09-10T12:00',endTime:'2026-09-10T13:00',appointmentId:'VC-202608-006',customerId:'KH-202609-001',status:'已通知',result:'等待会诊开始',unread:true,referenced:true,draft:false}),
    sample(resource('consultation-invitation'),2,{id:'VC-INV-002',name:'周专家复查会诊通知',code:'VC-INV-002',expert:'周专家',time:'2026-09-10T10:00',endTime:'2026-09-10T11:00',appointmentId:'VC-202608-007',customerId:'KH-202609-001',status:'已通知',result:'等待会诊开始',unread:true,referenced:true,draft:false}),
    sample(resource('consultation-invitation'),3,{id:'VC-INV-003',name:'李专家会诊取消通知',code:'VC-INV-003',expert:'李专家',time:'2026-09-10T16:00',endTime:'2026-09-10T17:00',appointmentId:'VC-202608-008',customerId:'KH-202609-002',status:'已取消',result:'预约已取消',unread:false,referenced:true,draft:false}),
    sample(resource('consultation-invitation'),4,{id:'VC-INV-004',name:'已归档会诊通知',code:'VC-INV-004',expert:'周专家',time:'2026-08-29T10:00',appointmentId:'VC-202608-005',status:'已归档',result:'会诊已归档',referenced:true,draft:false}),
    sample(resource('consultation-invitation'),5,{id:'VC-INV-005',name:'已完成会诊通知',code:'VC-INV-005',expert:'周专家、王健管师',time:'2026-09-01T10:00',endTime:'2026-09-01T11:00',appointmentId:'VC-202609-001',customerId:'KH-202609-001',status:'已参与',result:'会诊已完成归档',unread:false,referenced:true,draft:false}),
    ...resourceData['consultation-invitation'].slice(4)
  ],
  'consultation-conclusion': [sample(resource('consultation-conclusion'),1,{id:'VC-CON-001',name:'已签字归档会诊结论',appointmentId:'VC-202608-005',customerId:'KH-202608-005',status:'已归档',signature:'周专家',signatureTasks:[{participant:'周专家',status:'已签署'}],referenced:true,draft:false}), sample(resource('consultation-conclusion'),2,{id:'VC-CON-002',name:'睡眠管理复盘会诊结论',appointmentId:'VC-202609-001',customerId:'KH-202609-001',status:'已签署',opinion:'建议继续执行睡眠干预计划，四周后复查睡眠质量与运动耐量。',signature:'周专家、王健管师',signatureTasks:[{participant:'周专家',status:'已签署',signedAt:'2026-09-01 11:12:00'},{participant:'王健管师',status:'已签署',signedAt:'2026-09-01 11:18:00'}],concludedAt:'2026-09-01 11:05:00',referenced:true,draft:false}), ...resourceData['consultation-conclusion'].slice(2)],
  'consultation-report': [sample(resource('consultation-report'),1,{id:'VC-RPT-001',name:'已归档会诊记录',appointmentId:'VC-202608-005',customerId:'KH-202608-005',status:'已归档',signature:'周专家',recordingStatus:'已保存',referenced:true,draft:false}), sample(resource('consultation-report'),2,{id:'VC-RPT-002',name:'睡眠管理复盘会诊记录',appointmentId:'VC-202609-001',customerId:'KH-202609-001',status:'已归档',signature:'周专家、王健管师',recordingStatus:'已保存',actualParticipants:['周专家','王健管师'],referenced:true,draft:false}), ...resourceData['consultation-report'].slice(2)],
  'consultation-room': [sample(resource('consultation-room'),1,{id:'VC-ROOM-001',name:'已归档会诊房间',appointmentId:'VC-202608-005',status:'已归档',recording:'已保存',actualParticipants:[{name:'周专家',joinedAt:'2026-08-29 09:58',leftAt:'2026-08-29 10:42'}],referenced:true,draft:false}), sample(resource('consultation-room'),2,{id:'VC-ROOM-002',name:'睡眠管理复盘会诊房间',appointmentId:'VC-202609-001',status:'已结束',recording:'已保存',recordingUrl:'prototype://consultation-recording-completed',enteredAt:'2026-09-01 09:58:00',endedAt:'2026-09-01 11:00:00',actualParticipants:[{name:'陈医生',joinedAt:'2026-09-01 09:57',leftAt:'2026-09-01 11:00'},{name:'周专家',joinedAt:'2026-09-01 09:58',leftAt:'2026-09-01 10:58'},{name:'王健管师',joinedAt:'2026-09-01 09:59',leftAt:'2026-09-01 10:56'}],referenced:true,draft:false}), ...resourceData['consultation-room'].slice(2)],
  'consultation-device': [sample(resource('consultation-device'),1,{id:'VC-DEVICE-001',name:'已归档会诊设备检查',appointmentId:'VC-202608-005',status:'已归档',identityCheck:'通过',deviceCheck:'摄像头、麦克风检查通过',referenced:true,draft:false}), sample(resource('consultation-device'),2,{id:'VC-DEVICE-002',name:'睡眠管理复盘会诊设备检查',appointmentId:'VC-202609-001',status:'已完成',identityCheck:'通过',deviceCheck:'摄像头、麦克风和网络检查通过',checkedAt:'2026-09-01 09:55:00',referenced:true,draft:false}), ...resourceData['consultation-device'].slice(2)],
  'talent-factor': [
    { id:'TAL-FAC-001', name:'逻辑思维', factor:'逻辑思维', category:'认知能力', description:'理解结构、拆解问题并建立推理路径的能力。', displayInfo:'报告中按第一项展示。', displayOrder:1, status:'已启用', referenced:true },
    { id:'TAL-FAC-002', name:'专注力', factor:'专注力', category:'行为能力', description:'持续投入目标任务并抵抗干扰的能力。', displayInfo:'报告中按第二项展示。', displayOrder:2, status:'已启用', referenced:true }
  ],
  'talent-level': [
    { id:'TAL-LVL-001', name:'逻辑思维 L2', factor:'逻辑思维', level:'L2', displayOrder:2, scope:'儿童 6–11 岁', status:'已启用', referenced:true },
    { id:'TAL-LVL-002', name:'专注力 L2', factor:'专注力', level:'L2', displayOrder:2, scope:'儿童 6–11 岁', status:'已启用', referenced:true }
  ],
  'talent-note': [
    { id:'TAL-NOTE-001', name:'逻辑思维 L2 固定注解', factor:'逻辑思维', level:'L2', annotation:'在结构化任务中表现稳定，适合通过目标拆分持续强化。', status:'已启用', referenced:true },
    { id:'TAL-NOTE-002', name:'专注力 L2 固定注解', factor:'专注力', level:'L2', annotation:'能在明确目标下保持投入，可逐步延长专注时长。', status:'已启用', referenced:true }
  ],
  'talent-content-library': [{ id:'TAL-LIB-001', name:'儿童成长内容库', contentSet:'儿童成长内容库', description:'用于 6–11 岁孩子的固定注解与培养内容。', scope:'儿童 6–11 岁', status:'已启用', referenced:true }],
  'talent-nurture-content': [
    { id:'TAL-NUR-001', name:'逻辑思维结构化练习', title:'逻辑思维结构化练习', factor:'逻辑思维', level:'L2', minAge:6, maxAge:11, gender:'通用', contentSet:'儿童成长内容库', content:'使用分类、排序和复盘练习强化结构化思考。', priority:1, status:'已启用', referenced:true },
    { id:'TAL-NUR-002', name:'专注力任务专注练习', title:'专注力任务专注练习', factor:'专注力', level:'L2', minAge:6, maxAge:11, gender:'通用', contentSet:'儿童成长内容库', content:'以短时清单和完成反馈逐步延长专注时间。', priority:2, status:'已启用', referenced:true }
  ],
  'talent-report-type': [{ id:'TAL-VER-001', name:'儿童成长潜能', reportName:'儿童成长潜能', reportType:'儿童成长潜能', ageRange:'儿童 6–11 岁', gender:'通用', contentSet:'儿童成长内容库', status:'启用', referenced:true }],
  'talent-matching-rule': [
    { id:'TAL-VER-COND-001', name:'儿童成长潜能 · 逻辑思维', reportType:'儿童成长潜能', factor:'逻辑思维', resultMin:70, resultMax:100, resultRange:'70–100 分', level:'L2', contentSet:'儿童成长内容库', candidateContent:'逻辑思维结构化练习', priority:1, status:'已启用', referenced:true },
    { id:'TAL-VER-COND-002', name:'儿童成长潜能 · 专注力', reportType:'儿童成长潜能', factor:'专注力', resultMin:70, resultMax:100, resultRange:'70–100 分', level:'L2', contentSet:'儿童成长内容库', candidateContent:'专注力任务专注练习', priority:2, status:'已启用', referenced:true }
  ],
  'talent-parent': [{ id:'TAL-PARENT-001', name:'周女士', parentName:'周女士', mobile:'13800001234', idNo:'330106198801010018', organization:'杭州天赋中心', channel:'直营', status:'启用', referenced:true }],
  'talent-child': [
    { id:'TAL-CHILD-001', name:'周子涵', parentId:'TAL-PARENT-001', childName:'周子涵', idNo:'330106201509120012', birthDate:'2015-09-12', gender:'女', organization:'杭州天赋中心', channel:'直营', status:'启用', referenced:true },
    { id:'TAL-CHILD-002', name:'周子安', parentId:'TAL-PARENT-001', childName:'周子安', idNo:'330106201803210017', birthDate:'2018-03-21', gender:'男', organization:'杭州天赋中心', channel:'直营', status:'启用', referenced:true }
  ],
  'talent-member-relation': [
    { id:'TAL-REL-001', name:'周女士与周子涵', parentId:'TAL-PARENT-001', childId:'TAL-CHILD-001', relationType:'母亲', organization:'杭州天赋中心', channel:'直营', status:'有效', referenced:true },
    { id:'TAL-REL-002', name:'周女士与周子安', parentId:'TAL-PARENT-001', childId:'TAL-CHILD-002', relationType:'母亲', organization:'杭州天赋中心', channel:'直营', status:'有效', referenced:true }
  ],
  'talent-import': [],
  'talent-generation': [
    { id:'TAL-RESULT-001', name:'周子涵结果', childId:'TAL-CHILD-001', externalReportId:'EXT-REPORT-001', analyzedAt:'2026-08-28T14:30:00', source:'接口回传', completeness:'完整', status:'待发布', generatedAt:'2026-08-28T14:31:00', result:'已自动校验、匹配并生成报告', referenced:true },
    { id:'TAL-RESULT-002', name:'周子安结果', childId:'TAL-CHILD-002', externalReportId:'EXT-REPORT-002', analyzedAt:'2026-08-29T10:00:00', source:'接口回传', completeness:'完整', status:'已发布', generatedAt:'2026-08-29T10:01:00', result:'已发布', referenced:true }
  ],
  'talent-report': [
    { id:'TAL-REPORT-001', name:'周子涵成长天赋报告', childId:'TAL-CHILD-001', customer:'周子涵', externalReportId:'EXT-REPORT-001', reportType:'儿童成长潜能', sourceResultId:'TAL-RESULT-001', receivedAt:'2026-08-28T14:30:00', generatedAt:'2026-08-28T14:31:00', reportBody:'基于第三方结果、要素分级、固定注解和培养内容自动生成。', attachment:'周子涵成长天赋报告.pdf', contentSnapshot:{ frozen:true, versionRule:{ ageRange:'儿童 6–11 岁', gender:'通用', contentLibrary:'儿童成长内容库' }, analyzedAge:10, gender:'女', factors:[{ factor:'逻辑思维', resultValue:82, conditionId:'TAL-VER-COND-001', resultRange:'70–100 分', level:'L2', candidateContent:'逻辑思维结构化练习' }, { factor:'专注力', resultValue:76, conditionId:'TAL-VER-COND-002', resultRange:'70–100 分', level:'L2', candidateContent:'专注力任务专注练习' }], notes:['在结构化任务中表现稳定。'], nurture:['逻辑思维结构化练习','专注力任务专注练习'] }, status:'待发布', referenced:true },
    { id:'TAL-REPORT-002', name:'周子安成长天赋报告', childId:'TAL-CHILD-002', customer:'周子安', externalReportId:'EXT-REPORT-002', reportType:'儿童成长潜能', sourceResultId:'TAL-RESULT-002', receivedAt:'2026-08-29T10:00:00', generatedAt:'2026-08-29T10:01:00', publishedAt:'2026-08-29T10:10:00', reportBody:'基于第三方结果、要素分级、固定注解和培养内容自动生成。', attachment:'周子安成长天赋报告.pdf', contentSnapshot:{ frozen:true, versionRule:{ ageRange:'儿童 6–11 岁', gender:'通用', contentLibrary:'儿童成长内容库' }, analyzedAge:8, gender:'男', factors:[{ factor:'逻辑思维', resultValue:82, conditionId:'TAL-VER-COND-001', resultRange:'70–100 分', level:'L2', candidateContent:'逻辑思维结构化练习' }, { factor:'专注力', resultValue:76, conditionId:'TAL-VER-COND-002', resultRange:'70–100 分', level:'L2', candidateContent:'专注力任务专注练习' }], notes:['能在明确目标下保持投入。'], nurture:['逻辑思维结构化练习','专注力任务专注练习'] }, status:'已发布', referenced:true }
  ],
  'checkup-sync': [
    sample(resource('checkup-sync'),1,{id:'SYNC-PREVIEW-001',name:'体检同步预览 · 20260828',sourceSystem:'体检系统',externalCode:'EXT-DBIL-01',standardCode:'D-Bi1-V',mappingRule:'名称 + 编码联合匹配',unitType:'umol/L',category:'血液检查',physiologicalSystem:'消化腺系统',batch:'20260828 体检基线',fileName:'正确顺序体检数据（20260828）.xlsx',scope:'体检检验项目',effectiveTime:'2026-08-28 18:00',mappingVersion:'MAP-2026.08',filteredCount:3,pendingCount:3,failureCount:1,result:'等待预览同步结果',status:'待同步'}),
    sample(resource('checkup-sync'),2,{id:'SYNC-20260828-001',name:'体检同步批次 · 20260828',sourceSystem:'体检系统',externalCode:'EXT-CHECKUP-20260828',standardCode:'CHECKUP-BATCH',mappingRule:'名称 + 编码联合匹配',unitType:'标准单位',category:'综合体检',physiologicalSystem:'多系统',batch:'20260828 体检基线',fileName:'正确顺序体检数据（20260828）.xlsx',scope:'133 个标准体检项目',effectiveTime:'2026-08-28 18:15',mappingVersion:'MAP-2026.08',filteredCount:3,pendingCount:3,failureCount:0,result:'同步完成',status:'已完成'}),
    ...resourceData['checkup-sync'].slice(2)
  ],
  'integration-call': [sample(resource('integration-call'),1,{id:'INT-ORDER-003',name:'订单中心状态同步',direction:'接收',status:'失败',attempts:2,errorMessage:'接口连接超时'}), ...resourceData['integration-call'].slice(1)]
})

// 天赋报告使用真实规模的要素目录；前两项保留为回传演示，其余要素用于目录、分类和详情阅读路径。
const talentFactorNames = [
  '逻辑思维','专注力','空间感知','语言表达','情绪感知','行动规划',
  ...Array.from({ length: 100 }, (_, index) => `天赋要素${String(index + 1).padStart(3, '0')}`)
]
resourceData['talent-factor'] = talentFactorNames.map((factor, index) => ({
  id:`TAL-FAC-${String(index + 1).padStart(3, '0')}`, name:factor, factor,
  category:index < 2 ? (index === 0 ? '认知能力' : '行为能力') : ['认知能力','行为能力','社会情绪','发展能力'][index % 4],
  description:index < 2 ? resourceData['talent-factor'][index]?.description : `用于报告展示的${factor}说明。`,
  displayInfo:`报告第 ${index + 1} 项`, displayOrder:index + 1, status:'已启用', referenced:true
}))
for (const [index, factor] of talentFactorNames.entries()) {
  if (index < 2) continue
  const id = String(index + 1).padStart(3, '0')
  resourceData['talent-level'].push({ id:`TAL-LVL-${id}`, name:`${factor} L2`, factor, level:'L2', displayOrder:2, scope:'儿童 6–11 岁', status:'已启用', referenced:true })
  resourceData['talent-note'].push({ id:`TAL-NOTE-${id}`, name:`${factor} L2 固定注解`, factor, level:'L2', annotation:`${factor}在结构化任务中表现稳定，可通过日常练习持续强化。`, status:'已启用', referenced:true })
  resourceData['talent-nurture-content'].push({ id:`TAL-NUR-${id}`, name:`${factor}日常练习`, title:`${factor}日常练习`, factor, level:'L2', minAge:6, maxAge:11, gender:'通用', contentSet:'儿童成长内容库', content:`通过日常任务持续练习${factor}。`, status:'已启用', referenced:true })
  resourceData['talent-matching-rule'].push({ id:`TAL-VER-COND-${id}`, name:`儿童成长潜能 · ${factor}`, factor, resultMin:0, resultMax:100, resultRange:'0–100 分', level:'L2', contentSet:'儿童成长内容库', candidateContent:`${factor}日常练习`, priority:1, status:'已启用', referenced:true })
}

// 审批协同 BPM 演示状态：与通用 resources 并存，保留 approval-task/application/message 等旧入口兼容。
const approvalSeed = {
  forms: [
    {
      id: 'FORM-PURCHASE-001', code: 'FORM-PURCHASE', name: '采购申请动态表单', status: '已发布', version: 2,
      fields: [
        { id: 'purchase-material', name: 'material', label: '采购物料', type: 'text', required: true },
        { id: 'purchase-quantity', name: 'quantity', label: '采购数量', type: 'number', required: true },
        { id: 'purchase-amount', name: 'amount', label: '预算金额', type: 'money', required: true },
        { id: 'purchase-supplier', name: 'supplier', label: '供应商', type: 'select', options: ['安澜医疗用品有限公司', '明康检验设备有限公司'], required: true },
        { id: 'purchase-attachment', name: 'attachment', label: '报价附件', type: 'file', required: false }
      ],
      versions: [{ version: 1, status: '已归档' }, { version: 2, status: '已发布' }], usageRecords: ['FLOW-PURCHASE-001']
    },
    {
      id: 'FORM-REFUND-001', code: 'FORM-REFUND', name: '退款申请动态表单', status: '已发布', version: 1,
      fields: [
        { id: 'refund-order', name: 'orderId', label: '原订单', type: 'text', required: true },
        { id: 'refund-amount', name: 'amount', label: '退款金额', type: 'money', required: true },
        { id: 'refund-reason', name: 'reason', label: '退款原因', type: 'textarea', required: true },
        { id: 'refund-applicant', name: 'applicant', label: '申请人', type: 'user', required: true },
        { id: 'refund-attachment', name: 'attachment', label: '证明附件', type: 'file', required: false }
      ],
      versions: [{ version: 1, status: '已发布' }], usageRecords: ['FLOW-REFUND-001']
    }
  ],
  flows: [
    {
      id: 'FLOW-PURCHASE-001', code: 'FLOW-PURCHASE', name: '采购申请审批流程', formId: 'FORM-PURCHASE-001', status: '已发布', version: 2,
      nodes: [
        { id: 'purchase-start', type: 'start', name: '开始' },
        { id: 'purchase-dept', type: 'approval', name: '部门负责人审批', assigneeType: 'department-leader', assignee: '王主管' },
        { id: 'purchase-condition', type: 'condition', name: '金额条件分支', expression: 'amount > 10000', branches: [{ id: 'purchase-high', label: '金额大于 10000', expression: 'amount > 10000' }, { id: 'purchase-normal', label: '金额不超过 10000', expression: 'amount <= 10000' }] },
        { id: 'purchase-finance', type: 'approval', name: '资金经营审批', assigneeType: 'role', assignee: 'finance' },
        { id: 'purchase-cc', type: 'cc', name: '抄送采购人员', assigneeType: 'role', assignee: 'buyer' },
        { id: 'purchase-end', type: 'end', name: '结束' }
      ],
      edges: [
        { id: 'purchase-edge-1', source: 'purchase-start', target: 'purchase-dept' },
        { id: 'purchase-edge-2', source: 'purchase-dept', target: 'purchase-condition' },
        { id: 'purchase-edge-3', source: 'purchase-condition', target: 'purchase-finance', label: '金额大于 10000' },
        { id: 'purchase-edge-4', source: 'purchase-condition', target: 'purchase-cc', label: '金额不超过 10000' },
        { id: 'purchase-edge-5', source: 'purchase-finance', target: 'purchase-cc' },
        { id: 'purchase-edge-6', source: 'purchase-cc', target: 'purchase-end' }
      ],
      expressions: ['amount > 10000', 'form.supplier != null'], listeners: ['流程提交监听器', '审批完成监听器'], versions: [{ version: 1, status: '已归档' }, { version: 2, status: '已发布' }], runCount: 12
    },
    {
      id: 'FLOW-REFUND-001', code: 'FLOW-REFUND', name: '退款申请审批流程', formId: 'FORM-REFUND-001', status: '已发布', version: 1,
      nodes: [
        { id: 'refund-start', type: 'start', name: '开始' },
        { id: 'refund-approval', type: 'approval', name: '退款审批', assigneeType: 'role', assignee: 'approver', multiInstance: true },
        { id: 'refund-cc', type: 'cc', name: '抄送资金经营人员', assigneeType: 'role', assignee: 'finance' },
        { id: 'refund-end', type: 'end', name: '结束' }
      ],
      edges: [{ id: 'refund-edge-1', source: 'refund-start', target: 'refund-approval' }, { id: 'refund-edge-2', source: 'refund-approval', target: 'refund-cc' }, { id: 'refund-edge-3', source: 'refund-cc', target: 'refund-end' }],
      expressions: ['amount > 0'], listeners: ['退款审批完成监听器'], versions: [{ version: 1, status: '已发布' }], runCount: 5
    }
  ],
  instances: [
    { id: 'PI-REFUND-202608-004', flowId: 'FLOW-REFUND-001', formId: 'FORM-REFUND-001', businessId: 'RF-202608-004', resourceId: 'finance-refund', title: '健康管理服务退款申请', status: '审批中', initiator: '资金经营人员', currentNodeId: 'refund-approval', formData: { orderId: 'SO-202608-026', amount: 800, reason: '客户取消未执行服务' }, attachments: [], history: [{ nodeId: 'refund-start', nodeName: '开始', action: '提交', actor: '资金经营人员', time: '2026-08-28 09:08:00' }], records: [{ nodeId: 'refund-start', nodeName: '开始', action: '提交', actor: '资金经营人员', time: '2026-08-28 09:08:00' }], createdAt: '2026-08-28 09:08:00', updatedAt: '2026-08-28 09:18:00' }
  ],
  tasks: [
    { id: 'TASK-REFUND-202608-004', instanceId: 'PI-REFUND-202608-004', businessId: 'RF-202608-004', resourceId: 'finance-refund', nodeId: 'refund-approval', nodeName: '退款审批', status: '待处理', assignee: '王主管', candidateUsers: ['王主管', '财务审批人'], createdAt: '2026-08-28 09:08:00', updatedAt: '2026-08-28 09:18:00' }
  ],
  messages: [{ id: 'APMSG-001', businessId: 'RF-202608-004', instanceId: 'PI-REFUND-202608-004', type: '待办提醒', title: '退款申请待审批', content: '健康管理服务退款申请等待审批', unread: true, createdAt: '2026-08-28 09:18:00' }],
  notices: [{ id: 'APNOTICE-001', title: '审批协同上线说明', content: '采购与退款申请已接入 BPM 审批流程。', status: '已发布', createdAt: '2026-08-28 09:00:00' }],
  expressions: [{ id: 'EXPR-001', name: '采购金额大于一万元', expression: 'amount > 10000', status: '启用' }, { id: 'EXPR-002', name: '退款金额有效', expression: 'amount > 0', status: '启用' }],
  listeners: [{ id: 'LISTENER-001', name: '审批完成消息监听器', event: '任务完成', handler: '消息通知', status: '启用' }]
}

export const seedState = {
  schemaVersion: '4.0.0', prototypeVersion: '2026.09.23-talent-plan-rework', currentRole: 'hr',
  approval: approvalSeed,
  resources: resourceData, filters: { domain:'people', resource:'hr-organization', keyword:'', status:'全部', feature:'' },
  visitOrder: {
    id: 'VO-202609-001',
    orderId: '',
    visitType: 'first',
    customer: '林女士',
    status: 'draft',
    submittedPlanTypes: [],
    health: {
      status: 'draft',
      projectIds: ['health-sleep', 'health-exercise'],
      items: [{ project:'睡眠管理', material:'睡眠营养包', materialOptions:['睡眠营养包','运动恢复营养包'], specification:'30 袋/盒', quantity:1, availableQty:18 }],
      servicePeriod: '4 周',
      amount: 1280,
      doctorSignature: '陈医生（已签）',
      customerSignature: '待客户签字',
      implementationUnlocked: false,
      inventoryCommitted: false
    },
    medical: {
      status: 'draft',
      projectIds: ['medical-ecg'],
      items: [{ project:'动态心电图', material:'动态心电监测耗材包', materialOptions:['动态心电监测耗材包','便携式心电贴'], specification:'1 套', quantity:1, availableQty:18 }],
      servicePeriod: '单次检查',
      amount: 680,
      doctorSignature: '陈医生（已签）',
      customerSignature: '待客户签字',
      implementationUnlocked: false,
      nurseTaskStatus: '未生成',
      inventoryCommitted: false
    },
    implementationPlans: {
      health: { unlocked:false, title:'健康管理方案实施计划', cycle:'每周 2 次，共 4 周', executor:'客户服务专员', reminder:'执行前 1 天提醒', status:'未解锁', records:[] },
      medical: { unlocked:false, title:'医学治疗方案实施计划', cycle:'按预约日期执行', executor:'医生与护士', reminder:'执行前 2 小时提醒', status:'未解锁', records:[] }
    },
    preconditionResult: { blocking:[], warnings:[] },
    handoffStatus: '未转后台处理',
    backoffice: { status:'待收款', exceptionRecords:[] },
    source: { type:'customer-service', label:'客户服务订单', id:'VO-202609-001', no:'VO-202609-001' },
    finance: {
      receivableAmount: 0,
      paidAmount: 0,
      refundingAmount: 0,
      refundedAmount: 0,
      financeStatus: '待收款',
      invoiceStatus: '待申请',
      reconciliationStatus: '待对账',
      snapshots: [],
      paymentRecords: [],
      refundRequests: [],
      invoiceRecords: [],
      reconciliationRecords: [],
      timeline: []
    }
  },
  favoriteTemplates: [
    { id:'FAV-0001', scope:'personal', planType:'health', projectIds:['health-sleep', 'health-exercise'] },
    { id:'FAV-0002', scope:'personal', planType:'medical', projectIds:['medical-ecg'] }
  ],
  audit: [
    { id:'AUD-0004', time:'2026-08-28 09:18:00', actor:'王主管', action:'审批任务待处理', targetId:'AP-202608-042', detail:'等待部门负责人审批', resourceId:'approval-task' },
    { id:'AUD-0003', time:'2026-08-28 09:12:00', actor:'演示系统', action:'分派审批任务', targetId:'AP-202608-042', detail:'分派至部门负责人', resourceId:'approval-task' },
    { id:'AUD-0002', time:'2026-08-28 09:08:00', actor:'资金经营人员', action:'创建审批任务', targetId:'AP-202608-042', detail:'退款申请提交后自动创建', resourceId:'approval-task' },
    { id:'AUD-0001', time:'2026-08-28 09:00:00', actor:'系统', action:'初始化业务数据', targetId:'INIT-001' },
    { id:'AUD-VC-003', time:'2026-09-03 09:15:00', actor:'陈医生', action:'创建会诊预约', targetId:'VC-202608-006', detail:'已关联林女士问诊记录并通知周专家、王健管师', resourceId:'consultation-appointment' },
    { id:'AUD-VC-002', time:'2026-09-03 09:16:00', actor:'系统', action:'生成会诊资料截点', targetId:'VC-202608-006', detail:'按预约开始时间自动生成资料截点', resourceId:'consultation-appointment' },
    { id:'AUD-VC-001', time:'2026-09-03 09:17:00', actor:'系统', action:'发送会诊通知', targetId:'VC-202608-006', detail:'周专家、王健管师收到站内通知', resourceId:'consultation-appointment' },
    { id:'AUD-VC-006', time:'2026-09-01 11:30:00', actor:'陈医生', action:'归档会诊', targetId:'VC-202609-001', detail:'结论、签署、实际参会记录和录像已归档', resourceId:'consultation-report' },
    { id:'AUD-VC-005', time:'2026-09-01 11:20:00', actor:'系统', action:'录像回调完成', targetId:'VC-202609-001', detail:'云端录像已保存，回看仍需独立权限', resourceId:'consultation-room' },
    { id:'AUD-VC-004', time:'2026-09-01 11:18:00', actor:'王健管师', action:'签署会诊结论', targetId:'VC-202609-001', detail:'王健管师已完成签署', resourceId:'consultation-conclusion' },
    { id:'AUD-VC-007', time:'2026-09-01 11:05:00', actor:'陈医生', action:'填写会诊结论', targetId:'VC-202609-001', detail:'已按实际参会人生成签署任务', resourceId:'consultation-conclusion' },
    { id:'AUD-VC-008', time:'2026-09-01 11:00:00', actor:'陈医生', action:'结束会诊', targetId:'VC-202609-001', detail:'实际参会和入离会时间已记录，等待发起医生填写结论', resourceId:'consultation-room' }
  ],
  terminalDemo: {
    inquiry: {
      id: '',
      customerId: 'KH-202609-001',
      customer: '林女士',
      status: '编辑中',
      brainDraftAccepted: false,
      consultationStarted: false,
      lastMessage: '请先保存问诊记录，再发起会诊。'
    },
    medicalUse: {
      id: 'MU-202609-001',
      customer: '林女士',
      planName: '心血管复查医疗方案',
      material: '动态心电监测耗材包',
      requestedQty: 2,
      actualQty: null,
      status: '未生成',
      taskStatus: '未生成',
      planLocked: false,
      stockWrittenBack: false,
      lastMessage: '医疗方案尚未提交耗用申请。'
    },
    healthPlan: {
      id: 'HP-202609-001',
      customer: '林女士',
      planName: '睡眠与运动健康管理方案',
      status: '草稿',
      taskCreated: false,
      stockChanged: false,
      lastMessage: '健康方案草稿已准备，提交后按一期规则直接扣减对应物料。'
    },
    inventory: {
      material: '动态心电监测耗材包',
      batch: 'ECG-202608-A',
      availableQty: 18,
      unitCost: 68,
      costAmount: 0,
      lastFlow: '期初库存'
    },
    consultation: {
      id: 'VC-202609-001',
      viewer: '陈医生',
      customer: '林女士',
      expert: '周专家',
      status: '按角色处理',
      lastMessage: '会诊状态来自预约、邀请、入会、结论、签署、录制和归档记录。'
    },
    talent: {
      currentParentId: 'TAL-PARENT-001',
      selectedChildId: 'TAL-CHILD-001',
      loggedIn: true,
      memberImport: '尚未导入',
      ruleImport: '尚未导入'
    }
  },
  counters: { record:100, audit:4 },
  dashboard: { inventoryQuantity:1200, receivable:12800, paid:0, refunded:0, publishedMedical:0, archivedConsultations:0, publishedTalent:1 }
}

// 运行时只保留最小闭环字段；旧演示数据中的修订号、快照和附件文本不再作为业务概念。
for (const result of seedState.resources['talent-generation'] || []) { delete result.revision; delete result.reportVersion; delete result.resultVersion }
for (const report of seedState.resources['talent-report'] || []) {
  const legacy = report.contentSnapshot || {}
  report.results = Array.isArray(legacy.factors)
    ? legacy.factors.map((factor, index) => ({
      factor:factor.factor, resultValue:factor.resultValue, resultRange:factor.resultRange, level:factor.level,
      matchStatus:'已匹配', note:legacy.notes?.[index] || (factor.factor === '逻辑思维' ? '在结构化任务中表现稳定，适合通过目标拆分持续强化。' : '能在明确目标下保持投入，可逐步延长专注时长。'),
      nurtureTitle:factor.candidateContent || legacy.nurture?.[index] || '', nurtureContent:factor.content || factor.candidateContent || legacy.nurture?.[index] || '', nurtureBody:factor.content || factor.candidateContent || legacy.nurture?.[index] || '', ruleId:factor.conditionId, conditionId:factor.conditionId, ruleVersion:1, noteVersion:1, contentVersion:1
    }))
    : []
  const existingFactors = new Set(report.results.map(item => item.factor))
  for (const [index, factor] of talentFactorNames.entries()) {
    if (existingFactors.has(factor)) continue
    report.results.push({ factor, resultValue:60 + (index % 41), resultRange:'0–100 分', level:'L2', matchStatus:'已匹配', note:`${factor}在结构化任务中表现稳定，可通过日常练习持续强化。`, nurtureContent:`${factor}日常练习`, nurtureBody:`${factor}日常练习`, ruleVersion:1, noteVersion:1, contentVersion:1 })
  }
  report.contentSnapshot = { ...legacy, frozen:true, version:1, generatedAt:report.generatedAt || report.receivedAt, factors:report.results.map(item => ({ ...item })), rawResults:report.rawResults || report.results }
  report.interpretations = report.results.map(item => ({ ...item }))
  delete report.revision
  delete report.reportVersion
  delete report.attachment
  if (report.status === '已归档') report.status = '已撤回'
}
