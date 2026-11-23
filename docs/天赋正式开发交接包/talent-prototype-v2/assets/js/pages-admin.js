/* 后台管理页面：菜单由系统配置驱动，每个页面主体为一张表格，
   多视图用「页签 + 数量」切换；「潜质要素」「分级与固定注解」均为单栏表格，
   筛选统一收进检索条（一框一项 / 下拉一项）。 */

import {
  ADMIN_MENU, VOLUMES, ADVICE_MATCH_RULE, ageLabelOf,
  REPORT_STATES,
  ELEMENT_ITEMS, ELEMENT_BOOKS, elementByCode, ELEMENT_ENTROPY, ELEMENT_VARIANTS,
  ELEMENT_LIB_GENDERS, ELEMENT_LIB_AGES, ELEMENT_LIB_SOURCE,
  elementFilledOf
} from './demo-data.js?v=1.61.0'
import { esc, tag, table, pageHead, searchBar, tabBar, selectFilter, kvStrip } from './ui.js?v=1.61.0'
import {
  previewDirectionHits, adviceVersionOf, adviceDocsOfVersion, geneReportByNo, geneBooksOf,
  elementLibOf, reportIdNoOf, idNoHit, parentNameOf, parentMobileOf,
  pendingVolumeCodes,
  workbenchTodos, todoCounts, TODO_KIND_LABEL
} from './store.js?v=1.61.0'

export const ADMIN_MODULE_IDS = ADMIN_MENU.map(m => m.id)

const dirById = (state, id) => (state.directions || []).find(d => d.id === id)
const tierById = (state, id) => (state.tiers || []).find(t => t.id === id)
const tierName = (state, id) => tierById(state, id)?.name || ''
const tabOf = (state, id, fallback) => state.tabMap?.[id] || fallback
const kwOf = (state, id) => (state.searchMap?.[id] || '').trim()
/* 多字段检索：一个搜索项一个框，逐项取值、逐项 AND，留空表示不限 */
const filtersOf = (state, id, keys = []) => {
  const raw = (state.filtersMap || {})[id] || {}
  const out = {}
  keys.forEach(k => { out[k] = String(raw[k] ?? '').trim() })
  return out
}
const hit = (value, kw) => !kw || String(value ?? '').toLowerCase().includes(kw.toLowerCase())
const filterCount = (state, id) => Object.values((state.filtersMap || {})[id] || {})
  .filter(v => String(v ?? '').trim()).length
const pageOf = (state, id) => Math.max(1, state.pages?.[id] || 1)

const SUBTITLE = {
  workbench: '关键指标与待办一览，点击卡片直接进入处理。',
  members: '维护家长账号与名下子女，子女资料可直接编辑并重新查询。',
  directions: '维护培养方向、关联要素要求分级与目标档位；家长端按命中条数排序展示。',
  factors: '查看外部系统按性别 + 具体年龄同步的潜质要素与文案回填情况；本系统只同步与查看，不修改内容。',
  levels: '维护分级（结论）与固定注解（评级话术）。',
  reports: '外部系统按身份证号同步的基因报告；状态只有待发布、已发布、已撤回三种，家长手机号脱敏展示。',
  suggestions: '查看外部系统同步的培育建议：一份基因报告对应一份建议，按姓名 + 具体年龄（一岁一册）匹配到人；正文只同步不修改，后台可逐份发布或撤回。',
  users: '维护后台登录账号与所属角色。',
  menus: '维护后台菜单名称、排序与可见范围。',
  roles: '维护角色及其可见菜单范围。',
  opLogs: '查询系统关键操作记录。'
}

function head(id, mod, tags = []) {
  return pageHead({
    crumb: `当前位置：后台管理 / ${mod.group} / ${mod.name}`,
    title: mod.name,
    sub: SUBTITLE[id],
    tags
  })
}

/* 单表容器：不堆叠卡片，工具栏 + 页签 + 一张表 + 分页 */
function sheet({ title = '', actions = '', inner = '', foot = '' }) {
  return `<div class="sheet"><div class="sheet-head"><h3>${esc(title)}</h3>
    <div class="btn-row">${actions}</div></div>${inner}${foot}</div>`
}

function pager(state, id, total, per = 20, kw = '') {
  const max = Math.max(1, Math.ceil(total / per))
  const page = Math.min(pageOf(state, id), max)
  const n = filterCount(state, id)
  const tip = n ? ` · 已按 ${n} 项筛选` : kw ? ` · 关键词「${esc(kw)}」` : ''
  return `<div class="list-foot"><span>共 ${total} 条记录${tip} · 每页 ${per} 条</span>
    <div class="btn-row">
      <button class="btn sm" data-action="page-prev" data-module="${esc(id)}" ${page <= 1 ? 'disabled' : ''}>上一页</button>
      <button class="btn sm" disabled>${page} / ${max}</button>
      <button class="btn sm" data-action="page-next" data-module="${esc(id)}" ${page >= max ? 'disabled' : ''}>下一页</button>
    </div></div>`
}

function slicePage(state, id, list, per = 20) {
  const max = Math.max(1, Math.ceil(list.length / per))
  const page = Math.min(pageOf(state, id), max)
  return list.slice((page - 1) * per, page * per)
}

/* 会员与报告关联 */
/* 会员维度报告：既包含名下子女的报告，也包含家长本人的报告，与会员详情口径一致 */
const reportsOfParent = (state, parentId) => {
  const ids = new Set(state.children.filter(c => c.parentId === parentId).map(c => c.id))
  return state.reports.filter(r => r.parentId === parentId || ids.has(r.childId))
}
const selectionText = (state, r, key) => {
  const list = (r.selections || []).map(s => key === 'dir'
    ? (s.manualName || dirById(state, s.directionId)?.name || '自定义方向')
    : (tierName(state, s.tierId) || '通用兜底档位'))
  return list.length ? list.join('、') : '—'
}
/* ---------------- 1 工作台与待办：卡片总览，点击直达处理 ---------------- */
function workbench(state, mod, id) {
  /* 待办按当前数据实时派生：报告三态 + 子女查询 + 自定义方向，与列表页签同一口径 */
  const open = workbenchTodos(state)
  const counts = todoCounts(open)
  const order = ['pending', 'query', 'unselected', 'withdrawn', 'manual']
  const brief = order.filter(k => counts[k]).slice(0, 2)
    .map(k => `${TODO_KIND_LABEL[k]} ${counts[k]}`).join(' · ')
  const kids = state.children.length
  const found = state.children.filter(c => c.query === '已查到').length
  const pubs = state.reports.filter(r => r.status === '已发布').length
  const drafts = state.reports.filter(r => r.status === '待发布').length
  const withdrawn = state.reports.filter(r => r.status === '已撤回').length
  const reportFoot = [drafts ? `待发布 ${drafts} 份` : '', withdrawn ? `已撤回 ${withdrawn} 份` : '']
    .filter(Boolean).join(' · ') || '全部已发布'
  const stats = [
    ['注册家长', state.parents.length, `绑定 ${kids} 名子女`, 'members', ''],
    ['已出结果', found, `待出结果 ${Math.max(0, kids - found)} 人`, 'members', 'blue'],
    ['已发布报告', pubs, reportFoot, 'reports', ''],
    ['待处理事项', open.length, open.length ? brief : '暂无待办', '', open.length ? 'warn' : '']
  ]
  const feed = state.opLogs.slice(0, 6).map(l => `<div class="wb-fi">
      <span class="tm">${esc(l.time.slice(5))}</span>
      <div class="tx"><b>${esc(l.user)}</b> ${esc(l.action)}<em>${esc(l.detail)}</em></div>
    </div>`).join('')

  return head(id, mod)
    + `<div class="wb-stats">${stats.map(([label, num, foot, go, tone]) => go
      ? `<button class="wb-stat ${tone}" data-action="admin-nav" data-id="${go}">
        <span class="lb">${esc(label)}</span>
        <b class="nm">${num}</b>
        <span class="ft">${esc(foot)}</span>
        <span class="go">查看 →</span>
      </button>`
      : `<div class="wb-stat static ${tone}">
        <span class="lb">${esc(label)}</span>
        <b class="nm">${num}</b>
        <span class="ft">${esc(foot)}</span>
      </div>`).join('')}</div>
    <section class="wb-block">
      <div class="wb-head"><h3>最近操作</h3>
        <button class="btn sm" data-action="admin-nav" data-id="opLogs">查看全部</button></div>
      <div class="wb-feed">${feed}</div>
    </section>`
}

