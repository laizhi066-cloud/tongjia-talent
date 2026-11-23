/**
 * @description M5 培育建议领域工具：版本两层与单一生效、接收新一版（占位 → 建议 → 归档 → 激活/补偿）、
 *   发布/撤回、年龄冻结与匹配键、`sections` 归一化/校验、派生缓存、派生可见性、版本/按人历史与 C 端只读读模型。
 *   口径见 docs/specs/M5-advice/spec.md §3/§4/§5.4/§7 与 ADR 0005-D1–D5：
 *   - 版本行 `talent_advice_versions` 与建议行 `talent_advice_docs` 分离，`status="active"` 部分唯一索引保证单一生效；
 *   - 同步即发布（`publishStatus="published"`，`publishedAt=syncedAt`），发布会/撤回只改可见性、不改正文；
 *   - 年龄按 `effectiveAt` 精确周岁冻结；`matchKey = 姓名｜N 岁`；
 *   - 不双写 M3 报告状态：C 端可见性读取时派生（`isTalentAdviceClientVisible`）。
 *   PocketBase 访问统一经 `TalentAdviceStore`，测试注入内存实现，不依赖 PB / 网络。
 * @file server/utils/talent-advice.ts
 */
import { createError } from "h3";
import type PocketBase from "pocketbase";
import {
  TALENT_ADVICE_BOOK_CODES,
  TALENT_ADVICE_BOOK_NAMES,
  TALENT_ADVICE_CLIENT_EMPTY_TEXT,
  TALENT_ADVICE_CYCLE_MONTHS,
  TALENT_ADVICE_DEFAULT_CHAPTER,
  TALENT_ADVICE_ENTROPY_LEVELS,
  TALENT_ADVICE_PUBLISH_STATUS_LABELS,
  TALENT_ADVICE_SECTION_LIMITS,
  TALENT_ADVICE_SOURCE_LABELS,
  TALENT_ADVICE_SYNC_REASON_LABELS,
  TALENT_ADVICE_VERSION_STATUS_LABELS,
  type TalentAdviceBookCode,
  type TalentAdviceBookGroup,
  type TalentAdviceClientBook,
  type TalentAdviceClientBookState,
  type TalentAdviceClientSnapshot,
  type TalentAdviceDerived,
  type TalentAdviceDocDetail,
  type TalentAdviceDocListRow,
  type TalentAdviceDocRecord,
  type TalentAdviceEntropyLevel,
  type TalentAdviceMatchResult,
  type TalentAdvicePersonHistory,
  type TalentAdvicePersonHistoryItem,
  type TalentAdvicePublishResult,
  type TalentAdviceReadableContext,
  type TalentAdviceReceiveResult,
  type TalentAdviceSection,
  type TalentAdviceSource,
  type TalentAdviceSourceKind,
  type TalentAdviceSubjectAdvice,
  type TalentAdviceSyncCandidate,
  type TalentAdviceSyncDetail,
  type TalentAdviceSyncLogInput,
  type TalentAdviceSyncPreview,
  type TalentAdviceSyncSubject,
  type TalentAdviceVersionHistory,
  type TalentAdviceVersionRecord,
  type TalentAdviceViewingVersion,
  type TalentAdviceVersionView,
} from "~~/shared/types/talent-advice";
import type {
  TalentChildRecord,
  TalentParentRecord,
} from "~~/shared/types/talent-member";
import type {
  TalentGeneReportRecord,
  TalentReportRecord,
} from "~~/shared/types/talent-report";
import { calculateTalentAge } from "./talent-age";
import {
  getTalentReportVolumeDefinitionByBook,
  normalizeTalentReportBookCodes,
  resolveTalentReportOpenBookCodes,
} from "./talent-report-snapshot";
import { withTalentReportLock } from "./talent-report-lock";
import { escapeFilterValue, getAdminPB } from "./pocketbase-client";
import {
  createTalentAdviceSource,
  recordTalentAdviceSyncLog,
  sanitizeTalentAdviceSyncMessage,
} from "./talent-advice-source";

// ── 错误（statusCode + data.code；API 层原样透传，不写 PB 原始错误） ────────

function talentAdviceError(
  statusCode: number,
  code: string,
  message: string,
  data: Record<string, unknown> = {},
) {
  return createError({ statusCode, message, data: { code, ...data } });
}

export function notFoundTalentAdviceDoc(): ReturnType<typeof createError> {
  return talentAdviceError(404, "ADVICE_DOC_NOT_FOUND", "建议书不存在");
}

export function notFoundTalentAdviceVersion(): ReturnType<typeof createError> {
  return talentAdviceError(404, "ADVICE_VERSION_NOT_FOUND", "建议版本不存在");
}

export function talentAdviceVersionReadonlyError(): ReturnType<typeof createError> {
  return talentAdviceError(
    409,
    "ADVICE_VERSION_READONLY",
    "历史版本只读，不能发布或撤回",
  );
}

export function talentAdviceVersionExistsError(
  existing: TalentAdviceVersionRecord,
): ReturnType<typeof createError> {
  return talentAdviceError(
    409,
    "ADVICE_VERSION_EXISTS",
    "该版本已同步，请勿重复接收",
    { existingVersionId: existing.id, existingVersionNo: existing.versionNo },
  );
}

export function talentAdviceVersionOrderError(): ReturnType<typeof createError> {
  return talentAdviceError(
    409,
    "ADVICE_VERSION_ORDER",
    "生效日期必须晚于当前生效版本",
  );
}

export function talentAdviceSyncFailedError(
  message = "建议接收写入失败，已回滚，当前生效版本保持不变",
): ReturnType<typeof createError> {
  return talentAdviceError(500, "ADVICE_VERSION_SYNC_FAILED", message);
}

// ── 日期 / 月份工具 ───────────────────────────────────────────────────────

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATE_PREFIX = /^(\d{4}-\d{2}-\d{2})(?:$|[T\s])/;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** 归一化业务日期：接受 `YYYY-MM-DD` 或 ISO 字符串，非法/不存在日期返回 undefined。 */
export function normalizeTalentAdviceDate(
  value: string | undefined | null,
): string | undefined {
  const text = String(value ?? "").trim();
  const matched = ISO_DATE_PREFIX.exec(text);
  const dateText = matched?.[1] ?? text;
  const parts = DATE_PATTERN.exec(dateText);
  if (!parts) return undefined;
  const year = Number(parts[1]);
  const month = Number(parts[2]);
  const day = Number(parts[3]);
  if (!isValidCalendarDate(year, month, day)) return undefined;
  return `${parts[1]}-${parts[2]}-${parts[3]}`;
}

/** 集合 date 字段（PB 可能返回带时间）→ 响应展示用 `YYYY-MM-DD`；非法值原样返回空串。 */
export function formatTalentAdviceDate(value: string | undefined | null): string {
  return normalizeTalentAdviceDate(value) ?? "";
}

