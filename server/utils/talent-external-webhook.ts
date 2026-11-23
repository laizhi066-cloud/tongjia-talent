/**
 * @description M8 入站 webhook 骨架（spec §3.5/§8.1，ADR 0008-D2）：
 *   `POST /api/integrations/talent/gene-reports/sync`（及 `/api/integration/.../notify` 别名）、
 *   `/advice/sync`、`/gene-query/receipts` 的统一处理：
 *   HMAC 验签 + 时间窗 + nonce 重放 + 体积/内容类型/限流 → 只接受「事件标识」或「M2 查询回执」，
 *   **不接收报告/建议正文**；触发类异步拉取并返回 202 `accepted/duplicate/deduped`，
 *   运行中合并去重；回执调 M2 `applyTalentGeneQueryReceipt`（幂等键 `${childId}:${seq}`）。
 *   状态/错误只落 `talent_sync_logs` / `error_logs`，不含明文 PII、签名、密钥或外部原始报文。
 *   验签/去重/回执处理拆为纯函数，便于 fake transport / 单测不依赖真实 HTTP 服务。
 * @file server/utils/talent-external-webhook.ts
 */
import { randomBytes } from "node:crypto";
import {
  createError,
  getHeader,
  getRequestIP,
  getRequestURL,
  readRawBody,
  setResponseHeader,
  setResponseStatus,
  type H3Event,
} from "h3";
import { z } from "zod";
import type {
  TalentExternalErrorClass,
  TalentExternalScope,
  TalentExternalTriggerPayload,
  TalentExternalTriggerResult,
  TalentGeneQueryReceiptPayload,
} from "~~/shared/types/talent-external";
import {
  TALENT_QUERY_REASONS,
  type TalentQueryReason,
} from "~~/shared/types/talent-member";
import {
  TALENT_EXTERNAL_WEBHOOK_MAX_BYTES,
  assertTalentExternalSourceAvailable,
  createTalentExternalNonceCache,
  createTalentExternalRateLimiter,
  evaluateTalentExternalEnvFailFast,
  markTalentWebhookError,
  markTalentWebhookEvent,
  resolveTalentExternalWebhookSecret,
  sanitizeTalentExternalText,
  verifyTalentExternalSignature,
  type TalentExternalNonceCache,
  type TalentExternalRateLimiter,
} from "./talent-external-adapter";
import { recordError } from "./error-log";
import { getAdminPB } from "./pocketbase-client";
import { applyTalentGeneQueryReceipt } from "./talent-member-query";
import { commitTalentReportsSync } from "./talent-report-api";
import {
  getActiveTalentAdviceVersion,
  receiveTalentAdviceVersion,
} from "./talent-advice";

// 入站请求头（与出站同一套，spec §3.2）。
const HEADER_APP_ID = "x-talent-app-id";
const HEADER_TIMESTAMP = "x-talent-timestamp";
const HEADER_NONCE = "x-talent-nonce";
const HEADER_SIGNATURE = "x-talent-signature";
const HEADER_REQUEST_ID = "x-talent-request-id";

// ── 入站错误（`data.code` 按 spec §8.3） ────────────────────────────────────

function webhookError(
  statusCode: number,
  code: string,
  message: string,
  data: Record<string, unknown> = {},
): ReturnType<typeof createError> {
  return createError({ statusCode, message, data: { code, ...data } });
}

// ── 进程内状态（单实例；重启清零，spec §3.2/§3.8） ─────────────────────────

/** 触发事件去重（eventId；只用于 duplicate 响应，不作为业务幂等键）。 */
const eventCache: TalentExternalNonceCache = createTalentExternalNonceCache({
  ttlMs: 24 * 60 * 60_000,
  maxEntries: 5_000,
});
/** M2 回执幂等键缓存（`${childId}:${seq}`；重复到达直接 discarded）。 */
const receiptCache: TalentExternalNonceCache = createTalentExternalNonceCache({
  ttlMs: 24 * 60 * 60_000,
  maxEntries: 10_000,
});

interface InboundRateLimitState {
  rateLimiter: TalentExternalRateLimiter;
  lastUsedAt: number;
}
const inboundRateLimiters = new Map<string, InboundRateLimitState>();

