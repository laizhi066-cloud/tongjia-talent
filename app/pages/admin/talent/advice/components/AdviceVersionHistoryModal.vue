<!--
 * @description 培育建议版本历史弹层（ultra）：按版本看份数与发布 / 撤回状态、周期、来源、更新说明；
 *   「查看该版本」= 让列表带 `versionId` 进入历史只读视图（纯前端查看态，不改任何数据）；
 *   底部说明历史版本不可编辑、家长端只看当前生效版本（spec §6.3 / AC-ADM-07-4）。
 * @file app/pages/admin/talent/advice/components/AdviceVersionHistoryModal.vue
-->
<script setup lang="ts">
import { NButton, NDataTable, NModal, NSpin, NTag, type DataTableColumns } from "naive-ui";
import type { TalentAdviceVersionView } from "~/composables/api/useTalentAdviceApi";

interface Props {
  show: boolean;
  rows: TalentAdviceVersionView[];
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), { loading: false });
const emit = defineEmits<{
  "update:show": [value: boolean];
  /** 切换到指定版本的只读视图（页面清空 / 设置 `versionId` 并重新请求列表）。 */
  view: [versionId: string];
}>();

const columns = computed<DataTableColumns<TalentAdviceVersionView>>(() => [
  {
    title: "版本号",
    key: "versionNo",
    width: 108,
    render: (row) => h("b", { class: "mono" }, row.versionNo || "—"),
  },
  {
    title: "状态",
    key: "status",
    width: 94,
    render: (row) =>
      h(
        NTag,
        {
          size: "small",
          bordered: false,
          type: row.status === "active" ? "success" : "default",
        },
        { default: () => row.statusLabel },
      ),
  },
  {
    title: "生效周期",
    key: "cycle",
    width: 150,
    render: (row) => h("span", { class: "mono" }, row.cycle || "—"),
  },
  {
    title: "建议份数",
    key: "docCount",
    width: 150,
    render: (row) =>
      h("div", { class: "count-cell" }, [
        h("span", `${Number(row.docCount || 0)} 份`),
        h(
          "span",
          { class: "count-sub" },
          `发布 ${Number(row.publishedCount || 0)} · 撤回 ${Number(row.withdrawnCount || 0)}`,
        ),
      ]),
  },
  {
    title: "生效日期",
    key: "effectiveAt",
    width: 108,
    render: (row) => h("span", { class: "mono" }, row.effectiveAt || "—"),
  },
  {
    title: "同步时间",
    key: "syncedAt",
    width: 140,
    render: (row) => formatTime(row.syncedAt) || "—",
  },
  {
    title: "来源系统",
    key: "source",
    width: 130,
    ellipsis: { tooltip: true },
    render: (row) => row.sourceLabel || row.source || "—",
  },
  {
    title: "更新说明",
    key: "note",
    minWidth: 200,
    ellipsis: { tooltip: true },
    render: (row) => row.note || "—",
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
          onClick: () => emit("view", row.id),
        },
        { default: () => "查看该版本" },
      ),
  },
]);
</script>

<template>
  <n-modal
    :show="props.show"
    preset="card"
    style="width: min(1280px, calc(100vw - 32px))"
    data-testid="advice-versions-modal"
    @update:show="emit('update:show', $event)"
  >
    <template #header>
      <div class="modal-head">
        <div class="modal-title">培育建议版本历史</div>
        <div class="modal-subtitle">
          每 4 个月由外部系统推送一版；后台保留全部版本，家长端只展示当前生效版本。
        </div>
      </div>
    </template>

    <n-spin :show="props.loading">
      <n-data-table
        v-if="props.rows.length"
        :columns="columns"
        :data="props.rows"
        :bordered="false"
        :max-height="420"
        :scroll-x="1220"
        size="small"
        :row-key="(row: TalentAdviceVersionView) => row.id"
        data-testid="advice-versions-table"
      />
      <div v-else class="version-empty">暂无建议版本记录</div>
    </n-spin>

    <p class="version-note">
      历史版本为外部系统推送时的同步快照，仅供后台回溯，不可编辑；家长端只会看到当前生效版本的内容。
      查看历史版本只是切换列表的只读视图，不会改变生效版本。
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
.version-empty { padding: 32px 0; color: var(--muted-foreground, #6c756a); font-size: 13px; text-align: center; }
.version-note {
  margin: 12px 0 0;
  padding-top: 10px;
  border-top: 1px solid var(--border);
  color: var(--muted-foreground, #6c756a);
  font-size: 12px;
  line-height: 1.8;
}
.modal-footer { display: flex; justify-content: flex-end; gap: 8px; }
.count-cell { display: flex; flex-direction: column; line-height: 1.4; white-space: nowrap; }
.count-sub { color: var(--muted-foreground, #6c756a); font-size: 12px; }
.mono { font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace); white-space: nowrap; }
:deep(.n-data-table-th) { white-space: nowrap; background: var(--muted); color: var(--foreground); font-weight: 600; }
:deep(.n-data-table-td) { color: var(--foreground); }
</style>