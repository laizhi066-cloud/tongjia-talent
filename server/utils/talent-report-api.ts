/**
 * @description M3-B 报告域 API 服务层：列表（四项筛选 + 状态计数）/ 详情 4 页签 / 单册叠加层 /
 *   发布预览与发布 / 撤回 / 恢复 / 补发预览与补发 / 显式重算 / 方向预览 diff / 一键同步 / 同步日志 /
 *   基因报告元数据；以及路由共用的 Zod schema 与错误码（409 状态冲突、422 业务校验）。
 *   领域计算全部复用 M3-A 纯函数（`talent-report-snapshot.ts`）与同步模块（`talent-report-source.ts`），
 *   写动作统一 `withTalentReportLock("report:"+id)` 串行；响应只含脱敏 / 冻结字段。
 *   口径见 docs/specs/M3-reports/spec.md §5、ADR 0003-D3/D4/D5/D7。
 * @file server/utils/talent-report-api.ts
 */
import { createError } from "h3";
import type PocketBase from "pocketbase";
import { z } from "zod";
import type { TalentChildRecord, TalentParentRecord } from "~~/shared/types/talent-member";
import type { TalentDirectionSnapshot } from "~~/shared/types/talent-direction";
import {
  TALENT_REPORT_STATUSES,
  TALENT_REPORT_VOLUME_IDS,
  type TalentGeneReportRecord,
  type TalentGeneReportSource,
  type TalentReportRecord,
  type TalentReportSnapshotRules,
  type TalentReportStatus,
  type TalentReportSyncPreviewCounts,
} from "~~/shared/types/talent-report";
import { hashTalentMemberIdNo, hashTalentMemberMobile } from "./talent-member-crypto";
import { calculateTalentAge } from "./talent-age";
import { escapeFilterValue } from "./pocketbase-client";
import {
  buildTalentReportFactorSnapshot,
  computeTalentReportNewBooks,
  computeTalentReportNewVolumeIds,
  conflictTalentReport,
  getTalentReportVolumeDefinition,
  hasTalentReportSnapshot,
  invalidTalentReport,
  matchTalentReportDirections,
  normalizeTalentReportBookCodes,
  normalizeTalentReportVolumeIds,
  notFoundTalentReport,
  planTalentReportPublish,
  planTalentReportRegenerate,
  planTalentReportReissue,
  planTalentReportRestore,
  planTalentReportWithdraw,
  resolveTalentReportOpenBookCodes,
} from "./talent-report-snapshot";
import {
  commitTalentReportSync,
  previewTalentReportSync,
  summarizeTalentGeneReportChapters,
  type TalentReportSyncStore,
} from "./talent-report-source";
import { withTalentReportLock } from "./talent-report-lock";
import {
  TALENT_GENE_REPORT_COLLECTION,
  TALENT_REPORT_COLLECTION,
  TALENT_SYNC_LOG_COLLECTION,
  assertTalentReportWritable,
  countEnabledTalentReportTiers,
  getTalentGeneReportOrThrow,
  getTalentReportOrThrow,
  loadTalentReportGeneReport,
  loadTalentReportSnapshotRules,
  sanitizeTalentGeneReportRecord,
  sanitizeTalentReportRecord,
  talentReportGenderLabel,
  talentReportStatusLabel,
  type TalentGeneReportView,
  type TalentReportView,
} from "./talent-report";

/** 列表默认每页 20 / 上限 100（spec §5.1）。 */
export const TALENT_REPORT_DEFAULT_PAGE_SIZE = 20;
export const TALENT_REPORT_MAX_PAGE_SIZE = 100;
/** 同步日志默认读取条数（spec §5.2 #13）。 */
export const TALENT_REPORT_SYNC_LOG_LIMIT = 20;

// ── 路由共用 Zod schema（失败统一 422） ─────────────────────────────────────

const talentReportVolumeIdSchema = z.enum(TALENT_REPORT_VOLUME_IDS);

/** #5 发布：1–6 册、去重、必须 ⊆ 外部已出且有要素的册（业务校验在领域层）。 */
export const talentReportPublishSchema = z.object({
  openVolumeIds: z
    .array(talentReportVolumeIdSchema)
    .min(1, "请至少开放 1 个分册")
    .max(6, "开放分册最多 6 个"),
});

/** #6 撤回：原因可选，≤200，写入版本摘要。 */
export const talentReportWithdrawSchema = z.object({
  reason: z.string().trim().max(200, "撤回原因不能超过 200 个字符").optional(),
});

/** #10 重新生成快照：默认刷新 M1 注解 / 级序，`false` 时只重算方向。 */
export const talentReportRegenerateSchema = z.object({
  regenerateFactorNotes: z.boolean().optional(),
});

/** #12 一键同步：`mode` 只允许 preview / commit；`previewCounts` 用于 changedSincePreview。 */
export const talentReportSyncSchema = z.object({
  mode: z.enum(["preview", "commit"], { message: "同步模式不正确" }),
  previewCounts: z
    .object({
      refreshed: z.number().int().min(0).optional(),
      created: z.number().int().min(0).optional(),
      empty: z.number().int().min(0).optional(),
      failed: z.number().int().min(0).optional(),
    })
    .optional(),
});

// ── 分页 / 筛选格式 ─────────────────────────────────────────────────────────

export function normalizeTalentReportPagination(query: {
  page?: unknown;
  pageSize?: unknown;
}): { page: number; pageSize: number } {
  const rawPage = Number(query.page);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const rawPageSize = Number(query.pageSize);
  const pageSize =
    Number.isFinite(rawPageSize) && rawPageSize > 0
      ? Math.min(TALENT_REPORT_MAX_PAGE_SIZE, Math.floor(rawPageSize))
      : TALENT_REPORT_DEFAULT_PAGE_SIZE;
  return { page, pageSize };
}

/** 家长手机号筛选：完整 11 位按 HMAC 精确匹配，后 4 位按脱敏列后缀匹配；其他 → 422。 */
export function buildTalentReportParentMobileFilter(mobile: string): string {
  const value = String(mobile ?? "").trim();
  if (!value) return "";
  if (/^\d{4}$/.test(value))
    return `maskedMobile ~ "${escapeFilterValue(`****${value}`)}"`;
  if (/^1[3-9]\d{9}$/.test(value))
    return `mobileHash = "${escapeFilterValue(hashTalentMemberMobile(value))}"`;
  throw invalidTalentReport("家长手机号筛选应为完整 11 位或后 4 位");
}

/** 检验人身份证筛选：完整 18 位按 HMAC 精确匹配，后 4 位按脱敏列后缀匹配；其他 → 422。 */
export function buildTalentReportIdNoFilter(idNo: string): string {
  const value = String(idNo ?? "").trim();
  if (!value) return "";
  if (/^\d{4}$/.test(value)) return `maskedIdNo ~ "${escapeFilterValue(value)}"`;
  if (/^\d{17}[\dXx]$/.test(value))
    return `idNoHash = "${escapeFilterValue(hashTalentMemberIdNo(value))}"`;
  throw invalidTalentReport("身份证筛选应为完整 18 位或后 4 位");
}

// ── 列表（spec §5.4.1） ────────────────────────────────────────────────────

export interface TalentReportListQueryInput {
  reportNo?: string;
  childName?: string;
  parentMobile?: string;
  idNo?: string;
  status?: string;
  subjectType?: string;
  page?: string;
  pageSize?: string;
}

