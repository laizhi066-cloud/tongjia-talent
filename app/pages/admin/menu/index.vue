/**
 * @description 菜单管理页面 — 树形展示、新增、编辑、删除
 * @file app/pages/admin/menu/index.vue
 */
<script setup lang="ts">
import { useDialog, useMessage, NButton, NIcon, NTag, NTooltip, NCard } from 'naive-ui'
import { ChevronForwardOutline, ChevronDownOutline, DownloadOutline, AddOutline, CreateOutline, TrashOutline } from '@vicons/ionicons5'

const { getLabel: menuTypeLabel } = useDict('sys_menu_type')

// 菜单管理仅平台超管：菜单结构是平台级配置，系统管理员(客户)不应改动 → super-guard 直达也拦
definePageMeta({ layout: 'admin', middleware: ['auth', 'super-guard'] })

const dialog = useDialog()
const message = useMessage()
const { exportCsv } = useExport()
const { hasPermission } = usePermission()
const modalRef = ref()

const canCreateMenu = computed(() => hasPermission('system:menu:add'))
const canEditMenu = computed(() => hasPermission('system:menu:edit'))
const canDeleteMenu = computed(() => hasPermission('system:menu:delete'))

const exportColumns = computed(() => [
  { title: '菜单名称', key: 'menuName' },
  { title: '菜单类型', key: 'menuType' },
  { title: '权限标识', key: 'permissionCode' },
  { title: '路由地址', key: 'path' },
  { title: '组件路径', key: 'component' },
  { title: '排序', key: 'orderNum' },
  { title: '状态', key: 'status' },
  { title: '图标', key: 'icon' },
  { title: '创建时间', key: 'created' },
])

function handleExportTree() {
  const rows = flattenTree(menuTree.value)
  exportCsv(exportColumns.value, rows, '菜单数据')
}

const menuTree = ref<Record<string, any>[]>([])
const loading = ref(false)
const { expandedKeys, flatNodes, flattenTree, rebuild, expandAll, collapseAll, toggleExpand, isVisible } = useAdminTree(menuTree)

async function fetchTree() {
  loading.value = true
  try {
    menuTree.value = await useMenuApi().fetchMenuTree(true)
    rebuild()
    expandAll()
  } catch { /* 数据已由拦截器处理 */
  } finally {
    loading.value = false
  }
}

function openAdd(parentId?: string) {
  modalRef.value?.open({ parentId, menuType: parentId ? 'C' : 'M' })
}

function openEdit(menu: Record<string, any>) {
  modalRef.value?.open(menu)
}

async function handleDelete(menu: Record<string, any>) {
  const ok = await new Promise<boolean>(resolve => {
    dialog.warning({
      title: '确认删除',
      content: `确定删除「${menu.menuName}」吗？子菜单将一并删除`,
      positiveText: '确认',
      negativeText: '取消',
      onPositiveClick: () => resolve(true),
      onNegativeClick: () => resolve(false),
    })
  })
  if (!ok) return
  await useMenuApi().deleteMenu(menu.id)
  message.success('删除成功')
  fetchTree()
}

onMounted(fetchTree)
</script>

