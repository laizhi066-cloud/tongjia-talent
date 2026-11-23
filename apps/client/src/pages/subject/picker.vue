<!--
 * @description 切换对象页（S3）：本人 + 已绑定子女列表，写入本机对象后返回来源页。
 *   服务端不持久化「当前对象」，本页只写本机视图偏好。
 * @file src/pages/subject/picker.vue
-->
<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import PortalPageHeader from '@/modules/foundation-portal/components/PortalPageHeader.vue'
import PortalStateView from '@/modules/foundation-portal/components/PortalStateView.vue'
import { useFoundationBack } from '@/modules/foundation-portal/composables/useFoundationBack'
import { useProtectedPage } from '@/modules/foundation-portal/composables/useProtectedPage'
import { PORTAL_ROUTES } from '@/modules/foundation-portal/navigation'
import { useTalentSession } from '@/modules/talent-portal/composables/useTalentSession'
import { useTalentPortalStore } from '@/store/talent-portal'
import type { TalentSummarySubject } from '@/api/talent-types'

const store = useTalentPortalStore()
const session = useTalentSession()
const { isAuthorized } = useProtectedPage()
const { goBack } = useFoundationBack('home')

const loading = shallowRef(false)
const failed = shallowRef(false)

const subjects = computed(() => store.subjects)
const currentId = computed(() => store.current?.subjectId || '')
function relationLabelOf(subject: TalentSummarySubject): string {
  return subject.subjectType === 'child' ? '子女' : '本人'
}

/** 报告状态压缩：「该对象暂无基因报告」这类长句在列表里只留 4 个字。 */
function statusTextOf(subject: TalentSummarySubject): string {
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

/** 第二行：性别 · 年龄 · 报告状态（单行省略）。 */
function metaLineOf(subject: TalentSummarySubject): string {
  return [subject.genderLabel, subject.ageLabel, statusTextOf(subject)].filter(Boolean).join(' · ')
}

/** 拉取对象列表；家长停用时按停用页处理。 */
async function load(): Promise<void> {
  if (loading.value)
    return
  loading.value = true
  failed.value = false
  try {
    await session.ensureSession({ force: true })
    if (store.isParentDisabled) {
      uni.reLaunch({ url: `${PORTAL_ROUTES.locked}?reason=parent_disabled` })
      return
    }
    if (!store.hasSubject && store.isUnbound)
      failed.value = false
  }
  catch {
    failed.value = true
  }
  finally {
    loading.value = false
  }
}

/** 选择对象：写本机记忆后返回来源页，来源页 onShow 会用新对象重载。 */
function selectSubject(subject: TalentSummarySubject): void {
  if (subject.subjectId === currentId.value) {
    goBack()
    return
  }
  if (!store.setCurrentSubject(subject.subjectId)) {
    uni.showToast({ title: '该对象已不可查看', icon: 'none' })
    void load()
    return
  }
  uni.showToast({ title: '已切换报告对象', icon: 'success' })
  setTimeout(goBack, 200)
}

onShow(() => {
  if (isAuthorized.value)
    void load()
})
</script>

<template>
  <view v-if="isAuthorized" class="page foundation-portal-page">
    <PortalPageHeader title="切换对象" @back="goBack" />
    <view class="content">
      <PortalStateView
        v-if="loading && !subjects.length"
        state="loading"
        loading-text="正在读取报告对象…"
      />
      <PortalStateView
        v-else-if="failed"
        state="error"
        message="报告对象暂时无法读取"
        retry-text="重试"
        @retry="load"
      />
      <template v-else>
        <view class="subject-list" role="list">
          <view
            v-for="subject in subjects"
            :key="subject.subjectId"
            class="subject-row"
            :class="{ 'subject-row--current': subject.subjectId === currentId }"
            role="listitem"
            tabindex="0"
            :aria-label="`切换到${subject.name}`"
            @click="selectSubject(subject)"
            @keyup.enter="selectSubject(subject)"
            @keyup.space.prevent="selectSubject(subject)"
          >
            <wd-avatar
              :text="subject.name.slice(0, 1)"
              :size="44"
              shape="round"
              :bg-color="subject.subjectType === 'child' ? 'var(--foundation-accent-surface)' : 'var(--foundation-primary-tint)'"
              :color="subject.subjectType === 'child' ? 'var(--foundation-accent-text)' : 'var(--foundation-primary-deep)'"
            />
            <view class="subject-row__main">
              <view class="subject-row__title">
                <text class="subject-row__name">{{ subject.name }}</text>
                <text class="subject-row__relation">{{ relationLabelOf(subject) }}</text>
              </view>
              <text class="subject-row__meta">{{ metaLineOf(subject) }}</text>
            </view>
            <view
              v-if="subject.subjectId === currentId"
              class="subject-row__check"
              aria-label="当前对象"
            >
              <wd-icon name="check" size="13px" color="var(--foundation-on-primary)" />
            </view>
          </view>
        </view>

        <view v-if="!subjects.length" class="empty">
          <PortalStateView
            state="empty"
            icon="user"
            title="暂无可切换的对象"
            message="请确认手机号与后台登记一致，或联系客服核对会员档案。"
            retry-text="重新匹配"
            @retry="load"
          />
        </view>

        <text v-else class="footer-note">
          同一时间只展示一个对象的报告、建议与培养方向。
        </text>
      </template>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--foundation-background);
}
.content {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--foundation-page-padding) calc(var(--sp-5) + env(safe-area-inset-bottom));
}
.subject-list {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--foundation-border);
  border-radius: var(--foundation-radius);
  background: var(--foundation-card);
}
.subject-row {
  display: flex;
  min-height: 76px;
  align-items: center;
  gap: 14px;
  padding: 14px var(--sp-4);
  border-bottom: 1px solid var(--foundation-hairline);
  box-sizing: border-box;
}
.subject-row:last-child {
  border-bottom: 0;
}
.subject-row:active {
  background: var(--foundation-card-subtle);
}
.subject-row--current .subject-row__name {
  color: var(--foundation-primary-deep);
}
.subject-row__check {
  display: flex;
  width: 22px;
  height: 22px;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--foundation-primary);
}
.subject-row__main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}
.subject-row__title {
  display: flex;
  align-items: center;
  gap: 6px;
}
.subject-row__name {
  color: var(--foundation-text);
  font-size: var(--fs-body-lg);
  font-weight: var(--fw-semibold);
}
.subject-row__relation {
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--foundation-surface);
  color: var(--foundation-interactive);
  font-size: var(--fs-tag);
  line-height: 1.6;
}
.subject-row__meta {
  overflow: hidden;
  color: var(--foundation-text-muted);
  font-size: var(--fs-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.footer-note {
  padding: var(--sp-3) var(--sp-4) 0;
  color: var(--foundation-text-muted);
  font-size: var(--fs-tag);
  line-height: 1.6;
  text-align: center;
}
.empty {
  border: 1px solid var(--foundation-border);
  border-radius: var(--foundation-radius);
  background: var(--foundation-card);
}
</style>
