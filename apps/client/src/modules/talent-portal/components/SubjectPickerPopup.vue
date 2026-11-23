<!--
 * @description 报告对象底部半屏切换浮层（ActionSheet/Popup）。
 *   在当前页面直接唤起，无需整页跳转；支持单选对勾、状态标签、轻震动反馈。
 * @file src/modules/talent-portal/components/SubjectPickerPopup.vue
 -->
<script setup lang="ts">
import { computed } from 'vue'
import { openPage, PORTAL_ROUTES } from '@/modules/foundation-portal/navigation'
import { useTalentPortalStore } from '@/store/talent-portal'
import { triggerHaptic } from '@/utils/haptics'
import type { TalentSummarySubject } from '@/api/talent-types'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [visible: boolean]
  'change': [subject: TalentSummarySubject]
}>()

const store = useTalentPortalStore()

const subjects = computed(() => store.subjects)
const currentId = computed(() => store.current?.subjectId || '')

function close(): void {
  emit('update:visible', false)
}

function relationLabel(subject: TalentSummarySubject): string {
  return subject.subjectType === 'child' ? '子女' : '本人'
}

function statusTag(subject: TalentSummarySubject): string {
  const raw = String(subject.statusText || '').trim()
  if (!raw)
    return ''
  if (raw.includes('册'))
    return raw
  if (raw.includes('整理'))
    return '整理中'
  if (raw.includes('更新'))
    return '更新中'
  if (raw.includes('暂无') || raw.includes('未') || raw.includes('待同步'))
    return '暂无报告'
  return raw
}

function select(subject: TalentSummarySubject): void {
  triggerHaptic('light')
  if (subject.subjectId !== currentId.value) {
    if (store.setCurrentSubject(subject.subjectId)) {
      uni.showToast({ title: `已切换至 ${subject.name}`, icon: 'none', duration: 1500 })
      emit('change', subject)
    }
  }
  close()
}

function manageChildren(): void {
  close()
  openPage(PORTAL_ROUTES.profileChildren)
}
</script>

<template>
  <wd-popup
    :model-value="props.visible"
    position="bottom"
    round
    closable
    custom-class="subject-popup"
    @close="close"
  >
    <view class="subject-sheet">
      <view class="subject-sheet__head">
        <text class="subject-sheet__title">切换报告对象</text>
        <text class="subject-sheet__desc">选择后将展示对应宝贝的潜质报告与培育建议</text>
      </view>

      <view class="subject-list">
        <view
          v-for="sub in subjects"
          :key="sub.subjectId"
          class="subject-item"
          :class="{ 'is-selected': sub.subjectId === currentId }"
          role="button"
          tabindex="0"
          :aria-label="`选择${sub.name}`"
          @click="select(sub)"
        >
          <wd-avatar
            :text="sub.name.slice(0, 1)"
            :size="40"
            shape="round"
            :bg-color="sub.subjectId === currentId ? 'var(--foundation-primary)' : 'var(--foundation-surface)'"
            :color="sub.subjectId === currentId ? 'var(--foundation-on-primary)' : 'var(--foundation-text-secondary)'"
          />

          <view class="subject-item__info">
            <view class="subject-item__row">
              <text class="subject-item__name">{{ sub.name }}</text>
              <wd-tag
                size="small"
                :type="sub.subjectType === 'child' ? 'primary' : 'default'"
                variant="light"
                round
              >
                {{ relationLabel(sub) }}
              </wd-tag>
            </view>
            <text class="subject-item__meta">
              {{ [sub.genderLabel, sub.ageLabel, statusTag(sub)].filter(Boolean).join(' · ') }}
            </text>
          </view>

          <view class="subject-item__check">
            <wd-icon
              v-if="sub.subjectId === currentId"
              name="check"
              size="20px"
              color="var(--foundation-primary)"
            />
          </view>
        </view>
      </view>

      <view class="subject-sheet__foot">
        <view class="manage-btn" role="button" tabindex="0" @click="manageChildren">
          <wd-icon name="user-group" size="16px" color="var(--foundation-primary)" />
          <text class="manage-btn__text">管理孩子档案</text>
        </view>
      </view>
    </view>
  </wd-popup>
</template>

<style lang="scss" scoped>
.subject-sheet {
  display: flex;
  flex-direction: column;
  padding: var(--sp-4) var(--sp-4) calc(var(--sp-4) + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.subject-sheet__head {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-bottom: var(--sp-3);
  border-bottom: 1px solid var(--foundation-hairline);
}

.subject-sheet__title {
  color: var(--foundation-text);
  font-size: var(--fs-title-lg);
  font-weight: var(--fw-bold);
}

.subject-sheet__desc {
  color: var(--foundation-text-muted);
  font-size: var(--fs-caption);
}

.subject-list {
  display: flex;
  max-height: 52vh;
  flex-direction: column;
  gap: var(--sp-2);
  padding: var(--sp-3) 0;
  overflow-y: auto;
}

.subject-item {
  display: flex;
  min-height: 64px;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-3);
  box-sizing: border-box;
  border: 1.5px solid var(--foundation-border);
  border-radius: var(--foundation-radius-sm);
  background: var(--foundation-card);
  transition: transform 140ms ease, background-color 140ms ease, border-color 140ms ease;
}

.subject-item:active {
  transform: scale(0.985);
  background: var(--foundation-card-subtle);
}

.subject-item.is-selected {
  border-color: var(--foundation-primary);
  background: var(--foundation-primary-tint);
}

.subject-item__info {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 3px;
}

.subject-item__row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.subject-item__name {
  color: var(--foundation-text);
  font-size: var(--fs-body-lg);
  font-weight: var(--fw-semibold);
}

.subject-item__meta {
  color: var(--foundation-text-muted);
  font-size: var(--fs-caption);
}

.subject-item__check {
  display: flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
}

.subject-sheet__foot {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: var(--sp-2);
  border-top: 1px solid var(--foundation-hairline);
}

.manage-btn {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  gap: 6px;
  padding: 0 16px;
  color: var(--foundation-primary);
  font-size: var(--fs-sm);
  font-weight: var(--fw-medium);
}
</style>
