<!--
 * @description 固定注解新增 / 编辑弹层（wide）：编号只读，新增可选要素与分级，编辑时身份字段不可改。
 * @file app/pages/admin/talent/rules/components/FactorNoteForm.vue
-->
<script setup lang="ts">
import {
  NAlert,
  NButton,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NSelect,
  NTag,
  useMessage,
} from "naive-ui";
import type {
  TalentFactorLibraryRow,
  TalentFactorNoteRow,
  TalentLevelRow,
} from "~/composables/api/useTalentRuleApi";
import type { TalentFactor } from "~~/shared/types/talent-rule";

interface Props {
  show: boolean;
  noteId: string;
  record: TalentFactorNoteRow | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{ "update:show": [value: boolean]; saved: [] }>();

const api = useTalentRuleApi();
const message = useMessage();

const loading = ref(false);
const saving = ref(false);
const libraryMissing = ref(false);
const factors = ref<TalentFactor[]>([]);
const levels = ref<TalentLevelRow[]>([]);
const errors = ref<string[]>([]);

const form = reactive({
  factorCode: "",
  levelCode: "",
  note: "",
  ageRange: "",
  gender: "通用" as "男" | "女" | "通用",
  status: "1" as "0" | "1",
});

const isEditing = computed(() => Boolean(props.noteId));
const title = computed(() => (isEditing.value ? "编辑固定注解" : "新增固定注解"));
const codeText = computed(() => props.record?.code || "保存后由服务端生成（要素编码-分级编码）");

const factorOptions = computed(() =>
  factors.value.map((factor) => ({
    label: `${factor.code} ${factor.name}`,
    value: factor.code,
  })),
);

const levelOptions = computed(() =>
  levels.value
    .filter((level) => level.status === "1")
    .map((level) => ({ label: `${level.name}（${level.code}）`, value: level.code })),
);

const factorNameText = computed(() => {
  if (isEditing.value) return props.record?.factorName || props.record?.factorCode || "";
  return factors.value.find((factor) => factor.code === form.factorCode)?.name || "";
});

function resetForm(): void {
  form.factorCode = props.record?.factorCode || "";
  form.levelCode = props.record?.levelCode || "";
  form.note = props.record?.note || "";
  form.ageRange = props.record?.ageRange || "";
  form.gender = (props.record?.gender as "男" | "女" | "通用") || "通用";
  form.status = props.record?.status === "0" ? "0" : "1";
  errors.value = [];
  factors.value = [];
  levels.value = [];
  libraryMissing.value = false;
}

/** 158 项要素超过单页上限，按 100/页翻页取全（仅新增时需要）。 */
async function loadFactors(): Promise<void> {
  const libraryResult = await api.listFactorLibraries({ status: "1", page: 1, pageSize: 100 });
  const library = libraryResult.rows
    .filter((row: TalentFactorLibraryRow) => row.status === "1" && row.syncedAt)
    .sort((left, right) => Date.parse(String(right.syncedAt)) - Date.parse(String(left.syncedAt)))[0];
  if (!library) {
    libraryMissing.value = true;
    return;
  }
  const collected: TalentFactor[] = [];
  let page = 1;
  let total = 0;
  do {
    const result = await api.listFactors({ libraryId: library.id, page, pageSize: 100 });
    total = result.total;
    collected.push(...result.rows);
    if (!result.rows.length) break;
    page += 1;
  } while (collected.length < total && page <= 5);
  factors.value = collected;
}

async function loadLookups(): Promise<void> {
  loading.value = true;
  errors.value = [];
  try {
    const levelResult = await api.listLevels({ page: 1, pageSize: 100 });
    levels.value = levelResult.rows;
    if (!isEditing.value) await loadFactors();
  } catch {
    errors.value = ["表单选项加载失败，请关闭弹层重试"];
  } finally {
    loading.value = false;
  }
}

function validate(): boolean {
  const messages: string[] = [];
  if (!form.factorCode) messages.push("请选择要素编码");
  else if (!isEditing.value && !factors.value.some((factor) => factor.code === form.factorCode))
    messages.push("要素编码不存在于当前启用文库");
  if (!form.levelCode) messages.push("请选择分级");
  else if (!levels.value.some((level) => level.code === form.levelCode && level.status === "1"))
    messages.push("分级不存在或已停用");
  if (form.note.length > 2000) messages.push("注解正文不能超过 2000 字符");
  if (form.ageRange.length > 50) messages.push("年龄条件不能超过 50 字符");
  errors.value = messages;
  return messages.length === 0;
}

async function handleSave(): Promise<void> {
  if (saving.value) return;
  if (libraryMissing.value && !isEditing.value) {
    message.warning("暂无已同步分库，请先在「潜质要素」页同步文库");
    return;
  }
  if (!validate()) {
    message.warning(errors.value[0] || "请检查表单");
    return;
  }
  saving.value = true;
  try {
    if (isEditing.value) {
      await api.updateFactorNote(props.noteId, {
        note: form.note,
        ageRange: form.ageRange,
        gender: form.gender,
        status: form.status,
      });
    } else {
      await api.createFactorNote({
        factorCode: form.factorCode,
        levelCode: form.levelCode,
        note: form.note,
        ageRange: form.ageRange,
        gender: form.gender,
        status: form.status,
      });
    }
    emit("update:show", false);
    emit("saved");
  } catch {
    // useApi 已统一提示服务端错误（409 编号冲突 / 422 校验失败）。
  } finally {
    saving.value = false;
  }
}

watch(
  () => props.show,
  (show) => {
    if (!show) return;
    resetForm();
    void loadLookups();
  },
  { immediate: true },
);
</script>

<template>
  <n-modal
    :show="props.show"
    preset="card"
    :title="title"
    style="width: min(860px, calc(100vw - 32px))"
    :mask-closable="false"
    @update:show="emit('update:show', $event)"
  >
    <n-alert v-if="errors.length" type="error" :show-icon="false" class="error-banner">
      <div v-for="item in errors" :key="item">{{ item }}</div>
    </n-alert>
    <n-alert v-if="libraryMissing && !isEditing" type="warning" :show-icon="false" class="error-banner">
      暂无已同步的启用分库，无法新增注解。请先在「潜质要素」页同步一个分库。
    </n-alert>
    <n-form label-placement="top" :disabled="loading">
      <div class="form-grid">
        <n-form-item label="注解编号">
          <div class="readonly-value">
            <span class="mono">{{ codeText }}</span>
            <n-tag v-if="isEditing" size="tiny" :bordered="false">不可修改</n-tag>
          </div>
        </n-form-item>
        <n-form-item label="状态">
          <n-select
            v-model:value="form.status"
            :options="[
              { label: '启用', value: '1' },
              { label: '停用', value: '0' },
            ]"
          />
        </n-form-item>
        <n-form-item label="要素编码" required>
          <n-select
            v-if="!isEditing"
            v-model:value="form.factorCode"
            :options="factorOptions"
            filterable
            :loading="loading"
            placeholder="按编码或名称搜索"
          />
          <n-input v-else :value="form.factorCode" disabled />
        </n-form-item>
        <n-form-item label="潜质要素">
          <n-input :value="factorNameText || '—'" disabled placeholder="选择要素编码后自动回显" />
        </n-form-item>
        <n-form-item label="分级" required>
          <n-select
            v-if="!isEditing"
            v-model:value="form.levelCode"
            :options="levelOptions"
            placeholder="选择要求分级"
          />
          <n-input v-else :value="form.levelCode" disabled />
        </n-form-item>
        <n-form-item label="年龄条件">
          <n-input v-model:value="form.ageRange" :maxlength="50" placeholder="例如：3–6 岁；留空为不限" />
        </n-form-item>
        <n-form-item label="性别条件">
          <n-select
            v-model:value="form.gender"
            :options="[
              { label: '通用', value: '通用' },
              { label: '男', value: '男' },
              { label: '女', value: '女' },
            ]"
          />
        </n-form-item>
        <n-form-item label="注解正文" class="wide">
          <n-input
            v-model:value="form.note"
            type="textarea"
            :autosize="{ minRows: 5, maxRows: 10 }"
            :maxlength="2000"
            show-count
            placeholder="正文允许为空（待补写）；历史报告使用发布时快照，不受后续修改影响"
          />
        </n-form-item>
      </div>
    </n-form>
    <template #footer>
      <div class="form-footer">
        <n-button @click="emit('update:show', false)">取消</n-button>
        <n-button type="primary" :loading="saving" :disabled="loading" @click="handleSave">
          {{ isEditing ? "保存注解" : "新增注解" }}
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<style scoped>
.error-banner { margin-bottom: 14px; line-height: 1.7; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 20px; }
.wide { grid-column: 1 / -1; }
.readonly-value { display: flex; align-items: center; gap: 8px; min-height: 34px; }
.mono { font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace); }
.form-footer { display: flex; justify-content: flex-end; gap: 12px; }
.form-footer :deep(.n-button) { min-height: 44px; }
@media (max-width: 640px) {
  .form-grid { grid-template-columns: 1fr; }
  .wide { grid-column: auto; }
}
</style>