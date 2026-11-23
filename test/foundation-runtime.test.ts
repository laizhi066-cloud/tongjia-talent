/**
 * @description 验证基础版运行配置不重新引入按站点切换或构建档位开关。
 * @file test/foundation-runtime.test.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(import.meta.dirname, '..')
const runtimeFiles = ['.env.example', 'nuxt.config.ts', 'scripts/env.mjs', 'scripts/setup.mjs']
const retiredConfigurationNames = [
  'TENANT_MODE',
  'CONTROL_PB_URL',
  'DEFAULT_SITE',
  'APP_EDITION',
  'BUILD_PROFILE',
  'X-Site-Slug',
]

describe('foundation runtime configuration', () => {
  it('不包含多站点或交付档位配置', () => {
    for (const file of runtimeFiles) {
      const source = readFileSync(resolve(ROOT, file), 'utf8')
      for (const name of retiredConfigurationNames)
        expect(source, `${file} 不应包含 ${name}`).not.toContain(name)
    }
  })
})
