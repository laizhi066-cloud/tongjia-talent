/** * @description 登录日志页面 — 只读表格，查看系统登录记录 * @file
app/pages/admin/log/login-log.vue */
<script setup lang="ts">
import { h } from 'vue'
import { NDataTable, NInput, NSelect, NDatePicker } from 'naive-ui'

const { renderBadge: loginStatusBadge, getLabel: loginStatusLabel, options: loginStatusOptions } = useDict('sys_login_status')

definePageMeta({ layout: 'admin', middleware: ['auth', 'permission-guard', 'super-guard'] })
const { withEllipsis } = useTableEllipsis()

const { handleExport } = useExport()

const data = ref({ rows: [] as Record<string, any>[], total: 0, page: 1, pageSize: 10 })
const loading = ref(false)
const loadError = ref('')
const searchName = ref('')
const searchStatus = ref<string | null>(null)
const searchBeginDate = ref<string | null>(null)
const searchEndDate = ref<string | null>(null)

async function fetchData() {
  loading.value = true
  loadError.value = ''
  try {
    data.value = await useLogApi().fetchLoginLogs({
      page: data.value.page, pageSize: data.value.pageSize,
      userName: searchName.value || undefined,
      status: searchStatus.value || undefined,
      beginTime: searchBeginDate.value || undefined,
      endTime: searchEndDate.value || undefined,
    })
  } catch {
    loadError.value = '登录日志加载失败，请检查网络或服务状态后重试。'
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  data.value.page = 1
  fetchData()
}

function handleReset() {
  searchName.value = ''
  searchStatus.value = null
  searchBeginDate.value = null
  searchEndDate.value = null
  data.value.page = 1
  fetchData()
}

const columns = [
  { title: '用户名', key: 'userName', width: 120 },
  { title: '登录方式', key: 'loginType', width: 100 },
  { title: 'IP地址', key: 'ipaddr', width: 140 },
  {
    title: '状态',
    key: 'status',
    width: 70,
    render: (row: Record<string, any>) => loginStatusBadge(row.status),
    renderCsv: (row: Record<string, any>) => loginStatusLabel(row.status),
  },
  { title: '提示消息', key: 'msg' },
  { title: '终端', key: 'userAgent', width: 180, ellipsis: { tooltip: true } },
  { title: '登录时间', key: 'loginTime', width: 170, render: (row: Record<string, any>) => h('span', formatTime(row.loginTime)) },
]

onMounted(fetchData)

function handlePageSizeChange() {
  data.value.page = 1
  fetchData()
}

function handleExportLoginLog() {
  handleExport('/api/admin/log/login', columns, { userName: searchName.value || undefined, status: searchStatus.value || undefined }, '登录日志')
}
</script>

<template>
  <AdminListPage title="登录日志" :loading="loading" :error="loadError" :empty="!loading && !loadError && data.rows.length === 0" @retry="fetchData">
    <template #search>
      <n-input v-model:value="searchName" placeholder="用户名称" class="w-44" @keyup.enter="handleSearch" />
      <n-select v-model:value="searchStatus" :options="loginStatusOptions.map(o => ({ label: o.label, value: o.value }))" placeholder="状态" class="w-32" clearable />
      <div class="flex items-center gap-2">
        <n-date-picker v-model:formatted-value="searchBeginDate" value-format="yyyy-MM-dd" type="date" clearable class="w-40" />
        <span class="text-sm" style="color:var(--muted-foreground);">至</span>
        <n-date-picker v-model:formatted-value="searchEndDate" value-format="yyyy-MM-dd" type="date" clearable class="w-40" />
      </div>
    </template>
    <template #searchActions>
      <AdminSearchActions exportable @search="handleSearch" @reset="handleReset" @export="handleExportLoginLog" />
    </template>
    <n-data-table flex-height :columns="withEllipsis(columns)" :data="data.rows" :loading="loading" :bordered="false" :single-line="false" :scroll-x="1050" :row-key="(row: any) => row.id" />
    <template #pagination>
      <AdminPagination v-model:page="data.page" v-model:page-size="data.pageSize" :total="data.total" @update:page="fetchData()" @update:page-size="handlePageSizeChange" />
    </template>
  </AdminListPage>
</template>
