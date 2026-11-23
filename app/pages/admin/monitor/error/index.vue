/**
 * @description 错误监控页 — 采集 B 端接口(5xx) / C 端运行时 / C 端控制台 错误，按指纹聚合展示。
 *              支持来源/级别/状态/关键词筛选、查看现场(栈/上下文)、标记已解决/忽略、删除/清理、配置排噪关键字。
 * @file app/pages/admin/monitor/error/index.vue
 */
<script setup lang="ts">
import { h } from 'vue'
import { NButton, NCard, NDataTable, NDrawer, NDrawerContent, NInput, NModal, NSelect, NSwitch, NTag, useDialog, useMessage } from 'naive-ui'
import { createActionColumn, createTimeColumn } from '~/composables/useAdminTable'

definePageMeta({ layout: 'admin', middleware: ['auth', 'permission-guard', 'super-guard'] })
const { withEllipsis } = useTableEllipsis()
const dialog = useDialog()
const message = useMessage()
const api = useErrorLogApi()
const { hasPermission } = usePermission()

const data = ref({ rows: [] as Record<string, any>[], total: 0, page: 1, pageSize: 10 })
const loading = ref(false)
const loadError = ref('')
const stats = ref<ErrorLogStats>({ total: 0, unresolved: 0, resolved: 0, today: 0 })

const searchKeyword = ref('')
const searchSource = ref<string | null>(null)
const searchLevel = ref<string | null>(null)
const searchStatus = ref<string | null>(null)
const canUpdateError = computed(() => hasPermission('monitor:error:edit'))
const canRemoveError = computed(() => hasPermission('monitor:error:remove'))

const sourceOptions = [
  { label: '接口(5xx)', value: 'api' },
  { label: 'C端运行时', value: 'client' },
  { label: 'C端控制台', value: 'console' },
]
const levelOptions = [
  { label: '错误', value: 'error' },
  { label: '警告', value: 'warn' },
]
const statusOptions = [
  { label: '未处理', value: 'new' },
  { label: '已解决', value: 'resolved' },
  { label: '已忽略', value: 'ignored' },
]
const sourceMeta: Record<string, { label: string, type: 'error' | 'warning' | 'info' }> = {
  api: { label: '接口', type: 'error' },
  client: { label: '运行时', type: 'warning' },
  console: { label: '控制台', type: 'info' },
}
const statusMeta: Record<string, { label: string, type: 'warning' | 'success' | 'default' }> = {
  new: { label: '未处理', type: 'warning' },
  resolved: { label: '已解决', type: 'success' },
  ignored: { label: '已忽略', type: 'default' },
}

async function fetchData() {
  loading.value = true
  loadError.value = ''
  try {
    data.value = await api.fetchErrors({
      page: data.value.page,
      pageSize: data.value.pageSize,
      source: searchSource.value || undefined,
      level: searchLevel.value || undefined,
      status: searchStatus.value || undefined,
      keyword: searchKeyword.value || undefined,
    })
  } catch {
    loadError.value = '错误记录暂时无法加载，请检查服务状态后重试。'
  } finally {
    loading.value = false
  }
}

async function fetchStats() {
  try {
    stats.value = await api.fetchStats()
  } catch { /* ignore */ }
}

function refresh() {
  fetchData()
  fetchStats()
}

function handleSearch() { data.value.page = 1; refresh() }
function handleReset() {
  searchKeyword.value = ''
  searchSource.value = null
  searchLevel.value = null
  searchStatus.value = null
  data.value.page = 1
  refresh()
}
function handlePageSizeChange() { data.value.page = 1; fetchData() }

// ── 详情抽屉 ──
const drawerShow = ref(false)
const current = ref<Record<string, any>>({})
function openDetail(row: Record<string, any>) {
  current.value = row
  drawerShow.value = true
}

async function setStatus(row: Record<string, any>, status: 'new' | 'resolved' | 'ignored') {
  await api.updateStatus(row.id, status)
  message.success('操作成功')
  refresh()
}
function removeOne(row: Record<string, any>) {
  dialog.warning({
    title: '删除确认',
    content: '确定删除该错误记录？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => { await api.removeError(row.id); message.success('删除成功'); refresh() },
  })
}
function clearResolved() {
  dialog.warning({
    title: '清理已解决',
    content: '将删除所有「已解决」的错误记录，确定？',
    positiveText: '清理',
    negativeText: '取消',
    onPositiveClick: async () => { await api.clearErrors('resolved'); message.success('清理成功'); refresh() },
  })
}

