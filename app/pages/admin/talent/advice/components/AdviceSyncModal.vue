<!--
 * @description 接收新一版培育建议弹层（wide）：版本号（按生效日期默认 `V{YYYY}.{MM}`）/ 生效日期
 *   （默认当前生效版本的 `nextUpdateAt`，必须晚于当前生效版本）/ 同步说明（≤500，可空）；
 *   接收说明块说明「新版生效 → 旧版自动归档 → 家长端即时切换」；「接收并同步」二次确认后调用
 *   `POST /advice/versions`，成功展示结果摘要（新建 / 暂无 / 失败 + warnings 明细），
 *   失败（409/503/500）保留弹层并展示原因，不做乐观更新（spec §6.5）。
 *   注意：M5-B 只有这一个写接口，没有 preview / activate 接口，因此「预演」仅以说明块表达。
 * @file app/pages/admin/talent/advice/components/AdviceSyncModal.vue
-->
<script setup lang="ts">
import {
  NAlert,
  NButton,
  NDatePicker,
  NInput,
  NModal,
  NSpin,
  useDialog,
  useMessage,
} from "naive-ui";
import type {
  TalentAdviceReceiveResult,
  TalentAdviceVersionView,
} from "~/composables/api/useTalentAdviceApi";
import { TALENT_ADVICE_SYNC_REASON_LABELS } from "~~/shared/types/talent-advice";
import { adviceErrorCode } from "./advice-ui";

interface Props {
  show: boolean;
  /** 当前生效版本（提供 nextUpdateAt 默认值、版本号与份数说明）。 */
  currentVersion: TalentAdviceVersionView | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  "update:show": [value: boolean];
  /** 接收成功（页面据此回到当前生效版并刷新版本历史）。 */
  committed: [result: TalentAdviceReceiveResult];
}>();

const api = useTalentAdviceApi();
const dialog = useDialog();
const message = useMessage();

type Stage = "form" | "done";

const stage = ref<Stage>("form");
const effectiveAt = ref<string | null>(null);
const versionNo = ref("");
const note = ref("");
const versionNoTouched = ref(false);
const submitting = ref(false);
const error = ref("");
const duplicateVersion = ref(false);
const orderError = ref(false);
const result = ref<TalentAdviceReceiveResult | null>(null);

/** 默认版本号 `V{YYYY}.{MM}`（按生效日期，spec §4.3 步骤 1）。 */
function buildVersionNo(value: string | null): string {
  const text = String(value ?? "").trim();
  const match = /^(\d{4})-(\d{2})/.exec(text);
  return match ? `V${match[1]}.${match[2]}` : "";
}

const currentVersionText = computed(() => {
  const value = props.currentVersion;
  if (!value) return "当前没有生效版本";
  return `${value.versionNo}（${value.cycle}）`;
});

/** 接收说明（spec §6.5 说明块）：新版生效 / 旧版归档 / 家长端切换 / 历史保留。 */
const receiveSummary = computed(() => {
  const current = props.currentVersion;
  const count = Number(current?.docCount || 0);
  const parts = [
    "新版成为当前生效版本",
    count > 0 ? `覆盖 ${count} 份建议（一人一份，以本次外部匹配结果为准）` : "按本次外部匹配结果逐人生成建议书",
  ];
  if (current) parts.push(`${current.versionNo} 自动归档`);
  parts.push("家长端即时切换为最新内容", "历史版本保留在版本历史中可回溯");
  return `接收后：${parts.join("；")}。`;
});

const failedDetails = computed(() =>
  (result.value?.details ?? []).filter((item) => item.action === "failed"),
);

function reasonText(reason: string): string {
  if (!reason) return "失败";
  return (
    TALENT_ADVICE_SYNC_REASON_LABELS[
      reason as keyof typeof TALENT_ADVICE_SYNC_REASON_LABELS
    ] ?? reason
  );
}

function reset(): void {
  stage.value = "form";
  effectiveAt.value = props.currentVersion?.nextUpdateAt || null;
  versionNo.value = buildVersionNo(effectiveAt.value);
  note.value = "";
  versionNoTouched.value = false;
  submitting.value = false;
  error.value = "";
  duplicateVersion.value = false;
  orderError.value = false;
  result.value = null;
}

function handleVersionNoInput(value: string): void {
  versionNo.value = value;
  versionNoTouched.value = true;
}

watch(effectiveAt, (value) => {
  if (versionNoTouched.value) return;
  versionNo.value = buildVersionNo(value);
});

