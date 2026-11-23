import { escapeHtml, terminalHref } from './terminal-shared.js?v=talent-1.0.8'
import { ensureClosure, visibleMembers, visibleReports } from '../closure/domain.js?v=talent-1.0.8'

const inactiveStatuses = ['停用', '已停用', 'disabled', 'inactive']

const activeParent = parent => parent && !inactiveStatuses.includes(String(parent.status || '').toLowerCase())

const activeChild = child => child && !inactiveStatuses.includes(String(child.status || '').toLowerCase())

const activeRelation = relation => ['有效', 'active'].includes(String(relation?.status || '').toLowerCase())

const recordName = (record, fallback = '-') => record?.name || record?.parentName || record?.childName || fallback

const reportTitle = report => report?.name || report?.title || `${report?.customer || '天赋'}报告`

const formatDateTime = value => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).replace('T', ' ').replace(/\.\d{3}Z$/, '')
  const pad = number => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const reportDate = report => formatDateTime(report?.publishedAt || report?.generatedAt || report?.analyzedAt)

const getTalentContext = state => {
  ensureClosure(state)
  const talent = state?.terminalDemo?.talent || {}
  const parents = state?.resources?.['talent-parent'] || []
  const children = state?.resources?.['talent-child'] || []
  const relations = state?.resources?.['talent-member-relation'] || []
  const currentParentId = talent.currentParentId || talent.parentId || ''
  const parent = talent.loggedIn === false ? null : parents.find(item => item.id === currentParentId && activeParent(item)) || null
  const validRelations = parent ? relations.filter(item => activeRelation(item) && item.parentId === parent.id) : []
  const childIds = new Set(validRelations.map(item => item.childId))
  const actor = { role:'client', parentId:currentParentId }
  const accessibleMembers = visibleMembers(state, actor)
  const memberIds = new Set(accessibleMembers.map(item => item.id))
  const linkedChildren = children.filter(item => activeChild(item) && childIds.has(item.id) && memberIds.has(item.id))
  const selectedChildId = talent.selectedChildId && linkedChildren.some(item => item.id === talent.selectedChildId)
    ? talent.selectedChildId
    : linkedChildren[0]?.id || ''
  const child = linkedChildren.find(item => item.id === selectedChildId) || null
  const factorCatalog = state.resources?.['talent-factor'] || []
  const publishedReports = visibleReports(state, actor).filter(item => item.childId === child?.id).map(report => {
    const member = accessibleMembers.find(item => item.id === (report.memberId || report.childId))
    const publishedVolumeIds = new Set(report.publishedVolumeIds || report.volumes || [])
    const volumes = (report.volumes || []).map(volume => typeof volume === 'string' ? state.resources['talent-volume'].find(item => item.id === volume) : volume).filter(volume => volume && publishedVolumeIds.has(volume.id) && !['停用','已停用'].includes(volume.status) && (!member?.purchasedVolumeIds || member.purchasedVolumeIds.includes(volume.id)))
    const rawResults = report.interpretations?.length ? report.interpretations : report.results
    const results = (Array.isArray(rawResults) ? rawResults : []).map(result => ({
      ...result,
      category:result.category || factorCatalog.find(item => item.factor === result.factor || item.name === result.factor)?.category || '未分类'
    }))
    return { ...report, volumes, results }
  })
  const latestReport = [...publishedReports].sort((left, right) => String(reportDate(right)).localeCompare(String(reportDate(left))))[0] || null
  return { state, parent, linkedChildren, child, publishedReports, latestReport, loggedIn:talent.loggedIn !== false }
}

const renderChildSummary = child => child
  ? `<div class="miniapp-profile-row"><span>孩子姓名</span><b>${escapeHtml(recordName(child))}</b></div><div class="miniapp-profile-row"><span>性别</span><b>${escapeHtml(child.gender || '-')}</b></div><div class="miniapp-profile-row"><span>出生日期</span><b>${escapeHtml(child.birthDate || '-')}</b></div>`
  : '<div class="empty-state"><b>暂无可查看的孩子</b><p>暂未关联孩子，请联系服务人员处理。</p></div>'

