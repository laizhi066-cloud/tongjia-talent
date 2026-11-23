/**
 * @description 构建前校验微信小程序各环境的 Nuxt API 完整地址。
 * @file scripts/check-mp-api-env.mjs
 */
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'

const clientRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const mode = process.argv[2] || 'production'
const fileEnv = loadEnv(mode, path.join(clientRoot, 'env'))
const env = { ...fileEnv, ...process.env }

/** 小程序不支持浏览器同源相对路径；这里只校验公开 API URL，不打印值。 */
function isCompleteHttpUrl(value) {
  return /^https?:\/\/[^\s/?#@:]+(?::\d{1,5})?(?:\/[^\s?#]*)?$/i.test(String(value || '').trim())
}

const developSource = env.VITE_SERVER_BASEURL__WEIXIN_DEVELOP
  ? 'VITE_SERVER_BASEURL__WEIXIN_DEVELOP'
  : 'VITE_SERVER_BASEURL'
const developUrl = env[developSource]

if (!isCompleteHttpUrl(developUrl)) {
  throw new Error(
    `[client:env] ${mode} mode 的 ${developSource} 必须是完整 http(s) URL；微信小程序不能使用 / 或相对路径。`,
  )
}

for (const version of ['TRIAL', 'RELEASE']) {
  const key = `VITE_SERVER_BASEURL__WEIXIN_${version}`
  const value = env[key]
  if (value && !/^https:\/\//i.test(String(value).trim()))
    throw new Error(`[client:env] ${key} 必须使用 HTTPS 地址。`)
}

console.log(`[client:env] ${mode} mode 微信小程序 API 地址检查通过（来源：${developSource}）。`)
