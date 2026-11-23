/**
 * @description M8 外部集成传输层（可替换骨架，真实供应商 C1 未定）：
 *   环境变量解析与缺配置 503 / 生产 fail-fast 规则、HMAC-SHA256 canonical 签名与时间窗、
 *   nonce 重放缓存、幂等键、错误分类（超时/4xx/5xx/签名/解析/业务）、指数退避重试（含 429 Retry-After）、
 *   进程内令牌桶限流（QPS + 并发）、熔断、告警钩子、运行指标与运行态快照。
 *   合同：docs/specs/M8-external/spec.md §3/§4.4/§4.5/§4.7/§8.5/§9.1；ADR 0008-D1/D2/D6。
 *   本文件不依赖 PocketBase、不读写业务集合、不打印/落库任何密钥；供应商字段映射在
 *   `server/utils/talent-external-sources.ts`，本文件只处理传输与观测。
 * @file server/utils/talent-external-adapter.ts
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createError } from "h3";
import type {
  TalentExternalAlertEvent,
  TalentExternalCallResult,
  TalentExternalCircuitState,
  TalentExternalClientConfig,
  TalentExternalErrorClass,
  TalentExternalFailureInfo,
  TalentExternalLastError,
  TalentExternalMetricsSnapshot,
  TalentExternalRuntimeSnapshot,
  TalentExternalScope,
  TalentExternalSourceKind,
  TalentExternalTransport,
  TalentExternalTransportRequest,
  TalentExternalTransportResponse,
} from "~~/shared/types/talent-external";

// ── 常量（spec §3.1/§3.2/§4.4/§4.5/§9.1） ───────────────────────────────────

/** 协议版本（canonical 首行）；适配层固定，变更需双写窗口。 */
export const TALENT_EXTERNAL_API_VERSION = "v1";
/** 单请求默认超时（spec §3.1：读取 15s）。 */
export const TALENT_EXTERNAL_DEFAULT_TIMEOUT_MS = 15_000;
/** 单对象默认重试次数（spec §4.4）。 */
export const TALENT_EXTERNAL_DEFAULT_RETRY_MAX = 3;
/** 出站默认并发与 QPS（spec §3.9）。 */
export const TALENT_EXTERNAL_DEFAULT_MAX_CONCURRENCY = 2;
export const TALENT_EXTERNAL_DEFAULT_MAX_QPS = 5;
/** 单批预算默认 10min（spec §4.4）；由同步编排消费，传输层只暴露解析结果。 */
export const TALENT_EXTERNAL_DEFAULT_RUN_BUDGET_MS = 600_000;
/** 熔断默认阈值与打开时长（spec §4.5）。 */
export const TALENT_EXTERNAL_DEFAULT_BREAKER_THRESHOLD = 5;
export const TALENT_EXTERNAL_DEFAULT_BREAKER_OPEN_MS = 15 * 60_000;
/** 时间窗默认 300s（spec §3.2）。 */
export const TALENT_EXTERNAL_DEFAULT_CLOCK_SKEW_SECONDS = 300;
/** 入站 nonce 缓存默认 10 分钟（spec §3.2「≥10 分钟缓存」）。 */
export const TALENT_EXTERNAL_NONCE_TTL_MS = 10 * 60_000;
/** 入站 webhook body 上限（spec §3.1：请求 ≤64KB）。 */
export const TALENT_EXTERNAL_WEBHOOK_MAX_BYTES = 64 * 1024;
/** 鉴权失败后的短时快失败窗口：期间不再请求对方（spec §3.3「中止本批」）。 */
export const TALENT_EXTERNAL_AUTH_BLOCK_MS = 60_000;
/** 告警默认冷却（spec §4.7：30min 起）。 */
export const TALENT_EXTERNAL_ALERT_COOLDOWN_MS = 30 * 60_000;
/** 429 Retry-After 上限（spec §3.9：≤60s）。 */
export const TALENT_EXTERNAL_RETRY_AFTER_MAX_MS = 60_000;
/** 退避基准（spec §4.4：1s → 4s → 16s ±20% jitter）。 */
export const TALENT_EXTERNAL_BACKOFF_BASE_MS = 1_000;
export const TALENT_EXTERNAL_BACKOFF_FACTOR = 4;
export const TALENT_EXTERNAL_BACKOFF_MAX_MS = 16_000;
export const TALENT_EXTERNAL_BACKOFF_JITTER_RATIO = 0.2;

/** 业务空结果码：HTTP 2xx 但无数据，映射为 `found=false`（spec §3.3）。 */
export const TALENT_EXTERNAL_EMPTY_RESULT_CODES = [
  "NO_RESULT",
  "INFO_MISMATCH",
  "SUBJECT_NOT_FOUND",
  "NO_DATA",
] as const;

const SCOPE_SOURCE_ENV: Readonly<
  Record<TalentExternalScope, string>
> = {
  gene_query: "TALENT_GENE_QUERY_SOURCE",
  gene_report: "TALENT_GENE_REPORT_SOURCE",
  advice_version: "TALENT_ADVICE_SOURCE",
};

const SCOPE_BASE_URL_ENV: Readonly<
  Record<TalentExternalScope, string>
> = {
  gene_query: "TALENT_GENE_QUERY_BASE_URL",
  gene_report: "TALENT_GENE_REPORT_BASE_URL",
  advice_version: "TALENT_ADVICE_BASE_URL",
};

function envText(env: NodeJS.ProcessEnv, name: string): string {
  return String(env[name] ?? "").trim();
}

