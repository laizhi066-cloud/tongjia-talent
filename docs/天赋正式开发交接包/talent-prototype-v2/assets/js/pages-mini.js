/* C 端小程序：首页 / 报告 / 培养方向 / 我的 四个入口，页面全部按后台数据重做。
   数据口径与后台一致：
   · 报告 = 后台「基因报告」，一人一份，按人同步 A~F 中的若干篇（分册），建档日与报告编号来自封面字段；
   · 分册内按章节列出潜质要素，数据熵取发布时冻结的快照，不随后台后续调整变化；
   · 培育建议 = 后台「培育建议」，一个分册一份建议书，各自编号，不跨分册合并；
   · 培养方向 = 后台「培养方向管理」，方向命中与目标档位取报告发布时的结果。
   家长端只看结果，不出现快照、权重、版本号、同步状态等后台术语。 */

import { esc } from './ui.js?v=1.61.0'
import { CURRENT_PARENT_ID, miniVisibleAdvice, adviceVersionOf, SEED_CHILD_IDS } from './store.js?v=1.61.0'
import { CHILD_RELATIONS, defaultRelation, ageLabelOf, GENE_BOOKS } from './demo-data.js?v=1.61.0'

/* ---------------- 图标（统一 1.8 线宽） ---------------- */
const svg = (d, size = 22) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`

const ICON = {
  back: svg('<path d="M15 18 9 12l6-6"/>'),
  chev: svg('<path d="m9 6 6 6-6 6"/>', 16),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>', 18),
  edit: svg('<path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z"/>', 18),
  check: svg('<path d="m5 13 4 4L19 7"/>', 14),
  home: svg('<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1v-9.5Z"/>'),
  report: svg('<path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>'),
  direction: svg('<circle cx="12" cy="12" r="9"/><path d="m15.6 8.4-2.3 5.2-5.2 2.3 2.3-5.2 5.2-2.3Z"/>'),
  me: svg('<circle cx="12" cy="8" r="4"/><path d="M5 21c0-3.6 3.1-6 7-6s7 2.4 7 6"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>', 18),
  dl: svg('<path d="M12 4v10m0 0 4-4m-4 4-4-4"/><path d="M5 17v2a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2"/>', 16),
  file: svg('<path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v5h5"/>', 22),
  book: svg('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z"/><path d="M19 18v3H6.5A2.5 2.5 0 0 1 4 18.5"/>', 20),
  close: svg('<path d="M6 6l12 12M18 6 6 18"/>', 20)
}

/* ---------------- 页面元信息 ---------------- */
const PAGE_TITLE = {
  login: '登录', locked: '账号状态',
  home: '同佳天赋', subjectPicker: '切换对象',
  reports: '报告', reportDetail: '报告', book: '分册', factor: '要素解读',
  adviceList: '培育建议', adviceDetail: '建议书',
  directions: '培养方向', directionDetail: '方向详情', manual: '选择方向',
  profile: '我的', profileEdit: '编辑资料', kids: '孩子管理', kidEdit: '孩子信息',
  agreement: '用户协议', privacy: '隐私政策'
}

const TAB_OF = {
  home: 'home', subjectPicker: 'home', login: 'home', locked: 'home',
  reports: 'report', reportDetail: 'report', book: 'report', factor: 'report',
  adviceList: 'report', adviceDetail: 'report',
  directions: 'direction', directionDetail: 'direction', manual: 'direction',
  profile: 'profile', profileEdit: 'profile', kids: 'profile', kidEdit: 'profile',
  agreement: 'profile', privacy: 'profile'
}

/* 四个 tab 首页与登录页不显示返回 */
const NO_BACK = new Set(['home', 'reports', 'reportDetail', 'directions', 'profile', 'login', 'locked'])
const LOGIN_OR_LOCKED = new Set(['login', 'locked'])

export function renderMini(state) {
  const p = currentParent(state)
  const locked = !!p && p.status !== '正常'
  const page = !state.loggedIn ? 'login' : locked ? 'locked' : (state.miniPage || 'home')
  const tab = TAB_OF[page] || 'home'
  const content = (RENDERERS[page] || RENDERERS.home)(state)
  const isLogin = LOGIN_OR_LOCKED.has(page)
  const dlSheet = state.miniDownload?.files?.length ? downloadSheet(state) : ''

  const phone = `<div class="phone">
    <div class="phone-status"><span>9:41</span><span class="dots">●●●</span></div>
    ${isLogin ? '' : `<div class="phone-head">
      ${NO_BACK.has(page) ? '' : `<button class="back" data-action="mini-back" aria-label="返回">${ICON.back}</button>`}
      <b>${esc(PAGE_TITLE[page] || '同佳天赋')}</b>
    </div>`}
    <div class="phone-body">${content}</div>
    ${isLogin ? '' : `<div class="phone-tabs">
      ${[['home', ICON.home, '首页'], ['report', ICON.report, '报告'],
        ['direction', ICON.direction, '培养方向'], ['profile', ICON.me, '我的']].map(([k, ico, label]) =>
        `<button class="${tab === k ? 'on' : ''}" data-action="mini-tab" data-tab="${k}">
          ${ico}<span>${label}</span></button>`).join('')}
    </div>`}
    ${dlSheet}
  </div>`

  const side = `<div class="mini-side">
    <div class="card"><div class="card-head"><h3>操作导航</h3></div>
      ${DEMO_STEPS.map((s, i) => `<div class="m-side-row"><span>${i + 1}. ${esc(s.label)}</span>
        <button class="btn sm" data-action="demo-step" data-page="${s.page}" data-extra="${esc(s.extra || '')}">前往</button></div>`).join('')}
    </div>
    <div class="card" style="margin-top:12px"><div class="card-head"><h3>四个入口</h3></div>
      <div class="m-side-row"><span>首页</span><span class="m-side-note">对象、篇数、待处理、快捷入口</span></div>
      <div class="m-side-row"><span>报告</span><span class="m-side-note">基因报告 / 培育建议 两个页签 → 分册</span></div>
      <div class="m-side-row"><span>培养方向</span><span class="m-side-note">命中项数 → 方向 → 目标档位</span></div>
      <div class="m-side-row"><span>我的</span><span class="m-side-note">家长资料、孩子、协议</span></div>
    </div>
    <div class="card" style="margin-top:12px"><div class="card-head"><h3>演示数据</h3></div>
      <div class="m-side-row"><span>当前对象</span>
        <span class="m-side-note">${esc(subjName(state))} · ${reportNote(state, reportView(state))}</span></div>
      ${SEED_CHILD_IDS.includes(subjKey(state)) ? `<div class="m-side-row"><span>还原这位孩子</span>
        <button class="btn sm" data-action="mini-restore-subject" data-id="${esc(subjKey(state))}">恢复演示数据</button></div>` : ''}
      <p class="m-side-note" style="padding:8px 0 2px;line-height:1.6">后台与小程序共用同一份数据，恢复后两边同时生效。</p>
    </div>
  </div>`

  return { phone, side, page, pageTitle: PAGE_TITLE[page] || '同佳天赋', tab }
}

const DEMO_STEPS = [
  { label: '家长授权登录并同意协议', page: 'login' },
  { label: '首页看报告篇数与待处理', page: 'home' },
  { label: '打开基因报告目录', page: 'reportDetail' },
  { label: '进入某一分册读要素', page: 'book' },
  { label: '查看本册培育建议书', page: 'adviceList' },
  { label: '按命中项数选方向与档位', page: 'directions' },
  { label: '孩子在「我的」里维护', page: 'kids' }
]

/* ---------------- 当前对象与数据口径 ---------------- */
const currentParent = state => state.parents.find(p => p.id === CURRENT_PARENT_ID) || state.parents[0] || {}
const myKids = state => state.children.filter(c => c.parentId === CURRENT_PARENT_ID)
const isSelf = state => state.currentSubject === 'self'
const subjKey = state => isSelf(state) ? 'self' : (state.currentChildId || 'self')
const subjName = state => isSelf(state)
  ? (currentParent(state).name || '本人')
  : (state.children.find(c => c.id === state.currentChildId)?.name || '本人')
const subjAvatar = state => subjName(state).slice(0, 1) || '我'
const subjGender = state => isSelf(state)
  ? (currentParent(state).gender || '')
  : (state.children.find(c => c.id === state.currentChildId)?.gender || '')
const subjBirthday = state => isSelf(state)
  ? (currentParent(state).birthday || '')
  : (state.children.find(c => c.id === state.currentChildId)?.birthday || '')
const ageOf = birthday => {
  if (!birthday) return null
  const b = new Date(birthday)
  if (Number.isNaN(b.getTime())) return null
  const now = new Date('2026-11-12')
  let age = now.getFullYear() - b.getFullYear()
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--
  return age >= 0 ? age : null
}
const subjDesc = state => {
  const g = subjGender(state)
  const age = ageOf(subjBirthday(state))
  return [g, age === null ? '年龄待补' : ageLabelOf(age)].filter(Boolean).join(' · ')
}
const hasKids = state => myKids(state).length > 0
const canSwitch = state => myKids(state).length > 0

/* 基因报告：一人一份，篇目按人不同。
   本人的基因报告在数据层用 `SELF` 作 childId，C 端对象 key 是 `self`，这里统一映射。 */
const geneOf = state => {
  const key = subjKey(state)
  const childId = key === 'self' ? 'SELF' : key
  return (state.geneReports || []).find(g => g.childId === childId) || null
}
const booksOf = gene => String(gene?.books || '').split('').filter(Boolean)
const bookMeta = code => GENE_BOOKS.find(b => b.code === code) || { code, name: `${code} 篇`, chapters: [] }

/* C 端报告的唯一定义：一个对象只有一份基因报告。
   已发布优先；同对象若残留多份（旧缓存），按发布时间取最新。
   可读性只看报告自身状态，不再用 geneReports 的篇目推断——后台撤回后这里立刻不可读。 */
function reportView(state) {
  const key = subjKey(state)
  const own = state.reports.filter(r => r.parentId === CURRENT_PARENT_ID
    && (r.subjectId === key || (key !== 'self' && r.childId === key)))
  const at = r => String(r.publishedAt || r.queriedAt || '')
  const latest = list => list.slice().sort((a, b) => at(b).localeCompare(at(a)))[0] || null
  const report = latest(own.filter(r => r.status === '已发布')) || latest(own)
  const status = !report ? 'none'
    : report.status === '已发布' ? 'read'
      : report.status === '已撤回' ? 'updating' : 'pending'
  /* 快照里的分册 id 是 V1~V6（卷号），家长端按分册编码 A~F 组织章节与要素，
     这里取 code，不能取 id，否则 bookMeta 查不到册名与章节数。 */
  const books = status === 'read'
    ? (report.volumeSnapshot || []).filter(v => v.open).map(v => v.code).filter(Boolean)
    : []
  return { report, status, books }
}

/* 无报告时按子女查询状态给家长语言，不出现「接口异常」等技术词 */
function noReportNote(state) {
  const c = myKids(state).find(x => x.id === subjKey(state))
  if (c?.query === '查询中') return '结果查询中'
  if (c?.query === '未查到') return '信息待核对'
  return '尚未查询'
}

/* 报告四态文案：首页脚注、快捷入口与演示侧栏共用 */
function reportNote(state, view) {
  if (view.status === 'read') return `${view.books.length} 个分册可读`
  if (view.status === 'pending') return '报告整理中'
  if (view.status === 'updating') return '报告内容更新中'
  return noReportNote(state)
}

/* 要素快照：取当前对象已发布的报告；未发布时只看分册结构，不给结果。
   miniParams 里带的报告 id 只在仍属于当前对象时才采用，避免切换对象后串号。 */
function reportOf(state) {
  const pubs = state.reports.filter(r => r.parentId === CURRENT_PARENT_ID && r.status === '已发布')
  const key = subjKey(state)
  const own = pubs.filter(r => r.subjectId === key || (key !== 'self' && r.childId === key))
  const pinned = own.find(r => r.id === state.miniParams?.reportId)
  return pinned || own[0] || null
}
const factorsOf = (state, code) => (reportOf(state)?.factorSnapshot || [])
  .filter(f => !code || f.category === code)
const snapOf = state => reportOf(state)?.directionSnapshot || null
const snapDirs = state => snapOf(state)?.directions || []
const snapDirById = (state, id) => snapDirs(state).find(d => d.id === id) || snapDirs(state)[0] || null
const snapTierById = (state, id) => (snapOf(state)?.tiers || []).find(t => t.id === id)
const selsOf = state => reportOf(state)?.selections || []
const frozenDirName = (state, s) => s.directionName || s.manualName
  || snapDirs(state).find(d => d.id === s.directionId)?.name
  || (state.directions || []).find(d => d.id === s.directionId)?.name || '自定义方向'
const frozenTierName = (state, s) => s.tierName || snapTierById(state, s.tierId)?.name
  || (state.tiers || []).find(t => t.id === s.tierId)?.name || '通用档位'

/* 培育建议：外部系统按基因报告推送，一个分册一份。
   报告未出 / 未发布 / 已撤回时一律视为没有建议——建议建立在可读的基因报告之上。 */
const adviceOf = state => {
  const g = geneOf(state)
  return g && reportOf(state) ? miniVisibleAdvice(state, g.reportNo) : null
}
const adviceBooksOf = doc => {
  const codes = String(doc?.books || '').split('').filter(Boolean)
  const withSec = [...new Set((doc?.sections || []).map(s => s.book).filter(Boolean))]
  return (codes.length ? codes : withSec).filter(c => (doc?.sections || []).some(s => s.book === c))
}
const sectionsOfBook = (doc, code) => (doc?.sections || []).filter(s => s.book === code)

/* ---------------- 展示口径 ---------------- */
const mtag = (text, tone = '') => `<span class="m-tag${tone ? ' ' + tone : ''}">${esc(text)}</span>`
const entropyTone = name => {
  const n = String(name || '').replace(/级$/, '')
  return n === '卓越' ? 'amber' : n === '优秀' ? 'teal' : n === '优良' ? 'blue' : 'slate'
}
/* 分册内按章节分组：与基因报告正文的章节一一对应 */
function chapterGroups(state, code) {
  const meta = bookMeta(code)
  const list = factorsOf(state, code)
  const chapters = meta.chapters || []
  if (!chapters.length) return [{ name: '潜质要素', items: list }]
  /* 要素按序号均分到各章节，保持封面章节数与正文一致 */
  const per = Math.ceil(list.length / chapters.length) || 1
  return chapters.map((name, i) => ({
    name,
    items: list.slice(i * per, (i + 1) * per)
  })).filter(g => g.items.length)
}
const bookStat = (state, code) => {
  const items = factorsOf(state, code)
  const ent = items.reduce((acc, f) => {
    acc[f.level] = (acc[f.level] || 0) + 1
    return acc
  }, {})
  return {
    total: items.length,
    ent,
    chapters: (bookMeta(code).chapters || []).length
  }
}

/* ---------------- 登录与账号状态 ---------------- */
const LOGO = `<div class="m-logo"><svg width="42" height="42" viewBox="0 0 40 40" fill="none">
  <path d="M20 33V17" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M20 21c0-6.2 5.2-9.6 11.4-9.6C31.4 17.6 26.2 21 20 21Z" fill="#fff" opacity=".92"/>
  <path d="M20 27.5c-5.3 0-9.6-3.1-9.6-8.4 5.3 0 9.6 3.1 9.6 8.4Z" fill="#fff" opacity=".55"/>
