/**
 * @description M3 报告域外部基因报告源与一键同步领域逻辑：
 *   `TalentGeneReportSource` 契约 + Mock 源（all_found / empty / partial / error / incremental 五模式）、
 *   `previewTalentReportSync`（只读、零写入）/ `commitTalentReportSync`（重算后写入、三类归因 + 单条失败、
 *   幂等靠唯一键、逐人脱敏明细、同步日志）。M8 只替换 `TalentGeneReportSource` 实现，不改调用方。
 *   口径见 docs/specs/M3-reports/spec.md §4.2/§5.4.6/§9、ADR 0003-D4。
 *   身份证明文只在本进程内存中使用：外部源入参、脱敏与 HMAC 派生；不落库、不进日志、不进响应。
 * @file server/utils/talent-report-source.ts
 */
import { createError } from "h3";
import type PocketBase from "pocketbase";
import {
  TALENT_GENE_REPORT_BOOK_CODES,
  TALENT_REPORT_VOLUME_DEFINITIONS,
  type TalentGeneReportBookCode,
  type TalentGeneReportExternalData,
  type TalentGeneReportExternalSection,
  type TalentGeneReportRecord,
  type TalentGeneReportSource,
  type TalentGeneReportSourceKind,
  type TalentGeneReportSyncSubject,
  type TalentReportRecord,
  type TalentReportSyncCandidate,
  type TalentReportSyncCounts,
  type TalentReportSyncEmptyReason,
  type TalentReportSyncLogInput,
  type TalentReportSyncPreview,
  type TalentReportSyncPreviewCounts,
  type TalentReportSyncResult,
  type TalentReportSyncSubjectDetail,
} from "~~/shared/types/talent-report";
import type {
  TalentChildRecord,
  TalentParentRecord,
} from "~~/shared/types/talent-member";
import {
  decryptTalentSensitive,
  hashTalentMemberIdNo,
  maskTalentIdNo,
  maskTalentMobile,
} from "./talent-member-crypto";
import { calculateTalentAge } from "./talent-age";
import { escapeFilterValue, getAdminPB } from "./pocketbase-client";
import {
  computeTalentReportNewBooks,
  normalizeTalentReportBookCodes,
  resolveTalentReportOpenBookCodes,
  resolveTalentReportVolumeId,
} from "./talent-report-snapshot";
import { withTalentReportLock } from "./talent-report-lock";
import { createExternalTalentGeneReportSource } from "./talent-external-sources";

/** Mock 源标识；M8 换成真实源时保留该常量用于日志与断言。 */
export const TALENT_GENE_REPORT_MOCK_SOURCE = "mock";
/** 真实外部源标识（M8 实现）。 */
export const TALENT_GENE_REPORT_EXTERNAL_SOURCE = "external";

/** Mock 五种模式（spec §9）。 */
export const TALENT_GENE_REPORT_MOCK_MODES = [
  "all_found",
  "empty",
  "partial",
  "error",
  "incremental",
] as const;
export type TalentGeneReportMockMode =
  (typeof TALENT_GENE_REPORT_MOCK_MODES)[number];

/** 逐人明细上限（spec §3.3）。 */
export const TALENT_REPORT_SYNC_DETAIL_LIMIT = 500;

// ── 环境变量解析（纯函数，便于测试与 M8 调参） ────────────────────────────

function nonNegativeNumber(value: unknown, fallback: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
}

export function resolveTalentGeneReportSourceKind(
  env: NodeJS.ProcessEnv = process.env,
): TalentGeneReportSourceKind {
  const raw = String(env.TALENT_GENE_REPORT_SOURCE || "")
    .trim()
    .toLowerCase();
  return raw === TALENT_GENE_REPORT_EXTERNAL_SOURCE
    ? TALENT_GENE_REPORT_EXTERNAL_SOURCE
    : TALENT_GENE_REPORT_MOCK_SOURCE;
}

export function resolveTalentGeneReportMockMode(
  env: NodeJS.ProcessEnv = process.env,
): TalentGeneReportMockMode {
  const raw = String(env.TALENT_GENE_REPORT_MOCK_MODE || "").trim();
  return (TALENT_GENE_REPORT_MOCK_MODES as readonly string[]).includes(raw)
    ? (raw as TalentGeneReportMockMode)
    : "all_found";
}

export function resolveTalentGeneReportMockDelayMs(
  env: NodeJS.ProcessEnv = process.env,
): number {
  return nonNegativeNumber(env.TALENT_GENE_REPORT_MOCK_DELAY_MS, 0);
}

// ── 报告编号生成：R{YYYYMMDD}{4 位当日序号}（spec §3.1） ───────────────────

/** 组装报告编号；`now` 用本地时区日期（服务端与中国时区一致）。 */
export function formatTalentReportNo(now: Date, sequence: number): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const safeSequence = Math.max(1, Math.floor(sequence));
  return `R${year}${month}${day}${String(safeSequence).padStart(4, "0")}`;
}

