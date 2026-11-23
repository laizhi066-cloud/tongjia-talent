/**
 * @description 树形管理页共用逻辑 — 拍平(flatNodes) + 展开/折叠 + 行可见性判断。
 *   菜单管理 / 部门管理等树页共用，消除两页近乎逐字重复的树脚手架逻辑。
 * @file app/composables/useAdminTree.ts
 */
import type { Ref } from 'vue'

type Node = Record<string, any>

export function useAdminTree(treeRef: Ref<Node[]>) {
  const expandedKeys = ref<Set<string>>(new Set())
  const flatNodes = ref<Node[]>([])

  /** 深度优先拍平：附带 _depth(缩进) 与 _hasChildren(是否可展开) */
  function flattenTree(nodes: Node[], depth = 0): Node[] {
    const result: Node[] = []
    for (const node of nodes) {
      const { children, ...flatNode } = node
      // 扁平行不能继续携带 children，否则 NDataTable 会再次启用内置树，造成双箭头和重复子行。
      result.push({ ...flatNode, _depth: depth, _hasChildren: !!(children?.length) })
      if (children?.length)
        result.push(...flattenTree(children, depth + 1))
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

  function findParent(node: Node, tree: Node[]): Node | null {
    for (const n of tree) {
      if (n.children?.some((c: Node) => c.id === node.id))
        return n
      if (n.children?.length) {
        const found = findParent(node, n.children)
        if (found)
          return found
      }
    }
    return null
  }

  /** 节点是否可见：其所有祖先都处于展开态 */
  function isVisible(node: Node): boolean {
    if (node._depth === 0)
      return true
    let parent = findParent(node, treeRef.value)
    while (parent) {
      if (!expandedKeys.value.has(parent.id))
        return false
      parent = findParent(parent, treeRef.value)
    }
    return true
  }

  return { expandedKeys, flatNodes, flattenTree, rebuild, expandAll, collapseAll, toggleExpand, isVisible }
}
