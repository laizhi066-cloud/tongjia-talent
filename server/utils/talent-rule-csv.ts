/**
 * @description M1 规则域 CSV：固定注解 / 分级的模板、预览解析、行校验与导出。
 *   复用 `server/utils/talent-csv.ts` 的 BOM 容忍、引号转义、表头别名与 10MB 上限约定；
 *   预览不落库，失败明细随响应返回（ADR 0001-D4）。
 * @file server/utils/talent-rule-csv.ts
 */
import { createError } from "h3";
import type { TalentStatus } from "~~/shared/types/talent";
import type {
  TalentFactorNote,
  TalentLevelTone,
  TalentNoteGender,
} from "~~/shared/types/talent-rule";

/** 规则域导入文件上限与会员导入一致：10MB。 */
export const TALENT_RULE_IMPORT_MAX_BYTES = 10 * 1024 * 1024;

export function assertTalentRuleImportFileSize(data: Uint8Array): void {
  if (data.byteLength > TALENT_RULE_IMPORT_MAX_BYTES)
    throw createError({ statusCode: 413, message: "导入文件不能超过 10MB" });
}

/** 模板 / 导出列（固定注解 6 列）。 */
export const TALENT_FACTOR_NOTE_CSV_COLUMNS = [
  "注解编号",
  "要素编码",
  "分级编码",
  "注解正文",
  "年龄条件",
  "性别条件",
  "启用状态",
] as const;

/** 模板 / 导出列（分级 6 列）。 */
export const TALENT_LEVEL_CSV_COLUMNS = [
  "分级编码",
  "分级名称",
  "级序",
  "得分范围",
  "展示色位",
  "启用状态",
] as const;

const NOTE_HEADER_ALIASES: Record<string, string> = {
  code: "code",
  注解编号: "code",
  factorCode: "factorCode",
  要素编码: "factorCode",
  潜质要素编码: "factorCode",
  levelCode: "levelCode",
  分级编码: "levelCode",
  分级: "levelCode",
  note: "note",
  注解正文: "note",
  注解内容: "note",
  ageRange: "ageRange",
  年龄条件: "ageRange",
  年龄: "ageRange",
  gender: "gender",
  性别条件: "gender",
  性别: "gender",
  status: "status",
  启用状态: "status",
  状态: "status",
};

const LEVEL_HEADER_ALIASES: Record<string, string> = {
  code: "code",
  分级编码: "code",
  name: "name",
  分级名称: "name",
  sortOrder: "sortOrder",
  级序: "sortOrder",
  顺序: "sortOrder",
  range: "range",
  得分范围: "range",
  tone: "tone",
  展示色位: "tone",
  色位: "tone",
  status: "status",
  启用状态: "status",
  状态: "status",
};

export interface TalentRuleCsvRawRow {
  rowNumber: number;
  values: Record<string, string>;
}

/**
 * 解析 CSV 为「行号 + 表头字段映射」结构。
 * 表头兼容中文模板与系统字段名；BOM、引号、字段内逗号均按会员导入同一规则处理。
 */
export function parseTalentRuleCsv(
  csv: string,
  aliases: Record<string, string>,
  requiredColumns: readonly string[],
  kindLabel: string,
): TalentRuleCsvRawRow[] {
  const lines = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());
  if (lines.length < 2)
    throw createError({ statusCode: 422, message: `${kindLabel} CSV 至少需要表头和一行数据` });
  const parseLine = (line: string): string[] => {
    const values: string[] = [];
    let value = "";
    let quoted = false;
    for (let index = 0; index < line.length; index++) {
      const char = line[index];
      if (char === '"' && line[index + 1] === '"') {
        value += '"';
        index++;
        continue;
      }
      if (char === '"') {
        quoted = !quoted;
        continue;
      }
      if (char === "," && !quoted) {
        values.push(value.trim());
        value = "";
        continue;
      }
      value += char;
    }
    values.push(value.trim());
    return values;
  };
  const headers = parseLine(lines[0] || "").map((header) => aliases[header] || header);
  if (headers.some((header) => !header))
    throw createError({ statusCode: 422, message: `${kindLabel} CSV 表头不能为空` });
  if (new Set(headers).size !== headers.length)
    throw createError({ statusCode: 422, message: `${kindLabel} CSV 表头不能重复` });
  const missing = requiredColumns.filter((column) => !headers.includes(column));
  if (missing.length)
    throw createError({
      statusCode: 422,
      message: `${kindLabel} CSV 缺少必填列：${missing.join("、")}`,
    });
  return lines.slice(1).map((line, index) => {
    const values = parseLine(line);
    return {
      rowNumber: index + 2,
      values: Object.fromEntries(
        headers.map((header, columnIndex) => [header, values[columnIndex] || ""]),
      ),
    };
  });
}

