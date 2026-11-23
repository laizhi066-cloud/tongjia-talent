const typeLabels = {
  'global-flow': '流程说明',
  field: '字段说明',
  section: '区域说明',
  action: '操作说明'
}

export const helpDefinitions = {
  'global-flow:supply-purchase': {
    type: 'global-flow',
    title: '采购管理流程',
    text: '采购申请 → 询价单 → 供应商报价 → 采购订单 → 后台到货登记、收货验收与上架。'
  },
  'global-flow:admin-orders': {
    type: 'global-flow',
    title: '订单中心流程',
    text: '客户服务方案提交 → 创建订单与版本快照 → 订单中心登记线下收款/确认 → 退款审批与线下执行 → 发票、对账和审计留痕；“转后台处理”用于标记责任交接，不是收款前置条件。'
  },
  'global-flow:visit-order': {
    type: 'global-flow',
    title: '初诊/复诊客单流程',
    text: '在同一次初诊或复诊中分别维护健康方案和医疗方案；任一方案首次提交时形成客单，提交后解锁对应实施计划，最后可转后台处理。'
  },
  'global-flow:care-consultation': {
    type: 'global-flow',
    title: '会诊流程',
    text: '预约 → 专家通知 → 会前准备 → 设备检查 → 进入会诊 → 会中记录 → 专家意见 → 结论签署 → 归档；专家不在系统内接受或拒绝邀请。'
  },
  'global-flow:medical-inquiry': {
    type: 'global-flow',
    title: '问诊与健康智脑流程',
    text: '记录问诊资料 → 健康智脑生成辅助建议 → 医生修改确认 → 需要时发起会诊 → 进入本次初诊/复诊客单承接方案。'
  },
  'global-flow:health-intelligence': {
    type: 'global-flow',
    title: '健康智脑流程',
    text: '确认资料范围 → 固定同步、映射、医学规则和智脑配置版本 → 生成可编辑草案 → 医生编辑确认 → 发布、撤回、归档并承接复查建议。'
  },
  'global-flow:miniapp': {
    type: 'global-flow',
    title: '天赋报告查看流程',
    text: '独立天赋后台发布报告 → 家长在“我的”选择已关联孩子 → 首页只读查看该孩子的已发布报告；撤回后停止展示。'
  },
  'field:available-stock': {
    type: 'field',
    title: '可用库存',
    text: '可用库存来自经销存库存台账。健康方案提交后按现有规则扣减；医疗方案提交后先生成待确认的出库申请。'
  },
  'field:filter:keyword': {
    type: 'field',
    title: '关键词',
    text: '按当前列表中的名称、编号、客户或其他文本字段进行模糊查询。'
  },
  'field:filter:status': {
    type: 'field',
    title: '状态',
    text: '按当前业务页面自己的状态范围筛选，不会跨模块查询其他业务数据。'
  },
  'action:submit-medical-plan': {
    type: 'action',
    title: '提交医疗方案',
    text: '点击提交时才检查医疗项目前置条件。阻止型条件不满足时不能提交；提示型条件确认后可以继续。'
  },
  'action:favorite-plan': {
    type: 'action',
    title: '收藏方案',
    text: '只保存当前方案的项目组合，方便下次在同一类型方案中快速带入；不会保存客户、金额、周期或实施计划。'
  },
  'action:select-favorite-plan': {
    type: 'action',
    title: '选择个人方案',
    text: '只带入所选模板的项目组合，不带入客户信息、服务周期、数量、金额、签字和实施计划。'
  },
  'action:forward-to-backoffice': {
    type: 'action',
    title: '转后台处理',
    text: '健康方案或医疗方案至少提交一个后，可将客单标记为已转后台处理；订单形成应收金额后即可在订单中心登记线下收款，转后台用于责任交接，所有动作保留操作时间线。'
  },
  'action:submit-order-creation': {
    type: 'action',
    title: '提交方案与客单',
    text: '本次初诊或复诊的第一个方案提交时创建或关联一张客单；另一个方案随后提交时复用同一张客单，不重复开单。'
  },
  'action:start-consultation': {
    type: 'action',
    title: '从问诊发起会诊',
    text: '会诊只关联当前问诊记录，不自动生成客单，也不会覆盖医生已经确认的问诊结论。'
  },
  'action:accept-brain-draft': {
    type: 'action',
    title: '采纳智脑建议',
    text: '建议只带入当前问诊草稿，仍需医生逐条修改确认，不覆盖医生结论。'
  },
  'section:role-phase2-permissions': {
    type: 'section',
    title: '二期权限节点',
    text: '二期能力作为一期角色菜单权限树中的新增节点，由角色统一配置，不新增独立的业务权限菜单。'
  },
  'section:menu:organization': { type:'section', title:'组织与权限菜单', text:'这里保留一期用户、角色、菜单、部门和岗位管理入口；二期能力只作为角色权限树中的新增节点。' },
  'section:menu:procurement': { type:'section', title:'采购管理菜单', text:'采购申请、询价比价和采购订单在此模块按业务顺序处理；供应商与物料在“业务基础资料”维护。' },
  'section:menu:supply-master': { type:'section', title:'业务基础资料菜单', text:'供应商、物料/产品药品和仓库与库位是采购、入库与库存单据的可选基础资料。' },
  'section:menu:hr-admin': { type:'section', title:'人事行政菜单', text:'员工资料、任职关系、班次、排班、调班申请和行政事务沿用一期人事行政页面。' },
  'section:menu:business-master': { type:'section', title:'采购/库存基础资料说明', text:'供应商、物料/产品药品归入采购管理；仓库、库位归入库存管理，不再作为独立菜单。' },
  'section:menu:assets': { type:'section', title:'固定资产菜单', text:'资产分类、资产档案、领用借还、维修调拨、盘点和报废形成完整资产履历。' },
  'section:menu:orders': { type:'section', title:'订单中心菜单', text:'订单列表按来源、客户、订单编号、业务状态和资金状态统一查询；详情必须从列表携带真实订单编号进入。收款、退款、发票和对账是关联订单的线下资金单据，收款从订单列表或详情的“资金处理”入口登记，不单独占用菜单。' },
  'section:menu:inquiry': { type:'section', title:'问诊菜单', text:'问诊详情是健康智脑、会诊和客单的共同现场入口。' },
  'section:menu:consultation': { type:'section', title:'会诊菜单', text:'会诊首页只负责查询和查看；进入具体记录后复用问诊详情继续操作。' },
  'section:menu:overview': { type:'section', title:'当前端首页', text:'汇总当前使用端的待办和业务入口；进入具体模块后只显示该模块的一期页面与二期新增节点。' },
  'section:menu:inventory': { type:'section', title:'库存台账菜单', text:'查询物料、批次、效期、可用量和库存流水；后台收货上架与管理端护士出库结果回写到这里。' },
  'section:menu:finance': { type:'section', title:'资金与经营分析菜单', text:'查看订单资金、成本预算、对账差异和经营报表，不在此处理库存出入库。' },
  'section:menu:approval': { type:'section', title:'审批协同菜单', text:'流程配置、待办、已办和审批记录围绕业务单据流转，并将结果回写原业务。' },
  'section:menu:integration': { type:'section', title:'三方系统对接菜单', text:'进入体检系统同步页面后，可在同一页面配置字段映射、项目名称映射、排除和分类归属，并查看同步批次结果。排除项目直接过滤，未匹配项目进入待处理队列，不进入 AI。' },
  'section:menu:medical-rules': { type:'section', title:'医学规则与智脑菜单', text:'维护标准项目、外部映射和医学规则，发布后供报告分析与医疗方案提交检查使用。' },
  'section:menu:intelligence-config': { type:'section', title:'智脑配置菜单', text:'维护智脑使用的专业分类、指标纳入与映射、分析规则、参考资料、报告模板和模型与数据策略。' },
  'section:menu:system-settings': { type:'section', title:'基础设置菜单', text:'业务字典和系统级编码集中维护，供采购、库存、订单、医学规则和天赋配置复用。' },
  'section:menu:members': { type:'section', title:'会员管理菜单', text:'会员列表只展示家长账户和已关联孩子；在编辑会员时维护孩子、新增、编辑或解绑，并保留机构、渠道、导入预览和冲突行拒绝。' },
  'section:menu:rules': { type:'section', title:'天赋规则菜单', text:'天赋规则下维护分类与要素、分级与固定注解、内容库与培养内容、匹配规则和培养计划；培养计划页面内分为全部计划、待审核和 AI 辅助建议。' },
  'section:menu:reports': { type:'section', title:'报告列表菜单', text:'报告列表内查看接收列表和报告处理状态；发布前提示确认线下付费，发布弹框选择开放分册，整份报告统一发布或撤回。PDF 已同步时直接查看，上传仅作补充。' },
  'section:menu:nurse-outbound': { type:'section', title:'库存操作菜单', text:'沿用一期库存操作入口，查看出库确认列表、申请详情并完成确认或撤回。' },
  'section:menu:intelligence': { type:'section', title:'健康智脑菜单', text:'在当前客户问诊详情中读取资料、生成辅助建议并由医生选择采纳，不自动覆盖医生结论。' },
  'section:menu:visit-order': { type:'section', title:'客单菜单', text:'从当前初诊或复诊进入一期客单，分别维护健康方案、医疗方案和对应实施计划。' },
  'section:menu:home': { type:'section', title:'小程序首页', text:'汇总当前孩子、最新报告、推荐培养计划和要素解读数量，并提供培养计划、检测报告、要素解读三个快捷入口。未发布或已撤回报告不会出现。' },
  'section:menu:profile': { type:'section', title:'我的菜单', text:'查看本人绑定信息和报告查看说明，不展示其他客户数据。' },
  'global-flow:supply-inventory': { type:'global-flow', title:'库存台账流程', text:'采购订单到货 → 收货验收 → 上架入库 → 可用库存与流水更新。' },
  'global-flow:admin:organization': { type:'global-flow', title:'组织与权限流程', text:'用户建立 → 分配角色 → 配置菜单权限与数据权限 → 角色下用户按范围访问业务页面。' },
  'global-flow:admin:overview': { type:'global-flow', title:'后台管理首页流程', text:'查看现有大健康后台待办与状态摘要 → 进入采购、客单、资金或医学规则模块 → 在对应列表和详情中处理；天赋业务请进入独立天赋后台。' },
  'global-flow:talent-admin:members': { type:'global-flow', title:'会员管理流程', text:'新增或编辑会员 → 在同一会员编辑页新增、编辑或解绑孩子 → 通过家长手机号与孩子身份证号保持唯一有效绑定 → 处理机构/渠道归属和导入冲突。' },
  'global-flow:talent-admin:rules': { type:'global-flow', title:'天赋规则流程', text:'先维护分类与要素，再维护分级和固定注解；内容库与培养内容在同一主从页维护，匹配规则按年龄、性别和结果范围筛选候选内容；培养计划补充目标、阶段和要素条件，审核通过后进入推荐。' },
  'global-flow:talent-admin:reports': { type:'global-flow', title:'报告列表流程', text:'第三方结果接收 → 身份和完整性校验 → 生成检测报告和要素解读 → 发布前确认线下付费 → 选择开放分册 → 整份发布 → 撤回时全部分册和 PDF 同步隐藏。' },
  'global-flow:admin:supply-master': { type:'global-flow', title:'业务基础资料流程', text:'维护供应商、物料/产品药品和仓库与库位 → 校验并启用 → 在采购、入库和库存页面作为可选业务对象引用。' },
  'global-flow:admin:inventory': { type:'global-flow', title:'后台库存台账流程', text:'现场作业回写 → 更新批次与可用量 → 形成库存流水 → 异常或预警继续跟踪。' },
  'global-flow:admin:finance': { type:'global-flow', title:'资金与经营分析流程', text:'业务订单形成 → 登记收款、退款与发票状态 → 成本预算核对 → 经营报表与差异下钻。' },
  'global-flow:admin:medical-rules': { type:'global-flow', title:'医学规则与智脑流程', text:'标准项目维护 → 外部编码映射 → 参考值和医学规则配置 → 发布 → 报告分析或医疗方案检查使用。' },
  'global-flow:admin:hr-admin': { type:'global-flow', title:'人事行政流程', text:'员工资料 → 任职关系 → 班次与排班 → 调班申请 → 行政事务记录。' },
  'global-flow:admin:business-master': { type:'global-flow', title:'采购/库存基础资料流程', text:'供应商、物料/产品药品在采购管理维护；仓库、库位在库存管理维护 → 校验并启用 → 被采购、收货和库存单据引用。' },
  'global-flow:admin:assets': { type:'global-flow', title:'固定资产流程', text:'资产分类与建卡 → 领用借还 → 维修调拨 → 盘点 → 报废和生命周期记录。' },
  'global-flow:admin:approval': { type:'global-flow', title:'审批协同流程', text:'流程配置 → 业务发起 → 待办审批 → 已办记录 → 结果回写原业务。' },
  'global-flow:admin:integration': { type:'global-flow', title:'三方系统对接流程', text:'进入体检系统同步 → 配置字段/项目映射、排除和分类 → 预览并确认同步 → 查看已映射、已排除、待处理和失败结果。' },
  'global-flow:admin:intelligence-config': { type:'global-flow', title:'智脑配置流程', text:'专业分类和指标纳入与映射 → 分析规则与资料 → 报告模板 → 模型与数据策略。' },
  'global-flow:admin:system-settings': { type:'global-flow', title:'基础设置流程', text:'维护业务字典和系统级编码 → 校验并启用 → 采购、库存、订单、医学规则和天赋配置按统一值引用。' },
  'global-flow:management:overview': { type:'global-flow', title:'管理端首页', text:'从一期首页业务卡片进入库存操作，查看医疗方案出库申请并交给护士确认或撤回回补。' },
  'global-flow:management:nurse-outbound': { type:'global-flow', title:'库存操作流程', text:'查看医疗方案出库申请 → 打开申请详情 → 核对物料和数量 → 确认出库或撤回并回补库存。' },
  'global-flow:service:overview': { type:'global-flow', title:'服务端客户业务流程', text:'选择问诊、健康智脑、会诊或客单 → 在当前客户详情中连续处理 → 结果回到同一客户业务记录。' },
  'global-flow:people-org': { type:'global-flow', title:'组织与人员流程', text:'建立组织和部门 → 配置岗位 → 建立员工档案 → 关联账号 → 记录入职、调动或离职。' },
  'global-flow:people-schedule': { type:'global-flow', title:'排班与调班流程', text:'维护班次 → 安排排班 → 员工打卡 → 申请调班或补卡 → 汇总出勤结果。' },
  'global-flow:people-admin': { type:'global-flow', title:'行政事务流程', text:'选择行政申请类型 → 填写并提交 → 审批处理 → 执行结果回写 → 保留附件与记录。' },
  'global-flow:people-approval': { type:'global-flow', title:'审批协同流程', text:'配置流程 → 业务表单发起 → 节点审批 → 抄送或退回 → 最终状态回写原业务。' },
  'global-flow:supply-master': { type:'global-flow', title:'采购/库存基础资料流程', text:'供应商、物料/产品药品在采购管理维护；仓库、库位在库存管理维护 → 校验资料 → 启用 → 采购与库存单据引用。' },
  'global-flow:supply-receipt': { type:'global-flow', title:'收货验收流程', text:'采购订单到货 → 收货登记 → 数量质量验收 → 上架 → 库存台账更新。' },
  'global-flow:supply-asset': { type:'global-flow', title:'固定资产流程', text:'资产入库建卡 → 领用交接 → 调拨盘点 → 维修、归还或处置 → 形成资产履历。' },
  'global-flow:supply-integration': { type:'global-flow', title:'系统对接流程', text:'配置接口与映射 → 执行同步任务 → 查看结果 → 异常重试 → 保留同步日志。' },
  'global-flow:finance-order-group': { type:'global-flow', title:'订单与资金流程', text:'业务订单形成 → 收款登记 → 开票或退款 → 对账 → 状态回写订单和客户摘要。' },
  'global-flow:finance-analysis-group': { type:'global-flow', title:'成本预算流程', text:'维护成本基础 → 编制预算 → 匹配业务单据 → 处理差异 → 形成预算执行结果。' },
  'global-flow:finance-operating': { type:'global-flow', title:'经营分析流程', text:'汇总业务数据 → 计算经营指标 → 生成报表 → 下钻明细 → 刷新并保留分析时间。' },
  'global-flow:medical-master-group': { type:'global-flow', title:'体检标准项目流程', text:'维护体检分类 → 建立标准项目 → 配置参考信息 → 启用 → 供映射、规则和报告引用。' },
  'global-flow:medical-mapping-group': { type:'global-flow', title:'外部数据映射流程', text:'读取外部项目编码 → 关联标准项目 → 配置版本和生效时间 → 导入报告时按映射转换。' },
  'global-flow:medical-rule-group': { type:'global-flow', title:'医学关系与规则流程', text:'配置医学关系和前置条件 → 发布规则 → 提交医疗方案时检查 → 返回阻止或提示原因。' },
  'global-flow:medical-report-group': { type:'global-flow', title:'健康资料与报告流程', text:'获取客户资料 → 上传或导入报告 → 解析异常与结论 → 医生查看确认 → 归档。' },
  'global-flow:medical-doctor-group': { type:'global-flow', title:'医生业务流程', text:'客户初诊或复诊 → 问诊 → 健康或医疗方案 → 对应实施计划 → 形成并转交客单。' },
}

const fallbackDefinition = key => {
  const type = String(key || '').split(':')[0]
  return {
    type: typeLabels[type] ? type : 'section',
    title: typeLabels[type] || '页面说明',
    text: '这里说明当前字段、区域或操作在本业务页面中的用途。'
  }
}

export const helpDefinitionFor = key => helpDefinitions[key] || fallbackDefinition(key)
export const helpTextFor = key => helpDefinitionFor(key).text

export function helpButton(key, label = '', variant = 'local') {
  const text = label ? `<span>${label}</span>` : ''
  return `<button class="help-trigger help-${variant}" type="button" data-help-key="${key}" aria-label="查看说明">?${text}</button>`
}

export const helpTypeLabel = type => typeLabels[type] || '页面说明'
