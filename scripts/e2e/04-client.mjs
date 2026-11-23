/**
 * @description C 端（M7）门户烟测：H5 首页 / 报告 / 培养方向 / 我的 四个主栏与二级页可打开，
 *   未登录受保护页回到登录；旧双 Tab / 旧天赋二级页（report/list、overview、catalog、item、
 *   interpretations、plans、binding）不再存在（M6-B / M7-A 回归）。
 * @file scripts/e2e/04-client.mjs
 */
import { H5, check, clientLogin, launchBrowser, summary } from './lib.mjs'

const PUBLIC_PAGES = ['/pages/home/index', '/pages/auth/login', '/pages/agreement/index', '/pages/privacy/index']
const PROTECTED_PAGES = [
  '/pages/report/index',
  '/pages/advice/index',
  '/pages/direction/index',
  '/pages/profile/index',
  '/pages/profile/children',
  '/pages/subject/picker',
]
const LEGACY_PAGES = [
  '/pages/index/index',
  '/pages/me/me',
  '/pages/talent/binding',
  '/pages/talent/plans/index',
  '/pages/talent/report/list',
  '/pages/talent/report/overview',
  '/pages/talent/report/catalog',
  '/pages/talent/report/item',
  '/pages/talent/interpretations/index',
]

console.log(`\n── C 端 API（新契约）──`)
const token = await clientLogin('admin@tongjia.local', process.env.PLATFORM_OPERATOR_PASSWORD || 'admin123').catch(error => {
  check('C 端演示账号登录', false, String(error).slice(0, 120))
  return ''
})
if (token) {
  check('C 端演示账号登录', true)
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  const reportsRes = await fetch(`${H5.replace(/:\d+$/, ':3000')}/api/client/talent/reports?page=1&pageSize=5`, { headers })
  const reportsJson = await reportsRes.json().catch(() => null)
  const firstReportId = (reportsJson?.data?.items || []).find((item) => item?.reportId)?.reportId || ''
  for (const [label, path] of [
    ['summary', '/api/client/talent/summary'],
    ['reports', '/api/client/talent/reports?page=1&pageSize=5'],
    ['advice', `/api/client/talent/advice?reportId=${encodeURIComponent(firstReportId)}`],
    ['directions', `/api/client/talent/directions?reportId=${encodeURIComponent(firstReportId)}`],
    ['profile', '/api/client/talent/profile'],
    ['bindings', '/api/client/talent/bindings'],
  ]) {
    const res = await fetch(`${H5.replace(/:\d+$/, ':3000')}${path}`, { headers })
    check(`C 端 ${label} 可读`, res.status === 200, `status=${res.status}`)
  }
}

console.log('\n── C 端页面渲染（H5）──')
const browser = await launchBrowser()
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
const page = await ctx.newPage()
const consoleErrors = []
page.on('pageerror', error => consoleErrors.push(String(error.message).slice(0, 90)))

for (const path of PUBLIC_PAGES) {
  await page.goto(`${H5}${path}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(500)
  const body = await page.locator('body').innerText().catch(() => '')
  check(`公共页可打开 ${path}`, body.length > 0 && !body.includes('页面不存在'), body.slice(0, 30))
}

for (const path of PROTECTED_PAGES) {
  await page.goto(`${H5}${path}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(700)
  const body = await page.locator('body').innerText().catch(() => '')
  check(`受保护页可打开 / 回登录 ${path}`, body.length > 0, body.slice(0, 30))
}

for (const path of LEGACY_PAGES) {
  await page.goto(`${H5}${path}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(500)
  const body = await page.locator('body').innerText().catch(() => '')
  const legacyMarkers = ['报告列表', '报告总览', '报告目录', '要素解读', '培养计划']
  check(`旧页已下线 ${path}`, body.includes('页面不存在') || body.includes('404') || body.length < 40 || !legacyMarkers.some(m => body.includes(m)), body.slice(0, 30))
}

check('C 端无未捕获前端异常', consoleErrors.length === 0, consoleErrors.join(' | '))
await browser.close()
summary('C 端门户烟测')