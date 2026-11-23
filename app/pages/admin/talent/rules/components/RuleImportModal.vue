<!--
 * @description 规则域 CSV 导入弹层（wide）：选文件 → 校验预览（失败行明细）→ 执行导入 → 结果。
 *   固定注解与分级共用；预览不落库，提交由服务端二次校验（ADR 0001-D4）。
 * @file app/pages/admin/talent/rules/components/RuleImportModal.vue
-->
<script setup lang="ts">
import {
  NAlert,
  NButton,
  NDataTable,
  NModal,
  NSpin,
  NTag,
  useMessage,
  type DataTableColumns,
} from "naive-ui";
import type {
  TalentRuleImportPreview,
  TalentRuleImportPreviewRow,
  TalentRuleImportResult,
} from "~/composables/api/useTalentRuleApi";

type ImportKind = "notes" | "levels";

interface Props {
  show: boolean;
  kind: ImportKind;
}

const props = defineProps<Props>();
const emit = defineEmits<{ "update:show": [value: boolean]; imported: [] }>();

const api = useTalentRuleApi();
const message = useMessage();
const { hasPermission } = usePermission();
const canExport = computed(() => hasPermission("talent:rule:export"));

const step = ref<1 | 2 | 3>(1);
const fileName = ref("");
const selectedFile = ref<File | null>(null);
const preview = ref<TalentRuleImportPreview | null>(null);
const result = ref<TalentRuleImportResult | null>(null);
const previewLoading = ref(false);
const committing = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const kindLabel = computed(() => (props.kind === "notes" ? "固定注解" : "分级"));
const maxFileSize = 10 * 1024 * 1024;

function reset(): void {
  step.value = 1;
  fileName.value = "";
  selectedFile.value = null;
  preview.value = null;
  result.value = null;
  previewLoading.value = false;
  committing.value = false;
  if (fileInput.value) fileInput.value.value = "";
}

function rowContent(row: TalentRuleImportPreviewRow): string {
  if (props.kind === "notes") {
    const note = String(row.note || "").trim();
    return `${row.factorCode || ""} / ${row.levelCode || ""} / ${note ? note.slice(0, 40) : "（未填正文）"}`;
  }
  return `${row.code || ""} ${row.name || ""} / 级序 ${row.sortOrder ?? ""}`;
}

function rowReason(row: TalentRuleImportPreviewRow): string {
  const errors = row.errors?.length ? row.errors : [];
  const warnings = row.warnings?.length ? row.warnings : [];
  if (!errors.length && !warnings.length) return "—";
  return [...errors, ...warnings.map((item) => `提示：${item}`)].join("；");
}

const previewColumns = computed<DataTableColumns<TalentRuleImportPreviewRow>>(() => [
  { title: "行号", key: "rowNumber", width: 70 },
  {
    title: "数据内容",
    key: "content",
    minWidth: 240,
    render: (row: TalentRuleImportPreviewRow) => rowContent(row),
  },
  {
    title: "校验",
    key: "ok",
    width: 100,
    render: (row: TalentRuleImportPreviewRow) =>
      h(
        NTag,
        { size: "small", bordered: false, type: row.ok ? "success" : "error" },
        { default: () => (row.ok ? "通过" : "失败") },
      ),
  },
  {
    title: "原因 / 处理建议",
    key: "reason",
    minWidth: 260,
    render: (row: TalentRuleImportPreviewRow) =>
      h(
        "span",
        { class: row.ok ? "reason-warn" : "reason-error" },
        rowReason(row),
      ),
  },
]);

const failureColumns = computed<DataTableColumns<{ rowNumber: number; errors: string[] }>>(() => [
  { title: "行号", key: "rowNumber", width: 80 },
  {
    title: "失败原因",
    key: "errors",
    minWidth: 320,
    render: (row: { rowNumber: number; errors: string[] }) => row.errors.join("；"),
  },
]);

async function downloadTemplate(): Promise<void> {
  try {
    if (props.kind === "notes") await api.downloadFactorNoteTemplate();
    else await api.downloadLevelTemplate();
  } catch {
    message.error("模板下载失败，请稍后重试");
  }
}

async function onFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith(".csv")) {
    message.error("当前仅支持 CSV 文件");
    input.value = "";
    return;
  }
  if (file.size > maxFileSize) {
    message.error("导入文件不能超过 10MB");
    input.value = "";
    return;
  }
  selectedFile.value = file;
  fileName.value = file.name;
  await runPreview(file);
}

async function runPreview(file: File): Promise<void> {
  previewLoading.value = true;
  step.value = 2;
  preview.value = null;
  try {
    preview.value =
      props.kind === "notes"
        ? await api.previewFactorNoteImport(file)
        : await api.previewLevelImport(file);
  } catch {
    preview.value = null;
    message.error("预览失败，请检查文件格式或权限后重试");
  } finally {
    previewLoading.value = false;
  }
}

async function reselectFile(): Promise<void> {
  reset();
  await nextTick();
  fileInput.value?.click();
}

async function commitImport(): Promise<void> {
  if (!selectedFile.value || committing.value) return;
  committing.value = true;
  try {
    result.value =
      props.kind === "notes"
        ? await api.importFactorNotes(selectedFile.value)
        : await api.importLevels(selectedFile.value);
    step.value = 3;
    emit("imported");
  } catch {
    // useApi 已统一提示服务端错误（413 / 422）。
  } finally {
    committing.value = false;
  }
}

