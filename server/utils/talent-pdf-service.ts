/**
 * @description M8 PDF 下载链路服务：双路径鉴权（Bearer / 120s ticket）、报告与开放册门禁、
 *   内容哈希缓存 + 单飞渲染、私有存储解密、下载留痕与频率限制、ticket 签发。
 *   错误码与 HTTP 状态严格按 docs/specs/M8-external/spec.md §6.8–§6.11；
 *   下载留痕只写摘要（不写姓名 / 手机号 / 证件 / 完整 IP / UA 原文）。
 * @file server/utils/talent-pdf-service.ts
 */
import { randomUUID } from "node:crypto";
import { createError, getHeader, getRequestIP, type H3Event } from "h3";
import type PocketBase from "pocketbase";
import type { TalentParentRecord } from "~~/shared/types/talent-member";
import type {
  TalentReportFactorSnapshotItem,
  TalentReportRecord,
  TalentReportVolumeSnapshot,
} from "~~/shared/types/talent-report";
import type {
  TalentPdfDownloadResult,
  TalentReportPdfRecord,
} from "~~/shared/types/talent-pdf";
import { TALENT_PDF_DOWNLOAD_COLLECTION, TALENT_REPORT_PDF_COLLECTION } from "~~/shared/types/talent-pdf";
import { getCurrentUserBasic } from "./auth";
import { recordError } from "./error-log";
import { escapeFilterValue, getAdminPB } from "./pocketbase-client";
import { getTalentChildOrThrow, isTalentParentActive, resolveTalentParentByUserId, assertTalentChildOwnership } from "./talent-member";
import {
  assertTalentReportPublished,
  getTalentReportOrThrow,
  loadTalentReportGeneReport,
} from "./talent-report";
import { isTalentReportVolumeId, normalizeTalentReportVolumeIds } from "./talent-report-snapshot";
import {
  TALENT_PDF_TEMPLATE_VERSION,
  detectTalentPdfUaFamily,
  hashTalentPdfPrivacyValue,
  isTalentPdfEnabled,
  talentPdfDownloadLimit,
  talentPdfFontUnavailable,
  talentPdfMaxBytes,
  talentPdfMaxConcurrency,
  talentPdfNotReady,
  talentPdfQueueLimit,
  talentPdfRenderBusy,
  talentPdfRenderFailed,
  talentPdfRenderTimeout,
  talentPdfRenderTimeoutMs,
  talentPdfVolumeNotFound,
  talentPdfWatermarkPolicy,
  talentPublicApiBaseUrl,
} from "./talent-pdf-config";
import {
  buildTalentPdfDocumentModel,
  computeTalentPdfContentHash,
  computeTalentPdfWatermarkIdentityHash,
  isTalentPdfDocumentRenderable,
  talentPdfFileName,
  type TalentPdfSubjectInfo,
} from "./talent-pdf-document";
import { TalentPdfFontUnavailableError, resolveTalentPdfFont } from "./talent-pdf-font";
import { TalentPdfTooLargeError, renderTalentPdf } from "./talent-pdf-render";
import { readTalentPdfObject, storeTalentPdfObject } from "./talent-pdf-storage";
import { signTalentPdfTicket, verifyTalentPdfTicket } from "./talent-pdf-ticket";

// ── 请求身份与归属 ──────────────────────────────────────────────────────────

export interface TalentPdfRequester {
  userId: string;
  parent: TalentParentRecord;
  via: "bearer" | "ticket";
}

function reportNotFound() {
  return createError({ statusCode: 404, message: "报告不存在", data: { code: "REPORT_NOT_FOUND" } });
}

function accountDisabled() {
  return createError({ statusCode: 403, message: "账号已停用", data: { code: "ACCOUNT_DISABLED" } });
}

function unauthorized() {
  return createError({ statusCode: 401, message: "未登录", data: { code: "UNAUTHORIZED" } });
}

function requestIdOf(event: H3Event): string {
  const context = event.context as unknown as Record<string, unknown>;
  const existing = String(context.__talentPdfRequestId ?? context.requestId ?? "").trim();
  if (existing) return existing;
  const generated = randomUUID();
  context.__talentPdfRequestId = generated;
  return generated;
}

function clientIpOf(event: H3Event): string {
  try {
    return String(getRequestIP(event, { xForwardedFor: true }) ?? "").trim();
  } catch {
    return "";
  }
}

