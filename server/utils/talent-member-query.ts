/**
 * @description M2 会员域子女查询状态机与可替换外部查询源：
 *   四态（未查询 / 查询中 / 已查到 / 未查到）+ 三类归因（信息不一致 / 接口异常 / 未出结果）；
 *   `querySeq` 作为回执幂等令牌，迟到 / 无归属 / 已解绑回执一律丢弃；30 秒重查节流；
 *   `querying` 超阈值（默认 24h）转 `not_found/api_error` 并写 `error_logs` 告警。
 *   M2 固定 Mock 源（五种模式），M8 只替换 `TalentGeneQuerySource` 实现，不改调用方与前端。
 * @file server/utils/talent-member-query.ts
 */
import type PocketBase from "pocketbase";
import {
  TALENT_QUERY_REASONS,
  type TalentChildQuery,
  type TalentChildRecord,
  type TalentMemberGender,
  type TalentParentRecord,
  type TalentQueryReason,
} from "~~/shared/types/talent-member";
import { recordError } from "./error-log";
import { getAdminPB } from "./pocketbase-client";
import {
  conflictTalentMember,
  formatTalentMemberDateTime,
  invalidTalentMember,
  isTalentParentActive,
  notFoundTalentMember,
} from "./talent-member";
import { decryptTalentSensitive } from "./talent-member-crypto";
import { createExternalTalentGeneQuerySource } from "./talent-external-sources";

/** Mock 源标识；M8 换成真实源时保留该常量用于日志与断言。 */
export const TALENT_GENE_QUERY_MOCK_SOURCE = "mock";
/** 真实外部源标识（M8 适配器骨架）。 */
export const TALENT_GENE_QUERY_EXTERNAL_SOURCE = "external";
/** 单子女「重新查询」最小间隔：30 秒内重复点击不重复发起。 */
export const TALENT_QUERY_MIN_INTERVAL_MS = 30_000;
/** `querying` 超时阈值默认 24 小时（M8 可调）。 */
export const TALENT_QUERY_TIMEOUT_HOURS_DEFAULT = 24;
/** 超时扫描间隔默认 10 分钟（由 Nitro 插件消费）。 */
export const TALENT_QUERY_SWEEP_INTERVAL_MS_DEFAULT = 600_000;
/** Mock 回执默认延迟。 */
export const TALENT_GENE_QUERY_MOCK_DELAY_MS_DEFAULT = 1_500;

/** Mock 五种模式：成功 / 信息不一致 / 接口异常 / 未出结果 / 挂起不回执。 */
export const TALENT_GENE_QUERY_MOCK_MODES = [
  "success",
  "info_mismatch",
  "api_error",
  "no_result",
  "pending",
] as const;
export type TalentGeneQueryMockMode =
  (typeof TALENT_GENE_QUERY_MOCK_MODES)[number];

// ── 适配器契约（M2 冻结；M8 只换实现） ──────────────────────────────────────────────

export interface TalentGeneQueryRequest {
  childId: string;
  parentId: string;
  /** 回执幂等键 = `${childId}:${seq}`。 */
  seq: number;
  name: string;
  gender: TalentMemberGender;
  birthday: string;
  /** 明文仅存在于内存：不落库、不进日志。 */
  idNo: string;
  /** 家长手机号明文，同上。 */
  mobile: string;
}

export interface TalentGeneQueryReceipt {
  /** `${childId}:${seq}`。 */
  idempotencyKey: string;
  childId: string;
  seq: number;
  outcome: "found" | "not_found";
  /** `not_found` 时必填。 */
  reason?: TalentQueryReason;
  externalRef?: string;
  /** ISO 字符串。 */
  receivedAt: string;
}

export interface TalentGeneQuerySource {
  readonly source: string;
  submit(
    request: TalentGeneQueryRequest,
  ): Promise<{ accepted: boolean; externalRef?: string }>;
}

// ── 环境变量解析（纯函数，便于测试与 M8 调参） ───────────────────────────────────────

