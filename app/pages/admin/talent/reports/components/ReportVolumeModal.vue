<!--
 * @description 单册叠加层（large）：按需读取 `GET /reports/:id/volumes/:volumeId`，平铺展示
 *   章节 / 要素编码 / 潜质要素 / 数据熵（分级名+编码）/ 固定注解；后台可查看全部 6 册，
 *   未开放册标注「未开放（C 端不可读）」；行数多时表格内部滚动（spec §6.2-3）。
 * @file app/pages/admin/talent/reports/components/ReportVolumeModal.vue
-->
<script setup lang="ts">
import {
  NAlert,
  NButton,
  NDataTable,
  NModal,
  NSpin,
  NTag,
  type DataTableColumns,
} from "naive-ui";
import type { TalentReportVolumeDetail } from "~/composables/api/useTalentReportApi";

interface Props {
  show: boolean;
  reportId: string;
  volumeId: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{ "update:show": [value: boolean] }>();

const api = useTalentReportApi();

const loading = ref(false);
const error = ref("");
const detail = ref<TalentReportVolumeDetail | null>(null);

interface FactorRow {
  key: string;
  chapter: string;
  code: string;
  name: string;
  entropy: string;
  note: string;
}

const rows = computed<FactorRow[]>(() => {
  const chapters = detail.value?.chapters ?? [];
  return chapters.flatMap((chapter) =>
    (chapter.factors ?? []).map((factor) => ({
      key: `${chapter.chapter}-${factor.code}`,
      chapter: chapter.chapter,
      code: factor.code,
      name: factor.name,
      entropy: [factor.levelName, factor.levelCode].filter(Boolean).join(" "),
      note: factor.note,
    })),
  );
});

const columns = computed<DataTableColumns<FactorRow>>(() => [
  {
    title: "章节",
    key: "chapter",
    width: 200,
    ellipsis: { tooltip: true },
  },
  {
    title: "要素编码",
    key: "code",
    width: 110,
    render: (row: FactorRow) => h("span", { class: "mono" }, row.code),
  },
  {
    title: "潜质要素",
    key: "name",
    width: 170,
    ellipsis: { tooltip: true },
  },
  {
    title: "数据熵",
    key: "entropy",
    width: 120,
    ellipsis: { tooltip: true },
    render: (row: FactorRow) => row.entropy || "—",
  },
  {
    title: "固定注解",
    key: "note",
    minWidth: 360,
    ellipsis: { tooltip: true },
    render: (row: FactorRow) => row.note || "—",
  },
]);

const title = computed(() =>
  detail.value
    ? `${detail.value.bookCode} 册 · ${detail.value.name}`
    : "分册详情",
);

const sourceHint = computed(() => {
  if (!detail.value) return "";
  return detail.value.source === "snapshot"
    ? "内容来自发布时冻结的快照，配置调整不回写该册。"
    : "报告尚未发布：按当前要素库实时只读展示，发布后冻结。";
});

async function load(): Promise<void> {
  if (!props.reportId || !props.volumeId) return;
  loading.value = true;
  error.value = "";
  detail.value = null;
  try {
    detail.value = await api.getReportVolume(props.reportId, props.volumeId);
  } catch {
    // useApi 已统一提示服务端错误；弹层内再给可重试的文案。
    error.value = "分册内容加载失败，请稍后重试。";
  } finally {
    loading.value = false;
  }
}

watch(
  () => [props.show, props.reportId, props.volumeId],
  ([show]) => {
    if (show) void load();
    else detail.value = null;
  },
  { immediate: true },
);
</script>

<template>
  <n-modal
    :show="props.show"
    preset="card"
    :title="title"
    style="width: min(1080px, calc(100vw - 32px))"
    @update:show="emit('update:show', $event)"
  >
    <n-spin :show="loading">
      <n-alert v-if="error" type="error" :show-icon="false" class="volume-error">
        {{ error }}
        <n-button size="tiny" quaternary type="primary" @click="load">重试</n-button>
      </n-alert>

      <template v-if="detail">
        <div class="volume-head">
          <span class="volume-meta">
            外部编码 <b class="mono">{{ detail.bookCode }}</b>
            · 章节 {{ detail.chapterCount }}
            · 要素 {{ detail.factorCount }}
          </span>
          <n-tag size="small" :bordered="false" :type="detail.open ? 'success' : 'default'">
            {{ detail.open ? "已开放" : "未开放（C 端不可读）" }}
          </n-tag>
        </div>
        <p class="volume-hint">{{ sourceHint }}</p>

        <n-data-table
          v-if="rows.length"
          :columns="columns"
          :data="rows"
          :bordered="false"
          :max-height="420"
          :scroll-x="980"
          size="small"
          :row-key="(row: FactorRow) => row.key"
        />
        <div v-else class="volume-empty">
          <span>该册暂无可展示要素</span>
        </div>
      </template>
    </n-spin>

    <template #footer>
      <div class="volume-footer">
        <n-button @click="emit('update:show', false)">关闭</n-button>
      </div>
    </template>
  </n-modal>
</template>

<style scoped>
.volume-error { margin-bottom: 12px; line-height: 1.7; }
.volume-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  padding-bottom: 8px;
}
.volume-meta { color: var(--muted-foreground, #6c756a); font-size: 13px; }
.volume-hint { margin: 0 0 12px; color: var(--muted-foreground, #6c756a); font-size: 12px; }
.volume-empty { padding: 40px 0; color: var(--muted-foreground, #6c756a); font-size: 13px; text-align: center; }
.volume-footer { display: flex; justify-content: flex-end; gap: 8px; }
.mono { font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace); }
:deep(.n-data-table-th) { white-space: nowrap; background: var(--muted); color: var(--foreground); font-weight: 600; }
:deep(.n-data-table-td) { color: var(--foreground); }
</style>