/**
 * @description 在线用户页面 — 只读列表 + 强退按钮，每30秒自动刷新
 * @file app/pages/admin/monitor/online/index.vue
 */
<script setup lang="ts">
import { h } from 'vue'
import { useDialog, useMessage, NTag, NButton, NDataTable, NInput } from 'naive-ui'
definePageMeta({ layout: 'admin', middleware: ['auth', 'permission-guard', 'super-guard'] })
const { withEllipsis } = useTableEllipsis()

const dialog = useDialog()
const message = useMessage()
const { handleExport } = useExport()
const { hasPermission } = usePermission()

const data = ref({ rows: [] as Record<string, any>[], total: 0, page: 1, pageSize: 10 })
const loading = ref(false)
const loadError = ref('')
const searchName = ref('')
const searchParams = computed(() => ({ userName: searchName.value || undefined }))
const canForceLogout = computed(() => hasPermission('monitor:online:forceLogout'))

async function fetchData() {
  loading.value = true
  loadError.value = ''
  try {
    data.value = await useMonitorApi().fetchOnlineUsers({
      page: data.value.page, pageSize: data.value.pageSize, ...searchParams.value,
    })
  } catch {
    loadError.value = '在线用户加载失败，请检查网络或服务状态后重试。'
  } finally {
    loading.value = false
  }
}

function handleSearch() { data.value.page = 1; fetchData() }
function handleReset() { searchName.value = ''; data.value.page = 1; fetchData() }
function handleExportOnline() {
  handleExport('/api/admin/monitor/online', unref(columns), { userName: searchName.value || undefined }, 'online-users')
}
function handlePageSizeChange() {
  data.value.page = 1
  fetchData()
}

/**
 * 强制用户下线
 * @param row 会话记录
 */
async function handleForceLogout(row: Record<string, any>) {
  const ok = await new Promise<boolean>(resolve => {
    dialog.warning({
      title: '确认强退',
      content: `确定强退用户「${row.userName}」吗？`,
      positiveText: '确认',
      negativeText: '取消',
      onPositiveClick: () => resolve(true),
      onNegativeClick: () => resolve(false),
    })
  })
  if (!ok) return
  try {
    await useMonitorApi().forceLogout(row.id)
    message.success('已强制下线')
    fetchData()
  } catch {
    // 全局拦截器已弹出错误提示
  }
}

const columns = computed(() => [
  { title: '用户名称', key: 'userName', width: 120 },
  { title: 'IP 地址', key: 'ipaddr', width: 140 },
  { title: '浏览器', key: 'browser', width: 100 },
  { title: '操作系统', key: 'os', width: 100 },
  { title: '登录时间', key: 'loginTime', width: 170, sortable: true, sorter: 'default' as const, render: (row: Record<string, any>) => h('span', formatTime(row.loginTime)) },
  { title: '最后活跃', key: 'lastActivityTime', width: 170, render: (row: Record<string, any>) => h('span', formatTime(row.lastActivityTime)) },
  {
    title: '状态',
    key: 'status',
    width: 80,
    render: (_row: Record<string, any>) => h(NTag, { type: 'success', size: 'small' }, () => '在线'),
  },
  ...(canForceLogout.value ? [{
    title: '操作',
    key: 'actions',
    width: 100,
    fixed: 'right' as const,
    render: (row: Record<string, any>) => h(NButton, {
      text: true, size: 'small', type: 'error',
      onClick: () => handleForceLogout(row),
    }, { default: () => '强退' }),
  }] : []),
])

onMounted(() => {
  fetchData()
  const interval = setInterval(fetchData, 30000)
  onUnmounted(() => clearInterval(interval))
})
</script>

<template>
  <AdminListPage title="在线用户" :loading="loading" :error="loadError" :empty="!loading && !loadError && data.rows.length === 0" @retry="fetchData">
    <template #search>
      <n-input v-model:value="searchName" placeholder="用户名称" class="w-44" @keyup.enter="handleSearch" />
    </template>
    <template #searchActions>
      <AdminSearchActions exportable @search="handleSearch" @reset="handleReset" @export="handleExportOnline" />
    </template>
    <n-data-table flex-height :columns="withEllipsis(columns)" :data="data.rows" :loading="loading" :bordered="false" :single-line="false" :scroll-x="950" :row-key="(row: any) => row.id" />
    <template #pagination>
      <AdminPagination v-model:page="data.page" v-model:page-size="data.pageSize" :total="data.total" @update:page="fetchData()" @update:page-size="handlePageSizeChange" />
    </template>
  </AdminListPage>
</template>

<style lang="scss" scoped>
</style>
