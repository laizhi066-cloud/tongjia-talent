/**
 * @description M8-B 外部适配器与入站骨架测试（spec §11.1 #1/#2 的 M8-B 部分）：
 *   canonical string / HMAC 签名与验签、时间窗、nonce 重放、幂等键、错误分类、
 *   退避（fake timers 等价的时间注入）、成功/超时/5xx/签名错/重放/幂等/熔断/限流、
 *   入站签名与事件去重、M2 回执幂等、env fail-fast 与 source 工厂切换、外部字段映射。
 *   全部使用 fake transport 与内存实现，不依赖真实 PocketBase / 网络 / 供应商；数据均为虚构。
 * @file test/talent-external-adapter.test.ts
 */
import { describe, expect, it, beforeEach } from "vitest";
import type {
  TalentExternalClientConfig,
  TalentExternalScope,
  TalentExternalTransport,
  TalentExternalTransportRequest,
  TalentExternalTransportResponse,
} from "~~/shared/types/talent-external";
import {
  TALENT_EXTERNAL_WEBHOOK_MAX_BYTES,
  TalentExternalCallError,
  TalentExternalTransportError,
  buildTalentExternalCanonicalString,
  buildTalentExternalIdempotencyKey,
  classifyTalentExternalFailure,
  computeTalentExternalBackoffMs,
  createFetchTalentExternalTransport,
  createTalentExternalAlerter,
  createTalentExternalCircuitBreaker,
  createTalentExternalClient,
  createTalentExternalMetrics,
  createTalentExternalNonceCache,
  createTalentExternalRateLimiter,
  evaluateTalentExternalEnvFailFast,
  resetTalentExternalRuntime,
  sha256Hex,
  signTalentExternalRequest,
  verifyTalentExternalSignature,
} from "~~/server/utils/talent-external-adapter";
import {
  buildTalentAdviceRequestBody,
  buildTalentGeneReportRequestBody,
  buildTalentGeneReportIdempotencyKey,
  createExternalTalentAdviceSource,
  createExternalTalentGeneQuerySource,
  createExternalTalentGeneReportSource,
  mapTalentAdviceMatchResult,
  mapTalentGeneReportExternalData,
  normalizeTalentExternalBooks,
} from "~~/server/utils/talent-external-sources";
import {
  dispatchTalentExternalTrigger,
  isTalentExternalSyncRunning,
  parseTalentWebhookJson,
  processTalentGeneQueryReceipt,
  resetTalentWebhookState,
  talentExternalTriggerSchema,
  verifyTalentWebhookRequest,
} from "~~/server/utils/talent-external-webhook";
import { buildTalentIntegrationStatus } from "~~/server/utils/talent-integration-status";
import { createTalentGeneReportSource } from "~~/server/utils/talent-report-source";
import { createTalentAdviceSource as createM5AdviceSource } from "~~/server/utils/talent-advice-source";
import { createTalentGeneQuerySource } from "~~/server/utils/talent-member-query";

// 虚构常量：不使用真实 PII。
const NOW = new Date("2026-11-17T02:00:00.000Z");
const NONCE = "0123456789abcdef0123456789abcdef";
const SIGNATURE_PATH = "/api/integrations/talent/gene-reports/sync";
const WEBHOOK_SECRET = "webhook-secret-0123456789abcdef-0123456789";
const API_SECRET = "api-secret-0123456789abcdef-0123456789abcdef";
const APP_ID = "app_m8b_test";

async function catchAsyncError(
  action: () => Promise<unknown>,
): Promise<unknown> {
  try {
    await action();
  } catch (error) {
    return error;
  }
  return null;
}

function catchError(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  return null;
}

function errorStatus(error: unknown): number | undefined {
  return (error as { statusCode?: number } | null)?.statusCode;
}

function errorCode(error: unknown): string | undefined {
  return (error as { data?: { code?: string } } | null)?.data?.code;
}

// ── fake transport ─────────────────────────────────────────────────────────

class FakeTransport implements TalentExternalTransport {
  readonly calls: TalentExternalTransportRequest[] = [];
  constructor(
    private readonly responses: Array<
      TalentExternalTransportResponse | Error | (() => TalentExternalTransportResponse | Error)
    >,
  ) {}
  async send(
    request: TalentExternalTransportRequest,
  ): Promise<TalentExternalTransportResponse> {
    this.calls.push(request);
    const next = this.responses.shift();
    if (next === undefined) throw new Error("FakeTransport 没有更多响应");
    const resolved = typeof next === "function" ? next() : next;
    if (resolved instanceof Error) throw resolved;
    return resolved;
  }
}

function okResponse(data: unknown, code: string | number = "OK"): TalentExternalTransportResponse {
  return {
    status: 200,
    headers: { "content-type": "application/json" },
    bodyText: JSON.stringify({ code, message: "success", requestId: "req_remote_1", data }),
  };
}

function httpResponse(
  status: number,
  body: unknown = {},
  headers: Record<string, string> = {},
): TalentExternalTransportResponse {
  return {
    status,
    headers: { "content-type": "application/json", ...headers },
    bodyText: JSON.stringify(body),
  };
}