</svg></div>`

function loginPage(state) {
  const agreed = !!state.miniAgree
  return `<div class="m-login">
    ${LOGO}
    <h1>同佳天赋</h1>
    <p class="slogan">看懂基因报告，选对培养方向</p>
    <div class="spacer"></div>
    <div class="m-agree">
      <button class="m-check ${agreed ? 'on' : ''}" data-action="mini-agree" aria-label="同意协议">${ICON.check}</button>
      <span class="txt">我已阅读并同意<a data-action="mini-goto" data-page="agreement">《用户协议》</a>与<a data-action="mini-goto" data-page="privacy">《隐私政策》</a></span>
    </div>
    <button class="m-btn ${agreed ? '' : 'off'}" data-action="mini-login">微信一键登录</button>
    <p class="m-tips">登录后按手机号匹配已出具的基因报告</p>
  </div>`
}

function lockedPage() {
  return `<div class="m-empty"><b>账号已停用</b>当前账号暂不可查看报告<br>如需恢复请联系工作人员</div>`
}

/* ---------------- 首页：当前对象 + 报告篇数 + 待处理 ---------------- */
function home(state) {
  const p = currentParent(state)
  const view = reportView(state)
  const books = view.books
  const sels = selsOf(state)
  const limit = snapOf(state)?.directionLimit || 3
  /* 待核对 = 查询状态还不是「已查到」的孩子，与是否同步过基因报告无关 */
  const pending = myKids(state).filter(c => c.query !== '已查到')
  const adv = adviceOf(state)
  const advN = adviceBooksOf(adv).length
  const pendingCard = pending.length
    ? `<div class="m-notice" data-action="mini-goto" data-page="kids">
        <span class="nt"><i class="bd"></i>${pending.length} 个孩子的检测结果待核对</span>
        <span class="ar">${ICON.chev}</span></div>`
    : ''
  const reportQuickNote = view.status === 'read' ? `${books.length} 篇 · 按分册阅读`
    : view.status === 'pending' ? '整理中 · 待发布'
      : view.status === 'updating' ? '更新中 · 完成后可读'
        : '等待报告同步'

  const quick = [
    { tab: 'report', title: '报告与分册', note: reportQuickNote, ico: ICON.report },
    { seg: 'advice', title: '培育建议', note: advN ? `${advN} 份建议书 · 一册一份` : '暂未发布', ico: ICON.book },
    { tab: 'direction', title: '培养方向', note: sels.length ? `已选 ${sels.length}/${limit} 个方向` : '按命中项数选择', ico: ICON.direction },
    { page: 'kids', title: '孩子管理', note: `${myKids(state).length} 个孩子`, ico: ICON.me }
  ]
  const quickHtml = `<div class="m-quick">${quick.map(q => {
    const act = q.seg ? `data-action="mini-report-tab" data-tab="${q.seg}"`
      : q.tab ? `data-action="mini-tab" data-tab="${q.tab}"` : `data-action="mini-goto" data-page="${q.page}"`
    return `<button class="m-quick-item" ${act}>
      <span class="qi">${q.ico}</span><b>${esc(q.title)}</b><small>${esc(q.note)}</small></button>`
  }).join('')}</div>`

  return `<div class="m-home">
    <div class="m-hero">
      <div class="hi">你好，${esc(p.name || '家长')}</div>
      <div class="subject ${canSwitch(state) ? 'click' : ''}" data-action="mini-subject-open">
        <span class="av">${esc(subjAvatar(state))}</span>
        <span class="tx"><b>${esc(subjName(state))}</b>
          <small>${esc(subjDesc(state))}${canSwitch(state) ? ' · 点击切换' : ''}</small></span>
        <span class="arw">${ICON.chev}</span>
      </div>
      <div class="foot">${isSelf(state) ? '本人报告' : '孩子报告'} · ${reportNote(state, view)}</div>
    </div>
    ${pendingCard}
    ${quickHtml}
    ${!hasKids(state) ? `<button class="m-btn soft" style="margin-top:12px" data-action="mini-goto" data-page="kids">添加孩子</button>` : ''}
    <p class="m-footnote">报告由基因检测机构出具，按分册同步到本平台；每个分册对应一份培育建议，正文只做展示、不做改写。</p>
  </div>`
}

/* ---------------- 切换对象 ---------------- */
function subjectBar(state, note = '') {
  const on = canSwitch(state)
  return `<div class="m-subject-bar ${on ? 'click' : 'static'}" ${on ? 'data-action="mini-subject-open"' : ''}>
      <span class="sb-avatar">${esc(subjAvatar(state))}</span>
      <span class="sb-tx"><b>${esc(subjName(state))}</b><small>${esc(note || subjDesc(state))}</small></span>
      ${on ? `<span class="arr">切换 ${ICON.chev}</span>` : ''}
    </div>`
}

function subjectPicker(state) {
  const p = currentParent(state)
  const kids = myKids(state)
  const cur = subjKey(state)
  const row = (on, av, title, sub, action) => `<div class="m-subject-item ${on ? 'on' : ''}" ${action}>
      <span class="si-av">${esc(av)}</span>
      <span class="si-tx"><b>${esc(title)}</b><small>${esc(sub)}</small></span>
      <span class="si-ck">${on ? ICON.check : ''}</span></div>`
  return `<div class="m-cell-list">
    ${row(cur === 'self', (p.name || '家长').slice(0, 1),
      `本人 · ${p.name || '家长'}`, `${p.gender || ''} · ${p.mobile || ''}`,
      'data-action="mini-subject-pick" data-type="self"')}
    ${kids.map(c => {
      const r = state.reports.find(x => (x.subjectId || x.childId) === c.id)
      const open = r?.status === '已发布' ? (r.volumeSnapshot || []).filter(v => v.open).length : 0
      const note = r?.status === '已发布' ? `${open} 篇可读`
        : r?.status === '待发布' ? '报告整理中'
          : r?.status === '已撤回' ? '报告更新中'
            : (state.geneReports || []).some(x => x.childId === c.id) ? '报告未发布' : '报告待同步'
      return row(cur === c.id, c.name.slice(0, 1), c.name,
        `${c.gender} · ${ageOf(c.birthday) === null ? '年龄待补' : ageLabelOf(ageOf(c.birthday))} · ${note}`,
        `data-action="mini-subject-pick" data-type="child" data-id="${esc(c.id)}"`)
    }).join('')}
  </div>
  <p class="m-form-note">同一时间只看一个对象的报告与培养方向；切换后报告、建议与方向都会跟着变。</p>`
}

const groupHead = (title, note = '') => `<div class="m-group-head"><b>${title}</b>${note ? `<span>${note}</span>` : ''}</div>`

/* 报告页：顶部对象条 + 基因报告 / 培育建议 两个页签，一屏只排一类内容 */
function reportDetail(state) {
  const g = geneOf(state)
  const view = reportView(state)
  /* 只要有一份可读报告就按报告展示；基因报告元数据缺失时不再整页拦成「暂无基因报告」 */
  if (!g && !view.report) {
    return `${subjectBar(state, subjDesc(state))}
      <div class="m-empty"><b>该对象暂无基因报告</b>报告由检测机构按身份证号同步，出具后会出现在这里</div>
      <button class="m-btn ghost" data-action="mini-goto" data-page="kids">查看孩子信息</button>`
  }
  /* 可读篇目只取已发布报告的开放分册；撤回 / 待发布时不列分册 */
  const books = view.books
  const adv = adviceOf(state)
  const advBooks = adviceBooksOf(adv)
  const tab = state.miniParams?.tab === 'advice' ? 'advice' : 'report'
  const seg = `<div class="m-segsplit">
      <button class="${tab === 'report' ? 'on' : ''}" data-action="mini-report-tab" data-tab="report">基因报告<i>${books.length}</i></button>
      <button class="${tab === 'advice' ? 'on' : ''}" data-action="mini-report-tab" data-tab="advice">培育建议<i>${advBooks.length}</i></button>
    </div>`

  if (tab === 'advice') {
    const rows = advBooks.map((code, i) => {
      const meta = bookMeta(code)
      const secs = sectionsOfBook(adv, code)
      const no = books.indexOf(code)
      return `<div class="m-book" data-action="mini-goto" data-page="adviceDetail"
        data-book="${esc(code)}" data-return="advice">
        <span class="bk-no">${String((no >= 0 ? no : i) + 1).padStart(2, '0')}</span>
        <span class="bk-tx"><b>${esc(meta.name)}</b>
          <small>${secs.length} 项要素 · ${esc(adv.versionName || '当前版')}</small></span>
        <span class="bk-rt">${mtag('建议书', 'green')}${ICON.chev}</span></div>`
    }).join('')
    const ver = adv ? adviceVersionOf(state, adv.versionId) : null
    return `${seg}
      ${advBooks.length
        ? `<div class="m-group">${groupHead('按分册查看', `${advBooks.length} 份 · 一册一份`)}${rows}</div>`
        : '<div class="m-empty"><b>暂未收到培育建议</b>建议与报告同时发布，按分册推送</div>'}
      <p class="m-group-note">${ver
        ? `本版 ${esc(ver.name)}（${esc(ver.cycle)} 生效）· 每 4 个月更新一版，基因报告内容不随版本变化`
        : '培育建议与基因报告同时发布，按分册推送'}${advBooks.length ? '；一个分册对应一份建议书，正文只做展示、不做改写。' : ''}</p>
      <div class="m-bottom two">
        <button class="m-btn ghost" data-action="mini-download" data-scope="all">下载报告</button>
        <button class="m-btn" data-action="mini-tab" data-tab="direction">按建议选方向</button>
      </div>`
  }

  /* 报告待发布 / 已撤回：只给状态卡，不列分册、不提供下载入口 */
  if (view.status !== 'read') {
    const copy = view.status === 'pending'
      ? ['报告整理中', '检测结果已回传，后台发布后即可逐项阅读']
      : view.status === 'updating'
        ? ['报告内容更新中', '报告正在重新发布，完成后即可继续查看']
        : ['尚未收到检测结果', '检测结果回传后，后台发布报告即可查看']
    return `${seg}
      <div class="m-empty"><b>${copy[0]}</b>${copy[1]}</div>
      ${view.status === 'none'
        ? '<button class="m-btn ghost" data-action="mini-goto" data-page="kids">查看孩子信息</button>'
        : ''}`
  }

  /* 分册目录始终列全 6 册：可读的进详情，本册未检测 / 未开放的一并列出并置灰，
     家长能看到"报告一共几册、自己做了哪几册" */
  const tested = booksOf(geneOf(state))
  const rows = GENE_BOOKS.map((meta, i) => {
    const open = books.includes(meta.code)
    const rowNo = String(i + 1).padStart(2, '0')
    if (!open) {
      const didTest = tested.includes(meta.code)
      return `<div class="m-book off">
        <span class="bk-no">${rowNo}</span>
        <span class="bk-tx"><b>${esc(meta.name)}</b>
          <small>${didTest ? '分册未开放，暂不可查看' : '本次未检测该分册'}</small></span>
        <span class="bk-rt">${mtag(didTest ? '未开放' : '未做报告', 'slate')}</span></div>`
    }
    const st = bookStat(state, meta.code)
    return `<div class="m-book" data-action="mini-goto" data-page="book" data-book="${esc(meta.code)}">
      <span class="bk-no">${rowNo}</span>
      <span class="bk-tx"><b>${esc(meta.name)}</b>
        <small>${st.chapters || meta.chapterCount} 章 · ${st.total || meta.factorCount} 项要素</small></span>
      <span class="bk-rt">${ICON.chev}</span></div>`
  }).join('')

  const allOpen = books.length === GENE_BOOKS.length
  return `${seg}
    <div class="m-group">${groupHead('分册目录', allOpen ? `${GENE_BOOKS.length} 篇` : `共 ${GENE_BOOKS.length} 册 · ${books.length} 册可读`)}${rows}</div>
    <p class="m-group-note">数据来源：23 对染色体 · 582 个等位基因区间 · 1842 个 SNP 位点 · 291 个基因型，按 7 级连锁挖掘运算出具；本平台只做同步与展示。</p>
    <div class="m-bottom two">
      <button class="m-btn ghost" data-action="mini-download" data-scope="all">下载报告</button>
      <button class="m-btn" data-action="mini-report-tab" data-tab="advice">看培育建议</button>
    </div>`
}

/* 分册：章节 + 要素；顶部可在本册内检索 */
function book(state) {
  const code = state.miniParams?.bookCode || booksOf(geneOf(state))[0] || ''
  const meta = bookMeta(code)
  const st = bookStat(state, code)
  const rep = reportOf(state)
  /* 按数据熵分类筛选：筛选值按分册各自记忆，再点已选中项或「全部」即可取消 */
  const ents = Object.keys(st.ent)
  const picked = ents.includes((state.miniBookFilter || {})[code]) ? (state.miniBookFilter || {})[code] : ''
  const groups = chapterGroups(state, code).map(g => ({
    ...g,
    items: picked ? g.items.filter(f => f.level === picked) : g.items
  })).filter(g => g.items.length)
  /* 分类筛选只显示数据熵类型，不显示数量 */
  const chip = level => `<button class="eb ${level ? entropyTone(level) : ''} ${picked === level ? 'on' : ''}"
      data-action="mini-ent-filter" data-book="${esc(code)}" data-level="${esc(level)}">
      ${level ? '<i></i>' : ''}${esc(level || '全部')}</button>`
  const entBar = ents.length
    ? `<div class="m-entbar">${chip('')}${ents.map(k => chip(k)).join('')}</div>
      <p class="m-sub" style="margin-top:9px">点击上方数据熵可只看该分类的要素</p>`
    : ''

  return `<div class="m-card">
      <div class="m-title">${esc(meta.name)}${mtag(`第 ${booksOf(geneOf(state)).indexOf(code) + 1} 分册`, 'slate')}</div>
      <p class="m-sub">${esc(meta.series || '')}</p>
      ${entBar}
    </div>
    ${rep ? (groups.length ? groups.map(g => `<div class="m-cat-head"><b>${esc(g.name)}</b>
      <span>${g.items.length} 项</span></div>
      <div class="m-cell-list">${g.items.map(f => `<div class="m-factor"
        data-action="mini-goto" data-page="factor" data-code="${esc(f.code)}" data-book="${esc(code)}">
        <span class="nm">${esc(f.name)}</span>
        ${mtag(f.level, entropyTone(f.level))}</div>`).join('')}</div>`).join('')
      : `<div class="m-empty">${picked ? `「${esc(picked)}」分类下没有要素` : '本册暂无要素'}</div>`)
      : `<div class="m-empty"><b>本册结果整理中</b>报告发布后即可逐项阅读</div>`}
    ${rep ? `<div class="m-bottom"><button class="m-btn ghost" data-action="mini-download"
      data-volume="${esc(code)}">下载本册 PDF</button></div>` : ''}`
}

/* 要素解读：数据熵 + 解读话术 + 同册前后项 */
function factor(state) {
  const code = state.miniParams?.factorCode || ''
  const all = factorsOf(state)
  const f = all.find(x => x.code === code) || all[0]
  if (!f) return '<div class="m-empty"><b>暂无要素结果</b>报告发布后可查看</div>'
  const same = all.filter(x => x.category === f.category)
  const pos = Math.max(0, same.findIndex(x => x.code === f.code))
  const prev = same[(pos - 1 + same.length) % same.length]
  const next = same[(pos + 1) % same.length]
  const notes = (Array.isArray(f.noteTexts) && f.noteTexts.length ? f.noteTexts : [f.note]).filter(Boolean)
  const note = notes.length ? notes[Math.floor(Math.random() * notes.length)] : ''
  const meta = bookMeta(f.category)
  const dirs = snapDirs(state).filter(d => (d.requirements || []).some(q => q.code === f.code))
  const chapter = chapterGroups(state, f.category).find(g => g.items.some(x => x.code === f.code))?.name || ''
  return `<div class="m-card">
      <div class="m-title">${esc(f.name)}${mtag(f.level, entropyTone(f.level))}</div>
      <p class="m-sub">${esc(meta.name)} · ${esc(chapter)}</p>
      <div class="m-scoreline">
        <div class="m-score-meta" style="grid-template-columns:1fr">
          <div><span>数据熵</span><b>${esc(f.level)}</b></div>
        </div>
      </div>
    </div>
    <div class="m-card">
      <div class="m-title">天赋解读</div>
      <p class="m-lead">${esc(note)}</p>
    </div>
    ${dirs.length ? `<div class="m-card"><div class="m-title">相关培养方向</div>
      ${dirs.slice(0, 3).map(d => `<div class="m-cell" data-action="mini-goto" data-page="directionDetail"
        data-dir="${esc(d.id)}"><span class="ct"><b>${esc(d.name)}</b>
        <small>命中 ${d.hitCount}/${d.total} 项</small></span>
        <span class="cr">${ICON.chev}</span></div>`).join('')}</div>` : ''}
    <div class="m-fnav">
      <button class="m-btn ghost sm" data-action="mini-goto" data-page="factor" data-code="${esc(prev.code)}">← 上一项</button>
      <button class="m-btn ghost sm" data-action="mini-goto" data-page="factor" data-code="${esc(next.code)}">下一项 →</button>
    </div>
    <p class="m-tips">${esc(meta.name)} 第 ${pos + 1} / ${same.length} 项</p>
    <div class="m-footlink"><button class="m-btn text" data-action="mini-goto" data-page="book"
      data-book="${esc(f.category)}">返回本册</button></div>`
}

/* ---------------- 培育建议：一个分册一份 ---------------- */
function adviceList(state) {
  const g = geneOf(state)
  const doc = adviceOf(state)
  if (!g) return '<div class="m-empty"><b>暂无基因报告</b>报告同步后才能匹配培育建议</div>'
  if (!doc) {
    return `${subjectBar(state, '建议按分册同步，一册一份')}
      <div class="m-empty"><b>暂未收到培育建议</b>建议由检测机构按报告匹配后推送，发布后会出现在这里</div>
      <button class="m-btn ghost" data-action="mini-goto" data-page="reportDetail">先看基因报告</button>`
  }
  const codes = adviceBooksOf(doc)
  const cards = codes.map((code, i) => {
    const meta = bookMeta(code)
    const secs = sectionsOfBook(doc, code)
    const ent = [...new Set(secs.map(s => s.entropy))].filter(Boolean)
    return `<div class="m-card click" data-action="mini-goto" data-page="adviceDetail" data-book="${esc(code)}">
      <div class="m-title">第 ${i + 1} 分册 · ${esc(meta.name)}${mtag('可查看', 'green')}</div>
      <p class="m-sub">${secs.length} 项要素 · ${ent.map(e => esc(e)).join('、') || '数据熵待补'}</p>
      <div class="m-row" style="margin-top:8px"><span class="k">建议书编号</span>
        <span class="v mono">${esc(doc.id)}-${esc(code)}</span></div>
      <div class="m-progress-tx" style="margin-top:10px"><span>查看完整建议书</span><span class="go">›</span></div>
    </div>`
  }).join('')
  return `${subjectBar(state, `${esc(doc.name)} · ${esc(ageLabelOf(doc.age))}`)}
    <div class="m-card">
      <div class="m-title">培育建议${mtag(doc.versionName || '最新', 'green')}</div>
      <p class="m-sub">按姓名与周岁匹配到对应年龄册，共 ${codes.length} 个分册、${codes.length} 份建议书</p>
      <div class="m-row" style="margin-top:8px"><span class="k">生效周期</span><span class="v">${esc((adviceVersionOf(state, doc.versionId) || {}).cycle || '—')} · 每 4 个月更新</span></div>
      <div class="m-row"><span class="k">同步时间</span><span class="v">${esc(doc.syncedAt || '—')}</span></div>
    </div>
    ${cards}
    <div class="m-bottom"><button class="m-btn" data-action="mini-tab" data-tab="direction">按建议选培养方向</button></div>`
}

function adviceDetail(state) {
  const doc = adviceOf(state)
  if (!doc) return '<div class="m-empty"><b>暂无培育建议</b>建议发布后可在这里查看</div>'
  const codes = adviceBooksOf(doc)
  const code = state.miniParams?.bookCode && codes.includes(state.miniParams.bookCode)
    ? state.miniParams.bookCode : codes[0]
  const secs = sectionsOfBook(doc, code)
  const meta = bookMeta(code)
  /* 数据熵筛选：与分册页共用记忆对象，建议书按「adv:分册」单独存 key，两边互不干扰 */
  const ents = [...new Set(secs.map(s => s.entropy).filter(Boolean))]
  const fkey = `adv:${code}`
  const saved = (state.miniBookFilter || {})[fkey]
  const picked = ents.includes(saved) ? saved : ''
  const list = picked ? secs.filter(s => s.entropy === picked) : secs
  const chip = level => `<button class="eb ${level ? entropyTone(level) : ''} ${picked === level ? 'on' : ''}"
      data-action="mini-ent-filter" data-book="${esc(fkey)}" data-level="${esc(level)}">
      ${level ? '<i></i>' : ''}${esc(level || '全部')}</button>`
  const entBar = ents.length
    ? `<div class="m-entbar">${chip('')}${ents.map(k => chip(k)).join('')}</div>
      <p class="m-sub" style="margin-top:9px">点击上方数据熵可只看该等级的建议</p>`
    : ''
  const parts = [
    ['分级内容', 'content'],
    ['分级举例', 'example'],
    ['培育方向', 'direction'],
    ['培育建议', 'suggestion']
  ]
  return `<div class="m-card">
      <div class="m-title">第 ${codes.indexOf(code) + 1} 分册 · ${esc(meta.name)}${mtag('建议书', 'green')}</div>
      <p class="m-sub">${esc(doc.name)} · ${esc(ageLabelOf(doc.age))} · 编号 ${esc(doc.id)}-${esc(code)}</p>
      <div class="m-row" style="margin-top:8px"><span class="k">覆盖要素</span>
        <span class="v">${picked ? `${list.length} / ${secs.length} 项` : `${secs.length} 项`}</span></div>
      ${entBar}
    </div>
    ${list.length ? list.map((sec, i) => `<div class="m-card">
      <div class="m-title">${i + 1}. ${esc(sec.factor)}${mtag(sec.entropy, entropyTone(sec.entropy))}</div>
      <p class="m-sub">${esc(sec.chapter || '')}</p>
      ${parts.map(([label, key]) => String(sec[key] || '').trim()
        ? `<div class="m-advice-sec"><h4>${esc(label)}</h4><p>${esc(sec[key])}</p></div>` : '').join('')}
    </div>`).join('') : `<div class="m-empty">「${esc(picked)}」等级下没有建议条目</div>`}
    <div class="m-card">
      <div class="m-title">接续服务</div>
      <p class="m-sub">建议内容仅作成长发展参考，不构成医学诊断。可按建议选择培养方向，后续每个周期更新一版。</p>
    </div>
    <div class="m-bottom two">
      <button class="m-btn ghost" data-action="mini-goto" data-page="book" data-book="${esc(code)}">看本册要素</button>
      <button class="m-btn" data-action="mini-tab" data-tab="direction">选培养方向</button>
    </div>`
}

/* ---------------- 培养方向 tab ---------------- */
/* 两个页签：推荐方向（按报告发布时冻结的命中结果排序）/ 已选方向（家长确认的方向与档位）。
   页头不再重复对象条与「命中最多」大卡，一屏只排一类内容。 */
function directions(state) {
  const rep = reportOf(state)
  if (!rep) {
    return `<div class="m-empty"><b>报告发布后可选方向</b>培养方向依据基因报告结果推荐，报告发布后即可选择</div>
      <button class="m-btn ghost" data-action="mini-goto" data-page="reports">查看报告</button>`
  }
  const snap = snapOf(state)
  const recommendLimit = snap?.recommendLimit || state.recommendLimit || 5
  /* 只推荐命中 ≥ 1 项的方向；一条都没命中时回落到后台已配置的全部方向，
     家长仍可选；都不合适时用「自己填写」提交自己的想法。 */
  const source = snapDirs(state)
  const hitDirs = source.filter(d => (d.hitCount || 0) > 0)
  const lowMatch = hitDirs.length === 0
  const dirs = (hitDirs.length ? hitDirs : source).slice(0, recommendLimit)
  const limit = snap?.directionLimit || state.directionLimit || 3
  const sels = selsOf(state)
  const selIds = new Set(sels.map(s => s.directionId))
  const tab = state.miniDirTab === 'selected' ? 'selected' : 'recommend'

  const seg = `<div class="m-segsplit">
      <button class="${tab === 'recommend' ? 'on' : ''}" data-action="mini-dir-tab"
        data-tab="recommend">推荐方向<i>${dirs.length}</i></button>
      <button class="${tab === 'selected' ? 'on' : ''}" data-action="mini-dir-tab"
        data-tab="selected">已选方向<i>${sels.length}/${limit}</i></button>
    </div>`

  const cards = dirs.map(d => {
    const total = d.total ?? (d.requirements || []).length
    const mark = selIds.has(d.id) ? mtag('已选择', 'green')
      : lowMatch ? mtag('暂无匹配', 'slate') : ''
    return `<div class="m-card click m-dircard" data-action="mini-goto" data-page="directionDetail" data-dir="${esc(d.id)}">
      <div class="dc-head"><b>${esc(d.name)}</b>${mark}</div>
      <p class="m-sub">${esc(d.desc || '')}</p>
      <div class="dc-foot">
        <span class="dc-score"><b>${d.hitCount || 0}</b>/${total} 项命中</span>
        <span class="dc-meta">${(d.tierIds || []).length} 个档位</span>
        <span class="dc-go">${ICON.chev}</span>
      </div>
    </div>`
  }).join('')

  const matchNote = !dirs.length ? ''
    : lowMatch ? '当前报告暂无匹配方向，仍可从后台已配置方向中选择，或自己填写' : ''
  const recommendPanel = `<div class="m-group">
      ${matchNote ? `<p class="m-group-note">${matchNote}</p>` : ''}
      ${cards || '<div class="m-empty">暂无可推荐方向，可自己填写</div>'}</div>
    <div class="m-bottom two">
      <button class="m-btn ghost" data-action="mini-goto" data-page="manual">没有合适的？自己填写</button>
      <button class="m-btn" data-action="mini-dir-tab" data-tab="selected">看已选 ${sels.length}/${limit}</button>
    </div>`

  const selectedPanel = !sels.length
    ? `<div class="m-empty"><b>还没有选择方向</b>在推荐方向里挑一个，最多 ${limit} 个；没有合适的可自己填写</div>
      <div class="m-bottom two">
        <button class="m-btn ghost" data-action="mini-goto" data-page="manual">没有合适的？自己填写</button>
        <button class="m-btn" data-action="mini-dir-tab" data-tab="recommend">去推荐方向挑选</button>
      </div>`
    : `<div class="m-group">
        ${sels.map(s => `<div class="m-card">
          <div class="m-title">${esc(frozenDirName(state, s))}${mtag(frozenTierName(state, s))}</div>
          <p class="m-sub">${esc(s.teacher || snapTierById(state, s.tierId)?.teacher || '按档位配置')} · ${
            esc(s.freq || snapTierById(state, s.tierId)?.freq || '按档位配置')}</p>
          <div class="m-btn-row" style="margin-top:14px">
            <button class="m-btn ghost sm" data-action="mini-remove" data-dir="${esc(s.directionId)}">取消选择</button>
            <button class="m-btn soft sm" data-action="mini-goto" data-page="directionDetail"
              data-dir="${esc(s.directionId)}">更换档位</button>
          </div></div>`).join('')}
      </div>
      <div class="m-bottom two">
        <button class="m-btn ghost" data-action="mini-goto" data-page="manual">没有合适的？自己填写</button>
        <button class="m-btn" data-action="mini-dir-tab" data-tab="recommend">${
          sels.length < limit ? '继续挑选方向' : '看推荐方向'}</button>
      </div>`

  return `${seg}
    ${tab === 'selected' ? selectedPanel : recommendPanel}`
}

/* 方向详情：命中项数、要素对照、档位选择都在这一屏（报告发布后才有） */
function directionDetail(state) {
  const d = snapDirById(state, state.miniParams?.dirId)
  if (!d) return '<div class="m-empty"><b>暂无可选方向</b>报告发布后可在这里查看命中情况</div>'
  const rep = reportOf(state)
  const req = d.requirements || []
  const hitCount = d.hitCount ?? req.filter(q => q.met).length
  const total = d.total ?? req.length
  const cur = selsOf(state).find(s => s.directionId === d.id)
  const tierIds = d.tierIds || []
  const picked = (state.miniParams?.tierId && tierIds.includes(state.miniParams.tierId))
    ? state.miniParams.tierId
    : (cur?.tierId && tierIds.includes(cur.tierId) ? cur.tierId
      : (tierIds.includes(d.defaultTierId) ? d.defaultTierId : tierIds[0]))
  return `<div class="m-card">
      <div class="m-title">${esc(d.name)}${cur ? mtag('已选择', 'green') : ''}</div>
      <p class="m-sub">${esc(d.desc || '')}</p>
      <div class="m-scoreline" style="border-top:0;padding-top:0">
        <div class="m-score"><b>${hitCount}</b><span>项命中</span></div>
        <div class="m-score-meta"><div><span>配置要素</span><b>${total} 项</b></div>
          <div><span>可选档位</span><b>${tierIds.length} 个</b></div></div>
      </div>
    </div>
    <div class="m-card">
      <div class="m-title">要素对照</div>
      ${req.length ? req.map(q => `<div class="m-row">
        <span class="k">${esc(q.factorName)}</span>
        <span class="v">需 ${esc(q.level)} · 现 ${esc(q.factorLevel)}<br>
          ${q.met ? mtag('已达成', 'green') : mtag(`差 ${q.gap} 级`, 'amber')}</span></div>`).join('')
        : '<p class="m-sub">暂未配置要素要求</p>'}
    </div>
    ${tierIds.length ? `<div class="m-group">${groupHead('目标档位', '先预选，可修改')}
      ${tierIds.map(id => {
        const t = snapTierById(state, id)
        if (!t) return ''
        return `<div class="m-tier ${picked === id ? 'on' : ''}" data-action="mini-tier" data-tier="${id}" data-dir="${esc(d.id)}">
          <div class="th"><span>${esc(t.name)} · ${esc(t.headline)}</span>${picked === id ? mtag('已选', 'green') : ''}</div>
          <div class="tdesc">${esc(t.desc)}</div>
          <div class="tmeta">建议师资 ${esc(t.teacher)} · ${esc(t.freq)}</div></div>`
      }).join('')}
    </div>` : '<div class="m-empty">该方向暂未开放档位</div>'}
    <div class="m-bottom"><button class="m-btn" data-action="mini-submit" data-dir="${esc(d.id)}"
      data-tier="${esc(picked)}">${cur ? '更新目标档位' : '确认选择该方向'}</button></div>
    ${rep ? `<div class="m-footlink"><button class="m-btn text" data-action="mini-goto" data-page="book"
      data-book="${esc((req[0] && factorsOf(state).find(f => f.code === req[0].code)?.category) || '')}">看要素依据</button></div>` : ''}`
}

/* 已选方向已并入培养方向页的「已选方向」页签，不再单独占一个页面 */

function manual(state) {
  const snap = snapOf(state)
  const snapTiers = snap?.tiers || []
  const tiers = (snapTiers.length ? snapTiers : (state.tiers || [])).filter(t => t.status !== '停用')
  const def = tiers.find(t => t.id === (snap?.defaultTierId || state.defaultTierId)) || tiers[0]
  /* 方向下拉取后台已配置的培养方向（报告发布后取发布时冻结的一份），末尾固定「其他」用于自填。
     选项按名称拼音首字母排序（H → L → W → Y …），与后台配置的录入顺序无关。 */
  const dirs = (snapDirs(state).length ? snapDirs(state) : (state.directions || []))
    .filter(d => d.status !== '停用')
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'zh-Hans-CN'))
  const dirOpts = dirs.map(d => `<option value="${esc(d.id)}">${esc(d.name)}</option>`).join('')
  const tierOpts = tiers.map(t => `<option value="${esc(t.id)}" data-name="${esc(t.name)}"
      data-teacher="${esc(t.teacher || '')}" data-freq="${esc(t.freq || '')}"
      ${def && t.id === def.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')
  return `<div class="m-card"><div class="m-title">选择培养方向</div>
      <p class="m-sub">方向来自后台已配置的培养方向；列表里没有的选「其他」自己填写，后台会看到这条需求。</p></div>
    <div class="m-form">
      <div class="m-form-row"><label>方向名称</label>
        <select id="manualDirPick">
          <option value="">请选择</option>
          ${dirOpts}
          <option value="__other__">其他（自己填写）</option>
        </select><span class="pick">${ICON.chev}</span></div>
      <div class="m-form-row" id="manualNameRow" hidden><label>填写方向</label>
        <input id="manualName" maxlength="10" placeholder="10 个字以内，如：冰球"></div>
      <div class="m-form-row"><label>培养目标</label>
        <select id="manualTierPick">${tierOpts}</select><span class="pick">${ICON.chev}</span></div>
    </div>
    <p class="m-form-note" id="manualTierNote">${def
      ? `培养目标：${esc(def.name)} · ${esc(def.teacher || '')} · ${esc(def.freq || '')}`
      : '暂未配置培养目标'}</p>
    <div class="m-bottom"><button class="m-btn" data-action="mini-manual-save">提交</button></div>`
}

