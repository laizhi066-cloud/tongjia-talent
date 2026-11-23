<!--
/**
 * @description 后台根路径统一跳转至会员管理。
 * @file app/pages/admin/index.vue
 */
-->
<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['auth', 'permission-guard'] })

const { getBootstrapCache, setBootstrapCache } = useBootstrapCache()

onMounted(async () => {
  const bootstrap = getBootstrapCache() ?? await useBootstrapApi().fetchBootstrap().then((data) => {
    setBootstrapCache(data)
    return data
  }).catch(() => null)
  await navigateTo(getAdminLandingPath(bootstrap), { replace: true })
})
</script>

<template><div /></template>