/** `YYYY-MM-DD` 加 N 个月（月末对齐：1-31 + 1 个月 → 2 月末）。 */
export function addTalentAdviceMonths(
  date: string | undefined,
  months: number,
): string | undefined {
  const normalized = normalizeTalentAdviceDate(date);
  if (!normalized) return undefined;
  const [yearText, monthText, dayText] = normalized.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const offset = Math.trunc(months);
  const targetIndex = year * 12 + (month - 1) + offset;
  const targetYear = Math.floor(targetIndex / 12);
  const targetMonth = ((targetIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return `${String(targetYear).padStart(4, "0")}-${pad2(targetMonth + 1)}-${pad2(
    Math.min(day, lastDay),
  )}`;
}

/**
 * 版本周期与下一版时间：`cycle = YYYY-MM ~ YYYY-MM`（4 个月一版时含生效月起 4 个月），
 * `nextUpdateAt = effectiveAt + cycleMonths`（spec §3.1）。
 */
export function resolveTalentAdviceCycle(
  effectiveAt: string | undefined,
  cycleMonths: number = TALENT_ADVICE_CYCLE_MONTHS,
): { cycle: string; nextUpdateAt: string } | undefined {
  const normalized = normalizeTalentAdviceDate(effectiveAt);
  if (!normalized) return undefined;
  const months =
    Number.isInteger(cycleMonths) && cycleMonths > 0
      ? cycleMonths
      : TALENT_ADVICE_CYCLE_MONTHS;
  const nextUpdateAt = addTalentAdviceMonths(normalized, months);
  const cycleEnd = addTalentAdviceMonths(normalized, months - 1);
  if (!nextUpdateAt || !cycleEnd) return undefined;
  return {
    cycle: `${normalized.slice(0, 7)} ~ ${cycleEnd.slice(0, 7)}`,
    nextUpdateAt,
  };
}

/** 默认版本号 `V{YYYY}.{MM}`（按 effectiveAt）。 */
export function buildTalentAdviceVersionNo(
  effectiveAt: string | undefined,
): string {
  const normalized = normalizeTalentAdviceDate(effectiveAt);
  if (!normalized) return "";
  return `V${normalized.slice(0, 4)}.${normalized.slice(5, 7)}`;
}

/** 校验显式版本号：1–40 字、不含空白。 */
export function normalizeTalentAdviceVersionNo(
  value: string | undefined | null,
): string | undefined {
  const text = String(value ?? "").trim();
  if (!text || text.length > TALENT_ADVICE_SECTION_LIMITS.maxVersionNoLength)
    return undefined;
  return text;
}

// ── 年龄 / 匹配键 / 建议编号（spec §4.3、D5） ─────────────────────────────

/** 按同步日（effectiveAt）计算精确周岁；生日缺失/非法/未来 → undefined。 */
export function calculateTalentAdviceAge(
  birthday: string | undefined,
  effectiveAt: string | undefined,
): number | undefined {
  const reference = normalizeTalentAdviceDate(effectiveAt);
  if (!reference) return undefined;
  return calculateTalentAge(birthday, `${reference}T00:00:00.000Z`);
}

/** 外部匹配键快照：`{name}｜{age} 岁`（全角竖线，与 PRD / 原型同口径）。 */
export function buildTalentAdviceMatchKey(name: string, age: number): string {
  return `${String(name ?? "").trim()}｜${Math.max(0, Math.trunc(age))} 岁`;
}

/** 建议编号：`AD-{报告编号规范化}-{YYYYMM}`；规范化仅保留 `[A-Za-z0-9]`，其余替换 `-`。 */
export function buildTalentAdviceNo(
  reportNo: string | undefined,
  effectiveAt: string | undefined,
): string {
  const date = normalizeTalentAdviceDate(effectiveAt);
  if (!date) return "";
  const cleaned = String(reportNo ?? "")
    .trim()
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const month = date.slice(0, 7).replace("-", "");
  return `AD-${cleaned || "REPORT"}-${month}`.slice(
    0,
    TALENT_ADVICE_SECTION_LIMITS.maxAdviceNoLength,
  );
}

/** 建议编号是否满足 `^[A-Za-z0-9_-]{1,80}$`。 */
export function isValidTalentAdviceNo(value: string): boolean {
  return /^[A-Za-z0-9_-]{1,80}$/.test(String(value ?? ""));
}

/** 分册串归一化：大写、升序、去重、仅 A–F（复用 M3 唯一实现）。 */
export function normalizeTalentAdviceBooks(
  value: string | readonly string[] | undefined | null,
): TalentAdviceBookCode[] {
  return normalizeTalentReportBookCodes(value ?? "");
}

// ── data entropy / 展示文案 ───────────────────────────────────────────────

/** 数据熵等级名归一化：去尾「级」后必须命中白名单（原样保存、不映射四档）。 */
export function normalizeTalentAdviceEntropy(
  value: string | undefined | null,
): TalentAdviceEntropyLevel | undefined {
  const text = String(value ?? "")
    .trim()
    .replace(/级$/, "");
  return (TALENT_ADVICE_ENTROPY_LEVELS as readonly string[]).includes(text)
    ? (text as TalentAdviceEntropyLevel)
    : undefined;
}

/** 数据熵统计 → 「优秀 2·常态 1」（白名单顺序在前，其余按字典序）。 */
export function formatTalentAdviceEntropyText(
  counts: Record<string, number> | undefined | null,
): string {
  if (!counts || typeof counts !== "object") return "";
  const entries = Object.entries(counts).filter(
    ([, count]) => Number(count) > 0,
  );
  const order = new Map<string, number>(
    TALENT_ADVICE_ENTROPY_LEVELS.map((level, index) => [level, index]),
  );
  entries.sort((left, right) => {
    const leftIndex = order.get(left[0]) ?? Number.MAX_SAFE_INTEGER;
    const rightIndex = order.get(right[0]) ?? Number.MAX_SAFE_INTEGER;
    if (leftIndex !== rightIndex) return leftIndex - rightIndex;
    return left[0].localeCompare(right[0], "zh-Hans-CN");
  });
  return entries
    .map(([level, count]) => `${level} ${Number(count)}`)
    .join("·");
}

/** 覆盖要素文案：`运动协调 等 3 项`；0 项返回空串（页面渲染 `—`）。 */
export function formatTalentAdviceCoveredFactorText(
  firstFactorName: string | undefined,
  sectionCount: number,
): string {
  const count = Math.max(0, Math.trunc(Number(sectionCount) || 0));
  if (count <= 0) return "";
  const first = String(firstFactorName ?? "").trim();
  return first ? `${first} 等 ${count} 项` : `${count} 项`;
}

export function formatTalentAdviceAgeLabel(age: number): string {
  return `${Math.max(0, Math.trunc(Number(age) || 0))} 岁`;
}

export function formatTalentAdviceGenderLabel(
  gender: "male" | "female" | string,
): string {
  return String(gender) === "male" ? "男" : "女";
}

/** 一册一份派生的建议书编号：`{adviceNo}-{book}`。 */
export function formatTalentAdviceBookAdviceNo(
  adviceNo: string,
  book: string,
): string {
  return `${String(adviceNo ?? "")}-${String(book ?? "").toUpperCase()}`;
}

// ── sections 归一化 / 校验（spec §3.3） ──────────────────────────────────

export interface TalentAdviceNormalizeSectionsOptions {
  /** 本行基因报告已出分册（字符串或数组）；提供后 `sections[].book` 必须 ⊆ 它。 */
  books?: string | readonly string[];
}

export type TalentAdviceSectionsValidation =
  | { ok: true; sections: TalentAdviceSection[] }
  | {
      ok: false;
      code: "sections_invalid" | "empty_sections";
      message: string;
    };

function sectionText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

const PII_ID_NO_PATTERN = /(?<!\d)\d{17}[\dXx](?!\d)/;
const PII_MOBILE_PATTERN = /(?<!\d)1[3-9]\d{9}(?!\d)/;

function containsTalentAdvicePii(text: string): boolean {
  return PII_ID_NO_PATTERN.test(text) || PII_MOBILE_PATTERN.test(text);
}

/**
 * 归一化并校验 `sections`：
 * - 数组 1–200 条、整份 JSON ≤256KB；空数组 → `empty_sections`；
 * - `book` ∈ A–F 且 ∈ 本行 books；`factor` 1–50 字；`chapter` 默认「专项潜质」≤100 字；
 * - `entropy` 白名单（可带「级」后缀）；四段 ≤2000 字、允许空串；
 * - 文本命中 18 位身份证 / 11 位手机号形态 → 整份拒绝（防外部误带 PII）；
 * - 四段全空 → `empty_sections`；
 * - 顺序：按分册 A–F 升序、册内保持外部原始顺序（稳定排序）。
 */
export function normalizeTalentAdviceSections(
  raw: unknown,
  options: TalentAdviceNormalizeSectionsOptions = {},
): TalentAdviceSectionsValidation {
  if (!Array.isArray(raw))
    return {
      ok: false,
      code: "sections_invalid",
      message: "建议正文必须是数组",
    };
  if (raw.length === 0)
    return {
      ok: false,
      code: "empty_sections",
      message: "建议正文为空",
    };
  if (raw.length > TALENT_ADVICE_SECTION_LIMITS.maxSections)
    return {
      ok: false,
      code: "sections_invalid",
      message: `建议正文超过 ${TALENT_ADVICE_SECTION_LIMITS.maxSections} 条`,
    };
  let serializedBytes = 0;
  try {
    serializedBytes = new TextEncoder().encode(JSON.stringify(raw)).length;
  } catch {
    return {
      ok: false,
      code: "sections_invalid",
      message: "建议正文无法序列化",
    };
  }
  if (serializedBytes > TALENT_ADVICE_SECTION_LIMITS.maxJsonBytes)
    return {
      ok: false,
      code: "sections_invalid",
      message: "建议正文超过 256KB",
    };
  const books = normalizeTalentAdviceBooks(options.books ?? "");
  const booksSet = new Set<string>(books);
  const sections: TalentAdviceSection[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item))
      return {
        ok: false,
        code: "sections_invalid",
        message: "建议正文存在非法条目",
      };
    const record = item as Record<string, unknown>;
    const book = String(record.book ?? "")
      .trim()
      .toUpperCase();
    if (!(TALENT_ADVICE_BOOK_CODES as readonly string[]).includes(book))
      return {
        ok: false,
        code: "sections_invalid",
        message: `分册编码不合法：${book || "(空)"}`,
      };
    if (booksSet.size > 0 && !booksSet.has(book))
      return {
        ok: false,
        code: "sections_invalid",
        message: `分册 ${book} 不在基因报告已出分册 ${books.join("")} 内`,
      };
    const bookCode = book as TalentAdviceBookCode;
    const factor = sectionText(record.factor);
    if (!factor)
      return { ok: false, code: "sections_invalid", message: "要素名称不能为空" };
    if (factor.length > TALENT_ADVICE_SECTION_LIMITS.maxFactorLength)
      return {
        ok: false,
        code: "sections_invalid",
        message: `要素名称超过 ${TALENT_ADVICE_SECTION_LIMITS.maxFactorLength} 字`,
      };
    const chapter =
      sectionText(record.chapter) || TALENT_ADVICE_DEFAULT_CHAPTER;
    if (chapter.length > TALENT_ADVICE_SECTION_LIMITS.maxChapterLength)
      return {
        ok: false,
        code: "sections_invalid",
        message: `章节名超过 ${TALENT_ADVICE_SECTION_LIMITS.maxChapterLength} 字`,
      };
    const entropy = normalizeTalentAdviceEntropy(record.entropy as string);
    if (!entropy)
      return {
        ok: false,
        code: "sections_invalid",
        message: `数据熵等级不合法：${String(record.entropy ?? "") || "(空)"}`,
      };
    const content = sectionText(record.content);
    const example = sectionText(record.example);
    const direction = sectionText(record.direction);
    const suggestion = sectionText(record.suggestion);
    if (
      [content, example, direction, suggestion].some(
        (text) => text.length > TALENT_ADVICE_SECTION_LIMITS.maxTextLength,
      )
    )
      return {
        ok: false,
        code: "sections_invalid",
        message: `单段文案超过 ${TALENT_ADVICE_SECTION_LIMITS.maxTextLength} 字`,
      };
    const bookName =
      sectionText(record.bookName) || TALENT_ADVICE_BOOK_NAMES[bookCode];
    const rawVariant = record.variant;
    const variant =
      rawVariant === undefined || rawVariant === null || rawVariant === ""
        ? 1
        : Number(rawVariant);
    if (!Number.isInteger(variant) || variant < 1)
      return {
        ok: false,
        code: "sections_invalid",
        message: "话术变体序号必须是 ≥1 的整数",
      };
    if (
      containsTalentAdvicePii(
        `${bookName}${chapter}${factor}${content}${example}${direction}${suggestion}`,
      )
    )
      return {
        ok: false,
        code: "sections_invalid",
        message: "建议正文疑似包含证件号或手机号，已拒绝",
      };
    sections.push({
      book: bookCode,
      bookName,
      chapter,
      factor,
      entropy,
      content,
      example,
      direction,
      suggestion,
      variant,
    });
  }
  if (
    !sections.some(
      (section) =>
        section.content ||
        section.example ||
        section.direction ||
        section.suggestion,
    )
  )
    return {
      ok: false,
      code: "empty_sections",
      message: "建议正文为空",
    };
  const bookOrder = new Map(
    TALENT_ADVICE_BOOK_CODES.map((code, index) => [code, index]),
  );
  sections.sort(
    (left, right) =>
      (bookOrder.get(left.book) ?? 0) - (bookOrder.get(right.book) ?? 0),
  );
  return { ok: true, sections };
}

// ── 派生缓存（spec §3.4） ─────────────────────────────────────────────────

/** 由 `sections` 计算派生缓存字段（写入时落库，测试断言可重算一致）。 */
export function buildTalentAdviceDerived(
  sections: readonly TalentAdviceSection[],
): TalentAdviceDerived {
  const entropyCounts: Record<string, number> = {};
  const books = new Set<string>();
  for (const section of sections) {
    books.add(section.book);
    entropyCounts[section.entropy] =
      (entropyCounts[section.entropy] ?? 0) + 1;
  }
  return {
    sectionCount: sections.length,
    bookCount: books.size,
    entropyCounts,
    firstFactorName: String(sections[0]?.factor ?? ""),
  };
}

// ── 集合记录 sanitize（禁止返回 idNoHash / sections 全量到列表） ─────────

