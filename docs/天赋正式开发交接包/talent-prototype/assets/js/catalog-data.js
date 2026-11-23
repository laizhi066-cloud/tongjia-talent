export const domainRegistry = [
  {
    "id": "people",
    "title": "人事行政",
    "subtitle": "组织人员、权限、排班、行政与审批协同",
    "icon": "人",
    "groupIds": [
      "people-org",
      "people-schedule",
      "people-admin",
      "people-approval"
    ],
    "resourceIds": [
      "hr-organization",
      "hr-employee",
      "hr-position",
      "hr-rank",
      "hr-employment",
      "hr-shift",
      "hr-schedule",
      "hr-shift-change",
      "hr-office-supply",
      "hr-meeting-room",
      "hr-vehicle",
      "hr-seal",
      "hr-contract",
      "hr-policy",
      "hr-archive-loan",
      "hr-expense-claim",
      "approval-form",
      "approval-flow",
      "approval-node",
      "approval-assignee",
      "approval-branch",
      "approval-application",
      "approval-task",
      "approval-notice",
      "approval-message"
    ]
  },
  {
    "id": "supply",
    "title": "采购、库存与资产",
    "subtitle": "基础资料、采购、收货、库存、资产与接口联动",
    "icon": "采",
    "groupIds": [
      "supply-master",
      "supply-purchase",
      "supply-receipt",
      "supply-inventory",
      "supply-asset",
      "supply-integration"
    ],
    "resourceIds": [
      "supply-supplier",
      "supply-material",
      "supply-warehouse-location",
      "purchase-request",
      "purchase-quote-compare",
      "purchase-order",
      "inventory-inbound",
      "inventory-ledger",
      "inventory-requisition",
      "inventory-flow",
      "inventory-operations",
      "asset-category",
      "asset-card",
      "asset-use",
      "asset-return",
      "asset-transfer",
      "asset-maintenance",
      "asset-stocktake",
      "asset-scrap",
      "asset-depreciation",
      "asset-lifecycle",
      "checkup-sync"
    ]
  },
  {
    "id": "finance",
    "title": "订单与资金",
    "subtitle": "订单、收退款、开票对账、成本预算与经营分析",
    "icon": "资",
    "groupIds": [
      "finance-order-group",
      "finance-analysis-group",
      "finance-operating"
    ],
    "resourceIds": [
      "finance-order",
      "finance-payment",
      "finance-refund",
      "finance-invoice",
      "finance-reconciliation",
      "finance-cost",
      "finance-allocation-rule",
      "finance-budget",
      "finance-payable-match",
      "finance-operating-report",
      "finance-metric-library",
      "finance-assessment-plan"
    ]
  },
  {
    "id": "medical",
    "title": "医学规则与医生业务",
    "subtitle": "分类映射、医学规则、报告与医生开单",
    "icon": "医",
    "groupIds": [
      "medical-master-group",
      "medical-mapping-group",
      "medical-rule-group",
      "medical-report-group",
      "medical-doctor-group"
    ],
    "resourceIds": [
      "medical-report-category",
      "medical-report-type",
      "medical-standard-item",
      "medical-external-report-map",
      "medical-external-item-map",
      "medical-unmatched-item",
      "medical-reference-rule",
      "medical-critical-rule",
      "medical-item-relation",
      "medical-symptom-disease",
      "medical-special-precheck",
      "medical-health-analysis",
      "medical-report",
      "medical-followup",
      "doctor-order",
      "doctor-plan"
    ]
  },
  {
    "id": "care",
    "title": "视频会诊与天赋报告",
    "subtitle": "会诊协作、归档与天赋内容报告",
    "icon": "会",
    "groupIds": [
      "care-consultation",
      "care-talent-rule",
      "care-talent-report"
    ],
    "resourceIds": [
      "consultation-appointment",
      "consultation-invitation",
      "consultation-device",
      "consultation-room",
      "consultation-member",
      "consultation-opinion",
      "consultation-conclusion",
      "consultation-report",
      "consultation-expert",
      "consultation-material",
      "talent-factor",
      "talent-level",
      "talent-note",
      "talent-nurture-content",
      "talent-content-library",
      "talent-report"
    ]
  }
]

export const groupRegistry = [
  {
    "id": "people-org",
    "domainId": "people",
    "title": "组织与人员",
    "resourceIds": [
      "hr-organization",
      "hr-employee",
      "hr-position",
      "hr-rank",
      "hr-employment"
    ]
  },
  {
    "id": "people-schedule",
    "domainId": "people",
    "title": "排班与调班",
    "resourceIds": [
      "hr-shift",
      "hr-schedule",
      "hr-shift-change"
    ]
  },
  {
    "id": "people-admin",
    "domainId": "people",
    "title": "行政事务",
    "resourceIds": [
      "hr-office-supply",
      "hr-meeting-room",
      "hr-vehicle",
      "hr-seal",
      "hr-contract",
      "hr-policy",
      "hr-archive-loan",
      "hr-expense-claim"
    ]
  },
  {
    "id": "people-approval",
    "domainId": "people",
    "title": "审批协同",
    "resourceIds": [
      "approval-form",
      "approval-flow",
      "approval-node",
      "approval-assignee",
      "approval-branch",
      "approval-application",
      "approval-task",
      "approval-notice",
      "approval-message"
    ]
  },
  {
    "id": "supply-master",
    "domainId": "supply",
    "title": "仓库与库位",
    "resourceIds": [
      "supply-supplier",
      "supply-material",
      "supply-warehouse-location"
    ]
  },
  {
    "id": "supply-purchase",
    "domainId": "supply",
    "title": "询价比价",
    "resourceIds": [
      "purchase-request",
      "purchase-quote-compare",
      "purchase-order"
    ]
  },
  {
    "id": "supply-receipt",
    "domainId": "supply",
    "title": "采购入库",
    "resourceIds": [
      "inventory-inbound"
    ]
  },
  {
    "id": "supply-inventory",
    "domainId": "supply",
    "title": "库存作业",
    "resourceIds": [
      "inventory-ledger",
      "inventory-requisition",
      "inventory-flow",
      "inventory-operations"
    ]
  },
  {
    "id": "supply-asset",
    "domainId": "supply",
    "title": "固定资产",
    "resourceIds": [
      "asset-category",
      "asset-card",
      "asset-use",
      "asset-return",
      "asset-transfer",
      "asset-maintenance",
      "asset-stocktake",
      "asset-scrap",
      "asset-depreciation",
      "asset-lifecycle"
    ]
  },
  {
    "id": "supply-integration",
    "domainId": "supply",
    "title": "三方系统对接",
    "resourceIds": [
      "checkup-sync"
    ]
  },
  {
    "id": "finance-order-group",
    "domainId": "finance",
    "title": "订单与资金",
    "resourceIds": [
      "finance-order",
      "finance-payment",
      "finance-refund",
      "finance-invoice",
      "finance-reconciliation"
    ]
  },
  {
    "id": "finance-analysis-group",
    "domainId": "finance",
    "title": "成本预算",
    "resourceIds": [
      "finance-cost",
      "finance-allocation-rule",
      "finance-budget",
      "finance-payable-match"
    ]
  },
  {
    "id": "finance-operating",
    "domainId": "finance",
    "title": "经营分析",
    "resourceIds": [
      "finance-operating-report",
      "finance-metric-library",
      "finance-assessment-plan"
    ]
  },
  {
    "id": "medical-master-group",
    "domainId": "medical",
    "title": "体检分类与标准项目",
    "resourceIds": [
      "medical-report-category",
      "medical-report-type",
      "medical-standard-item"
    ]
  },
  {
    "id": "medical-mapping-group",
    "domainId": "medical",
    "title": "外部数据映射",
    "resourceIds": [
      "medical-external-report-map",
      "medical-external-item-map",
      "medical-unmatched-item"
    ]
  },
  {
    "id": "medical-rule-group",
    "domainId": "medical",
    "title": "医学关系与安全规则",
    "resourceIds": [
      "medical-reference-rule",
      "medical-critical-rule",
      "medical-item-relation",
      "medical-symptom-disease",
      "medical-special-precheck"
    ]
  },
  {
    "id": "medical-report-group",
    "domainId": "medical",
    "title": "健康资料与报告",
    "resourceIds": [
      "medical-health-analysis",
      "medical-report",
      "medical-followup"
    ]
  },
  {
    "id": "medical-doctor-group",
    "domainId": "medical",
    "title": "医生业务",
    "resourceIds": [
      "doctor-order",
      "doctor-plan"
    ]
  },
  {
    "id": "care-consultation",
    "domainId": "care",
    "title": "视频会诊",
    "resourceIds": [
      "consultation-appointment",
      "consultation-invitation",
      "consultation-device",
      "consultation-room",
      "consultation-member",
      "consultation-opinion",
      "consultation-conclusion",
      "consultation-report",
      "consultation-expert",
      "consultation-material"
    ]
  },
  {
    "id": "care-talent-rule",
    "domainId": "care",
    "title": "天赋规则内容",
    "resourceIds": [
      "talent-factor",
      "talent-level",
      "talent-note",
      "talent-nurture-content",
      "talent-content-library"
    ]
  },
  {
    "id": "care-talent-report",
    "domainId": "care",
    "title": "天赋导入与报告",
    "resourceIds": [
      "talent-report"
    ]
  }
]

export const resourceRegistry = [
  {
    "id": "hr-organization",
    "domainId": "people",
    "groupId": "people-org",
    "title": "组织",
    "entity": "组织",
    "pageType": "master",
    "icon": "组",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "parentName",
        "label": "家长姓名",
        "type": "text",
        "required": true
      },
      {
        "name": "owner",
        "label": "负责人/经办人",
        "type": "text",
        "required": true
      },
      {
        "name": "scope",
        "label": "数据范围",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "parentName",
      "owner",
      "scope",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "parentName",
        "label": "家长姓名",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "hr-organization"
    ],
    "editLockedStatuses": [],
    "description": "维护组织，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "hr-employee",
    "domainId": "people",
    "groupId": "people-org",
    "title": "员工资料",
    "entity": "员工",
    "pageType": "master",
    "icon": "员",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "department",
        "label": "所属部门",
        "type": "text",
        "required": true
      },
      {
        "name": "position",
        "label": "岗位",
        "type": "text",
        "required": true
      },
      {
        "name": "rank",
        "label": "职级",
        "type": "text",
        "required": true
      },
      {
        "name": "mobile",
        "label": "联系电话",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "在职",
          "离职",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "department",
      "position",
      "rank",
      "mobile",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "department",
        "label": "所属部门",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "在职",
          "离职",
          "已停用"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable",
      "import",
      "export"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable",
      "resource-import",
      "resource-export"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "hr-employee"
    ],
    "editLockedStatuses": [],
    "description": "维护员工资料，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "hr-position",
    "domainId": "people",
    "groupId": "people-org",
    "title": "岗位",
    "entity": "岗位",
    "pageType": "master",
    "icon": "岗",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "department",
        "label": "所属部门",
        "type": "text",
        "required": true
      },
      {
        "name": "scope",
        "label": "数据范围",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "department",
      "scope",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "department",
        "label": "所属部门",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "hr-position"
    ],
    "editLockedStatuses": [],
    "description": "维护岗位，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "hr-rank",
    "domainId": "people",
    "groupId": "people-org",
    "title": "职级",
    "entity": "职级",
    "pageType": "master",
    "icon": "级",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "rank",
        "label": "职级",
        "type": "text",
        "required": true
      },
      {
        "name": "scope",
        "label": "数据范围",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "rank",
      "scope",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "rank",
        "label": "职级",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "hr-rank"
    ],
    "editLockedStatuses": [],
    "description": "维护职级，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "hr-employment",
    "domainId": "people",
    "groupId": "people-org",
    "title": "任职关系",
    "entity": "任职关系",
    "pageType": "master",
    "icon": "任",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "employee",
        "label": "员工",
        "type": "text",
        "required": true
      },
      {
        "name": "organization",
        "label": "所属组织",
        "type": "text",
        "required": true
      },
      {
        "name": "position",
        "label": "岗位",
        "type": "text",
        "required": true
      },
      {
        "name": "startDate",
        "label": "任职开始",
        "type": "date",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "employee",
      "organization",
      "position",
      "startDate",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "employee",
        "label": "员工",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "hr-employment"
    ],
    "editLockedStatuses": [],
    "description": "维护任职关系，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "hr-shift",
    "domainId": "people",
    "groupId": "people-schedule",
    "title": "班次",
    "entity": "班次",
    "pageType": "master",
    "icon": "班",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "shiftTime",
        "label": "班次时段",
        "type": "text",
        "required": true
      },
      {
        "name": "scope",
        "label": "数据范围",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "shiftTime",
      "scope",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "shiftTime",
        "label": "班次时段",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "hr-shift"
    ],
    "editLockedStatuses": [],
    "description": "维护班次，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "hr-schedule",
    "domainId": "people",
    "groupId": "people-schedule",
    "title": "排班",
    "entity": "排班计划",
    "pageType": "document",
    "icon": "排",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "employee",
        "label": "员工",
        "type": "text",
        "required": true
      },
      {
        "name": "date",
        "label": "排班日期",
        "type": "date",
        "required": true
      },
      {
        "name": "shift",
        "label": "班次",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "已撤回",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "employee",
      "date",
      "shift",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "employee",
        "label": "员工",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "已撤回",
          "已取消"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "submit",
      "withdraw",
      "cancel"
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "hr-schedule"
    ],
    "editLockedStatuses": [],
    "description": "查询并处理排班，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "hr-shift-change",
    "domainId": "people",
    "groupId": "people-schedule",
    "title": "调班申请",
    "entity": "调班申请",
    "pageType": "document",
    "icon": "调",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "employee",
        "label": "员工",
        "type": "text",
        "required": true
      },
      {
        "name": "date",
        "label": "原排班日期",
        "type": "date",
        "required": true
      },
      {
        "name": "shift",
        "label": "目标班次",
        "type": "text",
        "required": true
      },
      {
        "name": "reason",
        "label": "原因/说明",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "已驳回",
          "已撤回"
        ]
      }
    ],
    "columns": [
      "name",
      "employee",
      "date",
      "shift",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "employee",
        "label": "员工",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "已驳回",
          "已撤回"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "submit",
      "withdraw",
      "cancel",
      "approve",
      "reject"
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "approval-approve",
      "approval-reject"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "approval-approve",
      "approval-reject"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "hr-shift-change"
    ],
    "editLockedStatuses": [],
    "description": "查询并处理调班申请，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "hr-office-supply",
    "domainId": "people",
    "groupId": "people-admin",
    "title": "办公用品",
    "entity": "办公用品",
    "pageType": "document",
    "icon": "办",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "specification",
        "label": "规格型号",
        "type": "text",
        "required": true
      },
      {
        "name": "balance",
        "label": "库存数量",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "specification",
      "balance",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "specification",
        "label": "规格型号",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "已取消"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "submit",
      "withdraw",
      "cancel"
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "hr-office-supply"
    ],
    "editLockedStatuses": [],
    "description": "查询并处理办公用品，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "hr-meeting-room",
    "domainId": "people",
    "groupId": "people-admin",
    "title": "会议室",
    "entity": "会议室",
    "pageType": "document",
    "icon": "会",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "meetingRoom",
        "label": "会议室",
        "type": "text",
        "required": true
      },
      {
        "name": "time",
        "label": "可预约时段",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "meetingRoom",
      "time",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "meetingRoom",
        "label": "会议室",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "已取消"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "submit",
      "withdraw",
      "cancel"
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "hr-meeting-room"
    ],
    "editLockedStatuses": [],
    "description": "查询并处理会议室，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "hr-vehicle",
    "domainId": "people",
    "groupId": "people-admin",
    "title": "车辆与用车",
    "entity": "用车申请",
    "pageType": "document",
    "icon": "车",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "vehicleNo",
        "label": "车辆号牌",
        "type": "text",
        "required": true
      },
      {
        "name": "time",
        "label": "用车时间",
        "type": "date",
        "required": true
      },
      {
        "name": "reason",
        "label": "原因/说明",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "vehicleNo",
      "time",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "vehicleNo",
        "label": "车辆号牌",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "已取消"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "submit",
      "withdraw",
      "cancel"
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "hr-vehicle"
    ],
    "editLockedStatuses": [],
    "description": "查询并处理车辆与用车，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "hr-seal",
    "domainId": "people",
    "groupId": "people-admin",
    "title": "用印申请",
    "entity": "用印申请",
    "pageType": "document",
    "icon": "用",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "sealType",
        "label": "印章类型",
        "type": "text",
        "required": true
      },
      {
        "name": "contractParty",
        "label": "合同相对方",
        "type": "text",
        "required": true
      },
      {
        "name": "reason",
        "label": "原因/说明",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "sealType",
      "contractParty",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "sealType",
        "label": "印章类型",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "已取消"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "submit",
      "withdraw",
      "cancel"
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "hr-seal"
    ],
    "editLockedStatuses": [],
    "description": "查询并处理用印申请，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "hr-contract",
    "domainId": "people",
    "groupId": "people-admin",
    "title": "合同台账",
    "entity": "合同",
    "pageType": "document",
    "icon": "合",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "contractParty",
        "label": "合同相对方",
        "type": "text",
        "required": true
      },
      {
        "name": "amount",
        "label": "合同金额",
        "type": "number",
        "required": true
      },
      {
        "name": "endDate",
        "label": "到期日期",
        "type": "date",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "contractParty",
      "amount",
      "endDate",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "contractParty",
        "label": "合同相对方",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "已取消"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "submit",
      "withdraw",
      "cancel"
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "hr-contract"
    ],
    "editLockedStatuses": [],
    "description": "查询并处理合同台账，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "hr-policy",
    "domainId": "people",
    "groupId": "people-admin",
    "title": "制度文件",
    "entity": "制度文件",
    "pageType": "document",
    "icon": "制",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "fileName",
        "label": "文件名",
        "type": "text",
        "required": true
      },
      {
        "name": "effectiveTime",
        "label": "生效日期",
        "type": "date",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "fileName",
      "effectiveTime",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "fileName",
        "label": "文件名",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "已取消"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "submit",
      "withdraw",
      "cancel"
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "hr-policy"
    ],
    "editLockedStatuses": [],
    "description": "查询并处理制度文件，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "hr-archive-loan",
    "domainId": "people",
    "groupId": "people-admin",
    "title": "档案借阅",
    "entity": "档案借阅",
    "pageType": "document",
    "icon": "档",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "archiveNo",
        "label": "档案编号",
        "type": "text",
        "required": true
      },
      {
        "name": "applicant",
        "label": "申请人",
        "type": "text",
        "required": true
      },
      {
        "name": "endDate",
        "label": "归还日期",
        "type": "date",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "archiveNo",
      "applicant",
      "endDate",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "archiveNo",
        "label": "档案编号",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "已取消"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "submit",
      "withdraw",
      "cancel"
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "hr-archive-loan"
    ],
    "editLockedStatuses": [],
    "description": "查询并处理档案借阅，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "hr-expense-claim",
    "domainId": "people",
    "groupId": "people-admin",
    "title": "费用报销",
    "entity": "费用报销",
    "pageType": "document",
    "icon": "费",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "expenseType",
        "label": "报销类型",
        "type": "text",
        "required": true
      },
      {
        "name": "amount",
        "label": "报销金额",
        "type": "number",
        "required": true
      },
      {
        "name": "costCenter",
        "label": "成本中心",
        "type": "text",
        "required": true
      },
      {
        "name": "reason",
        "label": "原因/说明",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "expenseType",
      "amount",
      "costCenter",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "expenseType",
        "label": "报销类型",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "已取消"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "submit",
      "withdraw",
      "cancel"
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "hr-expense-claim"
    ],
    "editLockedStatuses": [],
    "description": "查询并处理费用报销，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "approval-form",
    "domainId": "people",
    "groupId": "people-approval",
    "title": "业务表单",
    "entity": "业务表单",
    "pageType": "master",
    "icon": "业",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "formCode",
        "label": "表单编码",
        "type": "text",
        "required": true
      },
      {
        "name": "module",
        "label": "模块",
        "type": "text",
        "required": true
      },
      {
        "name": "node",
        "label": "审批节点",
        "type": "text",
        "required": true
      },
      {
        "name": "assignee",
        "label": "审批人",
        "type": "text",
        "required": true
      },
      {
        "name": "expression",
        "label": "条件表达式",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已发布",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "formCode",
      "module",
      "node",
      "assignee",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "formCode",
        "label": "表单编码",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已发布",
          "已停用"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable",
      "publish",
      "withdraw"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable",
      "approval-form-copy"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [
      "approval-form-design",
      "resource-publish",
      "resource-withdraw"
    ],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "approval-form"
    ],
    "editLockedStatuses": [],
    "description": "维护业务表单，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "approval-flow",
    "domainId": "people",
    "groupId": "people-approval",
    "title": "审批流程",
    "entity": "审批流程",
    "pageType": "master",
    "icon": "审",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "module",
        "label": "模块",
        "type": "text",
        "required": true
      },
      {
        "name": "node",
        "label": "审批节点",
        "type": "text",
        "required": true
      },
      {
        "name": "version",
        "label": "版本号",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已发布",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "module",
      "node",
      "version",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "module",
        "label": "模块",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已发布",
          "已停用"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable",
      "publish",
      "withdraw"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable",
      "approval-flow-copy"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [
      "resource-publish",
      "resource-withdraw"
    ],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "approval-flow"
    ],
    "editLockedStatuses": [],
    "description": "维护审批流程，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "approval-node",
    "domainId": "people",
    "groupId": "people-approval",
    "title": "审批节点",
    "entity": "审批节点",
    "pageType": "master",
    "icon": "审",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "node",
        "label": "审批节点",
        "type": "text",
        "required": true
      },
      {
        "name": "assignee",
        "label": "审批人",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "node",
      "assignee",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "node",
        "label": "审批节点",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "已启用",
          "已停用"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable",
      "approval-node-sort"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "approval-node"
    ],
    "editLockedStatuses": [],
    "description": "维护审批节点，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "approval-assignee",
    "domainId": "people",
    "groupId": "people-approval",
    "title": "审批人员配置",
    "entity": "审批人员配置",
    "pageType": "master",
    "icon": "审",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "node",
        "label": "审批节点",
        "type": "text",
        "required": true
      },
      {
        "name": "assignee",
        "label": "审批人",
        "type": "text",
        "required": true
      },
      {
        "name": "scope",
        "label": "数据范围",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "node",
      "assignee",
      "scope",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "node",
        "label": "审批节点",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "已启用",
          "已停用"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "approval-assignee"
    ],
    "editLockedStatuses": [],
    "description": "维护审批人员配置，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "approval-branch",
    "domainId": "people",
    "groupId": "people-approval",
    "title": "条件分支",
    "entity": "条件分支",
    "pageType": "master",
    "icon": "条",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "node",
        "label": "审批节点",
        "type": "text",
        "required": true
      },
      {
        "name": "expression",
        "label": "条件表达式",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "node",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "node",
        "label": "审批节点",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "已启用",
          "已停用"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable",
      "approval-branch-sort"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "approval-branch"
    ],
    "editLockedStatuses": [],
    "description": "维护条件分支，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "approval-application",
    "domainId": "people",
    "groupId": "people-approval",
    "title": "审批申请",
    "entity": "审批申请",
    "pageType": "document",
    "icon": "审",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "businessId",
        "label": "业务单号",
        "type": "text",
        "required": true
      },
      {
        "name": "applicant",
        "label": "申请人",
        "type": "text",
        "required": true
      },
      {
        "name": "module",
        "label": "模块",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "已驳回",
          "已撤回",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "businessId",
      "applicant",
      "module",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "businessId",
        "label": "业务单号",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "已驳回",
          "已撤回",
          "已取消"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "submit",
      "withdraw",
      "cancel",
      "execute"
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "integration-execute"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "integration-execute"
    ],
    "integrationActions": [
      "integration-execute"
    ],
    "coverageIntegrationActions": [
      "integration-execute"
    ],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "approval-application"
    ],
    "editLockedStatuses": [],
    "description": "查询并处理审批申请，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "approval-task",
    "domainId": "people",
    "groupId": "people-approval",
    "title": "审批任务",
    "entity": "审批任务",
    "pageType": "approval",
    "icon": "审",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "businessId",
        "label": "业务单号",
        "type": "text",
        "required": true
      },
      {
        "name": "node",
        "label": "审批节点",
        "type": "text",
        "required": true
      },
      {
        "name": "assignee",
        "label": "审批人",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "待处理",
          "已通过",
          "已驳回",
          "已退回",
          "已转办"
        ]
      }
    ],
    "columns": [
      "name",
      "businessId",
      "node",
      "assignee",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "businessId",
        "label": "业务单号",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "待处理",
          "已通过",
          "已驳回",
          "已退回",
          "已转办"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "approve",
      "reject",
      "return",
      "transfer"
    ],
    "rowActions": [
      "approval-approve",
      "approval-reject",
      "approval-return",
      "approval-transfer"
    ],
    "batchActions": [],
    "statusActions": [
      "approval-approve",
      "approval-reject",
      "approval-return",
      "approval-transfer"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "operation-log"
    ],
    "editLockedStatuses": [],
    "description": "处理审批任务，支持通过、驳回、退回和转办等状态动作。"
  },
  {
    "id": "approval-notice",
    "domainId": "people",
    "groupId": "people-approval",
    "title": "公告",
    "entity": "公告",
    "pageType": "document",
    "icon": "公",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "audience",
        "label": "接收范围",
        "type": "text",
        "required": true
      },
      {
        "name": "content",
        "label": "正文内容",
        "type": "text",
        "required": true
      },
      {
        "name": "messageType",
        "label": "消息类型",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已发布",
          "已撤回"
        ]
      }
    ],
    "columns": [
      "name",
      "audience",
      "messageType",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "audience",
        "label": "接收范围",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已发布",
          "已撤回"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "publish",
      "withdraw",
      "delete"
    ],
    "rowActions": [
      "resource-publish",
      "resource-withdraw",
      "resource-delete"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-publish",
      "resource-withdraw"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "approval-notice"
    ],
    "editLockedStatuses": [],
    "description": "查询并处理公告，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "approval-message",
    "domainId": "people",
    "groupId": "people-approval",
    "title": "业务消息",
    "entity": "业务消息",
    "pageType": "readonly",
    "icon": "业",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "messageType",
        "label": "消息类型",
        "type": "text",
        "required": true
      },
      {
        "name": "businessId",
        "label": "业务单号",
        "type": "text",
        "required": true
      },
      {
        "name": "audience",
        "label": "接收范围",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "未读",
          "已读",
          "已发送"
        ]
      }
    ],
    "columns": [
      "name",
      "messageType",
      "businessId",
      "audience",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "messageType",
        "label": "消息类型",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "未读",
          "已读",
          "已发送"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "export"
    ],
    "rowActions": [],
    "batchActions": [
      "resource-export"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "approval-message"
    ],
    "editLockedStatuses": [],
    "description": "查看业务消息详情和关联记录。"
  },
  {
    "id": "supply-supplier",
    "domainId": "supply",
    "groupId": "supply-master",
    "title": "供应商",
    "entity": "供应商",
    "pageType": "master",
    "icon": "供",
    "customerVisible": true,
    "fields": [
      {
        "name": "supplier",
        "label": "供应商名称",
        "type": "text",
        "required": true
      },
      {
        "name": "supplierLevel",
        "label": "供应商等级",
        "type": "select",
        "required": true,
        "options": [
          "A 级",
          "B 级",
          "C 级"
        ]
      },
      {
        "name": "contact",
        "label": "联系人",
        "type": "text",
        "required": true
      },
      {
        "name": "mobile",
        "label": "联系电话",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "supplier",
      "supplierLevel",
      "contact",
      "mobile",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "supplier",
        "label": "供应商名称",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "已启用",
          "已停用"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable",
      "import",
      "export"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable",
      "resource-import",
      "resource-export"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "supply-supplier"
    ],
    "editLockedStatuses": [],
    "description": "维护供应商，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "supply-material",
    "domainId": "supply",
    "groupId": "supply-master",
    "title": "物料资料",
    "entity": "物料",
    "pageType": "master",
    "icon": "物",
    "customerVisible": true,
    "fields": [
      {
        "name": "material",
        "label": "物料名称",
        "type": "text",
        "required": true
      },
      {
        "name": "specification",
        "label": "规格型号",
        "type": "text",
        "required": true
      },
      {
        "name": "unit",
        "label": "计量单位",
        "type": "select",
        "required": true,
        "options": [
          "盒",
          "套",
          "支",
          "瓶"
        ]
      },
      {
        "name": "assetCategory",
        "label": "物料分类",
        "type": "select",
        "required": true,
        "options": [
          "医疗耗材",
          "药品",
          "产品",
          "办公物料"
        ]
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "material",
      "specification",
      "unit",
      "assetCategory",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "material",
        "label": "物料名称",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "已启用",
          "已停用"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable",
      "import",
      "export"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable",
      "resource-import",
      "resource-export"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "supply-material"
    ],
    "editLockedStatuses": [],
    "description": "维护物料资料，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "supply-warehouse-location",
    "domainId": "supply",
    "groupId": "supply-master",
    "title": "仓库与库位",
    "entity": "仓库与库位",
    "pageType": "master",
    "icon": "仓",
    "customerVisible": true,
    "fields": [
      {
        "name": "warehouse",
        "label": "仓库",
        "type": "select",
        "required": true,
        "options": [
          "杭州一号仓",
          "宁波周转仓",
          "滨江冷链仓",
          "嘉兴备件仓"
        ]
      },
      {
        "name": "location",
        "label": "库位",
        "type": "select",
        "required": true,
        "options": [
          "A-01-08",
          "A-02-03",
          "B-01-05",
          "B-03-02"
        ],
        "dependsOn": [
          "warehouse"
        ],
        "optionsSource": "warehouse-location"
      },
      {
        "name": "organization",
        "label": "所属组织",
        "type": "select",
        "required": true,
        "options": [
          "采购管理部",
          "健康管理中心",
          "护理部",
          "医学服务部"
        ]
      },
      {
        "name": "owner",
        "label": "负责人",
        "type": "select",
        "required": true,
        "options": [
          "孙琪",
          "刘敏",
          "方媛",
          "王主管"
        ]
      },
      {
        "name": "scope",
        "label": "容量/用途",
        "type": "textarea",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "warehouse",
      "location",
      "organization",
      "owner",
      "scope",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "warehouse",
        "label": "仓库",
        "type": "select",
        "required": false,
        "options": [
          "杭州一号仓",
          "宁波周转仓",
          "滨江冷链仓",
          "嘉兴备件仓"
        ]
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "已启用",
          "已停用"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "supply-warehouse-location"
    ],
    "editLockedStatuses": [],
    "description": "维护仓库与库位，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "supply-warehouse",
    "domainId": "supply",
    "groupId": "supply-master",
    "title": "仓库",
    "entity": "仓库",
    "pageType": "master",
    "icon": "仓",
    "customerVisible": false,
    "fields": [
      {
        "name": "warehouse",
        "label": "仓库",
        "type": "select",
        "required": true,
        "options": [
          "杭州一号仓",
          "宁波周转仓",
          "滨江冷链仓",
          "嘉兴备件仓"
        ]
      },
      {
        "name": "organization",
        "label": "所属组织",
        "type": "select",
        "required": true,
        "options": [
          "采购管理部",
          "健康管理中心",
          "护理部",
          "医学服务部"
        ]
      },
      {
        "name": "owner",
        "label": "负责人",
        "type": "select",
        "required": true,
        "options": [
          "孙琪",
          "刘敏",
          "方媛",
          "王主管"
        ]
      },
      {
        "name": "location",
        "label": "地址",
        "type": "text",
        "required": true
      },
      {
        "name": "scope",
        "label": "数据范围",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "warehouse",
      "organization",
      "owner",
      "location",
      "scope",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "warehouse",
        "label": "仓库",
        "type": "select",
        "required": false,
        "options": [
          "杭州一号仓",
          "宁波周转仓",
          "滨江冷链仓",
          "嘉兴备件仓"
        ]
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "已启用",
          "已停用"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "supply-warehouse"
    ],
    "editLockedStatuses": [],
    "description": "维护仓库，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "supply-location",
    "domainId": "supply",
    "groupId": "supply-master",
    "title": "库位",
    "entity": "库位",
    "pageType": "master",
    "icon": "位",
    "customerVisible": false,
    "fields": [
      {
        "name": "warehouse",
        "label": "仓库",
        "type": "select",
        "required": true,
        "options": [
          "杭州一号仓",
          "宁波周转仓",
          "滨江冷链仓",
          "嘉兴备件仓"
        ]
      },
      {
        "name": "location",
        "label": "库位",
        "type": "select",
        "required": true,
        "options": [
          "A-01-08",
          "A-02-03",
          "B-01-05",
          "B-03-02"
        ],
        "dependsOn": [
          "warehouse"
        ],
        "optionsSource": "warehouse-location"
      },
      {
        "name": "scope",
        "label": "容量/用途",
        "type": "textarea",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "warehouse",
      "location",
      "scope",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "warehouse",
        "label": "仓库",
        "type": "select",
        "required": false,
        "options": [
          "杭州一号仓",
          "宁波周转仓",
          "滨江冷链仓",
          "嘉兴备件仓"
        ]
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "已启用",
          "已停用"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "supply-location"
    ],
    "editLockedStatuses": [],
    "description": "维护库位，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "purchase-request",
    "domainId": "supply",
    "groupId": "supply-purchase",
    "title": "采购申请",
    "entity": "采购申请",
    "pageType": "document",
    "icon": "采",
    "customerVisible": true,
    "fields": [
      {
        "name": "systemNo",
        "label": "采购申请号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "applicant",
        "label": "申请人",
        "type": "select",
        "required": true,
        "options": [
          "孙琪",
          "刘敏",
          "方媛",
          "王主管"
        ]
      },
      {
        "name": "requestDepartment",
        "label": "申请部门",
        "type": "select",
        "required": true,
        "options": [
          "采购管理部",
          "健康管理中心",
          "护理部",
          "医学服务部"
        ]
      },
      {
        "name": "purchaseType",
        "label": "采购类型",
        "type": "select",
        "required": true,
        "options": [
          "常规采购",
          "紧急采购",
          "补库采购"
        ]
      },
      {
        "name": "material",
        "label": "物料",
        "type": "select",
        "required": true,
        "options": [
          "动态心电监测耗材包",
          "一次性采血针",
          "真空采血管",
          "医用外科口罩"
        ]
      },
      {
        "name": "quantity",
        "label": "申请数量",
        "type": "number",
        "required": true
      },
      {
        "name": "amount",
        "label": "预算金额",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "执行中",
          "已关闭",
          "已取消"
        ]
      }
    ],
    "columns": [
      "systemNo",
      "applicant",
      "requestDepartment",
      "purchaseType",
      "material",
      "quantity",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "systemNo",
        "label": "采购申请号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "执行中",
          "已关闭",
          "已取消"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "submit",
      "withdraw",
      "cancel",
      "confirm",
      "close",
      "print",
      "export",
      "approve",
      "reject",
      "delete"
    ],
    "rowActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close",
      "approval-approve",
      "approval-reject",
      "resource-delete"
    ],
    "batchActions": [
      "resource-print",
      "resource-export"
    ],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close",
      "approval-approve",
      "approval-reject"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "purchase-request"
    ],
    "editLockedStatuses": [],
    "description": "查询并处理采购申请，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "purchase-quote-compare",
    "domainId": "supply",
    "groupId": "supply-purchase",
    "title": "询价比价",
    "entity": "询价比价",
    "pageType": "document",
    "icon": "询",
    "customerVisible": true,
    "fields": [
      {
        "name": "purchaseRequest",
        "label": "采购申请",
        "type": "select",
        "required": true,
        "options": [
          "PR-202609-001",
          "PR-202609-002"
        ]
      },
      {
        "name": "supplier",
        "label": "供应商",
        "type": "select",
        "required": true,
        "options": [
          "安澜医疗用品有限公司",
          "明康检验设备有限公司",
          "嘉禾健康科技有限公司",
          "华信医用耗材有限公司"
        ]
      },
      {
        "name": "material",
        "label": "物料",
        "type": "select",
        "required": true,
        "options": [
          "动态心电监测耗材包",
          "一次性采血针",
          "真空采血管",
          "医用外科口罩"
        ]
      },
      {
        "name": "quoteAmount",
        "label": "报价金额",
        "type": "number",
        "required": true
      },
      {
        "name": "taxRate",
        "label": "税率",
        "type": "number",
        "required": true
      },
      {
        "name": "comparisonResult",
        "label": "比价结果",
        "type": "select",
        "required": true,
        "options": [
          "最低报价",
          "交期最优",
          "综合评分最优",
          "存在差异"
        ]
      },
      {
        "name": "quotationDeadline",
        "label": "报价截止",
        "type": "date",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "执行中",
          "已关闭",
          "已取消"
        ]
      }
    ],
    "columns": [
      "purchaseRequest",
      "supplier",
      "material",
      "quoteAmount",
      "taxRate",
      "comparisonResult",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "purchaseRequest",
        "label": "采购申请",
        "type": "select",
        "required": false,
        "options": [
          "PR-202609-001",
          "PR-202609-002"
        ]
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "执行中",
          "已关闭",
          "已取消"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "submit",
      "withdraw",
      "cancel",
      "confirm",
      "close",
      "print",
      "export",
      "approve",
      "reject",
      "delete",
      "import"
    ],
    "rowActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close",
      "approval-approve",
      "approval-reject",
      "resource-delete"
    ],
    "batchActions": [
      "resource-print",
      "resource-export",
      "resource-import"
    ],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close",
      "approval-approve",
      "approval-reject"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "purchase-quote-compare"
    ],
    "editLockedStatuses": [],
    "description": "查询并处理询价比价，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "purchase-order",
    "domainId": "supply",
    "groupId": "supply-purchase",
    "title": "采购订单",
    "entity": "采购订单",
    "pageType": "document",
    "icon": "采",
    "customerVisible": true,
    "fields": [
      {
        "name": "systemNo",
        "label": "采购订单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "purchaseRequest",
        "label": "来源采购申请",
        "type": "search-select",
        "required": true,
        "optionsSource": "purchase-request"
      },
      {
        "name": "selectedQuote",
        "label": "已选报价",
        "type": "search-select",
        "required": true,
        "optionsSource": "purchase-quote-compare"
      },
      {
        "name": "supplier",
        "label": "供应商",
        "type": "select",
        "required": true,
        "options": [
          "安澜医疗用品有限公司",
          "明康检验设备有限公司",
          "嘉禾健康科技有限公司",
          "华信医用耗材有限公司"
        ]
      },
      {
        "name": "material",
        "label": "物料",
        "type": "select",
        "required": true,
        "options": [
          "动态心电监测耗材包",
          "一次性采血针",
          "真空采血管",
          "医用外科口罩"
        ]
      },
      {
        "name": "quantity",
        "label": "采购数量",
        "type": "number",
        "required": true
      },
      {
        "name": "amount",
        "label": "订单金额",
        "type": "number",
        "required": true
      },
      {
        "name": "taxRate",
        "label": "税率",
        "type": "number",
        "required": true
      },
      {
        "name": "expectedArrivalDate",
        "label": "预计到货日期",
        "type": "date",
        "required": true
      },
      {
        "name": "costCenter",
        "label": "成本中心",
        "type": "select",
        "required": true,
        "options": [
          "健康管理中心",
          "医学服务部",
          "护理部",
          "采购管理部"
        ]
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "执行中",
          "已关闭",
          "已取消"
        ]
      }
    ],
    "columns": [
      "systemNo",
      "purchaseRequest",
      "selectedQuote",
      "supplier",
      "material",
      "quantity",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "systemNo",
        "label": "采购订单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "执行中",
          "已关闭",
          "已取消"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "submit",
      "withdraw",
      "cancel",
      "confirm",
      "close",
      "print",
      "export",
      "approve",
      "reject",
      "delete"
    ],
    "rowActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close",
      "approval-approve",
      "approval-reject",
      "resource-delete"
    ],
    "batchActions": [
      "resource-print",
      "resource-export"
    ],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close",
      "approval-approve",
      "approval-reject"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "purchase-order"
    ],
    "editLockedStatuses": [],
    "description": "查询并处理采购订单，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "purchase-inquiry",
    "domainId": "supply",
    "groupId": "supply-purchase",
    "title": "询价单",
    "entity": "询价单",
    "pageType": "document",
    "icon": "询",
    "customerVisible": false,
    "fields": [
      {
        "name": "systemNo",
        "label": "询价单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "supplier",
        "label": "供应商",
        "type": "select",
        "required": true,
        "options": [
          "安澜医疗用品有限公司",
          "明康检验设备有限公司",
          "嘉禾健康科技有限公司",
          "华信医用耗材有限公司"
        ]
      },
      {
        "name": "material",
        "label": "物料",
        "type": "select",
        "required": true,
        "options": [
          "动态心电监测耗材包",
          "一次性采血针",
          "真空采血管",
          "医用外科口罩"
        ]
      },
      {
        "name": "quotationDeadline",
        "label": "报价截止",
        "type": "date",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已发出",
          "已截止",
          "已关闭"
        ]
      }
    ],
    "columns": [
      "systemNo",
      "supplier",
      "material",
      "quotationDeadline",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "systemNo",
        "label": "询价单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已发出",
          "已截止",
          "已关闭"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "submit",
      "withdraw",
      "cancel",
      "confirm",
      "close",
      "print",
      "export",
      "delete"
    ],
    "rowActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close",
      "resource-delete"
    ],
    "batchActions": [
      "resource-print",
      "resource-export"
    ],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "purchase-inquiry"
    ],
    "editLockedStatuses": [],
    "description": "查询并处理询价单，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "purchase-quote",
    "domainId": "supply",
    "groupId": "supply-purchase",
    "title": "供应商报价",
    "entity": "供应商报价",
    "pageType": "document",
    "icon": "报",
    "customerVisible": false,
    "fields": [
      {
        "name": "systemNo",
        "label": "报价单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "supplier",
        "label": "供应商",
        "type": "select",
        "required": true,
        "options": [
          "安澜医疗用品有限公司",
          "明康检验设备有限公司",
          "嘉禾健康科技有限公司",
          "华信医用耗材有限公司"
        ]
      },
      {
        "name": "material",
        "label": "物料",
        "type": "select",
        "required": true,
        "options": [
          "动态心电监测耗材包",
          "一次性采血针",
          "真空采血管",
          "医用外科口罩"
        ]
      },
      {
        "name": "amount",
        "label": "报价金额",
        "type": "number",
        "required": true
      },
      {
        "name": "taxRate",
        "label": "税率",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "待报价",
          "已提交",
          "已采纳",
          "已淘汰"
        ]
      }
    ],
    "columns": [
      "systemNo",
      "supplier",
      "material",
      "amount",
      "taxRate",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "systemNo",
        "label": "报价单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "待报价",
          "已提交",
          "已采纳",
          "已淘汰"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "submit",
      "withdraw",
      "cancel",
      "confirm",
      "close",
      "print",
      "export",
      "delete",
      "import"
    ],
    "rowActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close",
      "resource-delete"
    ],
    "batchActions": [
      "resource-print",
      "resource-export",
      "resource-import"
    ],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "purchase-quote"
    ],
    "editLockedStatuses": [],
    "description": "查询并处理供应商报价，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "inventory-inbound",
    "domainId": "supply",
    "groupId": "supply-receipt",
    "title": "采购入库",
    "entity": "采购入库",
    "pageType": "document",
    "icon": "入",
    "customerVisible": true,
    "fields": [
      {
        "name": "systemNo",
        "label": "入库单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "purchaseOrder",
        "label": "来源采购订单",
        "type": "select",
        "required": true,
        "options": [
          "PO-202609-001",
          "PO-202609-002",
          "PO-202609-003"
        ]
      },
      {
        "name": "supplier",
        "label": "供应商",
        "type": "select",
        "required": true,
        "options": [
          "安澜医疗用品有限公司",
          "明康检验设备有限公司",
          "嘉禾健康科技有限公司",
          "华信医用耗材有限公司"
        ]
      },
      {
        "name": "material",
        "label": "物料",
        "type": "select",
        "required": true,
        "options": [
          "动态心电监测耗材包",
          "一次性采血针",
          "真空采血管",
          "医用外科口罩"
        ]
      },
      {
        "name": "stageStatus",
        "label": "阶段状态",
        "type": "select",
        "required": true,
        "options": [
          "待收货",
          "待验收",
          "待上架",
          "已入库",
          "异常"
        ]
      },
      {
        "name": "arrivalQty",
        "label": "到货数量",
        "type": "number",
        "required": true
      },
      {
        "name": "actualReceivedQty",
        "label": "实收数量",
        "type": "number",
        "required": true
      },
      {
        "name": "qualifiedQty",
        "label": "合格数量",
        "type": "number",
        "required": true
      },
      {
        "name": "unqualifiedQty",
        "label": "不合格数量",
        "type": "number",
        "required": true
      },
      {
        "name": "inspectionResult",
        "label": "验收结论",
        "type": "select",
        "required": true,
        "options": [
          "合格",
          "部分合格",
          "不合格",
          "待复检"
        ]
      },
      {
        "name": "qualityLevel",
        "label": "质量等级",
        "type": "select",
        "required": true,
        "options": [
          "合格",
          "让步接收",
          "拒收"
        ]
      },
      {
        "name": "warehouse",
        "label": "仓库",
        "type": "select",
        "required": true,
        "options": [
          "杭州一号仓",
          "宁波周转仓",
          "滨江冷链仓",
          "嘉兴备件仓"
        ]
      },
      {
        "name": "location",
        "label": "库位",
        "type": "select",
        "required": true,
        "options": [
          "A-01-08",
          "A-02-03",
          "B-01-05",
          "B-03-02"
        ],
        "dependsOn": [
          "warehouse"
        ],
        "optionsSource": "warehouse-location"
      },
      {
        "name": "batch",
        "label": "批次号",
        "type": "text",
        "required": true
      },
      {
        "name": "productionDate",
        "label": "生产日期",
        "type": "date",
        "required": true
      },
      {
        "name": "expiry",
        "label": "失效日期",
        "type": "date",
        "required": true
      },
      {
        "name": "receivedQty",
        "label": "上架数量",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "待收货",
          "待验收",
          "待上架",
          "已入库",
          "异常"
        ]
      }
    ],
    "columns": [
      "systemNo",
      "purchaseOrder",
      "supplier",
      "material",
      "stageStatus",
      "arrivalQty",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "systemNo",
        "label": "入库单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "待收货",
          "待验收",
          "待上架",
          "已入库",
          "异常"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "submit",
      "withdraw",
      "cancel",
      "confirm",
      "close",
      "print",
      "export",
      "delete"
    ],
    "rowActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close",
      "resource-delete"
    ],
    "batchActions": [
      "resource-print",
      "resource-export"
    ],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "receipt-stage",
      "inspection-stage",
      "putaway-stage",
      "operation-log"
    ],
    "editLockedStatuses": [],
    "stageFields": {
      "待收货": [
        "purchaseOrder",
        "material",
        "arrivalQty",
        "actualReceivedQty",
        "batch",
        "productionDate",
        "expiry"
      ],
      "待验收": [
        "inspectionResult",
        "qualityLevel",
        "qualifiedQty",
        "unqualifiedQty"
      ],
      "待上架": [
        "warehouse",
        "location",
        "receivedQty"
      ],
      "已入库": [
        "purchaseOrder",
        "actualReceivedQty",
        "qualifiedQty",
        "warehouse",
        "location",
        "receivedQty"
      ],
      "异常": [
        "purchaseOrder",
        "inspectionResult",
        "qualityLevel",
        "unqualifiedQty"
      ]
    },
    "stageActions": {
      "待收货": [
        "resource-confirm"
      ],
      "待验收": [
        "resource-confirm"
      ],
      "待上架": [
        "resource-confirm"
      ],
      "已入库": [],
      "异常": [
        "resource-update",
        "resource-confirm"
      ]
    },
    "description": "查询并处理采购入库，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "inventory-arrival",
    "domainId": "supply",
    "groupId": "supply-receipt",
    "title": "到货登记",
    "entity": "到货登记",
    "pageType": "document",
    "icon": "到",
    "customerVisible": false,
    "fields": [
      {
        "name": "systemNo",
        "label": "到货登记号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "orderNo",
        "label": "来源采购订单",
        "type": "select",
        "required": true,
        "options": [
          "PO-202609-001",
          "PO-202609-002",
          "PO-202609-003"
        ]
      },
      {
        "name": "supplier",
        "label": "供应商",
        "type": "select",
        "required": true,
        "options": [
          "安澜医疗用品有限公司",
          "明康检验设备有限公司",
          "嘉禾健康科技有限公司",
          "华信医用耗材有限公司"
        ]
      },
      {
        "name": "arrivalDate",
        "label": "到货日期",
        "type": "date",
        "required": true
      },
      {
        "name": "quantity",
        "label": "到货数量",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "待登记",
          "已登记",
          "已转入库"
        ]
      }
    ],
    "columns": [
      "systemNo",
      "orderNo",
      "supplier",
      "arrivalDate",
      "quantity",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "systemNo",
        "label": "到货登记号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "待登记",
          "已登记",
          "已转入库"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "submit",
      "withdraw",
      "cancel",
      "confirm",
      "close",
      "print",
      "export",
      "delete"
    ],
    "rowActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close",
      "resource-delete"
    ],
    "batchActions": [
      "resource-print",
      "resource-export"
    ],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "inventory-arrival"
    ],
    "editLockedStatuses": [],
    "description": "查询并处理到货登记，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "inventory-receipt",
    "domainId": "supply",
    "groupId": "supply-receipt",
    "title": "收货单",
    "entity": "收货单",
    "pageType": "document",
    "icon": "收",
    "customerVisible": false,
    "fields": [
      {
        "name": "systemNo",
        "label": "收货单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "orderNo",
        "label": "来源采购订单",
        "type": "select",
        "required": true,
        "options": [
          "PO-202609-001",
          "PO-202609-002",
          "PO-202609-003"
        ]
      },
      {
        "name": "supplier",
        "label": "供应商",
        "type": "select",
        "required": true,
        "options": [
          "安澜医疗用品有限公司",
          "明康检验设备有限公司",
          "嘉禾健康科技有限公司",
          "华信医用耗材有限公司"
        ]
      },
      {
        "name": "warehouse",
        "label": "仓库",
        "type": "select",
        "required": true,
        "options": [
          "杭州一号仓",
          "宁波周转仓",
          "滨江冷链仓",
          "嘉兴备件仓"
        ]
      },
      {
        "name": "receivedQty",
        "label": "实收数量",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "待收货",
          "已收货",
          "已转验收"
        ]
      }
    ],
    "columns": [
      "systemNo",
      "orderNo",
      "supplier",
      "warehouse",
      "receivedQty",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "systemNo",
        "label": "收货单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "待收货",
          "已收货",
          "已转验收"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "submit",
      "withdraw",
      "cancel",
      "confirm",
      "close",
      "print",
      "export",
      "delete"
    ],
    "rowActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close",
      "resource-delete"
    ],
    "batchActions": [
      "resource-print",
      "resource-export"
    ],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "inventory-receipt"
    ],
    "editLockedStatuses": [],
    "description": "查询并处理收货单，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "inventory-inspection",
    "domainId": "supply",
    "groupId": "supply-receipt",
    "title": "验收单",
    "entity": "验收单",
    "pageType": "document",
    "icon": "验",
    "customerVisible": false,
    "fields": [
      {
        "name": "systemNo",
        "label": "验收单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "orderNo",
        "label": "来源入库单",
        "type": "select",
        "required": true,
        "options": [
          "IN-202609-001",
          "IN-202609-002"
        ]
      },
      {
        "name": "inspectionResult",
        "label": "验收结论",
        "type": "select",
        "required": true,
        "options": [
          "合格",
          "部分合格",
          "不合格",
          "待复检"
        ]
      },
      {
        "name": "qualityLevel",
        "label": "质量等级",
        "type": "select",
        "required": true,
        "options": [
          "合格",
          "让步接收",
          "拒收"
        ]
      },
      {
        "name": "receivedQty",
        "label": "验收数量",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "待验收",
          "验收通过",
          "待复检",
          "验收不合格"
        ]
      }
    ],
    "columns": [
      "systemNo",
      "orderNo",
      "inspectionResult",
      "qualityLevel",
      "receivedQty",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "systemNo",
        "label": "验收单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "待验收",
          "验收通过",
          "待复检",
          "验收不合格"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "submit",
      "withdraw",
      "cancel",
      "confirm",
      "close",
      "print",
      "export"
    ],
    "rowActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close"
    ],
    "batchActions": [
      "resource-print",
      "resource-export"
    ],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "inventory-inspection"
    ],
    "editLockedStatuses": [],
    "description": "查询并处理验收单，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "inventory-ledger",
    "domainId": "supply",
    "groupId": "supply-inventory",
    "title": "库存余额",
    "entity": "库存余额",
    "pageType": "ledger",
    "icon": "库",
    "customerVisible": true,
    "fields": [
      {
        "name": "material",
        "label": "物料",
        "type": "select",
        "required": true,
        "options": [
          "动态心电监测耗材包",
          "一次性采血针",
          "真空采血管",
          "医用外科口罩"
        ]
      },
      {
        "name": "warehouse",
        "label": "仓库",
        "type": "select",
        "required": true,
        "options": [
          "杭州一号仓",
          "宁波周转仓",
          "滨江冷链仓",
          "嘉兴备件仓"
        ]
      },
      {
        "name": "location",
        "label": "库位",
        "type": "select",
        "required": true,
        "options": [
          "A-01-08",
          "A-02-03",
          "B-01-05",
          "B-03-02"
        ],
        "dependsOn": [
          "warehouse"
        ],
        "optionsSource": "warehouse-location"
      },
      {
        "name": "batch",
        "label": "批次",
        "type": "select",
        "required": true,
        "options": [
          "BATCH-202608-A",
          "BATCH-202607-C",
          "BATCH-202609-B"
        ],
        "dependsOn": [
          "warehouse",
          "location"
        ],
        "optionsSource": "inventory-batch"
      },
      {
        "name": "productionDate",
        "label": "生产日期",
        "type": "date",
        "required": true
      },
      {
        "name": "expiry",
        "label": "失效日期",
        "type": "date",
        "required": true
      },
      {
        "name": "availableQty",
        "label": "可用数量",
        "type": "number",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "warningStatus",
        "label": "预警状态",
        "type": "select",
        "required": true,
        "options": [
          "正常",
          "低库存",
          "临期",
          "已冻结",
          "待验收"
        ]
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "正常",
          "冻结",
          "不足",
          "临期"
        ]
      }
    ],
    "columns": [
      "material",
      "warehouse",
      "location",
      "batch",
      "productionDate",
      "expiry",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "material",
        "label": "物料",
        "type": "select",
        "required": false,
        "options": [
          "动态心电监测耗材包",
          "一次性采血针",
          "真空采血管",
          "医用外科口罩"
        ]
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "正常",
          "冻结",
          "不足",
          "临期"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "export"
    ],
    "rowActions": [],
    "batchActions": [
      "resource-export"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      },
      {
        "key": "active",
        "label": "当前有效",
        "tone": "success"
      },
      {
        "key": "pending",
        "label": "待处理",
        "tone": "warning"
      }
    ],
    "relationTabs": [
      "inventory-ledger"
    ],
    "editLockedStatuses": [],
    "description": "查询库存余额的数量、状态和关联业务明细。"
  },
  {
    "id": "inventory-requisition",
    "domainId": "supply",
    "groupId": "supply-inventory",
    "title": "领用与客户耗用",
    "entity": "领用与客户耗用",
    "pageType": "document",
    "icon": "领",
    "customerVisible": true,
    "fields": [
      {
        "name": "systemNo",
        "label": "耗用/领用申请号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "applicant",
        "label": "申请人",
        "type": "select",
        "required": true,
        "options": [
          "孙琪",
          "刘敏",
          "方媛",
          "王主管"
        ]
      },
      {
        "name": "requestDepartment",
        "label": "申请部门",
        "type": "select",
        "required": true,
        "options": [
          "采购管理部",
          "健康管理中心",
          "护理部",
          "医学服务部"
        ]
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "select",
        "required": false,
        "options": [
          "林女士",
          "王先生",
          "赵女士",
          "陈先生"
        ]
      },
      {
        "name": "businessNo",
        "label": "客单/项目",
        "type": "select",
        "required": true,
        "options": [
          "VO-202609-001",
          "VO-202609-002",
          "PRJ-202609-006"
        ]
      },
      {
        "name": "material",
        "label": "物料",
        "type": "select",
        "required": true,
        "options": [
          "动态心电监测耗材包",
          "一次性采血针",
          "真空采血管",
          "医用外科口罩"
        ]
      },
      {
        "name": "warehouse",
        "label": "仓库",
        "type": "select",
        "required": true,
        "options": [
          "杭州一号仓",
          "宁波周转仓",
          "滨江冷链仓",
          "嘉兴备件仓"
        ]
      },
      {
        "name": "location",
        "label": "库位",
        "type": "select",
        "required": true,
        "options": [
          "A-01-08",
          "A-02-03",
          "B-01-05",
          "B-03-02"
        ],
        "dependsOn": [
          "warehouse"
        ],
        "optionsSource": "warehouse-location"
      },
      {
        "name": "batch",
        "label": "批次",
        "type": "select",
        "required": true,
        "options": [
          "BATCH-202608-A",
          "BATCH-202607-C",
          "BATCH-202609-B"
        ],
        "dependsOn": [
          "warehouse",
          "location"
        ],
        "optionsSource": "inventory-batch"
      },
      {
        "name": "quantity",
        "label": "申请数量",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "已完成",
          "已取消",
          "已作废"
        ]
      }
    ],
    "columns": [
      "systemNo",
      "applicant",
      "requestDepartment",
      "customer",
      "businessNo",
      "material",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "systemNo",
        "label": "耗用/领用申请号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "已完成",
          "已取消",
          "已作废"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "submit",
      "withdraw",
      "cancel",
      "approve",
      "reject",
      "void",
      "archive"
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "approval-approve",
      "approval-reject",
      "resource-void",
      "resource-archive"
    ],
    "batchActions": [
      "resource-archive"
    ],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "approval-approve",
      "approval-reject",
      "resource-void",
      "resource-archive"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "inventory-requisition"
    ],
    "editLockedStatuses": [],
    "description": "查询并处理领用与客户耗用，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "inventory-transfer",
    "domainId": "supply",
    "groupId": "supply-inventory",
    "title": "调拨单",
    "entity": "调拨单",
    "pageType": "document",
    "icon": "调",
    "customerVisible": false,
    "fields": [
      {
        "name": "systemNo",
        "label": "调拨单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "material",
        "label": "物料",
        "type": "select",
        "required": true,
        "options": [
          "动态心电监测耗材包",
          "一次性采血针",
          "真空采血管",
          "医用外科口罩"
        ]
      },
      {
        "name": "sourceWarehouse",
        "label": "调出仓库",
        "type": "select",
        "required": true,
        "options": [
          "杭州一号仓",
          "宁波周转仓",
          "滨江冷链仓",
          "嘉兴备件仓"
        ]
      },
      {
        "name": "sourceLocation",
        "label": "调出库位",
        "type": "select",
        "required": true,
        "options": [
          "A-01-08",
          "A-02-03",
          "B-01-05",
          "B-03-02"
        ],
        "dependsOn": [
          "sourceWarehouse"
        ],
        "optionsSource": "warehouse-location"
      },
      {
        "name": "targetWarehouse",
        "label": "调入仓库",
        "type": "select",
        "required": true,
        "options": [
          "杭州一号仓",
          "宁波周转仓",
          "滨江冷链仓",
          "嘉兴备件仓"
        ]
      },
      {
        "name": "targetLocation",
        "label": "调入库位",
        "type": "select",
        "required": true,
        "options": [
          "A-01-08",
          "A-02-03",
          "B-01-05",
          "B-03-02"
        ],
        "dependsOn": [
          "targetWarehouse"
        ],
        "optionsSource": "warehouse-location"
      },
      {
        "name": "batch",
        "label": "批次",
        "type": "select",
        "required": true,
        "options": [
          "BATCH-202608-A",
          "BATCH-202607-C",
          "BATCH-202609-B"
        ],
        "dependsOn": [
          "sourceWarehouse",
          "sourceLocation"
        ],
        "optionsSource": "inventory-batch"
      },
      {
        "name": "quantity",
        "label": "调拨数量",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "已完成",
          "已取消",
          "已作废"
        ]
      }
    ],
    "columns": [
      "systemNo",
      "material",
      "sourceWarehouse",
      "sourceLocation",
      "targetWarehouse",
      "targetLocation",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "systemNo",
        "label": "调拨单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "已完成",
          "已取消",
          "已作废"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "submit",
      "withdraw",
      "cancel",
      "approve",
      "reject",
      "void",
      "archive"
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "approval-approve",
      "approval-reject",
      "resource-void",
      "resource-archive"
    ],
    "batchActions": [
      "resource-archive"
    ],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "approval-approve",
      "approval-reject",
      "resource-void",
      "resource-archive"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "inventory-transfer"
    ],
    "editLockedStatuses": [],
    "description": "查询并处理调拨单，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "inventory-stocktake",
    "domainId": "supply",
    "groupId": "supply-inventory",
    "title": "盘点单",
    "entity": "盘点单",
    "pageType": "document",
    "icon": "盘",
    "customerVisible": false,
    "fields": [
      {
        "name": "systemNo",
        "label": "盘点单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "warehouse",
        "label": "仓库",
        "type": "select",
        "required": true,
        "options": [
          "杭州一号仓",
          "宁波周转仓",
          "滨江冷链仓",
          "嘉兴备件仓"
        ]
      },
      {
        "name": "location",
        "label": "库位",
        "type": "select",
        "required": true,
        "options": [
          "A-01-08",
          "A-02-03",
          "B-01-05",
          "B-03-02"
        ],
        "dependsOn": [
          "warehouse"
        ],
        "optionsSource": "warehouse-location"
      },
      {
        "name": "material",
        "label": "物料",
        "type": "select",
        "required": true,
        "options": [
          "动态心电监测耗材包",
          "一次性采血针",
          "真空采血管",
          "医用外科口罩"
        ]
      },
      {
        "name": "batch",
        "label": "批次",
        "type": "select",
        "required": true,
        "options": [
          "BATCH-202608-A",
          "BATCH-202607-C",
          "BATCH-202609-B"
        ],
        "dependsOn": [
          "warehouse",
          "location"
        ],
        "optionsSource": "inventory-batch"
      },
      {
        "name": "availableQty",
        "label": "账面数量",
        "type": "number",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "quantity",
        "label": "实盘数量",
        "type": "number",
        "required": true
      },
      {
        "name": "differenceQty",
        "label": "差异数量",
        "type": "number",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "date",
        "label": "盘点日期",
        "type": "date",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "已完成",
          "已取消",
          "已作废"
        ]
      }
    ],
    "columns": [
      "systemNo",
      "warehouse",
      "location",
      "material",
      "batch",
      "availableQty",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "systemNo",
        "label": "盘点单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "已完成",
          "已取消",
          "已作废"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "submit",
      "withdraw",
      "cancel",
      "approve",
      "reject",
      "void",
      "archive",
      "confirm"
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "approval-approve",
      "approval-reject",
      "resource-void",
      "resource-archive",
      "resource-confirm"
    ],
    "batchActions": [
      "resource-archive"
    ],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "approval-approve",
      "approval-reject",
      "resource-void",
      "resource-archive",
      "resource-confirm"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "inventory-stocktake"
    ],
    "editLockedStatuses": [],
    "description": "查询并处理盘点单，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "inventory-scrap",
    "domainId": "supply",
    "groupId": "supply-inventory",
    "title": "报废单",
    "entity": "报废单",
    "pageType": "document",
    "icon": "报",
    "customerVisible": false,
    "fields": [
      {
        "name": "systemNo",
        "label": "报废单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "material",
        "label": "物料",
        "type": "select",
        "required": true,
        "options": [
          "动态心电监测耗材包",
          "一次性采血针",
          "真空采血管",
          "医用外科口罩"
        ]
      },
      {
        "name": "warehouse",
        "label": "仓库",
        "type": "select",
        "required": true,
        "options": [
          "杭州一号仓",
          "宁波周转仓",
          "滨江冷链仓",
          "嘉兴备件仓"
        ]
      },
      {
        "name": "location",
        "label": "库位",
        "type": "select",
        "required": true,
        "options": [
          "A-01-08",
          "A-02-03",
          "B-01-05",
          "B-03-02"
        ],
        "dependsOn": [
          "warehouse"
        ],
        "optionsSource": "warehouse-location"
      },
      {
        "name": "batch",
        "label": "批次",
        "type": "select",
        "required": true,
        "options": [
          "BATCH-202608-A",
          "BATCH-202607-C",
          "BATCH-202609-B"
        ],
        "dependsOn": [
          "warehouse",
          "location"
        ],
        "optionsSource": "inventory-batch"
      },
      {
        "name": "quantity",
        "label": "报废数量",
        "type": "number",
        "required": true
      },
      {
        "name": "disposalReason",
        "label": "报废原因",
        "type": "select",
        "required": true,
        "options": [
          "过期失效",
          "质量不合格",
          "破损污染",
          "盘亏确认",
          "其他"
        ]
      },
      {
        "name": "reason",
        "label": "处理说明",
        "type": "textarea",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "已完成",
          "已取消",
          "已作废"
        ]
      }
    ],
    "columns": [
      "systemNo",
      "material",
      "warehouse",
      "location",
      "batch",
      "quantity",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "systemNo",
        "label": "报废单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "已完成",
          "已取消",
          "已作废"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "submit",
      "withdraw",
      "cancel",
      "approve",
      "reject",
      "void",
      "archive"
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "approval-approve",
      "approval-reject",
      "resource-void",
      "resource-archive"
    ],
    "batchActions": [
      "resource-archive"
    ],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "approval-approve",
      "approval-reject",
      "resource-void",
      "resource-archive"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "inventory-scrap"
    ],
    "editLockedStatuses": [],
    "description": "查询并处理报废单，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "inventory-flow",
    "domainId": "supply",
    "groupId": "supply-inventory",
    "title": "库存流水",
    "entity": "库存流水",
    "pageType": "ledger",
    "icon": "流",
    "customerVisible": true,
    "fields": [
      {
        "name": "flowType",
        "label": "流水类型",
        "type": "select",
        "required": true,
        "options": [
          "采购入库",
          "客户耗用出库",
          "领用出库",
          "调拨出库",
          "调拨入库",
          "盘点调整",
          "报废出库",
          "撤回回补"
        ]
      },
      {
        "name": "businessNo",
        "label": "来源单据",
        "type": "select",
        "required": true,
        "options": [
          "IN-202609-001",
          "MU-202609-001",
          "TR-202609-001"
        ]
      },
      {
        "name": "material",
        "label": "物料",
        "type": "select",
        "required": true,
        "options": [
          "动态心电监测耗材包",
          "一次性采血针",
          "真空采血管",
          "医用外科口罩"
        ]
      },
      {
        "name": "warehouse",
        "label": "仓库",
        "type": "select",
        "required": true,
        "options": [
          "杭州一号仓",
          "宁波周转仓",
          "滨江冷链仓",
          "嘉兴备件仓"
        ]
      },
      {
        "name": "location",
        "label": "库位",
        "type": "select",
        "required": true,
        "options": [
          "A-01-08",
          "A-02-03",
          "B-01-05",
          "B-03-02"
        ],
        "dependsOn": [
          "warehouse"
        ],
        "optionsSource": "warehouse-location"
      },
      {
        "name": "batch",
        "label": "批次",
        "type": "select",
        "required": true,
        "options": [
          "BATCH-202608-A",
          "BATCH-202607-C",
          "BATCH-202609-B"
        ],
        "dependsOn": [
          "warehouse",
          "location"
        ],
        "optionsSource": "inventory-batch"
      },
      {
        "name": "beforeQty",
        "label": "变更前数量",
        "type": "number",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "changeQty",
        "label": "变更数量",
        "type": "number",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "afterQty",
        "label": "变更后数量",
        "type": "number",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "systemNo",
        "label": "流水审计号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "已记账",
          "已冲销"
        ]
      }
    ],
    "columns": [
      "flowType",
      "businessNo",
      "material",
      "warehouse",
      "location",
      "batch",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "flowType",
        "label": "流水类型",
        "type": "select",
        "required": false,
        "options": [
          "采购入库",
          "客户耗用出库",
          "领用出库",
          "调拨出库",
          "调拨入库",
          "盘点调整",
          "报废出库",
          "撤回回补"
        ]
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "已记账",
          "已冲销"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "export"
    ],
    "rowActions": [],
    "batchActions": [
      "resource-export"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      },
      {
        "key": "active",
        "label": "当前有效",
        "tone": "success"
      },
      {
        "key": "pending",
        "label": "待处理",
        "tone": "warning"
      }
    ],
    "relationTabs": [
      "inventory-flow"
    ],
    "editLockedStatuses": [],
    "description": "查询库存流水的数量、状态和关联业务明细。"
  },
  {
    "id": "inventory-operations",
    "domainId": "supply",
    "groupId": "supply-inventory",
    "title": "库存作业",
    "entity": "库存作业",
    "pageType": "document",
    "icon": "作",
    "customerVisible": true,
    "fields": [
      {
        "name": "operationType",
        "label": "作业类型",
        "type": "select",
        "required": true,
        "options": [
          "调拨",
          "盘点",
          "报废"
        ]
      },
      {
        "name": "warehouse",
        "label": "仓库",
        "type": "select",
        "required": true,
        "options": [
          "杭州一号仓",
          "宁波周转仓",
          "滨江冷链仓",
          "嘉兴备件仓"
        ]
      },
      {
        "name": "material",
        "label": "物料",
        "type": "select",
        "required": true,
        "options": [
          "动态心电监测耗材包",
          "一次性采血针",
          "真空采血管",
          "医用外科口罩"
        ]
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "盘点中",
          "已完成",
          "已作废"
        ]
      }
    ],
    "columns": [
      "operationType",
      "warehouse",
      "material",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "operationType",
        "label": "作业类型",
        "type": "select",
        "required": false,
        "options": [
          "调拨",
          "盘点",
          "报废"
        ]
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "盘点中",
          "已完成",
          "已作废"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "submit",
      "confirm",
      "cancel"
    ],
    "rowActions": [
      "resource-submit",
      "resource-confirm",
      "resource-cancel"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-submit",
      "resource-confirm",
      "resource-cancel"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "inventory-transfer",
      "inventory-stocktake",
      "inventory-scrap"
    ],
    "editLockedStatuses": [],
    "description": "查询并处理库存作业，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "asset-category",
    "domainId": "supply",
    "groupId": "supply-asset",
    "title": "资产分类",
    "entity": "资产分类",
    "pageType": "master",
    "icon": "资",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "资产分类名称",
        "type": "text",
        "required": true
      },
      {
        "name": "scope",
        "label": "适用范围",
        "type": "text",
        "required": true
      },
      {
        "name": "depreciationYears",
        "label": "折旧年限",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "scope",
      "depreciationYears",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "scope",
        "label": "适用范围",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "已启用",
          "已停用"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "asset-category"
    ],
    "editLockedStatuses": [],
    "description": "维护资产分类，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "asset-card",
    "domainId": "supply",
    "groupId": "supply-asset",
    "title": "资产资料",
    "entity": "资产资料",
    "pageType": "master",
    "icon": "资",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "资产名称",
        "type": "text",
        "required": true
      },
      {
        "name": "assetCode",
        "label": "资产编号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按资产编码规则自动生成。"
      },
      {
        "name": "assetCategory",
        "label": "资产分类",
        "type": "search-select",
        "required": true,
        "optionsSource": "asset-category"
      },
      {
        "name": "sourcePurchaseOrder",
        "label": "来源采购订单",
        "type": "search-select",
        "required": false,
        "optionsSource": "purchase-order"
      },
      {
        "name": "sourceInbound",
        "label": "来源入库单",
        "type": "search-select",
        "required": false,
        "optionsSource": "inventory-inbound"
      },
      {
        "name": "brandModel",
        "label": "品牌型号",
        "type": "text",
        "required": true
      },
      {
        "name": "organization",
        "label": "所属组织",
        "type": "select",
        "required": true,
        "options": [
          "健康管理中心",
          "宁波服务中心"
        ]
      },
      {
        "name": "department",
        "label": "使用部门",
        "type": "select",
        "required": true,
        "options": [
          "采购管理部",
          "健康管理中心",
          "护理部",
          "医学服务部"
        ]
      },
      {
        "name": "custodian",
        "label": "保管人",
        "type": "search-select",
        "required": true,
        "optionsSource": "hr-employee"
      },
      {
        "name": "location",
        "label": "存放位置",
        "type": "cascader",
        "required": true,
        "optionsSource": "warehouse-location"
      },
      {
        "name": "assetValue",
        "label": "资产原值",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "使用中",
          "维修中",
          "已归档",
          "已报废"
        ]
      }
    ],
    "columns": [
      "name",
      "assetCode",
      "assetCategory",
      "sourcePurchaseOrder",
      "sourceInbound",
      "brandModel",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "assetCode",
        "label": "资产编号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按资产编码规则自动生成。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "使用中",
          "维修中",
          "已归档",
          "已报废"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable",
      "import"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable",
      "resource-import"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "asset-card"
    ],
    "editLockedStatuses": [],
    "description": "维护资产资料，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "asset-use",
    "domainId": "supply",
    "groupId": "supply-asset",
    "title": "资产领用单",
    "entity": "资产领用单",
    "pageType": "document",
    "icon": "资",
    "customerVisible": true,
    "fields": [
      {
        "name": "systemNo",
        "label": "资产领用单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "assetCode",
        "label": "资产",
        "type": "search-select",
        "required": true,
        "optionsSource": "asset-card"
      },
      {
        "name": "employee",
        "label": "领用人",
        "type": "search-select",
        "required": true,
        "optionsSource": "hr-employee"
      },
      {
        "name": "date",
        "label": "领用日期",
        "type": "date",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "使用中",
          "维修中",
          "已归档",
          "已报废"
        ]
      }
    ],
    "columns": [
      "systemNo",
      "assetCode",
      "employee",
      "date",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "systemNo",
        "label": "资产领用单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "使用中",
          "维修中",
          "已归档",
          "已报废"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "submit",
      "withdraw",
      "cancel",
      "approve",
      "reject",
      "confirm"
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "approval-approve",
      "approval-reject",
      "resource-confirm"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "approval-approve",
      "approval-reject",
      "resource-confirm"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "asset-use"
    ],
    "editLockedStatuses": [],
    "description": "查询并处理资产领用单，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "asset-return",
    "domainId": "supply",
    "groupId": "supply-asset",
    "title": "资产归还单",
    "entity": "资产归还单",
    "pageType": "document",
    "icon": "资",
    "customerVisible": true,
    "fields": [
      {
        "name": "systemNo",
        "label": "资产归还单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "assetCode",
        "label": "资产",
        "type": "search-select",
        "required": true,
        "optionsSource": "asset-card"
      },
      {
        "name": "employee",
        "label": "归还人",
        "type": "search-select",
        "required": true,
        "optionsSource": "hr-employee"
      },
      {
        "name": "location",
        "label": "归还位置",
        "type": "cascader",
        "required": true,
        "optionsSource": "warehouse-location"
      },
      {
        "name": "date",
        "label": "归还日期",
        "type": "date",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "使用中",
          "维修中",
          "已归档",
          "已报废"
        ]
      }
    ],
    "columns": [
      "systemNo",
      "assetCode",
      "employee",
      "location",
      "date",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "systemNo",
        "label": "资产归还单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "使用中",
          "维修中",
          "已归档",
          "已报废"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "submit",
      "withdraw",
      "cancel",
      "confirm"
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "asset-return"
    ],
    "editLockedStatuses": [],
    "description": "查询并处理资产归还单，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "asset-transfer",
    "domainId": "supply",
    "groupId": "supply-asset",
    "title": "资产调拨单",
    "entity": "资产调拨单",
    "pageType": "document",
    "icon": "资",
    "customerVisible": true,
    "fields": [
      {
        "name": "systemNo",
        "label": "资产调拨单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "assetCode",
        "label": "资产",
        "type": "search-select",
        "required": true,
        "optionsSource": "asset-card"
      },
      {
        "name": "organization",
        "label": "调入组织",
        "type": "select",
        "required": true,
        "options": [
          "健康管理中心",
          "宁波服务中心"
        ]
      },
      {
        "name": "department",
        "label": "调入部门",
        "type": "select",
        "required": true,
        "options": [
          "采购管理部",
          "健康管理中心",
          "护理部",
          "医学服务部"
        ]
      },
      {
        "name": "location",
        "label": "调入位置",
        "type": "cascader",
        "required": true,
        "optionsSource": "warehouse-location"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "使用中",
          "维修中",
          "已归档",
          "已报废"
        ]
      }
    ],
    "columns": [
      "systemNo",
      "assetCode",
      "organization",
      "department",
      "location",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "systemNo",
        "label": "资产调拨单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "使用中",
          "维修中",
          "已归档",
          "已报废"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "submit",
      "withdraw",
      "cancel"
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "asset-transfer"
    ],
    "editLockedStatuses": [],
    "description": "查询并处理资产调拨单，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "asset-maintenance",
    "domainId": "supply",
    "groupId": "supply-asset",
    "title": "资产维修单",
    "entity": "资产维修单",
    "pageType": "document",
    "icon": "资",
    "customerVisible": true,
    "fields": [
      {
        "name": "systemNo",
        "label": "资产维修单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "assetCode",
        "label": "资产",
        "type": "search-select",
        "required": true,
        "optionsSource": "asset-card"
      },
      {
        "name": "maintenanceVendor",
        "label": "维修单位",
        "type": "text",
        "required": true
      },
      {
        "name": "amount",
        "label": "维修金额",
        "type": "number",
        "required": true
      },
      {
        "name": "reason",
        "label": "原因/说明",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "使用中",
          "维修中",
          "已归档",
          "已报废"
        ]
      }
    ],
    "columns": [
      "systemNo",
      "assetCode",
      "maintenanceVendor",
      "amount",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "systemNo",
        "label": "资产维修单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "使用中",
          "维修中",
          "已归档",
          "已报废"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "submit",
      "withdraw",
      "cancel",
      "confirm",
      "archive"
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-archive"
    ],
    "batchActions": [
      "resource-archive"
    ],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-archive"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "asset-maintenance"
    ],
    "editLockedStatuses": [],
    "description": "查询并处理资产维修单，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "asset-stocktake",
    "domainId": "supply",
    "groupId": "supply-asset",
    "title": "资产盘点任务",
    "entity": "资产盘点任务",
    "pageType": "document",
    "icon": "资",
    "customerVisible": true,
    "fields": [
      {
        "name": "systemNo",
        "label": "资产盘点任务号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "assetCode",
        "label": "资产",
        "type": "search-select",
        "required": true,
        "optionsSource": "asset-card"
      },
      {
        "name": "organization",
        "label": "盘点组织",
        "type": "select",
        "required": true,
        "options": [
          "健康管理中心",
          "宁波服务中心"
        ]
      },
      {
        "name": "date",
        "label": "盘点日期",
        "type": "date",
        "required": true
      },
      {
        "name": "result",
        "label": "盘点结果",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "使用中",
          "维修中",
          "已归档",
          "已报废"
        ]
      }
    ],
    "columns": [
      "systemNo",
      "assetCode",
      "organization",
      "date",
      "result",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "systemNo",
        "label": "资产盘点任务号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "使用中",
          "维修中",
          "已归档",
          "已报废"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "submit",
      "withdraw",
      "cancel",
      "archive",
      "confirm"
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-archive",
      "resource-confirm"
    ],
    "batchActions": [
      "resource-archive"
    ],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-archive",
      "resource-confirm"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "asset-stocktake"
    ],
    "editLockedStatuses": [],
    "description": "查询并处理资产盘点任务，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "asset-scrap",
    "domainId": "supply",
    "groupId": "supply-asset",
    "title": "资产报废申请",
    "entity": "资产报废申请",
    "pageType": "document",
    "icon": "资",
    "customerVisible": true,
    "fields": [
      {
        "name": "systemNo",
        "label": "资产报废申请号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "assetCode",
        "label": "资产",
        "type": "search-select",
        "required": true,
        "optionsSource": "asset-card"
      },
      {
        "name": "disposalMethod",
        "label": "处置方式",
        "type": "text",
        "required": true
      },
      {
        "name": "reason",
        "label": "原因/说明",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "使用中",
          "维修中",
          "已归档",
          "已报废"
        ]
      }
    ],
    "columns": [
      "systemNo",
      "assetCode",
      "disposalMethod",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "systemNo",
        "label": "资产报废申请号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "使用中",
          "维修中",
          "已归档",
          "已报废"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "submit",
      "withdraw",
      "cancel",
      "approve",
      "reject",
      "archive"
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "approval-approve",
      "approval-reject",
      "resource-archive"
    ],
    "batchActions": [
      "resource-archive"
    ],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "approval-approve",
      "approval-reject",
      "resource-archive"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "asset-scrap"
    ],
    "editLockedStatuses": [],
    "description": "查询并处理资产报废申请，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "asset-depreciation",
    "domainId": "supply",
    "groupId": "supply-asset",
    "title": "折旧管理",
    "entity": "折旧记录",
    "pageType": "ledger",
    "icon": "折",
    "customerVisible": true,
    "fields": [
      {
        "name": "assetCode",
        "label": "资产",
        "type": "search-select",
        "required": true,
        "optionsSource": "asset-card"
      },
      {
        "name": "period",
        "label": "折旧期间",
        "type": "date",
        "required": true
      },
      {
        "name": "openingNetValue",
        "label": "期初净值",
        "type": "number",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "depreciationAmount",
        "label": "本期折旧额",
        "type": "number",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "closingNetValue",
        "label": "期末净值",
        "type": "number",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "待计提",
          "已计提",
          "已冲销"
        ],
        "system": true
      }
    ],
    "columns": [
      "assetCode",
      "period",
      "openingNetValue",
      "depreciationAmount",
      "closingNetValue",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "assetCode",
        "label": "资产",
        "type": "search-select",
        "required": false,
        "optionsSource": "asset-card"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "待计提",
          "已计提",
          "已冲销"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "export",
      "confirm"
    ],
    "rowActions": [
      "resource-confirm"
    ],
    "batchActions": [
      "resource-export"
    ],
    "statusActions": [
      "resource-confirm"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      },
      {
        "key": "active",
        "label": "当前有效",
        "tone": "success"
      },
      {
        "key": "pending",
        "label": "待处理",
        "tone": "warning"
      }
    ],
    "relationTabs": [
      "asset-card",
      "asset-lifecycle"
    ],
    "editLockedStatuses": [],
    "description": "查询折旧管理的数量、状态和关联业务明细。"
  },
  {
    "id": "asset-lifecycle",
    "domainId": "supply",
    "groupId": "supply-asset",
    "title": "生命周期记录",
    "entity": "资产生命周期记录",
    "pageType": "ledger",
    "icon": "历",
    "customerVisible": true,
    "fields": [
      {
        "name": "assetCode",
        "label": "资产",
        "type": "search-select",
        "required": true,
        "optionsSource": "asset-card"
      },
      {
        "name": "businessType",
        "label": "业务类型",
        "type": "select",
        "required": true,
        "options": [
          "建档",
          "领用",
          "借出",
          "归还",
          "调拨",
          "维修",
          "盘点",
          "折旧",
          "报废"
        ]
      },
      {
        "name": "businessNo",
        "label": "来源单据",
        "type": "search-select",
        "required": true,
        "optionsSource": "asset-business"
      },
      {
        "name": "previousCustodian",
        "label": "原保管人",
        "type": "search-select",
        "required": false,
        "optionsSource": "employee"
      },
      {
        "name": "currentCustodian",
        "label": "新保管人",
        "type": "search-select",
        "required": false,
        "optionsSource": "employee"
      },
      {
        "name": "location",
        "label": "当前位置",
        "type": "cascader",
        "required": false,
        "optionsSource": "warehouse-location"
      },
      {
        "name": "occurredAt",
        "label": "发生时间",
        "type": "datetime-local",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "已完成",
          "处理中",
          "已冲销"
        ],
        "system": true
      }
    ],
    "columns": [
      "assetCode",
      "businessType",
      "businessNo",
      "previousCustodian",
      "currentCustodian",
      "location",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "assetCode",
        "label": "资产",
        "type": "search-select",
        "required": false,
        "optionsSource": "asset-card"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "已完成",
          "处理中",
          "已冲销"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "export"
    ],
    "rowActions": [],
    "batchActions": [
      "resource-export"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      },
      {
        "key": "active",
        "label": "当前有效",
        "tone": "success"
      },
      {
        "key": "pending",
        "label": "待处理",
        "tone": "warning"
      }
    ],
    "relationTabs": [
      "asset-card"
    ],
    "editLockedStatuses": [],
    "description": "查询生命周期记录的数量、状态和关联业务明细。"
  },
  {
    "id": "integration-project",
    "domainId": "supply",
    "groupId": "supply-integration",
    "title": "对接项目",
    "entity": "对接项目",
    "pageType": "master",
    "icon": "接",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "sourceSystem",
        "label": "来源系统",
        "type": "text",
        "required": true
      },
      {
        "name": "direction",
        "label": "接口方向",
        "type": "text",
        "required": true
      },
      {
        "name": "endpoint",
        "label": "接口地址",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待执行",
          "执行中",
          "成功",
          "失败",
          "已补偿"
        ]
      }
    ],
    "columns": [
      "name",
      "sourceSystem",
      "direction",
      "endpoint",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "sourceSystem",
        "label": "来源系统",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待执行",
          "执行中",
          "成功",
          "失败",
          "已补偿"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "integration-project"
    ],
    "editLockedStatuses": [],
    "description": "维护对接项目，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "integration-field-map",
    "domainId": "supply",
    "groupId": "supply-integration",
    "title": "字段映射",
    "entity": "字段映射",
    "pageType": "master",
    "icon": "接",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "sourceSystem",
        "label": "来源系统",
        "type": "text",
        "required": true
      },
      {
        "name": "externalCode",
        "label": "外部编码",
        "type": "text",
        "required": true
      },
      {
        "name": "standardCode",
        "label": "标准编码",
        "type": "text",
        "required": true
      },
      {
        "name": "mappingRule",
        "label": "映射规则",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待执行",
          "执行中",
          "成功",
          "失败",
          "已补偿"
        ]
      }
    ],
    "columns": [
      "name",
      "sourceSystem",
      "externalCode",
      "standardCode",
      "mappingRule",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "sourceSystem",
        "label": "来源系统",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待执行",
          "执行中",
          "成功",
          "失败",
          "已补偿"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable",
      "import",
      "export",
      "execute"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable",
      "resource-import",
      "resource-export"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [
      "integration-execute"
    ],
    "pageActions": [
      "integration-execute"
    ],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "integration-field-map"
    ],
    "editLockedStatuses": [],
    "description": "维护字段映射，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "integration-code-map",
    "domainId": "supply",
    "groupId": "supply-integration",
    "title": "编码转换关系",
    "entity": "编码转换关系",
    "pageType": "master",
    "icon": "接",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "sourceSystem",
        "label": "来源系统",
        "type": "text",
        "required": true
      },
      {
        "name": "externalCode",
        "label": "外部编码",
        "type": "text",
        "required": true
      },
      {
        "name": "standardCode",
        "label": "标准编码",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待执行",
          "执行中",
          "成功",
          "失败",
          "已补偿"
        ]
      }
    ],
    "columns": [
      "name",
      "sourceSystem",
      "externalCode",
      "standardCode",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "sourceSystem",
        "label": "来源系统",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待执行",
          "执行中",
          "成功",
          "失败",
          "已补偿"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable",
      "import",
      "export"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable",
      "resource-import",
      "resource-export"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "integration-code-map"
    ],
    "editLockedStatuses": [],
    "description": "维护编码转换关系，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "integration-call",
    "domainId": "supply",
    "groupId": "supply-integration",
    "title": "接口调用记录",
    "entity": "接口调用记录",
    "pageType": "interface",
    "icon": "接",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "businessId",
        "label": "业务单号",
        "type": "text",
        "required": true
      },
      {
        "name": "direction",
        "label": "接口方向",
        "type": "text",
        "required": true
      },
      {
        "name": "endpoint",
        "label": "接口地址",
        "type": "text",
        "required": true
      },
      {
        "name": "attempts",
        "label": "调用次数",
        "type": "number",
        "required": true
      },
      {
        "name": "result",
        "label": "处理结果",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待执行",
          "执行中",
          "成功",
          "失败",
          "已补偿"
        ]
      }
    ],
    "columns": [
      "name",
      "businessId",
      "direction",
      "endpoint",
      "attempts",
      "result",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "businessId",
        "label": "业务单号",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待执行",
          "执行中",
          "成功",
          "失败",
          "已补偿"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "execute",
      "retry",
      "compensate",
      "update",
      "export"
    ],
    "rowActions": [
      "integration-execute",
      "integration-retry",
      "integration-compensate"
    ],
    "batchActions": [
      "resource-export"
    ],
    "statusActions": [
      "integration-execute",
      "integration-retry",
      "integration-compensate"
    ],
    "integrationActions": [
      "integration-execute",
      "integration-retry",
      "integration-compensate"
    ],
    "coverageIntegrationActions": [
      "integration-execute",
      "integration-retry",
      "integration-compensate"
    ],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "integration-call"
    ],
    "editLockedStatuses": [],
    "description": "查看接口调用记录执行状态、失败原因、重试和人工补偿结果。"
  },
  {
    "id": "integration-failure",
    "domainId": "supply",
    "groupId": "supply-integration",
    "title": "失败数据处理",
    "entity": "失败数据处理",
    "pageType": "interface",
    "icon": "接",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "businessId",
        "label": "业务单号",
        "type": "text",
        "required": true
      },
      {
        "name": "errorMessage",
        "label": "失败原因",
        "type": "text",
        "required": true
      },
      {
        "name": "attempts",
        "label": "重试次数",
        "type": "number",
        "required": true
      },
      {
        "name": "result",
        "label": "处理结果",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待执行",
          "执行中",
          "成功",
          "失败",
          "已补偿"
        ]
      }
    ],
    "columns": [
      "name",
      "businessId",
      "attempts",
      "result",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "businessId",
        "label": "业务单号",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待执行",
          "执行中",
          "成功",
          "失败",
          "已补偿"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "execute",
      "retry",
      "compensate",
      "create"
    ],
    "rowActions": [
      "integration-execute",
      "integration-retry",
      "integration-compensate"
    ],
    "batchActions": [],
    "statusActions": [
      "integration-execute",
      "integration-retry",
      "integration-compensate"
    ],
    "integrationActions": [
      "integration-execute",
      "integration-retry",
      "integration-compensate"
    ],
    "coverageIntegrationActions": [
      "integration-execute",
      "integration-retry",
      "integration-compensate"
    ],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "integration-failure"
    ],
    "editLockedStatuses": [],
    "description": "查看失败数据处理执行状态、失败原因、重试和人工补偿结果。"
  },
  {
    "id": "integration-init",
    "domainId": "supply",
    "groupId": "supply-integration",
    "title": "数据初始化任务",
    "entity": "数据初始化任务",
    "pageType": "interface",
    "icon": "接",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "scope",
        "label": "数据范围",
        "type": "text",
        "required": true
      },
      {
        "name": "batch",
        "label": "批次",
        "type": "text",
        "required": true
      },
      {
        "name": "fileName",
        "label": "文件名",
        "type": "text",
        "required": true
      },
      {
        "name": "effectiveTime",
        "label": "执行时间",
        "type": "datetime-local",
        "required": true
      },
      {
        "name": "sourceSystem",
        "label": "来源系统",
        "type": "text",
        "required": true
      },
      {
        "name": "result",
        "label": "处理结果",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待执行",
          "执行中",
          "成功",
          "失败",
          "已补偿"
        ]
      }
    ],
    "columns": [
      "name",
      "scope",
      "batch",
      "fileName",
      "effectiveTime",
      "sourceSystem",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "scope",
        "label": "数据范围",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待执行",
          "执行中",
          "成功",
          "失败",
          "已补偿"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "execute",
      "retry",
      "compensate",
      "create",
      "submit",
      "confirm",
      "cancel"
    ],
    "rowActions": [
      "integration-execute",
      "integration-retry",
      "integration-compensate",
      "resource-submit",
      "resource-confirm",
      "resource-cancel"
    ],
    "batchActions": [],
    "statusActions": [
      "integration-execute",
      "integration-retry",
      "integration-compensate",
      "resource-submit",
      "resource-confirm",
      "resource-cancel"
    ],
    "integrationActions": [
      "integration-execute",
      "integration-retry",
      "integration-compensate"
    ],
    "coverageIntegrationActions": [
      "integration-execute",
      "integration-retry",
      "integration-compensate"
    ],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "integration-init"
    ],
    "editLockedStatuses": [],
    "description": "查看数据初始化任务执行状态、失败原因、重试和人工补偿结果。"
  },
  {
    "id": "checkup-sync",
    "domainId": "supply",
    "groupId": "supply-integration",
    "title": "体检系统同步",
    "entity": "体检系统同步",
    "pageType": "interface",
    "icon": "检",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "sourceSystem",
        "label": "来源系统",
        "type": "text",
        "required": true
      },
      {
        "name": "externalCode",
        "label": "外部编码",
        "type": "text",
        "required": true
      },
      {
        "name": "standardCode",
        "label": "标准编码",
        "type": "text",
        "required": true
      },
      {
        "name": "mappingRule",
        "label": "映射规则",
        "type": "text",
        "required": true
      },
      {
        "name": "unitType",
        "label": "结果单位",
        "type": "text",
        "required": true
      },
      {
        "name": "category",
        "label": "分类",
        "type": "text",
        "required": true
      },
      {
        "name": "physiologicalSystem",
        "label": "生理系统",
        "type": "text",
        "required": true
      },
      {
        "name": "batch",
        "label": "批次",
        "type": "text",
        "required": true
      },
      {
        "name": "fileName",
        "label": "文件名",
        "type": "text",
        "required": true
      },
      {
        "name": "scope",
        "label": "数据范围",
        "type": "text",
        "required": true
      },
      {
        "name": "effectiveTime",
        "label": "执行时间",
        "type": "datetime-local",
        "required": true
      },
      {
        "name": "mappingVersion",
        "label": "映射版本",
        "type": "text",
        "required": true
      },
      {
        "name": "filteredCount",
        "label": "过滤数量",
        "type": "number",
        "required": true
      },
      {
        "name": "pendingCount",
        "label": "待处理数量",
        "type": "number",
        "required": true
      },
      {
        "name": "failureCount",
        "label": "失败数量",
        "type": "number",
        "required": true
      },
      {
        "name": "result",
        "label": "处理结果",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "待同步",
          "待确认",
          "部分完成",
          "已完成",
          "待处理"
        ]
      }
    ],
    "columns": [
      "name",
      "sourceSystem",
      "externalCode",
      "standardCode",
      "mappingRule",
      "unitType",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "sourceSystem",
        "label": "来源系统",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "待同步",
          "待确认",
          "部分完成",
          "已完成",
          "待处理"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "execute",
      "retry",
      "compensate",
      "create",
      "update",
      "delete",
      "enable",
      "disable",
      "import",
      "export",
      "submit",
      "confirm",
      "cancel"
    ],
    "rowActions": [
      "integration-execute",
      "integration-retry",
      "integration-compensate",
      "resource-delete",
      "resource-enable",
      "resource-disable",
      "resource-submit",
      "resource-confirm",
      "resource-cancel"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable",
      "resource-import",
      "resource-export"
    ],
    "statusActions": [
      "integration-execute",
      "integration-retry",
      "integration-compensate",
      "resource-submit",
      "resource-confirm",
      "resource-cancel"
    ],
    "integrationActions": [
      "integration-execute",
      "integration-retry",
      "integration-compensate"
    ],
    "coverageIntegrationActions": [
      "integration-execute",
      "integration-retry",
      "integration-compensate"
    ],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "checkup-sync"
    ],
    "editLockedStatuses": [],
    "description": "查看体检系统同步执行状态、失败原因、重试和人工补偿结果。"
  },
  {
    "id": "finance-order",
    "domainId": "finance",
    "groupId": "finance-order-group",
    "title": "业务订单",
    "entity": "业务订单",
    "pageType": "document",
    "icon": "业",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": true
      },
      {
        "name": "service",
        "label": "服务项目",
        "type": "text",
        "required": true
      },
      {
        "name": "amount",
        "label": "订单金额",
        "type": "number",
        "required": true
      },
      {
        "name": "paid",
        "label": "已收金额",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审核",
          "待收款",
          "已通过",
          "执行中",
          "已完成",
          "已取消",
          "已冲销"
        ]
      }
    ],
    "columns": [
      "name",
      "customer",
      "service",
      "amount",
      "paid",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审核",
          "待收款",
          "已通过",
          "执行中",
          "已完成",
          "已取消",
          "已冲销"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "submit",
      "withdraw",
      "cancel",
      "confirm",
      "close",
      "print",
      "export",
      "approve",
      "reject",
      "delete"
    ],
    "rowActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close",
      "approval-approve",
      "approval-reject",
      "resource-delete"
    ],
    "batchActions": [
      "resource-print",
      "resource-export"
    ],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close",
      "approval-approve",
      "approval-reject"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "finance-order"
    ],
    "editLockedStatuses": [],
    "description": "查询并处理业务订单，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "finance-payment",
    "domainId": "finance",
    "groupId": "finance-order-group",
    "title": "收款记录",
    "entity": "收款记录",
    "pageType": "document",
    "icon": "收",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": true
      },
      {
        "name": "orderNo",
        "label": "关联订单",
        "type": "text",
        "required": true
      },
      {
        "name": "amount",
        "label": "收款金额",
        "type": "number",
        "required": true
      },
      {
        "name": "channel",
        "label": "渠道",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "待收款",
          "已收款",
          "已确认",
          "已冲销"
        ]
      }
    ],
    "columns": [
      "name",
      "customer",
      "orderNo",
      "amount",
      "channel",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "待收款",
          "已收款",
          "已确认",
          "已冲销"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "void",
      "print",
      "export"
    ],
    "rowActions": [
      "resource-void"
    ],
    "batchActions": [
      "resource-print",
      "resource-export"
    ],
    "statusActions": [
      "resource-void"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [
      "finance-payment-confirm",
      "finance-payment-unconfirm"
    ],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "finance-payment"
    ],
    "editLockedStatuses": [],
    "description": "查询并处理收款记录，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "finance-refund",
    "domainId": "finance",
    "groupId": "finance-order-group",
    "title": "退款申请",
    "entity": "退款申请",
    "pageType": "document",
    "icon": "退",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": true
      },
      {
        "name": "orderNo",
        "label": "关联订单",
        "type": "text",
        "required": true
      },
      {
        "name": "amount",
        "label": "退款金额",
        "type": "number",
        "required": true
      },
      {
        "name": "reason",
        "label": "原因/说明",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "已驳回",
          "待退款",
          "已退款",
          "已确认",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "customer",
      "orderNo",
      "amount",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "已驳回",
          "待退款",
          "已退款",
          "已确认",
          "已取消"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "submit",
      "withdraw",
      "cancel",
      "approve",
      "reject",
      "print",
      "export"
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "approval-approve",
      "approval-reject"
    ],
    "batchActions": [
      "resource-print",
      "resource-export"
    ],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "approval-approve",
      "approval-reject"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [
      "finance-refund-confirm"
    ],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "finance-refund"
    ],
    "editLockedStatuses": [],
    "description": "查询并处理退款申请，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "finance-invoice",
    "domainId": "finance",
    "groupId": "finance-order-group",
    "title": "发票状态",
    "entity": "发票状态",
    "pageType": "document",
    "icon": "发",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": true
      },
      {
        "name": "orderNo",
        "label": "关联订单",
        "type": "text",
        "required": true
      },
      {
        "name": "invoiceNo",
        "label": "发票号码",
        "type": "text",
        "required": true
      },
      {
        "name": "amount",
        "label": "开票金额",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "待开票",
          "已开票",
          "已作废"
        ]
      }
    ],
    "columns": [
      "name",
      "customer",
      "orderNo",
      "invoiceNo",
      "amount",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "待开票",
          "已开票",
          "已作废"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "void",
      "print",
      "export"
    ],
    "rowActions": [
      "resource-void"
    ],
    "batchActions": [
      "resource-print",
      "resource-export"
    ],
    "statusActions": [
      "resource-void"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "finance-invoice"
    ],
    "editLockedStatuses": [],
    "description": "查询并处理发票状态，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "finance-reconciliation",
    "domainId": "finance",
    "groupId": "finance-order-group",
    "title": "渠道对账单",
    "entity": "渠道对账单",
    "pageType": "document",
    "icon": "渠",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "channel",
        "label": "渠道",
        "type": "text",
        "required": true
      },
      {
        "name": "period",
        "label": "期间",
        "type": "text",
        "required": true
      },
      {
        "name": "amount",
        "label": "对账金额",
        "type": "number",
        "required": true
      },
      {
        "name": "differenceQty",
        "label": "差异笔数",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待对账",
          "存在差异",
          "已确认",
          "已对账",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "channel",
      "period",
      "amount",
      "differenceQty",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "channel",
        "label": "渠道",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待对账",
          "存在差异",
          "已确认",
          "已对账",
          "已取消"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "cancel",
      "export"
    ],
    "rowActions": [
      "resource-cancel"
    ],
    "batchActions": [
      "resource-export"
    ],
    "statusActions": [
      "resource-cancel"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [
      "finance-reconciliation-submit",
      "finance-reconciliation-confirm",
      "finance-reconciliation-unconfirm"
    ],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "finance-reconciliation"
    ],
    "editLockedStatuses": [],
    "description": "查询并处理渠道对账单，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "finance-cost",
    "domainId": "finance",
    "groupId": "finance-analysis-group",
    "title": "成本归集",
    "entity": "成本归集",
    "pageType": "ledger",
    "icon": "成",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "costCenter",
        "label": "成本中心",
        "type": "text",
        "required": true
      },
      {
        "name": "period",
        "label": "期间",
        "type": "text",
        "required": true
      },
      {
        "name": "amount",
        "label": "归集金额",
        "type": "number",
        "required": true
      },
      {
        "name": "service",
        "label": "服务项目",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "已匹配",
          "有差异"
        ]
      }
    ],
    "columns": [
      "name",
      "costCenter",
      "period",
      "amount",
      "service",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "costCenter",
        "label": "成本中心",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "已匹配",
          "有差异"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "export",
      "delete",
      "import"
    ],
    "rowActions": [
      "resource-delete"
    ],
    "batchActions": [
      "resource-export",
      "resource-import"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      },
      {
        "key": "active",
        "label": "当前有效",
        "tone": "success"
      },
      {
        "key": "pending",
        "label": "待处理",
        "tone": "warning"
      }
    ],
    "relationTabs": [
      "finance-cost"
    ],
    "editLockedStatuses": [],
    "description": "查询成本归集的数量、状态和关联业务明细。"
  },
  {
    "id": "finance-allocation-rule",
    "domainId": "finance",
    "groupId": "finance-analysis-group",
    "title": "费用分摊规则",
    "entity": "费用分摊规则",
    "pageType": "master",
    "icon": "成",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "costCenter",
        "label": "成本中心",
        "type": "text",
        "required": true
      },
      {
        "name": "allocationMethod",
        "label": "分摊方式",
        "type": "text",
        "required": true
      },
      {
        "name": "expression",
        "label": "条件表达式",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "已匹配",
          "有差异"
        ]
      }
    ],
    "columns": [
      "name",
      "costCenter",
      "allocationMethod",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "costCenter",
        "label": "成本中心",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "已匹配",
          "有差异"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "finance-allocation-rule"
    ],
    "editLockedStatuses": [],
    "description": "维护费用分摊规则，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "finance-budget",
    "domainId": "finance",
    "groupId": "finance-analysis-group",
    "title": "预算方案",
    "entity": "预算方案",
    "pageType": "document",
    "icon": "成",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "costCenter",
        "label": "成本中心",
        "type": "text",
        "required": true
      },
      {
        "name": "period",
        "label": "期间",
        "type": "text",
        "required": true
      },
      {
        "name": "budgetAmount",
        "label": "预算金额",
        "type": "number",
        "required": true
      },
      {
        "name": "executionRate",
        "label": "执行率",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "已匹配",
          "有差异"
        ]
      }
    ],
    "columns": [
      "name",
      "costCenter",
      "period",
      "budgetAmount",
      "executionRate",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "costCenter",
        "label": "成本中心",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "已匹配",
          "有差异"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "submit",
      "withdraw",
      "cancel",
      "approve",
      "reject",
      "confirm"
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "approval-approve",
      "approval-reject",
      "resource-confirm"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "approval-approve",
      "approval-reject",
      "resource-confirm"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "finance-budget"
    ],
    "editLockedStatuses": [],
    "description": "查询并处理预算方案，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "finance-payable-match",
    "domainId": "finance",
    "groupId": "finance-analysis-group",
    "title": "应付与三单匹配",
    "entity": "应付与三单匹配",
    "pageType": "analysis",
    "icon": "成",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "supplier",
        "label": "供应商",
        "type": "text",
        "required": true
      },
      {
        "name": "orderNo",
        "label": "关联订单",
        "type": "text",
        "required": true
      },
      {
        "name": "payableAmount",
        "label": "应付金额",
        "type": "number",
        "required": true
      },
      {
        "name": "matchResult",
        "label": "匹配结果",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "已匹配",
          "有差异"
        ]
      }
    ],
    "columns": [
      "name",
      "supplier",
      "orderNo",
      "payableAmount",
      "matchResult",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "supplier",
        "label": "供应商",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "已匹配",
          "有差异"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "export",
      "execute"
    ],
    "rowActions": [],
    "batchActions": [
      "resource-export"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [
      "finance-run-match"
    ],
    "pageActions": [
      "finance-match-difference"
    ],
    "drilldowns": [
      "records",
      "detail"
    ],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      },
      {
        "key": "active",
        "label": "当前有效",
        "tone": "success"
      },
      {
        "key": "pending",
        "label": "待处理",
        "tone": "warning"
      }
    ],
    "relationTabs": [
      "finance-payable-match"
    ],
    "editLockedStatuses": [],
    "description": "按业务条件分析应付与三单匹配，并支持结果刷新与明细下钻。"
  },
  {
    "id": "finance-operating-report",
    "domainId": "finance",
    "groupId": "finance-operating",
    "title": "经营报表",
    "entity": "经营报表",
    "pageType": "analysis",
    "icon": "经",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "period",
        "label": "期间",
        "type": "text",
        "required": true
      },
      {
        "name": "metric",
        "label": "指标",
        "type": "text",
        "required": true
      },
      {
        "name": "amount",
        "label": "指标值",
        "type": "number",
        "required": true
      },
      {
        "name": "executionRate",
        "label": "同比/完成率",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已发布",
          "已归档"
        ]
      }
    ],
    "columns": [
      "name",
      "period",
      "metric",
      "amount",
      "executionRate",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "period",
        "label": "期间",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已发布",
          "已归档"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "export"
    ],
    "rowActions": [],
    "batchActions": [
      "resource-export"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [
      "records",
      "detail"
    ],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      },
      {
        "key": "active",
        "label": "当前有效",
        "tone": "success"
      },
      {
        "key": "pending",
        "label": "待处理",
        "tone": "warning"
      }
    ],
    "relationTabs": [
      "finance-operating-report"
    ],
    "editLockedStatuses": [],
    "description": "按业务条件分析经营报表，并支持结果刷新与明细下钻。"
  },
  {
    "id": "finance-metric-library",
    "domainId": "finance",
    "groupId": "finance-operating",
    "title": "指标库",
    "entity": "指标库",
    "pageType": "master",
    "icon": "经",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "metric",
        "label": "指标",
        "type": "text",
        "required": true
      },
      {
        "name": "unit",
        "label": "计量单位",
        "type": "text",
        "required": true
      },
      {
        "name": "expression",
        "label": "条件表达式",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已发布",
          "已归档"
        ]
      }
    ],
    "columns": [
      "name",
      "metric",
      "unit",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "metric",
        "label": "指标",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已发布",
          "已归档"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "finance-metric-library"
    ],
    "editLockedStatuses": [],
    "description": "维护指标库，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "finance-assessment-plan",
    "domainId": "finance",
    "groupId": "finance-operating",
    "title": "考核方案",
    "entity": "考核方案",
    "pageType": "document",
    "icon": "经",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "period",
        "label": "期间",
        "type": "text",
        "required": true
      },
      {
        "name": "metric",
        "label": "指标",
        "type": "text",
        "required": true
      },
      {
        "name": "targetValue",
        "label": "目标值",
        "type": "number",
        "required": true
      },
      {
        "name": "owner",
        "label": "负责人/经办人",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已发布",
          "已归档"
        ]
      }
    ],
    "columns": [
      "name",
      "period",
      "metric",
      "targetValue",
      "owner",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "period",
        "label": "期间",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已发布",
          "已归档"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "submit",
      "withdraw",
      "cancel"
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "finance-assessment-plan"
    ],
    "editLockedStatuses": [],
    "description": "查询并处理考核方案，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "medical-report-category",
    "domainId": "medical",
    "groupId": "medical-master-group",
    "title": "体检报告大类",
    "entity": "体检报告大类",
    "pageType": "master",
    "icon": "标",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "scope",
        "label": "数据范围",
        "type": "text",
        "required": true
      },
      {
        "name": "unitType",
        "label": "结果单位",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "scope",
      "unitType",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "scope",
        "label": "数据范围",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "medical-report-category"
    ],
    "editLockedStatuses": [],
    "description": "维护体检报告大类，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "medical-report-type",
    "domainId": "medical",
    "groupId": "medical-master-group",
    "title": "报告类型",
    "entity": "报告类型",
    "pageType": "master",
    "icon": "标",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "reportType",
        "label": "报告类型",
        "type": "text",
        "required": true
      },
      {
        "name": "scope",
        "label": "数据范围",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "reportType",
      "scope",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "reportType",
        "label": "报告类型",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "medical-report-type"
    ],
    "editLockedStatuses": [],
    "description": "维护报告类型，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "medical-standard-item",
    "domainId": "medical",
    "groupId": "medical-master-group",
    "title": "标准体检项目",
    "entity": "标准体检项目",
    "pageType": "master",
    "icon": "标",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "standardCode",
        "label": "标准编码",
        "type": "text",
        "required": true
      },
      {
        "name": "unitType",
        "label": "结果单位",
        "type": "text",
        "required": true
      },
      {
        "name": "reportType",
        "label": "报告类型",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "standardCode",
      "unitType",
      "reportType",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "standardCode",
        "label": "标准编码",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable",
      "import",
      "confirm"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable",
      "resource-confirm"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable",
      "resource-import"
    ],
    "statusActions": [
      "resource-confirm"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "medical-standard-item"
    ],
    "editLockedStatuses": [],
    "description": "维护标准体检项目，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "medical-external-report-map",
    "domainId": "medical",
    "groupId": "medical-mapping-group",
    "title": "外部报告类型映射",
    "entity": "外部报告类型映射",
    "pageType": "master",
    "icon": "映",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "sourceSystem",
        "label": "来源系统",
        "type": "text",
        "required": true
      },
      {
        "name": "externalCode",
        "label": "外部编码",
        "type": "text",
        "required": true
      },
      {
        "name": "reportType",
        "label": "报告类型",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待匹配",
          "已匹配",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "sourceSystem",
      "externalCode",
      "reportType",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "sourceSystem",
        "label": "来源系统",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待匹配",
          "已匹配",
          "已停用"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "medical-external-report-map"
    ],
    "editLockedStatuses": [],
    "description": "维护外部报告类型映射，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "medical-external-item-map",
    "domainId": "medical",
    "groupId": "medical-mapping-group",
    "title": "外部项目映射",
    "entity": "外部项目映射",
    "pageType": "master",
    "icon": "映",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "sourceSystem",
        "label": "来源系统",
        "type": "text",
        "required": true
      },
      {
        "name": "externalCode",
        "label": "外部编码",
        "type": "text",
        "required": true
      },
      {
        "name": "standardCode",
        "label": "标准编码",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待匹配",
          "已匹配",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "sourceSystem",
      "externalCode",
      "standardCode",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "sourceSystem",
        "label": "来源系统",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待匹配",
          "已匹配",
          "已停用"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable",
      "confirm"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable",
      "resource-confirm"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [
      "resource-confirm"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "medical-external-item-map"
    ],
    "editLockedStatuses": [],
    "description": "维护外部项目映射，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "medical-unmatched-item",
    "domainId": "medical",
    "groupId": "medical-mapping-group",
    "title": "未匹配项目",
    "entity": "未匹配项目",
    "pageType": "master",
    "icon": "映",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "sourceSystem",
        "label": "来源系统",
        "type": "text",
        "required": true
      },
      {
        "name": "externalCode",
        "label": "外部编码",
        "type": "text",
        "required": true
      },
      {
        "name": "result",
        "label": "处理结果",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待匹配",
          "已匹配",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "sourceSystem",
      "externalCode",
      "result",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "sourceSystem",
        "label": "来源系统",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待匹配",
          "已匹配",
          "已停用"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "medical-unmatched-item"
    ],
    "editLockedStatuses": [],
    "description": "维护未匹配项目，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "medical-reference-rule",
    "domainId": "medical",
    "groupId": "medical-rule-group",
    "title": "参考值规则",
    "entity": "参考值规则",
    "pageType": "master",
    "icon": "规",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "standardCode",
        "label": "标准编码",
        "type": "text",
        "required": true
      },
      {
        "name": "gender",
        "label": "性别",
        "type": "text",
        "required": true
      },
      {
        "name": "ageRange",
        "label": "年龄段",
        "type": "text",
        "required": true
      },
      {
        "name": "lowerLimit",
        "label": "参考下限",
        "type": "number",
        "required": true
      },
      {
        "name": "upperLimit",
        "label": "参考上限",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "standardCode",
      "gender",
      "ageRange",
      "lowerLimit",
      "upperLimit",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "standardCode",
        "label": "标准编码",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable",
      "import"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable",
      "resource-import"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "medical-reference-rule"
    ],
    "editLockedStatuses": [],
    "description": "维护参考值规则，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "medical-critical-rule",
    "domainId": "medical",
    "groupId": "medical-rule-group",
    "title": "危急值规则",
    "entity": "危急值规则",
    "pageType": "master",
    "icon": "规",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "standardCode",
        "label": "标准编码",
        "type": "text",
        "required": true
      },
      {
        "name": "criticalValue",
        "label": "危急阈值",
        "type": "number",
        "required": true
      },
      {
        "name": "expression",
        "label": "条件表达式",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "standardCode",
      "criticalValue",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "standardCode",
        "label": "标准编码",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable",
      "import",
      "execute"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable",
      "resource-import"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [
      "integration-execute"
    ],
    "pageActions": [
      "integration-execute"
    ],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "medical-critical-rule"
    ],
    "editLockedStatuses": [],
    "description": "维护危急值规则，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "medical-item-relation",
    "domainId": "medical",
    "groupId": "medical-rule-group",
    "title": "体检项医学关系",
    "entity": "体检项医学关系",
    "pageType": "master",
    "icon": "规",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "standardCode",
        "label": "标准编码",
        "type": "text",
        "required": true
      },
      {
        "name": "relationType",
        "label": "关系类型",
        "type": "text",
        "required": true
      },
      {
        "name": "content",
        "label": "正文内容",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "standardCode",
      "relationType",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "standardCode",
        "label": "标准编码",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable",
      "bind",
      "unbind",
      "import",
      "execute"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable",
      "resource-bind",
      "resource-unbind"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable",
      "resource-import"
    ],
    "statusActions": [
      "resource-bind",
      "resource-unbind"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [
      "integration-execute"
    ],
    "pageActions": [
      "integration-execute"
    ],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "medical-item-relation"
    ],
    "editLockedStatuses": [],
    "description": "维护体检项医学关系，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "medical-symptom-disease",
    "domainId": "medical",
    "groupId": "medical-rule-group",
    "title": "症状疾病关系",
    "entity": "症状疾病关系",
    "pageType": "master",
    "icon": "规",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "relationType",
        "label": "关系类型",
        "type": "text",
        "required": true
      },
      {
        "name": "condition",
        "label": "匹配条件",
        "type": "text",
        "required": true
      },
      {
        "name": "content",
        "label": "正文内容",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "relationType",
      "condition",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "relationType",
        "label": "关系类型",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable",
      "bind",
      "unbind",
      "execute"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable",
      "resource-bind",
      "resource-unbind"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [
      "resource-bind",
      "resource-unbind"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [
      "integration-execute"
    ],
    "pageActions": [
      "integration-execute"
    ],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "medical-symptom-disease"
    ],
    "editLockedStatuses": [],
    "description": "维护症状疾病关系，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "medical-special-precheck",
    "domainId": "medical",
    "groupId": "medical-rule-group",
    "title": "特殊项目前置规则",
    "entity": "特殊项目前置规则",
    "pageType": "master",
    "icon": "规",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "specialItem",
        "label": "特殊项目",
        "type": "text",
        "required": true
      },
      {
        "name": "condition",
        "label": "匹配条件",
        "type": "text",
        "required": true
      },
      {
        "name": "releaseReason",
        "label": "放行原因",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "specialItem",
      "condition",
      "releaseReason",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "specialItem",
        "label": "特殊项目",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "medical-special-precheck"
    ],
    "editLockedStatuses": [],
    "description": "维护特殊项目前置规则，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "medical-health-analysis",
    "domainId": "medical",
    "groupId": "medical-report-group",
    "title": "健康资料分析",
    "entity": "健康资料分析",
    "pageType": "interface",
    "icon": "报",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": true
      },
      {
        "name": "reportType",
        "label": "报告类型",
        "type": "text",
        "required": true
      },
      {
        "name": "result",
        "label": "处理结果",
        "type": "text",
        "required": true
      },
      {
        "name": "ruleVersion",
        "label": "规则版本",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待确认",
          "待发布",
          "已发布",
          "已撤回",
          "已归档"
        ]
      }
    ],
    "columns": [
      "name",
      "customer",
      "reportType",
      "result",
      "ruleVersion",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待确认",
          "待发布",
          "已发布",
          "已撤回",
          "已归档"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "export",
      "create",
      "execute",
      "retry"
    ],
    "rowActions": [
      "integration-execute",
      "integration-retry"
    ],
    "batchActions": [
      "resource-export"
    ],
    "statusActions": [
      "integration-execute",
      "integration-retry"
    ],
    "integrationActions": [
      "integration-execute",
      "integration-retry"
    ],
    "coverageIntegrationActions": [
      "integration-execute",
      "integration-retry"
    ],
    "pageActions": [],
    "drilldowns": [
      "records",
      "detail"
    ],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      },
      {
        "key": "active",
        "label": "当前有效",
        "tone": "success"
      },
      {
        "key": "pending",
        "label": "待处理",
        "tone": "warning"
      }
    ],
    "relationTabs": [
      "medical-health-analysis"
    ],
    "editLockedStatuses": [
      "已归档"
    ],
    "description": "查看健康资料分析执行状态、失败原因、重试和人工补偿结果。"
  },
  {
    "id": "medical-report",
    "domainId": "medical",
    "groupId": "medical-report-group",
    "title": "医学报告",
    "entity": "医学报告",
    "pageType": "document",
    "icon": "报",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": true
      },
      {
        "name": "reportType",
        "label": "报告类型",
        "type": "text",
        "required": true
      },
      {
        "name": "doctor",
        "label": "医生",
        "type": "text",
        "required": true
      },
      {
        "name": "ruleVersion",
        "label": "规则版本",
        "type": "text",
        "required": true
      },
      {
        "name": "result",
        "label": "处理结果",
        "type": "text",
        "required": true
      },
      {
        "name": "reportNo",
        "label": "报告编号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待确认",
          "待发布",
          "已发布",
          "已撤回",
          "已归档"
        ]
      }
    ],
    "columns": [
      "name",
      "customer",
      "reportType",
      "doctor",
      "ruleVersion",
      "result",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待确认",
          "待发布",
          "已发布",
          "已撤回",
          "已归档"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "confirm",
      "publish",
      "withdraw",
      "archive",
      "export",
      "generate"
    ],
    "rowActions": [
      "resource-confirm",
      "resource-publish",
      "resource-withdraw",
      "resource-archive",
      "resource-generate"
    ],
    "batchActions": [
      "resource-archive",
      "resource-export"
    ],
    "statusActions": [
      "resource-confirm",
      "resource-publish",
      "resource-withdraw",
      "resource-archive",
      "resource-generate"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "medical-report"
    ],
    "editLockedStatuses": [
      "已归档"
    ],
    "description": "查询并处理医学报告，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "medical-followup",
    "domainId": "medical",
    "groupId": "medical-report-group",
    "title": "复查建议",
    "entity": "复查建议",
    "pageType": "document",
    "icon": "报",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": true
      },
      {
        "name": "followupPeriod",
        "label": "复查周期",
        "type": "text",
        "required": true
      },
      {
        "name": "specialItem",
        "label": "特殊项目",
        "type": "text",
        "required": true
      },
      {
        "name": "doctor",
        "label": "医生",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待确认",
          "待发布",
          "已发布",
          "已撤回",
          "已归档"
        ]
      }
    ],
    "columns": [
      "name",
      "customer",
      "followupPeriod",
      "specialItem",
      "doctor",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待确认",
          "待发布",
          "已发布",
          "已撤回",
          "已归档"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "submit",
      "withdraw",
      "cancel",
      "confirm"
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "medical-followup"
    ],
    "editLockedStatuses": [
      "已归档"
    ],
    "description": "查询并处理复查建议，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "doctor-order",
    "domainId": "medical",
    "groupId": "medical-doctor-group",
    "title": "医生开单",
    "entity": "医生开单",
    "pageType": "document",
    "icon": "医",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": true
      },
      {
        "name": "doctor",
        "label": "医生",
        "type": "text",
        "required": true
      },
      {
        "name": "plan",
        "label": "常用方案",
        "type": "text",
        "required": true
      },
      {
        "name": "specialItem",
        "label": "特殊项目",
        "type": "text",
        "required": true
      },
      {
        "name": "safetyCheck",
        "label": "安全校验",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待校验",
          "已通过",
          "已驳回"
        ]
      }
    ],
    "columns": [
      "name",
      "customer",
      "doctor",
      "plan",
      "specialItem",
      "safetyCheck",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待校验",
          "已通过",
          "已驳回"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "submit",
      "withdraw",
      "cancel",
      "approve"
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "approval-approve"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "approval-approve"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "doctor-order"
    ],
    "editLockedStatuses": [],
    "description": "查询并处理医生开单，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "doctor-plan",
    "domainId": "medical",
    "groupId": "medical-doctor-group",
    "title": "个人常用方案",
    "entity": "个人常用方案",
    "pageType": "master",
    "icon": "医",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "doctor",
        "label": "医生",
        "type": "text",
        "required": true
      },
      {
        "name": "plan",
        "label": "常用方案",
        "type": "text",
        "required": true
      },
      {
        "name": "content",
        "label": "正文内容",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待校验",
          "已通过",
          "已驳回"
        ]
      }
    ],
    "columns": [
      "name",
      "doctor",
      "plan",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "doctor",
        "label": "医生",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待校验",
          "已通过",
          "已驳回"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable",
      "doctor-plan-favorite-health",
      "doctor-plan-favorite-medical",
      "doctor-plan-apply",
      "doctor-plan-rename"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "doctor-plan"
    ],
    "editLockedStatuses": [],
    "description": "维护个人常用方案，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "consultation-appointment",
    "domainId": "care",
    "groupId": "care-consultation",
    "title": "会诊预约",
    "entity": "会诊预约",
    "pageType": "document",
    "icon": "会",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": true
      },
      {
        "name": "time",
        "label": "预约时间",
        "type": "datetime-local",
        "required": true
      },
      {
        "name": "expert",
        "label": "专家",
        "type": "text",
        "required": true
      },
      {
        "name": "result",
        "label": "时间冲突检查结果",
        "type": "select",
        "required": false,
        "options": [
          "未检查",
          "无冲突",
          "存在冲突"
        ]
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待确认",
          "已发送",
          "已接受",
          "已拒绝",
          "已确认",
          "进行中",
          "已签字",
          "已归档",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "customer",
      "time",
      "expert",
      "result",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待确认",
          "已发送",
          "已接受",
          "已拒绝",
          "已确认",
          "进行中",
          "已签字",
          "已归档",
          "已取消"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "submit",
      "withdraw",
      "cancel",
      "confirm",
      "close",
      "print",
      "export",
      "delete"
    ],
    "rowActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close",
      "resource-delete"
    ],
    "batchActions": [
      "resource-print",
      "resource-export"
    ],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "consultation-appointment"
    ],
    "editLockedStatuses": [
      "已归档"
    ],
    "description": "查询并处理会诊预约，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "consultation-invitation",
    "domainId": "care",
    "groupId": "care-consultation",
    "title": "专家邀请",
    "entity": "专家邀请",
    "pageType": "document",
    "icon": "会",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "expert",
        "label": "专家",
        "type": "text",
        "required": true
      },
      {
        "name": "time",
        "label": "邀请时间",
        "type": "datetime-local",
        "required": true
      },
      {
        "name": "result",
        "label": "处理结果",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待确认",
          "已发送",
          "已接受",
          "已拒绝",
          "已确认",
          "进行中",
          "已签字",
          "已归档",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "expert",
      "time",
      "result",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "expert",
        "label": "专家",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待确认",
          "已发送",
          "已接受",
          "已拒绝",
          "已确认",
          "进行中",
          "已签字",
          "已归档",
          "已取消"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "submit",
      "withdraw",
      "cancel",
      "accept",
      "decline"
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "consultation-accept",
      "consultation-decline"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "consultation-accept",
      "consultation-decline"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "consultation-invitation"
    ],
    "editLockedStatuses": [
      "已归档"
    ],
    "description": "查询并处理专家邀请，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "consultation-device",
    "domainId": "care",
    "groupId": "care-consultation",
    "title": "设备检查",
    "entity": "设备检查",
    "pageType": "document",
    "icon": "会",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "expert",
        "label": "专家",
        "type": "text",
        "required": true
      },
      {
        "name": "deviceCheck",
        "label": "设备检查",
        "type": "text",
        "required": true
      },
      {
        "name": "result",
        "label": "处理结果",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待确认",
          "已发送",
          "已接受",
          "已拒绝",
          "已确认",
          "进行中",
          "已签字",
          "已归档",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "expert",
      "deviceCheck",
      "result",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "expert",
        "label": "专家",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待确认",
          "已发送",
          "已接受",
          "已拒绝",
          "已确认",
          "进行中",
          "已签字",
          "已归档",
          "已取消"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "confirm",
      "execute"
    ],
    "rowActions": [
      "resource-confirm",
      "integration-execute"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-confirm",
      "integration-execute"
    ],
    "integrationActions": [
      "integration-execute"
    ],
    "coverageIntegrationActions": [
      "consultation-device-camera",
      "consultation-device-microphone"
    ],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "consultation-device"
    ],
    "editLockedStatuses": [
      "已归档"
    ],
    "description": "查询并处理设备检查，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "consultation-room",
    "domainId": "care",
    "groupId": "care-consultation",
    "title": "会诊房间",
    "entity": "会诊房间",
    "pageType": "document",
    "icon": "会",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "roomNo",
        "label": "房间号",
        "type": "text",
        "required": true
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": true
      },
      {
        "name": "time",
        "label": "会诊时间",
        "type": "datetime-local",
        "required": true
      },
      {
        "name": "recording",
        "label": "录制状态",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待确认",
          "已发送",
          "已接受",
          "已拒绝",
          "已确认",
          "进行中",
          "已签字",
          "已归档",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "roomNo",
      "customer",
      "time",
      "recording",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "roomNo",
        "label": "房间号",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待确认",
          "已发送",
          "已接受",
          "已拒绝",
          "已确认",
          "进行中",
          "已签字",
          "已归档",
          "已取消"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "submit",
      "withdraw",
      "cancel",
      "confirm",
      "close",
      "print",
      "export",
      "execute"
    ],
    "rowActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close",
      "integration-execute"
    ],
    "batchActions": [
      "resource-print",
      "resource-export"
    ],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close",
      "integration-execute"
    ],
    "integrationActions": [
      "integration-execute"
    ],
    "coverageIntegrationActions": [
      "consultation-room-auth",
      "consultation-room-enter",
      "consultation-room-record",
      "consultation-room-control",
      "consultation-room-media"
    ],
    "pageActions": [
      "consultation-room-confirm",
      "consultation-room-cancel"
    ],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "consultation-room"
    ],
    "editLockedStatuses": [
      "已归档"
    ],
    "description": "查询并处理会诊房间，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "consultation-member",
    "domainId": "care",
    "groupId": "care-consultation",
    "title": "成员",
    "entity": "成员",
    "pageType": "master",
    "icon": "会",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "roomNo",
        "label": "房间号",
        "type": "text",
        "required": true
      },
      {
        "name": "expert",
        "label": "专家",
        "type": "text",
        "required": true
      },
      {
        "name": "operation",
        "label": "业务操作",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待确认",
          "已发送",
          "已接受",
          "已拒绝",
          "已确认",
          "进行中",
          "已签字",
          "已归档",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "roomNo",
      "expert",
      "operation",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "roomNo",
        "label": "房间号",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待确认",
          "已发送",
          "已接受",
          "已拒绝",
          "已确认",
          "进行中",
          "已签字",
          "已归档",
          "已取消"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "execute"
    ],
    "rowActions": [
      "consultation-member-mute",
      "consultation-member-remove"
    ],
    "batchActions": [],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [
      "consultation-member-mute",
      "consultation-member-remove"
    ],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "consultation-member"
    ],
    "editLockedStatuses": [
      "已归档"
    ],
    "description": "维护成员，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "consultation-opinion",
    "domainId": "care",
    "groupId": "care-consultation",
    "title": "专家意见",
    "entity": "专家意见",
    "pageType": "document",
    "icon": "会",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "roomNo",
        "label": "房间号",
        "type": "text",
        "required": true
      },
      {
        "name": "expert",
        "label": "专家",
        "type": "text",
        "required": true
      },
      {
        "name": "opinion",
        "label": "专家意见",
        "type": "text",
        "required": true
      },
      {
        "name": "signature",
        "label": "签字人",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待确认",
          "已发送",
          "已接受",
          "已拒绝",
          "已确认",
          "进行中",
          "已签字",
          "已归档",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "roomNo",
      "expert",
      "opinion",
      "signature",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "roomNo",
        "label": "房间号",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待确认",
          "已发送",
          "已接受",
          "已拒绝",
          "已确认",
          "进行中",
          "已签字",
          "已归档",
          "已取消"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "confirm"
    ],
    "rowActions": [
      "resource-confirm"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-confirm"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "consultation-opinion"
    ],
    "editLockedStatuses": [
      "已归档"
    ],
    "description": "查询并处理专家意见，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "consultation-conclusion",
    "domainId": "care",
    "groupId": "care-consultation",
    "title": "会诊结论",
    "entity": "会诊结论",
    "pageType": "document",
    "icon": "会",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "roomNo",
        "label": "房间号",
        "type": "text",
        "required": true
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": true
      },
      {
        "name": "opinion",
        "label": "专家意见",
        "type": "text",
        "required": true
      },
      {
        "name": "signature",
        "label": "签字人",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待确认",
          "已发送",
          "已接受",
          "已拒绝",
          "已确认",
          "进行中",
          "已签字",
          "已归档",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "roomNo",
      "customer",
      "opinion",
      "signature",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "roomNo",
        "label": "房间号",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待确认",
          "已发送",
          "已接受",
          "已拒绝",
          "已确认",
          "进行中",
          "已签字",
          "已归档",
          "已取消"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "confirm",
      "archive"
    ],
    "rowActions": [
      "resource-confirm",
      "resource-archive"
    ],
    "batchActions": [
      "resource-archive"
    ],
    "statusActions": [
      "resource-confirm",
      "resource-archive"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "consultation-conclusion"
    ],
    "editLockedStatuses": [
      "已归档"
    ],
    "description": "查询并处理会诊结论，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "consultation-report",
    "domainId": "care",
    "groupId": "care-consultation",
    "title": "会诊报告",
    "entity": "会诊报告",
    "pageType": "document",
    "icon": "会",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "roomNo",
        "label": "房间号",
        "type": "text",
        "required": true
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": true
      },
      {
        "name": "expert",
        "label": "专家",
        "type": "text",
        "required": true
      },
      {
        "name": "signature",
        "label": "签字人",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待确认",
          "已发送",
          "已接受",
          "已拒绝",
          "已确认",
          "进行中",
          "已签字",
          "已归档",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "roomNo",
      "customer",
      "expert",
      "signature",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "roomNo",
        "label": "房间号",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待确认",
          "已发送",
          "已接受",
          "已拒绝",
          "已确认",
          "进行中",
          "已签字",
          "已归档",
          "已取消"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "confirm",
      "archive",
      "print",
      "export"
    ],
    "rowActions": [
      "resource-confirm",
      "resource-archive"
    ],
    "batchActions": [
      "resource-archive",
      "resource-print",
      "resource-export"
    ],
    "statusActions": [
      "resource-confirm",
      "resource-archive"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "consultation-report"
    ],
    "editLockedStatuses": [
      "已归档"
    ],
    "description": "查询并处理会诊报告，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "consultation-expert",
    "domainId": "care",
    "groupId": "care-consultation",
    "title": "会诊专家",
    "entity": "会诊专家",
    "pageType": "master",
    "icon": "会",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "expert",
        "label": "专家",
        "type": "text",
        "required": true
      },
      {
        "name": "scope",
        "label": "数据范围",
        "type": "text",
        "required": true
      },
      {
        "name": "time",
        "label": "可用时段",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待确认",
          "已发送",
          "已接受",
          "已拒绝",
          "已确认",
          "进行中",
          "已签字",
          "已归档",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "expert",
      "scope",
      "time",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "expert",
        "label": "专家",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待确认",
          "已发送",
          "已接受",
          "已拒绝",
          "已确认",
          "进行中",
          "已签字",
          "已归档",
          "已取消"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable",
      "confirm"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable",
      "resource-confirm"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [
      "resource-confirm"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "consultation-expert"
    ],
    "editLockedStatuses": [
      "已归档"
    ],
    "description": "维护会诊专家，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "consultation-material",
    "domainId": "care",
    "groupId": "care-consultation",
    "title": "会诊资料",
    "entity": "会诊资料",
    "pageType": "document",
    "icon": "会",
    "customerVisible": true,
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "roomNo",
        "label": "房间号",
        "type": "text",
        "required": true
      },
      {
        "name": "fileName",
        "label": "文件名",
        "type": "text",
        "required": true
      },
      {
        "name": "owner",
        "label": "负责人/经办人",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待确认",
          "已发送",
          "已接受",
          "已拒绝",
          "已确认",
          "进行中",
          "已签字",
          "已归档",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "roomNo",
      "fileName",
      "owner",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "roomNo",
        "label": "房间号",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待确认",
          "已发送",
          "已接受",
          "已拒绝",
          "已确认",
          "进行中",
          "已签字",
          "已归档",
          "已取消"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "delete",
      "export",
      "import"
    ],
    "rowActions": [
      "resource-delete"
    ],
    "batchActions": [
      "resource-export",
      "resource-import"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "consultation-material"
    ],
    "editLockedStatuses": [
      "已归档"
    ],
    "description": "查询并处理会诊资料，查看业务内容、当前状态和后续流转。"
  },
  {
    "id": "talent-factor",
    "domainId": "care",
    "groupId": "care-talent-rule",
    "title": "天赋要素",
    "entity": "天赋要素",
    "pageType": "master",
    "icon": "天",
    "customerVisible": true,
    "fields": [
      {
        "name": "factor",
        "label": "天赋要素",
        "type": "text",
        "required": true,
        "helpText": "在这里维护要素名称，保存后供天赋分级、固定注解和匹配条件选择。"
      },
      {
        "name": "category",
        "label": "分类",
        "type": "select",
        "required": true,
        "options": [
          "认知能力",
          "沟通能力",
          "行为能力",
          "社会情绪"
        ]
      },
      {
        "name": "description",
        "label": "基础说明",
        "type": "textarea",
        "required": true
      },
      {
        "name": "displayInfo",
        "label": "展示信息",
        "type": "textarea",
        "required": true
      },
      {
        "name": "displayOrder",
        "label": "显示顺序",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "switch",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "factor",
      "category",
      "description",
      "displayInfo",
      "displayOrder",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "factor",
        "label": "天赋要素",
        "type": "text",
        "required": false,
        "helpText": "在这里维护要素名称，保存后供天赋分级、固定注解和匹配条件选择。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable",
      "import",
      "export"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable",
      "resource-import",
      "resource-export"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "talent-factor"
    ],
    "editLockedStatuses": [],
    "description": "维护天赋要素，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "talent-level",
    "domainId": "care",
    "groupId": "care-talent-rule",
    "title": "天赋分级",
    "entity": "天赋分级",
    "pageType": "master",
    "icon": "天",
    "customerVisible": true,
    "fields": [
      {
        "name": "factor",
        "label": "天赋要素",
        "type": "select",
        "required": true,
        "options": [
          "逻辑思维",
          "空间感知",
          "语言表达",
          "专注力",
          "情绪感知",
          "行动规划"
        ],
        "optionsSource": "talent-factor",
        "helpText": "来源：天赋要素页面已维护的数据。"
      },
      {
        "name": "level",
        "label": "分级标准",
        "type": "select",
        "required": true,
        "options": [
          "L1",
          "L2",
          "L3",
          "L4",
          "L5",
          "L6"
        ],
        "optionsSource": "talent-level-standard",
        "optionLabels": {
          "L1": "L1 · 潜能起步",
          "L2": "L2 · 稳定优势",
          "L3": "L3 · 明显优势",
          "L4": "L4 · 高阶优势",
          "L5": "L5 · 专长表现",
          "L6": "L6 · 卓越表现"
        },
        "helpText": "来源：系统统一分级标准。保存后由本页维护该要素采用的分级、排序和适用范围。"
      },
      {
        "name": "displayOrder",
        "label": "排序",
        "type": "number",
        "required": true
      },
      {
        "name": "scope",
        "label": "适用范围",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "factor",
      "level",
      "displayOrder",
      "scope",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "factor",
        "label": "天赋要素",
        "type": "select",
        "required": false,
        "options": [
          "逻辑思维",
          "空间感知",
          "语言表达",
          "专注力",
          "情绪感知",
          "行动规划"
        ],
        "optionsSource": "talent-factor",
        "helpText": "来源：天赋要素页面已维护的数据。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable"
    ],
    "batchActions": [
      "resource-enable"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "talent-level"
    ],
    "editLockedStatuses": [],
    "description": "维护天赋分级，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "talent-note",
    "domainId": "care",
    "groupId": "care-talent-rule",
    "title": "固定注解",
    "entity": "固定注解",
    "pageType": "master",
    "icon": "天",
    "customerVisible": true,
    "fields": [
      {
        "name": "factor",
        "label": "天赋要素",
        "type": "select",
        "required": true,
        "options": [
          "逻辑思维",
          "空间感知",
          "语言表达",
          "专注力",
          "情绪感知",
          "行动规划"
        ],
        "optionsSource": "talent-factor",
        "helpText": "来源：天赋要素页面已维护的数据。"
      },
      {
        "name": "level",
        "label": "分级",
        "type": "select",
        "required": true,
        "options": [
          "L1",
          "L2",
          "L3",
          "L4",
          "L5",
          "L6"
        ],
        "dependsOn": [
          "factor"
        ],
        "optionsSource": "talent-level",
        "optionLabels": {
          "L1": "L1 · 潜能起步",
          "L2": "L2 · 稳定优势",
          "L3": "L3 · 明显优势",
          "L4": "L4 · 高阶优势",
          "L5": "L5 · 专长表现",
          "L6": "L6 · 卓越表现"
        },
        "emptyText": "该要素暂无分级，请先维护天赋分级。",
        "helpText": "来源：天赋分级页面中当前要素已维护的分级。"
      },
      {
        "name": "annotation",
        "label": "固定注解",
        "type": "textarea",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "factor",
      "level",
      "annotation",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "factor",
        "label": "天赋要素",
        "type": "select",
        "required": false,
        "options": [
          "逻辑思维",
          "空间感知",
          "语言表达",
          "专注力",
          "情绪感知",
          "行动规划"
        ],
        "optionsSource": "talent-factor",
        "helpText": "来源：天赋要素页面已维护的数据。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "import"
    ],
    "rowActions": [
      "resource-delete"
    ],
    "batchActions": [
      "resource-import"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "talent-note"
    ],
    "editLockedStatuses": [],
    "description": "维护固定注解，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "talent-nurture-content",
    "domainId": "care",
    "groupId": "care-talent-rule",
    "title": "培养内容",
    "entity": "培养内容",
    "pageType": "master",
    "icon": "天",
    "customerVisible": true,
    "fields": [
      {
        "name": "contentSet",
        "label": "所属内容库",
        "type": "select",
        "required": true,
        "options": [
          "成人天赋内容方案 A",
          "成人天赋内容方案 B",
          "儿童成长内容方案",
          "家庭沟通内容方案",
          "职业发展内容方案",
          "综合发展内容方案"
        ],
        "optionsSource": "talent-content-library"
      },
      {
        "name": "factor",
        "label": "天赋要素",
        "type": "select",
        "required": true,
        "options": [
          "逻辑思维",
          "空间感知",
          "语言表达",
          "专注力",
          "情绪感知",
          "行动规划"
        ],
        "optionsSource": "talent-factor"
      },
      {
        "name": "level",
        "label": "分级",
        "type": "select",
        "required": true,
        "options": [
          "L1",
          "L2",
          "L3",
          "L4",
          "L5",
          "L6"
        ],
        "dependsOn": [
          "factor"
        ],
        "optionsSource": "talent-level",
        "optionLabels": {
          "L1": "L1 · 潜能起步",
          "L2": "L2 · 稳定优势",
          "L3": "L3 · 明显优势",
          "L4": "L4 · 高阶优势",
          "L5": "L5 · 专长表现",
          "L6": "L6 · 卓越表现"
        }
      },
      {
        "name": "minAge",
        "label": "适用年龄下限",
        "type": "number",
        "required": true
      },
      {
        "name": "maxAge",
        "label": "适用年龄上限",
        "type": "number",
        "required": true
      },
      {
        "name": "gender",
        "label": "适用性别",
        "type": "select",
        "required": true,
        "options": [
          "男",
          "女",
          "通用"
        ]
      },
      {
        "name": "title",
        "label": "内容标题",
        "type": "text",
        "required": true
      },
      {
        "name": "content",
        "label": "内容正文",
        "type": "textarea",
        "required": true
      },
      {
        "name": "priority",
        "label": "候选顺序",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "contentSet",
      "factor",
      "level",
      "minAge",
      "maxAge",
      "gender",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "contentSet",
        "label": "所属内容库",
        "type": "select",
        "required": false,
        "options": [
          "成人天赋内容方案 A",
          "成人天赋内容方案 B",
          "儿童成长内容方案",
          "家庭沟通内容方案",
          "职业发展内容方案",
          "综合发展内容方案"
        ],
        "optionsSource": "talent-content-library"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable",
      "import"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable",
      "resource-import"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "talent-nurture-content"
    ],
    "editLockedStatuses": [],
    "description": "维护培养内容，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "talent-content-library",
    "domainId": "care",
    "groupId": "care-talent-rule",
    "title": "内容库",
    "entity": "内容库",
    "pageType": "master",
    "icon": "天",
    "customerVisible": true,
    "fields": [
      {
        "name": "contentSet",
        "label": "内容库名称",
        "type": "text",
        "required": true
      },
      {
        "name": "description",
        "label": "说明",
        "type": "textarea",
        "required": true
      },
      {
        "name": "scope",
        "label": "适用范围",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "contentSet",
      "description",
      "scope",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "contentSet",
        "label": "内容库名称",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "talent-content-library"
    ],
    "editLockedStatuses": [],
    "description": "维护内容库，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "talent-parent",
    "domainId": "care",
    "groupId": "care-talent-report",
    "title": "家长账户",
    "entity": "家长账户",
    "pageType": "master",
    "icon": "员",
    "customerVisible": false,
    "fields": [
      {
        "name": "parentName",
        "label": "家长姓名",
        "type": "text",
        "required": true
      },
      {
        "name": "mobile",
        "label": "家长手机号",
        "type": "text",
        "required": true
      },
      {
        "name": "idNo",
        "label": "身份证号",
        "type": "text",
        "required": true
      },
      {
        "name": "organization",
        "label": "机构",
        "type": "select",
        "required": true,
        "options": [
          "杭州天赋中心",
          "宁波天赋中心"
        ]
      },
      {
        "name": "channel",
        "label": "渠道",
        "type": "select",
        "required": true,
        "options": [
          "直营",
          "合作机构"
        ]
      },
      {
        "name": "status",
        "label": "状态",
        "type": "switch",
        "required": true,
        "options": [
          "启用",
          "停用"
        ]
      }
    ],
    "columns": [
      "parentName",
      "mobile",
      "idNo",
      "organization",
      "channel",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "parentName",
        "label": "家长姓名",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "启用",
          "停用"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable",
      "import"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable",
      "resource-import"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "talent-parent"
    ],
    "editLockedStatuses": [],
    "description": "维护家长账户，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "talent-child",
    "domainId": "care",
    "groupId": "care-talent-report",
    "title": "孩子成员",
    "entity": "孩子成员",
    "pageType": "master",
    "icon": "员",
    "customerVisible": false,
    "fields": [
      {
        "name": "parentId",
        "label": "所属会员",
        "type": "search-select",
        "required": true,
        "optionsSource": "talent-parent"
      },
      {
        "name": "childName",
        "label": "孩子姓名",
        "type": "text",
        "required": true
      },
      {
        "name": "idNo",
        "label": "孩子身份证号",
        "type": "text",
        "required": true
      },
      {
        "name": "relationType",
        "label": "关系类型",
        "type": "select",
        "required": true,
        "options": [
          "母亲",
          "父亲",
          "监护人"
        ]
      },
      {
        "name": "birthDate",
        "label": "出生日期",
        "type": "date",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "gender",
        "label": "性别",
        "type": "select",
        "required": false,
        "options": [
          "男",
          "女"
        ],
        "system": true,
        "readonly": true
      },
      {
        "name": "organization",
        "label": "机构",
        "type": "select",
        "required": false,
        "options": [
          "杭州天赋中心",
          "宁波天赋中心"
        ],
        "system": true,
        "readonly": true
      },
      {
        "name": "channel",
        "label": "渠道",
        "type": "select",
        "required": false,
        "options": [
          "直营",
          "合作机构"
        ],
        "system": true,
        "readonly": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "switch",
        "required": true,
        "options": [
          "启用",
          "停用"
        ]
      }
    ],
    "columns": [
      "parentId",
      "childName",
      "idNo",
      "relationType",
      "birthDate",
      "gender",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "parentId",
        "label": "所属会员",
        "type": "search-select",
        "required": false,
        "optionsSource": "talent-parent"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "启用",
          "停用"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable",
      "import"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable",
      "resource-import"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "talent-child"
    ],
    "editLockedStatuses": [],
    "description": "维护孩子成员，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "talent-member-relation",
    "domainId": "care",
    "groupId": "care-talent-report",
    "title": "家长孩子关系",
    "entity": "家长孩子关系",
    "pageType": "master",
    "icon": "员",
    "customerVisible": false,
    "fields": [
      {
        "name": "parentId",
        "label": "家长",
        "type": "search-select",
        "required": true,
        "optionsSource": "talent-parent"
      },
      {
        "name": "childId",
        "label": "孩子",
        "type": "search-select",
        "required": true,
        "optionsSource": "talent-child"
      },
      {
        "name": "relationType",
        "label": "关系类型",
        "type": "select",
        "required": true,
        "options": [
          "母亲",
          "父亲",
          "监护人"
        ]
      },
      {
        "name": "organization",
        "label": "机构",
        "type": "select",
        "required": true,
        "options": [
          "杭州天赋中心",
          "宁波天赋中心"
        ]
      },
      {
        "name": "channel",
        "label": "渠道",
        "type": "select",
        "required": true,
        "options": [
          "直营",
          "合作机构"
        ]
      },
      {
        "name": "status",
        "label": "状态",
        "type": "switch",
        "required": true,
        "options": [
          "启用",
          "停用"
        ]
      }
    ],
    "columns": [
      "parentId",
      "childId",
      "relationType",
      "organization",
      "channel",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "parentId",
        "label": "家长",
        "type": "search-select",
        "required": false,
        "optionsSource": "talent-parent"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "启用",
          "停用"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable",
      "import"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable",
      "resource-import"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "talent-member-relation"
    ],
    "editLockedStatuses": [],
    "description": "维护家长孩子关系，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "talent-report-type",
    "domainId": "care",
    "groupId": "care-talent-report",
    "title": "报告类型",
    "entity": "报告类型",
    "pageType": "master",
    "icon": "版",
    "customerVisible": false,
    "fields": [
      {
        "name": "reportType",
        "label": "报告类型",
        "type": "select",
        "required": true,
        "options": [
          "成人发展倾向",
          "儿童成长潜能",
          "职业兴趣倾向",
          "学习能力画像",
          "社会情绪能力",
          "综合发展能力"
        ]
      },
      {
        "name": "reportName",
        "label": "报告名称",
        "type": "text",
        "required": true
      },
      {
        "name": "ageRange",
        "label": "适用年龄段",
        "type": "select",
        "required": true,
        "options": [
          "儿童 6–11 岁",
          "青少年 12–17 岁",
          "成人 18–45 岁",
          "成熟期 46–65 岁",
          "全年龄"
        ]
      },
      {
        "name": "gender",
        "label": "适用性别",
        "type": "select",
        "required": true,
        "options": [
          "男",
          "女",
          "通用"
        ]
      },
      {
        "name": "contentSet",
        "label": "内容库",
        "type": "select",
        "required": true,
        "options": [
          "成人天赋内容方案 A",
          "成人天赋内容方案 B",
          "儿童成长内容方案",
          "家庭沟通内容方案",
          "职业发展内容方案",
          "综合发展内容方案"
        ],
        "optionsSource": "talent-content-library"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "switch",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "reportType",
      "reportName",
      "ageRange",
      "gender",
      "contentSet",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "reportType",
        "label": "报告类型",
        "type": "select",
        "required": false,
        "options": [
          "成人发展倾向",
          "儿童成长潜能",
          "职业兴趣倾向",
          "学习能力画像",
          "社会情绪能力",
          "综合发展能力"
        ]
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "talent-report-type"
    ],
    "editLockedStatuses": [],
    "description": "维护报告类型，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "talent-matching-rule",
    "domainId": "care",
    "groupId": "care-talent-report",
    "title": "天赋匹配规则",
    "entity": "天赋匹配规则",
    "pageType": "master",
    "icon": "版",
    "customerVisible": false,
    "fields": [
      {
        "name": "reportType",
        "label": "报告类型",
        "type": "search-select",
        "required": true,
        "optionsSource": "talent-report-type"
      },
      {
        "name": "factor",
        "label": "天赋要素",
        "type": "select",
        "required": true,
        "options": [
          "逻辑思维",
          "空间感知",
          "语言表达",
          "专注力",
          "情绪感知",
          "行动规划"
        ],
        "optionsSource": "talent-factor"
      },
      {
        "name": "resultMin",
        "label": "结果最小值",
        "type": "number",
        "required": true
      },
      {
        "name": "resultMax",
        "label": "结果最大值",
        "type": "number",
        "required": true
      },
      {
        "name": "level",
        "label": "目标分级",
        "type": "select",
        "required": true,
        "options": [
          "L1",
          "L2",
          "L3",
          "L4",
          "L5",
          "L6"
        ],
        "dependsOn": [
          "factor"
        ],
        "optionsSource": "talent-level",
        "optionLabels": {
          "L1": "L1 · 潜能起步",
          "L2": "L2 · 稳定优势",
          "L3": "L3 · 明显优势",
          "L4": "L4 · 高阶优势",
          "L5": "L5 · 专长表现",
          "L6": "L6 · 卓越表现"
        }
      },
      {
        "name": "contentSet",
        "label": "内容库",
        "type": "select",
        "required": true,
        "options": [
          "成人天赋内容方案 A",
          "成人天赋内容方案 B",
          "儿童成长内容方案",
          "家庭沟通内容方案",
          "职业发展内容方案",
          "综合发展内容方案"
        ],
        "optionsSource": "talent-content-library"
      },
      {
        "name": "candidateContent",
        "label": "候选培养内容",
        "type": "select",
        "required": true,
        "dependsOn": [
          "factor",
          "level",
          "contentSet"
        ],
        "optionsSource": "talent-nurture-content"
      },
      {
        "name": "priority",
        "label": "候选顺序",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "reportType",
      "factor",
      "resultMin",
      "resultMax",
      "level",
      "contentSet",
      "candidateContent",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "reportType",
        "label": "报告类型",
        "type": "search-select",
        "required": false,
        "optionsSource": "talent-report-type"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "create",
      "update",
      "delete",
      "enable",
      "disable"
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "talent-matching-rule"
    ],
    "editLockedStatuses": [],
    "description": "维护天赋匹配规则，支持查询、详情、新增、编辑、启停用与安全删除。"
  },
  {
    "id": "talent-generation",
    "domainId": "care",
    "groupId": "care-talent-report",
    "title": "第三方结果回传记录",
    "entity": "第三方结果回传记录",
    "pageType": "interface",
    "icon": "赋",
    "customerVisible": false,
    "fields": [
      {
        "name": "externalReportId",
        "label": "第三方报告编号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "revision",
        "label": "修订号",
        "type": "number",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "childIdNo",
        "label": "孩子身份证号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "analyzedAt",
        "label": "分析日期",
        "type": "datetime-local",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "resultVersion",
        "label": "结果版本",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "source",
        "label": "结果来源",
        "type": "select",
        "required": false,
        "options": [
          "接口回传"
        ],
        "system": true,
        "readonly": true
      },
      {
        "name": "receivedAt",
        "label": "接收时间",
        "type": "datetime-local",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "completeness",
        "label": "完整性",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "exceptionReason",
        "label": "异常原因",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "待校验",
          "待生成",
          "生成中",
          "已生成",
          "异常"
        ]
      }
    ],
    "columns": [
      "externalReportId",
      "revision",
      "childIdNo",
      "analyzedAt",
      "resultVersion",
      "source",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "externalReportId",
        "label": "第三方报告编号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "待校验",
          "待生成",
          "生成中",
          "已生成",
          "异常"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "retry"
    ],
    "rowActions": [
      "integration-retry"
    ],
    "batchActions": [],
    "statusActions": [
      "integration-retry"
    ],
    "integrationActions": [
      "integration-retry"
    ],
    "coverageIntegrationActions": [
      "integration-retry"
    ],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "talent-generation"
    ],
    "editLockedStatuses": [],
    "description": "查看第三方结果回传记录执行状态、失败原因、重试和人工补偿结果。"
  },
  {
    "id": "talent-report",
    "domainId": "care",
    "groupId": "care-talent-report",
    "title": "天赋报告",
    "entity": "天赋报告",
    "pageType": "document",
    "icon": "赋",
    "customerVisible": true,
    "fields": [
      {
        "name": "childId",
        "label": "孩子",
        "type": "search-select",
        "required": false,
        "optionsSource": "talent-child",
        "system": true,
        "readonly": true
      },
      {
        "name": "externalReportId",
        "label": "第三方报告编号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "revision",
        "label": "修订号",
        "type": "number",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "reportType",
        "label": "报告类型",
        "type": "select",
        "required": false,
        "options": [
          "成人发展倾向",
          "儿童成长潜能",
          "职业兴趣倾向",
          "学习能力画像",
          "社会情绪能力",
          "综合发展能力"
        ],
        "system": true,
        "readonly": true
      },
      {
        "name": "reportType",
        "label": "匹配报告类型",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "analyzedAt",
        "label": "分析日期",
        "type": "datetime-local",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "generatedAt",
        "label": "生成完成时间",
        "type": "datetime-local",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "contentSnapshot",
        "label": "内容快照",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "attachment",
        "label": "附件",
        "type": "text",
        "required": false
      },
      {
        "name": "sourceResultId",
        "label": "来源结果",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "待发布",
          "已发布",
          "已撤回",
          "已归档",
          "异常"
        ]
      }
    ],
    "columns": [
      "childId",
      "externalReportId",
      "revision",
      "reportType",
      "reportType",
      "analyzedAt",
      "status"
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "childId",
        "label": "孩子",
        "type": "search-select",
        "required": false,
        "optionsSource": "talent-child",
        "system": true,
        "readonly": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "待发布",
          "已发布",
          "已撤回",
          "已归档",
          "异常"
        ]
      }
    ],
    "capabilities": [
      "query",
      "detail",
      "publish",
      "withdraw",
      "archive",
      "export"
    ],
    "rowActions": [
      "resource-publish",
      "resource-withdraw",
      "resource-archive"
    ],
    "batchActions": [
      "resource-archive",
      "resource-export"
    ],
    "statusActions": [
      "resource-publish",
      "resource-withdraw",
      "resource-archive"
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "relationTabs": [
      "talent-report"
    ],
    "editLockedStatuses": [
      "待发布",
      "已发布",
      "已撤回",
      "已归档",
      "异常"
    ],
    "description": "查询并处理天赋报告，查看业务内容、当前状态和后续流转。"
  }
]

// 独立天赋报告只暴露最小闭环字段；规则内部仍可用于匹配，但不作为业务版本/历史页面展示。
for (const resource of resourceRegistry.filter(item => item.id.startsWith('talent-'))) {
  resource.fields = (resource.fields || []).filter(field => !['revision', 'resultVersion', 'contentSnapshot', 'attachment'].includes(field.name))
  resource.columns = [...new Set((resource.columns || []).filter(field => !['revision', 'resultVersion', 'contentSnapshot', 'attachment'].includes(field)))]
  resource.rowActions = (resource.rowActions || []).filter(action => action !== 'resource-archive')
  resource.batchActions = (resource.batchActions || []).filter(action => action !== 'resource-archive')
  resource.statusActions = (resource.statusActions || []).filter(action => action !== 'resource-archive')
  for (const section of resource.formSections || []) {
    const seen = new Set()
    section.fields = (section.fields || []).filter(field => {
      const name = typeof field === 'string' ? field : field.name
      if (['revision', 'resultVersion', 'contentSnapshot', 'attachment'].includes(name) || seen.has(name)) return false
      seen.add(name)
      return true
    })
  }
  for (const group of resource.detailGroups || []) {
    const seen = new Set()
    group.fields = (group.fields || []).filter(name => {
      if (seen.has(name) || ['revision', 'resultVersion', 'contentSnapshot', 'attachment'].includes(name)) return false
      seen.add(name)
      return true
    })
  }
}
const talentReportResource = resourceRegistry.find(item => item.id === 'talent-report')
if (talentReportResource) {
  const statusField = talentReportResource.fields.find(field => field.name === 'status')
  if (statusField) statusField.options = ['待发布', '已发布', '已撤回', '异常']
}
for (const internalRuleResource of resourceRegistry.filter(item => ['talent-report-type', 'talent-matching-rule'].includes(item.id))) internalRuleResource.hidden = true

export const workbenchRegistry = [
  {
    "resourceId": "hr-organization",
    "domainId": "people",
    "groupId": "people-org",
    "pageType": "master",
    "title": "组织",
    "description": "维护组织，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "parentName",
        "label": "家长姓名",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "parentName",
      "owner",
      "scope",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "parentName",
          "owner",
          "scope",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "parentName",
            "label": "家长姓名",
            "type": "text",
            "required": true
          },
          {
            "name": "owner",
            "label": "负责人/经办人",
            "type": "text",
            "required": true
          },
          {
            "name": "scope",
            "label": "数据范围",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "已启用",
              "已停用"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "relationTabs": [
      "hr-organization"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "parentName",
        "label": "家长姓名",
        "type": "text",
        "required": true
      },
      {
        "name": "owner",
        "label": "负责人/经办人",
        "type": "text",
        "required": true
      },
      {
        "name": "scope",
        "label": "数据范围",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "hr-employee",
    "domainId": "people",
    "groupId": "people-org",
    "pageType": "master",
    "title": "员工资料",
    "description": "维护员工资料，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "department",
        "label": "所属部门",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "在职",
          "离职",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "department",
      "position",
      "rank",
      "mobile",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "department",
          "position",
          "rank",
          "mobile",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "department",
            "label": "所属部门",
            "type": "text",
            "required": true
          },
          {
            "name": "position",
            "label": "岗位",
            "type": "text",
            "required": true
          },
          {
            "name": "rank",
            "label": "职级",
            "type": "text",
            "required": true
          },
          {
            "name": "mobile",
            "label": "联系电话",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "在职",
              "离职",
              "已停用"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable",
      "resource-import",
      "resource-export"
    ],
    "statusActions": [],
    "relationTabs": [
      "hr-employee"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "department",
        "label": "所属部门",
        "type": "text",
        "required": true
      },
      {
        "name": "position",
        "label": "岗位",
        "type": "text",
        "required": true
      },
      {
        "name": "rank",
        "label": "职级",
        "type": "text",
        "required": true
      },
      {
        "name": "mobile",
        "label": "联系电话",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "在职",
          "离职",
          "已停用"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "hr-position",
    "domainId": "people",
    "groupId": "people-org",
    "pageType": "master",
    "title": "岗位",
    "description": "维护岗位，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "department",
        "label": "所属部门",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "department",
      "scope",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "department",
          "scope",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "department",
            "label": "所属部门",
            "type": "text",
            "required": true
          },
          {
            "name": "scope",
            "label": "数据范围",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "已启用",
              "已停用"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "relationTabs": [
      "hr-position"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "department",
        "label": "所属部门",
        "type": "text",
        "required": true
      },
      {
        "name": "scope",
        "label": "数据范围",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "hr-rank",
    "domainId": "people",
    "groupId": "people-org",
    "pageType": "master",
    "title": "职级",
    "description": "维护职级，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "rank",
        "label": "职级",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "rank",
      "scope",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "rank",
          "scope",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "rank",
            "label": "职级",
            "type": "text",
            "required": true
          },
          {
            "name": "scope",
            "label": "数据范围",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "已启用",
              "已停用"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "relationTabs": [
      "hr-rank"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "rank",
        "label": "职级",
        "type": "text",
        "required": true
      },
      {
        "name": "scope",
        "label": "数据范围",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "hr-employment",
    "domainId": "people",
    "groupId": "people-org",
    "pageType": "master",
    "title": "任职关系",
    "description": "维护任职关系，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "employee",
        "label": "员工",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "employee",
      "organization",
      "position",
      "startDate",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "employee",
          "organization",
          "position",
          "startDate",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "employee",
            "label": "员工",
            "type": "text",
            "required": true
          },
          {
            "name": "organization",
            "label": "所属组织",
            "type": "text",
            "required": true
          },
          {
            "name": "position",
            "label": "岗位",
            "type": "text",
            "required": true
          },
          {
            "name": "startDate",
            "label": "任职开始",
            "type": "date",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "已启用",
              "已停用"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "relationTabs": [
      "hr-employment"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "employee",
        "label": "员工",
        "type": "text",
        "required": true
      },
      {
        "name": "organization",
        "label": "所属组织",
        "type": "text",
        "required": true
      },
      {
        "name": "position",
        "label": "岗位",
        "type": "text",
        "required": true
      },
      {
        "name": "startDate",
        "label": "任职开始",
        "type": "date",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "hr-shift",
    "domainId": "people",
    "groupId": "people-schedule",
    "pageType": "master",
    "title": "班次",
    "description": "维护班次，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "shiftTime",
        "label": "班次时段",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "shiftTime",
      "scope",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "shiftTime",
          "scope",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "shiftTime",
            "label": "班次时段",
            "type": "text",
            "required": true
          },
          {
            "name": "scope",
            "label": "数据范围",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "已启用",
              "已停用"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "relationTabs": [
      "hr-shift"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "shiftTime",
        "label": "班次时段",
        "type": "text",
        "required": true
      },
      {
        "name": "scope",
        "label": "数据范围",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "hr-schedule",
    "domainId": "people",
    "groupId": "people-schedule",
    "pageType": "document",
    "title": "排班",
    "description": "查询并处理排班，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "employee",
        "label": "员工",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "已撤回",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "employee",
      "date",
      "shift",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "employee",
          "date",
          "shift",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "employee",
            "label": "员工",
            "type": "text",
            "required": true
          },
          {
            "name": "date",
            "label": "排班日期",
            "type": "date",
            "required": true
          },
          {
            "name": "shift",
            "label": "班次",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待审批",
              "已通过",
              "已撤回",
              "已取消"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "relationTabs": [
      "hr-schedule"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "employee",
        "label": "员工",
        "type": "text",
        "required": true
      },
      {
        "name": "date",
        "label": "排班日期",
        "type": "date",
        "required": true
      },
      {
        "name": "shift",
        "label": "班次",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "已撤回",
          "已取消"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "hr-shift-change",
    "domainId": "people",
    "groupId": "people-schedule",
    "pageType": "document",
    "title": "调班申请",
    "description": "查询并处理调班申请，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "employee",
        "label": "员工",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "已驳回",
          "已撤回"
        ]
      }
    ],
    "columns": [
      "name",
      "employee",
      "date",
      "shift",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "employee",
          "date",
          "shift",
          "reason",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "employee",
            "label": "员工",
            "type": "text",
            "required": true
          },
          {
            "name": "date",
            "label": "原排班日期",
            "type": "date",
            "required": true
          },
          {
            "name": "shift",
            "label": "目标班次",
            "type": "text",
            "required": true
          },
          {
            "name": "reason",
            "label": "原因/说明",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待审批",
              "已通过",
              "已驳回",
              "已撤回"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "approval-approve",
      "approval-reject"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "approval-approve",
      "approval-reject"
    ],
    "relationTabs": [
      "hr-shift-change"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "employee",
        "label": "员工",
        "type": "text",
        "required": true
      },
      {
        "name": "date",
        "label": "原排班日期",
        "type": "date",
        "required": true
      },
      {
        "name": "shift",
        "label": "目标班次",
        "type": "text",
        "required": true
      },
      {
        "name": "reason",
        "label": "原因/说明",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "已驳回",
          "已撤回"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "hr-office-supply",
    "domainId": "people",
    "groupId": "people-admin",
    "pageType": "document",
    "title": "办公用品",
    "description": "查询并处理办公用品，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "specification",
        "label": "规格型号",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "specification",
      "balance",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "specification",
          "balance",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "specification",
            "label": "规格型号",
            "type": "text",
            "required": true
          },
          {
            "name": "balance",
            "label": "库存数量",
            "type": "number",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待审批",
              "已通过",
              "已取消"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "relationTabs": [
      "hr-office-supply"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "specification",
        "label": "规格型号",
        "type": "text",
        "required": true
      },
      {
        "name": "balance",
        "label": "库存数量",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "已取消"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "hr-meeting-room",
    "domainId": "people",
    "groupId": "people-admin",
    "pageType": "document",
    "title": "会议室",
    "description": "查询并处理会议室，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "meetingRoom",
        "label": "会议室",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "meetingRoom",
      "time",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "meetingRoom",
          "time",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "meetingRoom",
            "label": "会议室",
            "type": "text",
            "required": true
          },
          {
            "name": "time",
            "label": "可预约时段",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待审批",
              "已通过",
              "已取消"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "relationTabs": [
      "hr-meeting-room"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "meetingRoom",
        "label": "会议室",
        "type": "text",
        "required": true
      },
      {
        "name": "time",
        "label": "可预约时段",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "已取消"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "hr-vehicle",
    "domainId": "people",
    "groupId": "people-admin",
    "pageType": "document",
    "title": "车辆与用车",
    "description": "查询并处理车辆与用车，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "vehicleNo",
        "label": "车辆号牌",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "vehicleNo",
      "time",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "vehicleNo",
          "time",
          "reason",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "vehicleNo",
            "label": "车辆号牌",
            "type": "text",
            "required": true
          },
          {
            "name": "time",
            "label": "用车时间",
            "type": "date",
            "required": true
          },
          {
            "name": "reason",
            "label": "原因/说明",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待审批",
              "已通过",
              "已取消"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "relationTabs": [
      "hr-vehicle"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "vehicleNo",
        "label": "车辆号牌",
        "type": "text",
        "required": true
      },
      {
        "name": "time",
        "label": "用车时间",
        "type": "date",
        "required": true
      },
      {
        "name": "reason",
        "label": "原因/说明",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "已取消"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "hr-seal",
    "domainId": "people",
    "groupId": "people-admin",
    "pageType": "document",
    "title": "用印申请",
    "description": "查询并处理用印申请，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "sealType",
        "label": "印章类型",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "sealType",
      "contractParty",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "sealType",
          "contractParty",
          "reason",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "sealType",
            "label": "印章类型",
            "type": "text",
            "required": true
          },
          {
            "name": "contractParty",
            "label": "合同相对方",
            "type": "text",
            "required": true
          },
          {
            "name": "reason",
            "label": "原因/说明",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待审批",
              "已通过",
              "已取消"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "relationTabs": [
      "hr-seal"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "sealType",
        "label": "印章类型",
        "type": "text",
        "required": true
      },
      {
        "name": "contractParty",
        "label": "合同相对方",
        "type": "text",
        "required": true
      },
      {
        "name": "reason",
        "label": "原因/说明",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "已取消"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "hr-contract",
    "domainId": "people",
    "groupId": "people-admin",
    "pageType": "document",
    "title": "合同台账",
    "description": "查询并处理合同台账，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "contractParty",
        "label": "合同相对方",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "contractParty",
      "amount",
      "endDate",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "contractParty",
          "amount",
          "endDate",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "contractParty",
            "label": "合同相对方",
            "type": "text",
            "required": true
          },
          {
            "name": "amount",
            "label": "合同金额",
            "type": "number",
            "required": true
          },
          {
            "name": "endDate",
            "label": "到期日期",
            "type": "date",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待审批",
              "已通过",
              "已取消"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "relationTabs": [
      "hr-contract"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "contractParty",
        "label": "合同相对方",
        "type": "text",
        "required": true
      },
      {
        "name": "amount",
        "label": "合同金额",
        "type": "number",
        "required": true
      },
      {
        "name": "endDate",
        "label": "到期日期",
        "type": "date",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "已取消"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "hr-policy",
    "domainId": "people",
    "groupId": "people-admin",
    "pageType": "document",
    "title": "制度文件",
    "description": "查询并处理制度文件，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "fileName",
        "label": "文件名",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "fileName",
      "effectiveTime",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "fileName",
          "effectiveTime",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "fileName",
            "label": "文件名",
            "type": "text",
            "required": true
          },
          {
            "name": "effectiveTime",
            "label": "生效日期",
            "type": "date",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待审批",
              "已通过",
              "已取消"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "relationTabs": [
      "hr-policy"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "fileName",
        "label": "文件名",
        "type": "text",
        "required": true
      },
      {
        "name": "effectiveTime",
        "label": "生效日期",
        "type": "date",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "已取消"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "hr-archive-loan",
    "domainId": "people",
    "groupId": "people-admin",
    "pageType": "document",
    "title": "档案借阅",
    "description": "查询并处理档案借阅，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "archiveNo",
        "label": "档案编号",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "archiveNo",
      "applicant",
      "endDate",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "archiveNo",
          "applicant",
          "endDate",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "archiveNo",
            "label": "档案编号",
            "type": "text",
            "required": true
          },
          {
            "name": "applicant",
            "label": "申请人",
            "type": "text",
            "required": true
          },
          {
            "name": "endDate",
            "label": "归还日期",
            "type": "date",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待审批",
              "已通过",
              "已取消"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "relationTabs": [
      "hr-archive-loan"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "archiveNo",
        "label": "档案编号",
        "type": "text",
        "required": true
      },
      {
        "name": "applicant",
        "label": "申请人",
        "type": "text",
        "required": true
      },
      {
        "name": "endDate",
        "label": "归还日期",
        "type": "date",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "已取消"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "hr-expense-claim",
    "domainId": "people",
    "groupId": "people-admin",
    "pageType": "document",
    "title": "费用报销",
    "description": "查询并处理费用报销，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "expenseType",
        "label": "报销类型",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "expenseType",
      "amount",
      "costCenter",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "expenseType",
          "amount",
          "costCenter",
          "reason",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "expenseType",
            "label": "报销类型",
            "type": "text",
            "required": true
          },
          {
            "name": "amount",
            "label": "报销金额",
            "type": "number",
            "required": true
          },
          {
            "name": "costCenter",
            "label": "成本中心",
            "type": "text",
            "required": true
          },
          {
            "name": "reason",
            "label": "原因/说明",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待审批",
              "已通过",
              "已取消"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "relationTabs": [
      "hr-expense-claim"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "expenseType",
        "label": "报销类型",
        "type": "text",
        "required": true
      },
      {
        "name": "amount",
        "label": "报销金额",
        "type": "number",
        "required": true
      },
      {
        "name": "costCenter",
        "label": "成本中心",
        "type": "text",
        "required": true
      },
      {
        "name": "reason",
        "label": "原因/说明",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "已取消"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "approval-form",
    "domainId": "people",
    "groupId": "people-approval",
    "pageType": "master",
    "title": "业务表单",
    "description": "维护业务表单，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "formCode",
        "label": "表单编码",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已发布",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "formCode",
      "module",
      "node",
      "assignee",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "formCode",
          "module",
          "node",
          "assignee",
          "expression",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "formCode",
            "label": "表单编码",
            "type": "text",
            "required": true
          },
          {
            "name": "module",
            "label": "模块",
            "type": "text",
            "required": true
          },
          {
            "name": "node",
            "label": "审批节点",
            "type": "text",
            "required": true
          },
          {
            "name": "assignee",
            "label": "审批人",
            "type": "text",
            "required": true
          },
          {
            "name": "expression",
            "label": "条件表达式",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "已发布",
              "已停用"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable",
      "approval-form-copy"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "relationTabs": [
      "approval-form"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "formCode",
        "label": "表单编码",
        "type": "text",
        "required": true
      },
      {
        "name": "module",
        "label": "模块",
        "type": "text",
        "required": true
      },
      {
        "name": "node",
        "label": "审批节点",
        "type": "text",
        "required": true
      },
      {
        "name": "assignee",
        "label": "审批人",
        "type": "text",
        "required": true
      },
      {
        "name": "expression",
        "label": "条件表达式",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已发布",
          "已停用"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [
      "approval-form-design",
      "resource-publish",
      "resource-withdraw"
    ],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "approval-flow",
    "domainId": "people",
    "groupId": "people-approval",
    "pageType": "master",
    "title": "审批流程",
    "description": "维护审批流程，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "module",
        "label": "模块",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已发布",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "module",
      "node",
      "version",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "module",
          "node",
          "version",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "module",
            "label": "模块",
            "type": "text",
            "required": true
          },
          {
            "name": "node",
            "label": "审批节点",
            "type": "text",
            "required": true
          },
          {
            "name": "version",
            "label": "版本号",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "已发布",
              "已停用"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable",
      "approval-flow-copy"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "relationTabs": [
      "approval-flow"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "module",
        "label": "模块",
        "type": "text",
        "required": true
      },
      {
        "name": "node",
        "label": "审批节点",
        "type": "text",
        "required": true
      },
      {
        "name": "version",
        "label": "版本号",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已发布",
          "已停用"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [
      "resource-publish",
      "resource-withdraw"
    ],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "approval-node",
    "domainId": "people",
    "groupId": "people-approval",
    "pageType": "master",
    "title": "审批节点",
    "description": "维护审批节点，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "node",
        "label": "审批节点",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "node",
      "assignee",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "node",
          "assignee",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "node",
            "label": "审批节点",
            "type": "text",
            "required": true
          },
          {
            "name": "assignee",
            "label": "审批人",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "已启用",
              "已停用"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable",
      "approval-node-sort"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "relationTabs": [
      "approval-node"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "node",
        "label": "审批节点",
        "type": "text",
        "required": true
      },
      {
        "name": "assignee",
        "label": "审批人",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "已启用",
          "已停用"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "approval-assignee",
    "domainId": "people",
    "groupId": "people-approval",
    "pageType": "master",
    "title": "审批人员配置",
    "description": "维护审批人员配置，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "node",
        "label": "审批节点",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "node",
      "assignee",
      "scope",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "node",
          "assignee",
          "scope",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "node",
            "label": "审批节点",
            "type": "text",
            "required": true
          },
          {
            "name": "assignee",
            "label": "审批人",
            "type": "text",
            "required": true
          },
          {
            "name": "scope",
            "label": "数据范围",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "已启用",
              "已停用"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "relationTabs": [
      "approval-assignee"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "node",
        "label": "审批节点",
        "type": "text",
        "required": true
      },
      {
        "name": "assignee",
        "label": "审批人",
        "type": "text",
        "required": true
      },
      {
        "name": "scope",
        "label": "数据范围",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "已启用",
          "已停用"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "approval-branch",
    "domainId": "people",
    "groupId": "people-approval",
    "pageType": "master",
    "title": "条件分支",
    "description": "维护条件分支，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "node",
        "label": "审批节点",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "node",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "node",
          "expression",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "node",
            "label": "审批节点",
            "type": "text",
            "required": true
          },
          {
            "name": "expression",
            "label": "条件表达式",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "已启用",
              "已停用"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable",
      "approval-branch-sort"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "relationTabs": [
      "approval-branch"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "node",
        "label": "审批节点",
        "type": "text",
        "required": true
      },
      {
        "name": "expression",
        "label": "条件表达式",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "已启用",
          "已停用"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "approval-application",
    "domainId": "people",
    "groupId": "people-approval",
    "pageType": "document",
    "title": "审批申请",
    "description": "查询并处理审批申请，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "businessId",
        "label": "业务单号",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "已驳回",
          "已撤回",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "businessId",
      "applicant",
      "module",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "businessId",
          "applicant",
          "module",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "businessId",
            "label": "业务单号",
            "type": "text",
            "required": true
          },
          {
            "name": "applicant",
            "label": "申请人",
            "type": "text",
            "required": true
          },
          {
            "name": "module",
            "label": "模块",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待审批",
              "已通过",
              "已驳回",
              "已撤回",
              "已取消"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "integration-execute"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "integration-execute"
    ],
    "relationTabs": [
      "approval-application"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "businessId",
        "label": "业务单号",
        "type": "text",
        "required": true
      },
      {
        "name": "applicant",
        "label": "申请人",
        "type": "text",
        "required": true
      },
      {
        "name": "module",
        "label": "模块",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "已驳回",
          "已撤回",
          "已取消"
        ]
      }
    ],
    "integrationActions": [
      "integration-execute"
    ],
    "coverageIntegrationActions": [
      "integration-execute"
    ],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "approval-task",
    "domainId": "people",
    "groupId": "people-approval",
    "pageType": "approval",
    "title": "审批任务",
    "description": "处理审批任务，支持通过、驳回、退回和转办等状态动作。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "businessId",
        "label": "业务单号",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "待处理",
          "已通过",
          "已驳回",
          "已退回",
          "已转办"
        ]
      }
    ],
    "columns": [
      "name",
      "businessId",
      "node",
      "assignee",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "businessId",
          "node",
          "assignee",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "businessId",
            "label": "业务单号",
            "type": "text",
            "required": true
          },
          {
            "name": "node",
            "label": "审批节点",
            "type": "text",
            "required": true
          },
          {
            "name": "assignee",
            "label": "审批人",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "待处理",
              "已通过",
              "已驳回",
              "已退回",
              "已转办"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "approval-approve",
      "approval-reject",
      "approval-return",
      "approval-transfer"
    ],
    "batchActions": [],
    "statusActions": [
      "approval-approve",
      "approval-reject",
      "approval-return",
      "approval-transfer"
    ],
    "relationTabs": [
      "operation-log"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "businessId",
        "label": "业务单号",
        "type": "text",
        "required": true
      },
      {
        "name": "node",
        "label": "审批节点",
        "type": "text",
        "required": true
      },
      {
        "name": "assignee",
        "label": "审批人",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "待处理",
          "已通过",
          "已驳回",
          "已退回",
          "已转办"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "approval-notice",
    "domainId": "people",
    "groupId": "people-approval",
    "pageType": "document",
    "title": "公告",
    "description": "查询并处理公告，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "audience",
        "label": "接收范围",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已发布",
          "已撤回"
        ]
      }
    ],
    "columns": [
      "name",
      "audience",
      "messageType",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "audience",
          "content",
          "messageType",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "audience",
            "label": "接收范围",
            "type": "text",
            "required": true
          },
          {
            "name": "content",
            "label": "正文内容",
            "type": "text",
            "required": true
          },
          {
            "name": "messageType",
            "label": "消息类型",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "已发布",
              "已撤回"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-publish",
      "resource-withdraw",
      "resource-delete"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-publish",
      "resource-withdraw"
    ],
    "relationTabs": [
      "approval-notice"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "audience",
        "label": "接收范围",
        "type": "text",
        "required": true
      },
      {
        "name": "content",
        "label": "正文内容",
        "type": "text",
        "required": true
      },
      {
        "name": "messageType",
        "label": "消息类型",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已发布",
          "已撤回"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "approval-message",
    "domainId": "people",
    "groupId": "people-approval",
    "pageType": "readonly",
    "title": "业务消息",
    "description": "查看业务消息详情和关联记录。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "messageType",
        "label": "消息类型",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "未读",
          "已读",
          "已发送"
        ]
      }
    ],
    "columns": [
      "name",
      "messageType",
      "businessId",
      "audience",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "messageType",
          "businessId",
          "audience",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "messageType",
            "label": "消息类型",
            "type": "text",
            "required": true
          },
          {
            "name": "businessId",
            "label": "业务单号",
            "type": "text",
            "required": true
          },
          {
            "name": "audience",
            "label": "接收范围",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "未读",
              "已读",
              "已发送"
            ]
          }
        ]
      }
    ],
    "rowActions": [],
    "batchActions": [
      "resource-export"
    ],
    "statusActions": [],
    "relationTabs": [
      "approval-message"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "messageType",
        "label": "消息类型",
        "type": "text",
        "required": true
      },
      {
        "name": "businessId",
        "label": "业务单号",
        "type": "text",
        "required": true
      },
      {
        "name": "audience",
        "label": "接收范围",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "未读",
          "已读",
          "已发送"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "supply-supplier",
    "domainId": "supply",
    "groupId": "supply-master",
    "pageType": "master",
    "title": "供应商",
    "description": "维护供应商，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "supplier",
        "label": "供应商名称",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "supplier",
      "supplierLevel",
      "contact",
      "mobile",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "supplier",
          "supplierLevel",
          "contact",
          "mobile",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "supplier",
            "label": "供应商名称",
            "type": "text",
            "required": true
          },
          {
            "name": "supplierLevel",
            "label": "供应商等级",
            "type": "select",
            "required": true,
            "options": [
              "A 级",
              "B 级",
              "C 级"
            ]
          },
          {
            "name": "contact",
            "label": "联系人",
            "type": "text",
            "required": true
          },
          {
            "name": "mobile",
            "label": "联系电话",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "已启用",
              "已停用"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable",
      "resource-import",
      "resource-export"
    ],
    "statusActions": [],
    "relationTabs": [
      "supply-supplier"
    ],
    "fields": [
      {
        "name": "supplier",
        "label": "供应商名称",
        "type": "text",
        "required": true
      },
      {
        "name": "supplierLevel",
        "label": "供应商等级",
        "type": "select",
        "required": true,
        "options": [
          "A 级",
          "B 级",
          "C 级"
        ]
      },
      {
        "name": "contact",
        "label": "联系人",
        "type": "text",
        "required": true
      },
      {
        "name": "mobile",
        "label": "联系电话",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "已启用",
          "已停用"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "supply-material",
    "domainId": "supply",
    "groupId": "supply-master",
    "pageType": "master",
    "title": "物料资料",
    "description": "维护物料资料，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "material",
        "label": "物料名称",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "material",
      "specification",
      "unit",
      "assetCategory",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "material",
          "specification",
          "unit",
          "assetCategory",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "material",
            "label": "物料名称",
            "type": "text",
            "required": true
          },
          {
            "name": "specification",
            "label": "规格型号",
            "type": "text",
            "required": true
          },
          {
            "name": "unit",
            "label": "计量单位",
            "type": "select",
            "required": true,
            "options": [
              "盒",
              "套",
              "支",
              "瓶"
            ]
          },
          {
            "name": "assetCategory",
            "label": "物料分类",
            "type": "select",
            "required": true,
            "options": [
              "医疗耗材",
              "药品",
              "产品",
              "办公物料"
            ]
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "已启用",
              "已停用"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable",
      "resource-import",
      "resource-export"
    ],
    "statusActions": [],
    "relationTabs": [
      "supply-material"
    ],
    "fields": [
      {
        "name": "material",
        "label": "物料名称",
        "type": "text",
        "required": true
      },
      {
        "name": "specification",
        "label": "规格型号",
        "type": "text",
        "required": true
      },
      {
        "name": "unit",
        "label": "计量单位",
        "type": "select",
        "required": true,
        "options": [
          "盒",
          "套",
          "支",
          "瓶"
        ]
      },
      {
        "name": "assetCategory",
        "label": "物料分类",
        "type": "select",
        "required": true,
        "options": [
          "医疗耗材",
          "药品",
          "产品",
          "办公物料"
        ]
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "已启用",
          "已停用"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "supply-warehouse-location",
    "domainId": "supply",
    "groupId": "supply-master",
    "pageType": "master",
    "title": "仓库与库位",
    "description": "维护仓库与库位，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "warehouse",
        "label": "仓库",
        "type": "select",
        "required": false,
        "options": [
          "杭州一号仓",
          "宁波周转仓",
          "滨江冷链仓",
          "嘉兴备件仓"
        ]
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "warehouse",
      "location",
      "organization",
      "owner",
      "scope",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "warehouse",
          "location",
          "organization",
          "owner",
          "scope",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "warehouse",
            "label": "仓库",
            "type": "select",
            "required": true,
            "options": [
              "杭州一号仓",
              "宁波周转仓",
              "滨江冷链仓",
              "嘉兴备件仓"
            ]
          },
          {
            "name": "location",
            "label": "库位",
            "type": "select",
            "required": true,
            "options": [
              "A-01-08",
              "A-02-03",
              "B-01-05",
              "B-03-02"
            ],
            "dependsOn": [
              "warehouse"
            ],
            "optionsSource": "warehouse-location"
          },
          {
            "name": "organization",
            "label": "所属组织",
            "type": "select",
            "required": true,
            "options": [
              "采购管理部",
              "健康管理中心",
              "护理部",
              "医学服务部"
            ]
          },
          {
            "name": "owner",
            "label": "负责人",
            "type": "select",
            "required": true,
            "options": [
              "孙琪",
              "刘敏",
              "方媛",
              "王主管"
            ]
          },
          {
            "name": "scope",
            "label": "容量/用途",
            "type": "textarea",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "已启用",
              "已停用"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "relationTabs": [
      "supply-warehouse-location"
    ],
    "fields": [
      {
        "name": "warehouse",
        "label": "仓库",
        "type": "select",
        "required": true,
        "options": [
          "杭州一号仓",
          "宁波周转仓",
          "滨江冷链仓",
          "嘉兴备件仓"
        ]
      },
      {
        "name": "location",
        "label": "库位",
        "type": "select",
        "required": true,
        "options": [
          "A-01-08",
          "A-02-03",
          "B-01-05",
          "B-03-02"
        ],
        "dependsOn": [
          "warehouse"
        ],
        "optionsSource": "warehouse-location"
      },
      {
        "name": "organization",
        "label": "所属组织",
        "type": "select",
        "required": true,
        "options": [
          "采购管理部",
          "健康管理中心",
          "护理部",
          "医学服务部"
        ]
      },
      {
        "name": "owner",
        "label": "负责人",
        "type": "select",
        "required": true,
        "options": [
          "孙琪",
          "刘敏",
          "方媛",
          "王主管"
        ]
      },
      {
        "name": "scope",
        "label": "容量/用途",
        "type": "textarea",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "已启用",
          "已停用"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "supply-warehouse",
    "domainId": "supply",
    "groupId": "supply-master",
    "pageType": "master",
    "title": "仓库",
    "description": "维护仓库，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "warehouse",
        "label": "仓库",
        "type": "select",
        "required": false,
        "options": [
          "杭州一号仓",
          "宁波周转仓",
          "滨江冷链仓",
          "嘉兴备件仓"
        ]
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "warehouse",
      "organization",
      "owner",
      "location",
      "scope",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "warehouse",
          "organization",
          "owner",
          "location",
          "scope",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "warehouse",
            "label": "仓库",
            "type": "select",
            "required": true,
            "options": [
              "杭州一号仓",
              "宁波周转仓",
              "滨江冷链仓",
              "嘉兴备件仓"
            ]
          },
          {
            "name": "organization",
            "label": "所属组织",
            "type": "select",
            "required": true,
            "options": [
              "采购管理部",
              "健康管理中心",
              "护理部",
              "医学服务部"
            ]
          },
          {
            "name": "owner",
            "label": "负责人",
            "type": "select",
            "required": true,
            "options": [
              "孙琪",
              "刘敏",
              "方媛",
              "王主管"
            ]
          },
          {
            "name": "location",
            "label": "地址",
            "type": "text",
            "required": true
          },
          {
            "name": "scope",
            "label": "数据范围",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "已启用",
              "已停用"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "relationTabs": [
      "supply-warehouse"
    ],
    "fields": [
      {
        "name": "warehouse",
        "label": "仓库",
        "type": "select",
        "required": true,
        "options": [
          "杭州一号仓",
          "宁波周转仓",
          "滨江冷链仓",
          "嘉兴备件仓"
        ]
      },
      {
        "name": "organization",
        "label": "所属组织",
        "type": "select",
        "required": true,
        "options": [
          "采购管理部",
          "健康管理中心",
          "护理部",
          "医学服务部"
        ]
      },
      {
        "name": "owner",
        "label": "负责人",
        "type": "select",
        "required": true,
        "options": [
          "孙琪",
          "刘敏",
          "方媛",
          "王主管"
        ]
      },
      {
        "name": "location",
        "label": "地址",
        "type": "text",
        "required": true
      },
      {
        "name": "scope",
        "label": "数据范围",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "已启用",
          "已停用"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": false
  },
  {
    "resourceId": "supply-location",
    "domainId": "supply",
    "groupId": "supply-master",
    "pageType": "master",
    "title": "库位",
    "description": "维护库位，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "warehouse",
        "label": "仓库",
        "type": "select",
        "required": false,
        "options": [
          "杭州一号仓",
          "宁波周转仓",
          "滨江冷链仓",
          "嘉兴备件仓"
        ]
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "warehouse",
      "location",
      "scope",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "warehouse",
          "location",
          "scope",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "warehouse",
            "label": "仓库",
            "type": "select",
            "required": true,
            "options": [
              "杭州一号仓",
              "宁波周转仓",
              "滨江冷链仓",
              "嘉兴备件仓"
            ]
          },
          {
            "name": "location",
            "label": "库位",
            "type": "select",
            "required": true,
            "options": [
              "A-01-08",
              "A-02-03",
              "B-01-05",
              "B-03-02"
            ],
            "dependsOn": [
              "warehouse"
            ],
            "optionsSource": "warehouse-location"
          },
          {
            "name": "scope",
            "label": "容量/用途",
            "type": "textarea",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "已启用",
              "已停用"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "relationTabs": [
      "supply-location"
    ],
    "fields": [
      {
        "name": "warehouse",
        "label": "仓库",
        "type": "select",
        "required": true,
        "options": [
          "杭州一号仓",
          "宁波周转仓",
          "滨江冷链仓",
          "嘉兴备件仓"
        ]
      },
      {
        "name": "location",
        "label": "库位",
        "type": "select",
        "required": true,
        "options": [
          "A-01-08",
          "A-02-03",
          "B-01-05",
          "B-03-02"
        ],
        "dependsOn": [
          "warehouse"
        ],
        "optionsSource": "warehouse-location"
      },
      {
        "name": "scope",
        "label": "容量/用途",
        "type": "textarea",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "已启用",
          "已停用"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": false
  },
  {
    "resourceId": "purchase-request",
    "domainId": "supply",
    "groupId": "supply-purchase",
    "pageType": "document",
    "title": "采购申请",
    "description": "查询并处理采购申请，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "systemNo",
        "label": "采购申请号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "执行中",
          "已关闭",
          "已取消"
        ]
      }
    ],
    "columns": [
      "systemNo",
      "applicant",
      "requestDepartment",
      "purchaseType",
      "material",
      "quantity",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "systemNo",
          "applicant",
          "requestDepartment",
          "purchaseType",
          "material",
          "quantity",
          "amount",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "systemNo",
            "label": "采购申请号",
            "type": "text",
            "required": false,
            "system": true,
            "readonly": true,
            "generated": true,
            "systemHint": "保存后由系统按业务规则自动生成。"
          },
          {
            "name": "applicant",
            "label": "申请人",
            "type": "select",
            "required": true,
            "options": [
              "孙琪",
              "刘敏",
              "方媛",
              "王主管"
            ]
          },
          {
            "name": "requestDepartment",
            "label": "申请部门",
            "type": "select",
            "required": true,
            "options": [
              "采购管理部",
              "健康管理中心",
              "护理部",
              "医学服务部"
            ]
          },
          {
            "name": "purchaseType",
            "label": "采购类型",
            "type": "select",
            "required": true,
            "options": [
              "常规采购",
              "紧急采购",
              "补库采购"
            ]
          },
          {
            "name": "material",
            "label": "物料",
            "type": "select",
            "required": true,
            "options": [
              "动态心电监测耗材包",
              "一次性采血针",
              "真空采血管",
              "医用外科口罩"
            ]
          },
          {
            "name": "quantity",
            "label": "申请数量",
            "type": "number",
            "required": true
          },
          {
            "name": "amount",
            "label": "预算金额",
            "type": "number",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待审批",
              "已通过",
              "执行中",
              "已关闭",
              "已取消"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close",
      "approval-approve",
      "approval-reject",
      "resource-delete"
    ],
    "batchActions": [
      "resource-print",
      "resource-export"
    ],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close",
      "approval-approve",
      "approval-reject"
    ],
    "relationTabs": [
      "purchase-request"
    ],
    "fields": [
      {
        "name": "systemNo",
        "label": "采购申请号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "applicant",
        "label": "申请人",
        "type": "select",
        "required": true,
        "options": [
          "孙琪",
          "刘敏",
          "方媛",
          "王主管"
        ]
      },
      {
        "name": "requestDepartment",
        "label": "申请部门",
        "type": "select",
        "required": true,
        "options": [
          "采购管理部",
          "健康管理中心",
          "护理部",
          "医学服务部"
        ]
      },
      {
        "name": "purchaseType",
        "label": "采购类型",
        "type": "select",
        "required": true,
        "options": [
          "常规采购",
          "紧急采购",
          "补库采购"
        ]
      },
      {
        "name": "material",
        "label": "物料",
        "type": "select",
        "required": true,
        "options": [
          "动态心电监测耗材包",
          "一次性采血针",
          "真空采血管",
          "医用外科口罩"
        ]
      },
      {
        "name": "quantity",
        "label": "申请数量",
        "type": "number",
        "required": true
      },
      {
        "name": "amount",
        "label": "预算金额",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "执行中",
          "已关闭",
          "已取消"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "purchase-quote-compare",
    "domainId": "supply",
    "groupId": "supply-purchase",
    "pageType": "document",
    "title": "询价比价",
    "description": "查询并处理询价比价，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "purchaseRequest",
        "label": "采购申请",
        "type": "select",
        "required": false,
        "options": [
          "PR-202609-001",
          "PR-202609-002"
        ]
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "执行中",
          "已关闭",
          "已取消"
        ]
      }
    ],
    "columns": [
      "purchaseRequest",
      "supplier",
      "material",
      "quoteAmount",
      "taxRate",
      "comparisonResult",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "purchaseRequest",
          "supplier",
          "material",
          "quoteAmount",
          "taxRate",
          "comparisonResult",
          "quotationDeadline",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "purchaseRequest",
            "label": "采购申请",
            "type": "select",
            "required": true,
            "options": [
              "PR-202609-001",
              "PR-202609-002"
            ]
          },
          {
            "name": "supplier",
            "label": "供应商",
            "type": "select",
            "required": true,
            "options": [
              "安澜医疗用品有限公司",
              "明康检验设备有限公司",
              "嘉禾健康科技有限公司",
              "华信医用耗材有限公司"
            ]
          },
          {
            "name": "material",
            "label": "物料",
            "type": "select",
            "required": true,
            "options": [
              "动态心电监测耗材包",
              "一次性采血针",
              "真空采血管",
              "医用外科口罩"
            ]
          },
          {
            "name": "quoteAmount",
            "label": "报价金额",
            "type": "number",
            "required": true
          },
          {
            "name": "taxRate",
            "label": "税率",
            "type": "number",
            "required": true
          },
          {
            "name": "comparisonResult",
            "label": "比价结果",
            "type": "select",
            "required": true,
            "options": [
              "最低报价",
              "交期最优",
              "综合评分最优",
              "存在差异"
            ]
          },
          {
            "name": "quotationDeadline",
            "label": "报价截止",
            "type": "date",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待审批",
              "已通过",
              "执行中",
              "已关闭",
              "已取消"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close",
      "approval-approve",
      "approval-reject",
      "resource-delete"
    ],
    "batchActions": [
      "resource-print",
      "resource-export",
      "resource-import"
    ],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close",
      "approval-approve",
      "approval-reject"
    ],
    "relationTabs": [
      "purchase-quote-compare"
    ],
    "fields": [
      {
        "name": "purchaseRequest",
        "label": "采购申请",
        "type": "select",
        "required": true,
        "options": [
          "PR-202609-001",
          "PR-202609-002"
        ]
      },
      {
        "name": "supplier",
        "label": "供应商",
        "type": "select",
        "required": true,
        "options": [
          "安澜医疗用品有限公司",
          "明康检验设备有限公司",
          "嘉禾健康科技有限公司",
          "华信医用耗材有限公司"
        ]
      },
      {
        "name": "material",
        "label": "物料",
        "type": "select",
        "required": true,
        "options": [
          "动态心电监测耗材包",
          "一次性采血针",
          "真空采血管",
          "医用外科口罩"
        ]
      },
      {
        "name": "quoteAmount",
        "label": "报价金额",
        "type": "number",
        "required": true
      },
      {
        "name": "taxRate",
        "label": "税率",
        "type": "number",
        "required": true
      },
      {
        "name": "comparisonResult",
        "label": "比价结果",
        "type": "select",
        "required": true,
        "options": [
          "最低报价",
          "交期最优",
          "综合评分最优",
          "存在差异"
        ]
      },
      {
        "name": "quotationDeadline",
        "label": "报价截止",
        "type": "date",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "执行中",
          "已关闭",
          "已取消"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "purchase-order",
    "domainId": "supply",
    "groupId": "supply-purchase",
    "pageType": "document",
    "title": "采购订单",
    "description": "查询并处理采购订单，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "systemNo",
        "label": "采购订单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "执行中",
          "已关闭",
          "已取消"
        ]
      }
    ],
    "columns": [
      "systemNo",
      "purchaseRequest",
      "selectedQuote",
      "supplier",
      "material",
      "quantity",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "systemNo",
          "purchaseRequest",
          "selectedQuote",
          "supplier",
          "material",
          "quantity",
          "amount",
          "taxRate",
          "expectedArrivalDate",
          "costCenter",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "systemNo",
            "label": "采购订单号",
            "type": "text",
            "required": false,
            "system": true,
            "readonly": true,
            "generated": true,
            "systemHint": "保存后由系统按业务规则自动生成。"
          },
          {
            "name": "purchaseRequest",
            "label": "来源采购申请",
            "type": "search-select",
            "required": true,
            "optionsSource": "purchase-request"
          },
          {
            "name": "selectedQuote",
            "label": "已选报价",
            "type": "search-select",
            "required": true,
            "optionsSource": "purchase-quote-compare"
          },
          {
            "name": "supplier",
            "label": "供应商",
            "type": "select",
            "required": true,
            "options": [
              "安澜医疗用品有限公司",
              "明康检验设备有限公司",
              "嘉禾健康科技有限公司",
              "华信医用耗材有限公司"
            ]
          },
          {
            "name": "material",
            "label": "物料",
            "type": "select",
            "required": true,
            "options": [
              "动态心电监测耗材包",
              "一次性采血针",
              "真空采血管",
              "医用外科口罩"
            ]
          },
          {
            "name": "quantity",
            "label": "采购数量",
            "type": "number",
            "required": true
          },
          {
            "name": "amount",
            "label": "订单金额",
            "type": "number",
            "required": true
          },
          {
            "name": "taxRate",
            "label": "税率",
            "type": "number",
            "required": true
          },
          {
            "name": "expectedArrivalDate",
            "label": "预计到货日期",
            "type": "date",
            "required": true
          },
          {
            "name": "costCenter",
            "label": "成本中心",
            "type": "select",
            "required": true,
            "options": [
              "健康管理中心",
              "医学服务部",
              "护理部",
              "采购管理部"
            ]
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待审批",
              "已通过",
              "执行中",
              "已关闭",
              "已取消"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close",
      "approval-approve",
      "approval-reject",
      "resource-delete"
    ],
    "batchActions": [
      "resource-print",
      "resource-export"
    ],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close",
      "approval-approve",
      "approval-reject"
    ],
    "relationTabs": [
      "purchase-order"
    ],
    "fields": [
      {
        "name": "systemNo",
        "label": "采购订单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "purchaseRequest",
        "label": "来源采购申请",
        "type": "search-select",
        "required": true,
        "optionsSource": "purchase-request"
      },
      {
        "name": "selectedQuote",
        "label": "已选报价",
        "type": "search-select",
        "required": true,
        "optionsSource": "purchase-quote-compare"
      },
      {
        "name": "supplier",
        "label": "供应商",
        "type": "select",
        "required": true,
        "options": [
          "安澜医疗用品有限公司",
          "明康检验设备有限公司",
          "嘉禾健康科技有限公司",
          "华信医用耗材有限公司"
        ]
      },
      {
        "name": "material",
        "label": "物料",
        "type": "select",
        "required": true,
        "options": [
          "动态心电监测耗材包",
          "一次性采血针",
          "真空采血管",
          "医用外科口罩"
        ]
      },
      {
        "name": "quantity",
        "label": "采购数量",
        "type": "number",
        "required": true
      },
      {
        "name": "amount",
        "label": "订单金额",
        "type": "number",
        "required": true
      },
      {
        "name": "taxRate",
        "label": "税率",
        "type": "number",
        "required": true
      },
      {
        "name": "expectedArrivalDate",
        "label": "预计到货日期",
        "type": "date",
        "required": true
      },
      {
        "name": "costCenter",
        "label": "成本中心",
        "type": "select",
        "required": true,
        "options": [
          "健康管理中心",
          "医学服务部",
          "护理部",
          "采购管理部"
        ]
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "执行中",
          "已关闭",
          "已取消"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "purchase-inquiry",
    "domainId": "supply",
    "groupId": "supply-purchase",
    "pageType": "document",
    "title": "询价单",
    "description": "查询并处理询价单，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "systemNo",
        "label": "询价单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已发出",
          "已截止",
          "已关闭"
        ]
      }
    ],
    "columns": [
      "systemNo",
      "supplier",
      "material",
      "quotationDeadline",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "systemNo",
          "supplier",
          "material",
          "quotationDeadline",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "systemNo",
            "label": "询价单号",
            "type": "text",
            "required": false,
            "system": true,
            "readonly": true,
            "generated": true,
            "systemHint": "保存后由系统按业务规则自动生成。"
          },
          {
            "name": "supplier",
            "label": "供应商",
            "type": "select",
            "required": true,
            "options": [
              "安澜医疗用品有限公司",
              "明康检验设备有限公司",
              "嘉禾健康科技有限公司",
              "华信医用耗材有限公司"
            ]
          },
          {
            "name": "material",
            "label": "物料",
            "type": "select",
            "required": true,
            "options": [
              "动态心电监测耗材包",
              "一次性采血针",
              "真空采血管",
              "医用外科口罩"
            ]
          },
          {
            "name": "quotationDeadline",
            "label": "报价截止",
            "type": "date",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "已发出",
              "已截止",
              "已关闭"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close",
      "resource-delete"
    ],
    "batchActions": [
      "resource-print",
      "resource-export"
    ],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close"
    ],
    "relationTabs": [
      "purchase-inquiry"
    ],
    "fields": [
      {
        "name": "systemNo",
        "label": "询价单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "supplier",
        "label": "供应商",
        "type": "select",
        "required": true,
        "options": [
          "安澜医疗用品有限公司",
          "明康检验设备有限公司",
          "嘉禾健康科技有限公司",
          "华信医用耗材有限公司"
        ]
      },
      {
        "name": "material",
        "label": "物料",
        "type": "select",
        "required": true,
        "options": [
          "动态心电监测耗材包",
          "一次性采血针",
          "真空采血管",
          "医用外科口罩"
        ]
      },
      {
        "name": "quotationDeadline",
        "label": "报价截止",
        "type": "date",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已发出",
          "已截止",
          "已关闭"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": false
  },
  {
    "resourceId": "purchase-quote",
    "domainId": "supply",
    "groupId": "supply-purchase",
    "pageType": "document",
    "title": "供应商报价",
    "description": "查询并处理供应商报价，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "systemNo",
        "label": "报价单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "待报价",
          "已提交",
          "已采纳",
          "已淘汰"
        ]
      }
    ],
    "columns": [
      "systemNo",
      "supplier",
      "material",
      "amount",
      "taxRate",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "systemNo",
          "supplier",
          "material",
          "amount",
          "taxRate",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "systemNo",
            "label": "报价单号",
            "type": "text",
            "required": false,
            "system": true,
            "readonly": true,
            "generated": true,
            "systemHint": "保存后由系统按业务规则自动生成。"
          },
          {
            "name": "supplier",
            "label": "供应商",
            "type": "select",
            "required": true,
            "options": [
              "安澜医疗用品有限公司",
              "明康检验设备有限公司",
              "嘉禾健康科技有限公司",
              "华信医用耗材有限公司"
            ]
          },
          {
            "name": "material",
            "label": "物料",
            "type": "select",
            "required": true,
            "options": [
              "动态心电监测耗材包",
              "一次性采血针",
              "真空采血管",
              "医用外科口罩"
            ]
          },
          {
            "name": "amount",
            "label": "报价金额",
            "type": "number",
            "required": true
          },
          {
            "name": "taxRate",
            "label": "税率",
            "type": "number",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "待报价",
              "已提交",
              "已采纳",
              "已淘汰"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close",
      "resource-delete"
    ],
    "batchActions": [
      "resource-print",
      "resource-export",
      "resource-import"
    ],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close"
    ],
    "relationTabs": [
      "purchase-quote"
    ],
    "fields": [
      {
        "name": "systemNo",
        "label": "报价单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "supplier",
        "label": "供应商",
        "type": "select",
        "required": true,
        "options": [
          "安澜医疗用品有限公司",
          "明康检验设备有限公司",
          "嘉禾健康科技有限公司",
          "华信医用耗材有限公司"
        ]
      },
      {
        "name": "material",
        "label": "物料",
        "type": "select",
        "required": true,
        "options": [
          "动态心电监测耗材包",
          "一次性采血针",
          "真空采血管",
          "医用外科口罩"
        ]
      },
      {
        "name": "amount",
        "label": "报价金额",
        "type": "number",
        "required": true
      },
      {
        "name": "taxRate",
        "label": "税率",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "待报价",
          "已提交",
          "已采纳",
          "已淘汰"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": false
  },
  {
    "resourceId": "inventory-inbound",
    "domainId": "supply",
    "groupId": "supply-receipt",
    "pageType": "document",
    "title": "采购入库",
    "description": "查询并处理采购入库，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "systemNo",
        "label": "入库单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "待收货",
          "待验收",
          "待上架",
          "已入库",
          "异常"
        ]
      }
    ],
    "columns": [
      "systemNo",
      "purchaseOrder",
      "supplier",
      "material",
      "stageStatus",
      "arrivalQty",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "systemNo",
          "purchaseOrder",
          "supplier",
          "material",
          "stageStatus",
          "arrivalQty",
          "actualReceivedQty",
          "qualifiedQty",
          "unqualifiedQty",
          "inspectionResult",
          "qualityLevel",
          "warehouse",
          "location",
          "batch",
          "productionDate",
          "expiry",
          "receivedQty",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "systemNo",
            "label": "入库单号",
            "type": "text",
            "required": false,
            "system": true,
            "readonly": true,
            "generated": true,
            "systemHint": "保存后由系统按业务规则自动生成。"
          },
          {
            "name": "purchaseOrder",
            "label": "来源采购订单",
            "type": "select",
            "required": true,
            "options": [
              "PO-202609-001",
              "PO-202609-002",
              "PO-202609-003"
            ]
          },
          {
            "name": "supplier",
            "label": "供应商",
            "type": "select",
            "required": true,
            "options": [
              "安澜医疗用品有限公司",
              "明康检验设备有限公司",
              "嘉禾健康科技有限公司",
              "华信医用耗材有限公司"
            ]
          },
          {
            "name": "material",
            "label": "物料",
            "type": "select",
            "required": true,
            "options": [
              "动态心电监测耗材包",
              "一次性采血针",
              "真空采血管",
              "医用外科口罩"
            ]
          },
          {
            "name": "stageStatus",
            "label": "阶段状态",
            "type": "select",
            "required": true,
            "options": [
              "待收货",
              "待验收",
              "待上架",
              "已入库",
              "异常"
            ]
          },
          {
            "name": "arrivalQty",
            "label": "到货数量",
            "type": "number",
            "required": true
          },
          {
            "name": "actualReceivedQty",
            "label": "实收数量",
            "type": "number",
            "required": true
          },
          {
            "name": "qualifiedQty",
            "label": "合格数量",
            "type": "number",
            "required": true
          },
          {
            "name": "unqualifiedQty",
            "label": "不合格数量",
            "type": "number",
            "required": true
          },
          {
            "name": "inspectionResult",
            "label": "验收结论",
            "type": "select",
            "required": true,
            "options": [
              "合格",
              "部分合格",
              "不合格",
              "待复检"
            ]
          },
          {
            "name": "qualityLevel",
            "label": "质量等级",
            "type": "select",
            "required": true,
            "options": [
              "合格",
              "让步接收",
              "拒收"
            ]
          },
          {
            "name": "warehouse",
            "label": "仓库",
            "type": "select",
            "required": true,
            "options": [
              "杭州一号仓",
              "宁波周转仓",
              "滨江冷链仓",
              "嘉兴备件仓"
            ]
          },
          {
            "name": "location",
            "label": "库位",
            "type": "select",
            "required": true,
            "options": [
              "A-01-08",
              "A-02-03",
              "B-01-05",
              "B-03-02"
            ],
            "dependsOn": [
              "warehouse"
            ],
            "optionsSource": "warehouse-location"
          },
          {
            "name": "batch",
            "label": "批次号",
            "type": "text",
            "required": true
          },
          {
            "name": "productionDate",
            "label": "生产日期",
            "type": "date",
            "required": true
          },
          {
            "name": "expiry",
            "label": "失效日期",
            "type": "date",
            "required": true
          },
          {
            "name": "receivedQty",
            "label": "上架数量",
            "type": "number",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "待收货",
              "待验收",
              "待上架",
              "已入库",
              "异常"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close",
      "resource-delete"
    ],
    "batchActions": [
      "resource-print",
      "resource-export"
    ],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close"
    ],
    "relationTabs": [
      "receipt-stage",
      "inspection-stage",
      "putaway-stage",
      "operation-log"
    ],
    "fields": [
      {
        "name": "systemNo",
        "label": "入库单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "purchaseOrder",
        "label": "来源采购订单",
        "type": "select",
        "required": true,
        "options": [
          "PO-202609-001",
          "PO-202609-002",
          "PO-202609-003"
        ]
      },
      {
        "name": "supplier",
        "label": "供应商",
        "type": "select",
        "required": true,
        "options": [
          "安澜医疗用品有限公司",
          "明康检验设备有限公司",
          "嘉禾健康科技有限公司",
          "华信医用耗材有限公司"
        ]
      },
      {
        "name": "material",
        "label": "物料",
        "type": "select",
        "required": true,
        "options": [
          "动态心电监测耗材包",
          "一次性采血针",
          "真空采血管",
          "医用外科口罩"
        ]
      },
      {
        "name": "stageStatus",
        "label": "阶段状态",
        "type": "select",
        "required": true,
        "options": [
          "待收货",
          "待验收",
          "待上架",
          "已入库",
          "异常"
        ]
      },
      {
        "name": "arrivalQty",
        "label": "到货数量",
        "type": "number",
        "required": true
      },
      {
        "name": "actualReceivedQty",
        "label": "实收数量",
        "type": "number",
        "required": true
      },
      {
        "name": "qualifiedQty",
        "label": "合格数量",
        "type": "number",
        "required": true
      },
      {
        "name": "unqualifiedQty",
        "label": "不合格数量",
        "type": "number",
        "required": true
      },
      {
        "name": "inspectionResult",
        "label": "验收结论",
        "type": "select",
        "required": true,
        "options": [
          "合格",
          "部分合格",
          "不合格",
          "待复检"
        ]
      },
      {
        "name": "qualityLevel",
        "label": "质量等级",
        "type": "select",
        "required": true,
        "options": [
          "合格",
          "让步接收",
          "拒收"
        ]
      },
      {
        "name": "warehouse",
        "label": "仓库",
        "type": "select",
        "required": true,
        "options": [
          "杭州一号仓",
          "宁波周转仓",
          "滨江冷链仓",
          "嘉兴备件仓"
        ]
      },
      {
        "name": "location",
        "label": "库位",
        "type": "select",
        "required": true,
        "options": [
          "A-01-08",
          "A-02-03",
          "B-01-05",
          "B-03-02"
        ],
        "dependsOn": [
          "warehouse"
        ],
        "optionsSource": "warehouse-location"
      },
      {
        "name": "batch",
        "label": "批次号",
        "type": "text",
        "required": true
      },
      {
        "name": "productionDate",
        "label": "生产日期",
        "type": "date",
        "required": true
      },
      {
        "name": "expiry",
        "label": "失效日期",
        "type": "date",
        "required": true
      },
      {
        "name": "receivedQty",
        "label": "上架数量",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "待收货",
          "待验收",
          "待上架",
          "已入库",
          "异常"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "inventory-arrival",
    "domainId": "supply",
    "groupId": "supply-receipt",
    "pageType": "document",
    "title": "到货登记",
    "description": "查询并处理到货登记，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "systemNo",
        "label": "到货登记号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "待登记",
          "已登记",
          "已转入库"
        ]
      }
    ],
    "columns": [
      "systemNo",
      "orderNo",
      "supplier",
      "arrivalDate",
      "quantity",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "systemNo",
          "orderNo",
          "supplier",
          "arrivalDate",
          "quantity",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "systemNo",
            "label": "到货登记号",
            "type": "text",
            "required": false,
            "system": true,
            "readonly": true,
            "generated": true,
            "systemHint": "保存后由系统按业务规则自动生成。"
          },
          {
            "name": "orderNo",
            "label": "来源采购订单",
            "type": "select",
            "required": true,
            "options": [
              "PO-202609-001",
              "PO-202609-002",
              "PO-202609-003"
            ]
          },
          {
            "name": "supplier",
            "label": "供应商",
            "type": "select",
            "required": true,
            "options": [
              "安澜医疗用品有限公司",
              "明康检验设备有限公司",
              "嘉禾健康科技有限公司",
              "华信医用耗材有限公司"
            ]
          },
          {
            "name": "arrivalDate",
            "label": "到货日期",
            "type": "date",
            "required": true
          },
          {
            "name": "quantity",
            "label": "到货数量",
            "type": "number",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "待登记",
              "已登记",
              "已转入库"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close",
      "resource-delete"
    ],
    "batchActions": [
      "resource-print",
      "resource-export"
    ],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close"
    ],
    "relationTabs": [
      "inventory-arrival"
    ],
    "fields": [
      {
        "name": "systemNo",
        "label": "到货登记号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "orderNo",
        "label": "来源采购订单",
        "type": "select",
        "required": true,
        "options": [
          "PO-202609-001",
          "PO-202609-002",
          "PO-202609-003"
        ]
      },
      {
        "name": "supplier",
        "label": "供应商",
        "type": "select",
        "required": true,
        "options": [
          "安澜医疗用品有限公司",
          "明康检验设备有限公司",
          "嘉禾健康科技有限公司",
          "华信医用耗材有限公司"
        ]
      },
      {
        "name": "arrivalDate",
        "label": "到货日期",
        "type": "date",
        "required": true
      },
      {
        "name": "quantity",
        "label": "到货数量",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "待登记",
          "已登记",
          "已转入库"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": false
  },
  {
    "resourceId": "inventory-receipt",
    "domainId": "supply",
    "groupId": "supply-receipt",
    "pageType": "document",
    "title": "收货单",
    "description": "查询并处理收货单，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "systemNo",
        "label": "收货单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "待收货",
          "已收货",
          "已转验收"
        ]
      }
    ],
    "columns": [
      "systemNo",
      "orderNo",
      "supplier",
      "warehouse",
      "receivedQty",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "systemNo",
          "orderNo",
          "supplier",
          "warehouse",
          "receivedQty",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "systemNo",
            "label": "收货单号",
            "type": "text",
            "required": false,
            "system": true,
            "readonly": true,
            "generated": true,
            "systemHint": "保存后由系统按业务规则自动生成。"
          },
          {
            "name": "orderNo",
            "label": "来源采购订单",
            "type": "select",
            "required": true,
            "options": [
              "PO-202609-001",
              "PO-202609-002",
              "PO-202609-003"
            ]
          },
          {
            "name": "supplier",
            "label": "供应商",
            "type": "select",
            "required": true,
            "options": [
              "安澜医疗用品有限公司",
              "明康检验设备有限公司",
              "嘉禾健康科技有限公司",
              "华信医用耗材有限公司"
            ]
          },
          {
            "name": "warehouse",
            "label": "仓库",
            "type": "select",
            "required": true,
            "options": [
              "杭州一号仓",
              "宁波周转仓",
              "滨江冷链仓",
              "嘉兴备件仓"
            ]
          },
          {
            "name": "receivedQty",
            "label": "实收数量",
            "type": "number",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "待收货",
              "已收货",
              "已转验收"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close",
      "resource-delete"
    ],
    "batchActions": [
      "resource-print",
      "resource-export"
    ],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close"
    ],
    "relationTabs": [
      "inventory-receipt"
    ],
    "fields": [
      {
        "name": "systemNo",
        "label": "收货单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "orderNo",
        "label": "来源采购订单",
        "type": "select",
        "required": true,
        "options": [
          "PO-202609-001",
          "PO-202609-002",
          "PO-202609-003"
        ]
      },
      {
        "name": "supplier",
        "label": "供应商",
        "type": "select",
        "required": true,
        "options": [
          "安澜医疗用品有限公司",
          "明康检验设备有限公司",
          "嘉禾健康科技有限公司",
          "华信医用耗材有限公司"
        ]
      },
      {
        "name": "warehouse",
        "label": "仓库",
        "type": "select",
        "required": true,
        "options": [
          "杭州一号仓",
          "宁波周转仓",
          "滨江冷链仓",
          "嘉兴备件仓"
        ]
      },
      {
        "name": "receivedQty",
        "label": "实收数量",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "待收货",
          "已收货",
          "已转验收"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": false
  },
  {
    "resourceId": "inventory-inspection",
    "domainId": "supply",
    "groupId": "supply-receipt",
    "pageType": "document",
    "title": "验收单",
    "description": "查询并处理验收单，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "systemNo",
        "label": "验收单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "待验收",
          "验收通过",
          "待复检",
          "验收不合格"
        ]
      }
    ],
    "columns": [
      "systemNo",
      "orderNo",
      "inspectionResult",
      "qualityLevel",
      "receivedQty",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "systemNo",
          "orderNo",
          "inspectionResult",
          "qualityLevel",
          "receivedQty",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "systemNo",
            "label": "验收单号",
            "type": "text",
            "required": false,
            "system": true,
            "readonly": true,
            "generated": true,
            "systemHint": "保存后由系统按业务规则自动生成。"
          },
          {
            "name": "orderNo",
            "label": "来源入库单",
            "type": "select",
            "required": true,
            "options": [
              "IN-202609-001",
              "IN-202609-002"
            ]
          },
          {
            "name": "inspectionResult",
            "label": "验收结论",
            "type": "select",
            "required": true,
            "options": [
              "合格",
              "部分合格",
              "不合格",
              "待复检"
            ]
          },
          {
            "name": "qualityLevel",
            "label": "质量等级",
            "type": "select",
            "required": true,
            "options": [
              "合格",
              "让步接收",
              "拒收"
            ]
          },
          {
            "name": "receivedQty",
            "label": "验收数量",
            "type": "number",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "待验收",
              "验收通过",
              "待复检",
              "验收不合格"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close"
    ],
    "batchActions": [
      "resource-print",
      "resource-export"
    ],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close"
    ],
    "relationTabs": [
      "inventory-inspection"
    ],
    "fields": [
      {
        "name": "systemNo",
        "label": "验收单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "orderNo",
        "label": "来源入库单",
        "type": "select",
        "required": true,
        "options": [
          "IN-202609-001",
          "IN-202609-002"
        ]
      },
      {
        "name": "inspectionResult",
        "label": "验收结论",
        "type": "select",
        "required": true,
        "options": [
          "合格",
          "部分合格",
          "不合格",
          "待复检"
        ]
      },
      {
        "name": "qualityLevel",
        "label": "质量等级",
        "type": "select",
        "required": true,
        "options": [
          "合格",
          "让步接收",
          "拒收"
        ]
      },
      {
        "name": "receivedQty",
        "label": "验收数量",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "待验收",
          "验收通过",
          "待复检",
          "验收不合格"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": false
  },
  {
    "resourceId": "inventory-ledger",
    "domainId": "supply",
    "groupId": "supply-inventory",
    "pageType": "ledger",
    "title": "库存余额",
    "description": "查询库存余额的数量、状态和关联业务明细。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      },
      {
        "key": "active",
        "label": "当前有效",
        "tone": "success"
      },
      {
        "key": "pending",
        "label": "待处理",
        "tone": "warning"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "material",
        "label": "物料",
        "type": "select",
        "required": false,
        "options": [
          "动态心电监测耗材包",
          "一次性采血针",
          "真空采血管",
          "医用外科口罩"
        ]
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "正常",
          "冻结",
          "不足",
          "临期"
        ]
      }
    ],
    "columns": [
      "material",
      "warehouse",
      "location",
      "batch",
      "productionDate",
      "expiry",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "material",
          "warehouse",
          "location",
          "batch",
          "productionDate",
          "expiry",
          "availableQty",
          "warningStatus",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "material",
            "label": "物料",
            "type": "select",
            "required": true,
            "options": [
              "动态心电监测耗材包",
              "一次性采血针",
              "真空采血管",
              "医用外科口罩"
            ]
          },
          {
            "name": "warehouse",
            "label": "仓库",
            "type": "select",
            "required": true,
            "options": [
              "杭州一号仓",
              "宁波周转仓",
              "滨江冷链仓",
              "嘉兴备件仓"
            ]
          },
          {
            "name": "location",
            "label": "库位",
            "type": "select",
            "required": true,
            "options": [
              "A-01-08",
              "A-02-03",
              "B-01-05",
              "B-03-02"
            ],
            "dependsOn": [
              "warehouse"
            ],
            "optionsSource": "warehouse-location"
          },
          {
            "name": "batch",
            "label": "批次",
            "type": "select",
            "required": true,
            "options": [
              "BATCH-202608-A",
              "BATCH-202607-C",
              "BATCH-202609-B"
            ],
            "dependsOn": [
              "warehouse",
              "location"
            ],
            "optionsSource": "inventory-batch"
          },
          {
            "name": "productionDate",
            "label": "生产日期",
            "type": "date",
            "required": true
          },
          {
            "name": "expiry",
            "label": "失效日期",
            "type": "date",
            "required": true
          },
          {
            "name": "availableQty",
            "label": "可用数量",
            "type": "number",
            "required": false,
            "system": true,
            "readonly": true
          },
          {
            "name": "warningStatus",
            "label": "预警状态",
            "type": "select",
            "required": true,
            "options": [
              "正常",
              "低库存",
              "临期",
              "已冻结",
              "待验收"
            ]
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "正常",
              "冻结",
              "不足",
              "临期"
            ]
          }
        ]
      }
    ],
    "rowActions": [],
    "batchActions": [
      "resource-export"
    ],
    "statusActions": [],
    "relationTabs": [
      "inventory-ledger"
    ],
    "fields": [
      {
        "name": "material",
        "label": "物料",
        "type": "select",
        "required": true,
        "options": [
          "动态心电监测耗材包",
          "一次性采血针",
          "真空采血管",
          "医用外科口罩"
        ]
      },
      {
        "name": "warehouse",
        "label": "仓库",
        "type": "select",
        "required": true,
        "options": [
          "杭州一号仓",
          "宁波周转仓",
          "滨江冷链仓",
          "嘉兴备件仓"
        ]
      },
      {
        "name": "location",
        "label": "库位",
        "type": "select",
        "required": true,
        "options": [
          "A-01-08",
          "A-02-03",
          "B-01-05",
          "B-03-02"
        ],
        "dependsOn": [
          "warehouse"
        ],
        "optionsSource": "warehouse-location"
      },
      {
        "name": "batch",
        "label": "批次",
        "type": "select",
        "required": true,
        "options": [
          "BATCH-202608-A",
          "BATCH-202607-C",
          "BATCH-202609-B"
        ],
        "dependsOn": [
          "warehouse",
          "location"
        ],
        "optionsSource": "inventory-batch"
      },
      {
        "name": "productionDate",
        "label": "生产日期",
        "type": "date",
        "required": true
      },
      {
        "name": "expiry",
        "label": "失效日期",
        "type": "date",
        "required": true
      },
      {
        "name": "availableQty",
        "label": "可用数量",
        "type": "number",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "warningStatus",
        "label": "预警状态",
        "type": "select",
        "required": true,
        "options": [
          "正常",
          "低库存",
          "临期",
          "已冻结",
          "待验收"
        ]
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "正常",
          "冻结",
          "不足",
          "临期"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "inventory-requisition",
    "domainId": "supply",
    "groupId": "supply-inventory",
    "pageType": "document",
    "title": "领用与客户耗用",
    "description": "查询并处理领用与客户耗用，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "systemNo",
        "label": "耗用/领用申请号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "已完成",
          "已取消",
          "已作废"
        ]
      }
    ],
    "columns": [
      "systemNo",
      "applicant",
      "requestDepartment",
      "customer",
      "businessNo",
      "material",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "systemNo",
          "applicant",
          "requestDepartment",
          "customer",
          "businessNo",
          "material",
          "warehouse",
          "location",
          "batch",
          "quantity",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "systemNo",
            "label": "耗用/领用申请号",
            "type": "text",
            "required": false,
            "system": true,
            "readonly": true,
            "generated": true,
            "systemHint": "保存后由系统按业务规则自动生成。"
          },
          {
            "name": "applicant",
            "label": "申请人",
            "type": "select",
            "required": true,
            "options": [
              "孙琪",
              "刘敏",
              "方媛",
              "王主管"
            ]
          },
          {
            "name": "requestDepartment",
            "label": "申请部门",
            "type": "select",
            "required": true,
            "options": [
              "采购管理部",
              "健康管理中心",
              "护理部",
              "医学服务部"
            ]
          },
          {
            "name": "customer",
            "label": "客户",
            "type": "select",
            "required": false,
            "options": [
              "林女士",
              "王先生",
              "赵女士",
              "陈先生"
            ]
          },
          {
            "name": "businessNo",
            "label": "客单/项目",
            "type": "select",
            "required": true,
            "options": [
              "VO-202609-001",
              "VO-202609-002",
              "PRJ-202609-006"
            ]
          },
          {
            "name": "material",
            "label": "物料",
            "type": "select",
            "required": true,
            "options": [
              "动态心电监测耗材包",
              "一次性采血针",
              "真空采血管",
              "医用外科口罩"
            ]
          },
          {
            "name": "warehouse",
            "label": "仓库",
            "type": "select",
            "required": true,
            "options": [
              "杭州一号仓",
              "宁波周转仓",
              "滨江冷链仓",
              "嘉兴备件仓"
            ]
          },
          {
            "name": "location",
            "label": "库位",
            "type": "select",
            "required": true,
            "options": [
              "A-01-08",
              "A-02-03",
              "B-01-05",
              "B-03-02"
            ],
            "dependsOn": [
              "warehouse"
            ],
            "optionsSource": "warehouse-location"
          },
          {
            "name": "batch",
            "label": "批次",
            "type": "select",
            "required": true,
            "options": [
              "BATCH-202608-A",
              "BATCH-202607-C",
              "BATCH-202609-B"
            ],
            "dependsOn": [
              "warehouse",
              "location"
            ],
            "optionsSource": "inventory-batch"
          },
          {
            "name": "quantity",
            "label": "申请数量",
            "type": "number",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待审批",
              "已通过",
              "已完成",
              "已取消",
              "已作废"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "approval-approve",
      "approval-reject",
      "resource-void",
      "resource-archive"
    ],
    "batchActions": [
      "resource-archive"
    ],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "approval-approve",
      "approval-reject",
      "resource-void",
      "resource-archive"
    ],
    "relationTabs": [
      "inventory-requisition"
    ],
    "fields": [
      {
        "name": "systemNo",
        "label": "耗用/领用申请号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "applicant",
        "label": "申请人",
        "type": "select",
        "required": true,
        "options": [
          "孙琪",
          "刘敏",
          "方媛",
          "王主管"
        ]
      },
      {
        "name": "requestDepartment",
        "label": "申请部门",
        "type": "select",
        "required": true,
        "options": [
          "采购管理部",
          "健康管理中心",
          "护理部",
          "医学服务部"
        ]
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "select",
        "required": false,
        "options": [
          "林女士",
          "王先生",
          "赵女士",
          "陈先生"
        ]
      },
      {
        "name": "businessNo",
        "label": "客单/项目",
        "type": "select",
        "required": true,
        "options": [
          "VO-202609-001",
          "VO-202609-002",
          "PRJ-202609-006"
        ]
      },
      {
        "name": "material",
        "label": "物料",
        "type": "select",
        "required": true,
        "options": [
          "动态心电监测耗材包",
          "一次性采血针",
          "真空采血管",
          "医用外科口罩"
        ]
      },
      {
        "name": "warehouse",
        "label": "仓库",
        "type": "select",
        "required": true,
        "options": [
          "杭州一号仓",
          "宁波周转仓",
          "滨江冷链仓",
          "嘉兴备件仓"
        ]
      },
      {
        "name": "location",
        "label": "库位",
        "type": "select",
        "required": true,
        "options": [
          "A-01-08",
          "A-02-03",
          "B-01-05",
          "B-03-02"
        ],
        "dependsOn": [
          "warehouse"
        ],
        "optionsSource": "warehouse-location"
      },
      {
        "name": "batch",
        "label": "批次",
        "type": "select",
        "required": true,
        "options": [
          "BATCH-202608-A",
          "BATCH-202607-C",
          "BATCH-202609-B"
        ],
        "dependsOn": [
          "warehouse",
          "location"
        ],
        "optionsSource": "inventory-batch"
      },
      {
        "name": "quantity",
        "label": "申请数量",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "已完成",
          "已取消",
          "已作废"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "inventory-transfer",
    "domainId": "supply",
    "groupId": "supply-inventory",
    "pageType": "document",
    "title": "调拨单",
    "description": "查询并处理调拨单，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "systemNo",
        "label": "调拨单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "已完成",
          "已取消",
          "已作废"
        ]
      }
    ],
    "columns": [
      "systemNo",
      "material",
      "sourceWarehouse",
      "sourceLocation",
      "targetWarehouse",
      "targetLocation",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "systemNo",
          "material",
          "sourceWarehouse",
          "sourceLocation",
          "targetWarehouse",
          "targetLocation",
          "batch",
          "quantity",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "systemNo",
            "label": "调拨单号",
            "type": "text",
            "required": false,
            "system": true,
            "readonly": true,
            "generated": true,
            "systemHint": "保存后由系统按业务规则自动生成。"
          },
          {
            "name": "material",
            "label": "物料",
            "type": "select",
            "required": true,
            "options": [
              "动态心电监测耗材包",
              "一次性采血针",
              "真空采血管",
              "医用外科口罩"
            ]
          },
          {
            "name": "sourceWarehouse",
            "label": "调出仓库",
            "type": "select",
            "required": true,
            "options": [
              "杭州一号仓",
              "宁波周转仓",
              "滨江冷链仓",
              "嘉兴备件仓"
            ]
          },
          {
            "name": "sourceLocation",
            "label": "调出库位",
            "type": "select",
            "required": true,
            "options": [
              "A-01-08",
              "A-02-03",
              "B-01-05",
              "B-03-02"
            ],
            "dependsOn": [
              "sourceWarehouse"
            ],
            "optionsSource": "warehouse-location"
          },
          {
            "name": "targetWarehouse",
            "label": "调入仓库",
            "type": "select",
            "required": true,
            "options": [
              "杭州一号仓",
              "宁波周转仓",
              "滨江冷链仓",
              "嘉兴备件仓"
            ]
          },
          {
            "name": "targetLocation",
            "label": "调入库位",
            "type": "select",
            "required": true,
            "options": [
              "A-01-08",
              "A-02-03",
              "B-01-05",
              "B-03-02"
            ],
            "dependsOn": [
              "targetWarehouse"
            ],
            "optionsSource": "warehouse-location"
          },
          {
            "name": "batch",
            "label": "批次",
            "type": "select",
            "required": true,
            "options": [
              "BATCH-202608-A",
              "BATCH-202607-C",
              "BATCH-202609-B"
            ],
            "dependsOn": [
              "sourceWarehouse",
              "sourceLocation"
            ],
            "optionsSource": "inventory-batch"
          },
          {
            "name": "quantity",
            "label": "调拨数量",
            "type": "number",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待审批",
              "已通过",
              "已完成",
              "已取消",
              "已作废"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "approval-approve",
      "approval-reject",
      "resource-void",
      "resource-archive"
    ],
    "batchActions": [
      "resource-archive"
    ],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "approval-approve",
      "approval-reject",
      "resource-void",
      "resource-archive"
    ],
    "relationTabs": [
      "inventory-transfer"
    ],
    "fields": [
      {
        "name": "systemNo",
        "label": "调拨单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "material",
        "label": "物料",
        "type": "select",
        "required": true,
        "options": [
          "动态心电监测耗材包",
          "一次性采血针",
          "真空采血管",
          "医用外科口罩"
        ]
      },
      {
        "name": "sourceWarehouse",
        "label": "调出仓库",
        "type": "select",
        "required": true,
        "options": [
          "杭州一号仓",
          "宁波周转仓",
          "滨江冷链仓",
          "嘉兴备件仓"
        ]
      },
      {
        "name": "sourceLocation",
        "label": "调出库位",
        "type": "select",
        "required": true,
        "options": [
          "A-01-08",
          "A-02-03",
          "B-01-05",
          "B-03-02"
        ],
        "dependsOn": [
          "sourceWarehouse"
        ],
        "optionsSource": "warehouse-location"
      },
      {
        "name": "targetWarehouse",
        "label": "调入仓库",
        "type": "select",
        "required": true,
        "options": [
          "杭州一号仓",
          "宁波周转仓",
          "滨江冷链仓",
          "嘉兴备件仓"
        ]
      },
      {
        "name": "targetLocation",
        "label": "调入库位",
        "type": "select",
        "required": true,
        "options": [
          "A-01-08",
          "A-02-03",
          "B-01-05",
          "B-03-02"
        ],
        "dependsOn": [
          "targetWarehouse"
        ],
        "optionsSource": "warehouse-location"
      },
      {
        "name": "batch",
        "label": "批次",
        "type": "select",
        "required": true,
        "options": [
          "BATCH-202608-A",
          "BATCH-202607-C",
          "BATCH-202609-B"
        ],
        "dependsOn": [
          "sourceWarehouse",
          "sourceLocation"
        ],
        "optionsSource": "inventory-batch"
      },
      {
        "name": "quantity",
        "label": "调拨数量",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "已完成",
          "已取消",
          "已作废"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": false
  },
  {
    "resourceId": "inventory-stocktake",
    "domainId": "supply",
    "groupId": "supply-inventory",
    "pageType": "document",
    "title": "盘点单",
    "description": "查询并处理盘点单，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "systemNo",
        "label": "盘点单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "已完成",
          "已取消",
          "已作废"
        ]
      }
    ],
    "columns": [
      "systemNo",
      "warehouse",
      "location",
      "material",
      "batch",
      "availableQty",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "systemNo",
          "warehouse",
          "location",
          "material",
          "batch",
          "availableQty",
          "quantity",
          "differenceQty",
          "date",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "systemNo",
            "label": "盘点单号",
            "type": "text",
            "required": false,
            "system": true,
            "readonly": true,
            "generated": true,
            "systemHint": "保存后由系统按业务规则自动生成。"
          },
          {
            "name": "warehouse",
            "label": "仓库",
            "type": "select",
            "required": true,
            "options": [
              "杭州一号仓",
              "宁波周转仓",
              "滨江冷链仓",
              "嘉兴备件仓"
            ]
          },
          {
            "name": "location",
            "label": "库位",
            "type": "select",
            "required": true,
            "options": [
              "A-01-08",
              "A-02-03",
              "B-01-05",
              "B-03-02"
            ],
            "dependsOn": [
              "warehouse"
            ],
            "optionsSource": "warehouse-location"
          },
          {
            "name": "material",
            "label": "物料",
            "type": "select",
            "required": true,
            "options": [
              "动态心电监测耗材包",
              "一次性采血针",
              "真空采血管",
              "医用外科口罩"
            ]
          },
          {
            "name": "batch",
            "label": "批次",
            "type": "select",
            "required": true,
            "options": [
              "BATCH-202608-A",
              "BATCH-202607-C",
              "BATCH-202609-B"
            ],
            "dependsOn": [
              "warehouse",
              "location"
            ],
            "optionsSource": "inventory-batch"
          },
          {
            "name": "availableQty",
            "label": "账面数量",
            "type": "number",
            "required": false,
            "system": true,
            "readonly": true
          },
          {
            "name": "quantity",
            "label": "实盘数量",
            "type": "number",
            "required": true
          },
          {
            "name": "differenceQty",
            "label": "差异数量",
            "type": "number",
            "required": false,
            "system": true,
            "readonly": true
          },
          {
            "name": "date",
            "label": "盘点日期",
            "type": "date",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待审批",
              "已通过",
              "已完成",
              "已取消",
              "已作废"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "approval-approve",
      "approval-reject",
      "resource-void",
      "resource-archive",
      "resource-confirm"
    ],
    "batchActions": [
      "resource-archive"
    ],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "approval-approve",
      "approval-reject",
      "resource-void",
      "resource-archive",
      "resource-confirm"
    ],
    "relationTabs": [
      "inventory-stocktake"
    ],
    "fields": [
      {
        "name": "systemNo",
        "label": "盘点单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "warehouse",
        "label": "仓库",
        "type": "select",
        "required": true,
        "options": [
          "杭州一号仓",
          "宁波周转仓",
          "滨江冷链仓",
          "嘉兴备件仓"
        ]
      },
      {
        "name": "location",
        "label": "库位",
        "type": "select",
        "required": true,
        "options": [
          "A-01-08",
          "A-02-03",
          "B-01-05",
          "B-03-02"
        ],
        "dependsOn": [
          "warehouse"
        ],
        "optionsSource": "warehouse-location"
      },
      {
        "name": "material",
        "label": "物料",
        "type": "select",
        "required": true,
        "options": [
          "动态心电监测耗材包",
          "一次性采血针",
          "真空采血管",
          "医用外科口罩"
        ]
      },
      {
        "name": "batch",
        "label": "批次",
        "type": "select",
        "required": true,
        "options": [
          "BATCH-202608-A",
          "BATCH-202607-C",
          "BATCH-202609-B"
        ],
        "dependsOn": [
          "warehouse",
          "location"
        ],
        "optionsSource": "inventory-batch"
      },
      {
        "name": "availableQty",
        "label": "账面数量",
        "type": "number",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "quantity",
        "label": "实盘数量",
        "type": "number",
        "required": true
      },
      {
        "name": "differenceQty",
        "label": "差异数量",
        "type": "number",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "date",
        "label": "盘点日期",
        "type": "date",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "已完成",
          "已取消",
          "已作废"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": false
  },
  {
    "resourceId": "inventory-scrap",
    "domainId": "supply",
    "groupId": "supply-inventory",
    "pageType": "document",
    "title": "报废单",
    "description": "查询并处理报废单，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "systemNo",
        "label": "报废单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "已完成",
          "已取消",
          "已作废"
        ]
      }
    ],
    "columns": [
      "systemNo",
      "material",
      "warehouse",
      "location",
      "batch",
      "quantity",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "systemNo",
          "material",
          "warehouse",
          "location",
          "batch",
          "quantity",
          "disposalReason",
          "reason",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "systemNo",
            "label": "报废单号",
            "type": "text",
            "required": false,
            "system": true,
            "readonly": true,
            "generated": true,
            "systemHint": "保存后由系统按业务规则自动生成。"
          },
          {
            "name": "material",
            "label": "物料",
            "type": "select",
            "required": true,
            "options": [
              "动态心电监测耗材包",
              "一次性采血针",
              "真空采血管",
              "医用外科口罩"
            ]
          },
          {
            "name": "warehouse",
            "label": "仓库",
            "type": "select",
            "required": true,
            "options": [
              "杭州一号仓",
              "宁波周转仓",
              "滨江冷链仓",
              "嘉兴备件仓"
            ]
          },
          {
            "name": "location",
            "label": "库位",
            "type": "select",
            "required": true,
            "options": [
              "A-01-08",
              "A-02-03",
              "B-01-05",
              "B-03-02"
            ],
            "dependsOn": [
              "warehouse"
            ],
            "optionsSource": "warehouse-location"
          },
          {
            "name": "batch",
            "label": "批次",
            "type": "select",
            "required": true,
            "options": [
              "BATCH-202608-A",
              "BATCH-202607-C",
              "BATCH-202609-B"
            ],
            "dependsOn": [
              "warehouse",
              "location"
            ],
            "optionsSource": "inventory-batch"
          },
          {
            "name": "quantity",
            "label": "报废数量",
            "type": "number",
            "required": true
          },
          {
            "name": "disposalReason",
            "label": "报废原因",
            "type": "select",
            "required": true,
            "options": [
              "过期失效",
              "质量不合格",
              "破损污染",
              "盘亏确认",
              "其他"
            ]
          },
          {
            "name": "reason",
            "label": "处理说明",
            "type": "textarea",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待审批",
              "已通过",
              "已完成",
              "已取消",
              "已作废"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "approval-approve",
      "approval-reject",
      "resource-void",
      "resource-archive"
    ],
    "batchActions": [
      "resource-archive"
    ],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "approval-approve",
      "approval-reject",
      "resource-void",
      "resource-archive"
    ],
    "relationTabs": [
      "inventory-scrap"
    ],
    "fields": [
      {
        "name": "systemNo",
        "label": "报废单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "material",
        "label": "物料",
        "type": "select",
        "required": true,
        "options": [
          "动态心电监测耗材包",
          "一次性采血针",
          "真空采血管",
          "医用外科口罩"
        ]
      },
      {
        "name": "warehouse",
        "label": "仓库",
        "type": "select",
        "required": true,
        "options": [
          "杭州一号仓",
          "宁波周转仓",
          "滨江冷链仓",
          "嘉兴备件仓"
        ]
      },
      {
        "name": "location",
        "label": "库位",
        "type": "select",
        "required": true,
        "options": [
          "A-01-08",
          "A-02-03",
          "B-01-05",
          "B-03-02"
        ],
        "dependsOn": [
          "warehouse"
        ],
        "optionsSource": "warehouse-location"
      },
      {
        "name": "batch",
        "label": "批次",
        "type": "select",
        "required": true,
        "options": [
          "BATCH-202608-A",
          "BATCH-202607-C",
          "BATCH-202609-B"
        ],
        "dependsOn": [
          "warehouse",
          "location"
        ],
        "optionsSource": "inventory-batch"
      },
      {
        "name": "quantity",
        "label": "报废数量",
        "type": "number",
        "required": true
      },
      {
        "name": "disposalReason",
        "label": "报废原因",
        "type": "select",
        "required": true,
        "options": [
          "过期失效",
          "质量不合格",
          "破损污染",
          "盘亏确认",
          "其他"
        ]
      },
      {
        "name": "reason",
        "label": "处理说明",
        "type": "textarea",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "已完成",
          "已取消",
          "已作废"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": false
  },
  {
    "resourceId": "inventory-flow",
    "domainId": "supply",
    "groupId": "supply-inventory",
    "pageType": "ledger",
    "title": "库存流水",
    "description": "查询库存流水的数量、状态和关联业务明细。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      },
      {
        "key": "active",
        "label": "当前有效",
        "tone": "success"
      },
      {
        "key": "pending",
        "label": "待处理",
        "tone": "warning"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "flowType",
        "label": "流水类型",
        "type": "select",
        "required": false,
        "options": [
          "采购入库",
          "客户耗用出库",
          "领用出库",
          "调拨出库",
          "调拨入库",
          "盘点调整",
          "报废出库",
          "撤回回补"
        ]
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "已记账",
          "已冲销"
        ]
      }
    ],
    "columns": [
      "flowType",
      "businessNo",
      "material",
      "warehouse",
      "location",
      "batch",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "flowType",
          "businessNo",
          "material",
          "warehouse",
          "location",
          "batch",
          "beforeQty",
          "changeQty",
          "afterQty",
          "systemNo",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "flowType",
            "label": "流水类型",
            "type": "select",
            "required": true,
            "options": [
              "采购入库",
              "客户耗用出库",
              "领用出库",
              "调拨出库",
              "调拨入库",
              "盘点调整",
              "报废出库",
              "撤回回补"
            ]
          },
          {
            "name": "businessNo",
            "label": "来源单据",
            "type": "select",
            "required": true,
            "options": [
              "IN-202609-001",
              "MU-202609-001",
              "TR-202609-001"
            ]
          },
          {
            "name": "material",
            "label": "物料",
            "type": "select",
            "required": true,
            "options": [
              "动态心电监测耗材包",
              "一次性采血针",
              "真空采血管",
              "医用外科口罩"
            ]
          },
          {
            "name": "warehouse",
            "label": "仓库",
            "type": "select",
            "required": true,
            "options": [
              "杭州一号仓",
              "宁波周转仓",
              "滨江冷链仓",
              "嘉兴备件仓"
            ]
          },
          {
            "name": "location",
            "label": "库位",
            "type": "select",
            "required": true,
            "options": [
              "A-01-08",
              "A-02-03",
              "B-01-05",
              "B-03-02"
            ],
            "dependsOn": [
              "warehouse"
            ],
            "optionsSource": "warehouse-location"
          },
          {
            "name": "batch",
            "label": "批次",
            "type": "select",
            "required": true,
            "options": [
              "BATCH-202608-A",
              "BATCH-202607-C",
              "BATCH-202609-B"
            ],
            "dependsOn": [
              "warehouse",
              "location"
            ],
            "optionsSource": "inventory-batch"
          },
          {
            "name": "beforeQty",
            "label": "变更前数量",
            "type": "number",
            "required": false,
            "system": true,
            "readonly": true
          },
          {
            "name": "changeQty",
            "label": "变更数量",
            "type": "number",
            "required": false,
            "system": true,
            "readonly": true
          },
          {
            "name": "afterQty",
            "label": "变更后数量",
            "type": "number",
            "required": false,
            "system": true,
            "readonly": true
          },
          {
            "name": "systemNo",
            "label": "流水审计号",
            "type": "text",
            "required": false,
            "system": true,
            "readonly": true,
            "generated": true,
            "systemHint": "保存后由系统按业务规则自动生成。"
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "已记账",
              "已冲销"
            ]
          }
        ]
      }
    ],
    "rowActions": [],
    "batchActions": [
      "resource-export"
    ],
    "statusActions": [],
    "relationTabs": [
      "inventory-flow"
    ],
    "fields": [
      {
        "name": "flowType",
        "label": "流水类型",
        "type": "select",
        "required": true,
        "options": [
          "采购入库",
          "客户耗用出库",
          "领用出库",
          "调拨出库",
          "调拨入库",
          "盘点调整",
          "报废出库",
          "撤回回补"
        ]
      },
      {
        "name": "businessNo",
        "label": "来源单据",
        "type": "select",
        "required": true,
        "options": [
          "IN-202609-001",
          "MU-202609-001",
          "TR-202609-001"
        ]
      },
      {
        "name": "material",
        "label": "物料",
        "type": "select",
        "required": true,
        "options": [
          "动态心电监测耗材包",
          "一次性采血针",
          "真空采血管",
          "医用外科口罩"
        ]
      },
      {
        "name": "warehouse",
        "label": "仓库",
        "type": "select",
        "required": true,
        "options": [
          "杭州一号仓",
          "宁波周转仓",
          "滨江冷链仓",
          "嘉兴备件仓"
        ]
      },
      {
        "name": "location",
        "label": "库位",
        "type": "select",
        "required": true,
        "options": [
          "A-01-08",
          "A-02-03",
          "B-01-05",
          "B-03-02"
        ],
        "dependsOn": [
          "warehouse"
        ],
        "optionsSource": "warehouse-location"
      },
      {
        "name": "batch",
        "label": "批次",
        "type": "select",
        "required": true,
        "options": [
          "BATCH-202608-A",
          "BATCH-202607-C",
          "BATCH-202609-B"
        ],
        "dependsOn": [
          "warehouse",
          "location"
        ],
        "optionsSource": "inventory-batch"
      },
      {
        "name": "beforeQty",
        "label": "变更前数量",
        "type": "number",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "changeQty",
        "label": "变更数量",
        "type": "number",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "afterQty",
        "label": "变更后数量",
        "type": "number",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "systemNo",
        "label": "流水审计号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "已记账",
          "已冲销"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "inventory-operations",
    "domainId": "supply",
    "groupId": "supply-inventory",
    "pageType": "document",
    "title": "库存作业",
    "description": "查询并处理库存作业，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "operationType",
        "label": "作业类型",
        "type": "select",
        "required": false,
        "options": [
          "调拨",
          "盘点",
          "报废"
        ]
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "盘点中",
          "已完成",
          "已作废"
        ]
      }
    ],
    "columns": [
      "operationType",
      "warehouse",
      "material",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "operationType",
          "warehouse",
          "material",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "operationType",
            "label": "作业类型",
            "type": "select",
            "required": true,
            "options": [
              "调拨",
              "盘点",
              "报废"
            ]
          },
          {
            "name": "warehouse",
            "label": "仓库",
            "type": "select",
            "required": true,
            "options": [
              "杭州一号仓",
              "宁波周转仓",
              "滨江冷链仓",
              "嘉兴备件仓"
            ]
          },
          {
            "name": "material",
            "label": "物料",
            "type": "select",
            "required": true,
            "options": [
              "动态心电监测耗材包",
              "一次性采血针",
              "真空采血管",
              "医用外科口罩"
            ]
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待审批",
              "盘点中",
              "已完成",
              "已作废"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-submit",
      "resource-confirm",
      "resource-cancel"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-submit",
      "resource-confirm",
      "resource-cancel"
    ],
    "relationTabs": [
      "inventory-transfer",
      "inventory-stocktake",
      "inventory-scrap"
    ],
    "fields": [
      {
        "name": "operationType",
        "label": "作业类型",
        "type": "select",
        "required": true,
        "options": [
          "调拨",
          "盘点",
          "报废"
        ]
      },
      {
        "name": "warehouse",
        "label": "仓库",
        "type": "select",
        "required": true,
        "options": [
          "杭州一号仓",
          "宁波周转仓",
          "滨江冷链仓",
          "嘉兴备件仓"
        ]
      },
      {
        "name": "material",
        "label": "物料",
        "type": "select",
        "required": true,
        "options": [
          "动态心电监测耗材包",
          "一次性采血针",
          "真空采血管",
          "医用外科口罩"
        ]
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "盘点中",
          "已完成",
          "已作废"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "asset-category",
    "domainId": "supply",
    "groupId": "supply-asset",
    "pageType": "master",
    "title": "资产分类",
    "description": "维护资产分类，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "scope",
        "label": "适用范围",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "scope",
      "depreciationYears",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "scope",
          "depreciationYears",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "资产分类名称",
            "type": "text",
            "required": true
          },
          {
            "name": "scope",
            "label": "适用范围",
            "type": "text",
            "required": true
          },
          {
            "name": "depreciationYears",
            "label": "折旧年限",
            "type": "number",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "已启用",
              "已停用"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "relationTabs": [
      "asset-category"
    ],
    "fields": [
      {
        "name": "name",
        "label": "资产分类名称",
        "type": "text",
        "required": true
      },
      {
        "name": "scope",
        "label": "适用范围",
        "type": "text",
        "required": true
      },
      {
        "name": "depreciationYears",
        "label": "折旧年限",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "已启用",
          "已停用"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "asset-card",
    "domainId": "supply",
    "groupId": "supply-asset",
    "pageType": "master",
    "title": "资产资料",
    "description": "维护资产资料，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "assetCode",
        "label": "资产编号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按资产编码规则自动生成。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "使用中",
          "维修中",
          "已归档",
          "已报废"
        ]
      }
    ],
    "columns": [
      "name",
      "assetCode",
      "assetCategory",
      "sourcePurchaseOrder",
      "sourceInbound",
      "brandModel",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "assetCode",
          "assetCategory",
          "sourcePurchaseOrder",
          "sourceInbound",
          "brandModel",
          "organization",
          "department",
          "custodian",
          "location",
          "assetValue",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "资产名称",
            "type": "text",
            "required": true
          },
          {
            "name": "assetCode",
            "label": "资产编号",
            "type": "text",
            "required": false,
            "system": true,
            "readonly": true,
            "generated": true,
            "systemHint": "保存后由系统按资产编码规则自动生成。"
          },
          {
            "name": "assetCategory",
            "label": "资产分类",
            "type": "search-select",
            "required": true,
            "optionsSource": "asset-category"
          },
          {
            "name": "sourcePurchaseOrder",
            "label": "来源采购订单",
            "type": "search-select",
            "required": false,
            "optionsSource": "purchase-order"
          },
          {
            "name": "sourceInbound",
            "label": "来源入库单",
            "type": "search-select",
            "required": false,
            "optionsSource": "inventory-inbound"
          },
          {
            "name": "brandModel",
            "label": "品牌型号",
            "type": "text",
            "required": true
          },
          {
            "name": "organization",
            "label": "所属组织",
            "type": "select",
            "required": true,
            "options": [
              "健康管理中心",
              "宁波服务中心"
            ]
          },
          {
            "name": "department",
            "label": "使用部门",
            "type": "select",
            "required": true,
            "options": [
              "采购管理部",
              "健康管理中心",
              "护理部",
              "医学服务部"
            ]
          },
          {
            "name": "custodian",
            "label": "保管人",
            "type": "search-select",
            "required": true,
            "optionsSource": "hr-employee"
          },
          {
            "name": "location",
            "label": "存放位置",
            "type": "cascader",
            "required": true,
            "optionsSource": "warehouse-location"
          },
          {
            "name": "assetValue",
            "label": "资产原值",
            "type": "number",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待审批",
              "已通过",
              "使用中",
              "维修中",
              "已归档",
              "已报废"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable",
      "resource-import"
    ],
    "statusActions": [],
    "relationTabs": [
      "asset-card"
    ],
    "fields": [
      {
        "name": "name",
        "label": "资产名称",
        "type": "text",
        "required": true
      },
      {
        "name": "assetCode",
        "label": "资产编号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按资产编码规则自动生成。"
      },
      {
        "name": "assetCategory",
        "label": "资产分类",
        "type": "search-select",
        "required": true,
        "optionsSource": "asset-category"
      },
      {
        "name": "sourcePurchaseOrder",
        "label": "来源采购订单",
        "type": "search-select",
        "required": false,
        "optionsSource": "purchase-order"
      },
      {
        "name": "sourceInbound",
        "label": "来源入库单",
        "type": "search-select",
        "required": false,
        "optionsSource": "inventory-inbound"
      },
      {
        "name": "brandModel",
        "label": "品牌型号",
        "type": "text",
        "required": true
      },
      {
        "name": "organization",
        "label": "所属组织",
        "type": "select",
        "required": true,
        "options": [
          "健康管理中心",
          "宁波服务中心"
        ]
      },
      {
        "name": "department",
        "label": "使用部门",
        "type": "select",
        "required": true,
        "options": [
          "采购管理部",
          "健康管理中心",
          "护理部",
          "医学服务部"
        ]
      },
      {
        "name": "custodian",
        "label": "保管人",
        "type": "search-select",
        "required": true,
        "optionsSource": "hr-employee"
      },
      {
        "name": "location",
        "label": "存放位置",
        "type": "cascader",
        "required": true,
        "optionsSource": "warehouse-location"
      },
      {
        "name": "assetValue",
        "label": "资产原值",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "使用中",
          "维修中",
          "已归档",
          "已报废"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "asset-use",
    "domainId": "supply",
    "groupId": "supply-asset",
    "pageType": "document",
    "title": "资产领用单",
    "description": "查询并处理资产领用单，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "systemNo",
        "label": "资产领用单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "使用中",
          "维修中",
          "已归档",
          "已报废"
        ]
      }
    ],
    "columns": [
      "systemNo",
      "assetCode",
      "employee",
      "date",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "systemNo",
          "assetCode",
          "employee",
          "date",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "systemNo",
            "label": "资产领用单号",
            "type": "text",
            "required": false,
            "system": true,
            "readonly": true,
            "generated": true,
            "systemHint": "保存后由系统按业务规则自动生成。"
          },
          {
            "name": "assetCode",
            "label": "资产",
            "type": "search-select",
            "required": true,
            "optionsSource": "asset-card"
          },
          {
            "name": "employee",
            "label": "领用人",
            "type": "search-select",
            "required": true,
            "optionsSource": "hr-employee"
          },
          {
            "name": "date",
            "label": "领用日期",
            "type": "date",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待审批",
              "已通过",
              "使用中",
              "维修中",
              "已归档",
              "已报废"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "approval-approve",
      "approval-reject",
      "resource-confirm"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "approval-approve",
      "approval-reject",
      "resource-confirm"
    ],
    "relationTabs": [
      "asset-use"
    ],
    "fields": [
      {
        "name": "systemNo",
        "label": "资产领用单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "assetCode",
        "label": "资产",
        "type": "search-select",
        "required": true,
        "optionsSource": "asset-card"
      },
      {
        "name": "employee",
        "label": "领用人",
        "type": "search-select",
        "required": true,
        "optionsSource": "hr-employee"
      },
      {
        "name": "date",
        "label": "领用日期",
        "type": "date",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "使用中",
          "维修中",
          "已归档",
          "已报废"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "asset-return",
    "domainId": "supply",
    "groupId": "supply-asset",
    "pageType": "document",
    "title": "资产归还单",
    "description": "查询并处理资产归还单，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "systemNo",
        "label": "资产归还单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "使用中",
          "维修中",
          "已归档",
          "已报废"
        ]
      }
    ],
    "columns": [
      "systemNo",
      "assetCode",
      "employee",
      "location",
      "date",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "systemNo",
          "assetCode",
          "employee",
          "location",
          "date",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "systemNo",
            "label": "资产归还单号",
            "type": "text",
            "required": false,
            "system": true,
            "readonly": true,
            "generated": true,
            "systemHint": "保存后由系统按业务规则自动生成。"
          },
          {
            "name": "assetCode",
            "label": "资产",
            "type": "search-select",
            "required": true,
            "optionsSource": "asset-card"
          },
          {
            "name": "employee",
            "label": "归还人",
            "type": "search-select",
            "required": true,
            "optionsSource": "hr-employee"
          },
          {
            "name": "location",
            "label": "归还位置",
            "type": "cascader",
            "required": true,
            "optionsSource": "warehouse-location"
          },
          {
            "name": "date",
            "label": "归还日期",
            "type": "date",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待审批",
              "已通过",
              "使用中",
              "维修中",
              "已归档",
              "已报废"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm"
    ],
    "relationTabs": [
      "asset-return"
    ],
    "fields": [
      {
        "name": "systemNo",
        "label": "资产归还单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "assetCode",
        "label": "资产",
        "type": "search-select",
        "required": true,
        "optionsSource": "asset-card"
      },
      {
        "name": "employee",
        "label": "归还人",
        "type": "search-select",
        "required": true,
        "optionsSource": "hr-employee"
      },
      {
        "name": "location",
        "label": "归还位置",
        "type": "cascader",
        "required": true,
        "optionsSource": "warehouse-location"
      },
      {
        "name": "date",
        "label": "归还日期",
        "type": "date",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "使用中",
          "维修中",
          "已归档",
          "已报废"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "asset-transfer",
    "domainId": "supply",
    "groupId": "supply-asset",
    "pageType": "document",
    "title": "资产调拨单",
    "description": "查询并处理资产调拨单，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "systemNo",
        "label": "资产调拨单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "使用中",
          "维修中",
          "已归档",
          "已报废"
        ]
      }
    ],
    "columns": [
      "systemNo",
      "assetCode",
      "organization",
      "department",
      "location",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "systemNo",
          "assetCode",
          "organization",
          "department",
          "location",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "systemNo",
            "label": "资产调拨单号",
            "type": "text",
            "required": false,
            "system": true,
            "readonly": true,
            "generated": true,
            "systemHint": "保存后由系统按业务规则自动生成。"
          },
          {
            "name": "assetCode",
            "label": "资产",
            "type": "search-select",
            "required": true,
            "optionsSource": "asset-card"
          },
          {
            "name": "organization",
            "label": "调入组织",
            "type": "select",
            "required": true,
            "options": [
              "健康管理中心",
              "宁波服务中心"
            ]
          },
          {
            "name": "department",
            "label": "调入部门",
            "type": "select",
            "required": true,
            "options": [
              "采购管理部",
              "健康管理中心",
              "护理部",
              "医学服务部"
            ]
          },
          {
            "name": "location",
            "label": "调入位置",
            "type": "cascader",
            "required": true,
            "optionsSource": "warehouse-location"
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待审批",
              "已通过",
              "使用中",
              "维修中",
              "已归档",
              "已报废"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "relationTabs": [
      "asset-transfer"
    ],
    "fields": [
      {
        "name": "systemNo",
        "label": "资产调拨单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "assetCode",
        "label": "资产",
        "type": "search-select",
        "required": true,
        "optionsSource": "asset-card"
      },
      {
        "name": "organization",
        "label": "调入组织",
        "type": "select",
        "required": true,
        "options": [
          "健康管理中心",
          "宁波服务中心"
        ]
      },
      {
        "name": "department",
        "label": "调入部门",
        "type": "select",
        "required": true,
        "options": [
          "采购管理部",
          "健康管理中心",
          "护理部",
          "医学服务部"
        ]
      },
      {
        "name": "location",
        "label": "调入位置",
        "type": "cascader",
        "required": true,
        "optionsSource": "warehouse-location"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "使用中",
          "维修中",
          "已归档",
          "已报废"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "asset-maintenance",
    "domainId": "supply",
    "groupId": "supply-asset",
    "pageType": "document",
    "title": "资产维修单",
    "description": "查询并处理资产维修单，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "systemNo",
        "label": "资产维修单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "使用中",
          "维修中",
          "已归档",
          "已报废"
        ]
      }
    ],
    "columns": [
      "systemNo",
      "assetCode",
      "maintenanceVendor",
      "amount",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "systemNo",
          "assetCode",
          "maintenanceVendor",
          "amount",
          "reason",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "systemNo",
            "label": "资产维修单号",
            "type": "text",
            "required": false,
            "system": true,
            "readonly": true,
            "generated": true,
            "systemHint": "保存后由系统按业务规则自动生成。"
          },
          {
            "name": "assetCode",
            "label": "资产",
            "type": "search-select",
            "required": true,
            "optionsSource": "asset-card"
          },
          {
            "name": "maintenanceVendor",
            "label": "维修单位",
            "type": "text",
            "required": true
          },
          {
            "name": "amount",
            "label": "维修金额",
            "type": "number",
            "required": true
          },
          {
            "name": "reason",
            "label": "原因/说明",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待审批",
              "已通过",
              "使用中",
              "维修中",
              "已归档",
              "已报废"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-archive"
    ],
    "batchActions": [
      "resource-archive"
    ],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-archive"
    ],
    "relationTabs": [
      "asset-maintenance"
    ],
    "fields": [
      {
        "name": "systemNo",
        "label": "资产维修单号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "assetCode",
        "label": "资产",
        "type": "search-select",
        "required": true,
        "optionsSource": "asset-card"
      },
      {
        "name": "maintenanceVendor",
        "label": "维修单位",
        "type": "text",
        "required": true
      },
      {
        "name": "amount",
        "label": "维修金额",
        "type": "number",
        "required": true
      },
      {
        "name": "reason",
        "label": "原因/说明",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "使用中",
          "维修中",
          "已归档",
          "已报废"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "asset-stocktake",
    "domainId": "supply",
    "groupId": "supply-asset",
    "pageType": "document",
    "title": "资产盘点任务",
    "description": "查询并处理资产盘点任务，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "systemNo",
        "label": "资产盘点任务号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "使用中",
          "维修中",
          "已归档",
          "已报废"
        ]
      }
    ],
    "columns": [
      "systemNo",
      "assetCode",
      "organization",
      "date",
      "result",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "systemNo",
          "assetCode",
          "organization",
          "date",
          "result",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "systemNo",
            "label": "资产盘点任务号",
            "type": "text",
            "required": false,
            "system": true,
            "readonly": true,
            "generated": true,
            "systemHint": "保存后由系统按业务规则自动生成。"
          },
          {
            "name": "assetCode",
            "label": "资产",
            "type": "search-select",
            "required": true,
            "optionsSource": "asset-card"
          },
          {
            "name": "organization",
            "label": "盘点组织",
            "type": "select",
            "required": true,
            "options": [
              "健康管理中心",
              "宁波服务中心"
            ]
          },
          {
            "name": "date",
            "label": "盘点日期",
            "type": "date",
            "required": true
          },
          {
            "name": "result",
            "label": "盘点结果",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待审批",
              "已通过",
              "使用中",
              "维修中",
              "已归档",
              "已报废"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-archive",
      "resource-confirm"
    ],
    "batchActions": [
      "resource-archive"
    ],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-archive",
      "resource-confirm"
    ],
    "relationTabs": [
      "asset-stocktake"
    ],
    "fields": [
      {
        "name": "systemNo",
        "label": "资产盘点任务号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "assetCode",
        "label": "资产",
        "type": "search-select",
        "required": true,
        "optionsSource": "asset-card"
      },
      {
        "name": "organization",
        "label": "盘点组织",
        "type": "select",
        "required": true,
        "options": [
          "健康管理中心",
          "宁波服务中心"
        ]
      },
      {
        "name": "date",
        "label": "盘点日期",
        "type": "date",
        "required": true
      },
      {
        "name": "result",
        "label": "盘点结果",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "使用中",
          "维修中",
          "已归档",
          "已报废"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "asset-scrap",
    "domainId": "supply",
    "groupId": "supply-asset",
    "pageType": "document",
    "title": "资产报废申请",
    "description": "查询并处理资产报废申请，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "systemNo",
        "label": "资产报废申请号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "使用中",
          "维修中",
          "已归档",
          "已报废"
        ]
      }
    ],
    "columns": [
      "systemNo",
      "assetCode",
      "disposalMethod",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "systemNo",
          "assetCode",
          "disposalMethod",
          "reason",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "systemNo",
            "label": "资产报废申请号",
            "type": "text",
            "required": false,
            "system": true,
            "readonly": true,
            "generated": true,
            "systemHint": "保存后由系统按业务规则自动生成。"
          },
          {
            "name": "assetCode",
            "label": "资产",
            "type": "search-select",
            "required": true,
            "optionsSource": "asset-card"
          },
          {
            "name": "disposalMethod",
            "label": "处置方式",
            "type": "text",
            "required": true
          },
          {
            "name": "reason",
            "label": "原因/说明",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待审批",
              "已通过",
              "使用中",
              "维修中",
              "已归档",
              "已报废"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "approval-approve",
      "approval-reject",
      "resource-archive"
    ],
    "batchActions": [
      "resource-archive"
    ],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "approval-approve",
      "approval-reject",
      "resource-archive"
    ],
    "relationTabs": [
      "asset-scrap"
    ],
    "fields": [
      {
        "name": "systemNo",
        "label": "资产报废申请号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true,
        "generated": true,
        "systemHint": "保存后由系统按业务规则自动生成。"
      },
      {
        "name": "assetCode",
        "label": "资产",
        "type": "search-select",
        "required": true,
        "optionsSource": "asset-card"
      },
      {
        "name": "disposalMethod",
        "label": "处置方式",
        "type": "text",
        "required": true
      },
      {
        "name": "reason",
        "label": "原因/说明",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "使用中",
          "维修中",
          "已归档",
          "已报废"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "asset-depreciation",
    "domainId": "supply",
    "groupId": "supply-asset",
    "pageType": "ledger",
    "title": "折旧管理",
    "description": "查询折旧管理的数量、状态和关联业务明细。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      },
      {
        "key": "active",
        "label": "当前有效",
        "tone": "success"
      },
      {
        "key": "pending",
        "label": "待处理",
        "tone": "warning"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "assetCode",
        "label": "资产",
        "type": "search-select",
        "required": false,
        "optionsSource": "asset-card"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "待计提",
          "已计提",
          "已冲销"
        ]
      }
    ],
    "columns": [
      "assetCode",
      "period",
      "openingNetValue",
      "depreciationAmount",
      "closingNetValue",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "assetCode",
          "period",
          "openingNetValue",
          "depreciationAmount",
          "closingNetValue",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "assetCode",
            "label": "资产",
            "type": "search-select",
            "required": true,
            "optionsSource": "asset-card"
          },
          {
            "name": "period",
            "label": "折旧期间",
            "type": "date",
            "required": true
          },
          {
            "name": "openingNetValue",
            "label": "期初净值",
            "type": "number",
            "required": false,
            "system": true,
            "readonly": true
          },
          {
            "name": "depreciationAmount",
            "label": "本期折旧额",
            "type": "number",
            "required": false,
            "system": true,
            "readonly": true
          },
          {
            "name": "closingNetValue",
            "label": "期末净值",
            "type": "number",
            "required": false,
            "system": true,
            "readonly": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": false,
            "options": [
              "待计提",
              "已计提",
              "已冲销"
            ],
            "system": true
          }
        ]
      }
    ],
    "rowActions": [
      "resource-confirm"
    ],
    "batchActions": [
      "resource-export"
    ],
    "statusActions": [
      "resource-confirm"
    ],
    "relationTabs": [
      "asset-card",
      "asset-lifecycle"
    ],
    "fields": [
      {
        "name": "assetCode",
        "label": "资产",
        "type": "search-select",
        "required": true,
        "optionsSource": "asset-card"
      },
      {
        "name": "period",
        "label": "折旧期间",
        "type": "date",
        "required": true
      },
      {
        "name": "openingNetValue",
        "label": "期初净值",
        "type": "number",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "depreciationAmount",
        "label": "本期折旧额",
        "type": "number",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "closingNetValue",
        "label": "期末净值",
        "type": "number",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "待计提",
          "已计提",
          "已冲销"
        ],
        "system": true
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "asset-lifecycle",
    "domainId": "supply",
    "groupId": "supply-asset",
    "pageType": "ledger",
    "title": "生命周期记录",
    "description": "查询生命周期记录的数量、状态和关联业务明细。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      },
      {
        "key": "active",
        "label": "当前有效",
        "tone": "success"
      },
      {
        "key": "pending",
        "label": "待处理",
        "tone": "warning"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "assetCode",
        "label": "资产",
        "type": "search-select",
        "required": false,
        "optionsSource": "asset-card"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "已完成",
          "处理中",
          "已冲销"
        ]
      }
    ],
    "columns": [
      "assetCode",
      "businessType",
      "businessNo",
      "previousCustodian",
      "currentCustodian",
      "location",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "assetCode",
          "businessType",
          "businessNo",
          "previousCustodian",
          "currentCustodian",
          "location",
          "occurredAt",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "assetCode",
            "label": "资产",
            "type": "search-select",
            "required": true,
            "optionsSource": "asset-card"
          },
          {
            "name": "businessType",
            "label": "业务类型",
            "type": "select",
            "required": true,
            "options": [
              "建档",
              "领用",
              "借出",
              "归还",
              "调拨",
              "维修",
              "盘点",
              "折旧",
              "报废"
            ]
          },
          {
            "name": "businessNo",
            "label": "来源单据",
            "type": "search-select",
            "required": true,
            "optionsSource": "asset-business"
          },
          {
            "name": "previousCustodian",
            "label": "原保管人",
            "type": "search-select",
            "required": false,
            "optionsSource": "employee"
          },
          {
            "name": "currentCustodian",
            "label": "新保管人",
            "type": "search-select",
            "required": false,
            "optionsSource": "employee"
          },
          {
            "name": "location",
            "label": "当前位置",
            "type": "cascader",
            "required": false,
            "optionsSource": "warehouse-location"
          },
          {
            "name": "occurredAt",
            "label": "发生时间",
            "type": "datetime-local",
            "required": false,
            "system": true,
            "readonly": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": false,
            "options": [
              "已完成",
              "处理中",
              "已冲销"
            ],
            "system": true
          }
        ]
      }
    ],
    "rowActions": [],
    "batchActions": [
      "resource-export"
    ],
    "statusActions": [],
    "relationTabs": [
      "asset-card"
    ],
    "fields": [
      {
        "name": "assetCode",
        "label": "资产",
        "type": "search-select",
        "required": true,
        "optionsSource": "asset-card"
      },
      {
        "name": "businessType",
        "label": "业务类型",
        "type": "select",
        "required": true,
        "options": [
          "建档",
          "领用",
          "借出",
          "归还",
          "调拨",
          "维修",
          "盘点",
          "折旧",
          "报废"
        ]
      },
      {
        "name": "businessNo",
        "label": "来源单据",
        "type": "search-select",
        "required": true,
        "optionsSource": "asset-business"
      },
      {
        "name": "previousCustodian",
        "label": "原保管人",
        "type": "search-select",
        "required": false,
        "optionsSource": "employee"
      },
      {
        "name": "currentCustodian",
        "label": "新保管人",
        "type": "search-select",
        "required": false,
        "optionsSource": "employee"
      },
      {
        "name": "location",
        "label": "当前位置",
        "type": "cascader",
        "required": false,
        "optionsSource": "warehouse-location"
      },
      {
        "name": "occurredAt",
        "label": "发生时间",
        "type": "datetime-local",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "已完成",
          "处理中",
          "已冲销"
        ],
        "system": true
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "integration-project",
    "domainId": "supply",
    "groupId": "supply-integration",
    "pageType": "master",
    "title": "对接项目",
    "description": "维护对接项目，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "sourceSystem",
        "label": "来源系统",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待执行",
          "执行中",
          "成功",
          "失败",
          "已补偿"
        ]
      }
    ],
    "columns": [
      "name",
      "sourceSystem",
      "direction",
      "endpoint",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "sourceSystem",
          "direction",
          "endpoint",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "sourceSystem",
            "label": "来源系统",
            "type": "text",
            "required": true
          },
          {
            "name": "direction",
            "label": "接口方向",
            "type": "text",
            "required": true
          },
          {
            "name": "endpoint",
            "label": "接口地址",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待执行",
              "执行中",
              "成功",
              "失败",
              "已补偿"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "relationTabs": [
      "integration-project"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "sourceSystem",
        "label": "来源系统",
        "type": "text",
        "required": true
      },
      {
        "name": "direction",
        "label": "接口方向",
        "type": "text",
        "required": true
      },
      {
        "name": "endpoint",
        "label": "接口地址",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待执行",
          "执行中",
          "成功",
          "失败",
          "已补偿"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "integration-field-map",
    "domainId": "supply",
    "groupId": "supply-integration",
    "pageType": "master",
    "title": "字段映射",
    "description": "维护字段映射，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "sourceSystem",
        "label": "来源系统",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待执行",
          "执行中",
          "成功",
          "失败",
          "已补偿"
        ]
      }
    ],
    "columns": [
      "name",
      "sourceSystem",
      "externalCode",
      "standardCode",
      "mappingRule",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "sourceSystem",
          "externalCode",
          "standardCode",
          "mappingRule",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "sourceSystem",
            "label": "来源系统",
            "type": "text",
            "required": true
          },
          {
            "name": "externalCode",
            "label": "外部编码",
            "type": "text",
            "required": true
          },
          {
            "name": "standardCode",
            "label": "标准编码",
            "type": "text",
            "required": true
          },
          {
            "name": "mappingRule",
            "label": "映射规则",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待执行",
              "执行中",
              "成功",
              "失败",
              "已补偿"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable",
      "resource-import",
      "resource-export"
    ],
    "statusActions": [],
    "relationTabs": [
      "integration-field-map"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "sourceSystem",
        "label": "来源系统",
        "type": "text",
        "required": true
      },
      {
        "name": "externalCode",
        "label": "外部编码",
        "type": "text",
        "required": true
      },
      {
        "name": "standardCode",
        "label": "标准编码",
        "type": "text",
        "required": true
      },
      {
        "name": "mappingRule",
        "label": "映射规则",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待执行",
          "执行中",
          "成功",
          "失败",
          "已补偿"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [
      "integration-execute"
    ],
    "pageActions": [
      "integration-execute"
    ],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "integration-code-map",
    "domainId": "supply",
    "groupId": "supply-integration",
    "pageType": "master",
    "title": "编码转换关系",
    "description": "维护编码转换关系，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "sourceSystem",
        "label": "来源系统",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待执行",
          "执行中",
          "成功",
          "失败",
          "已补偿"
        ]
      }
    ],
    "columns": [
      "name",
      "sourceSystem",
      "externalCode",
      "standardCode",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "sourceSystem",
          "externalCode",
          "standardCode",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "sourceSystem",
            "label": "来源系统",
            "type": "text",
            "required": true
          },
          {
            "name": "externalCode",
            "label": "外部编码",
            "type": "text",
            "required": true
          },
          {
            "name": "standardCode",
            "label": "标准编码",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待执行",
              "执行中",
              "成功",
              "失败",
              "已补偿"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable",
      "resource-import",
      "resource-export"
    ],
    "statusActions": [],
    "relationTabs": [
      "integration-code-map"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "sourceSystem",
        "label": "来源系统",
        "type": "text",
        "required": true
      },
      {
        "name": "externalCode",
        "label": "外部编码",
        "type": "text",
        "required": true
      },
      {
        "name": "standardCode",
        "label": "标准编码",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待执行",
          "执行中",
          "成功",
          "失败",
          "已补偿"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "integration-call",
    "domainId": "supply",
    "groupId": "supply-integration",
    "pageType": "interface",
    "title": "接口调用记录",
    "description": "查看接口调用记录执行状态、失败原因、重试和人工补偿结果。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "businessId",
        "label": "业务单号",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待执行",
          "执行中",
          "成功",
          "失败",
          "已补偿"
        ]
      }
    ],
    "columns": [
      "name",
      "businessId",
      "direction",
      "endpoint",
      "attempts",
      "result",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "businessId",
          "direction",
          "endpoint",
          "attempts",
          "result",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "businessId",
            "label": "业务单号",
            "type": "text",
            "required": true
          },
          {
            "name": "direction",
            "label": "接口方向",
            "type": "text",
            "required": true
          },
          {
            "name": "endpoint",
            "label": "接口地址",
            "type": "text",
            "required": true
          },
          {
            "name": "attempts",
            "label": "调用次数",
            "type": "number",
            "required": true
          },
          {
            "name": "result",
            "label": "处理结果",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待执行",
              "执行中",
              "成功",
              "失败",
              "已补偿"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "integration-execute",
      "integration-retry",
      "integration-compensate"
    ],
    "batchActions": [
      "resource-export"
    ],
    "statusActions": [
      "integration-execute",
      "integration-retry",
      "integration-compensate"
    ],
    "relationTabs": [
      "integration-call"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "businessId",
        "label": "业务单号",
        "type": "text",
        "required": true
      },
      {
        "name": "direction",
        "label": "接口方向",
        "type": "text",
        "required": true
      },
      {
        "name": "endpoint",
        "label": "接口地址",
        "type": "text",
        "required": true
      },
      {
        "name": "attempts",
        "label": "调用次数",
        "type": "number",
        "required": true
      },
      {
        "name": "result",
        "label": "处理结果",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待执行",
          "执行中",
          "成功",
          "失败",
          "已补偿"
        ]
      }
    ],
    "integrationActions": [
      "integration-execute",
      "integration-retry",
      "integration-compensate"
    ],
    "coverageIntegrationActions": [
      "integration-execute",
      "integration-retry",
      "integration-compensate"
    ],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "integration-failure",
    "domainId": "supply",
    "groupId": "supply-integration",
    "pageType": "interface",
    "title": "失败数据处理",
    "description": "查看失败数据处理执行状态、失败原因、重试和人工补偿结果。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "businessId",
        "label": "业务单号",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待执行",
          "执行中",
          "成功",
          "失败",
          "已补偿"
        ]
      }
    ],
    "columns": [
      "name",
      "businessId",
      "attempts",
      "result",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "businessId",
          "errorMessage",
          "attempts",
          "result",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "businessId",
            "label": "业务单号",
            "type": "text",
            "required": true
          },
          {
            "name": "errorMessage",
            "label": "失败原因",
            "type": "text",
            "required": true
          },
          {
            "name": "attempts",
            "label": "重试次数",
            "type": "number",
            "required": true
          },
          {
            "name": "result",
            "label": "处理结果",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待执行",
              "执行中",
              "成功",
              "失败",
              "已补偿"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "integration-execute",
      "integration-retry",
      "integration-compensate"
    ],
    "batchActions": [],
    "statusActions": [
      "integration-execute",
      "integration-retry",
      "integration-compensate"
    ],
    "relationTabs": [
      "integration-failure"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "businessId",
        "label": "业务单号",
        "type": "text",
        "required": true
      },
      {
        "name": "errorMessage",
        "label": "失败原因",
        "type": "text",
        "required": true
      },
      {
        "name": "attempts",
        "label": "重试次数",
        "type": "number",
        "required": true
      },
      {
        "name": "result",
        "label": "处理结果",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待执行",
          "执行中",
          "成功",
          "失败",
          "已补偿"
        ]
      }
    ],
    "integrationActions": [
      "integration-execute",
      "integration-retry",
      "integration-compensate"
    ],
    "coverageIntegrationActions": [
      "integration-execute",
      "integration-retry",
      "integration-compensate"
    ],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "integration-init",
    "domainId": "supply",
    "groupId": "supply-integration",
    "pageType": "interface",
    "title": "数据初始化任务",
    "description": "查看数据初始化任务执行状态、失败原因、重试和人工补偿结果。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "scope",
        "label": "数据范围",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待执行",
          "执行中",
          "成功",
          "失败",
          "已补偿"
        ]
      }
    ],
    "columns": [
      "name",
      "scope",
      "batch",
      "fileName",
      "effectiveTime",
      "sourceSystem",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "scope",
          "batch",
          "fileName",
          "effectiveTime",
          "sourceSystem",
          "result",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "scope",
            "label": "数据范围",
            "type": "text",
            "required": true
          },
          {
            "name": "batch",
            "label": "批次",
            "type": "text",
            "required": true
          },
          {
            "name": "fileName",
            "label": "文件名",
            "type": "text",
            "required": true
          },
          {
            "name": "effectiveTime",
            "label": "执行时间",
            "type": "datetime-local",
            "required": true
          },
          {
            "name": "sourceSystem",
            "label": "来源系统",
            "type": "text",
            "required": true
          },
          {
            "name": "result",
            "label": "处理结果",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待执行",
              "执行中",
              "成功",
              "失败",
              "已补偿"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "integration-execute",
      "integration-retry",
      "integration-compensate",
      "resource-submit",
      "resource-confirm",
      "resource-cancel"
    ],
    "batchActions": [],
    "statusActions": [
      "integration-execute",
      "integration-retry",
      "integration-compensate",
      "resource-submit",
      "resource-confirm",
      "resource-cancel"
    ],
    "relationTabs": [
      "integration-init"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "scope",
        "label": "数据范围",
        "type": "text",
        "required": true
      },
      {
        "name": "batch",
        "label": "批次",
        "type": "text",
        "required": true
      },
      {
        "name": "fileName",
        "label": "文件名",
        "type": "text",
        "required": true
      },
      {
        "name": "effectiveTime",
        "label": "执行时间",
        "type": "datetime-local",
        "required": true
      },
      {
        "name": "sourceSystem",
        "label": "来源系统",
        "type": "text",
        "required": true
      },
      {
        "name": "result",
        "label": "处理结果",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待执行",
          "执行中",
          "成功",
          "失败",
          "已补偿"
        ]
      }
    ],
    "integrationActions": [
      "integration-execute",
      "integration-retry",
      "integration-compensate"
    ],
    "coverageIntegrationActions": [
      "integration-execute",
      "integration-retry",
      "integration-compensate"
    ],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "checkup-sync",
    "domainId": "supply",
    "groupId": "supply-integration",
    "pageType": "interface",
    "title": "体检系统同步",
    "description": "查看体检系统同步执行状态、失败原因、重试和人工补偿结果。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "sourceSystem",
        "label": "来源系统",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "待同步",
          "待确认",
          "部分完成",
          "已完成",
          "待处理"
        ]
      }
    ],
    "columns": [
      "name",
      "sourceSystem",
      "externalCode",
      "standardCode",
      "mappingRule",
      "unitType",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "sourceSystem",
          "externalCode",
          "standardCode",
          "mappingRule",
          "unitType",
          "category",
          "physiologicalSystem",
          "batch",
          "fileName",
          "scope",
          "effectiveTime",
          "mappingVersion",
          "filteredCount",
          "pendingCount",
          "failureCount",
          "result",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "sourceSystem",
            "label": "来源系统",
            "type": "text",
            "required": true
          },
          {
            "name": "externalCode",
            "label": "外部编码",
            "type": "text",
            "required": true
          },
          {
            "name": "standardCode",
            "label": "标准编码",
            "type": "text",
            "required": true
          },
          {
            "name": "mappingRule",
            "label": "映射规则",
            "type": "text",
            "required": true
          },
          {
            "name": "unitType",
            "label": "结果单位",
            "type": "text",
            "required": true
          },
          {
            "name": "category",
            "label": "分类",
            "type": "text",
            "required": true
          },
          {
            "name": "physiologicalSystem",
            "label": "生理系统",
            "type": "text",
            "required": true
          },
          {
            "name": "batch",
            "label": "批次",
            "type": "text",
            "required": true
          },
          {
            "name": "fileName",
            "label": "文件名",
            "type": "text",
            "required": true
          },
          {
            "name": "scope",
            "label": "数据范围",
            "type": "text",
            "required": true
          },
          {
            "name": "effectiveTime",
            "label": "执行时间",
            "type": "datetime-local",
            "required": true
          },
          {
            "name": "mappingVersion",
            "label": "映射版本",
            "type": "text",
            "required": true
          },
          {
            "name": "filteredCount",
            "label": "过滤数量",
            "type": "number",
            "required": true
          },
          {
            "name": "pendingCount",
            "label": "待处理数量",
            "type": "number",
            "required": true
          },
          {
            "name": "failureCount",
            "label": "失败数量",
            "type": "number",
            "required": true
          },
          {
            "name": "result",
            "label": "处理结果",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "待同步",
              "待确认",
              "部分完成",
              "已完成",
              "待处理"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "integration-execute",
      "integration-retry",
      "integration-compensate",
      "resource-delete",
      "resource-enable",
      "resource-disable",
      "resource-submit",
      "resource-confirm",
      "resource-cancel"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable",
      "resource-import",
      "resource-export"
    ],
    "statusActions": [
      "integration-execute",
      "integration-retry",
      "integration-compensate",
      "resource-submit",
      "resource-confirm",
      "resource-cancel"
    ],
    "relationTabs": [
      "checkup-sync"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "sourceSystem",
        "label": "来源系统",
        "type": "text",
        "required": true
      },
      {
        "name": "externalCode",
        "label": "外部编码",
        "type": "text",
        "required": true
      },
      {
        "name": "standardCode",
        "label": "标准编码",
        "type": "text",
        "required": true
      },
      {
        "name": "mappingRule",
        "label": "映射规则",
        "type": "text",
        "required": true
      },
      {
        "name": "unitType",
        "label": "结果单位",
        "type": "text",
        "required": true
      },
      {
        "name": "category",
        "label": "分类",
        "type": "text",
        "required": true
      },
      {
        "name": "physiologicalSystem",
        "label": "生理系统",
        "type": "text",
        "required": true
      },
      {
        "name": "batch",
        "label": "批次",
        "type": "text",
        "required": true
      },
      {
        "name": "fileName",
        "label": "文件名",
        "type": "text",
        "required": true
      },
      {
        "name": "scope",
        "label": "数据范围",
        "type": "text",
        "required": true
      },
      {
        "name": "effectiveTime",
        "label": "执行时间",
        "type": "datetime-local",
        "required": true
      },
      {
        "name": "mappingVersion",
        "label": "映射版本",
        "type": "text",
        "required": true
      },
      {
        "name": "filteredCount",
        "label": "过滤数量",
        "type": "number",
        "required": true
      },
      {
        "name": "pendingCount",
        "label": "待处理数量",
        "type": "number",
        "required": true
      },
      {
        "name": "failureCount",
        "label": "失败数量",
        "type": "number",
        "required": true
      },
      {
        "name": "result",
        "label": "处理结果",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "待同步",
          "待确认",
          "部分完成",
          "已完成",
          "待处理"
        ]
      }
    ],
    "integrationActions": [
      "integration-execute",
      "integration-retry",
      "integration-compensate"
    ],
    "coverageIntegrationActions": [
      "integration-execute",
      "integration-retry",
      "integration-compensate"
    ],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "finance-order",
    "domainId": "finance",
    "groupId": "finance-order-group",
    "pageType": "document",
    "title": "业务订单",
    "description": "查询并处理业务订单，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审核",
          "待收款",
          "已通过",
          "执行中",
          "已完成",
          "已取消",
          "已冲销"
        ]
      }
    ],
    "columns": [
      "name",
      "customer",
      "service",
      "amount",
      "paid",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "customer",
          "service",
          "amount",
          "paid",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "customer",
            "label": "客户",
            "type": "text",
            "required": true
          },
          {
            "name": "service",
            "label": "服务项目",
            "type": "text",
            "required": true
          },
          {
            "name": "amount",
            "label": "订单金额",
            "type": "number",
            "required": true
          },
          {
            "name": "paid",
            "label": "已收金额",
            "type": "number",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待审核",
              "待收款",
              "已通过",
              "执行中",
              "已完成",
              "已取消",
              "已冲销"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close",
      "approval-approve",
      "approval-reject",
      "resource-delete"
    ],
    "batchActions": [
      "resource-print",
      "resource-export"
    ],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close",
      "approval-approve",
      "approval-reject"
    ],
    "relationTabs": [
      "finance-order"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": true
      },
      {
        "name": "service",
        "label": "服务项目",
        "type": "text",
        "required": true
      },
      {
        "name": "amount",
        "label": "订单金额",
        "type": "number",
        "required": true
      },
      {
        "name": "paid",
        "label": "已收金额",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审核",
          "待收款",
          "已通过",
          "执行中",
          "已完成",
          "已取消",
          "已冲销"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "finance-payment",
    "domainId": "finance",
    "groupId": "finance-order-group",
    "pageType": "document",
    "title": "收款记录",
    "description": "查询并处理收款记录，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "待收款",
          "已收款",
          "已确认",
          "已冲销"
        ]
      }
    ],
    "columns": [
      "name",
      "customer",
      "orderNo",
      "amount",
      "channel",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "customer",
          "orderNo",
          "amount",
          "channel",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "customer",
            "label": "客户",
            "type": "text",
            "required": true
          },
          {
            "name": "orderNo",
            "label": "关联订单",
            "type": "text",
            "required": true
          },
          {
            "name": "amount",
            "label": "收款金额",
            "type": "number",
            "required": true
          },
          {
            "name": "channel",
            "label": "渠道",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "待收款",
              "已收款",
              "已确认",
              "已冲销"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-void"
    ],
    "batchActions": [
      "resource-print",
      "resource-export"
    ],
    "statusActions": [
      "resource-void"
    ],
    "relationTabs": [
      "finance-payment"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": true
      },
      {
        "name": "orderNo",
        "label": "关联订单",
        "type": "text",
        "required": true
      },
      {
        "name": "amount",
        "label": "收款金额",
        "type": "number",
        "required": true
      },
      {
        "name": "channel",
        "label": "渠道",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "待收款",
          "已收款",
          "已确认",
          "已冲销"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [
      "finance-payment-confirm",
      "finance-payment-unconfirm"
    ],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "finance-refund",
    "domainId": "finance",
    "groupId": "finance-order-group",
    "pageType": "document",
    "title": "退款申请",
    "description": "查询并处理退款申请，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "已驳回",
          "待退款",
          "已退款",
          "已确认",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "customer",
      "orderNo",
      "amount",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "customer",
          "orderNo",
          "amount",
          "reason",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "customer",
            "label": "客户",
            "type": "text",
            "required": true
          },
          {
            "name": "orderNo",
            "label": "关联订单",
            "type": "text",
            "required": true
          },
          {
            "name": "amount",
            "label": "退款金额",
            "type": "number",
            "required": true
          },
          {
            "name": "reason",
            "label": "原因/说明",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待审批",
              "已通过",
              "已驳回",
              "待退款",
              "已退款",
              "已确认",
              "已取消"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "approval-approve",
      "approval-reject"
    ],
    "batchActions": [
      "resource-print",
      "resource-export"
    ],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "approval-approve",
      "approval-reject"
    ],
    "relationTabs": [
      "finance-refund"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": true
      },
      {
        "name": "orderNo",
        "label": "关联订单",
        "type": "text",
        "required": true
      },
      {
        "name": "amount",
        "label": "退款金额",
        "type": "number",
        "required": true
      },
      {
        "name": "reason",
        "label": "原因/说明",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "已驳回",
          "待退款",
          "已退款",
          "已确认",
          "已取消"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [
      "finance-refund-confirm"
    ],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "finance-invoice",
    "domainId": "finance",
    "groupId": "finance-order-group",
    "pageType": "document",
    "title": "发票状态",
    "description": "查询并处理发票状态，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "待开票",
          "已开票",
          "已作废"
        ]
      }
    ],
    "columns": [
      "name",
      "customer",
      "orderNo",
      "invoiceNo",
      "amount",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "customer",
          "orderNo",
          "invoiceNo",
          "amount",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "customer",
            "label": "客户",
            "type": "text",
            "required": true
          },
          {
            "name": "orderNo",
            "label": "关联订单",
            "type": "text",
            "required": true
          },
          {
            "name": "invoiceNo",
            "label": "发票号码",
            "type": "text",
            "required": true
          },
          {
            "name": "amount",
            "label": "开票金额",
            "type": "number",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "待开票",
              "已开票",
              "已作废"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-void"
    ],
    "batchActions": [
      "resource-print",
      "resource-export"
    ],
    "statusActions": [
      "resource-void"
    ],
    "relationTabs": [
      "finance-invoice"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": true
      },
      {
        "name": "orderNo",
        "label": "关联订单",
        "type": "text",
        "required": true
      },
      {
        "name": "invoiceNo",
        "label": "发票号码",
        "type": "text",
        "required": true
      },
      {
        "name": "amount",
        "label": "开票金额",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "待开票",
          "已开票",
          "已作废"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "finance-reconciliation",
    "domainId": "finance",
    "groupId": "finance-order-group",
    "pageType": "document",
    "title": "渠道对账单",
    "description": "查询并处理渠道对账单，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "channel",
        "label": "渠道",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待对账",
          "存在差异",
          "已确认",
          "已对账",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "channel",
      "period",
      "amount",
      "differenceQty",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "channel",
          "period",
          "amount",
          "differenceQty",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "channel",
            "label": "渠道",
            "type": "text",
            "required": true
          },
          {
            "name": "period",
            "label": "期间",
            "type": "text",
            "required": true
          },
          {
            "name": "amount",
            "label": "对账金额",
            "type": "number",
            "required": true
          },
          {
            "name": "differenceQty",
            "label": "差异笔数",
            "type": "number",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待对账",
              "存在差异",
              "已确认",
              "已对账",
              "已取消"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-cancel"
    ],
    "batchActions": [
      "resource-export"
    ],
    "statusActions": [
      "resource-cancel"
    ],
    "relationTabs": [
      "finance-reconciliation"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "channel",
        "label": "渠道",
        "type": "text",
        "required": true
      },
      {
        "name": "period",
        "label": "期间",
        "type": "text",
        "required": true
      },
      {
        "name": "amount",
        "label": "对账金额",
        "type": "number",
        "required": true
      },
      {
        "name": "differenceQty",
        "label": "差异笔数",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待对账",
          "存在差异",
          "已确认",
          "已对账",
          "已取消"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [
      "finance-reconciliation-submit",
      "finance-reconciliation-confirm",
      "finance-reconciliation-unconfirm"
    ],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "finance-cost",
    "domainId": "finance",
    "groupId": "finance-analysis-group",
    "pageType": "ledger",
    "title": "成本归集",
    "description": "查询成本归集的数量、状态和关联业务明细。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      },
      {
        "key": "active",
        "label": "当前有效",
        "tone": "success"
      },
      {
        "key": "pending",
        "label": "待处理",
        "tone": "warning"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "costCenter",
        "label": "成本中心",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "已匹配",
          "有差异"
        ]
      }
    ],
    "columns": [
      "name",
      "costCenter",
      "period",
      "amount",
      "service",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "costCenter",
          "period",
          "amount",
          "service",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "costCenter",
            "label": "成本中心",
            "type": "text",
            "required": true
          },
          {
            "name": "period",
            "label": "期间",
            "type": "text",
            "required": true
          },
          {
            "name": "amount",
            "label": "归集金额",
            "type": "number",
            "required": true
          },
          {
            "name": "service",
            "label": "服务项目",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待审批",
              "已通过",
              "已匹配",
              "有差异"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete"
    ],
    "batchActions": [
      "resource-export",
      "resource-import"
    ],
    "statusActions": [],
    "relationTabs": [
      "finance-cost"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "costCenter",
        "label": "成本中心",
        "type": "text",
        "required": true
      },
      {
        "name": "period",
        "label": "期间",
        "type": "text",
        "required": true
      },
      {
        "name": "amount",
        "label": "归集金额",
        "type": "number",
        "required": true
      },
      {
        "name": "service",
        "label": "服务项目",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "已匹配",
          "有差异"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "finance-allocation-rule",
    "domainId": "finance",
    "groupId": "finance-analysis-group",
    "pageType": "master",
    "title": "费用分摊规则",
    "description": "维护费用分摊规则，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "costCenter",
        "label": "成本中心",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "已匹配",
          "有差异"
        ]
      }
    ],
    "columns": [
      "name",
      "costCenter",
      "allocationMethod",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "costCenter",
          "allocationMethod",
          "expression",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "costCenter",
            "label": "成本中心",
            "type": "text",
            "required": true
          },
          {
            "name": "allocationMethod",
            "label": "分摊方式",
            "type": "text",
            "required": true
          },
          {
            "name": "expression",
            "label": "条件表达式",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待审批",
              "已通过",
              "已匹配",
              "有差异"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "relationTabs": [
      "finance-allocation-rule"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "costCenter",
        "label": "成本中心",
        "type": "text",
        "required": true
      },
      {
        "name": "allocationMethod",
        "label": "分摊方式",
        "type": "text",
        "required": true
      },
      {
        "name": "expression",
        "label": "条件表达式",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "已匹配",
          "有差异"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "finance-budget",
    "domainId": "finance",
    "groupId": "finance-analysis-group",
    "pageType": "document",
    "title": "预算方案",
    "description": "查询并处理预算方案，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "costCenter",
        "label": "成本中心",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "已匹配",
          "有差异"
        ]
      }
    ],
    "columns": [
      "name",
      "costCenter",
      "period",
      "budgetAmount",
      "executionRate",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "costCenter",
          "period",
          "budgetAmount",
          "executionRate",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "costCenter",
            "label": "成本中心",
            "type": "text",
            "required": true
          },
          {
            "name": "period",
            "label": "期间",
            "type": "text",
            "required": true
          },
          {
            "name": "budgetAmount",
            "label": "预算金额",
            "type": "number",
            "required": true
          },
          {
            "name": "executionRate",
            "label": "执行率",
            "type": "number",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待审批",
              "已通过",
              "已匹配",
              "有差异"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "approval-approve",
      "approval-reject",
      "resource-confirm"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "approval-approve",
      "approval-reject",
      "resource-confirm"
    ],
    "relationTabs": [
      "finance-budget"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "costCenter",
        "label": "成本中心",
        "type": "text",
        "required": true
      },
      {
        "name": "period",
        "label": "期间",
        "type": "text",
        "required": true
      },
      {
        "name": "budgetAmount",
        "label": "预算金额",
        "type": "number",
        "required": true
      },
      {
        "name": "executionRate",
        "label": "执行率",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "已匹配",
          "有差异"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "finance-payable-match",
    "domainId": "finance",
    "groupId": "finance-analysis-group",
    "pageType": "analysis",
    "title": "应付与三单匹配",
    "description": "按业务条件分析应付与三单匹配，并支持结果刷新与明细下钻。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      },
      {
        "key": "active",
        "label": "当前有效",
        "tone": "success"
      },
      {
        "key": "pending",
        "label": "待处理",
        "tone": "warning"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "supplier",
        "label": "供应商",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待审批",
          "已通过",
          "已匹配",
          "有差异"
        ]
      }
    ],
    "columns": [
      "name",
      "supplier",
      "orderNo",
      "payableAmount",
      "matchResult",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "supplier",
          "orderNo",
          "payableAmount",
          "matchResult",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "supplier",
            "label": "供应商",
            "type": "text",
            "required": true
          },
          {
            "name": "orderNo",
            "label": "关联订单",
            "type": "text",
            "required": true
          },
          {
            "name": "payableAmount",
            "label": "应付金额",
            "type": "number",
            "required": true
          },
          {
            "name": "matchResult",
            "label": "匹配结果",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待审批",
              "已通过",
              "已匹配",
              "有差异"
            ]
          }
        ]
      }
    ],
    "rowActions": [],
    "batchActions": [
      "resource-export"
    ],
    "statusActions": [],
    "relationTabs": [
      "finance-payable-match"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "supplier",
        "label": "供应商",
        "type": "text",
        "required": true
      },
      {
        "name": "orderNo",
        "label": "关联订单",
        "type": "text",
        "required": true
      },
      {
        "name": "payableAmount",
        "label": "应付金额",
        "type": "number",
        "required": true
      },
      {
        "name": "matchResult",
        "label": "匹配结果",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待审批",
          "已通过",
          "已匹配",
          "有差异"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [
      "finance-run-match"
    ],
    "pageActions": [
      "finance-match-difference"
    ],
    "drilldowns": [
      "records",
      "detail"
    ],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "finance-operating-report",
    "domainId": "finance",
    "groupId": "finance-operating",
    "pageType": "analysis",
    "title": "经营报表",
    "description": "按业务条件分析经营报表，并支持结果刷新与明细下钻。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      },
      {
        "key": "active",
        "label": "当前有效",
        "tone": "success"
      },
      {
        "key": "pending",
        "label": "待处理",
        "tone": "warning"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "period",
        "label": "期间",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已发布",
          "已归档"
        ]
      }
    ],
    "columns": [
      "name",
      "period",
      "metric",
      "amount",
      "executionRate",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "period",
          "metric",
          "amount",
          "executionRate",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "period",
            "label": "期间",
            "type": "text",
            "required": true
          },
          {
            "name": "metric",
            "label": "指标",
            "type": "text",
            "required": true
          },
          {
            "name": "amount",
            "label": "指标值",
            "type": "number",
            "required": true
          },
          {
            "name": "executionRate",
            "label": "同比/完成率",
            "type": "number",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "已启用",
              "已发布",
              "已归档"
            ]
          }
        ]
      }
    ],
    "rowActions": [],
    "batchActions": [
      "resource-export"
    ],
    "statusActions": [],
    "relationTabs": [
      "finance-operating-report"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "period",
        "label": "期间",
        "type": "text",
        "required": true
      },
      {
        "name": "metric",
        "label": "指标",
        "type": "text",
        "required": true
      },
      {
        "name": "amount",
        "label": "指标值",
        "type": "number",
        "required": true
      },
      {
        "name": "executionRate",
        "label": "同比/完成率",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已发布",
          "已归档"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [
      "records",
      "detail"
    ],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "finance-metric-library",
    "domainId": "finance",
    "groupId": "finance-operating",
    "pageType": "master",
    "title": "指标库",
    "description": "维护指标库，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "metric",
        "label": "指标",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已发布",
          "已归档"
        ]
      }
    ],
    "columns": [
      "name",
      "metric",
      "unit",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "metric",
          "unit",
          "expression",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "metric",
            "label": "指标",
            "type": "text",
            "required": true
          },
          {
            "name": "unit",
            "label": "计量单位",
            "type": "text",
            "required": true
          },
          {
            "name": "expression",
            "label": "条件表达式",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "已启用",
              "已发布",
              "已归档"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "relationTabs": [
      "finance-metric-library"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "metric",
        "label": "指标",
        "type": "text",
        "required": true
      },
      {
        "name": "unit",
        "label": "计量单位",
        "type": "text",
        "required": true
      },
      {
        "name": "expression",
        "label": "条件表达式",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已发布",
          "已归档"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "finance-assessment-plan",
    "domainId": "finance",
    "groupId": "finance-operating",
    "pageType": "document",
    "title": "考核方案",
    "description": "查询并处理考核方案，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "period",
        "label": "期间",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已发布",
          "已归档"
        ]
      }
    ],
    "columns": [
      "name",
      "period",
      "metric",
      "targetValue",
      "owner",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "period",
          "metric",
          "targetValue",
          "owner",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "period",
            "label": "期间",
            "type": "text",
            "required": true
          },
          {
            "name": "metric",
            "label": "指标",
            "type": "text",
            "required": true
          },
          {
            "name": "targetValue",
            "label": "目标值",
            "type": "number",
            "required": true
          },
          {
            "name": "owner",
            "label": "负责人/经办人",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "已启用",
              "已发布",
              "已归档"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel"
    ],
    "relationTabs": [
      "finance-assessment-plan"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "period",
        "label": "期间",
        "type": "text",
        "required": true
      },
      {
        "name": "metric",
        "label": "指标",
        "type": "text",
        "required": true
      },
      {
        "name": "targetValue",
        "label": "目标值",
        "type": "number",
        "required": true
      },
      {
        "name": "owner",
        "label": "负责人/经办人",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已发布",
          "已归档"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "medical-report-category",
    "domainId": "medical",
    "groupId": "medical-master-group",
    "pageType": "master",
    "title": "体检报告大类",
    "description": "维护体检报告大类，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "scope",
        "label": "数据范围",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "scope",
      "unitType",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "scope",
          "unitType",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "scope",
            "label": "数据范围",
            "type": "text",
            "required": true
          },
          {
            "name": "unitType",
            "label": "结果单位",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "已启用",
              "已停用"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "relationTabs": [
      "medical-report-category"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "scope",
        "label": "数据范围",
        "type": "text",
        "required": true
      },
      {
        "name": "unitType",
        "label": "结果单位",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "medical-report-type",
    "domainId": "medical",
    "groupId": "medical-master-group",
    "pageType": "master",
    "title": "报告类型",
    "description": "维护报告类型，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "reportType",
        "label": "报告类型",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "reportType",
      "scope",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "reportType",
          "scope",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "reportType",
            "label": "报告类型",
            "type": "text",
            "required": true
          },
          {
            "name": "scope",
            "label": "数据范围",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "已启用",
              "已停用"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "relationTabs": [
      "medical-report-type"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "reportType",
        "label": "报告类型",
        "type": "text",
        "required": true
      },
      {
        "name": "scope",
        "label": "数据范围",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "medical-standard-item",
    "domainId": "medical",
    "groupId": "medical-master-group",
    "pageType": "master",
    "title": "标准体检项目",
    "description": "维护标准体检项目，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "standardCode",
        "label": "标准编码",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "standardCode",
      "unitType",
      "reportType",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "standardCode",
          "unitType",
          "reportType",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "standardCode",
            "label": "标准编码",
            "type": "text",
            "required": true
          },
          {
            "name": "unitType",
            "label": "结果单位",
            "type": "text",
            "required": true
          },
          {
            "name": "reportType",
            "label": "报告类型",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "已启用",
              "已停用"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable",
      "resource-confirm"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable",
      "resource-import"
    ],
    "statusActions": [
      "resource-confirm"
    ],
    "relationTabs": [
      "medical-standard-item"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "standardCode",
        "label": "标准编码",
        "type": "text",
        "required": true
      },
      {
        "name": "unitType",
        "label": "结果单位",
        "type": "text",
        "required": true
      },
      {
        "name": "reportType",
        "label": "报告类型",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "medical-external-report-map",
    "domainId": "medical",
    "groupId": "medical-mapping-group",
    "pageType": "master",
    "title": "外部报告类型映射",
    "description": "维护外部报告类型映射，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "sourceSystem",
        "label": "来源系统",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待匹配",
          "已匹配",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "sourceSystem",
      "externalCode",
      "reportType",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "sourceSystem",
          "externalCode",
          "reportType",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "sourceSystem",
            "label": "来源系统",
            "type": "text",
            "required": true
          },
          {
            "name": "externalCode",
            "label": "外部编码",
            "type": "text",
            "required": true
          },
          {
            "name": "reportType",
            "label": "报告类型",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待匹配",
              "已匹配",
              "已停用"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "relationTabs": [
      "medical-external-report-map"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "sourceSystem",
        "label": "来源系统",
        "type": "text",
        "required": true
      },
      {
        "name": "externalCode",
        "label": "外部编码",
        "type": "text",
        "required": true
      },
      {
        "name": "reportType",
        "label": "报告类型",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待匹配",
          "已匹配",
          "已停用"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "medical-external-item-map",
    "domainId": "medical",
    "groupId": "medical-mapping-group",
    "pageType": "master",
    "title": "外部项目映射",
    "description": "维护外部项目映射，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "sourceSystem",
        "label": "来源系统",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待匹配",
          "已匹配",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "sourceSystem",
      "externalCode",
      "standardCode",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "sourceSystem",
          "externalCode",
          "standardCode",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "sourceSystem",
            "label": "来源系统",
            "type": "text",
            "required": true
          },
          {
            "name": "externalCode",
            "label": "外部编码",
            "type": "text",
            "required": true
          },
          {
            "name": "standardCode",
            "label": "标准编码",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待匹配",
              "已匹配",
              "已停用"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable",
      "resource-confirm"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [
      "resource-confirm"
    ],
    "relationTabs": [
      "medical-external-item-map"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "sourceSystem",
        "label": "来源系统",
        "type": "text",
        "required": true
      },
      {
        "name": "externalCode",
        "label": "外部编码",
        "type": "text",
        "required": true
      },
      {
        "name": "standardCode",
        "label": "标准编码",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待匹配",
          "已匹配",
          "已停用"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "medical-unmatched-item",
    "domainId": "medical",
    "groupId": "medical-mapping-group",
    "pageType": "master",
    "title": "未匹配项目",
    "description": "维护未匹配项目，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "sourceSystem",
        "label": "来源系统",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待匹配",
          "已匹配",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "sourceSystem",
      "externalCode",
      "result",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "sourceSystem",
          "externalCode",
          "result",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "sourceSystem",
            "label": "来源系统",
            "type": "text",
            "required": true
          },
          {
            "name": "externalCode",
            "label": "外部编码",
            "type": "text",
            "required": true
          },
          {
            "name": "result",
            "label": "处理结果",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待匹配",
              "已匹配",
              "已停用"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "relationTabs": [
      "medical-unmatched-item"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "sourceSystem",
        "label": "来源系统",
        "type": "text",
        "required": true
      },
      {
        "name": "externalCode",
        "label": "外部编码",
        "type": "text",
        "required": true
      },
      {
        "name": "result",
        "label": "处理结果",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待匹配",
          "已匹配",
          "已停用"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "medical-reference-rule",
    "domainId": "medical",
    "groupId": "medical-rule-group",
    "pageType": "master",
    "title": "参考值规则",
    "description": "维护参考值规则，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "standardCode",
        "label": "标准编码",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "standardCode",
      "gender",
      "ageRange",
      "lowerLimit",
      "upperLimit",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "standardCode",
          "gender",
          "ageRange",
          "lowerLimit",
          "upperLimit",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "standardCode",
            "label": "标准编码",
            "type": "text",
            "required": true
          },
          {
            "name": "gender",
            "label": "性别",
            "type": "text",
            "required": true
          },
          {
            "name": "ageRange",
            "label": "年龄段",
            "type": "text",
            "required": true
          },
          {
            "name": "lowerLimit",
            "label": "参考下限",
            "type": "number",
            "required": true
          },
          {
            "name": "upperLimit",
            "label": "参考上限",
            "type": "number",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "已启用",
              "已停用"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable",
      "resource-import"
    ],
    "statusActions": [],
    "relationTabs": [
      "medical-reference-rule"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "standardCode",
        "label": "标准编码",
        "type": "text",
        "required": true
      },
      {
        "name": "gender",
        "label": "性别",
        "type": "text",
        "required": true
      },
      {
        "name": "ageRange",
        "label": "年龄段",
        "type": "text",
        "required": true
      },
      {
        "name": "lowerLimit",
        "label": "参考下限",
        "type": "number",
        "required": true
      },
      {
        "name": "upperLimit",
        "label": "参考上限",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "medical-critical-rule",
    "domainId": "medical",
    "groupId": "medical-rule-group",
    "pageType": "master",
    "title": "危急值规则",
    "description": "维护危急值规则，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "standardCode",
        "label": "标准编码",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "standardCode",
      "criticalValue",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "standardCode",
          "criticalValue",
          "expression",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "standardCode",
            "label": "标准编码",
            "type": "text",
            "required": true
          },
          {
            "name": "criticalValue",
            "label": "危急阈值",
            "type": "number",
            "required": true
          },
          {
            "name": "expression",
            "label": "条件表达式",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "已启用",
              "已停用"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable",
      "resource-import"
    ],
    "statusActions": [],
    "relationTabs": [
      "medical-critical-rule"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "standardCode",
        "label": "标准编码",
        "type": "text",
        "required": true
      },
      {
        "name": "criticalValue",
        "label": "危急阈值",
        "type": "number",
        "required": true
      },
      {
        "name": "expression",
        "label": "条件表达式",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [
      "integration-execute"
    ],
    "pageActions": [
      "integration-execute"
    ],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "medical-item-relation",
    "domainId": "medical",
    "groupId": "medical-rule-group",
    "pageType": "master",
    "title": "体检项医学关系",
    "description": "维护体检项医学关系，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "standardCode",
        "label": "标准编码",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "standardCode",
      "relationType",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "standardCode",
          "relationType",
          "content",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "standardCode",
            "label": "标准编码",
            "type": "text",
            "required": true
          },
          {
            "name": "relationType",
            "label": "关系类型",
            "type": "text",
            "required": true
          },
          {
            "name": "content",
            "label": "正文内容",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "已启用",
              "已停用"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable",
      "resource-bind",
      "resource-unbind"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable",
      "resource-import"
    ],
    "statusActions": [
      "resource-bind",
      "resource-unbind"
    ],
    "relationTabs": [
      "medical-item-relation"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "standardCode",
        "label": "标准编码",
        "type": "text",
        "required": true
      },
      {
        "name": "relationType",
        "label": "关系类型",
        "type": "text",
        "required": true
      },
      {
        "name": "content",
        "label": "正文内容",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [
      "integration-execute"
    ],
    "pageActions": [
      "integration-execute"
    ],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "medical-symptom-disease",
    "domainId": "medical",
    "groupId": "medical-rule-group",
    "pageType": "master",
    "title": "症状疾病关系",
    "description": "维护症状疾病关系，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "relationType",
        "label": "关系类型",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "relationType",
      "condition",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "relationType",
          "condition",
          "content",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "relationType",
            "label": "关系类型",
            "type": "text",
            "required": true
          },
          {
            "name": "condition",
            "label": "匹配条件",
            "type": "text",
            "required": true
          },
          {
            "name": "content",
            "label": "正文内容",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "已启用",
              "已停用"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable",
      "resource-bind",
      "resource-unbind"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [
      "resource-bind",
      "resource-unbind"
    ],
    "relationTabs": [
      "medical-symptom-disease"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "relationType",
        "label": "关系类型",
        "type": "text",
        "required": true
      },
      {
        "name": "condition",
        "label": "匹配条件",
        "type": "text",
        "required": true
      },
      {
        "name": "content",
        "label": "正文内容",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [
      "integration-execute"
    ],
    "pageActions": [
      "integration-execute"
    ],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "medical-special-precheck",
    "domainId": "medical",
    "groupId": "medical-rule-group",
    "pageType": "master",
    "title": "特殊项目前置规则",
    "description": "维护特殊项目前置规则，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "specialItem",
        "label": "特殊项目",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "name",
      "specialItem",
      "condition",
      "releaseReason",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "specialItem",
          "condition",
          "releaseReason",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "specialItem",
            "label": "特殊项目",
            "type": "text",
            "required": true
          },
          {
            "name": "condition",
            "label": "匹配条件",
            "type": "text",
            "required": true
          },
          {
            "name": "releaseReason",
            "label": "放行原因",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "已启用",
              "已停用"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "relationTabs": [
      "medical-special-precheck"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "specialItem",
        "label": "特殊项目",
        "type": "text",
        "required": true
      },
      {
        "name": "condition",
        "label": "匹配条件",
        "type": "text",
        "required": true
      },
      {
        "name": "releaseReason",
        "label": "放行原因",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "medical-health-analysis",
    "domainId": "medical",
    "groupId": "medical-report-group",
    "pageType": "interface",
    "title": "健康资料分析",
    "description": "查看健康资料分析执行状态、失败原因、重试和人工补偿结果。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      },
      {
        "key": "active",
        "label": "当前有效",
        "tone": "success"
      },
      {
        "key": "pending",
        "label": "待处理",
        "tone": "warning"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待确认",
          "待发布",
          "已发布",
          "已撤回",
          "已归档"
        ]
      }
    ],
    "columns": [
      "name",
      "customer",
      "reportType",
      "result",
      "ruleVersion",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "customer",
          "reportType",
          "result",
          "ruleVersion",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "customer",
            "label": "客户",
            "type": "text",
            "required": true
          },
          {
            "name": "reportType",
            "label": "报告类型",
            "type": "text",
            "required": true
          },
          {
            "name": "result",
            "label": "处理结果",
            "type": "text",
            "required": true
          },
          {
            "name": "ruleVersion",
            "label": "规则版本",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待确认",
              "待发布",
              "已发布",
              "已撤回",
              "已归档"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "integration-execute",
      "integration-retry"
    ],
    "batchActions": [
      "resource-export"
    ],
    "statusActions": [
      "integration-execute",
      "integration-retry"
    ],
    "relationTabs": [
      "medical-health-analysis"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": true
      },
      {
        "name": "reportType",
        "label": "报告类型",
        "type": "text",
        "required": true
      },
      {
        "name": "result",
        "label": "处理结果",
        "type": "text",
        "required": true
      },
      {
        "name": "ruleVersion",
        "label": "规则版本",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待确认",
          "待发布",
          "已发布",
          "已撤回",
          "已归档"
        ]
      }
    ],
    "integrationActions": [
      "integration-execute",
      "integration-retry"
    ],
    "coverageIntegrationActions": [
      "integration-execute",
      "integration-retry"
    ],
    "pageActions": [],
    "drilldowns": [
      "records",
      "detail"
    ],
    "editLockedStatuses": [
      "已归档"
    ],
    "customerVisible": true
  },
  {
    "resourceId": "medical-report",
    "domainId": "medical",
    "groupId": "medical-report-group",
    "pageType": "document",
    "title": "医学报告",
    "description": "查询并处理医学报告，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待确认",
          "待发布",
          "已发布",
          "已撤回",
          "已归档"
        ]
      }
    ],
    "columns": [
      "name",
      "customer",
      "reportType",
      "doctor",
      "ruleVersion",
      "result",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "customer",
          "reportType",
          "doctor",
          "ruleVersion",
          "result",
          "reportNo",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "customer",
            "label": "客户",
            "type": "text",
            "required": true
          },
          {
            "name": "reportType",
            "label": "报告类型",
            "type": "text",
            "required": true
          },
          {
            "name": "doctor",
            "label": "医生",
            "type": "text",
            "required": true
          },
          {
            "name": "ruleVersion",
            "label": "规则版本",
            "type": "text",
            "required": true
          },
          {
            "name": "result",
            "label": "处理结果",
            "type": "text",
            "required": true
          },
          {
            "name": "reportNo",
            "label": "报告编号",
            "type": "text",
            "required": false,
            "system": true,
            "readonly": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待确认",
              "待发布",
              "已发布",
              "已撤回",
              "已归档"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-confirm",
      "resource-publish",
      "resource-withdraw",
      "resource-archive",
      "resource-generate"
    ],
    "batchActions": [
      "resource-archive",
      "resource-export"
    ],
    "statusActions": [
      "resource-confirm",
      "resource-publish",
      "resource-withdraw",
      "resource-archive",
      "resource-generate"
    ],
    "relationTabs": [
      "medical-report"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": true
      },
      {
        "name": "reportType",
        "label": "报告类型",
        "type": "text",
        "required": true
      },
      {
        "name": "doctor",
        "label": "医生",
        "type": "text",
        "required": true
      },
      {
        "name": "ruleVersion",
        "label": "规则版本",
        "type": "text",
        "required": true
      },
      {
        "name": "result",
        "label": "处理结果",
        "type": "text",
        "required": true
      },
      {
        "name": "reportNo",
        "label": "报告编号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待确认",
          "待发布",
          "已发布",
          "已撤回",
          "已归档"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [
      "已归档"
    ],
    "customerVisible": true
  },
  {
    "resourceId": "medical-followup",
    "domainId": "medical",
    "groupId": "medical-report-group",
    "pageType": "document",
    "title": "复查建议",
    "description": "查询并处理复查建议，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待确认",
          "待发布",
          "已发布",
          "已撤回",
          "已归档"
        ]
      }
    ],
    "columns": [
      "name",
      "customer",
      "followupPeriod",
      "specialItem",
      "doctor",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "customer",
          "followupPeriod",
          "specialItem",
          "doctor",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "customer",
            "label": "客户",
            "type": "text",
            "required": true
          },
          {
            "name": "followupPeriod",
            "label": "复查周期",
            "type": "text",
            "required": true
          },
          {
            "name": "specialItem",
            "label": "特殊项目",
            "type": "text",
            "required": true
          },
          {
            "name": "doctor",
            "label": "医生",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待确认",
              "待发布",
              "已发布",
              "已撤回",
              "已归档"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm"
    ],
    "relationTabs": [
      "medical-followup"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": true
      },
      {
        "name": "followupPeriod",
        "label": "复查周期",
        "type": "text",
        "required": true
      },
      {
        "name": "specialItem",
        "label": "特殊项目",
        "type": "text",
        "required": true
      },
      {
        "name": "doctor",
        "label": "医生",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待确认",
          "待发布",
          "已发布",
          "已撤回",
          "已归档"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [
      "已归档"
    ],
    "customerVisible": true
  },
  {
    "resourceId": "doctor-order",
    "domainId": "medical",
    "groupId": "medical-doctor-group",
    "pageType": "document",
    "title": "医生开单",
    "description": "查询并处理医生开单，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待校验",
          "已通过",
          "已驳回"
        ]
      }
    ],
    "columns": [
      "name",
      "customer",
      "doctor",
      "plan",
      "specialItem",
      "safetyCheck",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "customer",
          "doctor",
          "plan",
          "specialItem",
          "safetyCheck",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "customer",
            "label": "客户",
            "type": "text",
            "required": true
          },
          {
            "name": "doctor",
            "label": "医生",
            "type": "text",
            "required": true
          },
          {
            "name": "plan",
            "label": "常用方案",
            "type": "text",
            "required": true
          },
          {
            "name": "specialItem",
            "label": "特殊项目",
            "type": "text",
            "required": true
          },
          {
            "name": "safetyCheck",
            "label": "安全校验",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待校验",
              "已通过",
              "已驳回"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "approval-approve"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "approval-approve"
    ],
    "relationTabs": [
      "doctor-order"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": true
      },
      {
        "name": "doctor",
        "label": "医生",
        "type": "text",
        "required": true
      },
      {
        "name": "plan",
        "label": "常用方案",
        "type": "text",
        "required": true
      },
      {
        "name": "specialItem",
        "label": "特殊项目",
        "type": "text",
        "required": true
      },
      {
        "name": "safetyCheck",
        "label": "安全校验",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待校验",
          "已通过",
          "已驳回"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "doctor-plan",
    "domainId": "medical",
    "groupId": "medical-doctor-group",
    "pageType": "master",
    "title": "个人常用方案",
    "description": "维护个人常用方案，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "doctor",
        "label": "医生",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待校验",
          "已通过",
          "已驳回"
        ]
      }
    ],
    "columns": [
      "name",
      "doctor",
      "plan",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "doctor",
          "plan",
          "content",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "doctor",
            "label": "医生",
            "type": "text",
            "required": true
          },
          {
            "name": "plan",
            "label": "常用方案",
            "type": "text",
            "required": true
          },
          {
            "name": "content",
            "label": "正文内容",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待校验",
              "已通过",
              "已驳回"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable",
      "doctor-plan-favorite-health",
      "doctor-plan-favorite-medical",
      "doctor-plan-apply",
      "doctor-plan-rename"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "relationTabs": [
      "doctor-plan"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "doctor",
        "label": "医生",
        "type": "text",
        "required": true
      },
      {
        "name": "plan",
        "label": "常用方案",
        "type": "text",
        "required": true
      },
      {
        "name": "content",
        "label": "正文内容",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待校验",
          "已通过",
          "已驳回"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "consultation-appointment",
    "domainId": "care",
    "groupId": "care-consultation",
    "pageType": "document",
    "title": "会诊预约",
    "description": "查询并处理会诊预约，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待确认",
          "已发送",
          "已接受",
          "已拒绝",
          "已确认",
          "进行中",
          "已签字",
          "已归档",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "customer",
      "time",
      "expert",
      "result",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "customer",
          "time",
          "expert",
          "result",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "customer",
            "label": "客户",
            "type": "text",
            "required": true
          },
          {
            "name": "time",
            "label": "预约时间",
            "type": "datetime-local",
            "required": true
          },
          {
            "name": "expert",
            "label": "专家",
            "type": "text",
            "required": true
          },
          {
            "name": "result",
            "label": "时间冲突检查结果",
            "type": "select",
            "required": false,
            "options": [
              "未检查",
              "无冲突",
              "存在冲突"
            ]
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待确认",
              "已发送",
              "已接受",
              "已拒绝",
              "已确认",
              "进行中",
              "已签字",
              "已归档",
              "已取消"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close",
      "resource-delete"
    ],
    "batchActions": [
      "resource-print",
      "resource-export"
    ],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close"
    ],
    "relationTabs": [
      "consultation-appointment"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": true
      },
      {
        "name": "time",
        "label": "预约时间",
        "type": "datetime-local",
        "required": true
      },
      {
        "name": "expert",
        "label": "专家",
        "type": "text",
        "required": true
      },
      {
        "name": "result",
        "label": "时间冲突检查结果",
        "type": "select",
        "required": false,
        "options": [
          "未检查",
          "无冲突",
          "存在冲突"
        ]
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待确认",
          "已发送",
          "已接受",
          "已拒绝",
          "已确认",
          "进行中",
          "已签字",
          "已归档",
          "已取消"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [
      "已归档"
    ],
    "customerVisible": true
  },
  {
    "resourceId": "consultation-invitation",
    "domainId": "care",
    "groupId": "care-consultation",
    "pageType": "document",
    "title": "专家邀请",
    "description": "查询并处理专家邀请，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "expert",
        "label": "专家",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待确认",
          "已发送",
          "已接受",
          "已拒绝",
          "已确认",
          "进行中",
          "已签字",
          "已归档",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "expert",
      "time",
      "result",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "expert",
          "time",
          "result",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "expert",
            "label": "专家",
            "type": "text",
            "required": true
          },
          {
            "name": "time",
            "label": "邀请时间",
            "type": "datetime-local",
            "required": true
          },
          {
            "name": "result",
            "label": "处理结果",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待确认",
              "已发送",
              "已接受",
              "已拒绝",
              "已确认",
              "进行中",
              "已签字",
              "已归档",
              "已取消"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "consultation-accept",
      "consultation-decline"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "consultation-accept",
      "consultation-decline"
    ],
    "relationTabs": [
      "consultation-invitation"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "expert",
        "label": "专家",
        "type": "text",
        "required": true
      },
      {
        "name": "time",
        "label": "邀请时间",
        "type": "datetime-local",
        "required": true
      },
      {
        "name": "result",
        "label": "处理结果",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待确认",
          "已发送",
          "已接受",
          "已拒绝",
          "已确认",
          "进行中",
          "已签字",
          "已归档",
          "已取消"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [
      "已归档"
    ],
    "customerVisible": true
  },
  {
    "resourceId": "consultation-device",
    "domainId": "care",
    "groupId": "care-consultation",
    "pageType": "document",
    "title": "设备检查",
    "description": "查询并处理设备检查，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "expert",
        "label": "专家",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待确认",
          "已发送",
          "已接受",
          "已拒绝",
          "已确认",
          "进行中",
          "已签字",
          "已归档",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "expert",
      "deviceCheck",
      "result",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "expert",
          "deviceCheck",
          "result",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "expert",
            "label": "专家",
            "type": "text",
            "required": true
          },
          {
            "name": "deviceCheck",
            "label": "设备检查",
            "type": "text",
            "required": true
          },
          {
            "name": "result",
            "label": "处理结果",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待确认",
              "已发送",
              "已接受",
              "已拒绝",
              "已确认",
              "进行中",
              "已签字",
              "已归档",
              "已取消"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-confirm",
      "integration-execute"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-confirm",
      "integration-execute"
    ],
    "relationTabs": [
      "consultation-device"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "expert",
        "label": "专家",
        "type": "text",
        "required": true
      },
      {
        "name": "deviceCheck",
        "label": "设备检查",
        "type": "text",
        "required": true
      },
      {
        "name": "result",
        "label": "处理结果",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待确认",
          "已发送",
          "已接受",
          "已拒绝",
          "已确认",
          "进行中",
          "已签字",
          "已归档",
          "已取消"
        ]
      }
    ],
    "integrationActions": [
      "integration-execute"
    ],
    "coverageIntegrationActions": [
      "consultation-device-camera",
      "consultation-device-microphone"
    ],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [
      "已归档"
    ],
    "customerVisible": true
  },
  {
    "resourceId": "consultation-room",
    "domainId": "care",
    "groupId": "care-consultation",
    "pageType": "document",
    "title": "会诊房间",
    "description": "查询并处理会诊房间，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "roomNo",
        "label": "房间号",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待确认",
          "已发送",
          "已接受",
          "已拒绝",
          "已确认",
          "进行中",
          "已签字",
          "已归档",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "roomNo",
      "customer",
      "time",
      "recording",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "roomNo",
          "customer",
          "time",
          "recording",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "roomNo",
            "label": "房间号",
            "type": "text",
            "required": true
          },
          {
            "name": "customer",
            "label": "客户",
            "type": "text",
            "required": true
          },
          {
            "name": "time",
            "label": "会诊时间",
            "type": "datetime-local",
            "required": true
          },
          {
            "name": "recording",
            "label": "录制状态",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待确认",
              "已发送",
              "已接受",
              "已拒绝",
              "已确认",
              "进行中",
              "已签字",
              "已归档",
              "已取消"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close",
      "integration-execute"
    ],
    "batchActions": [
      "resource-print",
      "resource-export"
    ],
    "statusActions": [
      "resource-submit",
      "resource-withdraw",
      "resource-cancel",
      "resource-confirm",
      "resource-close",
      "integration-execute"
    ],
    "relationTabs": [
      "consultation-room"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "roomNo",
        "label": "房间号",
        "type": "text",
        "required": true
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": true
      },
      {
        "name": "time",
        "label": "会诊时间",
        "type": "datetime-local",
        "required": true
      },
      {
        "name": "recording",
        "label": "录制状态",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待确认",
          "已发送",
          "已接受",
          "已拒绝",
          "已确认",
          "进行中",
          "已签字",
          "已归档",
          "已取消"
        ]
      }
    ],
    "integrationActions": [
      "integration-execute"
    ],
    "coverageIntegrationActions": [
      "consultation-room-auth",
      "consultation-room-enter",
      "consultation-room-record",
      "consultation-room-control",
      "consultation-room-media"
    ],
    "pageActions": [
      "consultation-room-confirm",
      "consultation-room-cancel"
    ],
    "drilldowns": [],
    "editLockedStatuses": [
      "已归档"
    ],
    "customerVisible": true
  },
  {
    "resourceId": "consultation-member",
    "domainId": "care",
    "groupId": "care-consultation",
    "pageType": "master",
    "title": "成员",
    "description": "维护成员，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "roomNo",
        "label": "房间号",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待确认",
          "已发送",
          "已接受",
          "已拒绝",
          "已确认",
          "进行中",
          "已签字",
          "已归档",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "roomNo",
      "expert",
      "operation",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "roomNo",
          "expert",
          "operation",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "roomNo",
            "label": "房间号",
            "type": "text",
            "required": true
          },
          {
            "name": "expert",
            "label": "专家",
            "type": "text",
            "required": true
          },
          {
            "name": "operation",
            "label": "业务操作",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待确认",
              "已发送",
              "已接受",
              "已拒绝",
              "已确认",
              "进行中",
              "已签字",
              "已归档",
              "已取消"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "consultation-member-mute",
      "consultation-member-remove"
    ],
    "batchActions": [],
    "statusActions": [],
    "relationTabs": [
      "consultation-member"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "roomNo",
        "label": "房间号",
        "type": "text",
        "required": true
      },
      {
        "name": "expert",
        "label": "专家",
        "type": "text",
        "required": true
      },
      {
        "name": "operation",
        "label": "业务操作",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待确认",
          "已发送",
          "已接受",
          "已拒绝",
          "已确认",
          "进行中",
          "已签字",
          "已归档",
          "已取消"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [
      "consultation-member-mute",
      "consultation-member-remove"
    ],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [
      "已归档"
    ],
    "customerVisible": true
  },
  {
    "resourceId": "consultation-opinion",
    "domainId": "care",
    "groupId": "care-consultation",
    "pageType": "document",
    "title": "专家意见",
    "description": "查询并处理专家意见，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "roomNo",
        "label": "房间号",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待确认",
          "已发送",
          "已接受",
          "已拒绝",
          "已确认",
          "进行中",
          "已签字",
          "已归档",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "roomNo",
      "expert",
      "opinion",
      "signature",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "roomNo",
          "expert",
          "opinion",
          "signature",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "roomNo",
            "label": "房间号",
            "type": "text",
            "required": true
          },
          {
            "name": "expert",
            "label": "专家",
            "type": "text",
            "required": true
          },
          {
            "name": "opinion",
            "label": "专家意见",
            "type": "text",
            "required": true
          },
          {
            "name": "signature",
            "label": "签字人",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待确认",
              "已发送",
              "已接受",
              "已拒绝",
              "已确认",
              "进行中",
              "已签字",
              "已归档",
              "已取消"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-confirm"
    ],
    "batchActions": [],
    "statusActions": [
      "resource-confirm"
    ],
    "relationTabs": [
      "consultation-opinion"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "roomNo",
        "label": "房间号",
        "type": "text",
        "required": true
      },
      {
        "name": "expert",
        "label": "专家",
        "type": "text",
        "required": true
      },
      {
        "name": "opinion",
        "label": "专家意见",
        "type": "text",
        "required": true
      },
      {
        "name": "signature",
        "label": "签字人",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待确认",
          "已发送",
          "已接受",
          "已拒绝",
          "已确认",
          "进行中",
          "已签字",
          "已归档",
          "已取消"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [
      "已归档"
    ],
    "customerVisible": true
  },
  {
    "resourceId": "consultation-conclusion",
    "domainId": "care",
    "groupId": "care-consultation",
    "pageType": "document",
    "title": "会诊结论",
    "description": "查询并处理会诊结论，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "roomNo",
        "label": "房间号",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待确认",
          "已发送",
          "已接受",
          "已拒绝",
          "已确认",
          "进行中",
          "已签字",
          "已归档",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "roomNo",
      "customer",
      "opinion",
      "signature",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "roomNo",
          "customer",
          "opinion",
          "signature",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "roomNo",
            "label": "房间号",
            "type": "text",
            "required": true
          },
          {
            "name": "customer",
            "label": "客户",
            "type": "text",
            "required": true
          },
          {
            "name": "opinion",
            "label": "专家意见",
            "type": "text",
            "required": true
          },
          {
            "name": "signature",
            "label": "签字人",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待确认",
              "已发送",
              "已接受",
              "已拒绝",
              "已确认",
              "进行中",
              "已签字",
              "已归档",
              "已取消"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-confirm",
      "resource-archive"
    ],
    "batchActions": [
      "resource-archive"
    ],
    "statusActions": [
      "resource-confirm",
      "resource-archive"
    ],
    "relationTabs": [
      "consultation-conclusion"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "roomNo",
        "label": "房间号",
        "type": "text",
        "required": true
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": true
      },
      {
        "name": "opinion",
        "label": "专家意见",
        "type": "text",
        "required": true
      },
      {
        "name": "signature",
        "label": "签字人",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待确认",
          "已发送",
          "已接受",
          "已拒绝",
          "已确认",
          "进行中",
          "已签字",
          "已归档",
          "已取消"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [
      "已归档"
    ],
    "customerVisible": true
  },
  {
    "resourceId": "consultation-report",
    "domainId": "care",
    "groupId": "care-consultation",
    "pageType": "document",
    "title": "会诊报告",
    "description": "查询并处理会诊报告，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "roomNo",
        "label": "房间号",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待确认",
          "已发送",
          "已接受",
          "已拒绝",
          "已确认",
          "进行中",
          "已签字",
          "已归档",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "roomNo",
      "customer",
      "expert",
      "signature",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "roomNo",
          "customer",
          "expert",
          "signature",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "roomNo",
            "label": "房间号",
            "type": "text",
            "required": true
          },
          {
            "name": "customer",
            "label": "客户",
            "type": "text",
            "required": true
          },
          {
            "name": "expert",
            "label": "专家",
            "type": "text",
            "required": true
          },
          {
            "name": "signature",
            "label": "签字人",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待确认",
              "已发送",
              "已接受",
              "已拒绝",
              "已确认",
              "进行中",
              "已签字",
              "已归档",
              "已取消"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-confirm",
      "resource-archive"
    ],
    "batchActions": [
      "resource-archive",
      "resource-print",
      "resource-export"
    ],
    "statusActions": [
      "resource-confirm",
      "resource-archive"
    ],
    "relationTabs": [
      "consultation-report"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "roomNo",
        "label": "房间号",
        "type": "text",
        "required": true
      },
      {
        "name": "customer",
        "label": "客户",
        "type": "text",
        "required": true
      },
      {
        "name": "expert",
        "label": "专家",
        "type": "text",
        "required": true
      },
      {
        "name": "signature",
        "label": "签字人",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待确认",
          "已发送",
          "已接受",
          "已拒绝",
          "已确认",
          "进行中",
          "已签字",
          "已归档",
          "已取消"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [
      "已归档"
    ],
    "customerVisible": true
  },
  {
    "resourceId": "consultation-expert",
    "domainId": "care",
    "groupId": "care-consultation",
    "pageType": "master",
    "title": "会诊专家",
    "description": "维护会诊专家，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "expert",
        "label": "专家",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待确认",
          "已发送",
          "已接受",
          "已拒绝",
          "已确认",
          "进行中",
          "已签字",
          "已归档",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "expert",
      "scope",
      "time",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "expert",
          "scope",
          "time",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "expert",
            "label": "专家",
            "type": "text",
            "required": true
          },
          {
            "name": "scope",
            "label": "数据范围",
            "type": "text",
            "required": true
          },
          {
            "name": "time",
            "label": "可用时段",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待确认",
              "已发送",
              "已接受",
              "已拒绝",
              "已确认",
              "进行中",
              "已签字",
              "已归档",
              "已取消"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable",
      "resource-confirm"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [
      "resource-confirm"
    ],
    "relationTabs": [
      "consultation-expert"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "expert",
        "label": "专家",
        "type": "text",
        "required": true
      },
      {
        "name": "scope",
        "label": "数据范围",
        "type": "text",
        "required": true
      },
      {
        "name": "time",
        "label": "可用时段",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待确认",
          "已发送",
          "已接受",
          "已拒绝",
          "已确认",
          "进行中",
          "已签字",
          "已归档",
          "已取消"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [
      "已归档"
    ],
    "customerVisible": true
  },
  {
    "resourceId": "consultation-material",
    "domainId": "care",
    "groupId": "care-consultation",
    "pageType": "document",
    "title": "会诊资料",
    "description": "查询并处理会诊资料，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "roomNo",
        "label": "房间号",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "待确认",
          "已发送",
          "已接受",
          "已拒绝",
          "已确认",
          "进行中",
          "已签字",
          "已归档",
          "已取消"
        ]
      }
    ],
    "columns": [
      "name",
      "roomNo",
      "fileName",
      "owner",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "name",
          "roomNo",
          "fileName",
          "owner",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "name",
            "label": "名称/主题",
            "type": "text",
            "required": true
          },
          {
            "name": "roomNo",
            "label": "房间号",
            "type": "text",
            "required": true
          },
          {
            "name": "fileName",
            "label": "文件名",
            "type": "text",
            "required": true
          },
          {
            "name": "owner",
            "label": "负责人/经办人",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "待确认",
              "已发送",
              "已接受",
              "已拒绝",
              "已确认",
              "进行中",
              "已签字",
              "已归档",
              "已取消"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete"
    ],
    "batchActions": [
      "resource-export",
      "resource-import"
    ],
    "statusActions": [],
    "relationTabs": [
      "consultation-material"
    ],
    "fields": [
      {
        "name": "name",
        "label": "名称/主题",
        "type": "text",
        "required": true
      },
      {
        "name": "roomNo",
        "label": "房间号",
        "type": "text",
        "required": true
      },
      {
        "name": "fileName",
        "label": "文件名",
        "type": "text",
        "required": true
      },
      {
        "name": "owner",
        "label": "负责人/经办人",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "待确认",
          "已发送",
          "已接受",
          "已拒绝",
          "已确认",
          "进行中",
          "已签字",
          "已归档",
          "已取消"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [
      "已归档"
    ],
    "customerVisible": true
  },
  {
    "resourceId": "talent-factor",
    "domainId": "care",
    "groupId": "care-talent-rule",
    "pageType": "master",
    "title": "天赋要素",
    "description": "维护天赋要素，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "factor",
        "label": "天赋要素",
        "type": "text",
        "required": false,
        "helpText": "在这里维护要素名称，保存后供天赋分级、固定注解和匹配条件选择。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "factor",
      "category",
      "description",
      "displayInfo",
      "displayOrder",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "factor",
          "category",
          "description",
          "displayInfo",
          "displayOrder",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "factor",
            "label": "天赋要素",
            "type": "text",
            "required": true,
            "helpText": "在这里维护要素名称，保存后供天赋分级、固定注解和匹配条件选择。"
          },
          {
            "name": "category",
            "label": "分类",
            "type": "select",
            "required": true,
            "options": [
              "认知能力",
              "沟通能力",
              "行为能力",
              "社会情绪"
            ]
          },
          {
            "name": "description",
            "label": "基础说明",
            "type": "textarea",
            "required": true
          },
          {
            "name": "displayInfo",
            "label": "展示信息",
            "type": "textarea",
            "required": true
          },
          {
            "name": "displayOrder",
            "label": "显示顺序",
            "type": "number",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "switch",
            "required": true,
            "options": [
              "草稿",
              "已启用",
              "已停用"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable",
      "resource-import",
      "resource-export"
    ],
    "statusActions": [],
    "relationTabs": [
      "talent-factor"
    ],
    "fields": [
      {
        "name": "factor",
        "label": "天赋要素",
        "type": "text",
        "required": true,
        "helpText": "在这里维护要素名称，保存后供天赋分级、固定注解和匹配条件选择。"
      },
      {
        "name": "category",
        "label": "分类",
        "type": "select",
        "required": true,
        "options": [
          "认知能力",
          "沟通能力",
          "行为能力",
          "社会情绪"
        ]
      },
      {
        "name": "description",
        "label": "基础说明",
        "type": "textarea",
        "required": true
      },
      {
        "name": "displayInfo",
        "label": "展示信息",
        "type": "textarea",
        "required": true
      },
      {
        "name": "displayOrder",
        "label": "显示顺序",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "switch",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "talent-level",
    "domainId": "care",
    "groupId": "care-talent-rule",
    "pageType": "master",
    "title": "天赋分级",
    "description": "维护天赋分级，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "factor",
        "label": "天赋要素",
        "type": "select",
        "required": false,
        "options": [
          "逻辑思维",
          "空间感知",
          "语言表达",
          "专注力",
          "情绪感知",
          "行动规划"
        ],
        "optionsSource": "talent-factor",
        "helpText": "来源：天赋要素页面已维护的数据。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "factor",
      "level",
      "displayOrder",
      "scope",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "factor",
          "level",
          "displayOrder",
          "scope",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "factor",
            "label": "天赋要素",
            "type": "select",
            "required": true,
            "options": [
              "逻辑思维",
              "空间感知",
              "语言表达",
              "专注力",
              "情绪感知",
              "行动规划"
            ],
            "optionsSource": "talent-factor",
            "helpText": "来源：天赋要素页面已维护的数据。"
          },
          {
            "name": "level",
            "label": "分级标准",
            "type": "select",
            "required": true,
            "options": [
              "L1",
              "L2",
              "L3",
              "L4",
              "L5",
              "L6"
            ],
            "optionsSource": "talent-level-standard",
            "optionLabels": {
              "L1": "L1 · 潜能起步",
              "L2": "L2 · 稳定优势",
              "L3": "L3 · 明显优势",
              "L4": "L4 · 高阶优势",
              "L5": "L5 · 专长表现",
              "L6": "L6 · 卓越表现"
            },
            "helpText": "来源：系统统一分级标准。保存后由本页维护该要素采用的分级、排序和适用范围。"
          },
          {
            "name": "displayOrder",
            "label": "排序",
            "type": "number",
            "required": true
          },
          {
            "name": "scope",
            "label": "适用范围",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "已启用",
              "已停用"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable"
    ],
    "batchActions": [
      "resource-enable"
    ],
    "statusActions": [],
    "relationTabs": [
      "talent-level"
    ],
    "fields": [
      {
        "name": "factor",
        "label": "天赋要素",
        "type": "select",
        "required": true,
        "options": [
          "逻辑思维",
          "空间感知",
          "语言表达",
          "专注力",
          "情绪感知",
          "行动规划"
        ],
        "optionsSource": "talent-factor",
        "helpText": "来源：天赋要素页面已维护的数据。"
      },
      {
        "name": "level",
        "label": "分级标准",
        "type": "select",
        "required": true,
        "options": [
          "L1",
          "L2",
          "L3",
          "L4",
          "L5",
          "L6"
        ],
        "optionsSource": "talent-level-standard",
        "optionLabels": {
          "L1": "L1 · 潜能起步",
          "L2": "L2 · 稳定优势",
          "L3": "L3 · 明显优势",
          "L4": "L4 · 高阶优势",
          "L5": "L5 · 专长表现",
          "L6": "L6 · 卓越表现"
        },
        "helpText": "来源：系统统一分级标准。保存后由本页维护该要素采用的分级、排序和适用范围。"
      },
      {
        "name": "displayOrder",
        "label": "排序",
        "type": "number",
        "required": true
      },
      {
        "name": "scope",
        "label": "适用范围",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "talent-note",
    "domainId": "care",
    "groupId": "care-talent-rule",
    "pageType": "master",
    "title": "固定注解",
    "description": "维护固定注解，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "factor",
        "label": "天赋要素",
        "type": "select",
        "required": false,
        "options": [
          "逻辑思维",
          "空间感知",
          "语言表达",
          "专注力",
          "情绪感知",
          "行动规划"
        ],
        "optionsSource": "talent-factor",
        "helpText": "来源：天赋要素页面已维护的数据。"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "factor",
      "level",
      "annotation",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "factor",
          "level",
          "annotation",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "factor",
            "label": "天赋要素",
            "type": "select",
            "required": true,
            "options": [
              "逻辑思维",
              "空间感知",
              "语言表达",
              "专注力",
              "情绪感知",
              "行动规划"
            ],
            "optionsSource": "talent-factor",
            "helpText": "来源：天赋要素页面已维护的数据。"
          },
          {
            "name": "level",
            "label": "分级",
            "type": "select",
            "required": true,
            "options": [
              "L1",
              "L2",
              "L3",
              "L4",
              "L5",
              "L6"
            ],
            "dependsOn": [
              "factor"
            ],
            "optionsSource": "talent-level",
            "optionLabels": {
              "L1": "L1 · 潜能起步",
              "L2": "L2 · 稳定优势",
              "L3": "L3 · 明显优势",
              "L4": "L4 · 高阶优势",
              "L5": "L5 · 专长表现",
              "L6": "L6 · 卓越表现"
            },
            "emptyText": "该要素暂无分级，请先维护天赋分级。",
            "helpText": "来源：天赋分级页面中当前要素已维护的分级。"
          },
          {
            "name": "annotation",
            "label": "固定注解",
            "type": "textarea",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "已启用",
              "已停用"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete"
    ],
    "batchActions": [
      "resource-import"
    ],
    "statusActions": [],
    "relationTabs": [
      "talent-note"
    ],
    "fields": [
      {
        "name": "factor",
        "label": "天赋要素",
        "type": "select",
        "required": true,
        "options": [
          "逻辑思维",
          "空间感知",
          "语言表达",
          "专注力",
          "情绪感知",
          "行动规划"
        ],
        "optionsSource": "talent-factor",
        "helpText": "来源：天赋要素页面已维护的数据。"
      },
      {
        "name": "level",
        "label": "分级",
        "type": "select",
        "required": true,
        "options": [
          "L1",
          "L2",
          "L3",
          "L4",
          "L5",
          "L6"
        ],
        "dependsOn": [
          "factor"
        ],
        "optionsSource": "talent-level",
        "optionLabels": {
          "L1": "L1 · 潜能起步",
          "L2": "L2 · 稳定优势",
          "L3": "L3 · 明显优势",
          "L4": "L4 · 高阶优势",
          "L5": "L5 · 专长表现",
          "L6": "L6 · 卓越表现"
        },
        "emptyText": "该要素暂无分级，请先维护天赋分级。",
        "helpText": "来源：天赋分级页面中当前要素已维护的分级。"
      },
      {
        "name": "annotation",
        "label": "固定注解",
        "type": "textarea",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "talent-nurture-content",
    "domainId": "care",
    "groupId": "care-talent-rule",
    "pageType": "master",
    "title": "培养内容",
    "description": "维护培养内容，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "contentSet",
        "label": "所属内容库",
        "type": "select",
        "required": false,
        "options": [
          "成人天赋内容方案 A",
          "成人天赋内容方案 B",
          "儿童成长内容方案",
          "家庭沟通内容方案",
          "职业发展内容方案",
          "综合发展内容方案"
        ],
        "optionsSource": "talent-content-library"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "contentSet",
      "factor",
      "level",
      "minAge",
      "maxAge",
      "gender",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "contentSet",
          "factor",
          "level",
          "minAge",
          "maxAge",
          "gender",
          "title",
          "content",
          "priority",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "contentSet",
            "label": "所属内容库",
            "type": "select",
            "required": true,
            "options": [
              "成人天赋内容方案 A",
              "成人天赋内容方案 B",
              "儿童成长内容方案",
              "家庭沟通内容方案",
              "职业发展内容方案",
              "综合发展内容方案"
            ],
            "optionsSource": "talent-content-library"
          },
          {
            "name": "factor",
            "label": "天赋要素",
            "type": "select",
            "required": true,
            "options": [
              "逻辑思维",
              "空间感知",
              "语言表达",
              "专注力",
              "情绪感知",
              "行动规划"
            ],
            "optionsSource": "talent-factor"
          },
          {
            "name": "level",
            "label": "分级",
            "type": "select",
            "required": true,
            "options": [
              "L1",
              "L2",
              "L3",
              "L4",
              "L5",
              "L6"
            ],
            "dependsOn": [
              "factor"
            ],
            "optionsSource": "talent-level",
            "optionLabels": {
              "L1": "L1 · 潜能起步",
              "L2": "L2 · 稳定优势",
              "L3": "L3 · 明显优势",
              "L4": "L4 · 高阶优势",
              "L5": "L5 · 专长表现",
              "L6": "L6 · 卓越表现"
            }
          },
          {
            "name": "minAge",
            "label": "适用年龄下限",
            "type": "number",
            "required": true
          },
          {
            "name": "maxAge",
            "label": "适用年龄上限",
            "type": "number",
            "required": true
          },
          {
            "name": "gender",
            "label": "适用性别",
            "type": "select",
            "required": true,
            "options": [
              "男",
              "女",
              "通用"
            ]
          },
          {
            "name": "title",
            "label": "内容标题",
            "type": "text",
            "required": true
          },
          {
            "name": "content",
            "label": "内容正文",
            "type": "textarea",
            "required": true
          },
          {
            "name": "priority",
            "label": "候选顺序",
            "type": "number",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "已启用",
              "已停用"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable",
      "resource-import"
    ],
    "statusActions": [],
    "relationTabs": [
      "talent-nurture-content"
    ],
    "fields": [
      {
        "name": "contentSet",
        "label": "所属内容库",
        "type": "select",
        "required": true,
        "options": [
          "成人天赋内容方案 A",
          "成人天赋内容方案 B",
          "儿童成长内容方案",
          "家庭沟通内容方案",
          "职业发展内容方案",
          "综合发展内容方案"
        ],
        "optionsSource": "talent-content-library"
      },
      {
        "name": "factor",
        "label": "天赋要素",
        "type": "select",
        "required": true,
        "options": [
          "逻辑思维",
          "空间感知",
          "语言表达",
          "专注力",
          "情绪感知",
          "行动规划"
        ],
        "optionsSource": "talent-factor"
      },
      {
        "name": "level",
        "label": "分级",
        "type": "select",
        "required": true,
        "options": [
          "L1",
          "L2",
          "L3",
          "L4",
          "L5",
          "L6"
        ],
        "dependsOn": [
          "factor"
        ],
        "optionsSource": "talent-level",
        "optionLabels": {
          "L1": "L1 · 潜能起步",
          "L2": "L2 · 稳定优势",
          "L3": "L3 · 明显优势",
          "L4": "L4 · 高阶优势",
          "L5": "L5 · 专长表现",
          "L6": "L6 · 卓越表现"
        }
      },
      {
        "name": "minAge",
        "label": "适用年龄下限",
        "type": "number",
        "required": true
      },
      {
        "name": "maxAge",
        "label": "适用年龄上限",
        "type": "number",
        "required": true
      },
      {
        "name": "gender",
        "label": "适用性别",
        "type": "select",
        "required": true,
        "options": [
          "男",
          "女",
          "通用"
        ]
      },
      {
        "name": "title",
        "label": "内容标题",
        "type": "text",
        "required": true
      },
      {
        "name": "content",
        "label": "内容正文",
        "type": "textarea",
        "required": true
      },
      {
        "name": "priority",
        "label": "候选顺序",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "talent-content-library",
    "domainId": "care",
    "groupId": "care-talent-rule",
    "pageType": "master",
    "title": "内容库",
    "description": "维护内容库，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "contentSet",
        "label": "内容库名称",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "contentSet",
      "description",
      "scope",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "contentSet",
          "description",
          "scope",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "contentSet",
            "label": "内容库名称",
            "type": "text",
            "required": true
          },
          {
            "name": "description",
            "label": "说明",
            "type": "textarea",
            "required": true
          },
          {
            "name": "scope",
            "label": "适用范围",
            "type": "text",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "已启用",
              "已停用"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "relationTabs": [
      "talent-content-library"
    ],
    "fields": [
      {
        "name": "contentSet",
        "label": "内容库名称",
        "type": "text",
        "required": true
      },
      {
        "name": "description",
        "label": "说明",
        "type": "textarea",
        "required": true
      },
      {
        "name": "scope",
        "label": "适用范围",
        "type": "text",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": true
  },
  {
    "resourceId": "talent-parent",
    "domainId": "care",
    "groupId": "care-talent-report",
    "pageType": "master",
    "title": "家长账户",
    "description": "维护家长账户，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "parentName",
        "label": "家长姓名",
        "type": "text",
        "required": false
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "启用",
          "停用"
        ]
      }
    ],
    "columns": [
      "parentName",
      "mobile",
      "idNo",
      "organization",
      "channel",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "parentName",
          "mobile",
          "idNo",
          "organization",
          "channel",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "parentName",
            "label": "家长姓名",
            "type": "text",
            "required": true
          },
          {
            "name": "mobile",
            "label": "家长手机号",
            "type": "text",
            "required": true
          },
          {
            "name": "idNo",
            "label": "身份证号",
            "type": "text",
            "required": true
          },
          {
            "name": "organization",
            "label": "机构",
            "type": "select",
            "required": true,
            "options": [
              "杭州天赋中心",
              "宁波天赋中心"
            ]
          },
          {
            "name": "channel",
            "label": "渠道",
            "type": "select",
            "required": true,
            "options": [
              "直营",
              "合作机构"
            ]
          },
          {
            "name": "status",
            "label": "状态",
            "type": "switch",
            "required": true,
            "options": [
              "启用",
              "停用"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable",
      "resource-import"
    ],
    "statusActions": [],
    "relationTabs": [
      "talent-parent"
    ],
    "fields": [
      {
        "name": "parentName",
        "label": "家长姓名",
        "type": "text",
        "required": true
      },
      {
        "name": "mobile",
        "label": "家长手机号",
        "type": "text",
        "required": true
      },
      {
        "name": "idNo",
        "label": "身份证号",
        "type": "text",
        "required": true
      },
      {
        "name": "organization",
        "label": "机构",
        "type": "select",
        "required": true,
        "options": [
          "杭州天赋中心",
          "宁波天赋中心"
        ]
      },
      {
        "name": "channel",
        "label": "渠道",
        "type": "select",
        "required": true,
        "options": [
          "直营",
          "合作机构"
        ]
      },
      {
        "name": "status",
        "label": "状态",
        "type": "switch",
        "required": true,
        "options": [
          "启用",
          "停用"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": false
  },
  {
    "resourceId": "talent-child",
    "domainId": "care",
    "groupId": "care-talent-report",
    "pageType": "master",
    "title": "孩子成员",
    "description": "维护孩子成员，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "parentId",
        "label": "所属会员",
        "type": "search-select",
        "required": false,
        "optionsSource": "talent-parent"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "启用",
          "停用"
        ]
      }
    ],
    "columns": [
      "parentId",
      "childName",
      "idNo",
      "relationType",
      "birthDate",
      "gender",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "parentId",
          "childName",
          "idNo",
          "relationType",
          "birthDate",
          "gender",
          "organization",
          "channel",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "parentId",
            "label": "所属会员",
            "type": "search-select",
            "required": true,
            "optionsSource": "talent-parent"
          },
          {
            "name": "childName",
            "label": "孩子姓名",
            "type": "text",
            "required": true
          },
          {
            "name": "idNo",
            "label": "孩子身份证号",
            "type": "text",
            "required": true
          },
          {
            "name": "relationType",
            "label": "关系类型",
            "type": "select",
            "required": true,
            "options": [
              "母亲",
              "父亲",
              "监护人"
            ]
          },
          {
            "name": "birthDate",
            "label": "出生日期",
            "type": "date",
            "required": false,
            "system": true,
            "readonly": true
          },
          {
            "name": "gender",
            "label": "性别",
            "type": "select",
            "required": false,
            "options": [
              "男",
              "女"
            ],
            "system": true,
            "readonly": true
          },
          {
            "name": "organization",
            "label": "机构",
            "type": "select",
            "required": false,
            "options": [
              "杭州天赋中心",
              "宁波天赋中心"
            ],
            "system": true,
            "readonly": true
          },
          {
            "name": "channel",
            "label": "渠道",
            "type": "select",
            "required": false,
            "options": [
              "直营",
              "合作机构"
            ],
            "system": true,
            "readonly": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "switch",
            "required": true,
            "options": [
              "启用",
              "停用"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable",
      "resource-import"
    ],
    "statusActions": [],
    "relationTabs": [
      "talent-child"
    ],
    "fields": [
      {
        "name": "parentId",
        "label": "所属会员",
        "type": "search-select",
        "required": true,
        "optionsSource": "talent-parent"
      },
      {
        "name": "childName",
        "label": "孩子姓名",
        "type": "text",
        "required": true
      },
      {
        "name": "idNo",
        "label": "孩子身份证号",
        "type": "text",
        "required": true
      },
      {
        "name": "relationType",
        "label": "关系类型",
        "type": "select",
        "required": true,
        "options": [
          "母亲",
          "父亲",
          "监护人"
        ]
      },
      {
        "name": "birthDate",
        "label": "出生日期",
        "type": "date",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "gender",
        "label": "性别",
        "type": "select",
        "required": false,
        "options": [
          "男",
          "女"
        ],
        "system": true,
        "readonly": true
      },
      {
        "name": "organization",
        "label": "机构",
        "type": "select",
        "required": false,
        "options": [
          "杭州天赋中心",
          "宁波天赋中心"
        ],
        "system": true,
        "readonly": true
      },
      {
        "name": "channel",
        "label": "渠道",
        "type": "select",
        "required": false,
        "options": [
          "直营",
          "合作机构"
        ],
        "system": true,
        "readonly": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "switch",
        "required": true,
        "options": [
          "启用",
          "停用"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": false
  },
  {
    "resourceId": "talent-member-relation",
    "domainId": "care",
    "groupId": "care-talent-report",
    "pageType": "master",
    "title": "家长孩子关系",
    "description": "维护家长孩子关系，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "parentId",
        "label": "家长",
        "type": "search-select",
        "required": false,
        "optionsSource": "talent-parent"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "启用",
          "停用"
        ]
      }
    ],
    "columns": [
      "parentId",
      "childId",
      "relationType",
      "organization",
      "channel",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "parentId",
          "childId",
          "relationType",
          "organization",
          "channel",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "parentId",
            "label": "家长",
            "type": "search-select",
            "required": true,
            "optionsSource": "talent-parent"
          },
          {
            "name": "childId",
            "label": "孩子",
            "type": "search-select",
            "required": true,
            "optionsSource": "talent-child"
          },
          {
            "name": "relationType",
            "label": "关系类型",
            "type": "select",
            "required": true,
            "options": [
              "母亲",
              "父亲",
              "监护人"
            ]
          },
          {
            "name": "organization",
            "label": "机构",
            "type": "select",
            "required": true,
            "options": [
              "杭州天赋中心",
              "宁波天赋中心"
            ]
          },
          {
            "name": "channel",
            "label": "渠道",
            "type": "select",
            "required": true,
            "options": [
              "直营",
              "合作机构"
            ]
          },
          {
            "name": "status",
            "label": "状态",
            "type": "switch",
            "required": true,
            "options": [
              "启用",
              "停用"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable",
      "resource-import"
    ],
    "statusActions": [],
    "relationTabs": [
      "talent-member-relation"
    ],
    "fields": [
      {
        "name": "parentId",
        "label": "家长",
        "type": "search-select",
        "required": true,
        "optionsSource": "talent-parent"
      },
      {
        "name": "childId",
        "label": "孩子",
        "type": "search-select",
        "required": true,
        "optionsSource": "talent-child"
      },
      {
        "name": "relationType",
        "label": "关系类型",
        "type": "select",
        "required": true,
        "options": [
          "母亲",
          "父亲",
          "监护人"
        ]
      },
      {
        "name": "organization",
        "label": "机构",
        "type": "select",
        "required": true,
        "options": [
          "杭州天赋中心",
          "宁波天赋中心"
        ]
      },
      {
        "name": "channel",
        "label": "渠道",
        "type": "select",
        "required": true,
        "options": [
          "直营",
          "合作机构"
        ]
      },
      {
        "name": "status",
        "label": "状态",
        "type": "switch",
        "required": true,
        "options": [
          "启用",
          "停用"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": false
  },
  {
    "resourceId": "talent-report-type",
    "domainId": "care",
    "groupId": "care-talent-report",
    "pageType": "master",
    "title": "报告类型",
    "description": "维护报告类型，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "reportType",
        "label": "报告类型",
        "type": "select",
        "required": false,
        "options": [
          "成人发展倾向",
          "儿童成长潜能",
          "职业兴趣倾向",
          "学习能力画像",
          "社会情绪能力",
          "综合发展能力"
        ]
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "reportType",
      "reportName",
      "ageRange",
      "gender",
      "contentSet",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "reportType",
          "reportName",
          "ageRange",
          "gender",
          "contentSet",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "reportType",
            "label": "报告类型",
            "type": "select",
            "required": true,
            "options": [
              "成人发展倾向",
              "儿童成长潜能",
              "职业兴趣倾向",
              "学习能力画像",
              "社会情绪能力",
              "综合发展能力"
            ]
          },
          {
            "name": "reportName",
            "label": "报告名称",
            "type": "text",
            "required": true
          },
          {
            "name": "ageRange",
            "label": "适用年龄段",
            "type": "select",
            "required": true,
            "options": [
              "儿童 6–11 岁",
              "青少年 12–17 岁",
              "成人 18–45 岁",
              "成熟期 46–65 岁",
              "全年龄"
            ]
          },
          {
            "name": "gender",
            "label": "适用性别",
            "type": "select",
            "required": true,
            "options": [
              "男",
              "女",
              "通用"
            ]
          },
          {
            "name": "contentSet",
            "label": "内容库",
            "type": "select",
            "required": true,
            "options": [
              "成人天赋内容方案 A",
              "成人天赋内容方案 B",
              "儿童成长内容方案",
              "家庭沟通内容方案",
              "职业发展内容方案",
              "综合发展内容方案"
            ],
            "optionsSource": "talent-content-library"
          },
          {
            "name": "status",
            "label": "状态",
            "type": "switch",
            "required": true,
            "options": [
              "草稿",
              "已启用",
              "已停用"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "relationTabs": [
      "talent-report-type"
    ],
    "fields": [
      {
        "name": "reportType",
        "label": "报告类型",
        "type": "select",
        "required": true,
        "options": [
          "成人发展倾向",
          "儿童成长潜能",
          "职业兴趣倾向",
          "学习能力画像",
          "社会情绪能力",
          "综合发展能力"
        ]
      },
      {
        "name": "reportName",
        "label": "报告名称",
        "type": "text",
        "required": true
      },
      {
        "name": "ageRange",
        "label": "适用年龄段",
        "type": "select",
        "required": true,
        "options": [
          "儿童 6–11 岁",
          "青少年 12–17 岁",
          "成人 18–45 岁",
          "成熟期 46–65 岁",
          "全年龄"
        ]
      },
      {
        "name": "gender",
        "label": "适用性别",
        "type": "select",
        "required": true,
        "options": [
          "男",
          "女",
          "通用"
        ]
      },
      {
        "name": "contentSet",
        "label": "内容库",
        "type": "select",
        "required": true,
        "options": [
          "成人天赋内容方案 A",
          "成人天赋内容方案 B",
          "儿童成长内容方案",
          "家庭沟通内容方案",
          "职业发展内容方案",
          "综合发展内容方案"
        ],
        "optionsSource": "talent-content-library"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "switch",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": false
  },
  {
    "resourceId": "talent-matching-rule",
    "domainId": "care",
    "groupId": "care-talent-report",
    "pageType": "master",
    "title": "天赋匹配规则",
    "description": "维护天赋匹配规则，支持查询、详情、新增、编辑、启停用与安全删除。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "reportType",
        "label": "报告类型",
        "type": "search-select",
        "required": false,
        "optionsSource": "talent-report-type"
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "columns": [
      "reportType",
      "factor",
      "resultMin",
      "resultMax",
      "level",
      "contentSet",
      "candidateContent",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "reportType",
          "factor",
          "resultMin",
          "resultMax",
          "level",
          "contentSet",
          "candidateContent",
          "priority",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "reportType",
            "label": "报告类型",
            "type": "search-select",
            "required": true,
            "optionsSource": "talent-report-type"
          },
          {
            "name": "factor",
            "label": "天赋要素",
            "type": "select",
            "required": true,
            "options": [
              "逻辑思维",
              "空间感知",
              "语言表达",
              "专注力",
              "情绪感知",
              "行动规划"
            ],
            "optionsSource": "talent-factor"
          },
          {
            "name": "resultMin",
            "label": "结果最小值",
            "type": "number",
            "required": true
          },
          {
            "name": "resultMax",
            "label": "结果最大值",
            "type": "number",
            "required": true
          },
          {
            "name": "level",
            "label": "目标分级",
            "type": "select",
            "required": true,
            "options": [
              "L1",
              "L2",
              "L3",
              "L4",
              "L5",
              "L6"
            ],
            "dependsOn": [
              "factor"
            ],
            "optionsSource": "talent-level",
            "optionLabels": {
              "L1": "L1 · 潜能起步",
              "L2": "L2 · 稳定优势",
              "L3": "L3 · 明显优势",
              "L4": "L4 · 高阶优势",
              "L5": "L5 · 专长表现",
              "L6": "L6 · 卓越表现"
            }
          },
          {
            "name": "contentSet",
            "label": "内容库",
            "type": "select",
            "required": true,
            "options": [
              "成人天赋内容方案 A",
              "成人天赋内容方案 B",
              "儿童成长内容方案",
              "家庭沟通内容方案",
              "职业发展内容方案",
              "综合发展内容方案"
            ],
            "optionsSource": "talent-content-library"
          },
          {
            "name": "candidateContent",
            "label": "候选培养内容",
            "type": "select",
            "required": true,
            "dependsOn": [
              "factor",
              "level",
              "contentSet"
            ],
            "optionsSource": "talent-nurture-content"
          },
          {
            "name": "priority",
            "label": "候选顺序",
            "type": "number",
            "required": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "草稿",
              "已启用",
              "已停用"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-delete",
      "resource-enable",
      "resource-disable"
    ],
    "batchActions": [
      "resource-enable",
      "resource-disable"
    ],
    "statusActions": [],
    "relationTabs": [
      "talent-matching-rule"
    ],
    "fields": [
      {
        "name": "reportType",
        "label": "报告类型",
        "type": "search-select",
        "required": true,
        "optionsSource": "talent-report-type"
      },
      {
        "name": "factor",
        "label": "天赋要素",
        "type": "select",
        "required": true,
        "options": [
          "逻辑思维",
          "空间感知",
          "语言表达",
          "专注力",
          "情绪感知",
          "行动规划"
        ],
        "optionsSource": "talent-factor"
      },
      {
        "name": "resultMin",
        "label": "结果最小值",
        "type": "number",
        "required": true
      },
      {
        "name": "resultMax",
        "label": "结果最大值",
        "type": "number",
        "required": true
      },
      {
        "name": "level",
        "label": "目标分级",
        "type": "select",
        "required": true,
        "options": [
          "L1",
          "L2",
          "L3",
          "L4",
          "L5",
          "L6"
        ],
        "dependsOn": [
          "factor"
        ],
        "optionsSource": "talent-level",
        "optionLabels": {
          "L1": "L1 · 潜能起步",
          "L2": "L2 · 稳定优势",
          "L3": "L3 · 明显优势",
          "L4": "L4 · 高阶优势",
          "L5": "L5 · 专长表现",
          "L6": "L6 · 卓越表现"
        }
      },
      {
        "name": "contentSet",
        "label": "内容库",
        "type": "select",
        "required": true,
        "options": [
          "成人天赋内容方案 A",
          "成人天赋内容方案 B",
          "儿童成长内容方案",
          "家庭沟通内容方案",
          "职业发展内容方案",
          "综合发展内容方案"
        ],
        "optionsSource": "talent-content-library"
      },
      {
        "name": "candidateContent",
        "label": "候选培养内容",
        "type": "select",
        "required": true,
        "dependsOn": [
          "factor",
          "level",
          "contentSet"
        ],
        "optionsSource": "talent-nurture-content"
      },
      {
        "name": "priority",
        "label": "候选顺序",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "草稿",
          "已启用",
          "已停用"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": false
  },
  {
    "resourceId": "talent-generation",
    "domainId": "care",
    "groupId": "care-talent-report",
    "pageType": "interface",
    "title": "第三方结果回传记录",
    "description": "查看第三方结果回传记录执行状态、失败原因、重试和人工补偿结果。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "externalReportId",
        "label": "第三方报告编号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "待校验",
          "待生成",
          "生成中",
          "已生成",
          "异常"
        ]
      }
    ],
    "columns": [
      "externalReportId",
      "revision",
      "childIdNo",
      "analyzedAt",
      "resultVersion",
      "source",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "externalReportId",
          "revision",
          "childIdNo",
          "analyzedAt",
          "resultVersion",
          "source",
          "receivedAt",
          "completeness",
          "exceptionReason",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "externalReportId",
            "label": "第三方报告编号",
            "type": "text",
            "required": false,
            "system": true,
            "readonly": true
          },
          {
            "name": "revision",
            "label": "修订号",
            "type": "number",
            "required": false,
            "system": true,
            "readonly": true
          },
          {
            "name": "childIdNo",
            "label": "孩子身份证号",
            "type": "text",
            "required": false,
            "system": true,
            "readonly": true
          },
          {
            "name": "analyzedAt",
            "label": "分析日期",
            "type": "datetime-local",
            "required": false,
            "system": true,
            "readonly": true
          },
          {
            "name": "resultVersion",
            "label": "结果版本",
            "type": "text",
            "required": false,
            "system": true,
            "readonly": true
          },
          {
            "name": "source",
            "label": "结果来源",
            "type": "select",
            "required": false,
            "options": [
              "接口回传"
            ],
            "system": true,
            "readonly": true
          },
          {
            "name": "receivedAt",
            "label": "接收时间",
            "type": "datetime-local",
            "required": false,
            "system": true,
            "readonly": true
          },
          {
            "name": "completeness",
            "label": "完整性",
            "type": "text",
            "required": false,
            "system": true,
            "readonly": true
          },
          {
            "name": "exceptionReason",
            "label": "异常原因",
            "type": "text",
            "required": false,
            "system": true,
            "readonly": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "待校验",
              "待生成",
              "生成中",
              "已生成",
              "异常"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "integration-retry"
    ],
    "batchActions": [],
    "statusActions": [
      "integration-retry"
    ],
    "relationTabs": [
      "talent-generation"
    ],
    "fields": [
      {
        "name": "externalReportId",
        "label": "第三方报告编号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "revision",
        "label": "修订号",
        "type": "number",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "childIdNo",
        "label": "孩子身份证号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "analyzedAt",
        "label": "分析日期",
        "type": "datetime-local",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "resultVersion",
        "label": "结果版本",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "source",
        "label": "结果来源",
        "type": "select",
        "required": false,
        "options": [
          "接口回传"
        ],
        "system": true,
        "readonly": true
      },
      {
        "name": "receivedAt",
        "label": "接收时间",
        "type": "datetime-local",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "completeness",
        "label": "完整性",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "exceptionReason",
        "label": "异常原因",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "待校验",
          "待生成",
          "生成中",
          "已生成",
          "异常"
        ]
      }
    ],
    "integrationActions": [
      "integration-retry"
    ],
    "coverageIntegrationActions": [
      "integration-retry"
    ],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [],
    "customerVisible": false
  },
  {
    "resourceId": "talent-report",
    "domainId": "care",
    "groupId": "care-talent-report",
    "pageType": "document",
    "title": "天赋报告",
    "description": "查询并处理天赋报告，查看业务内容、当前状态和后续流转。",
    "metrics": [
      {
        "key": "total",
        "label": "记录总数",
        "tone": "neutral"
      }
    ],
    "filters": [
      {
        "name": "keyword",
        "label": "关键词",
        "type": "text",
        "required": false
      },
      {
        "name": "childId",
        "label": "孩子",
        "type": "search-select",
        "required": false,
        "optionsSource": "talent-child",
        "system": true,
        "readonly": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": false,
        "options": [
          "全部",
          "待发布",
          "已发布",
          "已撤回",
          "已归档",
          "异常"
        ]
      }
    ],
    "columns": [
      "childId",
      "externalReportId",
      "revision",
      "reportType",
      "reportType",
      "analyzedAt",
      "status"
    ],
    "detailGroups": [
      {
        "title": "业务信息",
        "fields": [
          "childId",
          "externalReportId",
          "revision",
          "reportType",
          "reportType",
          "analyzedAt",
          "generatedAt",
          "contentSnapshot",
          "attachment",
          "sourceResultId",
          "status"
        ]
      }
    ],
    "formSections": [
      {
        "title": "基本信息",
        "fields": [
          {
            "name": "childId",
            "label": "孩子",
            "type": "search-select",
            "required": false,
            "optionsSource": "talent-child",
            "system": true,
            "readonly": true
          },
          {
            "name": "externalReportId",
            "label": "第三方报告编号",
            "type": "text",
            "required": false,
            "system": true,
            "readonly": true
          },
          {
            "name": "revision",
            "label": "修订号",
            "type": "number",
            "required": false,
            "system": true,
            "readonly": true
          },
          {
            "name": "reportType",
            "label": "报告类型",
            "type": "select",
            "required": false,
            "options": [
              "成人发展倾向",
              "儿童成长潜能",
              "职业兴趣倾向",
              "学习能力画像",
              "社会情绪能力",
              "综合发展能力"
            ],
            "system": true,
            "readonly": true
          },
          {
            "name": "reportType",
            "label": "匹配报告类型",
            "type": "text",
            "required": false,
            "system": true,
            "readonly": true
          },
          {
            "name": "analyzedAt",
            "label": "分析日期",
            "type": "datetime-local",
            "required": false,
            "system": true,
            "readonly": true
          },
          {
            "name": "generatedAt",
            "label": "生成完成时间",
            "type": "datetime-local",
            "required": false,
            "system": true,
            "readonly": true
          },
          {
            "name": "contentSnapshot",
            "label": "内容快照",
            "type": "text",
            "required": false,
            "system": true,
            "readonly": true
          },
          {
            "name": "attachment",
            "label": "附件",
            "type": "text",
            "required": false
          },
          {
            "name": "sourceResultId",
            "label": "来源结果",
            "type": "text",
            "required": false,
            "system": true,
            "readonly": true
          },
          {
            "name": "status",
            "label": "状态",
            "type": "select",
            "required": true,
            "options": [
              "待发布",
              "已发布",
              "已撤回",
              "已归档",
              "异常"
            ]
          }
        ]
      }
    ],
    "rowActions": [
      "resource-publish",
      "resource-withdraw",
      "resource-archive"
    ],
    "batchActions": [
      "resource-archive",
      "resource-export"
    ],
    "statusActions": [
      "resource-publish",
      "resource-withdraw",
      "resource-archive"
    ],
    "relationTabs": [
      "talent-report"
    ],
    "fields": [
      {
        "name": "childId",
        "label": "孩子",
        "type": "search-select",
        "required": false,
        "optionsSource": "talent-child",
        "system": true,
        "readonly": true
      },
      {
        "name": "externalReportId",
        "label": "第三方报告编号",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "revision",
        "label": "修订号",
        "type": "number",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "reportType",
        "label": "报告类型",
        "type": "select",
        "required": false,
        "options": [
          "成人发展倾向",
          "儿童成长潜能",
          "职业兴趣倾向",
          "学习能力画像",
          "社会情绪能力",
          "综合发展能力"
        ],
        "system": true,
        "readonly": true
      },
      {
        "name": "reportType",
        "label": "匹配报告类型",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "analyzedAt",
        "label": "分析日期",
        "type": "datetime-local",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "generatedAt",
        "label": "生成完成时间",
        "type": "datetime-local",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "contentSnapshot",
        "label": "内容快照",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "attachment",
        "label": "附件",
        "type": "text",
        "required": false
      },
      {
        "name": "sourceResultId",
        "label": "来源结果",
        "type": "text",
        "required": false,
        "system": true,
        "readonly": true
      },
      {
        "name": "status",
        "label": "状态",
        "type": "select",
        "required": true,
        "options": [
          "待发布",
          "已发布",
          "已撤回",
          "已归档",
          "异常"
        ]
      }
    ],
    "integrationActions": [],
    "coverageIntegrationActions": [],
    "pageActions": [],
    "drilldowns": [],
    "editLockedStatuses": [
      "待发布",
      "已发布",
      "已撤回",
      "已归档",
      "异常"
    ],
    "customerVisible": true
  }
]