const renderReportCard = report => `<article class="miniapp-report-list-item"><span class="eyebrow">${escapeHtml(report.reportType || '天赋报告')}</span><h3>${escapeHtml(reportTitle(report))}</h3><p>发布完成：${escapeHtml(reportDate(report))}</p><p>结构化报告 · 已发布</p>${report.pdfFileName ? `<p>PDF：${escapeHtml(report.pdfFileName)}</p>` : ''}<div class="miniapp-action-row"><span class="status-chip soft">只读查看</span><a class="btn secondary small" href="${terminalHref('miniapp', 'reports')}&reportId=${encodeURIComponent(report.id)}">查看报告 →</a></div></article>`

const renderReportVolumes = report => {
  const volumes = Array.isArray(report?.volumes) ? report.volumes : []
  if (!volumes.length) return ''
  return `<section class="miniapp-card"><div class="miniapp-card-heading"><h3>报告分册</h3><span class="status-chip soft">共 6 册，已开放 ${volumes.length} 册</span></div><div class="miniapp-volume-list">${volumes.map((volume, index) => `<button class="miniapp-volume-item" type="button" data-action="miniapp-volume-detail" data-report-id="${escapeHtml(report.id)}" data-volume-id="${escapeHtml(typeof volume === 'string' ? volume : volume.id || '')}"><span>分册 ${index + 1}</span><b>${escapeHtml(typeof volume === 'string' ? volume : volume.name || volume.title || `成长解读 ${index + 1}`)}</b><small>已发布 · 当前生效 · 查看分册</small></button>`).join('')}</div></section>`
}

const phoneShell = (title, eyebrow, body, active = '检测报告') => {
  const navItem = (label, target) => active === label
    ? `<span class="active" aria-current="page">${label}</span>`
    : `<a href="${terminalHref('miniapp', target)}">${label}</a>`
  return `<div class="miniapp-phone"><div class="miniapp-statusbar"><span>9:41</span><span>天赋专项</span><span>●●●</span></div><header class="miniapp-header"><div><small>${escapeHtml(eyebrow)}</small><h1>${escapeHtml(title)}</h1></div><div class="miniapp-header-actions"><button class="help-trigger help-global" type="button" data-help-key="global-flow:miniapp" aria-label="查看说明">?</button><a class="miniapp-avatar" href="${terminalHref('miniapp', 'profile')}">家</a></div></header>${body}<nav class="miniapp-bottom-nav">${navItem('首页', 'home')}${navItem('培养计划', 'plans')}${navItem('检测报告', 'reports')}${navItem('要素解读', 'interpretations')}</nav></div>`
}

const renderHome = context => {
  const { child, publishedReports, latestReport } = context
  const factorCount = Array.isArray(latestReport?.results) ? latestReport.results.length : 0
  const planCount = (latestReport?.recommendations || []).length
  const latestSummary = latestReport
    ? `<section class="miniapp-card miniapp-hero-card"><div><span class="eyebrow">最新检测报告</span><h2>${escapeHtml(reportTitle(latestReport))}</h2><p>已发布 · ${escapeHtml(reportDate(latestReport))}</p></div><span class="miniapp-lock">可查看</span><a class="btn secondary small" href="${terminalHref('miniapp', 'reports')}">查看报告 →</a></section>`
    : `<section class="miniapp-card miniapp-unavailable"><span class="miniapp-lock">等待发布</span><h2>报告还在准备中</h2><p>检测结果发布后，会在这里显示报告和要素解读。</p></section>`
  const quickLinks = `<section class="miniapp-card"><div class="miniapp-card-heading"><h3>快捷入口</h3><small>围绕当前孩子查看</small></div><div class="miniapp-quick-grid"><a class="miniapp-quick-card" href="${terminalHref('miniapp', 'plans')}"><b>培养计划</b><span>${planCount ? `已推荐 ${Math.min(planCount, 3)} 个` : '等待推荐'}</span></a><a class="miniapp-quick-card" href="${terminalHref('miniapp', 'reports')}"><b>检测报告</b><span>${publishedReports.length} 份已发布</span></a><a class="miniapp-quick-card" href="${terminalHref('miniapp', 'interpretations')}"><b>要素解读</b><span>${factorCount ? `${factorCount} 项可阅读` : '等待报告发布'}</span></a></div></section>`
  return `${phoneShell('首页', child ? `${recordName(child)} · 天赋成长总览` : '天赋成长总览', `<section class="miniapp-card"><div class="miniapp-card-heading"><h3>当前孩子</h3><span class="status-chip soft">仅本人可见</span></div>${renderChildSummary(child)}</section>${latestSummary}${quickLinks}<section class="miniapp-card"><div class="miniapp-card-heading"><h3>使用说明</h3><small>家长端只读</small></div><p>检测报告、要素解读和培养计划分别展示。报告由平台审核发布，培养计划可在这里选择并确认共享给服务机构。</p></section>`, '首页')}<div class="miniapp-readonly-note"><b>家长首页</b><p>先确认当前孩子，再从快捷入口进入报告、要素解读或培养计划。</p></div>`
}

