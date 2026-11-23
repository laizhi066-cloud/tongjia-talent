/* 本地状态层：交互结果写入浏览器缓存，刷新后保留；重置可回到初始数据。
   主链路：添加子女 → 主动查询 → 生成待发布报告 → 发布 → 阅读 → 选方向与档位 → 后台报告详情可见。
   规则层（分类/要素/分级/注解）、系统管理（用户/角色/菜单/日志）均可在页面维护。 */

import {
  INITIAL_PARENTS as P, INITIAL_CHILDREN as C, INITIAL_REPORTS as R,
  CATEGORIES, FACTORS, LEVELS, INITIAL_NOTES, DIRECTIONS as BASE_DIRECTIONS, TIERS as BASE_TIERS,
  VOLUMES, ALL_VOLUME_IDS, buildVolumeSnapshot,
  BACK_USERS, ROLES, OP_LOGS, ADMIN_MENU, MENU_GROUPS, defaultRelation,
  GENE_BOOKS, GENE_FORMAT, GENE_FACTORS, geneBookOf,
  INITIAL_GENE_REPORTS, ADVICE_MATCH_RULE, ageAt, ageLabelOf, adviceKeyOf,
  ADVICE_CYCLE_MONTHS, INITIAL_ADVICE_VERSIONS, ADVICE_CURRENT_VERSION_ID,
  ADVICE_FORMAT, INITIAL_ADVICE_DOCS, INITIAL_SYNC_LOGS, buildAdviceHistoryDocs,
  ELEMENT_LIB_SOURCE, ELEMENT_ITEMS
} from './demo-data.js?v=1.61.0'

const KEY = 'tongjia-talent-quote-prototype-v2'
/* v10 → v11：演示种子（陈一诺的生日 / 基因报告 / 报告三态）与此前缓存已不一致，
   旧缓存里她的档案没有基因报告、生日也停留在旧值，家长端会显示「等待同步」。
   结构虽同构，但数据无法可靠修补，改为一次重新初始化。
   v11 → v12：基因报告收敛为「一人一份」（陈一诺的复测件删除、已撤回件改挂周予安），
   旧缓存仍是一人多份，会让 C 端取到已删除的报告，直接重新初始化。
   v12 → v13：清掉「未查到 / 查询中」三个孩子的基因报告与培育建议（没有报告就没有建议），
   旧缓存仍带这些数据，直接重新初始化。
   v13 → v14：新增「待发布 / 已撤回 / 0 命中 / 部分册无建议 / 未查询」五个演示对象，
   旧缓存没有这些种子，重新初始化。
   v14 → v15：本人基因报告与建议补齐到 4 册（与开放范围一致），分册目录改为始终列全 6 册。
   v15 → v16：建议与报告同发——陈一舟补上建议、本人建议改为已发布，旧缓存重建。
   v16 → v17：新增「先发 2 册、外部又到 3 册」的增量分册种子（陈一澜），旧缓存重建。
   v17 → v18：新增「发布时没有匹配出任何方向」的空推荐种子（陈一澄），旧缓存重建。 */
const SCHEMA = 18
/* 原型数据基准日：年龄一律按报告同步当日计算，避免演示过程中年龄随真实日期漂移 */
const SNAPSHOT_AT = '2026-11-12'
/* 旧缓存（schema 4）里按区间匹配的年龄口径，迁移时替换为具体周岁 */
const LEGACY_AGE_BANDS = ['0–3 岁', '4–6 岁', '7–12 岁', '13–18 岁']
const dateOnly = (v, fallback = SNAPSHOT_AT) => {
  const s = String(v || '').slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : fallback
}
const fixLegacyAgeText = (text, label) => LEGACY_AGE_BANDS
  .reduce((s, band) => String(s).split(band).join(label), String(text || ''))
const normalizeGeneAge = r => {
  const next = { ...r }
  delete next.ageBand
  /* 已有年龄快照就保留：报告封面年龄按出具当日冻结，不随打开系统的时间漂移 */
  if (r.age === undefined || r.age === null) next.age = ageAt(r.birthday, dateOnly(r.filedAt || r.syncedAt))
  return next
}
const normalizeAdviceAge = d => {
  const next = { ...d }
  delete next.ageBand
  if (d.age !== undefined && d.age !== null) return next
  /* 旧缓存迁移：年龄按该份建议的同步日计算，孩子过完生日后新一版就换到新年龄分册 */
  const age = ageAt(d.birthday, dateOnly(d.syncedAt))
  const label = ageLabelOf(age)
  return {
    ...next, age, matchKey: adviceKeyOf(d.name, age),
    sections: (d.sections || []).map(s => ({
      ...s,
      content: fixLegacyAgeText(s.content, label),
      example: fixLegacyAgeText(s.example, label),
      direction: fixLegacyAgeText(s.direction, label),
      suggestion: fixLegacyAgeText(s.suggestion, label)
    }))
  }
}
export const CURRENT_PARENT_ID = 'P202611001'
const listeners = []

const cloneDirections = () => BASE_DIRECTIONS.map(d => ({
  ...d,
  requirements: d.requirements.map(r => ({ ...r })),
  tiers: [...d.tiers],
  defaultTierId: d.tiers[0] || 'T1'
}))

const cloneTiers = () => BASE_TIERS.map(t => ({ ...t, status: '启用', preset: true }))

/* 配置层：页面可维护的方向 / 档位 / 分级；推荐展示上限固定 5 个，选择上限仍为 3 个 */
const baseConfig = () => ({
  directions: cloneDirections(),
  tiers: cloneTiers(),
  levelsData: LEVELS.map(l => ({ ...l, status: '启用' })),
  directionLimit: 3,
  recommendLimit: 5,
  defaultTierId: 'T1',
  matchEnabled: true
})

/* 已发布历史报告使用发布当时的方向版本，用于展示「配置变更不影响历史报告」 */
const legacyConfig = () => {
  const cfg = baseConfig()
  cfg.directions = cfg.directions.map(d => d.id === 'D01'
    ? {
        ...d, version: 'v1.1',
        requirements: d.requirements.map((r, i) => i === 0 ? { ...r, level: '卓越' } : r)
      }
    : { ...d, version: 'v1.0' })
  return cfg
}

const configOf = (state, report = {}) => ({
  directions: state.directions,
  tiers: state.tiers,
  levelsData: state.levelsData,
  directionLimit: state.directionLimit || 3,
  recommendLimit: state.recommendLimit || 5,
  defaultTierId: state.defaultTierId || 'T1',
  matchEnabled: report.matchEnabled !== false
})

/* 方向命中快照：发布时统计每个方向命中了多少条配置要素，并冻结可选档位。
   命中 = 报告实际分级 ≥ 要求分级；不再计算权重与匹配度。 */
function makeDirectionSnapshot(cfg, factors = [], meta = {}) {
  const levelOrders = Object.fromEntries(
    (cfg.levelsData || []).filter(l => l.status !== '停用').map(l => [l.name, Number(l.order) || 1]))
  const orderOf = name => levelOrders[name] ?? 1
  const allTiers = (cfg.tiers || []).filter(t => t.status !== '停用').map(t => ({ ...t }))
  const findTier = id => allTiers.find(t => t.id === id)
  const directions = (cfg.directions || []).filter(d => d.status !== '停用').map(d => {
    const requirements = (d.requirements || []).map(q => {
      const f = factors.find(x => x.code === q.code)
      const actualOrder = orderOf(f?.level)
      const needOrder = orderOf(q.level)
      return {
        code: q.code, level: q.level,
        factorName: f?.name || q.code, factorLevel: f?.level || '—', factorScore: f?.score ?? null,
        actualOrder, needOrder,
        met: Boolean(f) && actualOrder >= needOrder,
        gap: Math.max(0, needOrder - actualOrder),
        note: f?.note || ''
      }
    })
    const hitCount = requirements.filter(r => r.met).length
    const total = requirements.length
    const hitRate = total ? hitCount / total : 0
    const tierIds = (d.tiers || []).filter(id => findTier(id))
    return {
      id: d.id, code: d.code, name: d.name, icon: d.icon, desc: d.desc,
      version: d.version || 'v1.0', status: d.status || '启用',
      defaultTierId: d.defaultTierId || tierIds[0] || '',
      tierIds, tiers: tierIds.map(findTier).filter(Boolean).map(t => ({ ...t })),
      requirements, hitCount, total, hitRate
    }
  }).sort((a, b) =>
    b.hitCount - a.hitCount
    || b.hitRate - a.hitRate
    || b.total - a.total
    || a.code.localeCompare(b.code))
  return {
    version: meta.version || '', at: meta.at || '', operator: meta.operator || '',
    directionLimit: cfg.directionLimit || 3,
    recommendLimit: cfg.recommendLimit || 5,
    matchEnabled: cfg.matchEnabled !== false,
    defaultTierId: cfg.defaultTierId || allTiers[0]?.id || '',
    levelOrders,
    tiers: allTiers, directions,
    ruleDigest: `方向 ${directions.length} 个 · 档位 ${allTiers.length} 个 · 要素 ${factors.length} 项`
  }
}

/* 按当前配置预演方向命中，仅用于后台对比，不写回历史报告 */
export function previewDirectionHits(state, report) {
  const snap = makeDirectionSnapshot(configOf(state, report), report.factorSnapshot || [])
  return snap.directions.map(d => ({ id: d.id, name: d.name, hitCount: d.hitCount, total: d.total, hitRate: d.hitRate }))
}

/* 报告快照：发布时把「要素结果 + 命中固定注解」一次性冻结，后续规则变更不重算历史报告 */
function buildSnapshot(factors = FACTORS, notes = INITIAL_NOTES) {
  return factors.filter(f => f.status !== '停用').map(f => {
    const hit = notes.find(n => n.factorCode === f.code && n.level === f.level && n.status === '启用')
    const hitTexts = (Array.isArray(hit?.texts) ? hit.texts : []).filter(Boolean)
    const fallbackNote = hit?.note || f.note || ''
    return {
      code: f.code, name: f.name, category: f.category,
      categoryName: f.categoryName || (CATEGORIES.find(c => c.code === f.category) || {}).name || f.category,
      score: f.score, level: f.level,
      note: fallbackNote,
      /* 多条注解随快照冻结，小程序端每次随机展示其中一条；旧快照缺省回落到单条 */
      noteTexts: hitTexts.length ? hitTexts : (fallbackNote ? [fallbackNote] : []),
      ageRange: hit?.ageRange || f.ageRange || '',
      gender: hit?.gender || f.gender || ''
    }
  })
}

function withSnapshot(report, cfg = baseConfig()) {
  const snap = (report.factorSnapshot || []).length ? report.factorSnapshot : buildSnapshot()
  const isSelf = report.subjectType === 'self' || report.childId === 'SELF'
  const openVolumeIds = (report.openVolumeIds || []).length ? report.openVolumeIds : ALL_VOLUME_IDS
  const volumeSnapshot = (report.volumeSnapshot || []).length === VOLUMES.length
    ? report.volumeSnapshot : buildVolumeSnapshot(snap, openVolumeIds)
  const directionSnapshot = (report.directionSnapshot || {}).directions?.length
    ? report.directionSnapshot
    : makeDirectionSnapshot(cfg, snap, {
        version: report.snapshotVersion || 'v1.2',
        at: report.publishedAt || report.queriedAt,
        operator: report.status === '已发布' ? '李审核' : '系统'
      })
  return {
    ...report,
    subjectType: isSelf ? 'self' : 'child',
    subjectId: isSelf ? 'self' : (report.subjectId || report.childId),
    factorSnapshot: snap,
    factorCount: snap.length,
    openVolumeIds, volumeSnapshot, directionSnapshot,
    readCodes: report.readCodes || [],
    selections: report.selections || []
  }
}

const initialVersions = r => {
  const n = FACTORS.length
  const created = { version: 'v1.0', at: r.queriedAt, operator: '系统', type: '查询生成', factorCount: n, directionCount: 6, readProgress: 0, note: `主动查询成功，返回 ${n} 项要素结果，生成待发布报告` }
  if (r.status === '已发布') return [
    created,
    { version: 'v1.1', at: '2026-11-04 09:48', operator: '张配置', type: '规则快照', factorCount: n, directionCount: 6, readProgress: 0, note: '固定注解与培养方向命中规则完成复核' },
    { version: 'v1.2', at: r.publishedAt, operator: '李审核', type: '整份发布', factorCount: n, directionCount: 6, readProgress: 0, note: '整份发布，冻结要素注解与方向命中结果' }
  ]
  if (r.status === '已撤回') return [
    created,
    { version: 'v1.1', at: r.queriedAt, operator: '李审核', type: '整份发布', factorCount: n, directionCount: 6, readProgress: 0, note: '历史报告曾整份发布' },
    { version: 'v1.2', at: r.queriedAt, operator: '李审核', type: '整份撤回', factorCount: n, directionCount: 6, readProgress: 0, note: '报告整份撤回，家长端不可查看' }
  ]
  return [created]
}

