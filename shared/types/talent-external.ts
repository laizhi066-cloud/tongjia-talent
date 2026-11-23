/**
 * @description M8 外部集成共享类型：三源（M2 查询 / M3 基因报告 / M5 培育建议）的
 *   传输层合同（HMAC canonical / 请求头 / 错误分类 / 重试退避 / 熔断 / 限流 / 告警），
 *   入站 webhook（签名触发 + M2 查询回执）与集成状态读模型。
 *   合同来源：docs/specs/M8-external/spec.md §3/§4.5/§8；ADR 0008-D1/D2/D6。
 *   只含传输与状态结构，不含供应商私有字段；供应商字段差异集中在适配器映射函数。
 * @file shared/types/talent-external.ts
 */

/** 三个外部域；每个域独立限流 / 熔断 / 告警。 */
export const TALENT_EXTERNAL_SCOPES = [
  "gene_query",
  "gene_report",
  "advice_version",
] as const;
export type TalentExternalScope = (typeof TALENT_EXTERNAL_SCOPES)[number];

/** 源类型：mock 本地演示 / external 真实外部系统。 */
export const TALENT_EXTERNAL_SOURCE_KINDS = ["mock", "external"] as const;
export type TalentExternalSourceKind =
  (typeof TALENT_EXTERNAL_SOURCE_KINDS)[number];

// ── 传输层请求头（spec §3.2；入站用同一套，secret 换 WEBHOOK_SECRET） ────────

export const TALENT_EXTERNAL_HEADER_APP_ID = "x-talent-app-id";
export const TALENT_EXTERNAL_HEADER_TIMESTAMP = "x-talent-timestamp";
export const TALENT_EXTERNAL_HEADER_NONCE = "x-talent-nonce";
export const TALENT_EXTERNAL_HEADER_SIGNATURE = "x-talent-signature";
export const TALENT_EXTERNAL_HEADER_REQUEST_ID = "x-talent-request-id";
export const TALENT_EXTERNAL_HEADER_IDEMPOTENCY_KEY = "idempotency-key";

/** 出站请求（可注入 transport；测试用 fake transport）。 */
export interface TalentExternalTransportRequest {
  method: "POST";
  url: string;
  headers: Record<string, string>;
  /** 原始 JSON 文本；签名用 sha256(bodyText)。 */
  bodyText: string;
  timeoutMs: number;
}

export interface TalentExternalTransportResponse {
  status: number;
  headers: Record<string, string>;
  bodyText: string;
}

/** 传输层最小接口：默认 fetch 实现；测试注入假实现。 */
export interface TalentExternalTransport {
  send(
    request: TalentExternalTransportRequest,
  ): Promise<TalentExternalTransportResponse>;
}

/** 解析完成的外部客户端配置（只存在内存；不写集合、不进日志/响应）。 */
export interface TalentExternalClientConfig {
  scope: TalentExternalScope;
  source: "external";
  baseUrl: string;
  appId: string;
  apiSecret: string;
  /** 密钥轮换期旧密钥（只用于验签，不用于出站签名）。 */
  apiSecretPrevious: string;
  apiVersion: string;
  webhookSecret: string;
  clockSkewSeconds: number;
  timeoutMs: number;
  retryMax: number;
  maxConcurrency: number;
  maxQps: number;
  runBudgetMs: number;
  breakerThreshold: number;
  breakerOpenMs: number;
  alertWebhookUrl: string;
  /** 告警冷却（毫秒）。 */
  alertCooldownMs: number;
}

// ── 错误分类（spec §3.3/§4.4） ───────────────────────────────────────────────

export const TALENT_EXTERNAL_ERROR_CLASSES = [
  "timeout",
  "connection",
  "rate_limited",
  "http_5xx",
  "http_4xx",
  "auth",
  "signature",
  "parse",
  "schema",
  "business",
  "not_found",
  "circuit_open",
  "not_configured",
  "budget_exceeded",
] as const;
export type TalentExternalErrorClass =
  (typeof TALENT_EXTERNAL_ERROR_CLASSES)[number];

/** 失败判定：是否重试、是否中止本批（auth/config 直接中止）。 */
export interface TalentExternalFailureInfo {
  class: TalentExternalErrorClass;
  retryable: boolean;
  abortBatch: boolean;
  /** 429 的 Retry-After（毫秒；已按 60s 上限截断）。 */
  retryAfterMs?: number;
}

/** 一次成功调用的结果。 */
export interface TalentExternalCallResult<T> {
  data: T;
  /** 对方回传的 requestId；缺失时回退本地 X-Talent-Request-Id。 */
  requestId: string;
  status: number;
  /** 业务空结果码（NO_RESULT / INFO_MISMATCH / SUBJECT_NOT_FOUND）。 */
  emptyCode?: string;
  attempts: number;
}

