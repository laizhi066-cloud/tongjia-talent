/**
 * @description 报告页面共用的纯函数：状态/错误文案映射、数据熵配色与分册筛选记忆。
 *   文案遵循 M7 spec §11.2（不得改写），错误码只用于分支，不展示给用户。
 * @file src/modules/talent-portal/components/report/report-support.ts
 */
import {
  apiErrorCode,
  apiErrorState,
  apiErrorStatus,
} from '@/http/http'
import type { TalentSummarySubject } from '@/api/talent-types'

/** 数据熵标签的语义配色：只用主题令牌，不硬编码色值。 */
export interface EntropyTone {
  color: string
  background: string
}

const ENTROPY_TONES: Readonly<Record<string, EntropyTone>> = {
  卓越: { color: 'var(--foundation-success)', background: 'var(--foundation-success-surface)' },
  优秀: { color: 'var(--foundation-interactive)', background: 'var(--foundation-surface)' },
  优良: { color: 'var(--foundation-info-text)', background: 'var(--foundation-info-surface)' },
}

/** 数据熵等级 → 标签配色；未知等级回落到中性色。 */
export function entropyTone(level: string): EntropyTone {
  return ENTROPY_TONES[String(level || '')] || {
    color: 'var(--foundation-text-secondary)',
    background: 'var(--foundation-surface)',
  }
}

/** 报告状态卡文案（标题 + 说明）。 */
export interface ReportStatusView {
  title: string
  description: string
  /** 是否引导用户去孩子管理核对信息。 */
  showChildren: boolean
}

/** 报告不可读时的状态文案（§11.2；报告状态优先于子女查询状态）。 */
export function buildReportStatusView(
  subject: TalentSummarySubject | null | undefined,
  state = '',
): ReportStatusView {
  const status = subject?.reportStatus || 'none'
  if (state === 'pending_publish' || status === 'pending_publish') {
    return {
      title: '报告整理中',
      description: '检测结果已回传，后台发布报告后即可按分册阅读。',
      showChildren: false,
    }
  }
  if (state === 'retracted' || status === 'retracted') {
    return {
      title: '报告内容更新中',
      description: '报告正在重新发布，完成后即可继续查看分册与培育建议。',
      showChildren: false,
    }
  }
  if (status === 'published') {
    const readable = Number(subject?.readableVolumeCount || 0)
    if (readable > 0) {
      return {
        title: `${readable} 个分册可读`,
        description: '按分册查看章节与要素解读；培育建议与报告同时发布。',
        showChildren: false,
      }
    }
    return {
      title: '报告整理中',
      description: '报告已同步，分册内容正在整理，请稍后刷新。',
      showChildren: false,
    }
  }
  if (subject?.subjectType === 'child') {
    const query = subject.query || ''
    if (query === 'querying') {
      return {
        title: '结果查询中',
        description: '正在向检测机构匹配结果，完成后会在这里显示。',
        showChildren: true,
      }
    }
    if (query === 'not_found') {
      return {
        title: '信息待核对',
        description: '请核对孩子的姓名、性别、出生日期与身份证号码，修正后可重新查询。',
        showChildren: true,
      }
    }
    if (query === 'found') {
      return {
        title: '报告待同步',
        description: '检测结果已匹配，报告同步后即可按分册阅读。',
        showChildren: false,
      }
    }
    return {
      title: '尚未查询',
      description: '孩子档案建立后会自动发起查询，请稍后再来查看。',
      showChildren: true,
    }
  }
  return {
    title: '该对象暂无基因报告',
    description: '报告由检测机构按身份证号同步，出具后会出现在这里。',
    showChildren: false,
  }
}

/** 报告级错误的状态卡视图。 */
export interface ReportErrorView {
  title: string
  description: string
  /** 是否值得重试（网络/5xx 为是，404 为否）。 */
  retryable: boolean
  /** 是否为「不存在或不可查看」类 404。 */
  notFound: boolean
}

/** 把接口异常映射为可读状态卡；不展示 HTTP 码与技术错误。 */
export function buildReportErrorView(
  error: unknown,
  fallbackDescription = '',
): ReportErrorView {
  const status = apiErrorStatus(error)
  const state = apiErrorState(error)
  const code = apiErrorCode(error)
  if (status === 409 || state === 'pending_publish' || state === 'retracted') {
    const retracted = state === 'retracted' || code === 'report_retracted'
    return {
      title: retracted ? '报告内容更新中' : '报告整理中',
      description: retracted
        ? '报告正在重新发布，完成后即可继续查看分册与培育建议。'
        : '检测结果已回传，后台发布报告后即可按分册阅读。',
      retryable: true,
      notFound: false,
    }
  }
  if (status === 404 && code === 'VOLUME_NOT_FOUND') {
    return {
      title: '分册未开放',
      description: '该分册暂不可查看，可返回报告页查看其他分册。',
      retryable: false,
      notFound: true,
    }
  }
  if (status === 404) {
    return {
      title: '内容不可查看',
      description: '内容不存在或已不可查看，请返回报告页重新选择。',
      retryable: false,
      notFound: true,
    }
  }
  if (status === 422) {
    return {
      title: '请求参数有误',
      description: '请返回报告页重新进入。',
      retryable: false,
      notFound: false,
    }
  }
  if (status === 0) {
    return {
      title: '网络连接失败',
      description: '请检查网络后重试。',
      retryable: true,
      notFound: false,
    }
  }
  return {
    title: '加载失败',
    description: fallbackDescription || '服务暂时不可用，请稍后重试。',
    retryable: true,
    notFound: false,
  }
}

/** 当前对象是否存在可读报告。 */
export function subjectHasReadableReport(subject: TalentSummarySubject | null | undefined): boolean {
  if (!subject || subject.reportStatus !== 'published' || !subject.reportId)
    return false
  return Number(subject.readableVolumeCount || 0) > 0
}

/** 报告发布日期展示值（`YYYY-MM-DD`）；无法解析返回空串。 */
export function formatReportDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''))
  return match ? `${match[1]}-${match[2]}-${match[3]}` : ''
}

const VOLUME_FILTER_PREFIX = 'foundation:talent:volume-filter'

/** 读取本机记住的本册数据熵筛选（按分册隔离）。 */
export function readVolumeFilter(volumeId: string): string {
  try {
    const raw = uni.getStorageSync(`${VOLUME_FILTER_PREFIX}:${volumeId}`)
    if (!raw)
      return ''
    const parsed = (typeof raw === 'string' ? JSON.parse(raw) : raw) as { level?: unknown }
    return String(parsed?.level || '')
  }
  catch {
    return ''
  }
}

/** 写入本册数据熵筛选；空值表示取消筛选。 */
export function writeVolumeFilter(volumeId: string, level: string): void {
  const key = `${VOLUME_FILTER_PREFIX}:${volumeId}`
  try {
    if (!level) {
      uni.removeStorageSync(key)
      return
    }
    uni.setStorageSync(key, JSON.stringify({ level, at: Date.now() }))
  }
  catch {
    // 存储不可用时只丢失记忆，不影响当前筛选。
  }
}
