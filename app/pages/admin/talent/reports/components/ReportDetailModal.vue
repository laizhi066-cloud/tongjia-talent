<!--
 * @description 报告详情弹层（ultra 宽度）：顶部信息条 + 4 页签（已选培养方向和目标 / 匹配天赋 /
 *   基因报告 / 培育建议），页签带数量、`?tab=` 旧值回落由页面归一化后传入；页签切换不重复请求
 *   整个详情，单册叠加层按需请求。写动作成功后刷新详情并通知页面刷新列表（spec §6.2）。
 * @file app/pages/admin/talent/reports/components/ReportDetailModal.vue
-->
<script setup lang="ts">
import {
  NAlert,
  NButton,
  NDataTable,
  NEmpty,
  NModal,
  NSpin,
  NTab,
  NTabs,
  NTag,
  useDialog,
  type DataTableColumns,
} from "naive-ui";
import type { TalentReportDetail } from "~/composables/api/useTalentReportApi";
import type { TalentSelectionItem } from "~~/shared/types/talent-direction";
import {
  formatHitRate,
  mergeMatchingRows,
  reportMatchingChangeText,
  reportStatusTagType,
  type ReportDetailTab,
  type ReportMatchingRow,
} from "../report-ui";
import ReportVolumeModal from "./ReportVolumeModal.vue";

interface Props {
  show: boolean;
  reportId: string;
  /** 归一化后的初始页签（页面从 `?tab=` 读取，旧值已回落首签）。 */
  initialTab?: ReportDetailTab;
}

const props = withDefaults(defineProps<Props>(), { initialTab: "selected" });
const emit = defineEmits<{
  "update:show": [value: boolean];
  changed: [];
  publish: [reportNo: string];
  reissue: [reportNo: string];
  withdraw: [reportNo: string];
  restore: [reportNo: string];
  tab: [value: ReportDetailTab];
}>();

const api = useTalentReportApi();
const dialog = useDialog();
const { hasPermission } = usePermission();
const canPublish = computed(() => hasPermission("talent:report:publish"));

const loading = ref(false);
const error = ref("");
const detail = ref<TalentReportDetail | null>(null);
const tab = ref<ReportDetailTab>("selected");
const regenerating = ref(false);

const showVolume = ref(false);
const volumeId = ref("");

const report = computed(() => detail.value?.report ?? null);
const subject = computed(() => detail.value?.subject ?? null);
const parent = computed(() => detail.value?.parent ?? null);
const geneReport = computed(() => detail.value?.geneReport ?? null);
const matching = computed(() => detail.value?.tabs.matching ?? null);
const selections = computed<TalentSelectionItem[]>(
  () => detail.value?.tabs.selections ?? [],
);
const volumes = computed(() => detail.value?.tabs.geneReport.volumes ?? []);
const advice = computed(() => detail.value?.tabs.advice ?? null);

/** 已发布 / 已撤回均有冻结快照；待发布显示「发布后可查看」。 */
const hasSnapshot = computed(
  () => Number(report.value?.snapshotVersion || 0) > 0,
);
const matchingRows = computed<ReportMatchingRow[]>(() =>
  matching.value ? mergeMatchingRows(matching.value) : [],
);
const matchingDirectionCount = computed(() => matchingRows.value.length);
const openBooksText = computed(() => report.value?.openBooksText || "");

function reportStatusType(): "default" | "success" | "warning" | "error" {
  return reportStatusTagType(String(report.value?.status || ""));
}

function openVolume(row: { volumeId: string }): void {
  volumeId.value = row.volumeId;
  showVolume.value = true;
}

function handleTabChange(value: string): void {
  const next = value as ReportDetailTab;
  tab.value = next;
  emit("tab", next);
}

// ── 已选培养方向和目标 ─────────────────────────────────────────────────────────
const selectionColumns = computed<DataTableColumns<TalentSelectionItem>>(() => [
  {
    title: "培养方向",
    key: "directionName",
    minWidth: 150,
    ellipsis: { tooltip: true },
    render: (row) => row.directionName || row.manualName || "—",
  },
  {
    title: "目标档位",
    key: "tierName",
    width: 120,
    ellipsis: { tooltip: true },
    render: (row) => row.tierName || "—",
  },
  {
    title: "建议师资",
    key: "teacher",
    width: 140,
    ellipsis: { tooltip: true },
    render: (row) => row.teacher || "—",
  },
  {
    title: "频次",
    key: "freq",
    width: 120,
    ellipsis: { tooltip: true },
    render: (row) => row.freq || "—",
  },
  {
    title: "提交时间",
    key: "selectedAt",
    width: 160,
    render: (row) => formatTime(row.selectedAt) || "—",
  },
  {
    title: "类型",
    key: "custom",
    width: 90,
    render: (row) =>
      h(
        NTag,
        { size: "small", bordered: false, type: row.custom ? "info" : "default" },
        { default: () => (row.custom ? "自定义" : "正式") },
      ),
  },
]);

