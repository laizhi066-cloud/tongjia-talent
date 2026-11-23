/**
 * @description 防止基础版微信配置页面再次引用不存在的后台 API。
 * @file test/foundation-wechat-settings.test.ts
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(import.meta.dirname, '..')
const apiRoot = resolve(ROOT, 'server/api/admin/settings/wechat')

describe('foundation WeChat settings contract', () => {
  it('为微信配置页面提供读取、保存和凭据验证端点', () => {
    const routes = ['../wechat.get.ts', '../wechat.post.ts', 'test.post.ts']
    for (const route of routes)
      expect(existsSync(resolve(apiRoot, route))).toBe(true)
  })

  it('保存端点加密保存密钥且读取端点只返回掩码', () => {
    const getRoute = readFileSync(resolve(apiRoot, '../wechat.get.ts'), 'utf8')
    const saveRoute = readFileSync(resolve(apiRoot, '../wechat.post.ts'), 'utf8')

    expect(getRoute).toContain('maskSecret')
    expect(saveRoute).toContain('resolveSecret')
    expect(saveRoute).toContain('withOperLog')
    expect(saveRoute).toContain('updateWechatSettingsSchema')
  })

  it('未填写凭据时返回可预期的参数提示，不写入 5xx 错误监控', () => {
    const testRoute = readFileSync(resolve(apiRoot, 'test.post.ts'), 'utf8')

    expect(testRoute).toContain('getWxCreds')
    expect(testRoute).toContain('statusCode: 400')
  })
})