/* ---------------- 我的 ---------------- */
function profile(state) {
  const p = currentParent(state)
  const g = geneOf(state)
  const kids = myKids(state)
  return `<div class="m-me">
      <div class="av">${esc(p.avatar || p.name?.slice(0, 1) || '家')}</div>
      <div class="tx"><b>${esc(p.name || '家长')}</b>
        <small>${esc(p.mobile || '未绑定手机号')}</small>
        ${p.idNo ? `<small>身份证 ${esc(p.idNo)}</small>` : ''}</div>
      <button class="edit" data-action="mini-goto" data-page="profileEdit" aria-label="编辑资料">${ICON.edit}</button>
    </div>
    <div class="m-cell-list" style="margin-top:14px">
      <div class="m-cell" data-action="mini-goto" data-page="profileEdit">
        <span class="ct"><b>编辑资料</b></span><span class="cr">${ICON.chev}</span></div>
      <div class="m-cell" data-action="mini-goto" data-page="kids">
        <span class="ct"><b>孩子管理</b></span><span class="cr">${kids.length} 人 ${ICON.chev}</span></div>
      <div class="m-cell" data-action="mini-goto" data-page="agreement">
        <span class="ct"><b>用户协议</b></span><span class="cr">${ICON.chev}</span></div>
      <div class="m-cell" data-action="mini-goto" data-page="privacy">
        <span class="ct"><b>隐私政策</b></span><span class="cr">${ICON.chev}</span></div>
    </div>
    <p class="m-tips">版本 V1.0 · ${esc(g ? `最近建档 ${g.filedAt}` : '暂无报告')}</p>
    <button class="m-btn text" data-action="mini-logout">退出登录</button>`
}

