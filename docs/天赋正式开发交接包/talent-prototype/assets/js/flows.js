const field = (name, label, type = 'text', options = [], required = true) => ({ name, label, type, options, required })
import { resourceRegistry } from './catalog-data.js?v=talent-1.0.8'

export const resourceActionDefinitions = {
  'resource-query': { label: '查询', status: null },
  'resource-detail': { label: '查看详情', status: null },
  'resource-create': { label: '新增', status: '草稿' },
  'resource-update': { label: '编辑', status: null },
  'resource-delete': { label: '删除', status: null },
  'resource-enable': { label: '启用', status: '已启用' },
  'resource-disable': { label: '停用', status: '已停用' },
  'resource-submit': { label: '提交', status: '待审批' },
  'resource-withdraw': { label: '撤回', status: '草稿' },
  'resource-cancel': { label: '取消', status: '已取消' },
  'resource-void': { label: '作废', status: '已作废' },
  'resource-archive': { label: '归档', status: '已归档' },
  'resource-publish': { label: '发布', status: '已发布' },
  'resource-generate': { label: '生成', status: '已生成' },
  'resource-import': { label: '导入', status: '已导入' },
  'resource-confirm': { label: '确认', status: '已确认' },
  'resource-close': { label: '关闭', status: '已关闭' },
  'resource-print': { label: '打印', status: null },
  'resource-export': { label: '导出', status: null },
  'resource-bind': { label: '绑定', status: '已绑定' },
  'resource-unbind': { label: '解绑', status: '已解绑' },
  'approval-approve': { label: '审批通过', status: '已通过' },
  'approval-reject': { label: '审批驳回', status: '已驳回' },
  'approval-return': { label: '退回上一步', status: '已退回' },
  'approval-transfer': { label: '转办', status: '已转办' },
  'approval-supplement': { label: '补充材料', status: '待补充材料' },
  'approval-claim': { label: '认领任务', status: '待处理' },
  'approval-unclaim': { label: '取消认领', status: '待认领' },
  'approval-delegate': { label: '委派', status: '委派中' },
  'approval-resolve': { label: '解决委派', status: '待处理' },
  'approval-assign': { label: '指定办理人', status: '待处理' },
  'approval-draft': { label: '保存审批草稿', status: '草稿' },
  'approval-submit-start': { label: '提交并发起流程', status: '审批中' },
  'approval-form-field-add': { label: '新增表单字段', status: null },
  'approval-form-field-update': { label: '修改表单字段', status: null },
  'approval-form-field-remove': { label: '删除表单字段', status: null },
  'approval-flow-node-add': { label: '新增流程节点', status: null },
  'approval-flow-node-update': { label: '修改流程节点', status: null },
  'approval-flow-node-remove': { label: '删除流程节点', status: null },
  'approval-flow-branch-add': { label: '新增条件分支', status: null },
  'approval-flow-branch-update': { label: '修改条件分支', status: null },
  'approval-flow-branch-remove': { label: '删除条件分支', status: null },
  'integration-retry': { label: '失败重试', status: '成功' },
  'integration-compensate': { label: '人工补偿', status: '已补偿' },
  'integration-preview': { label: '预览同步', status: '待确认' },
  'integration-confirm': { label: '确认同步', status: '已完成' },
  'checkup-config-field': { label: '配置字段映射', status: null },
  'checkup-config-item': { label: '配置项目映射', status: null },
  'checkup-config-classify': { label: '配置排除与归类', status: null },
  'integration-execute': { label: '处理当前业务', status: '已完成' },
  'analysis-refresh': { label: '刷新经营分析', status: null },
  'analysis-drilldown': { label: '查看分析明细', status: null },
  'finance-run-match': { label: '执行三单匹配', status: null },
  'finance-match-difference': { label: '处理匹配差异', status: null },
  'consultation-device-camera': { label: '检测摄像头', status: '已完成' },
  'consultation-device-microphone': { label: '检测麦克风', status: '已完成' },
  'consultation-room-auth': { label: '检查会诊房间', status: '已就绪' },
  'consultation-room-enter': { label: '进入会诊', status: '进行中' },
  'consultation-room-record': { label: '开始云端录制', status: '录制中' },
  'consultation-room-control': { label: '会中控制', status: null },
  'consultation-room-media': { label: '多人音视频', status: '进行中' },
  'consultation-member-mute': { label: '成员静音', status: '已静音' },
  'consultation-member-remove': { label: '移出成员', status: '已移出' },
  'finance-payment': { label: '登记收款', status: '已收款' },
  'finance-refund': { label: '执行退款', status: '已退款' },
  'finance-reconcile': { label: '完成对账', status: '已对账' },
  'finance-issue-invoice': { label: '登记开票', status: '已开票' },
  'approval-form-design': { label: '设计表单', status: null },
  'approval-form-copy': { label: '复制业务表单', status: '草稿' },
  'approval-flow-copy': { label: '复制审批流程', status: '草稿' },
  'approval-node-sort': { label: '调整节点顺序', status: null },
  'approval-branch-sort': { label: '调整分支顺序', status: null },
  'doctor-plan-favorite-health': { label: '收藏健康管理方案', status: '已通过' },
  'doctor-plan-favorite-medical': { label: '收藏医疗方案', status: '已通过' },
  'doctor-plan-apply': { label: '带入当前开单', status: null },
  'doctor-plan-rename': { label: '重命名常用方案', status: null },
  'inventory-inspect': { label: '到货验收', status: '验收通过' },
  'inventory-freeze-toggle': { label: '冻结/解冻库存', status: null },
  'consultation-operate': { label: '执行会诊操作', status: '进行中' },
  'consultation-sign': { label: '签字归档', status: '已归档' },
  'consultation-accept': { label: '接受邀请', status: '已接受' },
  'consultation-decline': { label: '拒绝邀请', status: '已拒绝' },
  'consultation-conflict': { label: '反馈时间冲突', status: '时间冲突' },
  'finance-payment-confirm': { label: '确认收款', status: '已确认' },
  'finance-payment-unconfirm': { label: '撤销收款确认', status: '已收款' },
  'finance-refund-confirm': { label: '确认退款申请', status: '已确认' },
  'finance-reconciliation-submit': { label: '提交对账单', status: '待对账' },
  'finance-reconciliation-confirm': { label: '确认对账结果', status: '已确认' },
  'finance-reconciliation-unconfirm': { label: '撤销对账确认', status: '待对账' },
  'consultation-room-confirm': { label: '确认会诊房间', status: '已确认' },
  'consultation-room-cancel': { label: '取消会诊房间', status: '已取消' },
  'feature-execute': { label: '处理当前业务', status: '已完成' }
}

