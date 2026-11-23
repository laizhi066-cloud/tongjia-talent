/**
 * @description M6 三角色权限正反用例（API 层）：平台运营管理员 / 报告审核员 / 规则配置员
 *   逐个账号登录，验证「矩阵内的码 2xx、矩阵外的码 403」；重点回归工作台拆码
 *   （规则配置员 GET /dashboard 200 且 GET /reports 403）与系统管理 / 运行监控仅 superAdmin。
 *   只读用例，不写库。
 * @file scripts/e2e/02-admin-actions.mjs
 */
import { ACCOUNTS, adminLogin, check, makeApi, summary } from './lib.mjs'

/** 角色 × 期望结果：200 表示允许，403 表示越权拦截。 */
const CASES = [
  {
    label: '平台运营管理员',
    account: ACCOUNTS.platformOperator,
    allow: [
      '/api/admin/talent/dashboard',
      '/api/admin/talent/members?page=1&pageSize=5',
      '/api/admin/talent/reports?page=1&pageSize=5',
      '/api/admin/talent/advice?page=1&pageSize=5',
      '/api/admin/talent/directions?page=1&pageSize=5',
      '/api/admin/talent/levels?page=1&pageSize=5',
    ],
    deny: ['/api/admin/user', '/api/admin/role', '/api/admin/menu/tree', '/api/admin/monitor/health', '/api/admin/log/oper-log'],
  },
  {
    label: '报告审核员',
    account: ACCOUNTS.reportReviewer,
    allow: [
      '/api/admin/talent/dashboard',
      '/api/admin/talent/members?page=1&pageSize=5',
      '/api/admin/talent/reports?page=1&pageSize=5',
      '/api/admin/talent/advice?page=1&pageSize=5',
    ],
    deny: [
      '/api/admin/talent/directions?page=1&pageSize=5',
      '/api/admin/talent/levels?page=1&pageSize=5',
      '/api/admin/talent/reports/sync-logs?page=1&pageSize=5',
      '/api/admin/user',
      '/api/admin/monitor/health',
    ],
  },
  {
    label: '规则配置员',
    account: ACCOUNTS.ruleConfigurator,
    allow: [
      '/api/admin/talent/dashboard',
      '/api/admin/talent/directions?page=1&pageSize=5',
      '/api/admin/talent/levels?page=1&pageSize=5',
      '/api/admin/talent/factor-notes?page=1&pageSize=5',
    ],
    deny: [
      '/api/admin/talent/members?page=1&pageSize=5',
      '/api/admin/talent/reports?page=1&pageSize=5',
      '/api/admin/talent/advice?page=1&pageSize=5',
      '/api/admin/members/not-exist/id-no',
      '/api/admin/user',
      '/api/admin/monitor/health',
    ],
  },
]

for (const roleCase of CASES) {
  console.log(`\n── ${roleCase.label}（${roleCase.account.identity}）──`)
  const token = await adminLogin(roleCase.account.identity, roleCase.account.password)
  const api = makeApi(token)
  for (const path of roleCase.allow) {
    const res = await api(path)
    check(`${roleCase.label} 允许 ${path}`, res.status === 200, `status=${res.status}`)
  }
  for (const path of roleCase.deny) {
    const res = await api(path)
    check(`${roleCase.label} 拒绝 ${path}`, res.status === 403 || res.status === 404, `status=${res.status}`)
  }
}

console.log('\n── superAdmin：系统管理 / 运行监控可用 ──')
const superToken = await adminLogin()
const superApi = makeApi(superToken)
for (const path of ['/api/admin/user?page=1&pageSize=5', '/api/admin/menu/tree', '/api/admin/monitor/health']) {
  const res = await superApi(path)
  check(`superAdmin ${path}`, res.status === 200, `status=${res.status}`)
}

summary('M6 三角色权限正反用例')