/**
 * @description 岗位管理页面 — 列表、新增、编辑、删除
 * @file app/pages/admin/post/index.vue
 */
<script setup lang="ts">
import { AddOutline, CreateOutline, TrashOutline } from '@vicons/ionicons5'
import {  useDialog , NButton, NDataTable, NInput, NSelect, NIcon } from 'naive-ui'
import { createActionColumn, createTimeColumn } from '~/composables/useAdminTable'
definePageMeta({ layout: 'admin', middleware: ['auth', 'permission-guard'] })
const { withEllipsis } = useTableEllipsis()

const dialog = useDialog()
const { handleExport } = useExport()
const { hasPermission } = usePermission()
const formModal = ref()

const { renderBadge: statusBadge, getLabel: statusLabel, options: statusOptions } = useDict('sys_normal_disable')
const searchName = ref('')
const searchCode = ref('')
const searchStatus = ref<string | null>(null)
const canCreatePost = computed(() => hasPermission('system:post:add'))
const canEditPost = computed(() => hasPermission('system:post:edit'))
const canDeletePost = computed(() => hasPermission('system:post:delete'))
const canManagePosts = computed(() => canEditPost.value || canDeletePost.value)

const { data, loading, error, fetchData, handleSearch, handleReset } = useAdminTable<PostEntity>(
  ({ page, pageSize }) => usePostApi().fetchPosts({
    page, pageSize, postName: searchName.value || undefined, postCode: searchCode.value || undefined, status: searchStatus.value || undefined,
  }),
)

function doReset() {
  searchName.value = ''
  searchCode.value = ''
  searchStatus.value = null
  handleReset()
}

function handlePageSizeChange() {
  data.value.page = 1
  fetchData()
}

function handleExportPost() {
  handleExport('/api/admin/post', unref(columns), { postName: searchName.value || undefined, postCode: searchCode.value || undefined, status: searchStatus.value || undefined }, '岗位数据')
}

function openAdd() { formModal.value?.open() }
function openEdit(row: Record<string, any>) { formModal.value?.open(row) }

async function handleDelete(row: Record<string, any>) {
  const ok = await new Promise(resolve => dialog.warning({ title: '确认删除', content: '确定删除岗位「' + row.postName + '」吗？', positiveText: '确认', negativeText: '取消', onPositiveClick: () => resolve(true), onNegativeClick: () => resolve(false) }))
  if (!ok) return
  await usePostApi().deletePost(row.id)
  fetchData()
}

const columns = computed(() => [
  { title: '岗位编码', key: 'postCode', sortable: true, sorter: 'default' as const },
  { title: '岗位名称', key: 'postName', sortable: true, sorter: 'default' as const },
  { title: '排序', key: 'postSort', width: 80, sortable: true, sorter: 'default' as const },
  {
    title: '状态', key: 'status', width: 80, sortable: true, sorter: 'default' as const,
    render: (row: Record<string, any>) => statusBadge(row.status),
    renderCsv: (row: Record<string, any>) => statusLabel(row.status),
  },
  { title: '备注', key: 'remark' },
  createTimeColumn(),
  ...(canManagePosts.value ? [createActionColumn((row: Record<string, any>) => [
    { label: '修改', icon: CreateOutline, show: () => canEditPost.value, onClick: () => openEdit(row) },
    { label: '删除', icon: TrashOutline, type: 'error', show: () => canDeletePost.value, onClick: () => handleDelete(row) },
  ], { width: 120 })] : []),
])

onMounted(fetchData)
</script>

<template>
    <AdminListPage title="岗位管理" :loading="loading" :error="error" :empty="!loading && !error && data.rows.length === 0" @retry="fetchData">
      <template #headerExtra>
        <n-button v-if="canCreatePost" type="primary" size="small" @click="openAdd">
          <template #icon>
            <n-icon :component="AddOutline" />
          </template>
          新增岗位
        </n-button>
      </template>
      <template #search>
        <n-input v-model:value="searchName" placeholder="岗位名称" class="w-44" @keyup.enter="handleSearch" />
        <n-input v-model:value="searchCode" placeholder="岗位编码" class="w-44" @keyup.enter="handleSearch" />
        <n-select v-model:value="searchStatus" placeholder="状态" class="w-32" :options="statusOptions" clearable />
      </template>
      <template #searchActions>
        <AdminSearchActions exportable @search="handleSearch" @reset="doReset" @export="handleExportPost" />
      </template>
        <n-data-table flex-height :columns="withEllipsis(columns)" :data="data.rows" :loading="loading" :bordered="false" :single-line="false" :scroll-x="900" :row-key="(row: any) => row.id" />
      <template #pagination>
        <AdminPagination v-model:page="data.page" v-model:page-size="data.pageSize" :total="data.total" @update:page="fetchData()" @update:page-size="handlePageSizeChange" />
      </template>
    </AdminListPage>
    <PostFormModal ref="formModal" @saved="fetchData" />
</template>
