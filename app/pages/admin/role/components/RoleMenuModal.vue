<!--
/**
 * @description 角色菜单授权弹窗 — 树形勾选菜单/权限，保存角色可访问的菜单集合
 * @file app/pages/admin/role/components/RoleMenuModal.vue
 */
-->
<script setup lang="ts">
import { NModal, NTree, NButton, useMessage } from 'naive-ui'

const message = useMessage()

interface MenuNode {
  id: string
  menuName: string
  menuType: string
  parentId?: string | null
  children?: MenuNode[]
  [key: string]: any
}

const show = ref(false)
const saving = ref(false)
const currentRole = ref<Record<string, any> | null>(null)

const menuTree = ref<MenuNode[]>([])
const checkedKeys = ref<string[]>([])
const expandedKeys = ref<string[]>([])

const treePattern = computed(() => {
  function mapNodes(nodes: MenuNode[]): any[] {
    return nodes.map(n => ({
      label: n.menuName,
      key: n.id,
      children: n.children?.length ? mapNodes(n.children) : undefined,
    }))
  }
  return mapNodes(menuTree.value)
})

/** 从树中查找节点，并自下而上补齐父节点选中状态 */
function computeSelectedKeys(tree: MenuNode[], ids: string[]): string[] {
  const parentChildren = new Map<string, MenuNode[]>()

  function collect(items: MenuNode[]) {
    for (const item of items) {
      if (item.children?.length) {
        parentChildren.set(item.id, item.children)
        collect(item.children)
      }
    }
  }
  collect(tree)

  const selected = new Set(ids)

  function isEffectivelySelected(id: string): boolean {
    if (selected.has(id)) return true
    const children = parentChildren.get(id)
    if (!children?.length) return false
    return children.every(c => isEffectivelySelected(c.id))
  }

  let changed = true
  while (changed) {
    changed = false
    for (const [id, children] of parentChildren) {
      if (selected.has(id)) continue
      if (children.every(c => isEffectivelySelected(c.id))) {
        selected.add(id)
        changed = true
      }
    }
  }

  return Array.from(selected)
}

function collectIds(tree: MenuNode[], acc: string[] = []) {
  for (const item of tree) {
    acc.push(item.id)
    if (item.children?.length) collectIds(item.children, acc)
  }
  return acc
}

async function open(role: Record<string, any>) {
  currentRole.value = role
  show.value = true

  const [tree, detail] = await Promise.all([
    useMenuApi().fetchMenuTree(true),
    useRoleApi().getRole(role.id),
  ])
  menuTree.value = tree
  checkedKeys.value = computeSelectedKeys(tree, detail.menuIds || [])
  expandedKeys.value = collectIds(tree)
}

async function handleSave() {
  saving.value = true
  try {
    await useRoleApi().assignMenus(
      currentRole.value!.id,
      checkedKeys.value,
    )
    message.success('菜单权限分配成功')
    show.value = false
  } catch {
    /* 全局拦截器已弹出错误提示 */
  } finally {
    saving.value = false
  }
}

defineExpose({ open })
</script>

<template>
  <n-modal v-model:show="show" preset="card" style="width:640px" title="分配菜单权限" :bordered="false" size="small">
    <p class="mb-4 text-sm text-muted-foreground">为角色分配菜单权限，勾选的菜单将对该角色可见</p>
    <template v-if="currentRole">
      <p class="mb-3 text-sm text-muted-foreground">
        为角色「{{ currentRole.roleName }}」分配菜单权限
      </p>
      <div class="max-h-80 overflow-y-auto rounded-md border p-2">
        <n-tree
          :data="treePattern"
          :checked-keys="checkedKeys"
          :default-expanded-keys="expandedKeys"
          checkable
          multiple
          cascade
          check-strategy="all"
          @update:checked-keys="checkedKeys = $event"
        />
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-3">
        <n-button @click="show = false">取消</n-button>
        <n-button type="primary" :loading="saving" @click="handleSave">保存</n-button>
      </div>
    </template>
  </n-modal>
</template>
