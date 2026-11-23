<!--
 * @description 按人历史版本弹层：同一报告编号在各建议版本下的快照（版本号 / 周期 / 当时匹配口径 /
 *   数据熵 / 发布状态 / 同步时间 / 是否当前生效），只读；「查看该版本」打开该版建议书详情。
 *   历史版本不可编辑、不能发布或撤回（spec §6.4）。
 * @file app/pages/admin/talent/advice/components/AdvicePersonHistoryModal.vue
-->
<script setup lang="ts">
import { NAlert, NButton, NDataTable, NModal, NSpin, NTag, type DataTableColumns } from "naive-ui";
import type {
  TalentAdvicePersonHistory,
  TalentAdvicePersonHistoryItem,
} from "~/composables/api/useTalentAdviceApi";
import { advicePublishStatusTagType } from "./advice-ui";

interface Props {
  show: boolean;
  adviceId: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  "update:show": [value: boolean];
  /** 打开指定版本的只读建议书详情。 */
  openBook: [adviceId: string];
}>();

const api = useTalentAdviceApi();

const loading = ref(false);
const error = ref("");
const history = ref<TalentAdvicePersonHistory | null>(null);

const subtitle = computed(() => {
  const value = history.value;
  if (!value) return "";
  const count = value.items.length;
  return `${value.name || "—"} · ${value.reportNo || "—"} · 共 ${count} 个版本（每 4 个月一版）`;
});

const columns = computed<DataTableColumns<TalentAdvicePersonHistoryItem>>(() => [
  {
    title: "版本号",
    key: "versionNo",
    width: 168,
    render: (row) =>
      h("span", { class: "version-cell" }, [
        h("b", { class: "mono" }, row.versionNo || "—"),
        h(
          NTag,
          {
            size: "small",
            bordered: false,
            type: row.isCurrent ? "success" : "default",
          },
          { default: () => (row.isCurrent ? "当前生效" : "已归档") },
        ),
      ]),
  },
  {
    title: "生效周期",
    key: "cycle",
    width: 150,
    render: (row) => h("span", { class: "mono" }, row.cycle || "—"),
  },
  {
    title: "当时匹配口径",
    key: "matchKey",
    width: 150,
    ellipsis: { tooltip: true },
    render: (row) => row.matchKey || "—",
  },
  {
    title: "数据熵分布",
    key: "entropyText",
    width: 170,
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
    width: 140,
    render: (row) => formatTime(row.syncedAt) || "—",
  },
  {
    title: "操作",
    key: "actions",
    fixed: "right",
    width: 108,
    render: (row) =>
      h(
        NButton,
        {
          size: "tiny",
          quaternary: true,
          type: "primary",
          onClick: () => emit("openBook", row.id),
        },
        { default: () => "查看该版本" },
      ),
  },
]);

async function load(): Promise<void> {
  if (!props.adviceId) return;
  loading.value = true;
  error.value = "";
  try {
    history.value = await api.getPersonHistory(props.adviceId);
  } catch {
    error.value = "历史版本加载失败，请稍后重试";
  } finally {
    loading.value = false;
  }
}

watch(
  () => [props.show, props.adviceId] as const,
  ([show]) => {
    if (!show) return;
    history.value = null;
    void load();
  },
  { immediate: true },
);
</script>

<template>
  <n-modal
    :show="props.show"
    preset="card"
    style="width: min(1120px, calc(100vw - 32px))"
    data-testid="advice-person-history-modal"
    @update:show="emit('update:show', $event)"
  >
    <template #header>
      <div class="modal-head">
        <div class="modal-title">培育建议 · 历史版本</div>
        <div v-if="subtitle" class="modal-subtitle">{{ subtitle }}</div>
      </div>
    </template>

    <n-spin :show="loading">
      <n-alert v-if="error" type="error" :show-icon="false" class="history-error">
        {{ error }}
      </n-alert>
      <n-data-table
        v-else-if="history && history.items.length"
        :columns="columns"
        :data="history.items"
        :bordered="false"
        :max-height="400"
        :scroll-x="980"
        size="small"
        :row-key="(row: TalentAdvicePersonHistoryItem) => row.id"
        data-testid="advice-person-history-table"
      />
      <div v-else-if="history" class="history-empty">该报告编号暂无历史建议版本</div>
    </n-spin>

    <p class="history-note">
      跨版本年龄按同步当日重算，过完生日会换到下一岁分册；历史版本不可编辑、不能发布或撤回。
    </p>

    <template #footer>
      <div class="modal-footer">
        <n-button @click="emit('update:show', false)">关闭</n-button>
      </div>
    </template>
  </n-modal>
</template>

<style scoped>
.modal-head { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.modal-title { font-size: 16px; font-weight: 600; }
.modal-subtitle { color: var(--muted-foreground, #6c756a); font-size: 12px; }
.history-error { margin-bottom: 12px; line-height: 1.7; }
.history-empty { padding: 32px 0; color: var(--muted-foreground, #6c756a); font-size: 13px; text-align: center; }
.history-note {
  margin: 12px 0 0;
  padding-top: 10px;
  border-top: 1px solid var(--border);
  color: var(--muted-foreground, #6c756a);
  font-size: 12px;
  line-height: 1.8;
}
.modal-footer { display: flex; justify-content: flex-end; gap: 8px; }
.version-cell { display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; }
.mono { font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace); white-space: nowrap; }
:deep(.n-data-table-th) { white-space: nowrap; background: var(--muted); color: var(--foreground); font-weight: 600; }
:deep(.n-data-table-td) { color: var(--foreground); }
</style>