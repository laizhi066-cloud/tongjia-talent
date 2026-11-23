<!--
 * @description 培养方向管理：7 列列表 + 名称 / 编码检索 + 配置弹层 + 目标档位维护弹层。
 * @file app/pages/admin/talent/rules/direction.vue
-->
<script setup lang="ts">
import { NButton, NDataTable, NInput, NTag, useDialog, type DataTableColumns } from "naive-ui";
import type { TalentDirectionRow } from "~/composables/api/useTalentRuleApi";
import { createActionColumn } from "~/composables/useAdminTable";
import DirectionConfigModal from "./components/DirectionConfigModal.vue";
import DirectionRequestsModal from "./components/DirectionRequestsModal.vue";
import TierManageModal from "./components/TierManageModal.vue";

definePageMeta({ layout: "admin", middleware: ["auth", "permission-guard"] });

const api = useTalentRuleApi();
const directionApi = useTalentDirectionApi();
const dialog = useDialog();
const { hasPermission } = usePermission();
const canAdd = computed(() => hasPermission("talent:direction:add"));
const canEdit = computed(() => hasPermission("talent:direction:edit"));
const canDelete = computed(() => hasPermission("talent:direction:delete"));
const canMerge = computed(() => hasPermission("talent:direction:merge"));
const canViewTiers = computed(() => hasPermission("talent:tier:list") || hasPermission("talent:tier:edit"));

const rows = ref<TalentDirectionRow[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const name = ref("");
const code = ref("");
const loading = ref(false);
const error = ref("");

const showConfig = ref(false);
const editingId = ref("");
const editingRecord = ref<TalentDirectionRow | null>(null);
const showTiers = ref(false);
const showRequests = ref(false);
/** 待归并数量：取列表 total（pageSize=1）；失败时不显示数字，不阻断方向页。 */
const pendingCount = ref(0);

const empty = computed(() => !loading.value && !error.value && !rows.value.length);

const columns = computed<DataTableColumns<TalentDirectionRow>>(() => [
  {
    title: "编码",
    key: "code",
    width: 110,
    render: (row: TalentDirectionRow) => h("span", { class: "mono" }, row.code),
  },
  {
    title: "培养方向",
    key: "name",
    minWidth: 190,
    render: (row: TalentDirectionRow) =>
      h("div", { class: "direction-name" }, [
        h("span", { class: "direction-title" }, row.name),
        row.description
          ? h("span", { class: "direction-desc", title: row.description }, row.description)
          : null,
      ]),
  },
  {
    title: "关联要素与要求分级",
    key: "requirements",
    minWidth: 280,
    render: (row: TalentDirectionRow) => {
      const requirements = Array.isArray(row.requirementNames) ? row.requirementNames : [];
      if (!requirements.length)
        return h(NTag, { size: "small", bordered: false, type: "warning" }, { default: () => "未配置要素" });
      const visible = requirements.slice(0, 3);
      return h("div", { class: "chip-list" }, [
        ...visible.map((item) =>
          h(
            NTag,
            { size: "tiny", bordered: false, type: "info", key: `${item.code}-${item.level}` },
            { default: () => `${item.factorName} · ${item.levelName}` },
          ),
        ),
        requirements.length > visible.length
          ? h("span", { class: "chip-more" }, `等 ${requirements.length} 项`)
          : null,
      ]);
    },
  },
  {
    title: "启用档位",
    key: "tiers",
    minWidth: 160,
    render: (row: TalentDirectionRow) => {
      const tiers = Array.isArray(row.tiers) ? row.tiers : [];
      if (!tiers.length)
        return h(NTag, { size: "small", bordered: false, type: "warning" }, { default: () => "未启用档位" });
      return h("div", { class: "chip-list" }, tiers.map((tier) =>
        h(
          NTag,
          { size: "tiny", bordered: false, key: tier.id, type: tier.status === "1" ? "success" : "default" },
          { default: () => tier.name },
        ),
      ));
    },
  },
  {
    title: "默认档位",
    key: "defaultTierName",
    width: 110,
    render: (row: TalentDirectionRow) =>
      h("span", { class: row.defaultTierName ? "" : "muted" }, row.defaultTierName || "—"),
  },
  {
    title: "状态",
    key: "status",
    width: 90,
    render: (row: TalentDirectionRow) =>
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
  createActionColumn((row: TalentDirectionRow) => [
    { label: "配置", type: "primary" as const, show: () => canEdit.value, onClick: () => openEdit(row) },
    {
      label: row.status === "1" ? "停用" : "启用",
      type: "warning" as const,
      show: () => canEdit.value,
      onClick: () => void toggleStatus(row),
    },
    { label: "删除", type: "error" as const, show: () => canDelete.value, onClick: () => void removeDirection(row) },
  ], { width: 200, maxInline: 3 }),
]);

async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    const result = await api.listDirections({
      page: page.value,
      pageSize: pageSize.value,
      name: name.value || undefined,
      code: code.value || undefined,
    });
    rows.value = result.rows;
    total.value = result.total;
  } catch {
    error.value = "培养方向加载失败，请检查网络或服务状态后重试";
  } finally {
    loading.value = false;
  }
}

