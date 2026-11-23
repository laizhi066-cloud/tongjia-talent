/**
 * @description 防止全局错误上报插件指向不存在的基础版 API。
 * @file test/foundation-error-report.test.ts
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(import.meta.dirname, '..')
const routePath = resolve(ROOT, 'server/api/client/client-error.post.ts')
const pluginPath = resolve(ROOT, 'app/plugins/error-report.client.ts')

describe('foundation error reporting contract', () => {
  it('为全局浏览器错误上报提供可容错的接收端点', () => {
    expect(existsSync(routePath)).toBe(true)
    const source = readFileSync(routePath, 'utf8')
    expect(source).toContain('recordError')
    expect(source).toContain('return success({ recorded: false }, \'ignored\')')
  })

  it('前端插件与基础错误上报端点保持一致', () => {
    expect(readFileSync(pluginPath, 'utf8')).toContain('/api/client/client-error')
  })
})