const renderReports = (context, query = {}) => {
  const { child, publishedReports, latestReport } = context
  const selectedReport = publishedReports.find(item => String(item.id) === String(query.reportId)) || latestReport
  const reportsMarkup = publishedReports.length
    ? publishedReports.map(renderReportCard).join('')
    : '<div class="empty-state"><b>暂无已发布报告</b><p>报告发布后会自动展示在这里。</p></div>'
  const latestMarkup = selectedReport
    ? `<section class="miniapp-card miniapp-hero-card"><div><span class="eyebrow">${selectedReport.id === latestReport?.id ? '最新报告' : '当前报告'}</span><h2>${escapeHtml(reportTitle(selectedReport))}</h2><p>发布完成：${escapeHtml(reportDate(selectedReport))}</p><p class="miniapp-level-explanation">检测报告只展示第三方返回的报告内容和分册；要素结果请进入“要素解读”。</p></div><span class="miniapp-lock">已发布</span></section>`
    : `<section class="miniapp-card miniapp-unavailable"><span class="miniapp-lock">待发布</span><h2>暂无最新报告</h2><p>当前孩子还没有可查看的已发布报告。</p></section>`
  return `${phoneShell('检测报告', child ? `${recordName(child)} · 报告总览` : '报告总览', `<section class="miniapp-card"><div class="miniapp-card-heading"><h3>当前孩子</h3><span class="status-chip soft">仅本人可见</span></div>${renderChildSummary(child)}</section>${latestMarkup}${selectedReport ? renderReportVolumes(selectedReport) : ''}<section class="miniapp-card"><div class="miniapp-card-heading"><h3>已发布报告</h3><span class="status-chip soft">${publishedReports.length} 份</span></div>${reportsMarkup}</section><section class="miniapp-card"><div class="miniapp-card-heading"><h3>查看要素解读</h3><small>独立入口</small></div><p>检测报告与要素解读分开展示，按分类、分级和结果范围阅读。</p><a class="btn secondary small" href="${terminalHref('miniapp', 'interpretations')}&reportId=${encodeURIComponent(selectedReport?.id || '')}">进入要素解读 →</a><a class="btn secondary small" href="${terminalHref('miniapp', 'plans')}&reportId=${encodeURIComponent(selectedReport?.id || '')}">查看培养计划 →</a></section>`, '检测报告')}<div class="miniapp-readonly-note"><b>只读查看</b><p>仅展示已关联孩子且已经发布的报告；报告撤回后不可见。</p></div>`
}