function profileEdit(state) {
  const p = currentParent(state)
  return `<div class="m-me" style="padding-bottom:14px">
      <div class="av">${esc(p.avatar || p.name?.slice(0, 1) || '家')}</div>
      <div class="tx"><b>${esc(p.name || '家长')}</b><small>头像可在正式版调用微信头像</small></div>
      <button class="edit" data-action="mini-avatar" aria-label="更换头像">${ICON.edit}</button>
    </div>
    <div class="m-form">
      <div class="m-form-row"><label>姓名</label><input id="peName" value="${esc(p.name || '')}" placeholder="请输入姓名"></div>
      <div class="m-form-row"><label>手机号</label><input id="peMobile" value="${esc(p.mobile || '')}" placeholder="请输入手机号"></div>
      <div class="m-form-row"><label>性别</label>
        <select id="peGender"><option ${p.gender === '女' ? 'selected' : ''}>女</option><option ${p.gender === '男' ? 'selected' : ''}>男</option></select>
        <span class="pick">${ICON.chev}</span></div>
      <div class="m-form-row"><label>出生日期</label><input id="peBirthday" type="date" value="${esc(p.birthday || '')}"></div>
      <div class="m-form-row"><label>身份证号</label><input id="peIdNo" value="${esc(p.idNo || '')}" placeholder="选填，仅用于匹配报告"></div>
    </div>
    <p class="m-form-note">手机号用于匹配检测记录；身份证号选填，保存后脱敏展示。</p>
    <div class="m-bottom"><button class="m-btn" data-action="mini-profile-save">保存</button></div>`
}