export const genericForms = {
  'resource-create': { title:'新增记录', fields:[field('name','名称'),field('owner','负责人')] },
  'resource-update': { title:'编辑记录', fields:[field('name','名称'),field('owner','负责人'),field('note','修改说明','textarea',[],false)] },
  'resource-import': { title:'导入数据', fields:[field('batch','导入批次'),field('note','校验说明','textarea')] },
  'resource-submit': { title:'提交业务处理', fields:[field('note','提交说明','textarea')] },
  'resource-withdraw': { title:'撤回业务记录', fields:[field('reason','撤回原因','textarea')] },
  'resource-cancel': { title:'取消业务记录', fields:[field('reason','取消原因','textarea')] },
  'resource-void': { title:'作废业务记录', fields:[field('reason','作废原因','textarea')] },
  'resource-archive': { title:'归档业务记录', fields:[field('note','归档说明','textarea')] },
  'resource-publish': { title:'发布业务记录', fields:[field('note','发布说明','textarea')] },
  'resource-generate': { title:'生成业务结果', fields:[field('note','生成说明','textarea')] },
  'resource-confirm': { title:'确认业务记录', fields:[field('note','确认说明','textarea')] },
  'resource-close': { title:'关闭业务记录', fields:[field('reason','关闭原因','textarea')] },
  'resource-print': { title:'打印业务记录', fields:[] },
  'resource-export': { title:'导出当前数据', fields:[] },
  'resource-bind': { title:'绑定关联数据', fields:[field('target','绑定对象'),field('note','绑定说明','textarea')] },
  'resource-unbind': { title:'解除数据绑定', fields:[field('reason','解绑原因','textarea')] },
  'approval-approve': { title:'审批通过', fields:[field('opinion','审批意见','textarea')] },
  'approval-reject': { title:'审批驳回', fields:[field('reason','驳回原因','textarea')] },
  'approval-return': { title:'退回上一步', fields:[field('node','退回节点'),field('reason','退回原因','textarea')] },
  'approval-transfer': { title:'转办审批', fields:[field('transferTo','转办人'),field('reason','转办说明','textarea')] },
  'approval-supplement': { title:'补充审批材料', fields:[field('note','补充说明','textarea'),field('attachments','审批附件','file',[],false)] },
  'approval-claim': { title:'认领审批任务', fields:[field('assignee','办理人', 'user')] },
  'approval-unclaim': { title:'取消认领审批任务', fields:[field('reason','取消认领说明','textarea',[],false)] },
  'approval-delegate': { title:'委派审批任务', fields:[field('delegateTo','委派人','user'),field('reason','委派说明','textarea')] },
  'approval-resolve': { title:'解决审批委派', fields:[field('note','解决说明','textarea',[],false)] },
  'approval-assign': { title:'指定审批办理人', fields:[field('assignee','办理人','user')] },
  'approval-draft': { title:'保存审批草稿', fields:[field('formData','动态表单数据','json',[],false)] },
  'approval-submit-start': { title:'提交并发起流程', fields:[field('formData','动态表单数据','json'),field('attachments','审批附件','file',[],false)] },
  'approval-form-field-add': { title:'新增表单字段', fields:[field('label','字段名称'),field('type','控件类型'),field('required','是否必填','select',['是','否'])] },
  'approval-form-field-update': { title:'修改表单字段', fields:[field('label','字段名称'),field('type','控件类型')] },
  'approval-flow-node-add': { title:'新增流程节点', fields:[field('name','节点名称'),field('type','节点类型','select',['审批','条件','抄送','会签'])] },
  'approval-flow-node-update': { title:'修改流程节点', fields:[field('name','节点名称'),field('assignee','审批人')] },
  'approval-flow-branch-add': { title:'新增条件分支', fields:[field('label','分支名称'),field('expression','条件表达式')] },
  'integration-retry': { title:'重试失败接口', fields:[field('batch','重试批次'),field('reason','重试说明','textarea')] },
  'integration-compensate': { title:'登记人工补偿', fields:[field('method','补偿方式'),field('note','补偿说明','textarea')] },
  'integration-preview': { title:'预览体检系统同步', fields:[field('note','预览说明','textarea',[],false)] },
  'integration-confirm': { title:'确认同步体检结果', fields:[field('note','同步说明','textarea',[],false)] },
  'checkup-config-field': { title:'配置字段映射', fields:[field('fieldMapping','字段映射','textarea')] },
  'checkup-config-item': { title:'配置项目映射', fields:[field('itemMapping','项目映射','textarea')] },
  'checkup-config-classify': { title:'配置排除与归类', fields:[field('classificationRule','排除与归类规则','textarea')] },
  'integration-execute': { title:'处理当前业务', fields:[field('note','处理说明','textarea',[],false)] },
  'finance-payment': { title:'登记收款', fields:[field('receiptNo','收款流水号'),field('amount','收款金额','number')] },
  'finance-refund': { title:'执行退款', fields:[field('amount','退款金额','number'),field('reason','退款原因','textarea')] },
  'finance-reconcile': { title:'完成对账', fields:[field('statementNo','对账单号'),field('note','差异说明','textarea')] },
  'finance-issue-invoice': { title:'登记开票', fields:[field('invoiceNo','发票号码'),field('note','开票说明','textarea',[],false)] },
  'inventory-inspect': { title:'到货验收', fields:[field('quantity','实收数量','number'),field('note','验收说明','textarea')] },
  'inventory-freeze-toggle': { title:'冻结/解冻库存', fields:[field('reason','处理原因','textarea')] },
  'consultation-operate': { title:'会诊操作', fields:[field('operation','操作','select',['发送邀请','设备检查','进入会诊','提交意见','开始录制']),field('note','说明','textarea')] },
  'consultation-sign': { title:'会诊签字归档', fields:[field('signature','签字人'),field('opinion','专家意见','textarea')] },
  'consultation-accept': { title:'接受会诊邀请', fields:[field('note','接受说明','textarea',[],false)] },
  'consultation-decline': { title:'拒绝会诊邀请', fields:[field('reason','拒绝原因','textarea')] },
  'consultation-conflict': { title:'反馈时间冲突', fields:[field('reason','冲突说明','textarea'),field('alternativeTime','可选时间','datetime-local',[],false)] },
  'feature-execute': { title:'执行业务功能', fields:[field('note','处理说明','textarea')] },
  'analysis-refresh': { title:'刷新经营分析', fields:[field('note','刷新说明','textarea',[],false)] },
  'analysis-drilldown': { title:'查看分析明细', fields:[] },
  'finance-run-match': { title:'执行三单匹配', fields:[field('note','匹配说明','textarea',[],false)] },
  'finance-match-difference': { title:'处理匹配差异', fields:[field('differenceType','差异类型','select',['价格差异','数量差异','税额差异']),field('note','调整或审批说明','textarea')] },
  'consultation-device-camera': { title:'检测摄像头', fields:[field('note','检查说明','textarea',[],false)] },
  'consultation-device-microphone': { title:'检测麦克风', fields:[field('note','检查说明','textarea',[],false)] },
  'consultation-room-auth': { title:'检查会诊房间', fields:[field('note','检查说明','textarea',[],false)] },
  'consultation-room-enter': { title:'进入会诊', fields:[field('note','进入说明','textarea',[],false)] },
  'consultation-room-record': { title:'开始云端录制', fields:[field('note','录制说明','textarea',[],false)] },
  'consultation-room-control': { title:'会中控制', fields:[field('operation','控制动作','select',['静音成员','关闭成员摄像头','退出成员']),field('note','控制说明','textarea',[],false)] },
  'consultation-room-media': { title:'多人音视频', fields:[field('note','会诊说明','textarea',[],false)] },
  'consultation-member-mute': { title:'成员静音', fields:[field('note','静音说明','textarea',[],false)] },
  'consultation-member-remove': { title:'移出成员', fields:[field('reason','移出原因','textarea')] },
  'approval-form-design': { title:'设计业务表单', fields:[field('component','控件类型'),field('fieldLabel','字段名称'),field('required','是否必填','select',['是','否'])] },
  'approval-form-copy': { title:'复制业务表单', fields:[field('name','新表单名称')] },
  'approval-flow-copy': { title:'复制审批流程', fields:[field('name','新流程名称')] },
  'approval-node-sort': { title:'调整审批节点顺序', fields:[field('direction','调整方向','select',['上移','下移'])] },
  'approval-branch-sort': { title:'调整条件分支顺序', fields:[field('direction','调整方向','select',['上移','下移'])] },
  'doctor-plan-favorite-health': { title:'收藏健康管理方案', fields:[field('name','常用方案名称')] },
  'doctor-plan-favorite-medical': { title:'收藏医疗方案', fields:[field('name','常用方案名称')] },
  'doctor-plan-apply': { title:'带入当前开单', fields:[field('orderNo','当前开单编号')] },
  'doctor-plan-rename': { title:'重命名常用方案', fields:[field('name','方案名称')] },
  'finance-payment-confirm': { title:'确认收款', fields:[field('note','确认说明','textarea',[],false)] },
  'finance-payment-unconfirm': { title:'撤销收款确认', fields:[field('reason','撤销原因','textarea')] },
  'finance-refund-confirm': { title:'确认退款申请', fields:[field('note','确认说明','textarea',[],false)] },
  'finance-reconciliation-submit': { title:'提交对账单', fields:[field('note','提交说明','textarea',[],false)] },
  'finance-reconciliation-confirm': { title:'确认对账结果', fields:[field('note','确认说明','textarea',[],false)] },
  'finance-reconciliation-unconfirm': { title:'撤销对账确认', fields:[field('reason','撤销原因','textarea')] },
  'consultation-room-confirm': { title:'确认会诊房间', fields:[field('note','确认说明','textarea',[],false)] },
  'consultation-room-cancel': { title:'取消会诊房间', fields:[field('reason','取消原因','textarea')] }
}