function positiveNumber(value: unknown, fallback: number): number {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : fallback;
}

function nonNegativeNumber(value: unknown, fallback: number): number {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : fallback;
}

export function resolveTalentQueryTimeoutHours(
  env: NodeJS.ProcessEnv = process.env,
): number {
  return positiveNumber(
    env.TALENT_QUERY_TIMEOUT_HOURS,
    TALENT_QUERY_TIMEOUT_HOURS_DEFAULT,
  );
}

export function resolveTalentQuerySweepIntervalMs(
  env: NodeJS.ProcessEnv = process.env,
): number {
  return positiveNumber(
    env.TALENT_QUERY_SWEEP_INTERVAL_MS,
    TALENT_QUERY_SWEEP_INTERVAL_MS_DEFAULT,
  );
}

/** 解析查询源类型：默认 mock，只有显式 `external` 才切换（M8）。 */
export function resolveTalentGeneQuerySourceKind(
  env: NodeJS.ProcessEnv = process.env,
): "mock" | "external" {
  const raw = String(env.TALENT_GENE_QUERY_SOURCE || "")
    .trim()
    .toLowerCase();
  return raw === TALENT_GENE_QUERY_EXTERNAL_SOURCE ? "external" : "mock";
}

export function resolveTalentGeneQueryMockDelayMs(
  env: NodeJS.ProcessEnv = process.env,
): number {
  return nonNegativeNumber(
    env.TALENT_GENE_QUERY_MOCK_DELAY_MS,
    TALENT_GENE_QUERY_MOCK_DELAY_MS_DEFAULT,
  );
}

export function resolveTalentGeneQueryMockMode(
  env: NodeJS.ProcessEnv = process.env,
): TalentGeneQueryMockMode {
  const raw = String(env.TALENT_GENE_QUERY_MOCK_MODE || "").trim();
  return (TALENT_GENE_QUERY_MOCK_MODES as readonly string[]).includes(raw)
    ? (raw as TalentGeneQueryMockMode)
    : "success";
}

// ── PocketBase 连接：默认唯一超管客户端；测试可注入内存实现 ────────────────────────────

type TalentMemberQueryPBProvider = () => PocketBase | Promise<PocketBase>;

let talentMemberQueryPBProvider: TalentMemberQueryPBProvider | null = null;

/** 仅测试 / 插件注入用：覆盖查询模块使用的 PocketBase 连接。 */
export function setTalentMemberQueryPBProvider(
  provider: TalentMemberQueryPBProvider | null,
): void {
  talentMemberQueryPBProvider = provider;
}

async function resolveTalentMemberQueryPB(): Promise<PocketBase> {
  if (talentMemberQueryPBProvider) return talentMemberQueryPBProvider();
  return getAdminPB();
}

function parseTalentMemberDateValue(value: unknown): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const time = Date.parse(raw);
  return Number.isFinite(time) ? time : null;
}

function isTalentQueryReason(value: unknown): value is TalentQueryReason {
  return (TALENT_QUERY_REASONS as readonly string[]).includes(String(value ?? ""));
}

// ── 发起查询 ────────────────────────────────────────────────────────────────────

export interface SubmitTalentChildQueryOptions {
  source?: TalentGeneQuerySource;
  /** 测试注入当前时间；默认 `new Date()`。 */
  now?: Date;
  /** 测试注入节流窗口；默认 30s。 */
  minIntervalMs?: number;
}

export interface SubmitTalentChildQueryResult {
  accepted: boolean;
  throttled: boolean;
  child: TalentChildRecord;
}

/**
 * 重新发起子女查询（新建 / 编辑关键字段 / 手动重查共用）。
 * - 已解绑 409、家长停用 409、已查到 422；
 * - `querying` 或 30s 节流期内：`accepted=false`、`throttled=true`，幂等返回当前状态；
 * - 先落库 `querying` 再调用适配器；适配器抛错或 `accepted=false` 时置 `not_found/api_error`。
 */