async function resolveBearerRequester(event: H3Event): Promise<TalentPdfRequester> {
  const user = await getCurrentUserBasic(event);
  const userId = String(user.id ?? "");
  if (!userId) throw unauthorized();
  if (String(user.status ?? "") === "0") throw accountDisabled();
  const pb = await getAdminPB();
  const parent = await resolveTalentParentByUserId(pb, userId);
  if (!parent || !isTalentParentActive(parent.status)) throw reportNotFound();
  return { userId, parent, via: "bearer" };
}

/** ticket 只解决「H5 新窗口带不了 Header」；命中后重新校验账号 / 家长（§6.8）。 */
async function resolveTicketRequester(
  ticket: string,
  options: { reportId: string; volumeId: string },
): Promise<TalentPdfRequester> {
  const payload = verifyTalentPdfTicket(ticket, {
    expectedReportId: options.reportId,
    expectedVolumeId: options.volumeId,
  });
  const pb = await getAdminPB();
  let user: { id?: string; status?: string; forceLogoutAt?: string } | null = null;
  try {
    user = await pb.collection("users").getOne(payload.u, { $autoCancel: false });
  } catch {
    user = null;
  }
  if (!user || !user.id) throw unauthorized();
  if (String(user.status ?? "") === "0") throw accountDisabled();
  if (String(user.forceLogoutAt ?? "")) throw unauthorized();
  const parent = await resolveTalentParentByUserId(pb, user.id);
  if (!parent || !isTalentParentActive(parent.status)) throw reportNotFound();
  if (parent.id !== payload.p) throw reportNotFound();
  return { userId: user.id, parent, via: "ticket" };
}

/**
 * 报告 / 开放册门禁（纯函数，单测覆盖）：越权 404、未发布 409、未开放 404、
 * 渲染关闭 / 空册 404 `PDF_NOT_READY`（§6.11）。
 */
export function assertTalentPdfGate(input: {
  report: Pick<
    TalentReportRecord,
    "status" | "parentId" | "openVolumeIds" | "volumeSnapshot"
  >;
  parentId: string;
  volumeId: string;
  pdfEnabled?: boolean;
}): TalentReportVolumeSnapshot {
  if (String(input.report.parentId ?? "") !== input.parentId) throw reportNotFound();
  assertTalentReportPublished(input.report);
  if (!isTalentReportVolumeId(input.volumeId)) throw talentPdfVolumeNotFound();
  const openVolumeIds = normalizeTalentReportVolumeIds(input.report.openVolumeIds);
  if (!openVolumeIds.includes(input.volumeId)) throw talentPdfVolumeNotFound();
  if (input.pdfEnabled === false) throw talentPdfNotReady();
  const volumes = Array.isArray(input.report.volumeSnapshot) ? input.report.volumeSnapshot : [];
  const volume = volumes.find((item) => String(item?.volumeId ?? "") === input.volumeId);
  if (!volume || volume.open !== true) throw talentPdfVolumeNotFound();
  if (!Array.isArray(volume.chapters) || !volume.chapters.some((chapter) => Array.isArray(chapter?.factors) && chapter.factors.length > 0))
    throw talentPdfNotReady();
  return volume;
}

async function assertSubjectAccess(pb: PocketBase, report: TalentReportRecord, parent: TalentParentRecord): Promise<void> {
  if (String(report.subjectType ?? "") === "self") {
    if (String(report.subjectId ?? "") !== parent.id) throw reportNotFound();
    return;
  }
  try {
    const child = await getTalentChildOrThrow(pb, String(report.subjectId ?? ""));
    assertTalentChildOwnership(parent, child);
  } catch {
    throw reportNotFound();
  }
}

// ── 频率限制（进程内令牌桶；单实例口径，§6.9） ───────────────────────────────

interface Bucket {
  tokens: number;
  updatedAt: number;
}

const rateBuckets = new Map<string, Bucket>();

function consumeToken(key: string, limit: number, windowMs = 60_000): boolean {
  const now = Date.now();
  const current = rateBuckets.get(key);
  if (!current || now - current.updatedAt >= windowMs) {
    rateBuckets.set(key, { tokens: limit - 1, updatedAt: now });
    return true;
  }
  if (current.tokens <= 0) return false;
  current.tokens -= 1;
  return true;
}

/** 测试用：清空限流与日志去重状态。 */
export function resetTalentPdfRuntimeState(): void {
  rateBuckets.clear();
  loggedGateAttempts.clear();
  loggedRateLimits.clear();
  loggedOperLogs.clear();
  waiters.length = 0;
  activeRenders = 0;
  inFlightRenders.clear();
}

// ── 渲染并发闸 / 单飞（§6.6） ────────────────────────────────────────────────

interface Waiter {
  resolve: () => void;
  timer: ReturnType<typeof setTimeout>;
}

let activeRenders = 0;
const waiters: Waiter[] = [];

