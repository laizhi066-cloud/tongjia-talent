/**
 * @description M1 规则域 API 支撑：分页默认值、编码字典查询、名称解析与导入导出 CSV 构建。
 *   仅服务端路由复用；领域规则（校验 / 唯一 / 引用保护 / 版本）统一在 `talent-rule.ts`，
 *   本文件不复制也不改写这些规则。导出 / 模板统一带 BOM，导入请求统一 10MB 上限（ADR 0001-D4）。
 * @file server/utils/talent-rule-api.ts
 */
import {
  createError,
  getHeader,
  readMultipartFormData,
  setHeader,
  type H3Event,
} from "h3";
import type PocketBase from "pocketbase";
import { z } from "zod";
import type {
  TalentFactor,
  TalentFactorLibrary,
  TalentFactorNote,
  TalentLevel,
  TalentLevelTone,
  TalentNoteGender,
  TalentTier,
} from "~~/shared/types/talent-rule";
import { encodeTalentCsv, type TalentCsvValue } from "~~/server/utils/talent-csv-format";
import { escapeFilterValue } from "~~/server/utils/pocketbase-client";
import {
  buildTalentFactorNameLookup,
  buildTalentLevelNameLookup,
  getNewTalentLevels,
  pickLatestSyncedTalentLibrary,
} from "~~/server/utils/talent-rule";
import { assertTalentRuleImportFileSize } from "~~/server/utils/talent-rule-csv";
import { validateBody } from "~~/server/utils/validation";

/** 规则域列表默认每页 20 条（spec §5.1）；上限由 `paginatedQuery` 统一压到 100。 */
export const TALENT_RULE_DEFAULT_PAGE_SIZE = 20;
export const TALENT_RULE_MAX_PAGE_SIZE = 100;

/** 补默认 pageSize，避免沿用旧资源 10 条的分页口径。 */
export function withTalentRulePagination<T extends Record<string, any>>(
  query: T,
): T & { pageSize: string } {
  const raw = Number(query.pageSize);
  const pageSize =
    Number.isFinite(raw) && raw > 0
      ? Math.min(TALENT_RULE_MAX_PAGE_SIZE, Math.floor(raw))
      : TALENT_RULE_DEFAULT_PAGE_SIZE;
  return { ...query, pageSize: String(pageSize) };
}

/** 分库性别展示文案（存储 male / female，列表与导出展示 男 / 女）。 */
export function talentLibraryGenderLabel(gender: string): string {
  return gender === "female" ? "女" : "男";
}

/** 规则域名称解析上下文：一次查询供列表 / 详情复用，避免逐行查库（ADR 0001-D3）。 */
export interface TalentRuleLookups {
  /** 启用中且 syncedAt 最近的分库；没有可用分库时为 null。 */
  library: TalentFactorLibrary | null;
  factors: TalentFactor[];
  factorNames: Map<string, string>;
  levels: TalentLevel[];
  levelNames: Map<string, string>;
  levelByCode: Map<string, TalentLevel>;
  tiers: TalentTier[];
  tierById: Map<string, TalentTier>;
}

/** 加载规则域名称解析所需的全部字典（分库 / 要素 / 分级 / 档位）。 */
export async function loadTalentRuleLookups(pb: PocketBase): Promise<TalentRuleLookups> {
  const libraries = await pb
    .collection("talent_factor_libraries")
    .getFullList<TalentFactorLibrary>({ $autoCancel: false });
  const latest = pickLatestSyncedTalentLibrary(libraries);
  const library = latest ? libraries.find((item) => item.id === latest.id) || null : null;
  const factors = library
    ? await pb.collection("talent_factors").getFullList<TalentFactor>({
        filter: `libraryId = "${escapeFilterValue(library.id)}"`,
        sort: "sortOrder",
        $autoCancel: false,
      })
    : [];
  const levels = await getNewTalentLevels(pb);
  const tiers = await pb.collection("talent_tiers").getFullList<TalentTier>({
    sort: "sortOrder",
    $autoCancel: false,
  });
  return {
    library,
    factors,
    factorNames: library
      ? buildTalentFactorNameLookup(factors, library.id)
      : new Map<string, string>(),
    levels,
    levelNames: buildTalentLevelNameLookup(levels),
    levelByCode: new Map(levels.map((level) => [level.code, level])),
    tiers,
    tierById: new Map(tiers.map((tier) => [tier.id, tier])),
  };
}