export async function submitTalentChildQuery(
  childId: string,
  options: SubmitTalentChildQueryOptions = {},
): Promise<SubmitTalentChildQueryResult> {
  const pb = await resolveTalentMemberQueryPB();
  const now = options.now ?? new Date();
  const minIntervalMs = positiveNumber(
    options.minIntervalMs,
    TALENT_QUERY_MIN_INTERVAL_MS,
  );
  let child: TalentChildRecord;
  try {
    child = await pb
      .collection("talent_children")
      .getOne<TalentChildRecord>(String(childId), { $autoCancel: false });
  } catch {
    throw notFoundTalentMember("子女档案不存在");
  }
  if (String(child.status) === "2")
    throw conflictTalentMember("该子女已解绑，不能发起查询");
  let parent: TalentParentRecord | null = null;
  if (String(child.parentId || "").trim()) {
    try {
      parent = await pb
        .collection("talent_parents")
        .getOne<TalentParentRecord>(String(child.parentId), {
          $autoCancel: false,
        });
    } catch {
      parent = null;
    }
  }
  if (!parent || !isTalentParentActive(parent.status))
    throw conflictTalentMember("所属家长档案不存在或已停用，不能发起查询");
  const query = String(child.query || "unqueried") as TalentChildQuery;
  if (query === "found")
    throw invalidTalentMember("已查到结果的子女无需重复查询");
  if (query === "querying")
    return { accepted: false, throttled: true, child };
  const lastQueryAt = parseTalentMemberDateValue(child.queryAt);
  if (
    lastQueryAt !== null &&
    now.getTime() - lastQueryAt < minIntervalMs
  )
    return { accepted: false, throttled: true, child };

  // 先解析源：`external` 缺配置时在写库前 503，避免把子女留在「查询中」。
  const source = options.source ?? createTalentGeneQuerySource();
  const previousSeq = Number(child.querySeq || 0);
  const seq = (Number.isFinite(previousSeq) ? previousSeq : 0) + 1;
  const attempts = Number(child.queryAttempts || 0) + 1;
  const startedAt = formatTalentMemberDateTime(now);
  const updated = await pb
    .collection("talent_children")
    .update<TalentChildRecord>(
      child.id,
      {
        query: "querying",
        queryReason: "",
        querySeq: seq,
        queryAttempts: attempts,
        queryStartedAt: startedAt,
        queryAt: startedAt,
      },
      { $autoCancel: false },
    );

  let idNo = "";
  let mobile = "";
  try {
    idNo = decryptTalentSensitive(child.idNoCipher);
    mobile = decryptTalentSensitive(parent.mobileCipher);
  } catch {
    // 解密失败不降级明文：本次查询直接按接口异常处理。
    return {
      accepted: false,
      throttled: false,
      child: await markTalentChildQueryFailed(child.id, { now }),
    };
  }

  const request: TalentGeneQueryRequest = {
    childId: child.id,
    parentId: parent.id,
    seq,
    name: String(child.name || ""),
    gender: child.gender,
    birthday: String(child.birthday || ""),
    idNo,
    mobile,
  };
  let accepted = false;
  try {
    const result = await source.submit(request);
    accepted = Boolean(result?.accepted);
  } catch {
    accepted = false;
  }
  if (!accepted)
    return {
      accepted: false,
      throttled: false,
      child: await markTalentChildQueryFailed(child.id, { now }),
    };
  return { accepted: true, throttled: false, child: updated };
}

/** 发起即失败（适配器抛错 / 拒绝 / 明文解密失败）：置 `not_found/api_error`。 */
export async function markTalentChildQueryFailed(
  childId: string,
  options: { now?: Date } = {},
): Promise<TalentChildRecord> {
  const pb = await resolveTalentMemberQueryPB();
  const now = options.now ?? new Date();
  return pb
    .collection("talent_children")
    .update<TalentChildRecord>(
      String(childId),
      {
        query: "not_found",
        queryReason: "api_error",
        queryAt: formatTalentMemberDateTime(now),
        queryStartedAt: "",
      },
      { $autoCancel: false },
    );
}

