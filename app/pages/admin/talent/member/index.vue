<!--
 * @description 会员管理（M2 会员域）：8 列列表 + 四项筛选交集（姓名 / 手机号 / 子女姓名 / 状态带数量）、
 *   分页 20、新建 / 编辑弹层、详情三页签、停用启用与证件全号入口。数据全部走 useTalentMemberApi。
 * @file app/pages/admin/talent/member/index.vue
-->
<script setup lang="ts">
import {
  NButton,
  NDataTable,
  NInput,
  NSelect,
  NTag,
  useDialog,
  useMessage,
  type DataTableColumns,
} from "naive-ui";
import type { TalentMemberListResult } from "~/composables/api/useTalentMemberApi";
import type {
  TalentMemberListRow,
  TalentMemberParentView,
} from "~~/shared/types/talent-member";
import type { TalentStatus } from "~~/shared/types/talent";
import { createActionColumn } from "~/composables/useAdminTable";
import MemberDetailModal from "./components/MemberDetailModal.vue";
import MemberFormModal from "./components/MemberFormModal.vue";

definePageMeta({ layout: "admin", middleware: ["auth", "permission-guard"] });

const api = useTalentMemberApi();
const dialog = useDialog();
const message = useMessage();
const { hasPermission } = usePermission();
const canView = computed(() => hasPermission("talent:parent:view"));
const canAdd = computed(() => hasPermission("talent:parent:add"));
const canEdit = computed(() => hasPermission("talent:parent:edit"));
const canChangeStatus = computed(() => hasPermission("talent:parent:status"));

