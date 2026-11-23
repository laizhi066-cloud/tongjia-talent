/* 原型入口：端切换、后台侧栏、hash 同步与全部交互动作。
   菜单结构由系统菜单配置驱动；页面内容来自 pages-admin.js / pages-mini.js / flow.js。 */

import { ROLE_OPTIONS, VOLUMES, CHILD_RELATIONS, defaultRelation, ADVICE_CYCLE_MONTHS, ADVICE_MATCH_RULE, GENE_FORMAT, ageLabelOf,
  ELEMENT_ITEMS, ELEMENT_BOOKS, elementByCode, ELEMENT_ENTROPY, ELEMENT_VARIANTS,
  ELEMENT_LIB_COLUMNS, elementTextsOf } from './demo-data.js?v=1.61.0'
import {
  getState, subscribe, reset, set, go, SEED_CHILD_IDS, restoreChildSeed,
  addChild, queryChild, publishReport, withdrawReport, restoreReport, rebuildSnapshot, previewDirectionHits,
  pendingVolumeCodes, publishNewVolumes,
  selectDirection, removeSelection, addManualDirection, mergeManualDirection,
  finishQuery, markFactorRead, recordDownload,
  createMember, updateMember, toggleMember, addChildForMember, updateChild, unbindChild,
  createDirection, saveDirection, toggleDirection, deleteDirection,
  updateTier, toggleTier, deleteTier, setDefaultTier,
  setTab, setPage, setFactorCategory,
  saveCategory, deleteCategory, saveFactor, toggleFactor, deleteFactor,
  saveLevel, deleteLevel, saveNote, toggleNote, deleteNote, importRows,
  saveMenu, toggleMenu, moveMenu, saveBackUser, toggleBackUser, deleteBackUser,
  saveRole, deleteRole,
  syncAdviceVersion, syncAllGeneReports, geneSyncPlan, setAdviceViewVersion,
  publishAdviceDoc, withdrawAdviceDoc, advicePersonHistory,
  setElementLibPick, syncElementLib, elementLibOf,
  adviceVersionOf, adviceDocsOfVersion, geneReportByNo, geneBooksOf,
  versionNameOf, addMonths, geneIdNoOf,
  toggleMenuGroup, setAllMenuGroups, saveMenuGroup, toggleMenuGroupStatus, moveMenuGroup,
  setSubject, updateParentProfile,
  CURRENT_PARENT_ID
} from './store.js?v=1.61.0'
import { esc, tag, toast, dialog, closeDialog, initDelegate, field, table, tabBar, kvStrip } from './ui.js?v=1.61.0'
import { renderAdmin, ADMIN_MODULE_IDS, reportDetailHtml } from './pages-admin.js?v=1.61.0'
import { renderMini } from './pages-mini.js?v=1.61.0'
import { renderFlow } from './flow.js?v=1.61.0'

const root = document.querySelector('#app')

const activeTierList = s => (s.tiers || []).filter(t => t.status === '启用')
const tierName = (s, id) => (s.tiers || []).find(t => t.id === id)?.name || ''
const maskId = id => /^\d{17}[\dXx]$/.test(id) ? id.slice(0, 4) + '**********' + id.slice(-4) : id
const jumpToLastPage = (moduleId, total, per = 20) => setPage(moduleId, Math.max(1, Math.ceil(total / per)))
const menuMeta = (s, id) => (s.menuConfig || []).find(m => m.id === id) || { group: '后台管理', name: '工作台与待办' }

/* ---------------- 顶栏与侧栏 ---------------- */
function topbar(s) {
  const mod = menuMeta(s, s.adminModule)
  const pos = s.side === 'admin' ? `后台管理 / ${mod.group} / ${mod.name}`
    : s.side === 'mini' ? '小程序端' : '业务流程'
  const items = [['admin', '后台管理'], ['mini', '小程序端'], ['flow', '业务流程']]
  return `<div class="topbar">
    <div class="brand"><span class="brand-mark">赋</span>
      <div><b>同佳天赋</b><small>天赋测评与培养方向管理平台</small></div></div>
    <div class="switch">${items.map(([k, label]) =>
      `<button class="${s.side === k ? 'on' : ''}" data-action="switch-side" data-side="${k}">${label}</button>`).join('')}</div>
    <div class="topbar-right">
      <span class="top-context"><span>当前位置</span><b>${esc(pos)}</b></span>
      <button class="ghost-btn" data-action="reset">重置数据</button>
    </div></div>`
}

/* 级联菜单：一级分组可折叠、二级功能页缩进；激活项所在分组自动展开 */
function menuTree(s) {
  const enabled = (s.menuConfig || []).filter(m => m.status === '启用').sort((a, b) => a.sort - b.sort)
  const groups = s.menuGroups || []
  const configured = groups.filter(g => g.status === '启用').sort((a, b) => a.sort - b.sort)
  const disabled = new Set(groups.filter(g => g.status !== '启用').map(g => g.name))
  const names = configured.map(g => g.name)
  enabled.forEach(m => {
    if (!disabled.has(m.group) && !names.includes(m.group)) names.push(m.group)
  })
  return names.filter(g => enabled.some(m => m.group === g) || configured.some(x => x.name === g))
}
function groupIcon(s, name) {
  return (s.menuGroups || []).find(g => g.name === name)?.icon || '▦'
}
function sidebar(s) {
  const enabled = (s.menuConfig || []).filter(m => m.status === '启用').sort((a, b) => a.sort - b.sort)
  const activeGroup = s.side === 'admin' ? menuMeta(s, s.adminModule).group : ''
  const isOpen = name => name === activeGroup || (s.menuExpanded || {})[name] !== false
  const nodes = menuTree(s).map(name => {
    const items = enabled.filter(m => m.group === name)
    const open = isOpen(name)
    return `<div class="side-node ${open ? 'open' : ''} ${name === activeGroup ? 'active' : ''}">
      <div class="side-node-head" data-action="menu-group" data-group="${esc(name)}" data-ico="${esc(groupIcon(s, name))}">
        <div class="side-group-title">${esc(name)}</div>
        <span class="side-node-count">${items.length}</span>
        <span class="side-arrow">›</span>
      </div>
      <div class="side-children">${items.map(it =>
        `<div class="side-item ${s.adminModule === it.id && s.side === 'admin' ? 'on' : ''}"
          data-ico="${esc(it.icon || '·')}" data-action="admin-nav" data-id="${esc(it.id)}">${esc(it.name)}</div>`).join('')}
      </div></div>`
  }).join('')
  return `<aside class="sidebar">
    <div class="side-tools"><span class="side-label">功能菜单</span>
      <div class="btn-row">
        <button class="btn-link" data-action="menu-expand">全部展开</button>
        <button class="btn-link" data-action="menu-collapse">全部折叠</button>
      </div></div>
    <nav class="side-tree">${nodes}</nav>
    <div class="side-foot">同佳天赋 · 运营管理后台<br>版本 V1.0<br>数据更新于 2026-11-06</div>
  </aside>`
}

/* ---------------- 主渲染 ---------------- */
function render() {
  const s = getState()
  let body = ''
  if (s.side === 'admin') {
    body = `<div class="layout">${sidebar(s)}<main class="main">${renderAdmin(s.adminModule, s)}</main></div>`
  } else if (s.side === 'mini') {
    const m = renderMini(s)
    body = `<main class="main">
      <div class="crumb">当前位置：小程序端 / ${(() => {
        const tabName = m.tab === 'home' ? '首页' : m.tab === 'report' ? '报告' : m.tab === 'direction' ? '培养方向' : '我的'
        return tabName === m.pageTitle ? esc(tabName) : `${esc(tabName)} / ${esc(m.pageTitle)}`
      })()}</div>
      <div class="page-head"><div><h1>小程序端</h1>
        <div class="sub">首页 / 报告 / 培养方向 / 我的 4 个栏目。</div></div></div>
      <div class="mini-layout">${m.phone}${m.side}</div></main>`
  } else {
    body = `<main class="main">${renderFlow(s)}</main>`
  }
  root.innerHTML = topbar(s) + body
  syncHash(s)
}

function syncHash(s) {
  const h = s.side === 'flow' ? '#/flow'
    : s.side === 'admin' ? `#/admin/${s.adminModule}`
      : `#/mini/${s.miniPage}`
  if (location.hash !== h) history.replaceState(null, '', h)
}

function readHash() {
  const raw = location.hash.replace(/^#\/?/, '')
  const [a, b] = raw.split('/')
  if (a === 'flow') return { side: 'flow' }
  if (a === 'admin' && ADMIN_MODULE_IDS.includes(b)) return { side: 'admin', adminModule: b }
  if (a === 'mini') return { side: 'mini', miniPage: b || 'home', miniParams: {} }
  return null
}

function adminGo(module, extra = {}) {
  const s = getState()
  const group = menuMeta(s, module).group
  const menuExpanded = { ...(s.menuExpanded || {}), [group]: true }
  go('admin', { adminModule: module, menuExpanded, ...extra })
}
function miniGo(page, params = {}) {
  set({ side: 'mini', miniPage: page, miniParams: params, miniDownload: null })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
const firstReportId = () => {
  const s = getState()
  const sid = s.currentSubject === 'self' ? 'self' : s.currentChildId
  /* 只认当前对象自己的已发布报告；当前对象还没报告时返回空，
     由调用方改走「方向意向」，不能回落到家长名下其他孩子的报告（会串号）。 */
  const pubs = s.reports.filter(r => r.status === '已发布' && r.parentId === CURRENT_PARENT_ID
    && (r.subjectId === sid || (sid !== 'self' && r.childId === sid)))
  return (pubs.find(r => r.id === s.miniParams?.reportId) || pubs[0] || {}).id || ''
}

const BACK_MAP = {
  subjectPicker: 'home',
  reportDetail: 'reports', book: 'reportDetail', factor: 'book',
  adviceList: 'reports', adviceDetail: 'adviceList',
  directionDetail: 'directions', manual: 'directions',
  profileEdit: 'profile', kids: 'profile', kidEdit: 'kids',
  agreement: 'profile', privacy: 'profile',
  home: 'home', reports: 'home', directions: 'home', profile: 'home', login: 'home'
}

/* ---------------- 通用弹层辅助 ---------------- */
let pendingDelete = null
function confirmDelete(title, sub, fn) {
  pendingDelete = fn
  dialog({
    title, sub,
    body: '<div class="form-explain"><b>删除校验</b>已被业务数据引用的记录仅允许停用；删除后可在操作日志中追溯。</div>',
    confirmText: '确认删除',
    onConfirm: () => {
      const r = pendingDelete ? pendingDelete() : { ok: false, msg: '操作已取消' }
      pendingDelete = null
      if (!r || r.ok === false) { toast(r?.msg || '删除失败'); return false }
      toast(r.msg || '已删除')
      return true
    }
  })
}
/* ---------------- 会员管理：表单与详情 ---------------- */
/* 亲属关系选项与 C 端共用 CHILD_RELATIONS；旧数据按家长性别兜底 */
const relationOpts = cur => CHILD_RELATIONS.map(r =>
  `<option ${r === cur ? 'selected' : ''}>${esc(r)}</option>`).join('')

function childRow(index, c = {}) {
  return `<div class="child-row" data-child-row>
    <div class="row-head"><span>子女 ${index}</span>
      <button class="btn-link danger-text" type="button" data-action="member-row-del">移除</button></div>
    <div class="form-grid">
      ${field('姓名', `<input data-cf="name" value="${esc(c.name || '')}" placeholder="请输入子女姓名">`, { required: true })}
      ${field('性别', `<select data-cf="gender"><option ${c.gender === '女' ? 'selected' : ''}>女</option><option ${c.gender === '男' ? 'selected' : ''}>男</option></select>`)}
      ${field('亲属关系', `<select data-cf="relation">${relationOpts(c.relation || defaultRelation())}</select>`)}
      ${field('出生日期', `<input data-cf="birthday" type="date" value="${esc(c.birthday || '')}">`, { required: true })}
      ${field('身份证号', `<input data-cf="idNo" value="${esc(c.idNo || '')}" placeholder="18 位身份证号">`, { required: true })}
    </div></div>`
}

function collectChildRows() {
  return [...document.querySelectorAll('#childRows [data-child-row]')].map(row => ({
    name: row.querySelector('[data-cf="name"]')?.value?.trim() || '',
    gender: row.querySelector('[data-cf="gender"]')?.value || '女',
    relation: row.querySelector('[data-cf="relation"]')?.value || defaultRelation(),
    birthday: row.querySelector('[data-cf="birthday"]')?.value || '',
    idNo: row.querySelector('[data-cf="idNo"]')?.value?.trim() || ''
  }))
}

function validateChildren(children) {
  if (!children.length) { toast('请至少录入一名子女'); return false }
  for (const c of children) {
    if (!c.name || !c.birthday || !/^\d{17}[\dXx]$/.test(c.idNo)) {
      toast('请完整填写子女姓名、出生日期与 18 位身份证号'); return false
    }
    if (c.idNo.slice(6, 14) !== c.birthday.replace(/-/g, '')) {
      toast(`「${c.name}」的身份证号与出生日期不一致，请核对`); return false
    }
  }
  return true
}

function checkParentIdNo(raw, original = '') {
  const v = String(raw || '').trim()
  if (!v) return { ok: true, value: '' }
  if (v === original) return { ok: true, value: original }
  if (v.includes('*')) return { ok: false, msg: '请填写 18 位身份证号，或留空不填' }
  if (!/^\d{17}[\dXx]$/.test(v)) return { ok: false, msg: '家长身份证号格式不正确，也可留空' }
  return { ok: true, value: maskId(v) }
}

let memberDetailParentId = ''
let memberDetailTab = 'children'
/* 子女编辑面板：open 为 false 时收起；id 为空表示新增态 */
let kidEdit = { open: false, id: '' }

const stackCell = (main, sub = '') => `<div class="cell-stack"><b>${main}</b>${sub ? `<span>${sub}</span>` : ''}</div>`
const ageOf = birthday => {
  if (!birthday) return ''
  const b = new Date(birthday)
  if (Number.isNaN(b.getTime())) return ''
  const n = new Date()
  let age = n.getFullYear() - b.getFullYear()
  const m = n.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && n.getDate() < b.getDate())) age--
  return age >= 0 && age < 120 ? `${age} 岁` : ''
}
const queryTone = q => q === '已查到' ? 'green' : q === '未查到' ? 'amber' : q === '查询中' ? 'blue' : 'slate'

/* 查询回执是异步的：回执到达时若会员详情仍开着，就地刷新查询状态 */
const refreshMemberDetail = (parentId, focus = '') => {
  if (memberDetailParentId === parentId && memberDetailTab === 'children'
    && document.querySelector('#dialog-root .mem-detail')) {
    memberDetailDialog(parentId, 'children', { focus })
  }
}