/** 在基准编号上顺延 offset（同批次多个新建对象避免重复编号）。 */
export function bumpTalentReportNo(base: string, offset: number): string {
  const text = String(base ?? "");
  const match = /^(.*?)(\d{4})$/.exec(text);
  if (!match) return text;
  const prefix = match[1] ?? "";
  const sequence = Number(match[2] ?? 0) + Math.max(0, Math.floor(offset));
  return `${prefix}${String(sequence).padStart(4, "0")}`;
}

// ── Mock 外部源（本地演示 / M3 验收；生产必须切真实源） ─────────────────────

function stableHash(value: string): number {
  let hash = 5381;
  for (const char of String(value ?? "")) {
    hash = ((hash << 5) + hash + (char.codePointAt(0) ?? 0)) >>> 0;
  }
  return hash;
}

function delay(ms: number): Promise<void> {
  if (!Number.isFinite(ms) || ms <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    const handle = timer as unknown as { unref?: () => void };
    if (typeof handle.unref === "function") handle.unref();
  });
}

function mockBookCount(subject: TalentGeneReportSyncSubject): number {
  return 2 + (stableHash(`${subject.subjectId}:${subject.name}`) % 2);
}

function buildMockSections(
  books: readonly TalentGeneReportBookCode[],
  subject: TalentGeneReportSyncSubject,
): TalentGeneReportExternalSection[] {
  const sections: TalentGeneReportExternalSection[] = [];
  const hash = stableHash(`${subject.subjectId}:${subject.birthday}`);
  for (const bookCode of books) {
    const definition = TALENT_REPORT_VOLUME_DEFINITIONS.find(
      (item) => item.bookCode === bookCode,
    );
    for (let index = 0; index < 2; index += 1) {
      const factorCode = `${bookCode}-${String(index + 1).padStart(2, "0")}`;
      const levelNumber = ((hash + definition!.sortOrder * 2 + index) % 4) + 1;
      sections.push({
        bookCode,
        chapter: `${definition!.sortOrder}.1 ${definition!.name}概述`,
        factorCode,
        levelCode: `LV${levelNumber}`,
        score: 60 + ((hash + index) % 40),
        condition: "",
      });
    }
  }
  return sections;
}

export interface TalentGeneReportMockSourceOptions {
  mode?: TalentGeneReportMockMode;
  delayMs?: number;
  env?: NodeJS.ProcessEnv;
  /** 测试注入固定时间（filedAt 等展示字段）。 */
  now?: Date;
}

/**
 * 创建 Mock 外部源：要素编码与分级使用 M1 约定编码（`A-01`…/`LV1`–`LV4`），
 * 由对象 id / 生日确定性生成，不含真实 PII；换真实源时只替换本工厂。
 */
export function createMockTalentGeneReportSource(
  options: TalentGeneReportMockSourceOptions = {},
): TalentGeneReportSource {
  const env = options.env ?? process.env;
  const mode = options.mode ?? resolveTalentGeneReportMockMode(env);
  const delayMs = nonNegativeNumber(
    options.delayMs,
    resolveTalentGeneReportMockDelayMs(env),
  );
  const filedAt = (options.now ?? new Date()).toISOString().slice(0, 10);
  let callIndex = 0;

  const found = (
    subject: TalentGeneReportSyncSubject,
    books: readonly TalentGeneReportBookCode[],
  ): TalentGeneReportExternalData => ({
    found: true,
    books: [...books],
    sections: buildMockSections(books, subject),
    issuer: "示例检测机构（模拟数据）",
    filedAt,
    sourceVersion: "mock-v1",
  });

  return {
    source: TALENT_GENE_REPORT_MOCK_SOURCE,
    async fetch(subject) {
      const index = callIndex;
      callIndex += 1;
      await delay(delayMs);
      if (mode === "error" && index === 0)
        throw new Error("Mock 外部基因报告源异常（HTTP 500）");
      if (mode === "empty") {
        return { found: false, reason: "no_result", books: [], sections: [] };
      }
      if (mode === "partial" && index % 2 === 1) {
        return {
          found: false,
          reason: "info_mismatch",
          books: [],
          sections: [],
        };
      }
      if (mode === "incremental") {
        // 已有报告的候选追加 D、E 两册；无报告的新对象先出 A、B 两册。
        const books = subject.existingReportNo
          ? (["A", "B", "C", "D", "E"] as TalentGeneReportBookCode[])
          : (["A", "B"] as TalentGeneReportBookCode[]);
        return found(subject, books);
      }
      return found(
        subject,
        TALENT_GENE_REPORT_BOOK_CODES.slice(0, mockBookCount(subject)),
      );
    },
  };
}

/**
 * M3 源工厂：`mock` 返回本地演示源；`external` 返回 M8 适配器（缺基址/APP_ID/SECRET → 503
 * `EXTERNAL_SOURCE_UNAVAILABLE`，不静默降级 Mock）。调用方与签名不变。
 */
export function createTalentGeneReportSource(
  env: NodeJS.ProcessEnv = process.env,
): TalentGeneReportSource {
  const kind = resolveTalentGeneReportSourceKind(env);
  if (kind === TALENT_GENE_REPORT_EXTERNAL_SOURCE)
    return createExternalTalentGeneReportSource({ env });
  return createMockTalentGeneReportSource({
    env,
    mode: resolveTalentGeneReportMockMode(env),
    delayMs: resolveTalentGeneReportMockDelayMs(env),
  });
}

