<!--
 * @description 建议列表分册卡：字母徽标 + 册名 + 要素/数据熵摘要 + 进入箭头。
 *   分册用 A / B / C 字母标识，不用 01 / 02 数字；可点区域整卡 64px 以上。
 * @file src/pages/advice/components/AdviceBookCard.vue
-->
<script setup lang="ts">
import { computed } from 'vue'
import { adviceBookAvailable, adviceBookStateLabel } from '@/modules/talent-portal/advice-book-state'
import { volumeLetter } from '@/modules/talent-portal/volume-label'
import type { TalentAdviceBook } from '@/api/talent-types'

const props = defineProps<{
  book: TalentAdviceBook
  /** 1 起的展示序号（由 A–F 内部键派生）；册键缺失时用它兜底换算字母。 */
  ordinal: number
  /** `N 项要素 · 数据熵…` 摘要。 */
  summary: string
}>()

const emit = defineEmits<{ open: [] }>()

const available = computed(() => adviceBookAvailable(props.book))
const stateLabel = computed(() => adviceBookStateLabel(props.book.state))

function activate(): void {
  if (available.value)
    emit('open')
}
</script>

<template>
  <view
    class="book-card portal-card"
    :class="{ 'portal-tap': available, 'book-card--disabled': !available }"
    :role="available ? 'button' : undefined"
    :tabindex="available ? 0 : undefined"
    :aria-label="available
      ? `查看${props.book.book || volumeLetter(props.ordinal)}分册建议书`
      : `${props.book.bookName}${stateLabel}`"
    @click="activate"
    @keyup.enter="activate"
    @keyup.space.prevent="activate"
  >
    <text class="book-card__no">{{ props.book.book || volumeLetter(props.ordinal) }}</text>
    <view class="book-card__main">
      <view class="book-card__title-row">
        <text class="book-card__title">{{ props.book.bookName }}</text>
        <text v-if="!available" class="book-card__tag">{{ stateLabel }}</text>
      </view>
      <text class="book-card__summary">{{ props.summary }}</text>
    </view>
    <wd-icon
      v-if="available"
      name="right"
      size="16px"
      color="var(--foundation-text-muted)"
    />
  </view>
</template>

<style lang="scss" scoped>
.book-card {
  display: flex;
  min-height: 76px;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-4);
}
.book-card--disabled {
  background: var(--foundation-card-subtle);
}
.book-card__no {
  display: flex;
  width: 30px;
  height: 30px;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: var(--foundation-primary-tint);
  color: var(--foundation-primary-deep);
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
}
.book-card--disabled .book-card__no {
  background: var(--foundation-disabled-bg);
  color: var(--foundation-text-muted);
}
.book-card__main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 3px;
}
.book-card__title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.book-card__title {
  overflow: hidden;
  color: var(--foundation-text);
  font-size: var(--fs-body-lg);
  font-weight: var(--fw-semibold);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.book-card--disabled .book-card__title {
  color: var(--foundation-text-secondary);
}
.book-card__tag {
  flex: none;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--foundation-surface);
  color: var(--foundation-text-muted);
  font-size: var(--fs-tag);
  line-height: 1.6;
}
.book-card__summary {
  overflow: hidden;
  color: var(--foundation-text-secondary);
  font-size: var(--fs-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