/** 当前筛选下每个分级的固定注解条数（分级下拉的 count 与列表 total 同源）。 */
export async function loadTalentNoteLevelCounts(
  pb: PocketBase,
  filter = "",
): Promise<{ levelCounts: Record<string, number>; noteTotal: number }> {
  const notes = await pb.collection("talent_factor_notes").getFullList<Pick<TalentFactorNote, "levelCode">>({
    filter: filter || undefined,
    fields: "levelCode",
    $autoCancel: false,
  });
  const levelCounts: Record<string, number> = {};
  for (const note of notes)
    levelCounts[note.levelCode] = (levelCounts[note.levelCode] || 0) + 1;
  return { levelCounts, noteTotal: notes.length };
}

// ── 导入请求：CSV 文件（multipart）或 JSON { fileName, csv } 两种入口 ────────────────

const talentRuleCsvBodySchema = z.object({
  fileName: z.string().max(255).optional(),
  csv: z.string().min(1, "导入 CSV 不能为空").max(10 * 1024 * 1024),
});

/** 读取规则域导入请求；multipart 只收 CSV 且校验 10MB 上限（413）。 */
export async function readTalentRuleCsvRequest(
  event: H3Event,
): Promise<{ fileName: string; csv: string }> {
  const contentType = getHeader(event, "content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const parts = await readMultipartFormData(event);
    const file = parts?.find((part) => part.name === "file");
    if (!file?.data) throw createError({ statusCode: 400, message: "未收到导入文件" });
    if (!file.filename?.toLowerCase().endsWith(".csv"))
      throw createError({ statusCode: 415, message: "当前仅支持 CSV 文件" });
    assertTalentRuleImportFileSize(file.data);
    return {
      fileName: file.filename || "",
      csv: new TextDecoder("utf-8").decode(file.data),
    };
  }
  const body = await validateBody(event, talentRuleCsvBodySchema, { statusCode: 422 });
  assertTalentRuleImportFileSize(new TextEncoder().encode(body.csv));
  return { fileName: body.fileName || "", csv: body.csv };
}

// ── 潜质要素文库 CSV：外部文库 9 列（仅导出 / 模板，不提供要素导入） ─────────────────

export const TALENT_FACTOR_LIBRARY_CSV_COLUMNS = [
  "序号",
  "年龄",
  "分册",
  "潜质要素",
  "数据熵",
  "分级内容",
  "分级举例",
  "培育方向",
  "培育建议",
] as const;

/** 分册展示：`A 生长发育`。 */
export function talentCategoryLabel(category: string, categoryName: string): string {
  return [category, categoryName].filter(Boolean).join(" ");
}

