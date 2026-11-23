/**
 * @description 参数配置管理页面 — 列表、搜索、新增、编辑、删除
 * @file app/pages/admin/config/index.vue
 */
<script setup lang="ts">
import { AddOutline, CreateOutline, TrashOutline } from '@vicons/ionicons5'
import {  useDialog , NButton, NDataTable, NInput, NIcon } from 'naive-ui'
import { actionButton, createTimeColumn } from '~/composables/useAdminTable'

const { getLabel: configTypeLabel } = useDict('sys_yes_no')

definePageMeta({ layout: 'admin', middleware: ['auth', 'permission-guard'] })

const dialog = useDialog()
const { handleExport } = useExport()
const { withEllipsis } = useTableEllipsis()
const { hasPermission } = usePermission()
const formModal = ref()

const data = ref({ rows: [] as Record<string, any>[], total: 0, page: 1, pageSize: 10 })
const loading = ref(false)
const loadError = ref('')
const searchName = ref('')
const searchKey = ref('')
const canCreateConfig = computed(() => hasPermission('system:config:add'))
const canEditConfig = computed(() => hasPermission('system:config:edit'))
const canDeleteConfig = computed(() => hasPermission('system:config:delete'))
const canManageConfigs = computed(() => canEditConfig.value || canDeleteConfig.value)

async function fetchData() {
  loading.value = true
  loadError.value = ''
  try {
    data.value = await useConfigApi().fetchConfigs({
        page: data.value.page,
        pageSize: data.value.pageSize,
        configName: searchName.value || undefined,
        configKey: searchKey.value || undefined,
      })
  } catch {
    loadError.value = '参数配置加载失败，请检查网络或服务状态后重试。'
  } finally {
    loading.value = false
  }
}

function handleSearch() { data.value.page = 1; fetchData() }

function handlePageSizeChange() {
  data.value.page = 1
  fetchData()
}

function handleExportConfig() {
  handleExport('/api/admin/config', unref(columns), { configName: searchName.value || undefined, configKey: searchKey.value || undefined }, '参数配置')
}

function handleReset() {
  searchName.value = ''
  searchKey.value = ''
  data.value.page = 1
  fetchData()
}

function openAdd() { formModal.value?.open() }
function openEdit(row: Record<string, any>) { formModal.value?.open(row) }

async function handleDelete(row: Record<string, any>) {
  const ok = await new Promise(resolve => dialog.warning({ title: '确认删除', content: '确定删除配置「' + row.configName + '」吗？', positiveText: '确认', negativeText: '取消', onPositiveClick: () => resolve(true), onNegativeClick: () => resolve(false) }))
  if (!ok) return
  await useConfigApi().deleteConfig(row.id)
  fetchData()
}

const columns = computed(() => [
  { title: '配置名称', key: 'configName', sortable: true, sorter: 'default' as const },
  { title: '配置键名', key: 'configKey', sortable: true, sorter: 'default' as const },
  { title: '配置键值', key: 'configValue' },
  {
    title: '内置',
    key: 'configType',
    width: 60,
    render: (row: Record<string, any>) => h('span', configTypeLabel(row.configType)),
    renderCsv: (row: Record<string, any>) => configTypeLabel(row.configType),
  },
  { title: '备注', key: 'remark' },
  createTimeColumn(),
  ...(canManageConfigs.value ? [{
    title: '操作',
    fixed: 'right' as const,
    width: 120,
    key: 'actions',
    render: (row: Record<string, any>) => h('div', { class: 'flex gap-1' }, [
      ...(canEditConfig.value ? [actionButton(CreateOutline, '修改', () => openEdit(row))] : []),
      ...(canDeleteConfig.value ? [actionButton(TrashOutline, '删除', () => handleDelete(row), 'text-destructive')] : []),
    ]),
  }] : []),
])

onMounted(fetchData)
</script>

<template>
  <!-- 外层 div 需为 flex 列并填满，否则内部 AdminListPage 的 flex:1 不生效、表格 flex-height 塌成最小高 -->
  <div class="flex flex-col flex-1 min-h-0">
    <AdminListPage title="参数设置" :loading="loading" :error="loadError" :empty="!loading && !loadError && data.rows.length === 0" @retry="fetchData">
    <template #headerExtra>
      <n-button v-if="canCreateConfig" type="primary" size="small" @click="openAdd">
        <template #icon>
          <n-icon :component="AddOutline" />
        </template>
        新增配置
      </n-button>
    </template>
    <template #search>
      <n-input v-model:value="searchName" placeholder="配置名称" class="w-44" @keyup.enter="handleSearch" />
      <n-input v-model:value="searchKey" placeholder="配置键名" class="w-44" @keyup.enter="handleSearch" />
    </template>
    <template #searchActions>
      <AdminSearchActions exportable @search="handleSearch" @reset="handleReset" @export="handleExportConfig" />
    </template>
      <n-data-table flex-height :columns="withEllipsis(columns)" :data="data.rows" :loading="loading" :bordered="false" :single-line="false" :row-key="(row: any) => row.id" :scroll-x="1100" />
    <template #pagination>
      <AdminPagination v-model:page="data.page" v-model:page-size="data.pageSize" :total="data.total" @update:page="fetchData()" @update:page-size="handlePageSizeChange" />
    </template>
  </AdminListPage>
    <ConfigFormModal ref="formModal" @saved="fetchData" />
  </div>
</template>

<style lang="scss" scoped>
</style>