const rows = ref<TalentMemberListRow[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const statusCounts = ref<Record<TalentStatus, number>>({ "1": 0, "0": 0 });
const statusTotal = ref(0);
const loading = ref(false);
const error = ref("");

const filterName = ref("");
const filterMobile = ref("");
const filterChildName = ref("");
const filterStatus = ref<TalentStatus | "">("");

const showForm = ref(false);
const formMode = ref<"create" | "edit">("create");
const formRecord = ref<TalentMemberParentView | null>(null);
const formOrigin = ref<"list" | "detail">("list");

const showDetail = ref(false);
const detailMemberId = ref("");
const detailRef = ref<InstanceType<typeof MemberDetailModal> | null>(null);

const statusOptions = computed(() => [
  { label: `全部（${statusTotal.value}）`, value: "" },
  { label: `正常（${statusCounts.value["1"] || 0}）`, value: "1" },
  { label: `停用（${statusCounts.value["0"] || 0}）`, value: "0" },
]);

const hasFilters = computed(
  () =>
    Boolean(filterName.value.trim()) ||
    Boolean(filterMobile.value.trim()) ||
    Boolean(filterChildName.value.trim()) ||
    Boolean(filterStatus.value),
);

const empty = computed(
  () => !loading.value && !error.value && rows.value.length === 0,
);

function statusTagType(status: string): "success" | "default" {
  return status === "1" ? "success" : "default";
}

const columns = computed<DataTableColumns<TalentMemberListRow>>(() => [
  {
    title: "会员编号",
    key: "parentNo",
    width: 160,
    render: (row: TalentMemberListRow) =>
      h("span", { class: "mono" }, row.parentNo),
  },
  {
    title: "家长",
    key: "name",
    minWidth: 110,
    render: (row: TalentMemberListRow) => {
      if (!canView.value) return h("span", row.name);
      return h(
        NButton,
        {
          text: true,
          type: "primary",
          class: "link-button",
          onClick: () => openDetail(row),
        },
        { default: () => row.name },
      );
    },
  },
  { title: "手机号", key: "maskedMobile", width: 150 },
  {
    title: "家长身份证",
    key: "maskedIdNo",
    width: 190,
    render: (row: TalentMemberListRow) =>
      row.idNoMissing || !row.maskedIdNo
        ? h("span", { class: "muted" }, "—")
        : h("span", { class: "mono" }, row.maskedIdNo),
  },
  {
    title: "名下子女",
    key: "childCount",
    width: 90,
    render: (row: TalentMemberListRow) => `${Number(row.childCount || 0)}`,
  },
  {
    title: "关联报告",
    key: "reportCount",
    width: 90,
    render: (row: TalentMemberListRow) => `${Number(row.reportCount || 0)}`,
  },
  {
    title: "账号状态",
    key: "status",
    width: 96,
    render: (row: TalentMemberListRow) =>
      h(
        NTag,
        { size: "small", bordered: false, type: statusTagType(row.status) },
        { default: () => row.statusLabel },
      ),
  },
  createActionColumn(
    (row: TalentMemberListRow) => [
      {
        label: "详情",
        type: "primary" as const,
        show: () => canView.value,
        onClick: () => openDetail(row),
      },
      {
        label: "编辑",
        show: () => canEdit.value,
        onClick: () => openEditForm(row),
      },
      {
        label: row.status === "1" ? "停用" : "启用",
        type: "warning" as const,
        show: () => canChangeStatus.value,
        onClick: () => void toggleStatus(row),
      },
    ],
    { width: 150, maxInline: 3 },
  ),
]);

function normalizeMobileInput(value: string): string {
  return value.trim();
}

function isMobileFilterValid(value: string): boolean {
  if (!value) return true;
  return /^\d{4}$/.test(value) || /^1[3-9]\d{9}$/.test(value);
}

async function loadRows(silent = false): Promise<void> {
  if (!silent) {
    loading.value = true;
    error.value = "";
  }
  try {
    const result: TalentMemberListResult = await api.listMembers({
      page: page.value,
      pageSize: pageSize.value,
      name: filterName.value.trim() || undefined,
      mobile: normalizeMobileInput(filterMobile.value) || undefined,
      childName: filterChildName.value.trim() || undefined,
      status: filterStatus.value || undefined,
    });
    rows.value = result.rows;
    total.value = result.total;
    statusCounts.value = result.statusCounts || { "1": 0, "0": 0 };
    statusTotal.value = Number(result.statusTotal || 0);
  } catch {
    if (!silent) error.value = "会员列表加载失败，请检查网络或服务状态后重试";
  } finally {
    if (!silent) loading.value = false;
  }
}

function handleSearch(): void {
  const mobile = normalizeMobileInput(filterMobile.value);
  if (!isMobileFilterValid(mobile)) {
    message.warning("手机号筛选应为完整 11 位或后 4 位");
    return;
  }
  page.value = 1;
  void loadRows();
}

function handleReset(): void {
  filterName.value = "";
  filterMobile.value = "";
  filterChildName.value = "";
  filterStatus.value = "";
  page.value = 1;
  void loadRows();
}

function changePage(value: number): void {
  page.value = value;
  void loadRows();
}

function changePageSize(value: number): void {
  pageSize.value = value;
  page.value = 1;
  void loadRows();
}

function openCreateForm(): void {
  formMode.value = "create";
  formRecord.value = null;
  formOrigin.value = "list";
  showForm.value = true;
}

function openEditForm(row: TalentMemberListRow): void {
  formMode.value = "edit";
  formRecord.value = row;
  formOrigin.value = "list";
  showForm.value = true;
}

function openDetail(row: TalentMemberListRow): void {
  detailMemberId.value = row.id;
  showDetail.value = true;
}

function handleDetailEdit(parent: TalentMemberParentView): void {
  formMode.value = "edit";
  formRecord.value = parent;
  formOrigin.value = "detail";
  showForm.value = true;
}

function handleFormSaved(): void {
  // 新建成功后回到第 1 页（spec §6.3）；编辑保持当前页。
  if (formMode.value === "create") page.value = 1;
  void loadRows(true);
  if (formOrigin.value === "detail") detailRef.value?.reload();
}

function handleDetailChanged(): void {
  void loadRows(true);
}

async function toggleStatus(row: TalentMemberListRow): Promise<void> {
  if (row.status === "0") {
    try {
      await api.setMemberStatus(row.id, "1");
      await loadRows(true);
    } catch {
      // useApi 已统一提示服务端错误。
    }
    return;
  }
  const confirmed = await new Promise<boolean>((resolve) => {
    let settled = false;
    const settle = (value: boolean): void => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    dialog.warning({
      title: `停用会员「${row.name}」`,
      content: "停用后家长端立即不可见本人与名下子女；历史数据与报告保留，可随时启用。确认停用？",
      positiveText: "停用",
      negativeText: "取消",
      onPositiveClick: () => settle(true),
      onNegativeClick: () => settle(false),
      onClose: () => settle(false),
    });
  });
  if (!confirmed) return;
  try {
    await api.setMemberStatus(row.id, "0");
    await loadRows(true);
  } catch {
    // useApi 已统一提示服务端错误。
  }
}

onMounted(() => void loadRows());
</script>

<template>
  <AdminListPage
    title="会员管理"
    :loading="loading"
    :error="error"
    :empty="empty"
    @retry="loadRows"
  >
    <template #headerExtra>
      <n-button v-if="canAdd" type="primary" class="main-action" @click="openCreateForm">
        新建会员
      </n-button>
    </template>

    <template #search>
      <n-input
        v-model:value="filterName"
        placeholder="家长姓名"
        clearable
        @keyup.enter="handleSearch"
      />
      <n-input
        v-model:value="filterMobile"
        placeholder="手机号（11 位或后 4 位）"
        clearable
        :maxlength="11"
        @keyup.enter="handleSearch"
      />
      <n-input
        v-model:value="filterChildName"
        placeholder="子女姓名"
        clearable
        @keyup.enter="handleSearch"
      />
      <n-select
        v-model:value="filterStatus"
        :options="statusOptions"
        placeholder="全部状态"
      />
    </template>
    <template #searchActions>
      <n-button type="primary" @click="handleSearch">查询</n-button>
      <n-button @click="handleReset">重置</n-button>
    </template>

    <template #empty>
      <AdminEmptyState
        v-if="hasFilters"
        description="当前筛选下暂无会员"
        action-text="重置筛选"
        @action="handleReset"
      />
      <AdminEmptyState
        v-else
        description="暂无会员，新建会员后自动发起名下子女查询"
        :action-text="canAdd ? '新建会员' : undefined"
        @action="openCreateForm"
      />
    </template>

    <n-data-table
      :columns="columns"
      :data="rows"
      :loading="loading"
      :bordered="false"
      :scroll-x="1060"
      :row-key="(row: TalentMemberListRow) => row.id"
    />

    <template #pagination>
      <AdminPagination
        v-model:page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-size-options="[20, 50, 100]"
        @update:page="changePage"
        @update:page-size="changePageSize"
      />
    </template>
  </AdminListPage>

  <MemberFormModal
    v-model:show="showForm"
    :mode="formMode"
    :record="formRecord"
    @saved="handleFormSaved"
  />
  <MemberDetailModal
    ref="detailRef"
    v-model:show="showDetail"
    :member-id="detailMemberId"
    @changed="handleDetailChanged"
    @edit="handleDetailEdit"
  />
</template>

<style scoped>
.main-action { min-height: 44px; }
.mono { font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace); white-space: nowrap; }
.link-button { font-weight: 500; }
:deep(.muted) { color: var(--muted-foreground, #6c756a); }
:deep(.n-data-table-th) { background: var(--muted); color: var(--foreground); font-weight: 600; }
:deep(.n-data-table-td) { padding-top: 10px; padding-bottom: 10px; color: var(--foreground); }
:deep(.n-input__placeholder) { color: var(--muted-foreground, #6c756a); }
:deep(.n-base-selection-placeholder) { color: var(--muted-foreground, #6c756a); }
</style>