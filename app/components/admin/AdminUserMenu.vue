<!--
/**
 * @description 当前后台账户菜单，提供资料页和退出登录操作。
 * @file app/components/admin/AdminUserMenu.vue
 */
-->
<script setup lang="ts">
import { ChevronDownOutline, LogOutOutline, PersonCircleOutline } from '@vicons/ionicons5'
import { NAvatar, NDropdown, NIcon } from 'naive-ui'
import { h } from 'vue'

interface AccountSummary {
  id?: string
  displayName?: string
  email?: string
  avatar?: string
}

const authSession = useAuthSession()
const user = usePBUser()
const account = computed(() => user.value as AccountSummary | null)
const displayName = computed(() => account.value?.displayName || account.value?.email || '管理员')
const avatarUrl = computed(() => {
  return account.value?.avatar ?? ''
})
const initial = computed(() => displayName.value.slice(0, 1).toUpperCase())
const dropdownOptions = [
  { label: '个人中心', key: 'profile', icon: () => h(NIcon, null, { default: () => h(PersonCircleOutline) }) },
  { label: '退出登录', key: 'signout', icon: () => h(NIcon, null, { default: () => h(LogOutOutline) }) },
]

function handleSelect(key: string): void {
  if (key === 'profile') {
    navigateTo('/admin/profile')
    return
  }
  useMonitorApi().goOffline().catch(() => undefined)
  authSession.clear()
  useAuthState().setUnauthenticated()
  navigateTo('/login')
}
</script>

<template>
  <NDropdown trigger="click" :options="dropdownOptions" @select="handleSelect">
    <button class="user-menu" type="button" aria-label="打开账户菜单">
      <NAvatar v-if="avatarUrl" :src="avatarUrl" :size="28" :alt="displayName" />
      <NAvatar v-else :size="28">{{ initial }}</NAvatar>
      <span class="user-menu__name">{{ displayName }}</span>
      <NIcon :component="ChevronDownOutline" size="14" />
    </button>
  </NDropdown>
</template>

<style lang="scss" scoped>
.user-menu { display: inline-flex; align-items: center; min-height: 44px; gap: 8px; padding: 0 6px; border: 0; background: transparent; color: var(--sidebar-foreground); cursor: pointer; }
.user-menu:focus-visible { outline: 2px solid var(--sidebar-ring); outline-offset: 2px; }
.user-menu__name { max-width: 128px; overflow: hidden; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }
@media (max-width: 640px) { .user-menu__name { display: none; } }
</style>
