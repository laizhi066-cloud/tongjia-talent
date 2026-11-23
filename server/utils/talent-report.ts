/**
 * @description M3 报告域服务端落库与映射封装（M3-A 只交付纯函数计划，本文件补齐 PB 读写）：
 *   M1 规则只读加载 → `TalentReportSnapshotRules`、报告 / 基因报告 sanitize（不含明文/密文/hash）、
 *   报告与基因报告读取 404、`recordTalentReportVersion` 的 PB 落库（M4 调用的唯一版本写入口）、
 *   以及 C 端只读契约（`assertTalentReportPublished` / `getTalentReportClientSnapshot` /
 *   `listTalentReportOpenVolumes`，M7 消费，M3 只冻结守卫）。
 *   口径见 docs/specs/M3-reports/spec.md §3.2.5/§4.4/§5.5/§7、ADR 0003-D1/D5/D7。
 * @file server/utils/talent-report.ts
 */
import { createError } from "h3";
import type PocketBase from "pocketbase";
import type {
  TalentDirection,
  TalentFactor,
  TalentFactorNote,
  TalentLevel,
  TalentTier,
} from "~~/shared/types/talent-rule";
import type { TalentDirectionSnapshot } from "~~/shared/types/talent-direction";
import {
  TALENT_REPORT_STATUS_LABELS,
  type TalentGeneReportRecord,
  type TalentGeneReportSourceKind,
  type TalentReportRecord,
  type TalentReportSnapshotRules,
  type TalentReportStatus,
  type TalentReportVersionEntry,
} from "~~/shared/types/talent-report";
import { escapeFilterValue } from "./pocketbase-client";
import { withTalentReportLock } from "./talent-report-lock";
import {
  conflictTalentReport,
  getTalentReportVolumeDefinition,
  normalizeTalentReportBookCodes,
  normalizeTalentReportVolumeIds,
  notFoundTalentReport,
  resolveTalentReportOpenBookCodes,
  planRecordTalentReportVersion,
} from "./talent-report-snapshot";

/** 集合名常量（避免散落字符串）。 */
export const TALENT_REPORT_COLLECTION = "talent_reports";
export const TALENT_GENE_REPORT_COLLECTION = "talent_gene_reports";
export const TALENT_SYNC_LOG_COLLECTION = "talent_sync_logs";

/** 基因报告来源展示名（详情 / 元数据弹层）。 */
export const TALENT_GENE_REPORT_SOURCE_LABELS: Readonly<
  Record<TalentGeneReportSourceKind, string>
> = {
  mock: "模拟数据",
  external: "外部接口",
};

/** 报告状态展示名（旧行 `error` 兜底为「异常」，M3 不写该状态）。 */
export function talentReportStatusLabel(status: unknown): string {
  const key = String(status ?? "") as keyof typeof TALENT_REPORT_STATUS_LABELS;
  return TALENT_REPORT_STATUS_LABELS[key] ?? "未知";
}

/** 性别展示名。 */
export function talentReportGenderLabel(gender: unknown): string {
  return String(gender ?? "") === "male" ? "男" : "女";
}

// ── M1 规则只读加载：不写 M1 集合，只构造快照构建 / 方向命中所需的只读视图 ─────────

/**
 * 读取 M1 规则（潜质要素 / 分级 / 固定注解 / 培养方向 / 目标档位）并映射为
 * `TalentReportSnapshotRules`。只读、不修改 M1 集合；快照构建与方向命中一律走纯函数。
 */
