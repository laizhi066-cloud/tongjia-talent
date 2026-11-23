<!--
 * @description 基因报告弹层（large，只读）：外部元数据（报告编号 / 检验人 / 脱敏身份证 / 性别 /
 *   出生日期 / 年龄 / 出具方 / 建档日 / 同步时间 / 来源 / 版本）+ 外部已出分册的章节与要素计数。
 *   数据来自 `GET /gene-reports/:id`，不提供编辑（外部数据由同步刷新；spec §6.7）。
 * @file app/pages/admin/talent/reports/components/ReportGeneModal.vue
-->
<script setup lang="ts">
import {
  NAlert,
  NButton,
  NDataTable,
  NDescriptions,
  NDescriptionsItem,
  NModal,
  NSpin,
  NTag,
  type DataTableColumns,
} from "naive-ui";
import type { TalentGeneReportDetail } from "~/composables/api/useTalentReportApi";

interface Props {
  show: boolean;
  geneReportId: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{ "update:show": [value: boolean] }>();

const api = useTalentReportApi();

const loading = ref(false);
const error = ref("");
const detail = ref<TalentGeneReportDetail["geneReport"] | null>(null);

const chapters = computed(() => detail.value?.chapters ?? []);

const columns = computed<DataTableColumns<TalentGeneReportDetail["geneReport"]["chapters"][number]>>(
  () => [
    {
      title: "外部编码",
      key: "bookCode",
      width: 96,
      render: (row) => h("span", { class: "mono" }, row.bookCode),
    },
    { title: "册名", key: "name", minWidth: 140, ellipsis: { tooltip: true } },
    { title: "章节数", key: "chapterCount", width: 96 },
    { title: "要素数", key: "factorCount", width: 96 },
  ],
);

async function load(): Promise<void> {
  if (!props.geneReportId) return;
  loading.value = true;
  error.value = "";
  detail.value = null;
  try {
    const result = await api.getGeneReport(props.geneReportId);
    detail.value = result.geneReport;
  } catch {
    error.value = "基因报告元数据加载失败，请稍后重试。";
  } finally {
    loading.value = false;
  }
}

watch(
  () => [props.show, props.geneReportId],
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
    title="基因报告"
    style="width: min(960px, calc(100vw - 32px))"
    @update:show="emit('update:show', $event)"
  >
    <n-spin :show="loading">
      <n-alert v-if="error" type="error" :show-icon="false" class="gene-error">
        {{ error }}
        <n-button size="tiny" quaternary type="primary" @click="load">重试</n-button>
      </n-alert>

      <template v-if="detail">
        <div class="gene-head">
          <span class="mono gene-no">{{ detail.reportNo }}</span>
          <b class="gene-name">{{ detail.name }}</b>
          <n-tag size="small" :bordered="false" type="info">{{ detail.sourceLabel }}</n-tag>
          <n-tag size="small" :bordered="false">版本 {{ detail.version || "—" }}</n-tag>
        </div>

        <n-descriptions bordered :column="3" label-placement="left" size="small">
          <n-descriptions-item label="检验人姓名">{{ detail.name || "—" }}</n-descriptions-item>
          <n-descriptions-item label="脱敏身份证">
            <span class="mono">{{ detail.maskedIdNo || "—" }}</span>
          </n-descriptions-item>
          <n-descriptions-item label="性别">{{ detail.genderLabel || "—" }}</n-descriptions-item>
          <n-descriptions-item label="出生日期">{{ detail.birthday || "—" }}</n-descriptions-item>
          <n-descriptions-item label="年龄">
            {{ detail.age ? `${detail.age} 岁` : "—" }}
          </n-descriptions-item>
          <n-descriptions-item label="出具方">{{ detail.issuer || "—" }}</n-descriptions-item>
          <n-descriptions-item label="建档日">
            {{ formatTime(detail.filedAt) || "—" }}
          </n-descriptions-item>
          <n-descriptions-item label="同步时间">
            {{ formatTime(detail.syncedAt) || "—" }}
          </n-descriptions-item>
          <n-descriptions-item label="外部已出">
            <span class="mono">{{ detail.booksText || "—" }}</span>
          </n-descriptions-item>
          <n-descriptions-item label="外部篇目">
            {{ detail.sectionCount }} 条
          </n-descriptions-item>
          <n-descriptions-item label="来源">{{ detail.sourceLabel || "—" }}</n-descriptions-item>
          <n-descriptions-item label="版本">{{ detail.version || "—" }}</n-descriptions-item>
        </n-descriptions>

        <div class="gene-section-title">外部已出分册</div>
        <n-data-table
          v-if="chapters.length"
          :columns="columns"
          :data="chapters"
          :bordered="false"
          size="small"
          :row-key="(row: { bookCode: string }) => row.bookCode"
        />
        <div v-else class="gene-empty">外部暂无分册数据</div>
        <p class="gene-hint">只读：外部数据由「一键同步全部报告」按检测机构返回刷新，后台不提供编辑。</p>
      </template>
    </n-spin>

    <template #footer>
      <div class="gene-footer">
        <n-button @click="emit('update:show', false)">关闭</n-button>
      </div>
    </template>
  </n-modal>
</template>

<style scoped>
.gene-error { margin-bottom: 12px; line-height: 1.7; }
.gene-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
  padding-bottom: 12px;
}
.gene-no { color: var(--muted-foreground, #6c756a); font-size: 12px; }
.gene-name { font-size: 15px; }
.gene-section-title { margin: 18px 0 8px; font-size: 13px; font-weight: 600; }
.gene-empty { padding: 24px 0; color: var(--muted-foreground, #6c756a); font-size: 13px; text-align: center; }
.gene-hint { margin: 12px 0 0; color: var(--muted-foreground, #6c756a); font-size: 12px; }
.gene-footer { display: flex; justify-content: flex-end; gap: 8px; }
.mono { font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace); }
:deep(.n-data-table-th) { background: var(--muted); color: var(--foreground); font-weight: 600; }
:deep(.n-data-table-td) { color: var(--foreground); }
</style>