// ── 外部篇目校验 / 规范化（单条失败不阻断整批） ──────────────────────────

export type TalentGeneReportExternalValidation =
  | {
      ok: true;
      books: TalentGeneReportBookCode[];
      sections: TalentGeneReportExternalSection[];
    }
  | { ok: false; message: string };

export function validateTalentGeneReportExternalData(
  data: TalentGeneReportExternalData | null | undefined,
): TalentGeneReportExternalValidation {
  if (!data || typeof data !== "object")
    return { ok: false, message: "外部源返回数据格式不合法" };
  const rawBooks = Array.isArray(data.books) ? data.books : [];
  const books = normalizeTalentReportBookCodes(rawBooks);
  if (rawBooks.length !== books.length)
    return { ok: false, message: "外部分册编码不合法（仅允许 A–F）" };
  const rawSections = Array.isArray(data.sections) ? data.sections : [];
  if (rawSections.length > 1000)
    return { ok: false, message: "外部篇目超过 1000 条，已跳过该对象" };
  if (books.length === 0 && rawSections.length > 0)
    return { ok: false, message: "外部篇目引用了未出具的分册" };
  const booksSet = new Set(books);
  const seenCodes = new Set<string>();
  const sections: TalentGeneReportExternalSection[] = [];
  for (const raw of rawSections) {
    if (!raw || typeof raw !== "object")
      return { ok: false, message: "外部篇目存在非法条目" };
    const bookCode = String(raw.bookCode ?? "")
      .trim()
      .toUpperCase();
    const chapter = String(raw.chapter ?? "").trim();
    const factorCode = String(raw.factorCode ?? "").trim();
    const levelCode = String(raw.levelCode ?? "").trim();
    if (
      !(TALENT_GENE_REPORT_BOOK_CODES as readonly string[]).includes(bookCode)
    )
      return { ok: false, message: `外部篇目分册编码不合法：${bookCode || "(空)"}` };
    if (!booksSet.has(bookCode as TalentGeneReportBookCode))
      return {
        ok: false,
        message: `外部篇目分册 ${bookCode} 不在已出分册内`,
      };
    if (!chapter) return { ok: false, message: "外部篇目缺少章节名" };
    if (!factorCode) return { ok: false, message: "外部篇目缺少要素编码" };
    if (!levelCode) return { ok: false, message: "外部篇目缺少分级编码" };
    if (seenCodes.has(factorCode))
      return {
        ok: false,
        message: `外部篇目要素编码重复：${factorCode}`,
      };
    seenCodes.add(factorCode);
    const score = Number(raw.score);
    const section: TalentGeneReportExternalSection = {
      bookCode: bookCode as TalentGeneReportBookCode,
      chapter,
      factorCode,
      levelCode,
      ...(Number.isFinite(score) ? { score } : {}),
      condition: String(raw.condition ?? ""),
    };
    const factorName = String(raw.factorName ?? "").trim();
    if (factorName) section.factorName = factorName;
    sections.push(section);
  }
  return { ok: true, books, sections };
}

// ── 同步错误摘要：≤200 字、去堆栈、替换明文为脱敏值 ───────────────────────

export function sanitizeTalentReportSyncMessage(
  error: unknown,
  subject?: Pick<TalentGeneReportSyncSubject, "idNo" | "mobile">,
): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "外部基因报告源返回异常";
  let text = raw.replace(/\s+/g, " ").trim();
  const idNo = String(subject?.idNo ?? "");
  const mobile = String(subject?.mobile ?? "");
  if (idNo) text = text.split(idNo).join(maskTalentIdNo(idNo));
  if (mobile) text = text.split(mobile).join(maskTalentMobile(mobile));
  return (text || "同步失败").slice(0, 200);
}

function emptyDetail(
  candidate: TalentReportSyncCandidate,
  action: TalentReportSyncSubjectDetail["action"],
  options: {
    reportNo?: string;
    booksTotal?: string;
    booksAdded?: string;
    reason?: TalentReportSyncEmptyReason | "";
    message?: string;
  } = {},
): TalentReportSyncSubjectDetail {
  return {
    subjectType: candidate.subjectType,
    subjectId: candidate.subjectId,
    subjectName: String(candidate.name ?? ""),
    maskedIdNo:
      String(candidate.geneReport?.maskedIdNo ?? "") ||
      (candidate.idNo ? maskTalentIdNo(candidate.idNo) : ""),
    reportNo: String(options.reportNo ?? candidate.existingReportNo ?? ""),
    action,
    booksTotal: String(options.booksTotal ?? candidate.geneReport?.books ?? ""),
    booksAdded: String(options.booksAdded ?? ""),
    reason: options.reason ?? "",
    message: String(options.message ?? ""),
  };
}

function countBooksAdded(
  candidate: TalentReportSyncCandidate,
  externalBooks: readonly string[],
): string {
  return computeTalentReportNewBooks(
    externalBooks,
    candidate.report?.openVolumeIds,
  ).join("");
}

// ── 同步数据访问层（真实 PB 实现 + 测试可注入） ───────────────────────────

/** 报告 / 基因报告写入载荷；字段与集合 schema 对齐，统一由本模块构造。 */
export type TalentReportSyncRecordData = Record<string, unknown>;

