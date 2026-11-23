<!--
 * @description 会员详情弹层（ultra）：顶部信息条 + 三页签（名下子女 / 关联报告 / 账号资料）。
 *   子女页签支持就地编辑、重新查询（自动轮询回执）、解绑二次确认；证件全号仅权限按钮 + 单项接口。
 * @file app/pages/admin/talent/member/components/MemberDetailModal.vue
-->
<script setup lang="ts">
import {
  NAlert,
  NButton,
  NDataTable,
  NDescriptions,
  NDescriptionsItem,
  NEmpty,
  NInput,
  NModal,
  NSpin,
  NTab,
  NTabs,
  NTag,
  useDialog,
  useMessage,
  type DataTableColumns,
} from "naive-ui";
import type {
  TalentMemberChildDetail,
  TalentMemberDetail,
} from "~/composables/api/useTalentMemberApi";
import type {
  TalentMemberChildView,
  TalentMemberParentView,
} from "~~/shared/types/talent-member";
import MemberChildEditPanel from "./MemberChildEditPanel.vue";

interface Props {
  show: boolean;
  memberId: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  "update:show": [value: boolean];
  changed: [];
  edit: [parent: TalentMemberParentView];
}>();

const api = useTalentMemberApi();
const dialog = useDialog();
const message = useMessage();
const { hasPermission } = usePermission();

const canEdit = computed(() => hasPermission("talent:parent:edit"));
const canChangeStatus = computed(() => hasPermission("talent:parent:status"));
const canViewIdNo = computed(() => hasPermission("talent:parent:idno"));
const canEditChild = computed(() => hasPermission("talent:child:edit"));
const canUnbindChild = computed(() => hasPermission("talent:child:unbind"));
const canQueryChild = computed(() => hasPermission("talent:child:query"));

type DetailTab = "children" | "reports" | "account";

const tab = ref<DetailTab>("children");
const loading = ref(false);
const error = ref("");
const detail = ref<TalentMemberDetail | null>(null);
const editingChild = ref<TalentMemberChildDetail | null>(null);
const addingChild = ref(false);
const highlightChildId = ref("");
const togglingStatus = ref(false);
const unbindingId = ref("");
const queryingId = ref("");
const cooldownUntil = ref<Record<string, number>>({});
const tick = ref(Date.now());
const pollTimedOut = ref(false);

const idNoShow = ref(false);
const idNoLoading = ref(false);
const idNoTitle = ref("");
const idNoValue = ref("");

let tickTimer: ReturnType<typeof setInterval> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let pollStartedAt = 0;
let highlightTimer: ReturnType<typeof setTimeout> | null = null;

const parent = computed(() => detail.value?.parent || null);
const children = computed<TalentMemberChildDetail[]>(() => detail.value?.children || []);
const account = computed(() => detail.value?.account || { bound: false });
const parentActive = computed(() => parent.value?.status === "1");
const queryingCount = computed(
  () => children.value.filter((child) => child.query === "querying").length,
);
const emptyChildren = computed(
  () => !loading.value && !error.value && children.value.length === 0,
);

function parentStatusTagType(): "success" | "default" {
  return parentActive.value ? "success" : "default";
}

function queryTagType(query: string): "default" | "info" | "success" | "error" {
  if (query === "found") return "success";
  if (query === "querying") return "info";
  if (query === "not_found") return "error";
  return "default";
}

function queryTagNode(child: TalentMemberChildDetail) {
  const type = queryTagType(child.query);
  return h(
    NTag,
    { size: "small", bordered: false, type },
    {
      default: () =>
        child.query === "querying"
          ? [h(NSpin, { size: 14, style: "margin-right:4px;vertical-align:-2px" }), "查询中"]
          : child.queryLabel,
    },
  );
}

function cooldownLeft(childId: string): number {
  const until = cooldownUntil.value[childId];
  if (!until) return 0;
  const left = Math.ceil((until - tick.value) / 1000);
  return left > 0 ? left : 0;
}

function queryDisabled(child: TalentMemberChildDetail): boolean {
  return child.query === "querying" || cooldownLeft(child.id) > 0;
}