const renderPlans = (context, query = {}) => {
  const { state, child, latestReport } = context
  const selectedReport = query.reportId ? context.publishedReports.find(item => String(item.id) === String(query.reportId)) : latestReport
  const report = query.reportId && !selectedReport ? null : selectedReport
  const plans = (report?.recommendations || []).map(item => typeof item === 'string' ? state.resources['talent-plan'].find(plan => plan.id === item) : item).filter(plan => plan && plan.status === '已上架').map(plan => ({ ...plan, organization:state.resources['talent-organization'].find(org => org.id === plan.orgId) })).filter(plan => plan.organization?.status === '启用' && plan.organization.providerStatus === '已通过').map(plan => ({ ...plan, providerName:plan.organization.name })).slice(0, 3)
  const member = (state.resources['talent-member'] || []).find(item => item.id === child?.id || item.childId === child?.id)
  const selection = (state.resources['talent-selection'] || []).find(item => item.memberId === member?.id && (!query.reportId || item.reportId === query.reportId))
  const authorization = (state.resources['talent-authorization'] || []).find(item => item.memberId === member?.id && item.status === '已授权')
  const authorizedPlanIds = authorization?.planIds || []
  // 客户端一次只确认一个培养计划；历史多选记录只回显第一项，避免重复授权。
  const selectedPlanId = selection?.planId || member?.selectedPlanIds?.[0] || authorizedPlanIds[0] || ''
  const selectedPlans = new Set(selectedPlanId ? [selectedPlanId] : [])
  const cards = plans.length ? plans.map((plan, index) => {
    const interpretation = (report?.results || []).find(item => item.factor === plan.factor)
    const selected = selectedPlans.has(plan.id)
    return `<article class="miniapp-plan-card"><div class="miniapp-card-heading"><h3>${escapeHtml(plan.title || plan.name)}</h3><span class="status-chip soft">推荐 ${index + 1}</span></div><p>服务商：${escapeHtml(plan.providerName || plan.orgName || '已授权服务商')}</p><p>适配说明：${escapeHtml(plan.matchReason || '按要素、分级、年龄、性别和培养方向命中')}</p><p>关联要素：${escapeHtml(plan.factor || '逻辑思维、专注力')}</p><p>要素注解：${escapeHtml(interpretation?.note || '暂无固定注解')}</p><p>培养内容详情：${escapeHtml(interpretation?.nurtureContent || plan.content || '服务商培养计划正文')}</p><p>培养目标：${escapeHtml(plan.goals || '-')}</p><p>重点能力：${escapeHtml((plan.focusAbilities || []).join('、') || '-')}</p><p>分阶段安排：${escapeHtml((plan.stages || []).map(stage => `${stage.name}：${stage.content}`).join('；') || '-')}</p><p>训练建议：${escapeHtml(plan.trainingAdvice || '-')}</p><p>评估方式：${escapeHtml(plan.evaluationPoints || '-')}</p><p>注意事项：${escapeHtml(plan.precautions || '-')}</p><div class="miniapp-plan-copy">${escapeHtml(plan.content || '服务商培养计划正文')}</div><label class="miniapp-check"><input type="radio" name="selected-plan" data-plan-select value="${escapeHtml(plan.id)}"${selected ? ' checked' : ''}> 选择这个培养计划</label><span class="miniapp-selection-status">选择状态：${selection?.status || (selected ? '已授权' : '未选择')}</span></article>`
  }).join('') : '<div class="empty-state"><b>暂无推荐培养计划</b><p>报告发布并完成服务商计划审核后，这里最多展示 3 个推荐计划。</p></div>'
  const selectedPlanNames = [...selectedPlans].map(id => state.resources['talent-plan']?.find(plan => plan.id === id)?.title || id)
  const resultSection = (authorization || selection)
    ? `<section class="miniapp-card miniapp-authorized-card"><div class="miniapp-card-heading"><h3>当前选择状态</h3><span class="status-chip ${selection?.status === '已推送' || authorization ? 'success' : 'soft'}">${escapeHtml(selection?.status || '已授权')}</span></div><p>已选择计划：${escapeHtml(selectedPlanNames.join('、') || '-')}</p><p>审核状态：${escapeHtml(selection?.reviewReason || selection?.status || '已授权')}</p><p>服务机构会在平台审核通过后收到推送。你可以重新选择并提交审核。</p><button class="btn ghost small" type="button" data-closure-action="selection-cancel" data-member-id="${escapeHtml(member?.id || '')}">取消当前选择</button></section>`
    : ''
  return `${phoneShell('培养计划', child ? `${recordName(child)} · 推荐计划` : '推荐计划', `<section class="miniapp-card"><div class="miniapp-card-heading"><h3>最多 3 个推荐计划</h3><span class="status-chip soft">${plans.length} 个</span></div><p>你只能选择一个计划。计划卡片展示要素注解、培养内容详情和当前选择状态。</p></section><div class="miniapp-plan-list">${cards}</div>${resultSection}${plans.length ? `<section class="miniapp-card miniapp-share-card"><h3>共享确认</h3><label class="miniapp-check"><input type="checkbox" data-share-profile checked> 同意共享基础资料</label><label class="miniapp-check"><input type="checkbox" data-share-reports checked> 同意共享已发布报告</label><button class="btn primary" type="button" data-closure-action="selection-apply" data-member-id="${escapeHtml(child?.id || '')}" data-report-id="${escapeHtml(report?.id || '')}">提交选择审核</button></section>` : ''}`, '培养计划')}`
}