function initial() {
  return {
    schema: SCHEMA,
    side: 'admin',
    adminModule: 'workbench',
    miniTab: 'home',
    miniPage: 'home',
    miniParams: {},
    miniBookFilter: {},
    /* 培养方向页签：recommend（推荐方向）/ selected（已选方向） */
    miniDirTab: 'recommend',
    loggedIn: false,
    currentSubject: 'child',
    currentChildId: 'C202611001',
    miniReturnPage: 'home',
    reportFilter: 'all',
    parents: P.map(x => ({ ...x })),
    children: C.map(x => ({ ...x })),
    reports: R.map(x => {
      const r = withSnapshot(
        { ...x, selections: (x.selections || []).map(s => ({ ...s })), versions: initialVersions(x) },
        // 早期发布的报告沿用当时的方向版本，用于验证配置调整不回写历史报告
        (x.id === 'R20261104-001' || x.status === '已撤回') ? legacyConfig() : baseConfig()
      )
      /* 0 命中种子：冻结快照里所有方向都不命中，家长端据此展示「暂无匹配但可选」 */
      if (x.zeroHits && r.directionSnapshot) {
        return {
          ...r,
          directionSnapshot: {
            ...r.directionSnapshot,
            directions: r.directionSnapshot.directions.map(d => ({
              ...d, hitCount: 0, hitRate: 0,
              requirements: (d.requirements || []).map(q => ({ ...q, met: false, gap: Math.max(1, q.gap || 1) }))
            }))
          }
        }
      }
      /* 空推荐种子：发布时没有匹配出任何方向，家长端推荐页为空，只能自己挑 / 自己填 */
      if (x.noDirections && r.directionSnapshot) {
        return { ...r, directionSnapshot: { ...r.directionSnapshot, directions: [] } }
      }
      return r
    }),
    downloads: [],
    /* 外部系统同步层：基因报告一人一份、培育建议一人一份；正文只读，
       仅「发布 / 撤回」可切换该份建议对家长的可见性 */
    geneReports: INITIAL_GENE_REPORTS.map(r => ({ ...r })),
    adviceDocs: INITIAL_ADVICE_DOCS.map(d => ({ ...d, sections: d.sections.map(s => ({ ...s })) }))
      .concat(buildAdviceHistoryDocs(INITIAL_ADVICE_DOCS, INITIAL_ADVICE_VERSIONS)),
    adviceVersions: INITIAL_ADVICE_VERSIONS.map(v => ({ ...v })),
    currentAdviceVersionId: ADVICE_CURRENT_VERSION_ID,
    adviceViewVersionId: '',
    /* 潜质要素文库：外部系统按「性别 + 具体年龄」分库推送（男0、女3…），一岁一库不合并区间 */
    elementLibs: [{
      id: 'EL-M-0', gender: '男', age: 0, source: ELEMENT_LIB_SOURCE,
      syncedAt: '2026-11-12 09:20', version: 'v1.0',
      items: ELEMENT_ITEMS.length,
      filled: ELEMENT_ITEMS.reduce((n, x) => n + (x.filled || 0), 0),
      status: '已同步'
    }],
    elementLibPick: { gender: '男', age: 0 },
    syncLogs: INITIAL_SYNC_LOGS.map(x => ({ ...x })),
    manualDirections: [{ id: 'M01', name: '街舞', count: 2, status: '待归并' }],
    directions: cloneDirections(),
    tiers: cloneTiers(),
    defaultTierId: 'T1',
    directionLimit: 3,
    recommendLimit: 5,
    readProgress: {},
    memberKeyword: '',
    directionKeyword: '',
    reportKeyword: '',
    factorKeyword: '',
    noteKeyword: '',
    searchMap: {},
    filtersMap: {},
    pages: {},
    factorCursor: 0,
    categories: CATEGORIES.map(c => ({ ...c })),
    factors: FACTORS.map(f => ({ ...f })),
    levelsData: LEVELS.map(l => ({ ...l, status: '启用' })),
    notes: INITIAL_NOTES.map(n => ({ ...n })),
    menuConfig: ADMIN_MENU.map(m => ({ ...m })),
    menuGroups: MENU_GROUPS.map(g => ({ ...g })),
    menuExpanded: {},
    miniCatalog: { cat: '', level: '', keyword: '', limit: 20 },
    backUsers: BACK_USERS.map(u => ({ ...u })),
    roles: ROLES.map(r => ({ ...r, status: '启用' })),
    opLogs: OP_LOGS.map(x => ({ ...x })),
    tabMap: {},
    factorCategory: '',
    lastAction: ''
  }
}

/* 菜单结构升级时，把新增的二级菜单合并进旧缓存，保留用户已改过的名称 / 启停 / 排序，
   不重置演示数据。新增菜单挤占的排序号只对仍保持旧默认值的项顺延。 */
const LEGACY_MENU_SORT = { users: 7, menus: 8, roles: 9, opLogs: 10 }
/* 二级菜单改名：旧缓存仍沿用默认名的跟随新默认名，用户自己改过的不动 */
const RENAMED_MENU = {
  reports: { from: '报告管理', to: '基因报告' },
  suggestions: { from: '培养建议', to: '培育建议' },
  factors: { from: '分类与要素', to: '潜质要素' }
}
function mergeMenuConfig(saved) {
  const byId = new Map((saved || []).map(m => [m.id, m]))
  const merged = ADMIN_MENU.map(m => {
    const old = byId.get(m.id)
    if (!old) return { ...m }
    const item = { ...m, ...old }
    if (LEGACY_MENU_SORT[m.id] === old.sort) item.sort = m.sort
    const rename = RENAMED_MENU[m.id]
    if (rename && old.name === rename.from) item.name = rename.to
    return item
  })
  return merged.concat((saved || []).filter(m => !ADMIN_MENU.some(x => x.id === m.id)))
}

let state = load()
/* 加载后立即回写合并结果：旧缓存缺的同步层数据当场补齐，
   遗留的旧口径键当场清理，不必等下一次交互才落盘。 */
persist()

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return initial()
    const saved = JSON.parse(raw)
    /* 结构与演示数据升级：v6 → v7 是要素体系整体切换，旧缓存的 108 项要素、432 条注解、
       旧编码的培养方向无法按同构方式迁移，因此改为严格版本匹配，旧缓存直接重新初始化。
       后续版本若仍为同构调整，可按需恢复「接受上一版本」的迁移写法。
       v8 → v9 是培育建议由「一人一份」改为「一个分册一份」，旧缓存的 6 条混合条目无法按分册拆开，同样重新初始化。 */
    if (saved.schema !== SCHEMA) return initial()
    const merged = { ...initial(), ...saved }
    delete merged.todos
    merged.schema = SCHEMA
    /* 报告状态统一为三态：待发布 / 已发布 / 已撤回。
       旧缓存里的「草稿」是同一含义的旧叫法，迁移时按待发布处理，不重置演示数据。 */
    merged.reports = (merged.reports || []).map(r => withSnapshot({
      ...r,
      status: r.status === '草稿' ? '待发布' : r.status,
      versions: (r.versions || []).length ? r.versions : initialVersions(r)
    }))
    /* 基因报告由「状态页签」改为「发布状态下拉」：旧缓存里的页签键迁移成筛选值，
       再从 tabMap 里删掉，避免残留一个已无页面消费的键。 */
    const tabMap = { ...(merged.tabMap || {}) }
    const REPORT_TAB_STATUS = { draft: '待发布', pending: '待发布', published: '已发布', withdrawn: '已撤回' }
    if (tabMap.reports != null) {
      const st = REPORT_TAB_STATUS[tabMap.reports]
      if (st) {
        merged.filtersMap = { ...(merged.filtersMap || {}) }
        merged.filtersMap.reports = { ...(merged.filtersMap.reports || {}), status: st }
      }
      delete tabMap.reports
    }
    /* 培育建议页已取消「全部建议 / 各年龄」页签，旧缓存里的选中年龄不再有消费方 */
    delete tabMap.suggestions
    /* 档位口径：系统只保留 4 个预置档位。早期版本可在配置弹层 / 档位维护里新增
       自定义档位，这类缓存数据现在一律清掉，并同步清理方向、发布快照中的引用，
       避免刷新后又冒出「自定义」档位。历史已选方向里的档位文案按冻结口径保留。 */
    const presetTiers = cloneTiers().map(t => {
      const old = (saved.tiers || []).find(x => x.id === t.id && x.preset === true)
      return old ? { ...t, status: old.status || '启用' } : t
    })
    const validTierIds = new Set(presetTiers.map(t => t.id))
    merged.tiers = presetTiers
    merged.directions = (merged.directions || []).map(d => {
      const tiers = (d.tiers || []).filter(id => validTierIds.has(id))
      return { ...d, tiers,
        defaultTierId: validTierIds.has(d.defaultTierId) ? d.defaultTierId : (tiers[0] || 'T1') }
    })
    merged.defaultTierId = validTierIds.has(merged.defaultTierId) ? merged.defaultTierId : 'T1'
    merged.reports = (merged.reports || []).map(r => {
      const snap = r.directionSnapshot
      if (!snap) return r
      return { ...r, directionSnapshot: {
        ...snap,
        tiers: (snap.tiers || []).filter(t => validTierIds.has(t.id)),
        defaultTierId: validTierIds.has(snap.defaultTierId) ? snap.defaultTierId : 'T1',
        directions: (snap.directions || []).map(d => {
          const tierIds = (d.tierIds || []).filter(id => validTierIds.has(id))
          return { ...d, tierIds,
            tiers: (d.tiers || []).filter(t => validTierIds.has(t.id)),
            defaultTierId: validTierIds.has(d.defaultTierId) ? d.defaultTierId : (tierIds[0] || 'T1') }
        })
      } }
    })
    merged.tabMap = tabMap
    /* 注解口径：年龄条件只收具体年龄（岁，旧区间取起始岁数），性别条件只有男 / 女
      （旧「通用」统一归到男），正文补齐为多条数组（texts），供小程序端随机展示。 */
    merged.notes = (merged.notes || []).map(n => {
      const ageNum = String(n.ageRange || '').match(/\d+/)?.[0]
      const texts = (Array.isArray(n.texts) ? n.texts : []).map(t => String(t).trim()).filter(Boolean)
      return { ...n,
        ageRange: ageNum ? `${ageNum} 岁` : String(n.ageRange || ''),
        gender: n.gender === '女' ? '女' : '男',
        texts: texts.length ? texts : [String(n.note || '').trim()].filter(Boolean) }
    })
    /* 演示口径：多条话术已在 demo-data 的 INITIAL_NOTES 里预置，这里不再二次注入 */
    /* 旧报告快照补齐：发布快照没有 noteTexts 字段时按当前注解的话术组补上，
       并把性别（通用→男）与年龄（区间→具体岁数）同步到新口径，供小程序端随机展示。 */
    const textsByNote = new Map(merged.notes.map(n => [`${n.factorCode}|${n.level}`, n.texts || []]))
    merged.reports = (merged.reports || []).map(r => {
      if (!Array.isArray(r.factorSnapshot) || !r.factorSnapshot.length) return r
      return { ...r, factorSnapshot: r.factorSnapshot.map(f => {
        const texts = textsByNote.get(`${f.code}|${f.level}`) || []
        const ageNum = String(f.ageRange || '').match(/\d+/)?.[0]
        return { ...f,
          noteTexts: (Array.isArray(f.noteTexts) && f.noteTexts.filter(Boolean).length)
            ? f.noteTexts : (texts.length ? texts : [f.note].filter(Boolean)),
          gender: f.gender === '女' ? '女' : '男',
          ageRange: ageNum ? `${ageNum} 岁` : String(f.ageRange || '') }
      }) }
    })
    merged.parents = (merged.parents || []).map(p => ({ ...p, idNo: p.idNo || '', avatar: p.avatar || p.name?.slice(0, 1) || '家' }))
    merged.currentSubject = saved.currentSubject === 'self' ? 'self' : 'child'
    merged.reportFilter = saved.reportFilter || 'all'
    merged.miniReturnPage = saved.miniReturnPage || 'home'
    merged.miniBookFilter = (saved.miniBookFilter && typeof saved.miniBookFilter === 'object'
      && !Array.isArray(saved.miniBookFilter)) ? saved.miniBookFilter : {}
    merged.miniDirTab = saved.miniDirTab === 'selected' ? 'selected' : 'recommend'
    merged.menuGroups = (merged.menuGroups || []).length ? merged.menuGroups : MENU_GROUPS.map(g => ({ ...g }))
    merged.menuConfig = mergeMenuConfig(saved.menuConfig)
    /* 同步层升级：旧缓存没有基因报告 / 建议文档 / 版本时按初始快照补齐，
       不重置用户已改过的报告、会员、已选方向等演示数据。 */
    merged.geneReports = (Array.isArray(saved.geneReports) && saved.geneReports.length
      ? saved.geneReports : INITIAL_GENE_REPORTS.map(r => ({ ...r }))).map(normalizeGeneAge)
    /* 检验人身份证号补齐：旧缓存没有该字段时按子女 / 家长证件号回填，只增不删，
       回填后报告列表与检索立即可用，不必重置演示数据。 */
    merged.geneReports = merged.geneReports.map(g => ({ ...g, idNo: geneIdNoOf(merged, g) }))
    merged.adviceDocs = (Array.isArray(saved.adviceDocs) && saved.adviceDocs.length
      ? saved.adviceDocs : INITIAL_ADVICE_DOCS.map(d => ({ ...d, sections: d.sections.map(s => ({ ...s })) })))
      .map(normalizeAdviceAge)
    merged.adviceVersions = Array.isArray(saved.adviceVersions) && saved.adviceVersions.length
      ? saved.adviceVersions : INITIAL_ADVICE_VERSIONS.map(v => ({ ...v }))
    merged.currentAdviceVersionId = merged.adviceVersions
      .some(v => v.id === saved.currentAdviceVersionId)
      ? saved.currentAdviceVersionId : ADVICE_CURRENT_VERSION_ID
    merged.adviceViewVersionId = saved.adviceViewVersionId || ''
    /* 发布状态补齐：旧缓存没有逐份发布状态，按「已发布」处理（此前家长端可见）
       并补上归档版本的历史快照，供后台「历史版本」回溯。两处都只增不删，不重置演示数据。 */
    merged.adviceDocs = merged.adviceDocs.map(d => (d.publishStatus ? d : {
      ...d, publishStatus: '已发布', publishedAt: d.syncedAt || '',
      withdrawnAt: '', opAt: d.syncedAt || '', opBy: '系统同步'
    }))
    const currentDocs = merged.adviceDocs.filter(d => d.versionId === merged.currentAdviceVersionId)
    const history = buildAdviceHistoryDocs(currentDocs.length ? currentDocs : INITIAL_ADVICE_DOCS, merged.adviceVersions)
      .filter(d => !merged.adviceDocs.some(x => x.id === d.id))
    if (history.length) merged.adviceDocs = merged.adviceDocs.concat(history)
    merged.syncLogs = Array.isArray(saved.syncLogs) && saved.syncLogs.length
      ? saved.syncLogs : INITIAL_SYNC_LOGS.map(x => ({ ...x }))
    /* 潜质要素文库：旧缓存没有该层时按默认（男 0 岁）补齐，选中项做合法性校验 */
    if (!Array.isArray(merged.elementLibs) || !merged.elementLibs.length) merged.elementLibs = initial().elementLibs
    const pick = merged.elementLibPick || {}
    merged.elementLibPick = {
      gender: pick.gender === '女' ? '女' : '男',
      age: Number.isFinite(Number(pick.age)) ? Number(pick.age) : 0
    }
    /* 旧口径清理：潜质要素页已取消左侧分册筛选，删除遗留的分册选中状态 */
    delete merged.elementBook
    /* 旧口径清理：分级与固定注解页已取消左侧分级筛选树，分级改为检索条下拉，删除遗留选中状态 */
    delete merged.levelFilter
    /* 旧口径清理：本系统已不再本地维护「培育建议文库」，删除遗留键 */
    delete merged.suggestions
    delete merged.suggestionVersions
    delete merged.currentSuggestionVersionId
    delete merged.suggestionViewVersionId
    merged.menuExpanded = merged.menuExpanded || {}
    merged.miniCatalog = { cat: '', level: '', keyword: '', limit: 20, ...(merged.miniCatalog || {}) }
    // 兼容旧版本缓存：已拆分的系统设置映射到用户列表，已删除的导入菜单映射到分类与要素
    const legacy = { settings: 'users', imports: 'factors' }
    if (legacy[merged.adminModule]) merged.adminModule = legacy[merged.adminModule]
    if (!ADMIN_MENU.some(m => m.id === merged.adminModule)) merged.adminModule = 'workbench'
    return merged
  } catch {
    return initial()
  }
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* 忽略隐私模式限制 */ }
}

