<!--
 * @description 培育建议（M5 培育建议域）：单行 15 列列表 + 五项检索（建议编号 / 子女姓名 / 身份证 /
 *   报告编号 / 年龄精确周岁，AND 交集）+ 版本视图（当前生效 / 历史只读）+ 分页 20；
 *   行内详情 / 历史版本 / 发布 / 撤回，页头「版本历史 / 导出」，检索区尾部「接收新一版建议」。
 *   数据全部走 useTalentAdviceApi；不提供正文编辑、新建、删除与「切换生效版本」入口
 *   （版本生效只由接收新一版改变，回到当前生效版 = 清空 versionId，spec §6）。
 * @file app/pages/admin/talent/advice.vue
-->
<script setup lang="ts">
import {
  NAlert,
  NButton,
  NDataTable,
  NInput,
  NTag,
  useMessage,
  type DataTableColumns,
} from "naive-ui";
import type {
  TalentAdviceDocListRow,
  TalentAdviceVersionView,
  TalentAdviceViewingVersion,
} from "~/composables/api/useTalentAdviceApi";
import { createActionColumn } from "~/composables/useAdminTable";
import AdviceBookModal from "./advice/components/AdviceBookModal.vue";
import AdvicePersonHistoryModal from "./advice/components/AdvicePersonHistoryModal.vue";
import AdvicePublishModal, {
  type AdvicePublishMode,
} from "./advice/components/AdvicePublishModal.vue";
import AdviceSyncModal from "./advice/components/AdviceSyncModal.vue";
import AdviceVersionHistoryModal from "./advice/components/AdviceVersionHistoryModal.vue";
import {
  advicePublishStatusTagType,
  adviceWithdrawnNote,
} from "./advice/components/advice-ui";
import ReportGeneModal from "./reports/components/ReportGeneModal.vue";

definePageMeta({ layout: "admin", middleware: ["auth", "permission-guard"] });

const api = useTalentAdviceApi();
const message = useMessage();
const { hasPermission } = usePermission();
const canView = computed(() => hasPermission("talent:advice:view"));
const canPublish = computed(() => hasPermission("talent:advice:publish"));
const canSync = computed(() => hasPermission("talent:advice:sync"));
const canExport = computed(() => hasPermission("talent:advice:export"));
const canViewGeneReport = computed(() => hasPermission("talent:report:view"));

