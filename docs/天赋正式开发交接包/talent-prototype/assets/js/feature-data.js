export const pageFeatureCatalog = {
  "hr-organization": [
    {
      "name": "组织列表",
      "description": "集中展示组织的主要字段、状态和更新时间，作为查询和后续处理入口。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "组织查询",
      "description": "可按关键词、家长姓名、状态查询组织，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "组织详情",
      "description": "查看组织的组织名称、组织编码、上级组织、负责人和状态。",
      "location": "详情抽屉",
      "locator": "detail-field:owner"
    },
    {
      "name": "组织新增",
      "description": "录入组织名称、组织编码、上级组织、负责人和状态并保存，形成新的组织记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:owner"
    },
    {
      "name": "组织编辑",
      "description": "修改组织的组织名称、组织编码、上级组织、负责人和状态，保存后更新当前记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:owner"
    },
    {
      "name": "组织删除",
      "description": "删除尚未被业务引用的组织，已使用数据不允许直接删除。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "组织启用",
      "description": "启用组织，启用后可在对应业务中选择和使用。",
      "location": "批量操作",
      "locator": "batch-action:resource-enable"
    },
    {
      "name": "组织停用",
      "description": "停用组织，停用后不再用于新增业务，历史记录继续保留。",
      "location": "批量操作",
      "locator": "batch-action:resource-disable"
    },
    {
      "name": "组织记录",
      "description": "查看组织的层级调整和状态变更记录，保留操作人员与时间。",
      "location": "关联页签",
      "locator": "tab:hr-organization"
    }
  ],
  "hr-employee": [
    {
      "name": "员工资料列表",
      "description": "集中展示员工资料的主要字段、状态和更新时间，作为查询和后续处理入口。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "员工资料查询",
      "description": "可按关键词、所属部门、状态查询员工资料，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "员工资料筛选",
      "description": "可按关键词、所属部门、状态查询员工资料，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "员工资料详情",
      "description": "查看员工资料的基本信息、任职信息、联系方式、证照附件和在职状态。",
      "location": "详情抽屉",
      "locator": "detail-field:department"
    },
    {
      "name": "员工资料新增",
      "description": "录入基本信息、任职信息、联系方式、证照附件和在职状态并保存，形成新的员工资料记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:department"
    },
    {
      "name": "员工资料编辑",
      "description": "修改员工资料的基本信息、任职信息、联系方式、证照附件和在职状态，保存后更新当前记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:department"
    },
    {
      "name": "员工资料导入",
      "description": "按模板批量导入员工资料，校验必要字段后写入正式资料。",
      "location": "批量操作",
      "locator": "batch-action:resource-import"
    },
    {
      "name": "员工资料导出",
      "description": "按当前查询条件导出员工资料，用于核对、归档或线下处理。",
      "location": "批量操作",
      "locator": "batch-action:resource-export"
    },
    {
      "name": "员工资料记录",
      "description": "查看员工资料的任职、调动和状态履历，保留操作人员与时间。",
      "location": "关联页签",
      "locator": "tab:hr-employee"
    }
  ],
  "hr-position": [
    {
      "name": "岗位列表",
      "description": "集中展示岗位的主要字段、状态和更新时间，作为查询和后续处理入口。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "岗位查询",
      "description": "可按关键词、所属部门、状态查询岗位，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "岗位新增",
      "description": "录入岗位名称、岗位编码、所属组织和岗位说明并保存，形成新的岗位记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:department"
    },
    {
      "name": "岗位编辑",
      "description": "修改岗位的岗位名称、岗位编码、所属组织和岗位说明，保存后更新当前记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:department"
    },
    {
      "name": "岗位删除",
      "description": "删除尚未被业务引用的岗位，已使用数据不允许直接删除。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "岗位启用",
      "description": "启用岗位，启用后可在对应业务中选择和使用。",
      "location": "批量操作",
      "locator": "batch-action:resource-enable"
    },
    {
      "name": "岗位停用",
      "description": "停用岗位，停用后不再用于新增业务，历史记录继续保留。",
      "location": "批量操作",
      "locator": "batch-action:resource-disable"
    }
  ],
  "hr-rank": [
    {
      "name": "职级列表",
      "description": "集中展示职级的主要字段、状态和更新时间，作为查询和后续处理入口。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "职级新增",
      "description": "录入职级名称、职级编码、排序和说明并保存，形成新的职级记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:rank"
    },
    {
      "name": "职级编辑",
      "description": "修改职级的职级名称、职级编码、排序和说明，保存后更新当前记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:rank"
    },
    {
      "name": "职级删除",
      "description": "删除尚未被业务引用的职级，已使用数据不允许直接删除。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "职级启用",
      "description": "启用职级，启用后可在对应业务中选择和使用。",
      "location": "批量操作",
      "locator": "batch-action:resource-enable"
    },
    {
      "name": "职级停用",
      "description": "停用职级，停用后不再用于新增业务，历史记录继续保留。",
      "location": "批量操作",
      "locator": "batch-action:resource-disable"
    }
  ],
  "hr-employment": [
    {
      "name": "任职关系列表",
      "description": "集中展示任职关系的主要字段、状态和更新时间，作为查询和后续处理入口。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "任职关系新增",
      "description": "录入员工、组织、岗位、职级、生效日期和主兼职标识并保存，形成新的任职关系记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:employee"
    },
    {
      "name": "任职关系编辑",
      "description": "修改任职关系的员工、组织、岗位、职级、生效日期和主兼职标识，保存后更新当前记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:employee"
    },
    {
      "name": "任职关系删除",
      "description": "删除尚未被业务引用的任职关系，已使用数据不允许直接删除。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "任职关系记录",
      "description": "查看任职关系的生效、调整和终止记录，保留操作人员与时间。",
      "location": "关联页签",
      "locator": "tab:hr-employment"
    }
  ],
  "hr-shift": [
    {
      "name": "班次列表",
      "description": "集中展示班次的主要字段、状态和更新时间，作为查询和后续处理入口。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "班次查询",
      "description": "可按关键词、班次时段、状态查询班次，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "班次详情",
      "description": "查看班次的班次名称、上下班时间、休息时段和适用范围。",
      "location": "详情抽屉",
      "locator": "detail-field:shiftTime"
    },
    {
      "name": "班次新增",
      "description": "录入班次名称、上下班时间、休息时段和适用范围并保存，形成新的班次记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:shiftTime"
    },
    {
      "name": "班次编辑",
      "description": "修改班次的班次名称、上下班时间、休息时段和适用范围，保存后更新当前记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:shiftTime"
    },
    {
      "name": "班次删除",
      "description": "删除尚未被业务引用的班次，已使用数据不允许直接删除。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "班次启用",
      "description": "启用班次，启用后可在对应业务中选择和使用。",
      "location": "批量操作",
      "locator": "batch-action:resource-enable"
    },
    {
      "name": "班次停用",
      "description": "停用班次，停用后不再用于新增业务，历史记录继续保留。",
      "location": "批量操作",
      "locator": "batch-action:resource-disable"
    }
  ],
  "hr-schedule": [
    {
      "name": "排班列表",
      "description": "集中展示排班编号、申请人、业务对象、金额或数量、当前状态和更新时间。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "排班查询",
      "description": "可按关键词、员工、状态查询排班，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "排班新建",
      "description": "选择排班人员、班次和排班日期并录入明细，创建新的排班。",
      "location": "新增/编辑表单",
      "locator": "form-field:date"
    },
    {
      "name": "排班保存草稿",
      "description": "保存尚未提交的排班，允许后续继续补充和修改。",
      "location": "新增/编辑表单",
      "locator": "form-field:employee"
    },
    {
      "name": "排班编辑草稿",
      "description": "修改草稿状态的排班及其明细，提交后不再按草稿方式修改。",
      "location": "新增/编辑表单",
      "locator": "form-field:employee"
    },
    {
      "name": "排班删除草稿",
      "description": "删除未提交且未进入审批或执行环节的排班草稿。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "排班提交",
      "description": "校验必要字段后提交排班，进入审批或后续业务处理。",
      "location": "状态操作",
      "locator": "status-action:resource-submit"
    },
    {
      "name": "排班撤回",
      "description": "在允许撤回的状态下撤回排班，退回申请人继续处理。",
      "location": "状态操作",
      "locator": "status-action:resource-withdraw"
    },
    {
      "name": "排班取消",
      "description": "取消尚未完成的排班，记录取消原因并停止后续处理。",
      "location": "状态操作",
      "locator": "status-action:resource-cancel"
    },
    {
      "name": "排班操作记录",
      "description": "查看排班从创建到完成的状态变化、操作人员和处理时间。",
      "location": "关联页签",
      "locator": "tab:hr-schedule"
    }
  ],
  "hr-shift-change": [
    {
      "name": "调班申请列表",
      "description": "集中展示调班申请编号、申请人、业务对象、金额或数量、当前状态和更新时间。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "调班申请查询",
      "description": "可按关键词、员工、状态查询调班申请，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "调班申请详情",
      "description": "查看调班申请的表头信息、明细内容、附件和处理记录。",
      "location": "详情抽屉",
      "locator": "detail-field:employee"
    },
    {
      "name": "调班申请新建",
      "description": "选择原排班、替班人员、目标班次和调班原因并录入明细，创建新的调班申请。",
      "location": "新增/编辑表单",
      "locator": "form-field:shift"
    },
    {
      "name": "调班申请提交",
      "description": "校验必要字段后提交调班申请，进入审批或后续业务处理。",
      "location": "状态操作",
      "locator": "status-action:resource-submit"
    },
    {
      "name": "调班申请撤回",
      "description": "在允许撤回的状态下撤回调班申请，退回申请人继续处理。",
      "location": "状态操作",
      "locator": "status-action:resource-withdraw"
    },
    {
      "name": "调班申请审批通过",
      "description": "审核调班申请内容并审批通过，推动单据进入下一处理环节。",
      "location": "状态操作",
      "locator": "status-action:approval-approve"
    },
    {
      "name": "调班申请审批驳回",
      "description": "驳回不符合要求的调班申请，填写原因并退回申请人。",
      "location": "状态操作",
      "locator": "status-action:approval-reject"
    },
    {
      "name": "调班申请操作记录",
      "description": "查看调班申请从创建到完成的状态变化、操作人员和处理时间。",
      "location": "关联页签",
      "locator": "tab:hr-shift-change"
    }
  ],
  "hr-office-supply": [
    {
      "name": "办公用品目录",
      "description": "维护用品分类、库存或额度、申领单位和可见范围",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "办公用品申领",
      "description": "员工提交用品、数量和用途，审批后形成领用或采购需求",
      "location": "新增/编辑表单",
      "locator": "form-field:specification"
    },
    {
      "name": "办公用品库存",
      "description": "记录办公用品入库、发放、退回和当前库存，设置低库存提醒",
      "location": "列表列",
      "locator": "column:balance"
    }
  ],
  "hr-meeting-room": [
    {
      "name": "会议室管理",
      "description": "维护会议室容量、位置、设备、开放时段和管理员",
      "location": "详情抽屉",
      "locator": "detail-field:meetingRoom"
    },
    {
      "name": "会议室预约",
      "description": "按时间查询空闲资源、提交预约、冲突校验、取消和提醒",
      "location": "新增/编辑表单",
      "locator": "form-field:meetingRoom"
    }
  ],
  "hr-vehicle": [
    {
      "name": "用车申请",
      "description": "登记用车时间、地点、乘车人、事由和车辆需求并审批",
      "location": "详情抽屉",
      "locator": "detail-field:time"
    },
    {
      "name": "车辆安排",
      "description": "行政分配车辆及司机，记录里程、油费和实际使用结果",
      "location": "新增/编辑表单",
      "locator": "form-field:vehicleNo"
    }
  ],
  "hr-seal": [
    {
      "name": "用印申请",
      "description": "选择印章、文件类型、份数、用途、审批人和盖章记录",
      "location": "新增/编辑表单",
      "locator": "form-field:sealType"
    }
  ],
  "hr-contract": [
    {
      "name": "合同台账",
      "description": "登记合同编号、相对方、金额、期限、负责人、密级和附件",
      "location": "列表列",
      "locator": "column:name"
    }
  ],
  "hr-policy": [
    {
      "name": "制度文件",
      "description": "发布制度、适用范围、版本、生效时间和阅读确认",
      "location": "详情抽屉",
      "locator": "detail-field:fileName"
    }
  ],
  "hr-archive-loan": [
    {
      "name": "档案借阅",
      "description": "申请借阅档案，记录批准、借出、归还和逾期情况",
      "location": "新增/编辑表单",
      "locator": "form-field:archiveNo"
    }
  ],
  "hr-expense-claim": [
    {
      "name": "费用报销",
      "description": "提交费用类型、明细、发票附件、项目成本中心和审批记录",
      "location": "详情抽屉",
      "locator": "detail-field:costCenter"
    }
  ],
  "approval-form": [
    {
      "name": "流程节点设计",
      "description": "配置开始、审批、条件、抄送、会签、结束等节点及连线",
      "location": "新增/编辑表单",
      "locator": "form-field:node"
    },
    {
      "name": "审批人规则",
      "description": "按指定人员、岗位、角色、部门负责人、发起人上级或表单字段选人",
      "location": "新增/编辑表单",
      "locator": "form-field:assignee"
    },
    {
      "name": "动态表单",
      "description": "配置输入、选择、日期、金额、明细、附件等表单组件和校验规则",
      "location": "状态操作",
      "locator": "status-action:approval-form-design"
    },
    {
      "name": "拖拽表单设计",
      "description": "通过拖拽方式放置输入框、下拉、日期、人员、组织、明细表格和附件等控件",
      "location": "状态操作",
      "locator": "status-action:approval-form-design"
    },
    {
      "name": "业务表单列表",
      "description": "集中展示业务表单的主要字段、状态和更新时间，作为查询和后续处理入口。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "业务表单查询",
      "description": "可按关键词、表单编码、状态查询业务表单，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "业务表单详情",
      "description": "查看业务表单的表单名称、业务类型、字段、布局和校验规则。",
      "location": "详情抽屉",
      "locator": "detail-field:formCode"
    },
    {
      "name": "业务表单新增",
      "description": "录入表单名称、业务类型、字段、布局和校验规则并保存，形成新的业务表单记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:formCode"
    },
    {
      "name": "业务表单编辑",
      "description": "修改业务表单的表单名称、业务类型、字段、布局和校验规则，保存后更新当前记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:formCode"
    },
    {
      "name": "业务表单复制",
      "description": "复制业务表单形成新记录，并允许继续修改后保存。",
      "location": "行操作",
      "locator": "row-action:approval-form-copy"
    },
    {
      "name": "业务表单删除",
      "description": "删除尚未被业务引用的业务表单，已使用数据不允许直接删除。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "业务表单发布",
      "description": "发布业务表单，发布后在指定业务范围内正式生效。",
      "location": "状态操作",
      "locator": "status-action:resource-publish"
    },
    {
      "name": "业务表单撤回发布",
      "description": "撤回已发布的业务表单，停止后续使用并保留历史发布记录。",
      "location": "状态操作",
      "locator": "status-action:resource-withdraw"
    },
    {
      "name": "业务表单记录",
      "description": "查看业务表单的版本、发布和业务使用记录，保留操作人员与时间。",
      "location": "关联页签",
      "locator": "tab:approval-form"
    }
  ],
  "approval-flow": [
    {
      "name": "流程版本管理",
      "description": "流程调整后生成新版本，已发起实例继续按原版本运行，新业务使用已发布版本",
      "location": "详情抽屉",
      "locator": "detail-field:version"
    },
    {
      "name": "审批流程列表",
      "description": "集中展示审批流程的主要字段、状态和更新时间，作为查询和后续处理入口。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "审批流程查询",
      "description": "可按关键词、模块、状态查询审批流程，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "审批流程详情",
      "description": "查看审批流程的流程名称、适用业务、节点、人员、条件分支和状态。",
      "location": "详情抽屉",
      "locator": "detail-field:module"
    },
    {
      "name": "审批流程新增",
      "description": "录入流程名称、适用业务、节点、人员、条件分支和状态并保存，形成新的审批流程记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:module"
    },
    {
      "name": "审批流程编辑",
      "description": "修改审批流程的流程名称、适用业务、节点、人员、条件分支和状态，保存后更新当前记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:module"
    },
    {
      "name": "审批流程复制",
      "description": "复制审批流程形成新记录，并允许继续修改后保存。",
      "location": "行操作",
      "locator": "row-action:approval-flow-copy"
    },
    {
      "name": "审批流程删除",
      "description": "删除尚未被业务引用的审批流程，已使用数据不允许直接删除。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "审批流程发布",
      "description": "发布审批流程，发布后在指定业务范围内正式生效。",
      "location": "状态操作",
      "locator": "status-action:resource-publish"
    },
    {
      "name": "审批流程撤回发布",
      "description": "撤回已发布的审批流程，停止后续使用并保留历史发布记录。",
      "location": "状态操作",
      "locator": "status-action:resource-withdraw"
    },
    {
      "name": "审批流程启用",
      "description": "启用审批流程，启用后可在对应业务中选择和使用。",
      "location": "批量操作",
      "locator": "batch-action:resource-enable"
    },
    {
      "name": "审批流程停用",
      "description": "停用审批流程，停用后不再用于新增业务，历史记录继续保留。",
      "location": "批量操作",
      "locator": "batch-action:resource-disable"
    },
    {
      "name": "审批流程记录",
      "description": "查看审批流程的版本、发布、启停和运行记录，保留操作人员与时间。",
      "location": "关联页签",
      "locator": "tab:approval-flow"
    }
  ],
  "approval-node": [
    {
      "name": "审批节点列表",
      "description": "集中展示审批节点的主要字段、状态和更新时间，作为查询和后续处理入口。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "审批节点详情",
      "description": "查看审批节点的节点名称、节点类型、审批方式、审批人员和处理时限。",
      "location": "详情抽屉",
      "locator": "detail-field:node"
    },
    {
      "name": "审批节点新增",
      "description": "录入节点名称、节点类型、审批方式、审批人员和处理时限并保存，形成新的审批节点记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:node"
    },
    {
      "name": "审批节点编辑",
      "description": "修改审批节点的节点名称、节点类型、审批方式、审批人员和处理时限，保存后更新当前记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:node"
    },
    {
      "name": "审批节点删除",
      "description": "删除尚未被业务引用的审批节点，已使用数据不允许直接删除。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "审批节点排序",
      "description": "调整审批节点的展示或匹配顺序，保存后按新顺序生效。",
      "location": "行操作",
      "locator": "row-action:approval-node-sort"
    }
  ],
  "approval-assignee": [
    {
      "name": "审批人员配置列表",
      "description": "集中展示审批人员配置的主要字段、状态和更新时间，作为查询和后续处理入口。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "审批人员配置详情",
      "description": "查看审批人员配置的节点、人员来源、指定人员、岗位、组织负责人和候选范围。",
      "location": "详情抽屉",
      "locator": "detail-field:assignee"
    },
    {
      "name": "审批人员配置新增",
      "description": "录入节点、人员来源、指定人员、岗位、组织负责人和候选范围并保存，形成新的审批人员配置记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:assignee"
    },
    {
      "name": "审批人员配置编辑",
      "description": "修改审批人员配置的节点、人员来源、指定人员、岗位、组织负责人和候选范围，保存后更新当前记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:assignee"
    },
    {
      "name": "审批人员配置删除",
      "description": "删除尚未被业务引用的审批人员配置，已使用数据不允许直接删除。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    }
  ],
  "approval-branch": [
    {
      "name": "条件分支",
      "description": "按金额、类型、组织、风险等级等条件选择审批路径",
      "location": "新增/编辑表单",
      "locator": "form-field:expression"
    },
    {
      "name": "条件分支列表",
      "description": "集中展示条件分支的主要字段、状态和更新时间，作为查询和后续处理入口。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "条件分支详情",
      "description": "查看条件分支的分支名称、判断字段、运算条件、比较值和目标节点。",
      "location": "详情抽屉",
      "locator": "detail-field:node"
    },
    {
      "name": "条件分支新增",
      "description": "录入分支名称、判断字段、运算条件、比较值和目标节点并保存，形成新的条件分支记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:node"
    },
    {
      "name": "条件分支编辑",
      "description": "修改条件分支的分支名称、判断字段、运算条件、比较值和目标节点，保存后更新当前记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:node"
    },
    {
      "name": "条件分支删除",
      "description": "删除尚未被业务引用的条件分支，已使用数据不允许直接删除。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "条件分支排序",
      "description": "调整条件分支的展示或匹配顺序，保存后按新顺序生效。",
      "location": "行操作",
      "locator": "row-action:approval-branch-sort"
    }
  ],
  "approval-application": [
    {
      "name": "流程发起",
      "description": "选择业务和模板，填写表单、保存草稿、提交并生成流程实例",
      "location": "状态操作",
      "locator": "status-action:resource-submit"
    },
    {
      "name": "从待办进入业务单据",
      "description": "从审批待办直接打开对应业务单据进行核对和处理。",
      "location": "详情抽屉",
      "locator": "detail-field:businessId"
    },
    {
      "name": "审批结果回写",
      "description": "审批通过、驳回或撤回后同步更新业务单据状态。",
      "location": "页面处理",
      "locator": "integration-action:integration-execute"
    },
    {
      "name": "审批申请列表",
      "description": "集中展示审批申请编号、申请人、业务对象、金额或数量、当前状态和更新时间。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "审批申请查询",
      "description": "可按关键词、业务单号、状态查询审批申请，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "审批申请详情",
      "description": "查看审批申请的表头信息、明细内容、附件和处理记录。",
      "location": "详情抽屉",
      "locator": "detail-field:businessId"
    },
    {
      "name": "审批申请新建",
      "description": "选择业务单据及审批所需说明和附件并录入明细，创建新的审批申请。",
      "location": "新增/编辑表单",
      "locator": "form-field:businessId"
    },
    {
      "name": "审批申请提交",
      "description": "校验必要字段后提交审批申请，进入审批或后续业务处理。",
      "location": "状态操作",
      "locator": "status-action:resource-submit"
    },
    {
      "name": "审批申请撤回",
      "description": "在允许撤回的状态下撤回审批申请，退回申请人继续处理。",
      "location": "状态操作",
      "locator": "status-action:resource-withdraw"
    },
    {
      "name": "审批申请取消",
      "description": "取消尚未完成的审批申请，记录取消原因并停止后续处理。",
      "location": "状态操作",
      "locator": "status-action:resource-cancel"
    },
    {
      "name": "审批申请操作记录",
      "description": "查看审批申请从创建到完成的状态变化、操作人员和处理时间。",
      "location": "关联页签",
      "locator": "tab:approval-application"
    },
    {
      "name": "审批申请状态查询",
      "description": "可按关键词、业务单号、状态查询审批申请，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:status"
    }
  ],
  "approval-task": [
    {
      "name": "审批处理",
      "description": "支持同意、驳回、退回指定节点、补充材料和审批意见附件",
      "location": "状态操作",
      "locator": "status-action:approval-approve"
    },
    {
      "name": "审批待办聚合",
      "description": "按当前筛选结果统计审批任务记录数量，支持继续查看对应明细。",
      "location": "指标区",
      "locator": "metric:total"
    },
    {
      "name": "处理记录追溯",
      "description": "记录发起、审批、转办、撤回、取消和完成等操作。",
      "location": "关联页签",
      "locator": "tab:operation-log"
    },
    {
      "name": "审批任务列表",
      "description": "集中展示审批任务编号、申请人、业务对象、金额或数量、当前状态和更新时间。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "审批任务查询",
      "description": "可按关键词、业务单号、状态查询审批任务，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "审批任务详情",
      "description": "查看审批任务的表头信息、明细内容、附件和处理记录。",
      "location": "详情抽屉",
      "locator": "detail-field:businessId"
    },
    {
      "name": "审批任务审批通过",
      "description": "审核审批任务内容并审批通过，推动单据进入下一处理环节。",
      "location": "状态操作",
      "locator": "status-action:approval-approve"
    },
    {
      "name": "审批任务审批驳回",
      "description": "驳回不符合要求的审批任务，填写原因并退回申请人。",
      "location": "状态操作",
      "locator": "status-action:approval-reject"
    },
    {
      "name": "审批任务操作记录",
      "description": "查看审批任务从创建到完成的状态变化、操作人员和处理时间。",
      "location": "关联页签",
      "locator": "tab:operation-log"
    }
  ],
  "approval-notice": [
    {
      "name": "未读数量",
      "description": "按当前筛选结果统计公告记录数量，支持继续查看对应明细。",
      "location": "指标区",
      "locator": "metric:total"
    },
    {
      "name": "业务事件通知",
      "description": "采购、库存、资产、资金、排班与调班、会诊等状态变化触发通知",
      "location": "列表列",
      "locator": "column:messageType"
    },
    {
      "name": "待办提醒",
      "description": "流程任务创建、即将超时和已超时分别提醒责任人",
      "location": "查询条件区",
      "locator": "filter:status"
    },
    {
      "name": "公告发布",
      "description": "维护公告标题、正文、附件、发布范围、生效时间和失效时间",
      "location": "状态操作",
      "locator": "status-action:resource-publish"
    },
    {
      "name": "公告列表",
      "description": "集中展示公告的主要字段、状态和更新时间，作为查询和后续处理入口。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "公告查询",
      "description": "可按关键词、接收范围、状态查询公告，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "公告详情",
      "description": "查看公告的标题、正文、附件、发布范围和有效期。",
      "location": "详情抽屉",
      "locator": "detail-field:audience"
    },
    {
      "name": "公告新增",
      "description": "录入标题、正文、附件、发布范围和有效期并保存，形成新的公告记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:audience"
    },
    {
      "name": "公告编辑",
      "description": "修改公告的标题、正文、附件、发布范围和有效期，保存后更新当前记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:audience"
    },
    {
      "name": "公告删除",
      "description": "删除尚未被业务引用的公告，已使用数据不允许直接删除。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "公告发布",
      "description": "发布公告，发布后在指定业务范围内正式生效。",
      "location": "状态操作",
      "locator": "status-action:resource-publish"
    },
    {
      "name": "公告撤回发布",
      "description": "撤回已发布的公告，停止后续使用并保留历史发布记录。",
      "location": "状态操作",
      "locator": "status-action:resource-withdraw"
    },
    {
      "name": "公告记录",
      "description": "查看公告的发布、撤回和阅读确认记录，保留操作人员与时间。",
      "location": "关联页签",
      "locator": "tab:approval-notice"
    }
  ],
  "approval-message": [
    {
      "name": "统一消息中心",
      "description": "聚合待办、业务通知、公告、预警和系统消息，支持分类筛选",
      "location": "列表列",
      "locator": "column:messageType"
    },
    {
      "name": "三端状态同步",
      "description": "后台管理、服务端和管理端读取同一业务状态和处理结果。",
      "location": "列表列",
      "locator": "column:status"
    },
    {
      "name": "业务消息列表",
      "description": "集中展示业务消息的主要字段、状态和更新时间，作为查询和后续处理入口。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "业务消息查询",
      "description": "可按关键词、消息类型、状态查询业务消息，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "业务消息详情",
      "description": "查看业务消息的消息标题、业务摘要、接收对象和关联业务。",
      "location": "详情抽屉",
      "locator": "detail-field:messageType"
    },
    {
      "name": "业务消息记录",
      "description": "查看业务消息的发送、送达和阅读记录，保留操作人员与时间。",
      "location": "关联页签",
      "locator": "tab:approval-message"
    }
  ],
  "supply-supplier": [
    {
      "name": "供应商列表",
      "description": "集中展示供应商的主要字段、状态和更新时间，作为查询和后续处理入口。",
      "location": "列表列",
      "locator": "column:supplier"
    },
    {
      "name": "供应商查询",
      "description": "可按关键词、供应商名称、状态查询供应商，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "供应商详情",
      "description": "查看供应商的基础资料、联系人、结算信息、资质附件和状态。",
      "location": "详情抽屉",
      "locator": "detail-field:contact"
    },
    {
      "name": "供应商新增",
      "description": "录入基础资料、联系人、结算信息、资质附件和状态并保存，形成新的供应商记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:contact"
    },
    {
      "name": "供应商编辑",
      "description": "修改供应商的基础资料、联系人、结算信息、资质附件和状态，保存后更新当前记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:contact"
    },
    {
      "name": "供应商删除",
      "description": "删除尚未被业务引用的供应商，已使用数据不允许直接删除。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "供应商启用",
      "description": "启用供应商，启用后可在对应业务中选择和使用。",
      "location": "批量操作",
      "locator": "batch-action:resource-enable"
    },
    {
      "name": "供应商停用",
      "description": "停用供应商，停用后不再用于新增业务，历史记录继续保留。",
      "location": "批量操作",
      "locator": "batch-action:resource-disable"
    },
    {
      "name": "供应商导入",
      "description": "按模板批量导入供应商，校验必要字段后写入正式资料。",
      "location": "批量操作",
      "locator": "batch-action:resource-import"
    },
    {
      "name": "供应商导出",
      "description": "按当前查询条件导出供应商，用于核对、归档或线下处理。",
      "location": "批量操作",
      "locator": "batch-action:resource-export"
    }
  ],
  "supply-material": [
    {
      "name": "物料资料列表",
      "description": "集中展示物料资料的主要字段、状态和更新时间，作为查询和后续处理入口。",
      "location": "列表列",
      "locator": "column:material"
    },
    {
      "name": "物料资料查询",
      "description": "可按关键词、物料名称、状态查询物料资料，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "物料资料筛选",
      "description": "可按关键词、物料名称、状态查询物料资料，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "物料资料详情",
      "description": "查看物料资料的物料编码、名称、分类、单位、规格、批次效期属性和状态。",
      "location": "详情抽屉",
      "locator": "detail-field:material"
    },
    {
      "name": "物料资料新增",
      "description": "录入物料编码、名称、分类、单位、规格、批次效期属性和状态并保存，形成新的物料资料记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:material"
    },
    {
      "name": "物料资料编辑",
      "description": "修改物料资料的物料编码、名称、分类、单位、规格、批次效期属性和状态，保存后更新当前记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:material"
    },
    {
      "name": "物料资料删除",
      "description": "删除尚未被业务引用的物料资料，已使用数据不允许直接删除。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "物料资料启用",
      "description": "启用物料资料，启用后可在对应业务中选择和使用。",
      "location": "批量操作",
      "locator": "batch-action:resource-enable"
    },
    {
      "name": "物料资料停用",
      "description": "停用物料资料，停用后不再用于新增业务，历史记录继续保留。",
      "location": "批量操作",
      "locator": "batch-action:resource-disable"
    },
    {
      "name": "物料资料导入",
      "description": "按模板批量导入物料资料，校验必要字段后写入正式资料。",
      "location": "批量操作",
      "locator": "batch-action:resource-import"
    },
    {
      "name": "物料资料导出",
      "description": "按当前查询条件导出物料资料，用于核对、归档或线下处理。",
      "location": "批量操作",
      "locator": "batch-action:resource-export"
    }
  ],
  "supply-warehouse-location": [
    {
      "name": "仓库列表",
      "description": "集中展示仓库的主要字段、状态和更新时间，作为查询和后续处理入口。",
      "location": "列表列",
      "locator": "column:warehouse"
    },
    {
      "name": "仓库查询",
      "description": "可按关键词、仓库、状态查询仓库与库位，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "仓库详情",
      "description": "查看仓库的仓库名称、编码、所属组织、负责人和状态。",
      "location": "详情抽屉",
      "locator": "detail-field:warehouse"
    },
    {
      "name": "仓库新增",
      "description": "录入仓库名称、编码、所属组织、负责人和状态并保存，形成新的仓库记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:warehouse"
    },
    {
      "name": "仓库编辑",
      "description": "修改仓库的仓库名称、编码、所属组织、负责人和状态，保存后更新当前记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:warehouse"
    },
    {
      "name": "仓库删除",
      "description": "删除尚未被业务引用的仓库，已使用数据不允许直接删除。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "仓库启用",
      "description": "启用仓库，启用后可在对应业务中选择和使用。",
      "location": "批量操作",
      "locator": "batch-action:resource-enable"
    },
    {
      "name": "仓库停用",
      "description": "停用仓库，停用后不再用于新增业务，历史记录继续保留。",
      "location": "批量操作",
      "locator": "batch-action:resource-disable"
    },
    {
      "name": "库位列表",
      "description": "集中展示库位的主要字段、状态和更新时间，作为查询和后续处理入口。",
      "location": "列表列",
      "locator": "column:warehouse"
    },
    {
      "name": "库位查询",
      "description": "可按关键词、仓库、状态查询仓库与库位，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "库位新增",
      "description": "录入所属仓库、库位编码、库位名称和状态并保存，形成新的库位记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:warehouse"
    },
    {
      "name": "库位编辑",
      "description": "修改库位的所属仓库、库位编码、库位名称和状态，保存后更新当前记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:warehouse"
    },
    {
      "name": "库位删除",
      "description": "删除尚未被业务引用的库位，已使用数据不允许直接删除。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "库位启用",
      "description": "启用库位，启用后可在对应业务中选择和使用。",
      "location": "批量操作",
      "locator": "batch-action:resource-enable"
    },
    {
      "name": "库位停用",
      "description": "停用库位，停用后不再用于新增业务，历史记录继续保留。",
      "location": "批量操作",
      "locator": "batch-action:resource-disable"
    }
  ],
  "purchase-request": [
    {
      "name": "采购申请列表",
      "description": "集中展示采购申请编号、申请人、业务对象、金额或数量、当前状态和更新时间。",
      "location": "列表列",
      "locator": "column:systemNo"
    },
    {
      "name": "采购申请查询",
      "description": "可按关键词、采购申请号、状态查询采购申请，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "采购申请详情",
      "description": "查看采购申请的表头信息、明细内容、附件和处理记录。",
      "location": "详情抽屉",
      "locator": "detail-field:applicant"
    },
    {
      "name": "采购申请新建",
      "description": "选择申请部门、采购物料、数量、期望到货日期和用途并录入明细，创建新的采购申请。",
      "location": "新增/编辑表单",
      "locator": "form-field:requestDepartment"
    },
    {
      "name": "采购申请保存草稿",
      "description": "保存尚未提交的采购申请，允许后续继续补充和修改。",
      "location": "新增/编辑表单",
      "locator": "form-field:applicant"
    },
    {
      "name": "采购申请编辑草稿",
      "description": "修改草稿状态的采购申请及其明细，提交后不再按草稿方式修改。",
      "location": "新增/编辑表单",
      "locator": "form-field:applicant"
    },
    {
      "name": "采购申请删除草稿",
      "description": "删除未提交且未进入审批或执行环节的采购申请草稿。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "采购申请提交",
      "description": "校验必要字段后提交采购申请，进入审批或后续业务处理。",
      "location": "状态操作",
      "locator": "status-action:resource-submit"
    },
    {
      "name": "采购申请撤回",
      "description": "在允许撤回的状态下撤回采购申请，退回申请人继续处理。",
      "location": "状态操作",
      "locator": "status-action:resource-withdraw"
    },
    {
      "name": "采购申请取消",
      "description": "取消尚未完成的采购申请，记录取消原因并停止后续处理。",
      "location": "状态操作",
      "locator": "status-action:resource-cancel"
    },
    {
      "name": "采购申请审批通过",
      "description": "审核采购申请内容并审批通过，推动单据进入下一处理环节。",
      "location": "状态操作",
      "locator": "status-action:approval-approve"
    },
    {
      "name": "采购申请审批驳回",
      "description": "驳回不符合要求的采购申请，填写原因并退回申请人。",
      "location": "状态操作",
      "locator": "status-action:approval-reject"
    },
    {
      "name": "采购申请打印",
      "description": "按统一格式打印采购申请及明细，供签字、交接或归档。",
      "location": "批量操作",
      "locator": "batch-action:resource-print"
    },
    {
      "name": "采购申请导出",
      "description": "按查询条件导出采购申请列表或明细数据。",
      "location": "批量操作",
      "locator": "batch-action:resource-export"
    },
    {
      "name": "采购申请操作记录",
      "description": "查看采购申请从创建到完成的状态变化、操作人员和处理时间。",
      "location": "关联页签",
      "locator": "tab:purchase-request"
    },
    {
      "name": "采购申请状态查询",
      "description": "可按关键词、采购申请号、状态查询采购申请，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:status"
    }
  ],
  "purchase-quote-compare": [
    {
      "name": "询价单列表",
      "description": "集中展示询价单编号、申请人、业务对象、金额或数量、当前状态和更新时间。",
      "location": "列表列",
      "locator": "column:purchaseRequest"
    },
    {
      "name": "询价单查询",
      "description": "可按关键词、采购申请、状态查询询价比价，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "询价单详情",
      "description": "查看询价单的表头信息、明细内容、附件和处理记录。",
      "location": "详情抽屉",
      "locator": "detail-field:purchaseRequest"
    },
    {
      "name": "询价单新建",
      "description": "选择采购需求、候选供应商、报价截止时间和询价说明并录入明细，创建新的询价单。",
      "location": "新增/编辑表单",
      "locator": "form-field:supplier"
    },
    {
      "name": "询价单保存草稿",
      "description": "保存尚未提交的询价单，允许后续继续补充和修改。",
      "location": "新增/编辑表单",
      "locator": "form-field:purchaseRequest"
    },
    {
      "name": "询价单编辑草稿",
      "description": "修改草稿状态的询价单及其明细，提交后不再按草稿方式修改。",
      "location": "新增/编辑表单",
      "locator": "form-field:purchaseRequest"
    },
    {
      "name": "询价单删除草稿",
      "description": "删除未提交且未进入审批或执行环节的询价单草稿。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "询价单提交",
      "description": "校验必要字段后提交询价单，进入审批或后续业务处理。",
      "location": "状态操作",
      "locator": "status-action:resource-submit"
    },
    {
      "name": "询价单取消",
      "description": "取消尚未完成的询价单，记录取消原因并停止后续处理。",
      "location": "状态操作",
      "locator": "status-action:resource-cancel"
    },
    {
      "name": "询价单关闭",
      "description": "关闭不再继续执行的询价单，保留已发生业务和关闭原因。",
      "location": "状态操作",
      "locator": "status-action:resource-close"
    },
    {
      "name": "询价单打印",
      "description": "按统一格式打印询价单及明细，供签字、交接或归档。",
      "location": "批量操作",
      "locator": "batch-action:resource-print"
    },
    {
      "name": "询价单导出",
      "description": "按查询条件导出询价单列表或明细数据。",
      "location": "批量操作",
      "locator": "batch-action:resource-export"
    },
    {
      "name": "询价单操作记录",
      "description": "查看询价单从创建到完成的状态变化、操作人员和处理时间。",
      "location": "关联页签",
      "locator": "tab:purchase-quote-compare"
    },
    {
      "name": "供应商报价列表",
      "description": "集中展示供应商报价的主要字段、状态和更新时间，作为查询和后续处理入口。",
      "location": "列表列",
      "locator": "column:purchaseRequest"
    },
    {
      "name": "供应商报价查询",
      "description": "可按关键词、采购申请、状态查询询价比价，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "供应商报价详情",
      "description": "查看供应商报价的供应商、物料单价、税费、交期、有效期和附件。",
      "location": "详情抽屉",
      "locator": "detail-field:supplier"
    },
    {
      "name": "供应商报价新增",
      "description": "录入供应商、物料单价、税费、交期、有效期和附件并保存，形成新的供应商报价记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:supplier"
    },
    {
      "name": "供应商报价编辑",
      "description": "修改供应商报价的供应商、物料单价、税费、交期、有效期和附件，保存后更新当前记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:supplier"
    },
    {
      "name": "供应商报价删除",
      "description": "删除尚未被业务引用的供应商报价，已使用数据不允许直接删除。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "供应商报价导入",
      "description": "按模板批量导入供应商报价，校验必要字段后写入正式资料。",
      "location": "批量操作",
      "locator": "batch-action:resource-import"
    },
    {
      "name": "供应商报价导出",
      "description": "按当前查询条件导出供应商报价，用于核对、归档或线下处理。",
      "location": "批量操作",
      "locator": "batch-action:resource-export"
    },
    {
      "name": "采购需求汇总",
      "description": "按当前筛选结果统计询价比价记录数量，支持继续查看对应明细。",
      "location": "指标区",
      "locator": "metric:total"
    }
  ],
  "purchase-order": [
    {
      "name": "采购订单列表",
      "description": "集中展示采购订单编号、申请人、业务对象、金额或数量、当前状态和更新时间。",
      "location": "列表列",
      "locator": "column:systemNo"
    },
    {
      "name": "采购订单查询",
      "description": "可按关键词、采购订单号、状态查询采购订单，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "采购订单详情",
      "description": "查看采购订单的表头信息、明细内容、附件和处理记录。",
      "location": "详情抽屉",
      "locator": "detail-field:purchaseRequest"
    },
    {
      "name": "采购订单新建",
      "description": "选择供应商、采购物料、价格、数量、交期和结算方式并录入明细，创建新的采购订单。",
      "location": "新增/编辑表单",
      "locator": "form-field:supplier"
    },
    {
      "name": "采购订单保存草稿",
      "description": "保存尚未提交的采购订单，允许后续继续补充和修改。",
      "location": "新增/编辑表单",
      "locator": "form-field:purchaseRequest"
    },
    {
      "name": "采购订单编辑草稿",
      "description": "修改草稿状态的采购订单及其明细，提交后不再按草稿方式修改。",
      "location": "新增/编辑表单",
      "locator": "form-field:purchaseRequest"
    },
    {
      "name": "采购订单删除草稿",
      "description": "删除未提交且未进入审批或执行环节的采购订单草稿。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "采购订单提交",
      "description": "校验必要字段后提交采购订单，进入审批或后续业务处理。",
      "location": "状态操作",
      "locator": "status-action:resource-submit"
    },
    {
      "name": "采购订单撤回",
      "description": "在允许撤回的状态下撤回采购订单，退回申请人继续处理。",
      "location": "状态操作",
      "locator": "status-action:resource-withdraw"
    },
    {
      "name": "采购订单取消",
      "description": "取消尚未完成的采购订单，记录取消原因并停止后续处理。",
      "location": "状态操作",
      "locator": "status-action:resource-cancel"
    },
    {
      "name": "采购订单审批通过",
      "description": "审核采购订单内容并审批通过，推动单据进入下一处理环节。",
      "location": "状态操作",
      "locator": "status-action:approval-approve"
    },
    {
      "name": "采购订单审批驳回",
      "description": "驳回不符合要求的采购订单，填写原因并退回申请人。",
      "location": "状态操作",
      "locator": "status-action:approval-reject"
    },
    {
      "name": "采购订单关闭",
      "description": "关闭不再继续执行的采购订单，保留已发生业务和关闭原因。",
      "location": "状态操作",
      "locator": "status-action:resource-close"
    },
    {
      "name": "采购订单打印",
      "description": "按统一格式打印采购订单及明细，供签字、交接或归档。",
      "location": "批量操作",
      "locator": "batch-action:resource-print"
    },
    {
      "name": "采购订单导出",
      "description": "按查询条件导出采购订单列表或明细数据。",
      "location": "批量操作",
      "locator": "batch-action:resource-export"
    },
    {
      "name": "采购订单操作记录",
      "description": "查看采购订单从创建到完成的状态变化、操作人员和处理时间。",
      "location": "关联页签",
      "locator": "tab:purchase-order"
    },
    {
      "name": "采购订单状态查询",
      "description": "可按关键词、采购订单号、状态查询采购订单，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:status"
    }
  ],
  "inventory-inbound": [
    {
      "name": "到货登记列表",
      "description": "集中展示到货登记编号、申请人、业务对象、金额或数量、当前状态和更新时间。",
      "location": "列表列",
      "locator": "column:systemNo"
    },
    {
      "name": "到货登记查询",
      "description": "可按关键词、入库单号、状态查询采购入库，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "到货登记详情",
      "description": "查看到货登记的表头信息、明细内容、附件和处理记录。",
      "location": "详情抽屉",
      "locator": "detail-field:purchaseOrder"
    },
    {
      "name": "到货登记新建",
      "description": "选择采购订单、到货物料、批次和到货数量并录入明细，创建新的到货登记。",
      "location": "新增/编辑表单",
      "locator": "form-field:material"
    },
    {
      "name": "到货登记保存草稿",
      "description": "保存尚未提交的到货登记，允许后续继续补充和修改。",
      "location": "新增/编辑表单",
      "locator": "form-field:purchaseOrder"
    },
    {
      "name": "到货登记编辑草稿",
      "description": "修改草稿状态的到货登记及其明细，提交后不再按草稿方式修改。",
      "location": "新增/编辑表单",
      "locator": "form-field:purchaseOrder"
    },
    {
      "name": "到货登记删除草稿",
      "description": "删除未提交且未进入审批或执行环节的到货登记草稿。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "到货登记提交",
      "description": "校验必要字段后提交到货登记，进入审批或后续业务处理。",
      "location": "状态操作",
      "locator": "status-action:resource-submit"
    },
    {
      "name": "到货登记取消",
      "description": "取消尚未完成的到货登记，记录取消原因并停止后续处理。",
      "location": "状态操作",
      "locator": "status-action:resource-cancel"
    },
    {
      "name": "到货登记确认",
      "description": "确认到货登记的业务结果，写入确认人员和确认时间。",
      "location": "状态操作",
      "locator": "status-action:resource-confirm"
    },
    {
      "name": "到货登记操作记录",
      "description": "查看到货登记从创建到完成的状态变化、操作人员和处理时间。",
      "location": "关联页签",
      "locator": "tab:receipt-stage"
    },
    {
      "name": "收货单列表",
      "description": "集中展示收货单编号、申请人、业务对象、金额或数量、当前状态和更新时间。",
      "location": "列表列",
      "locator": "column:systemNo"
    },
    {
      "name": "收货单查询",
      "description": "可按关键词、入库单号、状态查询采购入库，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "收货单详情",
      "description": "查看收货单的表头信息、明细内容、附件和处理记录。",
      "location": "详情抽屉",
      "locator": "detail-field:purchaseOrder"
    },
    {
      "name": "收货单新建",
      "description": "选择到货任务、实收数量、批次和收货仓库并录入明细，创建新的收货单。",
      "location": "新增/编辑表单",
      "locator": "form-field:actualReceivedQty"
    },
    {
      "name": "收货单保存草稿",
      "description": "保存尚未提交的收货单，允许后续继续补充和修改。",
      "location": "新增/编辑表单",
      "locator": "form-field:purchaseOrder"
    },
    {
      "name": "收货单编辑草稿",
      "description": "修改草稿状态的收货单及其明细，提交后不再按草稿方式修改。",
      "location": "新增/编辑表单",
      "locator": "form-field:purchaseOrder"
    },
    {
      "name": "收货单删除草稿",
      "description": "删除未提交且未进入审批或执行环节的收货单草稿。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "收货单提交",
      "description": "校验必要字段后提交收货单，进入审批或后续业务处理。",
      "location": "状态操作",
      "locator": "status-action:resource-submit"
    },
    {
      "name": "收货单取消",
      "description": "取消尚未完成的收货单，记录取消原因并停止后续处理。",
      "location": "状态操作",
      "locator": "status-action:resource-cancel"
    },
    {
      "name": "收货单确认",
      "description": "确认收货单的业务结果，写入确认人员和确认时间。",
      "location": "状态操作",
      "locator": "status-action:resource-confirm"
    },
    {
      "name": "收货单撤销确认",
      "description": "在未形成后续业务前撤销收货单确认，恢复至可调整状态。",
      "location": "状态操作",
      "locator": "status-action:resource-confirm"
    },
    {
      "name": "收货单打印",
      "description": "按统一格式打印收货单及明细，供签字、交接或归档。",
      "location": "批量操作",
      "locator": "batch-action:resource-print"
    },
    {
      "name": "收货单操作记录",
      "description": "查看收货单从创建到完成的状态变化、操作人员和处理时间。",
      "location": "关联页签",
      "locator": "tab:receipt-stage"
    },
    {
      "name": "验收单列表",
      "description": "集中展示验收单编号、申请人、业务对象、金额或数量、当前状态和更新时间。",
      "location": "列表列",
      "locator": "column:systemNo"
    },
    {
      "name": "验收单查询",
      "description": "可按关键词、入库单号、状态查询采购入库，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "验收单详情",
      "description": "查看验收单的表头信息、明细内容、附件和处理记录。",
      "location": "详情抽屉",
      "locator": "detail-field:purchaseOrder"
    },
    {
      "name": "验收单新建",
      "description": "选择收货明细、抽检结果、合格数量、拒收数量和附件并录入明细，创建新的验收单。",
      "location": "新增/编辑表单",
      "locator": "form-field:qualifiedQty"
    },
    {
      "name": "验收单保存草稿",
      "description": "保存尚未提交的验收单，允许后续继续补充和修改。",
      "location": "新增/编辑表单",
      "locator": "form-field:purchaseOrder"
    },
    {
      "name": "验收单编辑草稿",
      "description": "修改草稿状态的验收单及其明细，提交后不再按草稿方式修改。",
      "location": "新增/编辑表单",
      "locator": "form-field:purchaseOrder"
    },
    {
      "name": "验收单提交",
      "description": "校验必要字段后提交验收单，进入审批或后续业务处理。",
      "location": "状态操作",
      "locator": "status-action:resource-submit"
    },
    {
      "name": "验收单取消",
      "description": "取消尚未完成的验收单，记录取消原因并停止后续处理。",
      "location": "状态操作",
      "locator": "status-action:resource-cancel"
    },
    {
      "name": "验收单确认",
      "description": "确认验收单的业务结果，写入确认人员和确认时间。",
      "location": "状态操作",
      "locator": "status-action:resource-confirm"
    },
    {
      "name": "验收单操作记录",
      "description": "查看验收单从创建到完成的状态变化、操作人员和处理时间。",
      "location": "关联页签",
      "locator": "tab:receipt-stage"
    },
    {
      "name": "到货任务",
      "description": "根据采购订单生成待收货任务，展示供应商、计划日期和未收数量",
      "location": "详情抽屉",
      "locator": "detail-field:supplier"
    },
    {
      "name": "现场收货",
      "description": "扫描或选择订单，录入实收数量、批次、生产日期、效期和附件",
      "location": "详情抽屉",
      "locator": "detail-field:actualReceivedQty"
    },
    {
      "name": "差异登记",
      "description": "记录短装、超收、破损、错货等差异及处理意见",
      "location": "新增/编辑表单",
      "locator": "form-field:purchaseOrder"
    },
    {
      "name": "质量验收",
      "description": "按物料要求登记合格、不合格、待复检和验收说明",
      "location": "状态操作",
      "locator": "status-action:resource-confirm"
    }
  ],
  "inventory-requisition": [
    {
      "name": "领用申请列表",
      "description": "集中展示领用申请编号、申请人、业务对象、金额或数量、当前状态和更新时间。",
      "location": "列表列",
      "locator": "column:systemNo"
    },
    {
      "name": "领用申请查询",
      "description": "可按关键词、耗用/领用申请号、状态查询领用与客户耗用，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "领用申请详情",
      "description": "查看领用申请的表头信息、明细内容、附件和处理记录。",
      "location": "详情抽屉",
      "locator": "detail-field:applicant"
    },
    {
      "name": "领用申请新建",
      "description": "选择领用人、领用物料、数量、用途和出库仓库并录入明细，创建新的领用申请。",
      "location": "新增/编辑表单",
      "locator": "form-field:material"
    },
    {
      "name": "领用申请保存草稿",
      "description": "保存尚未提交的领用申请，允许后续继续补充和修改。",
      "location": "新增/编辑表单",
      "locator": "form-field:applicant"
    },
    {
      "name": "领用申请编辑草稿",
      "description": "修改草稿状态的领用申请及其明细，提交后不再按草稿方式修改。",
      "location": "新增/编辑表单",
      "locator": "form-field:applicant"
    },
    {
      "name": "领用申请删除草稿",
      "description": "删除未提交且未进入审批或执行环节的领用申请草稿。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "领用申请提交",
      "description": "校验必要字段后提交领用申请，进入审批或后续业务处理。",
      "location": "状态操作",
      "locator": "status-action:resource-submit"
    },
    {
      "name": "领用申请撤回",
      "description": "在允许撤回的状态下撤回领用申请，退回申请人继续处理。",
      "location": "状态操作",
      "locator": "status-action:resource-withdraw"
    },
    {
      "name": "领用申请取消",
      "description": "取消尚未完成的领用申请，记录取消原因并停止后续处理。",
      "location": "状态操作",
      "locator": "status-action:resource-cancel"
    },
    {
      "name": "领用申请审批通过",
      "description": "审核领用申请内容并审批通过，推动单据进入下一处理环节。",
      "location": "状态操作",
      "locator": "status-action:approval-approve"
    },
    {
      "name": "领用申请审批驳回",
      "description": "驳回不符合要求的领用申请，填写原因并退回申请人。",
      "location": "状态操作",
      "locator": "status-action:approval-reject"
    },
    {
      "name": "领用申请操作记录",
      "description": "查看领用申请从创建到完成的状态变化、操作人员和处理时间。",
      "location": "关联页签",
      "locator": "tab:inventory-requisition"
    },
    {
      "name": "员工领用申请",
      "description": "员工选择物料、数量、用途、领用部门和期望领取时间",
      "location": "详情抽屉",
      "locator": "detail-field:material"
    },
    {
      "name": "部门领用审批",
      "description": "按物料类别、数量或金额进入部门及仓库审批",
      "location": "详情抽屉",
      "locator": "detail-field:material"
    }
  ],
  "inventory-transfer": [
    {
      "name": "调拨单列表",
      "description": "集中展示调拨单编号、申请人、业务对象、金额或数量、当前状态和更新时间。",
      "location": "列表列",
      "locator": "column:systemNo"
    },
    {
      "name": "调拨单查询",
      "description": "可按关键词、调拨单号、状态查询调拨单，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "调拨单详情",
      "description": "查看调拨单的表头信息、明细内容、附件和处理记录。",
      "location": "详情抽屉",
      "locator": "detail-field:material"
    },
    {
      "name": "调拨单新建",
      "description": "选择调出仓库、调入仓库、物料、批次和数量并录入明细，创建新的调拨单。",
      "location": "新增/编辑表单",
      "locator": "form-field:material"
    },
    {
      "name": "调拨单保存草稿",
      "description": "保存尚未提交的调拨单，允许后续继续补充和修改。",
      "location": "新增/编辑表单",
      "locator": "form-field:material"
    },
    {
      "name": "调拨单编辑草稿",
      "description": "修改草稿状态的调拨单及其明细，提交后不再按草稿方式修改。",
      "location": "新增/编辑表单",
      "locator": "form-field:material"
    },
    {
      "name": "调拨单删除草稿",
      "description": "删除未提交且未进入审批或执行环节的调拨单草稿。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "调拨单提交",
      "description": "校验必要字段后提交调拨单，进入审批或后续业务处理。",
      "location": "状态操作",
      "locator": "status-action:resource-submit"
    },
    {
      "name": "调拨单撤回",
      "description": "在允许撤回的状态下撤回调拨单，退回申请人继续处理。",
      "location": "状态操作",
      "locator": "status-action:resource-withdraw"
    },
    {
      "name": "调拨单取消",
      "description": "取消尚未完成的调拨单，记录取消原因并停止后续处理。",
      "location": "状态操作",
      "locator": "status-action:resource-cancel"
    },
    {
      "name": "调拨单审批通过",
      "description": "审核调拨单内容并审批通过，推动单据进入下一处理环节。",
      "location": "状态操作",
      "locator": "status-action:approval-approve"
    },
    {
      "name": "调拨单审批驳回",
      "description": "驳回不符合要求的调拨单，填写原因并退回申请人。",
      "location": "状态操作",
      "locator": "status-action:approval-reject"
    },
    {
      "name": "调拨单状态查询",
      "description": "可按关键词、调拨单号、状态查询调拨单，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:status"
    },
    {
      "name": "调拨单操作记录",
      "description": "查看调拨单从创建到完成的状态变化、操作人员和处理时间。",
      "location": "关联页签",
      "locator": "tab:inventory-transfer"
    }
  ],
  "inventory-stocktake": [
    {
      "name": "盘点任务列表",
      "description": "集中展示盘点任务编号、申请人、业务对象、金额或数量、当前状态和更新时间。",
      "location": "列表列",
      "locator": "column:systemNo"
    },
    {
      "name": "盘点任务查询",
      "description": "可按关键词、盘点单号、状态查询盘点单，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "盘点任务详情",
      "description": "查看盘点任务的表头信息、明细内容、附件和处理记录。",
      "location": "详情抽屉",
      "locator": "detail-field:warehouse"
    },
    {
      "name": "盘点任务新建",
      "description": "选择盘点仓库、库位、物料范围和盘点人员并录入明细，创建新的盘点任务。",
      "location": "新增/编辑表单",
      "locator": "form-field:warehouse"
    },
    {
      "name": "盘点任务保存草稿",
      "description": "保存尚未提交的盘点任务，允许后续继续补充和修改。",
      "location": "新增/编辑表单",
      "locator": "form-field:warehouse"
    },
    {
      "name": "盘点任务编辑草稿",
      "description": "修改草稿状态的盘点任务及其明细，提交后不再按草稿方式修改。",
      "location": "新增/编辑表单",
      "locator": "form-field:warehouse"
    },
    {
      "name": "盘点任务删除草稿",
      "description": "删除未提交且未进入审批或执行环节的盘点任务草稿。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "盘点任务提交",
      "description": "校验必要字段后提交盘点任务，进入审批或后续业务处理。",
      "location": "状态操作",
      "locator": "status-action:resource-submit"
    },
    {
      "name": "盘点任务取消",
      "description": "取消尚未完成的盘点任务，记录取消原因并停止后续处理。",
      "location": "状态操作",
      "locator": "status-action:resource-cancel"
    },
    {
      "name": "盘点任务确认",
      "description": "确认盘点任务的业务结果，写入确认人员和确认时间。",
      "location": "状态操作",
      "locator": "status-action:resource-confirm"
    },
    {
      "name": "盘点任务操作记录",
      "description": "查看盘点任务从创建到完成的状态变化、操作人员和处理时间。",
      "location": "关联页签",
      "locator": "tab:inventory-stocktake"
    }
  ],
  "inventory-scrap": [
    {
      "name": "报废申请列表",
      "description": "集中展示报废申请编号、申请人、业务对象、金额或数量、当前状态和更新时间。",
      "location": "列表列",
      "locator": "column:systemNo"
    },
    {
      "name": "报废申请查询",
      "description": "可按关键词、报废单号、状态查询报废单，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "报废申请详情",
      "description": "查看报废申请的表头信息、明细内容、附件和处理记录。",
      "location": "详情抽屉",
      "locator": "detail-field:material"
    },
    {
      "name": "报废申请新建",
      "description": "选择报废物料、批次、数量、原因和附件并录入明细，创建新的报废申请。",
      "location": "新增/编辑表单",
      "locator": "form-field:material"
    },
    {
      "name": "报废申请保存草稿",
      "description": "保存尚未提交的报废申请，允许后续继续补充和修改。",
      "location": "新增/编辑表单",
      "locator": "form-field:material"
    },
    {
      "name": "报废申请编辑草稿",
      "description": "修改草稿状态的报废申请及其明细，提交后不再按草稿方式修改。",
      "location": "新增/编辑表单",
      "locator": "form-field:material"
    },
    {
      "name": "报废申请删除草稿",
      "description": "删除未提交且未进入审批或执行环节的报废申请草稿。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "报废申请提交",
      "description": "校验必要字段后提交报废申请，进入审批或后续业务处理。",
      "location": "状态操作",
      "locator": "status-action:resource-submit"
    },
    {
      "name": "报废申请撤回",
      "description": "在允许撤回的状态下撤回报废申请，退回申请人继续处理。",
      "location": "状态操作",
      "locator": "status-action:resource-withdraw"
    },
    {
      "name": "报废申请取消",
      "description": "取消尚未完成的报废申请，记录取消原因并停止后续处理。",
      "location": "状态操作",
      "locator": "status-action:resource-cancel"
    },
    {
      "name": "报废申请审批通过",
      "description": "审核报废申请内容并审批通过，推动单据进入下一处理环节。",
      "location": "状态操作",
      "locator": "status-action:approval-approve"
    },
    {
      "name": "报废申请审批驳回",
      "description": "驳回不符合要求的报废申请，填写原因并退回申请人。",
      "location": "状态操作",
      "locator": "status-action:approval-reject"
    }
  ],
  "asset-category": [
    {
      "name": "资产分类列表",
      "description": "集中展示资产分类的主要字段、状态和更新时间，作为查询和后续处理入口。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "资产分类查询",
      "description": "可按关键词、适用范围、状态查询资产分类，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "资产分类新增",
      "description": "录入分类名称、分类编码、上级分类、使用说明和状态并保存，形成新的资产分类记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:scope"
    },
    {
      "name": "资产分类编辑",
      "description": "修改资产分类的分类名称、分类编码、上级分类、使用说明和状态，保存后更新当前记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:scope"
    },
    {
      "name": "资产分类删除",
      "description": "删除尚未被业务引用的资产分类，已使用数据不允许直接删除。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "资产分类启用",
      "description": "启用资产分类，启用后可在对应业务中选择和使用。",
      "location": "批量操作",
      "locator": "batch-action:resource-enable"
    },
    {
      "name": "资产分类停用",
      "description": "停用资产分类，停用后不再用于新增业务，历史记录继续保留。",
      "location": "批量操作",
      "locator": "batch-action:resource-disable"
    }
  ],
  "asset-card": [
    {
      "name": "资产资料列表",
      "description": "集中展示资产资料的主要字段、状态和更新时间，作为查询和后续处理入口。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "资产资料查询",
      "description": "可按关键词、资产编号、状态查询资产资料，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "资产资料筛选",
      "description": "可按关键词、资产编号、状态查询资产资料，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "资产资料详情",
      "description": "查看资产资料的编号、名称、分类、原值、购置日期、使用部门、责任人、保修期和附件。",
      "location": "详情抽屉",
      "locator": "detail-field:department"
    },
    {
      "name": "资产资料新增",
      "description": "录入编号、名称、分类、原值、购置日期、使用部门、责任人、保修期和附件并保存，形成新的资产资料记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:department"
    },
    {
      "name": "资产资料编辑",
      "description": "修改资产资料的编号、名称、分类、原值、购置日期、使用部门、责任人、保修期和附件，保存后更新当前记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:department"
    },
    {
      "name": "资产资料导入",
      "description": "按模板批量导入资产资料，校验必要字段后写入正式资料。",
      "location": "批量操作",
      "locator": "batch-action:resource-import"
    }
  ],
  "asset-use": [
    {
      "name": "资产领用单列表",
      "description": "集中展示资产领用单编号、申请人、业务对象、金额或数量、当前状态和更新时间。",
      "location": "列表列",
      "locator": "column:systemNo"
    },
    {
      "name": "资产领用单查询",
      "description": "可按关键词、资产领用单号、状态查询资产领用单，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "资产领用单详情",
      "description": "查看资产领用单的表头信息、明细内容、附件和处理记录。",
      "location": "详情抽屉",
      "locator": "detail-field:assetCode"
    },
    {
      "name": "资产领用单新建",
      "description": "选择资产、领用人、使用部门和领用日期并录入明细，创建新的资产领用单。",
      "location": "新增/编辑表单",
      "locator": "form-field:assetCode"
    },
    {
      "name": "资产领用单提交",
      "description": "校验必要字段后提交资产领用单，进入审批或后续业务处理。",
      "location": "状态操作",
      "locator": "status-action:resource-submit"
    },
    {
      "name": "资产领用单撤回",
      "description": "在允许撤回的状态下撤回资产领用单，退回申请人继续处理。",
      "location": "状态操作",
      "locator": "status-action:resource-withdraw"
    },
    {
      "name": "资产领用单审批通过",
      "description": "审核资产领用单内容并审批通过，推动单据进入下一处理环节。",
      "location": "状态操作",
      "locator": "status-action:approval-approve"
    },
    {
      "name": "资产领用单审批驳回",
      "description": "驳回不符合要求的资产领用单，填写原因并退回申请人。",
      "location": "状态操作",
      "locator": "status-action:approval-reject"
    },
    {
      "name": "资产领用单确认",
      "description": "确认资产领用单的业务结果，写入确认人员和确认时间。",
      "location": "状态操作",
      "locator": "status-action:resource-confirm"
    },
    {
      "name": "资产领用单操作记录",
      "description": "查看资产领用单从创建到完成的状态变化、操作人员和处理时间。",
      "location": "关联页签",
      "locator": "tab:asset-use"
    }
  ],
  "asset-return": [
    {
      "name": "资产归还单列表",
      "description": "集中展示资产归还单编号、申请人、业务对象、金额或数量、当前状态和更新时间。",
      "location": "列表列",
      "locator": "column:systemNo"
    },
    {
      "name": "资产归还单查询",
      "description": "可按关键词、资产归还单号、状态查询资产归还单，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "资产归还单详情",
      "description": "查看资产归还单的表头信息、明细内容、附件和处理记录。",
      "location": "详情抽屉",
      "locator": "detail-field:assetCode"
    },
    {
      "name": "资产归还单新建",
      "description": "选择待归还资产、归还日期和资产状况并录入明细，创建新的资产归还单。",
      "location": "新增/编辑表单",
      "locator": "form-field:assetCode"
    },
    {
      "name": "资产归还单确认",
      "description": "确认资产归还单的业务结果，写入确认人员和确认时间。",
      "location": "状态操作",
      "locator": "status-action:resource-confirm"
    },
    {
      "name": "资产归还单取消",
      "description": "取消尚未完成的资产归还单，记录取消原因并停止后续处理。",
      "location": "状态操作",
      "locator": "status-action:resource-cancel"
    },
    {
      "name": "资产归还单操作记录",
      "description": "查看资产归还单从创建到完成的状态变化、操作人员和处理时间。",
      "location": "关联页签",
      "locator": "tab:asset-return"
    }
  ],
  "asset-transfer": [
    {
      "name": "资产调拨单列表",
      "description": "集中展示资产调拨单编号、申请人、业务对象、金额或数量、当前状态和更新时间。",
      "location": "列表列",
      "locator": "column:systemNo"
    },
    {
      "name": "资产调拨单查询",
      "description": "可按关键词、资产调拨单号、状态查询资产调拨单，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "资产调拨单详情",
      "description": "查看资产调拨单的表头信息、明细内容、附件和处理记录。",
      "location": "详情抽屉",
      "locator": "detail-field:assetCode"
    },
    {
      "name": "资产调拨单新建",
      "description": "选择资产、调出部门、调入部门、接收人和调拨日期并录入明细，创建新的资产调拨单。",
      "location": "新增/编辑表单",
      "locator": "form-field:assetCode"
    },
    {
      "name": "资产调拨单提交",
      "description": "校验必要字段后提交资产调拨单，进入审批或后续业务处理。",
      "location": "状态操作",
      "locator": "status-action:resource-submit"
    }
  ],
  "asset-maintenance": [
    {
      "name": "资产维修单列表",
      "description": "集中展示资产维修单编号、申请人、业务对象、金额或数量、当前状态和更新时间。",
      "location": "列表列",
      "locator": "column:systemNo"
    },
    {
      "name": "资产维修单查询",
      "description": "可按关键词、资产维修单号、状态查询资产维修单，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "资产维修单详情",
      "description": "查看资产维修单的表头信息、明细内容、附件和处理记录。",
      "location": "详情抽屉",
      "locator": "detail-field:assetCode"
    },
    {
      "name": "资产维修单新建",
      "description": "选择故障资产、故障说明、维修单位、费用和维修结果并录入明细，创建新的资产维修单。",
      "location": "新增/编辑表单",
      "locator": "form-field:assetCode"
    },
    {
      "name": "资产维修单编辑草稿",
      "description": "修改草稿状态的资产维修单及其明细，提交后不再按草稿方式修改。",
      "location": "新增/编辑表单",
      "locator": "form-field:assetCode"
    },
    {
      "name": "资产维修单提交",
      "description": "校验必要字段后提交资产维修单，进入审批或后续业务处理。",
      "location": "状态操作",
      "locator": "status-action:resource-submit"
    },
    {
      "name": "资产维修单确认",
      "description": "确认资产维修单的业务结果，写入确认人员和确认时间。",
      "location": "状态操作",
      "locator": "status-action:resource-confirm"
    },
    {
      "name": "资产维修单归档",
      "description": "将完成的资产维修单及附件归档，供后续查询和追溯。",
      "location": "状态操作",
      "locator": "status-action:resource-archive"
    },
    {
      "name": "资产维修单操作记录",
      "description": "查看资产维修单从创建到完成的状态变化、操作人员和处理时间。",
      "location": "关联页签",
      "locator": "tab:asset-maintenance"
    }
  ],
  "asset-stocktake": [
    {
      "name": "资产盘点任务列表",
      "description": "集中展示资产盘点任务编号、申请人、业务对象、金额或数量、当前状态和更新时间。",
      "location": "列表列",
      "locator": "column:systemNo"
    },
    {
      "name": "资产盘点任务查询",
      "description": "可按关键词、资产盘点任务号、状态查询资产盘点任务，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "资产盘点任务详情",
      "description": "查看资产盘点任务的表头信息、明细内容、附件和处理记录。",
      "location": "详情抽屉",
      "locator": "detail-field:assetCode"
    },
    {
      "name": "资产盘点任务新建",
      "description": "选择盘点组织、资产范围、盘点人员和计划日期并录入明细，创建新的资产盘点任务。",
      "location": "新增/编辑表单",
      "locator": "form-field:assetCode"
    },
    {
      "name": "资产盘点任务提交",
      "description": "校验必要字段后提交资产盘点任务，进入审批或后续业务处理。",
      "location": "状态操作",
      "locator": "status-action:resource-submit"
    },
    {
      "name": "资产盘点任务取消",
      "description": "取消尚未完成的资产盘点任务，记录取消原因并停止后续处理。",
      "location": "状态操作",
      "locator": "status-action:resource-cancel"
    },
    {
      "name": "资产盘点任务确认",
      "description": "确认资产盘点任务的业务结果，写入确认人员和确认时间。",
      "location": "状态操作",
      "locator": "status-action:resource-confirm"
    },
    {
      "name": "资产盘点任务操作记录",
      "description": "查看资产盘点任务从创建到完成的状态变化、操作人员和处理时间。",
      "location": "关联页签",
      "locator": "tab:asset-stocktake"
    }
  ],
  "asset-scrap": [
    {
      "name": "资产报废申请列表",
      "description": "集中展示资产报废申请编号、申请人、业务对象、金额或数量、当前状态和更新时间。",
      "location": "列表列",
      "locator": "column:systemNo"
    },
    {
      "name": "资产报废申请查询",
      "description": "可按关键词、资产报废申请号、状态查询资产报废申请，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "资产报废申请详情",
      "description": "查看资产报废申请的表头信息、明细内容、附件和处理记录。",
      "location": "详情抽屉",
      "locator": "detail-field:assetCode"
    },
    {
      "name": "资产报废申请新建",
      "description": "选择报废资产、报废原因、处置方式和附件并录入明细，创建新的资产报废申请。",
      "location": "新增/编辑表单",
      "locator": "form-field:assetCode"
    },
    {
      "name": "资产报废申请提交",
      "description": "校验必要字段后提交资产报废申请，进入审批或后续业务处理。",
      "location": "状态操作",
      "locator": "status-action:resource-submit"
    },
    {
      "name": "资产报废申请撤回",
      "description": "在允许撤回的状态下撤回资产报废申请，退回申请人继续处理。",
      "location": "状态操作",
      "locator": "status-action:resource-withdraw"
    },
    {
      "name": "资产报废申请审批通过",
      "description": "审核资产报废申请内容并审批通过，推动单据进入下一处理环节。",
      "location": "状态操作",
      "locator": "status-action:approval-approve"
    }
  ],
  "checkup-sync": [
    {
      "name": "同步范围",
      "description": "在体检系统同步页面处理同步范围，保留批次、映射版本和处理结果用于追溯。",
      "location": "详情抽屉",
      "locator": "detail-field:sourceSystem"
    },
    {
      "name": "接口字段映射",
      "description": "明确双方字段、编码、必填项、数据格式和转换口径。",
      "location": "页面处理",
      "locator": "integration-action:integration-execute"
    },
    {
      "name": "体检结果批量同步",
      "description": "在体检系统同步页面处理体检结果批量同步，保留批次、映射版本和处理结果用于追溯。",
      "location": "页面处理",
      "locator": "integration-action:integration-execute"
    },
    {
      "name": "体检客户匹配",
      "description": "在体检系统同步页面处理体检客户匹配，保留批次、映射版本和处理结果用于追溯。",
      "location": "新增/编辑表单",
      "locator": "form-field:sourceSystem"
    },
    {
      "name": "标准项目结果写入",
      "description": "在体检系统同步页面处理标准项目结果写入，保留批次、映射版本和处理结果用于追溯。",
      "location": "页面处理",
      "locator": "integration-action:integration-execute"
    },
    {
      "name": "体检同步规则列表",
      "description": "在体检系统同步页面处理体检同步规则列表，保留批次、映射版本和处理结果用于追溯。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "体检同步规则查询",
      "description": "在体检系统同步页面处理体检同步规则查询，保留批次、映射版本和处理结果用于追溯。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "体检同步批次详情",
      "description": "在体检系统同步页面处理体检同步批次详情，保留批次、映射版本和处理结果用于追溯。",
      "location": "详情抽屉",
      "locator": "detail-field:sourceSystem"
    },
    {
      "name": "体检同步规则新增",
      "description": "在体检系统同步页面处理体检同步规则新增，保留批次、映射版本和处理结果用于追溯。",
      "location": "新增/编辑表单",
      "locator": "form-field:sourceSystem"
    },
    {
      "name": "体检同步规则编辑",
      "description": "在体检系统同步页面处理体检同步规则编辑，保留批次、映射版本和处理结果用于追溯。",
      "location": "新增/编辑表单",
      "locator": "form-field:sourceSystem"
    },
    {
      "name": "体检同步规则删除",
      "description": "在体检系统同步页面处理体检同步规则删除，保留批次、映射版本和处理结果用于追溯。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "体检同步规则启用",
      "description": "在体检系统同步页面处理体检同步规则启用，保留批次、映射版本和处理结果用于追溯。",
      "location": "批量操作",
      "locator": "batch-action:resource-enable"
    },
    {
      "name": "体检同步规则停用",
      "description": "在体检系统同步页面处理体检同步规则停用，保留批次、映射版本和处理结果用于追溯。",
      "location": "批量操作",
      "locator": "batch-action:resource-disable"
    },
    {
      "name": "体检同步规则记录",
      "description": "在体检系统同步页面处理体检同步规则记录，保留批次、映射版本和处理结果用于追溯。",
      "location": "关联页签",
      "locator": "tab:checkup-sync"
    },
    {
      "name": "字段映射列表",
      "description": "集中展示字段映射的主要字段、状态和更新时间，作为查询和后续处理入口。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "字段映射查询",
      "description": "可按关键词、来源系统、状态查询体检系统同步，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "字段映射详情",
      "description": "查看字段映射的来源字段、目标字段、数据类型、必填规则和转换方式。",
      "location": "详情抽屉",
      "locator": "detail-field:sourceSystem"
    },
    {
      "name": "字段映射新增",
      "description": "录入来源字段、目标字段、数据类型、必填规则和转换方式并保存，形成新的字段映射记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:sourceSystem"
    },
    {
      "name": "字段映射编辑",
      "description": "修改字段映射的来源字段、目标字段、数据类型、必填规则和转换方式，保存后更新当前记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:sourceSystem"
    },
    {
      "name": "字段映射删除",
      "description": "删除尚未被业务引用的字段映射，已使用数据不允许直接删除。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "字段映射启用",
      "description": "启用字段映射，启用后可在对应业务中选择和使用。",
      "location": "批量操作",
      "locator": "batch-action:resource-enable"
    },
    {
      "name": "字段映射停用",
      "description": "停用字段映射，停用后不再用于新增业务，历史记录继续保留。",
      "location": "批量操作",
      "locator": "batch-action:resource-disable"
    },
    {
      "name": "字段映射导入",
      "description": "按模板批量导入字段映射，校验必要字段后写入正式资料。",
      "location": "批量操作",
      "locator": "batch-action:resource-import"
    },
    {
      "name": "字段映射导出",
      "description": "按当前查询条件导出字段映射，用于核对、归档或线下处理。",
      "location": "批量操作",
      "locator": "batch-action:resource-export"
    },
    {
      "name": "字段映射记录",
      "description": "查看字段映射的配置变更和转换使用记录，保留操作人员与时间。",
      "location": "关联页签",
      "locator": "tab:checkup-sync"
    },
    {
      "name": "编码转换关系列表",
      "description": "集中展示编码转换关系的主要字段、状态和更新时间，作为查询和后续处理入口。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "编码转换关系查询",
      "description": "可按关键词、来源系统、状态查询体检系统同步，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "编码转换关系详情",
      "description": "查看编码转换关系的编码类型、来源编码、目标编码和生效范围。",
      "location": "详情抽屉",
      "locator": "detail-field:sourceSystem"
    },
    {
      "name": "编码转换关系新增",
      "description": "录入编码类型、来源编码、目标编码和生效范围并保存，形成新的编码转换关系记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:sourceSystem"
    },
    {
      "name": "编码转换关系编辑",
      "description": "修改编码转换关系的编码类型、来源编码、目标编码和生效范围，保存后更新当前记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:sourceSystem"
    },
    {
      "name": "编码转换关系删除",
      "description": "删除尚未被业务引用的编码转换关系，已使用数据不允许直接删除。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "编码转换关系启用",
      "description": "启用编码转换关系，启用后可在对应业务中选择和使用。",
      "location": "批量操作",
      "locator": "batch-action:resource-enable"
    },
    {
      "name": "编码转换关系停用",
      "description": "停用编码转换关系，停用后不再用于新增业务，历史记录继续保留。",
      "location": "批量操作",
      "locator": "batch-action:resource-disable"
    },
    {
      "name": "编码转换关系导入",
      "description": "按模板批量导入编码转换关系，校验必要字段后写入正式资料。",
      "location": "批量操作",
      "locator": "batch-action:resource-import"
    },
    {
      "name": "编码转换关系导出",
      "description": "按当前查询条件导出编码转换关系，用于核对、归档或线下处理。",
      "location": "批量操作",
      "locator": "batch-action:resource-export"
    },
    {
      "name": "同步结果处理列表",
      "description": "在体检系统同步页面处理同步结果处理列表，保留批次、映射版本和处理结果用于追溯。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "同步结果处理查询",
      "description": "在体检系统同步页面处理同步结果处理查询，保留批次、映射版本和处理结果用于追溯。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "同步结果处理详情",
      "description": "在体检系统同步页面处理同步结果处理详情，保留批次、映射版本和处理结果用于追溯。",
      "location": "关联页签",
      "locator": "tab:checkup-sync"
    },
    {
      "name": "同步结果处理导出",
      "description": "在体检系统同步页面处理同步结果处理导出，保留批次、映射版本和处理结果用于追溯。",
      "location": "批量操作",
      "locator": "batch-action:resource-export"
    },
    {
      "name": "失败结果处理列表",
      "description": "在体检系统同步页面处理失败结果处理列表，保留批次、映射版本和处理结果用于追溯。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "失败结果处理查询",
      "description": "在体检系统同步页面处理失败结果处理查询，保留批次、映射版本和处理结果用于追溯。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "失败结果处理详情",
      "description": "在体检系统同步页面处理失败结果处理详情，保留批次、映射版本和处理结果用于追溯。",
      "location": "详情抽屉",
      "locator": "detail-field:sourceSystem"
    },
    {
      "name": "失败结果处理新建",
      "description": "在体检系统同步页面处理失败结果处理新建，保留批次、映射版本和处理结果用于追溯。",
      "location": "新增/编辑表单",
      "locator": "form-field:sourceSystem"
    },
    {
      "name": "历史批次导入列表",
      "description": "在体检系统同步页面处理历史批次导入列表，保留批次、映射版本和处理结果用于追溯。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "历史批次导入查询",
      "description": "在体检系统同步页面处理历史批次导入查询，保留批次、映射版本和处理结果用于追溯。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "历史批次导入详情",
      "description": "在体检系统同步页面处理历史批次导入详情，保留批次、映射版本和处理结果用于追溯。",
      "location": "详情抽屉",
      "locator": "detail-field:sourceSystem"
    },
    {
      "name": "历史批次导入新建",
      "description": "在体检系统同步页面处理历史批次导入新建，保留批次、映射版本和处理结果用于追溯。",
      "location": "新增/编辑表单",
      "locator": "form-field:fileName"
    },
    {
      "name": "历史批次导入提交",
      "description": "在体检系统同步页面处理历史批次导入提交，保留批次、映射版本和处理结果用于追溯。",
      "location": "状态操作",
      "locator": "status-action:resource-submit"
    },
    {
      "name": "历史批次导入确认",
      "description": "在体检系统同步页面处理历史批次导入确认，保留批次、映射版本和处理结果用于追溯。",
      "location": "状态操作",
      "locator": "status-action:resource-confirm"
    },
    {
      "name": "历史批次导入取消",
      "description": "在体检系统同步页面处理历史批次导入取消，保留批次、映射版本和处理结果用于追溯。",
      "location": "状态操作",
      "locator": "status-action:resource-cancel"
    }
  ],
  "finance-order": [
    {
      "name": "业务订单列表",
      "description": "集中展示业务订单编号、申请人、业务对象、金额或数量、当前状态和更新时间。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "业务订单查询",
      "description": "可按关键词、客户、状态查询业务订单，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "业务订单详情",
      "description": "查看业务订单的表头信息、明细内容、附件和处理记录。",
      "location": "详情抽屉",
      "locator": "detail-field:customer"
    },
    {
      "name": "业务订单新建",
      "description": "选择客户、服务项目、数量、价格、折扣和实施计划并录入明细，创建新的业务订单。",
      "location": "新增/编辑表单",
      "locator": "form-field:customer"
    },
    {
      "name": "业务订单保存草稿",
      "description": "保存尚未提交的业务订单，允许后续继续补充和修改。",
      "location": "新增/编辑表单",
      "locator": "form-field:customer"
    },
    {
      "name": "业务订单编辑草稿",
      "description": "修改草稿状态的业务订单及其明细，提交后不再按草稿方式修改。",
      "location": "新增/编辑表单",
      "locator": "form-field:customer"
    },
    {
      "name": "业务订单删除草稿",
      "description": "删除未提交且未进入审批或执行环节的业务订单草稿。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "业务订单提交",
      "description": "校验必要字段后提交业务订单，进入审批或后续业务处理。",
      "location": "状态操作",
      "locator": "status-action:resource-submit"
    },
    {
      "name": "业务订单撤回",
      "description": "在允许撤回的状态下撤回业务订单，退回申请人继续处理。",
      "location": "状态操作",
      "locator": "status-action:resource-withdraw"
    },
    {
      "name": "业务订单取消",
      "description": "取消尚未完成的业务订单，记录取消原因并停止后续处理。",
      "location": "状态操作",
      "locator": "status-action:resource-cancel"
    },
    {
      "name": "业务订单关闭",
      "description": "关闭不再继续执行的业务订单，保留已发生业务和关闭原因。",
      "location": "状态操作",
      "locator": "status-action:resource-close"
    },
    {
      "name": "业务订单打印",
      "description": "按统一格式打印业务订单及明细，供签字、交接或归档。",
      "location": "批量操作",
      "locator": "batch-action:resource-print"
    },
    {
      "name": "业务订单导出",
      "description": "按查询条件导出业务订单列表或明细数据。",
      "location": "批量操作",
      "locator": "batch-action:resource-export"
    },
    {
      "name": "业务订单操作记录",
      "description": "查看业务订单从创建到完成的状态变化、操作人员和处理时间。",
      "location": "关联页签",
      "locator": "tab:finance-order"
    },
    {
      "name": "业务订单状态查询",
      "description": "可按关键词、客户、状态查询业务订单，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:status"
    },
    {
      "name": "订单审核",
      "description": "对高额、特殊折扣、赠送或异常条款订单执行审核",
      "location": "状态操作",
      "locator": "status-action:approval-approve"
    }
  ],
  "finance-payment": [
    {
      "name": "收款记录列表",
      "description": "集中展示收款记录编号、申请人、业务对象、金额或数量、当前状态和更新时间。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "收款记录查询",
      "description": "可按关键词、客户、状态查询收款记录，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "收款记录详情",
      "description": "查看收款记录的表头信息、明细内容、附件和处理记录。",
      "location": "关联页签",
      "locator": "tab:finance-payment"
    },
    {
      "name": "收款记录新建",
      "description": "选择订单、收款金额、收款方式、渠道流水和收款日期并录入明细，创建新的收款记录。",
      "location": "关联页签",
      "locator": "tab:finance-payment"
    },
    {
      "name": "收款记录确认",
      "description": "确认收款记录的业务结果，写入确认人员和确认时间。",
      "location": "状态操作",
      "locator": "status-action:finance-payment-confirm"
    },
    {
      "name": "收款记录撤销确认",
      "description": "在未形成后续业务前撤销收款记录确认，恢复至可调整状态。",
      "location": "状态操作",
      "locator": "status-action:finance-payment-unconfirm"
    },
    {
      "name": "收款记录打印",
      "description": "按统一格式打印收款记录及明细，供签字、交接或归档。",
      "location": "批量操作",
      "locator": "batch-action:resource-print"
    },
    {
      "name": "收款记录导出",
      "description": "按查询条件导出收款记录列表或明细数据。",
      "location": "批量操作",
      "locator": "batch-action:resource-export"
    },
    {
      "name": "收款记录操作记录",
      "description": "查看收款记录从创建到完成的状态变化、操作人员和处理时间。",
      "location": "关联页签",
      "locator": "tab:finance-payment"
    }
  ],
  "finance-refund": [
    {
      "name": "退款申请列表",
      "description": "集中展示退款申请编号、申请人、业务对象、金额或数量、当前状态和更新时间。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "退款申请查询",
      "description": "可按关键词、客户、状态查询退款申请，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "退款申请详情",
      "description": "查看退款申请的表头信息、明细内容、附件和处理记录。",
      "location": "详情抽屉",
      "locator": "detail-field:customer"
    },
    {
      "name": "退款申请新建",
      "description": "选择订单、退款项目、退款金额、退款原因和退款账户并录入明细，创建新的退款申请。",
      "location": "新增/编辑表单",
      "locator": "form-field:amount"
    },
    {
      "name": "退款申请保存草稿",
      "description": "保存尚未提交的退款申请，允许后续继续补充和修改。",
      "location": "新增/编辑表单",
      "locator": "form-field:customer"
    },
    {
      "name": "退款申请编辑草稿",
      "description": "修改草稿状态的退款申请及其明细，提交后不再按草稿方式修改。",
      "location": "新增/编辑表单",
      "locator": "form-field:customer"
    },
    {
      "name": "退款申请删除草稿",
      "description": "删除未提交且未进入审批或执行环节的退款申请草稿。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "退款申请提交",
      "description": "校验必要字段后提交退款申请，进入审批或后续业务处理。",
      "location": "状态操作",
      "locator": "status-action:resource-submit"
    },
    {
      "name": "退款申请撤回",
      "description": "在允许撤回的状态下撤回退款申请，退回申请人继续处理。",
      "location": "状态操作",
      "locator": "status-action:resource-withdraw"
    },
    {
      "name": "退款申请取消",
      "description": "取消尚未完成的退款申请，记录取消原因并停止后续处理。",
      "location": "状态操作",
      "locator": "status-action:resource-cancel"
    },
    {
      "name": "退款申请审批通过",
      "description": "审核退款申请内容并审批通过，推动单据进入下一处理环节。",
      "location": "状态操作",
      "locator": "status-action:approval-approve"
    },
    {
      "name": "退款申请审批驳回",
      "description": "驳回不符合要求的退款申请，填写原因并退回申请人。",
      "location": "状态操作",
      "locator": "status-action:approval-reject"
    },
    {
      "name": "退款申请确认",
      "description": "确认退款申请的业务结果，写入确认人员和确认时间。",
      "location": "状态操作",
      "locator": "status-action:finance-refund-confirm"
    },
    {
      "name": "退款申请打印",
      "description": "按统一格式打印退款申请及明细，供签字、交接或归档。",
      "location": "批量操作",
      "locator": "batch-action:resource-print"
    },
    {
      "name": "退款申请导出",
      "description": "按查询条件导出退款申请列表或明细数据。",
      "location": "批量操作",
      "locator": "batch-action:resource-export"
    },
    {
      "name": "退款申请操作记录",
      "description": "查看退款申请从创建到完成的状态变化、操作人员和处理时间。",
      "location": "关联页签",
      "locator": "tab:finance-refund"
    },
    {
      "name": "退款申请状态查询",
      "description": "可按关键词、客户、状态查询退款申请，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:status"
    },
    {
      "name": "订单创建",
      "description": "按客户、服务或商品、数量、单价、折扣、应收日期创建订单",
      "location": "新增/编辑表单",
      "locator": "form-field:customer"
    }
  ],
  "finance-invoice": [
    {
      "name": "发票状态列表",
      "description": "集中展示发票状态的主要字段、状态和更新时间，作为查询和后续处理入口。",
      "location": "列表列",
      "locator": "column:status"
    },
    {
      "name": "发票状态查询",
      "description": "可按关键词、客户、状态查询发票状态，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:status"
    },
    {
      "name": "发票状态详情",
      "description": "查看发票状态的订单、开票金额、发票号码、开票日期和当前状态。",
      "location": "详情抽屉",
      "locator": "detail-field:invoiceNo"
    },
    {
      "name": "发票状态新增",
      "description": "录入订单、开票金额、发票号码、开票日期和当前状态并保存，形成新的发票状态记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:invoiceNo"
    },
    {
      "name": "发票状态编辑",
      "description": "修改发票状态的订单、开票金额、发票号码、开票日期和当前状态，保存后更新当前记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:invoiceNo"
    },
    {
      "name": "发票状态记录",
      "description": "查看发票状态的申请、开具、寄送和作废状态记录，保留操作人员与时间。",
      "location": "关联页签",
      "locator": "tab:finance-invoice"
    }
  ],
  "finance-reconciliation": [
    {
      "name": "渠道对账单列表",
      "description": "集中展示渠道对账单编号、申请人、业务对象、金额或数量、当前状态和更新时间。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "渠道对账单查询",
      "description": "可按关键词、渠道、状态查询渠道对账单，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "渠道对账单详情",
      "description": "查看渠道对账单的表头信息、明细内容、附件和处理记录。",
      "location": "详情抽屉",
      "locator": "detail-field:channel"
    },
    {
      "name": "渠道对账单新建",
      "description": "选择渠道流水、系统收款、退款和结算数据并录入明细，创建新的渠道对账单。",
      "location": "新增/编辑表单",
      "locator": "form-field:channel"
    },
    {
      "name": "渠道对账单保存草稿",
      "description": "保存尚未提交的渠道对账单，允许后续继续补充和修改。",
      "location": "新增/编辑表单",
      "locator": "form-field:channel"
    },
    {
      "name": "渠道对账单编辑草稿",
      "description": "修改草稿状态的渠道对账单及其明细，提交后不再按草稿方式修改。",
      "location": "新增/编辑表单",
      "locator": "form-field:channel"
    },
    {
      "name": "渠道对账单提交",
      "description": "校验必要字段后提交渠道对账单，进入审批或后续业务处理。",
      "location": "状态操作",
      "locator": "status-action:finance-reconciliation-submit"
    },
    {
      "name": "渠道对账单确认",
      "description": "确认渠道对账单的业务结果，写入确认人员和确认时间。",
      "location": "状态操作",
      "locator": "status-action:finance-reconciliation-confirm"
    },
    {
      "name": "渠道对账单撤销确认",
      "description": "在未形成后续业务前撤销渠道对账单确认，恢复至可调整状态。",
      "location": "状态操作",
      "locator": "status-action:finance-reconciliation-unconfirm"
    },
    {
      "name": "渠道对账单导出",
      "description": "按查询条件导出渠道对账单列表或明细数据。",
      "location": "批量操作",
      "locator": "batch-action:resource-export"
    },
    {
      "name": "渠道对账单操作记录",
      "description": "查看渠道对账单从创建到完成的状态变化、操作人员和处理时间。",
      "location": "关联页签",
      "locator": "tab:finance-reconciliation"
    }
  ],
  "finance-cost": [
    {
      "name": "成本归集列表",
      "description": "集中展示成本归集的主要字段、状态和更新时间，作为查询和后续处理入口。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "成本归集查询",
      "description": "可按关键词、成本中心、状态查询成本归集，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "成本归集详情",
      "description": "查看成本归集的成本期间、成本项目、金额、归属对象和成本中心。",
      "location": "详情抽屉",
      "locator": "detail-field:costCenter"
    },
    {
      "name": "成本归集新增",
      "description": "录入成本期间、成本项目、金额、归属对象和成本中心并保存，形成新的成本归集记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:costCenter"
    },
    {
      "name": "成本归集编辑",
      "description": "修改成本归集的成本期间、成本项目、金额、归属对象和成本中心，保存后更新当前记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:costCenter"
    },
    {
      "name": "成本归集删除",
      "description": "删除尚未被业务引用的成本归集，已使用数据不允许直接删除。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "成本归集导入",
      "description": "按模板批量导入成本归集，校验必要字段后写入正式资料。",
      "location": "批量操作",
      "locator": "batch-action:resource-import"
    },
    {
      "name": "成本归集导出",
      "description": "按当前查询条件导出成本归集，用于核对、归档或线下处理。",
      "location": "批量操作",
      "locator": "batch-action:resource-export"
    },
    {
      "name": "成本归集记录",
      "description": "查看成本归集的归集、调整和分摊记录，保留操作人员与时间。",
      "location": "关联页签",
      "locator": "tab:finance-cost"
    }
  ],
  "finance-allocation-rule": [
    {
      "name": "费用分摊规则列表",
      "description": "集中展示费用分摊规则的主要字段、状态和更新时间，作为查询和后续处理入口。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "费用分摊规则查询",
      "description": "可按关键词、成本中心、状态查询费用分摊规则，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "费用分摊规则详情",
      "description": "查看费用分摊规则的规则名称、费用来源、分摊对象、分摊比例和适用期间。",
      "location": "详情抽屉",
      "locator": "detail-field:costCenter"
    },
    {
      "name": "费用分摊规则新增",
      "description": "录入规则名称、费用来源、分摊对象、分摊比例和适用期间并保存，形成新的费用分摊规则记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:costCenter"
    },
    {
      "name": "费用分摊规则编辑",
      "description": "修改费用分摊规则的规则名称、费用来源、分摊对象、分摊比例和适用期间，保存后更新当前记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:costCenter"
    },
    {
      "name": "费用分摊规则删除",
      "description": "删除尚未被业务引用的费用分摊规则，已使用数据不允许直接删除。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "费用分摊规则启用",
      "description": "启用费用分摊规则，启用后可在对应业务中选择和使用。",
      "location": "批量操作",
      "locator": "batch-action:resource-enable"
    },
    {
      "name": "费用分摊规则停用",
      "description": "停用费用分摊规则，停用后不再用于新增业务，历史记录继续保留。",
      "location": "批量操作",
      "locator": "batch-action:resource-disable"
    },
    {
      "name": "费用分摊规则记录",
      "description": "查看费用分摊规则的规则变更和执行记录，保留操作人员与时间。",
      "location": "关联页签",
      "locator": "tab:finance-allocation-rule"
    }
  ],
  "finance-budget": [
    {
      "name": "预算方案列表",
      "description": "集中展示预算方案编号、申请人、业务对象、金额或数量、当前状态和更新时间。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "预算方案查询",
      "description": "可按关键词、成本中心、状态查询预算方案，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "预算方案详情",
      "description": "查看预算方案的表头信息、明细内容、附件和处理记录。",
      "location": "详情抽屉",
      "locator": "detail-field:costCenter"
    },
    {
      "name": "预算方案新建",
      "description": "选择预算年度、组织、成本中心、预算科目和金额并录入明细，创建新的预算方案。",
      "location": "新增/编辑表单",
      "locator": "form-field:costCenter"
    },
    {
      "name": "预算方案保存草稿",
      "description": "保存尚未提交的预算方案，允许后续继续补充和修改。",
      "location": "新增/编辑表单",
      "locator": "form-field:costCenter"
    },
    {
      "name": "预算方案编辑草稿",
      "description": "修改草稿状态的预算方案及其明细，提交后不再按草稿方式修改。",
      "location": "新增/编辑表单",
      "locator": "form-field:costCenter"
    },
    {
      "name": "预算方案删除草稿",
      "description": "删除未提交且未进入审批或执行环节的预算方案草稿。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "预算方案提交",
      "description": "校验必要字段后提交预算方案，进入审批或后续业务处理。",
      "location": "状态操作",
      "locator": "status-action:resource-submit"
    },
    {
      "name": "预算方案撤回",
      "description": "在允许撤回的状态下撤回预算方案，退回申请人继续处理。",
      "location": "状态操作",
      "locator": "status-action:resource-withdraw"
    },
    {
      "name": "预算方案审批通过",
      "description": "审核预算方案内容并审批通过，推动单据进入下一处理环节。",
      "location": "状态操作",
      "locator": "status-action:approval-approve"
    },
    {
      "name": "预算方案审批驳回",
      "description": "驳回不符合要求的预算方案，填写原因并退回申请人。",
      "location": "状态操作",
      "locator": "status-action:approval-reject"
    },
    {
      "name": "预算方案确认",
      "description": "确认预算方案的业务结果，写入确认人员和确认时间。",
      "location": "状态操作",
      "locator": "status-action:resource-confirm"
    },
    {
      "name": "预算方案操作记录",
      "description": "查看预算方案从创建到完成的状态变化、操作人员和处理时间。",
      "location": "关联页签",
      "locator": "tab:finance-budget"
    }
  ],
  "finance-payable-match": [
    {
      "name": "应付台账",
      "description": "根据采购、收货或费用形成应付记录，展示已付和未付金额",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "三单匹配",
      "description": "对采购订单、收货验收和供应商发票进行数量金额匹配",
      "location": "页面处理",
      "locator": "integration-action:finance-run-match"
    },
    {
      "name": "匹配差异处理",
      "description": "识别价格、数量、税额差异并提交调整或审批",
      "location": "状态操作",
      "locator": "status-action:finance-match-difference"
    }
  ],
  "finance-operating-report": [
    {
      "name": "经营报表列表",
      "description": "集中展示经营报表的主要字段、状态和更新时间，作为查询和后续处理入口。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "经营报表查询",
      "description": "可按关键词、期间、状态查询经营报表，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "经营报表详情",
      "description": "查看经营报表的收入、成本、利润、订单、收退款和预算执行数据。",
      "location": "详情抽屉",
      "locator": "detail-field:period"
    },
    {
      "name": "经营报表导出",
      "description": "按当前查询条件导出经营报表，用于核对、归档或线下处理。",
      "location": "批量操作",
      "locator": "batch-action:resource-export"
    }
  ],
  "finance-metric-library": [
    {
      "name": "指标库",
      "description": "维护 KPI 编码、名称、定义、数据来源、单位和适用岗位",
      "location": "详情抽屉",
      "locator": "detail-field:metric"
    }
  ],
  "finance-assessment-plan": [
    {
      "name": "考核方案",
      "description": "配置考核周期、对象、指标、权重、目标值和评分规则",
      "location": "详情抽屉",
      "locator": "detail-field:metric"
    }
  ],
  "medical-report-category": [
    {
      "name": "体检报告大类列表",
      "description": "展示体检报告大类、适用范围和状态。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "体检报告大类查询",
      "description": "可按关键词、数据范围、状态查询体检报告大类，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "新增体检报告大类",
      "description": "维护医学检验、机能检测、生物学检测等报告大类。",
      "location": "新增/编辑表单",
      "locator": "form-field:scope"
    },
    {
      "name": "编辑体检报告大类",
      "description": "修改报告大类名称、说明和适用范围。",
      "location": "新增/编辑表单",
      "locator": "form-field:scope"
    },
    {
      "name": "启用体检报告大类",
      "description": "启用后允许报告类型和体检项目选择使用。",
      "location": "批量操作",
      "locator": "batch-action:resource-enable"
    },
    {
      "name": "停用体检报告大类",
      "description": "停用后不再用于新增配置，历史数据继续保留。",
      "location": "批量操作",
      "locator": "batch-action:resource-disable"
    }
  ],
  "medical-report-type": [
    {
      "name": "报告类型列表",
      "description": "展示报告类型、所属大类、样本类型和状态。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "新增报告类型",
      "description": "维护报告类型名称、编码、所属大类和样本类型。",
      "location": "新增/编辑表单",
      "locator": "form-field:reportType"
    },
    {
      "name": "编辑报告类型",
      "description": "修改报告类型的名称、分类、样本类型和说明。",
      "location": "新增/编辑表单",
      "locator": "form-field:reportType"
    },
    {
      "name": "启用报告类型",
      "description": "启用后允许上传、同步和映射使用。",
      "location": "批量操作",
      "locator": "batch-action:resource-enable"
    },
    {
      "name": "停用报告类型",
      "description": "停用后不再用于新增报告，历史报告继续保留。",
      "location": "批量操作",
      "locator": "batch-action:resource-disable"
    }
  ],
  "medical-standard-item": [
    {
      "name": "院内院外适用范围",
      "description": "配置报告大类或报告类型适用于院内、院外或双方范围。",
      "location": "详情抽屉",
      "locator": "detail-field:reportType"
    },
    {
      "name": "样本类型维护",
      "description": "维护血液、尿液等双方确认的样本类型及编码。",
      "location": "新增/编辑表单",
      "locator": "form-field:standardCode"
    },
    {
      "name": "标准体检项目列表",
      "description": "展示标准项目名称、编码、别名、单位、分类和状态。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "标准体检项目查询",
      "description": "可按关键词、标准编码、状态查询标准体检项目，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "新增标准体检项目",
      "description": "维护项目名称、标准编码、别名、单位、数据类型和分类。",
      "location": "新增/编辑表单",
      "locator": "form-field:standardCode"
    },
    {
      "name": "编辑标准体检项目",
      "description": "修改标准项目的可维护字段和说明。",
      "location": "新增/编辑表单",
      "locator": "form-field:standardCode"
    },
    {
      "name": "删除未使用标准项目",
      "description": "删除尚未被报告、映射或规则引用的标准项目。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "启用标准体检项目",
      "description": "启用后允许映射、规则和业务页面调用。",
      "location": "批量操作",
      "locator": "batch-action:resource-enable"
    },
    {
      "name": "停用标准体检项目",
      "description": "停用后不用于新增业务，历史报告继续保留。",
      "location": "批量操作",
      "locator": "batch-action:resource-disable"
    },
    {
      "name": "标准项目批量导入",
      "description": "按确认模板导入首批标准体检项目。",
      "location": "批量操作",
      "locator": "batch-action:resource-import"
    },
    {
      "name": "标准项目导入记录",
      "description": "查询导入批次、结果和处理人员。",
      "location": "批量操作",
      "locator": "batch-action:resource-import"
    },
    {
      "name": "人工确认标准项目",
      "description": "人工选择标准项目并确认本次数据归属。",
      "location": "状态操作",
      "locator": "status-action:resource-confirm"
    }
  ],
  "medical-external-report-map": [
    {
      "name": "外部报告类型映射列表",
      "description": "展示外部系统、外部报告类型与标准报告类型的对应关系。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "新增外部报告类型映射",
      "description": "配置外部报告类型编码或名称对应的标准报告类型。",
      "location": "新增/编辑表单",
      "locator": "form-field:reportType"
    },
    {
      "name": "编辑外部报告类型映射",
      "description": "调整外部报告类型与标准报告类型的对应关系。",
      "location": "新增/编辑表单",
      "locator": "form-field:reportType"
    },
    {
      "name": "停用外部报告类型映射",
      "description": "停用不再使用的类型映射并保留历史调用记录。",
      "location": "批量操作",
      "locator": "batch-action:resource-disable"
    }
  ],
  "medical-external-item-map": [
    {
      "name": "外部项目映射列表",
      "description": "展示外部项目编码、名称与标准体检项目的对应关系。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "外部项目映射查询",
      "description": "可按关键词、来源系统、状态查询外部项目映射，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "新增外部项目映射",
      "description": "配置外部项目编码或名称对应的标准体检项目。",
      "location": "新增/编辑表单",
      "locator": "form-field:sourceSystem"
    },
    {
      "name": "编辑外部项目映射",
      "description": "调整外部项目与标准项目、单位或转换方式。",
      "location": "新增/编辑表单",
      "locator": "form-field:sourceSystem"
    },
    {
      "name": "停用外部项目映射",
      "description": "停用不再使用的项目映射，历史报告不受影响。",
      "location": "批量操作",
      "locator": "batch-action:resource-disable"
    },
    {
      "name": "字段值转换配置",
      "description": "配置外部枚举值、文本值与标准值之间的转换关系。",
      "location": "新增/编辑表单",
      "locator": "form-field:sourceSystem"
    },
    {
      "name": "单位转换配置",
      "description": "配置双方确认的外部单位与标准单位转换方式。",
      "location": "新增/编辑表单",
      "locator": "form-field:sourceSystem"
    },
    {
      "name": "保存正式映射",
      "description": "将人工确认结果保存为后续数据可使用的正式映射。",
      "location": "新增/编辑表单",
      "locator": "form-field:standardCode"
    },
    {
      "name": "映射使用记录",
      "description": "查询映射被报告接收、上传和分析调用的记录。",
      "location": "关联页签",
      "locator": "tab:medical-external-item-map"
    }
  ],
  "medical-unmatched-item": [
    {
      "name": "未匹配项目列表",
      "description": "集中展示同步或上传后未能匹配的外部项目。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "未匹配项目查询",
      "description": "可按关键词、来源系统、状态查询未匹配项目，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    }
  ],
  "medical-reference-rule": [
    {
      "name": "参考值规则列表",
      "description": "展示体检项目、适用性别、年龄范围、上下限、单位和状态。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "参考值规则查询",
      "description": "可按关键词、标准编码、状态查询参考值规则，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "新增参考值规则",
      "description": "配置项目、适用范围、参考上下限、单位和说明。",
      "location": "新增/编辑表单",
      "locator": "form-field:standardCode"
    },
    {
      "name": "编辑参考值规则",
      "description": "修改尚未停用规则的适用范围和判定值。",
      "location": "新增/编辑表单",
      "locator": "form-field:standardCode"
    },
    {
      "name": "删除未使用参考值规则",
      "description": "删除尚未被正式业务引用的参考值规则。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "启用参考值规则",
      "description": "启用后参与体检结果异常判定。",
      "location": "批量操作",
      "locator": "batch-action:resource-enable"
    },
    {
      "name": "停用参考值规则",
      "description": "停用后不再用于新增判定，历史结果继续保留。",
      "location": "批量操作",
      "locator": "batch-action:resource-disable"
    },
    {
      "name": "参考值规则导入",
      "description": "按确认模板批量导入首批参考值规则。",
      "location": "批量操作",
      "locator": "batch-action:resource-import"
    },
    {
      "name": "参考值使用记录",
      "description": "查询规则命中的体检报告和判定结果。",
      "location": "关联页签",
      "locator": "tab:medical-reference-rule"
    }
  ],
  "medical-critical-rule": [
    {
      "name": "危急值规则列表",
      "description": "展示项目、危急方向、阈值、单位、适用范围和状态。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "危急值规则查询",
      "description": "可按关键词、标准编码、状态查询危急值规则，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "新增危急值规则",
      "description": "配置危急低值、危急高值、单位、适用范围和优先级。",
      "location": "新增/编辑表单",
      "locator": "form-field:standardCode"
    },
    {
      "name": "编辑危急值规则",
      "description": "修改危急值阈值、适用范围和判定优先级。",
      "location": "新增/编辑表单",
      "locator": "form-field:standardCode"
    },
    {
      "name": "删除未使用危急值规则",
      "description": "删除尚未被正式业务引用的危急值规则。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "启用危急值规则",
      "description": "启用后参与危急结果判定。",
      "location": "批量操作",
      "locator": "batch-action:resource-enable"
    },
    {
      "name": "停用危急值规则",
      "description": "停用后不再用于新增判定，历史结果继续保留。",
      "location": "批量操作",
      "locator": "batch-action:resource-disable"
    },
    {
      "name": "危急值规则导入",
      "description": "按确认模板批量导入首批危急值规则。",
      "location": "批量操作",
      "locator": "batch-action:resource-import"
    },
    {
      "name": "危急值优先判定",
      "description": "同一结果同时满足异常和危急条件时优先标识危急结果。",
      "location": "新增/编辑表单",
      "locator": "form-field:criticalValue"
    },
    {
      "name": "危急值使用记录",
      "description": "查询规则命中的体检报告、结果值和判定时间。",
      "location": "关联页签",
      "locator": "tab:medical-critical-rule"
    }
  ],
  "medical-item-relation": [
    {
      "name": "体检项与人体系统关系查询",
      "description": "可按关键词、标准编码、状态查询体检项医学关系，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "绑定体检项与人体系统",
      "description": "为标准体检项目绑定一个或多个相关人体系统。",
      "location": "状态操作",
      "locator": "status-action:resource-bind"
    },
    {
      "name": "解绑体检项与人体系统",
      "description": "解除不再适用的系统关系并保留历史记录。",
      "location": "状态操作",
      "locator": "status-action:resource-unbind"
    },
    {
      "name": "体检项与器官关系查询",
      "description": "可按关键词、标准编码、状态查询体检项医学关系，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "绑定体检项与器官",
      "description": "为标准体检项目绑定一个或多个相关器官。",
      "location": "状态操作",
      "locator": "status-action:resource-bind"
    },
    {
      "name": "解绑体检项与器官",
      "description": "解除不再适用的器官关系并保留历史记录。",
      "location": "状态操作",
      "locator": "status-action:resource-unbind"
    },
    {
      "name": "体检项与疾病关系查询",
      "description": "可按关键词、标准编码、状态查询体检项医学关系，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "绑定体检项与疾病",
      "description": "为标准体检项目绑定相关疾病及关系说明。",
      "location": "状态操作",
      "locator": "status-action:resource-bind"
    },
    {
      "name": "解绑体检项与疾病",
      "description": "解除不再适用的疾病关系并保留历史记录。",
      "location": "状态操作",
      "locator": "status-action:resource-unbind"
    },
    {
      "name": "医学关系批量导入",
      "description": "按双方确认模板导入首批项目、系统、器官、疾病和症状关系。",
      "location": "批量操作",
      "locator": "batch-action:resource-import"
    },
    {
      "name": "规则调用记录",
      "description": "查询体检页面、医生开单和健康智脑对统一规则的调用记录。",
      "location": "关联页签",
      "locator": "tab:medical-item-relation"
    }
  ],
  "medical-symptom-disease": [
    {
      "name": "症状与疾病关系查询",
      "description": "可按关键词、关系类型、状态查询症状疾病关系，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "绑定症状与疾病",
      "description": "为症状绑定相关疾病及关系说明。",
      "location": "状态操作",
      "locator": "status-action:resource-bind"
    },
    {
      "name": "解绑症状与疾病",
      "description": "解除不再适用的症状疾病关系。",
      "location": "状态操作",
      "locator": "status-action:resource-unbind"
    },
    {
      "name": "症状疾病关系调用",
      "description": "调用统一症状疾病关系供医生辅助研判。",
      "location": "页面处理",
      "locator": "integration-action:integration-execute"
    }
  ],
  "medical-special-precheck": [
    {
      "name": "特殊项目前置规则列表",
      "description": "展示特殊项目、前置检查项、有效期、合格条件和状态。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "新增特殊项目前置规则",
      "description": "配置特殊项目所需前置检查及结果要求。",
      "location": "新增/编辑表单",
      "locator": "form-field:specialItem"
    },
    {
      "name": "编辑特殊项目前置规则",
      "description": "调整检查项目、有效期、合格条件和阻断方式。",
      "location": "新增/编辑表单",
      "locator": "form-field:specialItem"
    },
    {
      "name": "启用特殊项目前置规则",
      "description": "启用后供医生开单页面进行安全校验。",
      "location": "批量操作",
      "locator": "batch-action:resource-enable"
    },
    {
      "name": "停用特殊项目前置规则",
      "description": "停用后不参与新增开单校验，历史记录保留。",
      "location": "批量操作",
      "locator": "batch-action:resource-disable"
    }
  ],
  "medical-health-analysis": [
    {
      "name": "客户健康资料汇总",
      "description": "汇总客户授权的体检、症状、既往信息、历史方案和报告资料。",
      "location": "页面处理",
      "locator": "integration-action:integration-execute"
    },
    {
      "name": "标准体检数据读取",
      "description": "读取完成统一项目映射后的标准体检数据。",
      "location": "页面处理",
      "locator": "integration-action:integration-execute"
    },
    {
      "name": "异常指标提取",
      "description": "根据参考值规则提取异常指标、方向和结果值。",
      "location": "详情抽屉",
      "locator": "detail-field:result"
    },
    {
      "name": "危急指标优先展示",
      "description": "优先展示命中危急值规则的项目和结果。",
      "location": "详情抽屉",
      "locator": "detail-field:result"
    },
    {
      "name": "系统器官关系调用",
      "description": "调用统一医学关系展示异常指标关联的人体系统和器官。",
      "location": "页面处理",
      "locator": "integration-action:integration-execute"
    },
    {
      "name": "基因结果读取接口预留",
      "description": "预留读取客户后续提供并授权的基因结果数据，不影响其他分析流程。",
      "location": "页面处理",
      "locator": "integration-action:integration-execute"
    },
    {
      "name": "分析资料范围确认",
      "description": "由医生确认本次分析使用的客户资料范围。",
      "location": "页面处理",
      "locator": "integration-action:integration-execute"
    },
    {
      "name": "AI 分析任务创建",
      "description": "选择客户、报告模板和资料范围创建分析任务。",
      "location": "新增/编辑表单",
      "locator": "form-field:customer"
    },
    {
      "name": "AI 分析任务查询",
      "description": "可按关键词、客户、状态查询健康资料分析，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "AI 分析结果查看",
      "description": "查看模型返回的结构化分析结果和引用资料。",
      "location": "详情抽屉",
      "locator": "detail-field:customer"
    }
  ],
  "medical-report": [
    {
      "name": "AI 报告草案生成",
      "description": "按双方确认的报告结构和首期模板生成报告草案。",
      "location": "状态操作",
      "locator": "status-action:resource-generate"
    },
    {
      "name": "报告章节编排",
      "description": "按确认模板组织健康概况、重点指标、建议和复查内容。",
      "location": "新增/编辑表单",
      "locator": "form-field:customer"
    },
    {
      "name": "报告草案查询",
      "description": "可按关键词、客户、状态查询医学报告，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "报告草案详情",
      "description": "查看草案内容、数据来源、规则结果和生成记录。",
      "location": "详情抽屉",
      "locator": "detail-field:customer"
    },
    {
      "name": "报告重新生成",
      "description": "在医生确认前按允许条件重新生成草案并保留记录。",
      "location": "状态操作",
      "locator": "status-action:resource-generate"
    },
    {
      "name": "医生编辑报告",
      "description": "医生修改草案中的分析、说明和建议内容。",
      "location": "新增/编辑表单",
      "locator": "form-field:doctor"
    },
    {
      "name": "医生确认报告",
      "description": "医生核对并确认报告内容，形成正式版本。",
      "location": "状态操作",
      "locator": "status-action:resource-confirm"
    },
    {
      "name": "正式报告发布",
      "description": "将医生确认后的报告发布给对应业务端查看。",
      "location": "状态操作",
      "locator": "status-action:resource-publish"
    },
    {
      "name": "报告撤回发布",
      "description": "撤回已发布报告并保留发布和撤回记录。",
      "location": "状态操作",
      "locator": "status-action:resource-withdraw"
    },
    {
      "name": "报告归档",
      "description": "归档正式报告、确认人、确认时间和关联资料。",
      "location": "状态操作",
      "locator": "status-action:resource-archive"
    },
    {
      "name": "历史报告查询",
      "description": "可按关键词、客户、状态查询医学报告，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "历史版本查看",
      "description": "查看报告生成、医生修改、确认和发布形成的版本记录。",
      "location": "关联页签",
      "locator": "tab:medical-report"
    }
  ],
  "medical-followup": [
    {
      "name": "三个月复查项目建议",
      "description": "根据医生确认的问题和报告内容形成三个月复查项目建议。",
      "location": "详情抽屉",
      "locator": "detail-field:doctor"
    },
    {
      "name": "六个月复查项目建议",
      "description": "根据医生确认的问题和报告内容形成六个月复查项目建议。",
      "location": "详情抽屉",
      "locator": "detail-field:doctor"
    },
    {
      "name": "一年复查项目建议",
      "description": "根据医生确认的问题和报告内容形成一年复查项目建议。",
      "location": "详情抽屉",
      "locator": "detail-field:doctor"
    },
    {
      "name": "复查建议编辑",
      "description": "医生可调整复查周期、项目和说明。",
      "location": "新增/编辑表单",
      "locator": "form-field:followupPeriod"
    },
    {
      "name": "复查建议确认",
      "description": "医生确认后将复查建议写入正式报告或后续服务资料。",
      "location": "状态操作",
      "locator": "status-action:resource-confirm"
    },
    {
      "name": "复查建议查询",
      "description": "可按关键词、客户、状态查询复查建议，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    }
  ],
  "doctor-order": [
    {
      "name": "健康管理方案系统选择",
      "description": "在医生开单页面选择系统提供的健康管理方案内容并带入当前客户。",
      "location": "详情抽屉",
      "locator": "detail-field:customer"
    },
    {
      "name": "健康管理方案手工填写",
      "description": "医生可按当前客户情况手工填写健康管理方案。",
      "location": "详情抽屉",
      "locator": "detail-field:customer"
    },
    {
      "name": "医疗方案系统选择",
      "description": "在医生开单页面选择系统提供的医疗方案内容并带入当前客户。",
      "location": "详情抽屉",
      "locator": "detail-field:customer"
    },
    {
      "name": "医疗方案手工填写",
      "description": "医生可按当前客户情况手工填写医疗方案。",
      "location": "详情抽屉",
      "locator": "detail-field:customer"
    },
    {
      "name": "带入内容继续修改",
      "description": "系统或个人方案带入后，允许医生针对当前客户调整本次内容。",
      "location": "新增/编辑表单",
      "locator": "form-field:customer"
    },
    {
      "name": "前置检查结果展示",
      "description": "开立特殊项目时展示统一医学规则返回的前置检查项目、结果和有效期。",
      "location": "详情抽屉",
      "locator": "detail-field:safetyCheck"
    },
    {
      "name": "不符合条件提示或阻止",
      "description": "前置检查缺失、过期或结果不合格时，按规则提示或阻止继续开单。",
      "location": "详情抽屉",
      "locator": "detail-field:safetyCheck"
    }
  ],
  "doctor-plan": [
    {
      "name": "收藏健康管理方案",
      "description": "将当前健康管理方案明细收藏为医生本人的常用方案。",
      "location": "行操作",
      "locator": "row-action:doctor-plan-favorite-health"
    },
    {
      "name": "收藏医疗方案",
      "description": "将当前医疗方案明细收藏为医生本人的常用方案。",
      "location": "行操作",
      "locator": "row-action:doctor-plan-favorite-medical"
    },
    {
      "name": "我的常用方案弹框",
      "description": "按健康管理或医疗方案类型展示本人收藏的方案。",
      "location": "详情抽屉",
      "locator": "detail-field:plan"
    },
    {
      "name": "常用方案覆盖带入",
      "description": "选择个人常用方案后覆盖带入当前开单对应内容。",
      "location": "行操作",
      "locator": "row-action:doctor-plan-apply"
    },
    {
      "name": "常用方案重命名",
      "description": "修改本人收藏方案的显示名称。",
      "location": "行操作",
      "locator": "row-action:doctor-plan-rename"
    },
    {
      "name": "常用方案删除",
      "description": "删除本人不再使用且不影响历史开单记录的收藏方案。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    }
  ],
  "consultation-appointment": [
    {
      "name": "会诊预约创建",
      "description": "选择客户、主题、计划时间、预计时长、发起医生和会诊说明",
      "location": "新增/编辑表单",
      "locator": "form-field:customer"
    },
    {
      "name": "预约冲突校验",
      "description": "校验医生和专家时间冲突，调整时间后重新通知参与人",
      "location": "详情抽屉",
      "locator": "detail-field:result"
    },
    {
      "name": "会诊预约查询",
      "description": "可按关键词、客户、状态查询会诊预约，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "会诊预约列表",
      "description": "集中展示会诊预约编号、申请人、业务对象、金额或数量、当前状态和更新时间。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "会诊预约查询",
      "description": "可按关键词、客户、状态查询会诊预约，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "会诊预约详情",
      "description": "查看会诊预约的表头信息、明细内容、附件和处理记录。",
      "location": "详情抽屉",
      "locator": "detail-field:customer"
    },
    {
      "name": "会诊预约新建",
      "description": "选择客户、会诊主题、专家、预约时间和会诊说明并录入明细，创建新的会诊预约。",
      "location": "新增/编辑表单",
      "locator": "form-field:customer"
    },
    {
      "name": "会诊预约保存草稿",
      "description": "保存尚未提交的会诊预约，允许后续继续补充和修改。",
      "location": "新增/编辑表单",
      "locator": "form-field:customer"
    },
    {
      "name": "会诊预约编辑草稿",
      "description": "修改草稿状态的会诊预约及其明细，提交后不再按草稿方式修改。",
      "location": "新增/编辑表单",
      "locator": "form-field:customer"
    },
    {
      "name": "会诊预约删除草稿",
      "description": "删除未提交且未进入审批或执行环节的会诊预约草稿。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "会诊预约提交",
      "description": "校验必要字段后提交会诊预约，进入审批或后续业务处理。",
      "location": "状态操作",
      "locator": "status-action:resource-submit"
    },
    {
      "name": "会诊预约撤回",
      "description": "在允许撤回的状态下撤回会诊预约，退回申请人继续处理。",
      "location": "状态操作",
      "locator": "status-action:resource-withdraw"
    },
    {
      "name": "会诊预约取消",
      "description": "取消尚未完成的会诊预约，记录取消原因并停止后续处理。",
      "location": "状态操作",
      "locator": "status-action:resource-cancel"
    },
    {
      "name": "会诊预约确认",
      "description": "确认会诊预约的业务结果，写入确认人员和确认时间。",
      "location": "状态操作",
      "locator": "status-action:resource-confirm"
    },
    {
      "name": "会诊预约操作记录",
      "description": "查看会诊预约从创建到完成的状态变化、操作人员和处理时间。",
      "location": "关联页签",
      "locator": "tab:consultation-appointment"
    },
    {
      "name": "会诊预约状态查询",
      "description": "可按关键词、客户、状态查询会诊预约，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:status"
    },
    {
      "name": "新增会诊预约",
      "description": "选择客户、会诊主题、计划时间和参与专家创建预约。",
      "location": "新增/编辑表单",
      "locator": "form-field:customer"
    }
  ],
  "consultation-invitation": [
    {
      "name": "多人专家邀请",
      "description": "从专家列表邀请多人，记录主专家、参与角色和邀请状态",
      "location": "详情抽屉",
      "locator": "detail-field:expert"
    },
    {
      "name": "站内邀请通知",
      "description": "向发起人和专家发送邀请、变更、取消和开始提醒",
      "location": "详情抽屉",
      "locator": "detail-field:expert"
    },
    {
      "name": "专家邀请",
      "description": "向参与专家发送会诊邀请和业务说明。",
      "location": "详情抽屉",
      "locator": "detail-field:expert"
    },
    {
      "name": "接受邀请",
      "description": "专家确认参加会诊并更新参与状态。",
      "location": "状态操作",
      "locator": "status-action:consultation-accept"
    },
    {
      "name": "拒绝邀请",
      "description": "专家拒绝邀请并填写原因。",
      "location": "状态操作",
      "locator": "status-action:consultation-decline"
    }
  ],
  "consultation-device": [
    {
      "name": "摄像头检测",
      "description": "会前检查摄像头是否可正常使用。",
      "location": "页面处理",
      "locator": "integration-action:consultation-device-camera"
    },
    {
      "name": "麦克风检测",
      "description": "会前检查麦克风输入是否可用。",
      "location": "页面处理",
      "locator": "integration-action:consultation-device-microphone"
    }
  ],
  "consultation-room": [
    {
      "name": "RTC 房间鉴权",
      "description": "服务端签发短期入会凭证，校验会诊参与人和有效时间",
      "location": "页面处理",
      "locator": "integration-action:consultation-room-auth"
    },
    {
      "name": "强制云端录制",
      "description": "入房后先启动多人云录制并确认运行，再允许正式音视频发布",
      "location": "页面处理",
      "locator": "integration-action:consultation-room-record"
    },
    {
      "name": "会中控制",
      "description": "展示参与人员、音视频状态、静音、摄像头开关、退出和异常提示",
      "location": "页面处理",
      "locator": "integration-action:consultation-room-control"
    },
    {
      "name": "会诊房间列表",
      "description": "集中展示会诊房间编号、申请人、业务对象、金额或数量、当前状态和更新时间。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "会诊房间查询",
      "description": "可按关键词、房间号、状态查询会诊房间，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "会诊房间详情",
      "description": "查看会诊房间的表头信息、明细内容、附件和处理记录。",
      "location": "详情抽屉",
      "locator": "detail-field:roomNo"
    },
    {
      "name": "会诊房间新建",
      "description": "选择预约、参与人员、房间有效期和录制设置并录入明细，创建新的会诊房间。",
      "location": "新增/编辑表单",
      "locator": "form-field:roomNo"
    },
    {
      "name": "会诊房间确认",
      "description": "确认会诊房间的业务结果，写入确认人员和确认时间。",
      "location": "状态操作",
      "locator": "status-action:consultation-room-confirm"
    },
    {
      "name": "会诊房间取消",
      "description": "取消尚未完成的会诊房间，记录取消原因并停止后续处理。",
      "location": "状态操作",
      "locator": "status-action:consultation-room-cancel"
    },
    {
      "name": "会诊房间操作记录",
      "description": "查看会诊房间从创建到完成的状态变化、操作人员和处理时间。",
      "location": "关联页签",
      "locator": "tab:consultation-room"
    },
    {
      "name": "会诊房间状态查询",
      "description": "可按关键词、房间号、状态查询会诊房间，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:status"
    },
    {
      "name": "进入会诊房间",
      "description": "经身份校验后进入对应会诊房间。",
      "location": "页面处理",
      "locator": "integration-action:consultation-room-enter"
    },
    {
      "name": "多人音视频",
      "description": "支持主持人、专家和相关人员进行多人音视频会诊。",
      "location": "页面处理",
      "locator": "integration-action:consultation-room-media"
    }
  ],
  "consultation-member": [
    {
      "name": "成员列表",
      "description": "展示已进入、未进入和已离开成员。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "成员静音控制",
      "description": "主持人可对指定成员进行静音管理。",
      "location": "页面处理",
      "locator": "integration-action:consultation-member-mute"
    },
    {
      "name": "成员移出",
      "description": "主持人可将不应继续参与的成员移出房间。",
      "location": "页面处理",
      "locator": "integration-action:consultation-member-remove"
    }
  ],
  "consultation-opinion": [
    {
      "name": "专家意见列表",
      "description": "集中展示专家意见编号、申请人、业务对象、金额或数量、当前状态和更新时间。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "专家意见查询",
      "description": "可按关键词、房间号、状态查询专家意见，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "专家意见详情",
      "description": "查看专家意见的表头信息、明细内容、附件和处理记录。",
      "location": "详情抽屉",
      "locator": "detail-field:expert"
    },
    {
      "name": "专家意见新建",
      "description": "选择会诊、专家意见、建议事项和附件并录入明细，创建新的专家意见。",
      "location": "新增/编辑表单",
      "locator": "form-field:expert"
    },
    {
      "name": "专家意见编辑草稿",
      "description": "修改草稿状态的专家意见及其明细，提交后不再按草稿方式修改。",
      "location": "新增/编辑表单",
      "locator": "form-field:expert"
    },
    {
      "name": "专家意见确认",
      "description": "确认专家意见的业务结果，写入确认人员和确认时间。",
      "location": "状态操作",
      "locator": "status-action:resource-confirm"
    },
    {
      "name": "专家意见操作记录",
      "description": "查看专家意见从创建到完成的状态变化、操作人员和处理时间。",
      "location": "关联页签",
      "locator": "tab:consultation-opinion"
    }
  ],
  "consultation-conclusion": [
    {
      "name": "会诊结论编辑",
      "description": "发起医生或授权专家填写结论、建议和后续安排并保存版本",
      "location": "新增/编辑表单",
      "locator": "form-field:roomNo"
    },
    {
      "name": "会诊结论列表",
      "description": "集中展示会诊结论编号、申请人、业务对象、金额或数量、当前状态和更新时间。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "会诊结论查询",
      "description": "可按关键词、房间号、状态查询会诊结论，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "会诊结论详情",
      "description": "查看会诊结论的表头信息、明细内容、附件和处理记录。",
      "location": "详情抽屉",
      "locator": "detail-field:roomNo"
    },
    {
      "name": "会诊结论新建",
      "description": "选择会诊摘要、共同结论、后续建议和参与专家并录入明细，创建新的会诊结论。",
      "location": "新增/编辑表单",
      "locator": "form-field:roomNo"
    },
    {
      "name": "会诊结论编辑草稿",
      "description": "修改草稿状态的会诊结论及其明细，提交后不再按草稿方式修改。",
      "location": "新增/编辑表单",
      "locator": "form-field:roomNo"
    },
    {
      "name": "会诊结论确认",
      "description": "确认会诊结论的业务结果，写入确认人员和确认时间。",
      "location": "状态操作",
      "locator": "status-action:resource-confirm"
    },
    {
      "name": "会诊结论归档",
      "description": "将完成的会诊结论及附件归档，供后续查询和追溯。",
      "location": "状态操作",
      "locator": "status-action:resource-archive"
    },
    {
      "name": "会诊结论操作记录",
      "description": "查看会诊结论从创建到完成的状态变化、操作人员和处理时间。",
      "location": "关联页签",
      "locator": "tab:consultation-conclusion"
    },
    {
      "name": "会诊结论签字",
      "description": "对正式会诊结论完成签字确认。",
      "location": "状态操作",
      "locator": "status-action:resource-confirm"
    }
  ],
  "consultation-report": [
    {
      "name": "会诊档案详情",
      "description": "统一查看预约信息、参与人员、会诊资料、结论、签字、录像和操作记录",
      "location": "详情抽屉",
      "locator": "detail-field:roomNo"
    },
    {
      "name": "会诊报告列表",
      "description": "集中展示会诊报告编号、申请人、业务对象、金额或数量、当前状态和更新时间。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "会诊报告查询",
      "description": "可按关键词、房间号、状态查询会诊报告，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "会诊报告详情",
      "description": "查看会诊报告的表头信息、明细内容、附件和处理记录。",
      "location": "详情抽屉",
      "locator": "detail-field:roomNo"
    },
    {
      "name": "会诊报告新建",
      "description": "选择会诊结论、专家意见、签字和资料索引并录入明细，创建新的会诊报告。",
      "location": "新增/编辑表单",
      "locator": "form-field:expert"
    },
    {
      "name": "会诊报告确认",
      "description": "确认会诊报告的业务结果，写入确认人员和确认时间。",
      "location": "状态操作",
      "locator": "status-action:resource-confirm"
    },
    {
      "name": "会诊报告归档",
      "description": "将完成的会诊报告及附件归档，供后续查询和追溯。",
      "location": "状态操作",
      "locator": "status-action:resource-archive"
    },
    {
      "name": "会诊报告打印",
      "description": "按统一格式打印会诊报告及明细，供签字、交接或归档。",
      "location": "批量操作",
      "locator": "batch-action:resource-print"
    },
    {
      "name": "会诊报告导出",
      "description": "按查询条件导出会诊报告列表或明细数据。",
      "location": "批量操作",
      "locator": "batch-action:resource-export"
    },
    {
      "name": "会诊报告操作记录",
      "description": "查看会诊报告从创建到完成的状态变化、操作人员和处理时间。",
      "location": "关联页签",
      "locator": "tab:consultation-report"
    },
    {
      "name": "会诊历史查询",
      "description": "可按关键词、房间号、状态查询会诊报告，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    }
  ],
  "consultation-expert": [
    {
      "name": "专家可用时段",
      "description": "预约时查看专家已占用时段和可选时间，避免同一专家重复安排",
      "location": "详情抽屉",
      "locator": "detail-field:expert"
    },
    {
      "name": "会诊专家列表",
      "description": "集中展示会诊专家的主要字段、状态和更新时间，作为查询和后续处理入口。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "会诊专家查询",
      "description": "可按关键词、专家、状态查询会诊专家，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "会诊专家详情",
      "description": "查看会诊专家的专家、专业、参与角色和邀请说明。",
      "location": "详情抽屉",
      "locator": "detail-field:expert"
    },
    {
      "name": "会诊专家新增",
      "description": "录入专家、专业、参与角色和邀请说明并保存，形成新的会诊专家记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:expert"
    },
    {
      "name": "会诊专家删除",
      "description": "删除尚未被业务引用的会诊专家，已使用数据不允许直接删除。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "会诊专家确认",
      "description": "确认会诊专家当前内容和状态，写入确认人员及确认时间。",
      "location": "状态操作",
      "locator": "status-action:resource-confirm"
    },
    {
      "name": "会诊专家记录",
      "description": "查看会诊专家的邀请、接受、拒绝和移除记录，保留操作人员与时间。",
      "location": "关联页签",
      "locator": "tab:consultation-expert"
    }
  ],
  "consultation-material": [
    {
      "name": "会诊资料上传",
      "description": "上传病历摘要、检查报告、图片等资料并形成只读快照",
      "location": "批量操作",
      "locator": "batch-action:resource-import"
    },
    {
      "name": "会诊附件上传",
      "description": "上传会诊相关检查报告或补充资料。",
      "location": "批量操作",
      "locator": "batch-action:resource-import"
    },
    {
      "name": "会诊资料列表",
      "description": "集中展示会诊资料的主要字段、状态和更新时间，作为查询和后续处理入口。",
      "location": "列表列",
      "locator": "column:name"
    },
    {
      "name": "会诊资料查询",
      "description": "可按关键词、房间号、状态查询会诊资料，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "会诊资料详情",
      "description": "查看会诊资料的资料分类、文件、资料说明和可见范围。",
      "location": "详情抽屉",
      "locator": "detail-field:roomNo"
    },
    {
      "name": "会诊资料新增",
      "description": "录入资料分类、文件、资料说明和可见范围并保存，形成新的会诊资料记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:roomNo"
    },
    {
      "name": "会诊资料删除",
      "description": "删除尚未被业务引用的会诊资料，已使用数据不允许直接删除。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "会诊资料导出",
      "description": "按当前查询条件导出会诊资料，用于核对、归档或线下处理。",
      "location": "批量操作",
      "locator": "batch-action:resource-export"
    },
    {
      "name": "会诊资料记录",
      "description": "查看会诊资料的上传、查看、下载和删除记录，保留操作人员与时间。",
      "location": "关联页签",
      "locator": "tab:consultation-material"
    }
  ],
  "talent-factor": [
    {
      "name": "天赋要素查询",
      "description": "可按关键词、天赋要素、状态查询天赋要素，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "天赋要素新增",
      "description": "新增天赋要素、分类、基础说明和展示信息。",
      "location": "新增/编辑表单",
      "locator": "form-field:factor"
    },
    {
      "name": "天赋要素编辑",
      "description": "修改要素名称、分类、说明和展示信息。",
      "location": "新增/编辑表单",
      "locator": "form-field:factor"
    },
    {
      "name": "天赋要素删除",
      "description": "删除未被正式报告使用的要素。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "天赋要素启用",
      "description": "启用后允许参与报告匹配和展示。",
      "location": "批量操作",
      "locator": "batch-action:resource-enable"
    },
    {
      "name": "天赋要素停用",
      "description": "停用后不再用于新报告生成。",
      "location": "批量操作",
      "locator": "batch-action:resource-disable"
    },
    {
      "name": "Excel 模板下载",
      "description": "下载要素、分级、注解和培养内容导入模板。",
      "location": "批量操作",
      "locator": "batch-action:resource-export"
    },
    {
      "name": "要素批量导入",
      "description": "按模板批量导入天赋要素。",
      "location": "批量操作",
      "locator": "batch-action:resource-import"
    },
    {
      "name": "分级批量导入",
      "description": "按模板批量导入分级配置。",
      "location": "批量操作",
      "locator": "batch-action:resource-import"
    },
    {
      "name": "导入预览",
      "description": "正式导入前预览识别结果。",
      "location": "批量操作",
      "locator": "batch-action:resource-import"
    },
    {
      "name": "字段格式检查",
      "description": "检查编码、年龄边界、状态等字段格式。",
      "location": "新增/编辑表单",
      "locator": "form-field:factor"
    },
    {
      "name": "重复数据检查",
      "description": "检查同批次及库内重复内容。",
      "location": "新增/编辑表单",
      "locator": "form-field:factor"
    },
    {
      "name": "错误明细查看",
      "description": "展示未通过检查的行和原因。",
      "location": "批量操作",
      "locator": "batch-action:resource-import"
    },
    {
      "name": "确认导入",
      "description": "经确认后将通过检查的数据写入内容库。",
      "location": "批量操作",
      "locator": "batch-action:resource-import"
    }
  ],
  "talent-level": [
    {
      "name": "天赋分级列表",
      "description": "集中展示天赋分级的主要字段、状态和更新时间，作为查询和后续处理入口。",
      "location": "列表列",
      "locator": "column:factor"
    },
    {
      "name": "天赋分级查询",
      "description": "可按关键词、天赋要素、状态查询天赋分级，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "天赋分级新增",
      "description": "录入天赋要素和分级、排序、适用范围和状态并保存，形成新的天赋分级记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:displayOrder"
    },
    {
      "name": "天赋分级编辑",
      "description": "修改天赋分级的天赋要素和分级、排序、适用范围和状态，保存后更新当前记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:displayOrder"
    },
    {
      "name": "天赋分级删除",
      "description": "删除尚未被业务引用的天赋分级，已使用数据不允许直接删除。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "天赋分级启用",
      "description": "启用天赋分级，启用后可在对应业务中选择和使用。",
      "location": "批量操作",
      "locator": "batch-action:resource-enable"
    }
  ],
  "talent-note": [
    {
      "name": "固定注解列表",
      "description": "集中展示固定注解的主要字段、状态和更新时间，作为查询和后续处理入口。",
      "location": "列表列",
      "locator": "column:factor"
    },
    {
      "name": "固定注解查询",
      "description": "可按关键词、天赋要素、状态查询固定注解，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "固定注解详情",
      "description": "查看固定注解的所属要素、所属分级、注解正文和状态。",
      "location": "详情抽屉",
      "locator": "detail-field:level"
    },
    {
      "name": "固定注解新增",
      "description": "录入所属要素、所属分级、注解正文和状态并保存，形成新的固定注解记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:level"
    },
    {
      "name": "固定注解编辑",
      "description": "修改固定注解的所属要素、所属分级、注解正文和状态，保存后更新当前记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:level"
    },
    {
      "name": "固定注解删除",
      "description": "删除尚未被业务引用的固定注解，已使用数据不允许直接删除。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "固定注解批量导入",
      "description": "按模板批量导入固定注解。",
      "location": "批量操作",
      "locator": "batch-action:resource-import"
    }
  ],
  "talent-nurture-content": [
    {
      "name": "培养内容查询",
      "description": "可按关键词、所属内容库、状态查询培养内容，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "培养内容新增",
      "description": "新增培养内容标题、正文和适用条件。",
      "location": "新增/编辑表单",
      "locator": "form-field:title"
    },
    {
      "name": "培养内容编辑",
      "description": "修改培养内容及适用条件。",
      "location": "新增/编辑表单",
      "locator": "form-field:contentSet"
    },
    {
      "name": "培养内容删除",
      "description": "删除未被正式报告使用的培养内容。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "培养内容启用",
      "description": "启用后进入候选内容范围。",
      "location": "批量操作",
      "locator": "batch-action:resource-enable"
    },
    {
      "name": "培养内容停用",
      "description": "停用后不用于新报告匹配。",
      "location": "批量操作",
      "locator": "batch-action:resource-disable"
    },
    {
      "name": "候选内容配置",
      "description": "同一匹配条件可维护多条候选培养内容。",
      "location": "新增/编辑表单",
      "locator": "form-field:contentSet"
    },
    {
      "name": "培养内容批量导入",
      "description": "按模板批量导入培养内容及条件。",
      "location": "批量操作",
      "locator": "batch-action:resource-import"
    }
  ],
  "talent-content-library": [
    {
      "name": "内容库列表",
      "description": "集中展示内容库的主要字段、状态和更新时间，作为查询和后续处理入口。",
      "location": "列表列",
      "locator": "column:contentSet"
    },
    {
      "name": "内容库查询",
      "description": "可按关键词、内容库名称、状态查询内容库，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "内容库详情",
      "description": "查看内容库的内容库名称、说明、适用范围和状态。",
      "location": "详情抽屉",
      "locator": "detail-field:contentSet"
    },
    {
      "name": "内容库新增",
      "description": "录入内容库名称、说明、适用范围和状态并保存，形成新的内容库记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:contentSet"
    },
    {
      "name": "内容库编辑",
      "description": "修改内容库的内容库名称、说明、适用范围和状态，保存后更新当前记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:contentSet"
    },
    {
      "name": "内容库删除",
      "description": "删除尚未被业务引用的内容库，已使用数据不允许直接删除。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "内容库启用",
      "description": "启用内容库，启用后可在对应业务中选择和使用。",
      "location": "批量操作",
      "locator": "batch-action:resource-enable"
    },
    {
      "name": "内容库停用",
      "description": "停用内容库，停用后不再用于新增业务，历史记录继续保留。",
      "location": "批量操作",
      "locator": "batch-action:resource-disable"
    },
    {
      "name": "内容库记录",
      "description": "查看内容库的绑定、启停和报告使用记录，保留操作人员与时间。",
      "location": "关联页签",
      "locator": "tab:talent-content-library"
    }
  ],
  "talent-report-type": [
    {
      "name": "年龄段条件列表",
      "description": "集中展示年龄段条件的主要字段、状态和更新时间，作为查询和后续处理入口。",
      "location": "列表列",
      "locator": "column:reportType"
    },
    {
      "name": "年龄段条件查询",
      "description": "可按关键词、报告类型、状态查询报告类型，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "年龄段条件详情",
      "description": "查看年龄段条件的年龄下限、年龄上限、适用要素、内容库和状态。",
      "location": "详情抽屉",
      "locator": "detail-field:contentSet"
    },
    {
      "name": "年龄段条件新增",
      "description": "录入年龄下限、年龄上限、适用要素、内容库和状态并保存，形成新的年龄段条件记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:contentSet"
    },
    {
      "name": "年龄段条件编辑",
      "description": "修改年龄段条件的年龄下限、年龄上限、适用要素、内容库和状态，保存后更新当前记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:contentSet"
    },
    {
      "name": "年龄段条件删除",
      "description": "删除尚未被业务引用的年龄段条件，已使用数据不允许直接删除。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "年龄段条件启用",
      "description": "启用年龄段条件，启用后可在对应业务中选择和使用。",
      "location": "批量操作",
      "locator": "batch-action:resource-enable"
    },
    {
      "name": "年龄段条件停用",
      "description": "停用年龄段条件，停用后不再用于新增业务，历史记录继续保留。",
      "location": "批量操作",
      "locator": "batch-action:resource-disable"
    },
    {
      "name": "性别条件列表",
      "description": "集中展示性别条件的主要字段、状态和更新时间，作为查询和后续处理入口。",
      "location": "列表列",
      "locator": "column:reportType"
    },
    {
      "name": "性别条件查询",
      "description": "可按关键词、报告类型、状态查询报告类型，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "性别条件详情",
      "description": "查看性别条件的适用性别、适用要素、内容库和状态。",
      "location": "详情抽屉",
      "locator": "detail-field:gender"
    },
    {
      "name": "性别条件新增",
      "description": "录入适用性别、适用要素、内容库和状态并保存，形成新的性别条件记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:gender"
    },
    {
      "name": "性别条件编辑",
      "description": "修改性别条件的适用性别、适用要素、内容库和状态，保存后更新当前记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:gender"
    },
    {
      "name": "性别条件删除",
      "description": "删除尚未被业务引用的性别条件，已使用数据不允许直接删除。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "性别条件启用",
      "description": "启用性别条件，启用后可在对应业务中选择和使用。",
      "location": "批量操作",
      "locator": "batch-action:resource-enable"
    },
    {
      "name": "性别条件停用",
      "description": "停用性别条件，停用后不再用于新增业务，历史记录继续保留。",
      "location": "批量操作",
      "locator": "batch-action:resource-disable"
    },
    {
      "name": "报告类型与内容库关系列表",
      "description": "集中展示报告类型与内容库关系的主要字段、状态和更新时间，作为查询和后续处理入口。",
      "location": "列表列",
      "locator": "column:reportType"
    },
    {
      "name": "报告类型与内容库关系查询",
      "description": "可按关键词、报告类型、状态查询报告类型，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "报告类型与内容库关系详情",
      "description": "查看报告类型与内容库关系的报告类型、指定内容库、生效日期和说明。",
      "location": "详情抽屉",
      "locator": "detail-field:reportType"
    },
    {
      "name": "报告类型与内容库关系新增",
      "description": "录入报告类型、指定内容库、生效日期和说明并保存，形成新的报告类型与内容库关系记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:reportType"
    },
    {
      "name": "报告类型与内容库关系编辑",
      "description": "修改报告类型与内容库关系的报告类型、指定内容库、生效日期和说明，保存后更新当前记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:reportType"
    },
    {
      "name": "报告类型与内容库关系删除",
      "description": "删除尚未被业务引用的报告类型与内容库关系，已使用数据不允许直接删除。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "报告类型与内容库关系绑定",
      "description": "将报告类型与内容库关系与报告类型或指定客户报告建立关联，并保存生效范围。",
      "location": "新增/编辑表单",
      "locator": "form-field:contentSet"
    },
    {
      "name": "报告类型与内容库关系记录",
      "description": "查看报告类型与内容库关系的绑定、修改、解绑和实际使用记录，保留操作人员与时间。",
      "location": "关联页签",
      "locator": "tab:talent-report-type"
    }
  ],
  "talent-matching-rule": [
    {
      "name": "分级匹配条件列表",
      "description": "集中展示分级匹配条件的主要字段、状态和更新时间，作为查询和后续处理入口。",
      "location": "列表列",
      "locator": "column:reportType"
    },
    {
      "name": "分级匹配条件查询",
      "description": "可按关键词、报告类型、状态查询匹配规则，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "分级匹配条件详情",
      "description": "查看分级匹配条件的天赋要素、结果范围、目标分级、优先级和状态。",
      "location": "详情抽屉",
      "locator": "detail-field:factor"
    },
    {
      "name": "分级匹配条件新增",
      "description": "录入天赋要素、结果范围、目标分级、优先级和状态并保存，形成新的分级匹配条件记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:factor"
    },
    {
      "name": "分级匹配条件编辑",
      "description": "修改分级匹配条件的天赋要素、结果范围、目标分级、优先级和状态，保存后更新当前记录。",
      "location": "新增/编辑表单",
      "locator": "form-field:factor"
    },
    {
      "name": "分级匹配条件删除",
      "description": "删除尚未被业务引用的分级匹配条件，已使用数据不允许直接删除。",
      "location": "行操作",
      "locator": "row-action:resource-delete"
    },
    {
      "name": "分级匹配条件启用",
      "description": "启用分级匹配条件，启用后可在对应业务中选择和使用。",
      "location": "批量操作",
      "locator": "batch-action:resource-enable"
    },
    {
      "name": "分级匹配条件停用",
      "description": "停用分级匹配条件，停用后不再用于新增业务，历史记录继续保留。",
      "location": "批量操作",
      "locator": "batch-action:resource-disable"
    }
  ],
  "talent-generation": [
    {
      "name": "客户天赋结果接收",
      "description": "接收客户提供的 100 多项正式天赋结果，并按客户标识建立关联。",
      "location": "详情抽屉",
      "locator": "detail-field:externalReportId"
    },
    {
      "name": "客户天赋结果查询",
      "description": "按孩子、第三方报告编号和分析时间查询已接收的天赋结果。",
      "location": "详情抽屉",
      "locator": "detail-field:externalReportId"
    },
    {
      "name": "客户身份匹配",
      "description": "按客户编号、手机号等确认标识匹配检测数据与客户档案。",
      "location": "详情抽屉",
      "locator": "detail-field:childIdNo"
    },
    {
      "name": "天赋结果完整性检查",
      "description": "检查报告所需天赋要素结果是否齐全，并列出缺失项目。",
      "location": "详情抽屉",
      "locator": "detail-field:completeness"
    },
    {
      "name": "报告内容匹配",
      "description": "按报告类型、内容库、天赋分级、年龄和性别匹配报告内容。",
      "location": "详情抽屉",
      "locator": "detail-field:results"
    },
    {
      "name": "报告首次生成",
      "description": "生成报告总览、要素详情、固定注解和培养内容，并固化到当前报告。",
      "location": "详情抽屉",
      "locator": "detail-field:externalReportId"
    },
    {
      "name": "培养内容随机固化",
      "description": "从全部符合条件的候选内容中随机选择一条，并直接固化到当前报告条目。",
      "location": "详情抽屉",
      "locator": "detail-field:results"
    }
  ],
  "talent-report": [
    {
      "name": "已固化报告内容",
      "description": "保存本次报告实际使用的要素、固定注解和培养内容，内容库后续修改不影响已发布报告。",
      "location": "详情抽屉",
      "locator": "detail-field:results"
    },
    {
      "name": "报告生成状态查询",
      "description": "查询报告待发布、已发布、已撤回和异常状态。",
      "location": "详情抽屉",
      "locator": "detail-field:status"
    },
    {
      "name": "第三方来源查询",
      "description": "按孩子、报告类型、第三方报告编号和分析时间查询本次报告来源。",
      "location": "详情抽屉",
      "locator": "detail-field:externalReportId"
    },
    {
      "name": "天赋报告列表",
      "description": "集中展示孩子、第三方报告编号、分析日期、匹配条件、生成完成时间和处理阶段。",
      "location": "列表列",
      "locator": "column:childId"
    },
    {
      "name": "天赋报告查询",
      "description": "可按关键词、孩子、状态查询天赋报告，定位符合条件的数据。",
      "location": "查询条件区",
      "locator": "filter:keyword"
    },
    {
      "name": "天赋报告详情",
      "description": "查看天赋报告表头、100 多项结构化明细、固定注解、培养内容和可选 PDF 附件。",
      "location": "详情抽屉",
      "locator": "detail-field:pdfFileName"
    },
    {
      "name": "天赋报告发布",
      "description": "发布待发布的天赋报告，发布后允许指定对象正式查看和使用。",
      "location": "状态操作",
      "locator": "status-action:resource-publish"
    },
    {
      "name": "天赋报告撤回发布",
      "description": "撤回已发布的天赋报告，停止后续查看并保留发布历史。",
      "location": "状态操作",
      "locator": "status-action:resource-withdraw"
    },
    {
      "name": "天赋报告运维日志",
      "description": "系统日志仅供运维排错，业务页面不展示。",
      "location": "关联页签",
      "locator": "tab:talent-report"
    }
  ]
}
