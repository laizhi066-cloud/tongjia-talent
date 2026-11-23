/**
 * @description Vue 错误边界纯逻辑工具：错误归一化、类型识别、友好恢复文案、诊断文本格式化与监控上报载荷构造。
 * @file app/utils/error-boundary.ts
 */

export type BoundaryErrorKind = 'chunk' | 'network' | 'runtime'

export interface CapturedBoundaryError {
  id: string
  kind: BoundaryErrorKind
  name: string
  message: string
  stack: string
  componentName: string
  lifecycleInfo: string
  path: string
  timestamp: string
}

export interface RecoveryCopy {
  title: string
  description: string
  hint: string
}

export interface ClientErrorReportPayload {
  source: 'client'
  level: 'error'
  message: string
  stack: string
  url: string
  platform: string
  ua: string
  meta: Record<string, unknown>
}

interface NormalizeErrorOptions {
  componentName?: string
  lifecycleInfo?: string
  path?: string
  timestamp?: string
  id?: string
}

const MAX_MESSAGE_LENGTH = 2000
const MAX_STACK_LENGTH = 8000
const MAX_URL_LENGTH = 500
const MAX_UA_LENGTH = 500

const CHUNK_ERROR_PATTERNS = [
  /ChunkLoadError/i,
  /Loading chunk [\w-]+ failed/i,
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /error loading dynamically imported module/i,
  /Unable to preload CSS/i,
]

const NETWORK_ERROR_PATTERNS = [
  /NetworkError/i,
  /Failed to fetch/i,
  /Load failed/i,
  /ERR_NETWORK/i,
  /ECONNREFUSED/i,
  /network request failed/i,
]

/** 生成简短可读的错误追踪编号，便于用户反馈与日志检索。 */
export function createBoundaryErrorId(now = Date.now(), random = Math.random()): string {
  const timePart = now.toString(36).slice(-4).toUpperCase()
  const randPart = Math.floor(random * 1679616).toString(36).padStart(4, '0').slice(0, 4).toUpperCase()
  return `ERR-${timePart}${randPart}`
}

/** 从 Vue 组件实例中安全提取组件名，避免访问空引用或内部私有结构时再次抛错。 */
export function extractComponentName(instance: unknown): string {
  if (!instance || typeof instance !== 'object')
    return 'UnknownComponent'

  const record = instance as {
    $options?: { name?: unknown, __name?: unknown }
    type?: { name?: unknown, __name?: unknown }
  }

  const candidates = [
    record.$options?.name,
    record.$options?.__name,
    record.type?.name,
    record.type?.__name,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim())
      return candidate.trim()
  }

  return 'AnonymousComponent'
}

/** 按异常名称与消息区分动态分包加载失败、网络波动和普通运行时错误。 */
export function classifyBoundaryError(message: string, name = ''): BoundaryErrorKind {
  const combined = `${name} ${message}`
  if (CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(combined)))
    return 'chunk'
  if (NETWORK_ERROR_PATTERNS.some((pattern) => pattern.test(combined)))
    return 'network'
  return 'runtime'
}

function readRawErrorParts(err: unknown): { name: string, message: string, stack: string } {
  if (err instanceof Error) {
    return {
      name: err.name || 'Error',
      message: err.message || err.name || '未知运行时错误',
      stack: err.stack || '',
    }
  }

  if (typeof err === 'string') {
    const trimmed = err.trim()
    return {
      name: 'Error',
      message: trimmed || '未知运行时错误',
      stack: '',
    }
  }

  if (err && typeof err === 'object') {
    const record = err as Record<string, unknown>
    const name = typeof record.name === 'string' && record.name.trim() ? record.name.trim() : 'Error'
    const rawMsg = record.message ?? record.statusMessage ?? record.reason
    let message = ''
    if (typeof rawMsg === 'string' && rawMsg.trim()) {
      message = rawMsg.trim()
    }
    else {
      try {
        message = JSON.stringify(err)
      }
      catch {
        message = String(err)
      }
    }
    const stack = typeof record.stack === 'string' ? record.stack : ''
    return {
      name,
      message: message || '未知运行时错误',
      stack,
    }
  }

  return {
    name: 'Error',
    message: err == null ? '未知运行时错误' : String(err),
    stack: '',
  }
}

