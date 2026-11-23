<!--
 * @description 目标档位维护弹层（wide）：表 6 列 + 编辑 / 设为默认 / 停用启用；不提供新增与删除。
 * @file app/pages/admin/talent/rules/components/TierManageModal.vue
-->
<script setup lang="ts">
import {
  NAlert,
  NButton,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NSelect,
  NTag,
  useDialog,
  useMessage,
  type DataTableColumns,
} from "naive-ui";
import type { TalentTier } from "~~/shared/types/talent-rule";

const props = defineProps<{ show: boolean }>();
const emit = defineEmits<{ "update:show": [value: boolean]; saved: [] }>();

const api = useTalentRuleApi();
const dialog = useDialog();
const message = useMessage();
const { hasPermission } = usePermission();
const canEditTier = computed(() => hasPermission("talent:tier:edit"));

const rows = ref<TalentTier[]>([]);
const loading = ref(false);
const error = ref("");
const defaultTierName = ref("");
const saving = ref(false);
const busyId = ref("");

const showEdit = ref(false);
const editing = ref<TalentTier | null>(null);
const editForm = reactive({
  name: "",
  teacher: "",
  freq: "",
  description: "",
  status: "1" as "0" | "1",
});
const editErrors = reactive<{ name: string; teacher: string; freq: string }>({
  name: "",
  teacher: "",
  freq: "",
});

const columns = computed<DataTableColumns<TalentTier>>(() => [
  {
    title: "档位名称",
    key: "name",
    minWidth: 130,
    render: (row: TalentTier) =>
      h("span", { class: "tier-name" }, [
        row.name,
        h(
          NTag,
          { size: "tiny", bordered: false, style: "margin-left:8px" },
          { default: () => row.code },
        ),
      ]),
  },
  { title: "建议师资", key: "teacher", minWidth: 120 },
  { title: "建议频次", key: "freq", minWidth: 120 },
  {
    title: "状态",
    key: "status",
    width: 90,
    render: (row: TalentTier) =>
      h(
        NTag,
        {
          size: "small",
          bordered: false,
          type: row.status === "1" ? "success" : "default",
        },
        { default: () => (row.status === "1" ? "启用" : "停用") },
      ),
  },
  {
    title: "全局默认",
    key: "isDefault",
    width: 110,
    render: (row: TalentTier) =>
      row.isDefault
        ? h(NTag, { size: "small", bordered: false, type: "success" }, { default: () => "默认" })
        : h("span", { class: "muted" }, "—"),
  },
  {
    title: "操作",
    key: "actions",
    width: 220,
    fixed: "right",
    render: (row: TalentTier) => {
      if (!canEditTier.value) return h("span", { class: "muted" }, "—");
      return h("div", { class: "tier-actions" }, [
        h(
          NButton,
          {
            size: "tiny",
            quaternary: true,
            type: "primary",
            onClick: () => openEdit(row),
          },
          { default: () => "编辑" },
        ),
        h(
          NButton,
          {
            size: "tiny",
            quaternary: true,
            disabled: row.isDefault || row.status !== "1",
            onClick: () => void setDefault(row),
          },
          { default: () => "设为默认" },
        ),
        h(
          NButton,
          {
            size: "tiny",
            quaternary: true,
            type: row.status === "1" ? "warning" : "default",
            disabled: row.isDefault,
            onClick: () => void toggleStatus(row),
          },
          { default: () => (row.status === "1" ? "停用" : "启用") },
        ),
      ]);
    },
  },
]);

async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    const result = await api.listTiers();
    rows.value = result.rows;
    defaultTierName.value = result.defaultTierName;
  } catch {
    error.value = "目标档位加载失败，请重试";
  } finally {
    loading.value = false;
  }
}

async function setDefault(row: TalentTier): Promise<void> {
  if (busyId.value) return;
  busyId.value = row.id;
  try {
    await api.updateTier(row.id, { isDefault: true });
    await load();
    emit("saved");
  } catch {
    // useApi 已统一提示服务端错误。
  } finally {
    busyId.value = "";
  }
}

async function toggleStatus(row: TalentTier): Promise<void> {
  if (busyId.value) return;
  const nextStatus = row.status === "1" ? "0" : "1";
  if (nextStatus === "0") {
    const confirmed = await new Promise<boolean>((resolve) => {
      let settled = false;
      const settle = (value: boolean): void => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      dialog.warning({
        title: `停用档位「${row.name}」`,
        content: "停用后所有方向同步不可选该档位，已发布报告不受影响。确认停用？",
        positiveText: "停用",
        negativeText: "取消",
        onPositiveClick: () => settle(true),
        onNegativeClick: () => settle(false),
        onClose: () => settle(false),
      });
    });
    if (!confirmed) return;
  }
  busyId.value = row.id;
  try {
    await api.updateTier(row.id, { status: nextStatus });
    await load();
    emit("saved");
  } catch {
    // useApi 已统一提示服务端错误。
  } finally {
    busyId.value = "";
  }
}

