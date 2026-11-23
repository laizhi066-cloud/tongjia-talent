/** * @description 用户管理页面 — 列表、搜索、新增、编辑、角色分配、重置密码 *
@file app/pages/admin/user/index.vue */
<script setup lang="ts">
import {
  AddOutline,
  CreateOutline,
  ShieldOutline,
  KeyOutline,
} from "@vicons/ionicons5";
import {
  useDialog,
  useMessage,
  NDataTable,
  NInput,
  NSelect,
  NButton,
  NIcon,
} from "naive-ui";
import {
  createActionColumn,
  createTimeColumn,
} from "~/composables/useAdminTable";

const dialog = useDialog();
const message = useMessage();
const { handleExport } = useExport();
const { withEllipsis } = useTableEllipsis();
const { hasPermission, hasRole } = usePermission();
const formModal = ref();
const roleModal = ref();
const pwdModal = ref();

definePageMeta({ layout: "admin", middleware: ["auth", "permission-guard"] });

const {
  renderBadge: statusBadge,
  getLabel: statusLabel,
  options: statusOptions,
} = useDict("sys_normal_disable");
const data = ref({
  rows: [] as Record<string, any>[],
  total: 0,
  page: 1,
  pageSize: 10,
});
const loading = ref(false);
const loadError = ref("");
const selectedIds = ref<string[]>([]);
const searchName = ref("");
const searchStatus = ref<string | null>(null);
const canCreateUser = computed(() => hasPermission("system:user:add"));
const canEditUser = computed(
  () => hasPermission("system:user:edit") && hasPermission("system:user:query"),
);
const canAssignRoles = computed(
  () =>
    hasPermission("system:user:edit") &&
    hasPermission("system:user:query") &&
    hasPermission("system:role:list"),
);
const canResetPassword = computed(() => hasPermission("system:user:resetPwd"));
const canDeleteUser = computed(() => hasPermission("system:user:delete"));
const canBatchUpdateStatus = computed(() => hasPermission("system:user:edit"));
const canManageUsers = computed(
  () =>
    canEditUser.value ||
    canAssignRoles.value ||
    canResetPassword.value ||
    canDeleteUser.value,
);
const isSuper = computed(() => hasRole("superadmin"));

function canManageUserRoles(row: Record<string, any>): boolean {
  if (!canAssignRoles.value || isSuper.value) return canAssignRoles.value;
  return !row.roles?.some((item: Record<string, any>) =>
    ["admin", "superadmin"].includes(String(item.role?.roleKey || "")),
  );
}

