<!--
 * @description 已选方向卡：方向名、目标档位（名称 / 师资 / 频次）、选择时间与换档 / 取消入口。
 * @file src/pages/direction/components/SelectionCard.vue
-->
<script setup lang="ts">
import { computed } from 'vue'
import type { TalentSelectionItem } from '@/api/talent-types'
import { selectedDateText } from '../composables/direction-utils'

const props = defineProps<{
  selection: TalentSelectionItem
  /** 换档操作进行中，禁止重复点击。 */
  disabled?: boolean
}>()

const emit = defineEmits<{
  changeTier: []
  cancel: []
}>()

const dateText = computed(() => selectedDateText(props.selection.selectedAt))
const tierMeta = computed(() => [props.selection.teacher, props.selection.freq].filter(Boolean).join(' · '))
</script>

<template>
  <view class="selection-card">
    <view class="selection-card__head">
      <text class="selection-card__name">{{ props.selection.directionName }}</text>
      <wd-tag v-if="props.selection.custom" type="warning" variant="light" size="small" round>
        自填
      </wd-tag>
      <wd-tag v-else type="primary" variant="light" size="small" round>
        已选
      </wd-tag>
    </view>
    <view class="selection-card__tier">
      <text class="selection-card__tier-name">目标档位 · {{ props.selection.tierName || '未设置' }}</text>
      <text v-if="tierMeta" class="selection-card__tier-meta">{{ tierMeta }}</text>
    </view>
    <text v-if="dateText" class="selection-card__date">选择时间 {{ dateText }}</text>
    <view class="selection-card__actions">
      <wd-button
        variant="soft"
        size="small"
        :disabled="props.disabled"
        @click="emit('changeTier')"
      >
        更换档位
      </wd-button>
      <wd-button
        variant="text"
        size="small"
        custom-style="--wot-button-primary-color: var(--foundation-danger)"
        :disabled="props.disabled"
        @click="emit('cancel')"
      >
        取消选择
      </wd-button>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.selection-card {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  padding: var(--sp-4);
  border: 1px solid var(--foundation-border);
  border-radius: var(--foundation-radius);
  background: var(--foundation-card);
  box-shadow: var(--foundation-shadow);
}
.selection-card__head {
  display: flex;
  align-items: center;
  gap: 6px;
}
.selection-card__name {
  min-width: 0;
  overflow: hidden;
  color: var(--foundation-text);
  font-size: var(--fs-title);
  font-weight: var(--fw-semibold);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.selection-card__tier {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 14px;
  border: 1px solid var(--foundation-hairline);
  border-radius: var(--foundation-radius-sm);
  background: var(--foundation-card-subtle);
}
.selection-card__tier-name {
  color: var(--foundation-text);
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
}
.selection-card__tier-meta {
  color: var(--foundation-text-secondary);
  font-size: var(--fs-caption);
}
.selection-card__date {
  color: var(--foundation-text-muted);
  font-size: var(--fs-tag);
}
.selection-card__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--sp-2);
  margin-top: var(--sp-1);
}
.selection-card__actions :deep(.wd-button) {
  min-width: 96px;
}
</style>
