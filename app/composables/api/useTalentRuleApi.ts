/**
 * @description M1 规则域 API：分库 / 潜质要素 / 分级 / 固定注解 / 培养方向 / 目标档位与导入导出。
 *   页面与页面组件只依赖本 composable；不直接调用 useApi 或 PocketBase（spec §6）。
 * @file app/composables/api/useTalentRuleApi.ts
 */
import type {
  TalentDirection,
  TalentFactor,
  TalentFactorLibrary,
  TalentFactorNote,
  TalentLevel,
  TalentLevelTone,
  TalentNoteGender,
  TalentTier,
} from "~~/shared/types/talent-rule";
import type { TalentStatus } from "~~/shared/types/talent";

/** 规则域列表统一分页结构（spec §5.1）。 */
export interface TalentRuleList<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TalentRuleListQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: TalentStatus;
}

/** 分库行：额外带 `genderLabel`（男 / 女）。 */
export interface TalentFactorLibraryRow extends TalentFactorLibrary {
  genderLabel?: string;
}

/** 要素列表响应：附当前「关键词 + 分册」下的分册计数。 */
export interface TalentFactorListResult extends TalentRuleList<TalentFactor> {
  categoryCounts: Record<string, number>;
  categoryTotal: number;
}

/** 要素详情：`levels` 为当前 4 档编码 / 名称（文案弹层页签）。 */
export interface TalentFactorDetail extends TalentFactor {
  levels: Array<Pick<TalentLevel, "code" | "name" | "sortOrder">>;
}

export interface TalentFactorQuery extends TalentRuleListQuery {
  libraryId: string;
  category?: string;
  fill?: "complete" | "partial" | "empty";
}

export interface TalentFactorLibraryQuery extends TalentRuleListQuery {
  gender?: "male" | "female";
  age?: number;
}

/** 分级行：服务端聚合该分级下的固定注解数。 */
export interface TalentLevelRow extends TalentLevel {
  noteCount: number;
}

export interface TalentLevelListResult extends TalentRuleList<TalentLevelRow> {
  levelCounts: Record<string, number>;
  noteCounts: Record<string, number>;
  noteTotal: number;
}

/** 固定注解行：要素名 / 分级名按文库当前值解析，不落快照（ADR 0001-D3）。 */
export interface TalentFactorNoteRow extends TalentFactorNote {
  factorName: string;
  factorNameResolved: boolean;
  levelName: string;
}

export interface TalentFactorNoteQuery extends TalentRuleListQuery {
  levelCode?: string;
  factorCode?: string;
  name?: string;
}

export interface TalentFactorNoteListResult extends TalentRuleList<TalentFactorNoteRow> {
  levelCounts: Record<string, number>;
  noteTotal: number;
}

/** 方向 requirements 展开项。 */
export interface TalentDirectionRequirementView {
  code: string;
  level: string;
  factorName: string;
  levelName: string;
}

/** 方向档位展开项。 */
export interface TalentDirectionTierView {
  id: string;
  name: string;
  teacher: string;
  freq: string;
  status: string;
}

/** 方向列表 / 详情行：附带解析后的名称。 */
export interface TalentDirectionRow extends TalentDirection {
  requirementNames: TalentDirectionRequirementView[];
  tiers: TalentDirectionTierView[];
  defaultTierName: string;
}

export interface TalentDirectionQuery extends TalentRuleListQuery {
  code?: string;
  name?: string;
}

export interface TalentTierListResult extends TalentRuleList<TalentTier> {
  defaultTierId: string;
  defaultTierName: string;
}

/** 分库同步摘要（首次同步与再同步同一结构）。 */
export interface TalentFactorLibrarySyncSummary {
  libraryId: string;
  gender: string;
  age: number;
  itemCount: number;
  slotTotal: number;
  filledCount: number;
  partialCount: number;
  created: number;
  updated: number;
  unchanged: number;
}

/** 导入失败行。 */
export interface TalentRuleImportFailure {
  rowNumber: number;
  errors: string[];
}

/** 导入预览行：注解与分级共用，按模板类型取不同字段。 */
export interface TalentRuleImportPreviewRow {
  rowNumber: number;
  ok: boolean;
  errors: string[];
  warnings: string[];
  code?: string;
  factorCode?: string;
  levelCode?: string;
  note?: string;
  ageRange?: string;
  gender?: string;
  status?: string;
  name?: string;
  sortOrder?: number;
  range?: string;
  tone?: string;
}

export interface TalentRuleImportPreview {
  fileName: string;
  total: number;
  passed: number;
  failed: number;
  rows: TalentRuleImportPreviewRow[];
}