function normalizeTalentCsvStatus(value: string): TalentStatus | null {
  const normalized = String(value || "").trim();
  if (!normalized) return "1";
  if (normalized === "1" || normalized === "启用") return "1";
  if (normalized === "0" || normalized === "停用") return "0";
  return null;
}

function normalizeTalentNoteGender(value: string): TalentNoteGender | null {
  const normalized = String(value || "").trim();
  if (!normalized || normalized === "通用") return "通用";
  if (normalized === "男" || normalized === "male") return "男";
  if (normalized === "女" || normalized === "female") return "女";
  return null;
}

const TALENT_LEVEL_TONE_VALUES: readonly TalentLevelTone[] = [
  "default",
  "info",
  "success",
  "warning",
];

function normalizeTalentLevelTone(value: string): TalentLevelTone | null {
  const normalized = String(value || "").trim();
  if (!normalized) return "default";
  return TALENT_LEVEL_TONE_VALUES.includes(normalized as TalentLevelTone)
    ? (normalized as TalentLevelTone)
    : null;
}

export interface TalentFactorNoteCsvRow {
  rowNumber: number;
  code: string;
  factorCode: string;
  levelCode: string;
  note: string;
  ageRange: string;
  gender: TalentNoteGender;
  status: TalentStatus;
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export interface TalentLevelCsvRow {
  rowNumber: number;
  code: string;
  name: string;
  sortOrder: number;
  range: string;
  tone: TalentLevelTone;
  status: TalentStatus;
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export interface TalentRuleCsvPreview<T> {
  total: number;
  passed: number;
  failed: number;
  rows: T[];
}

export interface TalentFactorNoteCsvContext {
  /** 启用分库中的要素编码 → 分册编码；未同步时为 null。 */
  factorCategories?: Map<string, string> | null;
  enabledLevelCodes?: ReadonlySet<string>;
  /** 已存在的注解编号，用于提示覆盖。 */
  existingNoteCodes?: ReadonlySet<string>;
}

/**
 * 解析固定注解导入文件并做预览校验（不落库）。
 * 同一文件内重复「要素编码 + 分级编码」时，后行覆盖前行，并在预览中标注。
 */
export function parseTalentFactorNoteCsv(
  csv: string,
  context: TalentFactorNoteCsvContext = {},
): TalentRuleCsvPreview<TalentFactorNoteCsvRow> {
  const rawRows = parseTalentRuleCsv(
    csv,
    NOTE_HEADER_ALIASES,
    ["factorCode", "levelCode"],
    "固定注解",
  );
  const rows = rawRows.map(({ rowNumber, values }): TalentFactorNoteCsvRow => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const factorCode = String(values.factorCode || "").trim();
    const levelCode = String(values.levelCode || "").trim();
    const note = String(values.note || "");
    if (!factorCode) errors.push("要素编码不能为空");
    else if (context.factorCategories && !context.factorCategories.has(factorCode))
      errors.push(`要素编码不存在或文库未同步：${factorCode}`);
    if (!levelCode) errors.push("分级编码不能为空");
    else if (!/^LV\d{1,2}$/.test(levelCode)) errors.push("分级编码格式必须为 LVn");
    else if (context.enabledLevelCodes && !context.enabledLevelCodes.has(levelCode))
      errors.push(`分级不存在或已停用：${levelCode}`);
    if (!note.trim()) errors.push("注解正文不能为空");
    else if (note.length > 2000) errors.push("注解正文不能超过 2000 字符");
    const ageRange = String(values.ageRange || "").trim();
    if (ageRange.length > 50) errors.push("年龄条件不能超过 50 字符");
    const gender = normalizeTalentNoteGender(values.gender || "");
    if (!gender) errors.push(`性别条件只能是 男 / 女 / 通用：${values.gender}`);
    const status = normalizeTalentCsvStatus(values.status || "");
    if (!status) errors.push(`启用状态只能是 1 / 0 / 启用 / 停用：${values.status}`);
    const code = factorCode && levelCode ? `${factorCode}-${levelCode}` : "";
    if (values.code && code && values.code !== code)
      warnings.push(`注解编号由要素编码+分级编码生成，已忽略文件值：${values.code}`);
    if (code && context.existingNoteCodes?.has(code))
      warnings.push("已存在同编号注解，导入将覆盖正文 / 条件 / 状态");
    return {
      rowNumber,
      code,
      factorCode,
      levelCode,
      note,
      ageRange,
      gender: gender || "通用",
      status: status || "1",
      ok: errors.length === 0,
      errors,
      warnings,
    };
  });
  markDuplicateTalentFactorNoteRows(rows);
  return buildTalentRuleCsvPreview(rows);
}

/** 同文件重复 code：前行标注「被后行覆盖」，写入时顺序 upsert 自然以后行为准。 */
function markDuplicateTalentFactorNoteRows(rows: TalentFactorNoteCsvRow[]): void {
  const firstRowByCode = new Map<string, TalentFactorNoteCsvRow>();
  for (const row of rows) {
    if (!row.code) continue;
    const first = firstRowByCode.get(row.code);
    if (first) first.warnings.push(`同文件重复：第 ${row.rowNumber} 行将覆盖本行`);
    else firstRowByCode.set(row.code, row);
  }
}

/** 解析分级导入文件并做预览校验（不落库）。 */
export function parseTalentLevelCsv(
  csv: string,
  context: { existingLevelCodes?: ReadonlySet<string> } = {},
): TalentRuleCsvPreview<TalentLevelCsvRow> {
  const rawRows = parseTalentRuleCsv(
    csv,
    LEVEL_HEADER_ALIASES,
    ["code", "name", "sortOrder"],
    "分级",
  );
  const rows = rawRows.map(({ rowNumber, values }): TalentLevelCsvRow => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const code = String(values.code || "").trim();
    if (!code) errors.push("分级编码不能为空");
    else if (!/^LV\d{1,2}$/.test(code)) errors.push("分级编码格式必须为 LVn");
    const name = String(values.name || "").trim();
    if (!name) errors.push("分级名称不能为空");
    else if (name.length > 20) errors.push("分级名称不能超过 20 字符");
    const sortOrderRaw = String(values.sortOrder || "").trim();
    const sortOrder = Number(sortOrderRaw);
    if (!sortOrderRaw) errors.push("级序不能为空");
    else if (!Number.isInteger(sortOrder) || sortOrder < 1 || sortOrder > 4)
      errors.push("级序必须是 1–4 的整数");
    const range = String(values.range || "").trim();
    if (range.length > 20) errors.push("得分范围不能超过 20 字符");
    const tone = normalizeTalentLevelTone(values.tone || "");
    if (!tone)
      errors.push(
        `展示色位只能是 ${TALENT_LEVEL_TONE_VALUES.join(" / ")}：${values.tone}`,
      );
    const status = normalizeTalentCsvStatus(values.status || "");
    if (!status) errors.push(`启用状态只能是 1 / 0 / 启用 / 停用：${values.status}`);
    if (code && context.existingLevelCodes?.has(code))
      warnings.push("已存在同编码分级，导入将更新名称 / 级序 / 范围 / 色位 / 状态");
    return {
      rowNumber,
      code,
      name,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      range,
      tone: tone || "default",
      status: status || "1",
      ok: errors.length === 0,
      errors,
      warnings,
    };
  });
  const firstRowByCode = new Map<string, TalentLevelCsvRow>();
  for (const row of rows) {
    if (!row.code) continue;
    const first = firstRowByCode.get(row.code);
    if (first) first.warnings.push(`同文件重复：第 ${row.rowNumber} 行将覆盖本行`);
    else firstRowByCode.set(row.code, row);
  }
  return buildTalentRuleCsvPreview(rows);
}

