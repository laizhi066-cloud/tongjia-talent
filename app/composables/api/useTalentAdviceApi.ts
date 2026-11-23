/**
 * @description M5 培育建议域 API：列表（5 项检索 + 版本视图 + 分页）/ 建议书详情 / 版本历史 /
 *   按人历史 / 报告详情挂载数据（subject）/ 接收新一版 / 发布 / 撤回 / CSV 导出。
 *   页面与页面组件只依赖本 composable，不直接调用 `useApi()` 或 PocketBase（spec §5.2 / §6）。
 *   口径（M5-B 已冻结）：接收新版只有 `POST /advice/versions`（无 preview / activate 写接口）；
 *   「回到当前生效版」= 清空列表 `versionId`（纯前端查看态，不写库）；
 *   版本生效只由「接收新一版」改变，没有切换生效版本的写接口。
 * @file app/composables/api/useTalentAdviceApi.ts
 */
import type {
  TalentAdviceDocDetail,
  TalentAdviceDocListRow,
  TalentAdvicePersonHistory,
  TalentAdvicePublishResult,
  TalentAdviceReceiveResult,
  TalentAdviceSubjectAdvice,
  TalentAdviceVersionHistory,
  TalentAdviceViewingVersion,
} from "~~/shared/types/talent-advice";

export type {
  TalentAdviceBookGroup,
  TalentAdviceDocDetail,
  TalentAdviceDocListRow,
  TalentAdviceEntropyLevel,
  TalentAdvicePersonHistory,
  TalentAdvicePersonHistoryItem,
  TalentAdvicePublishResult,
  TalentAdvicePublishStatus,
  TalentAdviceReceiveResult,
  TalentAdviceSubjectAdvice,
  TalentAdviceSyncDetail,
  TalentAdviceVersionHistory,
  TalentAdviceVersionView,
  TalentAdviceViewingVersion,
} from "~~/shared/types/talent-advice";

/** 列表 5 项检索（建议编号 / 姓名 / 身份证 / 报告编号 / 年龄，AND 交集）+ 版本视图 + 分页。 */
export interface TalentAdviceListQuery {
  page?: number;
  pageSize?: number;
  /** 建议编号，包含匹配。 */
  adviceNo?: string;
  /** 本人（子女）姓名，包含匹配。 */
  name?: string;
  /** 身份证：前 4 / 后 4（脱敏列包含）或完整 18 位（哈希精确）；其它长度服务端 422。 */
  idNo?: string;
  /** 报告编号，包含匹配。 */
  reportNo?: string;
  /** 冻结精确周岁（整数 0–100）；服务端精确相等，不支持区间。 */
  age?: number | string;
  /** 版本视图：空表示当前生效版；历史版本只读。 */
  versionId?: string;
}

/** 列表响应（`viewing=null` 表示请求的版本不存在）。 */
export interface TalentAdviceListResult {
  rows: TalentAdviceDocListRow[];
  total: number;
  page: number;
  pageSize: number;
  viewing: TalentAdviceViewingVersion | null;
}

/** 接收新一版请求体（spec §5.3 #9）。 */
export interface TalentAdviceReceiveInput {
  /** 同步 / 生效日期 `YYYY-MM-DD`，必须晚于当前生效版本。 */
  effectiveAt: string;
  /** 缺省 `V{YYYY}.{MM}`（按 `effectiveAt`）。 */
  versionNo?: string;
  /** 缺省由服务端生成说明（≤500 字）。 */
  note?: string;
}

/** 报告详情第 4 页签挂载数据参数（subjectType + subjectId 或 reportId 反查）。 */
export interface TalentAdviceSubjectQuery {
  subjectType?: "child" | "self";
  subjectId?: string;
  reportId?: string;
}