export interface TalentReportSyncStore {
  listCandidates(options: { now: Date }): Promise<TalentReportSyncCandidate[]>;
  nextReportNo(now: Date): Promise<string>;
  createGeneReport(
    data: TalentReportSyncRecordData,
  ): Promise<TalentGeneReportRecord>;
  updateGeneReport(
    id: string,
    data: TalentReportSyncRecordData,
  ): Promise<TalentGeneReportRecord>;
  createReport(data: TalentReportSyncRecordData): Promise<TalentReportRecord>;
  updateReport(
    id: string,
    data: TalentReportSyncRecordData,
  ): Promise<TalentReportRecord>;
  recordSyncLog(input: TalentReportSyncLogInput): Promise<string>;
}

type TalentReportSyncPBProvider = () => PocketBase | Promise<PocketBase>;

let talentReportSyncPBProvider: TalentReportSyncPBProvider | null = null;

/** 仅测试 / 插件注入用：覆盖同步模块使用的 PocketBase 连接。 */
export function setTalentReportSyncPBProvider(
  provider: TalentReportSyncPBProvider | null,
): void {
  talentReportSyncPBProvider = provider;
}

async function resolveTalentReportSyncPB(): Promise<PocketBase> {
  if (talentReportSyncPBProvider) return talentReportSyncPBProvider();
  return getAdminPB();
}

/** 按 id 批量读取（chunk 避免超长 filter）。 */
async function listTalentRecordsByIds<T extends { id: string }>(
  pb: PocketBase,
  collection: string,
  ids: readonly string[],
): Promise<T[]> {
  const unique = [...new Set(ids.map((id) => String(id ?? "").trim()))].filter(
    Boolean,
  );
  const rows: T[] = [];
  for (let index = 0; index < unique.length; index += 40) {
    const chunk = unique.slice(index, index + 40);
    const filter = chunk
      .map((id) => `id = "${escapeFilterValue(id)}"`)
      .join(" || ");
    const page = await pb.collection(collection).getFullList<T>({
      filter,
      $autoCancel: false,
    });
    rows.push(...page);
  }
  return rows;
}

/** 按 subjectId 批量读取报告域集合。 */
async function listTalentRecordsBySubjects<T>(
  pb: PocketBase,
  collection: string,
  subjectIds: readonly string[],
): Promise<T[]> {
  const unique = [...new Set(subjectIds.map((id) => String(id ?? "").trim()))].filter(
    Boolean,
  );
  const rows: T[] = [];
  for (let index = 0; index < unique.length; index += 40) {
    const chunk = unique.slice(index, index + 40);
    const filter = `subjectType = "child" && (${chunk
      .map((id) => `subjectId = "${escapeFilterValue(id)}"`)
      .join(" || ")})`;
    const page = await pb.collection(collection).getFullList<T>({
      filter,
      $autoCancel: false,
    });
    rows.push(...page);
  }
  return rows;
}

function todayReportNoPrefix(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `R${year}${month}${day}`;
}

