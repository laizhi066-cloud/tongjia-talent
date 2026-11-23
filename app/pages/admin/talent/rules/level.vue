<!--
 * @description 分级与固定注解：双页签（固定注解 9 列 / 分级设置 7 列）+ 共享分级筛选 + 导入预览 + CRUD。
 * @file app/pages/admin/talent/rules/level.vue
-->
<script setup lang="ts">
import {
  NButton,
  NDataTable,
  NIcon,
  NInput,
  NTag,
  useDialog,
  useMessage,
  type DataTableColumns,
} from "naive-ui";
import type {
  TalentFactorNoteRow,
  TalentLevelRow,
} from "~/composables/api/useTalentRuleApi";
import { CreateOutline, TrashOutline } from "@vicons/ionicons5";
import { createActionColumn } from "~/composables/useAdminTable";
import FactorNoteForm from "./components/FactorNoteForm.vue";
import LevelForm from "./components/LevelForm.vue";
import RuleImportModal from "./components/RuleImportModal.vue";

type RuleTab = "notes" | "levels";

definePageMeta({ layout: "admin", middleware: ["auth", "permission-guard"] });

const api = useTalentRuleApi();
const dialog = useDialog();
const message = useMessage();
const { hasPermission } = usePermission();
const canAdd = computed(() => hasPermission("talent:rule:add"));
const canEdit = computed(() => hasPermission("talent:rule:edit"));
const canDelete = computed(() => hasPermission("talent:rule:delete"));
const canImport = computed(() => hasPermission("talent:rule:import"));
const canExport = computed(() => hasPermission("talent:rule:export"));

const levelCode = ref("");
const factorCode = ref("");
const name = ref("");
const keyword = ref("");

const notes = ref<TalentFactorNoteRow[]>([]);
const notesTotal = ref(0);
const notePage = ref(1);
const notePageSize = ref(20);
const notesLoading = ref(false);
const notesError = ref("");
const noteLevelCounts = ref<Record<string, number>>({});
const noteTotal = ref(0);

const statsLevels = ref<TalentLevelRow[]>([]);
const statsNoteCounts = ref<Record<string, number>>({});
const statsLevelCount = ref(0);
const statsNoteTotal = ref(0);

const showNoteForm = ref(false);
const editingNoteId = ref("");
const editingNote = ref<TalentFactorNoteRow | null>(null);
const showLevelForm = ref(false);
const editingLevelId = ref("");
const editingLevel = ref<TalentLevelRow | null>(null);
const showImport = ref(false);
const importKind = ref<RuleTab>("notes");

const activeLoading = notesLoading;
const activeError = notesError;
const activeEmpty = computed(
  () => !notesLoading.value && !notesError.value && notes.value.length === 0,
);

const levelOptionRows = computed(() => statsLevels.value);
const levelFilterCounts = computed(() => noteLevelCounts.value);
const levelFilterTotal = computed(() => noteTotal.value || statsNoteTotal.value);
const levelToneByCode = computed(
  () => new Map(levelOptionRows.value.map((level) => [level.code, level.tone || "default"])),
);

const noteColumns = computed<DataTableColumns<TalentFactorNoteRow>>(() => [
  {
    title: "注解编号",
    key: "code",
    width: 92,
    render: (row: TalentFactorNoteRow) => h("span", { class: "mono" }, row.code),
  },
  {
    title: "要素编码",
    key: "factorCode",
    width: 76,
    render: (row: TalentFactorNoteRow) => h("span", { class: "mono" }, row.factorCode),
  },
  {
    title: "潜质要素",
    key: "factorName",
    width: 108,
    render: (row: TalentFactorNoteRow) =>
      h("span", { class: row.factorNameResolved ? "" : "muted", title: row.factorName }, [
        row.factorName,
        row.factorNameResolved
          ? null
          : h(NTag, { size: "tiny", bordered: false, type: "warning", style: "margin-left:6px" }, { default: () => "文库未匹配" }),
      ]),
  },
  {
    title: "分级",
    key: "levelCode",
    width: 64,
    render: (row: TalentFactorNoteRow) =>
      h(
        NTag,
        {
          size: "small",
          bordered: false,
          type: (levelToneByCode.value.get(row.levelCode) || "default") as "default" | "info" | "success" | "warning",
        },
        { default: () => row.levelName || row.levelCode },
      ),
  },
  {
    title: "注解正文",
    key: "note",
    width: 210,
    render: (row: TalentFactorNoteRow) => {
      const text = String(row.note || "").trim();
      if (!text)
        return h(NTag, { size: "small", bordered: false, type: "warning" }, { default: () => "待补写" });
      return h("span", { title: text, style: "display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;line-height:1.6;word-break:break-word" }, text);
    },
  },
  {
    title: "年龄条件",
    key: "ageRange",
    width: 76,
    render: (row: TalentFactorNoteRow) =>
      h("span", { class: row.ageRange ? "" : "muted" }, row.ageRange || "—"),
  },
  {
    title: "性别条件",
    key: "gender",
    width: 76,
    render: (row: TalentFactorNoteRow) => row.gender || "通用",
  },
  {
    title: "状态",
    key: "status",
    width: 68,
    render: (row: TalentFactorNoteRow) =>
      h(
        NTag,
        { size: "small", bordered: false, type: row.status === "1" ? "success" : "default" },
        { default: () => (row.status === "1" ? "启用" : "停用") },
      ),
  },
  createActionColumn((row: TalentFactorNoteRow) => [
    { label: "编辑", show: () => canEdit.value, onClick: () => openEditNote(row) },
    {
      label: row.status === "1" ? "停用" : "启用",
      type: "warning" as const,
      show: () => canEdit.value,
      onClick: () => void toggleNoteStatus(row),
    },
    { label: "删除", type: "error" as const, show: () => canDelete.value, onClick: () => void removeNote(row) },
  ], { width: 100, maxInline: 3 }),
]);

