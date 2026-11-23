/**
 * @description M3 报告域 API：列表 / 详情 / 单册叠加层 / 发布预览与发布 / 撤回 / 恢复 /
 *   补发预览与补发 / 重算快照 / 方向预览 / 一键同步（preview + commit）/ 同步记录 / 基因报告元数据。
 *   页面与页面组件只依赖本 composable，不直接调用 `useApi()` 或 PocketBase（spec §5.5 / §6）。
 * @file app/composables/api/useTalentReportApi.ts
 */
import type {
  TalentReportStatus,
  TalentReportSyncPreview,
  TalentReportSyncPreviewCounts,
  TalentReportSyncResult,
  TalentReportVersionEntry,
} from "~~/shared/types/talent-report";
import type { TalentSelectionItem } from "~~/shared/types/talent-direction";

/** 列表四项筛选 + 状态 + 分页（spec §5.4.1 / §6.1）。 */
export interface TalentReportListQuery {
  page?: number;
  pageSize?: number;
  /** 报告编号，模糊。 */
  reportNo?: string;
  /** 子女姓名，模糊。 */
  childName?: string;
  /** 完整 11 位手机号或后 4 位；其他长度服务端 422。 */
  parentMobile?: string;
  /** 完整 18 位身份证或后 4 位；其他长度服务端 422。 */
  idNo?: string;
  /** 三态之一；空表示全部。 */
  status?: TalentReportStatus | "";
  /** `child` / `self`；M3 默认全部。 */
  subjectType?: "child" | "self" | "";
}

/** 列表行：报告列表 10 列所需数据（spec §5.4.1）。 */
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
  status: TalentReportStatus | string;
  statusLabel: string;
  snapshotVersion: number;
  publishedAt: string;
  updatedAt: string;
  geneReportId: string;
}

/** 列表响应：状态计数不叠加状态筛选（spec §5.4.1）。 */
export interface TalentReportListResult {
  rows: TalentReportListRow[];
  total: number;
  page: number;
  pageSize: number;
  statusCounts: Record<TalentReportStatus, number>;
  statusTotal: number;
}

/** 报告基础视图（详情 / 写动作响应共用；不含快照三件套）。 */
export interface TalentReportView {
  id: string;
  created: string;
  updated: string;
  reportNo: string;
  status: TalentReportStatus | string;
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
  selections: TalentSelectionItem[];
}

