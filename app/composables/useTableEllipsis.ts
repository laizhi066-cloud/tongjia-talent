/**
 * @description 表格列规整 — ① 给无固定宽度的列加 minWidth 下限，避免窄屏下被挤成 0 宽（内容竖排乱码）；
 *   ② 给纯文本列加 ellipsis+tooltip，避免内容换行撑高表格。
 * @file app/composables/useTableEllipsis.ts
 *
 * 用法：<n-data-table :columns="withEllipsis(columns)" ... />
 *
 * minWidth 是「下限」而非固定宽：宽屏有余量时列仍会自动撑开填满；窄屏列宽不足时
 * 保住下限并让表格内部横向滚动（配合 flex-height + 固定列）。selection/expand/已设 width 的列不动。
 * ellipsis 仅对「无自定义 render 的文本列」生效，避免裁剪徽标/图片/按钮等自定义单元格。
 */
const DEFAULT_MIN_WIDTH = 120

export function useTableEllipsis() {
  function withEllipsis<T extends Record<string, any>>(columns: T[]): T[] {
    if (!Array.isArray(columns)) return columns
    return columns.map((c) => {
      if (!c || c.type === 'selection' || c.type === 'expand') return c
      const out: Record<string, any> = { ...c }
      // ① 宽度下限：无 width 且无 minWidth 时补一个，防止窄屏挤成 0
      if (out.width === undefined && out.minWidth === undefined)
        out.minWidth = DEFAULT_MIN_WIDTH
      // ② 省略号：仅纯文本列（无自定义 render、非操作列）
      const isAction = out.key === 'actions' || out.title === '操作'
      if (out.ellipsis === undefined && typeof out.render !== 'function' && !isAction)
        out.ellipsis = { tooltip: true }
      return out as T
    })
  }
  return { withEllipsis }
}