const columns = computed(() => [
  {
    title: '来源',
    key: 'source',
    width: 90,
    render: (row: Record<string, any>) => {
      const m = sourceMeta[row.source] || { label: row.source, type: 'default' as const }
      return h(NTag, { type: m.type, size: 'small', bordered: false }, () => m.label)
    },
  },
  {
    title: '级别',
    key: 'level',
    width: 70,
    render: (row: Record<string, any>) =>
      h(NTag, { type: row.level === 'warn' ? 'warning' : 'error', size: 'small', bordered: false }, () => row.level === 'warn' ? '警告' : '错误'),
  },
  { title: '错误信息', key: 'message', ellipsis: { tooltip: true } },
  { title: '位置', key: 'url', width: 200, ellipsis: { tooltip: true } },
  {
    title: '次数',
    key: 'count',
    width: 70,
    render: (row: Record<string, any>) => h('span', { style: row.count > 1 ? 'color:var(--destructive);font-weight:600' : '' }, String(row.count || 1)),
  },
  { title: '平台', key: 'platform', width: 90 },
  {
    title: '状态',
    key: 'status',
    width: 80,
    render: (row: Record<string, any>) => {
      const m = statusMeta[row.status] || { label: row.status, type: 'default' as const }
      return h(NTag, { type: m.type, size: 'small', bordered: false }, () => m.label)
    },
  },
  createTimeColumn('lastSeen', '最近出现'),
  createActionColumn((row: Record<string, any>) => [
    { label: '查看', type: 'primary' as const, onClick: () => openDetail(row) },
    { label: '已解决', type: 'info' as const, show: () => canUpdateError.value && row.status !== 'resolved', onClick: () => setStatus(row, 'resolved') },
    { label: '忽略', show: () => canUpdateError.value && row.status !== 'ignored', onClick: () => setStatus(row, 'ignored') },
    { label: '重新打开', show: () => canUpdateError.value && row.status !== 'new', onClick: () => setStatus(row, 'new') },
    { label: '删除', type: 'error' as const, show: () => canRemoveError.value, onClick: () => removeOne(row) },
  ], { width: 170, maxInline: 2 }),
])

// ── 排噪配置 ──
const configShow = ref(false)
const cfgEnabled = ref(true)
const cfgKeywords = ref('')
const cfgSaving = ref(false)

async function openConfig() {
  configShow.value = true
  try {
    const config = await api.fetchErrorMonitorConfig()
    cfgEnabled.value = config.enabled
    cfgKeywords.value = config.ignoreKeywords.join('\n')
  } catch {
    cfgEnabled.value = true
    cfgKeywords.value = ''
  }
}

async function saveConfig() {
  cfgSaving.value = true
  try {
    const ignoreKeywords = cfgKeywords.value.split('\n').map(s => s.trim()).filter(Boolean)
    await api.updateErrorMonitorConfig({ enabled: cfgEnabled.value, ignoreKeywords })
    message.success('配置已保存并立即生效')
    configShow.value = false
  } catch { /* 拦截器已提示 */ } finally {
    cfgSaving.value = false
  }
}

onMounted(refresh)
</script>

