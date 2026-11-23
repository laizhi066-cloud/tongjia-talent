<!--
 * @description 培养方向配置弹层（ultra 两栏）：基础信息 + 要素与要求分级 + 目标档位子集 / 默认档位。
 * @file app/pages/admin/talent/rules/components/DirectionConfigModal.vue
-->
<script setup lang="ts">
import {
  NAlert,
  NButton,
  NCheckbox,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NSelect,
  NTag,
  useMessage,
  type DataTableColumns,
} from "naive-ui";
import type {
  TalentDirectionRow,
  TalentFactorLibraryRow,
  TalentLevelRow,
} from "~/composables/api/useTalentRuleApi";
import type { TalentFactor, TalentTier } from "~~/shared/types/talent-rule";
import { TALENT_CATEGORY_NAMES } from "~~/shared/types/talent-rule";

interface Props {
  show: boolean;
  directionId: string;
  record: TalentDirectionRow | null;
}

interface RequirementRow {
  code: string;
  level: string;
}

interface FormState {
  name: string;
  code: string;
  description: string;
  status: "0" | "1";
}

const props = defineProps<Props>();
const emit = defineEmits<{ "update:show": [value: boolean]; saved: [] }>();

const api = useTalentRuleApi();
const message = useMessage();

const form = reactive<FormState>({ name: "", code: "", description: "", status: "1" });
const version = ref(0);
const requirements = ref<RequirementRow[]>([]);
const tierIds = ref<string[]>([]);
const defaultTierId = ref("");
const selectedFactorCodes = ref<string[]>([]);
const factorCategory = ref("");
const fieldErrors = reactive<{ name: string; code: string }>({ name: "", code: "" });
const errors = ref<string[]>([]);
const saving = ref(false);
const loading = ref(false);

const libraries = ref<TalentFactorLibraryRow[]>([]);
const factors = ref<TalentFactor[]>([]);
const levels = ref<TalentLevelRow[]>([]);
const tiers = ref<TalentTier[]>([]);
const globalDefaultTierName = ref("");

const isEditing = computed(() => Boolean(props.directionId));
const title = computed(() => (isEditing.value ? "配置培养方向" : "新增培养方向"));

/** 启用且最近同步的分库；要素多选只列该库的 158 项（spec §6.1）。 */
const enabledLibrary = computed<TalentFactorLibraryRow | null>(() => {
  const candidates = libraries.value
    .filter((library) => library.status === "1" && library.syncedAt)
    .sort((left, right) => Date.parse(String(right.syncedAt)) - Date.parse(String(left.syncedAt)));
  return candidates[0] || null;
});

const enabledLevels = computed(() => levels.value.filter((level) => level.status === "1"));
const enabledTiers = computed(() => tiers.value.filter((tier) => tier.status === "1"));

const factorByCode = computed(() => new Map(factors.value.map((factor) => [factor.code, factor])));

const categoryOptions = computed(() => {
  const categories = ["A", "B", "C", "D", "E", "F"];
  return [
    { label: `全部分册（${factors.value.length}）`, value: "" },
    ...categories.map((category) => {
      const count = factors.value.filter((factor) => factor.category === category).length;
      return {
        label: `${category} ${TALENT_CATEGORY_NAMES[category] || ""}（${count}）`,
        value: category,
      };
    }),
  ];
});

const factorOptions = computed(() =>
  factors.value
    .filter((factor) => !factorCategory.value || factor.category === factorCategory.value)
    .map((factor) => ({
      label: `${factor.code} ${factor.name}`,
      value: factor.code,
    })),
);

const levelOptions = computed(() =>
  enabledLevels.value.map((level) => ({
    label: `${level.name}（${level.code}）`,
    value: level.code,
  })),
);

const tierOptions = computed(() =>
  tiers.value
    .filter((tier) => tierIds.value.includes(tier.id))
    .map((tier) => ({ label: tier.name, value: tier.id })),
);

