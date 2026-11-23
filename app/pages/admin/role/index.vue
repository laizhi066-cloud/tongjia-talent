/**
 * @description 角色管理页面 — 列表、新增、编辑、删除、分配权限
 * @file app/pages/admin/role/index.vue
 */
<script setup lang="ts">
import { AddOutline, CreateOutline, MenuOutline, TrashOutline } from '@vicons/ionicons5'
import {  useDialog , useMessage, NButton, NDataTable, NInput, NSelect, NIcon } from 'naive-ui'
import { createActionColumn, createTimeColumn } from '~/composables/useAdminTable'

const dialog = useDialog()
const message = useMessage()
const { handleExport } = useExport()
const { hasPermission, hasRole } = usePermission()
const formModal = ref()
const menuModal = ref()

definePageMeta({ layout: 'admin', middleware: ['auth', 'permission-guard'] })
const { withEllipsis } = useTableEllipsis()

const { renderBadge: statusBadge, getLabel: statusLabel, options: statusOptions } = useDict('sys_normal_disable')
const { getLabel: dataScopeLabel } = useDict('sys_data_scope')
const data = ref({ rows: [] as Record<string, any>[], total: 0, page: 1, pageSize: 10 })
const loading = ref(false)
const loadError = ref('')
const searchName = ref('')
const searchStatus = ref<string | null>(null)
const canCreateRole = computed(() => hasPermission('system:role:add'))
const canEditRole = computed(() => hasPermission('system:role:edit') && hasPermission('system:role:query'))
const canAssignMenus = computed(() =>
  hasPermission('system:role:edit')
  && hasPermission('system:role:query')
  && hasPermission('system:menu:list'),
)
const canDeleteRole = computed(() => hasPermission('system:role:delete'))
const canManageRoles = computed(() => canEditRole.value || canAssignMenus.value || canDeleteRole.value)
const isSuper = computed(() => hasRole('superadmin'))

function canManageRole(row: Record<string, any>): boolean {
  return isSuper.value || !['admin', 'superadmin'].includes(String(row.roleKey || ''))
}

async function fetchData() {
  loading.value = true
  loadError.value = ''
  try {
    data.value = await useRoleApi().fetchRoles({
      page: data.value.page, pageSize: data.value.pageSize, roleName: searchName.value || undefined, status: searchStatus.value || undefined,
    })
  } catch {
    loadError.value = '角色列表加载失败，请检查网络或服务状态后重试。'
  } finally {
    loading.value = false
  }
}

function handleSearch() { data.value.page = 1; fetchData() }

function handlePageSizeChange() {
  data.value.page = 1
  fetchData()
}

function handleExportRole() {
  handleExport('/api/admin/role', unref(columns), { roleName: searchName.value || undefined, status: searchStatus.value || undefined }, '角色数据')
}

function handleReset() {
  searchName.value = ''
  searchStatus.value = null
  data.value.page = 1
  fetchData()
}

function openAdd() { formModal.value?.open() }
function openEdit(row: Record<string, any>) { formModal.value?.open(row) }
function openMenu(row: Record<string, any>) { menuModal.value?.open(row) }

async function handleDelete(row: Record<string, any>) {
  const ok = await new Promise<boolean>((resolve) => {
    dialog.warning({ title: '确认删除', content: `确定删除角色「${row.roleName}」吗？`, positiveText: '确认', negativeText: '取消', onPositiveClick: () => resolve(true), onNegativeClick: () => resolve(false) })
  })
  if (!ok) return
  await useRoleApi().deleteRole(row.id)
  message.success('删除成功')
  fetchData()
}

const columns = computed((): any[] => [
  { title: '角色名称', key: 'roleName', sortable: true, sorter: 'default' as const },
  { title: '角色标识', key: 'roleKey' },
  { title: '排序', key: 'roleSort', width: 80, sortable: true, sorter: 'default' as const },
  {
    title: '数据范围',
    key: 'dataScope',
    width: 120,
    render: (row: Record<string, any>) => h('span', dataScopeLabel(row.dataScope)),
    renderCsv: (row: Record<string, any>) => dataScopeLabel(row.dataScope),
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
  { title: '用户数', key: 'userCount', width: 80, render: (row: Record<string, any>) => h('span', row.userCount ?? 0) },
  createTimeColumn(),
  ...(canManageRoles.value ? [createActionColumn((row: Record<string, any>) => [
    { label: '修改', icon: CreateOutline, show: () => canEditRole.value && canManageRole(row), onClick: () => openEdit(row) },
    { label: '菜单权限', icon: MenuOutline, show: () => canAssignMenus.value && canManageRole(row), onClick: () => openMenu(row) },
    { label: '删除', icon: TrashOutline, type: 'error', show: () => canDeleteRole.value && canManageRole(row), onClick: () => handleDelete(row) },
  ], { width: 200 })] : []),
])

onMounted(fetchData)
</script>

<template>
  <AdminListPage title="角色管理" :loading="loading" :error="loadError" :empty="!loading && !loadError && data.rows.length === 0" @retry="fetchData">
    <template #headerExtra>
      <n-button v-if="canCreateRole" type="primary" size="small" @click="openAdd">
        <template #icon><n-icon :component="AddOutline" /></template>
        新增角色
      </n-button>
    </template>
    <template #search>
      <n-input v-model:value="searchName" placeholder="角色名称" class="w-44" @keyup.enter="handleSearch" />
      <n-select v-model:value="searchStatus" :options="statusOptions" placeholder="状态" class="w-32" clearable />
    </template>
    <template #searchActions>
      <AdminSearchActions exportable @search="handleSearch" @reset="handleReset" @export="handleExportRole" />
    </template>
      <n-data-table flex-height :columns="withEllipsis(columns)" :data="data.rows" :loading="loading" :bordered="false" :single-line="false" :scroll-x="1000" :row-key="(row: any) => row.id" />
    <template #pagination>
      <AdminPagination v-model:page="data.page" v-model:page-size="data.pageSize" :total="data.total" @update:page="fetchData()" @update:page-size="handlePageSizeChange" />
    </template>
  </AdminListPage>
  <RoleFormModal ref="formModal" @saved="fetchData" />
  <RoleMenuModal ref="menuModal" />
</template>
