/**
 * @description 错误监控采集引擎 — 统一把「接口错误(api) / C 端运行时(client) / 控制台(console)」写入 error_logs。
 *   设计：1) 配置门控（configs.error_monitor.enabled，默认开）2) 关键字排噪（ignoreKeywords 命中即丢弃）
 *        3) 按 fingerprint 去重聚合（同源同消息同路径 + 未处理 → count+1 / 更新 lastSeen，不新增行）
 *        4) 永不抛错（错误监控本身不能再制造错误，尤其在 nitro errorHandler 内）
 * @file server/utils/error-log.ts
 */
import { createHash } from 'node:crypto'

export interface ErrorLogInput {
  /** 来源：api=后端接口异常 / client=C端运行时/网络 / console=C端控制台 */
  source: 'api' | 'client' | 'console'
  /** 级别 */
  level?: 'error' | 'warn'
  /** 错误信息（必填） */
  message: string
  /** 调用栈 / 详情 */
  stack?: string
  /** 关联地址：接口路径或页面路由 */
  url?: string
  /** 请求方法（api） */
  method?: string
  /** HTTP 状态码（api） */
  statusCode?: number
  /** 平台：h5 / mp-weixin / app / server */
  platform?: string
  /** UserAgent / 设备信息 */
  ua?: string
  /** 关联用户 id（可空，匿名上报允许） */
  userId?: string
  /** 附加上下文（任意 JSON） */
  meta?: Record<string, unknown>
}

export interface ErrorMonitorConfig {
  enabled: boolean
  ignoreKeywords: string[]
}

const DEFAULT_CONFIG: ErrorMonitorConfig = { enabled: true, ignoreKeywords: [] }

// 配置短期缓存，避免每条错误都查一次 configs（errorHandler 在每个 5xx 上触发）
let cachedConfig: { value: ErrorMonitorConfig, at: number } | null = null
const CONFIG_TTL = 30_000

function normalizeErrorMonitorConfig(input: unknown): ErrorMonitorConfig {
  const value = input !== null && typeof input === 'object' && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {}
  return {
    enabled: value.enabled !== false,
    ignoreKeywords: Array.isArray(value.ignoreKeywords)
      ? value.ignoreKeywords.map(item => String(item).trim().toLowerCase()).filter(Boolean).slice(0, 50)
      : [],
  }
}

/** 读取错误监控配置（带 30s 缓存），无记录/异常一律回退默认（开启、无排噪词） */
export async function getErrorMonitorConfig(pb: any): Promise<ErrorMonitorConfig> {
  const now = Date.now()
  if (cachedConfig && now - cachedConfig.at < CONFIG_TTL) return cachedConfig.value
  let value = { ...DEFAULT_CONFIG }
  try {
    const rec = await pb.collection('configs').getFirstListItem('configKey = "error_monitor"', { $autoCancel: false })
    value = normalizeErrorMonitorConfig(JSON.parse(rec.configValue || '{}'))
  } catch { /* 无配置记录 → 默认 */ }
  cachedConfig = { value, at: now }
  return value
}

/** 手动失效配置缓存（保存配置后调用，使排噪词立即生效） */
export function invalidateErrorMonitorConfig() {
  cachedConfig = null
}

/**
 * 保存错误采集开关与排噪词；配置记录的存取收口在错误监控域，页面不得再经通用配置 API 绕过运维门禁。
 */
export async function saveErrorMonitorConfig(
  pb: any,
  input: { enabled: boolean, ignoreKeywords: readonly string[] },
): Promise<ErrorMonitorConfig> {
  const value = normalizeErrorMonitorConfig(input)
  const configValue = JSON.stringify(value)
  const existing = await pb.collection('configs')
    .getFirstListItem('configKey = "error_monitor"', { $autoCancel: false })
    .catch(() => null)
  if (existing) {
    await pb.collection('configs').update(existing.id, { configValue }, { $autoCancel: false })
  }
  else {
    await pb.collection('configs').create({
      configName: '错误监控配置',
      configKey: 'error_monitor',
      configValue,
      configType: 'Y',
      remark: '错误采集开关与排噪关键字（命中即忽略）',
    }, { $autoCancel: false })
  }
  invalidateErrorMonitorConfig()
  return value
}

function clip(s: string | undefined, max: number): string {
  if (!s) return ''
  return s.length > max ? s.slice(0, max) : s
}

/** 归一化消息用于指纹：去掉数字串/uuid/十六进制，避免「同类错误因 id 不同」无法聚合 */
function normalize(msg: string): string {
  return msg
    .toLowerCase()
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '#')
    .replace(/\d+/g, '#')
    .trim()
    .slice(0, 200)
}

function fingerprint(input: ErrorLogInput): string {
  const urlPath = (input.url || '').split('?')[0]
  const raw = `${input.source}|${normalize(input.message)}|${urlPath}`
  return createHash('md5').update(raw).digest('hex')
}

/**
 * 记录一条错误（去重聚合 + 排噪 + 门控）。永不抛错——失败仅 console.warn。
 * @returns true=已记录/聚合，false=被门控或排噪丢弃
 */
export async function recordError(pb: any, input: ErrorLogInput): Promise<boolean> {
  try {
    if (!input?.message) return false
    const config = await getErrorMonitorConfig(pb)
    if (!config.enabled) return false

    // 关键字排噪：命中 message/url/stack 任一即丢弃
    if (config.ignoreKeywords.length) {
      const haystack = `${input.message} ${input.url || ''} ${input.stack || ''}`.toLowerCase()
      if (config.ignoreKeywords.some(k => haystack.includes(k))) return false
    }

    const fp = fingerprint(input)
    const nowIso = new Date().toISOString()

    // 去重聚合：同指纹 + 未处理(new) 的存量记录 → 累加次数、刷新 lastSeen
    try {
      const existing = await pb.collection('error_logs').getFirstListItem(
        `fingerprint = "${escapeFilterValue(fp)}" && status = "new"`,
        { $autoCancel: false },
      )
      await pb.collection('error_logs').update(existing.id, {
        count: (existing.count || 1) + 1,
        lastSeen: nowIso,
        // 用最新一次的栈/状态码覆盖，便于查看最近现场
        stack: clip(input.stack, 8000) || existing.stack,
        statusCode: input.statusCode ?? existing.statusCode,
      })
      return true
    } catch { /* 无存量 → 新建 */ }

    await pb.collection('error_logs').create({
      source: input.source,
      level: input.level || 'error',
      message: clip(input.message, 2000),
      stack: clip(input.stack, 8000),
      url: clip(input.url, 500),
      method: clip(input.method, 10),
      statusCode: input.statusCode ?? 0,
      platform: clip(input.platform, 30),
      ua: clip(input.ua, 500),
      userId: clip(input.userId, 50),
      meta: input.meta || {},
      fingerprint: fp,
      count: 1,
      status: 'new',
      lastSeen: nowIso,
    })
    return true
  } catch (e: any) {
    // 错误监控自身失败绝不冒泡（否则会污染原始请求/再次进 errorHandler 形成环）
    console.warn('[error-log] recordError failed:', e?.message || e)
    return false
  }
}