<template>
  <AdminListPage title="错误监控" :loading="loading" :error="loadError" :empty="!loading && !loadError && data.rows.length === 0" @retry="refresh">
    <template #headerExtra>
      <div class="flex items-center gap-2">
        <NButton v-if="canUpdateError" size="small" @click="openConfig">
          排噪配置
        </NButton>
        <NButton v-if="canRemoveError" size="small" @click="clearResolved">
          清理已解决
        </NButton>
        <NButton size="small" type="primary" @click="refresh">
          刷新
        </NButton>
      </div>
    </template>

    <template #search>
      <NInput v-model:value="searchKeyword" placeholder="搜索错误信息 / 位置" class="w-56" clearable @keyup.enter="handleSearch" />
      <NSelect v-model:value="searchSource" :options="sourceOptions" placeholder="来源" class="w-32" clearable />
      <NSelect v-model:value="searchLevel" :options="levelOptions" placeholder="级别" class="w-28" clearable />
      <NSelect v-model:value="searchStatus" :options="statusOptions" placeholder="状态" class="w-28" clearable />
    </template>
    <template #searchActions>
      <AdminSearchActions @search="handleSearch" @reset="handleReset" />
    </template>

    <!-- 概览卡 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
      <NCard size="small" :bordered="true">
        <div class="text-xs text-muted-foreground">未处理</div>
        <div class="text-2xl font-bold text-primary">
          {{ stats.unresolved }}
        </div>
      </NCard>
      <NCard size="small" :bordered="true">
        <div class="text-xs text-muted-foreground">今日出现</div>
        <div class="text-2xl font-bold">
          {{ stats.today }}
        </div>
      </NCard>
      <NCard size="small" :bordered="true">
        <div class="text-xs text-muted-foreground">已解决</div>
        <div class="text-2xl font-bold text-primary">
          {{ stats.resolved }}
        </div>
      </NCard>
      <NCard size="small" :bordered="true">
        <div class="text-xs text-muted-foreground">累计记录</div>
        <div class="text-2xl font-bold">
          {{ stats.total }}
        </div>
      </NCard>
    </div>

    <NDataTable
      flex-height
      :columns="withEllipsis(columns)"
      :data="data.rows"
      :loading="loading"
      :bordered="false"
      :single-line="false"
      :scroll-x="1100"
      :row-key="(row: any) => row.id"
    />
    <template #pagination>
      <AdminPagination v-model:page="data.page" v-model:page-size="data.pageSize" :total="data.total" @update:page="fetchData()" @update:page-size="handlePageSizeChange" />
    </template>
  </AdminListPage>

  <!-- 详情抽屉 -->
  <NDrawer v-model:show="drawerShow" width="min(640px, calc(100vw - 24px))" placement="right">
    <NDrawerContent title="错误详情" closable>
      <div class="space-y-4 text-sm">
        <div>
          <div class="text-xs text-muted-foreground mb-1">错误信息</div>
          <div class="break-all font-medium">
            {{ current.message }}
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div><span class="text-xs text-muted-foreground">来源</span><div>{{ sourceMeta[current.source]?.label || current.source }}</div></div>
          <div><span class="text-xs text-muted-foreground">级别</span><div>{{ current.level === 'warn' ? '警告' : '错误' }}</div></div>
          <div><span class="text-xs text-muted-foreground">次数</span><div>{{ current.count || 1 }}</div></div>
          <div><span class="text-xs text-muted-foreground">状态</span><div>{{ statusMeta[current.status]?.label || current.status }}</div></div>
          <div><span class="text-xs text-muted-foreground">平台</span><div>{{ current.platform || '-' }}</div></div>
          <div><span class="text-xs text-muted-foreground">HTTP状态</span><div>{{ current.statusCode || '-' }}</div></div>
        </div>
        <div>
          <div class="text-xs text-muted-foreground mb-1">位置</div>
          <div class="break-all">
            {{ current.method ? `${current.method} ` : '' }}{{ current.url || '-' }}
          </div>
        </div>
        <div v-if="current.userId">
          <div class="text-xs text-muted-foreground mb-1">用户</div>
          <div class="break-all">
            {{ current.userId }}
          </div>
        </div>
        <div v-if="current.ua">
          <div class="text-xs text-muted-foreground mb-1">设备 / UA</div>
          <div class="break-all text-xs text-muted-foreground">
            {{ current.ua }}
          </div>
        </div>
        <div v-if="current.stack">
          <div class="text-xs text-muted-foreground mb-1">调用栈 / 详情</div>
          <pre class="detail-code">{{ current.stack }}</pre>
        </div>
        <div v-if="current.meta && Object.keys(current.meta).length">
          <div class="text-xs text-muted-foreground mb-1">上下文</div>
          <pre class="detail-code detail-code--compact">{{ JSON.stringify(current.meta, null, 2) }}</pre>
        </div>
      </div>
      <template #footer>
        <div class="flex gap-2">
          <NButton v-if="canUpdateError && current.status !== 'resolved'" type="success" size="small" @click="setStatus(current, 'resolved'); drawerShow = false">
            标记已解决
          </NButton>
          <NButton v-if="canUpdateError && current.status !== 'ignored'" size="small" @click="setStatus(current, 'ignored'); drawerShow = false">
            忽略
          </NButton>
        </div>
      </template>
    </NDrawerContent>
  </NDrawer>

  <!-- 排噪配置弹窗 -->
  <NModal v-model:show="configShow" preset="card" title="错误监控配置" style="width: min(520px, calc(100vw - 24px))">
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-sm font-medium">采集开关</div>
          <div class="text-xs text-muted-foreground">关闭后不再写入任何新错误（约 30s 生效）</div>
        </div>
        <NSwitch v-model:value="cfgEnabled" />
      </div>
      <div>
        <div class="text-sm font-medium mb-1">排噪关键字</div>
        <div class="text-xs text-muted-foreground mb-2">每行一个，错误信息 / 位置 / 调用栈命中任一关键字即丢弃（不区分大小写）。常用：扩展报错、第三方脚本、被取消的请求等。</div>
        <NInput
          v-model:value="cfgKeywords"
          type="textarea"
          :autosize="{ minRows: 5, maxRows: 12 }"
          placeholder="例如：&#10;chrome-extension&#10;ResizeObserver&#10;Network request failed&#10;Script error"
        />
      </div>
    </div>
    <template #footer>
      <div class="flex justify-end gap-2">
        <NButton @click="configShow = false">
          取消
        </NButton>
        <NButton type="primary" :loading="cfgSaving" @click="saveConfig">
          保存
        </NButton>
      </div>
    </template>
  </NModal>
</template>

<style lang="scss" scoped>
.detail-code {
  max-height: 280px;
  padding: 12px;
  overflow: auto;
  color: var(--foreground);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  background: var(--muted);
  border-radius: var(--radius);
}

.detail-code--compact {
  max-height: 200px;
}
</style>
