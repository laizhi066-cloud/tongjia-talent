<!--
 * @description 自定义方向待归并弹层（wide）：状态 / 关键词筛选 + 请求列表 + 归并到启用方向（写别名）/
 *   转正生成「停用待配置」方向；已处理行只读展示目标方向。口径见 docs/specs/M4-matching/spec.md §6.2。
 * @file app/pages/admin/talent/rules/components/DirectionRequestsModal.vue
-->
<script setup lang="ts">
import {
  NAlert,
  NButton,
  NDataTable,
  NEmpty,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NSelect,
  NTag,
  useDialog,
  type DataTableColumns,
} from "naive-ui";
import type { TalentDirectionRequestRow } from "~~/shared/types/talent-direction";
import {
  TALENT_DIRECTION_REQUEST_STATUSES,
  TALENT_DIRECTION_REQUEST_STATUS_PENDING,
} from "~~/shared/types/talent-direction";

const props = defineProps<{ show: boolean }>();
const emit = defineEmits<{
  "update:show": [value: boolean];
  /** 归并 / 转正成功：页面据此刷新方向列表与待归并计数。 */
  merged: [];
}>();

const directionApi = useTalentDirectionApi();
const ruleApi = useTalentRuleApi();
const dialog = useDialog();
const { hasPermission } = usePermission();
const canMerge = computed(() => hasPermission("talent:direction:merge"));

