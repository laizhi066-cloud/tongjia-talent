<!--
 * @description 推荐方向卡：名称、一句描述、命中 N/M、档位数、已选标记与 0 命中「暂无匹配」灰标。
 * @file src/pages/direction/components/DirectionCard.vue
-->
<script setup lang="ts">
import { computed } from 'vue'
import type { TalentDirectionItem } from '@/api/talent-types'
import { directionVisual } from '../composables/direction-utils'

const props = defineProps<{ item: TalentDirectionItem }>()

const emit = defineEmits<{ open: [] }>()

const visual = computed(() => directionVisual(props.item.name))
/** 家长视角的匹配说明，避免「命中」这类内部算法措辞。 */
const matchText = computed(() => `匹配 ${props.item.hitCount}/${props.item.total} 项`)
</script>

<template>
  <view
    class="direction-card"
    role="button"
    tabindex="0"
    :aria-label="`查看${props.item.name}方向详情`"
    @click="emit('open')"
    @keyup.enter="emit('open')"
    @keyup.space.prevent="emit('open')"
  >
    <view class="direction-card__main">
      <view
        class="direction-card__icon"
        :style="{ background: visual.bg, color: visual.color }"
        aria-hidden="true"
      >
        <wd-icon :name="visual.icon" size="22px" :color="visual.color" />
      </view>
      <view class="direction-card__body">
        <view class="direction-card__title-row">
          <text class="direction-card__name">{{ props.item.name }}</text>
          <wd-tag v-if="props.item.selected" type="primary" variant="light" size="small" round>
            已选
          </wd-tag>
          <wd-tag v-else-if="props.item.fallback" type="warning" variant="light" size="small" round>
            暂无匹配
          </wd-tag>
        </view>
        <text v-if="props.item.description" class="direction-card__desc">{{ props.item.description }}</text>
        <text class="direction-card__meta">{{ matchText }}</text>
      </view>
    </view>
    <view class="direction-card__arrow" aria-hidden="true">
      <wd-icon name="right" size="16px" color="var(--foundation-text-muted)" />
    </view>
  </view>
</template>

<style lang="scss" scoped>
.direction-card {
  display: flex;
  min-height: 82px;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4);
  box-sizing: border-box;
  border: 1px solid var(--foundation-border);
  border-radius: var(--foundation-radius);
  background: var(--foundation-card);
  box-shadow: var(--foundation-shadow);
  transition: transform 140ms ease, background-color 140ms ease;
}
.direction-card:active {
  background: var(--foundation-card-subtle);
  transform: scale(0.988);
}
.direction-card__main {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: flex-start;
  gap: var(--sp-3);
}
.direction-card__icon {
  display: flex;
  width: 44px;
  height: 44px;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4);
}
.direction-card__body {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 4px;
}
.direction-card__title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.direction-card__name {
  min-width: 0;
  overflow: hidden;
  color: var(--foundation-text);
  font-size: var(--fs-title);
  font-weight: var(--fw-semibold);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.direction-card__desc {
  display: -webkit-box;
  overflow: hidden;
  color: var(--foundation-text-secondary);
  font-size: var(--fs-caption);
  line-height: 1.6;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}
.direction-card__meta {
  color: var(--foundation-text-muted);
  font-size: var(--fs-tag);
}
.direction-card__arrow {
  display: flex;
  width: 44px;
  height: 44px;
  flex: none;
  align-items: center;
  justify-content: flex-end;
}
</style>
