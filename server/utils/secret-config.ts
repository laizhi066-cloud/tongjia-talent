/**
 * @description 微信密钥脱敏工具：加密存(enc: 前缀)、掩码回显、掩码值不覆盖。
 *   读端点用 maskSecret 回显，写端点用 resolveSecret（掩码/空视为未改），消费端用 decryptMaybe 取真实值。
 * @file server/utils/secret-config.ts
 */
import { decrypt, encrypt, maskApiKey } from './crypto'

/** 掩码回显：enc: 密文先解密再掩码；明文直接掩码；空→空 */
export function maskSecret(v?: string): string {
  if (!v)
    return ''
  if (!v.startsWith('enc:'))
    return maskApiKey(v)
  try {
    return maskApiKey(decrypt(v.slice(4)))
  }
  catch {
    return '****'
  }
}

/** 解密 enc: 前缀密文；明文/空原样返回（消费端取真实值用） */
export function decryptMaybe(v?: string): string {
  if (!v)
    return ''
  if (v.startsWith('enc:')) {
    try {
      return decrypt(v.slice(4))
    }
    catch {
      return ''
    }
  }
  return v
}

/** 保存时：掩码值(含 *)或空→视为未改，保留原密文；否则新值加密存 */
export function resolveSecret(incoming: string | undefined, existingEnc: string | undefined): string {
  const v = (incoming || '').trim()
  if (!v || v.includes('*'))
    return existingEnc || ''
  return `enc:${encrypt(v)}`
}