function releaseRenderSlot(): void {
  activeRenders = Math.max(0, activeRenders - 1);
  const next = waiters.shift();
  if (!next) return;
  clearTimeout(next.timer);
  activeRenders += 1;
  next.resolve();
}

async function acquireRenderSlot(): Promise<() => void> {
  if (activeRenders < talentPdfMaxConcurrency()) {
    activeRenders += 1;
    return releaseRenderSlot;
  }
  if (waiters.length >= talentPdfQueueLimit()) throw talentPdfRenderBusy();
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      const index = waiters.findIndex((waiter) => waiter.resolve === resolve);
      if (index >= 0) waiters.splice(index, 1);
      reject(talentPdfRenderBusy());
    }, 5_000);
    waiters.push({ resolve, timer });
  });
  return releaseRenderSlot;
}

const inFlightRenders = new Map<string, Promise<StoredPdfResult>>();

async function withRenderTimeout<T>(work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(talentPdfRenderTimeout()), talentPdfRenderTimeoutMs());
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// ── 产物元数据 ──────────────────────────────────────────────────────────────

async function findPdfRecord(
  pb: PocketBase,
  reportId: string,
  volumeId: string,
  contentHash: string,
): Promise<TalentReportPdfRecord | null> {
  try {
    return await pb.collection(TALENT_REPORT_PDF_COLLECTION).getFirstListItem<TalentReportPdfRecord>(
      `reportId = "${escapeFilterValue(reportId)}" && volumeId = "${escapeFilterValue(volumeId)}" && contentHash = "${escapeFilterValue(contentHash)}"`,
      { $autoCancel: false },
    );
  } catch {
    return null;
  }
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function datePart(value: unknown): string {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(value ?? ""));
  return match?.[1] ?? todayDate();
}

interface StoredPdfResult {
  record: TalentReportPdfRecord;
  bytes: Uint8Array;
  cacheHit: boolean;
  renderMs: number;
}

async function createPdfRecord(
  pb: PocketBase,
  payload: Omit<TalentReportPdfRecord, "id" | "created" | "updated">,
): Promise<TalentReportPdfRecord> {
  return pb.collection(TALENT_REPORT_PDF_COLLECTION).create<TalentReportPdfRecord>(payload, {
    $autoCancel: false,
  });
}

// ── 渲染 + 加密存储 ─────────────────────────────────────────────────────────

interface RenderContext {
  report: TalentReportRecord;
  volume: TalentReportVolumeSnapshot;
  factorSnapshot: TalentReportFactorSnapshotItem[];
  subject: TalentPdfSubjectInfo | null;
  parent: TalentParentRecord;
  watermarkPolicy: ReturnType<typeof talentPdfWatermarkPolicy>;
  contentHash: string;
  fontVersion: string;
}

async function renderAndStore(
  pb: PocketBase,
  context: RenderContext,
  existing: TalentReportPdfRecord | null,
): Promise<StoredPdfResult> {
  const renderStart = Date.now();
  const watermarkAt = existing ? datePart(existing.watermarkAt) : todayDate();
  const bundle = await resolveTalentPdfFont();
  const model = buildTalentPdfDocumentModel({
    report: context.report,
    volume: context.volume,
    factorSnapshot: context.factorSnapshot,
    subject: context.subject,
    watermark: {
      parentName: String(context.parent.name ?? "").trim(),
      mobileLast4: last4OfMaskedMobile(context.parent.maskedMobile),
      reportNo: String(context.report.reportNo ?? ""),
      watermarkAt,
    },
    watermarkPolicy: context.watermarkPolicy,
  });
  if (!isTalentPdfDocumentRenderable(model)) throw talentPdfNotReady();

  const rendered = await renderTalentPdf(model, bundle, watermarkAt);
  if (rendered.missingGlyphs > 10)
    // 缺字只告警不阻断整册；不打印水印 / 姓名等明文。
    console.warn(`[talent-pdf] 报告 PDF 缺字 ${rendered.missingGlyphs} 个（reportId=${context.report.id} volumeId=${context.volume.volumeId}）`);
  if (rendered.bytes.byteLength > talentPdfMaxBytes())
    throw talentPdfRenderFailed("too_large");
  const fileName = talentPdfFileName(String(context.report.reportNo ?? ""), context.volume.name);
  const stored = await storeTalentPdfObject({
    reportId: String(context.report.id),
    volumeId: context.volume.volumeId,
    contentHash: context.contentHash,
    fileName,
    bytes: rendered.bytes,
  });
  const renderMs = Date.now() - renderStart;
  const base = {
    reportId: String(context.report.id),
    volumeId: context.volume.volumeId,
    contentHash: context.contentHash,
    snapshotVersion: Number(context.report.snapshotVersion ?? 0) || 0,
    storage: stored.storage,
    objectKey: stored.objectKey,
    fileName,
    byteSize: rendered.bytes.byteLength,
    pageCount: rendered.pageCount,
    templateVersion: TALENT_PDF_TEMPLATE_VERSION,
    fontVersion: context.fontVersion,
    watermarkPolicy: context.watermarkPolicy,
    watermarkAt,
    renderedAt: new Date().toISOString(),
  };
  if (existing) {
    const record = await pb.collection(TALENT_REPORT_PDF_COLLECTION).update<TalentReportPdfRecord>(existing.id, base, {
      $autoCancel: false,
    });
    return { record, bytes: rendered.bytes, cacheHit: false, renderMs };
  }
  try {
    const record = await createPdfRecord(pb, base);
    return { record, bytes: rendered.bytes, cacheHit: false, renderMs };
  } catch {
    // 并发创建撞唯一索引：以已存在行为准（刚写入的存储对象成为待清理孤儿，不影响下载）。
    const concurrent = await findPdfRecord(pb, base.reportId, base.volumeId, base.contentHash);
    if (!concurrent) throw talentPdfRenderFailed("metadata_write_failed");
    const bytes = await readTalentPdfObject(concurrent.storage, concurrent.objectKey);
    return { record: concurrent, bytes, cacheHit: true, renderMs };
  }
}

