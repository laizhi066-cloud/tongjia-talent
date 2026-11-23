<!--
 * @description 首页内容：未绑定 / 游客欢迎、待核对提示、最近报告、四宫格与页脚说明。
 *   所有数据与文案由 `useTalentHome` 提供，组件只负责渲染与转发点击。
 *   文案原则：一句一事、不做重复说明；游客态不展示登录后才成立的副标题。
 * @file src/modules/talent-portal/components/TalentHomeContent.vue
-->
<script setup lang="ts">
import PortalStateView from '@/modules/foundation-portal/components/PortalStateView.vue'
import { useTalentHome } from '../composables/useTalentHome'

const {
  site,
  pendingCheckText,
  state,
  showSkeleton,
  offline,
  recentReport,
  gridItems,
  refreshing,
  openChildren,
  openReportTab,
  reClaim,
  retry,
  callService,
} = useTalentHome()
</script>

<template>
  <view class="home">
    <wd-notice-bar
      v-if="offline"
      type="warning"
      prefix="warn"
      :scrollable="false"
      wrapable
      text="网络已断开，恢复后将自动重试"
      custom-class="home__offline"
    />

    <!-- 首屏骨架：超过 300ms 才展示，避免闪烁 -->
    <view v-if="showSkeleton" class="home__skeleton" role="status" aria-label="正在加载首页">
      <view class="skeleton-card">
        <wd-skeleton :row-col="[[{ size: '44px', type: 'rect' }, { width: '50%', marginLeft: '12px' }], { width: '30%' }]" animation="gradient" />
      </view>
      <view class="skeleton-grid">
        <view v-for="index in 4" :key="index" class="skeleton-tile">
          <wd-skeleton :row-col="[{ width: '40%' }, { width: '70%' }]" animation="gradient" />
        </view>
      </view>
    </view>

    <template v-else>
      <!-- 游客欢迎卡：品牌色主视觉，避免首屏像后台登录引导 -->
      <view v-if="state === 'guest'" class="hero">
        <view class="hero__glow" aria-hidden="true" />
        <text class="hero__title">{{ site.slogan || '看见天赋，陪伴成长' }}</text>
        <text class="hero__desc">登录后查看基因报告、培育建议与培养方向</text>
        <view class="hero__action">
          <wd-button type="primary" size="medium" custom-class="hero__button" @click="openReportTab">
            登录查看
          </wd-button>
        </view>
      </view>

      <!-- 未关联会员档案 -->
      <view v-else-if="state === 'unbound'" class="unbound portal-card">
        <view class="unbound__head">
          <view class="unbound__icon" aria-hidden="true">
            <wd-icon name="info-circle" size="18px" color="var(--foundation-warning)" />
          </view>
          <view class="unbound__text">
            <text class="unbound__title">暂未关联会员档案</text>
            <text class="unbound__desc">手机号与后台登记不一致时，请联系客服核对。</text>
          </view>
        </view>
        <view class="unbound__actions">
          <wd-button type="primary" size="medium" :loading="refreshing" @click="reClaim">
            重新匹配
          </wd-button>
          <!-- #ifdef MP-WEIXIN -->
          <button open-type="contact" class="contact-native-wrap">
            <wd-button variant="soft" size="medium" icon="chat">
              在线客服
            </wd-button>
          </button>
          <!-- #endif -->
          <!-- #ifndef MP-WEIXIN -->
          <wd-button v-if="site.contactPhone" variant="soft" size="medium" icon="phone" @click="callService">
            联系客服
          </wd-button>
          <!-- #endif -->
        </view>
      </view>

      <template v-else>
        <!-- 报告主视觉：一句话结论 + 进入 -->
        <view
          v-if="recentReport"
          class="rpt"
          :class="{ 'rpt--muted': !recentReport.readable }"
          role="button"
          tabindex="0"
          aria-label="查看基因报告"
          @click="openReportTab"
          @keyup.enter="openReportTab"
          @keyup.space.prevent="openReportTab"
        >
          <view class="rpt__top">
            <text class="rpt__label">{{ recentReport.title }}</text>
            <text class="rpt__badge">{{ recentReport.statusText }}</text>
          </view>
          <text class="rpt__headline">{{ recentReport.headline }}</text>
          <view class="rpt__foot">
            <text class="rpt__hint">{{ recentReport.caption }}</text>
            <view class="rpt__go">
              <wd-icon name="right" size="15px" color="var(--foundation-primary-deep)" />
            </view>
          </view>
        </view>

        <!-- 待核对提示 -->
        <view
          v-if="pendingCheckText"
          class="pending portal-tap"
          role="button"
          tabindex="0"
          aria-label="查看待核对的检测结果"
          @click="openChildren"
          @keyup.enter="openChildren"
          @keyup.space.prevent="openChildren"
        >
          <wd-icon name="exclamation-circle" size="16px" color="var(--foundation-warning)" />
          <text class="pending__text">{{ pendingCheckText }}</text>
          <wd-icon name="right" size="14px" color="var(--foundation-warning)" />
        </view>

        <!-- 错误态：内容区给可读说明与重试 -->
        <PortalStateView
          v-if="state === 'error'"
          state="error"
          message="加载失败，请重试"
          retry-text="重试"
          @retry="retry"
        />
      </template>
    </template>

    <!-- 金刚区：一行四个圆形入口，游客与未绑定同样展示 -->
    <view v-if="state !== 'error' && !showSkeleton" class="dock">
      <view
        v-for="item in gridItems"
        :key="item.key"
        class="dock__item"
        role="button"
        tabindex="0"
        :aria-label="item.title"
        @click="item.onTap"
        @keyup.enter="item.onTap"
        @keyup.space.prevent="item.onTap"
      >
        <view class="dock__icon" aria-hidden="true" :style="{ background: item.iconBg }">
          <wd-icon :name="item.icon" size="22px" :color="item.iconColor" />
        </view>
        <text class="dock__label">{{ item.shortTitle }}</text>
        <text v-if="state !== 'guest' && item.subtitle" class="dock__meta">{{ item.subtitle }}</text>
      </view>
    </view>

    <!-- 页脚说明 -->
    <view v-if="site.copyright" class="home__footer">
      <text class="home__copyright">{{ site.copyright }}</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--foundation-page-padding) var(--foundation-page-bottom);
}
.home__offline {
  margin: 0 calc(-1 * var(--foundation-page-padding));
  --wot-notice-bar-padding: 8px var(--foundation-page-padding);
}
.home__skeleton {
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
.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--sp-2);
  padding: var(--sp-4) var(--sp-2);
  border: 1px solid var(--foundation-border);
  border-radius: var(--foundation-radius);
  background: var(--foundation-card);
}
.skeleton-tile {
  min-height: 44px;
}

