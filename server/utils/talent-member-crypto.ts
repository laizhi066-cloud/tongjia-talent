/**
 * @description M2 会员域敏感字段三件套：AES-256-GCM 密文（复用 `server/utils/crypto.ts`）+
 *   HMAC-SHA256 域分离哈希 + 前 4 后 4 脱敏。
 *   - 明文只在请求体内出现，服务端即时加密 / 哈希 / 脱敏后丢弃；
 *   - 密文与哈希永不进响应、错误与日志；
 *   - `ENCRYPTION_KEY` 缺失或过短直接 500，解密失败抛错，**任何情况都不降级为明文**。
 * @file server/utils/talent-member-crypto.ts
 */
import crypto from "node:crypto";
import { createError } from "h3";
import { decrypt, encrypt } from "./crypto";

/** 手机号 HMAC 域盐：与身份证哈希做域分离，避免跨字段碰撞。 */
export const TALENT_MEMBER_MOBILE_HMAC_DOMAIN = "talent-member-mobile-hmac";
/** 身份证 HMAC 域盐。 */
export const TALENT_MEMBER_IDNO_HMAC_DOMAIN = "talent-member-idno-hmac";
/** HMAC 主密钥派生盐；勿改动，否则历史哈希不可比。 */
export const TALENT_MEMBER_HMAC_KEY_SALT = "talent-member-hmac-v1";
/** `ENCRYPTION_KEY` 最小长度（与 .env.example / crypto.ts 的口径一致）。 */
export const TALENT_MEMBER_ENCRYPTION_KEY_MIN_LENGTH = 32;
/** 解密 / 自检失败的统一对外文案：不含密文、明文或密钥信息。 */
export const TALENT_MEMBER_CRYPTO_ERROR_MESSAGE =
  "敏感数据处理失败，请联系管理员";

interface HmacKeyCacheEntry {
  sourceKey: string;
  keys: Map<string, Buffer>;
}

let hmacKeyCache: HmacKeyCacheEntry | null = null;

function readEncryptionKey(): string {
  return String(process.env.ENCRYPTION_KEY || "").trim();
}

/**
 * 启动 / 首次使用自检：`ENCRYPTION_KEY` 必须存在且长度足够。
 * 缺失时不降级为明文，直接 500。
 */
export function assertTalentMemberCryptoReady(): void {
  const key = readEncryptionKey();
  if (!key || key.length < TALENT_MEMBER_ENCRYPTION_KEY_MIN_LENGTH)
    throw createError({
      statusCode: 500,
      message: `ENCRYPTION_KEY 未配置或长度不足 ${TALENT_MEMBER_ENCRYPTION_KEY_MIN_LENGTH} 位，会员敏感字段无法安全处理`,
    });
}

/** 按域派生 HMAC 密钥：scrypt 派生主密钥，再用域串做一次 HMAC 完成域分离。 */
function deriveTalentMemberHmacKey(domain: string): Buffer {
  const sourceKey = readEncryptionKey();
  if (hmacKeyCache && hmacKeyCache.sourceKey === sourceKey) {
    const cached = hmacKeyCache.keys.get(domain);
    if (cached) return cached;
  } else {
    hmacKeyCache = { sourceKey, keys: new Map() };
  }
  const baseKey = crypto.scryptSync(
    sourceKey,
    TALENT_MEMBER_HMAC_KEY_SALT,
    32,
  );
  const domainKey = crypto
    .createHmac("sha256", baseKey)
    .update(domain, "utf8")
    .digest();
  hmacKeyCache.keys.set(domain, domainKey);
  return domainKey;
}

/** 手机号归一化：trim、去空格 / 连字符、去 `+86` 前缀。 */
export function normalizeTalentMobile(input: string): string {
  let value = String(input ?? "")
    .trim()
    .replace(/[\s-]/g, "");
  if (value.startsWith("+86")) value = value.slice(3);
  return value;
}

/** 身份证归一化：trim、去空白、转大写（末位 x → X）。 */
export function normalizeTalentIdNo(input: string): string {
  return String(input ?? "")
    .trim()
    .replace(/\s/g, "")
    .toUpperCase();
}

/** 加密敏感明文；密钥缺失直接 500。 */
export function encryptTalentSensitive(value: string): string {
  assertTalentMemberCryptoReady();
  return encrypt(String(value ?? ""));
}

/** 解密敏感密文；失败抛 500，绝不回退为明文。 */
export function decryptTalentSensitive(cipher: string): string {
  const value = String(cipher ?? "").trim();
  if (!value)
    throw createError({ statusCode: 500, message: TALENT_MEMBER_CRYPTO_ERROR_MESSAGE });
  try {
    return decrypt(value);
  } catch {
    // 不记录密文与底层错误信息，避免把敏感数据带进日志。
    throw createError({ statusCode: 500, message: TALENT_MEMBER_CRYPTO_ERROR_MESSAGE });
  }
}

/** 手机号 HMAC-SHA256（域 `talent-member-mobile-hmac`），64 位十六进制。 */
export function hashTalentMemberMobile(mobile: string): string {
  assertTalentMemberCryptoReady();
  return crypto
    .createHmac("sha256", deriveTalentMemberHmacKey(TALENT_MEMBER_MOBILE_HMAC_DOMAIN))
    .update(normalizeTalentMobile(mobile), "utf8")
    .digest("hex");
}

/** 身份证 HMAC-SHA256（域 `talent-member-idno-hmac`），64 位十六进制。 */
export function hashTalentMemberIdNo(idNo: string): string {
  assertTalentMemberCryptoReady();
  return crypto
    .createHmac("sha256", deriveTalentMemberHmacKey(TALENT_MEMBER_IDNO_HMAC_DOMAIN))
    .update(normalizeTalentIdNo(idNo), "utf8")
    .digest("hex");
}

/** 手机号脱敏：前 4 + `****` + 后 4（如 `1380****0001`）。 */
export function maskTalentMobile(mobile: string): string {
  const value = normalizeTalentMobile(mobile);
  if (value.length <= 8) return `${value.slice(0, 4)}****`;
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}

/** 身份证脱敏：前 4 + 10 个 `*` + 后 4（如 `1101**********1234`）。 */
export function maskTalentIdNo(idNo: string): string {
  const value = normalizeTalentIdNo(idNo);
  if (value.length <= 8) return `${value.slice(0, 4)}****`;
  return `${value.slice(0, 4)}${"*".repeat(value.length - 8)}${value.slice(-4)}`;
}