export async function loadTalentReportSnapshotRules(
  pb: PocketBase,
): Promise<TalentReportSnapshotRules> {
  const [factorRows, levelRows, noteRows, directionRows, tierRows] =
    await Promise.all([
      pb.collection("talent_factors").getFullList<TalentFactor>({
        fields: "code,name,category,categoryName",
        $autoCancel: false,
      }),
      pb.collection("talent_levels").getFullList<TalentLevel>({
        fields: "code,name,sortOrder,status",
        $autoCancel: false,
      }),
      pb.collection("talent_factor_notes").getFullList<TalentFactorNote>({
        fields: "factorCode,levelCode,note,status",
        $autoCancel: false,
      }),
      pb.collection("talent_directions").getFullList<TalentDirection>({
        // PocketBase 的 `fields` 只返回显式列出的字段；方向 / 档位 id 是
        // directionSnapshot.directionId / tierIds 的主键，必须显式带回（M4 命中/选择依赖）。
        fields:
          "id,code,name,description,icon,requirements,tierIds,defaultTierId,version,status",
        $autoCancel: false,
      }),
      pb.collection("talent_tiers").getFullList<TalentTier>({
        fields:
          "id,code,name,sortOrder,teacher,freq,headline,description,isDefault,preset,status",
        $autoCancel: false,
      }),
    ]);

  // 同一要素编码可能存在于多个分库：按编码去重，保留首个非空名称（与快照纯函数索引口径一致）。
  const factorByCode = new Map<string, TalentReportSnapshotRules["factors"][number]>();
  for (const factor of factorRows) {
    const code = String(factor?.code ?? "").trim();
    if (!code) continue;
    const name = String(factor?.name ?? "").trim();
    const existing = factorByCode.get(code);
    if (existing && existing.name !== "") continue;
    factorByCode.set(code, {
      code,
      name,
      category: String(factor?.category ?? "").trim(),
      categoryName: String(factor?.categoryName ?? "").trim(),
    });
  }

  return {
    factors: [...factorByCode.values()],
    levels: levelRows
      .filter((level) => String(level?.code ?? "").trim() !== "")
      .map((level) => ({
        code: String(level.code).trim(),
        name: String(level.name ?? "").trim(),
        sortOrder: Number(level.sortOrder ?? 0) || 0,
        status: String(level.status ?? "1"),
      })),
    notes: noteRows
      .filter(
        (note) =>
          String(note?.factorCode ?? "").trim() !== "" &&
          String(note?.levelCode ?? "").trim() !== "",
      )
      .map((note) => ({
        factorCode: String(note.factorCode).trim(),
        levelCode: String(note.levelCode).trim(),
        note: String(note.note ?? ""),
        status: String(note.status ?? "1"),
      })),
    directions: directionRows
      .filter((direction) => String(direction?.code ?? "").trim() !== "")
      .map((direction) => ({
        id: String(direction.id ?? ""),
        code: String(direction.code).trim(),
        name: String(direction.name ?? "").trim(),
        status: String(direction.status ?? "1"),
        version: Number(direction.version ?? 1) || 1,
        requirements: (Array.isArray(direction.requirements)
          ? direction.requirements
          : []
        )
          .filter((item) => String(item?.code ?? "").trim() !== "")
          .map((item) => ({
            code: String(item.code).trim(),
            level: String(item.level ?? "").trim(),
          })),
        tierIds: (Array.isArray(direction.tierIds) ? direction.tierIds : []).map(
          (tierId) => String(tierId ?? ""),
        ),
        defaultTierId: String(direction.defaultTierId ?? ""),
        icon: String(direction.icon ?? ""),
        description: String(direction.description ?? ""),
      })),
    tiers: tierRows.map((tier) => ({
      id: String(tier.id ?? ""),
      code: String(tier.code ?? "").trim(),
      name: String(tier.name ?? "").trim(),
      sortOrder: Number(tier.sortOrder ?? 0) || 0,
      teacher: String(tier.teacher ?? ""),
      freq: String(tier.freq ?? ""),
      headline: String(tier.headline ?? ""),
      description: String(tier.description ?? ""),
      status: String(tier.status ?? "1"),
      isDefault: tier.isDefault === true,
      preset: tier.preset === true,
    })),
  };
}

/** 启用档位（发布预览 `tierCount`、发布快照）。 */
export function countEnabledTalentReportTiers(
  rules: TalentReportSnapshotRules,
): number {
  return rules.tiers.filter((tier) => String(tier.status) !== "0").length;
}

// ── 读取：404 兜底 + 只读 M3 新行（旧行 subjectType="" 不出现在新页 / 新接口） ──────

