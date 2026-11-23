/**
 * @description 树形管理页共用逻辑 — 拍平(flatNodes) + 展开/折叠 + 行可见性判断。
 *   菜单管理 / 部门管理等树页共用，消除两页近乎逐字重复的树脚手架逻辑。
 * @file app/composables/useAdminTree.ts
 */
import { ref, type Ref } from 'vue'

type Node = Record<string, any>

export function useAdminTree(treeRef: Ref<Node[]>) {
  const expandedKeys = ref<Set<string>>(new Set())
  const flatNodes = ref<Node[]>([])

  /** 深度优先拍平：附带 _depth(缩进)、_hasChildren(是否可展开) 与 _ancestorIds(祖先链，避免渲染期重复全树查找) */
  function flattenTree(nodes: Node[], depth = 0, ancestorIds: string[] = []): Node[] {
    const result: Node[] = []
    for (const node of nodes) {
      const { children, ...flatNode } = node
      // 扁平行不能继续携带 children，否则 NDataTable 会再次启用内置树，造成双箭头和重复子行。
      result.push({
        ...flatNode,
        _depth: depth,
        _hasChildren: !!(children?.length),
        _ancestorIds: ancestorIds,
      })
      if (children?.length) {
        const nextAncestors = node.id != null ? [...ancestorIds, String(node.id)] : ancestorIds
        result.push(...flattenTree(children, depth + 1, nextAncestors))
      }
    }
    return result
  }

  /** 树数据变更后重建扁平列表 */
  function rebuild() {
    flatNodes.value = flattenTree(treeRef.value)
  }

  function expandAll() {
    const keys = new Set<string>()
    const collect = (nodes: Node[]) => {
      for (const node of nodes) {
        if (node.children?.length) {
          keys.add(node.id)
          collect(node.children)
        }
      }
    }
    collect(treeRef.value)
    expandedKeys.value = keys
  }

  function collapseAll() {
    expandedKeys.value = new Set()
  }

  function toggleExpand(id: string) {
    const next = new Set(expandedKeys.value)
    if (next.has(id))
      next.delete(id)
    else
      next.add(id)
    expandedKeys.value = next
  }

  /** 节点是否可见：其所有祖先都处于展开态（O(depth) 查找） */
  function isVisible(node: Node): boolean {
    if (node._depth === 0)
      return true
    const ancestors = node._ancestorIds as string[] | undefined
    if (Array.isArray(ancestors)) {
      return ancestors.every((id) => expandedKeys.value.has(id))
    }
    return true
  }

  return { expandedKeys, flatNodes, flattenTree, rebuild, expandAll, collapseAll, toggleExpand, isVisible }
}