const rows = ref<TalentDirectionRequestRow[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const status = ref<string>(TALENT_DIRECTION_REQUEST_STATUS_PENDING);
const keyword = ref("");
const loading = ref(false);
const error = ref("");
const busyId = ref("");
const requestSeq = ref(0);

const statusOptions = TALENT_DIRECTION_REQUEST_STATUSES.map((value) => ({
  label: value,
  value,
}));

const showMerge = ref(false);
const mergeTarget = ref<TalentDirectionRequestRow | null>(null);
const mergeDirectionId = ref("");
const mergeError = ref("");
const merging = ref(false);
const loadingOptions = ref(false);
const directionOptions = ref<Array<{ label: string; value: string }>>([]);

const emptyDescription = computed(() => {
  if (keyword.value.trim()) return "当前筛选下暂无待归并方向";
  if (status.value === "已归并") return "暂无已归并记录";
  if (status.value === "已转正式") return "暂无已转正式记录";
  return "暂无待归并方向";
});

const STATUS_TAG_TYPE: Record<string, "warning" | "success" | "info" | "default"> = {
  待归并: "warning",
  已归并: "success",
  已转正式: "info",
};

function subjectTypeLabel(value: string): string {
  if (value === "self") return "本人";
  if (value === "child") return "子女";
  return "对象";
}

const columns = computed<DataTableColumns<TalentDirectionRequestRow>>(() => [
  {
    title: "提交时间",
    key: "createdAt",
    width: 140,
    render: (row) => h("span", { class: "mono" }, formatTime(row.createdAt) || "—"),
  },
  {
    title: "报告编号",
    key: "reportNo",
    width: 140,
    render: (row) => h("span", { class: "mono" }, row.reportNo || "—"),
  },
  {
    title: "家长",
    key: "parentName",
    minWidth: 140,
    render: (row) =>
      h("div", { class: "request-cell" }, [
        h("span", { class: "request-strong" }, row.parentName || "—"),
        h("span", { class: "request-sub mono" }, row.maskedMobile || "—"),
      ]),
  },
  {
    title: "子女 / 对象",
    key: "subjectName",
    minWidth: 120,
    render: (row) =>
      h("div", { class: "request-cell" }, [
        h("span", { class: "request-strong" }, row.subjectName || "—"),
        h("span", { class: "request-sub" }, subjectTypeLabel(row.subjectType)),
      ]),
  },
  {
    title: "自填方向",
    key: "manualName",
    minWidth: 110,
    render: (row) => h("span", { class: "manual-name" }, row.manualName || "—"),
  },
  {
    title: "目标档位",
    key: "tierName",
    minWidth: 100,
    render: (row) => h("span", {}, row.tierName || "—"),
  },
  {
    title: "状态",
    key: "status",
    width: 96,
    render: (row) =>
      h(
        NTag,
        {
          size: "small",
          bordered: false,
          type: STATUS_TAG_TYPE[row.status] || "default",
        },
        { default: () => row.status || "—" },
      ),
  },
  {
    title: "目标方向",
    key: "targetDirectionName",
    minWidth: 160,
    render: (row) => {
      if (!row.targetDirectionName) return h("span", { class: "muted" }, "—");
      return h("div", { class: "request-cell" }, [
        h("span", { class: "request-strong" }, row.targetDirectionName),
        h(
          "span",
          { class: "request-sub" },
          [row.mergedByName, formatTime(row.mergedAt)].filter(Boolean).join(" · ") || "—",
        ),
      ]);
    },
  },
  {
    title: "操作",
    key: "actions",
    width: 150,
    fixed: "right",
    render: (row) => {
      if (!canMerge.value) return h("span", { class: "muted" }, "—");
      if (row.status !== TALENT_DIRECTION_REQUEST_STATUS_PENDING)
        return h("span", { class: "muted" }, "已处理");
      return h("div", { class: "request-actions" }, [
        h(
          NButton,
          {
            size: "tiny",
            quaternary: true,
            type: "primary",
            disabled: Boolean(busyId.value),
            onClick: () => openMerge(row),
          },
          { default: () => "归并" },
        ),
        h(
          NButton,
          {
            size: "tiny",
            quaternary: true,
            type: "warning",
            disabled: Boolean(busyId.value),
            onClick: () => void promote(row),
          },
          { default: () => "转正式" },
        ),
      ]);
    },
  },
]);

async function load(): Promise<void> {
  const seq = ++requestSeq.value;
  loading.value = true;
  error.value = "";
  try {
    const result = await directionApi.listRequests({
      keyword: keyword.value.trim() || undefined,
      status: status.value,
      page: page.value,
      pageSize: pageSize.value,
    });
    if (seq !== requestSeq.value) return;
    rows.value = result.rows;
    total.value = result.total;
  } catch {
    if (seq !== requestSeq.value) return;
    rows.value = [];
    total.value = 0;
    error.value = "待归并方向加载失败，请检查网络或服务状态后重试";
  } finally {
    if (seq === requestSeq.value) loading.value = false;
  }
}

function handleSearch(): void {
  page.value = 1;
  void load();
}

function handleReset(): void {
  keyword.value = "";
  status.value = TALENT_DIRECTION_REQUEST_STATUS_PENDING;
  page.value = 1;
  void load();
}

function handleStatusChange(): void {
  page.value = 1;
  void load();
}

async function loadDirectionOptions(): Promise<void> {
  if (directionOptions.value.length) return;
  loadingOptions.value = true;
  try {
    const result = await ruleApi.listDirections({ page: 1, pageSize: 100, status: "1" });
    directionOptions.value = result.rows
      .filter((item) => item.status === "1")
      .map((item) => ({ label: `${item.name}（${item.code}）`, value: item.id }));
  } catch {
    // 下拉加载失败由 n-select 空态 + 服务端错误提示兜底。
    directionOptions.value = [];
  } finally {
    loadingOptions.value = false;
  }
}

function openMerge(row: TalentDirectionRequestRow): void {
  mergeTarget.value = row;
  mergeDirectionId.value = "";
  mergeError.value = "";
  showMerge.value = true;
  void loadDirectionOptions();
}

async function submitMerge(): Promise<void> {
  const target = mergeTarget.value;
  if (!target || merging.value) return;
  if (!mergeDirectionId.value) {
    mergeError.value = "请选择目标方向";
    return;
  }
  merging.value = true;
  mergeError.value = "";
  try {
    await directionApi.mergeRequest(target.id, mergeDirectionId.value);
    showMerge.value = false;
    await load();
    emit("merged");
  } catch {
    // useApi 已统一提示服务端错误（404 / 422 目标停用 / 409 别名冲突、已处理）；刷新同步最新状态。
    showMerge.value = false;
    await load();
  } finally {
    merging.value = false;
  }
}

function confirmPromote(row: TalentDirectionRequestRow): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const settle = (value: boolean): void => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    dialog.warning({
      title: `转正自定义方向「${row.manualName}」`,
      content:
        "将生成一个「停用待配置」的培养方向：需补充要素与要求分级后手动启用，不会自动发布到 C 端。确认转正？",
      positiveText: "转正",
      negativeText: "取消",
      onPositiveClick: () => settle(true),
      onNegativeClick: () => settle(false),
      onClose: () => settle(false),
    });
  });
}

async function promote(row: TalentDirectionRequestRow): Promise<void> {
  if (busyId.value) return;
  const confirmed = await confirmPromote(row);
  if (!confirmed) return;
  busyId.value = row.id;
  try {
    await directionApi.promoteRequest(row.id);
    await load();
    emit("merged");
  } catch {
    // useApi 已统一提示服务端错误（422 无启用档位 / 409 已处理）；刷新同步最新状态。
    await load();
  } finally {
    busyId.value = "";
  }
}

function close(): void {
  emit("update:show", false);
}

watch(
  () => props.show,
  (show) => {
    if (!show) {
      showMerge.value = false;
      return;
    }
    keyword.value = "";
    status.value = TALENT_DIRECTION_REQUEST_STATUS_PENDING;
    page.value = 1;
    void load();
  },
  { immediate: true },
);
</script>

