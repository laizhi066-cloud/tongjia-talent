<!--
 * @description 二次确认弹层：支持「我已了解」勾选门禁（注销账号）与危险操作样式。
 *   Wot 2.2.0 的 `wd-dialog` 只支持函数式调用（声明式 props 不生效），这里用 `wd-popup`
 *   自绘确认弹层，保留原有 `v-model` / `@confirm` 调用方式与 loading 态。
 * @file src/modules/foundation-portal/components/PortalConfirmDialog.vue
-->
<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  modelValue: boolean
  title: string
  confirmText?: string
  cancelText?: string
  /** 危险操作（注销）使用破坏性色。 */
  danger?: boolean
  /** 勾选门禁文案；传入后未勾选不可确认。 */
  acknowledgeText?: string
  /** 提交中：按钮 loading 并防重复。 */
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'confirm': []
}>()

const acknowledged = ref(false)

/** 每次打开重置勾选，避免上次状态被误认为本次确认。 */
watch(() => props.modelValue, (visible) => {
  if (visible)
    acknowledged.value = false
})

const confirmType = computed(() => props.danger ? 'danger' : 'primary')
const confirmLabel = computed(() => props.confirmText || '确认')
const cancelLabel = computed(() => props.cancelText || '取消')

/** 关闭弹层；提交中禁止关闭，避免请求与界面状态脱节。 */
function close(): void {
  if (props.loading)
    return
  emit('update:modelValue', false)
}

/** 未勾选门禁时拦截确认。 */
function confirm(): void {
  if (props.loading)
    return
  if (props.acknowledgeText && !acknowledged.value) {
    uni.showToast({ title: '请先勾选确认项', icon: 'none' })
    return
  }
  emit('confirm')
}
</script>

<template>
  <wd-popup
    :model-value="props.modelValue"
    position="center"
    :close-on-click-modal="false"
    :z-index="500"
    custom-class="portal-confirm-dialog"
    custom-style="width: 320px; max-width: calc(100vw - 48px); background: var(--foundation-card); border-radius: 16px;"
    @update:model-value="(value: boolean) => emit('update:modelValue', value)"
  >
    <view class="portal-confirm" role="dialog" aria-modal="true" :aria-label="props.title">
      <text class="portal-confirm__title">{{ props.title }}</text>
      <view class="portal-confirm__body">
        <slot />
        <view v-if="props.acknowledgeText" class="portal-confirm__acknowledge">
          <wd-checkbox v-model="acknowledged" :disabled="props.loading" checked-color="var(--foundation-danger)">
            <text class="portal-confirm__acknowledge-text">{{ props.acknowledgeText }}</text>
          </wd-checkbox>
        </view>
      </view>
      <view class="portal-confirm__actions">
        <wd-button
          variant="soft"
          size="medium"
          :disabled="props.loading"
          custom-class="portal-confirm__btn"
          @click="close"
        >
          {{ cancelLabel }}
        </wd-button>
        <wd-button
          :type="confirmType"
          size="medium"
          :loading="props.loading"
          custom-class="portal-confirm__btn"
          @click="confirm"
        >
          {{ confirmLabel }}
        </wd-button>
      </view>
    </view>
  </wd-popup>
</template>

<style lang="scss" scoped>
.portal-confirm {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-4);
}
.portal-confirm__title {
  color: var(--foundation-text);
  font-size: var(--fs-title);
  font-weight: var(--fw-semibold);
  text-align: center;
}
.portal-confirm__body {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  color: var(--foundation-text-secondary);
  font-size: var(--fs-sm);
  line-height: 1.6;
}
.portal-confirm__acknowledge {
  margin-top: var(--sp-1);
  text-align: left;
}
.portal-confirm__acknowledge-text {
  color: var(--foundation-text-secondary);
  font-size: var(--fs-sm);
  line-height: 1.5;
}
.portal-confirm__actions {
  display: flex;
  gap: var(--sp-2);
  padding-top: var(--sp-2);
  border-top: 1px solid var(--foundation-hairline);
}
.portal-confirm__actions :deep(.portal-confirm__btn) {
  flex: 1;
  min-height: 44px;
}
</style>
