<!--
 * @description 基因报告（M3 报告域）：单行 10 列列表 + 四项筛选 + 状态计数分页；
 *   行内详情 / 基因报告 / 发布 / 撤回 / 恢复发布 / 补发，顶部一键同步。数据全部走
 *   useTalentReportApi；详情弹层页签支持 `?report=&tab=` 深链与旧页签回落（spec §6）。
 * @file app/pages/admin/talent/reports/index.vue
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
import type {
  TalentReportListResult,
  TalentReportListRow,
} from "~/composables/api/useTalentReportApi";
import { createActionColumn } from "~/composables/useAdminTable";
import {
  buildStatusOptions,
  newBooksText,
  normalizeReportTab,
  reportStatusTagType,
  type ReportDetailTab,
} from "./report-ui";
import ReportDetailModal from "./components/ReportDetailModal.vue";
import ReportGeneModal from "./components/ReportGeneModal.vue";
import ReportPublishModal from "./components/ReportPublishModal.vue";
import ReportReissueModal from "./components/ReportReissueModal.vue";
import ReportSyncModal from "./components/ReportSyncModal.vue";

definePageMeta({ layout: "admin", middleware: ["auth", "permission-guard"] });

const api = useTalentReportApi();
const dialog = useDialog();
const message = useMessage();
const route = useRoute();
const router = useRouter();
const { hasPermission } = usePermission();
const canView = computed(() => hasPermission("talent:report:view"));
const canPublish = computed(() => hasPermission("talent:report:publish"));
const canSync = computed(() => hasPermission("talent:report:sync"));

