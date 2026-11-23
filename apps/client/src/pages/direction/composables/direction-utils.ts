/**
 * @description 培养方向页共用纯工具：报告状态文案、档位候选、选择项匹配与写操作错误映射。
 *   档位候选优先取方向项自带的 `tiers`（该方向可用档位），缺失时回退接口返回的全局启用
 *   档位 `tiers`（快照 ∩ 当前启用），保证换档 / 自填在推荐为空时仍有候选。
 * @file src/pages/direction/composables/direction-utils.ts
 */
import { apiErrorCode, apiErrorMessage, apiErrorStatus } from '@/http/http'
import type {
  TalentDirectionItem,
  TalentDirectionTier,
  TalentReportStatus,
  TalentSelectionItem,
} from '@/api/talent-types'

/** 方向页可展示的阻断状态。 */
export type DirectionBlockingState
  = | 'empty'
    | 'no-report'
    | 'pending'
    | 'retracted'
    | 'unbound'
    | 'notfound'
    | 'invalid'
    | 'error'
    | 'session'

/** 阻断状态文案。 */
export interface DirectionBlockingCopy {
  title: string
  message: string
  actionText: string
}

/** 报告状态前置文案（§8.1 / §11.2）；published 返回 null。 */
export function directionReportCopy(status: TalentReportStatus): DirectionBlockingCopy | null {
  if (status === 'published')
    return null
  if (status === 'pending_publish') {
    return {
      title: '报告整理中',
      message: '报告正在整理中，发布后即可查看推荐方向。',
      actionText: '查看报告',
    }
  }
  if (status === 'retracted') {
    return {
      title: '报告内容更新中',
      message: '报告内容正在更新，完成后恢复查看推荐方向。',
      actionText: '查看报告',
    }
  }
  return {
    title: '报告发布后可选方向',
    message: '培养方向依据基因报告结果推荐，报告发布后即可选择。',
    actionText: '查看报告',
  }
}

/** 阻断状态文案（列表 / 详情 / 自填共用）。 */
export function directionBlockingCopy(state: DirectionBlockingState, message = ''): DirectionBlockingCopy {
  switch (state) {
    case 'no-report':
      return { title: '报告发布后可选方向', message: '培养方向依据基因报告结果推荐，报告发布后即可选择。', actionText: '查看报告' }
    case 'pending':
      return { title: '报告整理中', message: '报告正在整理中，发布后即可查看推荐方向。', actionText: '查看报告' }
    case 'retracted':
      return { title: '报告内容更新中', message: '报告内容正在更新，完成后恢复查看推荐方向。', actionText: '查看报告' }
    case 'unbound':
      return { title: '暂未关联会员档案', message: '请确认手机号与后台登记一致；如仍未匹配，请联系客服核对会员档案。', actionText: '返回首页' }
    case 'empty':
      return { title: '暂无可推荐方向', message: '当前报告暂无推荐方向，可自己填写培养方向。', actionText: '自己填写' }
    case 'notfound':
      return { title: '内容不可查看', message: '该方向或报告暂不可查看，请返回培养方向重试。', actionText: '返回培养方向' }
    case 'invalid':
      return { title: '内容不可查看', message: '链接参数不完整或已失效，请从培养方向页重新进入。', actionText: '返回培养方向' }
    case 'session':
      return { title: '登录状态已失效', message: '请重新登录后查看培养方向。', actionText: '重新登录' }
    case 'error':
    default:
      return { title: '培养方向暂时无法读取', message: message || '请稍后重试。', actionText: '重试' }
  }
}

/** 接口异常 → 阻断状态（409 报告状态 / 404 越权 / 401·403 会话接管）。 */
export function directionBlockingStateOf(error: unknown): { state: DirectionBlockingState, message: string } {
  const status = apiErrorStatus(error)
  const code = apiErrorCode(error)
  if (status === 409) {
    const retracted = code === 'report_retracted'
    return { state: retracted ? 'retracted' : 'pending', message: '' }
  }
  if (status === 404)
    return { state: 'notfound', message: '' }
  if (status === 401 || status === 403)
    return { state: 'session', message: '' }
  return { state: 'error', message: apiErrorMessage(error, '培养方向暂时无法读取，请稍后重试。') }
}

/** 写操作（选择/换档/取消/自填）可读错误文案；不展示技术码。 */
export function directionMutationMessage(error: unknown, selectionLimit = 3): string {
  const status = apiErrorStatus(error)
  const code = apiErrorCode(error)
  if (status === 409) {
    if (code === 'SELECTION_LIMIT_REACHED')
      return `最多选择 ${selectionLimit} 个方向，请先取消一个`
    if (code === 'DUPLICATE_SELECTION')
      return '该方向已选择，可在已选方向中更换档位'
    if (code === 'report_retracted')
      return '报告内容更新中，暂时无法操作'
    return '报告正在整理中，暂时无法操作'
  }
  if (status === 422) {
    if (code === 'INVALID_TIER' || code === 'TIER_UNAVAILABLE' || code === 'NO_TIER_AVAILABLE')
      return '目标档位暂不可用，请重新选择培养目标'
    if (code === 'DIRECTION_NOT_AVAILABLE')
      return '该方向暂不可选，请重新选择'
    if (code === 'INVALID_MANUAL_NAME')
      return '方向名称不符合要求，请修改后重试'
    return '提交内容不符合要求，请检查后重试'
  }
  if (status === 404)
    return '内容不可查看'
  return apiErrorMessage(error, '操作未完成，请稍后重试')
}

