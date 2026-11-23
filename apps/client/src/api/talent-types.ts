/**
 * @description 天赋 C 端接口契约类型，对应 M2 bindings、M7 summary/report/profile/children、
 *   M3 报告与分册、M4 方向/选择、M5 培育建议。字段与冻结契约一一对应，不新增事实源。
 * @file src/api/talent-types.ts
 */

/** 报告对象类型：本人 / 已绑定子女。 */
export type TalentSubjectType = 'self' | 'child'

/** 账号级状态（M7 summary 派生）。 */
export type TalentAccountState = 'active' | 'unbound' | 'parent_disabled'

/** 报告状态（M3 快照投影）。 */
export type TalentReportStatus = 'published' | 'pending_publish' | 'retracted' | 'none'

/** 分册可读状态（M3 由 open 与外部已出分册派生）。 */
export type TalentVolumeState = 'readable' | 'not_open' | 'not_detected'

/** 子女基因查询四态。 */
export type TalentChildQuery = 'unqueried' | 'querying' | 'found' | 'not_found'

/** 未查到的三类归因。 */
export type TalentQueryReason = 'info_mismatch' | 'api_error' | 'no_result' | ''

/** 显式认领结果（M2 claim）。 */
export type TalentClaimStatus = 'bound' | 'already_bound' | 'no_match' | 'ambiguous' | 'conflict' | 'no_phone'

// ── M2 bindings ────────────────────────────────────────────────────────────────

/** `GET /api/client/talent/bindings` 的单个对象（只含脱敏信息）。 */
export interface TalentBindingItem {
  /** 对象主键：本人为 `talent_parents.id`，子女为 `talent_children.id`。 */
  id: string
  objectType: TalentSubjectType
  name: string
  gender: 'male' | 'female' | ''
  genderLabel: string
  birthday: string
  /** 与家长的关系（本人为空串）。 */
  relation: string
  relationLabel: string
  maskedIdNo: string
  /** 本人不做基因查询，固定为 null。 */
  query: TalentChildQuery | null
  queryReason: TalentQueryReason
  /** M3 接入后表示是否存在可读报告。 */
  reportAvailable: boolean
}

/** bindings / claim 共用信封。 */
export interface TalentBindingsResponse {
  items: TalentBindingItem[]
  currentId: string
  current: TalentBindingItem | null
  currentRelationType: TalentSubjectType | ''
  claim?: { status: TalentClaimStatus }
}

// ── M7 summary ────────────────────────────────────────────────────────────────

/** summary 中的报告对象视图。 */
export interface TalentSummarySubject {
  subjectType: TalentSubjectType
  subjectId: string
  name: string
  gender: 'male' | 'female' | ''
  genderLabel: string
  age: number
  ageLabel: string
  relation: string
  relationLabel: string
  query: TalentChildQuery | null
  queryReason: TalentQueryReason
  /** 无报告为空串。 */
  reportId: string
  reportStatus: TalentReportStatus
  /** 服务端派生的脚注文案（§11.2，不得改写）。 */
  statusText: string
  readableVolumeCount: number
  totalVolumeCount: number
  adviceCount: number
  selectedDirectionCount: number
  selectionLimit: number
}

/** `GET /api/client/talent/summary` 响应。 */
export interface TalentSummaryResponse {
  accountState: TalentAccountState
  subjects: TalentSummarySubject[]
  currentId: string
  current: TalentSummarySubject | null
  pendingCheckCount: number
  footer: { copyright: string, contactPhone: string }
}

// ── M3 报告 / 分册 ────────────────────────────────────────────────────────────

/** 报告总览中的报告信息条。 */
export interface TalentReportInfo {
  id: string
  status: TalentReportStatus
  statusLabel: string
  publishedAt: string
  snapshotVersion: number
  readableVolumeCount: number
  totalVolumeCount: number
  volumeHeaderText: string
  adviceCount: number
}

/** 报告总览中的对象信息（脱敏）。 */
export interface TalentReportSubject {
  subjectType: TalentSubjectType
  name: string
  genderLabel: string
  ageLabel: string
  relationLabel: string
}

/** 报告总览中的分册摘要。 */
export interface TalentReportVolumeSummary {
  volumeId: string
  name: string
  sortOrder: number
  state: TalentVolumeState
  chapterCount: number
  factorCount: number
}

/** `GET /api/client/talent/reports/:id` 响应。 */
export interface TalentReportOverviewResponse {
  report: TalentReportInfo
  subject: TalentReportSubject
  volumes: TalentReportVolumeSummary[]
}

/** 要素关联的培养方向（命中 N/M，不返回编码）。 */
export interface TalentFactorDirection {
  directionId: string
  name: string
  hitCount: number
  total: number
}

/** 分册内单个要素。 */
export interface TalentVolumeFactor {
  /** 本册内 0 起序号，用于上一项/下一项与深链定位。 */
  index: number
  name: string
  levelName: string
  note: string
  condition: string
  relatedDirections: TalentFactorDirection[]
}

/** 分册数据熵筛选项。 */
export interface TalentEntropyOption {
  name: string
  count: number
}

/** 分册章节分组。 */
export interface TalentVolumeChapter {
  chapter: string
  factorIndexes: number[]
}

