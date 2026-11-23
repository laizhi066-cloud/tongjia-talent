/**
 * @description M4 方向选择域 API：自定义方向待归并列表 / 待归并计数 / 归并到正式方向（写别名）/
 *   转正生成「停用待配置」方向（spec §5.2 #1–#3、§5.5）。页面与页面组件只依赖本 composable，
 *   不直接调用 `useApi()` 或 PocketBase。
 * @file app/composables/api/useTalentDirectionApi.ts
 */
import type {
  TalentDirectionMergeResult,
  TalentDirectionPromoteResult,
  TalentDirectionRequestListResult,
} from "~~/shared/types/talent-direction";

/** 待归并列表查询：关键词（自填方向 / 家长 / 子女）、状态（默认待归并）与分页。 */
export interface TalentDirectionRequestQuery {
  keyword?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export function useTalentDirectionApi() {
  /** 待归并 / 已归并 / 已转正式列表（spec §5.3.1）。 */
  const listRequests = (params: TalentDirectionRequestQuery = {}) =>
    useApi<TalentDirectionRequestListResult>("/api/admin/talent/direction-requests", {
      params,
    });

  /**
   * 待归并数量：只取列表 `total`（`status=待归并` + `pageSize=1`），不拉行数据。
   * 失败静默（按钮不显示数字，不阻断方向页），由调用方降级。
   */
  const countPendingRequests = async (): Promise<number> => {
    const result = await useApi<TalentDirectionRequestListResult>(
      "/api/admin/talent/direction-requests",
      {
        params: { status: "待归并", page: 1, pageSize: 1 },
        suppressErrorToast: true,
      },
    );
    return Number(result.total ?? 0) || 0;
  };

  /** 归并到已有正式方向：目标必须启用，服务端写 `aliases`（成功 message 由服务端下发）。 */
  const mergeRequest = (id: string, targetDirectionId: string) =>
    useApi<TalentDirectionMergeResult>(
      `/api/admin/talent/direction-requests/${encodeURIComponent(id)}/merge`,
      {
        method: "POST",
        body: { targetDirectionId },
        successToast: true,
      },
    );

  /** 转正：生成停用待配置方向 stub（无请求体；成功 message 由服务端下发）。 */
  const promoteRequest = (id: string) =>
    useApi<TalentDirectionPromoteResult>(
      `/api/admin/talent/direction-requests/${encodeURIComponent(id)}/promote`,
      {
        method: "POST",
        body: {},
        successToast: true,
      },
    );

  return {
    listRequests,
    countPendingRequests,
    mergeRequest,
    promoteRequest,
  };
}