/* ---------------- 2 会员管理：家长账号 + 名下子女（子女为独立子表，按 parentId 归属） ---------------- */
function members(state, mod, id) {
  const kw = kwOf(state, id)
  const f = filtersOf(state, id, ['name', 'mobile', 'child'])
  const status = tabOf(state, id, 'all')
  const matched = state.parents.filter(p =>
    hit(p.name, f.name)
    && hit(p.mobile, f.mobile)
    && (!f.child || state.children.some(c => c.parentId === p.id && hit(c.name, f.child))))
  const list = matched.filter(p => status === 'all' || p.status === status)
  const rows = slicePage(state, id, list, 20).map(p => {
    const kids = state.children.filter(c => c.parentId === p.id)
    /* 关联报告只统计该会员名下全部报告数（含待发布 / 已发布 / 已撤回），不再拆已发布份数 */
    const reports = reportsOfParent(state, p.id)
    /* 会员编号在左、家长姓名在右：编号是唯一标识，先定位人再认人 */
    return [
      `<span class="mono">${esc(p.id)}</span>`,
      `<span class="cell-link" data-action="member-detail" data-id="${esc(p.id)}">${esc(p.name)}</span>`,
      `<span class="mono">${esc(p.mobile)}</span>`,
      p.idNo ? `<span class="mono">${esc(p.idNo)}</span>` : tag('未填写', 'slate'),
      `${kids.length} 人`,
      `${reports.length} 份`,
      tag(p.status, p.status === '正常' ? 'green' : 'slate'),
      `<div class="btn-row">
        <button class="btn sm primary" data-action="member-detail" data-id="${esc(p.id)}">详情</button>
        <button class="btn-link" data-action="member-edit" data-id="${esc(p.id)}">编辑</button>
        <button class="btn-link ${p.status === '正常' ? 'danger-text' : ''}" data-action="member-toggle" data-id="${esc(p.id)}">${p.status === '正常' ? '停用' : '启用'}</button>
       </div>`
    ]
  })
  const tabCount = ['正常', '停用']
  return head(id, mod)
    + sheet({
      title: '会员列表',
      actions: `<button class="btn sm" data-action="member-export">导出</button>
        <button class="btn primary sm" data-action="member-add">新建会员</button>`,
      inner: searchBar([
        { key: 'name', label: '家长姓名', value: f.name, placeholder: '请输入家长姓名' },
        { key: 'mobile', label: '手机号', value: f.mobile, placeholder: '可只输后 4 位' },
        { key: 'child', label: '子女姓名', value: f.child, placeholder: '请输入子女姓名' }
      ], selectFilter({
        label: '账号状态',
        options: [['all', `全部（${matched.length}）`],
          ...tabCount.map(s => [s, `${s}（${matched.filter(p => p.status === s).length}）`])],
        value: status
      }))
        + table(['会员编号', '家长', '手机号', '家长身份证', '名下子女', '关联报告', '账号状态', '操作'], rows, { compact: true }),
      foot: pager(state, id, list.length, 20, kw)
    })
}

/* ---------------- 3 培养方向：单表配置 ---------------- */
function directions(state, mod, id) {
  const kw = kwOf(state, id)
  const f = filtersOf(state, id, ['name', 'code'])
  const all = state.directions || []
  const list = all.filter(d => hit(d.name, f.name) && hit(d.code, f.code))
  const rows = list.map(d => {
    const requirements = d.requirements || []
    const factorChips = requirements.length
      ? requirements.slice(0, 3).map(r => {
        /* 要素名称取潜质要素文库；编码即文库编码，一套口径贯穿前后台 */
        const f = elementByCode(r.code) || (state.factors || []).find(x => x.code === r.code)
        return `<span class="dir-chip">${esc(f?.name || r.code)} · ${esc(r.level)}</span>`
      }).join('') + (requirements.length > 3 ? `<span class="dir-chip">等 ${requirements.length} 项</span>` : '')
      : tag('未配置要素', 'amber')
    const tierChips = (d.tiers || []).length
      ? d.tiers.map(t => `<span class="dir-chip on">${esc(tierName(state, t))}</span>`).join('')
      : tag('未启用档位', 'amber')
    return [
      `<span class="mono">${esc(d.code)}</span>`,
      `<div class="dir-name"><b>${esc(d.name)}</b><span>${esc(d.desc)}</span></div>`,
      `<div class="dir-chips">${factorChips}</div>`,
      `<div class="dir-chips">${tierChips}</div>`,
      esc(tierName(state, d.defaultTierId) || '—'),
      tag(d.status, d.status === '启用' ? 'green' : 'slate'),
      `<div class="btn-row">
        <button class="btn sm primary" data-action="dir-config" data-id="${esc(d.id)}">配置</button>
        <button class="btn sm" data-action="dir-toggle" data-id="${esc(d.id)}">${d.status === '启用' ? '停用' : '启用'}</button>
        <button class="btn-link danger-text" data-action="dir-delete" data-id="${esc(d.id)}">删除</button>
       </div>`
    ]
  })
  return head(id, mod)
    + sheet({
      title: '培养方向配置',
      actions: `<button class="btn primary sm" data-action="dir-add">新增方向</button>`,
      inner: searchBar([
        { key: 'name', label: '方向名称', value: f.name, placeholder: '请输入方向名称' },
        { key: 'code', label: '方向编码', value: f.code, placeholder: '请输入方向编码' }
      ])
        + table(['编码', '培养方向', '关联要素与要求分级', '启用档位', '默认档位', '状态', '操作'], rows, { compact: true }),
      foot: pager(state, id, list.length, 20, kw)
    })
}

