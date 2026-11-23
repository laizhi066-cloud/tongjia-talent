/**
 * @description 服务端唯一 PocketBase 地址、公开文件地址与超管凭据读取。
 * @file server/utils/pb-env.ts
 */
/**
 * PocketBase 连接配置的单一来源。
 * - URL 有合理本地默认(127.0.0.1，★ 不要用 localhost：Node 17+ 解析成 ::1 连不上)
 * - 超管凭证必须由环境(.env / .env.production)提供，缺失即抛清晰错误，绝不用假默认
 */
function required(name: string): string {
  const v = process.env[name]
  if (!v)
    throw new Error(`[配置缺失] 环境变量 ${name} 未设置。请先在 .env / .env.production 配置 PocketBase 超管凭证后再启动。`)
  return v
}

/** 服务端连 PB 的内网地址。 */
export function pbUrl(): string {
  return process.env.POCKETBASE_URL || 'http://127.0.0.1:8090'
}

/** 上传文件/图片的公网前缀；未单独配 POCKETBASE_PUBLIC_URL 则同 pbUrl()。 */
export function pbPublicUrl(): string {
  return process.env.POCKETBASE_PUBLIC_URL || pbUrl()
}

/** PB 超级管理员凭证（必填，缺失抛错）。 */
export function pbAdmin(): { email: string, password: string } {
  return { email: required('POCKETBASE_ADMIN_EMAIL'), password: required('POCKETBASE_ADMIN_PASSWORD') }
}