/* 子女编辑面板：与子女表格同处一个弹层，保存后就地刷新，不叠第二层弹窗 */
function kidEditorHtml(kids, parent) {
  const c = kidEdit.id ? kids.find(x => x.id === kidEdit.id) : null
  const edit = !!c
  const rel = c?.relation || defaultRelation(parent)
  return `<div class="kid-editor">
    <div class="kid-editor-head">
      <div><b>${edit ? `编辑「${esc(c.name)}」` : '新增子女'}</b>
        <span class="kid-tip">${edit ? '修改姓名、生日或身份证号后按最新资料重新查询，历史报告不受影响' : '保存后按家长手机号 + 子女身份证号主动查询'}</span></div>
      <button class="btn-link" data-action="member-child-cancel">收起</button>
    </div>
    <div class="form-grid">
      ${field('子女姓名', `<input id="kidName" value="${esc(c?.name || '')}" placeholder="请输入子女姓名">`, { required: true })}
      ${field('性别', `<select id="kidGender"><option ${!c || c.gender === '女' ? 'selected' : ''}>女</option><option ${c?.gender === '男' ? 'selected' : ''}>男</option></select>`)}
      ${field('亲属关系', `<select id="kidRelation">${relationOpts(rel)}</select>`)}
      ${field('出生日期', `<input id="kidBirthday" type="date" value="${esc(c?.birthday || '')}">`, { required: true })}
      ${field('身份证号', `<input id="kidIdNo" value="" placeholder="${edit ? `原证件 ${esc(c.idNo)}，不修改请留空` : '18 位身份证号'}">`, { required: !edit })}
    </div>
    <div class="kid-editor-foot">
      <span class="kid-tip">${edit ? '身份证号已脱敏展示，留空表示不修改' : '身份证号需为 18 位且与出生日期一致'}</span>
      <div class="btn-row">
        <button class="btn sm" data-action="member-child-cancel">取消</button>
        <button class="btn primary sm" data-action="member-child-save">${edit ? '保存修改' : '保存并查询'}</button>
      </div>
    </div>
  </div>`
}

function memberDetailDialog(parentId, tab = 'children', opt = {}) {
  const s = getState()
  const p = s.parents.find(x => x.id === parentId)
  if (!p) return
  memberDetailParentId = parentId
  memberDetailTab = tab
  kidEdit = { open: opt.editorId !== undefined, id: opt.editorId || '' }
  const focus = opt.focus || ''
  const kids = s.children.filter(c => c.parentId === parentId)
  const ids = new Set(kids.map(c => c.id))
  const reports = s.reports.filter(r => r.parentId === parentId || ids.has(r.childId))
  const tabs = [
    ['children', '名下子女', kids.length],
    ['reports', '关联报告', reports.length],
    ['account', '账号资料', 1]
  ]
  let inner = ''
  if (tab === 'children') {
    const rows = kids.map(c => {
      const n = s.reports.filter(r => r.childId === c.id).length
      return [
        stackCell(esc(c.name), `${esc(c.gender)} · ${ageOf(c.birthday) || '年龄待补'}`),
        esc(c.relation || defaultRelation(p)),
        c.idNo ? `<span class="mono">${esc(c.idNo)}</span>` : tag('未填写', 'slate'),
        `${tag(c.query, queryTone(c.query))}${c.reason ? `<div class="cell-sub">${esc(c.reason)}</div>` : ''}`,
        n ? `${n} 份` : '—',
        `<div class="btn-row">
          <button class="btn sm" data-action="member-child-edit" data-id="${esc(c.id)}">编辑</button>
          ${c.query === '已查到' ? '' : `<button class="btn-link" data-action="member-query" data-id="${esc(c.id)}">重新查询</button>`}
          ${SEED_CHILD_IDS.includes(c.id) ? `<button class="btn-link" data-action="member-child-restore" data-id="${esc(c.id)}">恢复演示数据</button>` : ''}
          <button class="btn-link danger-text" data-action="member-child-unbind" data-id="${esc(c.id)}">解绑</button>
         </div>`
      ]
    })
    rows.forEach((r, i) => { if (kids[i].id === focus) r[0] = `<div class="row-hit">${r[0]}</div>` })
    inner = `<div class="panel-bar">
        <div><b>名下子女</b><span class="panel-sub">子女为独立档案，报告与查询状态均按子女归属</span></div>
        ${kidEdit.open ? '' : `<button class="btn sm" data-action="member-child-add">+ 新增子女</button>`}
      </div>`
      + (kids.length
        ? table(['子女', '与家长关系', '身份证号', '查询状态', '关联报告', '操作'], rows, { compact: true })
        : `<div class="empty-line">该会员尚未绑定子女，点击「新增子女」录入后系统自动发起查询。</div>`)
      + (kidEdit.open ? kidEditorHtml(kids, p) : '')
  } else if (tab === 'reports') {
    const rows = reports.map(r => {
      const dirs = (r.selections || []).map(x => x.manualName
        || (s.directions.find(d => d.id === x.directionId)?.name) || '自定义方向').join('、') || '—'
      const tiers = (r.selections || []).map(x => tierName(s, x.tierId) || '通用兜底档位').join('、') || '—'
      return [
        `<span class="mono">${esc(r.id)}</span>`, esc(r.childName),
        tag(r.status, r.status === '已发布' ? 'green' : r.status === '待发布' ? 'amber' : 'slate'),
        `<span class="cell-note">${esc(dirs)}</span>`, esc(tiers),
        tag(`${(r.volumeSnapshot || []).filter(v => v.open).length}/${VOLUMES.length} 册`, 'teal'),
        `<div class="btn-row">
          <button class="btn sm primary" data-action="report-detail" data-id="${esc(r.id)}">查看报告</button>
         </div>`
      ]
    })
    inner = `<div class="panel-bar">
        <div><b>关联报告</b><span class="panel-sub">按子女归属，展示已选方向、目标档位与开放分册</span></div>
        <span class="panel-sub">共 ${reports.length} 份</span>
      </div>`
      + (reports.length
        ? table(['报告编号', '子女', '状态', '已选培养方向', '目标档位', '开放分册', '操作'], rows, { compact: true })
        : `<div class="empty-line">该会员暂无报告，子女查询成功后会生成待发布报告。</div>`)
  } else {
    inner = `<div class="panel-bar">
        <div><b>账号资料</b><span class="panel-sub">家长身份证为选填，仅用于结果匹配，不填不影响查询</span></div>
      </div>`
      + table(['字段', '内容'], [
        ['会员编号', `<span class="mono">${esc(p.id)}</span>`],
        ['家长姓名', esc(p.name)], ['手机号', `<span class="mono">${esc(p.mobile)}</span>`],
        ['家长身份证', p.idNo ? `<span class="mono">${esc(p.idNo)}</span>` : tag('未填写（选填）', 'slate')],
        ['账号状态', tag(p.status, p.status === '正常' ? 'green' : 'slate')],
        ['来源', esc(p.source)],
        ['注册时间', `<span class="mono">${esc(p.registeredAt)}</span>`],
        ['名下子女', `${kids.length} 人 · 已查到 ${kids.filter(c => c.query === '已查到').length} 人`],
        ['关联报告', `${reports.length} 份`]
      ], { compact: true })
  }
  const strip = kvStrip([
    ['会员编号', p.id], ['家长姓名', p.name],
    ['手机号', p.mobile], ['家长身份证', p.idNo || '未填写（选填）']
  ])
  dialog({
    title: `${p.name} · 会员详情`,
    sub: '一个入口管完：家长资料、名下子女与关联报告。',
    size: 'ultra', confirmText: '关闭', cancelText: '',
    body: `<div class="mem-detail">${strip}
      ${tabBar(tabs, tab, 'member-detail-tab')}${inner}</div>`,
    onConfirm: () => {}
  })
  if (kidEdit.open) setTimeout(() => {
    const box = document.querySelector('#dialog-root .kid-editor')
    const dlg = document.querySelector('#dialog-root .dialog')
    if (!box || !dlg) return
    document.getElementById('kidName')?.focus({ preventScroll: true })
    const delta = box.getBoundingClientRect().bottom - dlg.getBoundingClientRect().bottom
    if (delta > 0) dlg.scrollTop += delta + 16
  }, 0)
}

/* ---------------- 报告详情：页签切换与快照查看（同步报告不展示本地版本历史） ---------------- */
/* ---------------- 培育建议（外部系统同步，只读）：建议书 / 版本 / 同步 ---------------- */
const ADVICE_SECTIONS = [
  ['分级内容', 'content'], ['分级举例', 'example'],
  ['培育方向', 'direction'], ['培育建议', 'suggestion']
]
const entTone = lv => String(lv || '').startsWith('卓越') ? 'amber'
  : String(lv || '').startsWith('优秀') ? 'blue'
  : String(lv || '').startsWith('常态') ? 'slate' : 'teal'

function adviceDetailDialog(id) {
  const st = getState()
  const d = (st.adviceDocs || []).find(x => x.id === id)
  if (!d) { toast('未找到培育建议'); return }
  const gene = geneReportByNo(st, d.reportNo)
  const ver = adviceVersionOf(st, d.versionId)
  /* 一个分册对应一份建议书：先按分册编码（A~F）把条目分组，一册一份，逐份展示，
     不再把全部分册的条目混编进同一份建议书里连续编号 */
  const sections = d.sections || []
  const bookCodes = String(d.books || '').split('').filter(Boolean)
  const books = bookCodes.map(code => ({
    code,
    name: (ELEMENT_BOOKS.find(b => b.code === code) || {}).name || '',
    items: sections.filter(s => s.book === code)
  })).filter(b => b.items.length)
  const info = kvStrip([
    ['建议编号', d.id], ['关联基因报告', d.reportNo],
    ['本人姓名', d.name], ['性别', d.gender],
    ['出生日期', d.birthday], ['年龄', ageLabelOf(d.age)],
    ['匹配口径', d.matchKey], ['所属版本', `${d.versionName}${ver ? `（${ver.status}）` : ''}`],
    ['同步时间', d.syncedAt], ['来源系统', d.source],
    ['覆盖分册', books.length ? `${books.map(b => b.code).join('')}（${books.length} 个分册）` : '—'],
    ['建议书份数', `${books.length} 份（一个分册一份）`],
    ['发布状态', `${d.publishStatus || '已发布'}${(d.publishStatus || '已发布') === '已撤回'
      ? `（撤回于 ${d.withdrawnAt || d.opAt || '—'}）` : ''}`]
  ])
  const blocks = books.map((bk, bi) => {
    const ent = bk.items.reduce((acc, x) => {
      const k = String(x.entropy || '').replace(/级$/, '')
      acc[k] = (acc[k] || 0) + 1
      return acc
    }, {})
    const entText = Object.keys(ent).map(k => `${k} ${ent[k]}`).join(' · ')
    const items = bk.items.map((sec, i) => {
      const rows = ADVICE_SECTIONS.map(([label, key]) => {
        const text = String(sec[key] || '').trim()
        return `<div class="sg-seg"><span class="sg-seg-l">${esc(label)}</span>
          <span class="sg-seg-t">${text ? esc(text) : '—'}</span></div>`
      }).join('')
      return `<div class="adv-item">
        <div class="adv-item-head"><b>第 ${i + 1} 项 · ${esc(sec.factor)}</b>
          <span class="hint">${esc(sec.chapter)} ${tag(sec.entropy, entTone(sec.entropy))}</span></div>${rows}</div>`
    }).join('')
    return `<div class="sub-panel"><div class="sub-panel-head">
        <h4>第 ${bi + 1} 分册 · ${esc(bk.name)} · 建议书</h4>
        <span class="adv-book-meta"><span class="mono">${esc(d.id)}-${esc(bk.code)}</span>
          <span>本册 ${bk.items.length} 项 · 数据熵 ${esc(entText || '—')}</span></span>
      </div>${items}</div>`
  }).join('')
  dialog({
    title: '培育建议书（同步原文）',
    sub: `${d.matchKey} · ${books.length} 个分册对应 ${books.length} 份建议书（一册一份）`,
    size: 'ultra',
    body: `${info}${blocks}
      <div class="form-explain"><b>分册口径</b>每个分册对应一份建议书：基因报告开放几个分册，就同步几份建议书，一册一份、各自独立编号（建议编号 + 分册编码），不跨分册合并。
        <b>只读说明</b>建议书由外部系统按固定格式推送，按「${esc(ADVICE_MATCH_RULE)}」匹配生成${gene ? `，对应基因报告 ${esc(gene.reportNo)}（已同步 ${gene.books.length} 篇）` : ''}；本系统不修改正文，仅同步与更新。</div>`,
    confirmText: '关闭', cancelText: '', onConfirm: () => true
  })
}

function geneReportDialog(reportNo) {
  const s = getState()
  const r = geneReportByNo(s, reportNo)
  if (!r) { toast('未找到基因报告'); return }
  const books = geneBooksOf(r)
  const info = kvStrip([
    ['本人报告ID', r.reportNo], ['本人姓名', r.name],
    ['检验人身份证', geneIdNoOf(s, r) || '未登记'],
    ['性别', r.gender], ['出生日期', r.birthday],
    ['年龄', ageLabelOf(r.age)], ['家长姓名', r.parentName],
    ['与本人关系', r.parentRelation], ['联系电话', r.phone],
    ['报告出品', r.issuer], ['建档日期', r.filedAt],
    ['同步时间', r.syncedAt], ['报告版本', r.version]
  ])
  dialog({
    title: '基因检测报告（同步原文）',
    sub: `${r.name} · ${r.reportNo} · 已同步 ${books.length} 篇`,
    size: 'ultra',
    body: `${info}
      <div class="sub-panel"><div class="sub-panel-head"><h4>已同步篇目（${books.length} 篇）</h4>
        <span class="hint">同一报告 ID 下按人同步实际检测的篇目，不是每人都有全部 6 篇</span></div>
        ${table(['篇目', '报告名称', '所属系列', '章节数', '专项潜质数'], books.map(b => [
          tag(b.code, 'teal'), `<b>${esc(b.name)}</b>`, esc(b.series),
          `${b.chapterCount} 章`, `${b.factorCount} 项`
        ]), { compact: true })}</div>
      <div class="sub-panel"><div class="sub-panel-head"><h4>固定格式说明</h4>
        <span class="hint">${esc(GENE_FORMAT.dataSource)}</span></div>
        <div class="form-explain"><b>封面字段</b>${GENE_FORMAT.cover.join(' / ')}<br>
          <b>正文结构</b>${GENE_FORMAT.sections.join(' → ')}<br>
          <b>分级口径</b>${GENE_FORMAT.entropy.join(' / ')}（数据熵）<br>
          ${esc(GENE_FORMAT.note)}</div></div>`,
    confirmText: '关闭', cancelText: '', onConfirm: () => true
  })
}

/* 一键同步全部报告：按子女身份证号批量向外部基因检测系统拉取，
   弹层先给出「谁会被更新 / 谁会新建 / 谁暂无数据」的预演，确认后才写入。 */
function geneSyncAllDialog() {
  const s = getState()
  const plan = geneSyncPlan(s)
  const willSync = plan.filter(p => p.action === '已同步')
  const willAdd = plan.filter(p => p.action === '待新建')
  const noData = plan.filter(p => p.action === '暂无数据')
  const label = a => a === '已同步' ? tag('刷新同步', 'green')
    : a === '待新建' ? tag('新建报告', 'blue') : tag('暂无数据', 'slate')
  const rows = plan.map(p => [
    `<b>${esc(p.name)}</b> ${p.self ? tag('本人', 'teal') : ''}`,
    `<span class="mono">${esc(p.idNo || '未登记')}</span>`,
    `<span class="mono">${esc(p.reportNo || '—')}</span>`,
    p.books ? `${p.books.length} 篇（${esc(p.books)}）` : '—',
    label(p.action)
  ])
  dialog({
    title: '一键同步全部报告',
    sub: `按子女身份证号向外部基因检测系统批量拉取，共 ${plan.length} 人`,
    size: 'ultra',
    body: `<div class="kv-strip">
        <div class="kv-cell"><span>刷新同步</span><b>${willSync.length} 人</b></div>
        <div class="kv-cell"><span>新建报告</span><b>${willAdd.length} 人</b></div>
        <div class="kv-cell"><span>外部暂无数据</span><b>${noData.length} 人</b></div>
      </div>
      ${table(['子女', '身份证号', '当前基因报告', '已同步篇目', '本次动作'], rows, { compact: true })}
      <div class="form-explain"><b>同步口径</b>以子女身份证号为主键向外部系统查询，一个人一份报告、篇目按实际检测范围返回；
        已有报告的只刷新同步时间与状态，不覆盖篇目与正文；已查到但本地还没有报告的，按外部返回的六篇新建；
        外部暂无该证件号数据的直接跳过，不写任何数据。同步结果只记入操作日志，家长端可见范围不变。</div>`,
    confirmText: '确认同步',
    onConfirm: () => {
      const r = syncAllGeneReports()
      toast(r.msg)
      return r.ok
    }
  })
}

