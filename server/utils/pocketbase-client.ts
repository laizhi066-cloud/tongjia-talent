/**
 * @description 单实例 PocketBase 客户端管理。
 * @file server/utils/pocketbase-client.ts
 */
import type { H3Event } from 'h3'
import PocketBase from 'pocketbase'
import { pbAdmin, pbUrl } from './pb-env'

let adminClient: PocketBase | null = null
let initialising: Promise<PocketBase> | null = null
let reauthenticating: Promise<void> | null = null

/** 转义 PocketBase filter 字符串中的特殊字符，防止 filter 注入。 */
export function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function isSuperuserAuthError(error: unknown): boolean {
  const record = error as Record<string, any> | null
  const status = record?.status ?? record?.response?.status ?? record?.data?.status
  const message = String(record?.message ?? record?.response?.message ?? record?.data?.message ?? '')
  return status === 401 || (status === 403 && /superuser/i.test(message)) || /failed to authenticate/i.test(message)
}

/**
 * 获取唯一的 PocketBase 超管客户端。
 * 所有请求固定连接 `POCKETBASE_URL`，不读取站点 cookie、header 或运行时租户上下文。
 */
export async function getAdminPB(): Promise<PocketBase> {
  if (adminClient?.authStore.isValid) return adminClient
  if (initialising) return initialising

  initialising = (async () => {
    const { email, password } = pbAdmin()
    const client = adminClient ?? new PocketBase(pbUrl())
    client.autoCancellation(false)

    if (!adminClient) {
      const rawSend = client.send.bind(client)
      client.send = async function sendWithReauth(path: string, options: Record<string, any> = {}) {
        try {
          return await rawSend(path, options)
        }
        catch (error) {
          if (options.__noReauth || options.__retried || !isSuperuserAuthError(error)) throw error
          if (!reauthenticating) {
            reauthenticating = (async () => {
              client.authStore.clear()
              await client.collection('_superusers').authWithPassword(email, password, { requestKey: null, __noReauth: true } as any)
            })().finally(() => { reauthenticating = null })
          }
          await reauthenticating
          return rawSend(path, { ...options, __retried: true })
        }
      } as typeof client.send
      adminClient = client
    }

    try {
      await client.collection('_superusers').authWithPassword(email, password, { requestKey: null, __noReauth: true } as any)
      return client
    }
    catch (error) {
      adminClient = null
      throw error
    }
    finally {
      initialising = null
    }
  })()

  return initialising
}

/** 每次创建独立用户态客户端，避免并发请求共享登录 token。event 仅为兼容调用签名。 */
export function getUserPB(_event?: H3Event): PocketBase {
  return new PocketBase(pbUrl())
}