export interface TalentReportListRow {
  id: string;
  reportNo: string;
  parentId: string;
  parentName: string;
  childName: string;
  subjectType: string;
  subjectId: string;
  maskedMobile: string;
  maskedIdNo: string;
  geneBookCount: number;
  booksText: string;
  newBookCount: number;
  newBooksText: string;
  status: string;
  statusLabel: string;
  snapshotVersion: number;
  publishedAt: string;
  updatedAt: string;
  geneReportId: string;
}

export interface TalentReportListResult {
  rows: TalentReportListRow[];
  total: number;
  page: number;
  pageSize: number;
  statusCounts: Record<TalentReportStatus, number>;
  statusTotal: number;
}

/** 批量按 id 读取（chunk 避免超长 filter）。 */
async function listTalentRecordsByIds<T extends { id: string }>(
  pb: PocketBase,
  collection: string,
  ids: readonly unknown[],
): Promise<T[]> {
  const unique = [...new Set(ids.map((id) => String(id ?? "").trim()))].filter(
    Boolean,
  );
  const rows: T[] = [];
  for (let index = 0; index < unique.length; index += 40) {
    const chunk = unique.slice(index, index + 40);
    const filter = chunk.map((id) => `id = "${escapeFilterValue(id)}"`).join(" || ");
    const page = await pb.collection(collection).getFullList<T>({
      filter,
      $autoCancel: false,
    });
    rows.push(...page);
  }
  return rows;
}

/** 按字段值批量解析 id（两段查询：先查关联集合，再对报告加 IN 条件分页）。 */
async function collectTalentReportIdsByField(
  pb: PocketBase,
  collection: string,
  filter: string,
): Promise<string[]> {
  const rows = await pb.collection(collection).getFullList<{ id: string }>({
    filter,
    fields: "id",
    $autoCancel: false,
  });
  return rows.map((row) => String(row.id ?? "")).filter(Boolean);
}

function buildTalentReportIdListFilter(field: string, ids: readonly string[]): string {
  if (ids.length === 0) return 'id = "__none__"';
  return `(${ids.map((id) => `${field} = "${escapeFilterValue(id)}"`).join(" || ")})`;
}

/**
 * 报告列表：报告编号（模糊）/ 子女姓名（模糊）/ 家长手机号（完整或后 4）/ 检验人身份证（完整或后 4）
 * / 状态五项 AND；`statusCounts` 只在「四项输入」下统计，不叠加状态筛选（同 M2 列表口径）。
 */
export async function listTalentReports(
  pb: PocketBase,
  input: TalentReportListQueryInput = {},
): Promise<TalentReportListResult> {
  const { page, pageSize } = normalizeTalentReportPagination(input);
  const subjectType = String(input.subjectType ?? "").trim();
  const status = String(input.status ?? "").trim();
  if (status && !(TALENT_REPORT_STATUSES as readonly string[]).includes(status))
    throw invalidTalentReport("报告状态参数不正确");
  if (subjectType && subjectType !== "child" && subjectType !== "self")
    throw invalidTalentReport("测评对象参数不正确");

  const baseFilters: string[] = ['subjectType != ""'];
  if (subjectType) baseFilters.push(`subjectType = "${escapeFilterValue(subjectType)}"`);

  const reportNo = String(input.reportNo ?? "").trim();
  if (reportNo) baseFilters.push(`reportNo ~ "${escapeFilterValue(reportNo)}"`);

  const childName = String(input.childName ?? "").trim();
  if (childName) {
    const childIds = await collectTalentReportIdsByField(
      pb,
      "talent_children",
      `name ~ "${escapeFilterValue(childName)}"`,
    );
    // 子女姓名也可能命中家长本人行（self）的基因报告姓名，但 M3 只同步 child；self 无姓名筛选口径。
    baseFilters.push(buildTalentReportIdListFilter("subjectId", childIds));
  }

  const parentMobileFilter = buildTalentReportParentMobileFilter(
    String(input.parentMobile ?? ""),
  );
  if (parentMobileFilter) {
    const parentIds = await collectTalentReportIdsByField(
      pb,
      "talent_parents",
      parentMobileFilter,
    );
    baseFilters.push(buildTalentReportIdListFilter("parentId", parentIds));
  }

  const idNoFilter = buildTalentReportIdNoFilter(String(input.idNo ?? ""));
  if (idNoFilter) {
    const geneReportIds = await collectTalentReportIdsByField(
      pb,
      TALENT_GENE_REPORT_COLLECTION,
      idNoFilter,
    );
    baseFilters.push(buildTalentReportIdListFilter("geneReportId", geneReportIds));
  }

  const baseFilter = baseFilters.join(" && ");
  const filter = [baseFilter, status ? `status = "${escapeFilterValue(status)}"` : ""]
    .filter(Boolean)
    .join(" && ");

  const [result, statusRows] = await Promise.all([
    pb.collection(TALENT_REPORT_COLLECTION).getList<TalentReportRecord>(page, pageSize, {
      filter,
      sort: "-created",
      $autoCancel: false,
    }),
    pb.collection(TALENT_REPORT_COLLECTION).getFullList<TalentReportRecord>({
      filter: baseFilter,
      fields: "status",
      $autoCancel: false,
    }),
  ]);

  const statusCounts: Record<TalentReportStatus, number> = {
    pending_publish: 0,
    published: 0,
    retracted: 0,
  };
  for (const row of statusRows) {
    const key = String(row.status ?? "") as TalentReportStatus;
    if (key in statusCounts) statusCounts[key] += 1;
  }

  const items = result.items;
  const [parents, children, geneReports] = await Promise.all([
    listTalentRecordsByIds<TalentParentRecord>(
      pb,
      "talent_parents",
      items.map((row) => row.parentId),
    ),
    listTalentRecordsByIds<TalentChildRecord>(
      pb,
      "talent_children",
      items.filter((row) => String(row.subjectType) === "child").map((row) => row.subjectId),
    ),
    listTalentRecordsByIds<TalentGeneReportRecord>(
      pb,
      TALENT_GENE_REPORT_COLLECTION,
      items.map((row) => row.geneReportId),
    ),
  ]);
  const parentById = new Map(parents.map((row) => [String(row.id), row]));
  const childById = new Map(children.map((row) => [String(row.id), row]));
  const geneById = new Map(geneReports.map((row) => [String(row.id), row]));

  const rows: TalentReportListRow[] = items.map((row) => {
    const parent = parentById.get(String(row.parentId || ""));
    const child = childById.get(String(row.subjectId || ""));
    const gene = geneById.get(String(row.geneReportId || ""));
    const externalBooks = normalizeTalentReportBookCodes(gene?.books ?? "");
    const newBooks = computeTalentReportNewBooks(
      externalBooks,
      row.openVolumeIds,
    );
    const subjectTypeValue = String(row.subjectType ?? "");
    return {
      id: String(row.id ?? ""),
      reportNo: String(row.reportNo ?? ""),
      parentId: String(row.parentId ?? ""),
      parentName: String(parent?.name ?? ""),
      childName:
        subjectTypeValue === "self"
          ? "本人"
          : String(child?.name ?? gene?.name ?? ""),
      subjectType: subjectTypeValue,
      subjectId: String(row.subjectId ?? ""),
      maskedMobile: String(parent?.maskedMobile ?? ""),
      maskedIdNo: String(gene?.maskedIdNo ?? child?.maskedIdNo ?? ""),
      geneBookCount: externalBooks.length,
      booksText: externalBooks.join(""),
      newBookCount: newBooks.length,
      newBooksText: newBooks.join(""),
      status: String(row.status ?? ""),
      statusLabel: talentReportStatusLabel(row.status),
      snapshotVersion: Number(row.snapshotVersion ?? 0) || 0,
      publishedAt: String(row.publishedAt ?? ""),
      updatedAt: String(row.updated ?? ""),
      geneReportId: String(row.geneReportId ?? ""),
    };
  });

  return {
    rows,
    total: result.totalItems,
    page,
    pageSize,
    statusCounts,
    statusTotal: statusRows.length,
  };
}