function inboundRateLimiter(key: string): TalentExternalRateLimiter {
  const now = Date.now();
  for (const [existingKey, state] of inboundRateLimiters) {
    if (now - state.lastUsedAt > 10 * 60_000)
      inboundRateLimiters.delete(existingKey);
  }
  let state = inboundRateLimiters.get(key);
  if (!state) {
    state = {
      rateLimiter: createTalentExternalRateLimiter({
        maxQps: 10,
        maxConcurrency: 4,
      }),
      lastUsedAt: now,
    };
    inboundRateLimiters.set(key, state);
  }
  state.lastUsedAt = now;
  return state.rateLimiter;
}

interface ActiveRun {
  runId: string;
  startedAt: number;
  promise: Promise<unknown>;
}
const activeRuns = new Map<TalentExternalScope, ActiveRun>();

/** 测试/运维：清空入站去重与运行态（不碰业务数据）。 */
export function resetTalentWebhookState(): void {
  eventCache.clear();
  receiptCache.clear();
  inboundRateLimiters.clear();
  activeRuns.clear();
}

/** 当前是否有入站触发同步在运行（状态/测试用）。 */
export function isTalentExternalSyncRunning(
  scope: TalentExternalScope,
): boolean {
  return activeRuns.has(scope);
}

// ── 验签 / 体积 / 内容类型 / 限流（纯函数；spec §3.2/§8.1） ─────────────────

export interface TalentWebhookRequestContext {
  appId: string;
  requestId: string;
  nonce: string;
  /** PATH_WITH_QUERY（canonical 不含 host）。 */
  path: string;
  bodyText: string;
}

export interface TalentWebhookVerifyInput {
  secret: string;
  /** 全部小写键；缺失视为空串。 */
  headers: Record<string, string | undefined>;
  method: string;
  path: string;
  bodyText: string;
  now?: Date;
  clockSkewSeconds?: number;
  nonceCache?: TalentExternalNonceCache;
  maxBytes?: number;
  rateLimitCheck?: (key: string) => boolean;
  /** 计算限流 key 时使用的客户端地址（默认取 `x-forwarded-for` / `x-real-ip`）。 */
  clientIp?: string;
}

function readHeader(
  headers: Record<string, string | undefined>,
  name: string,
): string {
  return String(headers[name] ?? "").trim();
}

/**
 * 校验入站请求：密钥存在 → 内容类型 → 体积 → 必填签名头 → 限流 → HMAC/时间窗 → nonce 单次。
 * 失败抛 401/409/413/422/429，`data.code` 按 spec §8.3；不返回期望签名/密钥。
 */