function handleSearch(): void {
  page.value = 1;
  void load();
}

async function loadPendingCount(): Promise<void> {
  if (!canMerge.value) {
    pendingCount.value = 0;
    return;
  }
  try {
    pendingCount.value = await directionApi.countPendingRequests();
  } catch {
    pendingCount.value = 0;
  }
}

/** 待归并弹层内归并 / 转正成功：刷新方向列表（转正会新增方向）与待归并计数。 */
function handleRequestsMerged(): void {
  void load();
  void loadPendingCount();
}

function handleReset(): void {
  name.value = "";
  code.value = "";
  page.value = 1;
  void load();
}

function openCreate(): void {
  editingId.value = "";
  editingRecord.value = null;
  showConfig.value = true;
}

function openEdit(row: TalentDirectionRow): void {
  editingId.value = row.id;
  editingRecord.value = row;
  showConfig.value = true;
}

async function toggleStatus(row: TalentDirectionRow): Promise<void> {
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
        title: `停用方向「${row.name}」`,
        content: "停用后该方向不再参与 C 端推荐与展示，已发布报告使用发布时快照不受影响。确认停用？",
        positiveText: "停用",
        negativeText: "取消",
        onPositiveClick: () => settle(true),
        onNegativeClick: () => settle(false),
        onClose: () => settle(false),
      });
    });
    if (!confirmed) return;
  }
  try {
    await api.setDirectionStatus(row.id, nextStatus);
    await load();
  } catch {
    // useApi 已统一提示服务端错误。
  }
}

async function removeDirection(row: TalentDirectionRow): Promise<void> {
  const confirmed = await new Promise<boolean>((resolve) => {
    let settled = false;
    const settle = (value: boolean): void => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    dialog.warning({
      title: `删除方向「${row.name}」`,
      content: "删除后不可恢复；被报告引用的方向只能停用。确认删除？",
      positiveText: "删除",
      negativeText: "取消",
      onPositiveClick: () => settle(true),
      onNegativeClick: () => settle(false),
      onClose: () => settle(false),
    });
  });
  if (!confirmed) return;
  try {
    await api.deleteDirection(row.id);
    if (rows.value.length === 1 && page.value > 1) page.value -= 1;
    await load();
  } catch {
    // useApi 已统一提示服务端 409「该方向已被报告引用，只允许停用」。
  }
}

onMounted(() => {
  void load();
  void loadPendingCount();
});
</script>

<template>
  <AdminListPage
    title="培养方向管理"
    :loading="loading"
    :error="error"
    :empty="empty"
    @retry="load"
  >
    <template #headerExtra>
      <n-button v-if="canMerge" class="main-action" @click="showRequests = true">
        待归并方向<span v-if="pendingCount > 0" class="pending-badge">（{{ pendingCount }}）</span>
      </n-button>
      <n-button v-if="canViewTiers" class="main-action" @click="showTiers = true">档位维护</n-button>
      <n-button v-if="canAdd" class="main-action" type="primary" @click="openCreate">新增方向</n-button>
    </template>
    <template #search>
      <n-input
        v-model:value="name"
        placeholder="方向名称"
        clearable
        @keyup.enter="handleSearch"
      />
      <n-input
        v-model:value="code"
        placeholder="方向编码，如 DIR-001"
        clearable
        @keyup.enter="handleSearch"
      />
    </template>
    <template #searchActions>
      <n-button type="primary" @click="handleSearch">搜索</n-button>
      <n-button @click="handleReset">重置</n-button>
    </template>
    <template #empty>
      <AdminEmptyState
        description="暂无培养方向"
        :action-text="canAdd ? '新增方向' : undefined"
        @action="openCreate"
      />
    </template>

    <n-data-table
      :columns="columns"
      :data="rows"
      :loading="loading"
      :bordered="false"
      :scroll-x="1140"
      :row-key="(row: TalentDirectionRow) => row.id"
    />

    <template #pagination>
      <AdminPagination
        v-model:page="page"
        v-model:page-size="pageSize"
        :total="total"
        @update:page="load"
        @update:page-size="load"
      />
    </template>
  </AdminListPage>

  <DirectionConfigModal
    v-model:show="showConfig"
    :direction-id="editingId"
    :record="editingRecord"
    @saved="load"
  />
  <TierManageModal v-model:show="showTiers" @saved="load" />
  <DirectionRequestsModal v-model:show="showRequests" @merged="handleRequestsMerged" />
</template>

<style scoped>
.main-action { min-height: 44px; }
.pending-badge { color: var(--muted-foreground, #6c756a); font-variant-numeric: tabular-nums; }
.mono { font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace); }
.direction-name { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
:deep(.direction-title) { color: var(--text-color, #333); font-size: 14px; font-weight: 600; }
:deep(.direction-desc) {
  overflow: hidden;
  color: var(--muted-foreground, #6c756a);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
:deep(.chip-list) { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
:deep(.chip-more) { color: var(--muted-foreground, #6c756a); font-size: 12px; }
:deep(.muted) { color: var(--muted-foreground, #6c756a); }
</style>