<!--
 * @description 换档弹层：底部弹出档位单选项，默认预选当前档位，确认后由页面调用换档接口。
 * @file src/pages/direction/components/TierPickerPopup.vue
-->
<script setup lang="ts">
import { ref, watch } from 'vue'
import type { TalentDirectionTier } from '@/api/talent-types'
import DirectionTierList from './DirectionTierList.vue'

const props = defineProps<{
  modelValue: boolean
  tiers: TalentDirectionTier[]
  selectedTierId: string
  title?: string
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'confirm': [tierId: string]
}>()

const chosen = ref('')

/** 每次打开都重置为当前档位，避免上次未确认的选择残留。 */
watch(() => props.modelValue, (visible) => {
  if (visible)
    chosen.value = props.selectedTierId
})

function close(): void {
  if (props.loading)
    return
  emit('update:modelValue', false)
}

function confirm(): void {
  if (props.loading || !chosen.value)
    return
  emit('confirm', chosen.value)
}
</script>

<template>
  <wd-popup
    :model-value="props.modelValue"
    position="bottom"
    round
    safe-area-inset-bottom
    :close-on-click-modal="!props.loading"
    custom-class="tier-popup"
    @update:model-value="(value: boolean) => emit('update:modelValue', value)"
  >
    <view class="tier-popup__body">
      <view class="tier-popup__head">
        <text class="tier-popup__title">{{ props.title || '更换目标档位' }}</text>
        <view
          class="tier-popup__close"
          role="button"
          tabindex="0"
          aria-label="关闭"
          @click="close"
          @keyup.enter="close"
          @keyup.space.prevent="close"
        >
          <wd-icon name="close" size="18px" color="var(--foundation-text-muted)" />
        </view>
      </view>
      <view class="tier-popup__content">
        <DirectionTierList v-model="chosen" :tiers="props.tiers" :disabled="props.loading" />
      </view>
      <view class="tier-popup__actions">
        <wd-button variant="soft" size="medium" :disabled="props.loading" @click="close">
          取消
        </wd-button>
        <wd-button type="primary" size="medium" :loading="props.loading" @click="confirm">
          确认更换
        </wd-button>
      </view>
    </view>
  </wd-popup>
</template>

<style lang="scss" scoped>
.tier-popup__body {
  display: flex;
  max-height: 76vh;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-4) var(--foundation-page-padding) calc(var(--sp-3) + env(safe-area-inset-bottom));
}
.tier-popup__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
}
.tier-popup__title {
  color: var(--foundation-text);
  font-size: var(--fs-title);
  font-weight: var(--fw-semibold);
}
.tier-popup__close {
  display: flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: flex-end;
}
.tier-popup__content {
  overflow-y: auto;
}
.tier-popup__actions {
  display: flex;
  gap: var(--sp-2);
  padding-top: var(--sp-2);
  border-top: 1px solid var(--foundation-hairline);
}
.tier-popup__actions :deep(.wd-button) {
  flex: 1;
}
</style>
