/**
 * @description CSV 导出组合式函数 — 基于列定义生成 CSV 并触发下载
 * 自动跳过 type=selection 和 actions 列，支持嵌套 key（如 dept.deptName）
 * @file app/composables/useExport.ts
 */
// toast replaced by naive-ui useMessage

interface ExportColumn {
  title?: string
  key?: string
  type?: 'selection' | 'expand'
  children?: ExportColumn[]
  /** CSV 导出时的值转换函数（用于字典值转中文标签等），接收整行数据 */
  renderCsv?: (row: Record<string, any>) => string
}

/**
 * 解析嵌套 key，如 "dept.deptName" → row.dept.deptName
 */
function resolveValue(row: Record<string, any>, key: string): string {
  const parts = key.split('.')
  let val: any = row
  for (const part of parts) {
    if (val == null) return ''
    val = (val as Record<string, any>)[part]
  }
  return val == null ? '' : String(val)
}

/**
 * 转义 CSV 字段值（引号、逗号、换行）
 */
function escapeCsvField(val: string): string {
  if (val.includes('"') || val.includes(',') || val.includes('\n') || val.includes('\r')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}

/**
 * 扁平化列定义（处理 children 嵌套）
 */
function flattenColumns(cols: ExportColumn[]): ExportColumn[] {
  const result: ExportColumn[] = []
  for (const col of cols) {
    if (col.children) {
      result.push(...flattenColumns(col.children))
    } else {
      result.push(col)
    }
  }
  return result
}

export function useExport() {

  /**
   * 将树形数据扁平化（用于部门/菜单等树形页面的导出）
   * @param tree - 树形数据
   * @param childrenKey - 子节点字段名，默认 'children'
   */
  function flattenTree(tree: Record<string, any>[], childrenKey: string = 'children'): Record<string, any>[] {
    const result: Record<string, any>[] = []
    function walk(nodes: Record<string, any>[]) {
      for (const node of nodes) {
        const { [childrenKey]: _, ...rest } = node
        result.push(rest)
        if (node[childrenKey]?.length) {
          walk(node[childrenKey] as Record<string, any>[])
        }
      }
    }
    walk(tree)
    return result
  }

  /**
   * 导出 CSV
   * @param columns - 表格列定义
   * @param rows - 数据行
   * @param filename - 下载文件名（不含扩展名）
   */
  function exportCsv(
    columns: ExportColumn[],
    rows: Record<string, any>[],
    filename: string = 'export',
  ) {
    const flatCols = flattenColumns(columns).filter(
      (col) => col.type !== 'selection' && col.key !== 'actions',
    )

    // BOM + 表头
    const headerRow = flatCols.map((col) => escapeCsvField(col.title || col.key || '')).join(',')
    const bom = '﻿'
    let csv = bom + headerRow + '\n'

    // 数据行
    for (const row of rows) {
      const values = flatCols.map((col) => {
        if (col.renderCsv) return escapeCsvField(col.renderCsv(row))
        if (!col.key) return ''
        return escapeCsvField(resolveValue(row, col.key))
      })
      csv += values.join(',') + '\n'
    }

    // 触发下载
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  /**
   * 通用导出 handler — 调用 API 拉全量数据 → 生成 CSV → 下载
   * @param apiPath - API 路径（如 '/api/admin/user'）
   * @param columns - 表格列定义
   * @param searchParams - 当前搜索参数字段（不含分页）
   * @param filename - 下载文件名
   */
  async function handleExport(
    apiPath: string,
    columns: ExportColumn[],
    searchParams: Record<string, any> = {},
    filename: string = 'export',
  ) {
    try {
      // 先按 exportAll 取数；若后端不支持 exportAll（仅返回首页），按 total 循环翻页补齐全量。
      // 这样无需逐个改后端：支持 exportAll 的一次取完，不支持的自动翻页兜底。
      const first = await useApi(apiPath, {
        params: { ...searchParams, exportAll: '1', page: 1, pageSize: 100 },
      }) as Record<string, any>
      let rows = (first.rows as Record<string, any>[]) || []
      const total = typeof first.total === 'number' ? first.total : rows.length
      let page = 1
      // 还没取全 → 继续翻页（最多 500 页，约 5 万行，防失控）
      while (rows.length < total && page < 500) {
        page++
        const r = await useApi(apiPath, {
          params: { ...searchParams, page, pageSize: 100 },
        }) as Record<string, any>
        const more = (r.rows as Record<string, any>[]) || []
        if (!more.length) break
        rows = rows.concat(more)
      }
      if (rows.length === 0) {
        try { (window as any).$message?.warning?.('暂无数据') } catch { /* 静默处理 */ }
        return
      }
      exportCsv(columns, rows, filename)
      try { (window as any).$message?.success?.(`导出成功（${rows.length} 条）`) } catch { /* 静默处理 */ }
    } catch {
      try { (window as any).$message?.error?.('数据加载失败，请稍后重试') } catch { /* 静默处理 */ }
    }
  }

  return { exportCsv, handleExport, flattenTree }
}