const renderInterpretations = (context, query = {}) => {
  const selectedReport = query.reportId ? context.publishedReports.find(item => String(item.id) === String(query.reportId)) : context.latestReport
  const factors = Array.isArray(selectedReport?.results) ? selectedReport.results : []
  const categories = [...new Set(factors.map(item => item.category || '未分类').filter(Boolean))]
  const levels = [...new Set(factors.map(item => item.level).filter(Boolean))]
  const keyword = String(query.keyword || '').trim().toLowerCase()
  const selectedCategory = query.category || ''
  const selectedLevel = query.level || ''
  const filtered = factors.filter(factor => (!selectedCategory || (factor.category || '未分类') === selectedCategory) && (!selectedLevel || factor.level === selectedLevel) && (!keyword || `${factor.factor || ''} ${factor.note || ''} ${factor.nurtureContent || ''}`.toLowerCase().includes(keyword)))
  const pageSize = 20
  const visibleCount = Math.min(filtered.length, Math.max(pageSize, Number(query.limit || pageSize)))
  const visibleFactors = filtered.slice(0, visibleCount)
  const cards = visibleFactors.length ? visibleFactors.map((factor, index) => `<article class="miniapp-interpretation"><div class="miniapp-card-heading"><span class="eyebrow">${index + 1} / ${filtered.length}</span><h3>${escapeHtml(factor.factor || '-')}</h3><span class="status-chip soft">${escapeHtml(factor.level || '-')}</span></div><p class="interpretation-score">${escapeHtml(factor.resultValue ?? '-')} 分 · ${escapeHtml(factor.resultRange || '-')}</p><p>${escapeHtml(factor.note || '暂无固定注解')}</p><p><b>年龄引导：</b>${escapeHtml(factor.ageGuide || '按当前年龄段培养')}</p><p><b>性别引导：</b>${escapeHtml(factor.genderGuide || '通用')}</p><small>培养内容摘要：${escapeHtml(factor.nurtureContent || '-')}</small></article>`).join('') : '<div class="empty-state"><b>暂无匹配要素</b><p>请调整分类、分级或搜索词，或等待后台发布要素解读。</p></div>'
  const option = (value, label = value, selected = false) => `<option value="${escapeHtml(value)}"${selected ? ' selected' : ''}>${escapeHtml(label)}</option>`
  const filterForm = `<form class="miniapp-filter-form" data-mini-filter><label><span>分类</span><select name="category">${option('', '全部分类', !selectedCategory)}${categories.map(value => option(value, value, value === selectedCategory)).join('')}</select></label><label><span>分级</span><select name="level">${option('', '全部分级', !selectedLevel)}${levels.map(value => option(value, value, value === selectedLevel)).join('')}</select></label><label><span>搜索要素</span><input name="keyword" value="${escapeHtml(query.keyword || '')}" placeholder="输入要素名称或解读关键词"></label><button class="btn secondary small" type="submit">筛选</button><a class="btn-link" href="#/terminal?terminal=miniapp&section=interpretations&panel=miniapp-interpretations">清空筛选</a></form>`
  const loadMore = visibleCount < filtered.length ? `<a class="btn secondary miniapp-load-more" href="${terminalHref('miniapp', 'interpretations')}&category=${encodeURIComponent(selectedCategory)}&level=${encodeURIComponent(selectedLevel)}&keyword=${encodeURIComponent(query.keyword || '')}&limit=${visibleCount + pageSize}">加载更多（剩余 ${filtered.length - visibleCount} 项）</a>` : ''
  return `${phoneShell('要素解读', '按分类、分级和结果范围阅读', `<section class="miniapp-card"><div class="miniapp-card-heading"><h3>要素目录</h3><span class="status-chip soft">已展示 ${visibleCount} / ${filtered.length} 项</span></div>${filterForm}</section><div class="miniapp-interpretation-list">${cards}</div>${loadMore}`, '要素解读')}`
}