// ── 回执落库：四条守卫 + 幂等键 ─────────────────────────────────────────────────────

/**
 * 回执落库守卫：无归属 / 已解绑归档 / 非查询中 / seq 不匹配 / 幂等键不符 → 丢弃。
 * 回执只更新已有子女档案的查询字段，**不创建**家长 / 子女 / 报告记录。
 */
export async function applyTalentGeneQueryReceipt(
  receipt: TalentGeneQueryReceipt,
): Promise<"applied" | "discarded"> {
  if (!receipt || typeof receipt !== "object") return "discarded";
  const childId = String(receipt.childId ?? "").trim();
  if (!childId) return "discarded";
  const seq = Number(receipt.seq);
  if (!Number.isFinite(seq)) return "discarded";
  if (
    String(receipt.idempotencyKey || "") !== "" &&
    String(receipt.idempotencyKey) !== `${childId}:${seq}`
  )
    return "discarded";
  if (receipt.outcome !== "found" && receipt.outcome !== "not_found")
    return "discarded";
  if (receipt.outcome === "not_found" && !isTalentQueryReason(receipt.reason))
    return "discarded";
  const pb = await resolveTalentMemberQueryPB();
  let child: TalentChildRecord;
  try {
    child = await pb
      .collection("talent_children")
      .getOne<TalentChildRecord>(childId, { $autoCancel: false });
  } catch {
    return "discarded";
  }
  if (String(child.status) !== "1") return "discarded";
  if (String(child.query) !== "querying") return "discarded";
  if (Number(child.querySeq) !== seq) return "discarded";
  const receivedAt = parseTalentMemberDateValue(receipt.receivedAt);
  const queryAt = formatTalentMemberDateTime(
    receivedAt === null ? new Date() : new Date(receivedAt),
  );
  await pb.collection("talent_children").update(
    child.id,
    {
      query: receipt.outcome,
      queryReason: receipt.outcome === "not_found" ? receipt.reason : "",
      queryAt,
      queryStartedAt: "",
    },
    { $autoCancel: false },
  );
  return "applied";
}

// ── 超时扫描：查询中永不回执的唯一兜底 ───────────────────────────────────────────────

/**
 * 扫描超时未回执的子女：`query="querying" && status="1"` 且 `queryStartedAt`
 * 早于 `now - 阈值`（缺失视为超时）→ `not_found/api_error` + `error_logs` 告警。
 */
export async function sweepTalentQueryTimeouts(
  options: { timeoutHours?: number; now?: Date } = {},
): Promise<{ scanned: number; converted: number }> {
  const pb = await resolveTalentMemberQueryPB();
  const now = options.now ?? new Date();
  const timeoutHours = positiveNumber(
    options.timeoutHours,
    resolveTalentQueryTimeoutHours(),
  );
  const cutoff = now.getTime() - timeoutHours * 60 * 60 * 1000;
  const rows = await pb.collection("talent_children").getFullList<
    TalentChildRecord
  >({
    filter: 'query = "querying" && status = "1"',
    $autoCancel: false,
  });
  let converted = 0;
  for (const row of rows) {
    const startedAt = parseTalentMemberDateValue(row.queryStartedAt);
    if (startedAt !== null && startedAt >= cutoff) continue;
    await pb.collection("talent_children").update(
      row.id,
      {
        query: "not_found",
        queryReason: "api_error",
        queryAt: formatTalentMemberDateTime(now),
        queryStartedAt: "",
      },
      { $autoCancel: false },
    );
    converted += 1;
    const seq = Number(row.querySeq || 0);
    console.warn(
      `[talent-member] 子女查询超时未回执 childId=${row.id} seq=${seq} hours=${timeoutHours}`,
    );
    await recordError(pb, {
      source: "api",
      level: "warn",
      message: "[talent-member] 子女查询超时未回执",
      meta: { childId: row.id, seq, hours: timeoutHours },
    });
  }
  return { scanned: rows.length, converted };
}

