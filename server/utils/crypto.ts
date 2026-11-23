/**
 * @description 加密/解密工具 — 使用 AES-256-GCM 加密敏感配置。
 * @file server/utils/crypto.ts
 * 需要在 .env 中设置 ENCRYPTION_KEY（至少 32 位随机字符串）
 */
import crypto from 'crypto'

function getKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY
  if (!envKey) {
    throw new Error('Missing ENCRYPTION_KEY environment variable')
  }
  return crypto.scryptSync(envKey, 'crypto-salt', 32)
}

export function encrypt(text: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(Buffer.from(text, 'utf8')), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decrypt(encryptedText: string): string {
  const key = getKey()
  const parts = encryptedText.split(':')
  if (parts.length !== 3) throw new Error('Invalid encrypted format')
  const [ivHex, authTagHex, encryptedHex] = parts as [string, string, string]
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedHex, 'hex')), decipher.final()])
  return decrypted.toString('utf8')
}

/** 掩码 API Key，只显示末4位 */
export function maskApiKey(key: string): string {
  if (key.length <= 8) return '****'
  return key.slice(0, 4) + '****' + key.slice(-4)
}