/* ---------------- 4 天赋规则｜潜质要素：外部系统按性别 + 具体年龄同步 ----------------
   要素清单与文案格式与客户《天赋培育开发建议文库数据库（男0）》一致：
   序号 / 年龄 / 分册 / 潜质要素 / 数据熵 / 分级内容 / 分级举例 / 培育方向 / 培育建议。
   一个潜质要素 = 4 档数据熵 × 3 个变体 = 12 条文案槽位；后台只同步与查看，
   不新增、不编辑、不停用任何潜质要素与文案。 */
const ELEMENT_SLOTS = ELEMENT_ITEMS.length * ELEMENT_ENTROPY.length * ELEMENT_VARIANTS

/* 文库条：性别 + 具体年龄（一岁一库）+ 同步来源与回填情况 */
function elementLibBar(state) {
  const { gender, age } = state.elementLibPick || { gender: '男', age: 0 }
  const lib = elementLibOf(state, gender, age)
  const genderOptions = ELEMENT_LIB_GENDERS.map(g =>
    `<option value="${esc(g)}" ${g === gender ? 'selected' : ''}>${esc(g)}</option>`).join('')
  const ageOptions = ELEMENT_LIB_AGES.map(a =>
    `<option value="${a}" ${Number(a) === Number(age) ? 'selected' : ''}>${a} 岁</option>`).join('')
  return `<div class="sg-verbar">
      <div class="sg-ver-main">
        <div class="sg-ver-title"><b>潜质要素由外部系统同步 · 按「性别 + 具体年龄」一岁一库</b>
          ${tag(`${gender} · ${age} 岁`, 'green')}${lib ? tag('已同步', 'teal') : tag('未同步', 'slate')}</div>
        <div class="sg-ver-meta">来源 ${esc(ELEMENT_LIB_SOURCE)} · 同步 ${esc(lib?.syncedAt || '—')}
          · 潜质要素 ${ELEMENT_ITEMS.length} 项 · 文案 ${lib ? (lib.filled || 0) : 0}/${ELEMENT_SLOTS} 条
          · 每项 = ${ELEMENT_ENTROPY.length} 档数据熵 × ${ELEMENT_VARIANTS} 个变体</div>
      </div>
      <div class="sg-ver-ops">
        <label class="sg-ver-select"><span>性别</span><select id="elementLibGender">${genderOptions}</select></label>
        <label class="sg-ver-select"><span>年龄</span><select id="elementLibAge">${ageOptions}</select></label>
        <button class="btn primary sm" data-action="element-sync">同步该库</button>
      </div>
    </div>
    <div class="form-explain"><b>同步口径</b>外部系统按「性别 + 具体年龄」分库推送（男 0 岁、男 1 岁…女 0 岁…），
      一岁一库，不做年龄区间合并；文库字段与客户 Excel 一致：序号 / 年龄 / 分册 / 潜质要素 / 数据熵 / 分级内容 / 分级举例 / 培育方向 / 培育建议。
      本系统只同步与查看，不新增、不编辑、不停用潜质要素与文案。</div>`
}

function factors(state, mod, id) {
  const { gender, age } = state.elementLibPick || { gender: '男', age: 0 }
  const lib = elementLibOf(state, gender, age)
  const kw = kwOf(state, id)
  const f = filtersOf(state, id, ['code', 'name', 'book'])
  const bookName = (ELEMENT_BOOKS.find(b => b.code === f.book) || {}).name || ''
  const list = ELEMENT_ITEMS.filter(x => (!f.book || x.book === f.book)
    && hit(x.code, f.code) && hit(x.name, f.name))
  const rows = slicePage(state, id, list, 20).map(x => {
    const done = lib ? elementFilledOf(gender, age, x) : 0
    return [
      `<span class="mono">${esc(x.code)}</span>`,
      `<b>${esc(x.name)}</b>`,
      `<span class="mono">${esc(x.book)}</span> ${esc(x.bookName)}`,
      `${ELEMENT_ENTROPY.length} 档<span class="cell-note blk">${ELEMENT_ENTROPY.map(e => e.replace(/级$/, '')).join(' / ')}</span>`,
      `${x.slots} 条<span class="cell-note blk">已填 ${done} · 待补 ${x.slots - done}</span>`,
      lib ? (done ? tag('已回填', 'green') : tag('待补写', 'amber')) : tag('未同步', 'slate'),
      `<div class="btn-row nowrap">${done
        ? `<button class="btn sm" data-action="element-text" data-code="${esc(x.code)}">查看文案</button>`
        : '<span class="cell-note">—</span>'}</div>`
    ]
  })
  return head(id, mod, [
    { text: `潜质要素 ${ELEMENT_ITEMS.length} 项`, tone: 'teal' },
    { text: `分册 ${ELEMENT_BOOKS.length} 个`, tone: 'blue' },
    { text: `数据熵 ${ELEMENT_ENTROPY.length} 档 × ${ELEMENT_VARIANTS} 变体`, tone: 'purple' },
    { text: `文案已回填 ${lib ? (lib.filled || 0) : 0}/${ELEMENT_SLOTS}`, tone: 'amber' }
  ])
    + sheet({
      title: `${gender} · ${age} 岁 · ${f.book ? `${f.book} ${bookName}` : '全部潜质要素'}`,
      actions: `<button class="btn sm" data-action="rule-export" data-kind="factors">导出</button>
        <button class="btn sm" data-action="element-template">文库模板</button>`,
      inner: elementLibBar(state)
        + (lib
          ? searchBar([
              { key: 'code', label: '要素编号', value: f.code, placeholder: '请输入要素编号' },
              { key: 'name', label: '潜质要素', value: f.name, placeholder: '请输入潜质要素' }
            ], selectFilter({
              label: '分册', id: 'listBook', action: 'list-filter', field: 'book', value: f.book,
              options: [['', '全部分册'], ...ELEMENT_BOOKS.map(b => [b.code, `${b.code} ${b.name}（${b.count}）`])]
            }))
            + table(['要素编号', '潜质要素', '所属分册', '数据熵分级', '文案槽位', '回填状态', '操作'], rows, { compact: true })
          : `<div class="empty-line">「${gender} · ${age} 岁」的潜质要素文库尚未同步，点上方「同步该库」从外部系统拉取。</div>`),
      foot: lib ? pager(state, id, list.length, 20, kw) : ''
    })
}

/* ---------------- 5 天赋规则｜分级与固定注解：页签 + 分级下拉 + 表格 ---------------- */
/* 分级筛选：下拉里带各分级注解条数，选完立即过滤，两个页签共用同一份筛选值 */
function levelSelect(state, f) {
  return selectFilter({
    label: '分级', id: 'listLevel', action: 'list-filter', field: 'level', value: f.level,
    options: [['', `全部分级（${state.notes.length}）`],
      ...state.levelsData.map(l => [l.name,
        `${l.code} ${l.name}（${state.notes.filter(n => n.level === l.name).length}）`])]
  })
}