export interface TalentAdviceDocSanitizeExtras {
  clientVisible?: boolean;
  activeVersionId?: string;
}

/** 建议行 → 15 列列表行：去除 `idNoHash` / `sections` / `matchKey`，补展示标签。 */
export function sanitizeTalentAdviceDocRecord(
  record: TalentAdviceDocRecord,
  extras: TalentAdviceDocSanitizeExtras = {},
): TalentAdviceDocListRow {
  const books = normalizeTalentAdviceBooks(record.books);
  const derived = {
    sectionCount: Number(record.sectionCount ?? 0),
    bookCount: Number(record.bookCount ?? books.length),
    entropyCounts: record.entropyCounts ?? {},
    firstFactorName: String(record.firstFactorName ?? ""),
  };
  return {
    id: record.id,
    adviceNo: String(record.adviceNo ?? ""),
    versionId: String(record.versionId ?? ""),
    versionName: String(record.versionName ?? ""),
    name: String(record.name ?? ""),
    maskedIdNo: String(record.maskedIdNo ?? ""),
    gender: record.gender === "male" ? "male" : "female",
    genderLabel: formatTalentAdviceGenderLabel(record.gender),
    birthday: String(record.birthday ?? ""),
    age: Math.max(0, Math.trunc(Number(record.age) || 0)),
    ageLabel: formatTalentAdviceAgeLabel(Number(record.age) || 0),
    geneReportId: String(record.geneReportId ?? ""),
    reportId: String(record.reportId ?? ""),
    reportNo: String(record.reportNo ?? ""),
    geneBookCount: books.length,
    geneBookCountLabel: `${books.length} 篇`,
    books: books.join(""),
    coveredFactorText: formatTalentAdviceCoveredFactorText(
      derived.firstFactorName,
      derived.sectionCount,
    ),
    entropyText: formatTalentAdviceEntropyText(derived.entropyCounts),
    publishStatus:
      record.publishStatus === "withdrawn" ? "withdrawn" : "published",
    publishStatusLabel:
      TALENT_ADVICE_PUBLISH_STATUS_LABELS[
        record.publishStatus === "withdrawn" ? "withdrawn" : "published"
      ],
    publishedAt: String(record.publishedAt ?? ""),
    withdrawnAt: String(record.withdrawnAt ?? ""),
    syncedAt: String(record.syncedAt ?? ""),
    source: record.source === "external" ? "external" : "mock",
    clientVisible: Boolean(extras.clientVisible),
    versionReadonly:
      Boolean(extras.activeVersionId) &&
      String(record.versionId ?? "") !== String(extras.activeVersionId),
  };
}

export interface TalentAdviceVersionRecordStats {
  docCount?: number;
  publishedCount?: number;
  withdrawnCount?: number;
}

/** 版本行 → 版本历史视图（去审计字段，补标签与聚合统计）。 */
export function sanitizeTalentAdviceVersionRecord(
  record: TalentAdviceVersionRecord,
  stats: TalentAdviceVersionRecordStats = {},
): TalentAdviceVersionView {
  return {
    id: record.id,
    versionNo: String(record.versionNo ?? ""),
    status: record.status === "active" ? "active" : "archived",
    statusLabel: TALENT_ADVICE_VERSION_STATUS_LABELS[record.status],
    cycle: String(record.cycle ?? ""),
    effectiveAt: formatTalentAdviceDate(record.effectiveAt),
    nextUpdateAt: formatTalentAdviceDate(record.nextUpdateAt),
    syncedAt: String(record.syncedAt ?? ""),
    source: record.source === "external" ? "external" : "mock",
    sourceLabel: TALENT_ADVICE_SOURCE_LABELS[record.source],
    note: String(record.note ?? ""),
    operatorName: String(record.operatorName ?? ""),
    docCount: Math.max(0, Math.trunc(Number(stats.docCount ?? 0))),
    publishedCount: Math.max(0, Math.trunc(Number(stats.publishedCount ?? 0))),
    withdrawnCount: Math.max(0, Math.trunc(Number(stats.withdrawnCount ?? 0))),
    isCurrent: record.status === "active",
  };
}

/** 由建议行统计版本维度份数（读取时聚合，不落字段）。 */
export function computeTalentAdviceDocStats(
  docs: readonly Pick<TalentAdviceDocRecord, "publishStatus">[],
): Required<TalentAdviceVersionRecordStats> {
  let publishedCount = 0;
  let withdrawnCount = 0;
  for (const doc of docs) {
    if (doc.publishStatus === "withdrawn") withdrawnCount += 1;
    else publishedCount += 1;
  }
  return {
    docCount: docs.length,
    publishedCount,
    withdrawnCount,
  };
}

// ── 派生可见性（spec §4.5 / ADR 0005-D4） ─────────────────────────────────

export interface TalentAdviceVisibilityInput {
  doc: Pick<
    TalentAdviceDocRecord,
    "publishStatus" | "versionId" | "subjectType" | "parentId"
  >;
  activeVersionId: string;
  report?: Pick<TalentReportRecord, "status"> | null;
  parent?: Pick<TalentParentRecord, "id" | "status"> | null;
  child?: Pick<TalentChildRecord, "status" | "parentId"> | null;
}

export interface TalentAdviceClientVisibility {
  visible: boolean;
  text: string;
}

/** 派生可见性：建议已发布 ∧ 当前生效版本 ∧ 报告已发布 ∧ 归属正常（不落库、不双写）。 */
export function isTalentAdviceClientVisible(
  input: TalentAdviceVisibilityInput,
): boolean {
  if (input.doc.publishStatus !== "published") return false;
  if (!input.activeVersionId) return false;
  if (String(input.doc.versionId ?? "") !== String(input.activeVersionId))
    return false;
  if (!input.report || input.report.status !== "published") return false;
  if (!input.parent || String(input.parent.status) !== "1") return false;
  if (input.doc.subjectType === "self") return true;
  const child = input.child;
  if (!child) return false;
  return (
    String(child.status) === "1" &&
    String(child.parentId ?? "") === String(input.parent.id)
  );
}

/** 派生可见性 + 后台信息条提示文案（可见 / 不可见原因）。 */
export function resolveTalentAdviceClientVisibility(
  input: TalentAdviceVisibilityInput,
): TalentAdviceClientVisibility {
  if (input.doc.publishStatus !== "published")
    return { visible: false, text: "不可见（建议已撤回）" };
  if (
    !input.activeVersionId ||
    String(input.doc.versionId ?? "") !== String(input.activeVersionId)
  )
    return { visible: false, text: "不可见（非当前生效版本）" };
  if (!input.report || input.report.status === "pending_publish")
    return { visible: false, text: "不可见（报告未发布）" };
  if (input.report.status === "retracted")
    return { visible: false, text: "不可见（报告已撤回）" };
  if (input.report.status !== "published")
    return { visible: false, text: "不可见（报告未发布）" };
  if (!input.parent || String(input.parent.status) !== "1")
    return { visible: false, text: "不可见（会员已停用）" };
  if (input.doc.subjectType === "child") {
    if (!input.child) return { visible: false, text: "不可见（子女档案不可用）" };
    if (String(input.child.status) !== "1")
      return { visible: false, text: "不可见（子女已解绑）" };
    if (String(input.child.parentId ?? "") !== String(input.parent.id))
      return { visible: false, text: "不可见（子女档案不可用）" };
  }
  return { visible: true, text: "可见" };
}

// ── 数据访问层（真实 PB 实现 + 测试注入） ────────────────────────────────

/** 集合写入载荷；字段与 schema 对齐，统一由本模块构造。 */
export type TalentAdviceRecordData = Record<string, unknown>;

/**
 * 列表读模型字段：只取 15 列与筛选所需字段，**不读 `sections`**
 * （spec §3.4 派生缓存字段的目的就是避免把整份正文读回列表）。
 */
export const TALENT_ADVICE_LIST_FIELDS = [
  "id",
  "created",
  "updated",
  "adviceNo",
  "geneReportId",
  "reportId",
  "reportNo",
  "subjectType",
  "subjectId",
  "parentId",
  "name",
  "maskedIdNo",
  "idNoHash",
  "gender",
  "birthday",
  "age",
  "matchKey",
  "versionId",
  "versionName",
  "publishStatus",
  "publishedAt",
  "withdrawnAt",
  "syncedAt",
  "source",
  "books",
  "sectionCount",
  "bookCount",
  "entropyCounts",
  "firstFactorName",
].join(",");

export interface TalentAdviceStore {
  listCandidates(): Promise<TalentAdviceSyncCandidate[]>;
  listVersions(): Promise<TalentAdviceVersionRecord[]>;
  getVersionById(id: string): Promise<TalentAdviceVersionRecord | null>;
  getVersionByNo(versionNo: string): Promise<TalentAdviceVersionRecord | null>;
  createVersion(data: TalentAdviceRecordData): Promise<TalentAdviceVersionRecord>;
  updateVersion(
    id: string,
    data: TalentAdviceRecordData,
  ): Promise<TalentAdviceVersionRecord>;
  deleteVersion(id: string): Promise<void>;
  createDoc(data: TalentAdviceRecordData): Promise<TalentAdviceDocRecord>;
  updateDoc(
    id: string,
    data: TalentAdviceRecordData,
  ): Promise<TalentAdviceDocRecord>;
  deleteDoc(id: string): Promise<void>;
  getDocById(id: string): Promise<TalentAdviceDocRecord | null>;
  listDocsByVersion(versionId: string): Promise<TalentAdviceDocRecord[]>;
  listDocsByReportNo(reportNo: string): Promise<TalentAdviceDocRecord[]>;
  listDocsBySubject(
    subjectType: string,
    subjectId: string,
  ): Promise<TalentAdviceDocRecord[]>;
  /**
   * 列表读模型（可选）：只取 15 列字段、不读 `sections`；
   * 内存实现 / 假实现可省略，API 层回退 `listDocsByVersion`。
   */
  listDocRowsByVersion?(versionId: string): Promise<TalentAdviceDocRecord[]>;
  getReportById(id: string): Promise<TalentReportRecord | null>;
  getParentById(id: string): Promise<TalentParentRecord | null>;
  getParentByUserId(userId: string): Promise<TalentParentRecord | null>;
  getChildById(id: string): Promise<TalentChildRecord | null>;
  recordSyncLog(input: TalentAdviceSyncLogInput): Promise<string>;
}

type TalentAdvicePBProvider = () => PocketBase | Promise<PocketBase>;

let talentAdvicePBProvider: TalentAdvicePBProvider | null = null;

/** 仅测试 / 插件注入用：覆盖建议域使用的 PocketBase 连接。 */
export function setTalentAdvicePBProvider(
  provider: TalentAdvicePBProvider | null,
): void {
  talentAdvicePBProvider = provider;
}

