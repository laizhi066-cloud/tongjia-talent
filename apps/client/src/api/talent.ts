/**
 * @description C 端天赋接口封装：只拼 `/api/client/talent/*`，类型与 M2/M3/M4/M5/M7 冻结契约一一对应。
 * 页面不直接调用本文件，统一经由 `modules/talent-portal` 的 composable / store 消费。
 * @file src/api/talent.ts
 */
import { del, get, post, put } from '@/http/http'
import type {
  TalentAdviceResponse,
  TalentBindingsResponse,
  TalentChildInput,
  TalentChildItem,
  TalentChildrenResponse,
  TalentDirectionItem,
  TalentDirectionsResponse,
  TalentProfileInput,
  TalentProfileResponse,
  TalentReportOverviewResponse,
  TalentSelectionMutationResponse,
  TalentSummaryResponse,
  TalentVolumeResponse,
} from './talent-types'

/** 拼接可选 query，避免出现空参数。 */
function withQuery(path: string, query: Record<string, string | undefined>): string {
  const search = Object.entries(query)
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')
  return search ? `${path}?${search}` : path
}

// ── 启动聚合 / 归属 ───────────────────────────────────────────────────────────

/** 启动聚合：账号状态 + 对象列表 + 当前对象 + 待核对 + 计数。 */
export function getTalentSummary(subjectId?: string): Promise<TalentSummaryResponse> {
  return get<TalentSummaryResponse>(withQuery('/api/client/talent/summary', { subjectId }), { hideErrorToast: true })
}

/** 本人 + 已绑定子女的只读对象列表（M2 契约，GET 不写库）。 */
export function getTalentBindings(): Promise<TalentBindingsResponse> {
  return get<TalentBindingsResponse>('/api/client/talent/bindings', { hideErrorToast: true })
}

/** 显式认领唯一家长档案（M2 契约）。 */
export function claimTalentBinding(): Promise<TalentBindingsResponse> {
  return post<TalentBindingsResponse>('/api/client/talent/bindings/claim', {}, { hideErrorToast: true })
}

// ── 报告 / 分册 ───────────────────────────────────────────────────────────────

/** 报告总览：状态 + 6 册摘要 + 建议份数。 */
export function getTalentReport(reportId: string): Promise<TalentReportOverviewResponse> {
  return get<TalentReportOverviewResponse>(`/api/client/talent/reports/${encodeURIComponent(reportId)}`, { hideErrorToast: true })
}

/** 分册要素：章节、要素、数据熵与相关方向。 */
export function getTalentReportVolume(reportId: string, volumeId: string): Promise<TalentVolumeResponse> {
  return get<TalentVolumeResponse>(
    `/api/client/talent/reports/${encodeURIComponent(reportId)}/volumes/${encodeURIComponent(volumeId)}`,
    { hideErrorToast: true },
  )
}

/** 分册 PDF 权限代理地址（M8 前服务端返回 404 PDF_NOT_READY）。 */
export function getTalentReportVolumePdfPath(reportId: string, volumeId: string): string {
  return `/api/client/talent/reports/${encodeURIComponent(reportId)}/volumes/${encodeURIComponent(volumeId)}/pdf`
}

// ── 培育建议 ─────────────────────────────────────────────────────────────────

/** 当前生效版本、已发布的建议书（按分册）。 */
export function getTalentAdvice(reportId: string): Promise<TalentAdviceResponse> {
  return get<TalentAdviceResponse>(withQuery('/api/client/talent/advice', { reportId }), { hideErrorToast: true })
}

// ── 培养方向 / 选择 ───────────────────────────────────────────────────────────

/** 推荐方向、已选方向、自填选项与选择上限。 */
export function getTalentDirections(reportId?: string): Promise<TalentDirectionsResponse> {
  return get<TalentDirectionsResponse>(withQuery('/api/client/talent/directions', { reportId }), { hideErrorToast: true })
}

/** 选择正式方向或自填方向。 */
export function createTalentSelection(input: {
  reportId: string
  directionId?: string
  manualName?: string
  tierId: string
}): Promise<TalentSelectionMutationResponse> {
  return post<TalentSelectionMutationResponse>('/api/client/talent/selections', input, { hideErrorToast: true })
}

/** 更换目标档位。 */
export function updateTalentSelection(
  selectionId: string,
  input: { reportId: string, tierId: string },
): Promise<TalentSelectionMutationResponse> {
  return put<TalentSelectionMutationResponse>(
    `/api/client/talent/selections/${encodeURIComponent(selectionId)}`,
    input,
    { hideErrorToast: true },
  )
}

/** 取消已选方向（幂等）。 */
export function deleteTalentSelection(selectionId: string, reportId: string): Promise<TalentSelectionMutationResponse> {
  return del<TalentSelectionMutationResponse>(
    withQuery(`/api/client/talent/selections/${encodeURIComponent(selectionId)}`, { reportId }),
    { hideErrorToast: true },
  )
}

/** 推荐方向卡集合（供后续 M7-D 页面直接复用）。 */
export type { TalentDirectionItem }

// ── 家长资料 / 孩子 ───────────────────────────────────────────────────────────

/** 家长资料（中性账户 + 会员档案脱敏合并）。 */
export function getTalentProfile(): Promise<TalentProfileResponse> {
  return get<TalentProfileResponse>('/api/client/talent/profile', { hideErrorToast: true })
}

/** 编辑家长资料；手机号只读，不提交。 */
export function updateTalentProfile(input: TalentProfileInput): Promise<TalentProfileResponse> {
  return put<TalentProfileResponse>('/api/client/talent/profile', input, { hideErrorToast: true })
}

/** 孩子列表（脱敏 + 查询状态 + 报告篇数）。 */
export function getTalentChildren(): Promise<TalentChildrenResponse> {
  return get<TalentChildrenResponse>('/api/client/talent/children', { hideErrorToast: true })
}

/** 新增孩子并自动发起查询。 */
export function createTalentChild(input: TalentChildInput): Promise<TalentChildItem> {
  return post<TalentChildItem>('/api/client/talent/children', input, { hideErrorToast: true })
}

/** 编辑孩子；身份证留空表示不修改。 */
export function updateTalentChild(id: string, input: Partial<TalentChildInput>): Promise<TalentChildItem> {
  return put<TalentChildItem>(`/api/client/talent/children/${encodeURIComponent(id)}`, input, { hideErrorToast: true })
}