export interface TalentRuleImportResult {
  fileName: string;
  total: number;
  success: number;
  failed: number;
  failures: TalentRuleImportFailure[];
}

/** 方向新增 / 保存配置请求体（spec §5.3）。 */
export interface TalentDirectionConfigInput {
  code?: string;
  name: string;
  description?: string;
  icon?: string;
  requirements: Array<{ code: string; level: string }>;
  tierIds: string[];
  defaultTierId: string;
  aliases?: string[];
  status?: TalentStatus;
}

export interface TalentLevelInput {
  code?: string;
  name?: string;
  sortOrder?: number;
  range?: string;
  tone?: TalentLevelTone;
  status?: TalentStatus;
}

export interface TalentFactorNoteInput {
  factorCode?: string;
  levelCode?: string;
  note?: string;
  ageRange?: string;
  gender?: TalentNoteGender;
  status?: TalentStatus;
}

export interface TalentTierInput {
  name?: string;
  teacher?: string;
  freq?: string;
  headline?: string;
  description?: string;
  isDefault?: boolean;
  status?: TalentStatus;
}

/** 拼查询串：跳过空值，避免 `?levelCode=` 被服务端当成筛选条件。 */
function withQuery(path: string, params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

/** 导入文件：multipart 只收 CSV（服务端校验 10MB / 415）。 */
function buildCsvForm(file: File): FormData {
  const form = new FormData();
  form.append("file", file);
  return form;
}

export function useTalentRuleApi() {
  // 在 setup 阶段取好登录态下载器，避免事件回调里再进入 composable 上下文。
  const { download } = useProtectedDownload();

  /** 受保护 CSV 下载统一复用登录态，不把 token 拼到 URL。 */
  async function downloadCsv(path: string, fileName: string): Promise<void> {
    await download(path, fileName);
  }

  // ── 分库 / 同步 ──────────────────────────────────────────────────────────────
  const listFactorLibraries = (params: TalentFactorLibraryQuery = {}) =>
    useApi<TalentRuleList<TalentFactorLibraryRow>>("/api/admin/talent/factor-libraries", {
      params,
    });

  /** 库不存在（首次切到该性别 / 年龄）时的同步入口。 */
  const syncNewFactorLibrary = (body: { gender: "male" | "female"; age: number }) =>
    useApi<TalentFactorLibrarySyncSummary>("/api/admin/talent/factor-libraries/sync", {
      method: "POST",
      body,
      successToast: true,
    });

  /** 已同步库的再同步。 */
  const syncFactorLibrary = (id: string) =>
    useApi<TalentFactorLibrarySyncSummary>(`/api/admin/talent/factor-libraries/${id}/sync`, {
      method: "POST",
      body: {},
      successToast: true,
    });

  // ── 潜质要素（只读） ─────────────────────────────────────────────────────────
  const listFactors = (params: TalentFactorQuery) =>
    useApi<TalentFactorListResult>("/api/admin/talent/factors", { params });

  const getFactor = (id: string) =>
    useApi<TalentFactorDetail>(`/api/admin/talent/factors/${id}`);

  const downloadFactorLibraryExport = (library: {
    id: string;
    gender: string;
    age: number;
    category?: string;
    keyword?: string;
  }) =>
    downloadCsv(
      withQuery("/api/admin/talent/factors/export", {
        libraryId: library.id,
        category: library.category,
        keyword: library.keyword,
      }),
      `talent-factor-library-${library.gender}-${library.age}.csv`,
    );

  const downloadFactorLibraryTemplate = () =>
    downloadCsv("/api/admin/talent/factors/template", "talent-factor-library-template.csv");

  // ── 分级 ────────────────────────────────────────────────────────────────────
  const listLevels = (params: TalentRuleListQuery = {}) =>
    useApi<TalentLevelListResult>("/api/admin/talent/levels", { params });

  const createLevel = (body: TalentLevelInput) =>
    useApi<TalentLevel>("/api/admin/talent/levels", {
      method: "POST",
      body,
      successToast: true,
    });

  const updateLevel = (id: string, body: TalentLevelInput) =>
    useApi<TalentLevel>(`/api/admin/talent/levels/${id}`, {
      method: "PUT",
      body,
      successToast: true,
    });

  const deleteLevel = (id: string) =>
    useApi<{ id: string }>(`/api/admin/talent/levels/${id}`, {
      method: "DELETE",
      successToast: true,
    });

  const downloadLevelExport = (params: TalentRuleListQuery = {}) =>
    downloadCsv(
      withQuery("/api/admin/talent/levels/export", {
        keyword: params.keyword,
        status: params.status,
      }),
      "talent-levels.csv",
    );

  const downloadLevelTemplate = () =>
    downloadCsv("/api/admin/talent/levels/template", "talent-level-template.csv");

  const previewLevelImport = (file: File) =>
    useApi<TalentRuleImportPreview>("/api/admin/talent/levels/import/preview", {
      method: "POST",
      body: buildCsvForm(file),
    });

  const importLevels = (file: File) =>
    useApi<TalentRuleImportResult>("/api/admin/talent/levels/import", {
      method: "POST",
      body: buildCsvForm(file),
      successToast: true,
    });

  // ── 固定注解 ────────────────────────────────────────────────────────────────
  const listFactorNotes = (params: TalentFactorNoteQuery = {}) =>
    useApi<TalentFactorNoteListResult>("/api/admin/talent/factor-notes", { params });

  const createFactorNote = (body: TalentFactorNoteInput) =>
    useApi<TalentFactorNote>("/api/admin/talent/factor-notes", {
      method: "POST",
      body,
      successToast: true,
    });

  const updateFactorNote = (id: string, body: TalentFactorNoteInput) =>
    useApi<TalentFactorNote>(`/api/admin/talent/factor-notes/${id}`, {
      method: "PUT",
      body,
      successToast: true,
    });

  const deleteFactorNote = (id: string) =>
    useApi<{ id: string }>(`/api/admin/talent/factor-notes/${id}`, {
      method: "DELETE",
      successToast: true,
    });

  const downloadFactorNoteExport = (params: TalentFactorNoteQuery = {}) =>
    downloadCsv(
      withQuery("/api/admin/talent/factor-notes/export", {
        levelCode: params.levelCode,
        factorCode: params.factorCode,
        name: params.name,
        keyword: params.keyword,
      }),
      "talent-factor-notes.csv",
    );

  const downloadFactorNoteTemplate = () =>
    downloadCsv("/api/admin/talent/factor-notes/template", "talent-factor-notes-template.csv");

  const previewFactorNoteImport = (file: File) =>
    useApi<TalentRuleImportPreview>("/api/admin/talent/factor-notes/import/preview", {
      method: "POST",
      body: buildCsvForm(file),
    });

  const importFactorNotes = (file: File) =>
    useApi<TalentRuleImportResult>("/api/admin/talent/factor-notes/import", {
      method: "POST",
      body: buildCsvForm(file),
      successToast: true,
    });

  // ── 培养方向 ────────────────────────────────────────────────────────────────
  const listDirections = (params: TalentDirectionQuery = {}) =>
    useApi<TalentRuleList<TalentDirectionRow>>("/api/admin/talent/directions", { params });

  const getDirection = (id: string) =>
    useApi<TalentDirectionRow>(`/api/admin/talent/directions/${id}`);

  const createDirection = (body: TalentDirectionConfigInput) =>
    useApi<TalentDirection>("/api/admin/talent/directions", {
      method: "POST",
      body,
      successToast: true,
    });

  const updateDirection = (id: string, body: TalentDirectionConfigInput) =>
    useApi<TalentDirection>(`/api/admin/talent/directions/${id}`, {
      method: "PUT",
      body,
      successToast: true,
    });

  const setDirectionStatus = (id: string, status: TalentStatus) =>
    useApi<TalentDirection>(`/api/admin/talent/directions/${id}/status`, {
      method: "PUT",
      body: { status },
      successToast: true,
    });

  const deleteDirection = (id: string) =>
    useApi<{ id: string }>(`/api/admin/talent/directions/${id}`, {
      method: "DELETE",
      successToast: true,
    });

  // ── 目标档位（不提供新增 / 删除） ─────────────────────────────────────────────
  const listTiers = () =>
    useApi<TalentTierListResult>("/api/admin/talent/tiers", {
      params: { page: 1, pageSize: 100 },
    });

  const updateTier = (id: string, body: TalentTierInput) =>
    useApi<TalentTier>(`/api/admin/talent/tiers/${id}`, {
      method: "PUT",
      body,
      successToast: true,
    });

  return {
    listFactorLibraries,
    syncNewFactorLibrary,
    syncFactorLibrary,
    listFactors,
    getFactor,
    downloadFactorLibraryExport,
    downloadFactorLibraryTemplate,
    listLevels,
    createLevel,
    updateLevel,
    deleteLevel,
    downloadLevelExport,
    downloadLevelTemplate,
    previewLevelImport,
    importLevels,
    listFactorNotes,
    createFactorNote,
    updateFactorNote,
    deleteFactorNote,
    downloadFactorNoteExport,
    downloadFactorNoteTemplate,
    previewFactorNoteImport,
    importFactorNotes,
    listDirections,
    getDirection,
    createDirection,
    updateDirection,
    setDirectionStatus,
    deleteDirection,
    listTiers,
    updateTier,
  };
}