export function verifyTalentWebhookRequest(
  input: TalentWebhookVerifyInput,
): TalentWebhookRequestContext {
  const maxBytes = Math.max(
    1_024,
    input.maxBytes ?? TALENT_EXTERNAL_WEBHOOK_MAX_BYTES,
  );
  const secret = String(input.secret ?? "").trim();
  // 未配置入站密钥：回滚口径为「入站全部 401」（spec §14）。
  if (!secret)
    throw webhookError(401, "SIGNATURE_INVALID", "入站签名密钥未配置");

  const contentType = readHeader(input.headers, "content-type").toLowerCase();
  if (contentType && !contentType.includes("application/json"))
    throw webhookError(
      422,
      "VALIDATION_ERROR",
      "请求 Content-Type 必须为 application/json",
    );

  const declaredLength = Number(readHeader(input.headers, "content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes)
    throw webhookError(413, "PAYLOAD_TOO_LARGE", "请求体超过上限");
  if (Buffer.byteLength(String(input.bodyText ?? ""), "utf8") > maxBytes)
    throw webhookError(413, "PAYLOAD_TOO_LARGE", "请求体超过上限");

  const appId = readHeader(input.headers, HEADER_APP_ID);
  const timestamp = readHeader(input.headers, HEADER_TIMESTAMP);
  const nonce = readHeader(input.headers, HEADER_NONCE);
  const signature = readHeader(input.headers, HEADER_SIGNATURE);
  if (!appId || !timestamp || !nonce || !signature)
    throw webhookError(401, "SIGNATURE_INVALID", "缺少签名请求头");

  // 入站限流：单应用 10 req/s（进程内令牌桶；超限 429 + Retry-After）。
  const clientIp =
    input.clientIp ||
    readHeader(input.headers, "x-forwarded-for").split(",")[0]?.trim() ||
    readHeader(input.headers, "x-real-ip");
  const rateKey = `${appId}:${clientIp}`;
  const allowed = input.rateLimitCheck
    ? input.rateLimitCheck(rateKey)
    : inboundRateLimiter(rateKey).tryAcquire();
  if (!allowed) throw webhookError(429, "RATE_LIMITED", "请求过于频繁");

  const verified = verifyTalentExternalSignature({
    secret,
    method: String(input.method || "POST").toUpperCase(),
    path: input.path,
    timestamp,
    nonce,
    bodyText: String(input.bodyText ?? ""),
    signature,
    clockSkewSeconds: input.clockSkewSeconds ?? 300,
    now: input.now ?? new Date(),
  });
  if (!verified.ok) {
    throw verified.reason === "expired"
      ? webhookError(401, "SIGNATURE_EXPIRED", "签名已过期，请检查时钟")
      : webhookError(401, "SIGNATURE_INVALID", "签名校验失败");
  }
  // nonce 单次有效（失败重放返回 409，便于提供方排查）。
  const nonceCache = input.nonceCache ?? eventCache;
  if (!nonceCache.use(`nonce:${nonce}`))
    throw webhookError(409, "REPLAY_DETECTED", "检测到重放请求");

  return {
    appId,
    requestId: readHeader(input.headers, HEADER_REQUEST_ID) || `req_${randomBytes(8).toString("hex")}`,
    nonce,
    path: String(input.path ?? "/"),
    bodyText: String(input.bodyText ?? ""),
  };
}

async function guardTalentWebhook(
  event: H3Event,
  options: {
    env?: NodeJS.ProcessEnv;
    now?: Date;
    nonceCache?: TalentExternalNonceCache;
    rateLimitCheck?: (key: string) => boolean;
  } = {},
): Promise<TalentWebhookRequestContext> {
  const env = options.env ?? process.env;
  const bodyText = (await readRawBody(event, "utf8")) ?? "";
  const url = getRequestURL(event);
  const headers: Record<string, string | undefined> = {
    "content-type": getHeader(event, "content-type"),
    "content-length": getHeader(event, "content-length"),
    [HEADER_APP_ID]: getHeader(event, HEADER_APP_ID),
    [HEADER_TIMESTAMP]: getHeader(event, HEADER_TIMESTAMP),
    [HEADER_NONCE]: getHeader(event, HEADER_NONCE),
    [HEADER_SIGNATURE]: getHeader(event, HEADER_SIGNATURE),
    [HEADER_REQUEST_ID]: getHeader(event, HEADER_REQUEST_ID),
  };
  try {
    return verifyTalentWebhookRequest({
      secret: resolveTalentExternalWebhookSecret(env),
      headers,
      method: String(event.method ?? "POST"),
      path: `${url.pathname}${url.search}`,
      bodyText,
      now: options.now,
      clockSkewSeconds: Number(env.TALENT_EXTERNAL_CLOCK_SKEW_SECONDS || 300),
      nonceCache: options.nonceCache,
      rateLimitCheck: options.rateLimitCheck,
      clientIp: String(getRequestIP(event, { xForwardedFor: true }) ?? ""),
    });
  } catch (error) {
    if (Number((error as { statusCode?: number }).statusCode) === 429)
      setResponseHeader(event, "retry-after", 1);
    throw error;
  }
}

export function parseTalentWebhookJson<T>(
  bodyText: string,
  schema: z.ZodType<T>,
): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText || "{}");
  } catch {
    throw webhookError(422, "VALIDATION_ERROR", "请求体不是合法 JSON");
  }
  const result = schema.safeParse(parsed);
  if (!result.success)
    throw webhookError(422, "VALIDATION_ERROR", "请求体不符合入站契约", {
      issues: result.error.issues.map((issue) => issue.message),
    });
  return result.data;
}

/**
 * 入站触发信封：只允许事件标识（eventId/type/occurredAt），`.strict()` 拒绝任何正文/报告/建议字段，
 * 保证「入站不接收正文」（ADR 0008-D2）。
 */
export const talentExternalTriggerSchema = z
  .object({
    eventId: z.string().trim().min(1).max(80),
    type: z.string().trim().max(40).optional(),
    occurredAt: z.string().trim().max(40).optional(),
  })
  .strict();

/** M2 查询回执（spec §3.5）。 */
export const talentGeneQueryReceiptSchema = z
  .object({
    idempotencyKey: z.string().trim().min(1).max(128),
    childId: z.string().trim().min(1).max(64),
    seq: z.number().int().min(0),
    outcome: z.enum(["found", "not_found"]),
    reason: z.string().trim().max(40).optional(),
    externalRef: z.string().trim().max(80).optional(),
    receivedAt: z.string().trim().max(40).optional(),
  })
  .strict();