/* 孩子管理：列表 + 新增 / 编辑 */
const relationOf = (c, parent) => c?.relation || defaultRelation(parent)
const relationOptions = cur => CHILD_RELATIONS.map(r =>
  `<option ${r === cur ? 'selected' : ''}>${esc(r)}</option>`).join('')

function kids(state) {
  const rows = myKids(state)
  return `<div class="m-cell-list">${rows.map(c => {
    const cg = (state.geneReports || []).find(x => x.childId === c.id)
    const n = booksOf(cg).length
    return `<div class="m-cell" data-action="mini-goto" data-page="kidEdit" data-child="${esc(c.id)}">
      <span class="ct"><b>${esc(c.name)}</b>
        <small>${esc(c.gender)} · ${ageOf(c.birthday) === null ? '年龄待补' : ageLabelOf(ageOf(c.birthday))} · ${
          c.query === '已查到' ? '结果已出' : c.query === '查询中' ? '查询中' : '待处理'}</small></span>
      <span class="cr">${n ? mtag(`${n} 篇`, 'green') : mtag('未同步', 'slate')} ${ICON.chev}</span></div>`
  }).join('') || '<div class="m-cell static"><span class="ct"><b>还没有添加孩子</b><small>添加后按手机号与身份证号匹配报告</small></span></div>'}</div>
  <button class="m-btn" data-action="mini-goto" data-page="kidEdit">${ICON.plus} 添加孩子</button>
  <p class="m-form-note">每个孩子对应一份基因报告，报告里按人同步若干分册；信息不一致会匹配不到结果。</p>`
}