/** 合并推荐的档位并去重（保持接口返回顺序）。 */
export function uniqueTiers(items: TalentDirectionItem[]): TalentDirectionTier[] {
  const seen = new Set<string>()
  const result: TalentDirectionTier[] = []
  for (const item of items || []) {
    for (const tier of item.tiers || []) {
      if (!tier.tierId || seen.has(tier.tierId))
        continue
      seen.add(tier.tierId)
      result.push(tier)
    }
  }
  return result
}

/**
 * 某方向的档位候选：优先该方向自带档位；方向不在推荐项时回退全局启用档位。
 */
export function tierOptionsForDirection(
  directionId: string,
  items: TalentDirectionItem[],
  globalTiers: TalentDirectionTier[] = [],
): TalentDirectionTier[] {
  const item = (items || []).find(entry => entry.directionId === directionId)
  if (item && item.tiers.length)
    return item.tiers
  if (globalTiers.length)
    return globalTiers
  return uniqueTiers(items)
}

/**
 * 已选方向的换档候选：优先该方向档位；自定义/非推荐方向回退全局启用档位，
 * 两者都没有时至少保留当前档位，避免弹层空白。
 */
export function tierOptionsForSelection(
  selection: TalentSelectionItem,
  items: TalentDirectionItem[],
  globalTiers: TalentDirectionTier[] = [],
): TalentDirectionTier[] {
  const matched = items.find(entry => !selection.custom && entry.directionId === selection.directionId)
  if (matched && matched.tiers.length)
    return matched.tiers
  if (globalTiers.length)
    return globalTiers
  const merged = uniqueTiers(items)
  if (merged.length)
    return merged
  if (!selection.tierId)
    return []
  return [{
    tierId: selection.tierId,
    name: selection.tierName,
    teacher: selection.teacher,
    freq: selection.freq,
    headline: '',
    description: '',
    default: false,
  }]
}

/** 默认档位：显式 id → 标记 default 的档位 → 首个档位。 */
export function pickTierId(tiers: TalentDirectionTier[], preferred = ''): string {
  if (preferred && tiers.some(tier => tier.tierId === preferred))
    return preferred
  const fallback = tiers.find(tier => tier.default)
  return fallback?.tierId || tiers[0]?.tierId || ''
}

/** 已选方向里匹配某正式方向的选择项。 */
export function selectionOfDirection(
  selections: TalentSelectionItem[],
  directionId: string,
): TalentSelectionItem | undefined {
  return (selections || []).find(item => !item.custom && item.directionId === directionId)
}

/** 档位副标题：师资 · 频次。 */
export function tierMeta(tier: TalentDirectionTier): string {
  return [tier.teacher, tier.freq].filter(Boolean).join(' · ')
}

/** 选择时间只展示日期部分（`YYYY-MM-DD`），非法值返回空串。 */
export function selectedDateText(value: string): string {
  const matched = String(value || '').match(/^\d{4}-\d{2}-\d{2}/)
  return matched ? matched[0] : ''
}

/** 上限提示文案。 */
export function selectionLimitText(count: number, limit: number): string {
  return `已选 ${count}/${limit}`
}

/**
 * 方向图标视觉：语义图标名 + 柔和底色 + 同色系图标色令牌。
 *   用真图标替代单字占位，让卡片从「后台数据行」变成有辨识度的方向入口。
 *   后端 icon 目前是单字（舞/音/思/言/画/动），按方向名匹配；未命中回退中性星形。
 */
export interface DirectionVisual {
  icon: string
  bg: string
  color: string
}

const DIRECTION_VISUALS: Record<string, DirectionVisual> = {
  舞蹈家: { icon: 'music', bg: 'var(--foundation-playful-surface)', color: 'var(--foundation-playful-text)' },
  音乐家: { icon: 'sound', bg: 'var(--foundation-accent-surface)', color: 'var(--foundation-accent-text)' },
  逻辑思维: { icon: 'bulb', bg: 'var(--foundation-info-surface)', color: 'var(--foundation-info-text)' },
  语言表达: { icon: 'language', bg: 'var(--foundation-primary-tint)', color: 'var(--foundation-primary-deep)' },
  绘画创作: { icon: 'brush', bg: 'var(--foundation-warning-surface)', color: 'var(--foundation-warning)' },
  运动竞技: { icon: 'trophy', bg: 'var(--foundation-success-surface)', color: 'var(--foundation-success)' },
}

/** 按方向名取图标视觉，未命中用中性星形。 */
export function directionVisual(name: string): DirectionVisual {
  return DIRECTION_VISUALS[String(name || '').trim()]
    ?? { icon: 'star', bg: 'var(--foundation-surface)', color: 'var(--foundation-text-secondary)' }
}