// ── 触发类：返回 202 accepted/duplicate/deduped（spec §8.2） ────────────────

function beginTalentExternalRun(
  scope: TalentExternalScope,
  start: () => Promise<unknown>,
): { runId: string; deduped: boolean; promise: Promise<unknown> } {
  const running = activeRuns.get(scope);
  if (running)
    return { runId: running.runId, deduped: true, promise: running.promise };
  const runId = `run_${randomBytes(8).toString("hex")}`;
  const promise = Promise.resolve()
    .then(start)
    .catch((error) => {
      const message = sanitizeTalentExternalText(
        error instanceof Error ? error.message : error,
      );
      markTalentWebhookError("business", message);
      console.warn(
        `[talent-external][webhook] scope=${scope} run=${runId} 失败：${message}`,
      );
      void recordWebhookErrorLog(scope, message, runId);
    })
    .finally(() => {
      activeRuns.delete(scope);
    });
  activeRuns.set(scope, { runId, startedAt: Date.now(), promise });
  return { runId, deduped: false, promise };
}

async function recordWebhookErrorLog(
  scope: TalentExternalScope,
  message: string,
  requestId?: string,
): Promise<void> {
  try {
    const pb = await getAdminPB();
    await recordError(pb, {
      source: "api",
      level: "warn",
      message: `[talent-external] ${scope} 入站触发失败`,
      meta: {
        scope,
        requestId: requestId ?? "",
        summary: message.slice(0, 200),
      },
    });
  } catch {
    // 错误日志失败不影响入站响应。
  }
}

/**
 * 触发派发（纯内存去重，可单测）：重复 eventId → duplicate；同 scope 运行中 → deduped；
 * 否则启动异步任务并立即返回 runId（HTTP 202 由路由设置）。
 */
export async function dispatchTalentExternalTrigger(input: {
  scope: TalentExternalScope;
  eventId: string;
  start: () => Promise<unknown>;
}): Promise<TalentExternalTriggerResult> {
  const firstEvent = eventCache.use(`event:${input.eventId}`);
  if (!firstEvent)
    return {
      accepted: true,
      eventId: input.eventId,
      duplicate: true,
      deduped: true,
      runId: "",
    };
  const run = beginTalentExternalRun(input.scope, input.start);
  return {
    accepted: true,
    eventId: input.eventId,
    duplicate: false,
    deduped: run.deduped,
    runId: run.runId,
  };
}

export interface TalentExternalTriggerOptions {
  scope: TalentExternalScope;
  start: () => Promise<unknown>;
  env?: NodeJS.ProcessEnv;
  now?: Date;
  nonceCache?: TalentExternalNonceCache;
  rateLimitCheck?: (key: string) => boolean;
}

/**
 * 处理签名触发入站：验签 → 事件去重 → 运行中合并 → 异步启动拉取 → 202。
 */
export async function handleTalentExternalTrigger(
  event: H3Event,
  options: TalentExternalTriggerOptions,
): Promise<TalentExternalTriggerResult> {
  let context: TalentWebhookRequestContext;
  try {
    context = await guardTalentWebhook(event, {
      env: options.env,
      now: options.now,
      nonceCache: options.nonceCache,
      rateLimitCheck: options.rateLimitCheck,
    });
  } catch (error) {
    const code = String(
      (error as { data?: { code?: string } }).data?.code ?? "webhook",
    );
    markTalentWebhookError(
      (code === "PAYLOAD_TOO_LARGE" ? "http_4xx" : "signature") as TalentExternalErrorClass,
      sanitizeTalentExternalText(error),
    );
    void recordWebhookErrorLog(options.scope, sanitizeTalentExternalText(error));
    throw error;
  }
  const payload = parseTalentWebhookJson<TalentExternalTriggerPayload>(
    context.bodyText,
    talentExternalTriggerSchema,
  );
  markTalentWebhookEvent(options.now ?? new Date());
  const result = await dispatchTalentExternalTrigger({
    scope: options.scope,
    eventId: payload.eventId,
    start: options.start,
  });
  setResponseStatus(event, 202);
  return result;
}

// ── M2 查询回执：200 `{result}`（spec §3.5） ────────────────────────────────