/* 潜质要素文案：按「4 档数据熵 × 3 变体」展示外部系统同步原文，缺失的标「待补写」；
   一屏只展开一档，用页签切换，避免 12 行超长文案把弹层撑到视口外。 */
let elemTextCode = ''
let elemTextLevel = '卓越级'
function elementTextDialog(code, level = '卓越级') {
  const s = getState()
  const item = ELEMENT_ITEMS.find(x => x.code === code)
  if (!item) { toast('未找到潜质要素'); return }
  elemTextCode = code
  elemTextLevel = level
  const { gender, age } = s.elementLibPick || { gender: '男', age: 0 }
  const texts = elementTextsOf(gender, age, item.name)
  const filled = Object.keys(texts).reduce((n, lv) => n + (texts[lv] || []).length, 0)
  const SEGS = [['分级内容', 0], ['分级举例', 1], ['培育方向', 2], ['培育建议', 3]]
  const tabs = ELEMENT_ENTROPY.map(lv => [lv, lv.replace(/级$/, ''), (texts[lv] || []).length])
  const vs = texts[level] || []
  const rows = []
  for (let i = 0; i < ELEMENT_VARIANTS; i++) {
    const body = vs[i] || []
    rows.push([
      `<span style="white-space:nowrap">变体 ${i + 1}</span>`,
      SEGS.map(([label, k]) => `<div class="sg-seg"><span class="sg-seg-l">${label}</span>
        <span class="sg-seg-t">${body[k] ? esc(body[k]) : '<i style="color:var(--muted)">待补写</i>'}</span></div>`).join(''),
      body[0] ? tag('已回填', 'green') : tag('待补写', 'amber')
    ])
  }
  dialog({
    title: '潜质要素文案（同步原文）',
    sub: `${gender} · ${age} 岁 · ${item.code} ${item.name} · ${item.bookName} · 已回填 ${filled}/${item.slots} 条`,
    size: 'ultra',
    body: `${tabBar(tabs, level, 'element-text-tab')}
      <div class="el-text">${table(['变体', '文案原文', '状态'], rows, { compact: true })}</div>
      <div class="form-explain"><b>文库格式</b>${esc(ELEMENT_LIB_COLUMNS.join(' / '))}<br>
        与外部系统文库一致的固定版式；本系统只同步与查看，不新增、不编辑、不改写文案。</div>`,
    confirmText: '关闭', cancelText: '', onConfirm: () => true
  })
}

function adviceVersionHistoryDialog() {
  const s = getState()
  const versions = s.adviceVersions || []
  const rows = versions.map(v => {
    const docs = adviceDocsOfVersion(s, v.id)
    return [
      `<b>${esc(v.name)}</b>`,
      tag(v.status, v.status === '当前生效' ? 'green' : 'slate'),
      `<span class="mono">${esc(v.cycle)}</span>`,
      `${docs.length} 份建议`,
      `<span class="mono">${esc(v.effectiveAt)}</span>`,
      `<span class="mono">${esc(v.syncedAt)}</span>`,
      esc(v.source),
      `<span class="cell-note">${esc(v.note || '—')}</span>`,
      `<div class="btn-row nowrap">
        <button class="btn sm" data-action="advice-version-view" data-id="${esc(v.id)}">查看该版本</button>
       </div>`
    ]
  })
  dialog({
    title: '培育建议版本历史',
    sub: `每 ${ADVICE_CYCLE_MONTHS} 个月由外部系统推送一版；后台保留全部版本，家长端只展示当前生效版本。`,
    size: 'ultra',
    body: table(['版本号', '状态', '生效周期', '建议份数', '生效日期', '同步时间', '来源系统', '更新说明', '操作'], rows, { compact: true })
      + `<div class="form-explain"><b>说明</b>历史版本为外部系统推送时的同步快照，仅供后台回溯，不可编辑；家长端只会看到当前生效版本的内容。</div>`,
    confirmText: '关闭', cancelText: '', onConfirm: () => true
  })
}

/* 按人看历史版本：这个人在每个版本下各有一份当时的建议快照 */
function advicePersonHistoryDialog(reportNo) {
  const s = getState()
  const list = advicePersonHistory(s, reportNo)
  if (!list.length) { toast('未找到该人的培育建议'); return }
  const first = list[0].doc
  const rows = list.map(({ doc: d, version: v }) => {
    const ent = (d.sections || []).reduce((acc, x) => {
      const k = String(x.entropy || '').replace(/级$/, '')
      acc[k] = (acc[k] || 0) + 1
      return acc
    }, {})
    const pub = d.publishStatus || '已发布'
    return [
      `<b>${esc(d.versionName)}</b>${v && v.id === s.currentAdviceVersionId ? tag('当前生效', 'green') : tag('已归档', 'slate')}`,
      `<span class="mono">${esc(v?.cycle || '—')}</span>`,
      esc(d.matchKey),
      `<span class="cell-note">${esc(Object.keys(ent).map(k => `${k} ${ent[k]}`).join(' · ') || '—')}</span>`,
      tag(pub, pub === '已发布' ? 'green' : 'slate'),
      `<span class="mono">${esc(d.syncedAt)}</span>`,
      `<div class="btn-row nowrap">
        <button class="btn sm" data-action="advice-detail" data-id="${esc(d.id)}">查看该版本</button>
       </div>`
    ]
  })
  dialog({
    title: '培育建议 · 历史版本',
    sub: `${first.name} · ${reportNo} · 共 ${list.length} 个版本（每 ${ADVICE_CYCLE_MONTHS} 个月一版）`,
    size: 'ultra',
    body: table(['版本号', '生效周期', '当时匹配口径', '数据熵分布', '发布状态', '同步时间', '操作'], rows, { compact: true })
      + `<div class="form-explain"><b>说明</b>历史版本是外部系统推送当日同步下来的原文快照，仅供后台回溯，不可编辑、不能发布或撤回；
        家长端只会看到当前生效版本里、处于「已发布」状态的那一份。跨版本年龄按同步当日重算，过完生日会换到下一岁分册。</div>`,
    confirmText: '关闭', cancelText: '', onConfirm: () => true
  })
}

/* 逐份发布 / 撤回：只影响家长端可见性，不修改正文 */
function advicePublishDialog(docId, mode = 'publish') {
  const s = getState()
  const d = (s.adviceDocs || []).find(x => x.id === docId)
  if (!d) { toast('未找到培育建议'); return }
  const isPublish = mode === 'publish'
  dialog({
    title: isPublish ? '发布培育建议' : '撤回培育建议',
    sub: `${d.name} · ${d.matchKey} · ${d.versionName}`,
    size: 'wide',
    body: `<div class="kv-strip">
        <div class="kv-cell"><span>所属版本</span><b>${esc(d.versionName)}</b></div>
        <div class="kv-cell"><span>建议项数</span><b>${(d.sections || []).length} 项</b></div>
        <div class="kv-cell"><span>当前状态</span><b>${esc(d.publishStatus || '已发布')}</b></div>
      </div>
      <div class="form-explain"><b>${isPublish ? '发布后' : '撤回后'}</b>${isPublish
        ? '家长端「培育建议」立即可见，正文与所属版本不变，仅改变这一份的可见性。'
        : '家长端「培育建议」立即不再展示，报告、已选培养方向与历史版本均不受影响；可随时重新发布。'}</div>`,
    confirmText: isPublish ? '确认发布' : '确认撤回',
    onConfirm: () => {
      const res = isPublish ? publishAdviceDoc(docId) : withdrawAdviceDoc(docId)
      toast(res.msg)
      return res.ok
    }
  })
}

function adviceSyncDialog() {
  const s = getState()
  const cur = adviceVersionOf(s, s.currentAdviceVersionId)
  const eff = cur?.nextUpdateAt || ''
  const docs = adviceDocsOfVersion(s, s.currentAdviceVersionId)
  dialog({
    title: '接收新一版培育建议',
    sub: `外部系统按「${ADVICE_MATCH_RULE}」重新匹配后整版推送；本系统只接收与归档，不修改内容。`,
    size: 'wide',
    body: `<div class="form-grid">
        ${field('版本号', `<input id="asName" value="${esc(versionNameOf(eff))}">`, { required: true })}
        ${field('生效日期', `<input id="asEff" type="date" value="${esc(eff)}">`, { required: true })}
        ${field('同步说明', `<textarea id="asNote" rows="2" placeholder="例如：外部系统已完成周期更新，按最新检测结果重新匹配"></textarea>`, { span: true })}
      </div>
      <div class="form-explain"><b>接收后</b>新版成为当前生效版本，覆盖 ${docs.length} 份建议（一人一份）；
        ${esc(cur?.name || '当前版本')} 自动归档，家长端即时切换为最新内容；历史版本保留在版本历史中可回溯。</div>`,
    confirmText: '接收并同步',
    onConfirm: () => {
      const res = syncAdviceVersion({
        name: document.getElementById('asName')?.value,
        effectiveAt: document.getElementById('asEff')?.value,
        note: document.getElementById('asNote')?.value
      })
      toast(res.msg)
      return res.ok
    }
  })
}

let reportDetailId = ''
let reportDetailTab = 'selections'
let dlLock = 0
function reportDetailDialog(reportId, tab = 'selections') {
  const r = getState().reports.find(x => x.id === reportId)
  if (!r) { toast('未找到报告'); return }
  reportDetailId = reportId
  reportDetailTab = tab
  dialog({
    title: '报告详情',
    sub: `报告 ${r.id} · ${r.childName} · 页签切换已选培养方向和目标、匹配天赋、基因报告与培育建议`,
    body: reportDetailHtml(reportId, getState(), tab),
    size: 'ultra', confirmText: '关闭', cancelText: '', onConfirm: () => {}
  })
}

/* ---------------- 分册详情：客户基因报告的单册明细（叠加在报告详情之上，关闭后回到原页签） ---------------- */
function reportVolumeDialog(reportId, code) {
  const s = getState()
  const r = s.reports.find(x => x.id === reportId)
  if (!r) { toast('未找到报告'); return }
  const v = (r.volumeSnapshot || []).find(x => x.code === code)
  if (!v) { toast('未找到该分册'); return }
  const root = document.getElementById('dialog-root')
  if (!root) return
  /* 同一份报告只保留一层分册详情，重复点击直接替换，避免叠多层 */
  root.querySelectorAll('.mask-sub').forEach(el => el.remove())

  const match = r.directionSnapshot || {}
  const factors = (r.factorSnapshot || []).filter(f => (f.category || '') === code)
  const chapterOf = fc => (v.chapters || []).find(c => (c.factorCodes || []).includes(fc))?.name || '—'
  const levelCount = ['卓越', '优秀', '优良', '常态']
    .map(l => [l, factors.filter(f => f.level === l).length]).filter(([, n]) => n > 0)
    .map(([l, n]) => `${l} ${n}`).join(' · ')

  const body = `
    ${kvStrip([
      ['报告编号', r.id],
      ['子女', r.childName],
      ['分册', `${v.code} · ${v.shortName || v.name}`],
      ['开放状态', v.open ? '已开放' : '未开放'],
      ['章节', `${v.chapterCount} 章`],
      ['要素', `${v.factorCount} 项`],
      ['数据熵分布', levelCount || '—'],
      ['快照', `${match.version || r.snapshotVersion || 'v1.2'} · ${match.at || r.publishedAt || '—'}`]
    ])}
    <div class="form-explain"><b>本册说明</b>${esc(v.intro || '按发布时冻结的要素结果展示，历史报告不随配置调整变化。')}
      ${v.open ? '' : '<br>该分册<strong>未对家长开放</strong>，家长端不展示，仅后台可查看。'}</div>
    <div style="margin-top:12px">${table(['要素编码', '潜质要素', '数据熵', '所属章节', '固定注解'], factors.map(f => [
      `<span class="mono">${esc(f.code)}</span>`,
      esc(f.name),
      tag(f.level, 'teal'),
      esc(chapterOf(f.code)),
      `<span class="cell-note">${esc(f.note || '按发布时快照冻结')}</span>`
    ]), { compact: true })}</div>`

  const layer = document.createElement('div')
  layer.className = 'mask mask-sub'
  layer.dataset.action = 'sub-mask'
  layer.innerHTML = `<div class="dialog ultra" data-stop="1">
      <div class="dialog-head"><div><span class="eyebrow">基因报告详情</span><h3>${esc(v.name)}</h3>
        <div class="dsub">报告 ${esc(r.id)} · ${esc(r.childName)} · 共 ${factors.length} 项要素结果，按发布快照冻结</div></div>
        <button class="icon-button" data-action="sub-close" aria-label="关闭">×</button></div>
      <div class="dialog-body">${body}</div>
      <div class="dfoot"><button class="btn primary" data-action="sub-close">关闭</button></div>
    </div>`
  root.appendChild(layer)
}