watch(
  () => props.show,
  (show) => {
    if (show) reset();
  },
  { immediate: true },
);

/** 二次确认：说明新版本生效与旧版归档，确认后才写入。 */
async function confirmReceive(): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const settle = (value: boolean): void => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    dialog.warning({
      title: "确认接收新一版培育建议",
      content: `生效日期 ${effectiveAt.value || "—"} · 版本 ${versionNo.value || buildVersionNo(effectiveAt.value) || "—"}。接收后新版立即成为当前生效版本，${props.currentVersion?.versionNo || "当前版本"} 自动归档，家长端即时切换；正文只接收不修改。确认接收？`,
      positiveText: "确认接收",
      negativeText: "取消",
      onPositiveClick: () => settle(true),
      onNegativeClick: () => settle(false),
      onClose: () => settle(false),
    });
  });
}

async function submit(): Promise<void> {
  if (submitting.value) return;
  error.value = "";
  duplicateVersion.value = false;
  orderError.value = false;
  const date = String(effectiveAt.value ?? "").trim();
  if (!date) {
    message.warning("请选择同步日期（生效日期）");
    return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    message.warning("同步日期格式必须为 YYYY-MM-DD");
    return;
  }
  const current = props.currentVersion;
  if (current && date <= current.effectiveAt) {
    orderError.value = true;
    error.value = `生效日期必须晚于当前生效版本（${current.effectiveAt}）`;
    return;
  }
  if (!versionNo.value.trim()) {
    message.warning("版本号不能为空");
    return;
  }
  if (!(await confirmReceive())) return;
  submitting.value = true;
  try {
    const received = await api.receiveVersion({
      effectiveAt: date,
      versionNo: versionNo.value.trim(),
      note: note.value.trim() || undefined,
    });
    result.value = received;
    stage.value = "done";
    emit("committed", received);
  } catch (err) {
    const code = adviceErrorCode(err);
    duplicateVersion.value = code === "ADVICE_VERSION_EXISTS";
    orderError.value = code === "ADVICE_VERSION_ORDER";
    error.value = getApiErrorMessage(err, "接收失败，请稍后重试");
  } finally {
    submitting.value = false;
  }
}

function close(): void {
  if (submitting.value) return;
  emit("update:show", false);
}
</script>

