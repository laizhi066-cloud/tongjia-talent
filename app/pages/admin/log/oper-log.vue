/** * @description 操作日志页面 — 只读表格，查看系统操作记录 * @file
app/pages/admin/log/oper-log.vue */
<script setup lang="ts">
import { h } from 'vue'
import { createTimeColumn } from '~/composables/useAdminTable'
import { NDataTable, NInput, NSelect, NDatePicker } from 'naive-ui'

const { getLabel: operTypeLabel } = useDict('sys_oper_type')
const { renderBadge: operStatusBadge, getLabel: operStatusLabel, options: operStatusOptions } = useDict('sys_oper_status')

definePageMeta({ layout: 'admin', middleware: ['auth', 'permission-guard', 'super-guard'] })
const { withEllipsis } = useTableEllipsis()

const { handleExport } = useExport()

const data = ref({ rows: [] as Record<string, any>[], total: 0, page: 1, pageSize: 10 })
const loading = ref(false)
const loadError = ref('')
const searchTitle = ref('')
const searchOperName = ref('')
const searchStatus = ref<string | null>(null)
const searchBeginDate = ref<string | null>(null)
const searchEndDate = ref<string | null>(null)

async function fetchData() {
  loading.value = true
  loadError.value = ''
  try {
    data.value = await useLogApi().fetchOperLogs({
      page: data.value.page, pageSize: data.value.pageSize,
      title: searchTitle.value || undefined,
      operName: searchOperName.value || undefined,
      status: searchStatus.value || undefined,
      beginTime: searchBeginDate.value || undefined,
      endTime: searchEndDate.value || undefined,
    })
  } catch {
    loadError.value = '操作日志加载失败，请检查网络或服务状态后重试。'
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  data.value.page = 1
  fetchData()
}

function handleReset() {
  searchTitle.value = ''
  searchOperName.value = ''
  searchStatus.value = null
  searchBeginDate.value = null
  searchEndDate.value = null
  data.value.page = 1
  fetchData()
}

const columns = [
  { title: '模块', key: 'title', width: 120 },
  {
    title: '操作类型',
    key: 'operType',
    width: 90,
    render: (row: Record<string, any>) => h('span', operTypeLabel(row.operType) || '-'),
  },
  { title: '请求方式', key: 'requestMethod', width: 90 },
  { title: '操作人员', key: 'operName', width: 120 },
  { title: '请求地址', key: 'operUrl' },
  { title: '操作IP', key: 'operIp', width: 130 },
  { title: '耗时(ms)', key: 'costTime', width: 90 },
  {
    title: '状态',
    key: 'status',
    width: 70,
    render: (row: Record<string, any>) => operStatusBadge(row.status),
    renderCsv: (row: Record<string, any>) => operStatusLabel(row.status),
  },
  createTimeColumn('created', '操作时间'),
]

onMounted(fetchData)

function handlePageSizeChange() {
  data.value.page = 1
  fetchData()
}

function handleExportOperLog() {
  handleExport('/api/admin/log/oper', columns, { title: searchTitle.value || undefined, operName: searchOperName.value || undefined, status: searchStatus.value || undefined }, '操作日志')
}
</script>

<template>
  <AdminListPage title="操作日志" :loading="loading" :error="loadError" :empty="!loading && !loadError && data.rows.length === 0" @retry="fetchData">
    <template #search>
      <n-input v-model:value="searchTitle" placeholder="模块名称" class="w-44" @keyup.enter="handleSearch" />
      <n-input v-model:value="searchOperName" placeholder="操作人员" class="w-44" @keyup.enter="handleSearch" />
      <n-select v-model:value="searchStatus" :options="operStatusOptions.map(o => ({ label: o.label, value: o.value }))" placeholder="状态" class="w-32" clearable />
      <div class="flex items-center gap-2">
        <n-date-picker v-model:formatted-value="searchBeginDate" value-format="yyyy-MM-dd" type="date" clearable class="w-40" />
        <span class="text-sm" style="color:var(--muted-foreground);">至</span>
        <n-date-picker v-model:formatted-value="searchEndDate" value-format="yyyy-MM-dd" type="date" clearable class="w-40" />
      </div>
    </template>
    <template #searchActions>
      <AdminSearchActions exportable @search="handleSearch" @reset="handleReset" @export="handleExportOperLog" />
    </template>
    <n-data-table flex-height :columns="withEllipsis(columns)" :data="data.rows" :loading="loading" :bordered="false" :single-line="false" :scroll-x="1100" :row-key="(row: any) => row.id" />
    <template #pagination>
      <AdminPagination v-model:page="data.page" v-model:page-size="data.pageSize" :total="data.total" @update:page="fetchData()" @update:page-size="handlePageSizeChange" />
    </template>
  </AdminListPage>
</template>