async function resolveTalentAdvicePB(): Promise<PocketBase> {
  if (talentAdvicePBProvider) return talentAdvicePBProvider();
  return getAdminPB();
}

async function getFirstOrNull<T>(
  admin: PocketBase,
  collection: string,
  filter: string,
): Promise<T | null> {
  try {
    return await admin
      .collection(collection)
      .getFirstListItem<T>(filter, { $autoCancel: false });
  } catch {
    return null;
  }
}

/** 真实 PocketBase 建议域数据访问层（只读写 `talent_*` 集合）。 */
export function createTalentAdviceStore(
  pb?: PocketBase | Promise<PocketBase>,
): TalentAdviceStore {
  const resolvePB = async (): Promise<PocketBase> =>
    pb ? await pb : resolveTalentAdvicePB();

  return {
    async listCandidates() {
      const admin = await resolvePB();
      const geneReports = await admin
        .collection("talent_gene_reports")
        .getFullList<TalentGeneReportRecord>({
          filter: 'status = "synced"',
          sort: "created",
          $autoCancel: false,
        });
      if (geneReports.length === 0) return [];
      const reports = await admin
        .collection("talent_reports")
        .getFullList<TalentReportRecord>({
          filter: 'geneReportId != ""',
          $autoCancel: false,
        })
        .catch(() => [] as TalentReportRecord[]);
      const reportByGene = new Map(
        reports.map((report) => [String(report.geneReportId || ""), report]),
      );
      return geneReports.map((geneReport) => ({
        geneReport,
        report: reportByGene.get(geneReport.id) ?? null,
        geneReportId: geneReport.id,
        reportNo: String(geneReport.reportNo ?? ""),
        subjectType: geneReport.subjectType,
        subjectId: String(geneReport.subjectId ?? ""),
        parentId: String(geneReport.parentId || ""),
        name: String(geneReport.name ?? ""),
        gender: geneReport.gender === "male" ? "male" : "female",
        birthday: String(geneReport.birthday ?? ""),
        maskedIdNo: String(geneReport.maskedIdNo ?? ""),
        idNoHash: String(geneReport.idNoHash ?? ""),
      }));
    },

    async listVersions() {
      const admin = await resolvePB();
      return admin
        .collection("talent_advice_versions")
        .getFullList<TalentAdviceVersionRecord>({
          sort: "-effectiveAt",
          $autoCancel: false,
        });
    },

    async getVersionById(id) {
      if (!String(id ?? "").trim()) return null;
      return getFirstOrNull<TalentAdviceVersionRecord>(
        await resolvePB(),
        "talent_advice_versions",
        `id = "${escapeFilterValue(String(id))}"`,
      );
    },

    async getVersionByNo(versionNo) {
      const value = String(versionNo ?? "").trim();
      if (!value) return null;
      return getFirstOrNull<TalentAdviceVersionRecord>(
        await resolvePB(),
        "talent_advice_versions",
        `versionNo = "${escapeFilterValue(value)}"`,
      );
    },

    async createVersion(data) {
      const admin = await resolvePB();
      return admin
        .collection("talent_advice_versions")
        .create<TalentAdviceVersionRecord>(data, { $autoCancel: false });
    },

    async updateVersion(id, data) {
      const admin = await resolvePB();
      return admin
        .collection("talent_advice_versions")
        .update<TalentAdviceVersionRecord>(id, data, { $autoCancel: false });
    },

    async deleteVersion(id) {
      const admin = await resolvePB();
      await admin
        .collection("talent_advice_versions")
        .delete(id, { $autoCancel: false });
    },

    async createDoc(data) {
      const admin = await resolvePB();
      return admin
        .collection("talent_advice_docs")
        .create<TalentAdviceDocRecord>(data, { $autoCancel: false });
    },

    async updateDoc(id, data) {
      const admin = await resolvePB();
      return admin
        .collection("talent_advice_docs")
        .update<TalentAdviceDocRecord>(id, data, { $autoCancel: false });
    },

    async deleteDoc(id) {
      const admin = await resolvePB();
      await admin
        .collection("talent_advice_docs")
        .delete(id, { $autoCancel: false });
    },

    async getDocById(id) {
      if (!String(id ?? "").trim()) return null;
      return getFirstOrNull<TalentAdviceDocRecord>(
        await resolvePB(),
        "talent_advice_docs",
        `id = "${escapeFilterValue(String(id))}"`,
      );
    },

    async listDocsByVersion(versionId) {
      const value = String(versionId ?? "").trim();
      if (!value) return [];
      const admin = await resolvePB();
      return admin
        .collection("talent_advice_docs")
        .getFullList<TalentAdviceDocRecord>({
          filter: `versionId = "${escapeFilterValue(value)}"`,
          sort: "adviceNo",
          $autoCancel: false,
        });
    },

    async listDocRowsByVersion(versionId) {
      const value = String(versionId ?? "").trim();
      if (!value) return [];
      const admin = await resolvePB();
      return admin
        .collection("talent_advice_docs")
        .getFullList<TalentAdviceDocRecord>({
          filter: `versionId = "${escapeFilterValue(value)}"`,
          sort: "adviceNo",
          fields: TALENT_ADVICE_LIST_FIELDS,
          $autoCancel: false,
        });
    },

    async listDocsByReportNo(reportNo) {
      const value = String(reportNo ?? "").trim();
      if (!value) return [];
      const admin = await resolvePB();
      return admin
        .collection("talent_advice_docs")
        .getFullList<TalentAdviceDocRecord>({
          filter: `reportNo = "${escapeFilterValue(value)}"`,
          sort: "-syncedAt",
          $autoCancel: false,
        });
    },

    async listDocsBySubject(subjectType, subjectId) {
      const type = String(subjectType ?? "").trim();
      const id = String(subjectId ?? "").trim();
      if (!type || !id) return [];
      const admin = await resolvePB();
      return admin
        .collection("talent_advice_docs")
        .getFullList<TalentAdviceDocRecord>({
          filter: `subjectType = "${escapeFilterValue(
            type,
          )}" && subjectId = "${escapeFilterValue(id)}"`,
          sort: "-syncedAt",
          $autoCancel: false,
        });
    },

    async getReportById(id) {
      if (!String(id ?? "").trim()) return null;
      return getFirstOrNull<TalentReportRecord>(
        await resolvePB(),
        "talent_reports",
        `id = "${escapeFilterValue(String(id))}"`,
      );
    },

    async getParentById(id) {
      if (!String(id ?? "").trim()) return null;
      return getFirstOrNull<TalentParentRecord>(
        await resolvePB(),
        "talent_parents",
        `id = "${escapeFilterValue(String(id))}"`,
      );
    },

    async getParentByUserId(userId) {
      const value = String(userId ?? "").trim();
      if (!value) return null;
      return getFirstOrNull<TalentParentRecord>(
        await resolvePB(),
        "talent_parents",
        `userId = "${escapeFilterValue(value)}"`,
      );
    },

    async getChildById(id) {
      if (!String(id ?? "").trim()) return null;
      return getFirstOrNull<TalentChildRecord>(
        await resolvePB(),
        "talent_children",
        `id = "${escapeFilterValue(String(id))}"`,
      );
    },

    async recordSyncLog(input) {
      return recordTalentAdviceSyncLog(input, resolvePB());
    },
  };
}

// ── 版本解析与接收计划 ───────────────────────────────────────────────────

export function resolveActiveTalentAdviceVersion(
  versions: readonly TalentAdviceVersionRecord[],
): TalentAdviceVersionRecord | null {
  return versions.find((version) => version.status === "active") ?? null;
}

export async function getActiveTalentAdviceVersion(
  store: TalentAdviceStore = createTalentAdviceStore(),
): Promise<TalentAdviceVersionRecord | null> {
  const versions = await store.listVersions();
  return resolveActiveTalentAdviceVersion(versions);
}

export interface TalentAdviceVersionPlan {
  effectiveAt: string;
  versionNo: string;
  cycle: string;
  nextUpdateAt: string;
  activeVersion: TalentAdviceVersionRecord | null;
  duplicateVersion: TalentAdviceVersionRecord | null;
  /** 顺序非法（effectiveAt 不晚于当前生效版）；commit 抛 409，preview 仅提示。 */
  orderInvalid: boolean;
}

/**
 * 解析接收新一版的版本计划：日期/版本号合法性、重复版本（版本号 / 生效月份 / 生效日期）、
 * 版本只能前进（spec §4.3 步骤 1–2）。`throwOnConflict` 为 true 时直接抛 409（commit 路径）。
 */
export async function buildTalentAdviceVersionPlan(
  input: {
    effectiveAt: string;
    versionNo?: string;
    throwOnConflict?: boolean;
  },
  store: TalentAdviceStore = createTalentAdviceStore(),
): Promise<TalentAdviceVersionPlan> {
  const effectiveAt = normalizeTalentAdviceDate(input.effectiveAt);
  if (!effectiveAt)
    throw createError({
      statusCode: 422,
      message: "同步日期格式必须为 YYYY-MM-DD",
      data: { code: "VALIDATION_ERROR" },
    });
  const versionNo =
    normalizeTalentAdviceVersionNo(input.versionNo) ??
    buildTalentAdviceVersionNo(effectiveAt);
  if (!isValidTalentAdviceVersionNo(versionNo))
    throw createError({
      statusCode: 422,
      message: "版本号长度必须为 1–40 字",
      data: { code: "VALIDATION_ERROR" },
    });
  const cycle = resolveTalentAdviceCycle(effectiveAt);
  if (!cycle)
    throw createError({
      statusCode: 422,
      message: "同步日期格式必须为 YYYY-MM-DD",
      data: { code: "VALIDATION_ERROR" },
    });
  const versions = await store.listVersions();
  const activeVersion = resolveActiveTalentAdviceVersion(versions);
  const month = effectiveAt.slice(0, 7);
  const duplicateVersion =
    versions.find((version) => version.versionNo === versionNo) ??
    versions.find((version) => String(version.effectiveAt).slice(0, 7) === month) ??
    versions.find(
      (version) => normalizeTalentAdviceDate(version.effectiveAt) === effectiveAt,
    ) ??
    null;
  const orderInvalid = Boolean(
    activeVersion &&
      effectiveAt <=
        String(normalizeTalentAdviceDate(activeVersion.effectiveAt) ?? ""),
  );
  if (input.throwOnConflict) {
    if (duplicateVersion) throw talentAdviceVersionExistsError(duplicateVersion);
    if (orderInvalid) throw talentAdviceVersionOrderError();
  }
  return {
    effectiveAt,
    versionNo,
    cycle: cycle.cycle,
    nextUpdateAt: cycle.nextUpdateAt,
    activeVersion,
    duplicateVersion,
    orderInvalid,
  };
}

