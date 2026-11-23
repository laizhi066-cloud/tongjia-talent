<!--
 * @description C 端固定 4 主栏底部导航（首页 / 报告 / 培养方向 / 我的）。
 *   主栏互切由页面通过 `navigate` 事件执行 reLaunch，组件本身不直接导航。
 *   激活态 = 图标胶囊底 + 深主色图标 + 加粗标签，未激活保持中灰，避免四栏同时抢眼。
 * @file src/modules/foundation-portal/components/PortalTabbar.vue
-->
<script setup lang="ts">
import { triggerHaptic } from '@/utils/haptics'
import type { PortalTab } from '../navigation'

const props = defineProps<{ active: PortalTab }>()

const emit = defineEmits<{
  navigate: [target: PortalTab]
}>()

interface TabbarChangeEvent {
  value: string | number
}

interface TabDefinition {
  name: PortalTab
  title: string
  icon: string
}

/** 4 个固定主栏；顺序即底部展示顺序，不接受运行时新增。 */
const TABS: readonly TabDefinition[] = [
  { name: 'home', title: '首页', icon: 'home' },
  { name: 'report', title: '报告', icon: 'file' },
  { name: 'direction', title: '培养方向', icon: 'compass' },
  { name: 'profile', title: '我的', icon: 'user' },
]

/** 只接受 4 个合法主栏，切换时触发轻微触感反馈。 */
function handleChange(event: TabbarChangeEvent): void {
  const target = TABS.find(tab => tab.name === event.value)
  if (target && target.name !== props.active) {
    triggerHaptic('light')
    emit('navigate', target.name)
  }
}
</script>

<template>
  <wd-tabbar
    :model-value="props.active"
    placeholder
    safe-area-inset-bottom
    fixed
    custom-class="foundation-portal-tabbar"
    role="tablist"
    @change="handleChange"
  >
    <wd-tabbar-item
      v-for="tab in TABS"
      :key="tab.name"
      :name="tab.name"
      :title="tab.title"
      role="tab"
      tabindex="0"
      :aria-selected="props.active === tab.name"
      :aria-label="tab.title"
      @keyup.enter="emit('navigate', tab.name)"
      @keyup.space.prevent="emit('navigate', tab.name)"
    >
      <template #icon="{ active: isActive }">
        <view class="tab-icon" :class="{ 'tab-icon--active': isActive }">
          <wd-icon
            :name="tab.icon"
            size="21px"
            :color="isActive ? 'var(--foundation-primary-deep)' : 'var(--foundation-text-muted)'"
          />
        </view>
      </template>
    </wd-tabbar-item>
  </wd-tabbar>
</template>

<style lang="scss" scoped>
:deep(.foundation-portal-tabbar) {
  --wot-tabbar-bg: var(--foundation-card);
  --wot-tabbar-item-color-active: var(--foundation-primary-deep);
  --wot-tabbar-item-color-inactive: var(--foundation-text-muted);
  --wot-tabbar-item-title-font-size: var(--fs-tag);
  z-index: 20;
  box-shadow: var(--foundation-shadow-bar);
}
:deep(.foundation-portal-tabbar .wd-tabbar-item) {
  /* 4 栏在 340 宽度下仍保证每项 ≥56px 高、可点区域 ≥44px。 */
  height: var(--foundation-tabbar-height);
  min-height: 56px;
  box-sizing: border-box;
  padding: 6px 0 4px;
}
:deep(.foundation-portal-tabbar .wd-tabbar-item__body) {
  gap: 2px;
}
:deep(.foundation-portal-tabbar .wd-tabbar-item__body-title.is-active) {
  font-weight: var(--fw-semibold);
}
.tab-icon {
  display: flex;
  width: 44px;
  height: 26px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  transition: background-color 160ms ease;
}
.tab-icon--active {
  background: var(--foundation-primary-tint);
}
</style>
