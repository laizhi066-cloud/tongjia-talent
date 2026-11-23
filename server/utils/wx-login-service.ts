/**
 * @description 微信认证：为中性 users 账号签发 PocketBase token。
 * @file server/utils/wx-login-service.ts
 */
import crypto from 'node:crypto'
import { createError } from 'h3'
import PocketBase from 'pocketbase'
import { pocketBaseFileUrl } from './file-url'
import { escapeFilterValue } from './pocketbase-client'
import { assertWxConfigured } from './wx-config'

const EMAIL_DOMAIN = 'foundation.local.invalid'

/**
 * 账户注销后保存身份 HMAC，而非身份原文；密钥变更前须先评估这些注销标记的延续性。
 *
 * @param value 待比对的微信或手机号身份。
 * @returns 为空时返回空字符串，否则返回稳定的 SHA-256 HMAC。
 */
export function foundationIdentityHash(value: unknown): string {
  const identity = String(value || '').trim()
  if (!identity) return ''
  return crypto.createHmac('sha256', process.env.ENCRYPTION_KEY || 'foundation-identity-tombstone')
    .update(identity)
    .digest('hex')
}

/** 已注销身份不可绕过原账户而重新自动建户。 */
async function assertFoundationIdentityCanAuthenticate(
  pb: PocketBase,
  tombstoneField: 'deletedOpenidHash' | 'deletedUnionidHash' | 'deletedPhoneHash',
  value: unknown,
): Promise<void> {
  const hash = foundationIdentityHash(value)
  if (!hash) return
  const deleted = await pb.collection('users')
    .getFirstListItem(`${tombstoneField} = "${hash}"`, { $autoCancel: false })
    .catch(() => null)
  if (deleted)
    throw createError({ statusCode: 403, message: '该认证身份对应的账户已注销' })
}

function defaultNickname(_seed: string): string {
  return '微信用户'
}

