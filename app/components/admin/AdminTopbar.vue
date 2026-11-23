<!--
/**
 * @description 基础管理后台顶栏：导航、主题、全屏和账户菜单。
 * @file app/components/admin/AdminTopbar.vue
 */
-->
<script setup lang="ts">
import { ContractOutline, ExpandOutline, MenuOutline, MoonOutline, SettingsOutline, SunnyOutline } from '@vicons/ionicons5'
import { NButton, NIcon, NTooltip } from 'naive-ui'
import { getAdminLandingPath } from '~/utils/admin-landing'

const collapsed = inject<Ref<boolean>>('sidebar-collapsed', ref(false))
const toggleSidebar = inject<() => void>('toggle-sidebar', () => undefined)
const toggleMobileMenu = inject<() => void>('toggle-mobile-menu', () => undefined)
const { isBelowDesktop } = useResponsive()
const { isDark, toggleDark } = useTheme()
const { logoText, logoIcon, loadBrand } = useAdminBrand()
const { roles, fetchPermissions } = usePermission()
const isFullscreen = ref(false)
const isSuper = computed(() => roles.value.includes('superadmin'))
// 主题端点以 superadmin 为唯一授权条件；UI 与服务端保持一致，避免超级管理员失去可见入口。
const canUpdateTheme = isSuper
const { getBootstrapCache } = useBootstrapCache()
const adminHomePath = computed(() => getAdminLandingPath(getBootstrapCache()))
const route = useRoute()
const currentMenuLabel = computed(() => {
  const cache = getBootstrapCache() as { menuTree?: Array<{ label?: string; path?: string; children?: Array<{ path?: string; label?: string }> }> } | null
  for (const node of cache?.menuTree || []) {
    if (node.path === route.path) return node.label || ''
    if ((node.children || []).some((child) => child.path === route.path))
      return node.label || ''
  }
  return ''
})

const sidebarLabel = computed(() => isBelowDesktop.value
  ? '打开导航菜单'
  : collapsed.value ? '展开侧边栏' : '折叠侧边栏')
const themeLabel = computed(() => `切换至${isDark.value ? '亮色' : '暗色'}模式`)
const fullscreenLabel = computed(() => isFullscreen.value ? '退出全屏' : '全屏显示')

function toggleFullscreen(): void {
  if (document.fullscreenElement) {
    document.exitFullscreen()
  } else {
    document.documentElement.requestFullscreen()
  }
}

function syncFullscreenState(): void {
  isFullscreen.value = Boolean(document.fullscreenElement)
}

onMounted(() => {
  void loadBrand()
  void fetchPermissions()
  document.addEventListener('fullscreenchange', syncFullscreenState)
})

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', syncFullscreenState)
})
</script>

<template>
  <header class="admin-topbar">
    <div class="admin-topbar__start">
      <NButton class="admin-topbar__icon-action" quaternary circle size="small" :aria-label="sidebarLabel" @click="isBelowDesktop ? toggleMobileMenu() : toggleSidebar()">
        <NIcon :component="MenuOutline" size="18" />
      </NButton>
      <span v-if="currentMenuLabel" class="admin-topbar__current">{{ currentMenuLabel }}</span>
      <NuxtLink :to="adminHomePath" class="admin-topbar__brand">
        <span class="admin-topbar__brand-icon">{{ logoIcon }}</span>
        <span class="admin-topbar__brand-name">{{ logoText }}</span>
      </NuxtLink>
    </div>
    <div class="admin-topbar__actions">
      <NTooltip v-if="canUpdateTheme" trigger="hover">
        <template #trigger>
          <NButton class="admin-topbar__icon-action" quaternary circle size="small" :aria-label="themeLabel" @click="toggleDark">
            <NIcon :component="isDark ? MoonOutline : SunnyOutline" size="18" />
          </NButton>
        </template>
        {{ themeLabel }}
      </NTooltip>
      <NTooltip v-if="isSuper" trigger="hover">
        <template #trigger>
          <NButton class="admin-topbar__icon-action" quaternary circle size="small" aria-label="站点配置" @click="navigateTo('/admin/site-config')">
            <NIcon :component="SettingsOutline" size="18" />
          </NButton>
        </template>
        站点配置
      </NTooltip>
      <NTooltip trigger="hover">
        <template #trigger>
          <NButton class="admin-topbar__icon-action" quaternary circle size="small" :aria-label="fullscreenLabel" @click="toggleFullscreen">
            <NIcon :component="isFullscreen ? ContractOutline : ExpandOutline" size="18" />
          </NButton>
        </template>
        {{ fullscreenLabel }}
      </NTooltip>
      <AdminUserMenu />
    </div>
  </header>
</template>

<style lang="scss" scoped>
.admin-topbar {
  display: flex;
  flex: 0 0 56px;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid var(--sidebar-border);
  background: var(--sidebar);
}

.admin-topbar__start,
.admin-topbar__actions,
.admin-topbar__brand {
  display: flex;
  align-items: center;
}

.admin-topbar__actions { gap: 4px; }
.admin-topbar__brand { gap: 10px; margin-left: 8px; color: var(--sidebar-foreground); text-decoration: none; }
.admin-topbar__current { margin-left: 4px; color: var(--foreground); font-size: 14px; font-weight: 600; }
.admin-topbar__brand-icon { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 9px; background: var(--sidebar-primary); color: var(--sidebar-primary-foreground); font-weight: 700; }
.admin-topbar__brand-name { font-size: 15px; font-weight: 700; }

@media (min-width: 1024px) {
  /* 侧栏已有品牌，顶栏不再重复品牌，减少首屏噪声。 */
  .admin-topbar__brand { display: none; }
}

@media (max-width: 640px) {
  .admin-topbar__current { display: none; }
}

@media (max-width: 640px) {
  .admin-topbar { padding: 0 12px; }
  .admin-topbar__brand-name { display: none; }
  .admin-topbar .admin-topbar__icon-action {
    width: 44px !important;
    min-width: 44px;
    height: 44px !important;
    min-height: 44px;
  }
}
</style>