/** 真实 PocketBase 同步数据访问层（只读写 talent_* 集合）。 */
export function createTalentReportSyncStore(
  pb?: PocketBase | Promise<PocketBase>,
): TalentReportSyncStore {
  const resolvePB = async (): Promise<PocketBase> =>
    pb ? await pb : resolveTalentReportSyncPB();

  return {
    async listCandidates({ now }) {
      const admin = await resolvePB();
      const children = await admin.collection("talent_children").getFullList<TalentChildRecord>({
        filter: 'status = "1" && query = "found" && parentId != ""',
        sort: "created",
        $autoCancel: false,
      });
      if (children.length === 0) return [];
      const parents = await listTalentRecordsByIds<TalentParentRecord>(
        admin,
        "talent_parents",
        children.map((child) => String(child.parentId || "")),
      );
      const parentById = new Map(parents.map((parent) => [parent.id, parent]));
      const subjects = children
        .map((child) => {
          const parent = parentById.get(String(child.parentId || ""));
          if (!parent || String(parent.status) !== "1") return null;
          return { child, parent };
        })
        .filter(
          (entry): entry is { child: TalentChildRecord; parent: TalentParentRecord } =>
            entry !== null,
        );
      if (subjects.length === 0) return [];
      const subjectIds = subjects.map(({ child }) => child.id);
      const geneReports = await listTalentRecordsBySubjects<TalentGeneReportRecord>(
        admin,
        "talent_gene_reports",
        subjectIds,
      );
      const reports = await listTalentRecordsBySubjects<TalentReportRecord>(
        admin,
        "talent_reports",
        subjectIds,
      );
      const geneBySubject = new Map(
        geneReports.map((record) => [String(record.subjectId), record]),
      );
      const reportBySubject = new Map(
        reports.map((record) => [String(record.subjectId), record]),
      );
      const nowIso = now.toISOString();
      const candidates: TalentReportSyncCandidate[] = [];
      for (const { child, parent } of subjects) {
        let idNo = "";
        let mobile = "";
        let blockedReason = "";
        try {
          idNo = decryptTalentSensitive(child.idNoCipher);
          mobile = decryptTalentSensitive(parent.mobileCipher);
        } catch {
          // 解密失败不降级明文：该对象单条失败，不阻断整批。
          blockedReason = "敏感数据解密失败，已跳过该对象";
        }
        const geneReport = geneBySubject.get(child.id) ?? null;
        candidates.push({
          subjectType: "child",
          subjectId: child.id,
          parentId: parent.id,
          name: String(child.name || ""),
          gender: child.gender === "male" ? "male" : "female",
          birthday: String(child.birthday || ""),
          age: calculateTalentAge(String(child.birthday || ""), nowIso) ?? 0,
          idNo,
          mobile,
          existingReportNo: geneReport?.reportNo,
          geneReport,
          report: reportBySubject.get(child.id) ?? null,
          ...(blockedReason ? { blockedReason } : {}),
        });
      }
      return candidates;
    },

    async nextReportNo(now) {
      const admin = await resolvePB();
      const prefix = todayReportNoPrefix(now);
      const rows = await admin
        .collection("talent_gene_reports")
        .getFullList<{ reportNo: string }>({
          filter: `reportNo ~ "${escapeFilterValue(prefix)}"`,
          fields: "reportNo",
          $autoCancel: false,
        })
        .catch(() => [] as Array<{ reportNo: string }>);
      let maxSequence = 0;
      for (const row of rows) {
        const match = new RegExp(`^${prefix}(\\d{4})$`).exec(
          String(row.reportNo || ""),
        );
        if (match) maxSequence = Math.max(maxSequence, Number(match[1]));
      }
      return formatTalentReportNo(now, maxSequence + 1);
    },

    async createGeneReport(data) {
      const admin = await resolvePB();
      return admin
        .collection("talent_gene_reports")
        .create<TalentGeneReportRecord>(data, { $autoCancel: false });
    },

    async updateGeneReport(id, data) {
      const admin = await resolvePB();
      return admin
        .collection("talent_gene_reports")
        .update<TalentGeneReportRecord>(id, data, { $autoCancel: false });
    },

    async createReport(data) {
      const admin = await resolvePB();
      return admin
        .collection("talent_reports")
        .create<TalentReportRecord>(data, { $autoCancel: false });
    },

    async updateReport(id, data) {
      const admin = await resolvePB();
      return admin
        .collection("talent_reports")
        .update<TalentReportRecord>(id, data, { $autoCancel: false });
    },

    async recordSyncLog(input) {
      const admin = await resolvePB();
      try {
        const record = await admin.collection("talent_sync_logs").create(
          {
            trigger: input.trigger,
            status: input.status,
            startedAt: input.startedAt,
            finishedAt: input.finishedAt,
            durationMs: input.durationMs,
            received: input.scanned,
            generated: input.counts.created,
            skipped: input.counts.empty,
            failedCount: input.counts.failed,
            message: input.message.slice(0, 1000),
            details: { counts: input.counts },
            syncScope: "gene_report",
            mode: "commit",
            refreshed: input.counts.refreshed,
            createdCount: input.counts.created,
            empty: input.counts.empty,
            subjectDetails: input.truncated
              ? input.details.slice(0, TALENT_REPORT_SYNC_DETAIL_LIMIT)
              : input.details,
            operatorId: input.operatorId,
          },
          { $autoCancel: false },
        );
        return String(record.id || "");
      } catch {
        // 日志失败不阻断同步主流程。
        return "";
      }
    },
  };
}

// ── 同步分类：三类归因 + 单条失败（preview / commit 共用） ─────────────────

interface TalentReportSyncRunContext {
  at: string;
  now: Date;
  source: TalentGeneReportSource;
  store: TalentReportSyncStore;
  reportNoState: { base: string; used: number };
}

type TalentReportSyncClassification =
  | {
      action: "created" | "refresh";
      detail: TalentReportSyncSubjectDetail;
      geneData: TalentReportSyncRecordData;
      reportData: TalentReportSyncRecordData | null;
      sourceFailure?: false;
    }
  | {
      action: "empty";
      detail: TalentReportSyncSubjectDetail;
      sourceFailure?: false;
    }
  | {
      action: "failed";
      detail: TalentReportSyncSubjectDetail;
      sourceFailure: boolean;
    };

function buildGeneReportData(
  candidate: TalentReportSyncCandidate,
  external: TalentGeneReportExternalData,
  books: readonly TalentGeneReportBookCode[],
  sections: readonly TalentGeneReportExternalSection[],
  reportNo: string,
  context: TalentReportSyncRunContext,
): TalentReportSyncRecordData {
  return {
    subjectType: candidate.subjectType,
    subjectId: candidate.subjectId,
    parentId: candidate.parentId,
    reportNo,
    name: String(candidate.name || ""),
    gender: candidate.gender,
    birthday: String(candidate.birthday || ""),
    age: candidate.age,
    maskedIdNo:
      String(candidate.geneReport?.maskedIdNo || "") ||
      (candidate.idNo ? maskTalentIdNo(candidate.idNo) : ""),
    idNoHash: candidate.idNo ? hashTalentMemberIdNo(candidate.idNo) : "",
    issuer: String(external.issuer ?? ""),
    filedAt: String(external.filedAt ?? ""),
    syncedAt: context.at,
    source: context.source.source,
    version: String(external.sourceVersion ?? ""),
    books: books.join(""),
    sections: sections.map((section) => ({ ...section })),
    sectionCount: sections.length,
    status: "synced",
  };
}