function password(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

async function wxFetch<T>(url: string, options: Record<string, unknown> = {}): Promise<T> {
  // 外部微信接口不在 Nuxt 路由表；显式窄化 $fetch 签名，避免 200+ 条路由的重载推断触发 TS2321。
  const fetchJson = $fetch as unknown as (
    url: string,
    options: Record<string, unknown>,
  ) => Promise<unknown>
  return (await fetchJson(url, { timeout: 10_000, parseResponse: JSON.parse, ...options })) as T
}

export function getExpiresIn(token: string): number {
  try {
    const payload = token.split('.')[1]
    if (!payload) return 0
    return Number(JSON.parse(Buffer.from(payload, 'base64').toString('utf8')).exp || 0) - Math.floor(Date.now() / 1000)
  }
  catch { return 0 }
}

export interface FoundationLoginResult {
  token: string
  expiresIn: number
  openid?: string
  isNew: boolean
  user: { id: string, nickname: string, avatar: string, phone?: string, phoneBound: boolean }
}

/**
 * 已注销或被后台停用的账户不得因为再次微信授权而重新获得会话。
 *
 * @param user 已按微信身份命中的 users 记录。
 * @returns {void}
 */
export function assertFoundationUserCanAuthenticate(user: { status?: string }): void {
  if (user.status !== '1')
    throw createError({ statusCode: 403, message: '该账户已停用，无法继续登录' })
}

async function buildResult(pb: PocketBase, userId: string, isNew: boolean, tokenOverride?: string): Promise<FoundationLoginResult> {
  const user = await pb.collection('users').getOne(userId, { $autoCancel: false })
  assertFoundationUserCanAuthenticate({ status: String(user.status || '') })
  // 微信身份已被平台重新验证后才解除强退；旧 JWT 无法通过 API 自行恢复。
  if (user.forceLogoutAt) await pb.collection('users').update(user.id, { forceLogoutAt: null }, { $autoCancel: false })
  const nickname = user.nickname || defaultNickname(user.phone || user.openid || user.unionid || user.id)
  if (!user.nickname) await pb.collection('users').update(user.id, { nickname }, { $autoCancel: false }).catch(() => null)
  const token = tokenOverride || (await pb.collection('users').impersonate(user.id, 0)).authStore.token
  return {
    token,
    expiresIn: getExpiresIn(token),
    ...(user.openid ? { openid: String(user.openid) } : {}),
    isNew,
    user: {
      id: user.id,
      nickname,
      avatar: user.avatar ? pocketBaseFileUrl('users', user.id, user.avatar) : '',
      ...(user.phone ? { phone: String(user.phone) } : {}),
      phoneBound: Boolean(user.phone),
    },
  }
}

/** 将手机号映射为该账户的 PocketBase 密码认证 identity，其他输入原样交给 PocketBase。 */
export async function resolveFoundationPasswordIdentity(pb: PocketBase, identity: string): Promise<string> {
  const normalizedIdentity = identity.trim()
  if (!/^1[3-9]\d{9}$/.test(normalizedIdentity))
    return normalizedIdentity
  const user = await findUser(pb, `phone = "${escapeFilterValue(normalizedIdentity)}"`)
  return user?.email ? String(user.email) : normalizedIdentity
}

/** 使用手机号或 PocketBase 配置的 identity 和密码登录；不会为微信账户自动设置密码。 */
export async function loginWxUserByIdentityPassword(
  pb: PocketBase,
  identity: string,
  passwordValue: string,
): Promise<FoundationLoginResult> {
  let auth: { record: { id: string }, token: string }
  try {
    const passwordIdentity = await resolveFoundationPasswordIdentity(pb, identity)
    const userPb = new PocketBase(pb.baseUrl)
    userPb.autoCancellation(false)
    auth = await userPb.collection('users').authWithPassword(passwordIdentity, passwordValue, { $autoCancel: false })
  }
  catch {
    throw createError({ statusCode: 401, message: '账号或密码错误；如未设置密码，请使用微信手机号一键登录' })
  }
  return buildResult(pb, String(auth.record.id), false, auth.token)
}

async function findUser(pb: PocketBase, filter: string): Promise<any | null> {
  return pb.collection('users').getFirstListItem(filter, { $autoCancel: false }).catch(() => null)
}

async function createUser(pb: PocketBase, fields: Record<string, unknown>): Promise<any> {
  const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 16)
  const pwd = password()
  return pb.collection('users').create({
    email: `wx_${suffix}@${EMAIL_DOMAIN}`,
    username: `wx_${suffix}`,
    password: pwd,
    passwordConfirm: pwd,
    status: '1',
    ...fields,
  }, { $autoCancel: false })
}

/** 在数据库唯一索引与并发授权竞争时，回读获胜请求创建的同一身份账户。 */
async function createUserOrReuseIdentity(
  pb: PocketBase,
  fields: Record<string, unknown>,
  identityFilters: string[],
): Promise<{ user: any, isNew: boolean }> {
  try {
    return { user: await createUser(pb, fields), isNew: true }
  } catch (error) {
    for (const filter of identityFilters) {
      const existing = await findUser(pb, filter)
      if (existing) return { user: existing, isNew: false }
    }
    throw error
  }
}

export interface WxCode2SessionResult {
  openid?: string
  session_key?: string
  unionid?: string
  errcode?: number
  errmsg?: string
}

