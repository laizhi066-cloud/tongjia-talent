/**
 * @description 天赋报告 OSS 开关与配置边界测试（M8 前置配置；旧 `talent-report-pdf.ts`
 *   随 M6 删除，PDF 上传链路由 M8-A 的 talent-pdf-storage / talent-pdf-service 承接）。
 * @file test/talent-oss.test.ts
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getOssConfig, isOssEnabled } from '../server/utils/oss-config'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('report OSS configuration', () => {
  it('关闭时返回本地存储模式', () => {
    vi.stubEnv('OSS_ENABLED', '')
    expect(isOssEnabled()).toBe(false)
    expect(getOssConfig()).toBeNull()
  })

  it('开启时读取 tongjia-backend 的深圳 OSS 默认配置', () => {
    vi.stubEnv('OSS_ENABLED', 'true')
    vi.stubEnv('OSS_ACCESS_KEY_ID', 'test-id')
    vi.stubEnv('OSS_ACCESS_KEY_SECRET', 'test-secret')

    expect(getOssConfig()).toMatchObject({
      endpoint: 'oss-cn-shenzhen.aliyuncs.com',
      region: 'cn-shenzhen',
      bucket: 'zhihuitongjia2026',
      publicBaseUrl: 'https://zhihuitongjia2026.oss-cn-shenzhen.aliyuncs.com',
    })
  })

  it('开启但缺少密钥时拒绝启动上传', () => {
    vi.stubEnv('OSS_ENABLED', '1')
    vi.stubEnv('OSS_ACCESS_KEY_ID', '')
    vi.stubEnv('OSS_ACCESS_KEY_SECRET', '')
    expect(() => getOssConfig()).toThrow('OSS_ENABLED=true')
  })
})