function envInt(
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Number.parseInt(envText(env, name), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function envFlag(
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: boolean,
): boolean {
  const raw = envText(env, name).toLowerCase();
  if (!raw) return fallback;
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  return fallback;
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

// ── 配置解析（spec §9.1；只读 env，不写 `configs`） ─────────────────────────

export interface TalentExternalConfigurationStatus {
  scope: TalentExternalScope;
  source: TalentExternalSourceKind;
  configured: boolean;
  /** 缺失的配置键名（不是值；用于启动/状态接口提示，不泄密钥）。 */
  missing: string[];
}

/** 解析某个域的源类型：默认 mock，只有显式 `external` 才切换。 */
export function resolveTalentExternalSourceKind(
  scope: TalentExternalScope,
  env: NodeJS.ProcessEnv = process.env,
): TalentExternalSourceKind {
  const raw = envText(env, SCOPE_SOURCE_ENV[scope]).toLowerCase();
  return raw === "external" ? "external" : "mock";
}

/** 解析某个域的基址：分域键优先，缺省回退 `TALENT_EXTERNAL_BASE_URL`。 */
export function resolveTalentExternalBaseUrl(
  scope: TalentExternalScope,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const scoped = envText(env, SCOPE_BASE_URL_ENV[scope]);
  const shared = envText(env, "TALENT_EXTERNAL_BASE_URL");
  return stripTrailingSlash(scoped || shared);
}

/** 配置完整性（只返回键名，不返回值）；`external` 才要求齐全。 */
export function describeTalentExternalConfiguration(
  scope: TalentExternalScope,
  env: NodeJS.ProcessEnv = process.env,
): TalentExternalConfigurationStatus {
  const source = resolveTalentExternalSourceKind(scope, env);
  const missing: string[] = [];
  if (source === "external") {
    if (!resolveTalentExternalBaseUrl(scope, env))
      missing.push(SCOPE_BASE_URL_ENV[scope]);
    if (!envText(env, "TALENT_EXTERNAL_APP_ID"))
      missing.push("TALENT_EXTERNAL_APP_ID");
    const secret = envText(env, "TALENT_EXTERNAL_API_SECRET");
    if (secret.length < 32) missing.push("TALENT_EXTERNAL_API_SECRET");
  }
  return { scope, source, configured: missing.length === 0, missing };
}

export function isTalentExternalConfigured(
  scope: TalentExternalScope,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return describeTalentExternalConfiguration(scope, env).configured;
}

/** 入站 webhook 是否启用：只依赖 `TALENT_EXTERNAL_WEBHOOK_SECRET`（spec §3.2/§9.4）。 */
export function isTalentExternalWebhookEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return Boolean(envText(env, "TALENT_EXTERNAL_WEBHOOK_SECRET"));
}

export function resolveTalentExternalWebhookSecret(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return envText(env, "TALENT_EXTERNAL_WEBHOOK_SECRET");
}

function talentExternalNotConfiguredError(
  scope: TalentExternalScope,
  missing: string[],
): ReturnType<typeof createError> {
  return createError({
    statusCode: 503,
    message: "外部服务未配置或暂不可用",
    data: {
      code: "EXTERNAL_SOURCE_UNAVAILABLE",
      scope,
      // 只给键名，便于运维定位；不返回任何密钥值。
      missing,
    },
  });
}

/** 完整配置（external 缺基址/APP_ID/SECRET → 503，不静默降级 Mock）。 */
export function resolveTalentExternalClientConfig(
  scope: TalentExternalScope,
  env: NodeJS.ProcessEnv = process.env,
): TalentExternalClientConfig {
  const status = describeTalentExternalConfiguration(scope, env);
  if (status.source !== "external")
    throw createError({
      statusCode: 503,
      message: "外部服务未启用",
      data: { code: "EXTERNAL_SOURCE_UNAVAILABLE", scope, missing: [] },
    });
  if (!status.configured)
    throw talentExternalNotConfiguredError(scope, status.missing);
  return {
    scope,
    source: "external",
    baseUrl: resolveTalentExternalBaseUrl(scope, env),
    appId: envText(env, "TALENT_EXTERNAL_APP_ID"),
    apiSecret: envText(env, "TALENT_EXTERNAL_API_SECRET"),
    apiSecretPrevious: envText(env, "TALENT_EXTERNAL_API_SECRET_PREVIOUS"),
    apiVersion:
      envText(env, "TALENT_EXTERNAL_API_VERSION") || TALENT_EXTERNAL_API_VERSION,
    webhookSecret: envText(env, "TALENT_EXTERNAL_WEBHOOK_SECRET"),
    clockSkewSeconds: envInt(
      env,
      "TALENT_EXTERNAL_CLOCK_SKEW_SECONDS",
      TALENT_EXTERNAL_DEFAULT_CLOCK_SKEW_SECONDS,
      30,
      3600,
    ),
    timeoutMs: envInt(
      env,
      "TALENT_EXTERNAL_TIMEOUT_MS",
      TALENT_EXTERNAL_DEFAULT_TIMEOUT_MS,
      1_000,
      120_000,
    ),
    retryMax: envInt(
      env,
      "TALENT_EXTERNAL_RETRY_MAX",
      TALENT_EXTERNAL_DEFAULT_RETRY_MAX,
      0,
      10,
    ),
    maxConcurrency: envInt(
      env,
      "TALENT_EXTERNAL_MAX_CONCURRENCY",
      TALENT_EXTERNAL_DEFAULT_MAX_CONCURRENCY,
      1,
      32,
    ),
    maxQps: envInt(
      env,
      "TALENT_EXTERNAL_MAX_QPS",
      TALENT_EXTERNAL_DEFAULT_MAX_QPS,
      1,
      100,
    ),
    runBudgetMs: envInt(
      env,
      "TALENT_EXTERNAL_RUN_BUDGET_MS",
      TALENT_EXTERNAL_DEFAULT_RUN_BUDGET_MS,
      10_000,
      3_600_000,
    ),
    breakerThreshold: envInt(
      env,
      "TALENT_EXTERNAL_BREAKER_THRESHOLD",
      TALENT_EXTERNAL_DEFAULT_BREAKER_THRESHOLD,
      1,
      50,
    ),
    breakerOpenMs: envInt(
      env,
      "TALENT_EXTERNAL_BREAKER_OPEN_MS",
      TALENT_EXTERNAL_DEFAULT_BREAKER_OPEN_MS,
      30_000,
      3_600_000,
    ),
    alertWebhookUrl: envText(env, "TALENT_ALERT_WEBHOOK_URL"),
    alertCooldownMs: TALENT_EXTERNAL_ALERT_COOLDOWN_MS,
  };
}

/**
 * 生产 fail-fast 规则（spec §9.4；纯函数，供 env-check 插件/测试消费）：
 * - 生产 + 任一源为 mock 且未显式 `TALENT_ALLOW_MOCK_SOURCES=1` → error；
 * - `external` 缺基址/APP_ID/API_SECRET → error；
 * - `external` 缺 WEBHOOK_SECRET → warning（只出站，不启用入站）。
 * 只返回键名/规则文本，不返回值，不打印密钥。
 */
export function evaluateTalentExternalEnvFailFast(
  env: NodeJS.ProcessEnv = process.env,
): { ok: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProd = envText(env, "NODE_ENV") === "production";
  const allowMock = envFlag(env, "TALENT_ALLOW_MOCK_SOURCES", false);

  for (const scope of [
    "gene_query",
    "gene_report",
    "advice_version",
  ] as TalentExternalScope[]) {
    const status = describeTalentExternalConfiguration(scope, env);
    if (status.source === "external") {
      if (!status.configured)
        errors.push(
          `${scope} 配置为 external 但缺少 ${status.missing.join(" / ")}`,
        );
      if (!envText(env, "TALENT_EXTERNAL_WEBHOOK_SECRET"))
        warnings.push(
          "配置为 external 但缺少 TALENT_EXTERNAL_WEBHOOK_SECRET：入站触发不可用（仅出站）",
        );
      continue;
    }
    if (isProd && !allowMock)
      errors.push(
        `生产环境不允许 ${scope} 使用 mock 源：请切换 external 或显式设置 TALENT_ALLOW_MOCK_SOURCES=1`,
      );
  }
  if (isProd && !allowMock) {
    // 三个域都是 mock 时上面会出现 3 条同类错误，补一条聚合说明（不改变 ok 判定）。
    if (errors.filter((item) => item.includes("使用 mock 源")).length > 1)
      errors.push(
        "生产环境外部集成仍为 mock 源：请核对 TALENT_*_SOURCE / TALENT_ALLOW_MOCK_SOURCES",
      );
  }
  const uniqueErrors = [...new Set(errors)];
  const uniqueWarnings = [...new Set(warnings)];
  return { ok: uniqueErrors.length === 0, errors: uniqueErrors, warnings: uniqueWarnings };
}

/** 同上的抛错版本；env-check 插件可直接调用（本任务不改插件，边界见交付说明）。 */
export function assertTalentExternalEnvFailFast(
  env: NodeJS.ProcessEnv = process.env,
): void {
  const result = evaluateTalentExternalEnvFailFast(env);
  if (!result.ok)
    throw new Error(`[env-check] 外部集成配置错误：\n- ${result.errors.join("\n- ")}`);
}

/**
 * 运行时源可用性：mock 仅允许非生产或显式放行；external 缺配置 → 503。
 * 入站触发/调度启动前调用，避免生产静默走 Mock（spec §3.10）。
 */
export function assertTalentExternalSourceAvailable(
  scope: TalentExternalScope,
  env: NodeJS.ProcessEnv = process.env,
): TalentExternalSourceKind {
  const source = resolveTalentExternalSourceKind(scope, env);
  if (source === "mock") {
    const allowMock = envFlag(env, "TALENT_ALLOW_MOCK_SOURCES", false);
    if (envText(env, "NODE_ENV") === "production" && !allowMock)
      throw createError({
        statusCode: 503,
        message: "生产环境未启用真实外部源",
        data: { code: "EXTERNAL_SOURCE_UNAVAILABLE", scope, source },
      });
    return source;
  }
  resolveTalentExternalClientConfig(scope, env);
  return source;
}

// ── HMAC canonical / 签名 / 验签（spec §3.2） ───────────────────────────────

/** sha256 十六进制；空 body 用 sha256("")。 */
export function sha256Hex(input: string | Uint8Array): string {
  return createHash("sha256").update(input).digest("hex");
}

export interface TalentExternalCanonicalInput {
  method: string;
  /** PATH_WITH_QUERY，不含 host，必须以 `/` 开头。 */
  path: string;
  timestamp: string | number;
  nonce: string;
  bodyText: string;
}

function normalizeCanonicalPath(path: string): string {
  const value = String(path ?? "").trim();
  if (!value) return "/";
  return value.startsWith("/") ? value : `/${value}`;
}

/** canonical = v1\nMETHOD\nPATH_WITH_QUERY\nTIMESTAMP\nNONCE\nsha256(body)（固定顺序）。 */
export function buildTalentExternalCanonicalString(
  input: TalentExternalCanonicalInput,
): string {
  return [
    TALENT_EXTERNAL_API_VERSION,
    String(input.method ?? "POST").toUpperCase(),
    normalizeCanonicalPath(input.path),
    String(input.timestamp ?? ""),
    String(input.nonce ?? ""),
    sha256Hex(String(input.bodyText ?? "")),
  ].join("\n");
}

/** HMAC-SHA256(secret, canonical) 的 hex（不含 `v1=` 前缀）。 */
export function computeTalentExternalSignature(
  secret: string,
  canonical: string,
): string {
  return createHmac("sha256", String(secret ?? ""))
    .update(String(canonical ?? ""))
    .digest("hex");
}

/** 请求头签名值：`v1=<hex>`。 */
export function formatTalentExternalSignature(hex: string): string {
  return `v1=${hex}`;
}

/** 直接由输入生成 `X-Talent-Signature` 值。 */
export function signTalentExternalRequest(
  secret: string,
  input: TalentExternalCanonicalInput,
): string {
  return formatTalentExternalSignature(
    computeTalentExternalSignature(
      secret,
      buildTalentExternalCanonicalString(input),
    ),
  );
}

export type TalentExternalVerifyResult =
  | { ok: true; canonical: string; signature: string }
  | { ok: false; reason: "signature" | "expired" };

export interface VerifyTalentExternalSignatureInput
  extends TalentExternalCanonicalInput {
  secret: string;
  signature: string;
  /** 时钟偏差上限（秒）；默认 300。 */
  clockSkewSeconds?: number;
  now?: Date;
}

function safeEqualHex(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(String(left ?? ""), "utf8");
  const rightBuffer = Buffer.from(String(right ?? ""), "utf8");
  if (leftBuffer.length !== rightBuffer.length || leftBuffer.length === 0)
    return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

/**
 * 验签（出站自测与入站共用）：先校验时间窗（Unix 秒，双向偏差 ≤ skew），
 * 再 `timingSafeEqual` 比较；失败只返回原因，不回显期望签名。
 */
export function verifyTalentExternalSignature(
  input: VerifyTalentExternalSignatureInput,
): TalentExternalVerifyResult {
  const skew = Math.max(1, Number(input.clockSkewSeconds ?? 300));
  const timestamp = Number(String(input.timestamp ?? "").trim());
  if (!Number.isFinite(timestamp)) return { ok: false, reason: "expired" };
  const nowSeconds = Math.floor((input.now ?? new Date()).getTime() / 1000);
  if (Math.abs(nowSeconds - timestamp) > skew)
    return { ok: false, reason: "expired" };
  const canonical = buildTalentExternalCanonicalString(input);
  const expected = formatTalentExternalSignature(
    computeTalentExternalSignature(input.secret, canonical),
  );
  const received = String(input.signature ?? "").trim();
  if (!safeEqualHex(received, expected))
    return { ok: false, reason: "signature" };
  return { ok: true, canonical, signature: expected };
}

// ── nonce 重放缓存（进程内；单实例重启清零，spec §3.2/§3.8） ────────────────

export interface TalentExternalNonceCache {
  /** 首次出现返回 true 并记入；已出现返回 false（重放）。 */
  use(key: string): boolean;
  has(key: string): boolean;
  size(): number;
  clear(): void;
}

export interface TalentExternalNonceCacheOptions {
  ttlMs?: number;
  maxEntries?: number;
  now?: () => number;
}

/** 进程内 TTL + 容量上限的 nonce/事件去重缓存（不落库）。 */
export function createTalentExternalNonceCache(
  options: TalentExternalNonceCacheOptions = {},
): TalentExternalNonceCache {
  const ttlMs = Math.max(1_000, options.ttlMs ?? TALENT_EXTERNAL_NONCE_TTL_MS);
  const maxEntries = Math.max(1, options.maxEntries ?? 10_000);
  const now = options.now ?? (() => Date.now());
  const entries = new Map<string, number>();

  const purge = (): void => {
    const at = now();
    for (const [key, expiresAt] of entries) {
      if (expiresAt <= at) entries.delete(key);
    }
    while (entries.size >= maxEntries) {
      const oldest = entries.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      entries.delete(oldest);
    }
  };

  return {
    use(key: string): boolean {
      const normalized = String(key ?? "").trim();
      if (!normalized) return false;
      purge();
      if (entries.has(normalized)) return false;
      entries.set(normalized, now() + ttlMs);
      return true;
    },
    has(key: string): boolean {
      purge();
      return entries.has(String(key ?? "").trim());
    },
    size(): number {
      purge();
      return entries.size;
    },
    clear(): void {
      entries.clear();
    },
  };
}

// ── 错误分类 / 脱敏摘要（spec §3.3/§4.4） ──────────────────────────────────

export interface TalentExternalFailureInput {
  /** transport=网络/超时；http=非 2xx；parse=2xx 但 JSON 非法。 */
  kind: "transport" | "http" | "parse";
  status?: number;
  /** 429/503 的 Retry-After（毫秒）。 */
  retryAfterMs?: number;
  /** 对方业务码（仅用于分类，不写日志原文）。 */
  code?: string;
  message?: string;
}

function retryAfterWithinCap(value?: number): number | undefined {
  if (!Number.isFinite(Number(value))) return undefined;
  const ms = Math.max(0, Number(value));
  return Math.min(ms, TALENT_EXTERNAL_RETRY_AFTER_MAX_MS);
}

/** 把传输/HTTP/解析失败映射为统一分类（是否重试、是否中止本批）。 */
export function classifyTalentExternalFailure(
  input: TalentExternalFailureInput,
): TalentExternalFailureInfo {
  if (input.kind === "transport") {
    const text = String(input.message ?? "").toLowerCase();
    const isTimeout =
      text.includes("timeout") || text.includes("超时") || text.includes("abort");
    return isTimeout
      ? { class: "timeout", retryable: true, abortBatch: false }
      : { class: "connection", retryable: true, abortBatch: false };
  }
  if (input.kind === "parse")
    return { class: "parse", retryable: false, abortBatch: false };
  const status = Number(input.status ?? 0);
  const retryAfterMs = retryAfterWithinCap(input.retryAfterMs);
  if (status === 401 || status === 403)
    return { class: "auth", retryable: false, abortBatch: true };
  if (status === 408)
    return { class: "timeout", retryable: true, abortBatch: false };
  if (status === 429)
    return {
      class: "rate_limited",
      retryable: true,
      abortBatch: false,
      ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
    };
  if (status === 404)
    return { class: "not_found", retryable: false, abortBatch: false };
  if (status >= 500)
    return {
      class: "http_5xx",
      retryable: true,
      abortBatch: false,
      ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
    };
  if (status >= 400) return { class: "http_4xx", retryable: false, abortBatch: false };
  return { class: "business", retryable: false, abortBatch: false };
}

/** 从响应头解析 Retry-After（秒或 HTTP 日期都不做复杂解析，秒为主）。 */
export function parseTalentExternalRetryAfterMs(
  headers: Record<string, string> | undefined,
): number | undefined {
  if (!headers) return undefined;
  const raw = String(
    headers["retry-after"] ?? headers["Retry-After"] ?? "",
  ).trim();
  if (!raw) return undefined;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0)
    return retryAfterWithinCap(seconds * 1000);
  return undefined;
}

/** 摘要脱敏：折叠空白、替换身份证/手机号/Bearer、截断（spec §3.3 ≤200 字）。 */
export function sanitizeTalentExternalText(
  text: unknown,
  maxLength = 200,
): string {
  let value =
    typeof text === "string"
      ? text
      : text instanceof Error
        ? text.message
        : String(text ?? "");
  value = value.replace(/\s+/g, " ").trim();
  value = value.replace(/(?<!\d)\d{17}[\dXx](?!\d)/g, "***");
  value = value.replace(/(?<!\d)1[3-9]\d{9}(?!\d)/g, "***");
  value = value.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer ***");
  value = value.replace(/(?:v1=)?[a-f0-9]{64}/gi, "***");
  value = value.replace(
    /(?:api[_-]?secret|secret|token)\s*[:=]\s*\S+/gi,
    "***",
  );
  return (value || "外部服务异常").slice(0, Math.max(1, maxLength));
}

// ── 退避（spec §4.4） ──────────────────────────────────────────────────────

export interface TalentExternalBackoffOptions {
  baseMs?: number;
  factor?: number;
  maxMs?: number;
  jitterRatio?: number;
  random?: () => number;
}

/** attempt 从 1 开始：1s → 4s → 16s（±20% jitter）；429 优先 Retry-After（≤60s）。 */
export function computeTalentExternalBackoffMs(
  attempt: number,
  options: TalentExternalBackoffOptions = {},
  retryAfterMs?: number,
): number {
  if (Number.isFinite(Number(retryAfterMs)))
    return Math.min(
      TALENT_EXTERNAL_RETRY_AFTER_MAX_MS,
      Math.max(0, Number(retryAfterMs)),
    );
  const base = Math.max(1, options.baseMs ?? TALENT_EXTERNAL_BACKOFF_BASE_MS);
  const factor = Math.max(1, options.factor ?? TALENT_EXTERNAL_BACKOFF_FACTOR);
  const maxMs = Math.max(base, options.maxMs ?? TALENT_EXTERNAL_BACKOFF_MAX_MS);
  const ratio = Math.min(
    1,
    Math.max(0, options.jitterRatio ?? TALENT_EXTERNAL_BACKOFF_JITTER_RATIO),
  );
  const random = options.random ?? Math.random;
  const exponential = Math.min(
    maxMs,
    base * factor ** Math.max(0, Math.floor(attempt) - 1),
  );
  const jitter = exponential * ratio * (random() * 2 - 1);
  return Math.max(0, Math.round(exponential + jitter));
}

// ── 限流：QPS 令牌桶 + 并发闸（进程内；单实例，spec §3.9/§4.5） ────────────

export interface TalentExternalRateLimiterOptions {
  maxQps: number;
  maxConcurrency: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export interface TalentExternalRateLimiter {
  acquire(): Promise<void>;
  tryAcquire(): boolean;
  release(): void;
  snapshot(): { maxQps: number; maxConcurrency: number; active: number; tokens: number };
  reset(): void;
}

export function createTalentExternalRateLimiter(
  options: TalentExternalRateLimiterOptions,
): TalentExternalRateLimiter {
  const maxQps = Math.max(1, Math.floor(options.maxQps));
  const maxConcurrency = Math.max(1, Math.floor(options.maxConcurrency));
  const now = options.now ?? (() => Date.now());
  const sleep =
    options.sleep ??
    ((ms: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, Math.max(1, ms))));
  let tokens = maxQps;
  let lastRefillAt = now();
  let active = 0;

  const refill = (): void => {
    const at = now();
    const elapsed = Math.max(0, at - lastRefillAt);
    if (elapsed > 0) {
      tokens = Math.min(maxQps, tokens + (elapsed * maxQps) / 1000);
      lastRefillAt = at;
    }
  };

  const limiter: TalentExternalRateLimiter = {
    async acquire(): Promise<void> {
      for (;;) {
        if (limiter.tryAcquire()) return;
        const at = now();
        const missing = Math.max(0, 1 - tokens);
        const waitMs =
          active >= maxConcurrency
            ? 20
            : Math.max(20, Math.ceil((missing / maxQps) * 1000));
        await sleep(Math.min(250, waitMs));
        // 保证假时钟下也能前进（测试注入 sleep 推进时间）。
        if (now() === at) lastRefillAt = at - 1;
      }
    },
    tryAcquire(): boolean {
      refill();
      if (active >= maxConcurrency) return false;
      if (tokens < 1) return false;
      tokens -= 1;
      active += 1;
      return true;
    },
    release(): void {
      if (active > 0) active -= 1;
    },
    snapshot() {
      return { maxQps, maxConcurrency, active, tokens };
    },
    reset(): void {
      tokens = maxQps;
      lastRefillAt = now();
      active = 0;
    },
  };
  return limiter;
}

// ── 熔断（spec §4.5：连续源级失败阈值 → 打开 15min → 半开探 1 个） ─────────

export interface TalentExternalCircuitBreaker {
  allowRequest(): boolean;
  recordSuccess(): void;
  recordFailure(): void;
  snapshot(): { state: TalentExternalCircuitState; failures: number; openUntil: string };
  reset(): void;
}

export interface TalentExternalCircuitBreakerOptions {
  threshold?: number;
  openMs?: number;
  now?: () => number;
}

export function createTalentExternalCircuitBreaker(
  options: TalentExternalCircuitBreakerOptions = {},
): TalentExternalCircuitBreaker {
  const threshold = Math.max(
    1,
    options.threshold ?? TALENT_EXTERNAL_DEFAULT_BREAKER_THRESHOLD,
  );
  const openMs = Math.max(
    1_000,
    options.openMs ?? TALENT_EXTERNAL_DEFAULT_BREAKER_OPEN_MS,
  );
  const now = options.now ?? (() => Date.now());
  let state: TalentExternalCircuitState = "closed";
  let failures = 0;
  let openUntil = 0;
  let probing = false;

  const toIso = (ms: number): string =>
    ms > 0 ? new Date(ms).toISOString() : "";

  const breaker: TalentExternalCircuitBreaker = {
    allowRequest(): boolean {
      if (state === "closed") return true;
      if (state === "half_open") {
        if (probing) return false;
        probing = true;
        return true;
      }
      // open
      if (now() >= openUntil) {
        state = "half_open";
        probing = true;
        return true;
      }
      return false;
    },
    recordSuccess(): void {
      state = "closed";
      failures = 0;
      openUntil = 0;
      probing = false;
    },
    recordFailure(): void {
      if (state === "half_open") {
        state = "open";
        openUntil = now() + openMs;
        probing = false;
        return;
      }
      failures += 1;
      if (failures >= threshold) {
        state = "open";
        openUntil = now() + openMs;
      }
    },
    snapshot() {
      if (state === "open" && now() >= openUntil) {
        state = "half_open";
        probing = false;
      }
      return { state, failures, openUntil: toIso(openUntil) };
    },
    reset(): void {
      state = "closed";
      failures = 0;
      openUntil = 0;
      probing = false;
    },
  };
  return breaker;
}

// ── 指标（spec §8.5；不引入 Prometheus，进程内计数） ────────────────────────

export interface TalentExternalMetrics {
  recordRequest(): void;
  recordSuccess(latencyMs: number): void;
  recordFailure(
    failureClass: TalentExternalErrorClass,
    latencyMs: number,
  ): void;
  recordRetry(): void;
  recordCircuitOpen(): void;
  recordAlert(): void;
  snapshot(): TalentExternalMetricsSnapshot;
  reset(): void;
}

export function createTalentExternalMetrics(): TalentExternalMetrics {
  let requests = 0;
  let successes = 0;
  let failures = 0;
  let retries = 0;
  let circuitOpen = 0;
  let alerts = 0;
  let lastLatencyMs = 0;
  let totalLatencyMs = 0;
  let failureByClass: Partial<Record<TalentExternalErrorClass, number>> = {};

  return {
    recordRequest() {
      requests += 1;
    },
    recordSuccess(latencyMs: number) {
      successes += 1;
      lastLatencyMs = Math.max(0, Math.round(latencyMs));
      totalLatencyMs += lastLatencyMs;
    },
    recordFailure(failureClass, latencyMs) {
      failures += 1;
      lastLatencyMs = Math.max(0, Math.round(latencyMs));
      totalLatencyMs += lastLatencyMs;
      failureByClass[failureClass] =
        (failureByClass[failureClass] ?? 0) + 1;
    },
    recordRetry() {
      retries += 1;
    },
    recordCircuitOpen() {
      circuitOpen += 1;
    },
    recordAlert() {
      alerts += 1;
    },
    snapshot(): TalentExternalMetricsSnapshot {
      return {
        requests,
        successes,
        failures,
        retries,
        circuitOpen,
        alerts,
        lastLatencyMs,
        totalLatencyMs,
        failureByClass: { ...failureByClass },
      };
    },
    reset() {
      requests = 0;
      successes = 0;
      failures = 0;
      retries = 0;
      circuitOpen = 0;
      alerts = 0;
      lastLatencyMs = 0;
      totalLatencyMs = 0;
      failureByClass = {};
    },
  };
}

// ── 告警钩子（spec §4.7/§5.5/ADR 0008-D6） ────────────────────────────────

export interface TalentExternalAlertSink {
  (event: TalentExternalAlertEvent): void | Promise<void>;
}

export interface TalentExternalAlerter {
  notify(event: TalentExternalAlertEvent): Promise<boolean>;
  snapshot(): { lastAt: string; lastRule: string; total: number };
  reset(): void;
}

export interface TalentExternalAlerterOptions {
  webhookUrl?: string;
  now?: () => number;
  cooldownMs?: number;
  /** 测试注入；默认 globalThis.fetch。 */
  fetchImpl?: (
    url: string,
    init: { method: string; headers: Record<string, string>; body: string },
  ) => Promise<{ ok?: boolean; status?: number }>;
  /** 未配置 webhook 时的落点（默认 console.warn；运行时由调用方接 error_logs）。 */
  sink?: TalentExternalAlertSink;
  metrics?: TalentExternalMetrics;
}

/**
 * 通用告警 webhook（兼容企业微信/飞书机器人）+ 冷却；未配置时只走 sink。
 * 载荷白名单由 `TalentExternalAlertEvent` 结构保证，不含 PII/密钥/外部报文。
 */
export function createTalentExternalAlerter(
  options: TalentExternalAlerterOptions = {},
): TalentExternalAlerter {
  const now = options.now ?? (() => Date.now());
  const cooldownMs = Math.max(0, options.cooldownMs ?? TALENT_EXTERNAL_ALERT_COOLDOWN_MS);
  const lastNotified = new Map<string, number>();
  let lastAt = "";
  let lastRule = "";
  let total = 0;

  const defaultSink: TalentExternalAlertSink = (event) => {
    console.warn(
      `[talent-external][alert] ${event.level} ${event.rule} scope=${event.scope} at=${event.at}`,
    );
  };
  const sink = options.sink ?? defaultSink;

  return {
    async notify(event: TalentExternalAlertEvent): Promise<boolean> {
      const key = `${event.scope}:${event.rule}`;
      const at = now();
      const previous = lastNotified.get(key);
      if (previous !== undefined && at - previous < cooldownMs) return false;
      lastNotified.set(key, at);
      lastAt = new Date(at).toISOString();
      lastRule = event.rule;
      total += 1;
      options.metrics?.recordAlert();
      const payload: TalentExternalAlertEvent = {
        rule: event.rule,
        scope: event.scope,
        level: event.level,
        at: lastAt,
        ...(event.window ? { window: event.window } : {}),
        ...(event.counts ? { counts: event.counts } : {}),
        ...(event.lastSuccessAt ? { lastSuccessAt: event.lastSuccessAt } : {}),
        ...(event.requestId ? { requestId: event.requestId } : {}),
      };
      const body = JSON.stringify(payload);
      const webhookUrl = String(options.webhookUrl ?? "").trim();
      if (webhookUrl) {
        try {
          const fetchImpl =
            options.fetchImpl ??
            ((url: string, init: { method: string; headers: Record<string, string>; body: string }) =>
              (globalThis.fetch as unknown as TalentExternalFetchLike)(url, init));
          await fetchImpl(webhookUrl, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body,
          });
        } catch {
          // 告警通道失败不影响主流程，落 sink 留痕。
          try {
            await sink(payload);
          } catch {
            /* ignore */
          }
        }
        return true;
      }
      try {
        await sink(payload);
      } catch {
        /* 告警 sink 失败不影响主流程 */
      }
      return true;
    },
    snapshot() {
      return { lastAt, lastRule, total };
    },
    reset(): void {
      lastNotified.clear();
      lastAt = "";
      lastRule = "";
      total = 0;
    },
  };
}

// ── 传输实现：fetch + 超时（可注入；默认单进程复用） ────────────────────────

export interface TalentExternalFetchResponseLike {
  status: number;
  headers: { forEach(callback: (value: string, name: string) => void): void };
  text(): Promise<string>;
}

export type TalentExternalFetchLike = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
    signal?: AbortSignal;
  },
) => Promise<TalentExternalFetchResponseLike>;

