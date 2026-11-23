<!--
 * @description 补发弹层（wide）：外部已出 / 本次新增 / 补发规则 / 新增册清单；确认后只追加新增册
 *   （v+1，写版本历史与操作日志）。预览走 `GET /reports/:id/reissue-preview`；
 *   无新增册或非已发布由服务端 409 兜底（spec §6.4）。
 * @file app/pages/admin/talent/reports/components/ReportReissueModal.vue
-->
<script setup lang="ts">
import {
  NAlert,
  NButton,
  NDataTable,
  NModal,
  NSpin,
  type DataTableColumns,
} from "naive-ui";
import type {
  TalentReportActionResponse,
  TalentReportReissuePreview,
} from "~/composables/api/useTalentReportApi";

interface Props {
  show: boolean;
  reportId: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  "update:show": [value: boolean];
  reissued: [result: TalentReportActionResponse];
}>();

const api = useTalentReportApi();

const loading = ref(false);
const submitting = ref(false);
const error = ref("");
const preview = ref<TalentReportReissuePreview | null>(null);

const columns = computed<
  DataTableColumns<TalentReportReissuePreview["newVolumes"][number]>
>(() => [
  {
    title: "外部编码",
    key: "bookCode",
    width: 96,
    render: (row) => h("span", { class: "mono" }, row.bookCode),
  },
  { title: "册名", key: "name", minWidth: 140, ellipsis: { tooltip: true } },
  { title: "章节数", key: "chapterCount", width: 96 },
  { title: "要素数", key: "factorCount", width: 96 },
]);

function reset(): void {
  preview.value = null;
  error.value = "";
  submitting.value = false;
}

async function load(): Promise<void> {
  if (!props.reportId) return;
  loading.value = true;
  error.value = "";
  preview.value = null;
  try {
    preview.value = await api.getReissuePreview(props.reportId);
  } catch {
    error.value = "补发预览加载失败：可能当前没有新增分册或报告状态已变化，请刷新列表后重试。";
  } finally {
    loading.value = false;
  }
}

async function submit(): Promise<void> {
  if (!preview.value || submitting.value) return;
  submitting.value = true;
  try {
    const result = await api.reissueReport(props.reportId);
    emit("reissued", result);
    emit("update:show", false);
  } catch {
    // useApi 已统一提示服务端错误（无新增册 409）。
  } finally {
    submitting.value = false;
  }
}

watch(
  () => [props.show, props.reportId],
  ([show]) => {
    if (show) void load();
    else reset();
  },
  { immediate: true },
);
</script>

<template>
  <n-modal
    :show="props.show"
    preset="card"
    title="补发新增分册"
    style="width: min(860px, calc(100vw - 32px))"
    @update:show="emit('update:show', $event)"
  >
    <n-spin :show="loading">
      <n-alert v-if="error" type="error" :show-icon="false" class="reissue-error">
        {{ error }}
        <n-button size="tiny" quaternary type="primary" @click="load">重试</n-button>
      </n-alert>

      <template v-if="preview">
        <div class="reissue-facts">
          <span class="fact">
            <i>报告编号</i><b class="mono">{{ preview.reportNo }}</b>
          </span>
          <span class="fact"><i>当前版本</i>{{ preview.snapshotVersion }}</span>
        </div>

        <div class="reissue-books">
          <div class="book-block">
            <span class="book-label">外部已出</span>
            <b class="book-value mono">{{ preview.externalBooksText || "—" }}</b>
            <span class="book-note">
              {{ preview.externalBooksText.length }} 册
            </span>
          </div>
          <div class="book-block">
            <span class="book-label">已开放</span>
            <b class="book-value mono">{{ preview.publishedBooksText || "—" }}</b>
          </div>
          <div class="book-block book-block--new">
            <span class="book-label">本次新增</span>
            <b class="book-value mono">{{ preview.newBooksText || "—" }}</b>
            <span class="book-note">{{ preview.newVolumes.length }} 册</span>
          </div>
        </div>

        <div class="reissue-section-title">新增册清单</div>
        <n-data-table
          :columns="columns"
          :data="preview.newVolumes"
          :bordered="false"
          size="small"
          :row-key="(row: { volumeId: string }) => row.volumeId"
        />

        <div class="reissue-rules">{{ preview.rules }}</div>
      </template>
    </n-spin>

    <template #footer>
      <div class="reissue-footer">
        <n-button :disabled="submitting" @click="emit('update:show', false)">取消</n-button>
        <n-button
          type="primary"
          class="main-action"
          :loading="submitting"
          :disabled="!preview"
          @click="submit"
        >
          确认补发
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<style scoped>
.reissue-error { margin-bottom: 12px; line-height: 1.7; }
.reissue-facts { display: flex; flex-wrap: wrap; gap: 8px 24px; padding-bottom: 12px; }
.fact { display: inline-flex; align-items: baseline; gap: 6px; font-size: 13px; }
.fact i { color: var(--muted-foreground, #6c756a); font-size: 12px; font-style: normal; }
.reissue-books {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 6px;
}
.book-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
}
.book-block--new {
  border-color: color-mix(in srgb, var(--primary) 40%, var(--border));
  background: color-mix(in srgb, var(--primary) 6%, var(--card));
}
.book-label { color: var(--muted-foreground, #6c756a); font-size: 12px; }
.book-value { font-size: 16px; letter-spacing: 1px; }
.book-note { color: var(--muted-foreground, #6c756a); font-size: 12px; }
.reissue-section-title { margin: 16px 0 8px; font-size: 13px; font-weight: 600; }
.reissue-rules {
  margin-top: 14px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--muted);
  color: var(--muted-foreground, #6c756a);
  font-size: 12px;
  line-height: 1.7;
}
.reissue-footer { display: flex; justify-content: flex-end; gap: 8px; }
.main-action { min-height: 44px; }
.mono { font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace); }
:deep(.n-data-table-th) { background: var(--muted); color: var(--foreground); font-weight: 600; }
:deep(.n-data-table-td) { color: var(--foreground); }

@media (max-width: 720px) {
  .reissue-books { grid-template-columns: minmax(0, 1fr); }
}
</style>