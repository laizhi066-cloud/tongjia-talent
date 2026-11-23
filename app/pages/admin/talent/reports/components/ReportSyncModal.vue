<!--
 * @description 一键同步弹层（wide，三阶段）：初始 → 预演（三类人群卡片 + 逐人明细）→ 提交结果
 *   （实际计数 + 失败明细 + 同步日志 + 耗时）；`changedSincePreview=true` 额外提示。
 *   预演零写入、不写日志；关闭弹层清空结果（spec §6.6）。
 * @file app/pages/admin/talent/reports/components/ReportSyncModal.vue
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
import type { TalentReportSyncLogRow } from "~/composables/api/useTalentReportApi";
import {
  TALENT_REPORT_SYNC_ACTION_LABELS,
  type TalentReportSyncPreview,
  type TalentReportSyncResult,
  type TalentReportSyncSubjectDetail,
} from "~~/shared/types/talent-report";

interface Props {
  show: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  "update:show": [value: boolean];
  committed: [result: TalentReportSyncResult];
}>();

const api = useTalentReportApi();

type Stage = "init" | "preview" | "commit";

const stage = ref<Stage>("init");
const previewing = ref(false);
const committing = ref(false);
const error = ref("");
const preview = ref<TalentReportSyncPreview | null>(null);
const result = ref<TalentReportSyncResult | null>(null);
const logsLoading = ref(false);
const logs = ref<TalentReportSyncLogRow[]>([]);
const showLogs = ref(false);

const activeDetails = computed<TalentReportSyncSubjectDetail[]>(
  () => result.value?.details ?? preview.value?.details ?? [],
);
const truncated = computed(() =>
  Boolean(result.value?.truncated ?? preview.value?.truncated),
);
const failedDetails = computed(() =>
  activeDetails.value.filter((item) => item.action === "failed"),
);

function reasonText(item: TalentReportSyncSubjectDetail): string {
  if (item.action === "failed") return item.message || "同步失败";
  if (item.reason === "no_result") return "外部暂无数据";
  if (item.reason === "info_mismatch") return "信息不一致";
  return item.message || "—";
}

const detailColumns = computed<DataTableColumns<TalentReportSyncSubjectDetail>>(
  () => [
    { title: "姓名", key: "subjectName", width: 110, ellipsis: { tooltip: true } },
    {
      title: "脱敏身份证",
      key: "maskedIdNo",
      width: 160,
      render: (row) => h("span", { class: "mono" }, row.maskedIdNo || "—"),
    },
    {
      title: "报告编号",
      key: "reportNo",
      width: 150,
      render: (row) => h("span", { class: "mono" }, row.reportNo || "—"),
    },
    {
      title: "类型",
      key: "action",
      width: 110,
      render: (row) =>
        h(
          NTag,
          {
            size: "small",
            bordered: false,
            type:
              row.action === "failed"
                ? "error"
                : row.action === "created"
                  ? "success"
                  : row.action === "empty"
                    ? "default"
                    : "info",
          },
          { default: () => TALENT_REPORT_SYNC_ACTION_LABELS[row.action] },
        ),
    },
    {
      title: "外部已出",
      key: "booksTotal",
      width: 96,
      render: (row) => h("span", { class: "mono" }, row.booksTotal || "—"),
    },
    {
      title: "本次新增",
      key: "booksAdded",
      width: 96,
      render: (row) => h("span", { class: "mono" }, row.booksAdded || "—"),
    },
    {
      title: "原因或失败摘要",
      key: "message",
      minWidth: 220,
      ellipsis: { tooltip: true },
      render: (row) => reasonText(row),
    },
  ],
);

const logColumns = computed<DataTableColumns<TalentReportSyncLogRow>>(() => [
  {
    title: "时间",
    key: "at",
    width: 160,
    render: (row) => formatTime(row.at) || "—",
  },
  { title: "结果", key: "statusLabel", width: 100 },
  { title: "刷新", key: "refreshed", width: 70 },
  { title: "新建", key: "created", width: 70 },
  { title: "暂无", key: "empty", width: 70 },
  { title: "失败", key: "failedCount", width: 70 },
  {
    title: "耗时",
    key: "durationMs",
    width: 90,
    render: (row) => `${Number(row.durationMs || 0)} ms`,
  },
  { title: "操作人", key: "operatorName", width: 120, ellipsis: { tooltip: true } },
]);

function reset(): void {
  stage.value = "init";
  previewing.value = false;
  committing.value = false;
  error.value = "";
  preview.value = null;
  result.value = null;
  logs.value = [];
  showLogs.value = false;
}