/** `GET /api/client/talent/reports/:id/volumes/:volumeId` 响应。 */
export interface TalentVolumeResponse {
  volume: { volumeId: string, name: string, sortOrder: number, chapterCount: number, factorCount: number }
  entropyOptions: TalentEntropyOption[]
  chapters: TalentVolumeChapter[]
  factors: TalentVolumeFactor[]
}

// ── M5 培育建议 ───────────────────────────────────────────────────────────────

/** 建议书四段正文（空段不渲染）。 */
export interface TalentAdviceSection {
  chapter: string
  factor: string
  entropy: string
  content: string
  example: string
  direction: string
  suggestion: string
}

/** 分册建议状态：有建议 / 报告已发布但建议未同步 / 报告未开放 / 本次未检测。 */
export type TalentAdviceBookState = 'available' | 'pending' | 'not_published' | 'not_detected'

/** 按分册的建议书。 */
export interface TalentAdviceBook {
  /** 内部键 A–F，仅用于定位，不展示。 */
  book: string
  bookName: string
  state: TalentAdviceBookState
  adviceNo: string
  sectionCount: number
  total: number
  entropyList: TalentEntropyOption[]
  sections: TalentAdviceSection[]
}

/** `GET /api/client/talent/advice?reportId=` 响应。 */
export interface TalentAdviceResponse {
  available: boolean
  version?: { versionNo: string, cycle: string, effectiveAt: string, nextUpdateAt: string, cycleMonths: number }
  owner?: { name: string, gender: string, genderLabel: string, age: number, ageLabel: string }
  books?: TalentAdviceBook[]
  emptyText: string
}

// ── M4 培养方向 / 选择 ────────────────────────────────────────────────────────

/** 方向要素对照行。 */
export interface TalentDirectionRequirement {
  factorName: string
  needLevelName: string
  actualLevelName: string
  met: boolean
  gap: number
}

/** 方向档位。 */
export interface TalentDirectionTier {
  tierId: string
  name: string
  teacher: string
  freq: string
  headline: string
  description: string
  default: boolean
}

/** 推荐方向卡。 */
export interface TalentDirectionItem {
  directionId: string
  name: string
  description: string
  icon: string
  hitCount: number
  total: number
  hitRate: number
  selected: boolean
  selectedTierId: string
  requirements: TalentDirectionRequirement[]
  tiers: TalentDirectionTier[]
  defaultTierId: string
  selectable: boolean
  fallback: boolean
}

/** 已选方向。 */
export interface TalentSelectionItem {
  selectionId: string
  directionId: string
  requestId: string
  custom: boolean
  directionName: string
  tierId: string
  tierName: string
  teacher: string
  freq: string
  manualName: string
  selectedAt: string
}

/** 自填方向候选项。 */
export interface TalentManualOption {
  directionId: string
  name: string
}

/** `GET /api/client/talent/directions?reportId=` 响应。 */
export interface TalentDirectionsResponse {
  reportId: string
  snapshotVersion: number
  publishedAt: string
  recommendLimit: number
  selectionLimit: number
  selectionCount: number
  fallback: boolean
  emptyReason: string | null
  items: TalentDirectionItem[]
  selections: TalentSelectionItem[]
  /** 全局启用档位（快照 `tiers` ∩ 当前启用；字段与 `items[].tiers` 一致，供换档 / 详情兜底）。 */
  tiers: TalentDirectionTier[]
  /** 自填页培养目标候选（与 `tiers` 同源；快照无档位时回退当前启用档位）。 */
  manualTiers: TalentDirectionTier[]
  manualOptions: TalentManualOption[]
  manualLimit: number
}

/** 选择 / 换档 / 取消的公共响应。 */
export interface TalentSelectionMutationResponse {
  selection?: TalentSelectionItem
  selections: TalentSelectionItem[]
  selectionCount: number
  selectionLimit: number
  alreadySelected?: boolean
  changed?: boolean
}

// ── M7 profile / children ─────────────────────────────────────────────────────

/** `GET /api/client/talent/profile`：中性账户 + 家长档案脱敏合并。 */
export interface TalentProfileResponse {
  id: string
  nickname: string
  avatar: string
  name: string
  gender: 'male' | 'female' | ''
  genderLabel: string
  birthday: string
  /** 脱敏手机号，只读。 */
  maskedMobile: string
  /** 脱敏身份证；未填写为空串。 */
  maskedIdNo: string
  hasIdNo: boolean
}

/** `PUT /api/client/talent/profile`：只提交变化字段，手机号只读。 */
export interface TalentProfileInput {
  name?: string
  nickname?: string
  avatar?: string
  gender?: 'male' | 'female'
  birthday?: string
  idNo?: string
}

/** `GET /api/client/talent/children` 行。 */
export interface TalentChildItem {
  id: string
  name: string
  gender: 'male' | 'female' | ''
  genderLabel: string
  birthday: string
  age: number
  ageLabel: string
  relation: string
  relationLabel: string
  maskedIdNo: string
  query: TalentChildQuery
  queryReason: TalentQueryReason
  queryReasonLabel: string
  reportCount: number
}

/** `GET /api/client/talent/children` 响应。 */
export interface TalentChildrenResponse {
  items: TalentChildItem[]
}

/** 新增 / 编辑孩子的提交体。 */
export interface TalentChildInput {
  name: string
  gender: 'male' | 'female'
  relation: string
  birthday: string
  /** 新增必填；编辑留空表示不修改。 */
  idNo?: string
}
