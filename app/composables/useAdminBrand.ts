/**
 * @description 从单站点公开配置读取后台品牌，失败时保留应用默认图标。
 * @file app/composables/useAdminBrand.ts
 */
import { appBaseAssetPath } from '~/utils/app-base-path'

interface PublicSiteBrand {
  adminName?: string
  appName?: string
  logo?: string
}

export function useAdminBrand() {
  const fallbackFavicon = appBaseAssetPath(useRuntimeConfig().app.baseURL, '/brand/tongjia-talent-mark.svg')
  const logoText = useState('admin-brand-text', () => '同佳天赋管理后台')
  const logoIcon = useState('admin-brand-icon', () => '同')
  const logoMark = useState('admin-brand-mark', () => fallbackFavicon)
  const faviconHref = useState('admin-brand-favicon', () => fallbackFavicon)
  const fetched = useState('admin-brand-fetched', () => false)

  useHead(() => ({
    link: [{ key: 'admin-favicon', rel: 'icon', type: 'image/svg+xml', href: faviconHref.value }],
  }))

  async function loadBrand(): Promise<void> {
    if (fetched.value) return
    fetched.value = true
    try {
      // 显式窄化 $fetch 签名：后台路由 200+ 条时直接实例化全局 $fetch 重载会触发 TS2321（栈深超限）。
      const fetchSiteBrand = $fetch as unknown as (url: string) => Promise<{ data?: PublicSiteBrand }>
      const response = await fetchSiteBrand('/api/client/config/site')
      const site = response.data
      const name = site?.adminName || site?.appName
      if (name) {
        logoText.value = name
        logoIcon.value = name.slice(0, 1)
      }
      if (site?.logo && !site.logo.includes('tongjia-talent-lockup')) {
        faviconHref.value = site.logo
        logoMark.value = site.logo
      }
    } catch {
      // 公共配置未就绪时展示默认品牌。
    }
  }

  return { logoText, logoIcon, logoMark, loadBrand }
}