// ── 匹配天赋 ─────────────────────────────────────────────────────────────────
const matchingColumns = computed<DataTableColumns<ReportMatchingRow>>(() => [
  {
    title: "方向",
    key: "name",
    minWidth: 150,
    ellipsis: { tooltip: true },
    render: (row) =>
      h("span", null, [
        row.name || "—",
        row.code ? h("span", { class: "muted-code" }, ` ${row.code}`) : null,
      ]),
  },
  {
    title: "发布时命中",
    key: "frozenHitCount",
    width: 120,
    render: (row) =>
      hasSnapshot.value ? `${row.frozenHitCount} 项` : "—",
  },
  {
    title: "当前配置命中",
    key: "currentHitCount",
    width: 140,
    render: (row) =>
      hasSnapshot.value ? `${row.currentHitCount} 项` : "—",
  },
  {
    title: "变化",
    key: "change",
    minWidth: 180,
    ellipsis: { tooltip: true },
    render: (row) => reportMatchingChangeText(row),
  },
  {
    title: "方向版本",
    key: "version",
    width: 100,
    render: (row) => (row.version ? `v${row.version}` : "—"),
  },
]);

const hitRateColumns = computed<DataTableColumns<ReportMatchingRow>>(() => [
  {
    title: "方向",
    key: "name",
    minWidth: 150,
    ellipsis: { tooltip: true },
  },
  {
    title: "发布时命中率",
    key: "frozenHitRate",
    width: 140,
    render: (row) => formatHitRate(row.frozenHitRate),
  },
  {
    title: "当前命中率",
    key: "currentHitRate",
    width: 120,
    render: (row) => formatHitRate(row.currentHitRate),
  },
]);

// ── 基因报告六册 ──────────────────────────────────────────────────────────────
type VolumeRow = TalentReportDetail["tabs"]["geneReport"]["volumes"][number];

const volumeColumns = computed<DataTableColumns<VolumeRow>>(() => [
  {
    title: "册",
    key: "name",
    minWidth: 160,
    render: (row) =>
      h("span", null, [
        h("b", { class: "mono" }, row.bookCode),
        ` ${row.name}`,
      ]),
  },
  {
    title: "开放状态",
    key: "open",
    width: 130,
    render: (row) =>
      h(
        NTag,
        { size: "small", bordered: false, type: row.open ? "success" : "default" },
        { default: () => (row.open ? "已开放" : "未开放") },
      ),
  },
  { title: "章节数", key: "chapterCount", width: 96 },
  { title: "要素数", key: "factorCount", width: 96 },
  {
    title: "操作",
    key: "actions",
    width: 96,
    fixed: "right",
    render: (row) =>
      h(
        NButton,
        {
          size: "tiny",
          quaternary: true,
          type: "primary",
          onClick: () => openVolume(row),
        },
        { default: () => "详情" },
      ),
  },
]);

// ── 数据加载与写动作 ───────────────────────────────────────────────────────────
async function load(silent = false): Promise<void> {
  if (!props.reportId) return;
  if (!silent) {
    loading.value = true;
    error.value = "";
  }
  try {
    detail.value = await api.getReport(props.reportId);
  } catch {
    if (!silent) error.value = "报告详情加载失败，请稍后重试。";
  } finally {
    if (!silent) loading.value = false;
  }
}

async function confirmRegenerate(): Promise<void> {
  if (regenerating.value) return;
  const confirmed = await new Promise<boolean>((resolve) => {
    let settled = false;
    const settle = (value: boolean): void => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    dialog.warning({
      title: "按当前配置重新生成快照",
      content:
        "将按当前方向 / 档位 / 要素配置重算本报告快照，影响 C 端展示，快照版本 +1，并写入版本历史；开放分册与要素范围不变。确认重新生成？",
      positiveText: "重新生成",
      negativeText: "取消",
      onPositiveClick: () => settle(true),
      onNegativeClick: () => settle(false),
      onClose: () => settle(false),
    });
  });
  if (!confirmed) return;
  regenerating.value = true;
  try {
    await api.regenerateSnapshot(props.reportId, true);
    await load(true);
    emit("changed");
  } catch {
    // useApi 已统一提示服务端错误。
  } finally {
    regenerating.value = false;
  }
}

defineExpose({
  reload: () => load(true),
  refresh: () => load(true),
});

watch(
  () => [props.show, props.reportId],
  ([show, reportId]) => {
    if (!show || !reportId) {
      if (!show) showVolume.value = false;
      return;
    }
    tab.value = props.initialTab || "selected";
    detail.value = null;
    void load();
  },
  { immediate: true },
);