async function fetchData() {
  loading.value = true;
  loadError.value = "";
  try {
    data.value = await useUserApi().fetchUsers({
      page: data.value.page,
      pageSize: data.value.pageSize,
      userName: searchName.value || undefined,
      status: searchStatus.value || undefined,
    });
  } catch {
    loadError.value = "用户列表加载失败，请检查网络或服务状态后重试。";
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  data.value.page = 1;
  fetchData();
}

function handlePageSizeChange() {
  data.value.page = 1;
  fetchData();
}

function handleExportUser() {
  handleExport(
    "/api/admin/user",
    exportableColumns.value,
    {
      userName: searchName.value || undefined,
      status: searchStatus.value || undefined,
    },
    "用户数据",
  );
}

function handleReset() {
  searchName.value = "";
  searchStatus.value = null;
  data.value.page = 1;
  fetchData();
}

function openAdd() {
  formModal.value?.open();
}
function openEdit(row: Record<string, any>) {
  formModal.value?.open(row);
}
function openRoles(row: Record<string, any>) {
  roleModal.value?.open(row);
}
function openResetPwd(row: Record<string, any>) {
  pwdModal.value?.open(row);
}

async function handleBatchStatus(status: "1" | "0") {
  const ids = selectedIds.value;
  if (!ids.length) return;
  const actionLabel = status === "1" ? "启用" : "禁用";
  const ok = await new Promise<boolean>((resolve) => {
    dialog.warning({
      title: `批量${actionLabel}`,
      content: `确定${actionLabel}选中的 ${ids.length} 个用户吗？`,
      positiveText: "确认",
      negativeText: "取消",
      onPositiveClick: () => resolve(true),
      onNegativeClick: () => resolve(false),
    });
  });
  if (!ok) return;
  try {
    await useUserApi().batchUpdateStatus(ids, status);
    message.success(`已${actionLabel} ${ids.length} 个用户`);
    selectedIds.value = [];
    fetchData();
  } catch {
    /* 拦截器已提示；失败时保留选中态以便重试 */
  }
}

async function handleDelete(row: Record<string, any>) {
  const ok = await new Promise<boolean>((resolve) => {
    dialog.warning({
      title: "确认删除",
      content: `确定删除用户「${row.displayName || row.email}」吗？`,
      positiveText: "确认",
      negativeText: "取消",
      onPositiveClick: () => resolve(true),
      onNegativeClick: () => resolve(false),
    });
  });
  if (!ok) return;
  await useUserApi().deleteUser(row.id);
  message.success("删除成功");
  fetchData();
}

const baseColumns = computed((): any[] => [
  ...(canBatchUpdateStatus.value
    ? [{ type: "selection" as const, width: 42 }]
    : []),
  {
    title: "头像",
    key: "avatar",
    width: 72,
    render: (row: Record<string, any>) => {
      const fallback = h(
        "div",
        {
          class:
            "flex items-center justify-center w-9 h-9 rounded-full bg-muted text-xs text-muted-foreground",
        },
        row.displayName?.charAt(0)?.toUpperCase() || "?",
      );
      if (!row.avatar) return fallback;
      return h("img", {
        src: row.avatar,
        class: "w-9 h-9 rounded-full object-cover border border-gray-300",
        alt: row.displayName,
        onError: (e: Event) => {
          (e.target as HTMLElement).style.display = "none";
        },
      });
    },
  },
  { title: "邮箱", key: "email", sortable: true, sorter: "default" as const },
  {
    title: "姓名",
    key: "displayName",
    sortable: true,
    sorter: "default" as const,
  },
  {
    title: "部门",
    key: "dept.deptName",
    render: (row: Record<string, any>) => h("span", row.dept?.deptName || "-"),
  },
  {
    title: "角色",
    key: "roles",
    render: (row: Record<string, any>) =>
      h(
        "span",
        row.roles
          ?.map((r: Record<string, any>) => r.role.roleName)
          .join(", ") || "-",
      ),
  },
  {
    title: "状态",
    key: "status",
    width: 80,
    sortable: true,
    sorter: "default" as const,
    render: (row: Record<string, any>) => statusBadge(row.status),
    renderCsv: (row: Record<string, any>) => statusLabel(row.status),
  },
  createTimeColumn(),
  ...(canManageUsers.value
    ? [
        createActionColumn(
          (row: any) => [
            {
              label: "修改",
              icon: CreateOutline,
              show: () => canEditUser.value,
              onClick: () => openEdit(row),
            },
            {
              label: "角色",
              icon: ShieldOutline,
              show: () => canManageUserRoles(row),
              onClick: () => openRoles(row),
            },
            {
              label: "重置密码",
              icon: KeyOutline,
              show: () => canResetPassword.value,
              onClick: () => openResetPwd(row),
            },
            {
              label: "删除",
              type: "error",
              show: () => canDeleteUser.value,
              onClick: () => handleDelete(row),
            },
          ],
          { width: 150 },
        ),
      ]
    : []),
]);

const columns = computed(() => baseColumns.value);
const exportableColumns = computed(() =>
  baseColumns.value.filter((column) => column.key !== "actions"),
);

onMounted(fetchData);
</script>

<template>
  <AdminListPage
    title="用户管理"
    :loading="loading"
    :error="loadError"
    :empty="!loading && !loadError && data.rows.length === 0"
    @retry="fetchData"
  >
    <template #headerExtra>
      <n-button
        v-if="canBatchUpdateStatus"
        size="small"
        :disabled="!selectedIds.length"
        @click="handleBatchStatus('1')"
      >
        批量启用
      </n-button>
      <n-button
        v-if="canBatchUpdateStatus"
        size="small"
        :disabled="!selectedIds.length"
        @click="handleBatchStatus('0')"
      >
        批量禁用
      </n-button>
      <n-button
        v-if="canCreateUser"
        type="primary"
        size="small"
        @click="openAdd"
      >
        <template #icon><n-icon :component="AddOutline" /></template>
        新增用户
      </n-button>
    </template>
    <template #search>
      <n-input
        v-model:value="searchName"
        placeholder="用户名/邮箱"
        class="w-44"
        @keyup.enter="handleSearch"
      />
      <n-select
        v-model:value="searchStatus"
        :options="statusOptions"
        placeholder="状态"
        class="w-32"
        clearable
      />
    </template>
    <template #searchActions>
      <AdminSearchActions
        exportable
        @search="handleSearch"
        @reset="handleReset"
        @export="handleExportUser"
      />
    </template>
    <n-data-table
      v-model:checked-row-keys="selectedIds"
      flex-height
      :columns="withEllipsis(columns)"
      :data="data.rows"
      :loading="loading"
      :bordered="false"
      :single-line="false"
      :scroll-x="1000"
      :row-key="(row: any) => row.id"
    />
    <template #pagination>
      <AdminPagination
        v-model:page="data.page"
        v-model:page-size="data.pageSize"
        :total="data.total"
        @update:page="fetchData()"
        @update:page-size="handlePageSizeChange"
      />
    </template>
  </AdminListPage>
  <UserFormModal ref="formModal" @saved="fetchData" />
  <UserRoleModal ref="roleModal" @saved="fetchData" />
  <UserResetPwdModal ref="pwdModal" />
</template>

<style lang="scss" scoped></style>