const actionStateRules = {
  'resource-submit': ['草稿','待新建','已退回','已驳回'],
  'resource-withdraw': ['待审批','待处理','已提交'],
  'resource-publish': ['已生成','待发布','已确认','草稿'],
  'resource-archive': ['已发布','已完成','已签字','验收通过'],
  'approval-approve': ['待处理','待审批','已转办'],
  'approval-reject': ['待处理','待审批','已转办'],
  'approval-return': ['待处理','待审批','已转办'],
  'approval-transfer': ['待处理','待审批'],
  'approval-supplement': ['待处理','待审批','已转办'],
  'approval-claim': ['待认领','待处理','待审批'],
  'approval-unclaim': ['待处理','待审批','已转办'],
  'approval-delegate': ['待处理','待审批'],
  'approval-resolve': ['委派中'],
  'approval-assign': ['待认领','待处理','待审批','已转办'],
  'consultation-accept': ['待处理','已发送','待确认'],
  'consultation-decline': ['待处理','已发送','待确认'],
  'consultation-conflict': ['待处理','已发送','待确认'],
  'finance-payment': ['待收款'],
  'finance-issue-invoice': ['待开票'],
  'finance-reconcile': ['待对账','存在差异'],
  'finance-refund': ['已通过'],
  'finance-payment-confirm': ['已收款'],
  'finance-payment-unconfirm': ['已确认'],
  'finance-refund-confirm': ['已通过','待退款'],
  'finance-reconciliation-submit': ['草稿'],
  'finance-reconciliation-confirm': ['待对账','存在差异'],
  'finance-reconciliation-unconfirm': ['已确认'],
  'consultation-room-confirm': ['已就绪','进行中'],
  'consultation-room-cancel': ['待确认','已确认','已就绪','进行中'],
  'integration-preview': ['待同步','待确认'],
  'integration-confirm': ['待确认'],
  'integration-retry': ['待确认','部分完成','待处理'],
  'integration-compensate': ['待确认','部分完成','待处理']
}