const renderProfile = context => {
  const { parent, linkedChildren, child, loggedIn } = context
  const childrenMarkup = linkedChildren.length
    ? linkedChildren.map(item => `<button class="miniapp-child-switch ${item.id === child?.id ? 'active' : ''}" type="button" data-terminal-action="talent-switch-child" data-child-id="${escapeHtml(item.id)}" aria-pressed="${item.id === child?.id}"><span>${escapeHtml(recordName(item))}</span><small>${escapeHtml(item.gender || '-')} · ${escapeHtml(item.birthDate || '-')}</small></button>`).join('')
    : '<div class="empty-state"><b>暂无已关联孩子</b><p>请联系天赋后台维护家长与孩子关系。</p></div>'
  return `${phoneShell('我的', '家长账号与孩子', `<section class="miniapp-card"><div class="miniapp-card-heading"><h3>当前家长</h3><span class="miniapp-lock">${loggedIn ? '已登录' : '未登录'}</span></div><div class="miniapp-profile-row"><span>家长姓名</span><b>${escapeHtml(recordName(parent, '当前家长'))}</b></div><div class="miniapp-profile-row"><span>手机号</span><b>${escapeHtml(parent?.mobile || '-')}</b></div><div class="miniapp-profile-row"><span>登录状态</span><b>${loggedIn ? '已登录' : '未登录'}</b></div></section><section class="miniapp-card"><div class="miniapp-card-heading"><h3>可查看孩子</h3><span class="status-chip soft">${linkedChildren.length} 人</span></div><div class="miniapp-child-switcher">${childrenMarkup}</div></section><section class="miniapp-card"><div class="miniapp-card-heading"><h3>账号操作</h3><span class="status-chip soft">只读查看</span></div><p>家长只能查看已发布的检测报告、要素解读和培养计划，不能修改检测结果。</p>${loggedIn ? '<button class="btn ghost small" type="button" data-terminal-action="talent-logout">退出登录</button>' : ''}</section>`, '我的')}<div class="miniapp-readonly-note"><b>家长账号</b><p>家长可查看已关联的多个孩子；切换孩子后首页内容会同步切换。</p></div>`
}

export function renderMiniappContent(state, section = 'home', query = {}) {
  const context = getTalentContext(state)
  if (!context.loggedIn) return phoneShell('微信登录', '登录后查看已发布内容', '<section class="miniapp-card"><p>请登录家长账号后查看培养计划、检测报告和要素解读。</p><button class="btn primary" data-terminal-action="talent-login">微信登录</button></section>')
  if (section === 'profile') return renderProfile(context)
  if (section === 'reports') return renderReports(context, query)
  if (section === 'plans') return renderPlans(context, query)
  if (section === 'interpretations') return renderInterpretations(context, query)
  return renderHome(context)
}
