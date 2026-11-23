<!--
 * @description 培养目标（档位）单选列表：名称 / 师资 / 频次 / 一句话卖点，默认档位预选。
 * @file src/pages/direction/components/DirectionTierList.vue
-->
<script setup lang="ts">
import type { TalentDirectionTier } from '@/api/talent-types'

const props = defineProps<{
  tiers: TalentDirectionTier[]
  modelValue: string
  disabled?: boolean
  emptyText?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

/** 点击档位卡：禁用态或重复选中不触发。 */
function select(tier: TalentDirectionTier): void {
  if (props.disabled || tier.tierId === props.modelValue)
    return
  emit('update:modelValue', tier.tierId)
}
</script>

<template>
  <view v-if="props.tiers.length" class="tier-list" role="radiogroup" aria-label="选择培养目标">
    <view
      v-for="tier in props.tiers"
      :key="tier.tierId"
      class="tier-card"
      :class="{ 'tier-card--active': tier.tierId === props.modelValue, 'tier-card--disabled': props.disabled }"
      role="radio"
      tabindex="0"
      :aria-checked="tier.tierId === props.modelValue"
      :aria-disabled="props.disabled ? 'true' : 'false'"
      @click="select(tier)"
      @keyup.enter="select(tier)"
      @keyup.space.prevent="select(tier)"
    >
      <view class="tier-card__main">
        <view class="tier-card__title-row">
          <text class="tier-card__name">{{ tier.name }}</text>
          <wd-tag v-if="tier.default" type="success" variant="light" size="small" round>
            默认
          </wd-tag>
        </view>
        <text v-if="tier.teacher || tier.freq" class="tier-card__meta">
          {{ [tier.teacher, tier.freq].filter(Boolean).join(' · ') }}
        </text>
        <text v-if="tier.headline" class="tier-card__headline">{{ tier.headline }}</text>
      </view>
      <view class="tier-card__check" aria-hidden="true">
        <wd-icon
          v-if="tier.tierId === props.modelValue"
          name="check"
          size="18px"
          color="var(--foundation-interactive)"
        />
      </view>
    </view>
  </view>
  <view v-else class="tier-empty">
    <text class="tier-empty__text">{{ props.emptyText || '暂未开放培养目标' }}</text>
  </view>
</template>

<style lang="scss" scoped>
.tier-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}
.tier-card {
  display: flex;
  min-height: 64px;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4);
  box-sizing: border-box;
  border: 1px solid var(--foundation-border);
  border-radius: var(--foundation-radius-sm);
  background: var(--foundation-card);
}
.tier-card--active {
  border-color: var(--foundation-interactive);
  background: var(--foundation-surface);
}
.tier-card--disabled {
  opacity: 0.6;
}
.tier-card__main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}
.tier-card__title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.tier-card__name {
  color: var(--foundation-text);
  font-size: var(--fs-body-lg);
  font-weight: var(--fw-semibold);
}
.tier-card__meta {
  color: var(--foundation-text-secondary);
  font-size: var(--fs-caption);
}
.tier-card__headline {
  color: var(--foundation-text-muted);
  font-size: var(--fs-tag);
  line-height: 1.5;
}
.tier-card__check {
  display: flex;
  width: 44px;
  height: 44px;
  flex: none;
  align-items: center;
  justify-content: flex-end;
}
.tier-empty {
  padding: var(--sp-4);
  border: 1px dashed var(--foundation-border);
  border-radius: var(--foundation-radius-sm);
  text-align: center;
}
.tier-empty__text {
  color: var(--foundation-text-muted);
  font-size: var(--fs-sm);
}
</style>