const reportLifecycleResources = new Set(['medical-report', 'talent-report'])

export const isReportLifecycleResource = resourceId => reportLifecycleResources.has(resourceId)

export function getActionRestriction(action, record, resourceId = '') {
  if (!record) return '当前没有可处理的记录'
  if (action === 'resource-enable' && record.status === '已启用') return '当前已经是“已启用”状态，无需重复启用。'
  if (action === 'resource-disable' && record.status === '已停用') return '当前已经是“已停用”状态，无需重复停用。'
  if (/已归档/.test(String(record.status || '')) && !['resource-detail','resource-query','resource-export','resource-print'].includes(action)) return '该记录已归档，只能查看、导出或新增补充记录，不能继续修改状态。'
  if (resourceId === 'consultation-appointment' && ['resource-submit', 'resource-confirm'].includes(action)) {
    if (/存在冲突/.test(String(record.result || ''))) return '存在时间冲突，不能发送邀请或确认预约；请调整预约时间或更换专家。'
    if (action === 'resource-confirm' && !['待确认', '已发送'].includes(record.status)) {
      return `当前状态“${record.status}”不能确认预约；允许状态：待确认、已发送`
    }
  }
  if (resourceId === 'checkup-sync') {
    const failureCount = Number(record.failureCount || 0)
    if (['integration-retry', 'integration-compensate'].includes(action) && failureCount <= 0) {
      return '当前批次没有失败结果，无需执行失败重试或人工补偿。'
    }
  }
  let allowed = actionStateRules[action]
  if (reportLifecycleResources.has(resourceId) && action === 'resource-withdraw') allowed = ['已发布']
  if (reportLifecycleResources.has(resourceId) && action === 'resource-archive') allowed = ['已发布', '已撤回']
  const resource = resourceRegistry.find(item => item.id === resourceId)
  const statusOptions = resource?.fields.find(item => item.name === 'status')?.options || []
  if (allowed && statusOptions.length && !(reportLifecycleResources.has(resourceId) && action === 'resource-publish')) allowed = allowed.filter(status => statusOptions.includes(status))
  if (!allowed || allowed.includes(record.status)) return ''
  return allowed.length
    ? '当前状态“' + record.status + '”不能执行该操作；允许状态：' + allowed.join('、')
    : '当前业务对象没有可执行该操作的状态，请先完成前置业务处理。'
}