function kidEdit(state) {
  const list = myKids(state)
  const c = list.find(x => x.id === state.miniParams?.childId)
  const rel = relationOf(c, currentParent(state))
  return `${c ? `<div class="m-card"><div class="m-title">${esc(c.name)}</div>
      <p class="m-sub">${c.query === '已查到' ? '结果已出，报告已同步' : c.query === '查询中' ? '正在查询检测结果' : '暂未查到结果，可核对信息后重新查询'}</p></div>` : ''}
    <div class="m-form">
      <div class="m-form-row"><label>姓名</label><input id="childName" value="${esc(c?.name || '')}" placeholder="请输入孩子姓名"></div>
      <div class="m-form-row"><label>性别</label>
        <select id="childGender"><option ${!c || c.gender === '女' ? 'selected' : ''}>女</option>
        <option ${c?.gender === '男' ? 'selected' : ''}>男</option></select>
        <span class="pick">${ICON.chev}</span></div>
      <div class="m-form-row"><label>亲属关系</label>
        <select id="childRelation">${relationOptions(rel)}</select>
        <span class="pick">${ICON.chev}</span></div>
      <div class="m-form-row"><label>出生日期</label>
        <input id="childBirthday" type="date" value="${esc((c?.birthday || '').slice(0, 10))}"></div>
      <div class="m-form-row"><label>身份证号</label>
        <input id="childIdNo" value="" placeholder="${c ? `原证件 ${esc(c.idNo || '未登记')}，不修改请留空` : '18 位身份证号'}"></div>
    </div>
    <p class="m-form-note">出生日期决定匹配到哪个年龄册；身份证号用于查询检测结果，保存后只显示前后各位。</p>
    <div class="m-bottom">
      <button class="m-btn" data-action="${c ? 'mini-child-update' : 'mini-child-save'}"${c ? ` data-id="${esc(c.id)}"` : ''}>
        ${c ? '保存并重新查询' : '保存并查询'}</button>
    </div>`
}