/** 读取报告；不存在 / 旧报告域行（`subjectType=""`）统一 404「报告不存在」。 */
export async function getTalentReportOrThrow(
  pb: PocketBase,
  reportId: unknown,
): Promise<TalentReportRecord> {
  const id = String(reportId ?? "").trim();
  if (!id) throw notFoundTalentReport();
  let record: TalentReportRecord | null = null;
  try {
    record = await pb
      .collection(TALENT_REPORT_COLLECTION)
      .getOne<TalentReportRecord>(id, { $autoCancel: false });
  } catch {
    record = null;
  }
  if (!record || String(record.subjectType ?? "").trim() === "")
    throw notFoundTalentReport();
  return record;
}

/** 读取基因报告；不存在 404「基因报告不存在」。 */
export async function getTalentGeneReportOrThrow(
  pb: PocketBase,
  geneReportId: unknown,
): Promise<TalentGeneReportRecord> {
  const id = String(geneReportId ?? "").trim();
  if (!id) throw notFoundTalentReport("基因报告不存在");
  let record: TalentGeneReportRecord | null = null;
  try {
    record = await pb
      .collection(TALENT_GENE_REPORT_COLLECTION)
      .getOne<TalentGeneReportRecord>(id, { $autoCancel: false });
  } catch {
    record = null;
  }
  if (!record) throw notFoundTalentReport("基因报告不存在");
  return record;
}

/** 报告关联的基因报告（`geneReportId` 为空时按 subject 唯一键兜底）。 */
export async function loadTalentReportGeneReport(
  pb: PocketBase,
  report: TalentReportRecord,
): Promise<TalentGeneReportRecord | null> {
  const geneReportId = String(report.geneReportId ?? "").trim();
  if (geneReportId) {
    try {
      return await pb
        .collection(TALENT_GENE_REPORT_COLLECTION)
        .getOne<TalentGeneReportRecord>(geneReportId, { $autoCancel: false });
    } catch {
      // 关联失效时按唯一键兜底（防御历史脏数据）。
    }
  }
  const subjectType = String(report.subjectType ?? "").trim();
  const subjectId = String(report.subjectId ?? "").trim();
  if (!subjectType || !subjectId) return null;
  try {
    return await pb
      .collection(TALENT_GENE_REPORT_COLLECTION)
      .getFirstListItem<TalentGeneReportRecord>(
        `subjectType = "${subjectType}" && subjectId = "${escapeFilterValue(subjectId)}"`,
        { $autoCancel: false },
      );
  } catch {
    return null;
  }
}

// ── 响应映射：只返回脱敏 / 冻结字段，不返回内部快照、密文、哈希与外部原始报文 ────────

/** 报告基础视图（详情信息条 / 写动作响应；不含 factor/volume/direction 快照全量）。 */
export interface TalentReportView {
  id: string;
  created: string;
  updated: string;
  reportNo: string;
  status: TalentReportStatus | "error" | string;
  statusLabel: string;
  snapshotVersion: number;
  snapshotAt: string;
  publishedAt: string;
  withdrawnAt: string;
  restoredAt: string;
  queriedAt: string;
  factorCount: number;
  openVolumeIds: string[];
  openBooksText: string;
  subjectType: string;
  subjectId: string;
  parentId: string;
  geneReportId: string;
  versions: TalentReportVersionEntry[];
  selections: unknown[];
}

/**
 * 报告记录 → 基础视图。快照三件套体积大且只在详情页签 / 单册叠加层按需读取，
 * 这里一律不返回；`versions` / `selections` 是详情页签与 C 端契约所需的小体量数据。
 */