/** 导出参数：跟随当前筛选与查看版本（历史版本导出历史快照）。 */
export interface TalentAdviceExportOptions {
  /** 当前查看版本号，用于文件名 `培育建议-{versionNo}-{YYYYMMDDHHmm}.csv`。 */
  versionName?: string;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** 导出文件名（与页面显示同口径，UTC+8；服务端另有同名 content-disposition 兜底）。 */
export function talentAdviceExportFileName(
  versionName: string,
  at: Date = new Date(),
): string {
  const local = new Date(at.getTime() + 8 * 60 * 60 * 1000);
  const stamp = `${local.getUTCFullYear()}${pad2(local.getUTCMonth() + 1)}${pad2(
    local.getUTCDate(),
  )}${pad2(local.getUTCHours())}${pad2(local.getUTCMinutes())}`;
  return `培育建议-${versionName || "全部版本"}-${stamp}.csv`;
}

/** 拼接 query（跳过空值），导出与列表共用筛选字段。 */
function withAdviceQuery(
  path: string,
  params: TalentAdviceListQuery = {},
): string {
  const search = new URLSearchParams();
  const fields: Array<keyof TalentAdviceListQuery> = [
    "page",
    "pageSize",
    "adviceNo",
    "name",
    "idNo",
    "reportNo",
    "age",
    "versionId",
  ];
  for (const key of fields) {
    const value = params[key];
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export function useTalentAdviceApi() {
  // 在 setup 阶段取好登录态下载器，避免事件回调里再进入 composable 上下文。
  const { download } = useProtectedDownload();

  // ── 列表 / 详情 / 版本 / 按人历史 / 报告页签 ──────────────────────────────────
  const listAdvice = (params: TalentAdviceListQuery = {}) =>
    useApi<TalentAdviceListResult>("/api/admin/talent/advice", { params });

  const getAdviceDetail = (id: string) =>
    useApi<TalentAdviceDocDetail>(
      `/api/admin/talent/advice/${encodeURIComponent(id)}`,
    );

  const listVersions = () =>
    useApi<TalentAdviceVersionHistory>("/api/admin/talent/advice/versions");

  const getPersonHistory = (id: string) =>
    useApi<TalentAdvicePersonHistory>(
      `/api/admin/talent/advice/${encodeURIComponent(id)}/history`,
    );

  const getSubjectAdvice = (params: TalentAdviceSubjectQuery) =>
    useApi<TalentAdviceSubjectAdvice>("/api/admin/talent/advice/subject", {
      params,
    });

  // ── 接收新一版（只有这一个写接口；无 preview / activate） ─────────────────────
  const receiveVersion = (body: TalentAdviceReceiveInput) =>
    useApi<TalentAdviceReceiveResult>("/api/admin/talent/advice/versions", {
      method: "POST",
      body,
      successToast: true,
    });

  // ── 发布 / 撤回（仅当前生效版；服务端对历史版本 409 双保险） ───────────────────
  const publishAdvice = (id: string) =>
    useApi<TalentAdvicePublishResult>(
      `/api/admin/talent/advice/${encodeURIComponent(id)}/publish`,
      { method: "POST", body: {}, successToast: true },
    );

  const withdrawAdvice = (id: string, reason = "") =>
    useApi<TalentAdvicePublishResult>(
      `/api/admin/talent/advice/${encodeURIComponent(id)}/withdraw`,
      {
        method: "POST",
        body: reason.trim() ? { reason: reason.trim() } : {},
        successToast: true,
      },
    );

  // ── 导出（CSV，跟随当前筛选与查看版本） ──────────────────────────────────────
  const exportAdvice = (
    params: TalentAdviceListQuery = {},
    options: TalentAdviceExportOptions = {},
  ) =>
    download(
      withAdviceQuery("/api/admin/talent/advice/export", params),
      talentAdviceExportFileName(options.versionName ?? ""),
    );

  return {
    listAdvice,
    getAdviceDetail,
    listVersions,
    getPersonHistory,
    getSubjectAdvice,
    receiveVersion,
    publishAdvice,
    withdrawAdvice,
    exportAdvice,
  };
}