/**
 * @description M8 集成状态读模型（`GET /api/admin/talent/integrations/status`，spec §8.2/§8.4）：
 *   按权限裁剪 report / advice 段；只返回源类型、配置是否完整、开关、最近运行、连续失败、
 *   熔断状态、最近错误摘要与 webhook 运行态；**不返回基址/密钥/token/对象信息/PII**。
 *   同步日志复用 M3/M5 的 `talent_sync_logs`（不新增集合），运行态来自进程内适配器快照。
 * @file server/utils/talent-integration-status.ts
 */
import type PocketBase from "pocketbase";
import type {
  TalentExternalCircuitState,
  TalentExternalLastError,
  TalentIntegrationAdviceStatus,
  TalentIntegrationReportStatus,
  TalentIntegrationStatusPayload,
  TalentIntegrationSyncRunStatus,
  TalentIntegrationWebhookStatus,
} from "~~/shared/types/talent-external";
import {
  TALENT_EXTERNAL_DEFAULT_RUN_BUDGET_MS,
  describeTalentExternalConfiguration,
  getTalentExternalRuntimeSnapshot,
  getTalentWebhookRuntimeSnapshot,
  isTalentExternalWebhookEnabled,
  sanitizeTalentExternalText,
} from "./talent-external-adapter";

const SYNC_STATUS_LABELS: Readonly<Record<string, string>> = {
  success: "成功",
  partial: "部分成功",
  failed: "失败",
};

const REPORT_SYNC_SCOPE = "gene_report";
const ADVICE_SYNC_SCOPE = "advice_version";

export interface TalentIntegrationPermissions {
  /** `talent:report:sync`。 */
  report: boolean;
  /** `talent:advice:sync`。 */
  advice: boolean;
}

function envFlag(
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: boolean,
): boolean {
  const raw = String(env[name] ?? "").trim().toLowerCase();
  if (!raw) return fallback;
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  return fallback;
}