function levels(state, mod, id) {
  const tab = tabOf(state, id, 'notes')
  const kw = kwOf(state, id)
  const f = filtersOf(state, id, ['code', 'name', 'note', 'level'])
  const tabs = [
    ['notes', '固定注解', state.notes.length],
    ['levels', '分级设置', state.levelsData.length]
  ]
  let heads, rows, list
  if (tab === 'notes') {
    /* 检索与展示同源：潜质要素名称优先取文库，命中口径与列表内容完全一致 */
    const nameOf = n => elementByCode(n.factorCode)?.name || n.factorName
    list = state.notes.filter(n => (!f.level || n.level === f.level)
      && hit(n.factorCode, f.code) && hit(nameOf(n), f.name) && hit(n.note, f.note))
    heads = ['注解编号', '要素编码', '潜质要素', '分级', '注解正文', '年龄条件', '性别条件', '状态', '操作']
    rows = slicePage(state, id, list, 20).map(n => [
      `<span class="mono">${esc(n.id)}</span>`, `<span class="mono">${esc(n.factorCode)}</span>`,
      /* 潜质要素名称一律取文库当前值，与「潜质要素」列表同源，避免两份文案漂移 */
      esc(elementByCode(n.factorCode)?.name || n.factorName), tag(n.level, 'teal'), `<span class="cell-note" style="max-width:250px">${esc(n.note)}</span>`,
      esc(n.ageRange), esc(n.gender), tag(n.status, n.status === '启用' ? 'green' : 'slate'),
      `<div class="btn-row">
        <button class="btn sm" data-action="note-edit" data-id="${esc(n.id)}">编辑</button>
        <button class="btn sm" data-action="note-toggle" data-id="${esc(n.id)}">${n.status === '启用' ? '停用' : '启用'}</button>
        <button class="btn-link danger-text" data-action="note-del" data-id="${esc(n.id)}">删除</button>
       </div>`
    ])
  } else {
    list = state.levelsData.filter(l => !f.level || l.name === f.level)
    heads = ['分级编码', '分级名称', '级序', '得分范围', '固定注解数', '状态', '操作']
    rows = list.map(l => [
      `<span class="mono">${esc(l.code)}</span>`, `<b>${esc(l.name)}</b>`, `${l.order}`,
      esc(l.range), `${state.notes.filter(n => n.level === l.name).length} 条`,
      tag(l.status, l.status === '启用' ? 'green' : 'slate'),
      `<div class="btn-row">
        <button class="btn sm" data-action="level-edit" data-code="${esc(l.code)}">编辑</button>
        <button class="btn-link danger-text" data-action="level-del" data-code="${esc(l.code)}">删除</button>
       </div>`
    ])
  }
  const actions = tab === 'notes'
    ? `<button class="btn sm" data-action="import-open" data-kind="notes">导入</button>
       <button class="btn sm" data-action="import-template" data-kind="notes">下载模板</button>
       <button class="btn sm" data-action="rule-export" data-kind="notes">导出</button>
       <button class="btn primary sm" data-action="note-add">新增注解</button>`
    : `<button class="btn sm" data-action="import-open" data-kind="levels">导入</button>
       <button class="btn sm" data-action="import-template" data-kind="levels">下载模板</button>
       <button class="btn sm" data-action="rule-export" data-kind="levels">导出</button>
       <button class="btn primary sm" data-action="level-add">新增分级</button>`
  return head(id, mod, [
    { text: `分级 ${state.levelsData.length} 档`, tone: 'teal' },
    { text: `固定注解 ${state.notes.length} 条`, tone: 'blue' }
  ])
    + sheet({
      title: tab === 'notes' ? '固定注解（评级话术）' : '分级设置（结论）',
      actions,
      inner: tabBar(tabs, tab)
        + searchBar(tab === 'notes' ? [
          { key: 'code', label: '要素编码', value: f.code, placeholder: '请输入要素编码' },
          { key: 'name', label: '潜质要素', value: f.name, placeholder: '请输入潜质要素' },
          { key: 'note', label: '注解内容', value: f.note, placeholder: '请输入注解关键词' }
        ] : [], levelSelect(state, f))
        + table(heads, rows, { compact: true }),
      foot: tab === 'notes' ? pager(state, id, list.length, 20, kw)
        : `<div class="list-foot"><span>共 ${list.length} 条记录</span></div>`
    })
}

/* ---------------- 6 基因报告：发布状态下拉 + 单表（同步报告无本地版本历史） ---------------- */
/* 发布状态筛选：下拉里带各状态条数，选完立即过滤；状态只有三种，新增状态时只改 REPORT_STATES */
function reportStatusSelect(state, f) {
  return selectFilter({
    label: '发布状态', id: 'listReportStatus', action: 'list-filter', field: 'status', value: f.status,
    options: [['', `全部状态（${state.reports.length}）`],
      ...REPORT_STATES.map(st => [st, `${st}（${state.reports.filter(r => r.status === st).length}）`])]
  })
}

