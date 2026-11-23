<!--
 * @description 待实现页面占位：用于 M7-B/C/D/E 尚未交付的二级页，保证路由与返回栈可用，
 *   并明确标注进度，不伪造内容。
 * @file src/modules/talent-portal/components/PendingPage.vue
-->
<script setup lang="ts">
import { goBackOr, switchTab } from '@/modules/foundation-portal/navigation'
import type { PortalTab } from '@/modules/foundation-portal/navigation'

const props = defineProps<{
  /** 页面名称，用于说明文案。 */
  title: string
  /** 交付里程碑，如 M7-C。 */
  milestone: string
  /** 一句话说明该页将提供的能力。 */
  description?: string
  /** 返回时回落的主栏。 */
  fallbackTab?: PortalTab
}>()

/** 返回来源页；栈深为 1 时回落到所属主栏。 */
function goBack(): void {
  goBackOr(props.fallbackTab || 'home')
}

/** 直接回首页，避免占位页成为死路。 */
function goHome(): void {
  switchTab('home')
}
</script>

<template>
  <view class="pending">
    <view class="pending__icon" aria-hidden="true">
      <wd-icon name="no-content" size="30px" color="var(--foundation-text-muted)" />
    </view>
    <text class="pending__title">{{ props.title }}</text>
    <text class="pending__desc">
      {{ props.description || '该页面正在按新结构接入，当前为占位页。' }}
    </text>
    <view class="pending__badge">
      <text class="pending__badge-text">未完成 · 待 {{ props.milestone }} 交付</text>
    </view>
    <view class="pending__actions">
      <wd-button type="primary" variant="soft" size="medium" @click="goBack">
        返回
      </wd-button>
      <wd-button type="primary" variant="text" size="medium" @click="goHome">
        回首页
      </wd-button>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.pending {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
  padding: 56px var(--sp-5) var(--sp-5);
  text-align: center;
}
.pending__icon {
  display: flex;
  width: 64px;
  height: 64px;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
  background: var(--foundation-surface);
}
.pending__title {
  margin-top: var(--sp-2);
  color: var(--foundation-text);
  font-size: var(--fs-title-lg);
  font-weight: var(--fw-semibold);
}
.pending__desc {
  max-width: 320px;
  color: var(--foundation-text-secondary);
  font-size: var(--fs-sm);
  line-height: 1.7;
}
.pending__badge {
  margin-top: var(--sp-2);
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--foundation-warning-surface);
}
.pending__badge-text {
  color: var(--foundation-warning);
  font-size: var(--fs-tag);
}
.pending__actions {
  display: flex;
  width: min(100%, 320px);
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  margin-top: var(--sp-4);
}
</style>