<template>
  <n-modal
    :show="props.show"
    preset="card"
    title="自定义方向待归并"
    style="width: min(1240px, calc(100vw - 32px))"
    :mask-closable="false"
    @update:show="emit('update:show', $event)"
  >
    <n-alert type="info" :show-icon="false" class="requests-intro">
      家长在 C 端自填的方向会进入此处。归并到已有方向会把自填名称写入该方向别名（不改变方向配置）；
      转正会生成「停用待配置」方向，需补充要素与要求分级后启用。
    </n-alert>

    <div class="requests-toolbar">
      <n-select
        v-model:value="status"
        class="status-select"
        :options="statusOptions"
        aria-label="按状态筛选"
        @update:value="handleStatusChange"
      />
      <n-input
        v-model:value="keyword"
        class="keyword-input"
        placeholder="自填方向 / 家长 / 子女"
        clearable
        @keyup.enter="handleSearch"
      />
      <n-button type="primary" @click="handleSearch">搜索</n-button>
      <n-button @click="handleReset">重置</n-button>
    </div>

    <n-alert v-if="error" type="error" :show-icon="false" class="requests-alert">
      {{ error }}
      <n-button size="small" text type="primary" @click="load">重试</n-button>
    </n-alert>

    <n-data-table
      :columns="columns"
      :data="error ? [] : rows"
      :loading="loading"
      :bordered="false"
      :scroll-x="1180"
      :row-key="(row: TalentDirectionRequestRow) => row.id"
    >
      <template #empty>
        <n-empty :description="emptyDescription" class="requests-empty" />
      </template>
    </n-data-table>

    <template #footer>
      <div class="requests-footer">
        <AdminPagination
          v-model:page="page"
          v-model:page-size="pageSize"
          :total="total"
          @update:page="load"
          @update:page-size="load"
        />
        <n-button class="close-action" @click="close">关闭</n-button>
      </div>
    </template>
  </n-modal>

  <n-modal
    v-model:show="showMerge"
    preset="card"
    title="归并到已有方向"
    style="width: min(560px, calc(100vw - 32px))"
    :mask-closable="false"
  >
    <n-form label-placement="top">
      <n-form-item label="自填方向">
        <n-input :value="mergeTarget?.manualName || ''" disabled />
      </n-form-item>
      <n-form-item
        label="目标方向（仅启用）"
        required
        :validation-status="mergeError ? 'error' : undefined"
        :feedback="mergeError"
      >
        <n-select
          v-model:value="mergeDirectionId"
          :options="directionOptions"
          :loading="loadingOptions"
          filterable
          placeholder="选择启用的培养方向"
          @update:value="mergeError = ''"
        />
      </n-form-item>
    </n-form>
    <n-alert type="info" :show-icon="false" class="merge-hint">
      「{{ mergeTarget?.manualName || "自填方向" }}」会作为目标方向的别名写入，家长侧自填记录保持原样；
      若别名已被其它方向占用，服务端会以冲突提示中止归并。
    </n-alert>
    <template #footer>
      <div class="requests-footer requests-footer--end">
        <n-button @click="showMerge = false">取消</n-button>
        <n-button
          type="primary"
          class="close-action"
          :loading="merging"
          :disabled="!mergeDirectionId"
          @click="submitMerge"
        >
          确认归并
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<style scoped>
.requests-intro { margin-bottom: 14px; line-height: 1.7; }
.requests-alert { margin-bottom: 12px; }
.requests-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.status-select { width: 132px; }
.keyword-input { width: 260px; }
.requests-empty { padding: 24px 0; }
.requests-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}
.requests-footer--end { justify-content: flex-end; }
.close-action { min-height: 44px; }

/* 表格单元格由 h() 渲染，不带 scoped 属性，统一用 :deep 命中。 */
:deep(.request-cell) { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
:deep(.request-strong) { color: var(--foreground, #333); font-weight: 600; }
:deep(.request-sub) {
  overflow: hidden;
  color: var(--muted-foreground, #6c756a);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
:deep(.manual-name) { color: var(--foreground, #333); font-weight: 600; }
:deep(.mono) { font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace); white-space: nowrap; }
:deep(.muted) { color: var(--muted-foreground, #6c756a); }
:deep(.request-actions) { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.merge-hint { margin-top: 4px; line-height: 1.7; }

:deep(.n-data-table-th) {
  background: var(--muted);
  color: var(--foreground, #333);
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
}
:deep(.n-data-table-td) { padding-top: 10px; padding-bottom: 10px; color: var(--foreground, #333); }
:deep(.n-base-selection-placeholder),
:deep(.n-input__placeholder) { color: var(--muted-foreground, #6c756a); }

@media (max-width: 640px) {
  .keyword-input { flex: 1 1 180px; width: auto; }
  .status-select { width: 100%; }
}
</style>