const requirementColumns = computed<DataTableColumns<RequirementRow>>(() => [
  {
    title: "要素编码",
    key: "code",
    width: 90,
    render: (row: RequirementRow) => h("span", { class: "mono" }, row.code),
  },
  {
    title: "潜质要素",
    key: "name",
    minWidth: 140,
    render: (row: RequirementRow) =>
      h("span", factorByCode.value.get(row.code)?.name || row.code),
  },
  {
    title: "所属分册",
    key: "category",
    width: 120,
    render: (row: RequirementRow) => {
      const factor = factorByCode.value.get(row.code);
      if (!factor) return h("span", { class: "muted" }, "—");
      return h(
        "span",
        `${factor.category} ${factor.categoryName || TALENT_CATEGORY_NAMES[factor.category] || ""}`,
      );
    },
  },
  {
    title: "要求分级",
    key: "level",
    width: 160,
    render: (row: RequirementRow) =>
      h(NSelect, {
        value: row.level || null,
        options: levelOptions.value,
        size: "small",
        placeholder: "请选择",
        "aria-label": `要素 ${row.code} 的要求分级`,
        "onUpdate:value": (value: string | null) => {
          row.level = value || "";
        },
      }),
  },
  {
    title: "操作",
    key: "actions",
    width: 60,
    render: (row: RequirementRow) =>
      h(
        NButton,
        { size: "tiny", quaternary: true, type: "error", onClick: () => removeRequirement(row.code) },
        { default: () => "移除" },
      ),
  },
]);

function resetForm(): void {
  form.name = "";
  form.code = "";
  form.description = "";
  form.status = "1";
  version.value = 0;
  requirements.value = [];
  tierIds.value = [];
  defaultTierId.value = "";
  selectedFactorCodes.value = [];
  factorCategory.value = "";
  errors.value = [];
  fieldErrors.name = "";
  fieldErrors.code = "";
}

function fillForm(row: TalentDirectionRow): void {
  form.name = row.name || "";
  form.code = row.code || "";
  form.description = row.description || "";
  form.status = row.status === "0" ? "0" : "1";
  version.value = Number(row.version || 0);
  requirements.value = (Array.isArray(row.requirements) ? row.requirements : [])
    .filter((item) => item && typeof item.code === "string")
    .map((item) => ({ code: item.code, level: item.level || "" }));
  tierIds.value = Array.isArray(row.tierIds) ? row.tierIds.map(String) : [];
  defaultTierId.value = String(row.defaultTierId || "");
}

/** 分页上限 100，158 项要素需要翻页取全（只读配置用）。 */
async function loadAllFactors(libraryId: string): Promise<void> {
  const collected: TalentFactor[] = [];
  let page = 1;
  let total = 0;
  do {
    const result = await api.listFactors({ libraryId, page, pageSize: 100 });
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
    const [libraryResult, levelResult, tierResult] = await Promise.all([
      api.listFactorLibraries({ status: "1", page: 1, pageSize: 100 }),
      api.listLevels({ page: 1, pageSize: 100, status: "1" }),
      api.listTiers(),
    ]);
    libraries.value = libraryResult.rows;
    levels.value = levelResult.rows;
    tiers.value = tierResult.rows;
    globalDefaultTierName.value = tierResult.defaultTierName;
    factors.value = [];
    const library = enabledLibrary.value;
    if (library) await loadAllFactors(library.id);
    if (props.directionId) {
      const detail = await api.getDirection(props.directionId);
      fillForm(detail);
      // 目标档位以档位接口的启用状态为准，剔除已停用 / 已不存在的档位。
      tierIds.value = tierIds.value.filter((id) => tiers.value.some((tier) => tier.id === id));
      if (!tierIds.value.includes(defaultTierId.value)) defaultTierId.value = "";
    }
    if (!tierIds.value.length && enabledTiers.value.length) {
      // 新增时默认勾选全部启用档位，并默认选中全局默认档位或第一档。
      tierIds.value = enabledTiers.value.map((tier) => tier.id);
      defaultTierId.value =
        tiers.value.find((tier) => tier.isDefault && tier.status === "1")?.id ||
        enabledTiers.value[0]?.id ||
        "";
    }
  } catch {
    errors.value = ["配置数据加载失败，请关闭弹层重试"];
  } finally {
    loading.value = false;
  }
}

function addSelectedFactors(): void {
  if (!selectedFactorCodes.value.length) {
    message.warning("请先选择潜质要素");
    return;
  }
  const fallbackLevel = enabledLevels.value[0]?.code || "";
  const existing = new Set(requirements.value.map((item) => item.code));
  const additions = selectedFactorCodes.value.filter((code) => !existing.has(code));
  if (!additions.length) {
    message.warning("所选要素已在配置中");
    return;
  }
  if (requirements.value.length + additions.length > 50) {
    message.warning("方向最多配置 50 项要素");
    return;
  }
  requirements.value = [
    ...requirements.value,
    ...additions.map((code) => ({ code, level: fallbackLevel })),
  ];
  selectedFactorCodes.value = [];
}

function removeRequirement(code: string): void {
  requirements.value = requirements.value.filter((item) => item.code !== code);
}

function clearRequirements(): void {
  requirements.value = [];
}

