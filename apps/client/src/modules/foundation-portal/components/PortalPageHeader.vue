<!--
 * @description C 端二级页统一页头：返回 + 居中标题 + 右侧动作（委托 PortalNavBar）。
 *   返回热区 44px；主栏 4 页用微信原生导航，不经过这里。
 * @file src/modules/foundation-portal/components/PortalPageHeader.vue
-->
<script setup lang="ts">
import PortalNavBar from './PortalNavBar.vue'

const props = defineProps<{ title: string }>()
const emit = defineEmits<{ back: [] }>()
</script>

<template>
  <PortalNavBar :title="props.title" @back="emit('back')">
    <template #right>
      <slot name="right" />
    </template>
  </PortalNavBar>
</template>
