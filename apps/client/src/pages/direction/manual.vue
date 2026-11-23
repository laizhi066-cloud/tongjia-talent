<!--
 * @description 选择方向（S9）：方向下拉（拼音升序 + 末位「其他（自己填写）」）、≤10 字自填输入、
 *   培养目标（档位）必选；提交生成待归并方向，重复提交幂等、超过上限先提示取消。
 * @file src/pages/direction/manual.vue
-->
<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import PortalPageHeader from '@/modules/foundation-portal/components/PortalPageHeader.vue'
import { useFoundationBack } from '@/modules/foundation-portal/composables/useFoundationBack'
import { useFoundationPortal } from '@/modules/foundation-portal/composables/useFoundationPortal'
import { useProtectedPage } from '@/modules/foundation-portal/composables/useProtectedPage'
import {
  currentPageUrl,
  redirectToLogin,
  switchTab,
} from '@/modules/foundation-portal/navigation'
import DirectionStatusCard from './components/DirectionStatusCard.vue'
import DirectionTierList from './components/DirectionTierList.vue'
import { useDirectionManual } from './composables/useDirectionManual'

const { isAuthorized } = useProtectedPage()
const { goBack } = useFoundationBack('direction')
const { themeVars } = useFoundationPortal()
const {
  state,
  manualLimit,
  selectionCount,
  selectionLimit,
  tiers,
  pickerValue,
  customName,
  chosenTierId,
  directionError,
  nameError,
  tierError,
  submitting,
  directionOptions,
  usesOther,
  directionLabel,
  atLimit,
  hasTier,
  canSubmit,
  blockingCopy,
  setReportId,
  load,
  submit,
} = useDirectionManual()

const pickerVisible = ref(false)

onLoad((options?: Record<string, string>) => {
  setReportId(options?.reportId || '')
})

onShow(() => {
  if (isAuthorized.value)
    void load()
})

/** 提交成功后返回培养方向主栏，由主栏 onShow 刷新已选与计数。 */
async function submitAndBack(): Promise<void> {
  const ok = await submit()
  if (ok)
    setTimeout(goBack, 350)
}

/** 阻断态下一步：失败重试、会话过期回登录，其余按状态回报告或来源页。 */
function handleBlockingAction(): void {
  if (state.value === 'error') {
    void load()
    return
  }
  if (state.value === 'session') {
    redirectToLogin(currentPageUrl())
    return
  }
  if (state.value === 'unbound') {
    switchTab('home')
    return
  }
  if (state.value === 'pending' || state.value === 'retracted' || state.value === 'no-report') {
    switchTab('report')
    return
  }
  goBack()
}
</script>

<template>
  <view v-if="isAuthorized" class="page foundation-portal-page" :style="themeVars">
    <PortalPageHeader title="选择方向" @back="goBack" />

    <view class="content" :class="{ 'content--with-bar': state === 'ready' }">
      <!-- 骨架 -->
      <view v-if="state === 'loading'" class="skeleton" role="status" aria-label="正在加载自填选项">
        <view class="skeleton-card">
          <wd-skeleton :row-col="[{ width: '35%' }, { width: '75%' }]" animation="gradient" />
        </view>
        <view class="skeleton-card">
          <wd-skeleton theme="paragraph" animation="gradient" />
        </view>
      </view>

      <template v-else-if="state === 'ready'">
        <text class="page-hint">
          已选 {{ selectionCount }}/{{ selectionLimit }} 个方向 · 提交后由后台归类生效
        </text>

        <!-- 方向名称 -->
        <view class="form-block">
          <view class="form-block__head">
            <text class="form-block__label">方向名称</text>
            <text class="form-block__required" aria-hidden="true">*</text>
          </view>
          <wd-cell
            title="选择方向"
            :value="directionLabel"
            placeholder="未选择"
            is-link
            role="button"
            tabindex="0"
            aria-label="选择方向"
            custom-class="manual-cell"
            @click="pickerVisible = true"
          />
          <wd-picker
            v-model="pickerValue"
            v-model:visible="pickerVisible"
            :columns="directionOptions"
            title="选择方向"
            cancel-button-text="取消"
            confirm-button-text="完成"
          />
          <text v-if="directionError" class="form-error" role="alert">{{ directionError }}</text>

          <template v-if="usesOther">
            <view class="custom-input">
              <wd-input
                v-model="customName"
                type="text"
                :maxlength="manualLimit"
                show-word-limit
                clearable
                placeholder="请输入方向名称"
                :error="Boolean(nameError)"
              />
            </view>
            <text v-if="nameError" class="form-error" role="alert">{{ nameError }}</text>
          </template>
        </view>

        <!-- 培养目标（档位） -->
        <view class="form-block">
          <view class="form-block__head">
            <text class="form-block__label">培养目标</text>
            <text class="form-block__required" aria-hidden="true">*</text>
          </view>
          <DirectionTierList
            v-if="hasTier"
            v-model="chosenTierId"
            :tiers="tiers"
            :disabled="submitting"
          />
          <view v-else class="tier-unavailable" role="status">
            <wd-icon name="info-circle" size="18px" color="var(--foundation-warning)" />
            <text class="tier-unavailable__text">暂未开放培养目标，暂时无法提交自填方向。</text>
          </view>
          <text v-if="tierError" class="form-error" role="alert">{{ tierError }}</text>
        </view>

        <view v-if="atLimit" class="limit-hint" role="status">
          <wd-icon name="info-circle" size="16px" color="var(--foundation-warning)" />
          <text class="limit-hint__text">最多选择 {{ selectionLimit }} 个方向，请先取消一个</text>
        </view>
      </template>

      <!-- 阻断态 / 错 -->
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
        提交自填方向
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
.page-hint {
  padding: 0 var(--sp-1);
  color: var(--foundation-text-muted);
  font-size: var(--fs-tag);
  line-height: 1.6;
}
.form-block {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  padding: var(--sp-4);
  border: 1px solid var(--foundation-border);
  border-radius: var(--foundation-radius);
  background: var(--foundation-card);
}
.form-block__head {
  display: flex;
  align-items: center;
  gap: 2px;
}
.form-block__label {
  color: var(--foundation-text);
  font-size: var(--fs-body-lg);
  font-weight: var(--fw-semibold);
}
.form-block__required {
  color: var(--foundation-danger);
  font-size: var(--fs-body);
}
:deep(.manual-cell) {
  margin: 0;
  border: 1px solid var(--foundation-border);
  border-radius: var(--foundation-radius-sm);
  overflow: hidden;
}
.custom-input {
  margin-top: var(--sp-1);
}
.form-error {
  color: var(--foundation-danger);
  font-size: var(--fs-caption);
  line-height: 1.5;
}
.tier-unavailable {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-3);
  border-radius: var(--foundation-radius-sm);
  background: var(--foundation-warning-surface);
}
.tier-unavailable__text {
  flex: 1;
  color: var(--foundation-warning);
  font-size: var(--fs-caption);
  line-height: 1.6;
}
.limit-hint {
  display: flex;
  min-height: 44px;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--foundation-radius-sm);
  background: var(--foundation-warning-surface);
}
.limit-hint__text {
  flex: 1;
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