function buildPendingReportData(
  candidate: TalentReportSyncCandidate,
  reportNo: string,
  context: TalentReportSyncRunContext,
): TalentReportSyncRecordData {
  return {
    reportNo,
    reportType: "gene_report",
    title: `${String(candidate.name || "对象")}·基因报告`,
    // 旧字段 customerId 保留但新行空串；新代码不读不写（ADR 0003-D6）。
    customerId: "",
    status: "pending_publish",
    subjectType: candidate.subjectType,
    subjectId: candidate.subjectId,
    parentId: candidate.parentId,
    geneReportId: "",
    factorCount: 0,
    snapshotVersion: 0,
    queriedAt: context.at,
    openVolumeIds: [],
    factorSnapshot: [],
    volumeSnapshot: [],
    directionSnapshot: null,
    selections: [],
    versions: [],
    totalItems: 0,
  };
}

async function allocateReportNo(
  context: TalentReportSyncRunContext,
  externalReportNo: unknown,
): Promise<string> {
  const provided = String(externalReportNo ?? "").trim();
  if (provided) return provided.slice(0, 64);
  if (!context.reportNoState.base)
    context.reportNoState.base = await context.store.nextReportNo(context.now);
  const reportNo = bumpTalentReportNo(
    context.reportNoState.base,
    context.reportNoState.used,
  );
  context.reportNoState.used += 1;
  return reportNo;
}

async function classifyTalentReportSyncCandidate(
  candidate: TalentReportSyncCandidate,
  context: TalentReportSyncRunContext,
): Promise<TalentReportSyncClassification> {
  if (candidate.blockedReason) {
    return {
      action: "failed",
      sourceFailure: false,
      detail: emptyDetail(candidate, "failed", {
        message: sanitizeTalentReportSyncMessage(candidate.blockedReason, candidate),
      }),
    };
  }
  let external: TalentGeneReportExternalData;
  try {
    external = await context.source.fetch(candidate);
  } catch (error) {
    return {
      action: "failed",
      sourceFailure: true,
      detail: emptyDetail(candidate, "failed", {
        message: sanitizeTalentReportSyncMessage(error, candidate),
      }),
    };
  }
  if (!external || typeof external !== "object") {
    return {
      action: "failed",
      sourceFailure: true,
      detail: emptyDetail(candidate, "failed", {
        message: "外部源返回数据格式不合法",
      }),
    };
  }
  if (external.found !== true) {
    const reason: TalentReportSyncEmptyReason =
      external.reason === "info_mismatch" ? "info_mismatch" : "no_result";
    return {
      action: "empty",
      detail: emptyDetail(candidate, "empty", { reason }),
    };
  }
  const validated = validateTalentGeneReportExternalData(external);
  if (!validated.ok) {
    return {
      action: "failed",
      sourceFailure: false,
      detail: emptyDetail(candidate, "failed", {
        message: sanitizeTalentReportSyncMessage(validated.message, candidate),
      }),
    };
  }
  // 刷新同步只刷新外部元数据 / 篇目，基因报告编号保持稳定（spec §4.2 刷新字段清单不含 reportNo）。
  const reportNo = candidate.geneReport
    ? candidate.geneReport.reportNo
    : await allocateReportNo(context, external.reportNo);
  const booksText = validated.books.join("");
  const booksAdded = countBooksAdded(candidate, validated.books);
  const maskedIdNo =
    String(candidate.geneReport?.maskedIdNo || "") ||
    (candidate.idNo ? maskTalentIdNo(candidate.idNo) : "");
  const geneData = buildGeneReportData(
    candidate,
    external,
    validated.books,
    validated.sections,
    reportNo,
    context,
  );
  if (candidate.geneReport) {
    const reportData = candidate.report
      ? // 刷新同步只更新查询时间，绝不改写已发布快照（BR-03）。
        { queriedAt: context.at }
      : buildPendingReportData(candidate, candidate.geneReport.reportNo, context);
    return {
      action: "refresh",
      geneData,
      reportData,
      detail: {
        subjectType: candidate.subjectType,
        subjectId: candidate.subjectId,
        subjectName: String(candidate.name || ""),
        maskedIdNo,
        reportNo: candidate.geneReport.reportNo,
        action: "refresh",
        booksTotal: booksText,
        booksAdded,
        reason: "",
        message: "",
      },
    };
  }
  return {
    action: "created",
    geneData,
    reportData: buildPendingReportData(candidate, reportNo, context),
    detail: {
      subjectType: candidate.subjectType,
      subjectId: candidate.subjectId,
      subjectName: String(candidate.name || ""),
      maskedIdNo,
      reportNo,
      action: "created",
      booksTotal: booksText,
      booksAdded,
      reason: "",
      message: "",
    },
  };
}