/** 传输层错误：kind 用于分类（超时/连接失败）。 */
export class TalentExternalTransportError extends Error {
  readonly kind: "timeout" | "connection";
  constructor(kind: "timeout" | "connection", message: string) {
    super(message);
    this.name = "TalentExternalTransportError";
    this.kind = kind;
  }
}

/** 默认 fetch 传输：`AbortController` 实现单请求超时，不重建客户端。 */
export function createFetchTalentExternalTransport(
  fetchImpl?: TalentExternalFetchLike,
): TalentExternalTransport {
  const doFetch: TalentExternalFetchLike =
    fetchImpl ??
    ((url, init) =>
      (globalThis.fetch as unknown as TalentExternalFetchLike)(url, init));
  return {
    async send(
      request: TalentExternalTransportRequest,
    ): Promise<TalentExternalTransportResponse> {
      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(),
        Math.max(1, request.timeoutMs),
      );
      const handle = timer as unknown as { unref?: () => void };
      if (typeof handle.unref === "function") handle.unref();
      try {
        const response = await doFetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.bodyText,
          signal: controller.signal,
        });
        const headers: Record<string, string> = {};
        response.headers.forEach((value, name) => {
          headers[String(name).toLowerCase()] = String(value);
        });
        return {
          status: Number(response.status) || 0,
          headers,
          bodyText: await response.text(),
        };
      } catch (error) {
        if (controller.signal.aborted)
          throw new TalentExternalTransportError("timeout", "外部请求超时");
        const message =
          error instanceof Error ? error.message : "外部连接失败";
        if (/abort|timeout/i.test(message))
          throw new TalentExternalTransportError("timeout", "外部请求超时");
        throw new TalentExternalTransportError("connection", "外部连接失败");
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

// ── 运行态（状态接口 / 熔断 / 告警共用；进程内单实例） ──────────────────────

interface MutableScopeRuntime {
  lastRequestAt: number;
  lastSuccessAt: number;
  lastFailureAt: number;
  lastError: TalentExternalLastError | null;
  consecutiveFailures: number;
  authBlockedUntil: number;
  reserved: number;
}

const scopeRuntimes = new Map<TalentExternalScope, MutableScopeRuntime>();
const sharedBreakers = new Map<TalentExternalScope, TalentExternalCircuitBreaker>();
const sharedLimiters = new Map<TalentExternalScope, TalentExternalRateLimiter>();
const sharedMetrics = new Map<TalentExternalScope, TalentExternalMetrics>();
const sharedAlerters = new Map<TalentExternalScope, TalentExternalAlerter>();

interface WebhookRuntimeState {
  lastEventAt: number;
  lastError: TalentExternalLastError | null;
}
const webhookRuntime: WebhookRuntimeState = { lastEventAt: 0, lastError: null };

function runtimeFor(scope: TalentExternalScope): MutableScopeRuntime {
  let runtime = scopeRuntimes.get(scope);
  if (!runtime) {
    runtime = {
      lastRequestAt: 0,
      lastSuccessAt: 0,
      lastFailureAt: 0,
      lastError: null,
      consecutiveFailures: 0,
      authBlockedUntil: 0,
      reserved: 0,
    };
    scopeRuntimes.set(scope, runtime);
  }
  return runtime;
}

function isoOrEmpty(ms: number): string {
  return ms > 0 ? new Date(ms).toISOString() : "";
}

/** 清空运行态（新批次开始时调用；单实例重启同样清零）。 */
export function resetTalentExternalRuntime(
  scope?: TalentExternalScope,
): void {
  if (scope === undefined) {
    for (const runtime of scopeRuntimes.values()) {
      runtime.lastRequestAt = 0;
      runtime.lastSuccessAt = 0;
      runtime.lastFailureAt = 0;
      runtime.lastError = null;
      runtime.consecutiveFailures = 0;
      runtime.authBlockedUntil = 0;
    }
    for (const breaker of sharedBreakers.values()) breaker.reset();
    for (const limiter of sharedLimiters.values()) limiter.reset();
    for (const metrics of sharedMetrics.values()) metrics.reset();
    for (const alerter of sharedAlerters.values()) alerter.reset();
    webhookRuntime.lastEventAt = 0;
    webhookRuntime.lastError = null;
    return;
  }
  const runtime = runtimeFor(scope);
  runtime.lastRequestAt = 0;
  runtime.lastSuccessAt = 0;
  runtime.lastFailureAt = 0;
  runtime.lastError = null;
  runtime.consecutiveFailures = 0;
  runtime.authBlockedUntil = 0;
  sharedBreakers.get(scope)?.reset();
  sharedLimiters.get(scope)?.reset();
  sharedMetrics.get(scope)?.reset();
  sharedAlerters.get(scope)?.reset();
}

/** 状态接口读模型（不含密钥/基址/PII）。 */
export function getTalentExternalRuntimeSnapshot(
  scope: TalentExternalScope,
): TalentExternalRuntimeSnapshot {
  const runtime = runtimeFor(scope);
  const breaker = sharedBreakers.get(scope)?.snapshot() ?? {
    state: "closed" as TalentExternalCircuitState,
    failures: 0,
    openUntil: "",
  };
  const metrics = sharedMetrics.get(scope)?.snapshot() ?? {
    requests: 0,
    successes: 0,
    failures: 0,
    retries: 0,
    circuitOpen: 0,
    alerts: 0,
    lastLatencyMs: 0,
    totalLatencyMs: 0,
    failureByClass: {},
  };
  return {
    scope,
    lastRequestAt: isoOrEmpty(runtime.lastRequestAt),
    lastSuccessAt: isoOrEmpty(runtime.lastSuccessAt),
    lastFailureAt: isoOrEmpty(runtime.lastFailureAt),
    lastError: runtime.lastError ? { ...runtime.lastError } : null,
    consecutiveFailures: runtime.consecutiveFailures,
    circuitState: breaker.state,
    circuitOpenUntil: breaker.openUntil,
    authBlocked: runtime.authBlockedUntil > Date.now(),
    metrics,
  };
}

/** 入站 webhook 运行态（状态接口 `webhook` 段）。 */
export function markTalentWebhookEvent(
  at: Date = new Date(),
): void {
  webhookRuntime.lastEventAt = at.getTime();
}

export function markTalentWebhookError(
  failureClass: TalentExternalErrorClass,
  message: unknown,
  requestId?: string,
): void {
  webhookRuntime.lastError = {
    at: new Date().toISOString(),
    class: failureClass,
    message: sanitizeTalentExternalText(message),
    ...(requestId ? { requestId } : {}),
  };
}

export function getTalentWebhookRuntimeSnapshot(): {
  lastEventAt: string;
  lastError: TalentExternalLastError | null;
} {
  return {
    lastEventAt: isoOrEmpty(webhookRuntime.lastEventAt),
    lastError: webhookRuntime.lastError ? { ...webhookRuntime.lastError } : null,
  };
}

function getSharedBreaker(
  scope: TalentExternalScope,
  config: TalentExternalClientConfig,
): TalentExternalCircuitBreaker {
  let breaker = sharedBreakers.get(scope);
  if (!breaker) {
    breaker = createTalentExternalCircuitBreaker({
      threshold: config.breakerThreshold,
      openMs: config.breakerOpenMs,
    });
    sharedBreakers.set(scope, breaker);
  }
  return breaker;
}

function getSharedLimiter(
  scope: TalentExternalScope,
  config: TalentExternalClientConfig,
): TalentExternalRateLimiter {
  let limiter = sharedLimiters.get(scope);
  if (!limiter) {
    limiter = createTalentExternalRateLimiter({
      maxQps: config.maxQps,
      maxConcurrency: config.maxConcurrency,
    });
    sharedLimiters.set(scope, limiter);
  }
  return limiter;
}

function getSharedMetrics(scope: TalentExternalScope): TalentExternalMetrics {
  let metrics = sharedMetrics.get(scope);
  if (!metrics) {
    metrics = createTalentExternalMetrics();
    sharedMetrics.set(scope, metrics);
  }
  return metrics;
}

function getSharedAlerter(
  scope: TalentExternalScope,
  config: TalentExternalClientConfig,
  metrics: TalentExternalMetrics,
): TalentExternalAlerter {
  let alerter = sharedAlerters.get(scope);
  if (!alerter) {
    alerter = createTalentExternalAlerter({
      webhookUrl: config.alertWebhookUrl,
      cooldownMs: config.alertCooldownMs,
      metrics,
    });
    sharedAlerters.set(scope, alerter);
  }
  return alerter;
}

// ── 客户端 ─────────────────────────────────────────────────────────────────

/** 传输/业务失败：消息已脱敏，携带分类供调用方/日志使用（不暴露原始报文）。 */
export class TalentExternalCallError extends Error {
  readonly scope: TalentExternalScope;
  readonly class: TalentExternalErrorClass;
  readonly retryable: boolean;
  readonly abortBatch: boolean;
  readonly requestId: string;
  readonly attempts: number;
  readonly status?: number;

  constructor(input: {
    scope: TalentExternalScope;
    failure: TalentExternalFailureInfo;
    message: string;
    requestId: string;
    attempts: number;
    status?: number;
  }) {
    super(sanitizeTalentExternalText(input.message));
    this.name = "TalentExternalCallError";
    this.scope = input.scope;
    this.class = input.failure.class;
    this.retryable = input.failure.retryable;
    this.abortBatch = input.failure.abortBatch;
    this.requestId = input.requestId;
    this.attempts = input.attempts;
    if (input.status !== undefined) this.status = input.status;
  }
}

export function isTalentExternalCallError(
  error: unknown,
): error is TalentExternalCallError {
  return error instanceof TalentExternalCallError;
}

export interface TalentExternalRequestOptions {
  /** PATH_WITH_QUERY（不含 host），如 `/v1/gene-reports/query`。 */
  path: string;
  body?: unknown;
  /** 幂等键（spec §3.8）；缺省按 scope+path+requestId 生成。 */
  idempotencyKey?: string;
  /** 重试次数覆盖（单对象级）。 */
  retryMax?: number;
  allowEmpty?: boolean;
  requestId?: string;
}

export interface TalentExternalClient {
  readonly scope: TalentExternalScope;
  readonly config: TalentExternalClientConfig;
  request<T>(options: TalentExternalRequestOptions): Promise<TalentExternalCallResult<T>>;
  runtime(): TalentExternalRuntimeSnapshot;
  metrics(): TalentExternalMetricsSnapshot;
  reset(): void;
}

export interface TalentExternalClientOptions {
  scope?: TalentExternalScope;
  env?: NodeJS.ProcessEnv;
  config?: TalentExternalClientConfig;
  transport?: TalentExternalTransport;
  circuitBreaker?: TalentExternalCircuitBreaker;
  rateLimiter?: TalentExternalRateLimiter;
  metrics?: TalentExternalMetrics;
  alerter?: TalentExternalAlerter;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

interface EnvelopeLike {
  code?: string | number | null;
  message?: string;
  requestId?: string;
  data?: unknown;
}

function isSuccessCode(code: EnvelopeLike["code"]): boolean {
  if (code === undefined || code === null) return true;
  const text = String(code).trim();
  return text === "" || text === "OK" || text === "0" || text === "SUCCESS";
}

function isTalentExternalEmptyResultCode(code: unknown): boolean {
  const text = String(code ?? "").trim().toUpperCase();
  return (TALENT_EXTERNAL_EMPTY_RESULT_CODES as readonly string[]).includes(text);
}

function buildRequestId(): string {
  const bytes = randomBytes(8);
  return `req_${bytes.toString("hex")}`;
}

function buildNonce(): string {
  const bytes = randomBytes(16);
  return bytes.toString("hex");
}

/** 生成 `X-Talent-Request-Id`：`req_` + 16 位随机十六进制（spec §3.1）。 */
export function createTalentExternalRequestId(): string {
  return buildRequestId();
}

/** 幂等键：默认 `sha256(scope:path:requestId)`；调用方也可显式传入（spec §3.8）。 */
export function buildTalentExternalIdempotencyKey(
  scope: TalentExternalScope,
  path: string,
  requestId: string,
): string {
  return createHash("sha256")
    .update(`${scope}:${normalizeCanonicalPath(path)}:${requestId}`)
    .digest("hex");
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, Math.max(1, ms));
    const handle = timer as unknown as { unref?: () => void };
    if (typeof handle.unref === "function") handle.unref();
  });
}

