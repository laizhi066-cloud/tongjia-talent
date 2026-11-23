/**
 * @description 阿里云 OSS 服务端开关与环境变量解析，不加载 OSS SDK。
 * @file server/utils/oss-config.ts
 */
export interface OssConfig {
  endpoint: string
  region: string
  bucket: string
  accessKeyId: string
  accessKeySecret: string
  publicBaseUrl: string
}

function readEnv(name: string): string {
  return String(process.env[name] || '').trim()
}

function isTruthy(value: string): boolean {
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

/** OSS 开关；未开启时调用方应使用项目本地存储。 */
export function isOssEnabled(): boolean {
  return isTruthy(readEnv('OSS_ENABLED'))
}

/**
 * 读取并校验 OSS 配置。关闭 OSS 时返回 null；开启但缺配置时直接报错，避免报告生成后得到不可用链接。
 */
export function getOssConfig(): OssConfig | null {
  if (!isOssEnabled()) return null

  const endpoint = readEnv('OSS_ENDPOINT') || 'oss-cn-shenzhen.aliyuncs.com'
  const region = readEnv('OSS_REGION') || 'cn-shenzhen'
  const bucket = readEnv('OSS_BUCKET') || 'zhihuitongjia2026'
  const accessKeyId = readEnv('OSS_ACCESS_KEY_ID')
  const accessKeySecret = readEnv('OSS_ACCESS_KEY_SECRET')
  const endpointHost = endpoint.replace(/^https?:\/\//i, '').replace(/\/+$/, '')
  const publicBaseUrl = (readEnv('OSS_PUBLIC_BASE_URL') || `https://${bucket}.${endpointHost}`).replace(/\/+$/, '')
  const missing = [
    !accessKeyId && 'OSS_ACCESS_KEY_ID',
    !accessKeySecret && 'OSS_ACCESS_KEY_SECRET',
  ].filter((value): value is string => Boolean(value))
  if (missing.length)
    throw new Error(`OSS_ENABLED=true 但缺少配置：${missing.join('、')}`)

  return { endpoint, region, bucket, accessKeyId, accessKeySecret, publicBaseUrl }
}