/** 有效版本号格式（`^[A-Za-z0-9_.-]{1,40}$`，允许 `V2026.11`）。 */
export function isValidTalentAdviceVersionNo(value: string): boolean {
  return /^[A-Za-z0-9_.-]{1,40}$/.test(String(value ?? ""));
}

// ── 接收新一版：分类（preview / commit 共用） ────────────────────────────

interface TalentAdviceClassifiedCreated {
  action: "created";
  detail: TalentAdviceSyncDetail;
  candidate: TalentAdviceSyncCandidate;
  matched: TalentAdviceMatchResult;
  sections: TalentAdviceSection[];
  age: number;
  adviceNo: string;
  warnings: string[];
}

type TalentAdviceClassification =
  | TalentAdviceClassifiedCreated
  | { action: "empty"; detail: TalentAdviceSyncDetail }
  | { action: "failed"; detail: TalentAdviceSyncDetail; sourceFailure: boolean };

function talentAdviceDetail(
  candidate: TalentAdviceSyncCandidate,
  action: TalentAdviceSyncDetail["action"],
  options: {
    reason?: TalentAdviceSyncDetail["reason"];
    message?: string;
  } = {},
): TalentAdviceSyncDetail {
  return {
    reportNo: String(candidate.reportNo ?? ""),
    name: String(candidate.name ?? ""),
    maskedIdNo: String(candidate.maskedIdNo ?? ""),
    action,
    reason: options.reason ?? "",
    message: String(options.message ?? ""),
  };
}

function buildTalentAdviceSyncSubject(
  candidate: TalentAdviceSyncCandidate,
  age: number,
): TalentAdviceSyncSubject {
  return {
    geneReportId: candidate.geneReportId,
    reportNo: candidate.reportNo,
    subjectType: candidate.subjectType,
    subjectId: candidate.subjectId,
    parentId: candidate.parentId,
    name: candidate.name,
    gender: candidate.gender,
    birthday: candidate.birthday,
    age,
    maskedIdNo: candidate.maskedIdNo,
  };
}

async function classifyTalentAdviceCandidate(
  candidate: TalentAdviceSyncCandidate,
  effectiveAt: string,
  source: TalentAdviceSource,
): Promise<TalentAdviceClassification> {
  if (!candidate.report)
    return {
      action: "failed",
      sourceFailure: false,
      detail: talentAdviceDetail(candidate, "failed", {
        reason: "report_missing",
        message: "缺少对应报告行，已跳过该对象",
      }),
    };
  const age = calculateTalentAdviceAge(candidate.birthday, effectiveAt);
  if (age === undefined)
    return {
      action: "failed",
      sourceFailure: false,
      detail: talentAdviceDetail(candidate, "failed", {
        reason: "info_mismatch",
        message: "生日缺失或不合法，无法计算精确周岁",
      }),
    };
  const subject = buildTalentAdviceSyncSubject(candidate, age);
  let matched: TalentAdviceMatchResult;
  try {
    matched = await source.match(subject);
  } catch (error) {
    return {
      action: "failed",
      sourceFailure: true,
      detail: talentAdviceDetail(candidate, "failed", {
        reason: "source_error",
        message: sanitizeTalentAdviceSyncMessage(error, subject),
      }),
    };
  }
  if (!matched || typeof matched !== "object")
    return {
      action: "failed",
      sourceFailure: true,
      detail: talentAdviceDetail(candidate, "failed", {
        reason: "source_error",
        message: "外部建议源返回数据格式不合法",
      }),
    };
  if (matched.found !== true)
    return {
      action: "empty",
      detail: talentAdviceDetail(candidate, "empty", {
        reason: matched.reason === "info_mismatch" ? "info_mismatch" : "no_result",
      }),
    };
  const geneBooks = normalizeTalentAdviceBooks(candidate.geneReport.books);
  const validation = normalizeTalentAdviceSections(matched.sections, {
    books: geneBooks,
  });
  if (!validation.ok)
    return {
      action: "failed",
      sourceFailure: false,
      detail: talentAdviceDetail(candidate, "failed", {
        reason: validation.code,
        message: validation.message,
      }),
    };
  const externalBooks = normalizeTalentAdviceBooks(matched.books ?? "");
  const warnings: string[] = [];
  if (externalBooks.length > 0 && externalBooks.join("") !== geneBooks.join(""))
    warnings.push(
      `分册以基因报告为准：${candidate.name}（${candidate.reportNo}）`,
    );
  return {
    action: "created",
    detail: talentAdviceDetail(candidate, "created"),
    candidate,
    matched,
    sections: validation.sections,
    age,
    adviceNo: buildTalentAdviceNo(candidate.reportNo, effectiveAt),
    warnings,
  };
}

function truncateTalentAdviceDetails(
  details: readonly TalentAdviceSyncDetail[],
): { details: TalentAdviceSyncDetail[]; truncated: boolean } {
  const truncated = details.length > TALENT_ADVICE_SECTION_LIMITS.maxDetails;
  return {
    details: (
      truncated
        ? details.slice(0, TALENT_ADVICE_SECTION_LIMITS.maxDetails)
        : details
    ).map((detail) => ({ ...detail })),
    truncated,
  };
}

function summarizeTalentAdviceClassifications(
  classifications: readonly TalentAdviceClassification[],
): { createdCount: number; emptyCount: number; failedCount: number } {
  let createdCount = 0;
  let emptyCount = 0;
  let failedCount = 0;
  for (const classification of classifications) {
    if (classification.action === "created") createdCount += 1;
    else if (classification.action === "empty") emptyCount += 1;
    else failedCount += 1;
  }
  return { createdCount, emptyCount, failedCount };
}

function collectTalentAdviceWarnings(
  classifications: readonly TalentAdviceClassification[],
): string[] {
  const warnings: string[] = [];
  for (const classification of classifications) {
    if (classification.action === "created") {
      warnings.push(...classification.warnings);
    } else if (classification.action === "empty") {
      warnings.push(
        `外部暂无建议：${classification.detail.name}（${classification.detail.reportNo}）`,
      );
    }
  }
  return warnings.slice(0, TALENT_ADVICE_SECTION_LIMITS.maxWarnings);
}

// ── 预演：只读外部 + 内存分类，零写入 ────────────────────────────────────

export interface TalentAdviceVersionInput {
  effectiveAt: string;
  versionNo?: string;
  note?: string;
  operatorId?: string;
  operatorName?: string;
  now?: Date;
  /** 触发来源（写入同步日志；M8 定时/入站为 auto/webhook）。 */
  trigger?: "manual" | "auto" | "webhook";
}

export interface TalentAdvicePreviewOptions extends TalentAdviceVersionInput {
  source?: TalentAdviceSource;
  store?: TalentAdviceStore;
}

/**
 * 解析列表「当前查看版本」：
 * - 未传 `versionId` → 当前生效版（`isCurrent=true`）；
 * - 传历史版本 → 只读视图（`isCurrent=false`），不存在 → 404 `ADVICE_VERSION_NOT_FOUND`；
 * - 无任何版本 → null。
 * 「回到当前生效版」只是清空前端筛选，不改任何数据（spec §4.6）。
 */
export function resolveTalentAdviceViewingVersion(
  versions: readonly TalentAdviceVersionRecord[],
  versionId?: string | null,
): TalentAdviceViewingVersion | null {
  const targetId = String(versionId ?? "").trim();
  const active = resolveActiveTalentAdviceVersion(versions);
  if (!targetId) {
    if (!active) return null;
    return {
      versionId: active.id,
      versionName: active.versionNo,
      isCurrent: true,
    };
  }
  const target = versions.find((version) => version.id === targetId);
  if (!target) throw notFoundTalentAdviceVersion();
  return {
    versionId: target.id,
    versionName: target.versionNo,
    isCurrent: target.status === "active",
  };
}

/** 接收新一版预演：不写任何集合、不写日志；返回分类计数与逐人脱敏明细。 */
export async function previewTalentAdviceVersion(
  options: TalentAdvicePreviewOptions,
): Promise<TalentAdviceSyncPreview> {
  const store = options.store ?? createTalentAdviceStore();
  const source = options.source ?? createTalentAdviceSource();
  const now = options.now ?? new Date();
  const plan = await buildTalentAdviceVersionPlan(
    { effectiveAt: options.effectiveAt, versionNo: options.versionNo },
    store,
  );
  const candidates = await store.listCandidates();
  const classifications: TalentAdviceClassification[] = [];
  for (const candidate of candidates) {
    classifications.push(
      await classifyTalentAdviceCandidate(candidate, plan.effectiveAt, source),
    );
  }
  const counts = summarizeTalentAdviceClassifications(classifications);
  const { details, truncated } = truncateTalentAdviceDetails(
    classifications.map((classification) => classification.detail),
  );
  const warnings = collectTalentAdviceWarnings(classifications);
  if (plan.duplicateVersion)
    warnings.unshift("该版本已同步，请勿重复接收");
  if (plan.orderInvalid)
    warnings.unshift("生效日期必须晚于当前生效版本");
  return {
    mode: "preview",
    source: (source.name === "external" ? "external" : "mock") as TalentAdviceSourceKind,
    effectiveAt: plan.effectiveAt,
    versionNo: plan.versionNo,
    cycle: plan.cycle,
    nextUpdateAt: plan.nextUpdateAt,
    at: now.toISOString(),
    scanned: candidates.length,
    ...counts,
    details,
    truncated,
    warnings: warnings.slice(0, TALENT_ADVICE_SECTION_LIMITS.maxWarnings),
    duplicateVersionId: String(plan.duplicateVersion?.id ?? ""),
    duplicateVersionNo: String(plan.duplicateVersion?.versionNo ?? ""),
  };
}

// ── 接收新一版（commit）：占位 → 建议 → 归档 → 激活 / 补偿 ───────────────

export interface ReceiveTalentAdviceVersionOptions extends TalentAdviceVersionInput {
  source?: TalentAdviceSource;
  store?: TalentAdviceStore;
  /** 用于 API 层核对预演计数（实际不同则 `changedSincePreview=true`）。 */
  previewCounts?: {
    createdCount?: number;
    emptyCount?: number;
    failedCount?: number;
  };
}

function buildTalentAdviceVersionData(
  plan: TalentAdviceVersionPlan,
  source: TalentAdviceSource,
  note: string,
  operatorId: string,
  operatorName: string,
  syncedAt: string,
  status: "active" | "archived",
): TalentAdviceRecordData {
  return {
    versionNo: plan.versionNo,
    status,
    cycle: plan.cycle,
    effectiveAt: plan.effectiveAt,
    nextUpdateAt: plan.nextUpdateAt,
    syncedAt,
    source: source.name === "external" ? "external" : "mock",
    note: note.slice(0, TALENT_ADVICE_SECTION_LIMITS.maxNoteLength),
    operatorId,
    operatorName,
  };
}