export function getState() { return state }
export function subscribe(fn) { listeners.push(fn) }
export function emit() {
  persist()
  listeners.forEach(fn => fn())
}
export function reset() {
  state = initial()
  try { localStorage.removeItem(KEY) } catch { /* noop */ }
  emit()
}

/* 多窗口同步：后台与小程序常同时开在两个标签页，一边恢复数据 / 重置后，
   另一边的内存状态还是旧的，界面看起来「没同步」。这里监听同源写入，
   把新状态接过来重渲染（只重渲染、不再写回，避免两个标签页互相触发）。
   注意不能整份替换：`side` / 当前页 / 筛选等是「这个窗口看到哪儿」，
   另一窗口的浏览位置不该把本窗口带着跳走，因此只接管数据类字段。 */
const VIEW_KEYS = [
  'side', 'adminModule', 'loggedIn', 'miniTab', 'miniPage', 'miniReturnPage',
  'miniParams', 'miniBookFilter', 'miniDirTab', 'miniCatalog', 'miniDownload',
  'pages', 'filtersMap', 'searchMap', 'tabMap',
  'memberKeyword', 'directionKeyword', 'reportKeyword', 'factorKeyword', 'noteKeyword', 'factorCategory'
]
if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => {
    if (event.key !== KEY || !event.newValue) return
    try {
      const saved = JSON.parse(event.newValue)
      if (saved?.schema !== SCHEMA) return
      const mine = Object.fromEntries(VIEW_KEYS.map(k => [k, state[k]]))
      state = { ...saved, ...mine }
      listeners.forEach(fn => fn())
    } catch { /* 其他窗口写入的不是本原型的合法状态，忽略 */ }
  })
}

/* 种子子女编号：只有出厂演示的孩子才有「恢复演示数据」入口 */
export const SEED_CHILD_IDS = C.map(c => c.id)

/* 演示辅助：把某个子女的种子数据整份还原（档案 / 报告与冻结快照 / 基因报告 / 培育建议），
   其他会员、其他子女与规则配置的改动一律保留，不必整站重置。 */
export function restoreChildSeed(childId) {
  const seed = initial()
  const seedChild = seed.children.find(c => c.id === childId)
  if (!seedChild) return false
  const curReports = state.reports
    .filter(r => (r.subjectId || r.childId) === childId).map(r => r.id)
  const curGene = (state.geneReports || [])
    .filter(g => g.childId === childId).map(g => g.id)
  const seedReports = seed.reports.filter(r => (r.subjectId || r.childId) === childId)
  const seedGene = (seed.geneReports || []).filter(g => g.childId === childId)
  /* 家长端（小程序）与后台共用同一份状态：当前测评对象若正是这个孩子，
     一起回到首页并清掉页内参数，避免恢复后仍停在旧报告 / 旧筛选上 */
  const sameSubject = state.currentChildId === childId || state.subjectId === childId
  state = {
    ...state,
    children: state.children.map(c => (c.id === childId ? { ...seedChild } : c)),
    reports: state.reports.filter(r => !curReports.includes(r.id)).concat(seedReports),
    geneReports: (state.geneReports || []).filter(g => g.childId !== childId).concat(seedGene),
    adviceDocs: (state.adviceDocs || [])
      .filter(d => !curGene.includes(d.geneReportId))
      .concat((seed.adviceDocs || []).filter(d => seedGene.some(g => g.id === d.geneReportId))),
    downloads: (state.downloads || []).filter(x => !curReports.includes(x.reportId)),
    ...(sameSubject ? {
      currentSubject: 'child',
      currentChildId: childId,
      miniTab: 'home',
      miniPage: 'home',
      miniReturnPage: 'home',
      miniParams: {},
      miniBookFilter: {},
      miniDirTab: 'recommend'
    } : {})
  }
  emit()
  return true
}

export function set(patch, silent = false) {
  state = { ...state, ...patch }
  if (!silent) emit()
}