function toggleTier(tierId: string, checked: boolean): void {
  tierIds.value = checked
    ? [...new Set([...tierIds.value, tierId])]
    : tierIds.value.filter((id) => id !== tierId);
  if (!tierIds.value.includes(defaultTierId.value))
    defaultTierId.value = tierIds.value[0] || "";
}

function validate(): boolean {
  const messages: string[] = [];
  fieldErrors.name = "";
  fieldErrors.code = "";
  if (!form.name.trim()) {
    fieldErrors.name = "请输入方向名称";
    messages.push("方向名称不能为空");
  }
  if (!isEditing.value && !form.code.trim()) {
    fieldErrors.code = "请输入方向编码，例如 DIR-001";
    messages.push(fieldErrors.code);
  } else if (form.code.trim() && !/^[A-Z0-9-]{2,64}$/.test(form.code.trim())) {
    fieldErrors.code = "编码只能包含大写字母 / 数字 / 短横线，长度 2–64";
    messages.push(fieldErrors.code);
  }
  if (!requirements.value.length) messages.push("至少配置 1 项要素");
  if (requirements.value.length > 50) messages.push("方向最多配置 50 项要素");
  if (requirements.value.some((item) => !item.level)) messages.push("每项要素都需要选择要求分级");
  if (requirements.value.some((item) => item.level && !enabledLevels.value.some((level) => level.code === item.level)))
    messages.push("要求分级不存在或已停用，请重新选择");
  if (factors.value.length && requirements.value.some((item) => !factorByCode.value.has(item.code)))
    messages.push("存在当前启用文库里不存在的要素编码");
  if (new Set(requirements.value.map((item) => item.code)).size !== requirements.value.length)
    messages.push("要素编码不能重复");
  if (!tierIds.value.length) messages.push("至少启用 1 个目标档位");
  if (tierIds.value.some((id) => !enabledTiers.value.some((tier) => tier.id === id)))
    messages.push("只能选择启用中的档位");
  if (!defaultTierId.value || !tierIds.value.includes(defaultTierId.value))
    messages.push("默认档位必须在已选档位中");
  errors.value = messages;
  return messages.length === 0;
}

