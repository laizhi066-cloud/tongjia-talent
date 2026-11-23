/**
 * @description 管理后台侧边栏 — 可折叠 NMenu，从 Bootstrap API 获取菜单树 + 权限
 * @file app/components/admin/Sidebar.vue
 */
<script setup lang="ts">
import { NMenu, NIcon, NEmpty, NSkeleton } from 'naive-ui'
import { BanOutline } from '@vicons/ionicons5'
import { getAdminLandingPath } from '~/utils/admin-landing'

const collapsed = inject('sidebar-collapsed') as Ref<boolean>
// 后台品牌：优先读站点配置 adminName（运行时可改），回退构建期 env（跨组件共享）
const { logoText, logoIcon, loadBrand } = useAdminBrand()
const { getBootstrapCache } = useBootstrapCache()
const adminHomePath = computed(() => getAdminLandingPath(getBootstrapCache()))

onMounted(loadBrand)

const {
  menuOptions,
  loading,
  activeKey,
  expandedKeys,
  nMenuOptions,
  handleUpdate,
} = useMenuTree()

// 手机端抽屉：选完菜单后自动收起侧边栏（避免遮挡内容）
const mobileMenuOpen = inject('mobile-menu-open', null) as Ref<boolean> | null
function onMenuSelect(key: string) {
  handleUpdate(key)
  if (mobileMenuOpen) mobileMenuOpen.value = false
}
</script>

<template>
  <aside
    class="flex flex-col h-screen transition-all duration-200 overflow-hidden"
    :class="collapsed ? 'w-12' : 'w-55'"
    :style="{ background: 'var(--sidebar)', borderRight: '1px solid var(--sidebar-border)' }"
  >
    <!-- 头部：Logo + 标题（点击回首页）。NuxtLink 自动带 baseURL（生产在 nginx 子路径），避免硬编码 /admin 跳到域名根 404 -->
    <NuxtLink :to="adminHomePath" class="flex items-center justify-center h-16 gap-2.5 px-4 shrink-0 no-underline cursor-pointer" :style="{ borderBottom: '1px solid var(--sidebar-border)' }">
      <div
        class="flex items-center justify-center w-8.5 h-8.5 rounded-2.5 shrink-0 font-bold text-base"
        :style="{ background: 'var(--sidebar-primary)', boxShadow: '0 2px 6px color-mix(in srgb, var(--sidebar-primary) 30%, transparent)', color: 'var(--sidebar-primary-foreground)' }"
      >{{ logoIcon }}</div>
      <span
        v-if="!collapsed"
        class="text-lg font-bold tracking-wide whitespace-nowrap"
        :style="{ color: 'var(--sidebar-foreground)' }"
      >{{ logoText }}</span>
    </NuxtLink>

    <!-- 菜单区域 -->
    <nav class="flex-1 overflow-y-auto sidebar-nav">
      <template v-if="loading">
        <div class="p-3 space-y-2">
          <n-skeleton v-for="i in 5" :key="i" :width="'100%'" class="h-9" />
        </div>
      </template>

      <n-empty
        v-else-if="menuOptions.length === 0"
        description="暂无菜单权限，请联系管理员"
        size="small"
        class="py-8"
      >
        <template #icon>
          <n-icon :component="BanOutline" size="32" :style="{ color: 'var(--sidebar-foreground)' }" style="opacity:0.25;" />
        </template>
      </n-empty>

      <n-menu
        v-else
        class="admin-sidebar-menu"
        :value="activeKey"
        :collapsed="collapsed"
        :collapsed-width="48"
        :options="nMenuOptions"
        :indent="18"
        :expanded-keys="expandedKeys"
        @update:value="onMenuSelect"
        @update:expanded-keys="expandedKeys = $event"
      />
    </nav>
  </aside>
</template>

<style scoped>
.sidebar-nav::-webkit-scrollbar {
  width: 4px;
}
.sidebar-nav::-webkit-scrollbar-track {
  background: transparent;
}
.sidebar-nav::-webkit-scrollbar-thumb {
  background: var(--sidebar-border);
  border-radius: 2px;
}

:deep(.admin-sidebar-menu .n-menu-item-content--selected) {
  background: color-mix(in srgb, var(--sidebar-primary) 14%, var(--sidebar));
  box-shadow: inset 3px 0 0 var(--sidebar-primary);
  font-weight: 600;
}

:deep(.admin-sidebar-menu .n-menu-item-content--selected .n-menu-item-content-header),
:deep(.admin-sidebar-menu .n-menu-item-content--selected .n-menu-item-content__icon),
:deep(.admin-sidebar-menu .n-menu-item-content--selected .n-menu-item-content__arrow) {
  color: var(--sidebar-foreground) !important;
}
</style>