/** 文库导出：行 = 要素 × 分级 × 变体，四段全量输出（spec §6.2 / §3.2.1）。 */
export function buildTalentFactorLibraryExportCsv(input: {
  gender: string;
  age: number;
  factors: ReadonlyArray<Pick<TalentFactor, "code" | "name" | "category" | "categoryName" | "sortOrder" | "slots">>;
  levels: ReadonlyArray<Pick<TalentLevel, "code" | "name" | "sortOrder">>;
}): string {
  const factors = [...input.factors].sort(
    (left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0),
  );
  const levels = [...input.levels].sort(
    (left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0),
  );
  const rows: TalentCsvValue[][] = [];
  for (const factor of factors) {
    for (const level of levels) {
      const slotVariants = factor.slots?.[level.code];
      const variants = Array.isArray(slotVariants) ? slotVariants : [];
      for (let index = 0; index < 3; index += 1) {
        const variant = variants[index] || { content: "", example: "", direction: "", suggestion: "" };
        rows.push([
          factor.sortOrder ?? "",
          input.age,
          talentCategoryLabel(factor.category, factor.categoryName),
          factor.name,
          // 数据熵列输出当前分级名称（LV1–LV4）；外部原型「弱势/优秀」口径待 U2 裁决。
          level.name,
          variant.content || "",
          variant.example || "",
          variant.direction || "",
          variant.suggestion || "",
        ]);
      }
    }
  }
  return encodeTalentCsv([...TALENT_FACTOR_LIBRARY_CSV_COLUMNS], rows);
}

/** 文库模板：仅表头 + 1 行示例（不提供要素导入）。 */
export function buildTalentFactorLibraryCsvTemplate(): string {
  return encodeTalentCsv(
    [...TALENT_FACTOR_LIBRARY_CSV_COLUMNS],
    [
      [
        1,
        0,
        "A 生长发育",
        "示例：潜质要素名称",
        "常态",
        "示例：分级内容",
        "示例：分级举例",
        "示例：培育方向",
        "示例：培育建议",
      ],
    ],
  );
}

// ── 固定注解 / 分级导出：与页面表格列一致（含解析后的名称与聚合数） ─────────────────

/** 固定注解导出列（页面 9 列去掉「操作」）。 */
export const TALENT_FACTOR_NOTE_EXPORT_COLUMNS = [
  "注解编号",
  "要素编码",
  "潜质要素",
  "分级编码",
  "分级名称",
  "注解正文",
  "年龄条件",
  "性别条件",
  "启用状态",
] as const;

export interface TalentFactorNoteExportRow {
  code: string;
  factorCode: string;
  factorName: string;
  levelCode: string;
  levelName: string;
  note?: string;
  ageRange?: string;
  gender?: TalentNoteGender;
  status: string;
}

/** 固定注解导出：名称按当前文库 / 分级解析，不落快照（ADR 0001-D3）。 */
export function buildTalentFactorNoteExportCsv(
  rows: ReadonlyArray<TalentFactorNoteExportRow>,
): string {
  return encodeTalentCsv(
    [...TALENT_FACTOR_NOTE_EXPORT_COLUMNS],
    rows.map((row) => [
      row.code,
      row.factorCode,
      row.factorName,
      row.levelCode,
      row.levelName,
      row.note || "",
      row.ageRange || "",
      row.gender || "通用",
      row.status === "1" ? "启用" : "停用",
    ]),
  );
}

/** 分级导出列（页面 7 列去掉「操作」）。 */
export const TALENT_LEVEL_EXPORT_COLUMNS = [
  "分级编码",
  "分级名称",
  "级序",
  "得分范围",
  "展示色位",
  "启用状态",
  "固定注解数",
] as const;

export interface TalentLevelExportRow {
  code: string;
  name: string;
  sortOrder: number;
  range?: string;
  tone?: TalentLevelTone;
  status: string;
  noteCount: number;
}

export function buildTalentLevelExportCsv(rows: ReadonlyArray<TalentLevelExportRow>): string {
  return encodeTalentCsv(
    [...TALENT_LEVEL_EXPORT_COLUMNS],
    rows.map((row) => [
      row.code,
      row.name,
      row.sortOrder,
      row.range || "",
      row.tone || "default",
      row.status === "1" ? "启用" : "停用",
      row.noteCount,
    ]),
  );
}