function reports(state, mod, id) {
  const kw = kwOf(state, id)
  /* 检索：一个检索项一个控件，各字段独立生效、同时填写时取交集（AND） */
  const f = filtersOf(state, id, ['status', 'id', 'name', 'mobile', 'idNo'])
  const list = state.reports.filter(r => {
    if (f.status && r.status !== f.status) return false
    if (f.id && !String(r.id).toLowerCase().includes(String(f.id).toLowerCase())) return false
    if (f.name && !String(r.childName).includes(f.name)) return false
    if (f.mobile && !String(parentMobileOf(state, r) || '').includes(f.mobile)) return false
    if (f.idNo && !idNoHit(reportIdNoOf(state, r), f.idNo)) return false
    if (!kw) return true
    return `${r.id}${r.childName}`.includes(kw) || String(parentMobileOf(state, r) || '').includes(kw)
      || idNoHit(reportIdNoOf(state, r), kw)
  })
  /* 一列只放一个字段：报告编号 / 家长 / 子女 / 家长手机号 / 检验人身份证 / 基因篇数 / 分册 /
     状态 / 操作，不放副行说明；基因篇数与分册取自该子女的基因报告，未同步时显示占位 */
  const rows = list.map(r => {
    const idNo = reportIdNoOf(state, r)
    const gene = (state.geneReports || []).find(g => g.childId === r.childId)
    const parentName = parentNameOf(state, r)
    return [
      `<span class="mono nowrap">${esc(r.id)}</span>`,
      parentName ? `<b class="nowrap">${esc(parentName)}</b>` : tag('未登记', 'slate'),
      `<b class="nowrap">${esc(r.childName)}</b>`,
      (() => {
        const mobile = parentMobileOf(state, r)
        return mobile ? `<span class="mono nowrap">${esc(mobile)}</span>` : tag('未登记', 'slate')
      })(),
      idNo ? `<span class="mono nowrap">${esc(idNo)}</span>` : tag('未登记', 'slate'),
      gene ? `<span class="nowrap">${String(gene.books || '').length} 篇</span>` : tag('未同步', 'slate'),
      gene ? `<span class="mono nowrap">${esc(gene.books || '—')}</span>` : '—',
      (() => {
        /* 外部已经出了、但还没发布到家长端的分册：列表里直接标出来，提醒补发 */
        const pending = pendingVolumeCodes(state, r)
        return pending.length
          ? `<div class="btn-row nowrap">${tag(`${pending.length} 篇`, 'amber')}<span class="mono">${esc(pending.join(''))}</span></div>`
          : '<span style="color:var(--muted)">—</span>'
      })(),
      tag(r.status, r.status === '已发布' ? 'green' : r.status === '待发布' ? 'amber' : 'slate'),
      `<div class="btn-row nowrap">
        <button class="btn sm" data-action="report-detail" data-id="${esc(r.id)}">详情</button>
        ${gene ? `<button class="btn sm" data-action="gene-report-detail" data-id="${esc(gene.reportNo)}">基因报告</button>` : ''}
        ${pendingVolumeCodes(state, r).length ? `<button class="btn sm primary" data-action="report-publish-new" data-id="${esc(r.id)}" title="把外部新增的分册补发到小程序">补发</button>` : ''}
        ${r.status === '待发布' ? `<button class="btn sm primary" data-action="report-publish" data-id="${esc(r.id)}">发布</button>` : ''}
        ${r.status === '已撤回' ? `<button class="btn sm primary" data-action="report-restore" data-id="${esc(r.id)}">恢复发布</button>` : ''}
        ${r.status === '已发布' ? `<button class="btn sm danger" data-action="report-withdraw" data-id="${esc(r.id)}">撤回</button>` : ''}
       </div>`
    ]
  })
  return head(id, mod)
    + sheet({
      title: '基因报告列表',
      actions: `<button class="btn primary sm" data-action="gene-sync-all">一键同步全部报告</button>`,
      inner: searchBar([
        { key: 'id', label: '报告编号', value: f.id, placeholder: '请输入报告编号' },
        { key: 'name', label: '子女姓名', value: f.name, placeholder: '请输入子女姓名' },
        { key: 'mobile', label: '家长手机号', value: f.mobile, placeholder: '可只输后 4 位' },
        { key: 'idNo', label: '检验人身份证', value: f.idNo, placeholder: '可只输前 4 / 后 4 位' }
      ], reportStatusSelect(state, f))
        + `<div class="form-explain"><b>同步口径</b>基因报告由外部系统按身份证号同步，本系统只同步与查看；状态只有待发布、已发布、已撤回三种；家长手机号取家长账号登记号码，脱敏展示。
            <b>检索方式</b>四个检索框与「发布状态」下拉各自独立，选几项就按几项同时过滤（交集），留空表示不限。</div>`
        + table(['报告编号', '家长', '子女', '家长手机号', '检验人身份证', '基因篇数', '分册', '新增分册', '状态', '操作'], rows, { compact: true }),
      foot: pager(state, id, list.length, 20)
    })
}

/* ---------------- 6.1 培育建议：外部系统同步，一人一份，只读 ---------------- */
const entTone = lv => String(lv || '').startsWith('卓越') ? 'amber'
  : String(lv || '').startsWith('优秀') ? 'blue'
  : String(lv || '').startsWith('常态') ? 'slate' : 'teal'

/* 版本条横幅已取消：版本信息收到页头统计与检索条，正文只留同步 / 发布口径说明；
   查看历史版本走卡片右上「版本历史」弹层，回溯时在说明条里给出「回到当前生效版」出口 */
function adviceNotice(state) {
  const viewId = state.adviceViewVersionId || state.currentAdviceVersionId
  const view = adviceVersionOf(state, viewId)
  const archived = viewId !== state.currentAdviceVersionId
  return (archived
    ? `<div class="form-explain"><b>历史版本只读</b>正在查看 ${esc(view?.name || '—')}（${esc(view?.cycle || '—')}）的同步快照，仅供后台回溯；家长端只会看到当前生效版本。
        <button class="btn sm" data-action="advice-version-current">回到当前生效版</button></div>`
    : '')
    + `<div class="form-explain"><b>同步口径</b>基因检测报告与培育建议均由外部系统按固定格式推送：基因报告开放几个分册，就同步几份培育建议书（一个分册一份、各自编号，不跨分册合并），
      按「${esc(ADVICE_MATCH_RULE)}」匹配到人（不同姓名、不同年龄对应不同分册内容，7 岁就是 7 岁册，不按区间合并）；正文只同步不修改。
      <b>发布口径</b>同步过来的建议默认为「已发布」，家长端可见；后台可逐份撤回（家长端立即不可见）后重新发布，历史版本只读。</div>`
}