function buildTalentAdviceDocData(
  created: TalentAdviceClassifiedCreated,
  plan: TalentAdviceVersionPlan,
  versionId: string,
  source: TalentAdviceSource,
  syncedAt: string,
): TalentAdviceRecordData {
  const candidate = created.candidate;
  const derived = buildTalentAdviceDerived(created.sections);
  return {
    adviceNo: created.adviceNo,
    geneReportId: candidate.geneReportId,
    reportId: String(candidate.report?.id ?? ""),
    reportNo: candidate.reportNo,
    subjectType: candidate.subjectType,
    subjectId: candidate.subjectId,
    parentId: candidate.parentId,
    name: candidate.name,
    maskedIdNo: candidate.maskedIdNo,
    idNoHash: candidate.idNoHash,
    gender: candidate.gender,
    birthday: candidate.birthday,
    age: created.age,
    matchKey: buildTalentAdviceMatchKey(candidate.name, created.age),
    versionId,
    versionName: plan.versionNo,
    publishStatus: "published",
    publishedAt: syncedAt,
    withdrawnAt: "",
    syncedAt,
    source: source.name === "external" ? "external" : "mock",
    books: normalizeTalentAdviceBooks(candidate.geneReport.books).join(""),
    sections: created.sections.map((section) => ({ ...section })),
    sectionCount: derived.sectionCount,
    bookCount: derived.bookCount,
    entropyCounts: derived.entropyCounts,
    firstFactorName: derived.firstFactorName,
  };
}

function countTalentAdviceCounts(
  value: ReceiveTalentAdviceVersionOptions["previewCounts"],
  actual: { createdCount: number; emptyCount: number; failedCount: number },
): boolean {
  if (!value) return false;
  return (
    Number(value.createdCount ?? 0) !== actual.createdCount ||
    Number(value.emptyCount ?? 0) !== actual.emptyCount ||
    Number(value.failedCount ?? 0) !== actual.failedCount
  );
}

async function runReceiveTalentAdviceVersion(
  options: ReceiveTalentAdviceVersionOptions,
): Promise<TalentAdviceReceiveResult> {
  const startedMs = Date.now();
  const store = options.store ?? createTalentAdviceStore();
  const source = options.source ?? createTalentAdviceSource();
  const now = options.now ?? new Date();
  const syncedAt = now.toISOString();
  const operatorId = String(options.operatorId ?? "");
  const operatorName = String(options.operatorName ?? "") || "系统同步";

  const plan = await buildTalentAdviceVersionPlan(
    {
      effectiveAt: options.effectiveAt,
      versionNo: options.versionNo,
      throwOnConflict: true,
    },
    store,
  );
  const candidates = await store.listCandidates();
  const classifications: TalentAdviceClassification[] = [];
  for (const candidate of candidates) {
    classifications.push(
      await classifyTalentAdviceCandidate(candidate, plan.effectiveAt, source),
    );
  }
  const counts = summarizeTalentAdviceClassifications(classifications);
  // 外部源整体不可用：全部候选均源异常且未写入任何对象 → 503（不写集合）。
  if (
    candidates.length > 0 &&
    counts.failedCount === candidates.length &&
    classifications.every(
      (classification) =>
        classification.action === "failed" && classification.sourceFailure,
    )
  )
    throw talentAdviceError(
      503,
      "ADVICE_SOURCE_UNAVAILABLE",
      "外部培育建议服务暂不可用",
    );
  if (counts.createdCount === 0)
    throw talentAdviceSyncFailedError(
      "本次接收未生成任何建议书，已取消，当前生效版本保持不变",
    );

  const createdList = classifications.filter(
    (classification): classification is TalentAdviceClassifiedCreated =>
      classification.action === "created",
  );
  const note =
    String(options.note ?? "").trim() ||
    `外部系统按姓名 + 具体年龄（周岁）重新匹配输出，覆盖 ${createdList.length} 份基因报告。`;

  let placeholder: TalentAdviceVersionRecord | null = null;
  let activated: TalentAdviceVersionRecord | null = null;
  let oldArchived = false;
  const createdDocIds: string[] = [];
  const details: TalentAdviceSyncDetail[] = classifications.map(
    (classification) => classification.detail,
  );
  let writeFailedCount = 0;
  try {
    placeholder = await store.createVersion(
      buildTalentAdviceVersionData(
        plan,
        source,
        note,
        operatorId,
        operatorName,
        syncedAt,
        "archived",
      ),
    );
    for (let index = 0; index < classifications.length; index += 1) {
      const classification = classifications[index]!;
      if (classification.action !== "created") continue;
      try {
        const record = await store.createDoc(
          buildTalentAdviceDocData(
            classification,
            plan,
            placeholder.id,
            source,
            syncedAt,
          ),
        );
        createdDocIds.push(record.id);
      } catch (error) {
        writeFailedCount += 1;
        details[index] = {
          ...classification.detail,
          action: "failed",
          reason: "duplicate",
          message: sanitizeTalentAdviceSyncMessage(
            error,
            buildTalentAdviceSyncSubject(classification.candidate, classification.age),
          ),
        };
      }
    }
    if (createdDocIds.length === 0)
      throw talentAdviceSyncFailedError(
        "本次接收未写入任何建议书，已回滚，当前生效版本保持不变",
      );
    if (plan.activeVersion) {
      await store.updateVersion(plan.activeVersion.id, { status: "archived" });
      oldArchived = true;
    }
    activated = await store.updateVersion(placeholder.id, { status: "active" });
  } catch (error) {
    for (const id of createdDocIds) {
      try {
        await store.deleteDoc(id);
      } catch {
        /* 补偿尽力而为，旧版仍保持生效。 */
      }
    }
    if (placeholder) {
      try {
        await store.deleteVersion(placeholder.id);
      } catch {
        /* 同上。 */
      }
    }
    if (oldArchived && plan.activeVersion) {
      try {
        await store.updateVersion(plan.activeVersion.id, { status: "active" });
      } catch {
        /* 同上。 */
      }
    }
    if (typeof (error as { statusCode?: number }).statusCode === "number")
      throw error;
    throw talentAdviceSyncFailedError();
  }

  const finalCounts = {
    createdCount: createdDocIds.length,
    emptyCount: counts.emptyCount,
    failedCount: counts.failedCount + writeFailedCount,
  };
  const finalStatus: TalentAdviceSyncLogInput["status"] =
    finalCounts.failedCount === 0
      ? "success"
      : finalCounts.createdCount > 0
        ? "partial"
        : "failed";
  const { details: truncatedDetails, truncated } =
    truncateTalentAdviceDetails(details);
  const durationMs = Math.max(0, Date.now() - startedMs);
  let syncLogId = "";
  try {
    syncLogId = await store.recordSyncLog({
      trigger: options.trigger ?? "manual",
      status: finalStatus,
      startedAt: syncedAt,
      finishedAt: new Date(startedMs + durationMs).toISOString(),
      durationMs,
      received: candidates.length,
      generated: finalCounts.createdCount,
      skipped: finalCounts.emptyCount,
      failedCount: finalCounts.failedCount,
      details: truncatedDetails,
      truncated,
      operatorId,
      message: `${plan.versionNo} 生效，新建 ${finalCounts.createdCount} 份，暂无 ${finalCounts.emptyCount} 人，失败 ${finalCounts.failedCount} 人${
        plan.activeVersion ? `；${plan.activeVersion.versionNo} 归档` : ""
      }`,
    });
  } catch {
    syncLogId = "";
  }
  const warnings = collectTalentAdviceWarnings(classifications);
  return {
    version: sanitizeTalentAdviceVersionRecord(activated!, {
      docCount: finalCounts.createdCount,
      publishedCount: finalCounts.createdCount,
      withdrawnCount: 0,
    }),
    docCount: finalCounts.createdCount,
    emptyCount: finalCounts.emptyCount,
    failedCount: finalCounts.failedCount,
    archivedVersionId: plan.activeVersion?.id ?? "",
    syncLogId,
    warnings,
    details: truncatedDetails,
    truncated,
    changedSincePreview: countTalentAdviceCounts(
      options.previewCounts,
      finalCounts,
    ),
  };
}

/**
 * 接收新一版（commit）：全局串行（`advice:version` 锁）→ 占位归档版本 → 建建议行 →
 * 旧 active 归档 → 新行激活；任一步失败删除本次写入并恢复旧 active，返回 500 且旧版保持生效。
 * 重复版本 / 顺序非法 → 409，重复接收不静默成功（spec §4.1/§4.3）。
 */
export async function receiveTalentAdviceVersion(
  options: ReceiveTalentAdviceVersionOptions,
): Promise<TalentAdviceReceiveResult> {
  return withTalentReportLock("advice:version", () =>
    runReceiveTalentAdviceVersion(options),
  );
}

// ── 发布 / 撤回（只看当前生效版本） ──────────────────────────────────────

export interface TalentAdviceStatusActionOptions {
  store?: TalentAdviceStore;
  now?: Date;
}

async function resolveTalentAdviceDocForWrite(
  docId: string,
  store: TalentAdviceStore,
): Promise<{
  doc: TalentAdviceDocRecord;
  version: TalentAdviceVersionRecord;
}> {
  const doc = await store.getDocById(docId);
  if (!doc) throw notFoundTalentAdviceDoc();
  const version = doc.versionId ? await store.getVersionById(doc.versionId) : null;
  if (!version) throw notFoundTalentAdviceVersion();
  if (version.status !== "active") throw talentAdviceVersionReadonlyError();
  return { doc, version };
}

async function computeTalentAdviceClientVisibleForDoc(
  doc: TalentAdviceDocRecord,
  activeVersionId: string,
  store: TalentAdviceStore,
): Promise<boolean> {
  const [report, parent] = await Promise.all([
    doc.reportId ? store.getReportById(doc.reportId) : Promise.resolve(null),
    doc.parentId ? store.getParentById(doc.parentId) : Promise.resolve(null),
  ]);
  const child =
    doc.subjectType === "child" && doc.subjectId
      ? await store.getChildById(doc.subjectId)
      : null;
  return isTalentAdviceClientVisible({
    doc,
    activeVersionId,
    report,
    parent,
    child,
  });
}

