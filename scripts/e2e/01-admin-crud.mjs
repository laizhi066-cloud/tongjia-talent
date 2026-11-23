/**
 * @description 后台新域只读烟测（M6 重写，替代旧「分类/要素/内容库/模板/会员 CRUD」）：
 *   M1 规则 / M2 会员 / M3 报告 / M5 建议 / M6 工作台的列表与详情入口可读；
 *   旧 [resource] 动态路由与旧资源列表返回 404（旧口径入口 0）。
 *   **不写库**：只读与 preview 接口，避免污染演示数据。
 * @file scripts/e2e/01-admin-crud.mjs
 */
import { ACCOUNTS, adminLogin, check, makeApi, summary } from './lib.mjs'

const token = await adminLogin()
const api = makeApi(token)

const READ_ENDPOINTS = [
  ['工作台', '/api/admin/talent/dashboard'],
  ['会员列表', '/api/admin/talent/members?page=1&pageSize=5'],
  ['培养方向', '/api/admin/talent/directions?page=1&pageSize=5'],
  ['目标档位', '/api/admin/talent/tiers?page=1&pageSize=5'],
  ['潜质要素库', '/api/admin/talent/factor-libraries?page=1&pageSize=5'],
  ['分级', '/api/admin/talent/levels?page=1&pageSize=5'],
  ['固定注解', '/api/admin/talent/factor-notes?page=1&pageSize=5'],
  ['基因报告', '/api/admin/talent/reports?page=1&pageSize=5'],
  ['培育建议', '/api/admin/talent/advice?page=1&pageSize=5'],
  ['建议版本', '/api/admin/talent/advice/versions'],
  ['报告同步日志', '/api/admin/talent/reports/sync-logs?page=1&pageSize=5'],
  ['待归并方向', '/api/admin/talent/direction-requests?page=1&pageSize=5'],
  ['集成状态', '/api/admin/talent/integrations/status'],
]

console.log('\n── 新域只读列表 ──')
for (const [label, path] of READ_ENDPOINTS) {
  const res = await api(path)
  check(`${label} 可读`, res.status === 200, `status=${res.status} ${res.message || ''}`)
}

console.log('\n── 旧口径 API 必须 404（M6 清理回归）──')
const LEGACY_ENDPOINTS = [
  '/api/admin/talent/customer?page=1&pageSize=5',
  '/api/admin/talent/category?page=1&pageSize=5',
  '/api/admin/talent/element?page=1&pageSize=5',
  '/api/admin/talent/library?page=1&pageSize=5',
  '/api/admin/talent/template?page=1&pageSize=5',
  '/api/admin/talent/report?page=1&pageSize=5',
  '/api/admin/talent/institution?page=1&pageSize=5',
  '/api/admin/talent/authorization',
  '/api/admin/talent/plan?page=1&pageSize=5',
  '/api/admin/talent/plan-selections',
  '/api/admin/talent/matching',
  '/api/admin/talent/sync-config',
  '/api/admin/talent/sync-logs',
  '/api/org/talent/context',
  '/api/org/talent/members?page=1&pageSize=5',
  '/api/org/talent/reports',
  '/api/org/talent/plans',
  '/api/integrations/talent/reports',
  '/api/client/talent/binding',
  '/api/client/talent/plans',
  '/api/client/talent/plan-selections',
]
for (const path of LEGACY_ENDPOINTS) {
  const res = await api(path)
  check(`旧路由 404 ${path}`, res.status === 404, `status=${res.status}`)
}

console.log('\n── 报告一键同步 preview（零写入）──')
const preview = await api('/api/admin/talent/reports/sync', {
  method: 'POST',
  body: { mode: 'preview' },
})
check('报告同步 preview 可用', preview.status === 200, `status=${preview.status} ${preview.message || ''}`)

console.log(`\n账号：${ACCOUNTS.superAdmin.identity}（superAdmin，只读用例）`)
summary('B 端新域只读烟测')