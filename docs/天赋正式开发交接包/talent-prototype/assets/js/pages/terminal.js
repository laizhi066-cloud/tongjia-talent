import { getPanelDisplayRecord, summaryHeader, terminalById, terminalSidebar } from './terminal-shared.js?v=talent-1.0.8'
import { renderAdminContent } from './terminal-admin.js?v=talent-1.0.8'
import { renderManagementContent } from './terminal-management.js?v=talent-1.0.8'
import { renderServiceContent } from './terminal-service.js?v=talent-1.0.8'
import { renderMiniappContent } from './terminal-miniapp.js?v=talent-1.0.8'
import { renderTalentAdminContent } from './terminal-talent-admin.js?v=talent-1.0.8'
import { renderTalentClosureContent } from './terminal-talent-closure.js?v=talent-1.0.8'

export { getPanelDisplayRecord }

export function renderTerminal(state, query = {}) {
  const terminal = terminalById(query.terminal)
  const section = terminal.menu.some(item => item.id === query.section) ? query.section : terminal.menu[0].id
  const current = terminal.menu.find(item => item.id === section) || terminal.menu[0]
  const defaultPanel = ['admin', 'management', 'talent-admin', 'talent-agent', 'talent-provider'].includes(terminal.id)
    ? current.links?.[0]?.href.match(/[?&]panel=([^&]+)/)?.[1]
    : ''
  const validPanels = new Set((current.links || []).map(link => link.panel || link.href.match(/[?&]panel=([^&]+)/)?.[1]).filter(Boolean))
  if (terminal.id === 'admin' && section === 'approval') {
    ;['approval-form-designer','approval-form-preview','approval-form-version','approval-flow-editor','approval-detail'].forEach(panel => validPanels.add(panel))
  }
  // 订单详情不是菜单；只能由订单列表携带真实订单编号进入。
  if (terminal.id === 'admin' && section === 'orders' && query.record) validPanels.add('detail')
  const requestedPanel = ['admin', 'management', 'talent-admin', 'talent-agent', 'talent-provider'].includes(terminal.id) && query.panel && !validPanels.has(query.panel)
    ? defaultPanel
    : query.panel
  const resolvedQuery = defaultPanel && !requestedPanel ? { ...query, panel:defaultPanel } : { ...query, panel:requestedPanel }
  let content
  if (['talent-admin', 'talent-agent', 'talent-provider'].includes(terminal.id)) content = renderTalentClosureContent(state, terminal.id, section, resolvedQuery)
  else if (terminal.id === 'admin') content = renderAdminContent(state, section, resolvedQuery)
  else if (terminal.id === 'management') content = renderManagementContent(state, section, resolvedQuery)
  else if (terminal.id === 'service') content = renderServiceContent(state, section, resolvedQuery)
  else content = renderMiniappContent(state, section, resolvedQuery)
  const page = terminal.id === 'miniapp' ? content : `${summaryHeader(terminal, section, current.label, current.summary)}${content}`
  return {
    title: `${terminal.name} · ${current.label}`,
    terminalId: terminal.id,
    shellClass: `terminal-shell terminal-shell-${terminal.id} terminal-${terminal.id}`,
    sidebar: terminalSidebar(terminal, section, resolvedQuery),
    content: `<div class="terminal-page terminal-${terminal.id} ${terminal.id === 'miniapp' ? 'terminal-page-miniapp' : ''}" data-terminal="${terminal.id}">${page}</div>`
  }
}
