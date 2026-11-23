import { terminalRegistry } from '../terminal-data.js?v=talent-1.0.8'
import { escapeHtml } from '../components.js?v=talent-1.0.8'

const productCard = terminal => `<a class="terminal-entry-card tone-${escapeHtml(terminal.tone)}" href="#/terminal?terminal=${escapeHtml(terminal.id)}" aria-label="进入${escapeHtml(terminal.name)}">
  <header><span class="terminal-entry-icon">${escapeHtml(terminal.icon)}</span><span class="scope-pill">一期功能</span></header>
  <h3>${escapeHtml(terminal.name)}</h3>
  <p class="terminal-audience">使用对象：${escapeHtml(terminal.audience)}</p>
  <dl><div><dt>核心工作</dt><dd>${escapeHtml(terminal.responsibility)}</dd></div><div><dt>与另一端衔接</dt><dd>${escapeHtml(terminal.handoff)}</dd></div></dl>
  <footer><span>${terminal.menu.length} 个业务入口</span><b>进入查看 →</b></footer>
</a>`

export function renderHome() {
  return `<div class="home-page responsibility-home talent-standalone-home">
    <section class="hero-panel responsibility-hero">
      <div class="hero-copy"><span class="eyebrow">天赋专项</span><h1>从会员登记到培养服务授权。</h1><p>平台管理端负责机构、会员、检测结果、报告发布和授权；代理商负责引流登记，服务商负责培养计划，客户在小程序查看已发布内容。</p><div class="history-direction-note"><b>查看方式</b><span>先选择管理后台或小程序，再按对应业务导航体验完整流程。</span></div></div>
      <div class="hero-guide responsibility-guide"><span>产品范围</span><ol><li><b>1</b><div><strong>第三方分析</strong><small>第三方系统通过接口回传结构化结果</small></div></li><li><b>2</b><div><strong>后台发布</strong><small>自动匹配后由运营人员预览和发布</small></div></li><li><b>3</b><div><strong>小程序查看</strong><small>家长在绑定范围内切换孩子查看报告</small></div></li></ol></div>
    </section>
    <section class="section-heading terminal-heading"><div><span class="eyebrow">产品入口</span><h2>选择查看端</h2><p>平台、代理商、服务商和客户使用不同数据范围完成同一条闭环。</p></div><span class="status-chip soft">天赋专项</span></section>
    <div class="terminal-entry-grid">${terminalRegistry.map(productCard).join('')}</div>
  </div>`
}