// ── 详情（spec §5.4.2） ────────────────────────────────────────────────────

export interface TalentReportDirectionSummary {
  directionId: string;
  code: string;
  name: string;
  version: number;
  tierIds: string[];
  defaultTierId: string;
  total: number;
  hitCount: number;
  hitRate: number;
}

export interface TalentReportMatchingDiffItem {
  directionId: string;
  code: string;
  name: string;
  frozenHitCount: number;
  currentHitCount: number;
  addedHits: string[];
  removedHits: string[];
  requirementChanged: boolean;
}

export interface TalentReportMatchingTab {
  frozen: TalentReportDirectionSummary[] | null;
  current: TalentReportDirectionSummary[] | null;
  diff: TalentReportMatchingDiffItem[];
  configChanged: boolean;
}

export interface TalentReportDetailResult {
  report: TalentReportView & {
    geneBookCount: number;
    booksText: string;
    newBookCount: number;
    newBooksText: string;
  };
  subject: {
    type: string;
    id: string;
    name: string;
    gender: string;
    genderLabel: string;
    birthday: string;
    age: number;
    maskedIdNo: string;
  };
  parent: { id: string; name: string; maskedMobile: string };
  geneReport: (TalentGeneReportView & { sectionCount: number }) | null;
  tabs: {
    selections: unknown[];
    matching: TalentReportMatchingTab;
    geneReport: {
      volumes: Array<{
        volumeId: string;
        bookCode: string;
        name: string;
        open: boolean;
        chapterCount: number;
        factorCount: number;
      }>;
    };
    advice: {
      available: false;
      items: unknown[];
      emptyText: string;
    };
  };
}

function summarizeFrozenDirections(
  snapshot: TalentDirectionSnapshot | null | undefined,
): TalentReportDirectionSummary[] {
  if (!snapshot || !Array.isArray(snapshot.directions)) return [];
  return snapshot.directions.map((direction) => ({
    directionId: String(direction.directionId ?? ""),
    code: String(direction.code ?? ""),
    name: String(direction.name ?? ""),
    version: Number(direction.version ?? 0) || 0,
    tierIds: Array.isArray(direction.tierIds) ? [...direction.tierIds] : [],
    defaultTierId: String(direction.defaultTierId ?? ""),
    total: Number(direction.total ?? 0) || 0,
    hitCount: Number(direction.hitCount ?? 0) || 0,
    hitRate: Number(direction.hitRate ?? 0) || 0,
  }));
}

function summarizeCurrentDirections(
  matched: ReturnType<typeof matchTalentReportDirections>,
): TalentReportDirectionSummary[] {
  return matched.hits.map((hit) => ({
    directionId: String(hit.directionId ?? ""),
    code: String(hit.code ?? ""),
    name: String(hit.name ?? ""),
    version: Number(hit.version ?? 0) || 0,
    tierIds: [...hit.tierIds],
    defaultTierId: String(hit.defaultTierId ?? ""),
    total: Number(hit.total ?? 0) || 0,
    hitCount: Number(hit.hitCount ?? 0) || 0,
    hitRate: Number(hit.hitRate ?? 0) || 0,
  }));
}

function requirementKeyList(
  requirements: ReadonlyArray<{ code: string; level: string }> | undefined,
): string[] {
  return (requirements ?? [])
    .map((item) => `${String(item.code ?? "").trim()}:${String(item.level ?? "").trim()}`)
    .sort();
}

function metRequirementCodes(
  requirements: Array<{ code: string; met: boolean }> | undefined,
): string[] {
  return (requirements ?? [])
    .filter((item) => item.met === true)
    .map((item) => String(item.code ?? "").trim())
    .filter(Boolean);
}

/** 冻结快照 vs 当前配置的逐方向 diff（M4 纯函数实时计算，不落库）。 */
function buildTalentReportMatchingDiff(
  snapshot: TalentDirectionSnapshot | null | undefined,
  matched: ReturnType<typeof matchTalentReportDirections>,
): TalentReportMatchingDiffItem[] {
  const frozenById = new Map(
    (snapshot?.directions ?? []).map((direction) => [
      String(direction.directionId ?? ""),
      direction,
    ]),
  );
  const currentById = new Map(
    matched.hits.map((hit) => [String(hit.directionId ?? ""), hit]),
  );
  const ids: string[] = [];
  for (const id of frozenById.keys()) if (!ids.includes(id)) ids.push(id);
  for (const id of currentById.keys()) if (!ids.includes(id)) ids.push(id);
  const items: TalentReportMatchingDiffItem[] = [];
  for (const directionId of ids) {
    const frozen = frozenById.get(directionId);
    const current = currentById.get(directionId);
    const frozenMet = new Set(metRequirementCodes(frozen?.requirements));
    const currentMet = new Set(metRequirementCodes(current?.requirements));
    const addedHits = [...currentMet].filter((code) => !frozenMet.has(code)).sort();
    const removedHits = [...frozenMet].filter((code) => !currentMet.has(code)).sort();
    const requirementChanged =
      JSON.stringify(requirementKeyList(frozen?.requirements)) !==
      JSON.stringify(requirementKeyList(current?.requirements));
    const frozenHitCount = Number(frozen?.hitCount ?? 0) || 0;
    const currentHitCount = Number(current?.hitCount ?? 0) || 0;
    // `diff` 只表示「发布后配置变化导致命中/要求不同」的方向；完全一致的方向不进 diff。
    if (
      !requirementChanged &&
      addedHits.length === 0 &&
      removedHits.length === 0 &&
      frozenHitCount === currentHitCount
    )
      continue;
    items.push({
      directionId,
      code: String(frozen?.code ?? current?.code ?? ""),
      name: String(frozen?.name ?? current?.name ?? ""),
      frozenHitCount,
      currentHitCount,
      addedHits,
      removedHits,
      requirementChanged,
    });
  }
  return items;
}

/**
 * `configChanged`：任一方向版本变化 / 档位停用或改名 / 要素分级或注解变化，
 * 或当前命中与冻结快照出现差异（说明配置已影响命中）。未发布 → false。
 */
function computeTalentReportConfigChanged(
  report: TalentReportRecord,
  rules: TalentReportSnapshotRules,
  diff: TalentReportMatchingDiffItem[],
): boolean {
  const snapshot = report.directionSnapshot;
  if (!snapshot || !hasTalentReportSnapshot(report)) return false;
  const ruleById = new Map(rules.directions.map((rule) => [String(rule.id), rule]));
  for (const frozen of snapshot.directions ?? []) {
    const rule = ruleById.get(String(frozen.directionId ?? ""));
    if (!rule || String(rule.status) === "0") return true;
    if (Number(rule.version) !== Number(frozen.version ?? 0)) return true;
  }
  const tierById = new Map(rules.tiers.map((tier) => [String(tier.id), tier]));
  for (const frozenTier of snapshot.tiers ?? []) {
    const rule = tierById.get(String(frozenTier.id ?? ""));
    if (!rule || String(rule.status) === "0") return true;
    if (String(rule.name) !== String(frozenTier.name ?? "")) return true;
  }
  const levelByCode = new Map(rules.levels.map((level) => [String(level.code), level]));
  const noteByKey = new Map(
    rules.notes
      .filter((note) => String(note.status ?? "1") !== "0")
      .map((note) => [`${note.factorCode}-${note.levelCode}`, String(note.note ?? "")]),
  );
  for (const item of report.factorSnapshot ?? []) {
    const level = levelByCode.get(String(item.levelCode ?? ""));
    if (level && String(level.name) !== String(item.levelName ?? "")) return true;
    if (level && (Number(level.sortOrder) || 0) !== (Number(item.levelOrder) || 0))
      return true;
    if (
      (noteByKey.get(`${item.code}-${item.levelCode}`) ?? "") !==
      String(item.note ?? "")
    )
      return true;
  }
  return diff.some(
    (item) =>
      item.requirementChanged || item.addedHits.length > 0 || item.removedHits.length > 0,
  );
}