export const destructiveActions = [
  { id:'resource-delete', confirmTitle:'确认删除草稿或未引用资料', confirmMessage:'删除后该演示记录将从列表移除；已被引用或已生效的数据不会物理删除。', alternative:'如果记录已被使用，系统将自动改为停用并保留历史。' },
  { id:'resource-disable', confirmTitle:'确认停用该资料', confirmMessage:'停用后不可用于新增业务，但历史业务仍然可以查看。', alternative:'需要恢复时可再次启用。' },
  { id:'resource-withdraw', confirmTitle:'确认撤回已提交记录', confirmMessage:'撤回后回到草稿状态，审批待办同步关闭。', alternative:'若业务已执行，请使用取消、作废或冲销。' },
  { id:'resource-cancel', confirmTitle:'确认取消业务记录', confirmMessage:'取消后不再继续流转，已产生的处理记录仍然保留。', alternative:'已产生资金、库存或医疗结果时应使用作废或归档。' },
  { id:'resource-void', confirmTitle:'确认作废业务记录', confirmMessage:'系统保留原记录，并记录作废状态和处理过程。', alternative:'关键业务数据不执行物理删除。' },
  { id:'resource-archive', confirmTitle:'确认归档', confirmMessage:'归档后记录只读，不能继续修改业务内容。', alternative:'需要更正时创建新的版本或补充记录。' }
]

export const utilityActions = new Set(['toggle-menu','reset-all','reset-terminal-filter','toggle-record-selection','toggle-page-selection','close-modal','save-form','confirm-action','page-prev','page-next','open-consultation-create','consultation-reschedule','consultation-cancel','consultation-conclusion','consultation-invitation-detail','save-consultation-create','save-consultation-schedule','save-consultation-conclusion'])
export const actionRegistry = new Set([
  ...utilityActions,
  ...Object.keys(resourceActionDefinitions),
  ...Object.keys(genericForms)
])

export const getActionForm = action => genericForms[action] || null
export const getActionDefinition = action => resourceActionDefinitions[action] || null
export const getDestructiveDefinition = action => destructiveActions.find(item => item.id === action) || null