function buildTalentRuleCsvPreview<T extends { ok: boolean }>(
  rows: T[],
): TalentRuleCsvPreview<T> {
  const passed = rows.filter((row) => row.ok).length;
  return { total: rows.length, passed, failed: rows.length - passed, rows };
}

/** 固定注解预览行 → 落库字段（category 由服务端按要素当前值派生）。 */
export function buildTalentFactorNoteImportRecord(
  row: TalentFactorNoteCsvRow,
  category: string,
): Omit<TalentFactorNote, "id" | "created" | "updated"> {
  return {
    code: row.code,
    factorCode: row.factorCode,
    category,
    levelCode: row.levelCode,
    note: row.note,
    ageRange: row.ageRange,
    gender: row.gender,
    status: row.status,
  };
}

/** 分级预览行 → 落库字段；新行镜像旧字段以兼容旧唯一索引（ADR 0001-D1）。 */
export function buildTalentLevelImportRecord(
  row: TalentLevelCsvRow,
): Pick<
  TalentLevelRowWrite,
  "code" | "name" | "sortOrder" | "range" | "tone" | "status" | "levelCode" | "levelName"
> {
  return {
    code: row.code,
    name: row.name,
    sortOrder: row.sortOrder,
    range: row.range,
    tone: row.tone,
    status: row.status,
    levelCode: row.code,
    levelName: row.name,
  };
}

