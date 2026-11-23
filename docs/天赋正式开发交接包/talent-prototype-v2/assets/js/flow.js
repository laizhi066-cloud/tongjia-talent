/* 业务流程页：五阶段十二环节，逐环标注执行方、输入、输出、系统动作与关键校验。 */

import { FLOW } from './quote-data.js?v=1.61.0'
import { esc, note, pageHead } from './ui.js?v=1.61.0'

/* 流程数据由报价单导出，展示时统一为系统内正式措辞 */
const formal = v => String(v == null ? '' : v)
  .replace(/后台代建/g, '后台录入')
  .replace(/客户提供的/g, '导入的')
  .replace(/客户确认的/g, '已确认的')
  .replace(/手输/g, '自定义')
  .replace(/报价单/g, '本期交付范围')
  .replace(/全局四档/g, '默认四档（可自定义）')
  .replace(/全局 4 个档位/g, '默认 4 个档位（可自定义）')
  .replace(/培养方向管理｜档位/g, '培养方向管理')
  .replace(/资料导入、分类与要素、分级与固定注解/g, '潜质要素、分级与固定注解（页内导入）')
  .replace(/资料导入/g, '页内导入')
  /* 方向推荐已改为「按命中要素条数排序」，报价清单里的权重口径在此统一改写 */
  .replace(/权重合计必须为 100，否则不可启用/g, '按命中要素条数排序推荐，命中越多越靠前')
  .replace(/权重合计为 100/g, '要素配置完整')
  .replace(/要素、要求分级、权重配置/g, '要素、要求分级与目标档位')
  .replace(/要素、要求分级与权重/g, '要素、要求分级与目标档位')
  .replace(/权重/g, '命中条数')

const GO_TARGET = {
  1: { side: 'admin', module: 'factors', label: '前往规则配置' },
  2: { side: 'admin', module: 'directions', label: '前往方向配置' },
  3: { side: 'admin', module: 'directions', dialog: 'tier', label: '前往目标档位' },
  4: { side: 'mini', page: 'login', label: '前往注册' },
  5: { side: 'mini', page: 'kids', label: '前往添加孩子' },
  6: { side: 'admin', module: 'members', label: '前往会员管理' },
  7: { side: 'admin', module: 'reports', label: '前往基因报告' },
  8: { side: 'admin', module: 'reports', label: '前往发布报告' },
  9: { side: 'mini', page: 'reportDetail', label: '前往报告阅读' },
  10: { side: 'mini', page: 'directions', label: '前往选择方向' },
  11: { side: 'admin', module: 'reports', label: '前往数据回流' },
  12: { side: 'admin', module: 'workbench', label: '前往工作台' }
}

export function renderFlow(state) {
  const phases = [...new Set(FLOW.map(f => formal(f.phase)))]
  const body = phases.map((phase, pi) => {
    const steps = FLOW.filter(f => formal(f.phase) === phase)
    return `<div class="flow-phase">
      <div class="flow-phase-title"><span class="idx">${pi + 1}</span>${esc(phase)}<span style="font-size:11px;color:var(--muted);font-weight:400">${steps.length} 个环节</span></div>
      ${steps.map(s => {
        const go = GO_TARGET[s.no] || {}
        return `<div class="flow-step">
          <div class="no">${s.no}</div>
          <div><h4>${esc(formal(s.step))}</h4><div class="actor">执行方：${esc(formal(s.actor))}</div></div>
          <div class="kv"><b>输入</b> ${esc(formal(s.input))}<br><b>输出</b> ${esc(formal(s.output))}</div>
          <div class="kv"><b>后台</b> ${esc(formal(s.admin))}<br><b>小程序</b> ${esc(formal(s.mini))}</div>
          <div class="go"><button class="btn sm" data-action="flow-go" data-side="${esc(go.side)}"
            data-module="${esc(go.module || '')}" data-page="${esc(go.page || '')}" data-dialog="${esc(go.dialog || '')}">${esc(go.label || '查看')} ›</button></div>
          <div class="check-line">关键校验：${esc(formal(s.check))}</div>
        </div>`
      }).join('')}
    </div>`
  }).join('')

  return pageHead({
    crumb: '当前位置：业务流程 / 五阶段十二环节',
    title: '业务流程',
    sub: '本期业务链路共 5 个阶段 12 个环节，点击右侧按钮可前往对应的功能页面。',
    tags: [{ text: '5 个阶段', tone: 'teal' }, { text: '12 个环节', tone: 'blue' }]
  })
    + note('家长选择培养方向后的联系与承接由运营在线下完成，不在本系统内流转。', 'warn')
    + `<div class="card"><div class="card-head"><h3>数据关系</h3></div>
      <div class="grid grid-2" style="font-size:12.5px;line-height:1.9;color:var(--muted)">
        <div><b style="color:var(--ink)">规则层</b>　潜质要素（外部系统按性别 + 具体年龄同步）→ 分级设置 → 按「潜质要素 + 分级」配置固定注解<br>
             <b style="color:var(--ink)">配置层</b>　培养方向 → 自由选择要素 + 要求分级 → 默认四档（可自定义）与目标档位子集</div>
        <div><b style="color:var(--ink)">快照层</b>　报告 → 命中注解快照 + 方向命中结果 + 六册开放范围（发布即冻结，配置变更不回写历史报告）<br>
             <b style="color:var(--ink)">结果层</b>　方向按命中条数从多到少排序，家长端分「推荐方向（最多 5 个）/ 已选方向（≤3，每方向 1 个档位）」两个页签</div>
      </div></div>`
    + body
}
