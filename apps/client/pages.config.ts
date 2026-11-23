/**
 * @description 基础门户的 uni-pages 全局配置，不注册原生业务 TabBar。
 * @file pages.config.ts
 */
import path from 'node:path'
import process from 'node:process'
import { loadEnv } from 'vite'
import { defineUniPages } from '@uni-helper/vite-plugin-uni-pages'

const mode = process.argv.slice(2).find((argument, index, args) => args[index - 1] === '--mode') || (process.argv[2] === 'build' ? 'production' : 'development')
const { VITE_APP_TITLE } = loadEnv(mode, path.resolve(process.cwd(), 'env'))

export default defineUniPages({
  globalStyle: {
    navigationBarTitleText: VITE_APP_TITLE || '同佳天赋',
    navigationStyle: 'custom',
  },
})