export function go(side, opts = {}) {
  state = { ...state, side, ...opts }
  emit()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

/* ---------- 通用工具 ---------- */

let seq = 100
const nextId = prefix => `${prefix}${++seq}`
const uid = prefix => `${prefix}${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`
const bumpVersion = v => {
  const m = /^v(\d+)\.(\d+)$/.exec(v || '')
  return m ? `v${m[1]}.${Number(m[2]) + 1}` : 'v1.1'
}
const activeTierIds = () => state.tiers.filter(t => t.status === '启用').map(t => t.id)
const nextDirectionCode = () => {
  const nums = state.directions.map(d => {
    const m = /^DIR-(\d+)$/.exec(d.code || '')
    return m ? Number(m[1]) : 0
  })
  return `DIR-${String(Math.max(0, ...nums) + 1).padStart(3, '0')}`
}
const now = () => {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
const maskMobile = m => /^1\d{10}$/.test(m) ? m.slice(0, 3) + '****' + m.slice(-4) : m
const maskId = id => /^\d{17}[\dXx]$/.test(id) ? id.slice(0, 4) + '**********' + id.slice(-4) : id

/* 操作日志：关键动作统一留痕，操作日志页面实时可见 */
const logPatch = (action, detail, user = '王运营') => ({
  opLogs: [{ time: now(), user, action, detail }, ...state.opLogs].slice(0, 120)
})
const touch = (patch, action, detail, msg) => {
  state = { ...state, ...patch, ...logPatch(action, detail), lastAction: msg || detail }
  emit()
}

/* 报告版本：发布、撤回、方向选择均写入版本历史 */
function nextVersion(report, type, note, operator = '王运营') {
  const list = report.versions || []
  const version = bumpVersion(list[list.length - 1]?.version || 'v1.0')
  return {
    version, at: now(), operator, type,
    factorCount: report.factorCount || FACTORS.length,
    directionCount: state.directions.length,
    readProgress: report.readProgress || 0,
    note
  }
}

/* ---------- 业务动作：会员、查询、报告 ---------- */

export function addChild({ name, gender, birthday, idNo, relation, parentId = 'P202611001' }) {
  const child = {
    id: nextId('C202611'), parentId, name, gender, birthday,
    relation: relation || defaultRelation(state.parents.find(p => p.id === parentId)),
    idNo: idNo ? idNo.slice(0, 4) + '**********' + idNo.slice(-4) : '4403**********00' + String(seq).slice(-2),
    query: '查询中', source: '小程序注册'
  }
  state = { ...state, children: [...state.children, child], currentChildId: child.id,
    currentSubject: 'child', lastAction: `已添加子女 ${name}，系统正在主动查询检测结果` }
  emit()
  setTimeout(() => finishQuery(child.id, true), 900)
}

export function finishQuery(childId, found) {
  // 子女已解绑时，忽略迟到的查询回执，避免生成无归属数据
  if (!state.children.some(c => c.id === childId)) return
  const children = state.children.map(c => c.id === childId
    ? { ...c, query: found ? '已查到' : '未查到', reason: found ? '' : '未出结果' } : c)
  /* 一个对象只有一份基因报告：已有报告时重新查询只刷新查询状态，不再追加第二份。
     这也保证「报告发布 → 撤回 → 恢复」始终是同一份报告，编号不漂移。 */
  const existing = state.reports.find(r => (r.subjectId || r.childId) === childId)
  let reports = state.reports
  if (found && !existing) {
    const child = children.find(c => c.id === childId)
    const count = reports.length + 1
    const snapshot = buildSnapshot(state.factors, state.notes)
    const report = {
      id: `R20261104-${String(count).padStart(3, '0')}`,
      childId, childName: child.name,
      subjectType: 'child', subjectId: childId,
      parentId: child.parentId, status: '待发布',
      queriedAt: '2026-11-06 13:45', publishedAt: '',
      factorCount: snapshot.length, factorSnapshot: snapshot, readCodes: [],
      snapshotVersion: 'v1.2', readProgress: 0,
      selections: [], manualDirection: '', source: '第三方接口主动查询', matchEnabled: true,
      versions: [{ version: 'v1.0', at: '2026-11-06 13:45', operator: '系统', type: '查询生成',
        factorCount: snapshot.length, directionCount: state.directions.length, readProgress: 0,
        note: `主动查询成功，返回 ${snapshot.length} 项要素结果，生成待发布报告` }]
    }
    reports = [...reports, withSnapshot(report, configOf(state))]
  }
  const lastAction = !found ? '暂未查询到检测结果，已归因并进入待办'
    : existing ? `查询成功，沿用已有报告 ${existing.id}（一人一份），未重复建档`
      : `查询成功，返回 ${FACTORS.length} 项要素结果，已生成待发布报告`
  /* 查询结果不再手写待办：工作台按子女查询状态与报告三态实时派生，
     查到即生成待发布报告（自动出现待办），未查到子女仍为「查询未完成」。 */
  state = { ...state, children, reports, lastAction }
  emit()
}

export function queryChild(childId) {
  state = { ...state,
    children: state.children.map(c => c.id === childId ? { ...c, query: '查询中', reason: '' } : c),
    lastAction: '正在按手机号 + 身份证号主动查询' }
  emit()
  setTimeout(() => finishQuery(childId, true), 900)
}

/* 建议与基因报告同时发布：报告发布 / 恢复时，把该对象当前周期的那份建议一并置为已发布。
   只改可见性，不改正文与版本；建议的周期更新仍走「接收新一版建议」。 */
const adviceWithReport = (target, at) => {
  const key = target.subjectId || target.childId || 'self'
  const gene = (state.geneReports || []).find(g => g.childId === (key === 'self' ? 'SELF' : key))
  if (!gene) return null
  const list = state.adviceDocs || []
  const idx = list.findIndex(d => d.reportNo === gene.reportNo
    && d.versionId === state.currentAdviceVersionId && d.publishStatus !== '已发布')
  if (idx < 0) return null
  return list.map((d, i) => i === idx
    ? { ...d, publishStatus: '已发布', publishedAt: at, withdrawnAt: '', opAt: at, opBy: '李审核' }
    : d)
}

/* 整份发布：一次冻结「要素结果 + 注解 + 六册开放范围 + 方向命中与可选档位」。
   发布之后修改方向、档位、分级或注解配置，都不会回写到这份报告。 */
export function publishReport(reportId, opts = {}) {
  const target = state.reports.find(r => r.id === reportId)
  if (!target) return { ok: false, msg: '未找到报告' }
  const snapshot = buildSnapshot(state.factors, state.notes)
  const openVolumeIds = (opts.openVolumeIds || target.openVolumeIds || ALL_VOLUME_IDS)
    .filter(id => VOLUMES.some(v => v.id === id))
  if (!openVolumeIds.length) return { ok: false, msg: '请至少开放一个分册' }
  // 快照版本以报告自身快照版本为基准递增，避免与版本历史编号串成两套而出现「回退」
  const version = bumpVersion(target.snapshotVersion || 'v1.0')
  const at = now()
  const volumeSnapshot = buildVolumeSnapshot(snapshot, openVolumeIds)
  const directionSnapshot = makeDirectionSnapshot(configOf(state, target), snapshot,
    { version, at, operator: '李审核' })
  const entry = {
    ...nextVersion(target, '整份发布',
      `整份发布，开放 ${openVolumeIds.length}/${VOLUMES.length} 册，冻结 ${snapshot.length} 项要素注解与 ${directionSnapshot.directions.length} 个方向命中结果`, '李审核'),
    version, directionCount: directionSnapshot.directions.length
  }
  const reports = state.reports.map(r => r.id === reportId
    ? { ...r, status: '已发布', publishedAt: at, snapshotAt: at, snapshotVersion: version,
        factorSnapshot: snapshot, factorCount: snapshot.length,
        openVolumeIds, volumeSnapshot, directionSnapshot,
        versions: [...(r.versions || []), entry] }
    : r)
  const adviceDocs = adviceWithReport(target, at)
  touch({ reports, ...(adviceDocs ? { adviceDocs } : {}) }, '报告发布',
    `${reportId} 整份发布，开放 ${openVolumeIds.length}/${VOLUMES.length} 册，冻结 ${snapshot.length} 项要素与方向命中结果`,
    `报告已发布：开放 ${openVolumeIds.length}/${VOLUMES.length} 册，方向命中结果 ${version} 已生成`)
  return { ok: true, msg: `报告已发布，快照 ${version} 已冻结`, version }
}

/* 外部已出、但还没有发布到家长端的分册编码。
   全集取基因报告的篇目，减去报告已开放（volumeSnapshot.open）的分册；
   用于后台列表提示「新增分册」以及一键补发。 */
export function pendingVolumeCodes(s, report) {
  if (!report || report.status !== '已发布') return []
  const key = report.subjectId || report.childId || 'self'
  const gene = (s.geneReports || []).find(g => g.childId === (key === 'self' ? 'SELF' : key))
  if (!gene) return []
  const open = new Set((report.volumeSnapshot || []).filter(v => v.open).map(v => v.code))
  return String(gene.books || '').split('').filter(c => c && !open.has(c))
}

/* 补发新增分册：只把外部新增的几册追加进快照并开放，原有分册的冻结内容不动。
   适用于「先出 2 册已发布、后又出了 3 册」的增量场景。 */
export function publishNewVolumes(reportId) {
  const target = state.reports.find(r => r.id === reportId)
  if (!target) return { ok: false, msg: '未找到报告' }
  if (target.status !== '已发布') return { ok: false, msg: '仅已发布报告可补发新增分册' }
  const codes = pendingVolumeCodes(state, target)
  if (!codes.length) return { ok: false, msg: '没有新增分册' }
  const newIds = codes.map(c => VOLUMES.find(v => v.code === c)?.id).filter(Boolean)
  const factors = (target.factorSnapshot || []).length
    ? target.factorSnapshot : buildSnapshot(state.factors, state.notes)
  const added = buildVolumeSnapshot(factors, newIds).filter(v => v.open)
  if (!added.length) return { ok: false, msg: '没有可补发的分册内容' }
  const at = now()
  const version = bumpVersion(target.snapshotVersion || 'v1.0')
  const volumeSnapshot = [...(target.volumeSnapshot || []), ...added]
    .sort((a, b) => (a.seq || 0) - (b.seq || 0))
  const openVolumeIds = [...new Set([...(target.openVolumeIds || []), ...newIds])]
  const codeText = added.map(v => v.code).join('')
  const entry = {
    ...nextVersion(target, '新增分册发布',
      `外部新增 ${codeText} 共 ${added.length} 册，追加进快照并开放；原有分册内容不变`, '李审核'),
    version, directionCount: target.directionSnapshot?.directions?.length || 0
  }
  touch({
    reports: state.reports.map(r => r.id === reportId
      ? { ...r, openVolumeIds, volumeSnapshot, snapshotVersion: version, snapshotAt: at,
          versions: [...(r.versions || []), entry] }
      : r)
  }, '新增分册发布', `${reportId} 补发新增分册 ${codeText} 共 ${added.length} 册`,
    `新增 ${added.length} 个分册已发布，家长端现在可见`)
  return { ok: true, msg: `已发布新增分册 ${codeText}（${added.length} 册）`, codes: added.map(v => v.code) }
}

/* 显式重算：只在管理员对指定报告操作时，按当前配置生成新版本快照并留痕；
   日常修改配置不会自动改变任何历史报告。 */
export function rebuildSnapshot(reportId) {
  const target = state.reports.find(r => r.id === reportId)
  if (!target) return { ok: false, msg: '未找到报告' }
  if (target.status !== '已发布') return { ok: false, msg: '仅已发布报告可重新生成快照' }
  const factors = (target.factorSnapshot || []).length
    ? target.factorSnapshot : buildSnapshot(state.factors, state.notes)
  const version = bumpVersion(target.snapshotVersion || 'v1.0')
  const at = now()
  const directionSnapshot = makeDirectionSnapshot(configOf(state, target), factors,
    { version, at, operator: '李审核' })
  const entry = {
    ...nextVersion(target, '快照重算',
      `按当前方向、档位与分级配置重新计算方向命中，开放分册保持 ${(target.openVolumeIds || []).length} 册不变`, '李审核'),
    version, directionCount: directionSnapshot.directions.length
  }
  touch({
    reports: state.reports.map(r => r.id === reportId
      ? { ...r, snapshotVersion: version, snapshotAt: at, directionSnapshot,
          versions: [...(r.versions || []), entry] }
      : r)
  }, '快照重算', `${reportId} 按当前配置重新生成方向命中结果 ${version}`,
    `已按当前配置重新生成快照 ${version}，历史版本保留`)
  return { ok: true, msg: `快照 ${version} 已重新生成`, version }
}

export function withdrawReport(reportId) {
  const target = state.reports.find(r => r.id === reportId)
  if (!target) return
  touch({
    reports: state.reports.map(r => r.id === reportId
      ? { ...r, status: '已撤回', publishedAt: '',
          versions: [...(r.versions || []), nextVersion(r, '整份撤回', '报告整份撤回，家长端同步不可见')] }
      : r)
  }, '报告撤回', `${reportId} 整份撤回，家长端不可见`)
}

/* 恢复发布：撤回属于可逆动作，恢复后沿用原快照与已选方向，不重算、不改版本号 */
export function restoreReport(reportId) {
  const target = state.reports.find(r => r.id === reportId)
  if (!target) return { ok: false, msg: '未找到报告' }
  if (target.status !== '已撤回') return { ok: false, msg: '仅已撤回报告可恢复发布' }
  const restoredAt = now()
  const adviceDocs = adviceWithReport(target, restoredAt)
  touch({
    reports: state.reports.map(r => r.id === reportId
      ? { ...r, status: '已发布', publishedAt: restoredAt,
          versions: [...(r.versions || []), nextVersion(r, '恢复发布', '报告恢复发布，沿用原快照，家长端重新可见')] }
      : r),
    ...(adviceDocs ? { adviceDocs } : {})
  }, '恢复发布', `${reportId} 恢复发布，沿用原快照`, '报告已恢复发布，家长端重新可见')
  return { ok: true, msg: '报告已恢复发布' }
}

export function markRead(reportId, cursor) {
  state = { ...state,
    readProgress: { ...state.readProgress, [reportId]: cursor },
    reports: state.reports.map(r => r.id === reportId ? { ...r, readProgress: cursor } : r),
    factorCursor: cursor }
  emit()
}

/* 逐项阅读：按要素编码记录已读，避免切换分类后进度与真实阅读不一致 */
export function markFactorRead(reportId, code) {
  const r = state.reports.find(x => x.id === reportId)
  if (!r || !code) return
  const codes = r.readCodes || []
  if (codes.includes(code)) return
  const next = [...codes, code]
  state = { ...state,
    reports: state.reports.map(x => x.id === reportId
      ? { ...x, readCodes: next, readProgress: next.length } : x),
    readProgress: { ...state.readProgress, [reportId]: next.length },
    factorCursor: next.length }
  emit()
}

/* 报告文件下载：按分册生成带水印的 PDF，每次下载留痕，用于运营分析与纠纷举证 */
const DOWNLOAD_TTL_DAYS = 7
export function recordDownload(reportId, volumeId = '') {
  const r = state.reports.find(x => x.id === reportId)
  if (!r) return { ok: false, msg: '未找到报告' }
  if (r.status !== '已发布') return { ok: false, msg: '该报告当前不可下载' }
  const vols = (r.volumeSnapshot || []).filter(v => v.open)
  const targets = volumeId ? vols.filter(v => v.id === volumeId) : vols
  if (!targets.length) return { ok: false, msg: volumeId ? '该分册暂未开放，无法下载' : '暂无可下载的分册' }
  const parent = state.parents.find(p => p.id === r.parentId) || {}
  const mobile = String(parent.mobile || '').slice(-4) || '0000'
  const at = now()
  const d = new Date(Date.now() + DOWNLOAD_TTL_DAYS * 864e5)
  const pad = n => String(n).padStart(2, '0')
  const expiresAt = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const scope = volumeId ? 'single' : 'all'
  const files = targets.map((v, i) => ({
    id: `F${Date.now().toString(36).toUpperCase()}${i}`,
    reportId, volumeId: v.id, volumeName: v.shortName || v.name,
    name: `${r.childName}-${v.shortName || v.name}-天赋报告.pdf`,
    size: (Math.round((v.factorCount || 18) * 0.11 * 10) / 10 + 0.6).toFixed(1),
    pages: Math.max(4, Math.round((v.factorCount || 18) * 0.9)),
    at, expiresAt, scope,
    watermark: `${r.childName} · 尾号${mobile} · ${r.id}`
  }))
  const rec = {
    id: uid('DL'), reportId, childName: r.childName, scope,
    volumeNames: files.map(f => f.volumeName), files, at,
    device: '微信小程序', operator: parent.name || '家长'
  }
  touch({ downloads: [rec, ...(state.downloads || [])].slice(0, 200) }, '报告下载',
    `${r.childName} 下载${scope === 'all' ? `完整报告（${files.length} 册）` : files[0].volumeName}`,
    scope === 'all' ? `已生成 ${files.length} 个文件` : `${files[0].name} 已生成`)
  return { ok: true, msg: '报告已生成', record: rec, files }
}

/* C 端要素目录筛选：分类 / 分级 / 关键词 / 已展示条数 */
export function setMiniCatalog(patch = {}) {
  const base = { ...state.miniCatalog, ...patch }
  if (patch.cat !== undefined || patch.level !== undefined || patch.keyword !== undefined) base.limit = 20
  state = { ...state, miniCatalog: base }
  emit()
}
export function resetMiniCatalog() {
  state = { ...state, miniCatalog: { cat: '', level: '', keyword: '', limit: 20 } }
  emit()
}

export function selectDirection(reportId, directionId, tierId, manualName = '') {
  const report = state.reports.find(r => r.id === reportId)
  if (!report) return false
  const limit = state.directionLimit || 3
  if (report.selections.length >= limit && !report.selections.some(s => s.directionId === directionId)) return false
  // 选择结果同样按报告发布时的名称与档位文案冻结，方向改名不影响历史选择
  /* 快照方向可能为空（发布时没有命中任何方向），此时用后台当前配置解析名称，
     否则家长从「自己填写」里选的方向会被标成「自定义方向」 */
  const frozenDirs = (report.directionSnapshot?.directions || []).length
    ? report.directionSnapshot.directions : state.directions
  const frozenTiers = (report.directionSnapshot?.tiers || []).length
    ? report.directionSnapshot.tiers : state.tiers
  const d = frozenDirs.find(x => x.id === directionId)
  const t = frozenTiers.find(x => x.id === tierId)
  const label = manualName || d?.name || '自定义方向'
  const item = {
    directionId, tierId, manualName, at: now(),
    directionName: label, tierName: t?.name || '通用兜底档位',
    teacher: t?.teacher || '按通用档位配置', freq: t?.freq || '按通用档位配置'
  }
  const selections = report.selections.filter(s => s.directionId !== directionId)
  selections.push(item)
  touch({
    reports: state.reports.map(r => r.id === reportId
      ? { ...r, selections, versions: [...(r.versions || []), nextVersion(r, '方向选择', `家长选择「${label}」及目标档位`)] }
      : r)
  }, '方向选择', `${reportId} 已提交「${label}」与目标档位`, '已提交培养方向与目标档位，后台报告详情可查看')
  return true
}

export function removeSelection(reportId, directionId) {
  const report = state.reports.find(r => r.id === reportId)
  if (!report) return
  touch({
    reports: state.reports.map(r => r.id === reportId
      ? { ...r, selections: r.selections.filter(s => s.directionId !== directionId),
          versions: [...(r.versions || []), nextVersion(r, '方向变更', '家长取消了一个已选培养方向')] }
      : r)
  }, '方向变更', `${reportId} 取消一个已选培养方向`, '已取消该培养方向')
}

export function addManualDirection(name, reportId, tierId) {
  state = { ...state,
    manualDirections: [...state.manualDirections,
      { id: nextId('M'), name, count: 1, status: '待归并' }] }
  selectDirection(reportId, 'MANUAL', tierId, name)
}

export function mergeManualDirection(id, toDirectionId) {
  const m = state.manualDirections.find(x => x.id === id)
  if (!m) return { ok: false, msg: '未找到该记录' }
  if (m.status !== '待归并') return { ok: false, msg: '该记录已处理' }
  let msg = ''
  if (toDirectionId) {
    const d = state.directions.find(x => x.id === toDirectionId)
    if (!d) return { ok: false, msg: '目标方向不存在' }
    const aliases = [...(d.aliases || []), m.name]
    touch({
      directions: state.directions.map(x => x.id === toDirectionId ? { ...x, aliases } : x),
      manualDirections: state.manualDirections.map(x => x.id === id ? { ...x, status: '已归并' } : x)
    }, '方向归并', `自定义方向「${m.name}」归并到「${d.name}」`)
    msg = `「${m.name}」已归并到「${d.name}」`
  } else {
    const created = createDirection({
      name: m.name,
      desc: `由自定义方向「${m.name}」转入，待配置要素与要求分级。`
    })
    if (created.error) return { ok: false, msg: created.error }
    touch({
      manualDirections: state.manualDirections.map(x => x.id === id ? { ...x, status: '已转正式' } : x)
    }, '方向归并', `自定义方向「${m.name}」转为正式方向`)
    msg = `「${m.name}」已转为正式方向，请完成要素与要求分级配置`
  }
  return { ok: true, msg }
}

/* 工作台待处理事项：全部由当前数据实时派生，不落库、不手写。
   报告三态各自对应一类待办（待发布 / 已发布未选方向 / 已撤回待确认），
   加上「子女查询未完成」与「自定义方向待归并」，共五类。
   好处：发布、撤回、恢复发布、家长选完方向、查询完成之后，对应待办自动消失，
   不会出现「报告已发布但待办还挂着」或同一个人挂多条重复待办。 */
export const TODO_KIND_LABEL = {
  pending: '待发布',
  query: '查询未完成',
  unselected: '未选方向',
  withdrawn: '已撤回',
  manual: '待归并'
}

export function workbenchTodos(s = state) {
  const list = []
  const add = (kind, item) => list.push({ kind, done: false, level: 'normal', ...item })

  /* 1. 待发布：报告已生成、还没发布，家长端看不到 */
  ;(s.reports || []).filter(r => r.status === '待发布').forEach(r => add('pending', {
    id: `TD-PEND-${r.id}`, type: '待发布报告', target: 'reports', status: '待发布', level: 'high',
    title: `${r.childName} · ${r.id}`,
    meta: `报告页 · 待发布`,
    note: `生成于 ${r.queriedAt}，家长端尚不可见，发布后才可查看`
  }))

  /* 2. 查询未完成：未查到 / 查询中 / 尚未查询，都还没走到报告环节 */
  ;(s.children || []).filter(c => c.query !== '已查到').forEach(c => add('query', {
    id: `TD-QUERY-${c.id}`, type: '查询未完成', target: 'members', level: c.query === '未查到' ? 'high' : 'normal',
    title: `${c.name} · ${c.query}`,
    meta: '会员管理 · 子女查询',
    note: c.query === '未查到'
      ? `失败原因：${c.reason || '未出结果'}，需核对信息后重新查询`
      : c.query === '查询中' ? '查询进行中，出结果后自动生成待发布报告' : '尚未发起主动查询，可在会员详情发起'
  }))

  /* 3. 未选方向：报告已发布，家长还没选培养方向 */
  ;(s.reports || []).filter(r => r.status === '已发布' && !(r.selections || []).length).forEach(r => add('unselected', {
    id: `TD-DIR-${r.id}`, type: '未选培养方向', target: 'reports', status: '已发布',
    title: `${r.childName} · ${r.id}`,
    meta: '报告页 · 已发布',
    note: `发布于 ${r.publishedAt || '—'}，家长尚未选择培养方向`
  }))

  /* 4. 已撤回：家长端不可见，需要确认恢复发布或重新查询 */
  ;(s.reports || []).filter(r => r.status === '已撤回').forEach(r => add('withdrawn', {
    id: `TD-WD-${r.id}`, type: '已撤回待确认', target: 'reports', status: '已撤回',
    title: `${r.childName} · ${r.id}`,
    meta: '报告页 · 已撤回',
    note: '家长端不可见；如仍需开放请恢复发布，否则可重新查询生成新报告'
  }))

  /* 5. 自定义方向待归并 */
  ;(s.manualDirections || []).filter(m => m.status === '待归并').forEach(m => add('manual', {
    id: `TD-MANUAL-${m.id}`, type: '自定义方向待归并', target: 'directions',
    title: `「${m.name}」· 出现 ${m.count || 1} 次`,
    meta: '培养方向 · 自定义方向',
    note: '可归并到已有方向，或转为正式方向后补要素与要求分级'
  }))

  const order = { pending: 0, query: 1, unselected: 2, withdrawn: 3, manual: 4 }
  return list.sort((a, b) =>
    (order[a.kind] - order[b.kind]) || ((b.level === 'high' ? 1 : 0) - (a.level === 'high' ? 1 : 0)))
}

/* 分类计数：工作台标题右侧与统计卡副文案共用同一口径 */
export function todoCounts(list = []) {
  return list.reduce((acc, t) => { acc[t.kind] = (acc[t.kind] || 0) + 1; return acc }, {})
}

/* ---------- 培养方向与目标档位配置 ---------- */

export function createDirection({ name, code = '', desc = '' }) {
  const cleanName = String(name || '').trim()
  if (!cleanName) return { error: '请填写方向名称' }
  const cleanCode = String(code || '').trim() || nextDirectionCode()
  if (state.directions.some(d => d.code === cleanCode)) return { error: '方向编码已存在' }
  const ids = activeTierIds()
  const id = uid('D')
  const direction = {
    id, code: cleanCode, name: cleanName, icon: cleanName.slice(0, 1),
    status: '停用', version: 'v1.0',
    desc: String(desc || '').trim() || '待完善方向说明',
    tiers: [...ids],
    defaultTierId: ids.includes(state.defaultTierId) ? state.defaultTierId : (ids[0] || ''),
    selectedCount: 0, requirements: [], aliases: []
  }
  touch({ directions: [...state.directions, direction] }, '方向新增',
    `新增培养方向「${cleanName}」`, `已新增培养方向「${cleanName}」，请配置要素与要求分级`)
  return { ok: true, id }
}

export function saveDirection(id, patch) {
  const d = state.directions.find(x => x.id === id)
  if (!d) return { ok: false, msg: '未找到培养方向' }
  const next = { ...d, ...patch, version: bumpVersion(d.version) }
  touch({ directions: state.directions.map(x => x.id === id ? next : x) },
    '方向配置', `培养方向「${next.name}」配置保存，版本 ${next.version}`)
  return { ok: true, direction: next }
}

export function toggleDirection(id) {
  const d = state.directions.find(x => x.id === id)
  if (!d) return { ok: false, msg: '未找到培养方向' }
  if (d.status === '启用') {
    touch({ directions: state.directions.map(x => x.id === id ? { ...x, status: '停用' } : x) },
      '方向停用', `培养方向「${d.name}」已停用`)
    return { ok: true, msg: '方向已停用，家长端不再展示' }
  }
  if (!d.requirements.length) return { ok: false, msg: '请先配置至少一项要素' }
  const tiers = d.tiers.filter(x => activeTierIds().includes(x))
  if (!tiers.length) return { ok: false, msg: '请至少启用一个目标档位' }
  const defaultTierId = tiers.includes(d.defaultTierId) ? d.defaultTierId : tiers[0]
  touch({ directions: state.directions.map(x => x.id === id
    ? { ...x, status: '启用', tiers, defaultTierId } : x) },
    '方向启用', `培养方向「${d.name}」已启用`, '方向已启用')
  return { ok: true, msg: '方向已启用' }
}

export function deleteDirection(id) {
  const d = state.directions.find(x => x.id === id)
  if (!d) return { ok: false, msg: '未找到培养方向' }
  const used = state.reports.some(r => r.selections.some(s => s.directionId === id))
  if (used) return { ok: false, msg: '该方向已被报告选择，仅可停用' }
  touch({ directions: state.directions.filter(x => x.id !== id) },
    '方向删除', `培养方向「${d.name}」已删除`, '方向已删除')
  return { ok: true, msg: '方向已删除' }
}

export function duplicateDirection(id) {
  const d = state.directions.find(x => x.id === id)
  if (!d) return { ok: false, msg: '未找到培养方向' }
  const newId = uid('D')
  const copy = {
    ...d,
    id: newId,
    code: nextDirectionCode(),
    name: `${d.name} 副本`,
    status: '停用', version: 'v1.0', selectedCount: 0,
    requirements: d.requirements.map(r => ({ ...r })),
    tiers: [...d.tiers],
    aliases: [...(d.aliases || [])]
  }
  touch({ directions: [...state.directions, copy] }, '方向复制',
    `复制为「${copy.name}」`, `已复制为「${copy.name}」，请核对要素与档位后启用`)
  return { ok: true, id: newId }
}

export function createTier({ name, teacher = '', freq = '', headline = '', desc = '' }) {
  const cleanName = String(name || '').trim()
  if (!cleanName) return { error: '请填写档位名称' }
  if (state.tiers.some(t => t.name === cleanName && t.status === '启用')) return { error: '档位名称已存在' }
  const id = uid('T')
  const teacherText = String(teacher || '').trim() || '待配置'
  const freqText = String(freq || '').trim() || '待配置'
  const tier = {
    id, name: cleanName, teacher: teacherText, freq: freqText,
    headline: String(headline || '').trim() || cleanName,
    desc: String(desc || '').trim() || `${cleanName}档位，建议师资 ${teacherText}，${freqText}。`,
    status: '启用', preset: false
  }
  const directions = state.directions.map(d => ({ ...d, tiers: [...d.tiers, id] }))
  touch({ tiers: [...state.tiers, tier], directions }, '档位新增',
    `新增目标档位「${cleanName}」`, `已新增目标档位「${cleanName}」，默认对所有方向启用`)
  return { ok: true, id }
}

export function updateTier(id, patch) {
  const t = state.tiers.find(x => x.id === id)
  if (!t) return { ok: false, msg: '未找到目标档位' }
  touch({ tiers: state.tiers.map(x => x.id === id ? { ...x, ...patch } : x) },
    '档位编辑', `目标档位「${patch.name || t.name}」已保存`, '档位已保存')
  return { ok: true, msg: '档位已保存' }
}

export function toggleTier(id) {
  const t = state.tiers.find(x => x.id === id)
  if (!t) return { ok: false, msg: '未找到目标档位' }
  const willEnable = t.status !== '启用'
  const tiers = state.tiers.map(x => x.id === id
    ? { ...x, status: willEnable ? '启用' : '停用' } : x)
  const active = tiers.filter(x => x.status === '启用').map(x => x.id)
  if (!willEnable && !active.length) return { ok: false, msg: '请至少保留一个启用的目标档位' }
  let defaultTierId = state.defaultTierId
  let directions = state.directions
  if (!willEnable) {
    directions = directions.map(d => {
      const list = d.tiers.filter(x => active.includes(x))
      const def = list.includes(d.defaultTierId) ? d.defaultTierId : (list[0] || '')
      return { ...d, tiers: list, defaultTierId: def }
    })
    if (!active.includes(defaultTierId)) defaultTierId = active[0] || ''
  } else {
    directions = directions.map(d => d.tiers.includes(id) ? d : { ...d, tiers: [...d.tiers, id] })
  }
  touch({ tiers, directions, defaultTierId }, '档位状态',
    willEnable ? `档位「${t.name}」已启用` : `档位「${t.name}」已停用`,
    willEnable ? '档位已启用' : '档位已停用，所有方向同步不可选')
  return { ok: true, msg: willEnable ? '档位已启用' : '档位已停用' }
}

export function deleteTier(id) {
  const t = state.tiers.find(x => x.id === id)
  if (!t) return { ok: false, msg: '未找到目标档位' }
  if (t.preset) return { ok: false, msg: '默认档位不可删除，可停用' }
  if (state.reports.some(r => r.selections.some(s => s.tierId === id))) {
    return { ok: false, msg: '该档位已被报告选择，不可删除' }
  }
  const tiers = state.tiers.filter(x => x.id !== id)
  const directions = state.directions.map(d => {
    const list = d.tiers.filter(x => x !== id)
    return { ...d, tiers: list,
      defaultTierId: d.defaultTierId === id ? (list[0] || '') : d.defaultTierId }
  })
  const defaultTierId = state.defaultTierId === id
    ? ((tiers.find(x => x.status === '启用') || {}).id || '')
    : state.defaultTierId
  touch({ tiers, directions, defaultTierId }, '档位删除',
    `目标档位「${t.name}」已删除`, '档位已删除')
  return { ok: true, msg: '档位已删除' }
}

export function setDefaultTier(id) {
  const t = state.tiers.find(x => x.id === id && x.status === '启用')
  if (!t) return { ok: false, msg: '档位不存在或已停用' }
  const directions = state.directions.map(d => (d.tiers || []).includes(id)
    ? { ...d, defaultTierId: id } : d)
  touch({ defaultTierId: id, directions }, '档位设置',
    `全局默认档位设为「${t.name}」`, `全局默认档位已设为「${t.name}」`)
  return { ok: true, msg: `全局默认档位已设为「${t.name}」` }
}

/* ---------- 会员与子女维护：家长身份证为选填 ---------- */

function newChild(parentId, c, source) {
  return {
    id: nextId('C202611'), parentId, name: c.name, gender: c.gender || '女', birthday: c.birthday,
    relation: c.relation || defaultRelation(state.parents.find(p => p.id === parentId)),
    idNo: maskId(c.idNo || ''), query: '查询中', reason: '', source
  }
}

export function createMember({ name, mobile, idNo = '', children }) {
  const parentId = nextId('P202611')
  const parent = {
    id: parentId, name, mobile: maskMobile(mobile), idNo: maskId(idNo),
    source: '后台录入', status: '正常', registeredAt: now()
  }
  const kids = children.map(c => newChild(parentId, c, '后台录入'))
  touch({
    parents: [...state.parents, parent],
    children: [...state.children, ...kids]
  }, '会员新增', `新建会员 ${name} 及 ${kids.length} 名子女`,
  `已新建会员 ${name} 及 ${kids.length} 名子女，正在主动查询`)
  kids.forEach((c, i) => setTimeout(() => finishQuery(c.id, true), 900 + i * 250))
}

export function updateMember(id, patch) {
  touch({ parents: state.parents.map(p => p.id === id ? { ...p, ...patch } : p) },
    '会员编辑', `会员 ${id} 资料已保存`, '会员资料已保存')
}

export function toggleMember(id) {
  const p = state.parents.find(x => x.id === id)
  touch({ parents: state.parents.map(x => x.id === id
    ? { ...x, status: x.status === '正常' ? '停用' : '正常' } : x) },
    '账号状态', `家长账号 ${p?.name || id} 状态已变更`)
}

export function addChildForMember(parentId, c) {
  const child = newChild(parentId, c, '后台录入')
  touch({ children: [...state.children, child] }, '子女新增',
    `新增子女 ${child.name}`, `已新增子女 ${child.name}`)
  setTimeout(() => finishQuery(child.id, true), 900)
  return child
}

export function updateChild(id, patch) {
  touch({ children: state.children.map(c => c.id === id ? { ...c, ...patch } : c) },
    '子女编辑', `子女 ${id} 资料已保存`, '子女资料已保存，正在重新查询')
}

export function unbindChild(id) {
  const children = state.children.filter(c => c.id !== id)
  const wasCurrent = state.currentChildId === id
  const next = children.find(c => c.parentId === CURRENT_PARENT_ID) || children[0]
  const currentChildId = wasCurrent ? (next?.id || '') : state.currentChildId
  const currentSubject = wasCurrent && !currentChildId ? 'self' : state.currentSubject
  touch({ children, currentChildId, currentSubject }, '子女解绑', `子女 ${id} 已解绑`, '子女已解绑，家长端同步不可见')
}

export function publishedReports(childId) {
  return state.reports.filter(r => r.status === '已发布' && (!childId || r.childId === childId))
}

/* ---------- C 端：测评对象切换、报告筛选、家长基础信息 ---------- */

export function setSubject(type, childId = '') {
  if (type === 'self') {
    state = { ...state, currentSubject: 'self' }
    emit()
    return
  }
  if (!state.children.some(c => c.id === childId)) return
  state = { ...state, currentSubject: 'child', currentChildId: childId }
  emit()
}

export function setReportFilter(filter) {
  state = { ...state, reportFilter: filter || 'all' }
  emit()
}

export function updateParentProfile(patch) {
  const p = state.parents.find(x => x.id === CURRENT_PARENT_ID)
  if (!p) return { ok: false, msg: '账号不存在' }
  const name = String(patch.name || '').trim()
  const mobile = String(patch.mobile || '').trim()
  const rawId = String(patch.idNo || '').trim()
  if (!name) return { ok: false, msg: '请填写姓名' }
  if (!mobile) return { ok: false, msg: '请填写手机号' }
  if (mobile !== p.mobile && !/^1\d{10}$/.test(mobile)) {
    return { ok: false, msg: '请填写 11 位手机号' }
  }
  let idNo = p.idNo
  if (rawId !== p.idNo) {
    if (!rawId) idNo = ''
    else if (!/^\d{17}[\dXx]$/.test(rawId)) return { ok: false, msg: '身份证号格式不正确，也可留空' }
    else idNo = maskId(rawId)
  }
  const next = {
    ...p, name,
    mobile: /^1\d{10}$/.test(mobile) ? maskMobile(mobile) : mobile,
    idNo,
    gender: patch.gender || p.gender,
    birthday: patch.birthday || p.birthday,
    avatar: name.slice(0, 1) || p.avatar
  }
  touch({ parents: state.parents.map(x => x.id === p.id ? next : x) },
    '资料编辑', `家长 ${p.id} 基础信息已保存`, '基础信息已保存')
  return { ok: true, msg: '基础信息已保存' }
}

/* ---------- 天赋规则：分类 / 要素 / 分级 / 固定注解 ---------- */

const categoryName = code => state.categories.find(c => c.code === code)?.name || code
const levelCode = name => state.levelsData.find(l => l.name === name)?.code || 'LV1'

function notesForFactor(f) {
  return state.levelsData.map(l => ({
    id: `${f.code}-${l.code}`, factorCode: f.code, factorName: f.name,
    category: f.category, level: l.name,
    note: `${f.name}在「${l.name}」分级的固定注解，建议结合孩子日常表现综合解读。`,
    ageRange: '0 岁', gender: '男', status: '启用'
  }))
}

export function setTab(moduleId, tab) {
  state = { ...state, tabMap: { ...state.tabMap, [moduleId]: tab } }
  emit()
}
export function setPage(moduleId, page) {
  state = { ...state, pages: { ...state.pages, [moduleId]: Math.max(1, page) } }
  emit()
}
export function setFactorCategory(code) {
  state = { ...state, factorCategory: code }
  emit()
}
export function saveCategory({ originCode = '', code = '', name = '' }) {
  const cleanName = String(name).trim()
  if (!cleanName) return { ok: false, msg: '请填写分类名称' }
  if (originCode) {
    const exists = state.categories.some(c => c.code === originCode)
    if (!exists) return { ok: false, msg: '分类不存在' }
    touch({ categories: state.categories.map(c => c.code === originCode ? { ...c, name: cleanName } : c) },
      '分类编辑', `分类 ${originCode} 名称改为「${cleanName}」`, '分类已保存')
    return { ok: true, msg: '分类已保存' }
  }
  const cleanCode = String(code).trim().toUpperCase()
  if (!cleanCode) return { ok: false, msg: '请填写分类编码' }
  if (state.categories.some(c => c.code === cleanCode)) return { ok: false, msg: '分类编码已存在' }
  touch({ categories: [...state.categories, { code: cleanCode, name: cleanName }] },
    '分类新增', `新增分类 ${cleanCode}「${cleanName}」`, '分类已新增')
  return { ok: true, msg: '分类已新增' }
}

export function deleteCategory(code) {
  if (!state.categories.some(c => c.code === code)) return { ok: false, msg: '分类不存在' }
  if (state.factors.some(f => f.category === code)) return { ok: false, msg: '该分类下存在要素，请先转移或删除要素' }
  touch({ categories: state.categories.filter(c => c.code !== code) },
    '分类删除', `分类 ${code} 已删除`, '分类已删除')
  return { ok: true }
}

export function saveFactor({ originCode = '', code = '', name = '', category = '', status = '启用' }) {
  const cleanName = String(name).trim()
  if (!cleanName) return { ok: false, msg: '请填写要素名称' }
  if (!state.categories.some(c => c.code === category)) return { ok: false, msg: '请选择有效分类' }
  if (originCode) {
    const old = state.factors.find(f => f.code === originCode)
    if (!old) return { ok: false, msg: '要素不存在' }
    const factors = state.factors.map(f => f.code === originCode
      ? { ...f, name: cleanName, category, categoryName: categoryName(category), status } : f)
    const notes = state.notes.map(n => n.factorCode === originCode
      ? { ...n, factorName: cleanName, category } : n)
    touch({ factors, notes }, '要素编辑', `要素 ${originCode} 资料已保存`, '要素已保存')
    return { ok: true, msg: '要素已保存' }
  }
  const cleanCode = String(code).trim().toUpperCase()
  if (!cleanCode) return { ok: false, msg: '请填写要素编码' }
  if (state.factors.some(f => f.code === cleanCode)) return { ok: false, msg: '要素编码已存在' }
  const factor = {
    code: cleanCode, name: cleanName, category, categoryName: categoryName(category),
    score: 70, level: '优良', note: '', ageRange: '0 岁', gender: '男', status
  }
  touch({ factors: [...state.factors, factor], notes: [...state.notes, ...notesForFactor(factor)] },
    '要素新增', `新增要素 ${cleanCode}「${cleanName}」`, '要素已新增，并生成四档固定注解')
  return { ok: true, msg: '要素已新增，并生成固定注解' }
}

export function toggleFactor(code) {
  const f = state.factors.find(x => x.code === code)
  if (!f) return { ok: false, msg: '要素不存在' }
  const next = f.status === '启用' ? '停用' : '启用'
  touch({ factors: state.factors.map(x => x.code === code ? { ...x, status: next } : x) },
    '要素状态', `要素 ${code} 已${next}`, `要素已${next}`)
  return { ok: true, msg: `要素已${next}` }
}

export function deleteFactor(code) {
  if (!state.factors.some(f => f.code === code)) return { ok: false, msg: '要素不存在' }
  if (state.directions.some(d => (d.requirements || []).some(r => r.code === code))) {
    return { ok: false, msg: '该要素已被培养方向引用，仅可停用' }
  }
  touch({
    factors: state.factors.filter(f => f.code !== code),
    notes: state.notes.filter(n => n.factorCode !== code)
  }, '要素删除', `要素 ${code} 及其固定注解已删除`, '要素及关联注解已删除')
  return { ok: true, msg: '要素及关联注解已删除' }
}

export function saveLevel({ originCode = '', code = '', name = '', order = 1, range = '', status = '启用' }) {
  const cleanName = String(name).trim()
  if (!cleanName) return { ok: false, msg: '请填写分级名称' }
  if (originCode) {
    const old = state.levelsData.find(l => l.code === originCode)
    if (!old) return { ok: false, msg: '分级不存在' }
    if (state.levelsData.some(l => l.name === cleanName && l.code !== originCode)) {
      return { ok: false, msg: '分级名称已存在' }
    }
    const levelsData = state.levelsData.map(l => l.code === originCode
      ? { ...l, name: cleanName, order: Number(order) || 1, range, status } : l)
    const notes = cleanName === old.name ? state.notes
      : state.notes.map(n => n.level === old.name ? { ...n, level: cleanName } : n)
    touch({ levelsData, notes }, '分级编辑', `分级 ${originCode} 已保存`, '分级已保存')
    return { ok: true, msg: '分级已保存' }
  }
  const cleanCode = String(code).trim().toUpperCase()
  if (!cleanCode) return { ok: false, msg: '请填写分级编码' }
  if (state.levelsData.some(l => l.code === cleanCode || l.name === cleanName)) {
    return { ok: false, msg: '分级编码或名称已存在' }
  }
  const level = { code: cleanCode, name: cleanName, order: Number(order) || 1, range, tone: 'blue', status }
  const notes = [...state.notes, ...state.factors.map(f => ({
    id: `${f.code}-${cleanCode}`, factorCode: f.code, factorName: f.name, category: f.category,
    level: cleanName, note: `${f.name}在「${cleanName}」分级的固定注解。`,
    ageRange: '0 岁', gender: '男', status: '启用'
  }))]
  touch({ levelsData: [...state.levelsData, level], notes }, '分级新增',
    `新增分级 ${cleanCode}「${cleanName}」`, '分级已新增，并生成对应固定注解')
  return { ok: true, msg: '分级已新增，并生成固定注解' }
}

export function deleteLevel(code) {
  const l = state.levelsData.find(x => x.code === code)
  if (!l) return { ok: false, msg: '分级不存在' }
  if (state.directions.some(d => (d.requirements || []).some(r => r.level === l.name))) {
    return { ok: false, msg: '该分级已被培养方向引用，仅可停用' }
  }
  if (state.levelsData.length <= 2) return { ok: false, msg: '请至少保留两个分级' }
  touch({
    levelsData: state.levelsData.filter(x => x.code !== code),
    notes: state.notes.filter(n => n.level !== l.name)
  }, '分级删除', `分级 ${code} 及其固定注解已删除`, '分级及关联注解已删除')
  return { ok: true, msg: '分级及关联注解已删除' }
}

/* 固定注解口径：年龄条件只收 0–18 的具体年龄（岁），性别条件只有男 / 女，
   正文可维护多条（texts），小程序端每次随机展示其中一条；note 恒为第一条，兼容旧读取方 */
export function saveNote({ originId = '', factorCode = '', level = '', note = '', texts = '', age = '', gender = '', status = '启用' }) {
  const list = (Array.isArray(texts) && texts.length ? texts : [note])
    .map(t => String(t).trim()).filter(Boolean)
  if (!list.length) return { ok: false, msg: '请至少填写一条注解正文' }
  const ageRaw = String(age).trim()
  if (!/^\d+$/.test(ageRaw)) return { ok: false, msg: '年龄条件请填写 0–18 的具体年龄（岁），不接受区间' }
  const ageNum = Number(ageRaw)
  if (ageNum < 0 || ageNum > 18) {
    return { ok: false, msg: '年龄条件请填写 0–18 的具体年龄（岁），不接受区间' }
  }
  const g = gender === '女' ? '女' : '男'
  const payload = { note: list[0], texts: list, ageRange: `${ageNum} 岁`, gender: g, status }
  if (!state.factors.some(f => f.code === factorCode)) return { ok: false, msg: '要素不存在' }
  if (!state.levelsData.some(l => l.name === level)) return { ok: false, msg: '分级不存在' }
  if (originId) {
    if (!state.notes.some(n => n.id === originId)) return { ok: false, msg: '注解不存在' }
    touch({ notes: state.notes.map(n => n.id === originId
      ? { ...n, ...payload } : n) },
      '注解编辑', `固定注解 ${originId} 已保存（${list.length} 条话术）`, '固定注解已保存')
    return { ok: true, msg: '固定注解已保存' }
  }
  const id = `${factorCode}-${levelCode(level)}`
  if (state.notes.some(n => n.id === id)) return { ok: false, msg: '该要素与分级的注解已存在，请直接编辑' }
  const f = state.factors.find(x => x.code === factorCode)
  touch({ notes: [...state.notes, { id, factorCode, factorName: f.name, category: f.category,
    level, ...payload }] },
    '注解新增', `新增固定注解 ${id}`, '固定注解已新增')
  return { ok: true, msg: '固定注解已新增' }
}

export function toggleNote(id) {
  const n = state.notes.find(x => x.id === id)
  if (!n) return { ok: false, msg: '注解不存在' }
  const next = n.status === '启用' ? '停用' : '启用'
  touch({ notes: state.notes.map(x => x.id === id ? { ...x, status: next } : x) },
    '注解状态', `固定注解 ${id} 已${next}`, `固定注解已${next}`)
  return { ok: true, msg: `固定注解已${next}` }
}

export function deleteNote(id) {
  if (!state.notes.some(n => n.id === id)) return { ok: false, msg: '注解不存在' }
  touch({ notes: state.notes.filter(n => n.id !== id) },
    '注解删除', `固定注解 ${id} 已删除`, '固定注解已删除')
  return { ok: true, msg: '固定注解已删除' }
}

/* 资料导入：校验通过的行真正写入规则数据 */
export function importRows(kind, rows = []) {
  if (!Array.isArray(rows) || !rows.length) return { ok: false, msg: '没有可导入的数据' }
  if (kind === 'factors') {
    let factors = [...state.factors]
    let notes = [...state.notes]
    let added = 0
    rows.forEach(r => {
      const code = String(r.code || '').trim().toUpperCase()
      const name = String(r.name || '').trim()
      const category = String(r.category || '').trim()
      if (!code || !name || !state.categories.some(c => c.code === category)) return
      if (factors.some(f => f.code === code)) return
      const factor = { code, name, category, categoryName: categoryName(category),
        score: 70, level: '优良', note: '', ageRange: '0 岁', gender: '男', status: '启用' }
      factors.push(factor)
      notes.push(...notesForFactor(factor))
      added++
    })
    if (!added) return { ok: false, msg: '校验通过的行均已存在，未产生新增' }
    touch({ factors, notes }, '规则导入', `导入天赋要素 ${added} 行，生成 ${added * state.levelsData.length} 条固定注解`,
      `导入完成：新增 ${added} 项要素`)
    return { ok: true, msg: `导入完成：新增 ${added} 项要素` }
  }
  if (kind === 'notes') {
    let notes = [...state.notes]
    let count = 0
    rows.forEach(r => {
      const id = `${r.factorCode}-${levelCode(r.level)}`
      const idx = notes.findIndex(n => n.id === id)
      if (idx < 0) return
      const text = String(r.note || '').trim()
      notes[idx] = text
        ? { ...notes[idx], note: text, texts: [text] } /* 导入按单条话术覆盖 */
        : notes[idx]
      count++
    })
    if (!count) return { ok: false, msg: '未匹配到可更新的固定注解' }
    touch({ notes }, '规则导入', `导入固定注解 ${count} 行`, `导入完成：更新 ${count} 条固定注解`)
    return { ok: true, msg: `导入完成：更新 ${count} 条固定注解` }
  }
  if (kind === 'levels') {
    let levelsData = [...state.levelsData]
    let count = 0
    rows.forEach(r => {
      const idx = levelsData.findIndex(l => l.code === r.code)
      if (idx < 0) return
      levelsData[idx] = { ...levelsData[idx], range: String(r.range || '').trim() || levelsData[idx].range,
        order: Number(r.order) || levelsData[idx].order }
      count++
    })
    if (!count) return { ok: false, msg: '未匹配到可更新的分级' }
    touch({ levelsData }, '规则导入', `导入分级与结果范围 ${count} 行`, `导入完成：更新 ${count} 条分级范围`)
    return { ok: true, msg: `导入完成：更新 ${count} 条分级范围` }
  }
  return { ok: false, msg: '未知导入类型' }
}

/* ---------- 系统管理：级联菜单分组 / 菜单 / 用户 / 角色 ---------- */

export function toggleMenuGroup(name) {
  const cur = state.menuExpanded || {}
  state = { ...state, menuExpanded: { ...cur, [name]: cur[name] === false } }
  emit()
}
export function setAllMenuGroups(open) {
  const names = [...new Set((state.menuConfig || []).map(m => m.group))]
  const menuExpanded = {}
  names.forEach(n => { menuExpanded[n] = !!open })
  state = { ...state, menuExpanded }
  emit()
}

export function saveMenuGroup({ originId = '', name = '', icon = '', status = '启用' }) {
  const clean = String(name).trim()
  if (!clean) return { ok: false, msg: '请填写分组名称' }
  if (originId) {
    const old = state.menuGroups.find(g => g.id === originId)
    if (!old) return { ok: false, msg: '分组不存在' }
    if (old.name !== clean && state.menuGroups.some(g => g.name === clean)) {
      return { ok: false, msg: '分组名称已存在' }
    }
    const menuConfig = state.menuConfig.map(m => m.group === old.name ? { ...m, group: clean } : m)
    touch({
      menuGroups: state.menuGroups.map(g => g.id === originId
        ? { ...g, name: clean, icon: icon || g.icon, status } : g),
      menuConfig
    }, '菜单分组', `一级分组「${clean}」已保存`, '菜单分组已保存')
    return { ok: true, msg: '菜单分组已保存' }
  }
  if (state.menuGroups.some(g => g.name === clean)) return { ok: false, msg: '分组名称已存在' }
  const sort = Math.max(0, ...state.menuGroups.map(g => g.sort)) + 1
  touch({ menuGroups: [...state.menuGroups,
    { id: uid('G'), name: clean, icon: icon || '▦', sort, status }] },
  '菜单分组', `新增一级分组「${clean}」`, '菜单分组已新增')
  return { ok: true, msg: '菜单分组已新增' }
}

export function toggleMenuGroupStatus(id) {
  const g = state.menuGroups.find(x => x.id === id)
  if (!g) return { ok: false, msg: '分组不存在' }
  const next = g.status === '启用' ? '停用' : '启用'
  touch({ menuGroups: state.menuGroups.map(x => x.id === id ? { ...x, status: next } : x) },
    '菜单分组', `一级分组「${g.name}」已${next}`, `菜单分组已${next}`)
  return { ok: true, msg: `菜单分组已${next}` }
}

export function moveMenuGroup(id, dir) {
  const list = state.menuGroups.slice().sort((a, b) => a.sort - b.sort)
  const idx = list.findIndex(x => x.id === id)
  const swap = idx + dir
  if (idx < 0 || swap < 0 || swap >= list.length) return { ok: false, msg: '已在边界' }
  const a = list[idx], b = list[swap]
  const menuGroups = state.menuGroups.map(x => x.id === a.id ? { ...x, sort: b.sort }
    : x.id === b.id ? { ...x, sort: a.sort } : x)
  touch({ menuGroups }, '菜单分组', `一级分组「${a.name}」排序已调整`, '菜单分组排序已调整')
  return { ok: true, msg: '菜单分组排序已调整' }
}

export function saveMenu(id, patch) {
  const m = state.menuConfig.find(x => x.id === id)
  if (!m) return { ok: false, msg: '菜单不存在' }
  touch({ menuConfig: state.menuConfig.map(x => x.id === id ? { ...x, ...patch } : x) },
    '菜单编辑', `菜单「${patch.name || m.name}」配置已保存`, '菜单配置已保存')
  return { ok: true, msg: '菜单配置已保存' }
}

export function toggleMenu(id) {
  const m = state.menuConfig.find(x => x.id === id)
  if (!m) return { ok: false, msg: '菜单不存在' }
  const next = m.status === '启用' ? '停用' : '启用'
  touch({ menuConfig: state.menuConfig.map(x => x.id === id ? { ...x, status: next } : x) },
    '菜单状态', `菜单「${m.name}」已${next}`, `菜单已${next}，停用后不在侧栏展示`)
  return { ok: true, msg: `菜单已${next}` }
}

export function moveMenu(id, dir) {
  const list = state.menuConfig.slice().sort((a, b) => a.sort - b.sort)
  const idx = list.findIndex(x => x.id === id)
  const swap = idx + dir
  if (idx < 0 || swap < 0 || swap >= list.length) return { ok: false, msg: '已在边界' }
  const a = list[idx], b = list[swap]
  const menuConfig = state.menuConfig.map(x => x.id === a.id ? { ...x, sort: b.sort }
    : x.id === b.id ? { ...x, sort: a.sort } : x)
  touch({ menuConfig }, '菜单排序', `菜单「${a.name}」排序已调整`, '菜单排序已调整')
  return { ok: true, msg: '菜单排序已调整' }
}

export function saveBackUser({ originId = '', account = '', name = '', role = '', status = '正常' }) {
  if (!String(account).trim() || !String(name).trim()) return { ok: false, msg: '请填写账号与姓名' }
  if (state.backUsers.some(u => u.account === account && u.id !== originId)) {
    return { ok: false, msg: '登录账号已存在' }
  }
  if (originId) {
    touch({ backUsers: state.backUsers.map(u => u.id === originId
      ? { ...u, account, name, role, status } : u) },
      '用户编辑', `后台用户 ${account} 资料已保存`, '用户资料已保存')
    return { ok: true, msg: '用户资料已保存' }
  }
  touch({ backUsers: [...state.backUsers, { id: uid('U'), account, name, role, status, lastLogin: '—' }] },
    '用户新增', `新增后台用户 ${account}`, '用户已新增')
  return { ok: true, msg: '用户已新增' }
}

export function toggleBackUser(id) {
  const u = state.backUsers.find(x => x.id === id)
  if (!u) return { ok: false, msg: '用户不存在' }
  const next = u.status === '正常' ? '停用' : '正常'
  touch({ backUsers: state.backUsers.map(x => x.id === id ? { ...x, status: next } : x) },
    '用户状态', `后台用户 ${u.name} 已${next}`, `用户已${next}`)
  return { ok: true, msg: `用户已${next}` }
}

export function deleteBackUser(id) {
  const u = state.backUsers.find(x => x.id === id)
  if (!u) return { ok: false, msg: '用户不存在' }
  touch({ backUsers: state.backUsers.filter(x => x.id !== id) },
    '用户删除', `后台用户 ${u.name} 已删除`, '用户已删除')
  return { ok: true, msg: '用户已删除' }
}

export function saveRole({ originName = '', name = '', scope = '', status = '启用' }) {
  const clean = String(name).trim()
  if (!clean) return { ok: false, msg: '请填写角色名称' }
  if (state.roles.some(r => r.name === clean && r.name !== originName)) {
    return { ok: false, msg: '角色名称已存在' }
  }
  if (originName) {
    touch({ roles: state.roles.map(r => r.name === originName
      ? { ...r, name: clean, scope, status } : r) },
      '角色编辑', `角色「${clean}」权限范围已保存`, '角色配置已保存')
    return { ok: true, msg: '角色配置已保存' }
  }
  touch({ roles: [...state.roles, { name: clean, scope: scope || '待配置', members: 0, status }] },
    '角色新增', `新增角色「${clean}」`, '角色已新增')
  return { ok: true, msg: '角色已新增' }
}

export function deleteRole(name) {
  const r = state.roles.find(x => x.name === name)
  if (!r) return { ok: false, msg: '角色不存在' }
  if (state.backUsers.some(u => u.role === name)) return { ok: false, msg: '该角色下存在用户，仅可停用' }
  touch({ roles: state.roles.filter(x => x.name !== name) },
    '角色删除', `角色「${name}」已删除`, '角色已删除')
  return { ok: true, msg: '角色已删除' }
}

/* ---------- 培育建议版本：每 4 个月一版，后台可回溯全部历史，C 端只读当前生效版 ---------- */
export function addMonths(iso, months) {
  const [y, m, d] = String(iso).split('-').map(Number)
  if (!y || !m || !d) return iso
  const dt = new Date(y, m - 1 + months, d)
  const p = n => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`
}
export const versionNameOf = iso => `V${String(iso).slice(0, 4)}.${String(iso).slice(5, 7)}`
/* ================= 外部同步层：基因报告 / 培育建议（只读） =================
   本系统不生产、不编辑、不发布报告与建议内容。外部系统按固定格式推送，
   这里只负责接收（syncAdviceVersion / syncGeneReports）、留同步日志、
   切换查看版本（setAdviceViewVersion）以及向家长端提供当前生效版本。 */

export const adviceVersionOf = (s, id) => (s.adviceVersions || []).find(v => v.id === id)
export const adviceDocsOfVersion = (s, id) =>
  (s.adviceDocs || []).filter(d => d.versionId === id)
export const geneReportByNo = (s, reportNo) =>
  (s.geneReports || []).find(r => r.reportNo === reportNo)
export const geneBooksOf = r => String(r?.books || '')
  .split('').map(code => geneBookOf(code)).filter(Boolean)

/* 家长端：只取「当前生效版本」下、已发布、按姓名 + 具体年龄匹配到本人的那一份建议。
   历史版本、同步状态、版本号、报告编号等后台口径一律不进入 C 端；
   被后台撤回的那一份当作「暂无培育建议」，家长端不提示撤回原因。 */
export function miniVisibleAdvice(s = state, reportNo = '') {
  const list = adviceDocsOfVersion(s, s.currentAdviceVersionId)
    .filter(d => (d.publishStatus || '已发布') === '已发布')
  return reportNo ? (list.find(d => d.reportNo === reportNo) || null) : list
}

/* 某个人（按报告编号）在各版本下的建议快照，按生效日期倒序；供后台「历史版本」回溯 */
export function advicePersonHistory(s = state, reportNo = '') {
  const versions = s.adviceVersions || []
  return (s.adviceDocs || [])
    .filter(d => d.reportNo === reportNo)
    .map(doc => ({ doc, version: versions.find(v => v.id === doc.versionId) || null }))
    .sort((a, b) => String(b.version?.effectiveAt || '').localeCompare(String(a.version?.effectiveAt || '')))
}

/* 逐份发布 / 撤回：只切换这一份建议对家长的可见性，不修改正文、不影响其它人；
   历史版本只读，不能发布或撤回。 */
function setAdvicePublish(id, next, action, detail) {
  const d = (state.adviceDocs || []).find(x => x.id === id)
  if (!d) return { ok: false, msg: '未找到培育建议' }
  if (d.versionId !== state.currentAdviceVersionId) return { ok: false, msg: '历史版本只读，不能发布或撤回' }
  if ((d.publishStatus || '已发布') === next) return { ok: false, msg: `该份建议已是${next}状态` }
  const at = now()
  touch({
    adviceDocs: state.adviceDocs.map(x => x.id === id ? {
      ...x, publishStatus: next, opAt: at, opBy: '王运营',
      publishedAt: next === '已发布' ? at : x.publishedAt,
      withdrawnAt: next === '已撤回' ? at : ''
    } : x)
  }, action, detail, next === '已发布' ? '已发布，家长端可见' : '已撤回，家长端不再展示')
  return { ok: true, msg: next === '已发布' ? '已发布，家长端可见' : '已撤回，家长端不再展示' }
}

export function publishAdviceDoc(id) {
  const d = (state.adviceDocs || []).find(x => x.id === id)
  return setAdvicePublish(id, '已发布', '培育建议发布',
    `已发布 ${d?.name || ''} 的培育建议（${d?.versionName || ''}），家长端可见`)
}

export function withdrawAdviceDoc(id) {
  const d = (state.adviceDocs || []).find(x => x.id === id)
  return setAdvicePublish(id, '已撤回', '培育建议撤回',
    `已撤回 ${d?.name || ''} 的培育建议（${d?.versionName || ''}），家长端不再展示`)
}

export function setAdviceViewVersion(id) {
  set({ adviceViewVersionId: id || '' })
}

/* 模拟外部系统推送新一版培育建议：本系统只接收并归档旧版，不修改任何正文。
   外部系统按「姓名 + 具体年龄」重新匹配后推送，多出的条目来自该人其它已同步篇目。 */
export function syncAdviceVersion({ name = '', effectiveAt = '', note = '' } = {}) {
  const eff = String(effectiveAt || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eff)) return { ok: false, msg: '请选择外部系统的同步日期' }
  const versions = state.adviceVersions || []
  const nm = String(name || '').trim() || versionNameOf(eff)
  if (versions.some(v => v.name === nm)) return { ok: false, msg: '该版本已同步，请勿重复接收' }
  const id = `AV${eff.slice(0, 7)}`
  if (versions.some(v => v.id === id)) return { ok: false, msg: '该生效月份已有同步版本' }
  const prevId = state.currentAdviceVersionId
  const prev = adviceVersionOf(state, prevId)
  const baseline = adviceDocsOfVersion(state, prevId)

  const extraSection = doc => {
    const used = new Set((doc.sections || []).map(x => x.book))
    const books = String(doc.books || 'ABCDEF').split('')
    const code = books.find(c => !used.has(c)) || books[0] || 'A'
    const items = GENE_FACTORS[code] || []
    const item = items[2] || items[0] || { name: '综合发育潜质', level: '常态' }
    const lv = String(item.level || '常态').replace(/级$/, '')
    const bk = geneBookOf(code)
    const lead = {
      '卓越': '该项潜质表现处于同龄人前列，具备进一步发展的先天基础。',
      '优秀': '该项潜质发展良好，基础条件较为扎实。',
      '常态': '该项潜质表现平稳，处于同龄人的常见区间。',
      '弱态': '该项潜质相对偏弱，需要更耐心的陪伴与更稳定的节律。'
    }
    return {
      book: code, bookName: bk?.name || '', chapter: bk?.chapters?.[0] || '专项潜质',
      factor: item.name, entropy: lv + '级',
      content: lead[lv] || lead['常态'],
      example: `在${ageLabelOf(doc.age)}孩子的日常情境中，可以留意孩子在${item.name}方面的自然表现。`,
      direction: `以${ageLabelOf(doc.age)}孩子适宜的方式提供接触机会，不急于设定量化目标。`,
      suggestion: '保持规律的生活与活动节奏，定期观察变化后再与专业人员沟通。',
      variant: 1
    }
  }

  const incoming = baseline.map(d => {
    /* 每次同步都按当期年龄重新匹配：过完生日就换到下一岁分册，匹配键同步更新 */
    const age = ageAt(d.birthday, eff)
    return {
      ...d,
      age,
      matchKey: adviceKeyOf(d.name, age),
      id: `${d.id.split('-').slice(0, -1).join('-')}-${eff.slice(0, 7).replace('-', '')}`,
      versionId: id, versionName: nm, status: '当前生效',
      publishStatus: '已发布', publishedAt: now(), withdrawnAt: '', opAt: now(), opBy: '系统同步',
      syncedAt: now(),
      sections: d.sections.concat([extraSection({ ...d, age })])
    }
  })
  const archived = (state.adviceDocs || []).map(d => d.versionId === prevId
    ? { ...d, status: '已归档' } : d)
  const nextVersions = versions.map(v => v.id === prevId ? { ...v, status: '已归档' } : v)
  const rec = {
    id, name: nm, status: '当前生效',
    cycle: `${eff.slice(0, 7)} ~ ${addMonths(eff, ADVICE_CYCLE_MONTHS - 1).slice(0, 7)}`,
    effectiveAt: eff, nextUpdateAt: addMonths(eff, ADVICE_CYCLE_MONTHS),
    syncedAt: now(), source: '外部培育建议系统',
    note: String(note || '').trim() || `外部系统按${ADVICE_MATCH_RULE}重新匹配输出，覆盖 ${incoming.length} 份基因报告。`,
    operator: '系统同步'
  }
  const log = {
    id: uid('SL'), at: now(), system: '外部培育建议系统', target: `培育建议 ${nm}`,
    scope: `${incoming.length} 份基因报告`, result: '成功',
    detail: String(note || '').trim() || `接收新周期建议，${prev?.name || '上一版'} 归档`
  }
  touch({
    adviceVersions: [rec, ...nextVersions],
    adviceDocs: incoming.concat(archived),
    currentAdviceVersionId: id,
    adviceViewVersionId: '',
    syncLogs: [log, ...(state.syncLogs || [])].slice(0, 120)
  }, '培育建议版本同步',
    `已从外部系统接收 ${nm}，覆盖 ${incoming.length} 份基因报告；${prev?.name || '上一版'} 归档，家长端同步切换`,
    '新一版培育建议已同步，家长端已切换')
  return { ok: true, msg: `${nm} 已同步，${incoming.length} 份建议已更新，家长端现在只展示这一版` }
}

/* 模拟外部基因检测系统重新推送报告元数据：正文不变，只更新同步时间与版本留痕 */
export function syncGeneReports() {
  const at = now()
  const log = {
    id: uid('SL'), at, system: '外部基因检测系统', target: '基因报告元数据',
    scope: `${(state.geneReports || []).length} 人 / 篇目按人同步`, result: '成功',
    detail: `按各人实际检测范围同步 A~F 篇目，固定格式正文未变更`
  }
  touch({
    geneReports: (state.geneReports || []).map(r => ({ ...r, syncedAt: at })),
    syncLogs: [log, ...(state.syncLogs || [])].slice(0, 120)
  }, '基因报告同步',
    `已从外部基因检测系统接收 ${(state.geneReports || []).length} 人的报告元数据，正文内容未修改`,
    '基因报告已同步')
  return { ok: true, msg: '基因报告已同步，篇目范围与固定格式正文保持不变' }
}

/* ---------- 检验人身份证号：报告列表展示与检索的唯一口径 ----------
   基因报告按身份证号同步，报告上的证件号即「检验人」本人证件：
   子女报告取子女证件号，本人（SELF）报告取家长本人的证件号。
   库里只存脱敏值（前 4 位 + 后 4 位），展示与检索都按脱敏值处理，不存全号。 */
export function geneIdNoOf(s, gene) {
  if (!gene) return ''
  if (gene.idNo) return gene.idNo
  if (gene.childId === 'SELF') {
    const owner = (s.parents || []).find(p => p.id === CURRENT_PARENT_ID) || (s.parents || [])[0]
    return owner?.idNo || ''
  }
  return (s.children || []).find(c => c.id === gene.childId)?.idNo || ''
}

export function reportIdNoOf(s, report) {
  if (!report) return ''
  const gene = (s.geneReports || []).find(g => g.childId === report.childId)
  const fromGene = geneIdNoOf(s, gene)
  if (fromGene) return fromGene
  if (report.childId === 'SELF') {
    const owner = (s.parents || []).find(p => p.id === report.parentId) || (s.parents || [])[0]
    return owner?.idNo || ''
  }
  return (s.children || []).find(c => c.id === report.childId)?.idNo || ''
}

/* 家长手机号：报告所属家长账号登记的号码（脱敏存储），本人报告与子女报告同一口径；
   家长账号缺失时兜底取第一个家长，保证列表不出空列。 */
/* 报告归属家长：报告自带 parentId，缺失时回落到第一个家长账号，避免整列为空 */
export function parentOf(s, report) {
  if (!report) return null
  return (s.parents || []).find(p => p.id === report.parentId) || (s.parents || [])[0] || null
}

export function parentNameOf(s, report) {
  return parentOf(s, report)?.name || ''
}

export function parentMobileOf(s, report) {
  return parentOf(s, report)?.mobile || ''
}

/* 身份证检索：支持脱敏全串、前 4 位、后 4 位，以及只输入末 4 位；
   输入 18 位全号时按可见的前 4 位 + 末 4 位比对（本地只存脱敏值，正式环境接加密全号索引）。 */
export function idNoHit(idNo, keyword) {
  const k = String(keyword || '').trim().toUpperCase()
  const v = String(idNo || '').toUpperCase()
  if (!k || !v) return false
  if (v.includes(k)) return true
  if (!/^\d{6,}$/.test(k)) return false
  if (v.replace(/\*/g, '').includes(k)) return true
  return k.length >= 15 && v.startsWith(k.slice(0, 4)) && v.endsWith(k.slice(-4))
}

/* 一键同步全部报告：以子女身份证号（idNo）为主键，向外部基因检测系统批量拉取基因数据。
   已同步过的人只刷新同步时间与状态，不新建、不覆盖篇目；
   有身份证号、本地还没有基因报告、且主动查询结果为「已查到」的，按外部返回的六篇全量新建；
   其余（无证件号 / 外部暂无该证件号数据）计入跳过，不写任何数据。 */
export function geneSyncPlan(s = state) {
  const genes = s.geneReports || []
  const rows = (s.children || []).map(c => {
    const g = genes.find(x => x.childId === c.id)
    const action = g ? '已同步' : (c.idNo && c.query === '已查到' ? '待新建' : '暂无数据')
    return {
      childId: c.id, name: c.name, idNo: c.idNo || '', self: false,
      reportNo: g ? g.reportNo : '', books: g ? g.books : '',
      age: g ? g.age : ageAt(c.birthday, SNAPSHOT_AT), action
    }
  })
  /* 家长本人（SELF）也是一份基因报告，同样按身份证号同步 */
  const selfGene = genes.find(g => g.childId === 'SELF')
  if (selfGene) {
    const owner = (s.parents || []).find(p => p.id === CURRENT_PARENT_ID) || (s.parents || [])[0] || {}
    rows.push({
      childId: 'SELF', name: selfGene.name, idNo: owner.idNo || '', self: true,
      reportNo: selfGene.reportNo, books: selfGene.books,
      age: selfGene.age, action: '已同步'
    })
  }
  return rows
}

export function syncAllGeneReports() {
  const at = now()
  const day = at.slice(0, 10)
  const plan = geneSyncPlan()
  const genes = state.geneReports || []
  const children = state.children || []
  const base = genes.length
  const adds = plan.filter(p => p.action === '待新建').map((p, i) => {
    const c = children.find(x => x.id === p.childId) || {}
    const parent = state.parents.find(x => x.id === c.parentId) || {}
    const no = `${day.replace(/-/g, '')}${String(base + i + 1).padStart(4, '0')}`
    return {
      id: `GR-${no}`, childId: p.childId, reportNo: no,
      /* 检验人身份证号：同步主键，报告列表按此列展示与检索 */
      idNo: c.idNo || p.idNo || '',
      name: c.name, gender: c.gender, birthday: c.birthday,
      age: ageAt(c.birthday, day),
      parentName: parent.name || '—', parentRelation: c.relation || '—', phone: parent.phone || '',
      issuer: '《数智生命》总部', filedAt: day, syncedAt: at,
      source: '外部基因检测系统', version: 'v1.0', books: 'ABCDEF', status: '已同步'
    }
  })
  const updated = plan.filter(p => p.action === '已同步').length
  const created = adds.length
  const skipped = plan.filter(p => p.action === '暂无数据').length
  const nextGenes = genes
    .map(g => (plan.some(p => p.childId === g.childId && p.action === '已同步') ? { ...g, syncedAt: at, status: '已同步' } : g))
    .concat(adds)
  const log = {
    id: uid('SL'), at, system: '外部基因检测系统', target: '全部基因报告（按身份证号）',
    scope: `${plan.length} 人`, result: '成功',
    detail: `按身份证号批量同步：已同步 ${updated} 人 / 新建 ${created} 人 / 暂无数据 ${skipped} 人`
  }
  touch({ geneReports: nextGenes, syncLogs: [log, ...(state.syncLogs || [])].slice(0, 120) },
    '基因报告同步',
    `已按身份证号一键同步 ${updated + created} 人的基因报告（新建 ${created} 人），篇目与正文由外部系统给出，本系统不改写`,
    `已同步 ${updated + created} 人${created ? `（新增 ${created} 人）` : ''}${skipped ? `，${skipped} 人外部暂无数据` : ''}`)
  return {
    ok: true,
    msg: `已同步 ${updated + created} 人${created ? `（新增 ${created} 人）` : ''}${skipped ? `，${skipped} 人外部暂无数据` : ''}`
  }
}

/* ---------- 潜质要素文库：外部系统按「性别 + 具体年龄」同步 ----------
   一岁一库（男 0、男 1…女 0…），年龄不做区间合并；本系统只同步与查看，
   不新增、不编辑、不停用任何潜质要素与文案。 */
export const elementLibOf = (s = state, gender = '男', age = 0) =>
  (s.elementLibs || []).find(l => l.gender === gender && Number(l.age) === Number(age)) || null

export function setElementLibPick(gender, age) {
  const g = gender === '女' ? '女' : '男'
  const a = Math.max(0, Math.min(18, Number(age) || 0))
  set({ elementLibPick: { gender: g, age: a } })
}

/* 模拟从外部系统同步「性别 + 具体年龄」的文库：只新增库记录与日志，不改任何文案 */
export function syncElementLib() {
  const { gender, age } = state.elementLibPick || { gender: '男', age: 0 }
  const at = now()
  const exists = elementLibOf(state, gender, age)
  const rec = {
    id: `EL-${gender === '女' ? 'F' : 'M'}-${age}`, gender, age: Number(age),
    source: ELEMENT_LIB_SOURCE, syncedAt: at, version: 'v1.0',
    items: ELEMENT_ITEMS.length, filled: exists ? exists.filled : 0, status: '已同步'
  }
  const libs = exists
    ? (state.elementLibs || []).map(l => (l.gender === gender && Number(l.age) === Number(age) ? rec : l))
    : [rec, ...(state.elementLibs || [])]
  const log = {
    id: uid('SL'), at, system: ELEMENT_LIB_SOURCE,
    target: `潜质要素文库（${gender}${age} 岁）`,
    scope: `${ELEMENT_ITEMS.length} 项潜质要素`, result: '成功',
    detail: `按性别 + 具体年龄同步，${ELEMENT_ITEMS.length} 项 × 4 档数据熵 × 3 变体`
  }
  touch({ elementLibs: libs, syncLogs: [log, ...(state.syncLogs || [])].slice(0, 120) },
    '潜质要素同步',
    `已从外部系统同步「${gender} · ${age} 岁」潜质要素文库：${ELEMENT_ITEMS.length} 项，格式与文库数据库一致`,
    `${gender} ${age} 岁潜质要素文库已同步`)
  return { ok: true, msg: `${gender} · ${age} 岁文库已同步（${ELEMENT_ITEMS.length} 项）` }
}