async function loadStats(): Promise<void> {
  try {
    const result = await api.listLevels({ page: 1, pageSize: 100 });
    statsLevels.value = result.rows;
    statsLevelCount.value = result.total;
    statsNoteTotal.value = result.noteTotal;
    statsNoteCounts.value = result.noteCounts || {};
  } catch {
    // 统计失败不阻塞列表；顶部数字退回已加载数据。
  }
}

async function loadNotes(): Promise<void> {
  notesLoading.value = true;
  notesError.value = "";
  try {
    const result = await api.listFactorNotes({
      page: notePage.value,
      pageSize: notePageSize.value,
      levelCode: levelCode.value || undefined,
      factorCode: factorCode.value || undefined,
      name: name.value || undefined,
      keyword: keyword.value || undefined,
    });
    notes.value = result.rows;
    notesTotal.value = result.total;
    noteLevelCounts.value = result.levelCounts || {};
    noteTotal.value = result.noteTotal;
  } catch {
    notesError.value = "固定注解加载失败，请检查网络或服务状态后重试";
  } finally {
    notesLoading.value = false;
  }
}

function onLevelFilterChange(): void {
  notePage.value = 1;
  void loadNotes();
}

/** 左侧分级筛选：只改变 levelCode，再按当前页签重新加载。 */
function selectLevel(code: string): void {
  if (levelCode.value === code) return;
  levelCode.value = code;
  onLevelFilterChange();
}

function handleSearch(): void {
  notePage.value = 1;
  void loadNotes();
}

function handleReset(): void {
  levelCode.value = "";
  factorCode.value = "";
  name.value = "";
  keyword.value = "";
  notePage.value = 1;
  void loadNotes();
}

function openCreateNote(): void {
  editingNoteId.value = "";
  editingNote.value = null;
  showNoteForm.value = true;
}

function openEditNote(row: TalentFactorNoteRow): void {
  editingNoteId.value = row.id;
  editingNote.value = row;
  showNoteForm.value = true;
}

function openCreateLevel(): void {
  editingLevelId.value = "";
  editingLevel.value = null;
  showLevelForm.value = true;
}

function openEditLevel(row: TalentLevelRow): void {
  editingLevelId.value = row.id;
  editingLevel.value = row;
  showLevelForm.value = true;
}

function openImport(): void {
  importKind.value = "notes";
  showImport.value = true;
}

async function toggleNoteStatus(row: TalentFactorNoteRow): Promise<void> {
  try {
    await api.updateFactorNote(row.id, { status: row.status === "1" ? "0" : "1" });
    await loadNotes();
  } catch {
    // useApi 已统一提示服务端错误。
  }
}

async function removeNote(row: TalentFactorNoteRow): Promise<void> {
  const confirmed = await new Promise<boolean>((resolve) => {
    let settled = false;
    const settle = (value: boolean): void => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    dialog.warning({
      title: `删除注解「${row.code}」`,
      content: "删除后不可恢复；历史报告使用发布时快照，不受影响。确认删除？",
      positiveText: "删除",
      negativeText: "取消",
      onPositiveClick: () => settle(true),
      onNegativeClick: () => settle(false),
      onClose: () => settle(false),
    });
  });
  if (!confirmed) return;
  try {
    await api.deleteFactorNote(row.id);
    if (notes.value.length === 1 && notePage.value > 1) notePage.value -= 1;
    await Promise.all([loadNotes(), loadStats()]);
  } catch {
    // useApi 已统一提示服务端错误。
  }
}