/* ---------------- 培育建议详情：家长端当前展示的那一版、那一册的建议原文 ---------------- */
function reportAdviceDialog(docId, code) {
  const s = getState()
  const d = (s.adviceDocs || []).find(x => x.id === docId)
  if (!d) { toast('未找到培育建议'); return }
  const root = document.getElementById('dialog-root')
  if (!root) return
  root.querySelectorAll('.mask-sub').forEach(el => el.remove())

  const ver = adviceVersionOf(s, d.versionId)
  const book = VOLUMES.find(v => v.code === code)
  const items = (d.sections || []).filter(x => x.book === code)
  const ent = items.reduce((acc, x) => {
    const k = String(x.entropy || '').replace(/级$/, '')
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {})
  const entText = Object.keys(ent).map(k => `${k} ${ent[k]}`).join(' · ') || '—'
  const pub = d.publishStatus || '已发布'

  const blocks = items.map((sec, i) => {
    const segs = ADVICE_SECTIONS.map(([label, key]) => {
      const text = String(sec[key] || '').trim()
      return `<div class="sg-seg"><span class="sg-seg-l">${esc(label)}</span>
        <span class="sg-seg-t">${text ? esc(text) : '—'}</span></div>`
    }).join('')
    return `<div class="adv-item">
      <div class="adv-item-head"><b>第 ${i + 1} 项 · ${esc(sec.factor)}</b>
        <span class="hint">${esc(sec.chapter)} ${tag(sec.entropy, entTone(sec.entropy))}</span></div>${segs}</div>`
  }).join('')

  const body = `
    ${kvStrip([
      ['建议编号', `${d.id}-${code}`],
      ['分册', book ? book.name : code],
      ['关联基因报告', d.reportNo],
      ['本人', `${d.name} · ${ageLabelOf(d.age)}`],
      ['所属版本', `${ver?.name || d.versionName}${ver ? `（${ver.status}）` : ''}`],
      ['覆盖要素', `${items.length} 项`],
      ['数据熵', entText],
      ['发布状态', pub],
      ['同步时间', d.syncedAt],
      ['匹配口径', d.matchKey]
    ])}
    <div class="sub-panel"><div class="sub-panel-head">
        <h4>第 ${(String(d.books || '').split('').filter(Boolean).indexOf(code)) + 1} 分册 · ${esc(book ? book.shortName : code)} · 建议书</h4>
        <span class="adv-book-meta"><span class="mono">${esc(d.id)}-${esc(code)}</span>
          <span>本册 ${items.length} 项 · 数据熵 ${esc(entText)}</span></span>
      </div>${blocks || '<div class="adv-item"><div class="adv-item-head"><b>本册暂无建议条目</b></div></div>'}</div>
    <div class="form-explain"><b>只读说明</b>建议正文由外部系统按固定格式推送，按「${esc(ADVICE_MATCH_RULE)}」匹配生成；
      本系统只同步与展示，不修改正文。家长端看到的正是当前生效版本
      ${esc(ver?.name || d.versionName)} 的这份内容。</div>`

  const layer = document.createElement('div')
  layer.className = 'mask mask-sub'
  layer.dataset.action = 'sub-mask'
  layer.innerHTML = `<div class="dialog ultra" data-stop="1">
      <div class="dialog-head"><div><span class="eyebrow">培育建议</span><h3>${esc(book ? book.name : code)}</h3>
        <div class="dsub">${esc(d.name)} · ${esc(d.id)}-${esc(code)} · ${esc(ver?.name || d.versionName)} · 共 ${items.length} 项建议</div></div>
        <button class="icon-button" data-action="sub-close" aria-label="关闭">×</button></div>
      <div class="dialog-body">${body}</div>
      <div class="dfoot"><button class="btn primary" data-action="sub-close">关闭</button></div>
    </div>`
  root.appendChild(layer)
}

/* ---------------- 发布：选择开放分册 → 冻结方向命中与注解快照 ---------------- */
/* 撤回确认：报告撤回后家长端立即不可见，属可逆动作，先确认再执行 */
function reportWithdrawDialog(reportId) {
  const s = getState()
  const r = s.reports.find(x => x.id === reportId)
  if (!r) { toast('未找到报告'); return }
  dialog({
    title: '撤回报告',
    sub: `${r.id} · ${r.childName}`,
    size: 'wide',
    body: `<div class="kv-strip">
        <div class="kv-cell"><span>报告编号</span><b>${esc(r.id)}</b></div>
        <div class="kv-cell"><span>子女</span><b>${esc(r.childName)}</b></div>
        <div class="kv-cell"><span>当前状态</span><b>${esc(r.status)}</b></div>
        <div class="kv-cell"><span>发布时间</span><b>${esc(r.publishedAt || '—')}</b></div>
      </div>
      <div class="form-explain"><b>撤回后</b>报告状态变为「已撤回」，家长端立即不可见，已选培养方向与历史快照保留；
        需要重新开放时点「恢复发布」，状态回到「已发布」，不重算方向命中、不改版本号。</div>`,
    confirmText: '确认撤回',
    onConfirm: () => { withdrawReport(reportId); toast('报告已撤回，家长端已不可见'); return true }
  })
}

function publishDialog(reportId) {
  const s = getState()
  const r = s.reports.find(x => x.id === reportId)
  if (!r) { toast('未找到报告'); return }
  const vols = (r.volumeSnapshot || []).length ? r.volumeSnapshot : VOLUMES.map((v, i) => ({
    ...v, seq: i + 1, factorCount: 18, chapterCount: 4, open: true
  }))
  const openIds = (r.openVolumeIds || []).length ? r.openVolumeIds : VOLUMES.map(v => v.id)
  const dirs = (s.directions || []).filter(d => d.status !== '停用')
  const tiers = (s.tiers || []).filter(t => t.status !== '停用')
  const preview = previewDirectionHits(s, r)
  const rows = preview.map(p => {
    const d = dirs.find(x => x.id === p.id) || {}
    return [esc(p.name), `${p.hitCount} / ${p.total} 项`,
      `${(d.tiers || []).filter(id => tiers.some(t => t.id === id)).length} 档`]
  })
  dialog({
    title: '整份发布报告',
    sub: `${r.id} · ${r.childName} · 发布时一次性冻结方向命中、档位、注解与分册开放范围`,
    size: 'wide', confirmText: '确认发布并生成快照',
    body: `<div class="kv-strip">
        <div class="kv-cell"><span>报告编号</span><b>${esc(r.id)}</b></div>
        <div class="kv-cell"><span>测评要素</span><b>${r.factorCount || ELEMENT_ITEMS.length} 项</b></div>
        <div class="kv-cell"><span>培养方向</span><b>${dirs.length} 个</b></div>
        <div class="kv-cell"><span>目标档位</span><b>${tiers.length} 档</b></div>
        <div class="kv-cell"><span>当前版本</span><b>${esc(r.snapshotVersion)}</b></div>
      </div>
      <div class="form-section"><div class="section-title">本次开放分册（共 ${VOLUMES.length} 册）</div>
        <div class="volume-check-grid">${vols.map(v => `<label class="volume-check">
          <input type="checkbox" name="pubVolume" value="${esc(v.id)}" ${openIds.includes(v.id) ? 'checked' : ''}>
          <span><b>${esc(v.name)}</b><small>${v.factorCount} 项 · ${v.chapterCount} 章</small></span></label>`).join('')}</div>
      </div>
      <div class="form-section"><div class="section-title">将写入快照的方向命中结果</div>
        ${table(['培养方向', '命中项数', '可选档位'], rows, { compact: true })}</div>
      <div class="form-explain"><b>冻结规则</b>发布后家长端只读本次快照；后续调整方向、档位、分级或注解配置不会改变历史报告。如需按新配置重算，请在报告详情中执行「重新生成快照」并留痕。</div>`,
    onConfirm: () => {
      const ids = [...document.querySelectorAll('input[name="pubVolume"]:checked')].map(x => x.value)
      if (!ids.length) { toast('请至少开放一个分册'); return false }
      const res = publishReport(reportId, { openVolumeIds: ids })
      toast(res.msg)
      return res.ok
    }
  })
}

/* ---------------- 培养方向：单表页面 + 配置弹层 ---------------- */
let configDirectionId = ''
let configDraft = null
/* 配置弹层当前选中的分册：与潜质要素文库的 6 个分册口径一致 */
let configBook = ''

function elementOptionsHtml(book = '') {
  return ELEMENT_BOOKS.filter(b => !book || b.code === book)
    .map(b => `<optgroup label="${esc(b.code)} ${esc(b.name)}（${b.count} 项）">${
      ELEMENT_ITEMS.filter(x => x.book === b.code)
        .map(x => `<option value="${esc(x.code)}" title="${esc(x.name)}">${esc(x.name)}（${esc(x.code)}）</option>`).join('')
    }</optgroup>`).join('')
}

function directionConfigBody(draft) {
  const s = getState()
  const factorOptions = elementOptionsHtml(configBook)
  const rows = draft.requirements.map(r => {
    /* 可选要素只来自潜质要素文库，编码即 A-01 ~ F-23 */
    const el = elementByCode(r.code)
    const f = el || s.factors.find(x => x.code === r.code)
    return [
      `<span class="mono">${esc(r.code)}</span>`,
      esc(f?.name || r.code),
      esc(el ? `${el.book} ${el.bookName}` : (f?.categoryName || '—')),
      `<select data-cfg="level" data-code="${esc(r.code)}">${s.levelsData.map(l =>
        `<option value="${esc(l.name)}" ${r.level === l.name ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select>`,
      `<button class="btn-link danger-text" type="button" data-action="dir-cfg-remove-factor" data-code="${esc(r.code)}">移除</button>`
    ]
  })
  const tiers = activeTierList(s)
  const tierChecks = tiers.map(t => `<label class="tier-chip ${draft.tiers.includes(t.id) ? 'on' : ''}">
      <span><input type="checkbox" data-cfg-tier="${esc(t.id)}" value="${esc(t.id)}" ${draft.tiers.includes(t.id) ? 'checked' : ''}>${esc(t.name)}${t.preset ? tag('默认', 'teal') : ''}</span>
      <small>${esc(t.teacher)} · ${esc(t.freq)}</small></label>`).join('')
  const defaultOptions = draft.tiers.length
    ? draft.tiers.map(id => `<option value="${esc(id)}" ${draft.defaultTierId === id ? 'selected' : ''}>${esc(tierName(s, id))}</option>`).join('')
    : '<option value="">请先启用档位</option>'
  return `
    <div class="form-explain"><b>配置规则</b>可选要素来自「天赋规则 → 潜质要素」文库（${ELEMENT_BOOKS.length} 个分册 / ${ELEMENT_ITEMS.length} 项），按分册筛选后逐项添加并设置要求分级；至少配置一项要素和一个目标档位后方可启用。家长端按命中条数排序展示，命中越多越靠前。目标档位在「目标档位维护」中统一管理。</div>
    <div class="cfg-section">基础信息</div>
    <div class="form-grid">
      ${field('方向名称', `<input id="cfgName" value="${esc(draft.name)}" placeholder="请输入方向名称">`, { required: true })}
      ${field('方向编码', `<input id="cfgCode" value="${esc(draft.code)}" placeholder="例如：DIR-007">`, { required: true })}
      ${field('方向说明', `<input id="cfgDesc" value="${esc(draft.desc)}" placeholder="一句话说明">`, { span: true })}
      ${field('状态', `<select id="cfgStatus"><option value="停用" ${draft.status === '停用' ? 'selected' : ''}>停用</option><option value="启用" ${draft.status === '启用' ? 'selected' : ''}>启用</option></select>`)}
      ${field('配置版本', `<input value="${esc(draft.version)}" disabled>`)}
    </div>
    <div class="cfg-section"><span>要素配置</span><span class="hint">实际分级达到要求分级即记 1 条命中</span></div>
    <div class="cfg-toolbar">
      <label>分册筛选<select id="cfgCategory" data-change="dir-cfg-book"><option value="">全部分册</option>${ELEMENT_BOOKS.map(b => `<option value="${esc(b.code)}"${configBook === b.code ? ' selected' : ''}>${esc(b.code)} ${esc(b.name)}（${b.count}）</option>`).join('')}</select></label>
      <label>选择潜质要素（可多选）<select id="cfgFactor" multiple>${factorOptions}</select></label>
      <div class="btn-row">
        <button class="btn sm primary" type="button" data-action="dir-cfg-add-factor">添加所选</button>
        <button class="btn sm" type="button" data-action="dir-cfg-clear">清空</button>
      </div>
    </div>
    ${table(['要素编码', '潜质要素', '所属分册', '要求分级', '操作'], rows, { compact: true })}
    <div class="cfg-section">目标档位</div>
    <div class="tier-checks">${tierChecks || '<span class="hint">暂无启用档位，请先在目标档位维护中启用。</span>'}</div>
    <div class="form-grid">
      ${field('默认档位', `<select id="cfgDefaultTier">${defaultOptions}</select>`)}
      ${field('全局默认档位', `<input value="${esc(tierName(s, s.defaultTierId) || '未设置')}" disabled>`)}
    </div>
    `
}

function renderDirectionConfigDialog() {
  if (!configDraft) return
  dialog({
    title: '配置培养方向',
    sub: '一张表完成要素、要求分级与目标档位配置；保存后生成新版本。',
    size: 'ultra',
    body: directionConfigBody(configDraft),
    confirmText: '保存配置',
    onConfirm: saveDirectionConfig
  })
}

function syncDirectionDraft() {
  if (!configDraft) return
  const box = document.querySelector('#dialog-root .dialog')
  if (!box) return
  configDraft.name = box.querySelector('#cfgName')?.value?.trim() || configDraft.name
  configDraft.code = box.querySelector('#cfgCode')?.value?.trim() || configDraft.code
  configDraft.desc = box.querySelector('#cfgDesc')?.value?.trim() || ''
  configDraft.status = box.querySelector('#cfgStatus')?.value || configDraft.status
  configDraft.requirements = [...box.querySelectorAll('[data-cfg="level"]')].map(select => ({
    code: select.dataset.code,
    level: select.value || '优良'
  }))
  configDraft.tiers = [...box.querySelectorAll('[data-cfg-tier]:checked')].map(x => x.value)
  configDraft.defaultTierId = box.querySelector('#cfgDefaultTier')?.value || configDraft.defaultTierId
}

function refreshTierUi() {
  if (!configDraft) return
  const box = document.querySelector('#dialog-root .dialog')
  if (!box) return
  box.querySelectorAll('.tier-chip').forEach(chip => {
    const input = chip.querySelector('[data-cfg-tier]')
    if (input) chip.classList.toggle('on', input.checked)
  })
  const sel = box.querySelector('#cfgDefaultTier')
  if (!sel) return
  const ids = configDraft.tiers
  sel.innerHTML = ids.length
    ? ids.map(id => `<option value="${esc(id)}" ${configDraft.defaultTierId === id ? 'selected' : ''}>${esc(tierName(getState(), id))}</option>`).join('')
    : '<option value="">请先启用档位</option>'
  if (ids.length && !ids.includes(configDraft.defaultTierId)) {
    configDraft.defaultTierId = ids[0]
    sel.value = ids[0]
  }
}

function openDirectionConfig(id) {
  const s = getState()
  const d = (s.directions || []).find(x => x.id === id)
  if (!d) { toast('未找到培养方向'); return }
  configDirectionId = id
  configBook = ''
  configDraft = {
    id: d.id, name: d.name, code: d.code, desc: d.desc,
    status: d.status, version: d.version,
    requirements: (d.requirements || []).map(r => ({ ...r })),
    tiers: [...(d.tiers || [])],
    defaultTierId: d.defaultTierId || ''
  }
  renderDirectionConfigDialog()
}

function saveDirectionConfig() {
  syncDirectionDraft()
  if (!configDraft || !configDirectionId) return true
  const s = getState()
  if (!configDraft.name) { toast('请填写方向名称'); return false }
  if (!configDraft.code) { toast('请填写方向编码'); return false }
  if ((s.directions || []).some(d => d.id !== configDirectionId && d.code === configDraft.code)) {
    toast('方向编码已存在'); return false
  }
  if (!configDraft.requirements.length) { toast('请至少选择一项要素'); return false }
  for (const r of configDraft.requirements) {
    if (!s.factors.some(f => f.code === r.code) && !elementByCode(r.code)) { toast(`要素 ${r.code} 不存在`); return false }
    if (!s.levelsData.some(l => l.name === r.level)) { toast('要求分级不合法'); return false }
  }
  const activeIds = activeTierList(s).map(t => t.id)
  configDraft.tiers = configDraft.tiers.filter(id => activeIds.includes(id))
  if (!configDraft.tiers.length) { toast('请至少启用一个目标档位'); return false }
  if (!configDraft.tiers.includes(configDraft.defaultTierId)) configDraft.defaultTierId = configDraft.tiers[0]
  const result = saveDirection(configDirectionId, {
    name: configDraft.name, code: configDraft.code, desc: configDraft.desc,
    status: configDraft.status,
    requirements: configDraft.requirements.map(r => ({ code: r.code, level: r.level })),
    tiers: configDraft.tiers,
    defaultTierId: configDraft.defaultTierId
  })
  if (!result.ok) { toast(result.msg); return false }
  toast('方向配置已保存，已生成新版本')
  configDraft = null
  configDirectionId = ''
  return true
}

function tierManageBody() {
  const s = getState()
  const rows = (s.tiers || []).map(t => [
    `<b>${esc(t.name)}</b>${t.preset ? tag('默认', 'teal') : ''}`,
    esc(t.teacher), esc(t.freq),
    tag(t.status, t.status === '启用' ? 'green' : 'slate'),
    t.id === s.defaultTierId ? tag('全局默认', 'blue') : '—',
    `<div class="btn-row">
      <button class="btn sm" data-action="tier-edit" data-id="${esc(t.id)}">编辑</button>
      <button class="btn sm" data-action="tier-default" data-id="${esc(t.id)}">设为默认</button>
      <button class="btn sm" data-action="tier-toggle" data-id="${esc(t.id)}">${t.status === '启用' ? '停用' : '启用'}</button>
      ${t.preset ? '' : `<button class="btn-link danger-text" data-action="tier-delete" data-id="${esc(t.id)}">删除</button>`}
     </div>`
  ])
  return `<div class="form-explain"><b>档位规则</b>系统固定四档（启蒙 / 养成 / 精进 / 冲刺），不提供新增档位入口；可编辑文案与建议师资、设置全局默认档位，停用某档位后所有方向同步不可选。</div>
    ${table(['档位名称', '建议师资', '建议频次', '状态', '默认', '操作'], rows, { compact: true })}`
}

function tierManageDialog() {
  dialog({
    title: '目标档位维护',
    sub: '系统固定四档，可编辑文案、停用与设置全局默认档位。',
    size: 'wide', confirmText: '关闭', cancelText: '',
    body: tierManageBody(),
    onConfirm: () => {}
  })
}

function openTierEditDialog(id) {
  const s = getState()
  const t = (s.tiers || []).find(x => x.id === id)
  if (!t) return
  dialog({
    title: '编辑目标档位', sub: '修改后将同步到家长端展示。',
    body: `<div class="form-grid">
      ${field('档位名称', `<input id="editTierName" value="${esc(t.name)}">`, { required: true })}
      ${field('建议师资', `<input id="editTierTeacher" value="${esc(t.teacher)}">`)}
      ${field('建议频次', `<input id="editTierFreq" value="${esc(t.freq)}">`)}
      ${field('档位说明', `<textarea id="editTierDesc" rows="3">${esc(t.desc)}</textarea>`, { span: true })}
    </div>`,
    onConfirm: () => {
      const name = document.getElementById('editTierName')?.value?.trim()
      if (!name) { toast('请填写档位名称'); return false }
      if ((getState().tiers || []).some(x => x.id !== id && x.name === name && x.status === '启用')) {
        toast('档位名称已存在'); return false
      }
      const r = updateTier(id, {
        name, headline: name,
        teacher: document.getElementById('editTierTeacher')?.value?.trim() || '待配置',
        freq: document.getElementById('editTierFreq')?.value?.trim() || '待配置',
        desc: document.getElementById('editTierDesc')?.value?.trim() || `${name}档位。`
      })
      toast(r.msg || '档位已保存')
      setTimeout(() => tierManageDialog(), 0)
      return true
    }
  })
}

function manualMergeBody() {
  const s = getState()
  const pending = (s.manualDirections || []).filter(m => m.status === '待归并')
  const options = (s.directions || []).map(d => `<option value="${esc(d.id)}">${esc(d.name)}</option>`).join('')
  const rows = pending.map(m => [
    `<b>${esc(m.name)}</b>`, `${m.count} 次`, tag(m.status, 'amber'),
    `<div class="btn-row">
      <button class="btn sm" data-action="manual-merge" data-id="${esc(m.id)}">归并</button>
      <button class="btn sm" data-action="manual-formal" data-id="${esc(m.id)}">转为正式方向</button>
     </div>`
  ])
  return `<div class="form-explain"><b>归并规则</b>归并到正式方向后写入方向别名；转为正式方向会生成一条停用方向，需继续配置要素与要求分级。</div>
    <div class="form-grid">${field('默认归并到', `<select id="manualTarget">${options || '<option value="">暂无正式方向</option>'}</select>`)}</div>
    ${table(['自定义名称', '出现次数', '状态', '操作'], rows, { compact: true })}`
}

function manualMergeDialog() {
  dialog({
    title: '自定义方向归并',
    sub: '家长手动填写的方向可归并到正式方向，或转为新的正式方向。',
    size: 'wide', confirmText: '关闭', cancelText: '',
    body: manualMergeBody(),
    onConfirm: () => {}
  })
}

/* ---------------- 天赋规则：分类 / 要素 / 分级 / 注解表单 ---------------- */
function categoryDialog(code = '') {
  const s = getState()
  const c = s.categories.find(x => x.code === code)
  dialog({
    title: c ? '编辑分类' : '新增分类',
    sub: c ? '分类编码为唯一标识，不可修改。' : '分类按要素编码前缀分组，新增后可在要素表中选用。',
    body: `<div class="form-grid">
      ${field('分类编码', `<input id="catCode" value="${esc(c?.code || '')}" ${c ? 'disabled' : ''} placeholder="例如：A5G">`, { required: true })}
      ${field('分类名称', `<input id="catName" value="${esc(c?.name || '')}" placeholder="请输入分类名称">`, { required: true })}
    </div>`,
    onConfirm: () => {
      const r = saveCategory({
        originCode: c?.code || '',
        code: document.getElementById('catCode')?.value || '',
        name: document.getElementById('catName')?.value || ''
      })
      if (!r.ok) { toast(r.msg); return false }
      toast(r.msg || '分类已保存')
      return true
    }
  })
}

function factorDialog(code = '') {
  const s = getState()
  const f = s.factors.find(x => x.code === code)
  const options = s.categories.map(c => `<option value="${esc(c.code)}" ${f?.category === c.code ? 'selected' : ''}>${esc(c.code)} ${esc(c.name)}</option>`).join('')
  dialog({
    title: f ? '编辑要素' : '新增要素',
    sub: f ? '要素编码为唯一标识，不可修改；保存后关联固定注解同步更新。' : '新增后按现有分级自动生成固定注解。',
    body: `<div class="form-grid">
      ${field('要素编码', `<input id="fCode" value="${esc(f?.code || '')}" ${f ? 'disabled' : ''} placeholder="例如：A-27">`, { required: true })}
      ${field('要素名称', `<input id="fName" value="${esc(f?.name || '')}" placeholder="请输入要素名称">`, { required: true })}
      ${field('所属分类', `<select id="fCat">${options}</select>`, { required: true })}
      ${field('状态', `<select id="fStatus"><option ${f?.status === '启用' ? 'selected' : ''}>启用</option><option ${f?.status === '停用' ? 'selected' : ''}>停用</option></select>`)}
    </div>`,
    onConfirm: () => {
      const r = saveFactor({
        originCode: f?.code || '',
        code: document.getElementById('fCode')?.value || '',
        name: document.getElementById('fName')?.value || '',
        category: document.getElementById('fCat')?.value || '',
        status: document.getElementById('fStatus')?.value || '启用'
      })
      if (!r.ok) { toast(r.msg); return false }
      if (!f?.code) jumpToLastPage('factors', getState().factors.length)
      toast(r.msg || '要素已保存')
      return true
    }
  })
}

function levelDialog(code = '') {
  const s = getState()
  const l = s.levelsData.find(x => x.code === code)
  dialog({
    title: l ? '编辑分级' : '新增分级',
    sub: l ? '修改分级名称会同步更新固定注解。' : '新增分级会为每项要素生成一条对应固定注解。',
    body: `<div class="form-grid">
      ${field('分级编码', `<input id="lvCode" value="${esc(l?.code || '')}" ${l ? 'disabled' : ''} placeholder="例如：LV5">`, { required: true })}
      ${field('分级名称', `<input id="lvName" value="${esc(l?.name || '')}" placeholder="例如：顶尖">`, { required: true })}
      ${field('级序', `<input id="lvOrder" type="number" min="1" value="${l?.order || s.levelsData.length + 1}">`)}
      ${field('得分范围', `<input id="lvRange" value="${esc(l?.range || '')}" placeholder="例如：0–59">`)}
    </div>`,
    onConfirm: () => {
      const r = saveLevel({
        originCode: l?.code || '',
        code: document.getElementById('lvCode')?.value || '',
        name: document.getElementById('lvName')?.value || '',
        order: document.getElementById('lvOrder')?.value || 1,
        range: document.getElementById('lvRange')?.value || '',
        status: '启用'
      })
      if (!r.ok) { toast(r.msg); return false }
      toast(r.msg || '分级已保存')
      return true
    }
  })
}

/* 注解正文行：一个组合可维护多条话术，小程序端每次随机展示其中一条 */
const noteTextRow = (t = '') => `<div class="note-text-row">
  <textarea rows="3" data-note-item placeholder="请输入该分级的固定解读话术">${esc(t)}</textarea>
  <button class="btn-link danger-text" type="button" data-action="note-text-del">删除</button>
</div>`

function noteDialog(id = '') {
  const s = getState()
  const n = s.notes.find(x => x.id === id)
  const factorOptions = s.factors.map(f => `<option value="${esc(f.code)}" ${n?.factorCode === f.code ? 'selected' : ''}>${esc(f.code)} ${esc(f.name)}</option>`).join('')
  const levelOptions = s.levelsData.map(l => `<option value="${esc(l.name)}" ${n?.level === l.name ? 'selected' : ''}>${esc(l.name)}</option>`).join('')
  const texts = (Array.isArray(n?.texts) && n.texts.filter(Boolean).length) ? n.texts.filter(Boolean) : [n?.note || '']
  /* 年龄条件只收具体年龄（岁），不再接受区间；旧缓存里的区间取起始岁数 */
  const ageNum = String(n?.ageRange || '').match(/\d+/)?.[0] || ''
  dialog({
    title: n ? '编辑固定注解' : '新增固定注解',
    sub: n ? '要素与分级为唯一组合，不可修改；可调整注解正文与适用条件。' : '注解按「要素 + 分级」一条，报告发布时保存命中快照。',
    size: 'wide',
    body: `<div class="form-grid">
      ${field('潜质要素', `<select id="nFactor" ${n ? 'disabled' : ''}>${factorOptions}</select>`, { required: true })}
      ${field('分级', `<select id="nLevel" ${n ? 'disabled' : ''}>${levelOptions}</select>`, { required: true })}
      ${field('年龄条件', `<input id="nAge" type="number" min="0" max="18" step="1" placeholder="请输入具体年龄（岁）" value="${esc(ageNum)}">`)}
      ${field('性别条件', `<select id="nGender"><option value="男"${n?.gender === '女' ? '' : ' selected'}>男</option><option value="女"${n?.gender === '女' ? ' selected' : ''}>女</option></select>`)}
      <div class="form-field span-2"><span>注解正文 <em>必填</em></span>
        <div id="nTextList">${texts.map(t => noteTextRow(t)).join('')}</div>
        <div class="btn-row" style="margin-top:8px">
          <button class="btn sm" type="button" data-action="note-text-add">＋ 增加一条注解</button>
        </div>
        <span class="hint">可维护多条注解，小程序端每次随机展示其中一条。</span>
      </div>
      ${field('状态', `<select id="nStatus"><option ${n?.status === '启用' ? 'selected' : ''}>启用</option><option ${n?.status === '停用' ? 'selected' : ''}>停用</option></select>`)}
    </div>`,
    onConfirm: () => {
      const texts = [...document.querySelectorAll('#nTextList [data-note-item]')]
        .map(el => (el.value || '').trim()).filter(Boolean)
      if (!texts.length) { toast('请至少填写一条注解正文'); return false }
      const r = saveNote({
        originId: n?.id || '',
        factorCode: document.getElementById('nFactor')?.value || '',
        level: document.getElementById('nLevel')?.value || '',
        note: texts[0],
        texts,
        age: document.getElementById('nAge')?.value || '',
        gender: document.getElementById('nGender')?.value || '男',
        status: document.getElementById('nStatus')?.value || '启用'
      })
      if (!r.ok) { toast(r.msg); return false }
      toast(r.msg || '固定注解已保存')
      return true
    }
  })
}

/* ---------------- 资料导入：各规则页自带 ---------------- */
const IMPORT_META = {
  factors: { name: '天赋要素模板', fields: '要素编码、要素名称、分类前缀、状态', count: '158 行 / 本次 3 行' },
  notes: { name: '固定注解模板', fields: '要素编码、分级、注解正文、年龄条件（具体年龄）、性别条件（男 / 女）', count: '632 行 / 本次 3 行' },
  levels: { name: '分级与结果范围模板', fields: '分级编码、分级名称、级序、得分范围', count: '4 行 / 本次 3 行' }
}
const IMPORT_ROWS = {
  factors: [
    { code: 'A-27', name: '体格协调潜质', category: 'A', ok: true },
    { code: 'A-28', name: '动作节律潜质', category: 'A', ok: true },
    { code: 'A-27', name: '重复编码', category: 'A', ok: false, reason: '要素编码与本文件第 1 行重复' }
  ],
  notes: [
    { factorCode: 'B-01', level: '卓越', note: '本体感知注意表现突出，建议提供开放式探究任务与跨情境迁移练习。', ok: true },
    { factorCode: 'B-02', level: '优秀', note: '视主观注意发展良好，可增加多材料对比与规律总结类任务。', ok: true },
    { factorCode: 'Z-99', level: '卓越', note: '要素编码不存在', ok: false, reason: '要素编码 Z-99 不存在' }
  ],
  levels: [
    { code: 'LV1', range: '0–59', order: 1, ok: true },
    { code: 'LV4', range: '90–100', order: 4, ok: true },
    { code: 'LV9', range: '—', order: 9, ok: false, reason: '分级编码 LV9 不存在' }
  ]
}
const rowLabel = (kind, r) => kind === 'factors' ? `${r.code} ${r.name}（${r.category}）`
  : kind === 'notes' ? `${r.factorCode} · ${r.level} · ${r.note.slice(0, 18)}…`
    : `${r.code} · 得分范围 ${r.range} · 级序 ${r.order}`

function importDialog(kind) {
  const meta = IMPORT_META[kind]
  if (!meta) return
  const rows = IMPORT_ROWS[kind]
  const okCount = rows.filter(r => r.ok).length
  const badCount = rows.length - okCount
  const mapRows = meta.fields.split('、').map((f, i) => [
    esc(f), esc(['业务主键', '展示名称', '关联字段', '适用范围', '启用标识'][i] || '业务字段'),
    i === 0 ? tag('必填', 'amber') : '选填', esc(['唯一编码', '中文名称', '关联关系', '条件值', '启用状态'][i] || '文本')
  ])
  const preview = rows.map((r, i) => [
    `${i + 1}`, `<span class="cell-note">${esc(rowLabel(kind, r))}</span>`,
    r.ok ? tag('通过', 'green') : tag('失败', 'red'),
    esc(r.ok ? (kind === 'factors' ? '新增要素并生成固定注解' : kind === 'notes' ? '覆盖同要素同分级注解' : '更新分级结果范围') : r.reason)
  ])
  dialog({
    title: '导入规则数据',
    sub: `${meta.name}`,
    size: 'wide', confirmText: '关闭', cancelText: '',
    body: `<div class="form-explain"><b>导入说明</b>${esc(meta.fields)}；校验失败的行不会被写入，可单独下载错误明细。当前示例 ${okCount} 行通过、${badCount} 行失败。</div>
      <div class="form-grid">
        ${field('导入模板', `<input value="${esc(meta.name)}" disabled>`)}
        ${field('数据规模', `<input value="${esc(meta.count)}" disabled>`)}
        ${field('待导入文件', '<input value="已选择：tongjia-rule-20261106.xlsx" disabled>', { span: true })}
      </div>
      <div class="cfg-section">字段映射</div>
      ${table(['模板字段', '系统字段', '是否必填', '示例'], mapRows, { compact: true })}
      <div class="cfg-section">数据校验预览</div>
      ${table(['行号', '数据内容', '校验结果', '处理建议'], preview, { compact: true })}
      <div class="btn-row" style="margin-top:12px;justify-content:flex-end">
        <button class="btn sm" data-action="import-error" data-kind="${esc(kind)}">下载错误明细</button>
        <button class="btn primary sm" data-action="import-confirm" data-kind="${esc(kind)}">执行导入（${okCount} 行）</button>
      </div>`,
    onConfirm: () => {}
  })
}

/* ---------------- 系统管理：用户 / 菜单 / 角色 / 日志 ---------------- */
function userDialog(id = '') {
  const s = getState()
  const u = s.backUsers.find(x => x.id === id)
  const roleOptions = s.roles.map(r => `<option ${u?.role === r.name ? 'selected' : ''}>${esc(r.name)}</option>`).join('')
  dialog({
    title: u ? '编辑用户' : '新增用户', sub: '后台账号独立于家长账号，权限由角色配置决定。',
    body: `<div class="form-grid">
      ${field('账号', `<input id="dlgAccount" value="${esc(u?.account || '')}" placeholder="登录账号">`, { required: true })}
      ${field('姓名', `<input id="dlgUserName" value="${esc(u?.name || '')}" placeholder="请输入姓名">`, { required: true })}
      ${field('角色', `<select id="dlgRole">${roleOptions}</select>`)}
      ${field('状态', `<select id="dlgStatus"><option ${u?.status === '正常' ? 'selected' : ''}>正常</option><option ${u?.status === '停用' ? 'selected' : ''}>停用</option></select>`)}
    </div>`,
    onConfirm: () => {
      const r = saveBackUser({
        originId: u?.id || '',
        account: document.getElementById('dlgAccount')?.value || '',
        name: document.getElementById('dlgUserName')?.value || '',
        role: document.getElementById('dlgRole')?.value || '',
        status: document.getElementById('dlgStatus')?.value || '正常'
      })
      if (!r.ok) { toast(r.msg); return false }
      toast(r.msg)
      return true
    }
  })
}

function menuDialog(id) {
  const s = getState()
  const m = s.menuConfig.find(x => x.id === id)
  if (!m) return
  const roleOptions = ROLE_OPTIONS.map(r => `<option ${m.roles === r ? 'selected' : ''}>${esc(r)}</option>`).join('')
  const groups = menuTree(s)
  const groupOptions = (groups.includes(m.group) ? groups : [m.group, ...groups])
    .map(g => `<option value="${esc(g)}" ${m.group === g ? 'selected' : ''}>${esc(g)}</option>`).join('')
  dialog({
    title: '编辑菜单', sub: '停用后该菜单不在侧栏展示；排序数值决定展示顺序。',
    body: `<div class="form-grid">
      ${field('菜单名称', `<input id="mName" value="${esc(m.name)}">`, { required: true })}
      ${field('所属一级', `<select id="mGroup">${groupOptions}</select>`, { required: true })}
      ${field('路由', `<input id="mPath" value="${esc(m.path)}">`)}
      ${field('排序', `<input id="mSort" type="number" min="1" value="${m.sort}">`)}
      ${field('可见角色', `<select id="mRoles">${roleOptions}</select>`)}
      ${field('状态', `<select id="mStatus"><option ${m.status === '启用' ? 'selected' : ''}>启用</option><option ${m.status === '停用' ? 'selected' : ''}>停用</option></select>`)}
    </div>`,
    onConfirm: () => {
      const name = document.getElementById('mName')?.value?.trim()
      if (!name) { toast('请填写菜单名称'); return false }
      const r = saveMenu(id, {
        name,
        group: document.getElementById('mGroup')?.value?.trim() || m.group,
        path: document.getElementById('mPath')?.value?.trim() || m.path,
        sort: Number(document.getElementById('mSort')?.value) || m.sort,
        roles: document.getElementById('mRoles')?.value || m.roles,
        status: document.getElementById('mStatus')?.value || m.status
      })
      if (!r.ok) { toast(r.msg); return false }
      toast(r.msg)
      return true
    }
  })
}

function menuGroupDialog(id = '') {
  const s = getState()
  const g = s.menuGroups.find(x => x.id === id)
  dialog({
    title: g ? '编辑一级分组' : '新增一级分组',
    sub: '一级分组决定侧栏级联层级，改名会同步更新其下所有二级菜单。',
    body: `<div class="form-grid">
      ${field('分组名称', `<input id="gName" value="${esc(g?.name || '')}" placeholder="请输入分组名称">`, { required: true })}
      ${field('图标', `<input id="gIcon" value="${esc(g?.icon || '▦')}" placeholder="单个字符">`)}
      ${field('状态', `<select id="gStatus"><option ${g?.status === '启用' ? 'selected' : ''}>启用</option><option ${g?.status === '停用' ? 'selected' : ''}>停用</option></select>`)}
    </div>`,
    onConfirm: () => {
      const r = saveMenuGroup({
        originId: g?.id || '',
        name: document.getElementById('gName')?.value || '',
        icon: document.getElementById('gIcon')?.value || '',
        status: document.getElementById('gStatus')?.value || '启用'
      })
      if (!r.ok) { toast(r.msg); return false }
      toast(r.msg)
      return true
    }
  })
}

function roleDialog(name = '') {
  const s = getState()
  const r = s.roles.find(x => x.name === name)
  const groups = [...new Set(s.menuConfig.map(m => m.group))]
  const boxes = groups.map(g => `<label class="tier-chip on" style="min-width:150px">
      <span><input type="checkbox" data-role-group value="${esc(g)}" checked>${esc(g)}</span></label>`).join('')
  dialog({
    title: r ? '编辑角色' : '新增角色', sub: '角色可见范围由菜单分组决定，用户列表按角色分配权限。',
    size: 'wide',
    body: `<div class="form-grid">
      ${field('角色名称', `<input id="rName" value="${esc(r?.name || '')}" placeholder="例如：数据复核员">`, { required: true })}
      ${field('状态', `<select id="rStatus"><option ${r?.status === '启用' ? 'selected' : ''}>启用</option><option ${r?.status === '停用' ? 'selected' : ''}>停用</option></select>`)}
      ${field('可见菜单范围', `<input id="rScope" value="${esc(r?.scope || '')}" placeholder="例如：工作台、报告管理、会员管理（只读）">`, { span: true })}
    </div>
    <div class="cfg-section">菜单分组</div>
    <div class="tier-checks">${boxes}</div>`,
    onConfirm: () => {
      const nm = document.getElementById('rName')?.value?.trim()
      if (!nm) { toast('请填写角色名称'); return false }
      const picked = [...document.querySelectorAll('[data-role-group]:checked')].map(x => x.value)
      const scope = document.getElementById('rScope')?.value?.trim() || picked.join('、')
      const result = saveRole({
        originName: r?.name || '', name: nm, scope,
        status: document.getElementById('rStatus')?.value || '启用'
      })
      if (!result.ok) { toast(result.msg); return false }
      toast(result.msg)
      return true
    }
  })
}

function logDialog(time, action) {
  const s = getState()
  const l = s.opLogs.find(x => x.time === time && x.action === action)
  if (!l) return
  dialog({
    title: '操作日志详情', sub: `${l.time} · ${l.action}`,
    body: table(['字段', '内容'], [
      ['时间', `<span class="mono">${esc(l.time)}</span>`],
      ['操作人', esc(l.user)], ['动作', esc(l.action)],
      ['内容', `<span class="cell-note">${esc(l.detail)}</span>`]
    ], { compact: true }),
    confirmText: '关闭', cancelText: '', onConfirm: () => {}
  })
}

/* ---------------- 交互动作 ---------------- */
const H = {
  'switch-side': d => go(d.side),
  'admin-nav': d => adminGo(d.id),
  'menu-group': d => toggleMenuGroup(d.group),
  'menu-expand': () => setAllMenuGroups(true),
  'menu-collapse': () => setAllMenuGroups(false),
  'reset': () => { configDraft = null; configDirectionId = ''; pendingDelete = null; reset(); toast('数据已重置') },
  'noop': () => {},
  'dialog-close': () => { configDraft = null; configDirectionId = ''; pendingDelete = null; closeDialog() },
  'dialog-mask': () => { configDraft = null; configDirectionId = ''; pendingDelete = null; closeDialog() },
  'dialog-confirm': () => {
    const fn = dialog._confirm
    const ok = fn ? fn() : true
    if (ok !== false) { configDraft = null; configDirectionId = ''; closeDialog() }
  },

  /* 列表查询、页签与分页 */
  'list-search': () => {
    const s = getState()
    const multi = [...document.querySelectorAll('[data-search-field]')]
    if (multi.length) {
      const f = {}
      multi.forEach(el => { f[el.dataset.searchField] = (el.value || '').trim() })
      set({ filtersMap: { ...(s.filtersMap || {}), [s.adminModule]: f },
        searchMap: { ...(s.searchMap || {}), [s.adminModule]: '' },
        pages: { ...(s.pages || {}), [s.adminModule]: 1 } })
      return
    }
    const kw = document.getElementById('listKeyword')?.value?.trim() || ''
    set({ searchMap: { ...(s.searchMap || {}), [s.adminModule]: kw },
      pages: { ...(s.pages || {}), [s.adminModule]: 1 } })
  },
  'list-reset': () => {
    const s = getState()
    const hasStatus = !!document.getElementById('listStatus')
    set({ searchMap: { ...(s.searchMap || {}), [s.adminModule]: '' },
      filtersMap: { ...(s.filtersMap || {}), [s.adminModule]: {} },
      tabMap: hasStatus ? { ...(s.tabMap || {}), [s.adminModule]: 'all' } : s.tabMap,
      pages: { ...(s.pages || {}), [s.adminModule]: 1 } })
  },
  /* 状态下拉：选完立即筛选，同时带上输入框里未提交的关键词，并回到第 1 页 */
  'list-status': (d, el) => {
    const s = getState()
    const kw = document.getElementById('listKeyword')?.value?.trim() || ''
    set({
      tabMap: { ...(s.tabMap || {}), [s.adminModule]: el.value },
      searchMap: { ...(s.searchMap || {}), [s.adminModule]: kw },
      pages: { ...(s.pages || {}), [s.adminModule]: 1 }
    })
  },
  /* 下拉筛选（分册 / 分级）：选完立即筛选，收集检索条内全部字段（输入框 + 下拉）并回到第 1 页 */
  'list-filter': () => {
    const s = getState()
    const f = {}
    document.querySelectorAll('[data-search-field]').forEach(el => { f[el.dataset.searchField] = (el.value || '').trim() })
    set({ filtersMap: { ...(s.filtersMap || {}), [s.adminModule]: f },
      pages: { ...(s.pages || {}), [s.adminModule]: 1 } })
  },
  'page-tab': d => setTab(getState().adminModule, d.tab),
  'page-prev': d => setPage(d.module, (getState().pages?.[d.module] || 1) - 1),
  'page-next': d => setPage(d.module, (getState().pages?.[d.module] || 1) + 1),

  /* 会员管理 */
  'member-add': () => dialog({
    title: '新建会员', sub: '在同一表单内录入家长资料与名下子女。',
    size: 'wide',
    body: `<div class="sub-panel"><div class="sub-panel-head"><h4>家长信息</h4><span class="hint">手机号用于检测结果匹配，身份证号为选填</span></div>
        <div class="form-grid">
          ${field('家长姓名', '<input id="dlgParentName" placeholder="请输入家长姓名">', { required: true })}
          ${field('手机号', '<input id="dlgMobile" placeholder="11 位手机号">', { required: true })}
          ${field('家长身份证号', '<input id="dlgParentIdNo" placeholder="选填，18 位身份证号">', { span: true })}
        </div></div>
      <div class="sub-panel">
        <div class="sub-panel-head"><h4>名下子女</h4>
          <button class="btn sm" type="button" data-action="member-row-add">添加子女</button></div>
        <div id="childRows">${childRow(1)}</div>
        <div class="form-explain" style="margin:6px 0 0"><b>保存后</b>系统按家长手机号与子女身份证号主动查询；检测晚于注册时由后台定时任务重试。身份证号默认脱敏展示。</div>
      </div>`,
    onConfirm: () => {
      const name = document.getElementById('dlgParentName')?.value?.trim()
      const mobile = document.getElementById('dlgMobile')?.value?.trim()
      if (!name || !mobile) { toast('请填写家长姓名与手机号'); return false }
      if (!/^1\d{10}$/.test(mobile)) { toast('请输入 11 位手机号'); return false }
      const idCheck = checkParentIdNo(document.getElementById('dlgParentIdNo')?.value || '')
      if (!idCheck.ok) { toast(idCheck.msg); return false }
      const children = collectChildRows()
      if (!validateChildren(children)) return false
      createMember({ name, mobile, idNo: idCheck.value, children })
      toast(`会员已新建，${children.length} 名子女正在主动查询`)
    }
  }),
  'member-row-add': () => {
    const box = document.getElementById('childRows')
    if (!box) return
    const n = box.querySelectorAll('[data-child-row]').length + 1
    box.insertAdjacentHTML('beforeend', childRow(n))
  },
  'member-row-del': (d, el) => {
    const rows = document.querySelectorAll('#childRows [data-child-row]')
    if (rows.length <= 1) { toast('至少保留一名子女'); return }
    el.closest('[data-child-row]')?.remove()
    document.querySelectorAll('#childRows [data-child-row]').forEach((row, i) => {
      const head = row.querySelector('.row-head span')
      if (head) head.textContent = `子女 ${i + 1}`
    })
  },
  'member-detail': d => memberDetailDialog(d.id, 'children'),
  'member-reports': d => memberDetailDialog(d.id, 'reports'),
  'member-detail-tab': d => memberDetailDialog(memberDetailParentId, d.tab),
  'member-edit': d => {
    const p = getState().parents.find(x => x.id === d.id)
    if (!p) return
    /* 从详情弹层进来时保存后回到详情；从列表操作列直接进来时保存后关闭即可 */
    const fromDetail = !!document.querySelector('#dialog-root .mem-detail')
    dialog({
      title: '编辑家长资料', sub: '仅修改家长账号信息；名下子女请在「名下子女」页签中编辑。',
      body: `<div class="form-grid">
        ${field('会员编号', `<input value="${esc(p.id)}" disabled>`)}
        ${field('家长姓名', `<input id="dlgParentName" value="${esc(p.name)}">`, { required: true })}
        ${field('手机号', `<input id="dlgMobile" value="${esc(p.mobile)}">`, { required: true })}
        ${field('家长身份证号', `<input id="dlgParentIdNo" value="${esc(p.idNo)}" placeholder="选填，留空表示不填写">`, { span: true })}
        ${field('账号状态', `<select id="dlgStatus"><option ${p.status === '正常' ? 'selected' : ''}>正常</option><option ${p.status === '停用' ? 'selected' : ''}>停用</option></select>`)}
      </div>`,
      onConfirm: () => {
        const name = document.getElementById('dlgParentName')?.value?.trim()
        const mobile = document.getElementById('dlgMobile')?.value?.trim()
        if (!name || !mobile) { toast('请填写家长姓名与手机号'); return false }
        const idCheck = checkParentIdNo(document.getElementById('dlgParentIdNo')?.value || '', p.idNo)
        if (!idCheck.ok) { toast(idCheck.msg); return false }
        updateMember(p.id, { name, mobile, idNo: idCheck.value,
          status: document.getElementById('dlgStatus')?.value || p.status })
        toast('会员资料已保存')
        if (fromDetail) setTimeout(() => memberDetailDialog(p.id, memberDetailTab), 0)
      }
    })
  },
  'member-toggle': d => {
    const p = getState().parents.find(x => x.id === d.id)
    toggleMember(d.id)
    toast(p?.status === '正常' ? '账号已停用，家长端报告同步不可见' : '账号已启用')
    if (document.querySelector('#dialog-root .mem-detail')) memberDetailDialog(d.id, memberDetailTab)
  },
  'member-export': () => toast('会员列表已按当前筛选条件导出，身份证列默认脱敏'),
  'member-query': d => {
    const parentId = memberDetailParentId
    const childId = d.id
    queryChild(childId)
    toast('已发起主动查询，结果返回后自动更新')
    memberDetailDialog(parentId, 'children', { focus: childId })
    setTimeout(() => refreshMemberDetail(parentId, childId), 1000)
  },
  'member-child-add': () => memberDetailDialog(memberDetailParentId, 'children', { editorId: '' }),
  'member-child-edit': d => memberDetailDialog(memberDetailParentId, 'children', { editorId: d.id, focus: d.id }),
  'member-child-cancel': () => memberDetailDialog(memberDetailParentId, 'children'),
  'member-child-save': () => {
    const parentId = memberDetailParentId
    if (!getState().parents.some(x => x.id === parentId)) { closeDialog(); return }
    const val = id => (document.getElementById(id)?.value || '').trim()
    const name = val('kidName')
    const birthday = val('kidBirthday')
    const gender = val('kidGender') || '女'
    const relation = val('kidRelation') || defaultRelation(getState().parents.find(x => x.id === parentId))
    const idRaw = val('kidIdNo').replace(/\s/g, '')
    if (!name || !birthday) { toast('请填写子女姓名与出生日期'); return }
    if (idRaw.includes('*')) { toast('请勿填写脱敏证件号，不修改可留空'); return }
    if (idRaw && !/^\d{17}[\dXx]$/.test(idRaw)) { toast('身份证号需为 18 位，不修改可留空'); return }
    if (idRaw && idRaw.slice(6, 14) !== birthday.replace(/-/g, '')) {
      toast('身份证号与出生日期不一致，请核对'); return
    }
    if (!kidEdit.id && !idRaw) { toast('新增子女需填写 18 位身份证号'); return }
    if (kidEdit.id) {
      const childId = kidEdit.id
      updateChild(childId, { name, gender, relation, birthday,
        ...(idRaw ? { idNo: maskId(idRaw) } : {}), query: '查询中', reason: '' })
      toast('子女资料已保存，正在重新查询')
      memberDetailDialog(parentId, 'children', { focus: childId })
      setTimeout(() => { finishQuery(childId, true); refreshMemberDetail(parentId, childId) }, 800)
    } else {
      const child = addChildForMember(parentId, { name, gender, relation, birthday, idNo: idRaw })
      toast('子女已新增，系统正在主动查询')
      memberDetailDialog(parentId, 'children', { focus: child?.id })
      setTimeout(() => refreshMemberDetail(parentId, child?.id), 1000)
    }
  },
  'member-child-unbind': d => {
    const s = getState()
    const c = s.children.find(x => x.id === d.id)
    if (!c) return
    const parentId = c.parentId
    const parent = s.parents.find(x => x.id === parentId)
    const n = s.reports.filter(r => r.childId === d.id).length
    dialog({
      title: '解绑子女', sub: `确认将「${c.name}」从 ${parent?.name || '该会员'} 名下移除？`,
      confirmText: '确认解绑',
      body: `<div class="form-explain"><b>解绑影响</b>家长端立即不可见该子女及其报告；${n ? `已生成的 ${n} 份报告保留在后台，不会删除` : '该子女暂无报告'}；操作可在操作日志追溯。</div>`,
      onConfirm: () => {
        unbindChild(d.id)
        toast('子女已解绑，家长端同步不可见')
        setTimeout(() => memberDetailDialog(parentId, 'children'), 0)
      }
    })
  },
  /* 演示辅助：只还原这一个孩子的种子数据，不牵连其他会员与规则配置 */
  'member-child-restore': d => {
    const s = getState()
    const c = s.children.find(x => x.id === d.id)
    if (!c) return
    dialog({
      title: '恢复演示数据',
      sub: `把「${c.name}」的档案、报告、基因报告与培育建议还原成出厂种子`,
      confirmText: '确认恢复',
      body: `<div class="form-explain"><b>恢复范围</b>子女档案、名下报告与冻结快照、基因报告、培育建议全部回到初始值；
        方向选择、报告撤回、分册开放等演示过程中的改动一并清除。其他会员与规则配置不受影响。</div>`,
      onConfirm: () => {
        restoreChildSeed(c.id)
        toast('已恢复该子女的演示数据')
        setTimeout(() => memberDetailDialog(c.parentId, 'children', { focus: c.id }), 0)
      }
    })
  },

  /* 演示辅助：小程序的演示侧栏也能一键还原当前这位孩子，免去绕回后台 */
  'mini-restore-subject': d => {
    const s = getState()
    const c = s.children.find(x => x.id === d.id)
    if (!c) return
    dialog({
      title: '恢复演示数据',
      sub: `把「${c.name}」的档案、报告、基因报告与培育建议还原成出厂种子`,
      confirmText: '确认恢复',
      body: `<div class="form-explain"><b>恢复范围</b>子女档案、名下报告与冻结快照、基因报告、培育建议全部回到初始值；
        方向选择、报告撤回、分册开放等演示过程中的改动一并清除。其他孩子与规则配置不受影响。</div>`,
      onConfirm: () => {
        restoreChildSeed(c.id)
        toast(`已恢复「${c.name}」的演示数据`)
      }
    })
  },

  /* 培养方向：页面单表，配置在弹层完成 */
  'dir-add': () => dialog({
    title: '新增培养方向', sub: '保存后进入配置页，自由选择要素、要求分级与目标档位。',
    body: `<div class="form-grid">
      ${field('方向名称', '<input id="dlgDirName" placeholder="例如：戏剧表演">', { required: true })}
      ${field('方向编码', '<input id="dlgDirCode" placeholder="留空自动生成，例如 DIR-007">')}
      ${field('方向说明', '<input id="dlgDirDesc" placeholder="一句话说明">', { span: true })}
    </div>`,
    onConfirm: () => {
      const name = document.getElementById('dlgDirName')?.value?.trim()
      const code = document.getElementById('dlgDirCode')?.value?.trim()
      const desc = document.getElementById('dlgDirDesc')?.value?.trim()
      if (!name) { toast('请填写方向名称'); return false }
      const r = createDirection({ name, code, desc })
      if (r.error) { toast(r.error); return false }
      toast('方向已新增，请继续配置要素与要求分级')
      setTimeout(() => openDirectionConfig(r.id), 0)
      return true
    }
  }),
  'dir-config': d => openDirectionConfig(d.id),
  'dir-toggle': d => {
    const r = toggleDirection(d.id)
    toast(r.msg)
  },
  'dir-delete': d => {
    const dir = (getState().directions || []).find(x => x.id === d.id)
    if (!dir) return
    confirmDelete('删除培养方向', `即将删除「${dir.name}」`, () => deleteDirection(d.id))
  },
  'dir-export': () => toast('方向清单及要素、要求分级、档位配置已导出'),
  'tier-manage': () => tierManageDialog(),
  'manual-manage': () => manualMergeDialog(),

  /* 培养方向配置弹层 */
  'dir-cfg-book': (d, el) => {
    configBook = el.value || ''
    const box = document.getElementById('cfgFactor')
    if (box) box.innerHTML = elementOptionsHtml(configBook)
  },
  'dir-cfg-add-factor': () => {
    syncDirectionDraft()
    const codes = [...(document.getElementById('cfgFactor')?.selectedOptions || [])].map(o => o.value)
    if (!codes.length) { toast('请先选择要素'); return }
    const exists = new Set(configDraft.requirements.map(r => r.code))
    const valid = new Set([...ELEMENT_ITEMS.map(x => x.code), ...getState().factors.map(f => f.code)])
    let added = 0
    codes.forEach(code => {
      if (!exists.has(code) && valid.has(code)) {
        configDraft.requirements.push({ code, level: '优良' })
        exists.add(code)
        added++
      }
    })
    renderDirectionConfigDialog()
    toast(added ? `已添加 ${added} 项要素，请设置要求分级` : '所选要素已在配置中')
  },
  'dir-cfg-remove-factor': d => {
    syncDirectionDraft()
    configDraft.requirements = configDraft.requirements.filter(r => r.code !== d.code)
    renderDirectionConfigDialog()
    toast('要素已移除')
  },
  'dir-cfg-clear': () => {
    syncDirectionDraft()
    configDraft.requirements = []
    renderDirectionConfigDialog()
    toast('已清空要素')
  },
  /* 目标档位维护 */
  'tier-edit': d => openTierEditDialog(d.id),
  'tier-default': d => {
    const r = setDefaultTier(d.id)
    toast(r.msg)
    if (r.ok) tierManageDialog()
  },
  'tier-toggle': d => {
    const r = toggleTier(d.id)
    toast(r.msg)
    if (r.ok) tierManageDialog()
  },
  'tier-delete': d => {
    const r = deleteTier(d.id)
    toast(r.msg)
    if (r.ok) tierManageDialog()
  },

  /* 自定义方向归并 */
  'manual-merge': d => {
    const to = document.getElementById('manualTarget')?.value || ''
    if (!to) { toast('请选择归并目标'); return }
    const r = mergeManualDirection(d.id, to)
    toast(r.msg)
    if (r.ok) manualMergeDialog()
  },
  'manual-formal': d => {
    const r = mergeManualDirection(d.id, '')
    toast(r.msg)
    if (r.ok) manualMergeDialog()
  },

  /* 天赋规则：分类与要素 */
  'factor-cat': d => { setFactorCategory(d.code); setPage('factors', 1) },
  'cat-add': () => categoryDialog(),
  'cat-edit': d => categoryDialog(d.code),
  'cat-del': d => confirmDelete('删除分类', `分类 ${d.code} 下存在要素时不可删除`, () => deleteCategory(d.code)),
  'factor-add': () => factorDialog(),
  'factor-edit': d => factorDialog(d.code),
  'factor-toggle': d => { const r = toggleFactor(d.code); toast(r.msg) },
  'factor-del': d => confirmDelete('删除天赋要素', `要素 ${d.code} 及其固定注解将被删除`, () => deleteFactor(d.code)),

  /* 潜质要素文库：外部系统按「性别 + 具体年龄」同步，只读 */
  'element-sync': () => { const r = syncElementLib(); toast(r.msg) },
  'element-text': d => elementTextDialog(d.code),
  'element-text-tab': d => elementTextDialog(elemTextCode, d.tab),
  'element-template': () => toast('已下载文库模板：序号 / 年龄 / 分册 / 潜质要素 / 数据熵 / 分级内容 / 分级举例 / 培育方向 / 培育建议'),

  /* 天赋规则：分级与固定注解 */
  'level-add': () => levelDialog(),
  'level-edit': d => levelDialog(d.code),
  'level-del': d => confirmDelete('删除分级', `分级 ${d.code} 及其固定注解将被删除`, () => deleteLevel(d.code)),
  'note-add': () => noteDialog(),
  'note-edit': d => noteDialog(d.id),
  /* 注解正文多条：弹层内增删行，不重绘弹层，避免丢掉已填写内容 */
  'note-text-add': () => {
    const box = document.getElementById('nTextList')
    if (box) box.insertAdjacentHTML('beforeend', noteTextRow(''))
  },
  'note-text-del': (d, el) => {
    const box = document.getElementById('nTextList')
    if (!box) return
    const row = el.closest('.note-text-row')
    if (row && box.querySelectorAll('.note-text-row').length > 1) row.remove()
    else toast('至少保留一条注解')
  },
  'note-toggle': d => { const r = toggleNote(d.id); toast(r.msg) },
  'note-del': d => confirmDelete('删除固定注解', `注解 ${d.id} 将被删除`, () => deleteNote(d.id)),

  /* 资料导入 */
  'import-open': d => importDialog(d.kind),
  'import-template': d => toast(`「${IMPORT_META[d.kind]?.name || '导入模板'}」模板已生成`),
  'import-error': d => toast(`${IMPORT_META[d.kind]?.name || ''}校验失败明细已导出`),
  'import-confirm': d => {
    const rows = (IMPORT_ROWS[d.kind] || []).filter(r => r.ok)
    const r = importRows(d.kind, rows)
    toast(r.msg)
    if (r.ok) {
      if (d.kind === 'factors') jumpToLastPage('factors', getState().factors.length)
      closeDialog()
    }
  },
  'rule-export': d => toast(`${IMPORT_META[d.kind]?.name || '当前清单'}已按当前筛选条件导出`),

  /* 基因报告 */
  'report-detail': d => reportDetailDialog(d.id, 'selections'),
  'report-detail-tab': d => reportDetailDialog(reportDetailId, d.tab),
  'report-volume-detail': d => reportVolumeDialog(d.id || reportDetailId, d.code),
  'sub-close': () => document.querySelectorAll('.mask-sub').forEach(el => el.remove()),
  'sub-mask': (d, el, e) => { if (e.target === el) document.querySelectorAll('.mask-sub').forEach(x => x.remove()) },
  'report-advice-detail': d => reportAdviceDialog(d.id, d.code),
  'report-publish-new': d => {
    const s = getState()
    const r = s.reports.find(x => x.id === d.id)
    const pending = pendingVolumeCodes(s, r)
    if (!pending.length) { toast('没有新增分册'); return }
    const names = pending.map(code => {
      const v = VOLUMES.find(x => x.code === code)
      return v ? `${v.name}（${code}）` : code
    })
    dialog({
      title: '发布新增分册',
      sub: `${d.id} · ${r?.childName || ''} · 外部系统新增 ${pending.length} 册`,
      size: 'wide', confirmText: '确认补发到小程序',
      body: `<div class="kv-strip">
          <div class="kv-cell"><span>报告编号</span><b>${esc(d.id)}</b></div>
          <div class="kv-cell"><span>外部已出</span><b>${(() => {
            const books = String((s.geneReports || []).find(g => g.childId === ((r?.subjectId === 'self') ? 'SELF' : (r?.subjectId || r?.childId)))?.books || '')
            return books ? `${books.length} 册（${books}）` : '—'
          })()}</b></div>
          <div class="kv-cell"><span>本次新增</span><b>${pending.length} 册</b></div>
          <div class="kv-cell"><span>新增编码</span><b class="mono">${esc(pending.join(''))}</b></div>
        </div>
        <div class="form-explain"><b>补发规则</b>只把新增的这几册追加进报告快照并对家长端开放；已发布分册的要素、章节与培育建议保持不变，报告仍是同一份。补发后写入操作日志与报告版本历史。</div>
        <ul class="dialog-list">${names.map(n => `<li>${esc(n)}</li>`).join('')}</ul>`,
      onConfirm: () => {
        const res = publishNewVolumes(d.id)
        toast(res.msg)
        return res.ok
      }
    })
  },
  'report-publish': d => publishDialog(d.id),
  'report-withdraw': d => reportWithdrawDialog(d.id),
  'report-restore': d => { const r = restoreReport(d.id); toast(r.msg) },
  'report-resnapshot': d => {
    const id = d.id || reportDetailId
    const r = getState().reports.find(x => x.id === id)
    dialog({
      title: '重新生成方向命中快照',
      sub: `${id} · 按当前方向、档位与分级配置重新统计命中条数，更新这一份报告的快照`,
      body: `<div class="kv-strip">
          <div class="kv-cell"><span>当前快照</span><b>${esc(r?.snapshotVersion || '—')}</b></div>
          <div class="kv-cell"><span>开放分册</span><b>${(r?.openVolumeIds || []).length}/${VOLUMES.length} 册</b></div>
          <div class="kv-cell"><span>要素结果</span><b>不重算，沿用发布快照</b></div>
        </div>
        <div class="form-explain"><b>留痕说明</b>仅这一份报告按当前配置更新方向命中结果，并写入操作日志；其他历史报告保持不变。分册开放范围不变。</div>`,
      confirmText: '确认重新生成',
      onConfirm: () => {
        const res = rebuildSnapshot(id)
        toast(res.msg)
        return res.ok
      }
    })
  },
  'report-export': () => toast('基因报告清单与已选方向已导出，检验人身份证按脱敏值导出'),

  /* 报告管理 / 培育建议（正文外部同步，可见性由后台发布 / 撤回） */
  'advice-detail': d => adviceDetailDialog(d.id),
  'gene-report-detail': d => geneReportDialog(d.id),
  'advice-history': d => advicePersonHistoryDialog(d.report),
  'advice-publish': d => advicePublishDialog(d.id, 'publish'),
  'advice-withdraw': d => advicePublishDialog(d.id, 'withdraw'),
  'advice-export': () => toast('培育建议清单已按当前版本与筛选条件导出'),
  'advice-version-history': () => adviceVersionHistoryDialog(),
  'advice-version-view': d => {
    setAdviceViewVersion(d.id)
    closeDialog()
    toast('已切换到所选版本，列表展示该版本同步快照')
  },
  'advice-version-current': () => {
    setAdviceViewVersion('')
    toast('已回到当前生效版本')
  },
  'advice-sync': () => adviceSyncDialog(),
  'gene-sync-all': () => geneSyncAllDialog(),

  /* 系统管理 */
  'user-add': () => userDialog(),
  'user-edit': d => userDialog(d.id),
  'user-toggle': d => { const r = toggleBackUser(d.id); toast(r.msg) },
  'user-del': d => confirmDelete('删除后台用户', '删除后该账号无法登录后台', () => deleteBackUser(d.id)),
  'user-export': () => toast('后台用户清单已导出'),
  'menu-edit': d => menuDialog(d.id),
  'menu-toggle': d => { const r = toggleMenu(d.id); toast(r.msg) },
  'menu-up': d => { const r = moveMenu(d.id, -1); if (!r.ok) toast(r.msg) },
  'menu-down': d => { const r = moveMenu(d.id, 1); if (!r.ok) toast(r.msg) },
  'menu-export': () => toast('菜单配置清单已导出'),
  'group-add': () => menuGroupDialog(),
  'group-edit': d => menuGroupDialog(d.id),
  'group-toggle': d => { const r = toggleMenuGroupStatus(d.id); toast(r.msg) },
  'group-up': d => { const r = moveMenuGroup(d.id, -1); if (!r.ok) toast(r.msg) },
  'group-down': d => { const r = moveMenuGroup(d.id, 1); if (!r.ok) toast(r.msg) },
  'group-export': () => toast('一级分组配置清单已导出'),
  'role-add': () => roleDialog(),
  'role-edit': d => roleDialog(d.name),
  'role-del': d => confirmDelete('删除角色', `角色「${d.name}」下存在用户时不可删除`, () => deleteRole(d.name)),
  'role-export': () => toast('角色与权限范围清单已导出'),
  'log-detail': d => logDialog(d.time, d.actionName),
  'log-export': () => toast('操作日志已按当前筛选条件导出'),

  /* C 端：四个入口 首页 / 报告 / 培养方向 / 我的 */
  'mini-tab': d => {
    if (d.tab === 'report') {
      /* 报告只有一个页面，点底部入口回到「基因报告」页签 */
      miniGo('reportDetail', { tab: 'report', reportId: firstReportId() })
      return
    }
    if (d.tab === 'direction') set({ miniDirTab: 'recommend' }, true)
    miniGo(d.tab === 'home' ? 'home'
      : d.tab === 'direction' ? 'directions' : 'profile')
  },
  'mini-goto': d => {
    const rid = d.report || firstReportId()
    if (d.page === 'factor' && d.code) markFactorRead(rid, d.code)
    /* 建议书可能从报告详情的「培育建议」栏进来，返回时回到该栏 */
    if (d.page === 'adviceDetail') {
      set({ miniReturnPage: d.return === 'advice' ? 'reportDetail' : 'adviceList' }, true)
    }
    miniGo(d.page, {
      reportId: rid, dirId: d.dir || '', factorCode: d.code || '',
      bookCode: d.book || '', childId: d.child || '', adviceId: d.advice || ''
    })
  },
  /* 报告页：基因报告 / 培育建议 双栏切换；从别的页面点进来时直接落到对应页签 */
  'mini-report-tab': d => {
    const s = getState()
    const tab = d.tab === 'advice' ? 'advice' : 'report'
    if (s.miniPage !== 'reportDetail' && s.miniPage !== 'reports') {
      miniGo('reportDetail', { tab, reportId: firstReportId() })
      return
    }
    set({ miniParams: { ...(s.miniParams || {}), tab } })
  },
  /* 培养方向页：推荐方向 / 已选方向 两个页签 */
  'mini-dir-tab': d => set({ miniDirTab: d.tab === 'selected' ? 'selected' : 'recommend' }),
  'mini-back': () => {
    const s = getState()
    const fromAdviceTab = s.miniPage === 'adviceDetail' && s.miniReturnPage === 'reportDetail'
    const page = s.miniPage === 'subjectPicker' ? (s.miniReturnPage || 'home')
      : fromAdviceTab ? 'reportDetail' : (BACK_MAP[s.miniPage] || 'home')
    miniGo(page, {
      reportId: firstReportId(), bookCode: s.miniParams?.bookCode || '',
      ...(fromAdviceTab ? { tab: 'advice' } : {})
    })
  },
  'mini-login': () => {
    const s = getState()
    if (!s.miniAgree) { toast('请先阅读并同意用户协议'); return }
    set({ loggedIn: true }, true); miniGo('home'); toast('登录成功')
  },
  'mini-agree': () => { const s = getState(); set({ miniAgree: !s.miniAgree }) },
  'mini-avatar': () => toast('原型环境不支持上传头像，正式版调用微信头像选择'),
  /* 退出登录只清登录态，业务数据仍在；重置演示数据走后台「重置数据」 */
  'mini-logout': () => {
    set({ loggedIn: false, miniPage: 'login', miniParams: {}, miniAgree: false })
    toast('已退出登录')
  },

  /* 测评对象：本人 + 名下孩子，切换后回到来源页 */
  'mini-subject-open': () => {
    const s = getState()
    set({ miniReturnPage: s.miniPage || 'home' }, true)
    miniGo('subjectPicker')
  },
  'mini-subject-pick': d => {
    setSubject(d.type, d.id || '')
    const s = getState()
    const raw = s.miniReturnPage || 'home'
    miniGo(['kids', 'kidEdit'].includes(raw) ? 'kids' : raw, { reportId: firstReportId() })
    toast(d.type === 'self' ? '已切换为本人' : '已切换测评对象')
  },
  'mini-switch-child': () => H['mini-subject-open'](),
  'mini-retry': d => { queryChild(d.id); toast('已重新发起查询') },
  'mini-profile-save': () => {
    const r = updateParentProfile({
      name: document.getElementById('peName')?.value || '',
      mobile: document.getElementById('peMobile')?.value || '',
      gender: document.getElementById('peGender')?.value || '',
      birthday: document.getElementById('peBirthday')?.value || '',
      idNo: document.getElementById('peIdNo')?.value || ''
    })
    if (!r.ok) { toast(r.msg); return }
    miniGo('profile')
    toast('资料已保存')
  },
  'mini-child-save': () => {
    const name = document.getElementById('childName')?.value?.trim() || '新子女'
    const gender = document.getElementById('childGender')?.value || '女'
    const birthday = document.getElementById('childBirthday')?.value || '2018-01-01'
    const relation = document.getElementById('childRelation')?.value || defaultRelation()
    const idNo = document.getElementById('childIdNo')?.value || ''
    addChild({ name, gender, relation, birthday, idNo, parentId: 'P202611001' })
    miniGo('kids')
    toast('孩子已保存，正在按身份证号查询报告')
  },
  'mini-child-update': d => {
    const s = getState()
    const c = (s.children || []).find(x => x.id === d.id)
    if (!c) { toast('该孩子不存在'); return }
    const name = document.getElementById('childName')?.value?.trim()
    if (!name) { toast('请填写孩子姓名'); return }
    const idNo = document.getElementById('childIdNo')?.value?.trim() || ''
    const patch = {
      name,
      gender: document.getElementById('childGender')?.value || c.gender,
      relation: document.getElementById('childRelation')?.value || c.relation || defaultRelation(),
      birthday: document.getElementById('childBirthday')?.value || c.birthday
    }
    if (idNo) patch.idNo = idNo.length >= 15 ? idNo.slice(0, 4) + '**********' + idNo.slice(-4) : idNo
    updateChild(d.id, patch)
    queryChild(d.id)
    setSubject('child', d.id)
    miniGo('kids')
    toast('信息已更新，正在重新查询')
  },
  /* 分册内按数据熵分类筛选：按分册各自记忆，再点同一项或点「全部」即取消 */
  'mini-ent-filter': d => {
    const s = getState()
    const code = d.book || s.miniParams?.bookCode || ''
    const map = { ...(s.miniBookFilter || {}) }
    map[code] = (!d.level || map[code] === d.level) ? '' : d.level
    set({ miniBookFilter: map })
  },
  'mini-sheet-stop': () => {},
  'mini-tier': d => set({ miniParams: { ...getState().miniParams, tierId: d.tier, dirId: d.dir, reportId: d.report || firstReportId() } }),
  /* 报告下载：按册生成带水印的 PDF，记录回流后台；短时间重复点击只算一次 */
  'mini-download': d => {
    if (Date.now() - dlLock < 700) return
    dlLock = Date.now()
    const rid = d.report || firstReportId()
    const vol = d.scope === 'all' ? '' : (d.volume || '')
    const res = recordDownload(rid, vol)
    if (!res.ok) { toast(res.msg); return }
    toast('正在生成报告文件…')
    setTimeout(() => {
      document.getElementById('toast')?.classList.remove('show')
      set({ miniDownload: { files: res.files, scope: res.record.scope } })
    }, 700)
  },
  'mini-download-close': () => set({ miniDownload: null }),
  'mini-download-open': () => toast('文件已打开，可左右翻页查看'),
  'mini-download-share': () => { set({ miniDownload: null }); toast('已转发到微信会话') },
  'mini-submit': d => {
    const rid = d.report || firstReportId()
    /* 方向选择以可读的基因报告为前提：没有报告就没有命中结果可依据 */
    if (!rid) { toast('报告发布后才能选择培养方向'); return }
    const ok = selectDirection(rid, d.dir, d.tier)
    if (!ok) { toast(`最多选择 ${getState().directionLimit || 3} 个方向，请先取消一个`); return }
    set({ miniDirTab: 'selected' })
    miniGo('directions', { reportId: rid })
    toast('已提交，可随时更换档位')
  },
  'mini-remove': d => {
    const rid = d.report || firstReportId()
    if (!rid) return
    removeSelection(rid, d.dir)
    toast('已取消该培养方向')
  },
  'mini-manual-save': d => {
    const s = getState()
    const rid = d.report || firstReportId()
    if (!rid) { toast('报告发布后才能选择培养方向'); return }
    const report = s.reports.find(r => r.id === rid)
    const pick = document.getElementById('manualDirPick')?.value || ''
    const tierId = document.getElementById('manualTierPick')?.value || ''
    if (!pick) { toast('请选择方向名称'); return }
    if (!tierId) { toast('请选择培养目标'); return }
    /* 选「其他」才需要自填名称，长度按家长端口径限制 10 个字 */
    if (pick === '__other__') {
      const name = (document.getElementById('manualName')?.value || '').trim()
      if (!name) { toast('请填写方向名称'); return }
      if ([...name].length > 10) { toast('方向名称请控制在 10 个字以内'); return }
      addManualDirection(name, rid, tierId)
      set({ miniDirTab: 'selected' }, true)
      miniGo('directions', { reportId: rid })
      toast('已提交，后台会看到这条方向需求')
      return
    }
    /* 选的是后台已配置方向：直接计入已选，名称沿用发布快照，不标记为自定义 */
    const inSnap = (report?.directionSnapshot?.directions || []).some(x => x.id === pick)
    const label = inSnap ? '' : (document.getElementById('manualDirPick')?.selectedOptions?.[0]?.textContent || '').trim()
    const ok = selectDirection(rid, pick, tierId, label)
    if (!ok) { toast(`最多选择 ${s.directionLimit || 3} 个方向，请先取消一个`); return }
    set({ miniDirTab: 'selected' }, true)
    miniGo('directions', { reportId: rid })
    toast('已加入已选方向')
  },

  /* 流程与操作导航 */
  'flow-go': d => {
    if (d.side === 'admin') {
      adminGo(d.module || 'workbench')
      if (d.dialog === 'tier') setTimeout(() => tierManageDialog(), 0)
      if (d.dialog === 'manual') setTimeout(() => manualMergeDialog(), 0)
    } else {
      set({ loggedIn: true }, true)
      miniGo(d.page, { reportId: firstReportId() })
    }
  },
  'demo-step': d => {
    if (d.page === 'go-admin-reports') { adminGo(d.extra || 'reports'); return }
    set({ loggedIn: true }, true)
    miniGo(d.page, { reportId: firstReportId(), bookCode: d.extra || '' })
  }
}

/* ---------------- 启动 ---------------- */
initDelegate(H)

/* 配置弹层内的输入：只同步草稿与局部刷新，避免重渲染导致保存按钮失焦 */
document.addEventListener('change', event => {
  const t = event.target
  /* 培育建议版本切换：下拉直接改查看版本，无需弹层确认 */
  if (t?.id === 'sgVersionSelect') { setAdviceViewVersion(t.value); return }
  /* 潜质要素文库：性别 / 具体年龄下拉直接切库（一岁一库，不做区间） */
  if (t?.id === 'elementLibGender') {
    const pick = getState().elementLibPick || { gender: '男', age: 0 }
    setElementLibPick(t.value, pick.age)
    return
  }
  if (t?.id === 'elementLibAge') {
    const pick = getState().elementLibPick || { gender: '男', age: 0 }
    setElementLibPick(pick.gender, t.value)
    return
  }
  /* 自定义方向：选「其他」才显示自填框；培养目标切换同步下方师资与频次说明 */
  if (t?.id === 'manualDirPick') {
    const row = document.getElementById('manualNameRow')
    if (row) row.hidden = t.value !== '__other__'
    if (t.value === '__other__') setTimeout(() => document.getElementById('manualName')?.focus(), 0)
    return
  }
  if (t?.id === 'manualTierPick') {
    const opt = t.selectedOptions?.[0]
    const note = document.getElementById('manualTierNote')
    if (note && opt) {
      note.textContent = `培养目标：${opt.dataset.name || opt.textContent.trim()} · ${opt.dataset.teacher || ''} · ${opt.dataset.freq || ''}`
    }
    return
  }
  if (!t || !configDraft) return
  if (t.dataset.cfg === 'level') {
    syncDirectionDraft()
    return
  }
  if (t.dataset.cfgTier) {
    syncDirectionDraft()
    refreshTierUi()
    return
  }
  if (t.id === 'cfgDefaultTier' || t.id === 'cfgStatus') syncDirectionDraft()
})

subscribe(render)
/* 另一个标签页改了数据（恢复演示数据 / 重置等）：store 已把新状态接过来并重渲染，
   这里只补一句轻提示，避免用户以为页面没反应。 */
window.addEventListener('storage', event => {
  if (String(event.key || '').startsWith('tongjia-talent-quote-prototype')) {
    toast('数据已同步：另一个窗口更新了演示数据')
  }
})
const viewParam = new URLSearchParams(location.search).get('view')
const fromHash = readHash()
if (viewParam === 'mini') {
  set({ side: 'mini', miniPage: fromHash?.side === 'mini' ? fromHash.miniPage : 'home', miniParams: {}, loggedIn: true })
} else if (viewParam === 'flow') {
  set({ side: 'flow' })
} else if (viewParam === 'login') {
  /* 演示用登录直达链接：无论本机是否残留登录态，都强制回到小程序登录页 */
  set({ side: 'mini', miniPage: 'login', miniParams: {}, loggedIn: false, miniAgree: false })
} else if (fromHash) set(fromHash, true)
render()
/* 直达参数只在首次进入时生效，用完后从地址栏移除，避免切到后台后刷新被拉回小程序端 */
if (viewParam) {
  const u = new URL(location.href)
  u.searchParams.delete('view')
  /* 用当前 hash（syncHash 已写入落地页），保证刷新后仍停在登录页 */
  history.replaceState(null, '', u.pathname + u.search + location.hash)
}
