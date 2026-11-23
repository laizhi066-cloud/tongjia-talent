/**
 * @description 代码健康与健壮性回归测试：分页解析、JWT Base64URL 解码、树祖先可见性与确认弹窗单次结算。
 * @file test/audit-hardening.test.ts
 */
import { ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { parsePositiveInt } from '../server/utils/crud'
import { jwtExp } from '../app/composables/useAuthSession'
import { useAdminTree } from '../app/composables/useAdminTree'
import { confirmEvent, useConfirm } from '../app/composables/useConfirm'

describe('parsePositiveInt', () => {
  it('解析合法正整数并尊重上限', () => {
    expect(parsePositiveInt('3', 1)).toBe(3)
    expect(parsePositiveInt(25, 10, 100)).toBe(25)
    expect(parsePositiveInt('500', 10, 100)).toBe(100)
  })

  it('非数字、空值、0 或负数时回退默认值而不产生 NaN', () => {
    expect(parsePositiveInt('abc', 1)).toBe(1)
    expect(parsePositiveInt(undefined, 10)).toBe(10)
    expect(parsePositiveInt(null, 20)).toBe(20)
    expect(parsePositiveInt('0', 1)).toBe(1)
    expect(parsePositiveInt('-5', 10, 100)).toBe(10)
  })
})

describe('jwtExp', () => {
  function makeJwt(payloadObj: Record<string, unknown>, base64Url = true): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64')
    let payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64')
    if (base64Url) {
      payload = payload.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    }
    return `${header}.${payload}.sig`
  }

  it('正确解析含 - / _ 且无填充的 Base64URL JWT 过期时间', () => {
    // 构造包含非 ASCII 字符的 payload，确保标准 Base64 中会出现 + 或 / 且长度非 4 的倍数
    const exp = 1900000000
    const token = makeJwt({ exp, note: '同佳天赋>>>???~~~' }, true)
    expect(token.split('.')[1]).not.toContain('=')
    expect(jwtExp(token)).toBe(exp)
  })

  it('无效或缺失 exp 字段时安全返回 0', () => {
    expect(jwtExp('')).toBe(0)
    expect(jwtExp('not-a-jwt')).toBe(0)
    expect(jwtExp('a.!!!invalid!!!.c')).toBe(0)
    expect(jwtExp(makeJwt({ sub: 'u1' }))).toBe(0)
  })
})

describe('useAdminTree', () => {
  it('拍平树并按祖先链在 O(depth) 准确计算可见性', () => {
    const tree = ref([
      {
        id: 'root-1',
        name: '系统管理',
        children: [
          {
            id: 'mid-1',
            name: '权限管理',
            children: [
              { id: 'leaf-1', name: '角色管理' },
            ],
          },
        ],
      },
      { id: 'root-2', name: '工作台' },
    ])

    const { flatNodes, rebuild, toggleExpand, expandAll, collapseAll, isVisible } = useAdminTree(tree)
    rebuild()

    expect(flatNodes.value.map((n) => n.id)).toEqual(['root-1', 'mid-1', 'leaf-1', 'root-2'])
    expect(flatNodes.value[2]!._ancestorIds).toEqual(['root-1', 'mid-1'])

    // 默认全部折叠：仅根节点可见
    expect(isVisible(flatNodes.value[0]!)).toBe(true)
    expect(isVisible(flatNodes.value[1]!)).toBe(false)
    expect(isVisible(flatNodes.value[2]!)).toBe(false)

    // 仅展开 root-1：mid-1 可见，leaf-1 仍不可见
    toggleExpand('root-1')
    expect(isVisible(flatNodes.value[1]!)).toBe(true)
    expect(isVisible(flatNodes.value[2]!)).toBe(false)

    // 再展开 mid-1：leaf-1 可见
    toggleExpand('mid-1')
    expect(isVisible(flatNodes.value[2]!)).toBe(true)

    // 折叠 root-1：即便 mid-1 仍在 expandedKeys，leaf-1 也必须隐藏
    toggleExpand('root-1')
    expect(isVisible(flatNodes.value[1]!)).toBe(false)
    expect(isVisible(flatNodes.value[2]!)).toBe(false)

    // 全展开 / 全折叠
    expandAll()
    expect(isVisible(flatNodes.value[2]!)).toBe(true)
    collapseAll()
    expect(isVisible(flatNodes.value[1]!)).toBe(false)
  })
})

describe('useConfirm', () => {
  it('支持连续确认与取消，不会因旧状态导致 Promise 悬挂', async () => {
    const { confirm } = useConfirm()

    const first = confirm({ content: '第一次操作' })
    expect(confirmEvent.value.visible).toBe(true)
    confirmEvent.value.onConfirm()
    confirmEvent.value.visible = false
    expect(await first).toBe(true)

    const second = confirm({ content: '第二次操作' })
    expect(confirmEvent.value.visible).toBe(true)
    confirmEvent.value.onCancel()
    confirmEvent.value.visible = false
    expect(await second).toBe(false)
  })

  it('新确认弹窗打开时自动取消前一个未完成弹窗，且单次弹窗只结算一次', async () => {
    const { confirm } = useConfirm()

    const first = confirm({ content: '未完成的弹窗' })
    const second = confirm({ content: '新的弹窗' })

    expect(await first).toBe(false)

    confirmEvent.value.onConfirm()
    confirmEvent.value.onCancel()
    confirmEvent.value.visible = false
    expect(await second).toBe(true)
  })
})