function suggestions(state, mod, id) {
  const kw = kwOf(state, id)
  const f = filtersOf(state, id, ['id', 'name', 'idNo', 'reportNo', 'age'])
  const viewId = state.adviceViewVersionId || state.currentAdviceVersionId
  const all = adviceDocsOfVersion(state, viewId)
  /* 年龄按具体周岁精确相等匹配，不做区间或模糊包含 */
  const ageHit = d => !f.age || String(d.age) === f.age.replace(/[^\d]/g, '')
  const list = all.filter(d =>
    hit(d.id, f.id) && hit(d.name, f.name) && hit(d.idNo, f.idNo)
    && hit(d.reportNo, f.reportNo) && ageHit(d))
  const rows = slicePage(state, id, list, 20).map(d => {
    const gene = geneReportByNo(state, d.reportNo)
    const pub = d.publishStatus || '已发布'
    /* 只有当前生效版本的建议可以发布 / 撤回，历史版本一律只读 */
    const readonly = viewId !== state.currentAdviceVersionId
    const ent = (d.sections || []).reduce((acc, x) => {
      const k = String(x.entropy || '').replace(/级$/, '')
      acc[k] = (acc[k] || 0) + 1
      return acc
    }, {})
    const entText = Object.keys(ent).map(k => `${k} ${ent[k]}`).join('·') || '—'
    const factors = (d.sections || []).map(x => x.factor)
    /* 一列只放一个字段：编号 / 版本 / 姓名 / 身份证 / 性别 / 生日 / 年龄 / 报告编号 / 基因篇数 / 分册 /
       覆盖要素 / 数据熵 / 状态 / 同步时间 / 操作；「建议项数」「建议篇数」已去掉 */
    return [
      `<span class="mono nowrap">${esc(d.id)}</span>`,
      `<span class="mono nowrap">${esc(d.versionName)}</span>`,
      `<b class="nowrap">${esc(d.name)}</b>`,
      `<span class="mono nowrap">${esc(d.idNo || '—')}</span>`,
      esc(d.gender),
      `<span class="mono nowrap">${esc(d.birthday)}</span>`,
      `<b class="nowrap">${esc(ageLabelOf(d.age))}</b>`,
      gene
        ? `<button class="btn-link mono nowrap" data-action="gene-report-detail" data-id="${esc(gene.reportNo)}">${esc(d.reportNo)}</button>`
        : `<span class="mono nowrap">${esc(d.reportNo)}</span>`,
      gene ? `${gene.books.length} 篇` : tag('未同步', 'slate'),
      gene ? `<span class="mono">${esc(gene.books)}</span>` : '—',
      factors.length
        ? `${esc(factors[0])}${factors.length > 1 ? ` 等 ${factors.length} 项` : ''}`
        : '—',
      esc(entText),
      tag(pub, pub === '已发布' ? 'green' : 'slate'),
      `<span class="mono">${esc(d.syncedAt)}</span>${pub === '已撤回'
        ? `<div class="cell-note">撤回于 ${esc(d.withdrawnAt || d.opAt || '—')}</div>` : ''}`,
      `<div class="btn-row nowrap">
        <button class="btn sm" data-action="advice-detail" data-id="${esc(d.id)}">建议书</button>
        <button class="btn sm" data-action="advice-history" data-report="${esc(d.reportNo)}">历史版本</button>
        ${readonly ? '' : (pub === '已发布'
          ? `<button class="btn sm danger" data-action="advice-withdraw" data-id="${esc(d.id)}">撤回</button>`
          : `<button class="btn sm primary" data-action="advice-publish" data-id="${esc(d.id)}">发布</button>`)}
       </div>`
    ]
  })
  /* 页头不再挂统计芯片：版本 / 份数 / 发布情况 / 年龄册数由列表本身与右侧「版本历史」体现 */
  return head(id, mod)
    + sheet({
      title: '培育建议清单',
      actions: `<button class="btn sm" data-action="advice-version-history">版本历史</button>
        <button class="btn sm" data-action="advice-export">导出</button>`,
      inner: adviceNotice(state)
        + searchBar([
          { key: 'id', label: '建议编号', value: f.id, placeholder: '请输入建议编号' },
          { key: 'name', label: '子女姓名', value: f.name, placeholder: '请输入子女姓名' },
          { key: 'idNo', label: '身份证', value: f.idNo, placeholder: '可只输前 4 / 后 4 位' },
          { key: 'reportNo', label: '报告编号', value: f.reportNo, placeholder: '请输入报告编号' },
          { key: 'age', label: '年龄', value: f.age, placeholder: '如 7' }
        ], '', `<button class="btn primary sm" data-action="advice-sync">接收新一版建议</button>`)
        + `<div class="sg-tbl-hint">共 15 个字段，列较多时可左右滑动查看；右侧「操作」列已固定。</div>`
        + `<div class="sg-table">${table([
          '建议编号', '版本', '本人', '身份证', '性别', '出生日期', '年龄', '基因报告', '基因篇数', '分册',
          '覆盖要素', '数据熵', '发布状态', '同步时间', '操作'
        ], rows, { compact: true })}</div>`,
      foot: pager(state, id, list.length, 20, kw)
    })
}

/* ---------------- 7 用户列表 ---------------- */
function users(state, mod, id) {
  const kw = kwOf(state, id)
  const f = filtersOf(state, id, ['account', 'name', 'role'])
  const list = state.backUsers.filter(u =>
    hit(u.account, f.account) && hit(u.name, f.name) && hit(u.role, f.role))
  const rows = list.map(u => [
    `<span class="mono">${esc(u.account)}</span>`, `<b>${esc(u.name)}</b>`, esc(u.role),
    tag(u.status, u.status === '正常' ? 'green' : 'slate'), `<span class="mono">${esc(u.lastLogin)}</span>`,
    `<div class="btn-row">
      <button class="btn sm" data-action="user-edit" data-id="${esc(u.id)}">编辑</button>
      <button class="btn sm" data-action="user-toggle" data-id="${esc(u.id)}">${u.status === '正常' ? '停用' : '启用'}</button>
      <button class="btn-link danger-text" data-action="user-del" data-id="${esc(u.id)}">删除</button>
     </div>`
  ])
  return head(id, mod)
    + sheet({
      title: '后台用户',
      actions: `<button class="btn sm" data-action="user-export">导出</button>
        <button class="btn primary sm" data-action="user-add">新增用户</button>`,
      inner: searchBar([
        { key: 'account', label: '登录账号', value: f.account, placeholder: '请输入登录账号' },
        { key: 'name', label: '姓名', value: f.name, placeholder: '请输入姓名' },
        { key: 'role', label: '角色', value: f.role, placeholder: '请输入角色名称' }
      ])
        + table(['登录账号', '姓名', '角色', '账号状态', '最近登录', '操作'], rows, { compact: true }),
      foot: pager(state, id, list.length, 20, kw)
    })
}

/* ---------------- 8 菜单管理：一级分组 / 二级菜单，级联配置 ---------------- */
function menus(state, mod, id) {
  const tab = tabOf(state, id, 'items')
  const kw = kwOf(state, id)
  const f = filtersOf(state, id, ['name', 'icon', 'path', 'roles'])
  const tabs = [
    ['items', '二级菜单', state.menuConfig.length],
    ['groups', '一级分组', state.menuGroups.length]
  ]
  const items = state.menuConfig.slice().sort((a, b) => a.sort - b.sort)
    .filter(m => hit(m.name, f.name) && hit(m.path, f.path) && hit(m.roles, f.roles))
  const groups = state.menuGroups.slice().sort((a, b) => a.sort - b.sort)
    .filter(g => hit(g.name, f.name) && hit(g.icon, f.icon))
  let heads, rows, actions, foot
  if (tab === 'groups') {
    heads = ['排序', '一级分组', '图标', '二级菜单数', '状态', '操作']
    rows = groups.map((g, i) => [
      `${g.sort}`, `<b>${esc(g.name)}</b>`, esc(g.icon),
      `${items.filter(m => m.group === g.name).length} 项`,
      tag(g.status, g.status === '启用' ? 'green' : 'slate'),
      `<div class="btn-row">
        <button class="btn sm" data-action="group-up" data-id="${esc(g.id)}" ${i === 0 ? 'disabled' : ''}>上移</button>
        <button class="btn sm" data-action="group-down" data-id="${esc(g.id)}" ${i === groups.length - 1 ? 'disabled' : ''}>下移</button>
        <button class="btn sm" data-action="group-edit" data-id="${esc(g.id)}">编辑</button>
        <button class="btn sm" data-action="group-toggle" data-id="${esc(g.id)}">${g.status === '启用' ? '停用' : '启用'}</button>
       </div>`
    ])
    actions = `<button class="btn sm" data-action="group-export">导出</button>
      <button class="btn primary sm" data-action="group-add">新增分组</button>`
    foot = pager(state, id, groups.length, 20, kw)
  } else {
    heads = ['排序', '菜单名称', '层级', '所属一级', '路由', '可见角色', '状态', '操作']
    rows = items.map((m, i) => [
      `${m.sort}`, `<b>${esc(m.name)}</b>`, tag('二级', 'blue'), esc(m.group),
      `<span class="mono">${esc(m.path)}</span>`,
      `<span class="cell-note">${esc(m.roles)}</span>`,
      tag(m.status, m.status === '启用' ? 'green' : 'slate'),
      `<div class="btn-row">
        <button class="btn sm" data-action="menu-up" data-id="${esc(m.id)}" ${i === 0 ? 'disabled' : ''}>上移</button>
        <button class="btn sm" data-action="menu-down" data-id="${esc(m.id)}" ${i === items.length - 1 ? 'disabled' : ''}>下移</button>
        <button class="btn sm" data-action="menu-edit" data-id="${esc(m.id)}">编辑</button>
        <button class="btn sm" data-action="menu-toggle" data-id="${esc(m.id)}">${m.status === '启用' ? '停用' : '启用'}</button>
       </div>`
    ])
    actions = `<button class="btn sm" data-action="menu-export">导出</button>`
    foot = pager(state, id, items.length, 20, kw)
  }
  return head(id, mod, [
    { text: `一级 ${state.menuGroups.length} 组`, tone: 'teal' },
    { text: `二级 ${state.menuConfig.filter(m => m.status === '启用').length} / ${state.menuConfig.length} 项`, tone: 'green' }
  ])
    + sheet({
      title: tab === 'groups' ? '一级分组' : '菜单清单',
      actions,
      inner: tabBar(tabs, tab)
        + (tab === 'groups'
          ? searchBar([
            { key: 'name', label: '分组名称', value: f.name, placeholder: '请输入分组名称' },
            { key: 'icon', label: '图标', value: f.icon, placeholder: '请输入图标字符' }
          ])
          : searchBar([
            { key: 'name', label: '菜单名称', value: f.name, placeholder: '请输入菜单名称' },
            { key: 'path', label: '路由', value: f.path, placeholder: '请输入路由地址' },
            { key: 'roles', label: '可见角色', value: f.roles, placeholder: '请输入角色名称' }
          ]))
        + table(heads, rows, { compact: true }),
      foot
    })
}

