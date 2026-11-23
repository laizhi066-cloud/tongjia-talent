/**
 * @description 脚本侧唯一 PocketBase 环境读取与本地地址默认值。
 * @file scripts/_pb.mjs
 */
/**
 * 脚本侧 PocketBase 连接配置单一来源。
 * - 自动读取 nuxt-admin 的 .env / .env.production 进 process.env（已存在的不覆盖）
 * - URL 有本地默认(127.0.0.1，★ 不要用 localhost)
 * - 超管凭证一律来自 env（POCKETBASE_ADMIN_EMAIL/PASSWORD），缺失即抛清晰错误（不写假默认）
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseEnvFile } from './lib/env-file.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** 脚本上下文 PocketBase 本地默认地址（★ 用 127.0.0.1，不要 localhost）—— 脚本侧唯一来源。 */
export const PB_URL_DEFAULT = 'http://127.0.0.1:8090'

/** 把 .env / .env.production 读进 process.env（已存在的不覆盖）。SEC-P0-202：共享解析，去行尾注释/引号。 */
export function loadDotEnv() {
  for (const f of ['.env', '.env.production']) {
    const parsed = parseEnvFile(path.join(ROOT, f))
    for (const [k, v] of Object.entries(parsed))
      if (process.env[k] === undefined)
        process.env[k] = v
  }
}

/** 返回 { PB_URL, EMAIL, PASS }；缺超管凭证则抛错，由脚本入口统一设置 exitCode。 */
export function pbEnv() {
  loadDotEnv()
  const PB_URL = process.env.POCKETBASE_URL || PB_URL_DEFAULT
  const EMAIL = process.env.POCKETBASE_ADMIN_EMAIL
  const PASS = process.env.POCKETBASE_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASS
  if (!EMAIL || !PASS) {
    throw new Error('缺少 PocketBase 超管凭证：请先在 nuxt-admin/.env 配置 POCKETBASE_ADMIN_EMAIL 和 POCKETBASE_ADMIN_PASSWORD（或导出为环境变量）后重试。')
  }
  return { PB_URL, EMAIL, PASS }
}

/** 只取 PB 地址（不校验超管凭证），同样收口到 PB_URL_DEFAULT。 */
export function pbUrl() {
  loadDotEnv()
  return process.env.POCKETBASE_URL || PB_URL_DEFAULT
}
