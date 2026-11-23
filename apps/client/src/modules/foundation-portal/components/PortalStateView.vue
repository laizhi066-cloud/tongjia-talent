<!--
 * @description 统一状态视图：加载 / 空 / 错误（可重试）。
 *   全端只有这一套状态排版：图标胶囊 + 标题 + 一句说明 + 一个主操作，页面不再各写一套。
 * @file src/modules/foundation-portal/components/PortalStateView.vue
-->
<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  state: 'loading' | 'empty' | 'error'
  /** 状态标题（一句短语，如「暂无报告」）。 */
  title?: string
  /** 空/错状态的说明文案（说明为什么空、能做什么）。 */
  message?: string
  /** 重试按钮文案；传空串或不传则不展示操作。 */
  retryText?: string
  loadingText?: string
  /** 覆盖默认图标。 */
  icon?: string
  /** 主操作是否处理中。 */
  actionLoading?: boolean
  /** 是否使用卡片容器（默认 true，嵌入卡片内时可关掉）。 */
  card?: boolean
}>(), {
  title: '',
  message: '',
  retryText: undefined,
  loadingText: '',
  icon: '',
  actionLoading: false,
  card: true,
})

const emit = defineEmits<{ retry: [] }>()

const isError = computed(() => props.state === 'error')
const iconName = computed(() => props.icon || (isError.value ? 'no-wifi' : 'no-content'))
const titleText = computed(() => props.title || (isError.value ? '加载失败' : '暂无内容'))
const actionText = computed(() => (typeof props.retryText === 'string' && props.retryText.trim() ? props.retryText : ''))
</script>

<template>
  <view
    v-if="props.state === 'loading'"
    class="state-loading"
    role="status"
  >
    <wd-loading size="24px" color="var(--foundation-interactive)" />
    <text class="state-loading__text">{{ props.loadingText || '正在加载…' }}</text>
  </view>

  <view
    v-else
    class="state-panel"
    :class="[{ 'state-panel--card': props.card }, isError ? 'state-panel--error' : 'state-panel--empty']"
    :role="isError ? 'alert' : 'status'"
  >
    <view class="state-panel__icon" aria-hidden="true">
      <wd-icon
        :name="iconName"
        size="26px"
        :color="isError ? 'var(--foundation-danger)' : 'var(--foundation-primary-deep)'"
      />
    </view>
    <text class="state-panel__title">{{ titleText }}</text>
    <text v-if="props.message" class="state-panel__message">{{ props.message }}</text>
    <view v-if="actionText || $slots.actions" class="state-panel__actions">
      <slot name="actions">
        <wd-button
          role="button"
          tabindex="0"
          type="primary"
          size="medium"
          :loading="props.actionLoading"
          @keyup.enter="emit('retry')"
          @keyup.space.prevent="emit('retry')"
          @click="emit('retry')"
        >
          {{ actionText }}
        </wd-button>
      </slot>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.state-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  padding: var(--sp-8) var(--sp-4);
}
.state-loading__text {
  color: var(--foundation-text-muted);
  font-size: var(--fs-sm);
}
.state-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-6) var(--sp-5);
  text-align: center;
}
.state-panel--card {
  border: 1px solid var(--foundation-border);
  border-radius: var(--foundation-radius);
  background: var(--foundation-card);
  box-shadow: var(--foundation-shadow);
}
.state-panel__icon {
  display: flex;
  width: 56px;
  height: 56px;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--sp-1);
  border-radius: 18px;
  background: var(--foundation-primary-tint);
}
.state-panel--error .state-panel__icon {
  background: var(--foundation-danger-surface);
}
.state-panel__title {
  color: var(--foundation-text);
  font-size: var(--fs-title);
  font-weight: var(--fw-semibold);
  line-height: var(--lh-title);
}
.state-panel__message {
  max-width: 288px;
  color: var(--foundation-text-secondary);
  font-size: var(--fs-sm);
  line-height: var(--lh-body);
}
.state-panel__actions {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--sp-2);
  margin-top: var(--sp-3);
}
.state-panel__actions :deep(.wd-button) {
  min-width: 132px;
  flex: 0 1 auto;
}
</style>
