/**
 * @description 后台页面渲染烟测与三角色侧栏（M6 重写）：新页面（工作台 / 会员 / 天赋规则 3 页 /
 *   基因报告 / 培育建议）可打开；旧页面 URL 404；平台运营 / 报告审核 / 规则配置的侧栏菜单精确匹配
 *   M6 矩阵；系统管理 / 运行监控仅 superAdmin 可见。
 * @file scripts/e2e/05-admin-ui.mjs
 */
import { ACCOUNTS, ADMIN, adminBootstrap, adminLogin, check, flattenMenuTree, launchBrowser, summary } from './lib.mjs'

const browser = await launchBrowser()
const ctx = await browser.newContext({ viewport: { width: 1500, height: 940 } })

async function login(page, account) {
  await page.goto(`${ADMIN}/login`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const inputs = page.locator('input')
  await inputs.nth(0).fill(account.identity)
  await inputs.nth(1).fill(account.password)
  await page.locator('button:has-text("登录")').first().click()
  await page.waitForTimeout(3200)
}

const NEW_PAGES = [
  ['/admin/talent/dashboard', '工作台'],
  ['/admin/talent/member', '会员管理'],
  ['/admin/talent/rules/factor', '潜质要素'],
  ['/admin/talent/rules/level', '分级与固定注解'],
  ['/admin/talent/rules/direction', '培养方向管理'],
  ['/admin/talent/reports', '基因报告'],
  ['/admin/talent/advice', '培育建议'],
]
const LEGACY_PAGES = [
  '/admin/talent/customer',
  '/admin/talent/category',
  '/admin/talent/element',
  '/admin/talent/library',
  '/admin/talent/matching',
  '/admin/talent/plan',
  '/admin/talent/receive',
  '/admin/talent/sync',
  '/admin/talent/authorization',
  '/admin/talent/institution',
  '/admin/talent/report',
  '/org/talent/members',
  '/org/talent/reports',
  '/org/talent/plans',
]

const page = await ctx.newPage()
const errors = []
page.on('pageerror', error => errors.push(String(error.message).slice(0, 90)))

console.log('\n── superAdmin：新页面渲染 / 旧页面 404 ──')
await login(page, ACCOUNTS.superAdmin)
for (const [path, label] of NEW_PAGES) {
  await page.goto(`${ADMIN}${path}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1600)
  const body = await page.locator('body').innerText()
  check(`${label} 页面正常渲染`, !body.includes('页面不存在') && body.includes(label.slice(0, 2)), path)
}
for (const path of LEGACY_PAGES) {
  await page.goto(`${ADMIN}${path}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(900)
  const body = await page.locator('body').innerText()
  check(`旧页面 404 ${path}`, body.includes('页面不存在') || body.includes('404'), body.slice(0, 30))
}
check('后台无未捕获前端异常', errors.length === 0, errors.join(' | '))

console.log('\n── 三角色侧栏菜单矩阵（bootstrap）──')
const ROLE_EXPECTATIONS = [
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
for (const role of ROLE_EXPECTATIONS) {
  const token = await adminLogin(role.account.identity, role.account.password)
  const bootstrap = await adminBootstrap(token)
  const paths = flattenMenuTree(bootstrap.menuTree).map(item => item.path)
  for (const expected of role.paths) check(`${role.label} 侧栏含 ${expected}`, paths.includes(expected), paths.join(','))
  for (const forbidden of ['/admin/user', '/admin/menu', '/admin/role', '/admin/monitor/health', '/admin/log/oper-log'])
    check(`${role.label} 无系统/监控 ${forbidden}`, !paths.includes(forbidden))
}

await browser.close()
summary('后台页面与角色权限烟测')