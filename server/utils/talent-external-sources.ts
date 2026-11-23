/**
 * @description M8 外部三源适配器（可替换骨架）：把 M2 `TalentGeneQuerySource`、
 *   M3 `TalentGeneReportSource`、M5 `TalentAdviceSource` 的请求/响应映射到 §3 合同，
 *   传输、签名、重试、熔断、限流、告警全部委托 `talent-external-adapter.ts`。
 *   供应商真实字段名未定（C1）：字段差异只改本文件的映射函数，业务层/调用方不变。
 *   三个工厂仍是唯一切换点；本文件不改 M2/M3/M5 领域语义，也不读写集合。
 * @file server/utils/talent-external-sources.ts
 */
import { createHash } from "node:crypto";
import {
  TALENT_GENE_REPORT_BOOK_CODES,
  type TalentGeneReportBookCode,
  type TalentGeneReportExternalData,
  type TalentGeneReportExternalSection,
  type TalentGeneReportSource,
  type TalentGeneReportSyncSubject,
} from "~~/shared/types/talent-report";
import {
  TALENT_ADVICE_BOOK_NAMES,
  type TalentAdviceMatchResult,
  type TalentAdviceRawSection,
  type TalentAdviceSource,
  type TalentAdviceSyncSubject,
} from "~~/shared/types/talent-advice";
import {
  createTalentExternalRequestId,
  getTalentExternalClient,
  type TalentExternalClient,
} from "./talent-external-adapter";
import type { TalentGeneQueryRequest } from "./talent-member-query";

/** 真实源标识（与 M3/M5 既有常量一致）。 */
const EXTERNAL = "external" as const;

export interface TalentExternalSourceOptions {
  env?: NodeJS.ProcessEnv;
  /** 测试注入假 transport 的 client；生产走 env 配置。 */
  client?: TalentExternalClient;
}

function resolveClient(
  scope: "gene_report" | "advice_version" | "gene_query",
  options: TalentExternalSourceOptions,
): TalentExternalClient {
  return options.client ?? getTalentExternalClient(scope, options.env);
}