const rows = ref<TalentReportListRow[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const statusCounts = ref<Record<string, number>>({});
const statusTotal = ref(0);
/** 首次加载 / 重试时显示骨架屏；翻页与筛选保留页面结构。 */
const booting = ref(true);
const loading = ref(false);
const error = ref("");

const filterReportNo = ref("");
const filterChildName = ref("");
const filterMobile = ref("");
const filterIdNo = ref("");
const filterStatus = ref<"" | "pending_publish" | "published" | "retracted">("");

const showDetail = ref(false);
const detailReportId = ref("");
const detailRef = ref<InstanceType<typeof ReportDetailModal> | null>(null);

const showPublish = ref(false);
const publishReportId = ref("");
const showReissue = ref(false);
const reissueReportId = ref("");
const showSync = ref(false);
const showGene = ref(false);
const geneReportId = ref("");

const statusOptions = computed(() =>
  buildStatusOptions(statusCounts.value, statusTotal.value),
);

const hasFilters = computed(
  () =>
    Boolean(filterReportNo.value.trim()) ||
    Boolean(filterChildName.value.trim()) ||
    Boolean(filterMobile.value.trim()) ||
    Boolean(filterIdNo.value.trim()) ||
    Boolean(filterStatus.value),
);

const empty = computed(
  () => !booting.value && !loading.value && !error.value && rows.value.length === 0,
);

const columns = computed<DataTableColumns<TalentReportListRow>>(() => [
  {
    title: "报告编号",
    key: "reportNo",
    width: 132,
    render: (row) => h("span", { class: "mono" }, row.reportNo),
  },
  {
    title: "家长",
    key: "parentName",
    width: 86,
    ellipsis: { tooltip: true },
    render: (row) => {
      if (!canView.value) return h("span", row.parentName || "—");
      return h(
        NButton,
        {
          text: true,
          type: "primary",
          class: "link-button",
          onClick: () => openDetail(row),
        },
        { default: () => row.parentName || "—" },
      );
    },
  },
  {
    title: "子女",
    key: "childName",
    width: 96,
    ellipsis: { tooltip: true },
    render: (row) => row.childName || "—",
  },
  {
    title: "家长手机号",
    key: "maskedMobile",
    width: 122,
    render: (row) =>
      row.maskedMobile
        ? h("span", { class: "mono" }, row.maskedMobile)
        : h("span", { class: "muted" }, "—"),
  },
  {
    title: "检验人身份证",
    key: "maskedIdNo",
    width: 178,
    render: (row) =>
      row.maskedIdNo
        ? h("span", { class: "mono" }, row.maskedIdNo)
        : h("span", { class: "muted" }, "—"),
  },
  {
    title: "基因篇数",
    key: "geneBookCount",
    width: 72,
    render: (row) => `${Number(row.geneBookCount || 0)}`,
  },
  {
    title: "分册",
    key: "booksText",
    width: 70,
    render: (row) =>
      row.booksText
        ? h("span", { class: "mono" }, row.booksText)
        : h("span", { class: "muted" }, "—"),
  },
  {
    title: "新增分册",
    key: "newBookCount",
    width: 94,
    render: (row) => newBooksText(row.newBookCount, row.newBooksText),
  },
  {
    title: "状态",
    key: "status",
    width: 76,
    render: (row) =>
      h(
        NTag,
        { size: "small", bordered: false, type: reportStatusTagType(row.status) },
        { default: () => row.statusLabel },
      ),
  },
  createActionColumn(
    (row: TalentReportListRow) => [
      {
        label: "详情",
        type: "primary" as const,
        show: () => canView.value,
        onClick: () => openDetail(row),
      },
      {
        label: "基因报告",
        show: () => canView.value && Boolean(row.geneReportId),
        onClick: () => openGeneReport(row),
      },
      {
        label: "发布",
        show: () => canPublish.value && row.status === "pending_publish",
        onClick: () => openPublish(row),
      },
      {
        label: "撤回",
        type: "warning" as const,
        show: () => canPublish.value && row.status === "published",
        onClick: () => void confirmWithdraw(row.id, row.reportNo),
      },
      {
        label: "恢复发布",
        show: () => canPublish.value && row.status === "retracted",
        onClick: () => void confirmRestore(row.id, row.reportNo),
      },
      {
        label: "补发",
        show: () =>
          canPublish.value &&
          row.status === "published" &&
          Number(row.newBookCount || 0) > 0,
        onClick: () => openReissue(row),
      },
    ],
    { width: 196, maxInline: 3 },
  ),
]);

function normalizeMobileInput(value: string): string {
  return value.trim();
}

function isMobileFilterValid(value: string): boolean {
  if (!value) return true;
  return /^\d{4}$/.test(value) || /^1[3-9]\d{9}$/.test(value);
}

function isIdNoFilterValid(value: string): boolean {
  if (!value) return true;
  return /^\d{4}$/.test(value) || /^\d{17}[\dXx]$/.test(value);
}

async function loadRows(silent = false): Promise<void> {
  if (!silent) {
    loading.value = true;
    error.value = "";
  }
  try {
    const result: TalentReportListResult = await api.listReports({
      page: page.value,
      pageSize: pageSize.value,
      reportNo: filterReportNo.value.trim() || undefined,
      childName: filterChildName.value.trim() || undefined,
      parentMobile: normalizeMobileInput(filterMobile.value) || undefined,
      idNo: filterIdNo.value.trim() || undefined,
      status: filterStatus.value || undefined,
    });
    rows.value = result.rows;
    total.value = result.total;
    statusCounts.value = result.statusCounts || {};
    statusTotal.value = Number(result.statusTotal || 0);
  } catch {
    if (!silent) error.value = "报告列表加载失败，请检查网络或服务状态后重试";
  } finally {
    loading.value = false;
    booting.value = false;
  }
}

function handleSearch(): void {
  const mobile = normalizeMobileInput(filterMobile.value);
  if (!isMobileFilterValid(mobile)) {
    message.warning("家长手机号筛选应为完整 11 位或后 4 位");
    return;
  }
  if (!isIdNoFilterValid(filterIdNo.value.trim())) {
    message.warning("检验人身份证筛选应为完整 18 位或后 4 位");
    return;
  }
  page.value = 1;
  void loadRows();
}

function handleReset(): void {
  filterReportNo.value = "";
  filterChildName.value = "";
  filterMobile.value = "";
  filterIdNo.value = "";
  filterStatus.value = "";
  page.value = 1;
  void loadRows();
}

function onStatusChange(value: "" | "pending_publish" | "published" | "retracted"): void {
  filterStatus.value = value;
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

function retry(): void {
  booting.value = true;
  void loadRows();
}

// ── 详情：`?report=&tab=` 深链与页签回落 ─────────────────────────────────────────────
const queryTab = computed<ReportDetailTab>(() => normalizeReportTab(route.query.tab));

function syncDetailQuery(reportId: string, tab: ReportDetailTab): void {
  void router.replace({
    query: { ...route.query, report: reportId, tab },
  });
}

function clearDetailQuery(): void {
  const query = { ...route.query };
  delete query.report;
  void router.replace({ query });
}

function openDetail(row: TalentReportListRow): void {
  if (!canView.value) return;
  detailReportId.value = row.id;
  showDetail.value = true;
  syncDetailQuery(row.id, queryTab.value);
}

function handleDetailTab(tab: ReportDetailTab): void {
  if (!detailReportId.value) return;
  syncDetailQuery(detailReportId.value, tab);
}

function handleDetailClose(value: boolean): void {
  showDetail.value = value;
  if (!value) clearDetailQuery();
}

function handleDetailChanged(): void {
  void loadRows(true);
}

function handleDetailPublish(): void {
  openPublishById(detailReportId.value);
}

function handleDetailReissue(): void {
  openReissueById(detailReportId.value);
}

function handleDetailWithdraw(reportNo: string): void {
  void confirmWithdraw(detailReportId.value, reportNo);
}

function handleDetailRestore(reportNo: string): void {
  void confirmRestore(detailReportId.value, reportNo);
}

// ── 发布 / 补发 / 基因报告弹层 ─────────────────────────────────────────────────────
function openPublish(row: TalentReportListRow): void {
  openPublishById(row.id);
}

function openPublishById(reportId: string): void {
  if (!reportId || !canPublish.value) return;
  publishReportId.value = reportId;
  showPublish.value = true;
}

function openReissue(row: TalentReportListRow): void {
  openReissueById(row.id);
}

function openReissueById(reportId: string): void {
  if (!reportId || !canPublish.value) return;
  reissueReportId.value = reportId;
  showReissue.value = true;
}

function openGeneReport(row: TalentReportListRow): void {
  if (!row.geneReportId) return;
  geneReportId.value = row.geneReportId;
  showGene.value = true;
}

function afterWrite(): void {
  void loadRows(true);
  detailRef.value?.reload();
}

// ── 撤回 / 恢复二次确认（spec §6.4） ────────────────────────────────────────────────
async function confirmWithdraw(reportId: string, reportNo: string): Promise<void> {
  if (!reportId || !canPublish.value) return;
  const confirmed = await new Promise<boolean>((resolve) => {
    let settled = false;
    const settle = (value: boolean): void => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    dialog.warning({
      title: `撤回报告「${reportNo || reportId}」`,
      content:
        "撤回后 C 端立即显示「报告内容更新中」，分册、下载与建议均不可见；后台保留已撤回状态，可恢复发布。确认撤回？",
      positiveText: "确认撤回",
      negativeText: "取消",
      onPositiveClick: () => settle(true),
      onNegativeClick: () => settle(false),
      onClose: () => settle(false),
    });
  });
  if (!confirmed) return;
  try {
    await api.withdrawReport(reportId);
    afterWrite();
  } catch {
    // useApi 已统一提示服务端错误。
  }
}

async function confirmRestore(reportId: string, reportNo: string): Promise<void> {
  if (!reportId || !canPublish.value) return;
  const confirmed = await new Promise<boolean>((resolve) => {
    let settled = false;
    const settle = (value: boolean): void => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    dialog.warning({
      title: `恢复发布报告「${reportNo || reportId}」`,
      content:
        "沿用原快照恢复，不重新生成，不改变快照版本；C 端立即恢复可见。确认恢复发布？",
      positiveText: "恢复发布",
      negativeText: "取消",
      onPositiveClick: () => settle(true),
      onNegativeClick: () => settle(false),
      onClose: () => settle(false),
    });
  });
  if (!confirmed) return;
  try {
    await api.restoreReport(reportId);
    afterWrite();
  } catch {
    // useApi 已统一提示服务端错误。
  }
}

function handleSyncCommitted(): void {
  void loadRows(true);
}

onMounted(() => {
  void loadRows();
  // 深链：`/admin/talent/reports?report=<id>&tab=matching`；未知 tab 已回落首签。
  const reportId = String(route.query.report || "").trim();
  if (reportId && canView.value) {
    detailReportId.value = reportId;
    showDetail.value = true;
    syncDetailQuery(reportId, queryTab.value);
  }
});
</script>

<template>
  <AdminListPage
    title="基因报告"
    :loading="booting"
    :error="error"
    :empty="empty"
    @retry="retry"
  >
    <template #headerExtra>
      <n-button
        v-if="canSync"
        type="primary"
        class="main-action"
        data-testid="report-sync-button"
        @click="showSync = true"
      >
        一键同步全部报告
      </n-button>
    </template>

    <template #search>
      <n-input
        v-model:value="filterReportNo"
        placeholder="报告编号"
        clearable
        data-testid="report-no-filter"
        @keyup.enter="handleSearch"
      />
      <n-input
        v-model:value="filterChildName"
        placeholder="子女姓名"
        clearable
        data-testid="report-child-filter"
        @keyup.enter="handleSearch"
      />
      <n-input
        v-model:value="filterMobile"
        placeholder="家长手机号（11 位或后 4 位）"
        clearable
        :maxlength="11"
        data-testid="report-mobile-filter"
        @keyup.enter="handleSearch"
      />
      <n-input
        v-model:value="filterIdNo"
        placeholder="检验人身份证（18 位或后 4 位）"
        clearable
        :maxlength="18"
        data-testid="report-idno-filter"
        @keyup.enter="handleSearch"
      />
      <n-select
        v-model:value="filterStatus"
        :options="statusOptions"
        placeholder="全部状态"
        data-testid="report-status-filter"
        @update:value="onStatusChange"
      />
    </template>
    <template #searchActions>
      <n-button type="primary" data-testid="report-search-button" @click="handleSearch">
        查询
      </n-button>
      <n-button data-testid="report-reset-button" @click="handleReset">重置</n-button>
    </template>

    <template #empty>
      <AdminEmptyState
        v-if="hasFilters"
        description="当前筛选下暂无基因报告"
        action-text="重置筛选"
        @action="handleReset"
      />
      <AdminEmptyState
        v-else
        :description="
          canSync
            ? '暂无基因报告，可一键同步已查到结果的子女'
            : '暂无基因报告（无同步权限时请联系管理员）'
        "
        :action-text="canSync ? '一键同步全部报告' : undefined"
        @action="showSync = true"
      />
    </template>

    <div class="report-table-wrap" data-testid="report-table">
      <n-data-table
        :columns="columns"
        :data="rows"
        :loading="loading"
        :bordered="false"
        :scroll-x="1100"
        :row-key="(row: TalentReportListRow) => row.id"
      />
    </div>

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

  <ReportDetailModal
    ref="detailRef"
    :show="showDetail"
    :report-id="detailReportId"
    :initial-tab="queryTab"
    @update:show="handleDetailClose"
    @changed="handleDetailChanged"
    @tab="handleDetailTab"
    @publish="handleDetailPublish"
    @reissue="handleDetailReissue"
    @withdraw="handleDetailWithdraw"
    @restore="handleDetailRestore"
  />

  <ReportPublishModal
    v-model:show="showPublish"
    :report-id="publishReportId"
    @published="afterWrite"
  />

  <ReportReissueModal
    v-model:show="showReissue"
    :report-id="reissueReportId"
    @reissued="afterWrite"
  />

  <ReportGeneModal v-model:show="showGene" :gene-report-id="geneReportId" />

  <ReportSyncModal
    v-model:show="showSync"
    @committed="handleSyncCommitted"
  />
</template>

<style scoped>
.main-action { min-height: 44px; }
.report-table-wrap { display: flex; flex: 1; flex-direction: column; min-width: 0; min-height: 0; }
.report-table-wrap :deep(.n-data-table-th) {
  background: var(--muted);
  color: var(--foreground);
  font-weight: 600;
  white-space: nowrap;
}
.report-table-wrap :deep(.n-data-table-td) {
  padding-top: 10px;
  padding-bottom: 10px;
  color: var(--foreground);
  white-space: nowrap;
}
.mono { font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace); white-space: nowrap; }
.link-button { font-weight: 500; }
:deep(.muted) { color: var(--muted-foreground, #6c756a); }
:deep(.n-input__placeholder) { color: var(--muted-foreground, #6c756a); }
:deep(.n-base-selection-placeholder) { color: var(--muted-foreground, #6c756a); }
</style>