async function runPreview(): Promise<void> {
  if (previewing.value) return;
  previewing.value = true;
  error.value = "";
  try {
    const response = await api.syncReports({ mode: "preview" });
    preview.value = response as TalentReportSyncPreview;
    result.value = null;
    stage.value = "preview";
  } catch {
    error.value = "同步预演失败，请检查外部数据源后重试。";
  } finally {
    previewing.value = false;
  }
}

async function commit(): Promise<void> {
  if (committing.value) return;
  committing.value = true;
  error.value = "";
  try {
    const response = await api.syncReports({
      mode: "commit",
      previewCounts: preview.value?.counts,
    });
    result.value = response as TalentReportSyncResult;
    stage.value = "commit";
    emit("committed", result.value);
  } catch {
    error.value = "同步失败，请稍后重试；已写入的数据不会重复创建。";
  } finally {
    committing.value = false;
  }
}

async function toggleLogs(): Promise<void> {
  showLogs.value = !showLogs.value;
  if (!showLogs.value || logs.value.length) return;
  logsLoading.value = true;
  try {
    const response = await api.listSyncLogs();
    logs.value = response.rows.slice(0, 5);
  } catch {
    // useApi 已统一提示服务端错误。
  } finally {
    logsLoading.value = false;
  }
}

watch(
  () => props.show,
  (show) => {
    if (show) reset();
  },
  { immediate: true },
);
</script>

<template>
  <n-modal
    :show="props.show"
    preset="card"
    title="一键同步全部报告"
    style="width: min(1080px, calc(100vw - 32px))"
    @update:show="emit('update:show', $event)"
  >
    <n-spin :show="previewing || committing">
      <n-alert v-if="error" type="error" :show-icon="false" class="sync-error">
        {{ error }}
      </n-alert>

      <!-- 初始：说明 + 开始预演 -->
      <template v-if="stage === 'init'">
        <div class="sync-intro">
          <p class="sync-intro-title">同步会扫描已查到结果的子女，按外部检测机构返回归因为三类：</p>
          <ul class="sync-intro-list">
            <li><b>刷新同步</b>：已有报告，更新外部基因报告与查询时间，不改已发布快照。</li>
            <li><b>新建报告</b>：尚无报告，创建「待发布」报告并写入外部已出分册。</li>
            <li><b>外部暂无数据</b>：已查到结果但检测机构尚未出具报告，不做任何写入。</li>
          </ul>
          <p class="sync-intro-hint">预演只读：不写任何数据、不写同步日志；确认同步时才会真正写入。</p>
        </div>
      </template>

      <!-- 预演结果 -->
      <template v-else-if="stage === 'preview' && preview">
        <n-alert
          v-if="preview.source === 'mock'"
          type="warning"
          :show-icon="false"
          class="sync-alert"
        >
          当前为模拟数据源（mock），M8 接入真实检测机构接口后自动替换；本页数据仅用于本地联调。
        </n-alert>
        <div class="sync-summary">
          <span class="sync-scan">扫描 {{ preview.scanned }} 人</span>
          <div class="sync-cards">
            <div class="sync-card">
              <span class="card-label">刷新同步</span>
              <b>{{ preview.counts.refreshed }}</b>
            </div>
            <div class="sync-card">
              <span class="card-label">新建报告</span>
              <b>{{ preview.counts.created }}</b>
            </div>
            <div class="sync-card">
              <span class="card-label">外部暂无数据</span>
              <b>{{ preview.counts.empty }}</b>
            </div>
            <div class="sync-card sync-card--failed">
              <span class="card-label">失败</span>
              <b>{{ preview.counts.failed }}</b>
            </div>
          </div>
        </div>

        <div class="sync-section-title">
          逐人明细
          <span class="section-hint">预演结果，不会写入</span>
        </div>
        <n-data-table
          v-if="activeDetails.length"
          :columns="detailColumns"
          :data="activeDetails"
          :bordered="false"
          :max-height="300"
          :scroll-x="1000"
          size="small"
          :row-key="(row: TalentReportSyncSubjectDetail) => `${row.subjectId}-${row.action}`"
        />
        <div v-else class="sync-empty">暂无已查到结果的子女，请先在会员管理中查询。</div>
        <p v-if="truncated" class="sync-truncated">明细超过 500 条，仅展示前 500 条。</p>
      </template>

      <!-- 提交结果 -->
      <template v-else-if="stage === 'commit' && result">
        <n-alert
          v-if="result.changedSincePreview"
          type="warning"
          :show-icon="false"
          class="sync-alert"
        >
          外部数据已变化，已按最新结果写入（与预演计数不同）。
        </n-alert>
        <div class="sync-summary">
          <span class="sync-scan">
            已提交：扫描 {{ result.scanned }} 人 · 耗时 {{ result.durationMs }} ms
          </span>
          <div class="sync-cards">
            <div class="sync-card">
              <span class="card-label">刷新同步</span>
              <b>{{ result.counts.refreshed }}</b>
            </div>
            <div class="sync-card">
              <span class="card-label">新建报告</span>
              <b>{{ result.counts.created }}</b>
            </div>
            <div class="sync-card">
              <span class="card-label">外部暂无数据</span>
              <b>{{ result.counts.empty }}</b>
            </div>
            <div class="sync-card sync-card--failed">
              <span class="card-label">失败</span>
              <b>{{ result.counts.failed }}</b>
            </div>
          </div>
        </div>

        <p class="sync-log-line">
          同步日志：<span class="mono">{{ result.syncLogId || "未写入（不影响同步结果）" }}</span>
        </p>

        <div v-if="failedDetails.length" class="sync-failed">
          <div class="sync-section-title">失败明细</div>
          <ul class="failed-list">
            <li v-for="item in failedDetails" :key="`${item.subjectId}-fail`">
              {{ item.subjectName || item.subjectId }}（{{ item.maskedIdNo || "—" }}）：
              {{ reasonText(item) }}
            </li>
          </ul>
        </div>

        <n-button text type="primary" class="sync-log-toggle" @click="toggleLogs">
          {{ showLogs ? "收起最近同步记录" : "查看最近同步记录" }}
        </n-button>
        <n-spin v-if="showLogs" :show="logsLoading">
          <n-data-table
            v-if="logs.length"
            :columns="logColumns"
            :data="logs"
            :bordered="false"
            :scroll-x="880"
            size="small"
            :row-key="(row: TalentReportSyncLogRow) => row.id"
            class="sync-logs"
          />
          <div v-else class="sync-empty">暂无同步记录</div>
        </n-spin>
      </template>
    </n-spin>

    <template #footer>
      <div class="sync-footer">
        <template v-if="stage === 'init'">
          <n-button :disabled="previewing" @click="emit('update:show', false)">取消</n-button>
          <n-button type="primary" class="main-action" :loading="previewing" @click="runPreview">
            开始预演
          </n-button>
        </template>
        <template v-else-if="stage === 'preview'">
          <n-button :disabled="committing" @click="runPreview">重新预演</n-button>
          <n-button
            type="primary"
            class="main-action"
            :loading="committing"
            @click="commit"
          >
            确认同步
          </n-button>
        </template>
        <template v-else>
          <n-button @click="emit('update:show', false)">关闭</n-button>
          <n-button type="primary" class="main-action" @click="emit('update:show', false)">
            完成
          </n-button>
        </template>
      </div>
    </template>
  </n-modal>