// ── 公共映射工具 ────────────────────────────────────────────────────────────

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberOrUndefined(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** 分册编码归一化：只保留 A–F；支持数组或 `"ABC"` 字符串。 */
export function normalizeTalentExternalBooks(
  value: unknown,
): TalentGeneReportBookCode[] {
  const raw = Array.isArray(value)
    ? value.map((item) => String(item ?? ""))
    : String(value ?? "").split("");
  const codes = new Set<TalentGeneReportBookCode>();
  for (const item of raw) {
    const code = item.trim().toUpperCase();
    if ((TALENT_GENE_REPORT_BOOK_CODES as readonly string[]).includes(code))
      codes.add(code as TalentGeneReportBookCode);
  }
  return [...codes].sort();
}

function emptyGeneReport(
  reason: "no_result" | "info_mismatch",
): TalentGeneReportExternalData {
  return { found: false, reason, books: [], sections: [] };
}

function emptyAdvice(reason: "no_result" | "info_mismatch"): TalentAdviceMatchResult {
  return { found: false, reason };
}

// ── M3 基因报告：请求 / 响应映射（spec §3.6） ───────────────────────────────

/** 映射为 §3.6 请求体；身份证/手机号只在 TLS body，不落库、不进日志。 */
export function buildTalentGeneReportRequestBody(
  subject: TalentGeneReportSyncSubject,
  requestId: string,
): Record<string, unknown> {
  return {
    requestId,
    subjectType: subject.subjectType,
    subjectId: subject.subjectId,
    name: subject.name,
    gender: subject.gender,
    birthday: subject.birthday,
    age: subject.age,
    idNo: subject.idNo,
    mobile: subject.mobile,
    ...(subject.existingReportNo ? { existingReportNo: subject.existingReportNo } : {}),
  };
}

/** 映射外部 `data` 为 M3 `TalentGeneReportExternalData`（字段别名集中在此）。 */
export function mapTalentGeneReportExternalData(
  raw: unknown,
): TalentGeneReportExternalData {
  const data = asRecord(raw);
  const found = data.found === true;
  if (!found) {
    const reason = text(data.reason).toLowerCase();
    return emptyGeneReport(reason === "info_mismatch" ? "info_mismatch" : "no_result");
  }
  const books = normalizeTalentExternalBooks(data.books);
  const sectionsRaw = Array.isArray(data.sections) ? data.sections : [];
  const sections: TalentGeneReportExternalSection[] = [];
  for (const item of sectionsRaw) {
    const row = asRecord(item);
    const bookCode = text(row.bookCode ?? row.book).toUpperCase() as TalentGeneReportBookCode;
    if (!(TALENT_GENE_REPORT_BOOK_CODES as readonly string[]).includes(bookCode))
      continue;
    const factorCode = text(row.factorCode ?? row.factor);
    const levelCode = text(row.levelCode ?? row.level);
    if (!factorCode || !levelCode) continue;
    sections.push({
      bookCode,
      chapter: text(row.chapter),
      factorCode,
      ...(text(row.factorName) ? { factorName: text(row.factorName) } : {}),
      levelCode,
      ...(numberOrUndefined(row.score) !== undefined
        ? { score: numberOrUndefined(row.score) }
        : {}),
      condition: text(row.condition ?? row.conditionText),
    });
  }
  return {
    found: true,
    ...(text(data.reportNo) ? { reportNo: text(data.reportNo) } : {}),
    ...(text(data.issuer) ? { issuer: text(data.issuer) } : {}),
    ...(text(data.filedAt) ? { filedAt: text(data.filedAt) } : {}),
    ...(text(data.sourceVersion) ? { sourceVersion: text(data.sourceVersion) } : {}),
    books: books.length ? books : [...new Set(sections.map((section) => section.bookCode))],
    sections,
  };
}

/** 批次内单对象幂等键：`sha256("gene-reports:" + requestId + ":" + subjectId)`（spec §3.8）。 */
export function buildTalentGeneReportIdempotencyKey(
  subjectId: string,
  requestId: string,
): string {
  return createHash("sha256")
    .update(`gene-reports:${requestId}:${subjectId}`)
    .digest("hex");
}

/** M3 external 源：按对象 POST `/v1/gene-reports/query`，返回映射后的外部数据。 */
export function createExternalTalentGeneReportSource(
  options: TalentExternalSourceOptions = {},
): TalentGeneReportSource {
  const client = resolveClient("gene_report", options);
  return {
    source: EXTERNAL,
    async fetch(subject) {
      const requestId = createTalentExternalRequestId();
      const result = await client.request<unknown>({
        path: `/${client.config.apiVersion}/gene-reports/query`,
        requestId,
        idempotencyKey: buildTalentGeneReportIdempotencyKey(
          subject.subjectId,
          requestId,
        ),
        body: buildTalentGeneReportRequestBody(subject, requestId),
      });
      if (result.emptyCode)
        return emptyGeneReport(
          result.emptyCode.toUpperCase() === "INFO_MISMATCH"
            ? "info_mismatch"
            : "no_result",
        );
      return mapTalentGeneReportExternalData(result.data);
    },
  };
}

// ── M5 培育建议：请求 / 响应映射（spec §3.7） ───────────────────────────────

/** 映射为 §3.7 请求体；只传脱敏证件值，不传明文。 */
export function buildTalentAdviceRequestBody(
  subject: TalentAdviceSyncSubject,
  requestId: string,
): Record<string, unknown> {
  return {
    requestId,
    geneReportId: subject.geneReportId,
    reportNo: subject.reportNo,
    subjectType: subject.subjectType,
    subjectId: subject.subjectId,
    name: subject.name,
    gender: subject.gender,
    birthday: subject.birthday,
    age: subject.age,
    maskedIdNo: subject.maskedIdNo,
  };
}

/** 映射外部 `data` 为 M5 `TalentAdviceMatchResult`；正文原样，不做润色/改写。 */
export function mapTalentAdviceMatchResult(raw: unknown): TalentAdviceMatchResult {
  const data = asRecord(raw);
  if (data.found !== true) {
    const reason = text(data.reason).toLowerCase();
    return emptyAdvice(reason === "info_mismatch" ? "info_mismatch" : "no_result");
  }
  const sectionsRaw = Array.isArray(data.sections) ? data.sections : [];
  const sections: TalentAdviceRawSection[] = [];
  for (const item of sectionsRaw) {
    const row = asRecord(item);
    const book = text(row.book).toUpperCase();
    const factor = text(row.factor);
    const entropy = text(row.entropy);
    if (!book || !factor || !entropy) continue;
    const bookName = text(row.bookName) || TALENT_ADVICE_BOOK_NAMES[
      book as keyof typeof TALENT_ADVICE_BOOK_NAMES
    ];
    sections.push({
      book,
      ...(bookName ? { bookName } : {}),
      ...(text(row.chapter) ? { chapter: text(row.chapter) } : {}),
      factor,
      entropy,
      ...(text(row.content) ? { content: text(row.content) } : {}),
      ...(text(row.example) ? { example: text(row.example) } : {}),
      ...(text(row.direction) ? { direction: text(row.direction) } : {}),
      ...(text(row.suggestion) ? { suggestion: text(row.suggestion) } : {}),
      ...(numberOrUndefined(row.variant) !== undefined
        ? { variant: numberOrUndefined(row.variant) }
        : {}),
    });
  }
  const booksRaw = data.books;
  const books = Array.isArray(booksRaw)
    ? normalizeTalentExternalBooks(booksRaw).join("")
    : text(booksRaw).replace(/[^A-Fa-f]/g, "").toUpperCase();
  return {
    found: true,
    ...(books ? { books } : {}),
    sections,
    ...(text(data.version) ? { version: text(data.version) } : {}),
  };
}

/** 建议外部匹配键：`sha256("advice:" + geneReportId + ":" + age)`。 */
export function buildTalentAdviceIdempotencyKey(
  subject: Pick<TalentAdviceSyncSubject, "geneReportId" | "age">,
  requestId: string,
): string {
  return createHash("sha256")
    .update(`advice:${subject.geneReportId}:${subject.age}:${requestId}`)
    .digest("hex");
}

/** M5 external 源：按姓名 + 精确周岁 POST `/v1/advice/match`。 */
export function createExternalTalentAdviceSource(
  options: TalentExternalSourceOptions = {},
): TalentAdviceSource {
  const client = resolveClient("advice_version", options);
  return {
    name: EXTERNAL,
    async match(subject) {
      const requestId = createTalentExternalRequestId();
      const result = await client.request<unknown>({
        path: `/${client.config.apiVersion}/advice/match`,
        requestId,
        idempotencyKey: buildTalentAdviceIdempotencyKey(subject, requestId),
        body: buildTalentAdviceRequestBody(subject, requestId),
      });
      if (result.emptyCode)
        return emptyAdvice(
          result.emptyCode.toUpperCase() === "INFO_MISMATCH"
            ? "info_mismatch"
            : "no_result",
        );
      return mapTalentAdviceMatchResult(result.data);
    },
  };
}

// ── M2 基因查询：请求 / 响应映射（spec §3.4；本任务只交付骨架，工厂接线在后续） ─

export function buildTalentGeneQueryRequestBody(
  request: TalentGeneQueryRequest,
  requestId: string,
): Record<string, unknown> {
  return {
    requestId,
    childId: request.childId,
    seq: request.seq,
    name: request.name,
    gender: request.gender,
    birthday: request.birthday,
    idNo: request.idNo,
    mobile: request.mobile,
  };
}

/** 映射外部 `data` 为 M2 `{accepted, externalRef}`。 */
export function mapTalentGeneQueryResponse(raw: unknown): {
  accepted: boolean;
  externalRef?: string;
} {
  const data = asRecord(raw);
  const externalRef = text(data.externalRef);
  return {
    accepted: data.accepted === true,
    ...(externalRef ? { externalRef } : {}),
  };
}

/** M2 external 查询源（供 M2 工厂后续接线；幂等键 `${childId}:${seq}` 冻结）。 */
export function createExternalTalentGeneQuerySource(
  options: TalentExternalSourceOptions = {},
): TalentGeneQuerySourceLike {
  const client = resolveClient("gene_query", options);
  return {
    source: EXTERNAL,
    async submit(request) {
      const requestId = createTalentExternalRequestId();
      const result = await client.request<unknown>({
        path: `/${client.config.apiVersion}/gene-queries`,
        requestId,
        idempotencyKey: `${request.childId}:${request.seq}`,
        body: buildTalentGeneQueryRequestBody(request, requestId),
      });
      return mapTalentGeneQueryResponse(result.data);
    },
  };
}

/** 与 M2 `TalentGeneQuerySource` 结构一致（避免反向依赖 M2 领域文件）。 */
export interface TalentGeneQuerySourceLike {
  readonly source: string;
  submit(
    request: TalentGeneQueryRequest,
  ): Promise<{ accepted: boolean; externalRef?: string }>;
}