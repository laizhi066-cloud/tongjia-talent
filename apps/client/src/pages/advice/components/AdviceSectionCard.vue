<!--
 * @description 建议书要素卡：章节小字 + 要素名 + 数据熵标签 + 四段正文（空段不渲染）。
 * @file src/pages/advice/components/AdviceSectionCard.vue
-->
<script setup lang="ts">
import { computed } from 'vue'
import type { TalentAdviceSection } from '@/api/talent-types'
import { entropyTagType } from '../composables/advice-utils'

const props = defineProps<{ section: TalentAdviceSection }>()

type SegmentKey = 'content' | 'example' | 'direction' | 'suggestion'

/** 四段固定顺序（§7.3）；空段不渲染。 */
const SEGMENTS: ReadonlyArray<{ key: SegmentKey, label: string }> = [
  { key: 'content', label: '分级内容' },
  { key: 'example', label: '分级举例' },
  { key: 'direction', label: '培育方向' },
  { key: 'suggestion', label: '培育建议' },
]

const visibleSegments = computed(() =>
  SEGMENTS
    .map(segment => ({ ...segment, text: String(props.section[segment.key] || '').trim() }))
    .filter(segment => Boolean(segment.text)),
)

const tagType = computed(() => entropyTagType(props.section.entropy))

/** 章节名去掉内部册号字母（A–F 只在数据层使用）。 */
const chapterText = computed(() => String(props.section.chapter || '').replace(/^[A-Z]\s*/i, ''))
</script>

<template>
  <view class="section-card">
    <text v-if="chapterText" class="section-card__chapter">{{ chapterText }}</text>
    <view class="section-card__head">
      <text class="section-card__name">{{ props.section.factor }}</text>
      <wd-tag v-if="props.section.entropy" :type="tagType" variant="light" size="small" round>
        {{ props.section.entropy }}
      </wd-tag>
    </view>
    <view v-for="segment in visibleSegments" :key="segment.key" class="segment">
      <text class="segment__label">{{ segment.label }}</text>
      <text class="segment__text">{{ segment.text }}</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.section-card {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  padding: var(--sp-4);
  border: 1px solid var(--foundation-border);
  border-radius: var(--foundation-radius);
  background: var(--foundation-card);
  box-shadow: var(--foundation-shadow);
}
.section-card__chapter {
  color: var(--foundation-text-muted);
  font-size: var(--fs-tag);
  line-height: 1.5;
}
.section-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
}
.section-card__name {
  min-width: 0;
  overflow: hidden;
  color: var(--foundation-text);
  font-size: var(--fs-body-lg);
  font-weight: var(--fw-semibold);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.segment {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: var(--sp-3);
  border-top: 1px solid var(--foundation-hairline);
}
.segment:first-of-type {
  border-top: 0;
  padding-top: var(--sp-1);
}
.segment__label {
  display: inline-flex;
  align-items: center;
  color: var(--foundation-interactive);
  font-size: var(--fs-caption);
  font-weight: var(--fw-semibold);
  letter-spacing: 0.2px;
}
.segment__text {
  color: var(--foundation-text-secondary);
  font-size: var(--fs-body);
  line-height: 1.8;
  overflow-wrap: break-word;
  word-break: break-word;
}
</style>