function buildTalentReportMatchingTab(
  report: TalentReportRecord,
  rules: TalentReportSnapshotRules,
): TalentReportMatchingTab {
  if (!hasTalentReportSnapshot(report)) {
    return { frozen: null, current: null, diff: [], configChanged: false };
  }
  const matched = matchTalentReportDirections({
    factorSnapshot: Array.isArray(report.factorSnapshot) ? report.factorSnapshot : [],
    rules,
  });
  const frozen = summarizeFrozenDirections(report.directionSnapshot);
  const current = summarizeCurrentDirections(matched);
  const diff = buildTalentReportMatchingDiff(report.directionSnapshot, matched);
  return {
    frozen,
    current,
    diff,
    configChanged: computeTalentReportConfigChanged(report, rules, diff),
  };
}

/** 详情六册摘要：固定六册顺序；未出册 chapterCount/factorCount 为 0、open=false。 */
function buildTalentReportDetailVolumes(
  report: TalentReportRecord,
  geneReport: TalentGeneReportRecord | null,
): TalentReportDetailResponseVolumes {
  const openSet = new Set(normalizeTalentReportVolumeIds(report.openVolumeIds));
  const chapterSummary = new Map(
    summarizeTalentGeneReportChapters(geneReport).map((item) => [
      String(item.bookCode),
      item,
    ]),
  );
  return TALENT_REPORT_VOLUME_IDS.map((volumeId) => {
    const definition = getTalentReportVolumeDefinition(volumeId);
    const bookCode = String(definition?.bookCode ?? "");
    const summary = chapterSummary.get(bookCode);
    return {
      volumeId,
      bookCode,
      name: String(definition?.name ?? ""),
      open: openSet.has(volumeId),
      chapterCount: Number(summary?.chapterCount ?? 0) || 0,
      factorCount: Number(summary?.factorCount ?? 0) || 0,
    };
  });
}

type TalentReportDetailResponseVolumes = TalentReportDetailResult["tabs"]["geneReport"]["volumes"];

/** 报告详情：信息条 + 4 页签。不返回 factorSnapshot / volumeSnapshot 全量。 */
export async function loadTalentReportDetail(
  pb: PocketBase,
  reportId: unknown,
  options: { now?: Date } = {},
): Promise<TalentReportDetailResult> {
  const report = await getTalentReportOrThrow(pb, reportId);
  const geneReport = await loadTalentReportGeneReport(pb, report);
  const rules = await loadTalentReportSnapshotRules(pb);
  const now = options.now ?? new Date();

  const parent = String(report.parentId ?? "").trim()
    ? await pb
        .collection("talent_parents")
        .getOne<TalentParentRecord>(String(report.parentId), { $autoCancel: false })
        .catch(() => null)
    : null;
  const child =
    String(report.subjectType ?? "") === "child" && String(report.subjectId ?? "").trim()
      ? await pb
          .collection("talent_children")
          .getOne<TalentChildRecord>(String(report.subjectId), { $autoCancel: false })
          .catch(() => null)
      : null;

  const gender = String(child?.gender ?? geneReport?.gender ?? "");
  const birthday = String(child?.birthday ?? geneReport?.birthday ?? "");
  const subjectName =
    String(report.subjectType ?? "") === "self"
      ? String(parent?.name ?? geneReport?.name ?? "本人")
      : String(child?.name ?? geneReport?.name ?? "");
  const externalBooks = normalizeTalentReportBookCodes(geneReport?.books ?? "");
  const newBooks = computeTalentReportNewBooks(externalBooks, report.openVolumeIds);
  const base = sanitizeTalentReportRecord(report);

  return {
    report: {
      ...base,
      geneBookCount: externalBooks.length,
      booksText: externalBooks.join(""),
      newBookCount: newBooks.length,
      newBooksText: newBooks.join(""),
    },
    subject: {
      type: String(report.subjectType ?? ""),
      id: String(report.subjectId ?? ""),
      name: subjectName,
      gender,
      genderLabel: talentReportGenderLabel(gender),
      birthday,
      age:
        calculateTalentAge(birthday, now.toISOString()) ??
        (Number(geneReport?.age ?? 0) || 0),
      maskedIdNo: String(geneReport?.maskedIdNo ?? child?.maskedIdNo ?? ""),
    },
    parent: {
      id: String(report.parentId ?? ""),
      name: String(parent?.name ?? ""),
      maskedMobile: String(parent?.maskedMobile ?? ""),
    },
    geneReport: geneReport
      ? {
          ...sanitizeTalentGeneReportRecord(geneReport),
          sectionCount:
            Number(geneReport.sectionCount ?? 0) ||
            (Array.isArray(geneReport.sections) ? geneReport.sections.length : 0),
        }
      : null,
    tabs: {
      selections: Array.isArray(report.selections)
        ? structuredClone(report.selections)
        : [],
      matching: buildTalentReportMatchingTab(report, rules),
      geneReport: { volumes: buildTalentReportDetailVolumes(report, geneReport) },
      advice: {
        available: false,
        items: [],
        emptyText: "培育建议将在 M5 接入后显示",
      },
    },
  };
}

// ── 单册叠加层（spec §5.2 #3） ──────────────────────────────────────────────

export interface TalentReportVolumeDetailResult {
  reportId: string;
  reportNo: string;
  volumeId: string;
  bookCode: string;
  name: string;
  /** 是否已开放（C 端可读）；未开放册后台仍可查看并标注。 */
  open: boolean;
  published: boolean;
  source: "snapshot" | "live";
  chapterCount: number;
  factorCount: number;
  chapters: Array<{
    chapter: string;
    factors: Array<{
      code: string;
      name: string;
      levelCode: string;
      levelName: string;
      note: string;
    }>;
  }>;
}