function queryButtonLabel(child: TalentMemberChildDetail): string {
  const left = cooldownLeft(child.id);
  if (left > 0) return `重新查询 ${left}s`;
  if (child.query === "querying") return "查询中";
  return "重新查询";
}

function canRequery(child: TalentMemberChildDetail): boolean {
  // 未查询 / 未查到可重查；已查到由服务端 422 拒绝；查询中仅展示禁用态。
  return canQueryChild.value && parentActive.value && child.query !== "found";
}

function childActionColumn(): DataTableColumns<TalentMemberChildDetail>[number] {
  return {
    title: "操作",
    key: "actions",
    width: 240,
    fixed: "right",
    render: (row: TalentMemberChildDetail) => {
      const nodes: unknown[] = [];
      if (canEditChild.value)
        nodes.push(
          h(
            NButton,
            { size: "tiny", quaternary: true, onClick: () => openChildEditor(row) },
            { default: () => "编辑" },
          ),
        );
      if (canRequery(row))
        nodes.push(
          h(
            NButton,
            {
              size: "tiny",
              quaternary: true,
              type: "primary",
              disabled: queryDisabled(row),
              loading: queryingId.value === row.id,
              onClick: () => void requestQuery(row),
            },
            { default: () => queryButtonLabel(row) },
          ),
        );
      if (canUnbindChild.value)
        nodes.push(
          h(
            NButton,
            {
              size: "tiny",
              quaternary: true,
              type: "error",
              loading: unbindingId.value === row.id,
              onClick: () => void confirmUnbind(row),
            },
            { default: () => "解绑" },
          ),
        );
      if (!nodes.length) return h("span", { class: "muted" }, "—");
      return h("div", { class: "row-actions" }, nodes as never[]);
    },
  };
}

const childColumns = computed<DataTableColumns<TalentMemberChildDetail>>(() => [
  {
    title: "子女",
    key: "name",
    width: 130,
    render: (row: TalentMemberChildDetail) =>
      h("div", { class: "cell-stack" }, [
        h("span", { class: "cell-main" }, row.name),
        h("span", { class: "cell-sub" }, `${row.genderLabel} · ${row.birthday}`),
      ]),
  },
  {
    title: "与家长关系",
    key: "relationLabel",
    width: 110,
  },
  {
    title: "身份证",
    key: "maskedIdNo",
    minWidth: 210,
    render: (row: TalentMemberChildDetail) => {
      const nodes: unknown[] = [
        h("span", { class: "mono" }, row.maskedIdNo || "—"),
      ];
      if (canViewIdNo.value)
        nodes.push(
          h(
            NButton,
            {
              size: "tiny",
              quaternary: true,
              type: "primary",
              onClick: () => void openChildIdNo(row),
            },
            { default: () => "查看" },
          ),
        );
      return h("div", { class: "cell-idno" }, nodes as never[]);
    },
  },
  {
    title: "查询状态",
    key: "query",
    width: 170,
    render: (row: TalentMemberChildDetail) =>
      h("div", { class: "cell-stack" }, [
        queryTagNode(row),
        row.queryReason
          ? h(
              "span",
              {
                class:
                  row.queryReason === "no_result"
                    ? "cell-sub cell-sub--warning"
                    : "cell-sub",
              },
              row.queryReasonLabel || row.queryReason,
            )
          : null,
      ]),
  },
  {
    title: "关联报告",
    key: "reportCount",
    width: 100,
    render: (row: TalentMemberChildDetail) => `${Number(row.reportCount || 0)} 份`,
  },
  childActionColumn(),
]);

const statusAccountLine = computed(() => {
  if (account.value.bound)
    return account.value.account
      ? `${account.value.account}${account.value.displayName ? `（${account.value.displayName}）` : ""}`
      : "已绑定登录账号";
  return "未绑定登录账号（家长使用本人已验证手机号登录后可自动绑定）";
});

/** 详情轮询：存在查询中子女时每 2s 刷新，最多 60s；关闭弹层立即停止。 */
function stopPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function ensurePolling(): void {
  const hasQuerying = queryingCount.value > 0;
  if (!props.show || !hasQuerying) {
    stopPolling();
    if (!hasQuerying) pollTimedOut.value = false;
    return;
  }
  if (pollTimer) return;
  pollTimedOut.value = false;
  pollStartedAt = Date.now();
  pollTimer = setInterval(() => {
    if (Date.now() - pollStartedAt > 60_000) {
      stopPolling();
      pollTimedOut.value = true;
      return;
    }
    void loadDetail(true);
  }, 2000);
}

