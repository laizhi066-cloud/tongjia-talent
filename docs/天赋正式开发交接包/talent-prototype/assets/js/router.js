import { terminalById } from './terminal-data.js?v=talent-1.0.8'

export function getRouteState() {
  const raw = location.hash.replace(/^#\/?/, '') || 'home'
  const [namePart, queryString = ''] = raw.split('?')
  const requestedName = namePart || 'home'
  const name = requestedName === 'terminal' || requestedName === 'home' ? requestedName : 'home'
  return {
    name,
    query:name === 'terminal' ? Object.fromEntries(new URLSearchParams(queryString).entries()) : {}
  }
}
export function getRoute() { return getRouteState().name }

export function canonicalTerminalQuery(query = {}) {
  const terminal = terminalById(query.terminal)
  if (query.terminal && terminal.id !== query.terminal) return null
  if (!query.section || terminal.menu.some(item => item.id === query.section)) return null
  return { terminal:terminal.id, section:terminal.menu[0]?.id || 'overview' }
}

export function shouldResetScroll(previous, next) {
  if (!previous || !next || previous.name !== next.name) return true
  return previous.query.terminal !== next.query.terminal
    || previous.query.section !== next.query.section
    || previous.query.panel !== next.query.panel
    || previous.query.record !== next.query.record
}
export function navigate(route, query = null) {
  const suffix = query ? '?' + new URLSearchParams(Object.entries(query).filter(([,value]) => value !== '' && value != null)).toString() : ''
  location.hash = '#/' + route + suffix
}
export function startRouter(render) {
  let previous = null
  const renderRoute = () => {
    const requested = location.hash.replace(/^#\/?/, '').split('?')[0]
    if (!['home', 'terminal'].includes(requested)) {
      location.hash = '#/home'
      return
    }
    const next = getRouteState()
    const canonicalQuery = next.name === 'terminal' ? canonicalTerminalQuery(next.query) : null
    if (canonicalQuery) {
      navigate('terminal', canonicalQuery)
      return
    }
    render(next)
    if (shouldResetScroll(previous, next)) requestAnimationFrame(() => scrollTo({ top:0, left:0, behavior:'auto' }))
    previous = next
  }
  addEventListener('hashchange', renderRoute)
  if (!location.hash) location.hash = '#/home'
  else renderRoute()
}