function last4OfMaskedMobile(maskedMobile: unknown): string {
  const digits = String(maskedMobile ?? "").replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : "";
}

async function resolveCacheOrRender(pb: PocketBase, context: RenderContext): Promise<StoredPdfResult> {
  const key = `${context.report.id}|${context.volume.volumeId}|${context.contentHash}`;
  const inFlight = inFlightRenders.get(key);
  if (inFlight) return inFlight;
  const task = (async () => {
    const existing = await findPdfRecord(pb, String(context.report.id), String(context.volume.volumeId), context.contentHash);
    if (existing) {
      try {
        const bytes = await readTalentPdfObject(existing.storage, existing.objectKey);
        return { record: existing, bytes, cacheHit: true, renderMs: 0 };
      } catch {
        // ENCRYPTION_KEY 轮换 / 存储对象丢失：视为缓存失效，按需重渲并回写元数据（§6.7）。
        const release = await acquireRenderSlot();
        try {
          return await withRenderTimeout(renderAndStore(pb, context, existing));
        } finally {
          release();
        }
      }
    }
    const release = await acquireRenderSlot();
    try {
      // 排队期间可能已被其它请求渲染：二次命中检查。
      const raced = await findPdfRecord(pb, String(context.report.id), String(context.volume.volumeId), context.contentHash);
      if (raced) {
        try {
          const bytes = await readTalentPdfObject(raced.storage, raced.objectKey);
          return { record: raced, bytes, cacheHit: true, renderMs: 0 };
        } catch {
          // 继续重渲
        }
      }
      return await withRenderTimeout(renderAndStore(pb, context, null));
    } finally {
      release();
    }
  })().finally(() => {
    inFlightRenders.delete(key);
  });
  inFlightRenders.set(key, task);
  return task;
}

// ── 下载留痕（只写摘要） ─────────────────────────────────────────────────────

export interface DownloadLogInput {
  reportId: string;
  volumeId: string;
  parentUserId: string;
  subjectType: string;
  subjectId: string;
  result: TalentPdfDownloadResult;
  storage?: string;
  contentHash?: string;
  renderMs?: number;
  cacheHit?: boolean;
  ip: string;
  uaFamily: string;
  requestId: string;
}

const loggedGateAttempts = new Map<string, number>();
const loggedRateLimits = new Map<string, number>();
const loggedOperLogs = new Map<string, number>();
const GATE_DEDUPE_MS = 60_000;
const OPER_LOG_DEDUPE_MS = 10 * 60_000;

/** 写一条 `talent_pdf_downloads` 摘要（导出以便单测验证留痕口径）。 */
export async function writeTalentPdfDownloadRecord(pb: PocketBase, input: DownloadLogInput): Promise<void> {
  await pb.collection(TALENT_PDF_DOWNLOAD_COLLECTION).create(
    {
      reportId: input.reportId,
      volumeId: input.volumeId,
      parentUserId: input.parentUserId,
      // 门禁拒绝时尚未加载报告，主体信息未知；required 字段用 unknown 占位，不写 PII。
      subjectType: input.subjectType || "unknown",
      subjectId: input.subjectId || "unknown",
      result: input.result,
      storage: input.storage ?? "",
      contentHash: input.contentHash ?? "",
      renderMs: input.renderMs ?? 0,
      cacheHit: Boolean(input.cacheHit),
      at: new Date().toISOString(),
      ipHash: input.ip ? hashTalentPdfPrivacyValue("pdf-ip", input.ip) : "",
      uaFamily: input.uaFamily || "unknown",
      requestId: input.requestId,
    },
    { $autoCancel: false },
  );
}

