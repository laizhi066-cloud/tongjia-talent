/**
 * @description 管理后台列表通用 composable — 分页、选择、批量操作样板
 * @file app/composables/useAdminTable.ts
 */
import type { Component } from 'vue'
import { NButton, NDropdown, NSpace, useDialog, useMessage } from 'naive-ui'

/** 表格默认单元格渲染 — 超出省略 + hover tooltip */
export function getCellRenderer(col: Record<string, any>, row: Record<string, any>) {
  if (col.render) {
    const result = col.render(row)
    // render 返回纯字符串/数字时包裹为文本节点，避免 <component :is> 将其当作标签名解析（如数据为 "123" 时触发 InvalidCharacterError）
    if (typeof result === 'string' || typeof result === 'number') {
      return h('span', String(result))
    }
    return result
  }
  const text = row[col.key] ?? ''
  // 列有显式宽度时让 div 自适应 td；无宽度时设固定宽度以触发省略
  return h(
    'div',
    { class: 'truncate', style: col.width ? undefined : 'width:100%', title: text },
    text,
  )
}

/**
 * 操作列按钮工厂 — 全站操作列统一为「文字按钮」(quaternary tiny)。
 * 历史签名首参为图标组件，现已不再渲染图标（统一文字风格），保留参数以兼容旧调用点。
 * @param _icon 已弃用，忽略（保留以兼容旧调用）
 * @param label 按钮文字（同时作为 aria-label）
 * @param onClick 点击回调
 * @param colorClass 颜色语义：含 destructive/error/red → error(红)，含 warning → warning(橙)，其余默认
 * @param disabled 是否禁用
 */
export function actionButton(
  _icon: Component | null,
  label: string,
  onClick: () => void,
  colorClass = 'text-primary',
  disabled = false,
) {
  const type = /destructive|error|red/.test(colorClass)
    ? 'error'
    : /warning|amber|orange/.test(colorClass)
      ? 'warning'
      : 'default'
  return h(
    NButton,
    { size: 'tiny', quaternary: true, type, disabled, 'aria-label': label, onClick },
    { default: () => label },
  )
}

/** 行操作描述：用于 createActionColumn 统一渲染（含溢出收纳到「更多」） */
export interface RowAction {
  label: string
  icon?: Component // 提供则内联渲染为图标按钮(带 title)，否则文字按钮
  type?: 'default' | 'primary' | 'error' | 'warning' | 'info'
  show?: (row: any) => boolean // 条件显示
  disabled?: (row: any) => boolean
  onClick: (row: any) => void
}

/**
 * 操作列工厂 — 统一「固定右侧 + 居中 + 超过 maxInline 个收纳进『更多』下拉」。
 * @param actions 操作数组，或按行返回操作数组的函数（行内条件按钮）
 * @param opts.maxInline 内联显示上限（默认 3），其余进「更多」
 */
export function createActionColumn(
  actions: RowAction[] | ((row: any) => RowAction[]),
  opts: { maxInline?: number, width?: number, title?: string } = {},
) {
  const maxInline = opts.maxInline ?? 3
  return {
    title: opts.title ?? '操作',
    key: 'actions',
    fixed: 'right' as const,
    align: 'left' as const,
    width: opts.width ?? 150,
    render: (row: any) => {
      const list = (typeof actions === 'function' ? actions(row) : actions).filter(a => !a.show || a.show(row))
      if (!list.length) return h('span', { style: 'color:var(--muted-foreground)' }, '-')
      const inline = list.slice(0, maxInline)
      const more = list.slice(maxInline)
      // 全站操作列统一文字按钮（icon 字段已不再渲染，仅保留类型兼容）
      const nodes: any[] = inline.map(a =>
        h(NButton, { size: 'tiny', quaternary: true, type: a.type ?? 'default', disabled: a.disabled?.(row) ?? false, onClick: () => a.onClick(row) }, { default: () => a.label }),
      )
      if (more.length) {
        nodes.push(h(NDropdown, {
          trigger: 'click',
          options: more.map((a, i) => ({ label: a.label, key: String(i), disabled: a.disabled?.(row) ?? false })),
          onSelect: (k: string) => more[Number(k)]?.onClick(row),
        }, { default: () => h(NButton, { size: 'tiny', quaternary: true }, { default: () => '更多' }) }))
      }
      return h(NSpace, { size: 4, wrap: false, justify: 'start', align: 'center' }, { default: () => nodes })
    },
  }
}