</template>

<style scoped>
.sync-error { margin-bottom: 12px; line-height: 1.7; }
.sync-alert { margin-bottom: 12px; line-height: 1.6; }
.sync-intro { padding: 4px 2px; line-height: 1.8; }
.sync-intro-title { margin: 0 0 8px; font-size: 13px; font-weight: 600; }
.sync-intro-list { padding-left: 20px; margin: 0 0 8px; color: var(--foreground); font-size: 13px; }
.sync-intro-list li { margin-bottom: 4px; }
.sync-intro-hint { margin: 0; color: var(--muted-foreground, #6c756a); font-size: 12px; }
.sync-summary { display: flex; flex-direction: column; gap: 8px; }
.sync-scan { color: var(--muted-foreground, #6c756a); font-size: 12px; }
.sync-cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
.sync-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
}
.sync-card b { font-size: 20px; font-variant-numeric: tabular-nums; }
.sync-card--failed { border-color: color-mix(in srgb, var(--destructive, #d03050) 45%, var(--border)); }
.sync-card--failed b { color: var(--destructive, #d03050); }
.card-label { color: var(--muted-foreground, #6c756a); font-size: 12px; }
.sync-section-title { margin: 16px 0 8px; font-size: 13px; font-weight: 600; }
.section-hint { margin-left: 8px; color: var(--muted-foreground, #6c756a); font-size: 12px; font-weight: 400; }
.sync-empty { padding: 24px 0; color: var(--muted-foreground, #6c756a); font-size: 13px; text-align: center; }
.sync-truncated { margin: 6px 0 0; color: var(--muted-foreground, #6c756a); font-size: 12px; }
.sync-log-line { margin: 12px 0 0; color: var(--muted-foreground, #6c756a); font-size: 12px; }
.failed-list { padding-left: 20px; margin: 0; font-size: 13px; line-height: 1.8; }
.sync-log-toggle { margin-top: 14px; }
.sync-logs { margin-top: 8px; }
.sync-footer { display: flex; justify-content: flex-end; gap: 8px; }
.main-action { min-height: 44px; }
.mono { font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace); }
:deep(.n-data-table-th) { white-space: nowrap; background: var(--muted); color: var(--foreground); font-weight: 600; }
:deep(.n-data-table-td) { color: var(--foreground); }

@media (max-width: 720px) {
  .sync-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>