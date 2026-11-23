/**
 * @description 部门管理页面 — 树形表格展示、新增、编辑、删除与导出
 * @file app/pages/admin/dept/index.vue
 */
<script setup lang="ts">
import { h } from 'vue'
import {
  NButton,
  NDataTable,
  NIcon,
  NInput,
  NTag,
  useDialog,
  type DataTableColumns,
} from 'naive-ui'
import {
  AddOutline,
  ChevronDownOutline,
  ChevronForwardOutline,
  DownloadOutline,
} from '@vicons/ionicons5'

interface DeptTableRow extends DeptEntity {
  _depth: number
  _hasChildren: boolean
}

definePageMeta({ layout: 'admin', middleware: ['auth', 'permission-guard'] })

const dialog = useDialog()
const { exportCsv } = useExport()
const { getLabel: deptStatusLabel } = useDict('sys_normal_disable')
const { hasPermission } = usePermission()
const modalRef = ref()
const keyword = ref('')
const deptTree = ref<DeptEntity[]>([])
const loading = ref(false)
const loadError = ref('')
const canCreateDept = computed(() => hasPermission('system:dept:add'))
const canEditDept = computed(() => hasPermission('system:dept:edit'))
const canDeleteDept = computed(() => hasPermission('system:dept:delete'))
const canManageDepts = computed(() => canCreateDept.value || canEditDept.value || canDeleteDept.value)
const { expandedKeys, flatNodes, flattenTree, rebuild, expandAll, collapseAll, toggleExpand, isVisible } = useAdminTree(deptTree)

const filteredTree = computed<DeptEntity[]>(() => {
  const query = keyword.value.trim().toLowerCase()
  if (!query) return deptTree.value

  const filterNodes = (nodes: DeptEntity[]): DeptEntity[] => nodes.flatMap((node) => {
    const children = filterNodes(node.children || [])
    const searchable = [node.deptName, node.leader, node.phone, node.email]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    if (!searchable.includes(query) && children.length === 0) return []
    return [{ ...node, children }]
  })

  return filterNodes(deptTree.value)
})

const rowKey = (row: DeptTableRow) => row.id

const visibleRows = computed<DeptTableRow[]>(() => {
  if (keyword.value.trim()) return flattenTree(filteredTree.value) as DeptTableRow[]
  return flatNodes.value.filter(node => isVisible(node)) as DeptTableRow[]
})

const columns = computed<DataTableColumns<DeptTableRow>>(() => [
  {
    title: '部门名称',
    key: 'deptName',
    minWidth: 240,
    fixed: 'left',
    render: row => h('div', {
      class: 'flex min-w-0 items-center gap-2',
      style: { paddingLeft: `${row._depth * 24}px` },
    }, [
      row._hasChildren
        ? h(NButton, {
            quaternary: true,
            circle: true,
            size: 'tiny',
            'aria-label': expandedKeys.value.has(row.id) ? `收起部门 ${row.deptName}` : `展开部门 ${row.deptName}`,
            'aria-expanded': expandedKeys.value.has(row.id),
            onClick: () => toggleExpand(row.id),
          }, {
            icon: () => h(NIcon, {
              component: expandedKeys.value.has(row.id) ? ChevronDownOutline : ChevronForwardOutline,
            }),
          })
        : h('span', { class: 'inline-block h-6 w-6 shrink-0' }),
      h('span', { class: 'truncate font-medium', title: row.deptName }, row.deptName),
    ]),
  },
  { title: '排序', key: 'orderNum', width: 80, align: 'center' },
  {
    title: '负责人',
    key: 'leader',
    width: 120,
    ellipsis: { tooltip: true },
    render: row => row.leader || '-',
  },
  {
    title: '联系电话',
    key: 'phone',
    width: 140,
    render: row => row.phone || '-',
  },
  {
    title: '邮箱',
    key: 'email',
    minWidth: 190,
    ellipsis: { tooltip: true },
    render: row => row.email || '-',
  },
  {
    title: '状态',
    key: 'status',
    width: 90,
    align: 'center',
    render: row => h(NTag, {
      size: 'small',
      type: row.status === '1' ? 'success' : 'warning',
      bordered: false,
    }, { default: () => deptStatusLabel(row.status) }),
  },
  {
    title: '更新时间',
    key: 'updated',
    width: 170,
    render: row => formatTime(row.updated) || '-',
  },
  ...(canManageDepts.value ? [{
    title: '操作',
    key: 'actions',
    width: 220,
    fixed: 'right' as const,
    render: (row: DeptTableRow) => h('div', { class: 'flex items-center gap-1' }, [
      ...(canEditDept.value
        ? [h(NButton, { size: 'small', quaternary: true, type: 'primary', onClick: () => openEdit(row) }, { default: () => '编辑' })]
        : []),
      ...(canCreateDept.value
        ? [h(NButton, { size: 'small', quaternary: true, onClick: () => openAdd(row.id, row.deptName) }, { default: () => '新增下级' })]
        : []),
      ...(canDeleteDept.value
        ? [h(NButton, { size: 'small', quaternary: true, type: 'error', onClick: () => handleDelete(row) }, { default: () => '删除' })]
        : []),
    ]),
  }] : []),
])

