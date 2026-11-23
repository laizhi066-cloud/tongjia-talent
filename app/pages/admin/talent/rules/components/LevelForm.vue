<!--
 * @description 分级新增 / 编辑弹层（wide）：编码编辑只读、级序 1–4 唯一、色位走主题标签。
 * @file app/pages/admin/talent/rules/components/LevelForm.vue
-->
<script setup lang="ts">
import {
  NAlert,
  NButton,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NSelect,
  useMessage,
} from "naive-ui";
import type { TalentLevelRow } from "~/composables/api/useTalentRuleApi";

interface Props {
  show: boolean;
  levelId: string;
  record: TalentLevelRow | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{ "update:show": [value: boolean]; saved: [] }>();

const api = useTalentRuleApi();
const message = useMessage();

const saving = ref(false);
const errors = ref<string[]>([]);
const fieldErrors = reactive<{ code: string; name: string; sortOrder: string }>({
  code: "",
  name: "",
  sortOrder: "",
});

const form = reactive({
  code: "",
  name: "",
  sortOrder: 1 as number | null,
  range: "",
  tone: "default" as "default" | "info" | "success" | "warning",
  status: "1" as "0" | "1",
});

const isEditing = computed(() => Boolean(props.levelId));
const title = computed(() => (isEditing.value ? "编辑分级" : "新增分级"));
const toneOptions = [
  { label: "默认（default）", value: "default" },
  { label: "信息（info）", value: "info" },
  { label: "成功（success）", value: "success" },
  { label: "警告（warning）", value: "warning" },
];

function resetForm(): void {
  form.code = props.record?.code || "";
  form.name = props.record?.name || "";
  form.sortOrder = Number(props.record?.sortOrder || 1);
  form.range = props.record?.range || "";
  form.tone = (props.record?.tone as typeof form.tone) || "default";
  form.status = props.record?.status === "0" ? "0" : "1";
  errors.value = [];
  fieldErrors.code = "";
  fieldErrors.name = "";
  fieldErrors.sortOrder = "";
}

function validate(): boolean {
  const messages: string[] = [];
  fieldErrors.code = "";
  fieldErrors.name = "";
  fieldErrors.sortOrder = "";
  if (!isEditing.value) {
    if (!form.code.trim()) {
      fieldErrors.code = "请输入分级编码";
      messages.push(fieldErrors.code);
    } else if (!/^LV\d{1,2}$/.test(form.code.trim())) {
      fieldErrors.code = "分级编码格式必须为 LVn（如 LV1）";
      messages.push(fieldErrors.code);
    }
  }
  if (!form.name.trim()) {
    fieldErrors.name = "请输入分级名称";
    messages.push(fieldErrors.name);
  }
  if (!form.sortOrder || form.sortOrder < 1 || form.sortOrder > 4) {
    fieldErrors.sortOrder = "级序必须是 1–4 的整数";
    messages.push(fieldErrors.sortOrder);
  }
  if (form.range.length > 20) messages.push("得分范围不能超过 20 字符");
  errors.value = messages;
  return messages.length === 0;
}

async function handleSave(): Promise<void> {
  if (saving.value) return;
  if (!validate()) {
    message.warning(errors.value[0] || "请检查分级表单");
    return;
  }
  saving.value = true;
  try {
    const body = {
      name: form.name.trim(),
      sortOrder: Number(form.sortOrder),
      range: form.range,
      tone: form.tone,
      status: form.status,
    };
    if (isEditing.value) await api.updateLevel(props.levelId, body);
    else await api.createLevel({ ...body, code: form.code.trim() });
    emit("update:show", false);
    emit("saved");
  } catch {
    // useApi 已统一提示服务端错误（409 编码 / 级序冲突，422 校验失败）。
  } finally {
    saving.value = false;
  }
}

watch(
  () => props.show,
  (show) => {
    if (!show) return;
    resetForm();
  },
  { immediate: true },
);
</script>

<template>
  <n-modal
    :show="props.show"
    preset="card"
    :title="title"
    style="width: min(760px, calc(100vw - 32px))"
    :mask-closable="false"
    @update:show="emit('update:show', $event)"
  >
    <n-alert v-if="errors.length" type="error" :show-icon="false" class="error-banner">
      <div v-for="item in errors" :key="item">{{ item }}</div>
    </n-alert>
    <n-form label-placement="top">
      <div class="form-grid">
        <n-form-item
          label="分级编码"
          required
          :validation-status="fieldErrors.code ? 'error' : undefined"
          :feedback="fieldErrors.code"
        >
          <n-input
            v-model:value="form.code"
            :disabled="isEditing"
            placeholder="例如：LV1"
            :maxlength="16"
          />
        </n-form-item>
        <n-form-item
          label="分级名称"
          required
          :validation-status="fieldErrors.name ? 'error' : undefined"
          :feedback="fieldErrors.name"
        >
          <n-input v-model:value="form.name" :maxlength="20" placeholder="例如：常态" />
        </n-form-item>
        <n-form-item
          label="级序"
          required
          :validation-status="fieldErrors.sortOrder ? 'error' : undefined"
          :feedback="fieldErrors.sortOrder"
        >
          <n-input-number v-model:value="form.sortOrder" :min="1" :max="4" :show-button="true" class="full-width" />
        </n-form-item>
        <n-form-item label="得分范围">
          <n-input v-model:value="form.range" :maxlength="20" placeholder="例如：0–59" />
        </n-form-item>
        <n-form-item label="展示色位">
          <n-select v-model:value="form.tone" :options="toneOptions" />
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
      </div>
    </n-form>
    <template #footer>
      <div class="form-footer">
        <n-button @click="emit('update:show', false)">取消</n-button>
        <n-button type="primary" :loading="saving" @click="handleSave">
          {{ isEditing ? "保存分级" : "新增分级" }}
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<style scoped>
.error-banner { margin-bottom: 14px; line-height: 1.7; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 20px; }
.full-width { width: 100%; }
.form-footer { display: flex; justify-content: flex-end; gap: 12px; }
.form-footer :deep(.n-button) { min-height: 44px; }
@media (max-width: 640px) {
  .form-grid { grid-template-columns: 1fr; }
}
</style>