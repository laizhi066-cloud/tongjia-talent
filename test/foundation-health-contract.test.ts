/**
 * @description 防止健康接口与后台健康页的数据结构再次漂移。
 * @file test/foundation-health-contract.test.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { countFoundationCollections } from '../server/utils/health-service'

const ROOT = resolve(import.meta.dirname, '..')
const servicePath = resolve(ROOT, 'server/utils/health-service.ts')
const apiTypePath = resolve(ROOT, 'app/composables/api/useHealthApi.ts')

describe('foundation health contract', () => {
  it('统计基础集合时排除 PocketBase 内部集合', () => {
    expect(countFoundationCollections([
      { name: 'users' }, { name: '_superusers' }, { name: 'configs' }, { name: '_mfas' }, { name: '' },
    ])).toBe(2)
  })

  it('服务端快照和客户端类型使用相同的关键字段', () => {
    const service = readFileSync(servicePath, 'utf8')
    const client = readFileSync(apiTypePath, 'utf8')

    for (const field of ['pbVersion', 'collections', 'errorSummary', 'unresolved', 'today']) {
      expect(service, `服务端应返回 ${field}`).toContain(field)
      expect(client, `客户端应声明 ${field}`).toContain(field)
    }
  })
})
