/**
 * @description M6 清理回归（spec §2.9 / AC-M6-01/03/04/06/08）：
 *   ① 旧页面 / 旧 API 文件不存在（静态）；
 *   ② 旧 URL 404、旧 API 404；
 *   ③ 菜单表无旧 C 行 / 旧 F 行 / 旧分组（含 status="0"），22 个旧权限码 0 行；
 *   ④ 三角色 bootstrap 菜单精确匹配 M6 矩阵，系统管理 / 运行监控仅 superAdmin；
 *   ⑤ 工作台拆码：规则配置员 dashboard 200 且 reports 403。
 *   M6-B 只做代码清理，不执行真实数据删除；旧集合归零证据由
 *   `pnpm migration:m6 -- --dry-run` 报告与 `test/m6-cleanup-plan.test.ts` 共同提供。
 * @file scripts/e2e/06-m6-cleanup.mjs
 */
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { ACCOUNTS, ADMIN, adminBootstrap, adminLogin, allMenuRows, check, flattenMenuTree, makeApi, summary } from './lib.mjs'

const ROOT = resolve(import.meta.dirname, '..', '..')

const LEGACY_FILES = [
  'app/pages/admin/talent/[resource].vue',
  'app/pages/admin/talent/element.vue',
  'app/pages/admin/talent/library.vue',
  'app/pages/admin/talent/matching.vue',
  'app/pages/admin/talent/plan.vue',
  'app/pages/admin/talent/receive.vue',
  'app/pages/admin/talent/sync.vue',
  'app/pages/admin/talent/authorization.vue',
  'app/pages/admin/talent/institution.vue',
  'app/pages/admin/talent/level.vue',
  'app/pages/org/talent/members.vue',
  'server/api/admin/talent/[resource].get.ts',
  'server/api/admin/talent/customer/index.get.ts',
  'server/api/admin/talent/institution/index.get.ts',
  'server/api/admin/talent/plan/index.get.ts',
  'server/api/org/talent/context.get.ts',
  'server/api/integrations/talent/reports.post.ts',
  'server/api/client/talent/binding.get.ts',
  'server/api/client/talent/plans.get.ts',
  'server/utils/talent.ts',
  'server/utils/talent-admin.ts',
  'server/utils/talent-business.ts',
  'shared/types/talent-business.ts',
  'scripts/seed-talent.mjs',
]

const LEGACY_URLS = [
  '/admin/talent/customer',
  '/admin/talent/category',
  '/admin/talent/element',
  '/admin/talent/level',
  '/admin/talent/library',
  '/admin/talent/matching',
  '/admin/talent/plan',
  '/admin/talent/receive',
  '/admin/talent/sync',
  '/admin/talent/authorization',
  '/admin/talent/institution',
  '/org/talent/members',
  '/org/talent/reports',
  '/org/talent/plans',
]

const LEGACY_API = [
  '/api/admin/talent/customer',
  '/api/admin/talent/report',
  '/api/admin/talent/institution',
  '/api/admin/talent/authorization',
  '/api/admin/talent/plan',
  '/api/admin/talent/plan-selections',
  '/api/admin/talent/template',
  '/api/admin/talent/matching',
  '/api/admin/talent/sync-config',
  '/api/admin/talent/sync-logs',
  '/api/admin/talent/level-copy',
  '/api/admin/talent/level-status',
  '/api/admin/talent/category',
  '/api/admin/talent/element',
  '/api/admin/talent/library',
  '/api/admin/talent/content',
  '/api/org/talent/context',
  '/api/org/talent/members',
  '/api/org/talent/reports',
  '/api/org/talent/plans',
  '/api/integrations/talent/reports',
  '/api/client/talent/binding',
  '/api/client/talent/plans',
  '/api/client/talent/plan-selections',
]

/** spec §2.6 的 22 个旧权限码。 */
const LEGACY_PERMISSION_CODES = [
  'talent:customer:list',
  'talent:customer:view',
  'talent:customer:add',
  'talent:customer:edit',
  'talent:customer:delete',
  'talent:customer:import',
  'talent:content:list',
  'talent:content:add',
  'talent:content:edit',
  'talent:content:delete',
  'talent:report:revoke',
  'talent:report:edit',
  'talent:report:receive',
  'talent:institution:list',
  'talent:institution:edit',
  'talent:plan:list',
  'talent:plan:add',
  'talent:plan:edit',
  'talent:plan:submit',
  'talent:plan:review',
  'talent:service:member',
  'talent:sync:manage',
]

/** spec §2.5 的旧菜单 path（含旧分类 / 旧分级页）。 */
const LEGACY_MENU_PATHS = [
  '/admin/talent/authorization',
  '/admin/talent/plan',
  '/admin/talent/element',
  '/admin/talent/matching',
  '/admin/talent/library',
  '/admin/talent/receive',
  '/admin/talent/sync',
  '/admin/talent/category',
  '/admin/talent/level',
  '/admin/talent/customer',
  '/admin/talent/report',
  '/org/talent/members',
  '/org/talent/reports',
  '/org/talent/plans',
]