watch(
  () => props.initialTab,
  (value) => {
    if (props.show) tab.value = value || "selected";
  },
);
</script>

<template>
  <n-modal
    :show="props.show"
    preset="card"
    title="报告详情"
    style="width: min(1280px, calc(100vw - 32px))"
    data-testid="report-detail-modal"
    @update:show="emit('update:show', $event)"
  >
    <n-spin :show="loading">
      <n-alert v-if="error" type="error" :show-icon="false" class="detail-error">
        {{ error }}
        <n-button size="tiny" quaternary type="primary" @click="load()">重试</n-button>
      </n-alert>

      <template v-if="detail && report">
        <div class="detail-head">
          <div class="detail-ident">
            <span class="mono detail-no">{{ report.reportNo }}</span>
            <b class="detail-subject">{{ subject?.name || "本人" }}</b>
            <n-tag size="small" :bordered="false" :type="reportStatusType()">
              {{ report.statusLabel }}
            </n-tag>
            <span class="version-chip">快照 v{{ report.snapshotVersion || 0 }}</span>
          </div>
          <div class="detail-facts">
            <span class="fact"><i>家长</i>{{ parent?.name || "—" }}</span>
            <span class="fact"><i>手机号</i>{{ parent?.maskedMobile || "—" }}</span>
            <span class="fact"><i>性别</i>{{ subject?.genderLabel || "—" }}</span>
            <span class="fact"><i>年龄</i>{{ subject?.age ? `${subject.age} 岁` : "—" }}</span>
            <span class="fact">
              <i>开放册</i>
              <span class="mono">{{ openBooksText || "—" }}</span>
            </span>
            <span class="fact"><i>要素数</i>{{ report.factorCount }}</span>
          </div>
          <div class="detail-actions">
            <n-button
              v-if="report.status === 'pending_publish' && canPublish"
              type="primary"
              class="main-action"
              @click="emit('publish', report.reportNo)"
            >
              发布
            </n-button>
            <n-button
              v-if="report.status === 'published' && canPublish"
              type="warning"
              class="main-action"
              @click="emit('withdraw', report.reportNo)"
            >
              撤回
            </n-button>
            <n-button
              v-if="report.status === 'retracted' && canPublish"
              type="primary"
              class="main-action"
              @click="emit('restore', report.reportNo)"
            >
              恢复发布
            </n-button>
            <n-button
              v-if="report.status === 'published' && report.newBookCount > 0 && canPublish"
              class="main-action"
              @click="emit('reissue', report.reportNo)"
            >
              补发（{{ report.newBookCount }} 册）
            </n-button>
          </div>
        </div>

        <n-tabs
          :value="tab"
          type="line"
          data-testid="report-detail-tabs"
          @update:value="handleTabChange"
        >
          <n-tab name="selected" :tab="`已选培养方向和目标（${selections.length}）`" />
          <n-tab name="matching" :tab="`匹配天赋（${matchingDirectionCount}）`" />
          <n-tab name="gene" :tab="`基因报告（${volumes.length}）`" />
          <n-tab name="advice" :tab="`培育建议（${advice?.items.length || 0}）`" />
        </n-tabs>

        <!-- 1. 已选培养方向和目标 -->
        <div v-if="tab === 'selected'" class="tab-panel" data-testid="report-tab-selected">
          <n-data-table
            v-if="selections.length"
            :columns="selectionColumns"
            :data="selections"
            :bordered="false"
            :scroll-x="880"
            size="small"
            :row-key="(row: TalentSelectionItem) => `${row.directionId}-${row.requestId}-${row.selectedAt}`"
          />
          <n-empty v-else description="尚未选择培养方向" class="tab-empty" />
        </div>

        <!-- 2. 匹配天赋 -->
        <div v-else-if="tab === 'matching'" class="tab-panel" data-testid="report-tab-matching">
          <template v-if="hasSnapshot">
            <div class="tab-toolbar">
              <div class="tab-notes">
                <n-alert
                  v-if="matching?.configChanged"
                  type="warning"
                  :show-icon="false"
                  class="config-changed"
                >
                  方向或档位配置已变更，当前命中与发布时不同。
                </n-alert>
                <span v-else class="tab-note">
                  当前配置与发布快照一致；配置调整不会回写已发布报告的快照。
                </span>
              </div>
              <n-button
                v-if="canPublish"
                size="small"
                :loading="regenerating"
                data-testid="report-regenerate"
                @click="confirmRegenerate"
              >
                按当前配置重新生成快照
              </n-button>
            </div>

            <n-data-table
              v-if="matchingRows.length"
              :columns="matchingColumns"
              :data="matchingRows"
              :bordered="false"
              :scroll-x="900"
              size="small"
              :row-key="(row: ReportMatchingRow) => row.key"
            />
            <n-empty v-else description="当前配置没有可展示的方向命中" class="tab-empty" />

            <details v-if="matchingRows.length" class="rate-details">
              <summary>命中率明细</summary>
              <n-data-table
                :columns="hitRateColumns"
                :data="matchingRows"
                :bordered="false"
                :scroll-x="640"
                size="small"
                :row-key="(row: ReportMatchingRow) => row.key"
              />
            </details>

            <p v-if="matching?.diff.length" class="diff-hint">
              共 {{ matching.diff.length }} 个方向与发布快照存在差异，详见「变化」列。
            </p>
          </template>
          <div v-else class="tab-placeholder" data-testid="report-matching-locked">
            <n-empty description="发布后可查看匹配天赋" />
            <p class="placeholder-hint">报告发布时会冻结方向命中与档位，后续可在此对比当前配置。</p>
          </div>
        </div>

        <!-- 3. 基因报告 -->
        <div v-else-if="tab === 'gene'" class="tab-panel" data-testid="report-tab-gene">
          <div class="tab-toolbar">
            <span class="tab-note">
              外部已出
              <b class="mono">{{ report.booksText || "—" }}</b>
              （{{ report.geneBookCount }} 册）· 篇目
              {{ geneReport?.sectionCount || 0 }} 条 · 开放
              <b class="mono">{{ openBooksText || "—" }}</b>
            </span>
          </div>
          <n-data-table
            v-if="volumes.length"
            :columns="volumeColumns"
            :data="volumes"
            :bordered="false"
            :scroll-x="700"
            size="small"
            :row-key="(row: VolumeRow) => row.volumeId"
          />
          <n-empty v-else description="暂无基因报告分册数据" class="tab-empty" />
          <p class="tab-footnote">
            后台可查看全部 6 册（含未开放册）；「未开放」册 C 端不可读。
          </p>
        </div>

        <!-- 4. 培育建议 -->
        <div v-else class="tab-panel" data-testid="report-tab-advice">
          <n-empty
            :description="advice?.emptyText || '培育建议将在 M5 接入后显示'"
            class="tab-empty"
          />
        </div>
      </template>
    </n-spin>

    <template #footer>
      <div class="detail-footer">
        <n-button @click="emit('update:show', false)">关闭</n-button>
      </div>
    </template>
  </n-modal>

  <ReportVolumeModal
    v-model:show="showVolume"
    :report-id="props.reportId"
    :volume-id="volumeId"
  />
