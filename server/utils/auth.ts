/**
 * @description 用户认证与授权 — JWT 验证 + 当前用户获取（含角色/权限）
 * @file server/utils/auth.ts
 */
import type { H3Event } from 'h3'
import type { RecordModel } from 'pocketbase'
import { escapeFilterValue, getUserPB } from './pocketbase-client'

interface AuthEventContext {
  __currentUserBasic?: Record<string, any>
  __currentUser?: Record<string, any>
  [key: string]: any
}

// 注意：每次请求新建临时 PB 实例，避免并发请求共享同一实例导致 token 竞态
// 并发场景下，若请求 A 的 authRefresh 在途，请求 B 调 save(tokenB) 会覆盖 token，
// 导致请求 A 的 authRefresh 失败（401）。每次新建实例可完全规避此问题。

/**
 * 从请求头验证用户 JWT，返回用户基本信息
 * 前端在 $fetch 时需附加 Authorization: Bearer <token>
 */
export async function verifyUserToken(event: H3Event): Promise<Record<string, any>> {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '')
  if (!token) throw createError({ statusCode: 401, message: '未登录' })

  // 每次新建实例，保证并发请求互不影响；始终连接唯一的 POCKETBASE_URL。
  const tempPb = await getUserPB(event)
  tempPb.authStore.save(token, null)

  try {
    const authData = await tempPb.collection('users').authRefresh({ query: { expand: 'deptId' }, $autoCancel: false })
    const user = authData.record as unknown as Record<string, any>

    // 强制下线只能由一次成功的密码或微信认证解除；旧 token 不能经任意 API 恢复。
    if (user.forceLogoutAt) {
      throw createError({ statusCode: 401, message: '已被强制下线，请重新登录' })
    }

    return user
  } catch (err) {
    // 自定义 H3Error（强退、参数错误等）直接透传
    if (typeof err === 'object' && err !== null && 'statusCode' in err) {
      throw err
    }
    console.error('[auth] verifyUserToken failed:', err instanceof Error ? err.message : err)
    throw createError({ statusCode: 401, message: '登录已过期' })
  }
}

/**
 * 服务端获取当前登录用户（基础信息，不含角色/权限）
 * 仅验证 JWT + 检查状态 — 约 1 次 PB 查询
 * 使用 event.context 缓存避免同一请求内重复查询
 */
export async function getCurrentUserBasic(event: H3Event): Promise<Record<string, any>> {
  if ((event.context as unknown as AuthEventContext).__currentUserBasic) {
    return (event.context as unknown as AuthEventContext).__currentUserBasic as Record<string, any>
  }

  const authUser = await verifyUserToken(event)
  const userData = authUser as unknown as Record<string, any>

  if (userData.status === '0') throw createError({ statusCode: 403, message: '用户已停用' })

  const result = {
    ...userData,
    dept: userData.expand?.deptId || null,
  }
  ;(event.context as unknown as AuthEventContext).__currentUserBasic = result
  return result
}

/**
 * 服务端获取当前登录用户（含角色、菜单权限），不含数据权限范围
 * 提供后台 RBAC 所需的角色与菜单权限。
 * 适用于 requirePermission / bootstrap / permissions 等场景
 */
export async function getCurrentUser(event: H3Event): Promise<Record<string, any>> {
  if ((event.context as unknown as AuthEventContext).__currentUser) {
    return (event.context as unknown as AuthEventContext).__currentUser as Record<string, any>
  }

  const userData = await getCurrentUserBasic(event)
  const userId = userData.id
  const pb = await getAdminPB()

  const userRoles = await pb.collection('user_roles').getFullList({
    filter: `userId = "${escapeFilterValue(userId)}"`,
    expand: 'roleId',
    $autoCancel: false,
  })

  // 停用角色在下一次请求即失效，不能依赖重新登录才能收回既有会话权限。
  const enabledUserRoles = userRoles.filter((ur: RecordModel) => ur.expand?.roleId?.status === '1')
  const roleIds = enabledUserRoles
    .map((ur: RecordModel) => ur.expand?.roleId?.id)
    .filter(Boolean) as string[]

  let allRoleMenus: RecordModel[] = []
  if (roleIds.length > 0) {
    const roleFilter = roleIds.map((id) => `roleId = "${escapeFilterValue(id)}"`).join(' || ')
    allRoleMenus = await pb.collection('role_menus').getFullList({
      filter: roleFilter,
      expand: 'menuId',
      $autoCancel: false,
    })
  }

  const roles = enabledUserRoles.map((ur: RecordModel) => {
    const role = ur.expand?.roleId || {}
    const roleMenuRows = allRoleMenus.filter((rm: RecordModel) => rm.roleId === role.id)
    return {
      role: {
        ...role,
        menus: roleMenuRows.map((rm: RecordModel) => ({ menu: rm.expand?.menuId })),
        deptScopes: [],
      },
    }
  })

  const result = { ...userData, dept: userData.dept, roles, posts: [] }
  ;(event.context as unknown as AuthEventContext).__currentUser = result
  return result
}