/** 将任意被捕获异常归一化为有界、安全的结构化错误对象。 */
export function normalizeCapturedError(err: unknown, options: NormalizeErrorOptions = {}): CapturedBoundaryError {
  const { name, message, stack } = readRawErrorParts(err)
  const boundedMessage = message.slice(0, MAX_MESSAGE_LENGTH)
  const boundedStack = stack.slice(0, MAX_STACK_LENGTH)

  return {
    id: options.id || createBoundaryErrorId(),
    kind: classifyBoundaryError(boundedMessage, name),
    name: name.slice(0, 120),
    message: boundedMessage,
    stack: boundedStack,
    componentName: (options.componentName || 'UnknownComponent').slice(0, 160),
    lifecycleInfo: (options.lifecycleInfo || 'render').slice(0, 160),
    path: (options.path || '/').slice(0, MAX_URL_LENGTH),
    timestamp: options.timestamp || new Date().toISOString(),
  }
}

/** 根据错误类型与连续重试次数生成面向用户的中文恢复引导文案。 */
export function getRecoveryCopy(captured: CapturedBoundaryError, retryCount = 0): RecoveryCopy {
  if (captured.kind === 'chunk') {
    return {
      title: '页面资源已更新或加载失败',
      description: '系统可能刚刚发布了新版本，或部分页面脚本未能加载完成。刷新页面即可获取最新资源。',
      hint: retryCount >= 1
        ? '建议点击「刷新页面」重新加载完整资源。'
        : '您可以先尝试「重试恢复」，或直接刷新页面。',
    }
  }

  if (captured.kind === 'network') {
    return {
      title: '页面加载受网络波动影响',
      description: '当前网络连接不稳定，导致页面运行所需数据或模块中断。请检查网络后重试。',
      hint: retryCount >= 2
        ? '多次重试仍未恢复，请确认网络连接正常后刷新页面。'
        : '点击「重试恢复」可重新渲染当前视图，无需重新登录。',
    }
  }

  return {
    title: '页面运行出现异常',
    description: '当前页面在渲染或交互过程中发生了未预期错误，系统已自动拦截并记录本次异常，不影响其他功能使用。',
    hint: retryCount >= 2
      ? '连续重试后仍出现相同异常，建议点击「刷新页面」或返回工作台，并复制错误详情反馈给技术人员。'
      : '您可以点击「重试恢复」重新加载当前区域，或切换至其他页面继续操作。',
  }
}

/** 构造可供用户一键复制的纯文本诊断报告。 */
export function formatDiagnosticReport(captured: CapturedBoundaryError): string {
  const lines = [
    `错误编号: ${captured.id}`,
    `发生时间: ${captured.timestamp}`,
    `页面路径: ${captured.path}`,
    `异常分类: ${captured.kind}`,
    `来源组件: ${captured.componentName}`,
    `生命周期: ${captured.lifecycleInfo}`,
    `异常信息: ${captured.name}: ${captured.message}`,
  ]
  if (captured.stack) {
    lines.push('', '堆栈信息:', captured.stack)
  }
  return lines.join('\n')
}

/** 构造符合 /api/client/client-error 校验规则的上报载荷。 */
export function buildClientErrorPayload(
  captured: CapturedBoundaryError,
  userAgent = '',
): ClientErrorReportPayload {
  const prefix = captured.componentName && captured.componentName !== 'UnknownComponent'
    ? `[${captured.componentName}:${captured.lifecycleInfo}] `
    : ''
  return {
    source: 'client',
    level: 'error',
    message: `${prefix}${captured.message}`.slice(0, MAX_MESSAGE_LENGTH),
    stack: captured.stack.slice(0, MAX_STACK_LENGTH),
    url: captured.path.slice(0, MAX_URL_LENGTH),
    platform: 'admin-h5',
    ua: userAgent.slice(0, MAX_UA_LENGTH),
    meta: {
      kind: 'vue-error-boundary',
      errorId: captured.id,
      errorKind: captured.kind,
      errorName: captured.name,
      componentName: captured.componentName,
      lifecycleInfo: captured.lifecycleInfo,
      timestamp: captured.timestamp,
    },
  }
}
