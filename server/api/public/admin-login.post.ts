/**
 * @description 基础后台管理员账号密码登录；账号名或邮箱均可，仅签发已分配后台角色的账户会话。
 * @file server/api/public/admin-login.post.ts
 * @route POST /api/public/admin-login
 * @body { identity: string, password: string }
 * @returns { token: string, record: object }
 */
import { z } from 'zod'
import { escapeFilterValue, getUserPB } from '~~/server/utils/pocketbase-client'
import { hasConsoleAccess, type ConsoleRoleAssignment, type ConsoleRoleMenuAssignment } from '~~/server/utils/console-access'

const adminLoginSchema = z.object({
  identity: z.string({ message: '请输入管理员账号' }).trim().min(3, '账号至少需要 3 位').max(120, '账号过长'),
  password: z.string({ message: '请输入密码' }).min(8, '密码至少需要 8 位'),
})

/** 允许用「账号名」或邮箱登录：非邮箱时按 users.username 反查邮箱。 */
async function resolveConsoleEmail(identity: string): Promise<string> {
  if (identity.includes('@')) return identity
  const pb = await getAdminPB()
  const user = await pb.collection('users').getFirstListItem(
    `username = "${escapeFilterValue(identity)}"`,
    { fields: 'email', $autoCancel: false },
  ).catch(() => null)
  if (!user?.email) throw createError({ statusCode: 400, message: '账号或密码错误' })
  return String(user.email)
}

/** 判断用户是否具备基础后台访问角色和菜单授权。 */
async function hasConsoleRole(userId: string): Promise<boolean> {
  const pb = await getAdminPB()
  const records = await pb.collection('user_roles').getFullList<ConsoleRoleAssignment & {
    expand?: { roleId?: ConsoleRoleAssignment['role'] }
  }>({
    filter: `userId = "${escapeFilterValue(userId)}"`,
    expand: 'roleId',
    $autoCancel: false,
  })
  const assignments = records.map(record => ({
    roleId: record.roleId,
    role: record.expand?.roleId,
  }))
  const eligibleRoleIds = assignments
    .filter(assignment => assignment.role?.status === '1')
    .map(assignment => assignment.roleId)

  if (!eligibleRoleIds.length) return false

  const roleMenus = await pb.collection('role_menus').getFullList<ConsoleRoleMenuAssignment & {
    expand?: { menuId?: ConsoleRoleMenuAssignment['menu'] }
  }>({
    filter: eligibleRoleIds.map(roleId => `roleId = "${escapeFilterValue(roleId)}"`).join(' || '),
    expand: 'menuId',
    $autoCancel: false,
  })
  return hasConsoleAccess(assignments, roleMenus.map(record => ({ roleId: record.roleId, menu: record.expand?.menuId })))
}

export default defineEventHandler(async (event) => {
  const { identity, password } = await validateBody(event, adminLoginSchema)
  const email = await resolveConsoleEmail(identity)
  const userPB = getUserPB()
  userPB.autoCancellation(false)

  try {
    const authData = await userPB.collection('users').authWithPassword(email, password, { $autoCancel: false })
    if (authData.record.status !== '1') {
      await recordLoginAttempt(await getAdminPB(), event, { identity, status: '1', message: '账户已停用', loginType: 'console', userId: authData.record.id })
      throw createError({ statusCode: 403, message: '该账户已停用' })
    }
    if (!await hasConsoleRole(authData.record.id)) {
      await recordLoginAttempt(await getAdminPB(), event, { identity, status: '1', message: '账户未分配后台角色', loginType: 'console', userId: authData.record.id })
      throw createError({ statusCode: 403, message: '该账户无后台访问权限' })
    }

    // 密码已被重新验证后才解除强退；不能由已有 token 调用任意后台接口恢复。
    if (authData.record.forceLogoutAt) {
      await (await getAdminPB()).collection('users').update(authData.record.id, { forceLogoutAt: null }, { $autoCancel: false })
      authData.record.forceLogoutAt = null
    }

    await recordLoginAttempt(await getAdminPB(), event, { identity, status: '0', message: '后台登录成功', loginType: 'console', userId: authData.record.id })
    return success({ token: authData.token, record: authData.record }, '登录成功')
  }
  catch (error) {
    const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error
      ? Number((error as { statusCode: unknown }).statusCode)
      : 0
    if (statusCode === 403) throw error
    await recordLoginAttempt(await getAdminPB(), event, { identity, status: '1', message: '账户或密码校验失败', loginType: 'console' })
    throw createError({ statusCode: 400, message: '账号或密码错误' })
  }
})
