/**
 * @description Vue 错误边界工具逻辑单元测试：错误归一化、分包/网络/运行时分类、恢复文案、诊断报告与上报载荷。
 * @file test/error-boundary.test.ts
 */
import { describe, expect, it } from 'vitest'
import {
  buildClientErrorPayload,
  classifyBoundaryError,
  createBoundaryErrorId,
  extractComponentName,
  formatDiagnosticReport,
  getRecoveryCopy,
  normalizeCapturedError,
} from '../app/utils/error-boundary'

describe('error-boundary utilities', () => {
  it('createBoundaryErrorId 生成标准可读前缀与定长编号', () => {
    const id = createBoundaryErrorId(1700000000000, 0.5)
    expect(id).toMatch(/^ERR-[0-9A-Z]{8}$/)
  })

  it('extractComponentName 兼容 Options/SFC setup/type 名称并安全兜底', () => {
    expect(extractComponentName({ $options: { name: 'TalentDashboard' } })).toBe('TalentDashboard')
    expect(extractComponentName({ $options: { __name: 'MemberList' } })).toBe('MemberList')
    expect(extractComponentName({ type: { name: 'ReportModal' } })).toBe('ReportModal')
    expect(extractComponentName({ type: { __name: 'AdviceBook' } })).toBe('AdviceBook')
    expect(extractComponentName({})).toBe('AnonymousComponent')
    expect(extractComponentName(null)).toBe('UnknownComponent')
  })

  it('classifyBoundaryError 准确识别动态分包失败、网络错误与普通运行时异常', () => {
    expect(classifyBoundaryError('Failed to fetch dynamically imported module: /_nuxt/foo.js')).toBe('chunk')
    expect(classifyBoundaryError('Loading chunk 42 failed', 'ChunkLoadError')).toBe('chunk')
    expect(classifyBoundaryError('Failed to fetch')).toBe('network')
    expect(classifyBoundaryError('NetworkError when attempting to fetch resource.')).toBe('network')
    expect(classifyBoundaryError('Cannot read properties of undefined (reading "id")', 'TypeError')).toBe('runtime')
  })

  it('normalizeCapturedError 兼容 Error / 字符串 / 普通对象 / null 并做长度截断', () => {
    const err = new TypeError('x'.repeat(2500))
    err.stack = 's'.repeat(9000)
    const normalized = normalizeCapturedError(err, {
      componentName: 'DashboardPage',
      lifecycleInfo: 'render function',
      path: '/admin/talent/dashboard',
      id: 'ERR-TEST0001',
      timestamp: '2026-11-23T12:00:00.000Z',
    })

    expect(normalized.id).toBe('ERR-TEST0001')
    expect(normalized.kind).toBe('runtime')
    expect(normalized.name).toBe('TypeError')
    expect(normalized.message.length).toBe(2000)
    expect(normalized.stack.length).toBe(8000)
    expect(normalized.componentName).toBe('DashboardPage')
    expect(normalized.lifecycleInfo).toBe('render function')

    expect(normalizeCapturedError('plain boom').message).toBe('plain boom')
    expect(normalizeCapturedError({ statusMessage: '自定义对象异常' }).message).toBe('自定义对象异常')
    expect(normalizeCapturedError(null).message).toBe('未知运行时错误')
  })

  it('getRecoveryCopy 按分类与重试次数输出友好中文引导', () => {
    const chunkErr = normalizeCapturedError(new Error('Failed to fetch dynamically imported module'))
    expect(getRecoveryCopy(chunkErr, 0).title).toContain('页面资源')

    const networkErr = normalizeCapturedError(new Error('NetworkError'))
    expect(getRecoveryCopy(networkErr, 0).title).toContain('网络')

    const runtimeErr = normalizeCapturedError(new Error('boom'))
    const firstTry = getRecoveryCopy(runtimeErr, 0)
    const repeatedTry = getRecoveryCopy(runtimeErr, 2)
    expect(firstTry.title).toContain('异常')
    expect(repeatedTry.hint).toContain('刷新页面')
  })

  it('formatDiagnosticReport 与 buildClientErrorPayload 输出完整诊断字段且符合上报契约', () => {
    const captured = normalizeCapturedError(new Error('Render crash'), {
      componentName: 'ReportDetailModal',
      lifecycleInfo: 'mounted hook',
      path: '/admin/talent/reports?id=12',
      id: 'ERR-DIAG1234',
      timestamp: '2026-11-23T12:00:00.000Z',
    })

    const report = formatDiagnosticReport(captured)
    expect(report).toContain('错误编号: ERR-DIAG1234')
    expect(report).toContain('来源组件: ReportDetailModal')
    expect(report).toContain('生命周期: mounted hook')
    expect(report).toContain('页面路径: /admin/talent/reports?id=12')
    expect(report).toContain('异常信息: Error: Render crash')

    const payload = buildClientErrorPayload(captured, 'Mozilla/5.0 TestAgent')
    expect(payload.source).toBe('client')
    expect(payload.level).toBe('error')
    expect(payload.message).toContain('[ReportDetailModal:mounted hook] Render crash')
    expect(payload.url).toBe('/admin/talent/reports?id=12')
    expect(payload.platform).toBe('admin-h5')
    expect(payload.meta).toMatchObject({
      kind: 'vue-error-boundary',
      errorId: 'ERR-DIAG1234',
      componentName: 'ReportDetailModal',
      lifecycleInfo: 'mounted hook',
    })
  })
})