async function loadDetail(silent = false): Promise<void> {
  if (!props.memberId) return;
  if (!silent) {
    loading.value = true;
    error.value = "";
  }
  try {
    detail.value = await api.getMember(props.memberId);
    ensurePolling();
  } catch {
    if (!silent) error.value = "会员详情加载失败，请检查网络或服务状态后重试";
  } finally {
    if (!silent) loading.value = false;
  }
}

function reload(): void {
  void loadDetail(true);
}

defineExpose({ reload });

function clearHighlightTimer(): void {
  if (highlightTimer) {
    clearTimeout(highlightTimer);
    highlightTimer = null;
  }
}

function highlightChild(childId: string): void {
  clearHighlightTimer();
  highlightChildId.value = childId;
  highlightTimer = setTimeout(() => {
    highlightChildId.value = "";
    highlightTimer = null;
  }, 2400);
}

function openChildEditor(row: TalentMemberChildDetail): void {
  addingChild.value = false;
  editingChild.value = row;
}

function openChildCreator(): void {
  editingChild.value = null;
  addingChild.value = true;
}

function closeChildEditor(): void {
  editingChild.value = null;
  addingChild.value = false;
}

async function handleChildSaved(child: TalentMemberChildView): Promise<void> {
  closeChildEditor();
  highlightChild(child.id);
  emit("changed");
  await loadDetail(true);
}

async function requestQuery(row: TalentMemberChildDetail): Promise<void> {
  if (queryingId.value) return;
  queryingId.value = row.id;
  try {
    const result = await api.queryMemberChild(row.id);
    cooldownUntil.value = {
      ...cooldownUntil.value,
      [row.id]: Date.now() + 30_000,
    };
    highlightChild(row.id);
    await loadDetail(true);
    if (!result.accepted && !result.throttled)
      message.info("查询未发起，请稍后重试");
  } catch {
    // useApi 已统一提示服务端错误（found 重查 422 / 家长停用 409）。
  } finally {
    queryingId.value = "";
  }
}

async function confirmUnbind(row: TalentMemberChildDetail): Promise<void> {
  const confirmed = await new Promise<boolean>((resolve) => {
    let settled = false;
    const settle = (value: boolean): void => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    dialog.warning({
      title: `解绑子女「${row.name}」`,
      content: () =>
        h("div", { class: "unbind-confirm" }, [
          h("p", null, "解绑后家长端立即不可见该子女；"),
          h("p", null, "历史报告保留在后台，可按操作日志追溯；"),
          h("p", null, "子女档案保留，重新新增同一证件号可复用档案。"),
        ]),
      positiveText: "确认解绑",
      negativeText: "取消",
      onPositiveClick: () => settle(true),
      onNegativeClick: () => settle(false),
      onClose: () => settle(false),
    });
  });
  if (!confirmed) return;
  unbindingId.value = row.id;
  try {
    await api.unbindMemberChild(row.id);
    if (editingChild.value?.id === row.id) closeChildEditor();
    emit("changed");
    await loadDetail(true);
  } catch {
    // useApi 已统一提示服务端错误。
  } finally {
    unbindingId.value = "";
  }
}

async function handleStatusToggle(): Promise<void> {
  const current = parent.value;
  if (!current || togglingStatus.value) return;
  if (current.status === "1") {
    const confirmed = await new Promise<boolean>((resolve) => {
      let settled = false;
      const settle = (value: boolean): void => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      dialog.warning({
        title: `停用会员「${current.name}」`,
        content: "停用后家长端立即不可见本人与名下子女；历史数据与报告保留，可随时启用。确认停用？",
        positiveText: "停用",
        negativeText: "取消",
        onPositiveClick: () => settle(true),
        onNegativeClick: () => settle(false),
        onClose: () => settle(false),
      });
    });
    if (!confirmed) return;
  }
  togglingStatus.value = true;
  try {
    await api.setMemberStatus(current.id, current.status === "1" ? "0" : "1");
    emit("changed");
    await loadDetail(true);
  } catch {
    // useApi 已统一提示服务端错误。
  } finally {
    togglingStatus.value = false;
  }
}