<template>
  <n-card class="flex flex-col flex-1 min-h-0" size="small" :bordered="false" content-style="display:flex;flex-direction:column;flex:1;min-height:0;">
    <template #header>
      <div class="tree-card-header">
        <span class="tree-title">菜单管理</span>
        <div class="tree-toolbar">
          <n-button size="small" secondary @click="expandAll">展开全部</n-button>
          <n-button size="small" secondary @click="collapseAll">折叠全部</n-button>
          <n-button size="small" secondary @click="handleExportTree">
            <template #icon>
              <n-icon :component="DownloadOutline" />
            </template>
            导出
          </n-button>
          <n-button v-if="canCreateMenu" size="small" type="primary" @click="openAdd()">
            <template #icon>
              <n-icon :component="AddOutline" />
            </template>
            新增菜单
          </n-button>
        </div>
      </div>
    </template>
    <div class="flex-1 min-h-0 overflow-y-auto">
      <div v-if="loading" class="flex justify-center py-8">
        <span class="text-sm text-muted-foreground">加载中...</span>
      </div>
      <div v-else class="tree-container">
        <div v-for="node in flatNodes" :key="node.id">
          <div v-if="isVisible(node)" class="tree-node" :style="{ paddingLeft: node._depth * 24 + 'px' }">
            <button v-if="node._hasChildren" type="button" class="tree-toggle" :aria-label="`${expandedKeys.has(node.id) ? '折叠' : '展开'} ${node.menuName}`" :aria-expanded="expandedKeys.has(node.id)" @click="toggleExpand(node.id)">
              <n-icon v-if="!expandedKeys.has(node.id)" :component="ChevronForwardOutline" />
              <n-icon v-else :component="ChevronDownOutline" />
            </button>
            <span v-else class="tree-toggle placeholder" />
            <n-tag size="small" type="info">{{ menuTypeLabel(node.menuType) }}</n-tag>
            <span class="tree-label">{{ node.menuName }}</span>
            <span v-if="node.permissionCode" class="tree-meta">({{ node.permissionCode }})</span>
            <span v-if="node.path" class="tree-meta">[{{ node.path }}]</span>
            <span class="tree-actions" @click.stop>
              <n-tooltip v-if="canEditMenu" trigger="hover">
                <template #trigger>
                  <n-button quaternary size="small" circle :aria-label="`修改 ${node.menuName}`" @click="openEdit(node)">
                    <template #icon>
                      <n-icon :component="CreateOutline" />
                    </template>
                  </n-button>
                </template>
                修改
              </n-tooltip>
              <n-tooltip v-if="canCreateMenu" trigger="hover">
                <template #trigger>
                  <n-button quaternary size="small" circle :aria-label="`为 ${node.menuName} 新增子菜单`" @click="openAdd(node.id)">
                    <template #icon>
                      <n-icon :component="AddOutline" />
                    </template>
                  </n-button>
                </template>
                新增子菜单
              </n-tooltip>
              <n-tooltip v-if="canDeleteMenu" trigger="hover">
                <template #trigger>
                  <n-button quaternary size="small" circle :aria-label="`删除 ${node.menuName}`" @click="handleDelete(node)">
                    <template #icon>
                      <n-icon :component="TrashOutline" />
                    </template>
                  </n-button>
                </template>
                删除
              </n-tooltip>
            </span>
          </div>
        </div>
        <div v-if="!flatNodes.length && !loading" class="text-center py-8 text-muted-foreground">
          暂无数据
        </div>
      </div>
    </div>
  </n-card>
  <MenuFormModal ref="modalRef" @saved="fetchTree" />
</template>

<style lang="scss" scoped>
.tree-container {
  min-height: 100px;
  overflow-x: auto;
}
.tree-node {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: max-content;
  padding: 6px 8px;
  border-radius: 4px;
  transition: background-color 0.15s;
  &:hover {
    background: var(--accent);
    .tree-actions {
      opacity: 1;
    }
  }
}
.tree-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: var(--muted-foreground);
  flex-shrink: 0;
  &.placeholder {
    visibility: hidden;
  }
}
.tree-label {
  font-size: 14px;
  font-weight: 500;
}
.tree-meta {
  font-size: 12px;
  color: var(--muted-foreground);
}
.tree-actions {
  margin-left: auto;
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s;
}
.tree-node:focus-within .tree-actions { opacity: 1; }
.tree-toggle:focus-visible { border-radius: 4px; outline: 2px solid var(--ring); outline-offset: 2px; }
.tree-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}
.tree-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-width: 0;
}
.tree-title {
  flex-shrink: 0;
  font-size: 18px;
  font-weight: 600;
}

@media (max-width: 768px) {
  .tree-card-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }

  .tree-actions {
    opacity: 1;
  }

  .tree-toolbar {
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  /* 树的展开控制是原生按钮，不能绕过管理端统一的 44px 触控目标。 */
  .tree-node {
    min-height: 52px;
    padding-block: 4px;
  }

  .tree-toggle,
  .tree-toggle.placeholder {
    width: 44px;
    height: 44px;
  }
}
</style>