export interface TalentGeneQueryReceiptOptions {
  env?: NodeJS.ProcessEnv;
  now?: Date;
  nonceCache?: TalentExternalNonceCache;
  rateLimitCheck?: (key: string) => boolean;
  /** 测试注入落库函数；默认调 M2 `applyTalentGeneQueryReceipt`。 */
  applyReceipt?: (
    receipt: TalentGeneQueryReceiptPayload,
  ) => Promise<"applied" | "discarded">;
  /** 测试注入日志写入；默认写 `talent_sync_logs`。 */
  recordLog?: (input: {
    receipt: TalentGeneQueryReceiptPayload;
    result: "applied" | "discarded";
    at: string;
  }) => Promise<void>;
}

export function toTalentQueryReason(
  value: string | undefined,
): TalentQueryReason | undefined {
  const text = String(value ?? "").trim();
  return (TALENT_QUERY_REASONS as readonly string[]).includes(text)
    ? (text as TalentQueryReason)
    : undefined;
}

async function recordTalentGeneQueryReceiptLog(input: {
  receipt: TalentGeneQueryReceiptPayload;
  result: "applied" | "discarded";
  at: string;
}): Promise<void> {
  try {
    const pb = await getAdminPB();
    await pb.collection("talent_sync_logs").create(
      {
        trigger: "webhook",
        status: "success",
        startedAt: input.at,
        finishedAt: input.at,
        durationMs: 0,
        received: 1,
        generated: input.result === "applied" ? 1 : 0,
        skipped: input.result === "discarded" ? 1 : 0,
        failedCount: 0,
        message: `基因查询回执：${input.result === "applied" ? "已应用" : "已丢弃"}`,
        details: {
          scope: "gene_query",
          counts: { applied: input.result === "applied" ? 1 : 0 },
        },
        syncScope: "gene_query",
        mode: "receipt",
        subjectDetails: [
          {
            childId: input.receipt.childId,
            seq: input.receipt.seq,
            result: input.result,
            externalRef: input.receipt.externalRef ?? "",
          },
        ],
        operatorId: "",
      },
      { $autoCancel: false },
    );
  } catch {
    // 日志失败不阻断回执处理（M3/M5 同口径）。
  }
}

/**
 * 回执处理（纯函数版本，可单测）：幂等键必须 `${childId}:${seq}`；重复 key → discarded；
 * 然后调 M2 守卫（旧 seq/未知子女/已解绑由 M2 丢弃）；写日志失败不影响结果。
 */
export async function processTalentGeneQueryReceipt(
  payload: TalentGeneQueryReceiptPayload,
  options: Omit<TalentGeneQueryReceiptOptions, "env"> = {},
): Promise<{ result: "applied" | "discarded" }> {
  const at = (options.now ?? new Date()).toISOString();
  const reason = toTalentQueryReason(payload.reason);
  if (payload.outcome === "not_found" && !reason)
    throw webhookError(
      422,
      "VALIDATION_ERROR",
      "not_found 回执必须给出合法 reason",
    );
  if (payload.idempotencyKey !== `${payload.childId}:${payload.seq}`)
    throw webhookError(
      422,
      "VALIDATION_ERROR",
      "回执幂等键与 childId/seq 不一致",
    );
  const cache = options.nonceCache ?? receiptCache;
  if (!cache.use(`receipt:${payload.idempotencyKey}`))
    return { result: "discarded" };
  let result: "applied" | "discarded";
  try {
    result = options.applyReceipt
      ? await options.applyReceipt(payload)
      : await applyTalentGeneQueryReceipt({
          idempotencyKey: payload.idempotencyKey,
          childId: payload.childId,
          seq: payload.seq,
          outcome: payload.outcome,
          ...(reason ? { reason } : {}),
          ...(payload.externalRef ? { externalRef: payload.externalRef } : {}),
          receivedAt: payload.receivedAt || at,
        });
  } catch (error) {
    markTalentWebhookError("business", sanitizeTalentExternalText(error));
    void recordWebhookErrorLog("gene_query", sanitizeTalentExternalText(error));
    throw webhookError(500, "INTERNAL_ERROR", "回执处理失败");
  }
  markTalentWebhookEvent(options.now ?? new Date());
  const recordLog = options.recordLog ?? recordTalentGeneQueryReceiptLog;
  await recordLog({ receipt: payload, result, at });
  return { result };
}

/**
 * 处理 M2 查询回执：验签 → 解析 → 幂等/守卫落库 → 写 `talent_sync_logs` → 200 `{result}`。
 * 旧 seq / 未知子女 / 已解绑 / 重复一律 `discarded`，不返回具体原因（防探测）。
 */