// ── 运行态 / 指标 / 状态读模型（spec §8.2/§8.5） ─────────────────────────────

export type TalentExternalCircuitState = "closed" | "open" | "half_open";

export interface TalentExternalLastError {
  at: string;
  class: TalentExternalErrorClass;
  /** 已脱敏并截断的摘要；不含密钥/明文 PII/外部原始报文。 */
  message: string;
  requestId?: string;
}

export interface TalentExternalMetricsSnapshot {
  requests: number;
  successes: number;
  failures: number;
  retries: number;
  circuitOpen: number;
  alerts: number;
  lastLatencyMs: number;
  totalLatencyMs: number;
  failureByClass: Partial<Record<TalentExternalErrorClass, number>>;
}

export interface TalentExternalRuntimeSnapshot {
  scope: TalentExternalScope;
  lastRequestAt: string;
  lastSuccessAt: string;
  lastFailureAt: string;
  lastError: TalentExternalLastError | null;
  consecutiveFailures: number;
  circuitState: TalentExternalCircuitState;
  circuitOpenUntil: string;
  /** 鉴权失败后的短时快失败窗口（spec §3.3：401/403 不重试、不继续打对方）。 */
  authBlocked: boolean;
  metrics: TalentExternalMetricsSnapshot;
}

/** 告警事件：载荷只允许规则/计数/时间/requestId，不含 PII/密钥/外部报文。 */
export interface TalentExternalAlertEvent {
  rule: string;
  scope: TalentExternalScope;
  level: "P1" | "P2" | "P3";
  at: string;
  window?: string;
  counts?: Record<string, number>;
  lastSuccessAt?: string;
  requestId?: string;
}

// ── 集成状态 API 读模型（spec §8.2） ─────────────────────────────────────────

export interface TalentIntegrationSyncRunStatus {
  at: string;
  status: string;
  statusLabel: string;
  scanned?: number;
  refreshed?: number;
  created?: number;
  empty?: number;
  failed?: number;
  durationMs?: number;
  trigger?: string;
  /** 已脱敏的同步摘要（不含 PII/密钥）；状态接口 recentErrors 使用。 */
  message?: string;
}

export interface TalentIntegrationReportStatus {
  source: TalentExternalSourceKind;
  configured: boolean;
  enabled: boolean;
  lastRun: TalentIntegrationSyncRunStatus | null;
  consecutiveFailures: number;
  circuitState: TalentExternalCircuitState;
  nextRunAt: string;
  lastError: TalentExternalLastError | null;
  /** 最近失败摘要（最多 3 条，脱敏；不含 PII/密钥）。 */
  recentErrors: TalentExternalLastError[];
}

export interface TalentIntegrationAdviceStatus {
  source: TalentExternalSourceKind;
  configured: boolean;
  enabled: boolean;
  activeVersion: string;
  nextUpdateAt: string;
  lastRun: TalentIntegrationSyncRunStatus | null;
  consecutiveFailures: number;
  circuitState: TalentExternalCircuitState;
  lastError: TalentExternalLastError | null;
  recentErrors: TalentExternalLastError[];
}

export interface TalentIntegrationWebhookStatus {
  enabled: boolean;
  lastEventAt: string;
  lastError: TalentExternalLastError | null;
}

/** 状态接口响应；按权限裁剪段（无 report:sync 不返回 report，advice 同理）。 */
export interface TalentIntegrationStatusPayload {
  report?: TalentIntegrationReportStatus;
  advice?: TalentIntegrationAdviceStatus;
  webhook?: TalentIntegrationWebhookStatus;
}

// ── 入站 webhook（spec §3.5/§8.1） ──────────────────────────────────────────

/** 入站触发信封：只允许事件标识，不接收报告/建议正文（ADR 0008-D2）。 */
export interface TalentExternalTriggerPayload {
  eventId: string;
  type?: string;
  occurredAt?: string;
}

/** M2 查询回执（spec §3.5；幂等键 `${childId}:${seq}`）。 */
export interface TalentGeneQueryReceiptPayload {
  idempotencyKey: string;
  childId: string;
  seq: number;
  outcome: "found" | "not_found";
  reason?: string;
  externalRef?: string;
  receivedAt?: string;
}

/** 入站触发响应（spec §8.2，HTTP 202）。 */
export interface TalentExternalTriggerResult {
  accepted: boolean;
  eventId: string;
  duplicate: boolean;
  deduped: boolean;
  runId: string;
}