/** 基因报告视图（元数据；详情 / 弹层共用）。 */
export interface TalentReportGeneReportView {
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

/** 方向级摘要（冻结快照 / 当前配置，均不含 requirements 明细）。 */
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

/** 冻结快照 vs 当前配置的逐方向 diff。 */
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

/** 「匹配天赋」页签数据。 */
export interface TalentReportMatchingTab {
  frozen: TalentReportDirectionSummary[] | null;
  current: TalentReportDirectionSummary[] | null;
  diff: TalentReportMatchingDiffItem[];
  configChanged: boolean;
}

/** 详情：信息条 + 4 页签（spec §5.4.2）。 */
export interface TalentReportDetail {
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
  geneReport: TalentReportGeneReportView | null;
  tabs: {
    selections: TalentSelectionItem[];
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
    advice: { available: boolean; items: unknown[]; emptyText: string };
  };
}

/** 单册叠加层：章节 + 要素（spec §5.2 #3）。 */
export interface TalentReportVolumeDetail {
  reportId: string;
  reportNo: string;
  volumeId: string;
  bookCode: string;
  name: string;
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

/** 发布预览：六册可开放状态 + 方向命中（spec §5.4.3）。 */
export interface TalentReportPublishPreview {
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

/** 发布 / 撤回 / 恢复 / 补发 / 重算的写响应（spec §5.4.4）。 */
export interface TalentReportActionResponse {
  report: TalentReportView;
  snapshotVersion: number;
  publishedAt?: string;
  regeneratedAt?: string;
  addedBooks?: string[];
  addedVolumeIds?: string[];
  warnings?: string[];
}

/** 补发预览（spec §5.4.5）。 */
export interface TalentReportReissuePreview {
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

/** 方向预览：冻结 vs 当前 + diff（spec §5.2 #11）。 */
export interface TalentReportDirectionPreview {
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

/** 基因报告元数据 + 六册章节 / 要素计数（spec §5.4.8）。 */
export interface TalentGeneReportDetail {
  geneReport: TalentReportGeneReportView & {
    chapters: Array<{
      bookCode: string;
      name: string;
      chapterCount: number;
      factorCount: number;
    }>;
  };
}

/** 一键同步请求体（spec §5.3 #12）。 */
export interface TalentReportSyncInput {
  mode: "preview" | "commit";
  /** commit 时可选：传预演计数用于判断 `changedSincePreview`。 */
  previewCounts?: TalentReportSyncPreviewCounts;
}

/** 最近同步记录行（spec §5.4.7）。 */
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

export function useTalentReportApi() {
  // ── 列表 / 详情 / 单册 ────────────────────────────────────────────────────────
  const listReports = (params: TalentReportListQuery = {}) =>
    useApi<TalentReportListResult>("/api/admin/talent/reports", { params });

  const getReport = (id: string) =>
    useApi<TalentReportDetail>(`/api/admin/talent/reports/${id}`);

  const getReportVolume = (id: string, volumeId: string) =>
    useApi<TalentReportVolumeDetail>(
      `/api/admin/talent/reports/${id}/volumes/${volumeId}`,
    );

  // ── 发布：预览 + 发布（服务端响应 message 直接作为成功提示） ─────────────────────
  const getPublishPreview = (id: string) =>
    useApi<TalentReportPublishPreview>(
      `/api/admin/talent/reports/${id}/publish-preview`,
    );

  const publishReport = (id: string, openVolumeIds: string[]) =>
    useApi<TalentReportActionResponse>(`/api/admin/talent/reports/${id}/publish`, {
      method: "POST",
      body: { openVolumeIds },
      successToast: true,
    });

  // ── 撤回 / 恢复 ──────────────────────────────────────────────────────────────
  const withdrawReport = (id: string, reason = "") =>
    useApi<TalentReportActionResponse>(
      `/api/admin/talent/reports/${id}/withdraw`,
      {
        method: "POST",
        body: reason ? { reason } : {},
        successToast: true,
      },
    );

  const restoreReport = (id: string) =>
    useApi<TalentReportActionResponse>(`/api/admin/talent/reports/${id}/restore`, {
      method: "POST",
      body: {},
      successToast: true,
    });

  // ── 补发：预览 + 补发 ─────────────────────────────────────────────────────────
  const getReissuePreview = (id: string) =>
    useApi<TalentReportReissuePreview>(
      `/api/admin/talent/reports/${id}/reissue-preview`,
    );

  const reissueReport = (id: string) =>
    useApi<TalentReportActionResponse>(
      `/api/admin/talent/reports/${id}/publish-new`,
      { method: "POST", body: {}, successToast: true },
    );

  // ── 重算快照 / 方向预览 ────────────────────────────────────────────────────────
  const regenerateSnapshot = (id: string, regenerateFactorNotes = true) =>
    useApi<TalentReportActionResponse>(
      `/api/admin/talent/reports/${id}/regenerate-snapshot`,
      {
        method: "POST",
        body: { regenerateFactorNotes },
        successToast: true,
      },
    );

  const getDirectionPreview = (id: string) =>
    useApi<TalentReportDirectionPreview>(
      `/api/admin/talent/reports/${id}/direction-preview`,
    );

  // ── 一键同步（preview 只读 / commit 写入） ──────────────────────────────────────
  const syncReports = (body: TalentReportSyncInput) =>
    useApi<TalentReportSyncPreview | TalentReportSyncResult>(
      "/api/admin/talent/reports/sync",
      {
        method: "POST",
        body,
        successToast: body.mode === "commit",
      },
    );

  const listSyncLogs = () =>
    useApi<{ rows: TalentReportSyncLogRow[] }>(
      "/api/admin/talent/reports/sync-logs",
    );

  // ── 基因报告元数据（列表行内「基因报告」按钮） ──────────────────────────────────
  const getGeneReport = (id: string) =>
    useApi<TalentGeneReportDetail>(`/api/admin/talent/gene-reports/${id}`);

  return {
    listReports,
    getReport,
    getReportVolume,
    getPublishPreview,
    publishReport,
    withdrawReport,
    restoreReport,
    getReissuePreview,
    reissueReport,
    regenerateSnapshot,
    getDirectionPreview,
    syncReports,
    listSyncLogs,
    getGeneReport,
  };
}