function envInt(
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Number.parseInt(String(env[name] ?? "").trim(), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function isoOrEmpty(value: unknown): string {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : text;
}

function addMsIso(baseIso: string, ms: number): string {
  const base = Date.parse(baseIso);
  const from = Number.isFinite(base) ? base : Date.now();
  return new Date(from + ms).toISOString();
}

/** 连续失败数：从最新一条往回数，遇到 success 停止。 */
export function countConsecutiveTalentSyncFailures(
  runs: readonly TalentIntegrationSyncRunStatus[],
): number {
  let count = 0;
  for (const run of runs) {
    if (run.status === "success") break;
    count += 1;
  }
  return count;
}

/** 最近失败摘要（最多 3 条，脱敏；无 message 时给通用文案）。 */
export function buildTalentRecentErrors(
  runs: readonly TalentIntegrationSyncRunStatus[],
): TalentExternalLastError[] {
  return runs
    .filter((run) => run.status !== "success")
    .slice(0, 3)
    .map((run) => ({
      at: run.at,
      class: "business" as const,
      message: sanitizeTalentExternalText(
        run.message ||
          (run.status === "partial" ? "部分对象同步失败" : "同步失败"),
      ),
    }));
}

function resolveCircuitState(
  scope: "gene_report" | "advice_version",
  fallback: TalentExternalCircuitState,
): TalentExternalCircuitState {
  try {
    return getTalentExternalRuntimeSnapshot(scope).circuitState;
  } catch {
    return fallback;
  }
}

function resolveLastError(
  scope: "gene_report" | "advice_version",
  recentErrors: readonly TalentExternalLastError[],
): TalentExternalLastError | null {
  try {
    const runtime = getTalentExternalRuntimeSnapshot(scope);
    if (runtime.lastError) return runtime.lastError;
  } catch {
    // 忽略运行态读取失败，回退日志摘要。
  }
  return recentErrors[0] ?? null;
}

// ── 同步日志读模型（复用 `talent_sync_logs`，不新增集合） ──────────────────

interface TalentSyncLogRow {
  id: string;
  created: string;
  finishedAt?: string;
  status?: string;
  trigger?: string;
  durationMs?: number;
  scanned?: number;
  refreshed?: number;
  createdCount?: number;
  generated?: number;
  empty?: number;
  skipped?: number;
  failedCount?: number;
  message?: string;
  details?: {
    counts?: Record<string, number>;
    scope?: string;
  } | null;
}

/** 读取最近同步日志并按状态接口字段映射（只读；失败直接抛给路由）。 */
export async function loadTalentIntegrationSyncRuns(
  pb: PocketBase,
  syncScope: string,
  limit = 12,
): Promise<TalentIntegrationSyncRunStatus[]> {
  const page = await pb.collection("talent_sync_logs").getList<TalentSyncLogRow>(
    1,
    Math.max(1, Math.min(50, limit)),
    {
      filter: `syncScope = "${syncScope}"`,
      sort: "-created",
      $autoCancel: false,
    },
  );
  return page.items.map((row) => {
    const counts = row.details?.counts ?? {};
    const status = String(row.status ?? "");
    return {
      at: isoOrEmpty(row.finishedAt ?? row.created),
      status,
      statusLabel: SYNC_STATUS_LABELS[status] ?? "未知",
      scanned: Number(row.scanned ?? counts.scanned ?? 0) || 0,
      refreshed: Number(row.refreshed ?? counts.refreshed ?? 0) || 0,
      created: Number(row.createdCount ?? row.generated ?? counts.created ?? 0) || 0,
      empty: Number(row.empty ?? row.skipped ?? counts.empty ?? 0) || 0,
      failed: Number(row.failedCount ?? counts.failed ?? 0) || 0,
      durationMs: Number(row.durationMs ?? 0) || 0,
      ...(row.trigger ? { trigger: String(row.trigger) } : {}),
      ...(row.message ? { message: String(row.message) } : {}),
    };
  });
}

/** 读取当前生效建议版本（只读；无则空串）。 */
export async function loadTalentActiveAdviceVersion(
  pb: PocketBase,
): Promise<{ versionNo: string; nextUpdateAt: string } | null> {
  try {
    const page = await pb.collection("talent_advice_versions").getList<{
      versionNo?: string;
      nextUpdateAt?: string;
    }>(1, 1, {
      filter: 'status = "active"',
      sort: "-effectiveAt",
      $autoCancel: false,
    });
    const row = page.items[0];
    if (!row) return null;
    return {
      versionNo: String(row.versionNo ?? ""),
      nextUpdateAt: isoOrEmpty(row.nextUpdateAt),
    };
  } catch {
    return null;
  }
}

// ── 状态组装（纯函数，可单测；PB 读取在路由/loader 中） ────────────────────

export interface BuildTalentIntegrationStatusInput {
  env?: NodeJS.ProcessEnv;
  permissions: TalentIntegrationPermissions;
  now?: Date;
  reportRuns?: readonly TalentIntegrationSyncRunStatus[];
  adviceRuns?: readonly TalentIntegrationSyncRunStatus[];
  activeAdvice?: { versionNo: string; nextUpdateAt: string } | null;
  webhook?: TalentIntegrationWebhookStatus | null;
}

/**
 * 组装状态响应：只返回调用者有权限的段（spec §8.2）；字段不含基址/密钥/PII。
 * PDF 段由 M8-A 负责，本任务不重复；`webhook` 段两者任一可见。
 */
export function buildTalentIntegrationStatus(
  input: BuildTalentIntegrationStatusInput,
): TalentIntegrationStatusPayload {
  const env = input.env ?? process.env;
  const now = input.now ?? new Date();
  const reportRuns = input.reportRuns ?? [];
  const adviceRuns = input.adviceRuns ?? [];
  const payload: TalentIntegrationStatusPayload = {};

  if (input.permissions.report) {
    const config = describeTalentExternalConfiguration("gene_report", env);
    const recentErrors = buildTalentRecentErrors(reportRuns);
    const lastRun = reportRuns[0] ?? null;
    const enabled = envFlag(env, "TALENT_GENE_REPORT_SYNC_ENABLED", true);
    const intervalMs = envInt(
      env,
      "TALENT_GENE_REPORT_SYNC_INTERVAL_MS",
      6 * 60 * 60_000,
      10 * 60_000,
      24 * 60 * 60_000,
    );
    const report: TalentIntegrationReportStatus = {
      source: config.source,
      configured: config.configured,
      enabled,
      lastRun,
      consecutiveFailures: countConsecutiveTalentSyncFailures(reportRuns),
      circuitState: resolveCircuitState("gene_report", "closed"),
      nextRunAt: enabled ? addMsIso(lastRun?.at || now.toISOString(), intervalMs) : "",
      lastError: resolveLastError("gene_report", recentErrors),
      recentErrors,
    };
    payload.report = report;
  }

  if (input.permissions.advice) {
    const config = describeTalentExternalConfiguration("advice_version", env);
    const recentErrors = buildTalentRecentErrors(adviceRuns);
    const lastRun = adviceRuns[0] ?? null;
    const advice: TalentIntegrationAdviceStatus = {
      source: config.source,
      configured: config.configured,
      enabled: envFlag(env, "TALENT_ADVICE_SYNC_ENABLED", true),
      activeVersion: input.activeAdvice?.versionNo ?? "",
      nextUpdateAt: input.activeAdvice?.nextUpdateAt ?? "",
      lastRun,
      consecutiveFailures: countConsecutiveTalentSyncFailures(adviceRuns),
      circuitState: resolveCircuitState("advice_version", "closed"),
      lastError: resolveLastError("advice_version", recentErrors),
      recentErrors,
    };
    payload.advice = advice;
  }

  if (input.permissions.report || input.permissions.advice) {
    const webhookRuntime = getTalentWebhookRuntimeSnapshot();
    payload.webhook = input.webhook ?? {
      enabled: isTalentExternalWebhookEnabled(env),
      lastEventAt: webhookRuntime.lastEventAt,
      lastError: webhookRuntime.lastError,
    };
  }
  return payload;
}

/** 路由用：读取 PB 后组装状态；PB 读取失败回退空运行列表（状态接口仍可用）。 */
export async function loadTalentIntegrationStatus(
  pb: PocketBase,
  input: Omit<BuildTalentIntegrationStatusInput, "reportRuns" | "adviceRuns" | "activeAdvice">,
): Promise<TalentIntegrationStatusPayload> {
  const [reportRuns, adviceRuns, activeAdvice] = await Promise.all([
    input.permissions.report
      ? loadTalentIntegrationSyncRuns(pb, REPORT_SYNC_SCOPE).catch(() => [])
      : Promise.resolve([]),
    input.permissions.advice
      ? loadTalentIntegrationSyncRuns(pb, ADVICE_SYNC_SCOPE).catch(() => [])
      : Promise.resolve([]),
    input.permissions.advice
      ? loadTalentActiveAdviceVersion(pb).catch(() => null)
      : Promise.resolve(null),
  ]);
  return buildTalentIntegrationStatus({
    ...input,
    reportRuns,
    adviceRuns,
    activeAdvice,
  });
}

/** 预算/开关只读读取（供后续调度插件复用；不写配置）。 */
export function resolveTalentIntegrationRunBudgetMs(
  env: NodeJS.ProcessEnv = process.env,
): number {
  return envInt(
    env,
    "TALENT_EXTERNAL_RUN_BUDGET_MS",
    TALENT_EXTERNAL_DEFAULT_RUN_BUDGET_MS,
    10_000,
    3_600_000,
  );
}