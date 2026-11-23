/* 通用渲染组件：表格、卡片、标签、提示与弹层、事件委托 */

export const esc = value => String(value == null ? '' : value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

export const tag = (text, tone = 'teal') => `<span class="tag tag-${tone}">${esc(text)}</span>`

export function toast(message) {
  const el = document.getElementById('toast')
  if (!el) return
  el.textContent = message
  el.classList.add('show')
  clearTimeout(toast._timer)
  toast._timer = setTimeout(() => el.classList.remove('show'), 2400)
}

export function closeDialog() {
  const root = document.getElementById('dialog-root')
  if (root) root.innerHTML = ''
}

export function dialog({ title, sub = '', body = '', confirmText = '保存', onConfirm, cancelText = '取消', size = '' }) {
  const root = document.getElementById('dialog-root')
  root.innerHTML = `<div class="mask" data-action="dialog-mask">
    <div class="dialog ${size === 'ultra' ? 'ultra' : size === 'wide' ? 'wide' : ''}" data-stop="1">
      <div class="dialog-head"><div><span class="eyebrow">业务操作</span><h3>${esc(title)}</h3>
        ${sub ? `<div class="dsub">${esc(sub)}</div>` : ''}</div>
        <button class="icon-button" data-action="dialog-close" aria-label="关闭">×</button></div>
      <div class="dialog-body">${body}</div>
      <div class="dfoot">
        ${cancelText ? `<button class="btn" data-action="dialog-close">${esc(cancelText)}</button>` : ''}
        <button class="btn primary" data-action="dialog-confirm">${esc(confirmText)}</button>
      </div>
    </div></div>`
  dialog._confirm = onConfirm
}

export function table(heads, rows, opts = {}) {
  const cls = `tbl ${opts.compact ? 'compact' : ''}`
  return `<div class="tbl-wrap"><table class="${cls}">
    <thead><tr>${heads.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${rows.length ? rows.map(cells => `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${heads.length}" class="center" style="color:var(--muted);padding:22px">暂无记录</td></tr>`}</tbody>
  </table></div>`
}

export function stat(label, num, foot = '', tone = '') {
  return `<div class="stat ${tone}"><div class="label">${esc(label)}</div>
    <div class="num">${esc(num)}</div><div class="foot">${esc(foot)}</div></div>`
}

export function note(text, tone = '') {
  return `<div class="note-bar ${tone}"><b>说明</b><span>${text}</span></div>`
}

export function pageHead({ crumb, title, sub, tags = [] }) {
  return `<div class="crumb">${esc(crumb)}</div>
    <div class="page-head"><div><h1>${esc(title)}</h1>
      <div class="sub">${esc(sub)}</div></div>
    ${tags.length ? `<div class="head-tags">${tags.map(t => tag(t.text, t.tone)).join('')}</div>` : ''}</div>`
}

/* 筛选条：参考正式后台系统的查询区 */
export function filterBar({ keyword = '', placeholder = '请输入关键词', extra = '' }) {
  return `<div class="filter-bar">
    <label><span>关键词</span><input id="listKeyword" value="${esc(keyword)}" placeholder="${esc(placeholder)}"></label>
    ${extra}
    <div class="btn-row">
      <button class="btn primary sm" type="button" data-action="list-search">查询</button>
      <button class="btn sm" type="button" data-action="list-reset">重置</button>
    </div></div>`
}

/* 多字段检索：一个检索项一个输入框，各字段独立取值，不合并成一个关键词框 */
export function searchBar(fields = [], extra = '', tail = '') {
  return `<div class="filter-bar multi">${fields.map(f => `<label>
      <span>${esc(f.label)}</span>
      <input data-search-field="${esc(f.key)}" value="${esc(f.value || '')}" placeholder="${esc(f.placeholder || '请输入')}">
    </label>`).join('')}${extra}
    <div class="btn-row">
      <button class="btn primary sm" type="button" data-action="list-search">查询</button>
      <button class="btn sm" type="button" data-action="list-reset">重置</button>
    </div>${tail ? `<div class="filter-tail">${tail}</div>` : ''}</div>`
}

/* 下拉筛选：把状态页签收成检索条里的一个下拉，选完立即生效，不额外点查询 */
export function selectFilter({ label = '状态', id = 'listStatus', options = [], value = '', action = 'list-status', field = '' }) {
  return `<label class="filter-select"><span>${esc(label)}</span>
    <select id="${esc(id)}" data-change="${esc(action)}"${field ? ` data-search-field="${esc(field)}"` : ''}>
      ${options.map(([k, text]) => `<option value="${esc(k)}"${k === value ? ' selected' : ''}>${esc(text)}</option>`).join('')}
    </select></label>`
}

/* 页签条：用「名称 + 数量」切换同一张表的数据视图，避免堆叠多张卡片 */
export function tabBar(tabs, active, action = 'page-tab') {
  return `<div class="tab-bar">${tabs.map(([key, label, count]) =>
    `<button class="tab-item ${active === key ? 'on' : ''}" data-action="${esc(action)}" data-tab="${esc(key)}">${esc(label)}${
      count == null ? '' : `<span class="tab-num">${esc(count)}</span>`}</button>`).join('')}</div>`
}

/* 紧凑信息条：会员详情等弹层内展示账号字段，不占用卡片空间 */
export function kvStrip(items) {
  return `<div class="kv-strip">${items.map(([k, v]) =>
    `<div class="kv-cell"><span>${esc(k)}</span><b>${esc(v || '—')}</b></div>`).join('')}</div>`
}

/* 表单字段：两列栅格，必填项带星标 */
export function field(label, control, opts = {}) {
  return `<label class="form-field ${opts.span ? 'span-2' : ''}"><span>${esc(label)}${opts.required ? ' <em>必填</em>' : ''}</span>${control}</label>`
}

/* 事件委托：所有交互用 data-action 声明，避免重渲染后事件丢失 */
export function initDelegate(handlers) {
  document.addEventListener('click', event => {
    const el = event.target.closest('[data-action]')
    if (!el) return
    const action = el.dataset.action
    if (action === 'dialog-mask' && event.target !== el) return
    const fn = handlers[action]
    if (fn) { event.preventDefault(); fn(el.dataset, el, event) }
  })
  document.addEventListener('change', event => {
    const el = event.target.closest('[data-change]')
    if (!el) return
    const fn = handlers[el.dataset.change]
    if (fn) fn(el.dataset, el, event)
  })
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      /* 叠加层（如分册详情）只关最上面一层，避免一次把报告详情一起关掉 */
      const top = document.querySelector('.mask-sub')
      if (top) { top.remove(); return }
      closeDialog()
    }
  })
}