/** 当前筛选下每个分册的潜质要素条数（分册下拉的 count 与列表 total 同源）。 */
export async function loadTalentFactorCategoryCounts(
  pb: PocketBase,
  filter = "",
): Promise<{ categoryCounts: Record<string, number>; categoryTotal: number }> {
  const factors = await pb.collection("talent_factors").getFullList<Pick<TalentFactor, "category">>({
    filter: filter || undefined,
    fields: "category",
    $autoCancel: false,
  });
  const categoryCounts: Record<string, number> = {};
  for (const factor of factors)
    categoryCounts[factor.category] = (categoryCounts[factor.category] || 0) + 1;
  return { categoryCounts, categoryTotal: factors.length };
}

/** 方向列表 / 详情展示结构：requirements 与 tierIds 展开为名称，不落快照（ADR 0001-D2）。 */
export interface TalentDirectionRequirementView {
  code: string;
  level: string;
  factorName: string;
  levelName: string;
}

export interface TalentDirectionTierView {
  id: string;
  name: string;
  teacher: string;
  freq: string;
  status: string;
}

export interface TalentDirectionView {
  requirementNames: TalentDirectionRequirementView[];
  tiers: TalentDirectionTierView[];
  defaultTierName: string;
}

/** 展开方向的要素 / 分级 / 档位名称；找不到时回退编码 / id，避免列表空白。 */
export function buildTalentDirectionView(
  direction: {
    requirements?: unknown;
    tierIds?: unknown;
    defaultTierId?: unknown;
  },
  lookups: TalentRuleLookups,
): TalentDirectionView {
  const requirements = Array.isArray(direction.requirements)
    ? direction.requirements.filter(
        (item): item is { code: string; level: string } =>
          Boolean(item) &&
          typeof item === "object" &&
          typeof (item as { code?: unknown }).code === "string" &&
          typeof (item as { level?: unknown }).level === "string",
      )
    : [];
  const tierIds = Array.isArray(direction.tierIds)
    ? direction.tierIds.map((value) => String(value)).filter(Boolean)
    : [];
  const defaultTierId = String(direction.defaultTierId || "");
  return {
    requirementNames: requirements.map((requirement) => ({
      code: requirement.code,
      level: requirement.level,
      factorName: lookups.factorNames.get(requirement.code) || requirement.code,
      levelName: lookups.levelNames.get(requirement.level) || requirement.level,
    })),
    tiers: tierIds.map((tierId) => {
      const tier = lookups.tierById.get(tierId);
      return {
        id: tierId,
        name: tier?.name || tierId,
        teacher: tier?.teacher || "",
        freq: tier?.freq || "",
        status: tier?.status || "0",
      };
    }),
    defaultTierName:
      lookups.tierById.get(defaultTierId)?.name || (defaultTierId ? defaultTierId : ""),
  };
}

/** 方向编码缺省生成：沿用 `DIR-xxx` 序号，避免新增必须手填编码。 */
export async function generateTalentDirectionCode(pb: PocketBase): Promise<string> {
  const directions = await pb
    .collection("talent_directions")
    .getFullList<{ code: string }>({ fields: "code", $autoCancel: false });
  let max = 0;
  for (const direction of directions) {
    const matched = /^DIR-(\d+)$/.exec(String(direction.code || ""));
    if (!matched) continue;
    max = Math.max(max, Number(matched[1]));
  }
  return `DIR-${String(max + 1).padStart(3, "0")}`;
}

/** 导入 / 写入失败行提示：不回传 PocketBase 原始错误与堆栈（spec §5.1）。 */
export function talentRuleRowErrorMessage(error: unknown): string {
  const record = error as {
    statusCode?: number;
    status?: number;
    message?: string;
  } | null;
  if (record?.statusCode) return String(record.message || "写入失败");
  if (record?.status === 400) return "写入失败：编码或排序与已有记录冲突";
  return "写入失败：服务端写入异常";
}

/** 导出文件名（ASCII + UTF-8 兜底）：导出路由统一使用。 */
export function talentRuleDownloadHeaders(
  event: H3Event,
  fileName: string,
): void {
  setHeader(event, "content-type", "text/csv; charset=utf-8");
  setHeader(
    event,
    "content-disposition",
    `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
  );
}