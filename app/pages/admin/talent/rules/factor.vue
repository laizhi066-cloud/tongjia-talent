<!--
 * @description 潜质要素（只读文库）：左侧分册 + 右侧单行 7 列表格；性别 / 年龄切库、同步、导出与四段槽位弹层。
 * @file app/pages/admin/talent/rules/factor.vue
-->
<script setup lang="ts">
import {
  NButton,
  NDataTable,
  NEmpty,
  NInput,
  NSelect,
  NTag,
  useDialog,
  useMessage,
  type DataTableColumns,
} from "naive-ui";
import type {
  TalentFactorLibraryRow,
  TalentLevelRow,
} from "~/composables/api/useTalentRuleApi";
import type { TalentFactor } from "~~/shared/types/talent-rule";
import {
  TALENT_CATEGORY_NAMES,
  TALENT_LEVEL_CODES,
} from "~~/shared/types/talent-rule";
import FactorSlotModal from "./components/FactorSlotModal.vue";

definePageMeta({ layout: "admin", middleware: ["auth", "permission-guard"] });

type FillFilter = "all" | "complete" | "partial" | "empty";

const api = useTalentRuleApi();
const dialog = useDialog();
const message = useMessage();
const { hasPermission } = usePermission();
const canSync = computed(() => hasPermission("talent:factor:sync"));
const canExport = computed(() => hasPermission("talent:factor:export"));

const CATEGORY_CODES = ["A", "B", "C", "D", "E", "F"] as const;

const libraries = ref<TalentFactorLibraryRow[]>([]);
const levels = ref<TalentLevelRow[]>([]);
const rows = ref<TalentFactor[]>([]);
const total = ref(0);
const categoryCounts = ref<Record<string, number>>({});
const categoryTotal = ref(0);
const page = ref(1);
const pageSize = ref(20);
const keyword = ref("");
const category = ref("");
const fill = ref<FillFilter>("all");
const gender = ref<"male" | "female">("male");
const age = ref(0);
const loading = ref(false);
/** 仅首次加载显示骨架屏：切分册 / 搜索时保留左右两栏，避免筛选区闪断。 */
const booting = ref(true);
const error = ref("");
const syncing = ref(false);

const showSlots = ref(false);
const slotFactorId = ref("");

const genderOptions = [
  { label: "男", value: "male" },
  { label: "女", value: "female" },
];
const ageOptions = Array.from({ length: 19 }, (_, index) => ({
  label: `${index} 岁`,
  value: index,
}));
const fillOptions: Array<{ label: string; value: FillFilter }> = [
  { label: "全部状态", value: "all" },
  { label: "已回填", value: "complete" },
  { label: "部分回填", value: "partial" },
  { label: "待补写", value: "empty" },
];

const currentLibrary = computed<TalentFactorLibraryRow | null>(
  () =>
    libraries.value.find(
      (library) => library.gender === gender.value && Number(library.age) === age.value,
    ) || null,
);

const libraryLabel = computed(
  () => `${gender.value === "female" ? "女" : "男"} · ${age.value} 岁`,
);

/** 左侧分册清单：全部分册 + A–F，数量来自与关键词同源的聚合。 */
const categoryItems = computed(() =>
  CATEGORY_CODES.map((code) => ({
    code,
    name: TALENT_CATEGORY_NAMES[code] || "",
    count: Number(categoryCounts.value[code] || 0),
  })),
);

/** 数据熵分级压成一行：`4 档 · 常态/优良/优秀/卓越`，超宽由 tooltip 展示全文。 */
const levelSummary = computed(() => {
  const names = levels.value
    .map((level) => String(level.name || "").trim())
    .filter(Boolean);
  const count = levels.value.length || TALENT_LEVEL_CODES.length;
  return names.length ? `${count} 档 · ${names.join("/")}` : `${count} 档`;
});

const notSynced = computed(() => !loading.value && !error.value && !currentLibrary.value);
const activeEmpty = computed(
  () => !loading.value && !error.value && rows.value.length === 0,
);

/** 槽位合并成一行：`12 条 · 已填 3 · 待补 9`，不再上下两行。 */
function slotSummary(row: TalentFactor): string {
  const totalSlots = Number(row.slotTotal || 12);
  const filled = Number(row.filledSlotCount || 0);
  const remaining = Math.max(0, totalSlots - filled);
  return `${totalSlots} 条 · 已填 ${filled} · 待补 ${remaining}`;
}

function categoryLabel(row: TalentFactor): string {
  const name = row.categoryName || TALENT_CATEGORY_NAMES[row.category] || "";
  return name ? `${row.category} ${name}` : row.category;
}