export function sanitizeTalentReportRecord(
  record: TalentReportRecord,
): TalentReportView {
  return {
    id: String(record.id ?? ""),
    created: String(record.created ?? ""),
    updated: String(record.updated ?? ""),
    reportNo: String(record.reportNo ?? ""),
    status: String(record.status ?? ""),
    statusLabel: talentReportStatusLabel(record.status),
    snapshotVersion: Number(record.snapshotVersion ?? 0) || 0,
    snapshotAt: String(record.snapshotAt ?? ""),
    publishedAt: String(record.publishedAt ?? ""),
    withdrawnAt: String(record.withdrawnAt ?? ""),
    restoredAt: String(record.restoredAt ?? ""),
    queriedAt: String(record.queriedAt ?? ""),
    factorCount: Number(record.factorCount ?? 0) || 0,
    openVolumeIds: normalizeTalentReportVolumeIds(record.openVolumeIds),
    openBooksText: resolveTalentReportOpenBookCodes(record.openVolumeIds).join(""),
    subjectType: String(record.subjectType ?? ""),
    subjectId: String(record.subjectId ?? ""),
    parentId: String(record.parentId ?? ""),
    geneReportId: String(record.geneReportId ?? ""),
    versions: Array.isArray(record.versions)
      ? record.versions.map((entry) => ({
          version: Number(entry?.version ?? 0) || 0,
          type: entry?.type,
          summary: String(entry?.summary ?? ""),
          ...(Array.isArray(entry?.books) ? { books: [...entry.books] } : {}),
          operatorId: String(entry?.operatorId ?? ""),
          operatorName: String(entry?.operatorName ?? ""),
          at: String(entry?.at ?? ""),
        }))
      : [],
    selections: Array.isArray(record.selections)
      ? structuredClone(record.selections)
      : [],
  };
}

/** 基因报告元数据视图（不含 `sections` 全量、不含 `idNoHash`）。 */
export interface TalentGeneReportView {
  id: string;
  created: string;
  updated: string;
  reportNo: string;
  name: string;
  gender: string;
  genderLabel: string;
  birthday: string;
  age: number;
  maskedIdNo: string;
  issuer: string;
  filedAt: string;
  syncedAt: string;
  source: string;
  sourceLabel: string;
  version: string;
  booksText: string;
  sectionCount: number;
}

export function sanitizeTalentGeneReportRecord(
  record: TalentGeneReportRecord,
): TalentGeneReportView {
  const source = String(record.source ?? "") as TalentGeneReportSourceKind;
  return {
    id: String(record.id ?? ""),
    created: String(record.created ?? ""),
    updated: String(record.updated ?? ""),
    reportNo: String(record.reportNo ?? ""),
    name: String(record.name ?? ""),
    gender: String(record.gender ?? ""),
    genderLabel: talentReportGenderLabel(record.gender),
    birthday: String(record.birthday ?? ""),
    age: Number(record.age ?? 0) || 0,
    maskedIdNo: String(record.maskedIdNo ?? ""),
    issuer: String(record.issuer ?? ""),
    filedAt: String(record.filedAt ?? ""),
    syncedAt: String(record.syncedAt ?? ""),
    source: String(record.source ?? ""),
    sourceLabel: TALENT_GENE_REPORT_SOURCE_LABELS[source] ?? "",
    version: String(record.version ?? ""),
    booksText: normalizeTalentReportBookCodes(record.books).join(""),
    sectionCount:
      Number(record.sectionCount ?? 0) ||
      (Array.isArray(record.sections) ? record.sections.length : 0),
  };
}

// ── 版本链落库（M4 调用的唯一入口；只追加、不改 snapshotVersion） ──────────────────

export interface RecordTalentReportVersionInput {
  summary: string;
  operatorId?: string;
  operatorName?: string;
  now?: Date;
}

/**
 * `recordTalentReportVersion`：方向选择 / 换档 / 取消时由 M4 调用。
 * 纯函数产出计划 → 在 `report:<id>` 锁内只写 `versions`，不改快照与 `snapshotVersion`。
 * 状态前置：仅已发布报告可追加选择版本（`pending_publish` / `retracted` → 409）。
 */
export async function recordTalentReportVersion(
  pb: PocketBase,
  reportId: unknown,
  input: RecordTalentReportVersionInput,
): Promise<TalentReportRecord> {
  const id = String(reportId ?? "").trim();
  return withTalentReportLock(`report:${id}`, async () => {
    const report = await getTalentReportOrThrow(pb, id);
    const plan = planRecordTalentReportVersion({
      report,
      summary: String(input.summary ?? ""),
      operatorId: input.operatorId,
      operatorName: input.operatorName,
      now: input.now,
    });
    return pb.collection(TALENT_REPORT_COLLECTION).update<TalentReportRecord>(
      id,
      { versions: plan.versions },
      { $autoCancel: false },
    );
  });
}