function makeConfig(
  scope: TalentExternalScope = "gene_report",
  overrides: Partial<TalentExternalClientConfig> = {},
): TalentExternalClientConfig {
  return {
    scope,
    source: "external",
    baseUrl: "https://external.example.test",
    appId: APP_ID,
    apiSecret: API_SECRET,
    apiSecretPrevious: "",
    apiVersion: "v1",
    webhookSecret: WEBHOOK_SECRET,
    clockSkewSeconds: 300,
    timeoutMs: 1_000,
    retryMax: 0,
    maxConcurrency: 4,
    maxQps: 1_000,
    runBudgetMs: 600_000,
    breakerThreshold: 5,
    breakerOpenMs: 60_000,
    alertWebhookUrl: "",
    alertCooldownMs: 0,
    ...overrides,
  };
}

function fastLimiter() {
  return createTalentExternalRateLimiter({ maxQps: 1_000, maxConcurrency: 8 });
}

function makeClient(
  transport: TalentExternalTransport,
  options: {
    config?: Partial<TalentExternalClientConfig>;
    scope?: TalentExternalScope;
    alerter?: ReturnType<typeof createTalentExternalAlerter>;
    breaker?: ReturnType<typeof createTalentExternalCircuitBreaker>;
    sleeps?: number[];
    clock?: Date;
  } = {},
) {
  const sleeps = options.sleeps ?? [];
  const alerts: string[] = [];
  const alerter =
    options.alerter ??
    createTalentExternalAlerter({
      now: () => (options.clock ? options.clock.getTime() : NOW.getTime()),
      cooldownMs: 0,
      sink: (event) => {
        alerts.push(event.rule);
      },
      metrics: createTalentExternalMetrics(),
    });
  const client = createTalentExternalClient({
    scope: options.scope ?? "gene_report",
    config: makeConfig(options.scope ?? "gene_report", options.config),
    transport,
    rateLimiter: fastLimiter(),
    metrics: createTalentExternalMetrics(),
    alerter,
    now: () => options.clock ?? NOW,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    random: () => 0.5,
    ...(options.breaker ? { circuitBreaker: options.breaker } : {}),
  });
  return { client, alerts, sleeps };
}

beforeEach(() => {
  // 进程内运行态/入站去重按用例清零，避免鉴权快失败窗口/事件缓存跨用例污染。
  resetTalentExternalRuntime();
  resetTalentWebhookState();
});

// ── canonical / HMAC / 时间窗 / nonce ──────────────────────────────────────