/** 单册叠加层：已发布/已撤回走冻结 `volumeSnapshot`；待发布走基因报告篇目 + M1 当前值（只读）。 */
export async function loadTalentReportVolume(
  pb: PocketBase,
  reportId: unknown,
  volumeId: unknown,
): Promise<TalentReportVolumeDetailResult> {
  const report = await getTalentReportOrThrow(pb, reportId);
  const id = String(volumeId ?? "").trim();
  const definition = getTalentReportVolumeDefinition(id);
  if (!definition) throw notFoundTalentReport("分册不存在");
  const open = normalizeTalentReportVolumeIds(report.openVolumeIds).includes(
    definition.volumeId,
  );
  const published = hasTalentReportSnapshot(report);
  const snapshotVolume = Array.isArray(report.volumeSnapshot)
    ? report.volumeSnapshot.find((volume) => String(volume.volumeId) === id)
    : undefined;
  if (published && snapshotVolume) {
    return {
      reportId: String(report.id ?? ""),
      reportNo: String(report.reportNo ?? ""),
      volumeId: definition.volumeId,
      bookCode: definition.bookCode,
      name: definition.name,
      open,
      published,
      source: "snapshot",
      chapterCount: Number(snapshotVolume.chapterCount ?? 0) || 0,
      factorCount: Number(snapshotVolume.factorCount ?? 0) || 0,
      chapters: (snapshotVolume.chapters ?? []).map((chapter) => ({
        chapter: String(chapter.chapter ?? ""),
        factors: (chapter.factors ?? []).map((factor) => ({
          code: String(factor.code ?? ""),
          name: String(factor.name ?? ""),
          levelCode: String(factor.levelCode ?? ""),
          levelName: String(factor.levelName ?? ""),
          note: String(factor.note ?? ""),
        })),
      })),
    };
  }
  // 待发布 / 快照缺失：按基因报告篇目与 M1 当前配置实时展示（只读，不写任何集合）。
  const geneReport = await loadTalentReportGeneReport(pb, report);
  const rules = await loadTalentReportSnapshotRules(pb);
  const built = buildTalentReportFactorSnapshot({
    books: [definition.bookCode],
    sections: Array.isArray(geneReport?.sections) ? geneReport.sections : [],
    rules,
  });
  const items = built.items.filter((item) => item.bookCode === definition.bookCode);
  const chapters: TalentReportVolumeDetailResult["chapters"] = [];
  const chapterIndex = new Map<string, number>();
  for (const item of items) {
    const chapterName = String(item.chapter ?? "");
    let index = chapterIndex.get(chapterName);
    if (index === undefined) {
      index = chapters.length;
      chapterIndex.set(chapterName, index);
      chapters.push({ chapter: chapterName, factors: [] });
    }
    chapters[index]!.factors.push({
      code: item.code,
      name: item.name,
      levelCode: item.levelCode,
      levelName: item.levelName,
      note: item.note,
    });
  }
  return {
    reportId: String(report.id ?? ""),
    reportNo: String(report.reportNo ?? ""),
    volumeId: definition.volumeId,
    bookCode: definition.bookCode,
    name: definition.name,
    open,
    published,
    source: "live",
    chapterCount: chapters.length,
    factorCount: items.length,
    chapters,
  };
}

// ── 发布预览（spec §5.4.3） ────────────────────────────────────────────────

export interface TalentReportPublishPreviewResult {
  reportId: string;
  reportNo: string;
  snapshotVersion: number;
  factorCount: number;
  directionCount: number;
  tierCount: number;
  volumes: Array<{
    volumeId: string;
    bookCode: string;
    name: string;
    selectable: boolean;
    chapterCount: number;
    factorCount: number;
    reason: string;
  }>;
  directionHits: Array<{
    directionId: string;
    code: string;
    name: string;
    hitCount: number;
    total: number;
    hitRate: number;
    defaultTierName: string;
  }>;
  warnings: string[];
  rules: string;
}

/** 发布冻结规则固定文案（spec §6.3）。 */
export const TALENT_REPORT_PUBLISH_RULES =
  "发布即冻结：要素结果、固定注解、六册开放范围、方向命中与档位；后续配置调整不回写本报告。";

/** 发布预览：仅待发布报告可打开（否则 409）；不写任何集合。 */
export async function buildTalentReportPublishPreview(
  pb: PocketBase,
  reportId: unknown,
): Promise<TalentReportPublishPreviewResult> {
  const report = await getTalentReportOrThrow(pb, reportId);
  assertTalentReportWritable(report);
  if (String(report.status) !== "pending_publish")
    throw conflictTalentReport("仅待发布报告可打开发布预览");
  const geneReport = await loadTalentReportGeneReport(pb, report);
  if (!geneReport) throw conflictTalentReport("基因报告不存在，无法发布");
  const rules = await loadTalentReportSnapshotRules(pb);
  const externalBooks = normalizeTalentReportBookCodes(geneReport.books);
  const built = buildTalentReportFactorSnapshot({
    books: externalBooks,
    sections: Array.isArray(geneReport.sections) ? geneReport.sections : [],
    rules,
  });
  const matched = matchTalentReportDirections({
    factorSnapshot: built.items,
    rules,
  });
  const tierNameById = new Map(rules.tiers.map((tier) => [String(tier.id), String(tier.name)]));
  const factorCountByBook = new Map<string, number>();
  const chapterByBook = new Map<string, Set<string>>();
  for (const item of built.items) {
    const bookCode = String(item.bookCode ?? "");
    factorCountByBook.set(bookCode, (factorCountByBook.get(bookCode) ?? 0) + 1);
    const chapters = chapterByBook.get(bookCode) ?? new Set<string>();
    chapters.add(String(item.chapter ?? ""));
    chapterByBook.set(bookCode, chapters);
  }
  const volumes = TALENT_REPORT_VOLUME_IDS.map((volumeId) => {
    const definition = getTalentReportVolumeDefinition(volumeId)!;
    const bookCode = String(definition.bookCode);
    const external = externalBooks.includes(definition.bookCode);
    const factorCount = factorCountByBook.get(bookCode) ?? 0;
    const selectable = external && factorCount > 0;
    return {
      volumeId,
      bookCode,
      name: String(definition.name),
      selectable,
      chapterCount: chapterByBook.get(bookCode)?.size ?? 0,
      factorCount,
      reason: !external
        ? "外部暂无此册"
        : factorCount === 0
          ? "该册暂无可解析要素"
          : "",
    };
  });
  const warnings = [
    ...new Set([
      ...built.warnings,
      ...matched.warnings.map((warning) => String(warning.message ?? "")).filter(Boolean),
    ]),
  ];
  return {
    reportId: String(report.id ?? ""),
    reportNo: String(report.reportNo ?? ""),
    snapshotVersion: Number(report.snapshotVersion ?? 0) || 0,
    factorCount: built.items.length,
    directionCount: matched.evaluatedDirections,
    tierCount: countEnabledTalentReportTiers(rules),
    volumes,
    directionHits: matched.hits.map((hit) => ({
      directionId: String(hit.directionId ?? ""),
      code: String(hit.code ?? ""),
      name: String(hit.name ?? ""),
      hitCount: Number(hit.hitCount ?? 0) || 0,
      total: Number(hit.total ?? 0) || 0,
      hitRate: Number(hit.hitRate ?? 0) || 0,
      defaultTierName: tierNameById.get(String(hit.defaultTierId ?? "")) ?? "",
    })),
    warnings,
    rules: TALENT_REPORT_PUBLISH_RULES,
  };
}

// ── 写动作：发布 / 撤回 / 恢复 / 补发 / 重算（版本链 + 状态机） ─────────────────────

export interface TalentReportWriteActor {
  userId?: string;
  userName?: string;
  now?: Date;
}

export interface TalentReportActionResponse {
  report: TalentReportView;
  snapshotVersion: number;
  publishedAt?: string;
  regeneratedAt?: string;
  addedBooks?: string[];
  addedVolumeIds?: string[];
  warnings?: string[];
}

async function updateTalentReportRecord(
  pb: PocketBase,
  id: string,
  data: Record<string, unknown>,
): Promise<TalentReportRecord> {
  return pb.collection(TALENT_REPORT_COLLECTION).update<TalentReportRecord>(id, data, {
    $autoCancel: false,
  });
}

