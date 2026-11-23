<!--
 * @description C 端二级页顶部导航：Wot `wd-navbar` + 44px 返回热区 + 居中标题 + 可选右侧动作。
 *   4 个主栏页改用微信原生导航（`pages.json` 逐页 `navigationStyle: default` + 页面标题），
 *   这里只保留带返回的二级页形态；状态栏与胶囊避让交给 `wd-navbar` 的 safe-area。
 * @file src/modules/foundation-portal/components/PortalNavBar.vue
-->
<script setup lang="ts">
const props = withDefaults(defineProps<{
  /** 居中标题（页面名，不带品牌名与副标题）。 */
  title?: string
}>(), {
  title: '',
})

const emit = defineEmits<{ back: [] }>()
</script>

<template>
  <wd-navbar
    :title="props.title"
    fixed
    placeholder
    safe-area-inset-top
    custom-class="foundation-portal-navbar"
  >
    <template #left>
      <view
        class="nav-back"
        role="button"
        tabindex="0"
        aria-label="返回"
        @click="emit('back')"
        @keyup.enter="emit('back')"
        @keyup.space.prevent="emit('back')"
      >
        <wd-icon name="left" size="20px" color="var(--foundation-text)" />
      </view>
    </template>
    <template #right>
      <slot name="right" />
    </template>
  </wd-navbar>
</template>

<style lang="scss" scoped>
.nav-back {
  display: flex;
  width: 44px;
  height: 44px;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
}
.nav-back:active {
  background: var(--foundation-card-subtle);
}
</style>