// ── Mock 查询源（M2 验收用；生产 M8 必须切真实源） ───────────────────────────────────

export interface TalentGeneQueryMockOptions {
  mode?: TalentGeneQueryMockMode;
  /** 回执延迟；默认读环境变量，环境变量缺省 1500ms。 */
  delayMs?: number;
  /** 回执落点；默认调用 `applyTalentGeneQueryReceipt`。测试可注入以捕获回执。 */
  dispatch?: (receipt: TalentGeneQueryReceipt) => unknown | Promise<unknown>;
  env?: NodeJS.ProcessEnv;
}

function scheduleMockReceipt(
  dispatch: (receipt: TalentGeneQueryReceipt) => unknown | Promise<unknown>,
  receipt: TalentGeneQueryReceipt,
  delayMs: number,
): void {
  const timer = setTimeout(() => {
    void Promise.resolve(dispatch(receipt)).catch((error) => {
      console.warn(
        `[talent-member] Mock 回执写入失败：${error instanceof Error ? error.message : String(error)}`,
      );
    });
  }, delayMs);
  const handle = timer as unknown as { unref?: () => void };
  if (typeof handle.unref === "function") handle.unref();
}

/** 创建 Mock 查询源；五种模式见 `TALENT_GENE_QUERY_MOCK_MODES`。 */
export function createMockTalentGeneQuerySource(
  options: TalentGeneQueryMockOptions = {},
): TalentGeneQuerySource {
  const env = options.env ?? process.env;
  const mode = options.mode ?? resolveTalentGeneQueryMockMode(env);
  const delayMs = nonNegativeNumber(
    options.delayMs,
    resolveTalentGeneQueryMockDelayMs(env),
  );
  const dispatch =
    options.dispatch ?? ((receipt) => applyTalentGeneQueryReceipt(receipt));
  return {
    source: TALENT_GENE_QUERY_MOCK_SOURCE,
    async submit(request) {
      // api_error 模拟「发起即失败」，由 submitTalentChildQuery 置 not_found/api_error。
      if (mode === "api_error") return { accepted: false };
      // pending 不回执，用于验证超时扫描与迟到回执。
      if (mode === "pending") return { accepted: true };
      const outcome: TalentGeneQueryReceipt["outcome"] =
        mode === "success" ? "found" : "not_found";
      const reason: TalentQueryReason | undefined =
        mode === "info_mismatch"
          ? "info_mismatch"
          : mode === "no_result"
            ? "no_result"
            : undefined;
      const receipt: TalentGeneQueryReceipt = {
        idempotencyKey: `${request.childId}:${request.seq}`,
        childId: request.childId,
        seq: request.seq,
        outcome,
        ...(reason ? { reason } : {}),
        externalRef: `mock-${request.childId}-${request.seq}`,
        receivedAt: new Date().toISOString(),
      };
      scheduleMockReceipt(dispatch, receipt, delayMs);
      return { accepted: true, externalRef: receipt.externalRef };
    },
  };
}

/**
 * M2 查询源工厂：默认 Mock；`TALENT_GENE_QUERY_SOURCE=external` 时走 M8 适配器
 * （缺配置 503 `EXTERNAL_SOURCE_UNAVAILABLE`，不静默降级）。调用方与前端不变。
 */
export function createTalentGeneQuerySource(
  env: NodeJS.ProcessEnv = process.env,
): TalentGeneQuerySource {
  if (resolveTalentGeneQuerySourceKind(env) === TALENT_GENE_QUERY_EXTERNAL_SOURCE)
    return createExternalTalentGeneQuerySource({ env });
  return createMockTalentGeneQuerySource({
    env,
    mode: resolveTalentGeneQueryMockMode(env),
    delayMs: resolveTalentGeneQueryMockDelayMs(env),
  });
}
