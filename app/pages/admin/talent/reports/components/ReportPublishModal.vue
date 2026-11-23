<!--
 * @description 发布弹层（wide）：信息条 + 六册勾选（外部未出 / 无可解析要素置灰并给原因）+
 *   方向命中预览（前 5 条 + 其余折叠）+ 冻结规则；确认后发布 v1 并回传写响应。
 *   仅待发布报告可打开（服务端 409 兜底）；预览走 `GET /reports/:id/publish-preview`（spec §6.3）。
 * @file app/pages/admin/talent/reports/components/ReportPublishModal.vue
-->
<script setup lang="ts">
import {
  NAlert,
  NButton,
  NCheckbox,
  NCheckboxGroup,
  NDataTable,
  NModal,
  NSpin,
  NTag,
  type DataTableColumns,
} from "naive-ui";
import type {
  TalentReportActionResponse,
  TalentReportPublishPreview,
} from "~/composables/api/useTalentReportApi";
import { formatHitRate } from "../report-ui";

interface Props {
  show: boolean;
  reportId: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  "update:show": [value: boolean];
  published: [result: TalentReportActionResponse];
}>();

const api = useTalentReportApi();

const loading = ref(false);
const submitting = ref(false);
const error = ref("");
const preview = ref<TalentReportPublishPreview | null>(null);
const selectedVolumeIds = ref<string[]>([]);
const showAllDirections = ref(false);

const selectableVolumes = computed(
  () => (preview.value?.volumes ?? []).filter((volume) => volume.selectable),
);

/** 方向命中按 hitCount 降序，默认前 5 条（spec §6.3）。 */
const sortedHits = computed(() =>
  [...(preview.value?.directionHits ?? [])].sort(
    (a, b) => Number(b.hitCount || 0) - Number(a.hitCount || 0),
  ),
);
const visibleHits = computed(() =>
  showAllDirections.value
    ? sortedHits.value
    : sortedHits.value.slice(0, 5),
);
const hiddenDirectionCount = computed(() =>
  Math.max(0, sortedHits.value.length - visibleHits.value.length),
);

const hitColumns = computed<
  DataTableColumns<TalentReportPublishPreview["directionHits"][number]>
>(() => [
  { title: "方向", key: "name", minWidth: 140, ellipsis: { tooltip: true } },
  {
    title: "命中数",
    key: "hitCount",
    width: 96,
    render: (row) => `${Number(row.hitCount || 0)}/${Number(row.total || 0)}`,
  },
  {
    title: "命中率",
    key: "hitRate",
    width: 96,
    render: (row) => formatHitRate(row.hitRate),
  },
  {
    title: "建议档位",
    key: "defaultTierName",
    width: 120,
    ellipsis: { tooltip: true },
    render: (row) => row.defaultTierName || "—",
  },
]);

function reset(): void {
  preview.value = null;
  error.value = "";
  selectedVolumeIds.value = [];
  showAllDirections.value = false;
  submitting.value = false;
}

async function load(): Promise<void> {
  if (!props.reportId) return;
  loading.value = true;
  error.value = "";
  preview.value = null;
  try {
    const result = await api.getPublishPreview(props.reportId);
    preview.value = result;
    // 默认勾选全部可开放册，管理员取消不需要的册即可。
    selectedVolumeIds.value = result.volumes
      .filter((volume) => volume.selectable)
      .map((volume) => volume.volumeId);
  } catch {
    error.value = "发布预览加载失败，请稍后重试。";
  } finally {
    loading.value = false;
  }
}