/* 游客欢迎卡：品牌深色主视觉 + 白色主操作，做首屏视觉锚点。 */
.hero {
  position: relative;
  display: flex;
  overflow: hidden;
  flex-direction: column;
  gap: 10px;
  padding: 26px 20px 22px;
  border-radius: var(--foundation-radius-lg);
  background: var(--foundation-cover-grad);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 12px 28px rgba(36, 86, 74, 0.18);
}
.hero__glow {
  position: absolute;
  top: -64px;
  right: -48px;
  width: 190px;
  height: 190px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0) 70%);
}
.hero__title {
  position: relative;
  color: #fff;
  font-size: 26px;
  font-weight: var(--fw-bold);
  line-height: 1.3;
  letter-spacing: -0.3px;
}
.hero__desc {
  position: relative;
  color: rgba(255, 255, 255, 0.84);
  font-size: var(--fs-sm);
  line-height: var(--lh-body);
}
.hero__action {
  position: relative;
  margin-top: var(--sp-3);
}
.hero :deep(.hero__button) {
  --wot-button-primary-bg: #fff;
  --wot-button-primary-bg-active: #eef4f1;
  /* solid 按钮的文字色走全局 main-color，不是 primary-color */
  --wot-button-main-color: var(--foundation-primary-deep);
  width: 100%;
  font-weight: var(--fw-semibold);
}