/** 失败明细 CSV：带 BOM，Excel 直接打开。 */
function downloadErrorDetails(): void {
  const failures = result.value
    ? result.value.failures
    : (preview.value?.rows || [])
        .filter((row) => !row.ok)
        .map((row) => ({ rowNumber: row.rowNumber, errors: row.errors }));
  if (!failures.length) {
    message.warning("没有失败行可导出");
    return;
  }
  const escape = (value: string): string =>
    /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  const lines = ["行号,失败原因"]
    .concat(failures.map((item) => `${item.rowNumber},${escape(item.errors.join("；"))}`))
    .join("\n");
  const blob = new Blob([`\uFEFF${lines}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${props.kind === "notes" ? "talent-factor-notes" : "talent-levels"}-errors.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
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
    :title="`导入${kindLabel}`"
    style="width: min(1000px, calc(100vw - 32px))"
    content-style="max-height: calc(100vh - 210px); overflow-y: auto;"
    :mask-closable="false"
    @update:show="emit('update:show', $event)"
  >
    <div class="import-steps">
      <n-tag :type="step === 1 ? 'info' : 'default'" :bordered="false" size="small">1 选择文件</n-tag>
      <n-tag :type="step === 2 ? 'info' : 'default'" :bordered="false" size="small">2 校验预览</n-tag>
      <n-tag :type="step === 3 ? 'info' : 'default'" :bordered="false" size="small">3 导入结果</n-tag>
    </div>

    <template v-if="step === 1">
      <n-alert type="info" :show-icon="false" class="hint">
        仅支持 CSV（UTF-8，容忍 BOM，≤ 10MB）。表头支持中文或系统字段名；失败行不会写入，同批重复唯一键后者覆盖前者。
        当前模板：{{ kindLabel }}。
      </n-alert>
      <div class="file-actions">
        <n-button v-if="canExport" secondary @click="downloadTemplate">下载导入模板</n-button>
        <input
          ref="fileInput"
          class="file-input"
          type="file"
          accept=".csv,text/csv"
          aria-label="选择 CSV 导入文件"
          @change="onFileChange"
        >
      </div>
      <div class="selected-file">
        <span class="selected-file__label">已选择文件</span>
        <span class="selected-file__name">{{ fileName || "未选择文件" }}</span>
      </div>
    </template>

    <template v-else-if="step === 2">
      <n-spin :show="previewLoading">
        <n-alert v-if="preview" type="info" :show-icon="false" class="hint">
          文件：{{ preview.fileName || fileName }} · 共 {{ preview.total }} 行，通过 {{ preview.passed }} 行，失败
          {{ preview.failed }} 行。预览不落库，执行导入时服务端会重新校验。
        </n-alert>
        <n-data-table
          v-if="preview"
          :columns="previewColumns"
          :data="preview.rows"
          :bordered="false"
          :max-height="380"
          :row-key="(row: TalentRuleImportPreviewRow) => row.rowNumber"
          :locale="{ emptyText: '文件没有可解析的数据行' }"
        />
        <div class="preview-actions">
          <n-button @click="reselectFile">重新选择文件</n-button>
          <n-button secondary :disabled="!preview?.failed" @click="downloadErrorDetails">
            下载错误明细
          </n-button>
          <n-button
            type="primary"
            :loading="committing"
            :disabled="previewLoading || !preview?.passed"
            @click="commitImport"
          >
            执行导入（{{ preview?.passed || 0 }} 行）
          </n-button>
        </div>
      </n-spin>
    </template>

    <template v-else>
      <n-alert v-if="result" :type="result.failed ? 'warning' : 'success'" :show-icon="false" class="hint">
        导入完成：共 {{ result.total }} 行，成功 {{ result.success }} 行，失败 {{ result.failed }} 行；失败行未写入。
      </n-alert>
      <n-data-table
        v-if="result && result.failures.length"
        :columns="failureColumns"
        :data="result.failures"
        :bordered="false"
        :max-height="320"
        :row-key="(row: { rowNumber: number }) => row.rowNumber"
      />
      <div class="preview-actions">
        <n-button secondary :disabled="!result?.failed" @click="downloadErrorDetails">下载错误明细</n-button>
        <n-button @click="reset">再次导入</n-button>
        <n-button type="primary" @click="emit('update:show', false)">完成</n-button>
      </div>
    </template>

    <template #footer>
      <div class="form-footer">
        <n-button @click="emit('update:show', false)">关闭</n-button>
      </div>
    </template>
  </n-modal>
</template>

<style scoped>
.import-steps { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
.hint { margin-bottom: 14px; line-height: 1.7; }
.file-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.file-input { width: 100%; min-height: 44px; }
.selected-file { display: flex; align-items: center; gap: 10px; min-height: 44px; margin-top: 10px; padding: 0 12px; border: 1px solid var(--border-color, #efeff5); border-radius: 8px; background: var(--muted, #f7f7fa); }
.selected-file__label { color: var(--text-color-3, #999); }
.selected-file__name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.preview-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 12px; margin-top: 14px; }
.form-footer { display: flex; justify-content: flex-end; }
:deep(.reason-error) { color: var(--error-color, #d03050); }
:deep(.reason-warn) { color: var(--text-color-3, #999); }
</style>