function errorStatus(errorValue: unknown): number {
  const record = errorValue as {
    statusCode?: number;
    status?: number;
    response?: { status?: number };
  };
  return Number(
    record?.statusCode ?? record?.status ?? record?.response?.status ?? 0,
  );
}

async function openParentIdNo(): Promise<void> {
  const current = parent.value;
  if (!current || current.idNoMissing) return;
  idNoTitle.value = `家长身份证全号 · ${current.name}`;
  idNoValue.value = "";
  idNoShow.value = true;
  idNoLoading.value = true;
  try {
    const result = await api.getMemberIdNo(current.id);
    idNoValue.value = result.idNo;
  } catch (errorValue) {
    idNoShow.value = false;
    message.error(
      errorStatus(errorValue) === 403
        ? "无查看证件全号的权限"
        : "证件全号读取失败，请稍后重试",
    );
  } finally {
    idNoLoading.value = false;
  }
}

async function openChildIdNo(row: TalentMemberChildDetail): Promise<void> {
  idNoTitle.value = `子女身份证全号 · ${row.name}`;
  idNoValue.value = "";
  idNoShow.value = true;
  idNoLoading.value = true;
  try {
    const result = await api.getMemberChildIdNo(row.id);
    idNoValue.value = result.idNo;
  } catch (errorValue) {
    idNoShow.value = false;
    message.error(
      errorStatus(errorValue) === 403
        ? "无查看证件全号的权限"
        : "证件全号读取失败，请稍后重试",
    );
  } finally {
    idNoLoading.value = false;
  }
}

function rowProps(row: TalentMemberChildDetail): Record<string, unknown> {
  return row.id === highlightChildId.value ? { class: "row-highlight" } : {};
}

function handleTabChange(value: string): void {
  tab.value = value === "reports" || value === "account" ? value : "children";
}