.unbound {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-4);
}
.unbound__head {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-2);
}
.unbound__icon {
  display: flex;
  width: 32px;
  height: 32px;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: var(--foundation-radius-xs);
  background: var(--foundation-warning-surface);
}
.unbound__text {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}
.unbound__title {
  color: var(--foundation-text);
  font-size: var(--fs-body-lg);
  font-weight: var(--fw-semibold);
}
.unbound__desc {
  color: var(--foundation-text-secondary);
  font-size: var(--fs-sm);
  line-height: var(--lh-body);
}
.unbound__actions {
  display: flex;
  gap: var(--sp-2);
}
.unbound__actions :deep(.wd-button) {
  flex: 1;
}
.contact-native-wrap {
  display: flex;
  flex: 1;
  padding: 0;
  margin: 0;
  border: 0;
  background: transparent;
  line-height: inherit;
  &::after {
    border: 0;
  }
}

.pending {
  display: flex;
  min-height: 44px;
  align-items: center;
  gap: var(--sp-2);
  padding: 0 var(--sp-3);
  border: 1px solid rgba(122, 90, 31, 0.16);
  border-radius: var(--foundation-radius-sm);
  background: var(--foundation-warning-surface);
  box-sizing: border-box;
}
.pending__text {
  flex: 1;
  color: var(--foundation-warning);
  font-size: var(--fs-sm);
  font-weight: var(--fw-medium);
}

/* 报告主视觉：深主色渐变卡，一句话结论用大字号，微高光边框提升质感。 */
.rpt {
  position: relative;
  display: flex;
  overflow: hidden;
  flex-direction: column;
  gap: 10px;
  padding: 20px;
  border-radius: var(--foundation-radius-lg);
  background: var(--foundation-cover-grad);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.24), 0 12px 28px rgba(36, 86, 74, 0.18);
  transition: transform 140ms ease, opacity 140ms ease;
}
.rpt:active {
  opacity: 0.95;
  transform: scale(0.99);
}
.rpt--muted {
  background: linear-gradient(150deg, #eef4f1 0%, #e0ebe5 100%);
  box-shadow: var(--foundation-shadow);
}
.rpt__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
}
.rpt__label {
  color: rgba(255, 255, 255, 0.88);
  font-size: var(--fs-caption);
  letter-spacing: 0.3px;
}
.rpt__badge {
  padding: 2px 10px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  font-size: var(--fs-tag);
  font-weight: var(--fw-medium);
  line-height: 1.6;
}
.rpt__headline {
  color: #fff;
  font-size: var(--fs-display);
  font-weight: var(--fw-bold);
  line-height: 1.28;
  letter-spacing: -0.2px;
}
.rpt__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
  margin-top: 2px;
}
.rpt__hint {
  overflow: hidden;
  color: rgba(255, 255, 255, 0.84);
  font-size: var(--fs-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rpt__go {
  display: flex;
  width: 32px;
  height: 32px;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.12);
  transition: transform 140ms ease;
}
.rpt:active .rpt__go {
  transform: scale(0.92);
}
.rpt--muted .rpt__label,
.rpt--muted .rpt__hint {
  color: var(--foundation-text-secondary);
}
.rpt--muted .rpt__headline {
  color: var(--foundation-text);
}
.rpt--muted .rpt__badge {
  border-color: transparent;
  background: var(--foundation-primary-tint);
  color: var(--foundation-primary-deep);
}

/* 金刚区：一行四个圆形入口；图标 + 2 字标题 + 极短状态，带有自然微缩放与投影。 */
.dock {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--sp-1);
  padding: var(--sp-4) var(--sp-2);
  box-sizing: border-box;
  border: 1px solid var(--foundation-border);
  border-radius: var(--foundation-radius);
  background: var(--foundation-card);
  box-shadow: var(--foundation-shadow);
}
.dock__item {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 4px 2px;
  border-radius: var(--foundation-radius-sm);
  transition: transform 140ms cubic-bezier(0.2, 0.8, 0.2, 1), background-color 140ms ease;
}
.dock__item:active {
  background: var(--foundation-card-subtle);
  transform: scale(0.95);
}
.dock__icon {
  display: flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
}
.dock__label {
  color: var(--foundation-text);
  font-size: var(--fs-caption);
  font-weight: var(--fw-medium);
  line-height: 1.4;
}
.dock__meta {
  overflow: hidden;
  max-width: 100%;
  color: var(--foundation-text-muted);
  font-size: var(--fs-tag);
  line-height: 1.4;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home__footer {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--sp-4) var(--sp-1) var(--sp-2);
  text-align: center;
}
.home__copyright {
  color: var(--foundation-text-muted);
  font-size: var(--fs-tag);
}
</style>
