/**
 * @description 基础门户仅支持 H5 与微信小程序的 uni-app 清单配置。
 * @file manifest.config.ts
 */
import path from 'node:path'
import process from 'node:process'
import { defineManifestConfig } from '@uni-helper/vite-plugin-uni-manifest'
import { loadEnv } from 'vite'

/** 从运行命令解析 Vite 环境模式。 */
function getMode(): string {
  const args = process.argv.slice(2)
  const modeIndex = args.findIndex(argument => argument === '--mode')
  return modeIndex >= 0 ? args[modeIndex + 1] || 'development' : args[0] === 'build' ? 'production' : 'development'
}

const env = loadEnv(getMode(), path.resolve(process.cwd(), 'env'))

export default defineManifestConfig({
  'name': env.VITE_APP_TITLE || '同佳天赋',
  'appid': env.VITE_UNI_APPID,
  'versionName': env.VITE_APP_VERSION || '1.0.0',
  'versionCode': '100',
  'locale': env.VITE_FALLBACK_LOCALE || 'zh-Hans',
  'h5': {
    router: { base: env.VITE_APP_PUBLIC_BASE },
  },
  'mp-weixin': {
    appid: env.VITE_WX_APPID,
    setting: {
      urlCheck: false,
      es6: true,
      minified: true,
    },
    usingComponents: true,
  },
  'vueVersion': '3',
})