export async function wxCode2Session(pb: any, code: string): Promise<WxCode2SessionResult> {
  const { appId, appSecret } = await assertWxConfigured(pb, 'mp')
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(appSecret)}&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`
  try { return await wxFetch(url) }
  catch { throw createError({ statusCode: 502, message: '微信服务暂不可用，请稍后重试' }) }
}

export async function findOrCreateWxUser(pb: PocketBase, openid: string, unionid?: string): Promise<FoundationLoginResult> {
  await Promise.all([
    assertFoundationIdentityCanAuthenticate(pb, 'deletedOpenidHash', openid),
    assertFoundationIdentityCanAuthenticate(pb, 'deletedUnionidHash', unionid),
  ])
  let existing = unionid ? await findUser(pb, `unionid = "${escapeFilterValue(unionid)}"`) : null
  existing ||= await findUser(pb, `openid = "${escapeFilterValue(openid)}"`)
  if (existing && unionid && !existing.unionid)
    existing = await pb.collection('users').update(existing.id, { unionid }, { $autoCancel: false })
  if (existing) return buildResult(pb, existing.id, false)
  const created = await createUserOrReuseIdentity(pb, { openid, unionid: unionid || '' }, [
    ...(unionid ? [`unionid = "${escapeFilterValue(unionid)}"`] : []),
    `openid = "${escapeFilterValue(openid)}"`,
  ])
  return buildResult(pb, created.user.id, created.isNew)
}

const accessTokens = new Map<string, { token: string, expiresAt: number }>()

async function getWxAccessToken(pb: any, forceRefresh = false): Promise<string> {
  const { appId, appSecret } = await assertWxConfigured(pb, 'mp')
  const cached = accessTokens.get(appId)
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) return cached.token
  let result: { access_token?: string, expires_in?: number, errmsg?: string }
  try {
    result = await wxFetch<{ access_token?: string, expires_in?: number, errmsg?: string }>(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(appSecret)}`,
    )
  }
  catch {
    throw createError({ statusCode: 502, message: '微信服务暂不可用，请稍后重试' })
  }
  if (!result.access_token) throw createError({ statusCode: 502, message: `获取微信 access_token 失败: ${result.errmsg || '未知错误'}` })
  accessTokens.set(appId, { token: result.access_token, expiresAt: Date.now() + Math.max(60, (result.expires_in || 7200) - 300) * 1000 })
  return result.access_token
}

export async function wxGetPhoneNumber(pb: any, code: string): Promise<string> {
  async function requestPhone(token: string): Promise<{ errcode?: number, phone_info?: { purePhoneNumber?: string, phoneNumber?: string }, errmsg?: string }> {
    try {
      return await wxFetch<{ errcode?: number, phone_info?: { purePhoneNumber?: string, phoneNumber?: string }, errmsg?: string }>(
        `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${encodeURIComponent(token)}`,
        { method: 'POST', body: { code } },
      )
    }
    catch {
      throw createError({ statusCode: 502, message: '微信手机号服务暂不可用，请稍后重试' })
    }
  }
  let result = await requestPhone(await getWxAccessToken(pb))
  if (result.errcode === 42001)
    result = await requestPhone(await getWxAccessToken(pb, true))
  if (result.errcode && result.errcode !== 0)
    throw createError({ statusCode: 400, message: `获取手机号失败：${result.errmsg || '授权凭证无效或已过期'}` })
  const phone = result.phone_info?.purePhoneNumber || result.phone_info?.phoneNumber
  if (!phone) throw createError({ statusCode: 400, message: `获取手机号失败: ${result.errmsg || 'code 无效或已过期'}` })
  const normalized = phone.replace(/[^0-9]/g, '')
  if (!/^1[3-9]\d{9}$/.test(normalized))
    throw createError({ statusCode: 400, message: '微信返回的手机号格式不正确' })
  return normalized
}

export async function findOrCreateWxUserByPhone(pb: PocketBase, openid: string, phone: string): Promise<FoundationLoginResult> {
  await Promise.all([
    assertFoundationIdentityCanAuthenticate(pb, 'deletedOpenidHash', openid),
    assertFoundationIdentityCanAuthenticate(pb, 'deletedPhoneHash', phone),
  ])
  let user = await findUser(pb, `phone = "${escapeFilterValue(phone)}"`)
  if (user) {
    if (user.openid && String(user.openid) !== openid) {
      throw createError({ statusCode: 409, message: '该手机号已绑定其他微信账号，请使用原微信登录' })
    }
    const patch: Record<string, string> = {}
    if (!user.openid && openid) patch.openid = openid
    if (Object.keys(patch).length) user = await pb.collection('users').update(user.id, patch, { $autoCancel: false })
    return buildResult(pb, user.id, false)
  }
  user = await findUser(pb, `openid = "${escapeFilterValue(openid)}"`)
  if (user) {
    await pb.collection('users').update(user.id, { phone }, { $autoCancel: false })
    return buildResult(pb, user.id, false)
  }
  const created = await createUserOrReuseIdentity(pb, { openid, phone }, [
    `phone = "${escapeFilterValue(phone)}"`,
    `openid = "${escapeFilterValue(openid)}"`,
  ])
  return buildResult(pb, created.user.id, created.isNew)
}
