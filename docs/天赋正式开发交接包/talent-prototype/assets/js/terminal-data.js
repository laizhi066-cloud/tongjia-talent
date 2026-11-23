export const scopeLabels = {
  existing: '系统能力',
  phase2: '一期功能',
  prototype: '业务页面'
}

const link = (label, href, panel = '') => ({ label, href, panel })
const resourceLink = (terminal, section, label, panel) => link(label, `#/terminal?terminal=${terminal}&section=${section}&panel=${panel}`, panel)
const menu = (id, label, summary, links = [], extra = {}) => ({ id, label, scope:'phase2', summary, links, ...extra })

export const terminalRegistry = [
  {
    id: 'talent-admin',
    name: '平台管理端',
    shortName: '管理后台',
    icon: '赋',
    tone: 'talent-admin',
    audience: '天赋运营、会员和内容规则维护人员',
    responsibility: '维护机构资格、会员、天赋规则、计划审核、客户选择审核、第三方结果和报告发布。',
    boundary: '独立于大健康业务系统，不进入客户档案、体检、采购和医学报告流程。',
    handoff: '接收第三方分析系统结果，发布检测报告、要素解读和培养计划。',
    menu: [
      menu('workbench', '工作台', '集中查看待处理会员、异常结果、待审核计划、报告发布和最近处理记录。', [resourceLink('talent-admin', 'workbench', '工作台', 'talent-workbench')]),
      menu('settings', '系统设置', '维护用户、角色、机构及其业务权限关系。', [resourceLink('talent-admin', 'settings', '用户列表', 'talent-organization-users'), resourceLink('talent-admin', 'settings', '角色列表', 'talent-roles'), resourceLink('talent-admin', 'settings', '机构列表', 'talent-organizations')]),
      menu('partners', '代理商管理', '按机构类型查看代理商资格、引流归属和已发布内容范围；机构资料和账号统一在系统设置维护。', [resourceLink('talent-admin', 'partners', '代理商列表', 'talent-agents')]),
      menu('providers', '服务商管理', '按机构类型查看服务商资格、计划和授权概况；机构资料和账号统一在系统设置维护。', [resourceLink('talent-admin', 'providers', '服务商列表', 'talent-providers')]),
      menu('members', '会员管理', '统一维护会员资料、家长关系、培养意向和授权列表；报告付费确认在报告发布前处理。', [
        resourceLink('talent-admin', 'members', '会员管理', 'talent-members'),
        resourceLink('talent-admin', 'members', '授权列表', 'talent-authorizations')
      ]),
      menu('rules', '天赋规则', '按正式项目的主从工作区维护要素目录、分级注解、内容候选池和匹配条件。', [
        resourceLink('talent-admin', 'rules', '内容库与培养内容', 'talent-content-library'),
        resourceLink('talent-admin', 'rules', '分类与要素', 'talent-factor'),
        resourceLink('talent-admin', 'rules', '分级与固定注解', 'talent-level'),
        resourceLink('talent-admin', 'rules', '匹配规则', 'talent-matching-rule'),
        resourceLink('talent-admin', 'rules', '培养计划', 'talent-plans')
      ]),
      menu('plan-review', '计划审核', '审核服务商提交的培养计划，确认通过后才能上架推荐。', [resourceLink('talent-admin', 'plan-review', '计划审核', 'talent-plan-review')]),
      menu('selection-review', '客户选择审核', '审核客户选择的培养计划和共享范围，确认后推送给对应服务商。', [resourceLink('talent-admin', 'selection-review', '客户选择审核', 'talent-selection-review')]),
      menu('reports', '报告列表', '集中查看接收列表、报告生成状态、发布前付费提示、分册开放和整份报告撤回。', [resourceLink('talent-admin', 'reports', '报告列表', 'talent-report')]),
      menu('flow', '完整业务流程', '按真实操作顺序查看正常路径和异常分支。', [resourceLink('talent-admin', 'flow', '天赋专项完整业务流程图', 'talent-flow')])
    ]
  },
  {
    id: 'talent-agent',
    name: '代理商业务端',
    shortName: '代理商',
    icon: '代',
    tone: 'talent-agent',
    audience: '已开通代理商资格的机构账号',
    responsibility: '登记本人或孩子、维护培养意向并查看自己引流客户的已发布内容。',
    boundary: '仅能访问本机构引流客户基础资料和已发布报告，不能修改检测结果或报告。',
    handoff: '提交会员资料和外部受检人标识，平台发布后回显报告和 PDF。',
    menu: [
      menu('dashboard', '工作台', '处理登记草稿、待补资料、提交状态和已发布报告。', [resourceLink('talent-agent', 'dashboard', '代理商工作台', 'agent-dashboard')]),
      menu('members', '会员管理', '查看本机构会员列表；可通过“新增会员登记”录入本人或孩子，绑定一位有效家长并填写多个培养意向。', [resourceLink('talent-agent', 'members', '会员管理', 'agent-members')]),
      menu('reports', '报告列表', '仅查询自己引流客户的报告；报告发布、撤回和第三方结果接收由平台或授权服务商处理。', [resourceLink('talent-agent', 'reports', '报告列表', 'agent-reports')])
    ]
  },
  {
    id: 'talent-provider',
    name: '服务商业务端',
    shortName: '服务商',
    icon: '服',
    tone: 'talent-provider',
    audience: '获得平台资格并完成授权的服务商账号',
    responsibility: '维护培养计划，提交平台审核并查看平台推送客户。',
    boundary: '只能查看平台分配客户，不能修改客户检测结果、报告或平台规则，也不能绕过审核发布。',
    handoff: '计划审核通过并上架后进入客户推荐；客户确认共享后建立服务商授权。',
    menu: [
      menu('dashboard', '工作台', '查看计划草稿、审核退回、已上架计划和平台分配客户。', [resourceLink('talent-provider', 'dashboard', '服务商工作台', 'provider-dashboard')]),
      menu('plans', '培养计划', '维护计划方向、要素、分级和培养内容，保存草稿后提交平台审核。', [resourceLink('talent-provider', 'plans', '培养计划', 'provider-plans')]),
      menu('clients', '已推送客户', '查看平台审核客户选择后推送到本机构的客户资料、报告、要素解读和培养内容。', [resourceLink('talent-provider', 'clients', '已推送客户', 'provider-clients')])
    ]
  },
  {
    id: 'miniapp',
    name: '天赋查询小程序',
    shortName: '用户端',
    icon: '小',
    tone: 'miniapp',
    audience: '后台已建档关系下的家长账号',
    responsibility: '切换多个孩子，查看已发布天赋报告、分级结果和培养内容。',
    boundary: '仅作报告展示，不采集资料、不编辑结果、不操作后台规则。',
    handoff: '只接收天赋后台已发布的结构化报告，撤回后不可见。',
    menu: [
      menu('home', '首页', '汇总当前孩子的报告、培养计划和要素解读入口。', [], { readonly:true }),
      menu('plans', '培养计划', '查看最多三个推荐培养计划，选择并确认共享后建立服务商授权。', [], { readonly:true }),
      menu('reports', '检测报告', '查看已发布报告、分册、结构化内容和可选 PDF。', [], { readonly:true }),
      menu('interpretations', '要素解读', '按分类、分级和结果范围查看要素详情与培养内容摘要。', [], { readonly:true }),
      menu('profile', '我的', '切换已关联孩子、查看登录状态和退出登录。', [], { readonly:true })
    ]
  }
]

export const terminalById = id => terminalRegistry.find(item => item.id === id) || terminalRegistry[0]