function summarizeTalentReportSyncCounts(
  details: readonly TalentReportSyncSubjectDetail[],
): TalentReportSyncCounts {
  const counts: TalentReportSyncCounts = {
    refreshed: 0,
    created: 0,
    empty: 0,
    failed: 0,
  };
  for (const detail of details) {
    if (detail.action === "refresh") counts.refreshed += 1;
    else if (detail.action === "created") counts.created += 1;
    else if (detail.action === "empty") counts.empty += 1;
    else counts.failed += 1;
  }
  return counts;
}

function truncateTalentReportSyncDetails(
  details: readonly TalentReportSyncSubjectDetail[],
): { details: TalentReportSyncSubjectDetail[]; truncated: boolean } {
  const truncated = details.length > TALENT_REPORT_SYNC_DETAIL_LIMIT;
  return {
    details: truncated
      ? details.slice(0, TALENT_REPORT_SYNC_DETAIL_LIMIT).map((detail) => ({ ...detail }))
      : details.map((detail) => ({ ...detail })),
    truncated,
  };
}

function createTalentReportSyncRunContext(options: {
  source: TalentGeneReportSource;
  store: TalentReportSyncStore;
  now: Date;
}): TalentReportSyncRunContext {
  return {
    at: options.now.toISOString(),
    now: options.now,
    source: options.source,
    store: options.store,
    reportNoState: { base: "", used: 0 },
  };
}

// ── 预演：只读外部 + 内存分类，零写入 ─────────────────────────────────────

export interface TalentReportSyncOptions {
  source?: TalentGeneReportSource;
  /** 测试注入数据访问层；默认真实 PocketBase 实现。 */
  store?: TalentReportSyncStore;
  now?: Date;
  /** 操作人 id（写入同步日志）。 */
  operatorId?: string;
  /** 触发来源（写入同步日志；默认 manual，M8 定时/入站为 auto/webhook）。 */
  trigger?: "manual" | "auto" | "webhook";
}

/**
 * 一键同步预演：不写任何集合、不写 `talent_sync_logs` / `oper_logs`；
 * 返回三类人数、失败数与逐人脱敏明细。
 */
export async function previewTalentReportSync(
  options: TalentReportSyncOptions = {},
): Promise<TalentReportSyncPreview> {
  const now = options.now ?? new Date();
  const source = options.source ?? createTalentGeneReportSource();
  const store = options.store ?? createTalentReportSyncStore();
  const context = createTalentReportSyncRunContext({ source, store, now });
  const candidates = await store.listCandidates({ now });
  const classified: TalentReportSyncSubjectDetail[] = [];
  for (const candidate of candidates) {
    const result = await classifyTalentReportSyncCandidate(candidate, context);
    classified.push(result.detail);
  }
  const { details, truncated } = truncateTalentReportSyncDetails(classified);
  return {
    mode: "preview",
    source: source.source,
    at: context.at,
    scanned: candidates.length,
    counts: summarizeTalentReportSyncCounts(classified),
    details,
    truncated,
  };
}

// ── 提交：重新枚举 / 重新拉取后写入，幂等靠唯一键 ─────────────────────────

let talentReportSyncInFlight = false;

/** 是否已有 commit 在执行（第二个并发 commit 返回 409）。 */
export function isTalentReportSyncInFlight(): boolean {
  return talentReportSyncInFlight;
}

export interface CommitTalentReportSyncOptions extends TalentReportSyncOptions {
  previewCounts?: TalentReportSyncPreviewCounts;
}

function countsDiffer(
  left: TalentReportSyncCounts,
  right: TalentReportSyncPreviewCounts | undefined,
): boolean {
  if (!right) return false;
  return (
    left.refreshed !== Number(right.refreshed ?? 0) ||
    left.created !== Number(right.created ?? 0) ||
    left.empty !== Number(right.empty ?? 0) ||
    left.failed !== Number(right.failed ?? 0)
  );
}

