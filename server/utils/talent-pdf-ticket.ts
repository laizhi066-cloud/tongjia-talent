/**
 * @description M8 PDF 下载 ticket：H5 新窗口无法自定义 Header，用 120s HMAC ticket 打开同源代理；
 *   ticket 只解决「带不了 Header」，不是授权替代——命中后服务层仍重新校验账号 / 家长 / 报告 /
 *   开放册 / 子女状态（docs/specs/M8-external/spec.md §6.8、ADR 0008-D4）。
 * @file server/utils/talent-pdf-ticket.ts
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { talentPdfTicketExpired, talentPdfTicketInvalid, talentPdfTicketTtlSeconds, isTalentPdfTicketOneTime } from "./talent-pdf-config";

export interface TalentPdfTicketPayload {
  /** reportId */
  r: string;
  /** volumeId */
  v: string;
  /** 中性账户 users id */
  u: string;
  /** 家长档案 id */
  p: string;
  /** 过期时间（epoch 秒） */
  e: number;
  /** nonce（一次性 ticket 重放检测） */
  n: string;
}

export interface TalentPdfTicketSignResult {
  ticket: string;
  expiresAt: string;
  ttlSeconds: number;
}

function ticketKey(): Buffer {
  const configured = String(process.env.ENCRYPTION_KEY ?? "").trim();
  if (!configured) throw new Error("缺少 ENCRYPTION_KEY，无法签发 PDF 下载 ticket");
  return createHash("sha256").update(`${configured}:pdf-ticket`).digest();
}

function signPayload(payloadBase64Url: string): string {
  return createHmac("sha256", ticketKey()).update(`pdf-ticket:${payloadBase64Url}`).digest("base64url");
}

function encodePayload(payload: TalentPdfTicketPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

/** 签发 ticket；payload 无 PII，TTL 默认 120s（上限 300s）。 */
export function signTalentPdfTicket(input: {
  reportId: string;
  volumeId: string;
  userId: string;
  parentId: string;
  now?: Date;
  ttlSeconds?: number;
}): TalentPdfTicketSignResult {
  const ttlSeconds = Math.min(300, Math.max(30, input.ttlSeconds ?? talentPdfTicketTtlSeconds()));
  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
  const payload: TalentPdfTicketPayload = {
    r: input.reportId,
    v: input.volumeId,
    u: input.userId,
    p: input.parentId,
    e: Math.floor(expiresAt.getTime() / 1000),
    n: randomBytes(12).toString("base64url"),
  };
  const payloadBase64Url = encodePayload(payload);
  return {
    ticket: `${payloadBase64Url}.${signPayload(payloadBase64Url)}`,
    expiresAt: expiresAt.toISOString(),
    ttlSeconds,
  };
}

interface NonceStoreEntry {
  expiresAt: number;
}

/** 一次性 nonce 进程内 LRU（默认关闭；单实例重启即失效，靠短 TTL + 重新鉴权兜底）。 */
const usedNonces = new Map<string, NonceStoreEntry>();
const NONCE_CAPACITY = 5_000;

function consumeNonce(payload: TalentPdfTicketPayload, nowMs: number): void {
  if (!isTalentPdfTicketOneTime()) return;
  for (const [nonce, entry] of usedNonces) {
    if (entry.expiresAt <= nowMs) usedNonces.delete(nonce);
  }
  const existing = usedNonces.get(payload.n);
  if (existing) throw talentPdfTicketExpired();
  usedNonces.set(payload.n, { expiresAt: payload.e * 1000 });
  if (usedNonces.size > NONCE_CAPACITY) {
    const oldest = usedNonces.keys().next().value;
    if (oldest) usedNonces.delete(oldest);
  }
}

/** 测试用：清空一次性 nonce 状态。 */
export function resetTalentPdfTicketNonces(): void {
  usedNonces.clear();
}

/**
 * 校验 ticket：签名错 403 `PDF_TICKET_INVALID`；过期 / 重放 410 `PDF_TICKET_EXPIRED`；
 * 路径绑定的 reportId / volumeId 不匹配按无效签名处理（403），不泄露存在性。
 */
export function verifyTalentPdfTicket(
  ticket: unknown,
  options: { expectedReportId?: string; expectedVolumeId?: string; now?: Date } = {},
): TalentPdfTicketPayload {
  const raw = String(ticket ?? "").trim();
  if (!raw) throw talentPdfTicketInvalid();
  const separator = raw.lastIndexOf(".");
  if (separator <= 0 || separator >= raw.length - 1) throw talentPdfTicketInvalid();
  const payloadBase64Url = raw.slice(0, separator);
  const providedSignature = raw.slice(separator + 1);
  const expectedSignature = signPayload(payloadBase64Url);
  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected))
    throw talentPdfTicketInvalid();

  let payload: TalentPdfTicketPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadBase64Url, "base64url").toString("utf8")) as TalentPdfTicketPayload;
  } catch {
    throw talentPdfTicketInvalid();
  }
  if (
    !payload ||
    typeof payload.r !== "string" ||
    typeof payload.v !== "string" ||
    typeof payload.u !== "string" ||
    typeof payload.p !== "string" ||
    typeof payload.e !== "number" ||
    typeof payload.n !== "string"
  )
    throw talentPdfTicketInvalid();

  const now = options.now ?? new Date();
  if (!Number.isFinite(payload.e) || payload.e * 1000 <= now.getTime()) throw talentPdfTicketExpired();
  if (options.expectedReportId !== undefined && payload.r !== options.expectedReportId) throw talentPdfTicketInvalid();
  if (options.expectedVolumeId !== undefined && payload.v !== options.expectedVolumeId) throw talentPdfTicketInvalid();
  consumeNonce(payload, now.getTime());
  return payload;
}