async function safeWriteDownloadLog(pb: PocketBase, input: DownloadLogInput): Promise<void> {
  try {
    if (input.result === "ticket_invalid" || input.result === "ticket_expired") return;
    if (input.result === "rate_limited") {
      const key = `${input.parentUserId}|${input.reportId}`;
      const last = loggedRateLimits.get(key) ?? 0;
      if (Date.now() - last < 60_000) return;
      loggedRateLimits.set(key, Date.now());
    } else if (input.result !== "ok") {
      const key = `${input.parentUserId}|${input.result}`;
      const last = loggedGateAttempts.get(key) ?? 0;
      if (Date.now() - last < GATE_DEDUPE_MS) return;
      loggedGateAttempts.set(key, Date.now());
    }
    await writeTalentPdfDownloadRecord(pb, input);
  } catch (error) {
    console.warn("[talent-pdf] 下载留痕写入失败：", error instanceof Error ? error.message : error);
  }
}

/** 下载成功写一条 oper_logs 摘要（不含正文 / 证件 / 手机号 / 存储地址；10 分钟去重防淹没后台日志）。 */
async function safeWriteOperLog(
  pb: PocketBase,
  input: { parentUserId: string; reportId: string; volumeId: string; requestId: string; costMs: number },
): Promise<void> {
  try {
    const key = `${input.parentUserId}|${input.reportId}|${input.volumeId}`;
    const last = loggedOperLogs.get(key) ?? 0;
    if (Date.now() - last < OPER_LOG_DEDUPE_MS) return;
    loggedOperLogs.set(key, Date.now());
    const parent = await pb.collection("users").getOne(input.parentUserId, { $autoCancel: false }).catch(() => null);
    await pb.collection("oper_logs").create(
      {
        title: `下载报告 PDF（${input.reportId} / ${input.volumeId}）`,
        operType: "C",
        requestMethod: "GET",
        operName: String(parent?.displayName || parent?.email || input.parentUserId),
        operUrl: `/api/client/talent/reports/${encodeURIComponent(input.reportId)}/volumes/${encodeURIComponent(input.volumeId)}/pdf`,
        status: 0,
        costTime: input.costMs,
        userId: input.parentUserId,
      },
      { $autoCancel: false },
    );
  } catch (error) {
    console.warn("[talent-pdf] oper_logs 摘要写入失败：", error instanceof Error ? error.message : error);
  }
}

function resultFromError(error: unknown): TalentPdfDownloadResult {
  const data = (error as { data?: { code?: string } } | null)?.data;
  const code = String(data?.code ?? "");
  if (code === "VOLUME_NOT_FOUND") return "not_open";
  if (code === "PDF_NOT_READY") return "not_ready";
  if (code === "REPORT_NOT_FOUND") return "forbidden";
  if (code === "report_pending" || code === "report_retracted") return "report_not_published";
  if (code === "PDF_RENDER_BUSY" || code === "PDF_RENDER_FAILED" || code === "PDF_RENDER_TIMEOUT") return "render_failed";
  return "render_failed";
}

// ── 对外入口：下载与 ticket ──────────────────────────────────────────────────

export interface TalentPdfDownloadPayload {
  bytes: Uint8Array;
  fileName: string;
  contentHash: string;
  storage: string;
  pageCount: number;
  cacheHit: boolean;
  renderMs: number;
}

interface GatedPdfContext {
  report: TalentReportRecord;
  volume: TalentReportVolumeSnapshot;
  geneReport: Awaited<ReturnType<typeof loadTalentReportGeneReport>>;
}

/** Bearer 优先；两者都无 → 401；ticket 只解决 H5 新窗口无法带 Header（§6.8）。 */
async function resolveTalentPdfRequester(
  event: H3Event,
  params: { reportId: string; volumeId: string; ticket: string },
): Promise<TalentPdfRequester> {
  const hasBearer = Boolean(String(getHeader(event, "authorization") ?? "").trim());
  if (hasBearer) return resolveBearerRequester(event);
  if (params.ticket)
    return resolveTicketRequester(params.ticket, { reportId: params.reportId, volumeId: params.volumeId });
  throw unauthorized();
}

