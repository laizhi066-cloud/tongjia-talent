<!--
 * @description 协议文档共享阅读容器：文档图标 + 版本/生效日期 + 可滚动正文。
 * @file src/modules/foundation-portal/components/PortalDocument.vue
-->
<script setup lang="ts">
const props = defineProps<{
  content: string
  /** 文档版本与生效日期，如 `v1.0 · 2026-11-17 生效`。 */
  versionLabel?: string
}>()
</script>

<template>
  <view class="document-wrap">
    <view class="document">
      <view class="document__head">
        <view class="document__icon" aria-hidden="true">
          <wd-icon name="file" size="26px" color="var(--foundation-interactive)" />
        </view>
        <text v-if="props.versionLabel" class="document__version">{{ props.versionLabel }}</text>
      </view>
      <text class="document__content" selectable>{{ props.content }}</text>
    </view>
  </view>
</template>

<style scoped>
.document-wrap {
  padding: var(--sp-3) var(--foundation-page-padding) calc(var(--sp-5) + env(safe-area-inset-bottom));
}
.document {
  padding: var(--sp-5) var(--sp-4);
  background: var(--foundation-card);
  border: 1px solid var(--foundation-border);
  border-radius: var(--foundation-radius);
}
.document__head {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin-bottom: var(--sp-4);
}
.document__icon {
  display: flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: var(--foundation-info-surface);
}
.document__version {
  color: var(--foundation-text-muted);
  font-size: var(--fs-caption);
}
.document__content {
  display: block;
  overflow-wrap: break-word;
  color: var(--foundation-text-secondary);
  font-size: var(--fs-body-lg);
  line-height: 1.9;
  white-space: pre-wrap;
}
</style>