/* ---------------- 9 角色管理 ---------------- */
function roles(state, mod, id) {
  const kw = kwOf(state, id)
  const f = filtersOf(state, id, ['name', 'scope'])
  const list = state.roles.filter(r => hit(r.name, f.name) && hit(r.scope, f.scope))
  const rows = list.map(r => [
    `<b>${esc(r.name)}</b>`, `<span class="cell-note">${esc(r.scope)}</span>`,
    `${state.backUsers.filter(u => u.role === r.name).length} 人`,
    tag(r.status, r.status === '启用' ? 'green' : 'slate'),
    `<div class="btn-row">
      <button class="btn sm" data-action="role-edit" data-name="${esc(r.name)}">编辑</button>
      <button class="btn-link danger-text" data-action="role-del" data-name="${esc(r.name)}">删除</button>
     </div>`
  ])
  return head(id, mod, [
    { text: `角色 ${state.roles.length} 个`, tone: 'teal' },
    { text: `后台用户 ${state.backUsers.length} 人`, tone: 'blue' }
  ])
    + sheet({
      title: '角色清单',
      actions: `<button class="btn sm" data-action="role-export">导出</button>
        <button class="btn primary sm" data-action="role-add">新增角色</button>`,
      inner: searchBar([
        { key: 'name', label: '角色名称', value: f.name, placeholder: '请输入角色名称' },
        { key: 'scope', label: '可见范围', value: f.scope, placeholder: '请输入菜单范围' }
      ])
        + table(['角色名称', '可见菜单范围', '成员数', '状态', '操作'], rows, { compact: true }),
      foot: pager(state, id, list.length, 20, kw)
    })
}

/* ---------------- 10 操作日志 ---------------- */
function opLogs(state, mod, id) {
  const kw = kwOf(state, id)
  const f = filtersOf(state, id, ['user', 'action', 'detail'])
  const list = state.opLogs.filter(l =>
    hit(l.user, f.user) && hit(l.action, f.action) && hit(l.detail, f.detail))
  const rows = slicePage(state, id, list, 20).map(l => [
    `<span class="mono">${esc(l.time)}</span>`, esc(l.user), tag(l.action, 'blue'),
    `<span class="cell-note">${esc(l.detail)}</span>`,
    `<button class="btn sm" data-action="log-detail" data-time="${esc(l.time)}" data-action-name="${esc(l.action)}">查看</button>`
  ])
  return head(id, mod, [{ text: `日志 ${state.opLogs.length} 条`, tone: 'teal' }])
    + sheet({
      title: '操作记录',
      actions: `<button class="btn sm" data-action="log-export">导出</button>`,
      inner: searchBar([
        { key: 'user', label: '操作人', value: f.user, placeholder: '请输入操作人' },
        { key: 'action', label: '动作', value: f.action, placeholder: '如 发布 / 撤回' },
        { key: 'detail', label: '内容', value: f.detail, placeholder: '请输入内容关键词' }
      ])
        + table(['时间', '操作人', '动作', '内容', '操作'], rows, { compact: true }),
      foot: pager(state, id, list.length, 20, kw)
    })
}

const RENDERERS = { workbench, members, directions, factors, levels, reports, suggestions, users, menus, roles, opLogs }

export function renderAdmin(moduleId, state) {
  const id = RENDERERS[moduleId] ? moduleId : 'workbench'
  const mod = (state.menuConfig || []).find(m => m.id === id)
    || ADMIN_MENU.find(m => m.id === id) || ADMIN_MENU[0]
  return RENDERERS[id](state, mod, id)
}

