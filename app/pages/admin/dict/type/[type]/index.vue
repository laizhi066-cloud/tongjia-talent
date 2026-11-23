/**
 * @description 字典数据管理页面 — 按字典类型查询，管理字典标签和值
 * @file app/pages/admin/dict/type/[type]/index.vue
 */
<script setup lang="ts">
import DictBadge from '~/components/admin/DictBadge.vue'
import { AddOutline, ArrowBackOutline, TrashOutline, CreateOutline } from '@vicons/ionicons5'
import { h } from 'vue'
import type { DataTableColumns } from 'naive-ui'
import { NDataTable, NInput, NSelect, useDialog, NButton, NIcon } from 'naive-ui'
import { actionButton } from '~/composables/useAdminTable'

const { renderBadge: statusBadge, getLabel: statusLabel, options: statusOptions } = useDict('sys_normal_disable')
const { getLabel: isDefaultLabel } = useDict('sys_yes_no')
definePageMeta({ layout: 'admin', middleware: ['auth', 'permission-guard'] })
const { withEllipsis } = useTableEllipsis()

const route = useRoute()
const dialog = useDialog()
const { handleExport } = useExport()
const { hasPermission } = usePermission()
const formModal = ref()

const dictType = computed(() => route.params.type as string)
const data = ref({ rows: [] as Record<string, any>[], total: 0, page: 1, pageSize: 10 })
const loading = ref(false)
const loadError = ref('')
const searchLabel = ref('')
const searchStatus = ref<string | null>(null)
const canCreateDictData = computed(() => hasPermission('system:dict:add'))
const canEditDictData = computed(() => hasPermission('system:dict:edit'))
const canDeleteDictData = computed(() => hasPermission('system:dict:delete'))
const canManageDictData = computed(() => canEditDictData.value || canDeleteDictData.value)

async function fetchData() {
  loading.value = true
  loadError.value = ''
  try {
    data.value = await useDictApi().fetchDictData({
      page: data.value.page,
      pageSize: data.value.pageSize,
      dictType: dictType.value,
      dictLabel: searchLabel.value || undefined,
      status: searchStatus.value || undefined,
    })
  } catch {
    loadError.value = '字典数据加载失败，请检查网络或服务状态后重试。'
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  data.value.page = 1
  fetchData()
}

function handleReset() {
  searchLabel.value = ''
  searchStatus.value = null
  data.value.page = 1
  fetchData()
}

function openAdd() {
  formModal.value?.open(null, dictType.value)
}
function openEdit(row: Record<string, any>) {
  formModal.value?.open(row, dictType.value)
}

async function handleDelete(row: Record<string, any>) {
  const ok = await new Promise(resolve => dialog.warning({ title: '确认删除', content: '确定删除字典数据「' + row.dictLabel + '」吗？', positiveText: '确认', negativeText: '取消', onPositiveClick: () => resolve(true), onNegativeClick: () => resolve(false) }))
  if (!ok) return
  await useDictApi().deleteDictData(row.id)
  fetchData()
}

onMounted(fetchData)

function handlePageSizeChange() {
  data.value.page = 1
  fetchData()
}

function handleExportDictData() {
  handleExport('/api/admin/dict/data', exportColumns, {
    dictLabel: searchLabel.value || undefined,
    status: searchStatus.value || undefined,
    dictType: dictType.value,
  }, '字典数据')
}

const columns = computed<DataTableColumns<Record<string, any>>>(() => [
  {
    title: '字典标签',
    key: 'dictLabel',
    render: (row: Record<string, any>) => h(DictBadge, {
      dictLabel: row.dictLabel || row.dictValue,
      listClass: row.listClass,
      icon: row.icon,
      backgroundColor: row.backgroundColor,
      color: row.color,
    }),
  },
  { title: '字典键值', key: 'dictValue' },
  { title: '排序', key: 'dictSort', width: 80 },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render: (row: Record<string, any>) => statusBadge(row.status),
  },
  { title: '默认', key: 'isDefault', width: 80, render: (row: Record<string, any>) => isDefaultLabel(row.isDefault) },
  { title: '备注', key: 'remark', render: (row: Record<string, any>) => row.remark || '-' },
  { title: '创建时间', key: 'created', width: 170, render: (row: Record<string, any>) => formatTime(row.created) },
  ...(canManageDictData.value ? [{
    title: '操作',
    key: 'actions',
    fixed: 'right' as const,
    width: 100,
    render: (row: Record<string, any>) => h('div', { class: 'flex gap-1' }, [
      ...(canEditDictData.value ? [actionButton(CreateOutline, '修改', () => openEdit(row))] : []),
      ...(canDeleteDictData.value ? [actionButton(TrashOutline, '删除', () => handleDelete(row), 'text-destructive')] : []),
    ]),
  }] : []),
])

const exportColumns = [
  { title: '字典标签', key: 'dictLabel' },
  { title: '字典键值', key: 'dictValue' },
  { title: '排序', key: 'dictSort' },
  { title: '状态', key: 'status', renderCsv: (row: Record<string, any>) => statusLabel(row.status) },
  { title: '默认', key: 'isDefault', renderCsv: (row: Record<string, any>) => isDefaultLabel(row.isDefault) },
  { title: '备注', key: 'remark' },
  { title: '创建时间', key: 'created' },
]
</script>

<template>
  <AdminListPage
    :title="'字典数据 - ' + dictType"
    :loading="loading"
    :error="loadError"
    :empty="!loading && !loadError && data.rows.length === 0"
    @retry="fetchData"
  >
    <template #headerExtra>
      <div class="flex gap-2">
        <n-button size="small" quaternary @click="navigateTo('/admin/dict')">
          <template #icon>
            <n-icon :component="ArrowBackOutline" />
          </template>
          返回
        </n-button>
        <n-button v-if="canCreateDictData" type="primary" size="small" @click="openAdd">
          <template #icon>
            <n-icon :component="AddOutline" />
          </template>
          新增数据
        </n-button>
      </div>
    </template>
    <template #search>
      <n-input
        v-model:value="searchLabel"
        placeholder="字典标签"
        class="w-44"
        @keyup.enter="handleSearch"
      />
      <n-select v-model:value="searchStatus" placeholder="状态" class="w-32" :options="statusOptions" clearable />
    </template>
    <template #searchActions>
      <AdminSearchActions exportable @search="handleSearch" @reset="handleReset" @export="handleExportDictData" />
    </template>
    <n-data-table flex-height :columns="withEllipsis(columns)" :data="data.rows" :loading="loading" :bordered="false" :single-line="false" :scroll-x="1000" :row-key="(row: any) => row.id" />
    <template #pagination>
      <AdminPagination
        v-model:page="data.page"
        v-model:page-size="data.pageSize"
        :total="data.total"
        @update:page="fetchData()"
        @update:page-size="handlePageSizeChange"
      />
    </template>
  </AdminListPage>
  <DictDataFormModal ref="formModal" @saved="fetchData" />
</template>