interface TalentLevelRowWrite {
  code: string;
  name: string;
  sortOrder: number;
  range: string;
  tone: TalentLevelTone;
  status: TalentStatus;
  levelCode: string;
  levelName: string;
}

function escapeTalentRuleCsvCell(value: unknown): string {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildTalentRuleCsv(
  columns: readonly string[],
  rows: ReadonlyArray<ReadonlyArray<unknown>>,
): string {
  const lines = [columns.join(",")];
  for (const row of rows)
    lines.push(row.map(escapeTalentRuleCsvCell).join(","));
  // 带 BOM，Excel 打开中文不乱码。
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

/** 固定注解模板：仅表头 + 1 行示例（不提供要素 / 文库导入）。 */
export function buildTalentFactorNoteCsvTemplate(): string {
  return buildTalentFactorNoteCsv([
    {
      rowNumber: 0,
      code: "A-01-LV1",
      factorCode: "A-01",
      levelCode: "LV1",
      note: "示例：填写该要素该分级的固定注解正文",
      ageRange: "0 岁",
      gender: "通用",
      status: "1",
      ok: true,
      errors: [],
      warnings: [],
    },
  ]);
}

/** 分级模板：仅表头 + 1 行示例。 */
export function buildTalentLevelCsvTemplate(): string {
  return buildTalentLevelCsv([
    {
      rowNumber: 0,
      code: "LV1",
      name: "常态",
      sortOrder: 1,
      range: "0–59",
      tone: "default",
      status: "1",
      ok: true,
      errors: [],
      warnings: [],
    },
  ]);
}

/** 按当前筛选导出固定注解 CSV（行 = 注解；要素 / 分级名称取当前值，编号沿用 code）。 */
export function buildTalentFactorNoteCsv(
  rows: ReadonlyArray<TalentFactorNoteCsvRow>,
): string {
  return buildTalentRuleCsv(
    [...TALENT_FACTOR_NOTE_CSV_COLUMNS],
    rows.map((row) => [
      row.code,
      row.factorCode,
      row.levelCode,
      row.note,
      row.ageRange,
      row.gender,
      row.status,
    ]),
  );
}

/** 按当前筛选导出分级 CSV。 */
export function buildTalentLevelCsv(rows: ReadonlyArray<TalentLevelCsvRow>): string {
  return buildTalentRuleCsv(
    [...TALENT_LEVEL_CSV_COLUMNS],
    rows.map((row) => [
      row.code,
      row.name,
      row.sortOrder,
      row.range,
      row.tone,
      row.status,
    ]),
  );
}