async function removeLevel(row: TalentLevelRow): Promise<void> {
  const confirmed = await new Promise<boolean>((resolve) => {
    let settled = false;
    const settle = (value: boolean): void => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    dialog.warning({
      title: `删除分级「${row.name}」`,
      content: "删除后不可恢复；被固定注解或方向引用的分级只能停用。确认删除？",
      positiveText: "删除",
      negativeText: "取消",
      onPositiveClick: () => settle(true),
      onNegativeClick: () => settle(false),
      onClose: () => settle(false),
    });
  });
  if (!confirmed) return;
  try {
    await api.deleteLevel(row.id);
    await Promise.all([loadStats(), loadNotes()]);
  } catch {
    // useApi 已统一提示服务端 409「该分级已被引用，只允许停用」。
  }
}

function handleSaved(): void {
  void loadStats();
  void loadNotes();
}

function handleImported(): void {
  void loadStats();
  void loadNotes();
}

async function exportCurrent(): Promise<void> {
  try {
    await api.downloadFactorNoteExport({
      levelCode: levelCode.value || undefined,
      factorCode: factorCode.value || undefined,
      name: name.value || undefined,
      keyword: keyword.value || undefined,
    });
  } catch {
    message.error("导出失败，请稍后重试");
  }
}

onMounted(() => {
  void loadStats();
  void loadNotes();
});
</script>

<template>
  <AdminListPage
    title="分级与固定注解"
    :loading="activeLoading"
    :error="activeError"
    @retry="loadNotes"
  >
    <template #headerExtra>
      <n-button v-if="canExport" class="main-action" @click="exportCurrent">导出</n-button>
      <n-button v-if="canImport" class="main-action" @click="openImport">导入</n-button>
      <n-button v-if="canAdd" class="main-action" type="primary" @click="openCreateNote">
        新增注解
      </n-button>
    </template>

    <div class="level-workspace">
      <aside class="level-sidebar" aria-label="分级筛选与管理">
        <div class="level-sidebar-head">
          <span class="level-sidebar-title">分级筛选</span>
          <n-button v-if="canAdd" text size="tiny" type="primary" @click="openCreateLevel">
            新增分级
          </n-button>
        </div>
        <div class="level-filter" :class="{ 'is-active': levelCode === '' }">
          <button type="button" class="level-filter-hit" @click="selectLevel('')">
            <span class="level-filter-name">全部分级</span>
            <b>{{ levelFilterTotal }}</b>
          </button>
        </div>
        <div
          v-for="level in levelOptionRows"
          :key="level.code"
          class="level-filter"
          :class="{ 'is-active': levelCode === level.code }"
        >
          <button type="button" class="level-filter-hit" @click="selectLevel(level.code)">
            <i class="level-dot" :class="`tone-${level.tone || 'default'}`" aria-hidden="true" />
            <span class="level-filter-name">{{ level.code }} {{ level.name }}</span>
            <b>{{ levelFilterCounts[level.code] || 0 }}</b>
          </button>
          <span class="level-filter-actions">
            <n-button
              v-if="canEdit"
              quaternary
              circle
              size="tiny"
              title="编辑分级"
              aria-label="编辑分级"
              @click.stop="openEditLevel(level)"
            >
              <template #icon><n-icon :component="CreateOutline" /></template>
            </n-button>
            <n-button
              v-if="canDelete"
              quaternary
              circle
              size="tiny"
              type="error"
              title="删除分级"
              aria-label="删除分级"
              @click.stop="void removeLevel(level)"
            >
              <template #icon><n-icon :component="TrashOutline" /></template>
            </n-button>
          </span>
        </div>
        <p class="level-sidebar-note">悬停分级显示编辑 / 删除图标。</p>
      </aside>

      <section class="level-main">
        <div class="level-search">
          <n-input
            v-model:value="factorCode"
            class="level-search-input"
            placeholder="要素编码，如 A-01"
            clearable
            @keyup.enter="handleSearch"
          />
          <n-input
            v-model:value="name"
            class="level-search-input"
            placeholder="潜质要素名称"
            clearable
            @keyup.enter="handleSearch"
          />
          <n-input
            v-model:value="keyword"
            class="level-search-input level-search-input--wide"
            placeholder="注解内容 / 注解编号"
            clearable
            @keyup.enter="handleSearch"
          />
          <n-button type="primary" @click="handleSearch">搜索</n-button>
          <n-button @click="handleReset">重置</n-button>
        </div>

        <div v-if="activeEmpty" class="level-empty">
          <AdminEmptyState
            description="暂无固定注解，可通过导入批量补写"
            :action-text="canImport ? '导入固定注解' : undefined"
            @action="openImport"
          />
        </div>

        <template v-else>
          <n-data-table
            :columns="noteColumns"
            :data="notes"
            :loading="notesLoading"
            :bordered="false"
            :scroll-x="880"
            :row-key="(row: TalentFactorNoteRow) => row.id"
          />
          <div class="level-pagination">
            <AdminPagination
              v-model:page="notePage"
              v-model:page-size="notePageSize"
              :total="notesTotal"
              @update:page="loadNotes"
              @update:page-size="loadNotes"
            />
          </div>
        </template>
      </section>
    </div>
  </AdminListPage>

  <FactorNoteForm
    v-model:show="showNoteForm"
    :note-id="editingNoteId"
    :record="editingNote"
    @saved="handleSaved"
  />
  <LevelForm
    v-model:show="showLevelForm"
    :level-id="editingLevelId"
    :record="editingLevel"
    @saved="handleSaved"
  />
  <RuleImportModal
    v-model:show="showImport"
    :kind="importKind"
    @imported="handleImported"
  />