function openEdit(row: TalentTier): void {
  editing.value = row;
  editForm.name = row.name;
  editForm.teacher = row.teacher || "";
  editForm.freq = row.freq || "";
  editForm.description = row.description || "";
  editForm.status = row.status === "0" ? "0" : "1";
  editErrors.name = "";
  editErrors.teacher = "";
  editErrors.freq = "";
  showEdit.value = true;
}

async function saveEdit(): Promise<void> {
  if (!editing.value || saving.value) return;
  editErrors.name = "";
  editErrors.teacher = "";
  editErrors.freq = "";
  const messages: string[] = [];
  if (!editForm.name.trim()) {
    editErrors.name = "请输入档位名称";
    messages.push(editErrors.name);
  }
  if (!editForm.teacher.trim()) {
    editErrors.teacher = "请输入建议师资";
    messages.push(editErrors.teacher);
  }
  if (!editForm.freq.trim()) {
    editErrors.freq = "请输入建议频次";
    messages.push(editErrors.freq);
  }
  if (messages.length) {
    message.warning(messages[0] || "请检查档位表单");
    return;
  }
  saving.value = true;
  try {
    await api.updateTier(editing.value.id, {
      name: editForm.name.trim(),
      teacher: editForm.teacher.trim(),
      freq: editForm.freq.trim(),
      description: editForm.description,
      status: editForm.status,
    });
    showEdit.value = false;
    await load();
    emit("saved");
  } catch {
    // useApi 已统一提示服务端错误（409 名称重复 / 422 校验失败）。
  } finally {
    saving.value = false;
  }
}

watch(
  () => props.show,
  (show) => {
    if (show) void load();
    else showEdit.value = false;
  },
  { immediate: true },
);
</script>

<template>
  <n-modal
    :show="props.show"
    preset="card"
    title="目标档位维护"
    style="width: min(960px, calc(100vw - 32px))"
    :mask-closable="false"
    @update:show="emit('update:show', $event)"
  >
    <n-alert type="info" :show-icon="false" class="tier-intro">
      目标档位固定 4 档，不提供新增与删除；停用后所有方向同步不可选，已发布报告使用发布时快照不受影响。
      当前全局默认：<strong>{{ defaultTierName || "未设置" }}</strong>
    </n-alert>
    <n-alert v-if="error" type="error" :show-icon="false" class="tier-intro">
      {{ error }}
      <n-button size="small" text type="primary" @click="load">重试</n-button>
    </n-alert>
    <n-data-table
      :columns="columns"
      :data="rows"
      :loading="loading"
      :bordered="false"
      :scroll-x="860"
      :row-key="(row: TalentTier) => row.id"
    />
    <template #footer>
      <div class="form-footer">
        <n-button @click="emit('update:show', false)">关闭</n-button>
      </div>
    </template>
  </n-modal>

  <n-modal
    v-model:show="showEdit"
    preset="card"
    title="编辑目标档位"
    style="width: min(640px, calc(100vw - 32px))"
    :mask-closable="false"
  >
    <n-form label-placement="top">
      <div class="edit-grid">
        <n-form-item
          label="档位名称"
          required
          :validation-status="editErrors.name ? 'error' : undefined"
          :feedback="editErrors.name"
        >
          <n-input v-model:value="editForm.name" :maxlength="20" placeholder="例如：启蒙" />
        </n-form-item>
        <n-form-item label="状态">
          <n-select
            v-model:value="editForm.status"
            :options="[
              { label: '启用', value: '1' },
              { label: '停用', value: '0' },
            ]"
            :disabled="editing?.isDefault"
          />
        </n-form-item>
        <n-form-item
          label="建议师资"
          required
          :validation-status="editErrors.teacher ? 'error' : undefined"
          :feedback="editErrors.teacher"
        >
          <n-input v-model:value="editForm.teacher" :maxlength="50" placeholder="例如：资深老师" />
        </n-form-item>
        <n-form-item
          label="建议频次"
          required
          :validation-status="editErrors.freq ? 'error' : undefined"
          :feedback="editErrors.freq"
        >
          <n-input v-model:value="editForm.freq" :maxlength="50" placeholder="例如：每周 2 次" />
        </n-form-item>
        <n-form-item label="档位说明" class="wide">
          <n-input
            v-model:value="editForm.description"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 6 }"
            :maxlength="1000"
            placeholder="档位说明，可留空"
          />
        </n-form-item>
      </div>
    </n-form>
    <template #footer>
      <div class="form-footer">
        <n-button @click="showEdit = false">取消</n-button>
        <n-button type="primary" :loading="saving" @click="saveEdit">保存档位</n-button>
      </div>
    </template>
  </n-modal>
</template>

<style scoped>
.tier-intro { margin-bottom: 14px; line-height: 1.7; }
.tier-actions { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.muted { color: var(--text-color-3, #999); }
.tier-name { font-weight: 600; }
.edit-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 20px; }
.wide { grid-column: 1 / -1; }
.form-footer { display: flex; justify-content: flex-end; gap: 12px; }
.form-footer :deep(.n-button) { min-height: 44px; }
@media (max-width: 640px) {
  .edit-grid { grid-template-columns: 1fr; }
  .wide { grid-column: auto; }
}
</style>