/** 发布：冻结快照（v1）、写 publishedAt，状态 pending_publish → published。 */
export async function publishTalentReport(
  pb: PocketBase,
  reportId: unknown,
  openVolumeIds: readonly string[],
  actor: TalentReportWriteActor = {},
): Promise<TalentReportActionResponse> {
  const id = String(reportId ?? "").trim();
  return withTalentReportLock(`report:${id}`, async () => {
    const report = await getTalentReportOrThrow(pb, id);
    assertTalentReportWritable(report);
    const geneReport = await loadTalentReportGeneReport(pb, report);
    if (!geneReport) throw conflictTalentReport("基因报告不存在，无法发布");
    const rules = await loadTalentReportSnapshotRules(pb);
    const plan = planTalentReportPublish({
      report,
      geneReport,
      openVolumeIds,
      rules,
      operatorId: actor.userId,
      operatorName: actor.userName,
      now: actor.now,
    });
    const updated = await updateTalentReportRecord(pb, id, {
      status: plan.status,
      openVolumeIds: plan.openVolumeIds,
      factorSnapshot: plan.factorSnapshot,
      volumeSnapshot: plan.volumeSnapshot,
      directionSnapshot: plan.directionSnapshot,
      factorCount: plan.factorCount,
      totalItems: plan.totalItems,
      snapshotVersion: plan.snapshotVersion,
      snapshotAt: plan.snapshotAt,
      publishedAt: plan.publishedAt,
      versions: plan.versions,
    });
    return {
      report: sanitizeTalentReportRecord(updated),
      snapshotVersion: plan.snapshotVersion,
      publishedAt: plan.publishedAt,
      warnings: plan.warnings,
    };
  });
}

/** 撤回：published → retracted，快照与版本不变，写 withdrawnAt。 */
export async function withdrawTalentReport(
  pb: PocketBase,
  reportId: unknown,
  body: { reason?: string } = {},
  actor: TalentReportWriteActor = {},
): Promise<TalentReportActionResponse> {
  const id = String(reportId ?? "").trim();
  return withTalentReportLock(`report:${id}`, async () => {
    const report = await getTalentReportOrThrow(pb, id);
    assertTalentReportWritable(report);
    const plan = planTalentReportWithdraw({
      report,
      reason: body.reason,
      operatorId: actor.userId,
      operatorName: actor.userName,
      now: actor.now,
    });
    const updated = await updateTalentReportRecord(pb, id, {
      status: plan.status,
      withdrawnAt: plan.withdrawnAt,
      versions: plan.versions,
    });
    return {
      report: sanitizeTalentReportRecord(updated),
      snapshotVersion: plan.snapshotVersion,
    };
  });
}

/** 恢复：retracted → published，沿用原快照，不递增 snapshotVersion。 */
export async function restoreTalentReport(
  pb: PocketBase,
  reportId: unknown,
  actor: TalentReportWriteActor = {},
): Promise<TalentReportActionResponse> {
  const id = String(reportId ?? "").trim();
  return withTalentReportLock(`report:${id}`, async () => {
    const report = await getTalentReportOrThrow(pb, id);
    assertTalentReportWritable(report);
    const plan = planTalentReportRestore({
      report,
      operatorId: actor.userId,
      operatorName: actor.userName,
      now: actor.now,
    });
    const updated = await updateTalentReportRecord(pb, id, {
      status: plan.status,
      restoredAt: plan.restoredAt,
      versions: plan.versions,
    });
    return {
      report: sanitizeTalentReportRecord(updated),
      snapshotVersion: plan.snapshotVersion,
    };
  });
}

/** 补发预览：仅已发布且有新增册；无新增册 → 409。 */
export interface TalentReportReissuePreviewResult {
  reportId: string;
  reportNo: string;
  status: string;
  statusLabel: string;
  snapshotVersion: number;
  externalBooksText: string;
  publishedBooksText: string;
  newBooksText: string;
  newVolumes: Array<{
    volumeId: string;
    bookCode: string;
    name: string;
    chapterCount: number;
    factorCount: number;
  }>;
  rules: string;
}

/** 补发规则固定文案（spec §6.4）。 */
export const TALENT_REPORT_REISSUE_RULES =
  "补发只追加新增册；原分册章节与要素不变；写版本历史与操作日志。";

export async function buildTalentReportReissuePreview(
  pb: PocketBase,
  reportId: unknown,
): Promise<TalentReportReissuePreviewResult> {
  const report = await getTalentReportOrThrow(pb, reportId);
  assertTalentReportWritable(report);
  if (String(report.status) !== "published")
    throw conflictTalentReport("仅已发布报告可补发新增分册");
  const geneReport = await loadTalentReportGeneReport(pb, report);
  if (!geneReport) throw conflictTalentReport("基因报告不存在，无法补发");
  const externalBooks = normalizeTalentReportBookCodes(geneReport.books);
  const newBooks = computeTalentReportNewBooks(externalBooks, report.openVolumeIds);
  if (newBooks.length === 0) throw conflictTalentReport("当前没有新增分册");
  const newVolumeIds = computeTalentReportNewVolumeIds(
    externalBooks,
    report.openVolumeIds,
  );
  const chapterSummary = new Map(
    summarizeTalentGeneReportChapters(geneReport).map((item) => [
      String(item.bookCode),
      item,
    ]),
  );
  return {
    reportId: String(report.id ?? ""),
    reportNo: String(report.reportNo ?? ""),
    status: String(report.status ?? ""),
    statusLabel: talentReportStatusLabel(report.status),
    snapshotVersion: Number(report.snapshotVersion ?? 0) || 0,
    externalBooksText: externalBooks.join(""),
    publishedBooksText: resolveTalentReportOpenBookCodes(report.openVolumeIds).join(""),
    newBooksText: newBooks.join(""),
    newVolumes: newVolumeIds.map((volumeId) => {
      const definition = getTalentReportVolumeDefinition(volumeId)!;
      const summary = chapterSummary.get(String(definition.bookCode));
      return {
        volumeId,
        bookCode: definition.bookCode,
        name: definition.name,
        chapterCount: Number(summary?.chapterCount ?? 0) || 0,
        factorCount: Number(summary?.factorCount ?? 0) || 0,
      };
    }),
    rules: TALENT_REPORT_REISSUE_RULES,
  };
}

/** 补发：只追加新增册，snapshotVersion +1，写 reissue 版本。 */
export async function reissueTalentReport(
  pb: PocketBase,
  reportId: unknown,
  actor: TalentReportWriteActor = {},
): Promise<TalentReportActionResponse> {
  const id = String(reportId ?? "").trim();
  return withTalentReportLock(`report:${id}`, async () => {
    const report = await getTalentReportOrThrow(pb, id);
    assertTalentReportWritable(report);
    if (String(report.status) !== "published")
      throw conflictTalentReport("仅已发布报告可补发新增分册");
    const geneReport = await loadTalentReportGeneReport(pb, report);
    if (!geneReport) throw conflictTalentReport("基因报告不存在，无法补发");
    const rules = await loadTalentReportSnapshotRules(pb);
    const plan = planTalentReportReissue({
      report,
      geneReport,
      rules,
      operatorId: actor.userId,
      operatorName: actor.userName,
      now: actor.now,
    });
    const updated = await updateTalentReportRecord(pb, id, {
      status: plan.status,
      openVolumeIds: plan.openVolumeIds,
      factorSnapshot: plan.factorSnapshot,
      volumeSnapshot: plan.volumeSnapshot,
      directionSnapshot: plan.directionSnapshot,
      factorCount: plan.factorCount,
      totalItems: plan.totalItems,
      snapshotVersion: plan.snapshotVersion,
      snapshotAt: plan.snapshotAt,
      versions: plan.versions,
    });
    return {
      report: sanitizeTalentReportRecord(updated),
      snapshotVersion: plan.snapshotVersion,
      addedBooks: [...plan.addedBooks],
      addedVolumeIds: [...plan.addedVolumeIds],
      warnings: plan.warnings,
    };
  });
}