<template>
  <n-modal
    :show="props.show"
    preset="card"
    style="width: min(860px, calc(100vw - 32px))"
    data-testid="advice-sync-modal"
    @update:show="emit('update:show', $event)"
  >
    <template #header>
      <div class="modal-head">
        <div class="modal-title">接收新一版培育建议</div>
        <div class="modal-subtitle">
          外部系统按「姓名 + 具体年龄（周岁）」重新匹配后整版推送；本系统只接收与归档，不修改内容。
        </div>
      </div>
    </template>

    <n-spin :show="submitting">
      <!-- 成功：结果摘要（不乐观更新，展示服务端实际写入结果） -->
      <template v-if="stage === 'done' && result">
        <n-alert type="success" :show-icon="false" class="sync-alert" data-testid="advice-sync-result">
          新一版培育建议已接收，家长端已切换：{{ result.version.versionNo }}（{{ result.version.cycle }}）生效。
        </n-alert>
        <div class="summary-grid">
          <div class="summary-card">
            <span class="card-label">新建建议书</span>
            <b>{{ result.docCount }}</b>
          </div>
          <div class="summary-card">
            <span class="card-label">暂无匹配</span>
            <b>{{ result.emptyCount }}</b>
          </div>
          <div class="summary-card" :class="{ 'summary-card--failed': result.failedCount > 0 }">
            <span class="card-label">单条失败</span>
            <b>{{ result.failedCount }}</b>
          </div>
          <div class="summary-card">
            <span class="card-label">上一版</span>
            <b class="summary-archived">{{ result.archivedVersionId ? "已归档" : "无" }}</b>
          </div>
        </div>
        <p class="sync-meta">
          生效日期 {{ result.version.effectiveAt }} · 下一版建议时间 {{ result.version.nextUpdateAt }} ·
          同步日志 <span class="mono">{{ result.syncLogId || "未写入（不影响接收结果）" }}</span>
        </p>
        <ul v-if="result.warnings.length" class="warnings">
          <li v-for="warning in result.warnings" :key="warning">{{ warning }}</li>
        </ul>
        <div v-if="failedDetails.length" class="failed-block">
          <div class="block-title">失败明细</div>
          <ul class="failed-list">
            <li v-for="item in failedDetails" :key="`${item.reportNo}-${item.reason}`">
              {{ item.name || "—" }}（{{ item.reportNo || "—" }}）：{{ reasonText(item.reason) }}
            </li>
          </ul>
        </div>
        <p v-if="result.truncated" class="sync-hint">明细超过 500 条，仅展示前 500 条。</p>
      </template>

      <!-- 表单：同步日期 / 版本号 / 同步说明 + 接收说明 -->
      <template v-else>
        <n-alert v-if="error" type="error" :show-icon="false" class="sync-alert" data-testid="advice-sync-error">
          {{ error }}
        </n-alert>
        <n-alert type="info" :show-icon="false" class="sync-alert">
          {{ receiveSummary }}当前生效版本：{{ currentVersionText }}。
        </n-alert>

        <div class="form-grid">
          <label class="field" :class="{ 'field--error': duplicateVersion }">
            <span class="field-label">版本号</span>
            <n-input
              :value="versionNo"
              placeholder="如 V2026.11"
              :maxlength="40"
              data-testid="advice-sync-version-no"
              @update:value="handleVersionNoInput"
            />
          </label>
          <label class="field" :class="{ 'field--error': orderError }">
            <span class="field-label">同步日期（生效日期）</span>
            <n-date-picker
              v-model:formatted-value="effectiveAt"
              value-format="yyyy-MM-dd"
              type="date"
              placeholder="选择同步日期"
              data-testid="advice-sync-effective-at"
            />
          </label>
          <label class="field field--full">
            <span class="field-label">同步说明（可选，≤500 字；留空由服务端生成默认说明）</span>
            <n-input
              v-model:value="note"
              type="textarea"
              :maxlength="500"
              :autosize="{ minRows: 2, maxRows: 4 }"
              placeholder="外部系统按姓名 + 具体年龄（周岁）重新匹配输出，覆盖 N 份基因报告。"
              data-testid="advice-sync-note"
            />
          </label>
        </div>

        <p class="sync-hint">
          不可重复接收：版本号、生效月份或生效日期已被占用时服务端返回 409 并提示已同步；
          生效日期必须晚于当前生效版本，版本只能前进。
        </p>
      </template>
    </n-spin>

    <template #footer>
      <div class="modal-footer">
        <template v-if="stage === 'done'">
          <n-button type="primary" class="main-action" @click="close">完成</n-button>
        </template>
        <template v-else>
          <n-button :disabled="submitting" @click="close">取消</n-button>
          <n-button
            type="primary"
            class="main-action"
            :loading="submitting"
            data-testid="advice-sync-submit"
            @click="submit"
          >
            接收并同步
          </n-button>
        </template>
      </div>
    </template>
  </n-modal>
</template>

<style scoped>
.modal-head { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.modal-title { font-size: 16px; font-weight: 600; }
.modal-subtitle { color: var(--muted-foreground, #6c756a); font-size: 12px; line-height: 1.6; }
.sync-alert { margin-bottom: 12px; line-height: 1.7; }
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
}
.field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.field--full { grid-column: 1 / -1; }
.field-label { color: var(--muted-foreground, #6c756a); font-size: 12px; }
.field--error :deep(.n-input),
.field--error :deep(.n-date-picker) { --n-border: 1px solid var(--destructive, #d03050); }
.sync-hint { margin: 12px 0 0; color: var(--muted-foreground, #6c756a); font-size: 12px; line-height: 1.7; }
.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
.summary-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
}
.summary-card b { font-size: 20px; font-variant-numeric: tabular-nums; }
.summary-card--failed { border-color: color-mix(in srgb, var(--destructive, #d03050) 45%, var(--border)); }
.summary-card--failed b { color: var(--destructive, #d03050); }
.summary-archived { font-size: 14px !important; }
.card-label { color: var(--muted-foreground, #6c756a); font-size: 12px; }
.sync-meta { margin: 12px 0 0; color: var(--muted-foreground, #6c756a); font-size: 12px; line-height: 1.7; }
.warnings {
  padding-left: 20px;
  margin: 10px 0 0;
  color: var(--foreground);
  font-size: 13px;
  line-height: 1.8;
}
.failed-block { margin-top: 12px; }
.block-title { margin-bottom: 6px; font-size: 13px; font-weight: 600; }
.failed-list { padding-left: 20px; margin: 0; font-size: 13px; line-height: 1.8; }
.modal-footer { display: flex; justify-content: flex-end; gap: 8px; }
.main-action { min-height: 44px; }
.mono { font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace); }
@media (max-width: 720px) {
  .form-grid, .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>