function buildTalentAdvicePublishResult(
  doc: TalentAdviceDocRecord,
  clientVisible: boolean,
  message: string,
): TalentAdvicePublishResult {
  return {
    id: doc.id,
    adviceNo: String(doc.adviceNo ?? ""),
    publishStatus:
      doc.publishStatus === "withdrawn" ? "withdrawn" : "published",
    publishStatusLabel:
      TALENT_ADVICE_PUBLISH_STATUS_LABELS[
        doc.publishStatus === "withdrawn" ? "withdrawn" : "published"
      ],
    publishedAt: String(doc.publishedAt ?? ""),
    withdrawnAt: String(doc.withdrawnAt ?? ""),
    clientVisible,
    message,
  };
}

/** 发布建议（仅当前生效版本；重复发布 409）。只改可见性，不改正文/分册/年龄。 */
export async function publishTalentAdviceDoc(
  docId: string,
  options: TalentAdviceStatusActionOptions = {},
): Promise<TalentAdvicePublishResult> {
  const store = options.store ?? createTalentAdviceStore();
  const now = options.now ?? new Date();
  return withTalentReportLock(`advice:doc:${String(docId)}`, async () => {
    const { doc, version } = await resolveTalentAdviceDocForWrite(docId, store);
    if (doc.publishStatus === "published")
      throw talentAdviceError(
        409,
        "ADVICE_ALREADY_PUBLISHED",
        "该建议已是已发布状态",
      );
    const updated = await store.updateDoc(doc.id, {
      publishStatus: "published",
      publishedAt: now.toISOString(),
      withdrawnAt: "",
    });
    const clientVisible = await computeTalentAdviceClientVisibleForDoc(
      updated,
      version.id,
      store,
    );
    return buildTalentAdvicePublishResult(
      updated,
      clientVisible,
      "已发布，家长端可见",
    );
  });
}

/** 撤回建议（仅当前生效版本；重复撤回 409）。`publishedAt` 保留、写 `withdrawnAt`。 */
export async function withdrawTalentAdviceDoc(
  docId: string,
  options: TalentAdviceStatusActionOptions = {},
): Promise<TalentAdvicePublishResult> {
  const store = options.store ?? createTalentAdviceStore();
  const now = options.now ?? new Date();
  return withTalentReportLock(`advice:doc:${String(docId)}`, async () => {
    const { doc } = await resolveTalentAdviceDocForWrite(docId, store);
    if (doc.publishStatus === "withdrawn")
      throw talentAdviceError(
        409,
        "ADVICE_ALREADY_WITHDRAWN",
        "该建议已是已撤回状态",
      );
    const updated = await store.updateDoc(doc.id, {
      publishStatus: "withdrawn",
      withdrawnAt: now.toISOString(),
    });
    return buildTalentAdvicePublishResult(
      updated,
      false,
      "已撤回，家长端不再展示",
    );
  });
}

// ── 读模型：版本历史 / 建议书详情 / 按人历史 / 报告页签 ──────────────────

/** 版本历史（按 effectiveAt 倒序；份数与发布统计读取时聚合）。 */
export async function listTalentAdviceVersions(
  store: TalentAdviceStore = createTalentAdviceStore(),
): Promise<TalentAdviceVersionHistory> {
  const versions = await store.listVersions();
  const rows: TalentAdviceVersionView[] = [];
  for (const version of versions) {
    const docs = await store.listDocsByVersion(version.id);
    rows.push(
      sanitizeTalentAdviceVersionRecord(
        version,
        computeTalentAdviceDocStats(docs),
      ),
    );
  }
  rows.sort((left, right) => right.effectiveAt.localeCompare(left.effectiveAt));
  return { rows, total: rows.length };
}

function buildTalentAdviceBookGroups(
  record: TalentAdviceDocRecord,
): TalentAdviceBookGroup[] {
  const sections = Array.isArray(record.sections) ? record.sections : [];
  const groups = new Map<TalentAdviceBookCode, TalentAdviceSection[]>();
  for (const section of sections) {
    const book = String(section?.book ?? "").toUpperCase() as TalentAdviceBookCode;
    if (!TALENT_ADVICE_BOOK_NAMES[book]) continue;
    const list = groups.get(book) ?? [];
    list.push(section);
    groups.set(book, list);
  }
  const order = new Map(
    TALENT_ADVICE_BOOK_CODES.map((code, index) => [code, index]),
  );
  return [...groups.entries()]
    .sort((left, right) => (order.get(left[0]) ?? 0) - (order.get(right[0]) ?? 0))
    .map(([book, items]) => {
      const entropyCounts: Record<string, number> = {};
      for (const item of items)
        entropyCounts[item.entropy] = (entropyCounts[item.entropy] ?? 0) + 1;
      return {
        book,
        bookName: TALENT_ADVICE_BOOK_NAMES[book],
        adviceNo: formatTalentAdviceBookAdviceNo(record.adviceNo, book),
        sectionCount: items.length,
        entropyCounts,
        entropyText: formatTalentAdviceEntropyText(entropyCounts),
        sections: items.map((item) => ({
          chapter: item.chapter,
          factor: item.factor,
          entropy: item.entropy,
          variant: item.variant,
          content: item.content,
          example: item.example,
          direction: item.direction,
          suggestion: item.suggestion,
        })),
      };
    });
}

/** 建议书详情（按分册分组四段；只读）。 */
export async function getTalentAdviceDocDetail(
  docId: string,
  store: TalentAdviceStore = createTalentAdviceStore(),
): Promise<TalentAdviceDocDetail> {
  const record = await store.getDocById(docId);
  if (!record) throw notFoundTalentAdviceDoc();
  const version = record.versionId
    ? await store.getVersionById(record.versionId)
    : null;
  if (!version) throw notFoundTalentAdviceVersion();
  const report = record.reportId
    ? await store.getReportById(record.reportId)
    : null;
  const parent = record.parentId
    ? await store.getParentById(record.parentId)
    : null;
  const child =
    record.subjectType === "child" && record.subjectId
      ? await store.getChildById(record.subjectId)
      : null;
  const visibility = resolveTalentAdviceClientVisibility({
    doc: record,
    activeVersionId: version.status === "active" ? version.id : "",
    report,
    parent,
    child,
  });
  const books = buildTalentAdviceBookGroups(record);
  return {
    id: record.id,
    adviceNo: String(record.adviceNo ?? ""),
    version: {
      id: version.id,
      versionNo: version.versionNo,
      status: version.status,
      statusLabel: TALENT_ADVICE_VERSION_STATUS_LABELS[version.status],
      cycle: version.cycle,
      effectiveAt: formatTalentAdviceDate(version.effectiveAt),
      nextUpdateAt: formatTalentAdviceDate(version.nextUpdateAt),
    },
    report: report
      ? {
          id: report.id,
          reportNo: String(report.reportNo ?? ""),
          status: String(report.status ?? ""),
          statusLabel:
            report.status === "published"
              ? "已发布"
              : report.status === "pending_publish"
                ? "待发布"
                : report.status === "retracted"
                  ? "已撤回"
                  : "异常",
        }
      : null,
    owner: {
      name: String(record.name ?? ""),
      gender: record.gender === "male" ? "male" : "female",
      genderLabel: formatTalentAdviceGenderLabel(record.gender),
      birthday: String(record.birthday ?? ""),
      age: Math.max(0, Math.trunc(Number(record.age) || 0)),
      ageLabel: formatTalentAdviceAgeLabel(Number(record.age) || 0),
      matchKey: String(record.matchKey ?? ""),
    },
    books,
    publishStatus:
      record.publishStatus === "withdrawn" ? "withdrawn" : "published",
    publishStatusLabel:
      TALENT_ADVICE_PUBLISH_STATUS_LABELS[
        record.publishStatus === "withdrawn" ? "withdrawn" : "published"
      ],
    publishedAt: String(record.publishedAt ?? ""),
    withdrawnAt: String(record.withdrawnAt ?? ""),
    syncedAt: String(record.syncedAt ?? ""),
    source: record.source === "external" ? "external" : "mock",
    booksCovered: normalizeTalentAdviceBooks(record.books).join(""),
    bookCount: books.length,
    clientVisible: visibility.visible,
    clientVisibleText: visibility.text,
    versionReadonly: version.status !== "active",
  };
}

/** 按人历史版本（同一 reportNo 跨版本快照，按 effectiveAt 倒序）。 */
export async function listTalentAdvicePersonHistory(
  docId: string,
  store: TalentAdviceStore = createTalentAdviceStore(),
): Promise<TalentAdvicePersonHistory> {
  const anchor = await store.getDocById(docId);
  if (!anchor) throw notFoundTalentAdviceDoc();
  const docs = await store.listDocsByReportNo(anchor.reportNo);
  const activeVersion = await getActiveTalentAdviceVersion(store);
  const versions = await store.listVersions();
  const versionById = new Map(versions.map((version) => [version.id, version]));
  const items: TalentAdvicePersonHistoryItem[] = docs.map((doc) => {
    const version = versionById.get(String(doc.versionId ?? "")) ?? null;
    return {
      id: doc.id,
      adviceNo: String(doc.adviceNo ?? ""),
      versionId: String(doc.versionId ?? ""),
      versionNo: version?.versionNo ?? String(doc.versionName ?? ""),
      versionStatus: version?.status ?? "archived",
      cycle: String(version?.cycle ?? ""),
      effectiveAt: formatTalentAdviceDate(version?.effectiveAt),
      matchKey: String(doc.matchKey ?? ""),
      age: Math.max(0, Math.trunc(Number(doc.age) || 0)),
      entropyText: formatTalentAdviceEntropyText(doc.entropyCounts),
      publishStatus:
        doc.publishStatus === "withdrawn" ? "withdrawn" : "published",
      publishStatusLabel:
        TALENT_ADVICE_PUBLISH_STATUS_LABELS[
          doc.publishStatus === "withdrawn" ? "withdrawn" : "published"
        ],
      syncedAt: String(doc.syncedAt ?? ""),
      isCurrent: Boolean(activeVersion && doc.versionId === activeVersion.id),
    };
  });
  items.sort((left, right) => right.effectiveAt.localeCompare(left.effectiveAt));
  return {
    reportNo: String(anchor.reportNo ?? ""),
    name: String(anchor.name ?? ""),
    maskedIdNo: String(anchor.maskedIdNo ?? ""),
    items,
  };
}