async function handleSave(): Promise<void> {
  if (saving.value) return;
  if (!validate()) {
    message.warning(errors.value[0] || "请检查方向配置");
    return;
  }
  saving.value = true;
  try {
    const body = {
      name: form.name.trim(),
      ...(isEditing.value ? {} : { code: form.code.trim() }),
      description: form.description,
      requirements: requirements.value.map((item) => ({ code: item.code, level: item.level })),
      tierIds: [...tierIds.value],
      defaultTierId: defaultTierId.value,
      status: form.status,
    };
    if (isEditing.value) await api.updateDirection(props.directionId, body);
    else await api.createDirection(body);
    emit("update:show", false);
    emit("saved");
  } catch {
    // useApi 已统一提示服务端错误（403 / 409 / 422）。
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
    style="width: min(1180px, calc(100vw - 32px))"
    content-style="max-height: calc(100vh - 210px); overflow-y: auto;"
    :mask-closable="false"
    @update:show="emit('update:show', $event)"
  >
    <n-alert v-if="errors.length" type="error" :show-icon="false" class="error-banner">
      <div v-for="item in errors" :key="item">{{ item }}</div>
    </n-alert>
    <n-alert
      v-if="!loading && !enabledLibrary"
      type="warning"
      :show-icon="false"
      class="error-banner"
    >
      暂无已同步的启用分库，无法配置要素。请先在「潜质要素」页同步一个分库。
    </n-alert>

    <div class="config-grid">
      <section class="config-col">
        <div class="section-card">
          <header class="section-head">
            <span class="section-title">基础信息</span>
            <n-tag v-if="isEditing" size="small" :bordered="false">配置版本 v{{ version }}</n-tag>
          </header>
          <n-form label-placement="top" :disabled="loading">
            <n-form-item
              label="方向名称"
              required
              :validation-status="fieldErrors.name ? 'error' : undefined"
              :feedback="fieldErrors.name"
            >
              <n-input v-model:value="form.name" placeholder="例如：舞蹈家" :maxlength="100" />
            </n-form-item>
            <n-form-item
              label="方向编码"
              required
              :validation-status="fieldErrors.code ? 'error' : undefined"
              :feedback="fieldErrors.code"
            >
              <n-input
                v-model:value="form.code"
                :disabled="isEditing"
                placeholder="例如：DIR-001"
                :maxlength="64"
              />
            </n-form-item>
            <n-form-item label="方向说明">
              <n-input
                v-model:value="form.description"
                type="textarea"
                :autosize="{ minRows: 2, maxRows: 4 }"
                :maxlength="500"
                placeholder="列表第二行展示的一句描述"
              />
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
          </n-form>
        </div>

        <div class="section-card">
          <header class="section-head">
            <span class="section-title">目标档位</span>
            <span class="section-hint">
              全局默认：{{ globalDefaultTierName || "未设置" }}
            </span>
          </header>
          <n-alert v-if="!enabledTiers.length" type="warning" :show-icon="false">
            暂无启用档位，请先在「目标档位维护」中启用。
          </n-alert>
          <div v-else class="tier-list">
            <n-checkbox
              v-for="tier in tiers"
              :key="tier.id"
              :checked="tierIds.includes(tier.id)"
              :disabled="tier.status !== '1'"
              @update:checked="checked => toggleTier(tier.id, checked)"
            >
              <span class="tier-label">
                <span class="tier-name">{{ tier.name }}</span>
                <span class="tier-meta">{{ tier.teacher }} · {{ tier.freq }}</span>
                <n-tag v-if="tier.isDefault" size="tiny" :bordered="false" type="success">全局默认</n-tag>
                <n-tag v-if="tier.status !== '1'" size="tiny" :bordered="false">已停用</n-tag>
              </span>
            </n-checkbox>
          </div>
          <label class="field-label default-tier">本方向默认档位</label>
          <n-select
            v-model:value="defaultTierId"
            :options="tierOptions"
            :disabled="!tierIds.length"
            placeholder="仅可在已选档位中选择"
          />
        </div>
      </section>

      <section class="section-card config-col">
        <header class="section-head">
          <span class="section-title">要素配置</span>
          <span class="section-hint">
            已选 {{ requirements.length }} / 50 项
          </span>
        </header>
        <div class="factor-picker">
          <n-select
            v-model:value="factorCategory"
            :options="categoryOptions"
            placeholder="全部分册"
            class="picker-category"
          />
          <n-select
            v-model:value="selectedFactorCodes"
            :options="factorOptions"
            multiple
            filterable
            clearable
            :disabled="!enabledLibrary"
            placeholder="选择潜质要素（编码 + 名称）"
            class="picker-factor"
          />
          <n-button type="primary" :disabled="!selectedFactorCodes.length" @click="addSelectedFactors">
            添加所选
          </n-button>
        </div>
        <div class="requirement-table">
          <n-data-table
            :columns="requirementColumns"
            :data="requirements"
            :loading="loading"
            :bordered="false"
            :max-height="360"
            :row-key="(row: RequirementRow) => row.code"
            :locale="{ emptyText: '暂未配置要素，先从上方选择并添加' }"
          />
        </div>
        <div class="requirement-foot">
          <n-button
            size="small"
            quaternary
            type="error"
            :disabled="!requirements.length"
            @click="clearRequirements"
          >
            清空已选要素
          </n-button>
        </div>
      </section>
    </div>

    <template #footer>
      <div class="form-footer">
        <n-button @click="emit('update:show', false)">取消</n-button>
        <n-button type="primary" :loading="saving" :disabled="loading" @click="handleSave">
          {{ isEditing ? "保存配置" : "新增方向" }}
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<style scoped>
.error-banner { margin-bottom: 14px; line-height: 1.7; }
.config-grid { display: grid; grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr); gap: 16px; align-items: start; }
.config-col { display: flex; min-width: 0; flex-direction: column; gap: 16px; }
.section-card { min-width: 0; padding: 16px; border: 1px solid var(--border-color, #efeff5); border-radius: 10px; background: var(--card-color, #fff); }
.section-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.section-title { font-size: 15px; font-weight: 650; }
.section-hint { color: var(--text-color-3, #999); font-size: 12px; }
.tier-list { display: flex; flex-direction: column; gap: 10px; }
.tier-label { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.tier-name { font-weight: 600; }
.tier-meta { color: var(--text-color-3, #999); font-size: 12px; }
.default-tier { margin-top: 14px; }
.field-label { display: block; margin-bottom: 6px; font-size: 14px; }
.factor-picker { display: grid; grid-template-columns: 170px minmax(0, 1fr) auto; gap: 10px; align-items: center; }
.picker-category, .picker-factor { width: 100%; }
.requirement-table { margin-top: 12px; }
.requirement-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 10px; }
.mono { font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace); }
.muted { color: var(--text-color-3, #999); }
.form-footer { display: flex; justify-content: flex-end; gap: 12px; }
.form-footer :deep(.n-button) { min-height: 44px; }
@media (max-width: 900px) {
  .config-grid { grid-template-columns: 1fr; }
  .factor-picker { grid-template-columns: 1fr; }
}
</style>