const columns = computed<DataTableColumns<TalentFactor>>(() => [
  {
    title: "要素编号",
    key: "code",
    width: 96,
    ellipsis: { tooltip: true },
    render: (row: TalentFactor) => h("span", { class: "mono" }, row.code),
  },
  {
    title: "潜质要素",
    key: "name",
    width: 160,
    ellipsis: { tooltip: true },
  },
  {
    title: "所属分册",
    key: "category",
    width: 128,
    ellipsis: { tooltip: true },
    render: (row: TalentFactor) => categoryLabel(row),
  },
  {
    title: "数据熵分级",
    key: "levels",
    width: 212,
    ellipsis: { tooltip: true },
    render: () => levelSummary.value,
  },
  {
    title: "文案槽位",
    key: "filledSlotCount",
    width: 176,
    ellipsis: { tooltip: true },
    render: (row: TalentFactor) => slotSummary(row),
  },
  {
    title: "回填状态",
    key: "fillStatus",
    width: 96,
    render: (row: TalentFactor) => {
      const status = fillStatus(row);
      return h(NTag, { size: "small", bordered: false, type: status.type }, { default: () => status.label });
    },
  },
  {
    title: "操作",
    key: "actions",
    width: 104,
    fixed: "right",
    render: (row: TalentFactor) => {
      const filled = Number(row.filledSlotCount || 0);
      const partial = Number(row.partialSlotCount || 0);
      if (filled + partial === 0) return h("span", { class: "muted" }, "—");
      return h(
        NButton,
        { size: "tiny", quaternary: true, type: "primary", onClick: () => openSlots(row) },
        { default: () => "查看文案" },
      );
    },
  },
]);

function fillStatus(row: TalentFactor): { label: string; type: "success" | "warning" | "default" } {
  const totalSlots = Number(row.slotTotal || 12);
  const filled = Number(row.filledSlotCount || 0);
  const partial = Number(row.partialSlotCount || 0);
  if (filled >= totalSlots) return { label: "已回填", type: "success" };
  if (partial > 0 || filled > 0) return { label: "部分回填", type: "warning" };
  return { label: "待补写", type: "default" };
}

async function fetchFactors(): Promise<void> {
  const library = currentLibrary.value;
  if (!library) {
    rows.value = [];
    total.value = 0;
    categoryCounts.value = {};
    categoryTotal.value = 0;
    return;
  }
  loading.value = true;
  error.value = "";
  try {
    const result = await api.listFactors({
      libraryId: library.id,
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined,
      category: category.value || undefined,
      fill: fill.value === "all" ? undefined : fill.value,
    });
    rows.value = result.rows;
    total.value = result.total;
    categoryCounts.value = result.categoryCounts || {};
    categoryTotal.value = Number(result.categoryTotal || 0);
  } catch {
    error.value = "潜质要素加载失败，请稍后重试";
  } finally {
    loading.value = false;
  }
}

async function loadAll(): Promise<void> {
  booting.value = true;
  error.value = "";
  try {
    const [libraryResult, levelResult] = await Promise.all([
      api.listFactorLibraries({ page: 1, pageSize: 100 }),
      api.listLevels({ page: 1, pageSize: 100, status: "1" }),
    ]);
    libraries.value = libraryResult.rows;
    levels.value = levelResult.rows;
  } catch {
    error.value = "潜质要素加载失败，请稍后重试";
    booting.value = false;
    return;
  }
  await fetchFactors();
  booting.value = false;
}

async function refreshLibrary(): Promise<void> {
  try {
    const libraryResult = await api.listFactorLibraries({ page: 1, pageSize: 100 });
    libraries.value = libraryResult.rows;
  } catch {
    error.value = "潜质要素加载失败，请稍后重试";
    return;
  }
  await fetchFactors();
}

function applyFilters(): void {
  page.value = 1;
  void fetchFactors();
}

function onLibrarySwitch(nextGender: "male" | "female", nextAge: number): void {
  if (gender.value === nextGender && age.value === nextAge) return;
  gender.value = nextGender;
  age.value = nextAge;
  keyword.value = "";
  category.value = "";
  fill.value = "all";
  page.value = 1;
  void refreshLibrary();
}

function selectCategory(code: string): void {
  if (category.value === code) return;
  category.value = code;
  applyFilters();
}

function onGenderChange(value: unknown): void {
  if (value !== "male" && value !== "female") return;
  onLibrarySwitch(value, age.value);
}

function onAgeChange(value: unknown): void {
  if (typeof value !== "number") return;
  onLibrarySwitch(gender.value, value);
}

function onFillChange(value: unknown): void {
  if (value !== "all" && value !== "complete" && value !== "partial" && value !== "empty") return;
  if (fill.value === value) return;
  fill.value = value;
  applyFilters();
}

