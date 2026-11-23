<!--
 * @description 发布 / 撤回培育建议确认弹层（wide）：信息条（所属版本 / 建议项数 / 当前状态）+
 *   影响说明 + 二次确认；仅当前生效版本显示入口（历史版本按钮不渲染，服务端另以 409 双保险）。
 *   发布 / 撤回只改家长端可见性，不改正文、分册、年龄与匹配键；撤回原因可选写入操作日志（spec §6.6）。
 * @file app/pages/admin/talent/advice/components/AdvicePublishModal.vue
-->
<script setup lang="ts">
import { NAlert, NButton, NInput, NModal, NSpin } from "naive-ui";
import type {
  TalentAdviceDocDetail,
  TalentAdviceDocListRow,
} from "~/composables/api/useTalentAdviceApi";

export type AdvicePublishMode = "publish" | "withdraw";

interface Props {
  show: boolean;
  mode: AdvicePublishMode;
  /** 列表行（详情加载失败时作为兜底展示）。 */
  doc: TalentAdviceDocListRow | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  "update:show": [value: boolean];
  /** 写动作成功（页面据此静默刷新列表，保持版本视图状态）。 */
  changed: [];
}>();

const api = useTalentAdviceApi();

const loading = ref(false);
const submitting = ref(false);
const error = ref("");
const detail = ref<TalentAdviceDocDetail | null>(null);
const reason = ref("");

const isPublish = computed(() => props.mode === "publish");
const title = computed(() => (isPublish.value ? "发布培育建议" : "撤回培育建议"));
const confirmText = computed(() => (isPublish.value ? "确认发布" : "确认撤回"));

const subtitle = computed(() => {
  const value = detail.value;
  const fallback = props.doc;
  const matchKey = value?.owner.matchKey || fallback?.name || "—";
  const versionNo = value?.version.versionNo || fallback?.versionName || "—";
  return `${matchKey} · ${versionNo}`;
});

const sectionCount = computed(() => {
  const books = detail.value?.books ?? [];
  return books.reduce((total, group) => total + Number(group.sectionCount || 0), 0);
});

const facts = computed<Array<{ label: string; value: string }>>(() => {
  const value = detail.value;
  const fallback = props.doc;
  return [
    { label: "建议编号", value: value?.adviceNo || fallback?.adviceNo || "—" },
    {
      label: "所属版本",
      value: value
        ? `${value.version.versionNo}（${value.version.statusLabel} · ${value.version.cycle}）`
        : fallback?.versionName || "—",
    },
    {
      label: "建议项数",
      value: value ? `${sectionCount.value} 项 / ${value.books.length} 个分册` : "—",
    },
    { label: "当前状态", value: value?.publishStatusLabel || fallback?.publishStatusLabel || "—" },
  ];
});

const impactText = computed(() =>
  isPublish.value
    ? "家长端「培育建议」立即可见，正文与所属版本不变，仅改变这一份的可见性。"
    : "家长端「培育建议」立即不再展示，报告、已选培养方向与历史版本均不受影响；可随时重新发布。",
);

async function load(): Promise<void> {
  const id = props.doc?.id;
  if (!id) return;
  loading.value = true;
  error.value = "";
  try {
    detail.value = await api.getAdviceDetail(id);
  } catch {
    detail.value = null;
  } finally {
    loading.value = false;
  }
}

async function submit(): Promise<void> {
  const doc = props.doc;
  if (!doc || submitting.value) return;
  submitting.value = true;
  error.value = "";
  try {
    if (isPublish.value) await api.publishAdvice(doc.id);
    else await api.withdrawAdvice(doc.id, reason.value);
    emit("changed");
    emit("update:show", false);
  } catch (err) {
    error.value = getApiErrorMessage(
      err,
      isPublish.value ? "发布失败，请稍后重试" : "撤回失败，请稍后重试",
    );
  } finally {
    submitting.value = false;
  }
}

watch(
  () => [props.show, props.doc?.id, props.mode] as const,
  ([show]) => {
    if (!show) return;
    detail.value = null;
    reason.value = "";
    error.value = "";
    void load();
  },
  { immediate: true },
);
</script>

<template>
  <n-modal
    :show="props.show"
    preset="card"
    style="width: min(860px, calc(100vw - 32px))"
    data-testid="advice-publish-modal"
    @update:show="emit('update:show', $event)"
  >
    <template #header>
      <div class="modal-head">
        <div class="modal-title">{{ title }}</div>
        <div class="modal-subtitle">{{ subtitle }}</div>
      </div>
    </template>

    <n-spin :show="loading">
      <n-alert v-if="error" type="error" :show-icon="false" class="publish-alert">
        {{ error }}
      </n-alert>

      <div class="kv-strip">
        <span v-for="fact in facts" :key="fact.label" class="fact">
          <i>{{ fact.label }}</i>
          <span>{{ fact.value }}</span>
        </span>
      </div>

      <section class="impact">
        <div class="block-title">影响说明</div>
        <p>{{ impactText }}</p>
        <p v-if="detail && !detail.clientVisible" class="impact-hint">
          当前家长端可见性：{{ detail.clientVisibleText }}（可见性为读取时派生，报告状态也会影响家长端是否可见）。
        </p>
      </section>

      <label v-if="!isPublish" class="field">
        <span class="field-label">撤回原因（可选，仅写入操作日志，家长端不可见）</span>
        <n-input
          v-model:value="reason"
          type="textarea"
          :maxlength="200"
          :autosize="{ minRows: 2, maxRows: 4 }"
          placeholder="如：本份建议文案需外部复核"
          data-testid="advice-withdraw-reason"
        />
      </label>

    </n-spin>

    <template #footer>
      <div class="modal-footer">
        <n-button :disabled="submitting" @click="emit('update:show', false)">取消</n-button>
        <n-button
          :type="isPublish ? 'primary' : 'warning'"
          class="main-action"
          :loading="submitting"
          data-testid="advice-publish-submit"
          @click="submit"
        >
          {{ confirmText }}
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<style scoped>
.modal-head { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.modal-title { font-size: 16px; font-weight: 600; }
.modal-subtitle { color: var(--muted-foreground, #6c756a); font-size: 12px; }
.publish-alert { margin-bottom: 12px; line-height: 1.7; }
.kv-strip {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr));
  gap: 6px 20px;
  padding: 10px 12px;
  margin-bottom: 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
}
.fact { display: inline-flex; align-items: baseline; gap: 6px; min-width: 0; font-size: 13px; }
.fact i { flex: 0 0 auto; color: var(--muted-foreground, #6c756a); font-size: 12px; font-style: normal; }
.impact { margin-bottom: 14px; }
.block-title { margin-bottom: 6px; font-size: 13px; font-weight: 600; }
.impact p { margin: 0; font-size: 13px; line-height: 1.8; }
.impact-hint { margin-top: 6px !important; color: var(--muted-foreground, #6c756a); font-size: 12px !important; }
.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.field-label { color: var(--muted-foreground, #6c756a); font-size: 12px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 8px; }
.main-action { min-height: 44px; }
</style>