const exportColumns = computed(() => [
  { title: '部门名称', key: 'deptName' },
  { title: '排序', key: 'orderNum' },
  { title: '负责人', key: 'leader' },
  { title: '联系电话', key: 'phone' },
  { title: '邮箱', key: 'email' },
  { title: '状态', key: 'status' },
  { title: '创建时间', key: 'created' },
  { title: '更新时间', key: 'updated' },
])

function handleExportTree() {
  const rows = flattenTree(deptTree.value).map(row => ({
    ...row,
    status: deptStatusLabel(row.status),
    created: formatTime(row.created),
    updated: formatTime(row.updated),
  }))
  exportCsv(exportColumns.value, rows, '部门数据')
}

async function fetchTree() {
  loading.value = true
  loadError.value = ''
  try {
    deptTree.value = await useDeptApi().fetchDeptTree()
    rebuild()
    expandAll()
  } catch {
    loadError.value = '部门数据加载失败，请检查网络或服务状态后重试。'
  } finally {
    loading.value = false
  }
}

function openAdd(parentId?: string, parentName?: string) {
  modalRef.value?.open({ parentId, parentName })
}

function findDeptName(id?: string, nodes: DeptEntity[] = deptTree.value): string {
  if (!id) return ''
  for (const node of nodes) {
    if (node.id === id) return node.deptName
    const childName = findDeptName(id, node.children || [])
    if (childName) return childName
  }
  return ''
}

function openEdit(dept: DeptEntity) {
  modalRef.value?.open({ ...dept, parentName: findDeptName(dept.parentId) })
}

async function handleDelete(dept: DeptEntity) {
  const ok = await new Promise<boolean>(resolve => {
    dialog.warning({
      title: '确认删除',
      content: `确定删除部门「${dept.deptName}」吗？`,
      positiveText: '确认',
      negativeText: '取消',
      onPositiveClick: () => resolve(true),
      onNegativeClick: () => resolve(false),
    })
  })
  if (!ok) return
  await useDeptApi().deleteDept(dept.id)
  await fetchTree()
}

onMounted(fetchTree)
</script>

<template>
  <AdminListPage
    title="部门管理"
    :loading="loading"
    :error="loadError"
    :empty="!loading && !loadError && visibleRows.length === 0"
    @retry="fetchTree"
  >
    <template #headerExtra>
      <n-button size="small" secondary @click="handleExportTree">
        <template #icon>
          <n-icon :component="DownloadOutline" />
        </template>
        导出
      </n-button>
      <n-button v-if="canCreateDept" size="small" type="primary" @click="openAdd()">
        <template #icon>
          <n-icon :component="AddOutline" />
        </template>
        新增部门
      </n-button>
    </template>

    <template #search>
      <n-input v-model:value="keyword" clearable class="w-72 max-w-full" placeholder="搜索部门名称、负责人、电话或邮箱" />
    </template>

    <template #searchActions>
      <n-button size="small" secondary :disabled="!!keyword" @click="expandAll">展开全部</n-button>
      <n-button size="small" secondary :disabled="!!keyword" @click="collapseAll">折叠全部</n-button>
      <n-button v-if="keyword" size="small" quaternary @click="keyword = ''">重置</n-button>
    </template>

    <n-data-table
      flex-height
      striped
      :bordered="false"
      :columns="columns"
      :data="visibleRows"
      :loading="loading"
      :pagination="false"
      :row-key="rowKey"
      :scroll-x="1250"
    />
  </AdminListPage>

  <DeptFormModal ref="modalRef" @saved="fetchTree" />
</template>