watch(
  () => [props.show, props.memberId],
  ([show]) => {
    if (show) {
      tab.value = "children";
      editingChild.value = null;
      addingChild.value = false;
      highlightChildId.value = "";
      pollTimedOut.value = false;
      idNoShow.value = false;
      idNoValue.value = "";
      cooldownUntil.value = {};
      void loadDetail();
      if (!tickTimer)
        tickTimer = setInterval(() => {
          tick.value = Date.now();
        }, 1000);
    } else {
      stopPolling();
      if (tickTimer) {
        clearInterval(tickTimer);
        tickTimer = null;
      }
      clearHighlightTimer();
      idNoShow.value = false;
      idNoValue.value = "";
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  stopPolling();
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
  clearHighlightTimer();
});
</script>

<template>
  <n-modal
    :show="props.show"
    preset="card"
    title="会员详情"
    style="width: min(1180px, calc(100vw - 32px))"
    @update:show="emit('update:show', $event)"
  >
    <n-spin :show="loading">
      <n-alert v-if="error" type="error" :show-icon="false" class="detail-error">
        {{ error }}
        <n-button size="tiny" quaternary type="primary" @click="loadDetail()">重试</n-button>
      </n-alert>

      <template v-if="detail && parent">
        <div class="detail-head">
          <div class="detail-ident">
            <span class="mono detail-no">{{ parent.parentNo }}</span>
            <b class="detail-name">{{ parent.name }}</b>
            <n-tag size="small" :bordered="false" :type="parentStatusTagType()">
              {{ parent.statusLabel }}
            </n-tag>
          </div>
          <div class="detail-facts">
            <span class="fact"><i>手机号</i>{{ parent.maskedMobile }}</span>
            <span class="fact">
              <i>家长身份证</i>{{ parent.maskedIdNo || "—" }}
              <n-button
                v-if="canViewIdNo && !parent.idNoMissing"
                size="tiny"
                quaternary
                type="primary"
                @click="openParentIdNo"
              >
                查看
              </n-button>
            </span>
            <span class="fact"><i>名下子女</i>{{ detail.counts.children }} 名</span>
            <span class="fact"><i>关联报告</i>{{ detail.counts.reports }} 份</span>
          </div>
          <div class="detail-actions">
            <n-button v-if="canEdit" class="main-action" @click="emit('edit', parent)">
              编辑会员
            </n-button>
            <n-button
              v-if="canChangeStatus"
              class="main-action"
              :type="parentActive ? 'warning' : 'primary'"
              :loading="togglingStatus"
              @click="handleStatusToggle"
            >
              {{ parentActive ? "停用会员" : "启用会员" }}
            </n-button>
          </div>
        </div>

        <n-tabs :value="tab" type="line" @update:value="handleTabChange">
          <n-tab name="children" :tab="`名下子女（${detail.counts.children}）`" />
          <n-tab name="reports" :tab="`关联报告（${detail.counts.reports}）`" />
          <n-tab name="account" tab="账号资料" />
        </n-tabs>

        <div v-if="tab === 'children'" class="tab-panel">
          <div class="tab-toolbar">
            <div class="tab-notes">
              <span v-if="!parentActive" class="tab-note tab-note--warning">
                会员已停用：子女查询已暂停，启用后可继续。
              </span>
              <span v-else class="tab-note">
                查询结果由外部系统异步返回；「查询中」会自动刷新，最多等待 60 秒。
              </span>
            </div>
            <div class="tab-actions">
              <n-button size="small" @click="loadDetail(true)">刷新</n-button>
              <n-button
                v-if="canEditChild && parentActive"
                size="small"
                type="primary"
                @click="openChildCreator"
              >
                新增子女
              </n-button>
            </div>
          </div>

          <n-alert v-if="queryingCount > 0" type="info" :show-icon="false" class="query-hint">
            正在等待 {{ queryingCount }} 名子女的查询结果…
          </n-alert>
          <n-alert v-else-if="pollTimedOut" type="warning" :show-icon="false" class="query-hint">
            查询结果尚未返回，可稍后手动刷新。
            <n-button size="tiny" quaternary type="primary" @click="loadDetail(true)">刷新</n-button>
          </n-alert>

          <MemberChildEditPanel
            v-if="editingChild || addingChild"
            :parent-id="props.memberId"
            :child="editingChild"
            @saved="handleChildSaved"
            @cancel="closeChildEditor"
          />

          <n-empty
            v-if="emptyChildren"
            class="children-empty"
            description="尚未绑定子女，新增子女后自动发起查询"
          >
            <template v-if="canEditChild && parentActive" #extra>
              <n-button type="primary" @click="openChildCreator">新增子女</n-button>
            </template>
          </n-empty>
          <n-data-table
            v-else
            :columns="childColumns"
            :data="children"
            :bordered="false"
            :row-props="rowProps"
            :row-key="(row: TalentMemberChildDetail) => row.id"
            :scroll-x="900"
            size="small"
          />
        </div>

        <div v-else-if="tab === 'reports'" class="tab-panel">
          <n-empty
            class="reports-empty"
            description="暂无关联报告（报告域接入后显示）"
          />
        </div>

        <div v-else class="tab-panel">
          <n-descriptions bordered :column="2" label-placement="left" size="small">
            <n-descriptions-item label="会员编号">
              <span class="mono">{{ parent.parentNo }}</span>
            </n-descriptions-item>
            <n-descriptions-item label="姓名">{{ parent.name }}</n-descriptions-item>
            <n-descriptions-item label="手机号（脱敏）">{{ parent.maskedMobile }}</n-descriptions-item>
            <n-descriptions-item label="身份证（脱敏）">
              {{ parent.maskedIdNo || "未填写" }}
            </n-descriptions-item>
            <n-descriptions-item label="状态">{{ parent.statusLabel }}</n-descriptions-item>
            <n-descriptions-item label="来源">{{ parent.sourceLabel }}</n-descriptions-item>
            <n-descriptions-item label="注册时间">
              {{ formatTime(parent.registeredAt) || "—" }}
            </n-descriptions-item>
            <n-descriptions-item label="子女数">{{ detail.counts.children }} 名</n-descriptions-item>
            <n-descriptions-item label="报告数">{{ detail.counts.reports }} 份</n-descriptions-item>
            <n-descriptions-item label="性别">{{ parent.genderLabel || "未填写" }}</n-descriptions-item>
            <n-descriptions-item label="出生日期">{{ parent.birthday || "未填写" }}</n-descriptions-item>
            <n-descriptions-item label="备注" :span="2">
              {{ parent.remark || "—" }}
            </n-descriptions-item>
          </n-descriptions>
          <div class="account-line">
            <span class="account-label">登录账号</span>
            <span :class="account.bound ? 'account-value' : 'account-value account-value--muted'">
              {{ statusAccountLine }}
            </span>
          </div>
        </div>
      </template>
    </n-spin>

    <template #footer>
      <div class="detail-footer">
        <n-button @click="emit('update:show', false)">关闭</n-button>
      </div>
    </template>

    <n-modal
      v-model:show="idNoShow"
      preset="card"
      :title="idNoTitle"
      style="width: min(480px, calc(100vw - 32px))"
      :bordered="false"
    >
      <n-spin :show="idNoLoading">
        <n-input
          :value="idNoValue"
          readonly
          class="idno-input"
          placeholder="读取中…"
        />
        <p class="idno-hint">本次查看已写入操作日志；请勿截屏外传。</p>
      </n-spin>
      <template #footer>
        <div class="detail-footer">
          <n-button @click="idNoShow = false">关闭</n-button>
        </div>
      </template>
    </n-modal>
  </n-modal>
</template>

<style scoped>
.detail-error { margin-bottom: 12px; line-height: 1.7; }
.detail-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px 20px;
  padding-bottom: 12px;
  margin-bottom: 4px;
  border-bottom: 1px solid var(--border);
}
.detail-ident { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; }
.detail-no { color: var(--muted-foreground, #6c756a); font-size: 12px; }
.detail-name { color: var(--foreground); font-size: 18px; font-weight: 600; }
.detail-facts { display: flex; flex-wrap: wrap; gap: 6px 18px; min-width: 0; }
.fact { display: inline-flex; align-items: center; gap: 6px; color: var(--foreground); font-size: 13px; }
.fact i { color: var(--muted-foreground, #6c756a); font-size: 12px; font-style: normal; }
.fact :deep(.n-button) { min-height: 24px; }
.detail-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-left: auto; }
.main-action { min-height: 44px; }
.tab-panel { padding-top: 12px; }
.tab-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  margin-bottom: 10px;
}
.tab-notes { min-width: 0; }
.tab-note { color: var(--muted-foreground, #6c756a); font-size: 12px; line-height: 1.6; }
.tab-note--warning { color: var(--warning-color, #d03050); }
.tab-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.query-hint { margin-bottom: 10px; line-height: 1.7; }
.children-empty, .reports-empty { padding: 34px 0; }
.account-line {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin-top: 14px;
  padding: 10px 14px;
  background: var(--muted);
  border: 1px solid var(--border);
  border-radius: 8px;
  line-height: 1.7;
}
.account-label { color: var(--muted-foreground, #6c756a); font-size: 12px; }
.account-value { color: var(--foreground); font-size: 13px; }
.account-value--muted { color: var(--muted-foreground, #6c756a); }
.detail-footer { display: flex; justify-content: flex-end; gap: 12px; }
.detail-footer :deep(.n-button) { min-height: 44px; }
.idno-input { margin-top: 4px; }
.idno-input :deep(input) { font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace); letter-spacing: 0.04em; }
.idno-hint { margin: 10px 0 0; color: var(--muted-foreground, #6c756a); font-size: 12px; line-height: 1.6; }
.row-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 2px; }
.cell-stack { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.cell-main { color: var(--foreground); font-weight: 500; line-height: 1.4; }
.cell-sub { color: var(--muted-foreground, #6c756a); font-size: 12px; line-height: 1.4; }
.cell-sub--warning { color: var(--warning-color, #d03050); }
.cell-idno { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; min-width: 0; }
.mono { font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace); }
.muted { color: var(--muted-foreground, #6c756a); }
:deep(.muted) { color: var(--muted-foreground, #6c756a); }
:deep(.row-highlight .n-data-table-td) { background: var(--muted); }
:deep(.n-data-table-th) { background: var(--muted); color: var(--foreground); font-weight: 600; }
:deep(.n-data-table-td) { padding-top: 10px; padding-bottom: 10px; color: var(--foreground); }
:deep(.unbind-confirm p) { margin: 0; line-height: 1.8; }
</style>