/* 报告详情弹层：页签切换，一次只展示一张表；方向命中与分册范围均读发布快照 */
export function reportDetailHtml(reportId, state, tab = 'selections') {
  const r = state.reports.find(x => x.id === reportId)
  if (!r) return '<p>未找到报告。</p>'
  const match = r.directionSnapshot || null
  const vols = r.volumeSnapshot || []
  const openN = vols.filter(v => v.open).length
  const preview = match ? previewDirectionHits(state, r) : []
  /* 培育建议：取该子女当前生效版本、已同步的那一份建议书（一册一份），
     家长端展示的就是这一版，后台跟着同源展示，不复算、不改写正文 */
  const geneOfChild = (state.geneReports || []).find(g => g.childId === r.childId)
  const adviceVer = adviceVersionOf(state, state.currentAdviceVersionId)
  const adviceDoc = geneOfChild
    ? (adviceDocsOfVersion(state, state.currentAdviceVersionId)
        .find(d => d.reportNo === geneOfChild.reportNo) || null)
    : null
  const adviceBooks = adviceDoc ? String(adviceDoc.books || '').split('').filter(Boolean) : []
  const tabs = [
    ['selections', '已选培养方向和目标', (r.selections || []).length],
    ['match', '匹配天赋', match?.directions?.length || 0],
    ['volumes', '基因报告', `${openN}/${VOLUMES.length}`],
    ['advice', '培育建议', adviceBooks.length]
  ]
  /* 旧缓存 / 旧链接可能残留已下线的页签，统一回退到默认页，避免渲染空表 */
  if (!tabs.some(t => t[0] === tab)) tab = 'selections'
  let heads, rows
  if (tab === 'selections') {
    heads = ['培养方向', '目标档位', '建议师资', '提交时间', '类型']
    rows = (r.selections || []).map(s => {
      const t = (match?.tiers || []).find(x => x.id === s.tierId) || tierById(state, s.tierId)
      const name = s.directionName || s.manualName
        || (match?.directions || []).find(d => d.id === s.directionId)?.name
        || dirById(state, s.directionId)?.name || '自定义方向'
      return [esc(name), esc(s.tierName || t?.name || '通用兜底档位'),
        esc(s.teacher || t?.teacher || '按通用档位配置'),
        `<span class="mono">${esc(s.at || '—')}</span>`,
        s.manualName ? tag('自定义', 'purple') : tag('正式方向', 'teal')]
    })
  } else if (tab === 'match') {
    heads = ['培养方向', '方向版本', '发布时命中', '当前配置命中', '可选档位', '配置状态']
    // 配置签名比较要素、要求分级与档位子集；命中条数相同但要求调整过也要标为已变更
    const signature = x => JSON.stringify({
      name: x.name || '', status: x.status || '启用',
      reqs: (x.requirements || []).map(q => `${q.code}|${q.level}`).sort(),
      tiers: (x.tierIds || x.tiers || []).slice().sort()
    })
    rows = (match?.directions || []).map(d => {
      const cur = preview.find(p => p.id === d.id)
      const currentDir = (state.directions || []).find(x => x.id === d.id)
      const changed = !cur || !currentDir || cur.hitCount !== d.hitCount
        || signature(currentDir) !== signature(d)
      return [esc(d.name), esc(d.version), `${d.hitCount} / ${d.total} 项`,
        cur ? `${cur.hitCount} / ${cur.total} 项` : '—',
        `${d.tiers.length} 档`, changed ? tag('配置已变更', 'amber') : tag('一致', 'green')]
    })
  } else if (tab === 'volumes') {
    heads = ['分册', '分类代码', '开放状态', '章节', '要素', '章节清单', '操作']
    rows = vols.map(v => [
      esc(v.name), `<span class="mono">${esc(v.code)}</span>`,
      v.open ? tag('已开放', 'green') : tag('未开放', 'slate'),
      `${v.chapterCount} 章`, `${v.factorCount} 项`,
      `<span class="cell-note">${esc((v.chapters || []).map(c => `${c.name}（${c.count}）`).join('；'))}</span>`,
      `<button class="btn sm" data-action="report-volume-detail" data-id="${esc(r.id)}" data-code="${esc(v.code)}">详情</button>`
    ])
  } else if (tab === 'advice') {
    heads = ['分册', '建议编号', '覆盖要素', '数据熵', '发布状态', '操作']
    rows = adviceBooks.map(code => {
      const secs = (adviceDoc.sections || []).filter(s => s.book === code)
      const bk = VOLUMES.find(v => v.code === code)
      const ent = secs.reduce((acc, s) => {
        const k = String(s.entropy || '').replace(/级$/, '')
        acc[k] = (acc[k] || 0) + 1
        return acc
      }, {})
      const entText = Object.keys(ent).map(k => `${k} ${ent[k]}`).join(' · ') || '—'
      const names = secs.map(s => s.factor)
      const pub = adviceDoc.publishStatus || '已发布'
      /* 覆盖要素只占一行，超出用省略号，完整清单在「查看」的弹层里 */
      const cover = names.length
        ? `<span class="ell" title="${esc(names.join('、'))}">${esc(names[0])}${names.length > 1 ? ` 等 ${names.length} 项` : ''}</span>`
        : '—'
      return [
        `<span class="nowrap">${esc(bk ? bk.name : code)}</span>`,
        `<span class="mono nowrap">${esc(adviceDoc.id)}-${esc(code)}</span>`,
        cover,
        `<span class="nowrap">${esc(entText)}</span>`,
        tag(pub, pub === '已发布' ? 'green' : 'slate'),
        `<button class="btn sm nowrap" data-action="report-advice-detail" data-id="${esc(adviceDoc.id)}" data-code="${esc(code)}">查看</button>`
      ]
    })
  }
  const info = kvStrip([
    ['报告编号', r.id], ['子女', r.childName],
    ['检验人身份证', reportIdNoOf(state, r) || '未登记'],
    ['家长', state.parents.find(p => p.id === r.parentId)?.name || '—'],
    ['数据来源', r.source], ['查询时间', r.queriedAt],
    ['发布时间', r.publishedAt || '—'],
    ['命中依据', `${match?.version || r.snapshotVersion} · ${match?.at || r.publishedAt || '—'}`],
    ['开放分册', `${openN}/${VOLUMES.length} 册`], ['报告状态', r.status]
  ])
  const actionBar = r.status === '已发布'
    ? `<div class="btn-row" style="margin:10px 0"><button class="btn sm" data-action="report-resnapshot" data-id="${esc(r.id)}">按当前配置重新生成快照</button>
        <span class="m-sub" style="margin-left:8px">配置变更不自动回写历史报告，重算只更新这一份</span></div>` : ''
  const snapCount = (r.factorSnapshot || []).length || r.factorCount || ELEMENT_ITEMS.length
  /* 培育建议页签单独给一行版本说明：家长端看到的就是这一版，后台与家长端同源 */
  const adviceNote = tab !== 'advice' ? '' : (!adviceDoc
    ? `<p class="m-sub" style="margin:10px 0 6px;color:var(--muted)">该子女${geneOfChild ? '暂无已同步的培育建议' : '基因报告未同步，因此没有对应的培育建议'}，家长端不展示建议内容。</p>`
    : (adviceDoc.publishStatus || '已发布') === '已发布'
      ? `<p class="m-sub" style="margin:10px 0 6px;color:var(--muted)">家长端当前展示版本
        <b style="color:var(--ink)">${esc(adviceVer?.name || adviceDoc.versionName)}</b>${adviceVer?.cycle ? `（${esc(adviceVer.cycle)}）` : ''}
        · 同步于 ${esc(adviceDoc.syncedAt)} · 一册一份，共 ${adviceBooks.length} 份建议书；后台只同步与展示，不修改正文。</p>`
      : `<p class="m-sub" style="margin:10px 0 6px;color:var(--muted)">该份建议<b style="color:var(--ink)">已撤回</b>
        （撤回于 ${esc(adviceDoc.withdrawnAt || adviceDoc.opAt || '—')}），家长端当前不展示；重新发布后可恢复。内容仍按
        ${esc(adviceVer?.name || adviceDoc.versionName)} 原文只读展示。</p>`)
  return `${info}${tabBar(tabs, tab, 'report-detail-tab')}${actionBar}${adviceNote}
    ${table(heads, rows, { compact: true })}
    <p class="m-sub" style="margin-top:10px;color:var(--muted)">报告 ${esc(r.id)} 共 ${snapCount} 项要素快照、${VOLUMES.length} 册（已开放 ${openN} 册）；发布即冻结方向命中结果，历史报告不随配置调整变化。</p>`
}