</template>

<style scoped>
.main-action { min-height: 44px; }
.tabs-bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; width: 100%; }
.stats-hint { color: var(--muted-foreground, #6c756a); font-size: 12px; }
.mono { font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace); }

:deep(.muted) { color: var(--muted-foreground, #6c756a); }

/* 分级工作区：左侧分级筛选，右侧检索 + 表格。 */
.level-workspace { display: flex; align-items: flex-start; gap: 16px; width: 100%; min-width: 0; }
.level-sidebar {
  flex: 0 0 216px;
  width: 216px;
  padding: 8px;
  overflow: hidden;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 10px;
}
.level-sidebar-head { display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 4px 8px 6px; }
.level-sidebar-title { color: var(--muted-foreground, #6c756a); font-size: 12px; font-weight: 600; }
.level-filter { display: flex; align-items: center; gap: 4px; width: 100%; min-height: 36px; border-radius: 7px; color: var(--foreground); }
.level-filter:hover { background: var(--muted); }
.level-filter.is-active { background: color-mix(in srgb, var(--primary) 11%, var(--card)); color: var(--foreground); font-weight: 600; }
.level-filter-hit { display: flex; flex: 1; min-width: 0; align-items: center; gap: 8px; min-height: 36px; padding: 7px 10px; border: 0; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.level-filter-actions { display: flex; flex: 0 0 auto; align-items: center; gap: 2px; padding-right: 2px; opacity: 0; transition: opacity .15s ease; }
.level-filter:hover .level-filter-actions, .level-filter:focus-within .level-filter-actions { opacity: 1; }
.level-sidebar-note { margin: 8px 8px 2px; color: var(--muted-foreground, #6c756a); font-size: 11px; line-height: 1.5; }
.level-filter-name { flex: 1; min-width: 0; overflow: hidden; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.level-filter b { flex: 0 0 auto; color: var(--muted-foreground, #6c756a); font-size: 12px; font-variant-numeric: tabular-nums; }
.level-filter.is-active b { color: var(--foreground); }
.level-dot { flex: 0 0 7px; width: 7px; height: 7px; border-radius: 50%; background: var(--muted-foreground, #6c756a); }
.level-dot.tone-info { background: var(--info); }
.level-dot.tone-success { background: var(--primary); }
.level-dot.tone-warning { background: var(--warning); }
.level-main { display: flex; flex: 1; flex-direction: column; gap: 12px; min-width: 0; }
.level-main :deep(.n-data-table) { font-size: 13px; }
.level-main :deep(.n-data-table-th) { font-size: 12.5px; }
.level-search { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.level-search-input { width: 180px; }
.level-search-input--wide { width: 240px; }
.level-pagination { display: flex; justify-content: flex-end; padding-top: 4px; }
.level-empty { padding: 24px 0; }
:deep(.n-data-table-th) { background: var(--muted); color: var(--foreground); font-weight: 600; }
:deep(.n-data-table-td) { padding-top: 10px; padding-bottom: 10px; color: var(--foreground); }
@media (max-width: 900px) {
  .level-workspace { flex-direction: column; }
  .level-sidebar { display: flex; flex: none; width: 100%; gap: 6px; overflow-x: auto; padding: 6px; }
  .level-sidebar-head { display: none; }
  .level-filter { flex: 0 0 auto; width: auto; min-height: 32px; white-space: nowrap; }
  .level-filter-hit { min-height: 32px; }
  .level-sidebar-note { display: none; }
  .level-filter-name { overflow: visible; }
  .level-filter b { margin-left: 2px; }
  .level-search-input, .level-search-input--wide { flex: 1 1 160px; width: auto; }
}
</style>