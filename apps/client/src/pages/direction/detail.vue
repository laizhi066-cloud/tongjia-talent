<!--
 * @description 方向详情（S8）：方向名称 / 命中 N/M / 档位数、要素对照（需 X · 现 Y / 已达成 / 差 N 级）、
 *   目标档位单选与「确认选择 / 更新档位」；selectable=false 时禁用确认。
 * @file src/pages/direction/detail.vue
-->
<script setup lang="ts">
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useDialog } from '@wot-ui/ui'
import PortalPageHeader from '@/modules/foundation-portal/components/PortalPageHeader.vue'
import { useFoundationBack } from '@/modules/foundation-portal/composables/useFoundationBack'
import { useFoundationPortal } from '@/modules/foundation-portal/composables/useFoundationPortal'
import { useProtectedPage } from '@/modules/foundation-portal/composables/useProtectedPage'
import { currentPageUrl, redirectToLogin } from '@/modules/foundation-portal/navigation'
import DirectionStatusCard from './components/DirectionStatusCard.vue'
import DirectionTierList from './components/DirectionTierList.vue'
import { useDirectionDetail } from './composables/useDirectionDetail'

const { isAuthorized } = useProtectedPage()
const { goBack } = useFoundationBack('direction')
const { themeVars } = useFoundationPortal()
const dialog = useDialog()
const {
  state,
  item,
  chosenTierId,
  submitting,
  cancelSubmitting,
  isSelected,
  tiers,
  sameTier,
  selectable,
  atLimit,
  canSubmit,
  submitLabel,
  hitText,
  tierCountText,
  blockingCopy,
  setParams,
  load,
  submit,
  cancelSelection,
} = useDirectionDetail()

onLoad((options?: Record<string, string>) => {
  setParams(options?.reportId || '', options?.directionId || '')
})

onShow(() => {
  if (isAuthorized.value)
    void load()
})

/** 提交后返回培养方向主栏，由主栏 onShow 刷新已选与计数。 */
async function submitAndBack(): Promise<void> {
  if (!canSubmit.value) {
    if (atLimit.value)
      uni.showToast({ title: '最多选择 3 个方向，请先取消一个', icon: 'none' })
    return
  }
  const ok = await submit()
  if (ok)
    setTimeout(goBack, 350)
}

/** 取消已选方向：二次确认后调用取消接口，成功回培养方向主栏。 */
async function askCancelSelection(): Promise<void> {
  if (!isSelected.value)
    return
  try {
    await dialog.confirm({
      title: '取消选择',
      msg: `取消后「${item.value?.name || ''}」不再计入已选，确认取消？`,
      confirmButtonText: '确认取消',
      cancelButtonText: '取消',
    })
  }
  catch {
    return
  }
  const ok = await cancelSelection()
  if (ok)
    setTimeout(goBack, 350)
}

/** 阻断态下一步：失败重试、会话过期回登录，其余返回来源。 */
function handleBlockingAction(): void {
  if (state.value === 'error') {
    void load()
    return
  }
  if (state.value === 'session') {
    redirectToLogin(currentPageUrl())
    return
  }
  goBack()
}
</script>