function agreement() {
  return `<div class="m-card">
      <p class="m-lead">本协议约定账号使用、报告查看与培养方向选择等规则。报告内容仅作成长发展参考，不构成医学诊断或升学依据。</p>
      <div class="m-row" style="margin-top:12px"><span class="k">版本</span><span class="v">V1.0 · 2026-11</span></div></div>`
}

function privacy() {
  return `<div class="m-card">
      <p class="m-lead">我们仅在提供服务必需范围内采集信息：微信授权标识、手机号，孩子的姓名 / 性别 / 出生日期 / 亲属关系 / 身份证号，以及报告阅读记录与已选方向。</p>
      <p class="m-sub" style="margin-top:12px">身份证号经单独授权后采集、加密存储，页面默认只显示前后各位；基因报告与培育建议正文仅展示，不做修改。</p></div>`
}

/* 报告文件：生成后可在小程序内打开或转发 */
function downloadSheet(state) {
  const files = state.miniDownload?.files || []
  if (!files.length) return ''
  const one = files.length === 1
  return `<div class="m-mask" data-action="mini-download-close">
    <div class="m-sheet" data-action="mini-sheet-stop">
      <div class="m-sheet-head"><b>${one ? '文件已生成' : `已生成 ${files.length} 个文件`}</b>
        <button data-action="mini-download-close" aria-label="关闭">${ICON.close || ''}✕</button></div>
      <div class="m-dl-body">${files.map(f => `<div class="m-dl-file">
        <span class="df-ico">${ICON.file}</span>
        <span class="df-tx"><b>${esc(f.name)}</b>
          <small>${f.size} MB · ${f.pages} 页 · ${esc(f.expiresAt)} 前有效</small></span>
        <button class="df-btn" data-action="mini-download-open" data-file="${esc(f.id)}">打开</button>
      </div>`).join('')}</div>
      <p class="m-dl-note">文件含「${esc(files[0].watermark)}」水印，仅限本人使用；过期后可重新生成。</p>
      <div class="m-sheet-foot">
        <button class="m-btn ghost" data-action="mini-download-share">转发给朋友</button>
        <button class="m-btn" data-action="mini-download-close">知道了</button>
      </div>
    </div></div>`
}

const RENDERERS = {
  login: loginPage, locked: lockedPage, home, subjectPicker,
  /* 报告只有一个页面：对象条 + 基因报告 / 培育建议 两个页签；旧链接 reports 指向它 */
  reports: reportDetail, reportDetail, book, factor, adviceList, adviceDetail,
  directions, directionDetail, manual,
  profile, profileEdit, kids, kidEdit, agreement, privacy
}
