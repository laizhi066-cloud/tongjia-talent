/**
 * @description 字典类型管理页面 — 列表、搜索、新增、编辑、删除、查看字典数据
 * @file app/pages/admin/dict/index.vue
 */
<script setup lang="ts">
import { AddOutline, CreateOutline, BookOutline, TrashOutline } from '@vicons/ionicons5'
import {  useDialog , NButton, NDataTable, NInput, NSelect, NIcon } from 'naive-ui'
import { createActionColumn, createTimeColumn } from '~/composables/useAdminTable'

const { renderBadge: statusBadge, getLabel: statusLabel, options: statusOptions } = useDict('sys_normal_disable')

definePageMeta({ layout: 'admin', middleware: ['auth', 'permission-guard'] })
const { withEllipsis } = useTableEllipsis()

const dialog = useDialog()
const { handleExport } = useExport()
const { hasPermission } = usePermission()
const formModal = ref()

const data = ref({ rows: [] as Record<string, any>[], total: 0, page: 1, pageSize: 10 })
const loading = ref(false)
const loadError = ref('')
const searchName = ref('')
const searchType = ref('')
// null 而非 ''：n-select 把 '' 视为已选值会吞掉 placeholder，必须用 null
const searchStatus = ref<string | null>(null)
const canCreateDict = computed(() => hasPermission('system:dict:add'))
const canEditDict = computed(() => hasPermission('system:dict:edit'))
const canDeleteDict = computed(() => hasPermission('system:dict:delete'))

async function fetchData() {
  loading.value = true
  loadError.value = ''
  try {
    data.value = await useDictApi().fetchDictTypes({
        page: data.value.page,
        pageSize: data.value.pageSize,
        dictName: searchName.value || undefined,
        dictType: searchType.value || undefined,
        status: searchStatus.value || undefined,
      })
  } catch {
    loadError.value = '字典列表加载失败，请检查网络或服务状态后重试。'
  } finally {
    loading.value = false
  }
}

function handleSearch() { data.value.page = 1; fetchData() }

function handlePageSizeChange() {
  data.value.page = 1
  fetchData()
}

function handleExportDict() {
  handleExport('/api/admin/dict/type', unref(columns), { dictName: searchName.value || undefined, dictType: searchType.value || undefined, status: searchStatus.value || undefined }, '字典类型')
}

function handleReset() {
  searchName.value = ''
  searchType.value = ''
  searchStatus.value = null
  data.value.page = 1
  fetchData()
}

function openAdd() { formModal.value?.open() }
function openEdit(row: Record<string, any>) { formModal.value?.open(row) }

async function handleDelete(row: Record<string, any>) {
  const ok = await new Promise(resolve => dialog.warning({ title: '确认删除', content: '确定删除字典类型「' + row.dictName + '」吗？关联的字典数据也会被删除。', positiveText: '确认', negativeText: '取消', onPositiveClick: () => resolve(true), onNegativeClick: () => resolve(false) }))
  if (!ok) return
  await useDictApi().deleteDictType(row.id)
  fetchData()
}

const columns = computed(() => [
  { title: '字典名称', key: 'dictName', sortable: true, sorter: 'default' as const },
  { title: '字典类型', key: 'dictType', sortable: true, sorter: 'default' as const },
  {
    title: '数据量',
    key: 'dataCount',
    render: (row: Record<string, any>) => h('span', row.dataCount ?? 0),
  },
  {
    title: '状态',
    key: 'status',
    width: 80,
    sortable: true,
    sorter: 'default' as const,
    render: (row: Record<string, any>) => statusBadge(row.status),
    renderCsv: (row: Record<string, any>) => statusLabel(row.status),
  },
  { title: '备注', key: 'remark' },
  createTimeColumn(),
  createActionColumn((row: Record<string, any>) => [
    { label: '修改', icon: CreateOutline, show: () => canEditDict.value, onClick: () => openEdit(row) },
    { label: '字典数据', icon: BookOutline, onClick: () => navigateTo(`/admin/dict/type/${row.dictType}`) },
    { label: '删除', icon: TrashOutline, type: 'error', show: () => canDeleteDict.value, onClick: () => handleDelete(row) },
  ], { width: 200 }),
])

onMounted(fetchData)
</script>

<template>
    <AdminListPage title="字典管理" :loading="loading" :error="loadError" :empty="!loading && !loadError && data.rows.length === 0" @retry="fetchData">
      <template #headerExtra>
        <n-button v-if="canCreateDict" type="primary" size="small" @click="openAdd">
          <template #icon>
            <n-icon :component="AddOutline" />
          </template>
          新增字典
        </n-button>
      </template>
      <template #search>
        <n-input v-model:value="searchName" placeholder="字典名称" class="w-44" @keyup.enter="handleSearch" />
        <n-input v-model:value="searchType" placeholder="字典类型" class="w-44" @keyup.enter="handleSearch" />
        <n-select v-model:value="searchStatus" placeholder="状态" class="w-32" :options="statusOptions" clearable />
      </template>
      <template #searchActions>
        <AdminSearchActions exportable @search="handleSearch" @reset="handleReset" @export="handleExportDict" />
      </template>
        <n-data-table flex-height :columns="withEllipsis(columns)" :data="data.rows" :loading="loading" :bordered="false" :single-line="false" :scroll-x="1000" :row-key="(row: any) => row.id" />
      <template #pagination>
        <AdminPagination v-model:page="data.page" v-model:page-size="data.pageSize" :total="data.total" @update:page="fetchData()" @update:page-size="handlePageSizeChange" />
      </template>
    </AdminListPage>
    <DictTypeFormModal ref="formModal" @saved="fetchData" />
</template>

<style lang="scss" scoped>
</style>