<template>
  <view v-if="isAuthorized" class="page foundation-portal-page" :style="themeVars">
    <PortalPageHeader title="方向详情" @back="goBack" />

    <view class="content" :class="{ 'content--with-bar': state === 'ready' }">
      <!-- 骨架 -->
      <view v-if="state === 'loading'" class="skeleton" role="status" aria-label="正在加载方向详情">
        <view class="skeleton-card">
          <wd-skeleton :row-col="[{ width: '45%' }, { width: '80%' }, { width: '35%' }]" animation="gradient" />
        </view>
        <view class="skeleton-card">
          <wd-skeleton theme="paragraph" animation="gradient" />
        </view>
      </view>

      <template v-else-if="state === 'ready' && item">
        <view class="header-card">
          <view class="header-card__head">
            <text class="header-card__name">{{ item.name }}</text>
            <wd-tag v-if="isSelected" type="primary" variant="light" size="small" round>
              已选
            </wd-tag>
            <wd-tag v-else-if="item.fallback" type="warning" variant="light" size="small" round>
              暂无匹配
            </wd-tag>
          </view>
          <text v-if="item.description" class="header-card__desc">{{ item.description }}</text>
          <view class="header-card__meta">
            <text class="header-card__meta-item">{{ hitText }}</text>
            <text class="header-card__meta-dot" aria-hidden="true">·</text>
            <text class="header-card__meta-item">{{ tierCountText }}</text>
          </view>
        </view>

        <view class="block">
          <text class="block__title">要素对照</text>
          <view v-if="item.requirements.length" class="requirement-list" role="list">
            <view
              v-for="(requirement, index) in item.requirements"
              :key="`${requirement.factorName}-${index}`"
              class="requirement-row"
              role="listitem"
            >
              <view class="requirement-row__main">
                <text class="requirement-row__name">{{ requirement.factorName }}</text>
                <text class="requirement-row__level">
                  需 {{ requirement.needLevelName }} · 现 {{ requirement.actualLevelName }}
                </text>
              </view>
              <wd-tag v-if="requirement.met" type="success" variant="light" size="small" round>
                已达成
              </wd-tag>
              <wd-tag v-else type="warning" variant="light" size="small" round>
                差 {{ requirement.gap }} 级
              </wd-tag>
            </view>
          </view>
          <text v-else class="block__empty">暂无要素对照数据</text>
        </view>

        <view class="block">
          <text class="block__title">目标档位</text>
          <text v-if="!selectable" class="block__empty">该方向暂未开放档位，暂不可选择。</text>
          <DirectionTierList
            v-else
            v-model="chosenTierId"
            :tiers="tiers"
            :disabled="submitting"
          />
          <text v-if="sameTier && isSelected" class="block__hint">当前已是该档位；选择其他档位后可更新。</text>
          <view v-if="isSelected" class="cancel-action">
            <wd-button
              type="primary"
              variant="text"
              size="small"
              custom-style="--wot-button-primary-color: var(--foundation-danger)"
              :disabled="submitting || cancelSubmitting"
              @click="askCancelSelection"
            >
              取消选择
            </wd-button>
          </view>
        </view>

        <text v-if="atLimit" class="limit-hint">最多选择 3 个方向，请先在已选方向中取消一个。</text>
      </template>

      <!-- 阻断态 / 空 / 错 -->
      <DirectionStatusCard
        v-else-if="blockingCopy"
        :title="blockingCopy.title"
        :message="blockingCopy.message"
        :action-text="blockingCopy.actionText"
        :alert="state === 'error' || state === 'notfound' || state === 'invalid' || state === 'session'"
        :icon="state === 'error' ? 'no-wifi' : undefined"
        @action="handleBlockingAction"
      />
    </view>

    <!-- 函数式对话框挂载点（取消选择二次确认） -->
    <wd-dialog />

    <!-- 底部主操作 -->
    <view v-if="state === 'ready'" class="action-bar">
      <wd-button
        type="primary"
        size="large"
        block
        :loading="submitting"
        :disabled="!canSubmit"
        @click="submitAndBack"
      >
        {{ submitLabel }}
      </wd-button>
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
  padding: var(--sp-2) var(--foundation-page-padding) calc(var(--sp-5) + env(safe-area-inset-bottom));
}
.content--with-bar {
  padding-bottom: calc(var(--foundation-action-bar-height) + env(safe-area-inset-bottom) + var(--sp-4));
}
.skeleton {
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
.header-card {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  padding: var(--sp-4);
  border: 1px solid var(--foundation-border);
  border-radius: var(--foundation-radius);
  background: var(--foundation-card);
  box-shadow: var(--foundation-shadow);
}
.header-card__head {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}
.header-card__name {
  min-width: 0;
  color: var(--foundation-text);
  font-size: var(--fs-title-lg);
  font-weight: 700;
}
.header-card__desc {
  color: var(--foundation-text-secondary);
  font-size: var(--fs-sm);
  line-height: 1.7;
}
.header-card__meta {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
}
.header-card__meta-item {
  color: var(--foundation-text-muted);
  font-size: var(--fs-caption);
}
.header-card__meta-dot {
  color: var(--foundation-text-muted);
  font-size: var(--fs-caption);
}
.block {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  padding: var(--sp-4);
  border: 1px solid var(--foundation-border);
  border-radius: var(--foundation-radius);
  background: var(--foundation-card);
}
.block__title {
  color: var(--foundation-text);
  font-size: var(--fs-body-lg);
  font-weight: var(--fw-semibold);
}
.block__empty {
  color: var(--foundation-text-muted);
  font-size: var(--fs-caption);
  line-height: 1.6;
}
.block__hint {
  color: var(--foundation-text-muted);
  font-size: var(--fs-tag);
  line-height: 1.5;
}
.requirement-list {
  display: flex;
  flex-direction: column;
}
.requirement-row {
  display: flex;
  min-height: 52px;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) 0;
  box-sizing: border-box;
  border-bottom: 1px solid var(--foundation-hairline);
}
.requirement-row:last-child {
  border-bottom: 0;
}
.requirement-row__main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}
.requirement-row__name {
  color: var(--foundation-text);
  font-size: var(--fs-body);
  font-weight: 600;
}
.requirement-row__level {
  color: var(--foundation-text-secondary);
  font-size: var(--fs-caption);
}
.cancel-action {
  display: flex;
  justify-content: flex-end;
  padding-top: var(--sp-2);
  border-top: 1px solid var(--foundation-hairline);
}
.limit-hint {
  color: var(--foundation-warning);
  font-size: var(--fs-caption);
  line-height: 1.6;
}
.action-bar {
  position: fixed;
  bottom: 0;
  left: 50%;
  width: min(100%, 480px);
  z-index: 15;
  padding: 12px var(--foundation-page-padding) calc(12px + env(safe-area-inset-bottom));
  box-sizing: border-box;
  background: var(--foundation-card);
  box-shadow: var(--foundation-shadow-bar);
  transform: translateX(-50%);
}
</style>
