<!--
/**
 * @description 基础管理后台布局：单实例导航、统一主题和会话心跳。
 * @file app/layouts/admin.vue
 */
-->
<script setup lang="ts">
import {
  darkTheme,
  NConfigProvider,
  NDialogProvider,
  NDrawer,
  NDrawerContent,
  NLoadingBarProvider,
  NMessageProvider,
  NNotificationProvider,
  NSpin,
  zhCN,
} from 'naive-ui'
import { buildNaiveOverrides } from '~/config/naive-theme'

const { authState, checkAuth, setAuthenticated, setUnauthenticated } = useAuthState()
const runtimeConfig = useRuntimeConfig()
const isMounted = ref(false)
const collapsed = ref(false)
const isMobileMenuOpen = ref(false)
const { isDark: themeDark, currentThemeId, primaryColor } = useTheme()
const { hasPermission, fetchPermissions } = usePermission()
const naiveOverrides = ref(buildNaiveOverrides(currentThemeId.value, themeDark.value, primaryColor.value))
const heartbeatInterval = ref<ReturnType<typeof setInterval> | null>(null)

const versionUpdatedAt = computed(() => formatTime(String(runtimeConfig.public.versionUpdatedAt ?? '')))

function toggleCollapsed(): void {
  collapsed.value = !collapsed.value
}

function toggleMobileMenu(): void {
  collapsed.value = false
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

watch([themeDark, currentThemeId, primaryColor], () => {
  naiveOverrides.value = buildNaiveOverrides(currentThemeId.value, themeDark.value, primaryColor.value)
})

let disposed = false

onMounted(async () => {
  isMounted.value = true
  if (authState.value === 'pending') {
    if (checkAuth()) setAuthenticated()
    else setUnauthenticated()
  }

  if (authState.value !== 'authenticated') return

  await fetchPermissions()
  if (disposed || authState.value !== 'authenticated') return

  if (hasPermission('system:dict:list')) {
    void preloadDicts([
      'sys_normal_disable',
      'sys_show_hide',
      'sys_yes_no',
      'sys_menu_type',
      'sys_data_scope',
      'sys_login_status',
      'sys_oper_status',
      'sys_oper_type',
    ])
  }

  // 在线列表仍由 RBAC 保护；每个后台账户只能维护自己的会话，因此心跳不能依赖查看全局会话的权限。
  const heartbeat = () => {
    if (disposed || authState.value !== 'authenticated') return
    void useMonitorApi().heartbeat().catch(() => undefined)
  }
  heartbeat()
  heartbeatInterval.value = setInterval(heartbeat, 5 * 60 * 1000)
})

onUnmounted(() => {
  disposed = true
  if (heartbeatInterval.value) {
    clearInterval(heartbeatInterval.value)
    heartbeatInterval.value = null
  }
})

provide('sidebar-collapsed', collapsed)
provide('toggle-sidebar', toggleCollapsed)
provide('mobile-menu-open', isMobileMenuOpen)
provide('toggle-mobile-menu', toggleMobileMenu)
</script>

<template>
  <ClientOnly>
    <NConfigProvider :theme="themeDark ? darkTheme : null" :theme-overrides="naiveOverrides" :locale="zhCN">
      <div v-if="!isMounted || authState === 'pending'" class="admin-loading">
        <NSpin size="large" description="加载中..." />
      </div>
      <template v-else-if="authState === 'authenticated'">
        <NLoadingBarProvider>
          <NMessageProvider>
            <NaiveMessageBridge />
            <NDialogProvider>
              <NNotificationProvider>
                <div class="admin-layout">
                  <NDrawer v-model:show="isMobileMenuOpen" :width="260" placement="left">
                    <NDrawerContent class="!p-0" :native-scrollbar="false" :title="undefined" closable>
                      <AdminSidebar />
                    </NDrawerContent>
                  </NDrawer>
                  <AdminSidebar class="admin-layout__sidebar" />
                  <div class="admin-layout__content">
                    <AdminTopbar />
                    <main class="admin-layout__main">
                      <div :key="$route.fullPath" class="admin-page-shell">
                        <div class="admin-page-content"><slot /></div>
                      </div>
                    </main>
                    <footer v-if="versionUpdatedAt" class="admin-footer">版本更新时间：{{ versionUpdatedAt }}</footer>
                  </div>
                </div>
              </NNotificationProvider>
            </NDialogProvider>
          </NMessageProvider>
        </NLoadingBarProvider>
      </template>
    </NConfigProvider>
    <template #fallback>
      <div class="admin-loading">加载中...</div>
    </template>
  </ClientOnly>
</template>

<style lang="scss">
.admin-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100vw;
  height: 100vh;
  background: var(--background);
  color: var(--muted-foreground);
}

.admin-layout {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: var(--background);
  color: var(--foreground);
}

.admin-layout__sidebar {
  display: none;
}

.admin-layout__content,
.admin-layout__main,
.admin-page-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.admin-page-shell {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
  padding: 24px;
}

.admin-page-content > .admin-scroll-page {
  min-height: 0;
  overflow: auto;
}

.admin-footer {
  flex: 0 0 auto;
  padding: 8px 24px;
  border-top: 1px solid var(--border);
  color: var(--muted-foreground);
  font-size: 12px;
  text-align: center;
}

@media (min-width: 1024px) {
  .admin-layout__sidebar { display: flex; }
}

@media (max-width: 640px) {
  .admin-page-shell { padding: 12px; }

  /* 管理端在窄屏仍要可单手操作：Naive 的 small/tiny 默认只有 22~28px，
     表格行操作和筛选按钮会变成难以点按的桌面尺寸。统一满足 44px 触控目标。 */
  .admin-layout .n-button {
    min-width: 44px;
    height: 44px !important;
    min-height: 44px;
  }
}
</style>
