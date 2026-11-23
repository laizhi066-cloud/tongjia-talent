/**
 * @description M2 会员域 API：会员列表 / 详情 / 新建 / 编辑 / 停用启用、子女新增 / 就地编辑 /
 *   重新查询 / 解绑与证件全号（单项高敏）。页面与页面组件只依赖本 composable，
 *   不直接调用 `useApi()` 或 PocketBase（spec §5.5 / §6）。
 * @file app/composables/api/useTalentMemberApi.ts
 */
import type {
  TalentMemberChildView,
  TalentMemberListRow,
  TalentMemberParentView,
  TalentMemberQuerySubmitResult,
} from "~~/shared/types/talent-member";
import type { TalentStatus } from "~~/shared/types/talent";

/** 列表四项筛选 + 分页（spec §6.1）。 */
export interface TalentMemberListQuery {
  page?: number;
  pageSize?: number;
  /** 家长姓名，模糊。 */
  name?: string;
  /** 完整 11 位手机号或后 4 位。 */
  mobile?: string;
  /** 子女姓名，模糊。 */
  childName?: string;
  /** 账号状态：`"1"` 正常 / `"0"` 停用 / 空表示全部。 */
  status?: TalentStatus | "";
}

/** 列表响应：状态计数不叠加状态筛选（spec §5.4.1）。 */
export interface TalentMemberListResult {
  rows: TalentMemberListRow[];
  total: number;
  page: number;
  pageSize: number;
  statusCounts: Record<TalentStatus, number>;
  statusTotal: number;
}

/** 详情子女行：视图 + 关联报告数（M2 恒为 0）。 */
export interface TalentMemberChildDetail extends TalentMemberChildView {
  reportCount: number;
}

/** 详情：家长 + 正常子女 + 计数 + 账号绑定（spec §5.4.2）。 */
export interface TalentMemberDetail {
  parent: TalentMemberParentView;
  children: TalentMemberChildDetail[];
  counts: { children: number; reports: number };
  account: { bound: boolean; account?: string; displayName?: string };
}

/** 新建会员子女行（spec §5.3 #3）。 */
export interface TalentMemberChildCreateInput {
  name: string;
  gender: "male" | "female";
  birthday: string;
  relation: string;
  idNo: string;
}

/** 新建会员：家长 + 1–10 名子女（spec §5.3 #3）。 */
export interface TalentMemberCreateInput {
  parentNo?: string;
  name: string;
  mobile: string;
  idNo?: string;
  gender?: "male" | "female";
  birthday?: string;
  remark?: string;
  children: TalentMemberChildCreateInput[];
}

/** 编辑家长：手机号 / 身份证留空表示不修改（spec §5.3 #4）。 */
export interface TalentMemberUpdateInput {
  parentNo?: string;
  name?: string;
  mobile?: string;
  idNo?: string;
  gender?: "male" | "female" | "";
  birthday?: string;
  remark?: string;
}

/** 新建会员响应：家长 + 子女 + 查询发起结果（spec §5.4.3）。 */
export interface TalentMemberCreateResult {
  parent: TalentMemberParentView;
  children: TalentMemberChildView[];
  queries: Array<{
    childId: string;
    accepted: boolean;
    query: string;
    throttled: boolean;
  }>;
}

/** 编辑子女：身份证留空表示不修改（spec §5.3 #7）。 */
export interface TalentMemberChildUpdateInput {
  name?: string;
  gender?: "male" | "female";
  birthday?: string;
  relation?: string;
  idNo?: string;
}

/** 子女新增 / 编辑响应（spec §5.4.4）。 */
export interface TalentMemberChildWriteResult {
  child: TalentMemberChildView;
  requery?: boolean;
  query?: TalentMemberQuerySubmitResult | null;
}

/** 重新查询响应（spec §5.4.5）。 */
export interface TalentMemberChildQueryResult extends TalentMemberQuerySubmitResult {
  child: TalentMemberChildView;
}

/** 解绑响应（spec §5.4.4 #9）。 */
export interface TalentMemberChildUnbindResult {
  child: TalentMemberChildView;
  alreadyUnbound: boolean;
}

export function useTalentMemberApi() {
  // ── 会员列表 / 详情 ────────────────────────────────────────────────────────────
  const listMembers = (params: TalentMemberListQuery = {}) =>
    useApi<TalentMemberListResult>("/api/admin/talent/members", { params });

  const getMember = (id: string) =>
    useApi<TalentMemberDetail>(`/api/admin/talent/members/${id}`);

  // ── 会员建档 / 编辑 / 停用启用（服务端响应 message 直接作为成功提示） ─────────────
  const createMember = (body: TalentMemberCreateInput) =>
    useApi<TalentMemberCreateResult>("/api/admin/talent/members", {
      method: "POST",
      body,
      successToast: true,
    });

  const updateMember = (id: string, body: TalentMemberUpdateInput) =>
    useApi<{ parent: TalentMemberParentView }>(`/api/admin/talent/members/${id}`, {
      method: "PUT",
      body,
      successToast: true,
    });

  const setMemberStatus = (id: string, status: TalentStatus) =>
    useApi<{ parent: TalentMemberParentView }>(`/api/admin/talent/members/${id}/status`, {
      method: "PUT",
      body: { status },
      successToast: true,
    });

  // ── 名下子女：新增 / 编辑 / 重新查询 / 解绑 ─────────────────────────────────────
  const createMemberChild = (parentId: string, body: TalentMemberChildCreateInput) =>
    useApi<TalentMemberChildWriteResult>(
      `/api/admin/talent/members/${parentId}/children`,
      { method: "POST", body, successToast: true },
    );

  const updateMemberChild = (childId: string, body: TalentMemberChildUpdateInput) =>
    useApi<TalentMemberChildWriteResult>(`/api/admin/talent/children/${childId}`, {
      method: "PUT",
      body,
      successToast: true,
    });

  const queryMemberChild = (childId: string) =>
    useApi<TalentMemberChildQueryResult>(`/api/admin/talent/children/${childId}/query`, {
      method: "POST",
      body: {},
      successToast: true,
    });

  const unbindMemberChild = (childId: string) =>
    useApi<TalentMemberChildUnbindResult>(`/api/admin/talent/children/${childId}/unbind`, {
      method: "POST",
      body: {},
      successToast: true,
    });

  // ── 证件全号（单项、独立高敏权限；错误由页面按 403 兜底文案处理） ─────────────────
  const getMemberIdNo = (id: string) =>
    useApi<{ idNo: string }>(`/api/admin/talent/members/${id}/id-no`, {
      suppressErrorToast: true,
    });

  const getMemberChildIdNo = (childId: string) =>
    useApi<{ idNo: string }>(`/api/admin/talent/children/${childId}/id-no`, {
      suppressErrorToast: true,
    });

  return {
    listMembers,
    getMember,
    createMember,
    updateMember,
    setMemberStatus,
    createMemberChild,
    updateMemberChild,
    queryMemberChild,
    unbindMemberChild,
    getMemberIdNo,
    getMemberChildIdNo,
  };
}