</template>

<style scoped>
.detail-error { margin-bottom: 12px; line-height: 1.7; }
.detail-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px 20px;
  padding-bottom: 12px;
  margin-bottom: 4px;
  border-bottom: 1px solid var(--border);
}
.detail-ident { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; }
.detail-no { color: var(--muted-foreground, #6c756a); font-size: 12px; }
.detail-subject { font-size: 16px; }
.version-chip {
  padding: 1px 8px;
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--muted-foreground, #6c756a);
  font-size: 12px;
}
.detail-facts { display: flex; flex: 1 1 460px; flex-wrap: wrap; gap: 6px 20px; }
.fact { display: inline-flex; align-items: baseline; gap: 6px; font-size: 13px; }
.fact i { color: var(--muted-foreground, #6c756a); font-size: 12px; font-style: normal; }
.detail-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.main-action { min-height: 44px; }
.tab-panel { padding-top: 12px; }
.tab-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  padding-bottom: 10px;
}
.tab-notes { flex: 1 1 420px; min-width: 0; }
.tab-note { color: var(--muted-foreground, #6c756a); font-size: 12px; }
.config-changed { line-height: 1.6; }
.tab-empty { padding: 36px 0; }
.tab-placeholder { display: flex; flex-direction: column; align-items: center; padding: 28px 0; }
.placeholder-hint { margin: 4px 0 0; color: var(--muted-foreground, #6c756a); font-size: 12px; }
.tab-footnote { margin: 12px 0 0; color: var(--muted-foreground, #6c756a); font-size: 12px; }
.diff-hint { margin: 10px 0 0; color: var(--muted-foreground, #6c756a); font-size: 12px; }
.rate-details { margin-top: 12px; }
.rate-details summary {
  margin-bottom: 8px;
  color: var(--muted-foreground, #6c756a);
  font-size: 12px;
  cursor: pointer;
}
.detail-footer { display: flex; justify-content: flex-end; gap: 8px; }
.mono { font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace); white-space: nowrap; }
:deep(.muted-code) { color: var(--muted-foreground, #6c756a); font-size: 12px; }
:deep(.n-data-table-th) { white-space: nowrap; background: var(--muted); color: var(--foreground); font-weight: 600; }
:deep(.n-data-table-td) { color: var(--foreground); }
</style>