// ── C 端只读契约（M3 冻结，M7 实现路由与页面） ─────────────────────────────────

/** 已发布校验：未发布 / 已撤回 → 409 且带 `state`，便于 C 端展示对应文案。 */
export function assertTalentReportPublished(
  report: Pick<TalentReportRecord, "status">,
): void {
  const status = String(report.status ?? "");
  if (status === "published") return;
  if (status === "retracted") {
    throw createReportStateError(
      "report_retracted",
      "retracted",
      "报告内容更新中",
    );
  }
  if (status === "pending_publish") {
    throw createReportStateError(
      "report_pending",
      "pending_publish",
      "报告正在整理中",
    );
  }
  throw notFoundTalentReport();
}

function createReportStateError(code: string, state: string, message: string) {
  return createError({
    statusCode: 409,
    message,
    data: { code, state },
  });
}

/** C 端总览快照：开放分册 + 方向命中 + 已选方向（不重算、不返回 factorSnapshot 全量）。 */
export function getTalentReportClientSnapshot(
  report: TalentReportRecord,
): {
  reportId: string;
  reportNo: string;
  snapshotVersion: number;
  publishedAt: string;
  openVolumeIds: string[];
  openBooksText: string;
  volumes: Array<{
    volumeId: string;
    bookCode: string;
    name: string;
    chapterCount: number;
    factorCount: number;
  }>;
  directionSnapshot: TalentDirectionSnapshot | null;
  selections: unknown[];
} {
  const volumes = listTalentReportOpenVolumes(report);
  return {
    reportId: String(report.id ?? ""),
    reportNo: String(report.reportNo ?? ""),
    snapshotVersion: Number(report.snapshotVersion ?? 0) || 0,
    publishedAt: String(report.publishedAt ?? ""),
    openVolumeIds: normalizeTalentReportVolumeIds(report.openVolumeIds),
    openBooksText: resolveTalentReportOpenBookCodes(report.openVolumeIds).join(""),
    volumes,
    directionSnapshot:
      report.directionSnapshot && Array.isArray(report.directionSnapshot.directions)
        ? structuredClone(report.directionSnapshot)
        : null,
    selections: Array.isArray(report.selections)
      ? structuredClone(report.selections)
      : [],
  };
}

/** C 端可读开放册（`open=true` 且要素非空）。 */
export function listTalentReportOpenVolumes(
  report: TalentReportRecord,
): Array<{
  volumeId: string;
  bookCode: string;
  name: string;
  chapterCount: number;
  factorCount: number;
}> {
  const openSet = new Set(normalizeTalentReportVolumeIds(report.openVolumeIds));
  const volumes = Array.isArray(report.volumeSnapshot)
    ? report.volumeSnapshot
    : [];
  return volumes
    .filter((volume) => volume && openSet.has(volume.volumeId))
    .sort(
      (left, right) =>
        (getTalentReportVolumeDefinition(left.volumeId)?.sortOrder ?? 0) -
        (getTalentReportVolumeDefinition(right.volumeId)?.sortOrder ?? 0),
    )
    .map((volume) => ({
      volumeId: String(volume.volumeId ?? ""),
      bookCode: String(volume.bookCode ?? ""),
      name: String(volume.name ?? ""),
      chapterCount: Number(volume.chapterCount ?? 0) || 0,
      factorCount: Number(volume.factorCount ?? 0) || 0,
    }));
}

// ── 状态动作公共断言：只允许三态新行参与写动作（旧 `error` 行拒绝） ─────────────────

/** 写动作前置：报告必须是 M3 三态之一，旧行 `error` / 空状态一律 409。 */
export function assertTalentReportWritable(report: TalentReportRecord): void {
  const status = String(report.status ?? "");
  if (status === "pending_publish" || status === "published" || status === "retracted")
    return;
  throw conflictTalentReport(`当前状态不支持该操作：报告状态为「${talentReportStatusLabel(status)}」`);
}