/** 显式重算：published / retracted 均可，snapshotVersion +1，写 regenerate 版本。 */
export async function regenerateTalentReportSnapshot(
  pb: PocketBase,
  reportId: unknown,
  body: { regenerateFactorNotes?: boolean } = {},
  actor: TalentReportWriteActor = {},
): Promise<TalentReportActionResponse> {
  const id = String(reportId ?? "").trim();
  return withTalentReportLock(`report:${id}`, async () => {
    const report = await getTalentReportOrThrow(pb, id);
    assertTalentReportWritable(report);
    const rules = await loadTalentReportSnapshotRules(pb);
    const plan = planTalentReportRegenerate({
      report,
      rules,
      regenerateFactorNotes: body.regenerateFactorNotes,
      operatorId: actor.userId,
      operatorName: actor.userName,
      now: actor.now,
    });
    const updated = await updateTalentReportRecord(pb, id, {
      factorSnapshot: plan.factorSnapshot,
      volumeSnapshot: plan.volumeSnapshot,
      directionSnapshot: plan.directionSnapshot,
      factorCount: plan.factorCount,
      totalItems: plan.totalItems,
      snapshotVersion: plan.snapshotVersion,
      snapshotAt: plan.snapshotAt,
      versions: plan.versions,
    });
    return {
      report: sanitizeTalentReportRecord(updated),
      snapshotVersion: plan.snapshotVersion,
      regeneratedAt: plan.snapshotAt,
      warnings: plan.warnings,
    };
  });
}

// ── 方向预览（spec §5.2 #11）：冻结 vs 当前 + diff，不落库 ────────────────────

export interface TalentReportDirectionPreviewResult {
  reportId: string;
  reportNo: string;
  status: string;
  statusLabel: string;
  snapshotVersion: number;
  configChanged: boolean;
  frozen: TalentReportDirectionSummary[];
  current: TalentReportDirectionSummary[];
  diff: TalentReportMatchingDiffItem[];
}

export async function buildTalentReportDirectionPreview(
  pb: PocketBase,
  reportId: unknown,
): Promise<TalentReportDirectionPreviewResult> {
  const report = await getTalentReportOrThrow(pb, reportId);
  const rules = await loadTalentReportSnapshotRules(pb);
  const matching = buildTalentReportMatchingTab(report, rules);
  return {
    reportId: String(report.id ?? ""),
    reportNo: String(report.reportNo ?? ""),
    status: String(report.status ?? ""),
    statusLabel: talentReportStatusLabel(report.status),
    snapshotVersion: Number(report.snapshotVersion ?? 0) || 0,
    configChanged: matching.configChanged,
    frozen: matching.frozen ?? [],
    current: matching.current ?? [],
    diff: matching.diff,
  };
}

// ── 基因报告元数据（spec §5.4.8） ──────────────────────────────────────────

export interface TalentGeneReportDetailResult {
  geneReport: TalentGeneReportView & {
    chapters: Array<{
      bookCode: string;
      name: string;
      chapterCount: number;
      factorCount: number;
    }>;
  };
}

export async function loadTalentGeneReportDetail(
  pb: PocketBase,
  geneReportId: unknown,
): Promise<TalentGeneReportDetailResult> {
  const geneReport = await getTalentGeneReportOrThrow(pb, geneReportId);
  const base = sanitizeTalentGeneReportRecord(geneReport);
  return {
    geneReport: {
      ...base,
      chapters: summarizeTalentGeneReportChapters(geneReport).map((item) => ({
        bookCode: String(item.bookCode),
        name: String(item.name),
        chapterCount: Number(item.chapterCount) || 0,
        factorCount: Number(item.factorCount) || 0,
      })),
    },
  };
}

// ── 一键同步（spec §5.2 #12 / §4.2） ───────────────────────────────────────

export interface TalentReportSyncRunOptions {
  source?: TalentGeneReportSource;
  store?: TalentReportSyncStore;
  now?: Date;
  operatorId?: string;
  /** 触发来源（写入同步日志；M8 入站为 webhook）。 */
  trigger?: "manual" | "auto" | "webhook";
}

/** 预演：只读外部 + 内存分类，不写任何集合 / 日志（零写入）。 */
export async function previewTalentReportsSync(
  options: TalentReportSyncRunOptions = {},
) {
  return previewTalentReportSync(options);
}

/** 提交：全局串行（第二个并发 commit → 409）、重新拉取、写同步日志与三类计数。 */
export async function commitTalentReportsSync(
  input: { previewCounts?: Partial<TalentReportSyncPreviewCounts> } = {},
  options: TalentReportSyncRunOptions = {},
) {
  const previewCounts = input.previewCounts
    ? {
        refreshed: Number(input.previewCounts.refreshed ?? 0) || 0,
        created: Number(input.previewCounts.created ?? 0) || 0,
        empty: Number(input.previewCounts.empty ?? 0) || 0,
        failed: Number(input.previewCounts.failed ?? 0) || 0,
      }
    : undefined;
  return commitTalentReportSync({ ...options, previewCounts });
}

// ── 同步日志（spec §5.4.7） ────────────────────────────────────────────────

export interface TalentReportSyncLogRow {
  id: string;
  at: string;
  status: string;
  statusLabel: string;
  refreshed: number;
  created: number;
  empty: number;
  failedCount: number;
  durationMs: number;
  operatorName: string;
}

const TALENT_SYNC_STATUS_LABELS: Readonly<Record<string, string>> = {
  success: "成功",
  partial: "部分成功",
  failed: "失败",
};

/** 最近 20 次一键同步记录（`syncScope="gene_report"`，旧第三方同步日志不混入）。 */
export async function listTalentReportSyncLogs(
  pb: PocketBase,
  limit: number = TALENT_REPORT_SYNC_LOG_LIMIT,
): Promise<{ rows: TalentReportSyncLogRow[] }> {
  const page = await pb.collection(TALENT_SYNC_LOG_COLLECTION).getList<{
    id: string;
    created: string;
    createdCount?: number;
    finishedAt?: string;
    status?: string;
    durationMs?: number;
    refreshed?: number;
    empty?: number;
    failedCount?: number;
    operatorId?: string;
    /** 同步日志 details JSON：`{ counts }` 是三类计数的权威副本。 */
    details?: { counts?: Record<string, number> } | null;
  }>(1, Math.min(TALENT_REPORT_SYNC_LOG_LIMIT, Math.max(1, limit)), {
    filter: 'syncScope = "gene_report"',
    sort: "-created",
    $autoCancel: false,
  });
  const operatorIds = [
    ...new Set(page.items.map((row) => String(row.operatorId ?? "")).filter(Boolean)),
  ];
  const operators = await listTalentRecordsByIds<{
    id: string;
    displayName?: string;
    username?: string;
    email?: string;
  }>(pb, "users", operatorIds);
  const operatorById = new Map(
    operators.map((row) => [
      String(row.id),
      String(row.displayName || row.username || row.email || ""),
    ]),
  );
  return {
    rows: page.items.map((row) => {
      const status = String(row.status ?? "");
      // 旧集合系统字段 `created` 是时间字符串，计数以 details.counts 为权威副本。
      const counts = row.details?.counts ?? {};
      return {
        id: String(row.id ?? ""),
        at: String(row.finishedAt ?? row.created ?? ""),
        status,
        statusLabel: TALENT_SYNC_STATUS_LABELS[status] ?? "未知",
        refreshed: Number(row.refreshed ?? counts.refreshed ?? 0) || 0,
        created: Number(row.createdCount ?? counts.created ?? 0) || 0,
        empty: Number(row.empty ?? counts.empty ?? 0) || 0,
        failedCount: Number(row.failedCount ?? counts.failed ?? 0) || 0,
        durationMs: Number(row.durationMs ?? 0) || 0,
        operatorName: operatorById.get(String(row.operatorId ?? "")) ?? "",
      };
    }),
  };
}

