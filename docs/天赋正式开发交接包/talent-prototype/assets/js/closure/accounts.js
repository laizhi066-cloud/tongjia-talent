// Prototype account/role model. Real credentials and login remain backend responsibilities.
export const ROLE_MENUS = {
  platform: { workbench:'工作台', settings:'系统设置', partners:'代理商管理', providers:'服务商管理', members:'会员管理', rules:'天赋规则', reports:'报告列表', flow:'完整业务流程' },
  agent: { dashboard:'工作台', members:'会员管理', reports:'报告列表' },
  provider: { dashboard:'工作台', plans:'培养计划', clients:'已推送客户' }
}
export const TYPE_LABELS = { platform:'平台', agent:'代理商', provider:'服务商' }
export const SCOPE_LABELS = { platform:'平台业务范围', agent:'本机构引流客户', provider:'平台分配客户' }
export const DATA_SCOPE_LABELS = { '1':'全部数据', '2':'自定义机构数据', '3':'本机构数据', '4':'本机构及下属机构数据', '5':'仅本人数据' }
export function ensureAccounts(state) {
  const r = state.resources
  r['talent-role'] ||= Object.keys(ROLE_MENUS).map(type => ({ id:`ROLE-${type}`, name:`${TYPE_LABELS[type]}业务角色`, code:`talent_${type}`, type, menuIds:Object.keys(ROLE_MENUS[type]), dataScope:type === 'platform' ? '1' : type === 'agent' ? '3' : '5', dataOrgIds:[], status:'启用', builtin:true }))
  for (const role of r['talent-role']) {
    role.dataScope ||= role.type === 'platform' ? '1' : role.type === 'agent' ? '3' : '5'
    role.dataOrgIds ||= []
    role.menuIds ||= Object.keys(ROLE_MENUS[role.type] || {})
  }
  for (const user of r['talent-user'] || []) {
    user.roleIds ||= [`ROLE-${user.role}`]
  }
}
export function roleForUser(state, userId) {
  const user = (state.resources?.['talent-user'] || []).find(row => row.id === userId)
  return (state.resources?.['talent-role'] || []).find(role => role.id === user?.roleIds?.[0] && role.status === '启用')
}
export function rolesForUser(state, userId) {
  const user = (state.resources?.['talent-user'] || []).find(row => row.id === userId)
  const roleIds = user?.roleIds?.length ? user.roleIds : (user?.role ? [`ROLE-${user.role}`] : [])
  return (state.resources?.['talent-role'] || []).filter(role => roleIds.includes(role.id) && role.status === '启用')
}
export function dataScopeForActor(state, actor = {}) {
  const roles = rolesForUser(state, actor.userId)
  const scopes = [...new Set(roles.map(role => role.dataScope).filter(Boolean))]
  const fallbackScope = actor.role === 'platform' ? '1' : '3'
  const dataScopes = actor.dataScopes?.length ? actor.dataScopes : (actor.dataScope ? [actor.dataScope] : (scopes.length ? scopes : [fallbackScope]))
  const dataScope = dataScopes.includes('1') ? '1' : dataScopes.includes('2') ? '2' : dataScopes.includes('4') ? '4' : dataScopes.includes('3') ? '3' : '5'
  const dataOrgIds = actor.dataOrgIds?.length ? actor.dataOrgIds : [...new Set(roles.flatMap(role => role.dataOrgIds || []))]
  return { dataScope, dataScopes, dataOrgIds, dataScopeLabel:DATA_SCOPE_LABELS[dataScope] }
}
export function accountAccess(state, id) {
  const r = state.resources, user = r['talent-user'].find(row => row.id === id)
  if (!user || user.status !== '启用') return { allowed:false, reason:'账号已停用或不存在', menus:[] }
  const org = r['talent-organization'].find(row => row.id === user.organizationId)
  if (!org || org.status !== '启用') return { allowed:false, reason:'所属机构已停用或不存在', menus:[] }
  const type = org.type === '服务商' ? 'provider' : org.type === '代理商' ? 'agent' : 'platform'
  if (type === 'provider' && org.providerStatus !== '已通过' || type === 'agent' && !['已开通','已通过'].includes(org.agentStatus)) return { allowed:false, reason:'所属机构业务资格未通过', menus:[] }
  const roles = r['talent-role'].filter(role => user.roleIds.includes(role.id) && role.status === '启用' && role.type === type)
  const menus = [...new Set(roles.flatMap(role => role.menuIds))].filter(key => ROLE_MENUS[type][key])
  return { allowed:menus.length > 0, reason:menus.length ? '可访问' : '没有生效的角色或菜单权限', menus, role:type, orgId:org.id, userId:user.id, scope:SCOPE_LABELS[type], roleNames:roles.map(role => role.name) }
}
export function actorForTerminal(state, terminal) {
  const role = terminal === 'talent-agent' ? 'agent' : terminal === 'talent-provider' ? 'provider' : 'platform'
  if (role === 'platform') return { role }
  const id = state.terminalDemo?.accountIds?.[terminal] || (role === 'agent' ? 'TAL-USER-001' : 'TAL-USER-003')
  const access = accountAccess(state, id)
  return { ...access, ...dataScopeForActor(state, { ...access, role, userId:id }), role, userId:id, orgId:access.orgId || '', denied:!access.allowed }
}
export function executeAccountAction(state, action, payload, actor) {
  if (!/^(user-|role-)/.test(action)) return null
  const fail = reason => ({ ok:false, reason })
  if (!['platform','admin'].includes(actor.role)) return fail('仅平台可以管理系统用户和角色')
  const r = state.resources, users = r['talent-user'], roles = r['talent-role']
  const now = () => new Date().toISOString()
  const uid = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`
  if (action === 'user-save') {
    const existing = payload.id ? users.find(user => user.id === payload.id) : null
    if (payload.id && !existing) return fail('用户不存在')
    const username = String(payload.username || '').trim(), name = String(payload.name || '').trim()
    const org = r['talent-organization'].find(row => row.id === payload.organizationId)
    const selected = [...new Set(Array.isArray(payload.roleIds) ? payload.roleIds : [payload.roleIds || (payload.role ? `ROLE-${payload.role}` : '')].filter(Boolean))]
    if (!/^[a-zA-Z0-9_.@-]{3,40}$/.test(username) || !name || !org || !selected.length) return fail('请填写有效账号、姓名、机构并至少选择一个角色')
    if (users.some(user => user.id !== payload.id && user.username.toLowerCase() === username.toLowerCase())) return fail('登录账号已存在')
    if (payload.mobile && !/^1\d{10}$/.test(payload.mobile)) return fail('请输入 11 位手机号')
    const type = org.type === '代理商' ? 'agent' : org.type === '服务商' ? 'provider' : 'platform'
    if (selected.some(id => !roles.some(role => role.id === id && role.type === type && (role.status === '启用' || existing?.roleIds.includes(id))))) return fail('角色必须适用于所属机构类型；新分配角色必须启用')
    if (!existing && (!payload.password || payload.password.length < 8)) return fail('请设置至少 8 位初始密码')
    const record = { ...existing, id:existing?.id || uid('USER'), username, name, organizationId:org.id, roleIds:selected, role:type, mobile:payload.mobile || '', status:payload.status === '已停用' ? '已停用' : '启用', updatedAt:now(), passwordSet:true }
    if (existing) Object.assign(existing, record); else users.push(record)
    return { ok:true, record, message:'用户已保存' }
  }
  if (action === 'user-toggle' || action === 'user-reset-password') {
    const user = users.find(row => row.id === payload.id); if (!user) return fail('用户不存在')
    if (action === 'user-toggle') user.status = user.status === '启用' ? '已停用' : '启用'
    else { if (!payload.password || payload.password.length < 8) return fail('新密码至少 8 位'); user.passwordResetAt = now(); user.passwordSet = true }
    return { ok:true, record:user, message:action === 'user-toggle' ? `账号已${user.status === '启用' ? '启用' : '停用'}` : '已记录密码重置；原型不保存明文密码' }
  }
  if (action === 'role-save') {
    const existing = payload.id ? roles.find(row => row.id === payload.id) : null
    if (payload.id && !existing) return fail('角色不存在')
    const type = payload.type, name = String(payload.name || '').trim(), code = String(payload.code || '').trim()
    if (!ROLE_MENUS[type] || !name || !/^[a-zA-Z][\w:-]{2,50}$/.test(code)) return fail('请填写角色名称、有效角色标识及适用类型')
    if (roles.some(row => row.id !== payload.id && row.code === code)) return fail('角色标识已存在')
    if (existing && existing.type !== type && users.some(user => user.roleIds.includes(existing.id))) return fail('已有用户使用此角色，不能更改适用类型')
    const menuIds = [...new Set(payload.menuIds || [])]
    if (!menuIds.length || menuIds.some(key => !ROLE_MENUS[type][key])) return fail('请勾选适用类型下的菜单')
    const dataScope = String(payload.dataScope || (type === 'platform' ? '1' : '3'))
    const dataOrgIds = [...new Set(payload.dataOrgIds || [])]
    if (!DATA_SCOPE_LABELS[dataScope]) return fail('请选择有效的数据范围')
    if (dataScope === '2' && !dataOrgIds.length) return fail('自定义数据范围至少选择一个机构')
    const record = { ...existing, id:existing?.id || uid('ROLE'), name, code, type, menuIds, dataScope, dataOrgIds, status:payload.status === '已停用' ? '已停用' : '启用', updatedAt:now() }
    if (existing) Object.assign(existing, record); else roles.push(record)
    return { ok:true, record, message:'角色及菜单权限已保存' }
  }
  if (action === 'role-toggle' || action === 'role-delete') {
    const role = roles.find(row => row.id === payload.id); if (!role) return fail('角色不存在')
    if (role.type === 'platform' && role.builtin) return fail('保留平台管理角色，避免失去系统维护入口')
    if (action === 'role-delete') { if (users.some(user => user.roleIds.includes(role.id))) return fail('角色正在被用户使用，请先调整用户角色'); roles.splice(roles.indexOf(role),1) }
    else role.status = role.status === '启用' ? '已停用' : '启用'
    return { ok:true, record:role }
  }
  return fail('不支持的账号操作')
}