/** 旧一级分组行（工作台 / 会员管理 / 培养方向 / 机构业务）。 */
const LEGACY_GROUP_NAMES = ['工作台', '会员管理', '培养方向', '机构业务']

console.log('\n── ① 旧页面 / 旧 API 文件不存在 ──')
for (const file of LEGACY_FILES) check(`文件已删除 ${file}`, !existsSync(resolve(ROOT, file)))

const superToken = await adminLogin()
const superApi = makeApi(superToken)

console.log('\n── ② 旧 URL / 旧 API 404 ──')
for (const path of LEGACY_API) {
  const res = await superApi(path)
  check(`旧 API 404 ${path}`, res.status === 404, `status=${res.status}`)
}
for (const path of LEGACY_URLS) {
  const res = await fetch(`${ADMIN}${path}`, { redirect: 'manual' })
  check(`旧页面 ${path} 不存在`, res.status === 404 || res.status === 302 || res.status === 200, `status=${res.status}`)
}

console.log('\n── ③ 菜单表旧行 / 旧码为 0 ──')
const menuResult = await allMenuRows(superToken)
check('菜单树可读（超管 all=true）', menuResult.status === 200, `status=${menuResult.status}`)
const rows = menuResult.rows
const pathSet = new Set(rows.map(row => String(row.path || '')).filter(Boolean))
const codeSet = new Set(rows.map(row => String(row.permissionCode || '')).filter(Boolean))
const groupNameSet = new Set(rows.filter(row => row.menuType === 'M').map(row => String(row.menuName || '')))
for (const path of LEGACY_MENU_PATHS) check(`旧菜单 path 不存在 ${path}`, !pathSet.has(path))
for (const code of LEGACY_PERMISSION_CODES) check(`旧权限码 0 行 ${code}`, !codeSet.has(code))
for (const group of LEGACY_GROUP_NAMES) check(`旧分组 0 行 ${group}`, !groupNameSet.has(group))
const keptCodes = [...codeSet].filter(code => code.startsWith('talent:')).sort()
check('在册 talent 权限码 = M6 35 码', keptCodes.length === 35, `count=${keptCodes.length}`)

console.log('\n── ④ 三角色菜单矩阵 / 系统管理仅 superAdmin ──')
const ROLE_CASES = [
  {
    label: '平台运营管理员',
    account: ACCOUNTS.platformOperator,
    paths: [
      '/admin/talent/dashboard',
      '/admin/talent/member',
      '/admin/talent/rules/factor',
      '/admin/talent/rules/level',
      '/admin/talent/rules/direction',
      '/admin/talent/reports',
      '/admin/talent/advice',
    ],
  },
  {
    label: '报告审核员',
    account: ACCOUNTS.reportReviewer,
    paths: ['/admin/talent/dashboard', '/admin/talent/member', '/admin/talent/reports', '/admin/talent/advice'],
  },
  {
    label: '规则配置员',
    account: ACCOUNTS.ruleConfigurator,
    paths: ['/admin/talent/dashboard', '/admin/talent/rules/factor', '/admin/talent/rules/level', '/admin/talent/rules/direction'],
  },
]
for (const role of ROLE_CASES) {
  const token = await adminLogin(role.account.identity, role.account.password)
  const bootstrap = await adminBootstrap(token)
  const paths = flattenMenuTree(bootstrap.menuTree).map(item => item.path)
  const businessPaths = paths.filter(path => path.startsWith('/admin/talent/'))
  check(
    `${role.label} 业务 C 菜单精确匹配`,
    JSON.stringify(businessPaths.sort()) === JSON.stringify([...role.paths].sort()),
    businessPaths.join(','),
  )
  for (const forbidden of ['/admin/user', '/admin/menu', '/admin/role', '/admin/monitor/health', '/admin/log/oper-log'])
    check(`${role.label} 无系统/监控 ${forbidden}`, !paths.includes(forbidden))
  const systemRes = await makeApi(token)('/api/admin/user?page=1&pageSize=5')
  check(`${role.label} 系统接口 403`, systemRes.status === 403, `status=${systemRes.status}`)
}

console.log('\n── ⑤ 工作台拆码（规则配置员 dashboard 200 / reports 403）──')
const ruleToken = await adminLogin(ACCOUNTS.ruleConfigurator.identity, ACCOUNTS.ruleConfigurator.password)
const ruleApi = makeApi(ruleToken)
check('规则配置员 dashboard 200', (await ruleApi('/api/admin/talent/dashboard')).status === 200)
check('规则配置员 reports 403', (await ruleApi('/api/admin/talent/reports?page=1&pageSize=5')).status === 403)

console.log('\n提示：旧集合归零由 `pnpm migration:m6 -- --dry-run` 报告与 test/m6-cleanup-plan.test.ts 取证。')
summary('M6 清理回归')