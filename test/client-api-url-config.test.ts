/**
 * @description 验证微信小程序 production 构建具备开发者工具可用的完整接口地址。
 * @file test/client-api-url-config.test.ts
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const productionEnvPath = path.resolve(process.cwd(), 'apps/client/env/.env.production')

describe('微信小程序接口地址构建配置', () => {
  it('production mode 为开发者工具提供完整 http(s) URL', () => {
    const productionEnv = readFileSync(productionEnvPath, 'utf8')
    expect(productionEnv).toMatch(
      /^\s*VITE_SERVER_BASEURL__WEIXIN_DEVELOP\s*=\s*['"]https?:\/\/[^\s'"#?]+['"]\s*$/m,
    )
  })
})
