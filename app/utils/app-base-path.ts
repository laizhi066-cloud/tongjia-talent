/**
 * @description Nuxt app.baseURL 下的公开静态资源路径：根路径与子路径部署共用同一解析口径。
 * @file app/utils/app-base-path.ts
 */

/**
 * 将站内静态资源路径挂到 Nuxt 的 app.baseURL，避免子路径部署误请求域名根。
 * @param baseURL Nuxt app.baseURL（`/` 或自定义子路径）
 * @param assetPath 站内资源路径
 * @returns 以单一前导斜线开头的站内路径
 */
export function appBaseAssetPath(baseURL: string, assetPath: string): string {
  const baseSegment = String(baseURL || '').replace(/^\/+|\/+$/g, '')
  const assetSegment = String(assetPath || '').replace(/^\/+/, '')
  return `${baseSegment ? `/${baseSegment}` : ''}/${assetSegment}`
}