/** 创建时间列定义工厂 */
export function createTimeColumn(key = 'created', title = '创建时间', width = 170) {
  return {
    title, key, width, sortable: true, sorter: 'default' as const,
    render: (row: Record<string, any>) => h('span', formatTime(row[key])),
    renderCsv: (row: Record<string, any>) => formatTime(row[key]),
  }
}

export interface AdminTableState<T = Record<string, unknown>> {
  rows: T[]
  total: number
  page: number
  pageSize: number
}

export function useAdminTable<T = Record<string, unknown>>(
  fetchFn: (params: { page: number; pageSize: number }) => Promise<PaginatedResponse<T>>,
  defaultPageSize = 10,
) {
  const message = useMessage()
  const dialog = useDialog()

  const data = ref<AdminTableState<T>>({ rows: [], total: 0, page: 1, pageSize: defaultPageSize })
  const loading = ref(false)
  const error = ref('')
  const checkedRowIds = ref<(string | number)[]>([])

  async function fetchData() {
    loading.value = true
    error.value = ''
    try {
      data.value = await fetchFn({ page: data.value.page, pageSize: data.value.pageSize })
    } catch {
      error.value = '列表数据加载失败，请检查网络或服务状态后重试。'
    } finally {
      loading.value = false
    }
  }

  function handleSearch() {
    data.value.page = 1
    checkedRowIds.value = []
    fetchData()
  }

  function handleReset() {
    data.value.page = 1
    checkedRowIds.value = []
    fetchData()
  }

  function changePage(page: number) {
    data.value.page = page
    fetchData()
  }

  function changePageSize(pageSize: number) {
    data.value.pageSize = pageSize
    data.value.page = 1
    fetchData()
  }

  function toggleRowCheck(id: string | number) {
    const idx = checkedRowIds.value.indexOf(id)
    if (idx >= 0) {
      checkedRowIds.value.splice(idx, 1)
    } else {
      checkedRowIds.value.push(id)
    }
  }

  function toggleAllCheck() {
    if (checkedRowIds.value.length === data.value.rows.length) {
      checkedRowIds.value = []
    } else {
      checkedRowIds.value = data.value.rows.map((r) => (r as any).id)
    }
  }

  const isAllChecked = computed(
    () => data.value.rows.length > 0 && checkedRowIds.value.length === data.value.rows.length,
  )

  /**
   * 批量删除 — 对选中的 ID 逐个调用 deleteUrl
   * @param deleteUrl - 删除 API 路径模板，如 `/api/admin/post/${id}`
   * @param label - 业务名称（用于确认对话框）
   */
  async function handleBatchDelete(
    deleteUrl: string | ((id: string | number) => string),
    label = '记录',
  ) {
    if (!checkedRowIds.value.length) return
    const ok = await new Promise<boolean>((resolve) => {
      dialog.warning({ title: '确认批量删除', content: `确定删除选中的 ${checkedRowIds.value.length} 条${label}吗？`, positiveText: '确认', negativeText: '取消', onPositiveClick: () => resolve(true), onNegativeClick: () => resolve(false) })
    })
    if (!ok) return
    try {
      await Promise.all(
        checkedRowIds.value.map((id) => {
          const url = typeof deleteUrl === 'function' ? deleteUrl(id) : deleteUrl
          return useApi(url, { method: 'DELETE', suppressToast: true })
        }),
      )
      message.success('批量删除成功')
      checkedRowIds.value = []
      fetchData()
    } catch {
      message.error('批量删除失败')
    }
  }

  return {
    data,
    loading,
    error,
    checkedRowIds,
    isAllChecked,
    fetchData,
    handleSearch,
    handleReset,
    changePage,
    changePageSize,
    toggleRowCheck,
    toggleAllCheck,
    handleBatchDelete,
  }
}