const rows = ref<TalentAdviceDocListRow[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
/** 当前查看版本（`null` 表示请求的版本不存在；`isCurrent=false` 即历史只读视图）。 */
const viewing = ref<TalentAdviceViewingVersion | null>(null);
const versions = ref<TalentAdviceVersionView[]>([]);
const versionsLoading = ref(false);
/** 首次加载 / 重试时显示骨架屏；翻页与筛选保留页面结构。 */
const booting = ref(true);
const loading = ref(false);
const error = ref("");
const exporting = ref(false);

/** 列表版本视图参数：空串 = 当前生效版（纯客户端状态，不落库）。 */
const versionId = ref("");

const filterAdviceNo = ref("");
const filterName = ref("");
const filterIdNo = ref("");
const filterReportNo = ref("");
const filterAge = ref("");

const showBook = ref(false);
const bookId = ref("");
const showPersonHistory = ref(false);
const personHistoryId = ref("");
const showVersions = ref(false);
const showSync = ref(false);
const showGene = ref(false);
const geneReportId = ref("");
const showPublish = ref(false);
const publishMode = ref<AdvicePublishMode>("publish");
const publishDoc = ref<TalentAdviceDocListRow | null>(null);

/** 历史只读视图（`viewing.isCurrent=false`）。 */
const readingVersion = computed(() =>
  viewing.value && !viewing.value.isCurrent ? viewing.value : null,
);
const readingCycle = computed(() => {
  const current = readingVersion.value;
  if (!current) return "";
  const matched = versions.value.find((item) => item.id === current.versionId);
  return matched?.cycle ?? "";
});
const activeVersion = computed(
  () => versions.value.find((item) => item.status === "active") ?? null,
);

const hasFilters = computed(
  () =>
    Boolean(filterAdviceNo.value.trim()) ||
    Boolean(filterName.value.trim()) ||
    Boolean(filterIdNo.value.trim()) ||
    Boolean(filterReportNo.value.trim()) ||
    Boolean(filterAge.value.trim()),
);

const empty = computed(
  () => !booting.value && !loading.value && !error.value && rows.value.length === 0,
);

// ── 行渲染 ──────────────────────────────────────────────────────────────────
function openGeneReport(row: TalentAdviceDocListRow): void {
  if (!row.geneReportId || !canViewGeneReport.value) return;
  geneReportId.value = row.geneReportId;
  showGene.value = true;
}

function renderReportNo(row: TalentAdviceDocListRow) {
  if (!row.reportNo) return h("span", { class: "muted" }, "—");
  if (!row.geneReportId || !canViewGeneReport.value)
    return h("span", { class: "mono" }, row.reportNo);
  return h(
    NButton,
    {
      text: true,
      type: "primary",
      class: "link-button",
      onClick: () => openGeneReport(row),
    },
    { default: () => row.reportNo },
  );
}

function renderSyncedAt(row: TalentAdviceDocListRow) {
  const withdrawn = adviceWithdrawnNote(row, (value) => formatTime(value));
  return h("div", { class: "time-cell" }, [
    h("span", formatTime(row.syncedAt) || "—"),
    withdrawn ? h("span", { class: "time-sub" }, withdrawn) : null,
  ]);
}

// ── 15 列（顺序与表头固定，不得增删；spec §6.1） ─────────────────────────────
const columns = computed<DataTableColumns<TalentAdviceDocListRow>>(() => [
  {
    title: "建议编号",
    key: "adviceNo",
    width: 236,
    ellipsis: { tooltip: true },
    render: (row) => h("span", { class: "mono" }, row.adviceNo || "—"),
  },
  {
    title: "版本",
    key: "versionName",
    width: 96,
    render: (row) => h("span", { class: "mono" }, row.versionName || "—"),
  },
  {
    title: "本人",
    key: "name",
    width: 96,
    ellipsis: { tooltip: true },
    render: (row) => h("b", row.name || "—"),
  },
  {
    title: "身份证",
    key: "maskedIdNo",
    width: 168,
    render: (row) =>
      row.maskedIdNo
        ? h("span", { class: "mono" }, row.maskedIdNo)
        : h("span", { class: "muted" }, "—"),
  },
  {
    title: "性别",
    key: "genderLabel",
    width: 64,
    render: (row) => row.genderLabel || "—",
  },
  {
    title: "出生日期",
    key: "birthday",
    width: 112,
    render: (row) => h("span", { class: "mono" }, row.birthday || "—"),
  },
  {
    title: "年龄",
    key: "ageLabel",
    width: 74,
    render: (row) => row.ageLabel || "—",
  },
  {
    title: "基因报告",
    key: "reportNo",
    width: 148,
    ellipsis: { tooltip: true },
    render: (row) => renderReportNo(row),
  },
  {
    title: "基因篇数",
    key: "geneBookCountLabel",
    width: 92,
    render: (row) => row.geneBookCountLabel || "—",
  },
  {
    title: "分册",
    key: "books",
    width: 84,
    render: (row) =>
      row.books
        ? h("span", { class: "mono" }, row.books)
        : h("span", { class: "muted" }, "—"),
  },
  {
    title: "覆盖要素",
    key: "coveredFactorText",
    width: 150,
    ellipsis: { tooltip: true },
    render: (row) => row.coveredFactorText || "—",
  },
  {
    title: "数据熵",
    key: "entropyText",
    width: 216,
    ellipsis: { tooltip: true },
    render: (row) => row.entropyText || "—",
  },
  {
    title: "发布状态",
    key: "publishStatus",
    width: 96,
    render: (row) =>
      h(
        NTag,
        {
          size: "small",
          bordered: false,
          type: advicePublishStatusTagType(row.publishStatus),
        },
        { default: () => row.publishStatusLabel },
      ),
  },
  {
    title: "同步时间",
    key: "syncedAt",
    width: 176,
    render: (row) => renderSyncedAt(row),
  },
  createActionColumn(
    (row: TalentAdviceDocListRow) => [
      {
        label: "建议书",
        type: "primary" as const,
        show: () => canView.value,
        onClick: () => openBook(row),
      },
      {
        label: "历史版本",
        show: () => canView.value,
        onClick: () => openPersonHistory(row),
      },
      {
        label: "发布",
        show: () =>
          canPublish.value &&
          !row.versionReadonly &&
          row.publishStatus === "withdrawn",
        onClick: () => openPublish(row, "publish"),
      },
      {
        label: "撤回",
        type: "warning" as const,
        show: () =>
          canPublish.value &&
          !row.versionReadonly &&
          row.publishStatus === "published",
        onClick: () => openPublish(row, "withdraw"),
      },
    ],
    { width: 208, maxInline: 3 },
  ),
]);

// ── 数据加载 ────────────────────────────────────────────────────────────────
async function loadRows(silent = false): Promise<void> {
  if (!silent) {
    loading.value = true;
    error.value = "";
  }
  try {
    const result = await api.listAdvice({
      page: page.value,
      pageSize: pageSize.value,
      adviceNo: filterAdviceNo.value.trim() || undefined,
      name: filterName.value.trim() || undefined,
      idNo: filterIdNo.value.trim() || undefined,
      reportNo: filterReportNo.value.trim() || undefined,
      age: filterAge.value.trim() || undefined,
      versionId: versionId.value || undefined,
    });
    rows.value = result.rows;
    total.value = result.total;
    viewing.value = result.viewing;
  } catch {
    if (!silent) error.value = "培育建议列表加载失败，请检查网络或服务状态后重试";
  } finally {
    loading.value = false;
    booting.value = false;
  }
}

async function loadVersions(): Promise<void> {
  versionsLoading.value = true;
  try {
    const result = await api.listVersions();
    versions.value = result.rows;
  } catch {
    // 版本历史加载失败不阻塞列表；页面提示由「版本历史」弹层自行展示空态。
  } finally {
    versionsLoading.value = false;
  }
}

// ── 检索 / 分页 ─────────────────────────────────────────────────────────────
function isIdNoFilterValid(value: string): boolean {
  if (!value) return true;
  return /^\d{4}$/.test(value) || /^\d{17}[\dXx]$/.test(value);
}

function isAgeFilterValid(value: string): boolean {
  if (!value) return true;
  return /^\d{1,3}$/.test(value) && Number(value) <= 100;
}

function handleSearch(): void {
  if (!isIdNoFilterValid(filterIdNo.value.trim())) {
    message.warning("身份证检索应为前 4 / 后 4 位或完整 18 位");
    return;
  }
  if (!isAgeFilterValid(filterAge.value.trim())) {
    message.warning("年龄必须为 0–100 的整数（同步时精确周岁）");
    return;
  }
  page.value = 1;
  void loadRows();
}

function handleReset(): void {
  filterAdviceNo.value = "";
  filterName.value = "";
  filterIdNo.value = "";
  filterReportNo.value = "";
  filterAge.value = "";
  versionId.value = "";
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
  void loadVersions();
}

// ── 版本视图（切版本只改列表参数，不写任何数据；spec §4.4 / §4.6） ─────────────
function openVersionHistory(): void {
  if (!canView.value) return;
  showVersions.value = true;
  void loadVersions();
}

function viewVersion(nextVersionId: string): void {
  if (!nextVersionId) return;
  showVersions.value = false;
  versionId.value = nextVersionId;
  page.value = 1;
  void loadRows();
}

function backToCurrentVersion(): void {
  versionId.value = "";
  page.value = 1;
  void loadRows();
}

// ── 接收新一版 ──────────────────────────────────────────────────────────────
async function openSync(): Promise<void> {
  if (!canSync.value) return;
  // 接收弹层需要当前生效版本的 nextUpdateAt / 版本号作为默认值，先确保版本已加载。
  if (!versions.value.length) await loadVersions();
  showSync.value = true;
}

function handleReceived(): void {
  // 新一版生效后回到当前生效版视图，并刷新版本历史与列表（spec §6.5）。
  versionId.value = "";
  page.value = 1;
  void loadVersions();
  void loadRows(true);
}

// ── 建议书 / 按人历史 / 发布撤回 / 导出 ──────────────────────────────────────
function openBook(row: TalentAdviceDocListRow): void {
  if (!canView.value) return;
  bookId.value = row.id;
  showBook.value = true;
}

function openPersonHistory(row: TalentAdviceDocListRow): void {
  if (!canView.value) return;
  personHistoryId.value = row.id;
  showPersonHistory.value = true;
}

function handlePersonOpenBook(nextAdviceId: string): void {
  if (!nextAdviceId) return;
  bookId.value = nextAdviceId;
  showBook.value = true;
}

function openPublish(row: TalentAdviceDocListRow, mode: AdvicePublishMode): void {
  if (!canPublish.value || row.versionReadonly) return;
  publishDoc.value = row;
  publishMode.value = mode;
  showPublish.value = true;
}

function handlePublished(): void {
  void loadRows(true);
}

async function exportCurrent(): Promise<void> {
  if (exporting.value || !canExport.value) return;
  exporting.value = true;
  try {
    await api.exportAdvice(
      {
        adviceNo: filterAdviceNo.value.trim() || undefined,
        name: filterName.value.trim() || undefined,
        idNo: filterIdNo.value.trim() || undefined,
        reportNo: filterReportNo.value.trim() || undefined,
        age: filterAge.value.trim() || undefined,
        versionId: versionId.value || undefined,
      },
      { versionName: viewing.value?.versionName ?? "" },
    );
  } catch {
    message.error("导出失败，请稍后重试");
  } finally {
    exporting.value = false;
  }
}

onMounted(() => {
  void loadRows();
  void loadVersions();
});
</script>

<template>
  <AdminListPage
    title="培育建议"
    :loading="booting"
    :error="error"
    :empty="empty"
    @retry="retry"
  >
    <template #headerExtra>
      <n-button
        v-if="canView"
        class="main-action"
        data-testid="advice-versions-button"
        @click="openVersionHistory"
      >
        版本历史
      </n-button>
      <n-button
        v-if="canExport"
        class="main-action"
        :loading="exporting"
        data-testid="advice-export-button"
        @click="exportCurrent"
      >
        导出
      </n-button>
    </template>

    <template #search>
      <n-input
        v-model:value="filterAdviceNo"
        placeholder="建议编号"
        clearable
        data-testid="advice-no-filter"
        @keyup.enter="handleSearch"
      />
      <n-input
        v-model:value="filterName"
        placeholder="子女姓名"
        clearable
        data-testid="advice-name-filter"
        @keyup.enter="handleSearch"
      />
      <n-input
        v-model:value="filterIdNo"
        class="advice-idno-filter"
        placeholder="身份证前 4 / 后 4 / 18 位"
        clearable
        :maxlength="18"
        data-testid="advice-idno-filter"
        @keyup.enter="handleSearch"
      />
      <n-input
        v-model:value="filterReportNo"
        placeholder="报告编号"
        clearable
        data-testid="advice-reportno-filter"
        @keyup.enter="handleSearch"
      />
      <n-input
        v-model:value="filterAge"
        placeholder="年龄（精确周岁）"
        clearable
        :maxlength="3"
        data-testid="advice-age-filter"
        @keyup.enter="handleSearch"
      />
    </template>
    <template #searchActions>
      <n-button type="primary" data-testid="advice-search-button" @click="handleSearch">
        查询
      </n-button>
      <n-button data-testid="advice-reset-button" @click="handleReset">重置</n-button>
      <n-button
        v-if="canSync"
        type="primary"
        data-testid="advice-sync-button"
        @click="openSync"
      >
        接收新一版建议
      </n-button>
    </template>

    <template #empty>
      <AdminEmptyState
        v-if="hasFilters"
        description="当前筛选下暂无培育建议"
        action-text="重置筛选"
        @action="handleReset"
      />
      <AdminEmptyState
        v-else
        :description="
          activeVersion
            ? '暂无培育建议，可接收新一版建议'
            : '尚未接收培育建议版本，请先接收新一版建议'
        "
        :action-text="canSync ? '接收新一版建议' : undefined"
        @action="openSync"
      />
    </template>

    <n-alert
      v-if="readingVersion"
      type="warning"
      :show-icon="false"
      class="readonly-bar"
      data-testid="advice-readonly-bar"
    >
      <div class="readonly-bar__inner">
        <span>
          历史版本只读：正在查看 {{ readingVersion.versionName }}<template v-if="readingCycle">
            （{{ readingCycle }}）</template>
          的同步快照，仅供后台回溯；家长端只会看到当前生效版本。
        </span>
        <n-button size="small" data-testid="advice-back-current" @click="backToCurrentVersion">
          回到当前生效版
        </n-button>
      </div>
    </n-alert>

    <div class="advice-table-wrap" data-testid="advice-table">
      <n-data-table
        :columns="columns"
        :data="rows"
        :loading="loading"
        :bordered="false"
        :scroll-x="2026"
        :row-key="(row: TalentAdviceDocListRow) => row.id"
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

  <AdviceBookModal v-model:show="showBook" :advice-id="bookId" />

  <AdviceVersionHistoryModal
    v-model:show="showVersions"
    :rows="versions"
    :loading="versionsLoading"
    @view="viewVersion"
  />

  <AdvicePersonHistoryModal
    v-model:show="showPersonHistory"
    :advice-id="personHistoryId"
    @open-book="handlePersonOpenBook"
  />

  <AdviceSyncModal
    v-model:show="showSync"
    :current-version="activeVersion"
    @committed="handleReceived"
  />

  <AdvicePublishModal
    v-model:show="showPublish"
    :mode="publishMode"
    :doc="publishDoc"
    @changed="handlePublished"
  />

  <ReportGeneModal v-model:show="showGene" :gene-report-id="geneReportId" />
</template>

<style scoped>
.main-action { min-height: 44px; }
.readonly-bar { margin-bottom: 12px; line-height: 1.7; }
.readonly-bar__inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
}
.advice-table-wrap {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
.advice-table-wrap :deep(.n-data-table-th) {
  background: var(--muted);
  color: var(--foreground);
  font-weight: 600;
  white-space: nowrap;
}
.advice-table-wrap :deep(.n-data-table-td) {
  padding-top: 10px;
  padding-bottom: 10px;
  color: var(--foreground);
  white-space: nowrap;
}
:deep(.mono) {
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  white-space: nowrap;
}
:deep(.muted) { color: var(--muted-foreground, #6c756a); }
:deep(.link-button) { font-weight: 500; }
:deep(.time-cell) { display: flex; flex-direction: column; line-height: 1.4; }
:deep(.time-sub) { color: var(--muted-foreground, #6c756a); font-size: 12px; }
:deep(.n-input__placeholder) { color: var(--muted-foreground, #6c756a); }

.advice-idno-filter { width: 240px; }
</style>