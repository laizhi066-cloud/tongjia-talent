<!--
 * @description 孩子管理列表（S11）：已绑定孩子、脱敏证件、查询状态与报告篇数、新增/编辑入口。
 *   只渲染状态与转发动作，数据与请求在 `useProfileChildren`。
 * @file src/pages/profile/components/ProfileChildrenPanel.vue
-->
<script setup lang="ts">
import { computed } from 'vue'
import type { TalentChildItem } from '@/api/talent-types'
import PortalStateView from '@/modules/foundation-portal/components/PortalStateView.vue'
import { childQueryMeta } from '../profile-fields'
import type { ChildrenPageState } from '../composables/useProfileChildren'

const props = defineProps<{
  state: ChildrenPageState
  items: TalentChildItem[]
  errorMessage: string
  pendingCheckCount: number
  boundCount: number
  /** 未绑定家长时「重新匹配」按钮 loading。 */
  reclaiming?: boolean
}>()

const emit = defineEmits<{
  edit: [id: string]
  retry: []
  reclaim: []
}>()

/** 列表行附加查询状态标签。 */
const rows = computed(() => props.items.map(item => ({
  item,
  query: childQueryMeta(item),
})))

/** 报告册数文案。 */
function reportText(count: number): string {
  return count > 0 ? `${count} 册报告` : '暂无报告'
}
</script>

<template>
  <view class="children">
    <!-- 加载：骨架，避免空白屏 -->
    <view v-if="state === 'loading'" class="children__skeleton" role="status" aria-label="正在加载孩子档案">
      <view v-for="index in 2" :key="index" class="skeleton-card">
        <wd-skeleton :row-col="[{ width: '46%' }, { width: '68%' }, { width: '52%' }]" animation="gradient" />
      </view>
    </view>

    <!-- 未关联会员档案 -->
    <PortalStateView
      v-else-if="state === 'unbound'"
      state="empty"
      icon="user"
      title="暂未关联会员档案"
      message="请确认手机号与后台登记一致；如仍未匹配，请联系客服核对会员档案。"
      :retry-text="props.reclaiming ? '' : '重新匹配'"
      :action-loading="props.reclaiming"
      @retry="emit('reclaim')"
    />

    <!-- 读取失败 -->
    <PortalStateView
      v-else-if="state === 'error'"
      state="error"
      :message="props.errorMessage || '孩子档案暂时无法读取'"
      retry-text="重试"
      @retry="emit('retry')"
    />

    <template v-else>
      <!-- 待核对说明条 -->
      <view v-if="pendingCheckCount > 0" class="notice" role="status">
        <wd-icon name="info-circle" size="16px" color="var(--foundation-warning)" />
        <text class="notice__text">{{ pendingCheckCount }} 个孩子检测结果待核对，编辑后自动重新查询</text>
      </view>

      <!-- 空态 -->
      <PortalStateView
        v-if="state === 'empty'"
        state="empty"
        icon="no-content"
        title="暂无孩子档案"
        message="孩子档案用于同步检测报告，新增后会自动发起查询。"
      />

      <!-- 孩子列表 -->
      <template v-else>
        <view
          v-for="row in rows"
          :key="row.item.id"
          class="child-card portal-card portal-tap"
          role="button"
          tabindex="0"
          :aria-label="`编辑${row.item.name}的孩子信息`"
          @click="emit('edit', row.item.id)"
          @keyup.enter="emit('edit', row.item.id)"
          @keyup.space.prevent="emit('edit', row.item.id)"
        >
          <view class="child-card__head">
            <view class="child-card__identity">
              <text class="child-card__name">{{ row.item.name }}</text>
              <text class="child-card__meta">
                {{ row.item.genderLabel || '性别未填' }}<template v-if="row.item.ageLabel"> · {{ row.item.ageLabel }}</template>
                <template v-if="row.item.relationLabel"> · {{ row.item.relationLabel }}</template>
              </text>
            </view>
            <wd-icon name="right" size="14px" color="var(--foundation-text-muted)" />
          </view>

          <view class="child-card__status">
            <view class="child-card__facts">
              <text class="child-card__masked">证件 {{ row.item.maskedIdNo || '未填写' }}</text>
              <text class="child-card__dot" aria-hidden="true">·</text>
              <text class="child-card__reports">{{ reportText(row.item.reportCount) }}</text>
            </view>
            <wd-tag :type="row.query.tagType" size="small" variant="light" custom-class="child-card__tag">
              {{ row.query.label }}
            </wd-tag>
          </view>
        </view>
      </template>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.children {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-2) var(--foundation-page-padding) calc(var(--sp-5) + env(safe-area-inset-bottom));
  box-sizing: border-box;
  overflow-x: hidden;
}
.children__skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}
.skeleton-card {
  padding: var(--sp-4);
  border: 1px solid var(--foundation-border);
  border-radius: var(--foundation-radius);
  background: var(--foundation-card);
}
.notice {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  box-sizing: border-box;
  border-radius: var(--foundation-radius-sm);
  background: var(--foundation-warning-surface);
}
.notice__text {
  flex: 1;
  min-width: 0;
  color: var(--foundation-warning);
  font-size: var(--fs-caption);
  line-height: 1.6;
  overflow-wrap: break-word;
}
.child-card {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  padding: var(--sp-4);
}
.child-card__head {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-2);
}
.child-card__identity {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}
.child-card__name {
  color: var(--foundation-text);
  font-size: var(--fs-title);
  font-weight: var(--fw-semibold);
  overflow-wrap: break-word;
}
.child-card__meta {
  color: var(--foundation-text-secondary);
  font-size: var(--fs-caption);
  line-height: 1.5;
  overflow-wrap: break-word;
}
.child-card__status {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}
.child-card__facts {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 4px;
}
.child-card__masked {
  overflow: hidden;
  color: var(--foundation-text-muted);
  font-size: var(--fs-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.child-card__reports,
.child-card__dot {
  flex: none;
  color: var(--foundation-text-muted);
  font-size: var(--fs-caption);
}
:deep(.child-card__tag) {
  --wot-tag-font-size: var(--fs-tag);
  flex: none;
}
</style>