/** 报告 / 主体归属 / 开放册门禁；统一在调用方写拒绝留痕（§6.9/§6.11）。 */
async function loadGatedPdfContext(
  pb: PocketBase,
  requester: TalentPdfRequester,
  params: { reportId: string; volumeId: string },
): Promise<GatedPdfContext> {
  let report: TalentReportRecord;
  try {
    report = await getTalentReportOrThrow(pb, params.reportId);
  } catch {
    throw reportNotFound();
  }
  await assertSubjectAccess(pb, report, requester.parent);
  const volume = assertTalentPdfGate({
    report,
    parentId: requester.parent.id,
    volumeId: params.volumeId,
    pdfEnabled: isTalentPdfEnabled(),
  });
  const geneReport = await loadTalentReportGeneReport(pb, report);
  return { report, volume, geneReport };
}

/** 频率限制：单家长 10 次/分钟、单 IP 30 次/分钟（进程内，单实例）。 */
function assertTalentPdfRateLimit(requester: TalentPdfRequester, ip: string): boolean {
  const parentAllowed = consumeToken(`parent:${requester.userId}`, 10);
  const limitKeyIp = ip ? `ip:${hashTalentPdfPrivacyValue("pdf-ip-limit", ip)}` : "";
  const ipAllowed = !limitKeyIp || consumeToken(limitKeyIp, 30);
  return parentAllowed && ipAllowed;
}

function subjectInfoOf(geneReport: Awaited<ReturnType<typeof loadTalentReportGeneReport>>): TalentPdfSubjectInfo | null {
  if (!geneReport) return null;
  return {
    name: String(geneReport.name ?? "").trim(),
    genderLabel: String(geneReport.gender ?? "") === "male" ? "男" : "女",
    age: Number(geneReport.age ?? 0) || 0,
  };
}

/**
 * 按已通过门禁的报告上下文生成 / 复用单册 PDF 产物（下载链路与测试共用）：
 * 计算 contentHash → 命中缓存读取解密 → 未命中单飞渲染 + 加密存储 + 写元数据。
 */