function handleSearch(): void {
  applyFilters();
}

function handleReset(): void {
  keyword.value = "";
  category.value = "";
  fill.value = "all";
  applyFilters();
}

function changePage(next: number): void {
  page.value = next;
  void fetchFactors();
}

function changePageSize(next: number): void {
  pageSize.value = next;
  page.value = 1;
  void fetchFactors();
}

async function confirmSync(): Promise<void> {
  if (syncing.value) return;
  const library = currentLibrary.value;
  const confirmed = await new Promise<boolean>((resolve) => {
    let settled = false;
    const settle = (value: boolean): void => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    dialog.info({
      title: library ? `同步「${libraryLabel.value}」潜质要素库` : `首次同步「${libraryLabel.value}」潜质要素库`,
      content: library
        ? "同步会按要素编号覆盖该库文案，不新增、不停用要素。确认同步？"
        : "该库首次同步，将拉取整库潜质要素与文案。确认同步？",
      positiveText: "开始同步",
      negativeText: "取消",
      onPositiveClick: () => settle(true),
      onNegativeClick: () => settle(false),
      onClose: () => settle(false),
    });
  });
  if (!confirmed) return;
  syncing.value = true;
  try {
    if (library) await api.syncFactorLibrary(library.id);
    else await api.syncNewFactorLibrary({ gender: gender.value, age: age.value });
    keyword.value = "";
    category.value = "";
    fill.value = "all";
    page.value = 1;
    await refreshLibrary();
  } catch {
    // useApi 已统一提示服务端错误，保持原数据。
  } finally {
    syncing.value = false;
  }
}

async function exportLibrary(): Promise<void> {
  const library = currentLibrary.value;
  if (!library) {
    message.warning("该库尚未同步，暂不能导出");
    return;
  }
  try {
    await api.downloadFactorLibraryExport({
      id: library.id,
      gender: library.gender,
      age: Number(library.age),
      category: category.value || undefined,
      keyword: keyword.value || undefined,
    });
  } catch {
    message.error("导出失败，请稍后重试");
  }
}

async function downloadTemplate(): Promise<void> {
  try {
    await api.downloadFactorLibraryTemplate();
  } catch {
    message.error("模板下载失败，请稍后重试");
  }
}

function openSlots(row: TalentFactor): void {
  slotFactorId.value = row.id;
  showSlots.value = true;
}

onMounted(() => void loadAll());
</script>

<template>
  <AdminListPage
    title="潜质要素"
    :loading="booting"
    :error="error"
    :empty="false"
    @retry="loadAll"
  >
    <template #headerExtra>
      <label class="switch-field">
        <span class="switch-label">性别</span>
        <n-select
          :value="gender"
          class="gender-select"
          :options="genderOptions"
          aria-label="选择性别"
          @update:value="onGenderChange"
        />
      </label>
      <label class="switch-field">
        <span class="switch-label">年龄</span>
        <n-select
          :value="age"
          class="age-select"
          :options="ageOptions"
          aria-label="选择年龄"
          @update:value="onAgeChange"
        />
      </label>
      <n-button
        v-if="canSync"
        type="primary"
        class="main-action"
        :loading="syncing"
        @click="confirmSync"
      >
        同步该库
      </n-button>
      <n-button
        v-if="canExport"
        class="main-action"
        :disabled="!currentLibrary || syncing"
        @click="exportLibrary"
      >
        导出
      </n-button>
      <n-button
        v-if="canExport"
        class="main-action"
        :disabled="syncing"
        @click="downloadTemplate"
      >
        文库模板
      </n-button>
    </template>

    <div class="factor-workspace">
      <aside class="factor-sidebar" aria-label="按分册筛选">
        <div class="factor-sidebar-title">分册</div>
        <button
          type="button"
          class="factor-category"
          :class="{ 'is-active': category === '' }"
          @click="selectCategory('')"
        >
          <span class="factor-category-name">全部分册</span>
          <b>{{ categoryTotal }}</b>
        </button>
        <button
          v-for="item in categoryItems"
          :key="item.code"
          type="button"
          class="factor-category"
          :class="{ 'is-active': category === item.code }"
          @click="selectCategory(item.code)"
        >
          <span class="factor-category-name">{{ item.code }} {{ item.name }}</span>
          <b>{{ item.count }}</b>
        </button>
      </aside>

      <section class="factor-main">
        <div class="factor-filters">
          <n-input
            v-model:value="keyword"
            class="filter-keyword"
            placeholder="要素编号 / 潜质要素名称"
            clearable
            @keyup.enter="handleSearch"
          />
          <n-select
            :value="fill"
            class="filter-fill"
            :options="fillOptions"
            aria-label="回填状态"
            @update:value="onFillChange"
          />
          <n-button type="primary" @click="handleSearch">搜索</n-button>
          <n-button @click="handleReset">重置</n-button>
        </div>

        <div v-if="activeEmpty" class="factor-empty">
          <n-empty v-if="notSynced" :description="`「${libraryLabel}」的潜质要素尚未同步`">
            <template #extra>
              <n-button
                v-if="canSync"
                type="primary"
                class="main-action"
                :loading="syncing"
                @click="confirmSync"
              >
                同步该库
              </n-button>
            </template>
          </n-empty>
          <AdminEmptyState
            v-else
            description="当前筛选下暂无潜质要素"
            action-text="重置筛选"
            @action="handleReset"
          />
        </div>

        <n-data-table
          v-else
          flex-height
          class="factor-table"
          :columns="columns"
          :data="rows"
          :loading="loading"
          :bordered="false"
          :single-line="false"
          :scroll-x="972"
          :row-key="(row: TalentFactor) => row.id"
        />

        <div v-if="total > 0" class="factor-pagination">
          <AdminPagination
            :page="page"
            :page-size="pageSize"
            :total="total"
            @update:page="changePage"
            @update:page-size="changePageSize"
          />
        </div>
      </section>
    </div>
  </AdminListPage>

  <FactorSlotModal v-model:show="showSlots" :factor-id="slotFactorId" />