/** M3 报告详情第 4 页签挂载数据：当前生效版建议覆盖册与状态（不返回 sections 全量）。 */
export async function listTalentAdviceForSubject(
  subjectType: "child" | "self",
  subjectId: string,
  store: TalentAdviceStore = createTalentAdviceStore(),
): Promise<TalentAdviceSubjectAdvice> {
  const activeVersion = await getActiveTalentAdviceVersion(store);
  if (!activeVersion)
    return {
      available: false,
      version: null,
      reportReadable: false,
      clientVisible: false,
      docs: [],
    };
  const subjectDocs = await store.listDocsBySubject(subjectType, subjectId);
  const docs = subjectDocs.filter(
    (doc) => String(doc.versionId ?? "") === activeVersion.id,
  );
  const reportIds = [...new Set(docs.map((doc) => String(doc.reportId ?? "")))];
  let reportReadable = false;
  for (const reportId of reportIds) {
    if (!reportId) continue;
    const report = await store.getReportById(reportId);
    if (report?.status === "published") {
      reportReadable = true;
      break;
    }
  }
  const parentIds = [...new Set(docs.map((doc) => String(doc.parentId ?? "")))];
  const parent = parentIds[0] ? await store.getParentById(parentIds[0]) : null;
  const child =
    subjectType === "child" && subjectId
      ? await store.getChildById(subjectId)
      : null;
  return {
    available: docs.length > 0,
    version: {
      id: activeVersion.id,
      versionNo: activeVersion.versionNo,
      cycle: activeVersion.cycle,
      effectiveAt: formatTalentAdviceDate(activeVersion.effectiveAt),
      nextUpdateAt: formatTalentAdviceDate(activeVersion.nextUpdateAt),
    },
    reportReadable,
    clientVisible:
      reportReadable &&
      Boolean(child ? String(child.status) === "1" : true) &&
      Boolean(parent ? String(parent.status) === "1" : true),
    docs: docs.map((doc) => ({
      id: doc.id,
      adviceNo: String(doc.adviceNo ?? ""),
      versionName: String(doc.versionName ?? ""),
      publishStatus:
        doc.publishStatus === "withdrawn" ? "withdrawn" : "published",
      publishStatusLabel:
        TALENT_ADVICE_PUBLISH_STATUS_LABELS[
          doc.publishStatus === "withdrawn" ? "withdrawn" : "published"
        ],
      books: normalizeTalentAdviceBooks(doc.books).join(""),
      bookCount: Number(
        doc.bookCount ?? normalizeTalentAdviceBooks(doc.books).length,
      ),
      sectionCount: Number(doc.sectionCount ?? 0),
      entropyCounts: doc.entropyCounts ?? {},
      clientVisible:
        doc.publishStatus === "published" &&
        reportReadable &&
        Boolean(child ? String(child.status) === "1" : true) &&
        Boolean(parent ? String(parent.status) === "1" : true),
    })),
  };
}

// ── C 端只读契约：归属/报告门禁 + 派生的家长端快照（spec §7） ────────────

/**
 * C 端可读断言：只按登录账号解析家长（不接受前端 parentId），报告归属必须一致；
 * 报告未发布 / 已撤回 → 409（复用 M3 §7.1 同码同文案）；非本人/未绑定/已解绑 → 404。
 */
export async function assertTalentAdviceReadable(
  userId: string,
  reportId: string,
  store: TalentAdviceStore = createTalentAdviceStore(),
): Promise<TalentAdviceReadableContext> {
  const notFound = () =>
    createError({
      statusCode: 404,
      message: "报告不存在",
      data: { code: "NOT_FOUND" },
    });
  const report = await store.getReportById(reportId);
  if (!report) throw notFound();
  const parent = await store.getParentByUserId(userId);
  if (!parent || String(parent.status) !== "1") throw notFound();
  if (String(report.parentId ?? "") !== parent.id) throw notFound();
  let child: TalentChildRecord | null = null;
  if (report.subjectType === "child") {
    child = await store.getChildById(String(report.subjectId ?? ""));
    if (!child || String(child.status) !== "1" || child.parentId !== parent.id)
      throw notFound();
  }
  if (report.status === "pending_publish")
    throw createError({
      statusCode: 409,
      message: "报告正在整理中",
      data: { code: "report_pending", state: "pending_publish" },
    });
  if (report.status === "retracted")
    throw createError({
      statusCode: 409,
      message: "报告内容更新中",
      data: { code: "report_retracted", state: "retracted" },
    });
  if (report.status !== "published") throw notFound();
  return { report, parent, child };
}

/** 报告冻结快照中该册是否已出（复用 M3「有要素或有章节」口径）。 */
function reportBookDetected(
  report: TalentReportRecord,
  book: TalentAdviceBookCode,
): boolean {
  const volumeId = getTalentReportVolumeDefinitionByBook(book)?.volumeId;
  if (!volumeId) return false;
  const snapshotVolume = Array.isArray(report.volumeSnapshot)
    ? report.volumeSnapshot.find((volume) => String(volume.volumeId) === volumeId)
    : undefined;
  if (
    snapshotVolume &&
    (Number(snapshotVolume.factorCount ?? 0) > 0 ||
      (Array.isArray(snapshotVolume.chapters) && snapshotVolume.chapters.length > 0))
  )
    return true;
  return (report.factorSnapshot ?? []).some(
    (factor) => String(factor.volumeId) === volumeId,
  );
}

/**
 * 由建议记录与版本构建 C 端快照：固定返回 A–F 六册，与报告开放册一一对应。
 * 有正文 → available；报告已开放但建议未同步 → pending；报告未开放 → not_published；
 * 外部基因报告本次未出册 → not_detected。同一要素只取最小 variant。
 */
export function buildTalentAdviceClientSnapshot(
  record: TalentAdviceDocRecord,
  version: TalentAdviceVersionRecord,
  options: { report?: TalentReportRecord | null } = {},
): TalentAdviceClientSnapshot {
  const sections = Array.isArray(record.sections) ? record.sections : [];
  const grouped = new Map<TalentAdviceBookCode, TalentAdviceSection[]>();
  for (const section of sections) {
    const book = String(section?.book ?? "").toUpperCase() as TalentAdviceBookCode;
    if (!TALENT_ADVICE_BOOK_NAMES[book]) continue;
    const list = grouped.get(book) ?? [];
    list.push(section);
    grouped.set(book, list);
  }
  const detectedBooks = new Set<TalentAdviceBookCode>([
    ...normalizeTalentAdviceBooks(record.books),
    ...(options.report
      ? TALENT_ADVICE_BOOK_CODES.filter((book) =>
        reportBookDetected(options.report as TalentReportRecord, book),
      )
      : []),
  ]);
  const publishedBooks = new Set<TalentAdviceBookCode>(
    options.report && options.report.openVolumeIds !== undefined
      ? resolveTalentReportOpenBookCodes(options.report.openVolumeIds)
      : [...detectedBooks],
  );
  const books: TalentAdviceClientBook[] = TALENT_ADVICE_BOOK_CODES.map((book) => {
    const items = grouped.get(book) ?? [];
    let state: TalentAdviceClientBookState = "not_detected";
    if (detectedBooks.has(book)) {
      if (!publishedBooks.has(book)) state = "not_published";
      else if (items.length === 0) state = "pending";
      else state = "available";
    }
    const seen = new Map<string, TalentAdviceSection>();
    for (const item of items) {
      const key = `${item.chapter}｜${item.factor}｜${item.entropy}`;
      const existing = seen.get(key);
      if (!existing || item.variant < existing.variant) seen.set(key, item);
    }
    const visible = state === "available" ? [...seen.values()] : [];
    const entropyCounts: Record<string, number> = {};
    for (const item of visible)
      entropyCounts[item.entropy] = (entropyCounts[item.entropy] ?? 0) + 1;
    return {
      book,
      bookName: TALENT_ADVICE_BOOK_NAMES[book],
      state,
      adviceNo: formatTalentAdviceBookAdviceNo(record.adviceNo, book),
      sectionCount: visible.length,
      total: state === "available" ? items.length : 0,
      entropyList: TALENT_ADVICE_ENTROPY_LEVELS.filter(
        (level) => (entropyCounts[level] ?? 0) > 0,
      ).map((level) => ({ level, count: entropyCounts[level] ?? 0 })),
      sections: visible.map((item) => ({
        chapter: item.chapter,
        factor: item.factor,
        entropy: item.entropy,
        content: item.content,
        example: item.example,
        direction: item.direction,
        suggestion: item.suggestion,
      })),
    };
  });
  return {
    available: true,
    version: {
      versionNo: version.versionNo,
      cycle: version.cycle,
      effectiveAt: formatTalentAdviceDate(version.effectiveAt),
      nextUpdateAt: formatTalentAdviceDate(version.nextUpdateAt),
      cycleMonths: TALENT_ADVICE_CYCLE_MONTHS,
    },
    owner: {
      name: String(record.name ?? ""),
      gender: record.gender === "male" ? "male" : "female",
      genderLabel: formatTalentAdviceGenderLabel(record.gender),
      age: Math.max(0, Math.trunc(Number(record.age) || 0)),
      ageLabel: formatTalentAdviceAgeLabel(Number(record.age) || 0),
    },
    books,
    emptyText: TALENT_ADVICE_CLIENT_EMPTY_TEXT,
  };
}

/**
 * C 端家长端建议快照：报告可读 + 当前生效版本 + 已发布建议，才返回内容；
 * 否则返回 `{ available:false, emptyText:"暂未收到培育建议" }`（不提示撤回原因）。
 */
export async function getTalentAdviceClientSnapshot(
  userId: string,
  reportId: string,
  store: TalentAdviceStore = createTalentAdviceStore(),
): Promise<TalentAdviceClientSnapshot> {
  const context = await assertTalentAdviceReadable(userId, reportId, store);
  const activeVersion = await getActiveTalentAdviceVersion(store);
  if (!activeVersion)
    return {
      available: false,
      emptyText: TALENT_ADVICE_CLIENT_EMPTY_TEXT,
    };
  const docs = await store.listDocsBySubject(
    String(context.report.subjectType ?? "child"),
    String(context.report.subjectId ?? ""),
  );
  const record =
    docs.find(
      (doc) =>
        String(doc.reportId ?? "") === context.report.id &&
        String(doc.versionId ?? "") === activeVersion.id &&
        doc.publishStatus === "published",
    ) ?? null;
  if (!record)
    return {
      available: false,
      emptyText: TALENT_ADVICE_CLIENT_EMPTY_TEXT,
    };
  if (
    !isTalentAdviceClientVisible({
      doc: record,
      activeVersionId: activeVersion.id,
      report: context.report,
      parent: context.parent,
      child: context.child,
    })
  )
    return {
      available: false,
      emptyText: TALENT_ADVICE_CLIENT_EMPTY_TEXT,
    };
  return buildTalentAdviceClientSnapshot(record, activeVersion, {
    report: context.report,
  });
}

/** 单条明细原因文案（页面/导出/日志共用）。 */
export function formatTalentAdviceSyncReason(
  reason: TalentAdviceSyncDetail["reason"],
): string {
  if (!reason) return "";
  return TALENT_ADVICE_SYNC_REASON_LABELS[reason] ?? "";
}