/** 客户真实报告原版 PDF：导入后优先于生成版返回；私有文件只经本代理。 */
async function loadSourceTalentReportPdf(
  pb: PocketBase,
  reportId: string,
  volumeId: string,
): Promise<{ bytes: Uint8Array; fileName: string; checksum: string } | null> {
  const record = await pb
    .collection("talent_report_source_pdfs")
    .getFirstListItem(
      `reportId = "${reportId}" && volumeId = "${volumeId}"`,
      { $autoCancel: false },
    )
    .catch(() => null);
  if (!record?.file) return null;
  const url = pb.files.getURL(record, String(record.file));
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${pb.authStore.token}` },
  });
  if (!response.ok) return null;
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength < 5 || String.fromCharCode(...bytes.subarray(0, 5)) !== "%PDF-")
    return null;
  return {
    bytes,
    fileName: String(record.originalName || "报告.pdf").slice(0, 120),
    checksum: String(record.checksum || ""),
  };
}

export async function generateTalentReportPdfArtifact(
  pb: PocketBase,
  input: {
    report: TalentReportRecord;
    volume: TalentReportVolumeSnapshot;
    parent: TalentParentRecord;
    geneReport: Awaited<ReturnType<typeof loadTalentReportGeneReport>>;
  },
): Promise<StoredPdfResult> {
  const watermarkPolicy = talentPdfWatermarkPolicy();
  const font = await resolveTalentPdfFont();
  const subject = subjectInfoOf(input.geneReport);
  const watermarkIdentityHash = computeTalentPdfWatermarkIdentityHash({
    policy: watermarkPolicy,
    parentName: String(input.parent.name ?? "").trim(),
    mobileLast4: last4OfMaskedMobile(input.parent.maskedMobile),
    reportNo: String(input.report.reportNo ?? ""),
  });
  const factorSnapshot = Array.isArray(input.report.factorSnapshot) ? input.report.factorSnapshot : [];
  const contentHash = computeTalentPdfContentHash({
    reportId: String(input.report.id),
    volumeId: input.volume.volumeId,
    volumeSnapshot: input.volume,
    factorSnapshot,
    subjectDisplayName: subject?.name ?? "",
    watermarkIdentityHash,
    watermarkPolicy,
    templateVersion: TALENT_PDF_TEMPLATE_VERSION,
    fontVersion: font.fontVersion,
  });
  try {
    return await resolveCacheOrRender(pb, {
      report: input.report,
      volume: input.volume,
      factorSnapshot,
      subject,
      parent: input.parent,
      watermarkPolicy,
      contentHash,
      fontVersion: font.fontVersion,
    });
  } catch (error) {
    if (error instanceof TalentPdfTooLargeError) throw talentPdfRenderFailed(error.reason);
    throw error;
  }
}

/**
 * GET 分册 PDF：Bearer（小程序）或 ticket（H5 新窗口）；命中缓存不重渲；
 * 门禁拒绝 / 渲染失败写 `talent_pdf_downloads` 摘要，成功另写一条 oper_logs 摘要。
 */
export async function downloadTalentReportPdf(
  event: H3Event,
  params: { reportId: string; volumeId: string; ticket?: string },
): Promise<TalentPdfDownloadPayload> {
  const startedAt = Date.now();
  const ticket = String(params.ticket ?? "");
  const pb = await getAdminPB();
  const requester = await resolveTalentPdfRequester(event, {
    reportId: params.reportId,
    volumeId: params.volumeId,
    ticket,
  });
  const ip = clientIpOf(event);
  const requestId = requestIdOf(event);
  const uaFamily = detectTalentPdfUaFamily(getHeader(event, "user-agent"));
  const baseLog: DownloadLogInput = {
    reportId: params.reportId,
    volumeId: params.volumeId,
    parentUserId: requester.userId,
    subjectType: "",
    subjectId: "",
    result: "ok",
    ip,
    uaFamily,
    requestId,
  };

  if (!assertTalentPdfRateLimit(requester, ip)) {
    await safeWriteDownloadLog(pb, { ...baseLog, result: "rate_limited" });
    event.node.res.setHeader("retry-after", "60");
    throw talentPdfDownloadLimit();
  }

  let context: GatedPdfContext | null = null;
  try {
    context = await loadGatedPdfContext(pb, requester, params);
    baseLog.reportId = String(context.report.id);
    baseLog.subjectType = String(context.report.subjectType ?? "");
    baseLog.subjectId = String(context.report.subjectId ?? "");
    const sourcePdf = await loadSourceTalentReportPdf(
      pb,
      String(context.report.id),
      context.volume.volumeId,
    );
    if (sourcePdf) {
      await safeWriteDownloadLog(pb, {
        ...baseLog,
        storage: "pocketbase",
        contentHash: sourcePdf.checksum,
        renderMs: 0,
        cacheHit: true,
      });
      await safeWriteOperLog(pb, {
        parentUserId: requester.userId,
        reportId: String(context.report.id),
        volumeId: context.volume.volumeId,
        requestId,
        costMs: Date.now() - startedAt,
      });
      return {
        bytes: sourcePdf.bytes,
        fileName: sourcePdf.fileName,
        contentHash: sourcePdf.checksum,
        storage: "pocketbase",
        pageCount: 0,
        cacheHit: true,
        renderMs: 0,
      };
    }
    const result = await generateTalentReportPdfArtifact(pb, {
      report: context.report,
      volume: context.volume,
      parent: requester.parent,
      geneReport: context.geneReport,
    });
    await safeWriteDownloadLog(pb, {
      ...baseLog,
      storage: result.record.storage,
      contentHash: result.record.contentHash,
      renderMs: result.renderMs,
      cacheHit: result.cacheHit,
    });
    await safeWriteOperLog(pb, {
      parentUserId: requester.userId,
      reportId: String(context.report.id),
      volumeId: context.volume.volumeId,
      requestId,
      costMs: Date.now() - startedAt,
    });
    return {
      bytes: result.bytes,
      fileName: result.record.fileName,
      contentHash: result.record.contentHash,
      storage: result.record.storage,
      pageCount: result.record.pageCount,
      cacheHit: result.cacheHit,
      renderMs: result.renderMs,
    };
  } catch (error) {
    if (error instanceof TalentPdfFontUnavailableError) {
      await safeWriteDownloadLog(pb, {
        ...baseLog,
        reportId: context ? String(context.report.id) : params.reportId,
        subjectType: context ? String(context.report.subjectType ?? "") : "",
        subjectId: context ? String(context.report.subjectId ?? "") : "",
        result: "render_failed",
      });
      throw talentPdfFontUnavailable();
    }
    const errorCode = String((error as { data?: { code?: string } } | null)?.data?.code ?? "");
    if (errorCode === "PDF_RENDER_BUSY") event.node.res.setHeader("retry-after", "5");
    const result = resultFromError(error);
    await safeWriteDownloadLog(pb, {
      ...baseLog,
      reportId: context ? String(context.report.id) : params.reportId,
      subjectType: context ? String(context.report.subjectType ?? "") : "",
      subjectId: context ? String(context.report.subjectId ?? "") : "",
      result,
    });
    if (result === "render_failed") {
      try {
        await recordError(pb, {
          source: "api",
          level: "error",
          message: `报告 PDF 渲染失败：${(error as { data?: { reason?: string } } | null)?.data?.reason ?? "unknown"}`,
          url: `/api/client/talent/reports/${params.reportId}/volumes/${params.volumeId}/pdf`,
          method: "GET",
          statusCode: 503,
          userId: requester.userId,
          meta: { reportId: params.reportId, volumeId: params.volumeId, requestId },
        });
      } catch {
        /* 错误采集本身失败不影响主流程 */
      }
    }
    throw error;
  }
}

/**
 * POST pdf-ticket：必须 Bearer；先做同一门禁再签发 120s ticket，不写下载留痕（真正下载时写）。
 */
export async function createTalentReportPdfTicket(
  event: H3Event,
  params: { reportId: string; volumeId: string },
): Promise<{ url: string; expiresAt: string; ttlSeconds: number; reportId: string; volumeId: string }> {
  const requester = await resolveBearerRequester(event);
  const pb = await getAdminPB();
  const report = await getTalentReportOrThrow(pb, params.reportId);
  await assertSubjectAccess(pb, report, requester.parent);
  assertTalentPdfGate({
    report,
    parentId: requester.parent.id,
    volumeId: params.volumeId,
    pdfEnabled: isTalentPdfEnabled(),
  });
  const signed = signTalentPdfTicket({
    reportId: String(report.id),
    volumeId: params.volumeId,
    userId: requester.userId,
    parentId: requester.parent.id,
  });
  const path = `/api/client/talent/reports/${encodeURIComponent(String(report.id))}/volumes/${encodeURIComponent(params.volumeId)}/pdf?ticket=${encodeURIComponent(signed.ticket)}`;
  const base = talentPublicApiBaseUrl();
  return {
    // 只允许相对同源地址或显式配置的公开 API 基址；禁止信任请求 Host / Origin（§6.8）。
    url: base ? `${base}${path}` : path,
    expiresAt: signed.expiresAt,
    ttlSeconds: signed.ttlSeconds,
    reportId: String(report.id),
    volumeId: params.volumeId,
  };
}

// ── 响应：固定头 + Range（≤10MB 缓冲，§6.5） ─────────────────────────────────

export type TalentPdfByteRange = { start: number; end: number } | null | "invalid";

export function parseTalentPdfByteRange(header: string | null | undefined, size: number): TalentPdfByteRange {
  const value = String(header ?? "").trim();
  if (!value) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match) return "invalid";
  const rawStart = match[1] || "";
  const rawEnd = match[2] || "";
  if (!rawStart && !rawEnd) return "invalid";
  let start: number;
  let end: number;
  if (!rawStart) {
    const suffix = Number.parseInt(rawEnd, 10);
    if (!Number.isFinite(suffix) || suffix <= 0) return "invalid";
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number.parseInt(rawStart, 10);
    end = rawEnd ? Number.parseInt(rawEnd, 10) : size - 1;
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) return "invalid";
  return { start, end: Math.min(end, size - 1) };
}

/** 把下载结果写成固定响应头；Range 命中返回 206，非法 Range 返回 416。 */
export function buildTalentPdfResponse(event: H3Event, payload: TalentPdfDownloadPayload): Uint8Array {
  const size = payload.bytes.byteLength;
  const range = parseTalentPdfByteRange(getHeader(event, "range"), size);
  const headers: Record<string, string> = {
    "content-type": "application/pdf",
    "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(payload.fileName)}`,
    "cache-control": "private, no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "accept-ranges": "bytes",
  };
  for (const [name, value] of Object.entries(headers)) setOrReplaceHeader(event, name, value);
  if (range === "invalid") {
    setOrReplaceHeader(event, "content-range", `bytes */${size}`);
    setResponseStatus(event, 416);
    setOrReplaceHeader(event, "content-length", "0");
    return new Uint8Array();
  }
  if (range) {
    const chunk = payload.bytes.subarray(range.start, range.end + 1);
    setOrReplaceHeader(event, "content-range", `bytes ${range.start}-${range.end}/${size}`);
    setOrReplaceHeader(event, "content-length", String(chunk.byteLength));
    setResponseStatus(event, 206);
    return chunk;
  }
  setResponseStatus(event, 200);
  setOrReplaceHeader(event, "content-length", String(size));
  return payload.bytes;
}

function setOrReplaceHeader(event: H3Event, name: string, value: string): void {
  event.node.res.setHeader(name, value);
}

function setResponseStatus(event: H3Event, statusCode: number): void {
  event.node.res.statusCode = statusCode;
}