// ── 14 条 admin 路由清单（spec §5.2；测试与文档的唯一事实来源） ─────────────────────

/** M3 报告域权威 4 个权限码（ADR 0003-D7）。 */
export const TALENT_REPORT_PERMISSION_CODES = [
  "talent:report:list",
  "talent:report:view",
  "talent:report:sync",
  "talent:report:publish",
] as const;

export interface TalentReportRouteDefinition {
  method: "GET" | "POST";
  /** spec §5.2 路径（以 `/api/admin/talent` 开头）。 */
  path: string;
  /** requirePermission 使用的权限码。 */
  permission: (typeof TALENT_REPORT_PERMISSION_CODES)[number];
  /** 是否写库；写动作要求 withOperLog（sync 的 audit 仅 commit 分支）。 */
  write: boolean;
  /** 相对 `server/api/admin/talent/` 的路由文件。 */
  file: string;
  /** 聚合路由文件里的动作键（`[action].get.ts` / `[action].post.ts`）；静态路由为空。 */
  action?: string;
}

/**
 * spec §5.2 的 14 条管理路由。
 * 说明：10 条 `/:id/<action>` 端点按「HTTP 方法」聚合在 `[id]/[action].get.ts` / `.post.ts` 两个文件，
 * HTTP 路径 / 方法 / 权限码 / 响应与 spec 逐条一致；聚合原因见路由文件头注释（Nitro 嵌套动态段的
 * `$fetch` 路由类型深度上限）。静态段（`sync` / `sync-logs`）仍为独立文件，保证 §5.6 的静态优先。
 */
export const TALENT_REPORT_ADMIN_ROUTES: readonly TalentReportRouteDefinition[] = [
  {
    method: "GET",
    path: "/api/admin/talent/reports",
    permission: "talent:report:list",
    write: false,
    file: "reports/index.get.ts",
  },
  {
    method: "GET",
    path: "/api/admin/talent/reports/:id",
    permission: "talent:report:view",
    write: false,
    file: "reports/[id].get.ts",
  },
  {
    method: "GET",
    path: "/api/admin/talent/reports/:id/volumes/:volumeId",
    permission: "talent:report:view",
    write: false,
    file: "reports/[id]/volumes/[volumeId].get.ts",
  },
  {
    method: "GET",
    path: "/api/admin/talent/reports/:id/publish-preview",
    permission: "talent:report:view",
    write: false,
    file: "reports/[id]/[action].get.ts",
    action: "publish-preview",
  },
  {
    method: "POST",
    path: "/api/admin/talent/reports/:id/publish",
    permission: "talent:report:publish",
    write: true,
    file: "reports/[id]/[action].post.ts",
    action: "publish",
  },
  {
    method: "POST",
    path: "/api/admin/talent/reports/:id/withdraw",
    permission: "talent:report:publish",
    write: true,
    file: "reports/[id]/[action].post.ts",
    action: "withdraw",
  },
  {
    method: "POST",
    path: "/api/admin/talent/reports/:id/restore",
    permission: "talent:report:publish",
    write: true,
    file: "reports/[id]/[action].post.ts",
    action: "restore",
  },
  {
    method: "GET",
    path: "/api/admin/talent/reports/:id/reissue-preview",
    permission: "talent:report:view",
    write: false,
    file: "reports/[id]/[action].get.ts",
    action: "reissue-preview",
  },
  {
    method: "POST",
    path: "/api/admin/talent/reports/:id/publish-new",
    permission: "talent:report:publish",
    write: true,
    file: "reports/[id]/[action].post.ts",
    action: "publish-new",
  },
  {
    method: "POST",
    path: "/api/admin/talent/reports/:id/regenerate-snapshot",
    permission: "talent:report:publish",
    write: true,
    file: "reports/[id]/[action].post.ts",
    action: "regenerate-snapshot",
  },
  {
    method: "GET",
    path: "/api/admin/talent/reports/:id/direction-preview",
    permission: "talent:report:view",
    write: false,
    file: "reports/[id]/[action].get.ts",
    action: "direction-preview",
  },
  {
    method: "POST",
    path: "/api/admin/talent/reports/sync",
    permission: "talent:report:sync",
    write: true,
    file: "reports/sync.post.ts",
  },
  {
    method: "GET",
    path: "/api/admin/talent/reports/sync-logs",
    permission: "talent:report:sync",
    write: false,
    file: "reports/sync-logs.get.ts",
  },
  {
    method: "GET",
    path: "/api/admin/talent/gene-reports/:id",
    permission: "talent:report:view",
    write: false,
    file: "gene-reports/[id].get.ts",
  },
];

// ── 路由参数解析（Nitro 静态路径无匹配方法时可能回落到 `[id].get` 且不注入 params） ────

interface TalentReportRouteEventLike {
  path?: string;
  context?: { params?: Record<string, string | undefined> };
}

/** 从 event.path 解析路由段（去 query、URL 解码）。 */
export function talentReportRouteSegments(
  event: TalentReportRouteEventLike,
): string[] {
  const path = String(event?.path ?? "").split("?")[0] ?? "";
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    });
}

/** 取路由参数；Nitro 回落到 1 段动态路由时 params 可能缺失，用 path 末段兜底。 */
export function resolveTalentReportRouteId(
  event: TalentReportRouteEventLike,
  paramName = "id",
): string {
  const param = String(event?.context?.params?.[paramName] ?? "").trim();
  if (param) return param;
  const segments = talentReportRouteSegments(event);
  return String(segments.at(-1) ?? "").trim();
}

/** 取 `[action]` 段：优先 router param，缺失时用 path 末段兜底。 */
export function resolveTalentReportRouteAction(
  event: TalentReportRouteEventLike,
): string {
  const param = String(event?.context?.params?.action ?? "").trim();
  if (param) return param;
  const segments = talentReportRouteSegments(event);
  return String(segments.at(-1) ?? "").trim();
}

/** 取 `volumes/[volumeId]` 末段。 */
export function resolveTalentReportRouteVolumeId(
  event: TalentReportRouteEventLike,
): string {
  const param = String(event?.context?.params?.volumeId ?? "").trim();
  if (param) return param;
  const segments = talentReportRouteSegments(event);
  return String(segments.at(-1) ?? "").trim();
}

// ── 静态段优先：保留路径守卫（`sync` / `sync-logs` 只有 POST / GET 专用路由） ──────────

/** `GET /reports/sync` 不得被 `[id].get.ts` 当成报告详情：返回 405 语义（spec §5.6-6）。 */
export function assertTalentReportDetailSegment(segment: unknown): string {
  const id = String(segment ?? "").trim();
  if (!id) throw notFoundTalentReport();
  if (id === "sync" || id === "sync-logs")
    throw createMethodNotAllowedError(`/api/admin/talent/reports/${id}`);
  return id;
}

function createMethodNotAllowedError(path: string) {
  return createError({ statusCode: 405, message: `请求方法不支持：${path}` });
}