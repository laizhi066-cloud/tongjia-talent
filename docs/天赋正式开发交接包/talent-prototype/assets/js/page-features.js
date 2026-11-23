import { pageFeatureCatalog } from './feature-data.js?v=talent-1.0.8'

const derivedPageFeatures = {
  'supply-warehouse-location': [
    { name:'仓库树', description:'按仓库查看所属库位、负责人和启停状态，作为采购入库和库存作业的选择入口。', location:'列表', locator:'column:warehouse' },
    { name:'库位级联选择', description:'选择仓库后只展示该仓库可用库位，避免把库存放入错误位置。', location:'新增/编辑表单', locator:'form-field:location' },
    { name:'仓库与库位状态', description:'查看仓库和库位的启用、停用状态；停用后不再用于新业务。', location:'列表列', locator:'column:status' }
  ],
  'purchase-quote-compare': [
    { name:'询价比价清单', description:'集中查看同一采购申请下的供应商报价、报价金额和比价结果。', location:'列表', locator:'column:comparisonResult' },
    { name:'供应商报价选择', description:'从已维护的供应商和物料中选择报价对象，形成可比较的报价记录。', location:'新增/编辑表单', locator:'form-field:supplier' },
    { name:'比价结果确认', description:'确认最低报价、交期最优或存在差异的结果，为采购订单提供来源。', location:'状态操作', locator:'status-action:resource-confirm' }
  ],
  'inventory-inbound': [
    { name:'采购入库阶段', description:'同一入库单按待收货、待验收、待上架、已入库或异常状态推进。', location:'列表列', locator:'column:stageStatus' },
    { name:'批次效期登记', description:'收货和验收后登记批次、生产日期和失效日期，供上架和库存追溯使用。', location:'新增/编辑表单', locator:'form-field:batch' },
    { name:'阶段处理记录', description:'查看每个入库阶段的处理人、时间、数量和异常说明，所有阶段共用一个入库单号。', location:'关联页签', locator:'tab:receipt-stage' }
  ],
  'inventory-ledger': [
    { name:'库存余额查询', description:'按物料、仓库、库位、批次和状态查询当前库存余额。', location:'查询区', locator:'filter:keyword' },
    { name:'库存批次查看', description:'在列表中查看仓库、库位、批次、效期和可用数量。', location:'列表', locator:'column:batch' },
    { name:'冻结与库存预警', description:'冻结只改变可用状态不改变总数量；低库存、临期和待验收作为预警筛选查看。', location:'状态操作', locator:'status-action:inventory-freeze-toggle' }
  ],
  'inventory-flow': [
    { name:'库存变动流水', description:'记录采购入库、客户耗用、领用、调拨、盘点、报废和撤回回补造成的实际数量变化。', location:'列表', locator:'column:flowType' },
    { name:'批次库位追溯', description:'按批次、仓库和库位追溯每次库存变动及其来源单据。', location:'列表列', locator:'column:batch' },
    { name:'变更前后数量', description:'查看变更前数量、变更数量和变更后数量，作为库存审计依据。', location:'详情抽屉', locator:'detail-field:beforeQty' }
  ],
  'inventory-operations': [
    { name:'库存作业页签', description:'在同一页面按调拨、盘点、报废页签分别查看和处理对应单据。', location:'关联页签', locator:'tab:inventory-transfer' },
    { name:'调拨作业', description:'选择调出仓库/库位和调入仓库/库位，按批次形成成对库存流水。', location:'新增/编辑表单', locator:'form-field:operationType' },
    { name:'盘点与报废作业', description:'盘点记录账面与实盘差异，报废记录原因和凭证，完成后分别形成库存调整流水。', location:'列表列', locator:'column:status' }
  ],
  'asset-depreciation': [
    { name:'资产折旧列表', description:'按资产和期间查看期初净值、本期折旧额、期末净值和计提状态。', location:'列表', locator:'column:depreciationAmount' },
    { name:'折旧期间与资产选择', description:'从资产档案选择计提对象并指定折旧期间，系统按资产原值、残值率和使用年限计算金额。', location:'查询与关联字段', locator:'form-field:assetCode' },
    { name:'折旧确认与净值联动', description:'确认折旧后更新资产当前净值，并追加一条不可变的折旧生命周期记录；同一资产同一期间不能重复计提。', location:'状态操作', locator:'status-action:resource-confirm' }
  ],
  'asset-lifecycle': [
    { name:'资产生命周期列表', description:'集中查看资产建档、领用、归还、调拨、维修、盘点、折旧和报废履历。', location:'列表', locator:'column:businessType' },
    { name:'来源单据追溯', description:'每条履历关联原资产业务单号，能够从生命周期记录追溯到具体操作。', location:'列表列', locator:'column:businessNo' },
    { name:'生命周期只读审计', description:'生命周期记录只允许查询、详情和导出，不能直接新增、编辑或删除历史事实。', location:'详情与操作', locator:'column:occurredAt' }
  ]
}

export function featuresForResource(resourceId) {
  const configured = pageFeatureCatalog[resourceId] || []
  const items = configured.length ? configured : (derivedPageFeatures[resourceId] || [])
  return items.map(item => item.locator === 'metric:total'
    ? { ...item, description:'查看当前筛选结果的记录数量，作为本页业务核对入口。' }
    : item)
}
