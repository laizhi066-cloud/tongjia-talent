/**
 * @description POST /api/admin/settings/wechat — 保存唯一站点的微信认证配置。
 * @file server/api/admin/settings/wechat.post.ts
 * @route POST /api/admin/settings/wechat
 * @body { mp: { appId: string, appSecret: string } }
 * @returns { mp: { appId: string, appSecret: string } }
 */
import type { RecordModel } from 'pocketbase'
import { maskSecret, resolveSecret } from '~~/server/utils/secret-config'

interface StoredWechatConfig {
  mpAppId?: string
  mpAppSecret?: string
}

interface WechatCredentialResponse {
  appId: string
  appSecret: string
}

interface WechatSettingsResponse {
  mp: WechatCredentialResponse
}

/** 配置值损坏时按空配置处理，避免后台页面因此无法恢复配置。 */
function parseStoredWechatConfig(record: RecordModel | undefined): StoredWechatConfig {
  if (!record?.configValue) return {}
  try {
    return JSON.parse(String(record.configValue)) as StoredWechatConfig
  }
  catch {
    return {}
  }
}

/** 密钥始终以掩码返回，不能透出 PocketBase 中的明文或密文。 */
function toResponse(config: StoredWechatConfig): WechatSettingsResponse {
  return {
    mp: {
      appId: config.mpAppId?.trim() || '',
      appSecret: maskSecret(config.mpAppSecret),
    },
  }
}

export default defineEventHandler(async (event) => {
  await requireSuper(event)
  return withOperLog(event, { title: '微信认证配置', operType: OperType.UPDATE }, async () => {
    const body = await validateBody(event, updateWechatSettingsSchema)
    const pb = await getAdminPB()
    const [existing] = await pb.collection('configs').getFullList({
      filter: 'configKey = "wechat_config"',
      $autoCancel: false,
    })
    const previous = parseStoredWechatConfig(existing)
    const next: StoredWechatConfig = {
      mpAppId: body.mp.appId,
      mpAppSecret: resolveSecret(body.mp.appSecret, previous.mpAppSecret),
    }
    const configValue = JSON.stringify(next)

    if (existing) {
      await pb.collection('configs').update(existing.id, { configValue }, { $autoCancel: false })
    }
    else {
      await pb.collection('configs').create({
        configName: '微信认证配置',
        configKey: 'wechat_config',
        configValue,
        configType: 'Y',
        remark: '仅供微信基础认证使用',
      }, { $autoCancel: false })
    }

    return success(toResponse(next), '微信配置已保存')
  })
})