/**
 * 创建可注入 transport 的外部传输客户端：签名、时间窗自洽、重试退避、限流、熔断、
 * 指标、告警钩子集中在此；业务层只调用 `request<T>()` 并消费 `data`。
 */
export function createTalentExternalClient(
  options: TalentExternalClientOptions = {},
): TalentExternalClient {
  const env = options.env ?? process.env;
  const scope = options.scope ?? "gene_report";
  const config: TalentExternalClientConfig =
    options.config ?? resolveTalentExternalClientConfig(scope, env);
  const transport = options.transport ?? createFetchTalentExternalTransport();
  const breaker = options.circuitBreaker ?? getSharedBreaker(scope, config);
  const limiter = options.rateLimiter ?? getSharedLimiter(scope, config);
  const metrics = options.metrics ?? getSharedMetrics(scope);
  const alerter =
    options.alerter ?? getSharedAlerter(scope, config, metrics);
  const now = options.now ?? (() => new Date());
  const sleep = options.sleep ?? defaultSleep;
  const random = options.random ?? Math.random;
  const runtime = runtimeFor(scope);

  const authBlocked = (): boolean => runtime.authBlockedUntil > now().getTime();

  const recordFailure = (
    failure: TalentExternalFailureInfo,
    message: string,
    requestId: string,
    latencyMs: number,
  ): TalentExternalLastError => {
    const at = now().toISOString();
    runtime.lastFailureAt = now().getTime();
    runtime.consecutiveFailures += 1;
    const lastError: TalentExternalLastError = {
      at,
      class: failure.class,
      message: sanitizeTalentExternalText(message),
      requestId,
    };
    runtime.lastError = lastError;
    metrics.recordFailure(failure.class, latencyMs);
    return lastError;
  };

  const recordSuccess = (latencyMs: number): void => {
    runtime.lastSuccessAt = now().getTime();
    runtime.consecutiveFailures = 0;
    metrics.recordSuccess(latencyMs);
    breaker.recordSuccess();
  };

  const shouldTripBreaker = (failure: TalentExternalFailureInfo): boolean =>
    ["timeout", "connection", "rate_limited", "http_5xx"].includes(
      failure.class,
    );

  const fail = async (
    failure: TalentExternalFailureInfo,
    message: string,
    requestId: string,
    attempts: number,
    latencyMs: number,
    status?: number,
  ): Promise<never> => {
    recordFailure(failure, message, requestId, latencyMs);
    if (shouldTripBreaker(failure)) breaker.recordFailure();
    if (failure.class === "auth") {
      runtime.authBlockedUntil = now().getTime() + TALENT_EXTERNAL_AUTH_BLOCK_MS;
      await alerter.notify({
        rule: "auth_failed",
        scope,
        level: "P1",
        at: now().toISOString(),
        counts: { attempts },
        requestId,
      });
    }
    const breakerSnapshot = breaker.snapshot();
    if (breakerSnapshot.state === "open") {
      metrics.recordCircuitOpen();
      await alerter.notify({
        rule: "circuit_open",
        scope,
        level: "P2",
        at: now().toISOString(),
        counts: { failures: breakerSnapshot.failures },
        requestId,
      });
    }
    throw new TalentExternalCallError({
      scope,
      failure,
      message,
      requestId,
      attempts,
      ...(status !== undefined ? { status } : {}),
    });
  };

  const client: TalentExternalClient = {
    scope,
    config,
    async request<T>(
      input: TalentExternalRequestOptions,
    ): Promise<TalentExternalCallResult<T>> {
      if (authBlocked()) {
        const failure: TalentExternalFailureInfo = {
          class: "auth",
          retryable: false,
          abortBatch: true,
        };
        throw new TalentExternalCallError({
          scope,
          failure,
          message: "外部服务鉴权失败，已暂停请求",
          requestId: input.requestId ?? buildRequestId(),
          attempts: 0,
        });
      }
      const requestId = input.requestId ?? buildRequestId();
      const path = normalizeCanonicalPath(input.path);
      const idempotencyKey =
        input.idempotencyKey ??
        buildTalentExternalIdempotencyKey(scope, path, requestId);
      const bodyText = JSON.stringify(input.body ?? {});
      const maxAttempts = Math.max(
        1,
        Math.floor(input.retryMax ?? config.retryMax) + 1,
      );
      const startedAt = Date.now();
      let attempts = 0;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        if (!breaker.allowRequest()) {
          const failure: TalentExternalFailureInfo = {
            class: "circuit_open",
            retryable: false,
            abortBatch: false,
          };
          metrics.recordCircuitOpen();
          await alerter.notify({
            rule: "circuit_open",
            scope,
            level: "P2",
            at: now().toISOString(),
            requestId,
          });
          throw new TalentExternalCallError({
            scope,
            failure,
            message: "外部服务熔断中，暂停请求",
            requestId,
            attempts,
          });
        }
        await limiter.acquire();
        attempts = attempt;
        runtime.lastRequestAt = now().getTime();
        metrics.recordRequest();
        const timestamp = String(Math.floor(now().getTime() / 1000));
        const nonce = buildNonce();
        const canonical = buildTalentExternalCanonicalString({
          method: "POST",
          path,
          timestamp,
          nonce,
          bodyText,
        });
        const headers: Record<string, string> = {
          "content-type": "application/json; charset=utf-8",
          accept: "application/json",
          "x-talent-app-id": config.appId,
          "x-talent-timestamp": timestamp,
          "x-talent-nonce": nonce,
          "x-talent-signature": formatTalentExternalSignature(
            computeTalentExternalSignature(config.apiSecret, canonical),
          ),
          "x-talent-request-id": requestId,
          "idempotency-key": idempotencyKey,
        };
        const url = `${stripTrailingSlash(config.baseUrl)}${path}`;
        const attemptStartedAt = Date.now();
        let response: TalentExternalTransportResponse | null = null;
        let failure: TalentExternalFailureInfo | null = null;
        let failureMessage = "";
        try {
          response = await transport.send({
            method: "POST",
            url,
            headers,
            bodyText,
            timeoutMs: config.timeoutMs,
          });
        } catch (error) {
          const isTimeout =
            error instanceof TalentExternalTransportError &&
            error.kind === "timeout";
          failure = classifyTalentExternalFailure({
            kind: "transport",
            message: isTimeout ? "timeout" : "connection",
          });
          failureMessage = isTimeout ? "外部请求超时" : "外部连接失败";
        } finally {
          limiter.release();
        }
        const latencyMs = Date.now() - attemptStartedAt;

        if (response) {
          if (response.status >= 200 && response.status < 300) {
            let envelope: EnvelopeLike | null = null;
            try {
              envelope = JSON.parse(response.bodyText || "{}") as EnvelopeLike;
            } catch {
              failure = classifyTalentExternalFailure({ kind: "parse" });
              failureMessage = "外部响应解析失败";
            }
            if (envelope) {
              const code = envelope.code;
              if (isTalentExternalEmptyResultCode(code)) {
                recordSuccess(latencyMs);
                return {
                  data: (envelope.data ?? {}) as T,
                  requestId: String(envelope.requestId || requestId),
                  status: response.status,
                  emptyCode: String(code),
                  attempts,
                };
              }
              if (!isSuccessCode(code)) {
                failure = classifyTalentExternalFailure({
                  kind: "http",
                  status: response.status,
                  code: String(code ?? ""),
                });
                // 业务码非 OK 不走重试（spec §3.3）。
                failure = { ...failure, retryable: false, abortBatch: false };
                failureMessage = sanitizeTalentExternalText(
                  envelope.message || "外部业务处理失败",
                );
              } else {
                recordSuccess(latencyMs);
                return {
                  data: (envelope.data ?? {}) as T,
                  requestId: String(envelope.requestId || requestId),
                  status: response.status,
                  attempts,
                };
              }
            }
          } else if (response.status === 404) {
            failure = classifyTalentExternalFailure({
              kind: "http",
              status: response.status,
            });
            failureMessage = "外部未查询到对象";
            if (input.allowEmpty !== false) {
              recordSuccess(latencyMs);
              return {
                data: {} as T,
                requestId,
                status: response.status,
                emptyCode: "NOT_FOUND",
                attempts,
              };
            }
          } else {
            failure = classifyTalentExternalFailure({
              kind: "http",
              status: response.status,
              retryAfterMs: parseTalentExternalRetryAfterMs(response.headers),
            });
            failureMessage = `外部服务响应异常（HTTP ${response.status}）`;
          }
        }

        const resolvedFailure: TalentExternalFailureInfo =
          failure ?? {
            class: "business",
            retryable: false,
            abortBatch: false,
          };
        const retryable = resolvedFailure.retryable;
        if (retryable && attempt < maxAttempts) {
          metrics.recordRetry();
          const backoffMs = computeTalentExternalBackoffMs(
            attempt,
            { random },
            resolvedFailure.retryAfterMs,
          );
          await sleep(backoffMs);
          continue;
        }
        // 预算兜底：重试总时长不允许无限膨胀（单批预算由编排层持有）。
        void startedAt;
        return fail(
          resolvedFailure,
          failureMessage,
          requestId,
          attempts,
          latencyMs,
          response?.status,
        );
      }
      const failure: TalentExternalFailureInfo = {
        class: "budget_exceeded",
        retryable: false,
        abortBatch: false,
      };
      return fail(
        failure,
        "外部请求超出重试预算",
        input.requestId ?? buildRequestId(),
        attempts,
        Date.now() - startedAt,
      );
    },
    runtime(): TalentExternalRuntimeSnapshot {
      return getTalentExternalRuntimeSnapshot(scope);
    },
    metrics(): TalentExternalMetricsSnapshot {
      return metrics.snapshot();
    },
    reset(): void {
      resetTalentExternalRuntime(scope);
    },
  };
  return client;
}

// ── 默认客户端缓存（同 scope 复用限流/熔断/指标；测试应注入 client） ─────────

const defaultClients = new Map<string, TalentExternalClient>();

/** 获取默认外部客户端（按 scope+基址+APP_ID 复用；缺配置 503）。 */
export function getTalentExternalClient(
  scope: TalentExternalScope,
  env: NodeJS.ProcessEnv = process.env,
): TalentExternalClient {
  const config = resolveTalentExternalClientConfig(scope, env);
  const key = `${scope}:${config.baseUrl}:${config.appId}`;
  let client = defaultClients.get(key);
  if (!client) {
    client = createTalentExternalClient({ scope, config });
    defaultClients.set(key, client);
  }
  return client;
}

/** 测试用：清空默认客户端缓存与运行态。 */
export function resetTalentExternalClients(): void {
  defaultClients.clear();
  resetTalentExternalRuntime();
}