<!--
 * @description 账户头像：有照片显示照片，无照片显示实心人形剪影（头 + 肩），
 *   比线条描边图标更像一个真实的默认头像。纯 CSS 绘制，不依赖图标字形或外部图片。
 * @file src/modules/foundation-portal/components/PortalAvatar.vue
-->
<script setup lang="ts">
withDefaults(defineProps<{
  src?: string
  size?: number
  /** 剪影与底色的配色；默认深绿底 + 白剪影。 */
  bg?: string
  color?: string
}>(), {
  src: '',
  size: 56,
  bg: 'var(--foundation-primary)',
  color: 'var(--foundation-on-primary)',
})
</script>

<template>
  <view
    class="portal-avatar"
    :style="{ width: `${size}px`, height: `${size}px`, background: bg, color }"
  >
    <image v-if="src" class="portal-avatar__img" :src="src" mode="aspectFill" />
    <view v-else class="portal-avatar__silhouette" aria-hidden="true">
      <view class="portal-avatar__head" />
      <view class="portal-avatar__body" />
    </view>
  </view>
</template>

<style lang="scss" scoped>
.portal-avatar {
  position: relative;
  display: flex;
  flex: none;
  overflow: hidden;
  align-items: flex-end;
  justify-content: center;
  border-radius: 50%;
}
.portal-avatar__img {
  width: 100%;
  height: 100%;
}
/* 实心人形剪影：圆头 + 半圆肩，currentColor 由容器 color 控制。 */
.portal-avatar__silhouette {
  position: absolute;
  inset: 0;
}
.portal-avatar__head {
  position: absolute;
  top: 24%;
  left: 50%;
  width: 30%;
  height: 30%;
  border-radius: 50%;
  background: currentColor;
  transform: translateX(-50%);
}
.portal-avatar__body {
  position: absolute;
  bottom: -18%;
  left: 50%;
  width: 66%;
  height: 52%;
  border-radius: 50% 50% 0 0;
  background: currentColor;
  transform: translateX(-50%);
}
</style>