async function submit(): Promise<void> {
  const current = preview.value;
  if (!current || submitting.value) return;
  if (selectedVolumeIds.value.length === 0) return;
  submitting.value = true;
  try {
    const result = await api.publishReport(
      props.reportId,
      [...selectedVolumeIds.value],
    );
    emit("published", result);
    emit("update:show", false);
  } catch {
    // useApi 已统一提示服务端错误（含非待发布 409）；保持弹层便于重试。
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
    title="发布报告"
    style="width: min(960px, calc(100vw - 32px))"
    @update:show="emit('update:show', $event)"
  >
    <n-spin :show="loading">
      <n-alert v-if="error" type="error" :show-icon="false" class="publish-error">
        {{ error }}
        <n-button size="tiny" quaternary type="primary" @click="load">重试</n-button>
      </n-alert>

      <template v-if="preview">
        <div class="publish-facts">
          <span class="fact"><i>报告编号</i><b class="mono">{{ preview.reportNo }}</b></span>
          <span class="fact"><i>要素数</i>{{ preview.factorCount }}</span>
          <span class="fact"><i>方向数</i>{{ preview.directionCount }}</span>
          <span class="fact"><i>档位数</i>{{ preview.tierCount }}</span>
          <span class="fact">
            <i>当前版本</i>{{ preview.snapshotVersion > 0 ? preview.snapshotVersion : "—" }}
          </span>
        </div>

        <n-alert
          v-if="preview.warnings.length"
          type="warning"
          :show-icon="false"
          class="publish-warnings"
        >
          {{ preview.warnings.join("；") }}
        </n-alert>

        <div class="publish-section-title">
          开放分册
          <span class="section-hint">至少勾选 1 册；未勾选的册 C 端不可读</span>
        </div>
        <n-checkbox-group v-model:value="selectedVolumeIds" class="volume-group">
          <div
            v-for="volume in preview.volumes"
            :key="volume.volumeId"
            class="volume-row"
            :class="{ 'is-disabled': !volume.selectable }"
          >
            <n-checkbox
              :value="volume.volumeId"
              :disabled="!volume.selectable || submitting"
            >
              <span class="volume-name">
                <b class="mono">{{ volume.bookCode }}</b>
                {{ volume.name }}
              </span>
            </n-checkbox>
            <span class="volume-meta">
              {{ volume.chapterCount }} 章 · {{ volume.factorCount }} 要素
            </span>
            <n-tag
              v-if="!volume.selectable"
              size="small"
              :bordered="false"
              class="volume-reason"
            >
              {{ volume.reason || "不可开放" }}
            </n-tag>
          </div>
        </n-checkbox-group>
        <p v-if="selectableVolumes.length === 0" class="publish-empty-hint">
          外部暂无已出分册或该报告无可解析要素，当前无法发布。
        </p>

        <div class="publish-section-title">
          方向命中预览
          <span class="section-hint">按命中数降序，前 5 条</span>
        </div>
        <n-data-table
          v-if="visibleHits.length"
          :columns="hitColumns"
          :data="visibleHits"
          :bordered="false"
          size="small"
          :row-key="(row: { code: string }) => row.code"
        />
        <div v-else class="publish-empty-hint">当前没有命中的培养方向</div>
        <n-button
          v-if="hiddenDirectionCount > 0 || showAllDirections"
          text
          type="primary"
          class="direction-toggle"
          @click="showAllDirections = !showAllDirections"
        >
          {{ showAllDirections ? "收起其余方向" : `其余 ${hiddenDirectionCount} 个方向` }}
        </n-button>

        <div class="publish-rules">{{ preview.rules }}</div>
      </template>
    </n-spin>

    <template #footer>
      <div class="publish-footer">
        <n-button :disabled="submitting" @click="emit('update:show', false)">取消</n-button>
        <n-button
          type="primary"
          class="main-action"
          :loading="submitting"
          :disabled="selectedVolumeIds.length === 0 || !preview"
          @click="submit"
        >
          确认发布
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<style scoped>
.publish-error { margin-bottom: 12px; line-height: 1.7; }
.publish-facts { display: flex; flex-wrap: wrap; gap: 8px 24px; padding-bottom: 12px; }
.fact { display: inline-flex; align-items: baseline; gap: 6px; font-size: 13px; }
.fact i { color: var(--muted-foreground, #6c756a); font-size: 12px; font-style: normal; }
.publish-warnings { margin-bottom: 12px; line-height: 1.6; }
.publish-section-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 16px 0 8px;
  font-size: 13px;
  font-weight: 600;
}
.section-hint { color: var(--muted-foreground, #6c756a); font-size: 12px; font-weight: 400; }
.volume-group { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 20px; }
.volume-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  min-height: 34px;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
}
.volume-row.is-disabled { background: var(--muted); color: var(--muted-foreground, #6c756a); }
.volume-name { font-size: 13px; }
.volume-meta { color: var(--muted-foreground, #6c756a); font-size: 12px; }
.volume-reason { margin-left: auto; }
.publish-empty-hint { padding: 16px 0; color: var(--muted-foreground, #6c756a); font-size: 13px; }
.direction-toggle { margin-top: 6px; }
.publish-rules {
  margin-top: 16px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--muted);
  color: var(--muted-foreground, #6c756a);
  font-size: 12px;
  line-height: 1.7;
}
.publish-footer { display: flex; justify-content: flex-end; gap: 8px; }
.main-action { min-height: 44px; }
.mono { font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace); }
:deep(.n-data-table-th) { background: var(--muted); color: var(--foreground); font-weight: 600; }
:deep(.n-data-table-td) { color: var(--foreground); }

@media (max-width: 720px) {
  .volume-group { grid-template-columns: minmax(0, 1fr); }
}
</style>