describe("M8 外部传输层：canonical 与 HMAC 签名", () => {
  it("canonical 固定顺序：v1/METHOD/PATH/TIMESTAMP/NONCE/sha256(body)", () => {
    const bodyText = '{"childId":"rec_child_1"}';
    const canonical = buildTalentExternalCanonicalString({
      method: "post",
      path: "/v1/gene-reports/query",
      timestamp: "1763344800",
      nonce: NONCE,
      bodyText,
    });
    expect(canonical).toBe(
      [
        "v1",
        "POST",
        "/v1/gene-reports/query",
        "1763344800",
        NONCE,
        sha256Hex(bodyText),
      ].join("\n"),
    );
    // 空 body 使用 sha256("")。
    expect(sha256Hex("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("同步签名可被验签；篡改 body/签名 → signature 失败", () => {
    const input = {
      method: "POST",
      path: "/v1/advice/match",
      timestamp: "1763344800",
      nonce: NONCE,
      bodyText: '{"geneReportId":"rec_gene_1"}',
    };
    const signature = signTalentExternalRequest(API_SECRET, input);
    expect(signature.startsWith("v1=")).toBe(true);
    expect(
      verifyTalentExternalSignature({
        ...input,
        secret: API_SECRET,
        signature,
        now: new Date(1763344800 * 1000),
      }).ok,
    ).toBe(true);
    expect(
      verifyTalentExternalSignature({
        ...input,
        bodyText: '{"geneReportId":"rec_gene_2"}',
        secret: API_SECRET,
        signature,
        now: new Date(1763344800 * 1000),
      }),
    ).toMatchObject({ ok: false, reason: "signature" });
    expect(
      verifyTalentExternalSignature({
        ...input,
        secret: API_SECRET,
        signature: `v1=${"0".repeat(64)}`,
        now: new Date(1763344800 * 1000),
      }),
    ).toMatchObject({ ok: false, reason: "signature" });
  });

  it("时间窗：超出 ±skew → expired；path 缺少前导 / 自动归一", () => {
    const input = {
      method: "POST",
      path: "v1/gene-queries",
      timestamp: "1763344800",
      nonce: NONCE,
      bodyText: "{}",
    };
    const signature = signTalentExternalRequest(API_SECRET, input);
    expect(
      verifyTalentExternalSignature({
        ...input,
        secret: API_SECRET,
        signature,
        now: new Date(1763344800 * 1000 + 299_000),
      }).ok,
    ).toBe(true);
    expect(
      verifyTalentExternalSignature({
        ...input,
        secret: API_SECRET,
        signature,
        now: new Date(1763344800 * 1000 + 301_000),
      }),
    ).toMatchObject({ ok: false, reason: "expired" });
  });

  it("nonce 缓存：首次接受、重复重放拒绝、TTL 过期后可复用", () => {
    let clock = 1_000_000;
    const cache = createTalentExternalNonceCache({
      ttlMs: 10_000,
      now: () => clock,
    });
    expect(cache.use("n1")).toBe(true);
    expect(cache.use("n1")).toBe(false);
    clock += 10_001;
    expect(cache.use("n1")).toBe(true);
  });

  it("幂等键稳定：同 scope/path/requestId 恒定且不同对象不同", () => {
    const first = buildTalentExternalIdempotencyKey(
      "gene_report",
      "/v1/gene-reports/query",
      "req_1",
    );
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(
      buildTalentExternalIdempotencyKey(
        "gene_report",
        "/v1/gene-reports/query",
        "req_1",
      ),
    ).toBe(first);
    expect(
      buildTalentExternalIdempotencyKey(
        "gene_report",
        "/v1/gene-reports/query",
        "req_2",
      ),
    ).not.toBe(first);
  });
});

// ── 错误分类 / 退避 ────────────────────────────────────────────────────────

describe("M8 外部传输层：错误分类与退避", () => {
  it("超时/连接/5xx/429 可重试；401/403 中止；400/422/404/解析不重试", () => {
    expect(
      classifyTalentExternalFailure({ kind: "transport", message: "timeout" }),
    ).toMatchObject({ class: "timeout", retryable: true });
    expect(
      classifyTalentExternalFailure({ kind: "transport", message: "connection" }),
    ).toMatchObject({ class: "connection", retryable: true });
    expect(classifyTalentExternalFailure({ kind: "http", status: 500 })).toMatchObject({
      class: "http_5xx",
      retryable: true,
    });
    expect(
      classifyTalentExternalFailure({
        kind: "http",
        status: 429,
        retryAfterMs: 90_000,
      }),
    ).toMatchObject({ class: "rate_limited", retryable: true, retryAfterMs: 60_000 });
    expect(classifyTalentExternalFailure({ kind: "http", status: 401 })).toMatchObject({
      class: "auth",
      retryable: false,
      abortBatch: true,
    });
    expect(classifyTalentExternalFailure({ kind: "http", status: 403 })).toMatchObject({
      class: "auth",
      abortBatch: true,
    });
    expect(classifyTalentExternalFailure({ kind: "http", status: 422 })).toMatchObject({
      class: "http_4xx",
      retryable: false,
    });
    expect(classifyTalentExternalFailure({ kind: "http", status: 404 })).toMatchObject({
      class: "not_found",
      retryable: false,
    });
    expect(classifyTalentExternalFailure({ kind: "parse" })).toMatchObject({
      class: "parse",
      retryable: false,
    });
  });

  it("退避：1s → 4s → 16s，jitter 固定 0.5 时无偏移；Retry-After 优先且 ≤60s", () => {
    const options = { random: () => 0.5 };
    expect(computeTalentExternalBackoffMs(1, options)).toBe(1_000);
    expect(computeTalentExternalBackoffMs(2, options)).toBe(4_000);
    expect(computeTalentExternalBackoffMs(3, options)).toBe(16_000);
    expect(computeTalentExternalBackoffMs(4, options)).toBe(16_000);
    expect(computeTalentExternalBackoffMs(1, options, 5_000)).toBe(5_000);
    expect(computeTalentExternalBackoffMs(1, options, 90_000)).toBe(60_000);
  });
});

// ── 客户端：成功 / 重试 / 超时 / 鉴权 / 熔断 / 限流 ────────────────────────

describe("M8 外部传输层：客户端", () => {
  it("成功：签名头可被对方验签、信封解包、requestId 回传", async () => {
    const transport = new FakeTransport([okResponse({ found: true, books: ["A"] })]);
    const { client } = makeClient(transport);
    const result = await client.request<{ found: boolean }>({
      path: "/v1/gene-reports/query",
      body: { subjectId: "rec_child_1" },
      requestId: "req_fixed_1",
    });
    expect(result.data).toMatchObject({ found: true });
    expect(result.requestId).toBe("req_remote_1");
    expect(transport.calls).toHaveLength(1);
    const request = transport.calls[0]!;
    const verify = verifyTalentExternalSignature({
      secret: API_SECRET,
      method: request.method,
      path: new URL(request.url).pathname,
      timestamp: request.headers["x-talent-timestamp"]!,
      nonce: request.headers["x-talent-nonce"]!,
      bodyText: request.bodyText,
      signature: request.headers["x-talent-signature"]!,
      now: NOW,
    });
    expect(verify.ok).toBe(true);
    expect(request.headers["x-talent-app-id"]).toBe(APP_ID);
    expect(request.headers["idempotency-key"]).toMatch(/^[a-f0-9]{64}$/);
    expect(request.headers["x-talent-request-id"]).toBe("req_fixed_1");
  });

  it("5xx 重试：500 → 200，重试使用退避与指标计数", async () => {
    const transport = new FakeTransport([
      httpResponse(500),
      okResponse({ found: true }),
    ]);
    const { client, sleeps } = makeClient(transport, { config: { retryMax: 2 } });
    const result = await client.request<{ found: boolean }>({
      path: "/v1/gene-reports/query",
    });
    expect(result.data).toMatchObject({ found: true });
    expect(transport.calls).toHaveLength(2);
    expect(sleeps).toEqual([1_000]);
    expect(client.metrics()).toMatchObject({ requests: 2, retries: 1, failures: 0 });
  });

  it("429：尊重 Retry-After（秒 → 毫秒）后再试", async () => {
    const transport = new FakeTransport([
      httpResponse(429, {}, { "retry-after": "2" }),
      okResponse({ found: false }),
    ]);
    const { client, sleeps } = makeClient(transport, { config: { retryMax: 1 } });
    await client.request({ path: "/v1/advice/match" });
    expect(sleeps).toEqual([2_000]);
  });

  it("超时：重试耗尽后抛 timeout 分类错误", async () => {
    const transport = new FakeTransport([
      new TalentExternalTransportError("timeout", "外部请求超时"),
      new TalentExternalTransportError("timeout", "外部请求超时"),
    ]);
    const { client } = makeClient(transport, { config: { retryMax: 1 } });
    const error = await client
      .request({ path: "/v1/advice/match" })
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(TalentExternalCallError);
    expect(error).toMatchObject({ class: "timeout", retryable: true, attempts: 2 });
    expect(transport.calls).toHaveLength(2);
  });

  it("401 鉴权失败：不重试、立即告警、同进程后续请求快失败", async () => {
    const transport = new FakeTransport([httpResponse(401, { code: "AUTH_FAILED" })]);
    const { client, alerts } = makeClient(transport, { config: { retryMax: 3 } });
    const error = await client
      .request({ path: "/v1/gene-reports/query" })
      .catch((caught: unknown) => caught);
    expect(error).toMatchObject({ class: "auth", abortBatch: true, attempts: 1 });
    expect(transport.calls).toHaveLength(1);
    expect(alerts).toContain("auth_failed");
    // 已进入快失败窗口：不再请求对方。
    const second = await client
      .request({ path: "/v1/gene-reports/query" })
      .catch((caught: unknown) => caught);
    expect(second).toMatchObject({ class: "auth" });
    expect(transport.calls).toHaveLength(1);
  });

  it("熔断：连续失败打开 → 快速失败不请求对方 → 半开恢复", async () => {
    const clock = new Date(NOW);
    let failures = 0;
    const breaker = createTalentExternalCircuitBreaker({
      threshold: 2,
      openMs: 60_000,
      now: () => clock.getTime(),
    });
    const controllable = new FakeTransport([
      httpResponse(500),
      httpResponse(500),
      okResponse({ found: true }),
    ]);
    const { client } = makeClient(controllable, {
      config: { retryMax: 0, breakerThreshold: 2, breakerOpenMs: 60_000 },
      breaker,
      clock,
    });
    for (let index = 0; index < 2; index += 1) {
      const error = await client
        .request({ path: "/v1/gene-reports/query" })
        .catch((caught: unknown) => caught);
      expect(error).toMatchObject({ class: "http_5xx" });
      failures += 1;
    }
    expect(failures).toBe(2);
    expect(breaker.snapshot().state).toBe("open");
    const circuitError = await client
      .request({ path: "/v1/gene-reports/query" })
      .catch((caught: unknown) => caught);
    expect(circuitError).toMatchObject({ class: "circuit_open" });
    expect(controllable.calls).toHaveLength(2);
    // 打开 15min 后（这里 60s）半开探测成功 → 恢复。
    clock.setTime(clock.getTime() + 61_000);
    const recovered = await client.request<{ found: boolean }>({
      path: "/v1/gene-reports/query",
    });
    expect(recovered.data).toMatchObject({ found: true });
    expect(breaker.snapshot().state).toBe("closed");
  });

  it("限流：QPS 令牌桶满时 tryAcquire 拒绝、限流恢复后放行", async () => {
    let clock = 0;
    const limiter = createTalentExternalRateLimiter({
      maxQps: 1,
      maxConcurrency: 2,
      now: () => clock,
      sleep: async (ms) => {
        clock += ms;
      },
    });
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(false);
    limiter.release();
    clock += 1_000;
    expect(limiter.tryAcquire()).toBe(true);
  });

  it("404 空结果：映射为空结果码，不抛错", async () => {
    const transport = new FakeTransport([
      httpResponse(404, { code: "SUBJECT_NOT_FOUND" }),
    ]);
    const { client } = makeClient(transport);
    const result = await client.request({ path: "/v1/gene-reports/query" });
    expect(result.emptyCode).toBe("NOT_FOUND");
  });
});

// ── 外部 source 映射（M3/M5/M2） ───────────────────────────────────────────

describe("M8 external 三源映射", () => {
  it("M3 报告源：请求体/幂等键/books 归一/sections 映射", async () => {
    const transport = new FakeTransport([
      okResponse({
        found: true,
        reportNo: "GR202611160001",
        issuer: "示例机构",
        filedAt: "2026-11-16",
        books: ["A", "B"],
        sections: [
          {
            bookCode: "A",
            chapter: "1.1 生长发育概述",
            factorCode: "A-01",
            factorName: "运动协调",
            levelCode: "LV3",
            score: 78,
            condition: "",
          },
        ],
      }),
    ]);
    const { client } = makeClient(transport);
    const source = createExternalTalentGeneReportSource({ client });
    expect(source.source).toBe("external");
    const data = await source.fetch({
      subjectType: "child",
      subjectId: "rec_child_1",
      parentId: "rec_parent_1",
      name: "陈示例",
      gender: "female",
      birthday: "2016-09-08",
      age: 10,
      idNo: "110101201609081234",
      mobile: "13800000001",
      existingReportNo: "GR202611160000",
    });
    expect(data).toMatchObject({
      found: true,
      reportNo: "GR202611160001",
      books: ["A", "B"],
    });
    expect(data.sections[0]).toMatchObject({ factorCode: "A-01", levelCode: "LV3" });
    const body = JSON.parse(transport.calls[0]!.bodyText) as Record<string, unknown>;
    expect(body).toMatchObject({
      subjectId: "rec_child_1",
      existingReportNo: "GR202611160000",
    });
    expect(body).not.toHaveProperty("childId");
    expect(transport.calls[0]!.url).toBe(
      "https://external.example.test/v1/gene-reports/query",
    );
  });

  it("M3 报告源：found=false/no_result 与空结果码都不抛错", async () => {
    const { client } = makeClient(
      new FakeTransport([
        okResponse({ found: false, reason: "no_result" }),
        { status: 200, headers: {}, bodyText: JSON.stringify({ code: "NO_RESULT", data: {} }) },
      ]),
    );
    const source = createExternalTalentGeneReportSource({ client });
    const subject = {
      subjectType: "child" as const,
      subjectId: "rec_child_1",
      parentId: "rec_parent_1",
      name: "陈示例",
      gender: "female" as const,
      birthday: "2016-09-08",
      age: 10,
      idNo: "110101201609081234",
      mobile: "13800000001",
    };
    expect(await source.fetch(subject)).toMatchObject({
      found: false,
      reason: "no_result",
    });
    expect(await source.fetch(subject)).toMatchObject({
      found: false,
      reason: "no_result",
    });
  });

  it("M5 建议源：只传脱敏证件、四段文案原样映射、books 归一", async () => {
    const transport = new FakeTransport([
      okResponse({
        found: true,
        version: "2026-11-A",
        books: "AB",
        sections: [
          {
            book: "A",
            bookName: "生长发育",
            chapter: "1.1",
            factor: "运动协调",
            entropy: "优秀",
            content: "原文",
            example: "举例",
            direction: "方向",
            suggestion: "建议",
            variant: 1,
          },
        ],
      }),
    ]);
    const { client } = makeClient(transport, { scope: "advice_version" });
    const source = createExternalTalentAdviceSource({ client });
    expect(source.name).toBe("external");
    const result = await source.match({
      geneReportId: "rec_gene_1",
      reportNo: "GR202611160001",
      subjectType: "child",
      subjectId: "rec_child_1",
      parentId: "rec_parent_1",
      name: "陈示例",
      gender: "female",
      birthday: "2016-09-08",
      age: 10,
      maskedIdNo: "1101**********1234",
    });
    expect(result).toMatchObject({ found: true, books: "AB", version: "2026-11-A" });
    expect(result.sections?.[0]).toMatchObject({
      factor: "运动协调",
      content: "原文",
      suggestion: "建议",
    });
    const body = JSON.parse(transport.calls[0]!.bodyText) as Record<string, unknown>;
    expect(body.maskedIdNo).toBe("1101**********1234");
    expect(body).not.toHaveProperty("idNo");
  });

  it("M2 查询源：请求体与 accepted/externalRef 映射", async () => {
    const transport = new FakeTransport([
      okResponse({ accepted: true, externalRef: "EXT-2026-0007" }),
    ]);
    const { client } = makeClient(transport, { scope: "gene_query" });
    const source = createExternalTalentGeneQuerySource({ client });
    const result = await source.submit({
      childId: "rec_child_1",
      parentId: "rec_parent_1",
      seq: 7,
      name: "陈示例",
      gender: "female",
      birthday: "2016-09-08",
      idNo: "110101201609081234",
      mobile: "13800000001",
    });
    expect(result).toMatchObject({ accepted: true, externalRef: "EXT-2026-0007" });
    const body = JSON.parse(transport.calls[0]!.bodyText) as Record<string, unknown>;
    expect(body).toMatchObject({ childId: "rec_child_1", seq: 7 });
    expect(transport.calls[0]!.headers["idempotency-key"]).toBe("rec_child_1:7");
  });

  it("映射纯函数：books 归一、非法 section 丢弃、advice 空结果", () => {
    expect(normalizeTalentExternalBooks("cabz")).toEqual(["A", "B", "C"]);
    expect(normalizeTalentExternalBooks(["F", "a"])).toEqual(["A", "F"]);
    const mapped = mapTalentGeneReportExternalData({
      found: true,
      books: "AB",
      sections: [
        { book: "A", factor: "A-01", level: "LV2" },
        { book: "Z", factor: "Z-01", level: "LV2" },
        { book: "B", factor: "B-01" },
      ],
    });
    expect(mapped.found).toBe(true);
    expect(mapped.sections).toHaveLength(1);
    expect(mapTalentAdviceMatchResult({ found: false, reason: "info_mismatch" })).toEqual({
      found: false,
      reason: "info_mismatch",
    });
    expect(
      buildTalentGeneReportRequestBody(
        {
          subjectType: "child",
          subjectId: "rec_child_1",
          parentId: "rec_parent_1",
          name: "陈示例",
          gender: "female",
          birthday: "2016-09-08",
          age: 10,
          idNo: "110101201609081234",
          mobile: "13800000001",
        },
        "req_1",
      ),
    ).toMatchObject({ requestId: "req_1", subjectId: "rec_child_1" });
    expect(
      buildTalentGeneReportIdempotencyKey("rec_child_1", "req_1"),
    ).toMatch(/^[a-f0-9]{64}$/);
    expect(
      buildTalentAdviceRequestBody(
        {
          geneReportId: "rec_gene_1",
          reportNo: "GR202611160001",
          subjectType: "child",
          subjectId: "rec_child_1",
          parentId: "rec_parent_1",
          name: "陈示例",
          gender: "female",
          birthday: "2016-09-08",
          age: 10,
          maskedIdNo: "1101**********1234",
        },
        "req_2",
      ),
    ).toMatchObject({ requestId: "req_2", maskedIdNo: "1101**********1234" });
  });
});

// ── 入站验签 / 重放 / 事件去重 / 回执 ──────────────────────────────────────

function signedWebhookHeaders(
  bodyText: string,
  overrides: {
    secret?: string;
    timestamp?: string;
    nonce?: string;
    path?: string;
    appId?: string;
  } = {},
): Record<string, string> {
  const timestamp = overrides.timestamp ?? String(Math.floor(NOW.getTime() / 1000));
  const nonce = overrides.nonce ?? NONCE;
  const path = overrides.path ?? SIGNATURE_PATH;
  const signature = signTalentExternalRequest(overrides.secret ?? WEBHOOK_SECRET, {
    method: "POST",
    path,
    timestamp,
    nonce,
    bodyText,
  });
  return {
    "content-type": "application/json",
    "content-length": String(Buffer.byteLength(bodyText, "utf8")),
    "x-talent-app-id": overrides.appId ?? APP_ID,
    "x-talent-timestamp": timestamp,
    "x-talent-nonce": nonce,
    "x-talent-signature": signature,
    "x-talent-request-id": "req_webhook_1",
    "x-forwarded-for": "203.0.113.9",
  };
}

function verifyInput(bodyText: string, headers: Record<string, string>) {
  return verifyTalentWebhookRequest({
    secret: WEBHOOK_SECRET,
    headers,
    method: "POST",
    path: SIGNATURE_PATH,
    bodyText,
    now: NOW,
    clockSkewSeconds: 300,
    nonceCache: createTalentExternalNonceCache({ ttlMs: 60_000, now: () => 1 }),
    rateLimitCheck: () => true,
  });
}

describe("M8 入站 webhook：验签 / 时间窗 / 重放 / 体积 / 限流", () => {
  beforeEach(() => {
    resetTalentWebhookState();
  });

  it("正确签名 → 通过并返回上下文", () => {
    const body = JSON.stringify({ eventId: "evt_1" });
    const context = verifyInput(body, signedWebhookHeaders(body));
    expect(context).toMatchObject({ appId: APP_ID, requestId: "req_webhook_1" });
  });

  it("签名错误 / 时间窗过期 / 重放 nonce → 401/409", () => {
    const body = JSON.stringify({ eventId: "evt_1" });
    const headers = signedWebhookHeaders(body);
    headers["x-talent-signature"] = `v1=${"0".repeat(64)}`;
    const invalid = catchError(() => verifyInput(body, headers));
    expect(errorStatus(invalid)).toBe(401);
    expect(errorCode(invalid)).toBe("SIGNATURE_INVALID");

    const expiredBody = JSON.stringify({ eventId: "evt_2" });
    const expired = catchError(() =>
      verifyInput(
        expiredBody,
        signedWebhookHeaders(expiredBody, {
          timestamp: String(Math.floor(NOW.getTime() / 1000) - 3_600),
        }),
      ),
    );
    expect(errorStatus(expired)).toBe(401);
    expect(errorCode(expired)).toBe("SIGNATURE_EXPIRED");

    const replayBody = JSON.stringify({ eventId: "evt_3" });
    const cache = createTalentExternalNonceCache({ ttlMs: 60_000, now: () => 1 });
    const replayInput = {
      secret: WEBHOOK_SECRET,
      headers: signedWebhookHeaders(replayBody),
      method: "POST",
      path: SIGNATURE_PATH,
      bodyText: replayBody,
      now: NOW,
      nonceCache: cache,
      rateLimitCheck: () => true,
    };
    expect(verifyTalentWebhookRequest(replayInput).nonce).toBe(NONCE);
    const replay = catchError(() => verifyTalentWebhookRequest(replayInput));
    expect(errorStatus(replay)).toBe(409);
    expect(errorCode(replay)).toBe("REPLAY_DETECTED");
  });

  it("体积超限 → 413；限流 → 429；非 JSON → 422", () => {
    const big = "x".repeat(TALENT_EXTERNAL_WEBHOOK_MAX_BYTES + 1);
    const tooLarge = catchError(() =>
      verifyTalentWebhookRequest({
        secret: WEBHOOK_SECRET,
        headers: signedWebhookHeaders(big),
        method: "POST",
        path: SIGNATURE_PATH,
        bodyText: big,
        now: NOW,
        rateLimitCheck: () => true,
      }),
    );
    expect(errorStatus(tooLarge)).toBe(413);
    expect(errorCode(tooLarge)).toBe("PAYLOAD_TOO_LARGE");

    const body = JSON.stringify({ eventId: "evt_1" });
    const rateLimited = catchError(() =>
      verifyTalentWebhookRequest({
        secret: WEBHOOK_SECRET,
        headers: signedWebhookHeaders(body),
        method: "POST",
        path: SIGNATURE_PATH,
        bodyText: body,
        now: NOW,
        rateLimitCheck: () => false,
      }),
    );
    expect(errorStatus(rateLimited)).toBe(429);

    const wrongType = catchError(() =>
      verifyTalentWebhookRequest({
        secret: WEBHOOK_SECRET,
        headers: { ...signedWebhookHeaders(body), "content-type": "text/plain" },
        method: "POST",
        path: SIGNATURE_PATH,
        bodyText: body,
        now: NOW,
        rateLimitCheck: () => true,
      }),
    );
    expect(errorStatus(wrongType)).toBe(422);
  });

  it("入站只接收事件标识：带正文/报告字段的 payload 被 strict schema 拒绝", () => {
    expect(() =>
      parseTalentWebhookJson(
        JSON.stringify({ eventId: "evt_1", sections: [{ factor: "A-01" }] }),
        talentExternalTriggerSchema,
      ),
    ).toThrow();
    expect(
      parseTalentWebhookJson(
        JSON.stringify({ eventId: "evt_1", type: "gene_report.ready" }),
        talentExternalTriggerSchema,
      ),
    ).toMatchObject({ eventId: "evt_1" });
  });

  it("事件去重：重复 eventId → duplicate；同 scope 运行中 → deduped", async () => {
    resetTalentWebhookState();
    let started = 0;
    let releaseRun: (() => void) | null = null;
    const start = () => {
      started += 1;
      return new Promise<void>((resolve) => {
        releaseRun = resolve;
      });
    };
    const first = await dispatchTalentExternalTrigger({
      scope: "gene_report",
      eventId: "evt_1",
      start,
    });
    expect(first).toMatchObject({ accepted: true, duplicate: false, deduped: false });
    expect(isTalentExternalSyncRunning("gene_report")).toBe(true);
    const duplicate = await dispatchTalentExternalTrigger({
      scope: "gene_report",
      eventId: "evt_1",
      start,
    });
    expect(duplicate).toMatchObject({ duplicate: true, deduped: true });
    const deduped = await dispatchTalentExternalTrigger({
      scope: "gene_report",
      eventId: "evt_2",
      start,
    });
    expect(deduped).toMatchObject({ duplicate: false, deduped: true });
    expect(started).toBe(1);
    const release = releaseRun as (() => void) | null;
    release?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(isTalentExternalSyncRunning("gene_report")).toBe(false);
  });

  it("M2 回执：首次 applied、重复幂等键 discarded、非法幂等键 422", async () => {
    resetTalentWebhookState();
    const logs: string[] = [];
    const payload = {
      idempotencyKey: "rec_child_1:7",
      childId: "rec_child_1",
      seq: 7,
      outcome: "found" as const,
      externalRef: "EXT-2026-0007",
    };
    const options = {
      applyReceipt: async () => "applied" as const,
      recordLog: async (input: {
        result: "applied" | "discarded";
      }): Promise<void> => {
        logs.push(input.result);
      },
      nonceCache: createTalentExternalNonceCache({ ttlMs: 60_000, now: () => 1 }),
    };
    expect(await processTalentGeneQueryReceipt(payload, options)).toEqual({
      result: "applied",
    });
    expect(await processTalentGeneQueryReceipt(payload, options)).toEqual({
      result: "discarded",
    });
    expect(logs).toEqual(["applied"]);

    const badKey = await catchAsyncError(() =>
      processTalentGeneQueryReceipt(
        { ...payload, idempotencyKey: "wrong:7" },
        {
          ...options,
          nonceCache: createTalentExternalNonceCache({ ttlMs: 1, now: () => 2 }),
        },
      ),
    );
    expect(errorStatus(badKey)).toBe(422);

    const missingReason = await catchAsyncError(() =>
      processTalentGeneQueryReceipt(
        {
          idempotencyKey: "rec_child_1:8",
          childId: "rec_child_1",
          seq: 8,
          outcome: "not_found",
        },
        options,
      ),
    );
    expect(errorStatus(missingReason)).toBe(422);
  });
});

// ── env fail-fast / 工厂切换 / 状态 API ────────────────────────────────────

describe("M8 env fail-fast 与 source 工厂切换", () => {
  const completeEnv: NodeJS.ProcessEnv = {
    TALENT_GENE_REPORT_SOURCE: "external",
    TALENT_GENE_REPORT_BASE_URL: "https://gene.example.test",
    TALENT_ADVICE_SOURCE: "external",
    TALENT_ADVICE_BASE_URL: "https://advice.example.test",
    TALENT_GENE_QUERY_SOURCE: "external",
    TALENT_GENE_QUERY_BASE_URL: "https://query.example.test",
    TALENT_EXTERNAL_APP_ID: APP_ID,
    TALENT_EXTERNAL_API_SECRET: API_SECRET,
    TALENT_EXTERNAL_WEBHOOK_SECRET: WEBHOOK_SECRET,
  };

  it("external 缺配置：三个 source 工厂 503，不静默降级 Mock", () => {
    const report = catchError(() =>
      createTalentGeneReportSource({ TALENT_GENE_REPORT_SOURCE: "external" }),
    );
    expect(errorStatus(report)).toBe(503);
    expect(errorCode(report)).toBe("EXTERNAL_SOURCE_UNAVAILABLE");

    const advice = catchError(() =>
      createM5AdviceSource({ TALENT_ADVICE_SOURCE: "external" }),
    );
    expect(errorStatus(advice)).toBe(503);
    expect(errorCode(advice)).toBe("ADVICE_SOURCE_UNAVAILABLE");

    const query = catchError(() =>
      createTalentGeneQuerySource({ TALENT_GENE_QUERY_SOURCE: "external" }),
    );
    expect(errorStatus(query)).toBe(503);
    expect(errorCode(query)).toBe("EXTERNAL_SOURCE_UNAVAILABLE");
  });

  it("external 配置齐全：工厂返回 external 源（不再 503）", () => {
    expect(createTalentGeneReportSource(completeEnv).source).toBe("external");
    expect(createM5AdviceSource(completeEnv).name).toBe("external");
  });

  it("生产 + mock 未显式放行 → fail-fast；显式放行/非生产 → 通过", () => {
    const production = evaluateTalentExternalEnvFailFast({ NODE_ENV: "production" });
    expect(production.ok).toBe(false);
    expect(production.errors.join(" ")).toContain("mock");

    const allowed = evaluateTalentExternalEnvFailFast({
      NODE_ENV: "production",
      TALENT_ALLOW_MOCK_SOURCES: "1",
    });
    expect(allowed.ok).toBe(true);

    const development = evaluateTalentExternalEnvFailFast({
      NODE_ENV: "development",
    });
    expect(development.ok).toBe(true);

    const missingExternal = evaluateTalentExternalEnvFailFast({
      NODE_ENV: "production",
      TALENT_GENE_REPORT_SOURCE: "external",
    });
    expect(missingExternal.ok).toBe(false);
    expect(missingExternal.errors.join(" ")).toContain("TALENT_EXTERNAL_API_SECRET");
  });

  it("external 齐备但缺 WEBHOOK_SECRET → 只告警，不阻断出站", () => {
    const env: NodeJS.ProcessEnv = { ...completeEnv };
    delete env.TALENT_EXTERNAL_WEBHOOK_SECRET;
    const result = evaluateTalentExternalEnvFailFast(env);
    expect(result.ok).toBe(true);
    expect(result.warnings.join(" ")).toContain("WEBHOOK_SECRET");
  });

  it("状态接口：按权限裁剪、无基址/密钥、连续失败与最近错误", () => {
    const runs = [
      {
        at: "2026-11-17T02:00:00.000Z",
        status: "failed",
        statusLabel: "失败",
        message: "外部服务响应异常（HTTP 500）",
      },
      {
        at: "2026-11-16T20:00:00.000Z",
        status: "partial",
        statusLabel: "部分成功",
        message: "部分对象同步失败",
      },
      {
        at: "2026-11-16T14:00:00.000Z",
        status: "success",
        statusLabel: "成功",
      },
    ];
    const status = buildTalentIntegrationStatus({
      env: completeEnv,
      permissions: { report: true, advice: false },
      now: NOW,
      reportRuns: runs,
      webhook: { enabled: true, lastEventAt: "", lastError: null },
    });
    expect(status.advice).toBeUndefined();
    expect(status.report).toMatchObject({
      source: "external",
      configured: true,
      consecutiveFailures: 2,
    });
    expect(status.report?.recentErrors).toHaveLength(2);
    expect(status.webhook?.enabled).toBe(true);
    const serialized = JSON.stringify(status);
    expect(serialized).not.toContain("https://");
    expect(serialized).not.toContain(API_SECRET);
    expect(serialized).not.toContain(WEBHOOK_SECRET);
  });
});

// ── 默认 fetch transport 的错误归因（不发起真实网络） ──────────────────────

describe("M8 fetch transport 超时/连接归因", () => {
  it("abort → timeout；普通异常 → connection", async () => {
    const timeoutTransport = createFetchTalentExternalTransport(async () => {
      const error = new Error("This operation was aborted");
      throw error;
    });
    const timeout = await timeoutTransport
      .send({
        method: "POST",
        url: "https://external.example.test/v1/x",
        headers: {},
        bodyText: "{}",
        timeoutMs: 5,
      })
      .catch((error: unknown) => error);
    expect(timeout).toBeInstanceOf(TalentExternalTransportError);
    expect((timeout as TalentExternalTransportError).kind).toBe("timeout");

    const connectionTransport = createFetchTalentExternalTransport(async () => {
      throw new Error("ECONNREFUSED");
    });
    const connection = await connectionTransport
      .send({
        method: "POST",
        url: "https://external.example.test/v1/x",
        headers: {},
        bodyText: "{}",
        timeoutMs: 5,
      })
      .catch((error: unknown) => error);
    expect((connection as TalentExternalTransportError).kind).toBe("connection");
  });
});