export async function handleTalentGeneQueryReceiptWebhook(
  event: H3Event,
  options: TalentGeneQueryReceiptOptions = {},
): Promise<{ result: "applied" | "discarded" }> {
  let context: TalentWebhookRequestContext;
  try {
    context = await guardTalentWebhook(event, {
      env: options.env,
      now: options.now,
      nonceCache: options.nonceCache,
      rateLimitCheck: options.rateLimitCheck,
    });
  } catch (error) {
    markTalentWebhookError(
      "signature" as TalentExternalErrorClass,
      sanitizeTalentExternalText(error),
    );
    void recordWebhookErrorLog("gene_query", sanitizeTalentExternalText(error));
    throw error;
  }
  const payload = parseTalentWebhookJson<TalentGeneQueryReceiptPayload>(
    context.bodyText,
    talentGeneQueryReceiptSchema,
  );
  return processTalentGeneQueryReceipt(payload, {
    ...(options.now ? { now: options.now } : {}),
    ...(options.nonceCache ? { nonceCache: options.nonceCache } : {}),
    ...(options.applyReceipt ? { applyReceipt: options.applyReceipt } : {}),
    ...(options.recordLog ? { recordLog: options.recordLog } : {}),
  });
}

// ── 真实触发实现（出站拉取；由路由注入，测试可替换） ────────────────────────

function formatLocalDate(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function resolveLookaheadDays(env: NodeJS.ProcessEnv): number {
  const parsed = Number.parseInt(
    String(env.TALENT_ADVICE_SYNC_LOOKAHEAD_DAYS ?? ""),
    10,
  );
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 7;
}

/**
 * 入站触发的基因报告同步：复用 M3 `commitTalentReportsSync`（全量候选 + 锁 + 唯一键幂等），
 * 日志 `trigger=webhook`；源不可用/生产 Mock → 503 写入错误日志，不写业务数据。
 */
export async function runTalentGeneReportWebhookSync(
  options: { env?: NodeJS.ProcessEnv; now?: Date; operatorId?: string } = {},
): Promise<unknown> {
  const env = options.env ?? process.env;
  assertTalentExternalSourceAvailable("gene_report", env);
  return commitTalentReportsSync(
    {},
    {
      operatorId: String(options.operatorId ?? ""),
      trigger: "webhook",
      ...(options.now ? { now: options.now } : {}),
    },
  );
}

/**
 * 入站触发的建议周期检查：仅当无生效版本或到达 `nextUpdateAt - lookahead` 才接收；
 * 周期内重复触发命中 409 `ADVICE_VERSION_EXISTS` → noop（不告警、不建数据）。
 */
export async function runTalentAdviceWebhookSync(
  options: { env?: NodeJS.ProcessEnv; now?: Date; operatorId?: string } = {},
): Promise<{ status: "noop" | "received"; reason: string; versionNo?: string }> {
  const env = options.env ?? process.env;
  assertTalentExternalSourceAvailable("advice_version", env);
  const now = options.now ?? new Date();
  const active = await getActiveTalentAdviceVersion();
  const lookaheadDays = resolveLookaheadDays(env);
  if (active) {
    const nextUpdateAt = String(active.nextUpdateAt ?? "").trim();
    const nextAt = Date.parse(nextUpdateAt);
    if (Number.isFinite(nextAt)) {
      const dueAt = nextAt - lookaheadDays * 86_400_000;
      if (now.getTime() < dueAt)
        return {
          status: "noop",
          reason: "not_due",
          versionNo: String(active.versionNo ?? ""),
        };
    }
  }
  try {
    const result = await receiveTalentAdviceVersion({
      effectiveAt: formatLocalDate(now),
      operatorId: String(options.operatorId ?? ""),
      operatorName: "系统同步",
      trigger: "webhook",
      now,
    });
    return {
      status: "received",
      reason: "received",
      versionNo: String(result.version.versionNo ?? ""),
    };
  } catch (error) {
    const code = String(
      (error as { data?: { code?: string } }).data?.code ?? "",
    );
    if (code === "ADVICE_VERSION_EXISTS")
      return { status: "noop", reason: "already_synced" };
    throw error;
  }
}

/** 入站触发开关（路由据此决定 401/503 口径）；只读 env，不写配置。 */
export function talentExternalInboundEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return Boolean(resolveTalentExternalWebhookSecret(env));
}

/** 启动期配置问题（路由/运维提示用；env-check 插件消费同一函数）。 */
export function talentExternalEnvIssues(
  env: NodeJS.ProcessEnv = process.env,
): { ok: boolean; errors: string[]; warnings: string[] } {
  return evaluateTalentExternalEnvFailFast(env);
}