</template>

<style scoped>
.main-action { min-height: 44px; }

/* 库切换：只保留性别 / 年龄，元信息全部收进弹层与空态。 */
.switch-field { display: inline-flex; align-items: center; gap: 6px; }
.switch-label { color: var(--muted-foreground, #6c756a); font-size: 12px; white-space: nowrap; }
.gender-select { width: 82px; }
.age-select { width: 94px; }

/* 左右两栏：左侧分册，右侧筛选 + 表格 + 分页。 */
.factor-workspace { display: flex; flex: 1; gap: 16px; min-width: 0; min-height: 0; }
.factor-sidebar {
  display: flex;
  flex: 0 0 188px;
  flex-direction: column;
  width: 188px;
  align-self: flex-start;
  padding: 8px;
  overflow: hidden;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 10px;
}
.factor-sidebar-title { padding: 6px 10px 8px; color: var(--muted-foreground, #6c756a); font-size: 12px; font-weight: 600; }
.factor-category {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 36px;
  padding: 7px 10px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--foreground);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.factor-category:hover { background: var(--muted); }
.factor-category.is-active { background: color-mix(in srgb, var(--primary) 11%, var(--card)); color: var(--foreground); font-weight: 600; }
.factor-category-name { flex: 1; min-width: 0; overflow: hidden; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.factor-category b { flex: 0 0 auto; color: var(--muted-foreground, #6c756a); font-size: 12px; font-variant-numeric: tabular-nums; }
.factor-category.is-active b { color: var(--foreground); }

.factor-main { display: flex; flex: 1; flex-direction: column; gap: 12px; min-width: 0; min-height: 0; }
.factor-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.filter-keyword { width: 240px; }
.filter-fill { width: 132px; }

/* 表格单行：所有列不换行，超出省略并 tooltip 展示全文。 */
.factor-table { flex: 1; min-height: 0; font-size: 13px; }
.factor-main :deep(.n-data-table-th) { white-space: nowrap; background: var(--muted); color: var(--foreground); font-size: 12.5px; font-weight: 600; }
.factor-main :deep(.n-data-table-td) { padding-top: 10px; padding-bottom: 10px; color: var(--foreground); white-space: nowrap; }

.factor-empty { display: flex; flex: 1; align-items: center; justify-content: center; padding: 32px 0; }
.factor-pagination { display: flex; flex: 0 0 auto; justify-content: flex-end; padding: 2px 0 6px; }

.mono { font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace); white-space: nowrap; }
:deep(.muted) { color: var(--muted-foreground, #6c756a); }
:deep(.n-input__placeholder) { color: var(--muted-foreground, #6c756a); }
:deep(.n-base-selection-placeholder) { color: var(--muted-foreground, #6c756a); }

@media (max-width: 900px) {
  .factor-workspace { flex-direction: column; align-items: stretch; }
  .factor-sidebar { align-self: stretch; flex: none; flex-direction: row; width: 100%; gap: 6px; overflow-x: auto; padding: 6px; }
  .factor-sidebar-title { display: none; }
  .factor-category { flex: 0 0 auto; width: auto; min-height: 32px; white-space: nowrap; }
  .factor-category-name { overflow: visible; }
  .factor-category b { margin-left: 2px; }
  .filter-keyword { flex: 1 1 180px; width: auto; }
}
</style>