async function runCommitTalentReportSync(
  options: CommitTalentReportSyncOptions,
): Promise<TalentReportSyncResult> {
  const startedMs = Date.now();
  const now = options.now ?? new Date();
  const source = options.source ?? createTalentGeneReportSource();
  const store = options.store ?? createTalentReportSyncStore();
  const context = createTalentReportSyncRunContext({ source, store, now });
  const candidates = await store.listCandidates({ now });
  const classified: TalentReportSyncSubjectDetail[] = [];
  let sourceFailureCount = 0;
  let writeCount = 0;

  for (const candidate of candidates) {
    const result = await classifyTalentReportSyncCandidate(candidate, context);
    if (result.action === "failed") {
      if (result.sourceFailure) sourceFailureCount += 1;
      classified.push(result.detail);
      continue;
    }
    if (result.action === "empty") {
      classified.push(result.detail);
      continue;
    }
    try {
      if (result.action === "created") {
        const gene = await store.createGeneReport(result.geneData);
        if (result.reportData)
          await store.createReport({
            ...result.reportData,
            geneReportId: gene.id,
            reportNo: gene.reportNo,
          });
        writeCount += 1;
        classified.push({
          ...result.detail,
          reportNo: gene.reportNo,
        });
        continue;
      }
      // refresh：只刷新基因报告；报告存在时只更新 queriedAt，不改快照。
      const gene = candidate.geneReport
        ? await store.updateGeneReport(candidate.geneReport.id, result.geneData)
        : await store.createGeneReport(result.geneData);
      if (candidate.report) {
        await store.updateReport(candidate.report.id, {
          queriedAt: context.at,
        });
      } else if (result.reportData) {
        await store.createReport({
          ...result.reportData,
          geneReportId: gene.id,
          reportNo: gene.reportNo,
        });
      }
      writeCount += 1;
      classified.push({ ...result.detail, reportNo: gene.reportNo });
    } catch (error) {
      classified.push(
        emptyDetail(candidate, "failed", {
          message: sanitizeTalentReportSyncMessage(error, candidate),
        }),
      );
    }
  }

  const counts = summarizeTalentReportSyncCounts(classified);
  // 外部源整体不可用（全部候选均因源异常失败且未写入任何对象）→ 503（acceptance A2）。
  if (candidates.length > 0 && counts.failed === candidates.length && sourceFailureCount === candidates.length)
    throw createError({ statusCode: 503, message: "外部基因报告服务暂不可用" });

  const { details, truncated } = truncateTalentReportSyncDetails(classified);
  const durationMs = Math.max(0, Date.now() - startedMs);
  const status: TalentReportSyncLogInput["status"] =
    counts.failed === 0
      ? "success"
      : writeCount > 0 || counts.empty > 0
        ? "partial"
        : "failed";
  let syncLogId = "";
  // 无候选 → 200 三类全 0，不写同步日志（acceptance A2）。
  if (candidates.length > 0) try {
    syncLogId = await store.recordSyncLog({
      trigger: options.trigger ?? "manual",
      status,
      startedAt: context.at,
      finishedAt: new Date(startedMs + durationMs).toISOString(),
      durationMs,
      scanned: candidates.length,
      counts,
      details,
      truncated,
      operatorId: String(options.operatorId ?? ""),
      message: `一键同步：刷新 ${counts.refreshed} / 新建 ${counts.created} / 暂无 ${counts.empty} / 失败 ${counts.failed}`,
    });
  } catch {
    syncLogId = "";
  }

  return {
    mode: "commit",
    source: source.source,
    syncLogId: String(syncLogId || ""),
    durationMs,
    scanned: candidates.length,
    counts,
    details,
    truncated,
    changedSincePreview: countsDiffer(counts, options.previewCounts),
  };
}

/**
 * 一键同步提交：全局串行（`gene-report-sync` 锁）；并发第二个 commit 直接 409。
 * commit 重新枚举候选并重新调用外部源，不复用 preview 结果（避免 PII 驻留）。
 */
export async function commitTalentReportSync(
  options: CommitTalentReportSyncOptions = {},
): Promise<TalentReportSyncResult> {
  if (talentReportSyncInFlight)
    throw createError({ statusCode: 409, message: "同步正在进行中，请稍后再试" });
  talentReportSyncInFlight = true;
  try {
    return await withTalentReportLock("gene-report-sync", () =>
      runCommitTalentReportSync(options),
    );
  } finally {
    talentReportSyncInFlight = false;
  }
}

// ── 报告 / 基因报告列表展示辅助（M3-B 路由与 C 端守卫共用） ────────────────

/** 基因报告 `books` → 字母串；无数据为空串。 */
export function talentGeneReportBooksText(books: unknown): string {
  return normalizeTalentReportBookCodes(books).join("");
}

/** 报告新增分册编码（列表「新增分册」列）。 */
export function talentReportNewBooksText(
  geneReport: Pick<TalentGeneReportRecord, "books"> | null | undefined,
  report: Pick<TalentReportRecord, "openVolumeIds"> | null | undefined,
): string {
  return computeTalentReportNewBooks(
    geneReport?.books ?? "",
    report?.openVolumeIds ?? [],
  ).join("");
}

/** 开放册 V 号 → 字母串（详情信息条 `openBooksText`）。 */
export function talentReportOpenBooksText(openVolumeIds: unknown): string {
  return resolveTalentReportOpenBookCodes(openVolumeIds).join("");
}

/** 基因报告册摘要（元数据弹层 / 详情页签：只返回计数，不返回 sections 全量）。 */
export function summarizeTalentGeneReportChapters(
  geneReport: Pick<TalentGeneReportRecord, "books" | "sections"> | null,
): Array<{
  volumeId: string;
  bookCode: TalentGeneReportBookCode;
  name: string;
  chapterCount: number;
  factorCount: number;
}> {
  const books = normalizeTalentReportBookCodes(geneReport?.books ?? "");
  const sections = Array.isArray(geneReport?.sections) ? geneReport!.sections : [];
  return books.map((bookCode) => {
    const definition = TALENT_REPORT_VOLUME_DEFINITIONS.find(
      (item) => item.bookCode === bookCode,
    );
    const bookSections = sections.filter(
      (section) => String(section?.bookCode ?? "").toUpperCase() === bookCode,
    );
    const chapters = new Set(
      bookSections.map((section) => String(section?.chapter ?? "")),
    );
    return {
      volumeId: definition?.volumeId ?? resolveTalentReportVolumeId(bookCode),
      bookCode,
      name: definition?.name ?? "",
      chapterCount: chapters.size,
      factorCount: bookSections.length,
    };
  });
}