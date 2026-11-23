<!--
 * @description 我的（主栏 4）：账户卡、报告对象行、编辑资料 / 孩子管理 / 更多设置与退出登录；
 *   协议、隐私、关于版本与注销账号收纳在「设置」页。游客显示登录卡，未绑定显示未关联提示。
 * @file src/pages/profile/index.vue
-->
<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import PortalAvatar from '@/modules/foundation-portal/components/PortalAvatar.vue'
import PortalConfirmDialog from '@/modules/foundation-portal/components/PortalConfirmDialog.vue'
import PortalStateView from '@/modules/foundation-portal/components/PortalStateView.vue'
import PortalTabbar from '@/modules/foundation-portal/components/PortalTabbar.vue'
import SubjectPickerPopup from '@/modules/talent-portal/components/SubjectPickerPopup.vue'
import { useFoundationPortal } from '@/modules/foundation-portal/composables/useFoundationPortal'
import { openPage, PORTAL_ROUTES } from '@/modules/foundation-portal/navigation'
import { useTalentSession } from '@/modules/talent-portal/composables/useTalentSession'
import { useTalentPortalStore } from '@/store/talent-portal'

const store = useTalentPortalStore()
const session = useTalentSession()
const {
  site,
  themeVars,
  user,
  isLoggedIn,
  handleTab,
  refreshProfile,
  goToLoginWithRedirect,
  logout,
} = useFoundationPortal()

const loading = shallowRef(false)
const failed = shallowRef(false)
const logoutVisible = shallowRef(false)
const pickerVisible = shallowRef(false)

const displayName = computed(() => user.value?.nickname || '微信用户')
const maskedPhone = computed(() => {
  const phone = String(user.value?.phone || '')
  return phone.length === 11 ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : phone
})
/** 性别：账户资料只有 male / female 时展示，secret 与空值不占位。 */
const genderLabel = computed(() => {
  const gender = user.value?.gender
  if (gender === 'male')
    return '男'
  if (gender === 'female')
    return '女'
  return ''
})
/** 账户卡副行：性别 · 手机号，缺一项就只显示另一项。 */
const accountMeta = computed(() => [genderLabel.value, maskedPhone.value].filter(Boolean).join(' · '))
const subject = computed(() => store.current)
const childCount = computed(() => store.childCount)
const unbound = computed(() => isLoggedIn.value && store.resolved && !store.hasSubject)

/** 页面刷新：资料 + 报告对象。 */
async function refresh(): Promise<void> {
  if (!isLoggedIn.value) {
    store.resetSession()
    return
  }
  loading.value = true
  failed.value = false
  try {
    await refreshProfile()
    await session.ensureSession({ force: true })
    if (store.isParentDisabled)
      uni.reLaunch({ url: `${PORTAL_ROUTES.locked}?reason=parent_disabled` })
  }
  catch {
    failed.value = true
  }
  finally {
    loading.value = false
  }
}

/** 未登录：登录卡与公开入口。 */
function loginNow(): void {
  goToLoginWithRedirect(PORTAL_ROUTES.profile)
}

function openEditProfile(): void {
  if (!isLoggedIn.value) {
    loginNow()
    return
  }
  openPage(PORTAL_ROUTES.profileEdit)
}

function openChildren(): void {
  if (!isLoggedIn.value) {
    loginNow()
    return
  }
  openPage(PORTAL_ROUTES.profileChildren)
}

function openSubjectPicker(): void {
  if (!store.canSwitch)
    return
  pickerVisible.value = true
}

function openSettings(): void {
  openPage(PORTAL_ROUTES.profileSettings)
}

/** 未绑定：重新匹配家长档案。 */
async function reClaim(): Promise<void> {
  await session.reClaim()
  if (!store.hasSubject)
    uni.showToast({ title: '仍未匹配到会员档案，请联系客服', icon: 'none' })
}

/** 退出登录（二次确认）。 */
function confirmLogout(): void {
  logoutVisible.value = false
  logout()
}

onShow(() => {
  void refresh()
})
</script>

<template>
  <view class="page foundation-portal-page" :style="themeVars">
    <view class="content">
      <!-- 账户卡：整卡可点进编辑资料 -->
      <view
        class="account-card"
        role="button"
        tabindex="0"
        :aria-label="isLoggedIn ? '编辑个人资料' : '登录查看报告'"
        @click="isLoggedIn ? openEditProfile() : loginNow()"
        @keyup.enter="isLoggedIn ? openEditProfile() : loginNow()"
        @keyup.space.prevent="isLoggedIn ? openEditProfile() : loginNow()"
      >
        <PortalAvatar
          :src="isLoggedIn ? (user?.avatar || '') : ''"
          :size="56"
        />
        <view class="account-card__main">
          <text class="account-card__name">{{ isLoggedIn ? displayName : '未登录' }}</text>
          <text class="account-card__desc">
            {{ isLoggedIn ? (accountMeta || '资料待完善') : '登录后查看本人及子女报告' }}
          </text>
        </view>
        <wd-icon name="right" size="18px" color="var(--foundation-text-muted)" />
      </view>

      <PortalStateView
        v-if="isLoggedIn && loading && !store.resolved"
        state="loading"
        loading-text="正在读取账户…"
      />
      <PortalStateView
        v-else-if="isLoggedIn && failed && !store.hasSubject"
        state="error"
        message="账户信息暂时无法读取"
        retry-text="重试"
        @retry="refresh"
      />

      <template v-else>
        <!-- 未绑定会员档案 -->
        <view v-if="unbound" class="notice" role="alert">
          <wd-icon name="info-circle" size="16px" color="var(--foundation-warning)" />
          <text class="notice__desc">暂未关联会员档案，请联系客服核对手机号</text>
          <wd-button type="primary" variant="text" size="small" @click="reClaim">
            重新匹配
          </wd-button>
        </view>

        <!-- 报告对象行 -->
        <view
          v-if="isLoggedIn && subject"
          class="object-row"
          :role="store.canSwitch ? 'button' : undefined"
          :tabindex="store.canSwitch ? 0 : undefined"
          :aria-label="store.canSwitch ? '切换报告对象' : '我的报告'"
          @click="openSubjectPicker"
          @keyup.enter="openSubjectPicker"
          @keyup.space.prevent="openSubjectPicker"
        >
          <wd-avatar
            :text="subject.name.slice(0, 1)"
            :size="40"
            shape="round"
            bg-color="var(--foundation-primary)"
            color="var(--foundation-on-primary)"
            custom-class="object-row__avatar"
          />
          <view class="object-row__main">
            <text class="object-row__name">{{ subject.name }}</text>
            <text class="object-row__meta">
              {{ subject.subjectType === 'child' ? '子女' : '本人' }} · {{ subject.statusText }}
            </text>
          </view>
          <view v-if="store.canSwitch" class="object-row__switch">
            <wd-icon name="swap" size="15px" color="var(--foundation-on-primary)" />
            <text class="object-row__switch-text">切换</text>
          </view>
        </view>

        <!-- 功能入口 -->
        <wd-cell-group v-if="isLoggedIn" insert custom-class="portal-cell-group">
          <wd-cell title="编辑资料" prefix-icon="edit" is-link role="button" tabindex="0" aria-label="编辑资料" @click="openEditProfile" />
          <wd-cell title="孩子管理" prefix-icon="user-group" :value="childCount > 0 ? `${childCount} 人` : '暂无'" is-link role="button" tabindex="0" aria-label="孩子管理" @click="openChildren" />
          <wd-cell title="更多设置" prefix-icon="settings" is-link role="button" tabindex="0" aria-label="更多设置：用户协议、隐私政策、关于与注销" @click="openSettings" />
          <wd-cell title="退出登录" prefix-icon="poweroff" clickable role="button" tabindex="0" aria-label="退出登录" @click="logoutVisible = true" />
        </wd-cell-group>

        <wd-cell-group v-else insert custom-class="portal-cell-group">
          <wd-cell title="更多设置" prefix-icon="settings" is-link role="button" tabindex="0" aria-label="更多设置：用户协议、隐私政策与关于" @click="openSettings" />
        </wd-cell-group>
      </template>

      <!-- 页脚 -->
      <view class="footer">
        <text v-if="site.copyright" class="footer__copyright">{{ site.copyright }}</text>
      </view>
    </view>

    <PortalTabbar active="profile" @navigate="handleTab" />

    <PortalConfirmDialog
      v-model="logoutVisible"
      title="退出登录"
      confirm-text="退出"
      @confirm="confirmLogout"
    >
      <text class="dialog-text">退出后需要重新登录才能查看报告与建议，本机记住的报告对象会一并清除。</text>
    </PortalConfirmDialog>

    <SubjectPickerPopup v-model:visible="pickerVisible" />
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
  padding: var(--sp-2) var(--foundation-page-padding) var(--foundation-page-bottom);
}
.account-card {
  display: flex;
  min-height: 88px;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-4);
  box-sizing: border-box;
  border: 1px solid var(--foundation-border);
  border-radius: var(--foundation-radius);
  background: var(--foundation-card);
  box-shadow: var(--foundation-shadow);
  transition: transform 140ms ease, background-color 140ms ease;
}
.account-card:active {
  background: var(--foundation-card-subtle);
  transform: scale(0.988);
}
.account-card__main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 4px;
}
.account-card__name {
  overflow: hidden;
  color: var(--foundation-text);
  font-size: var(--fs-hero);
  font-weight: var(--fw-semibold);
  line-height: var(--lh-title);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.account-card__desc {
  color: var(--foundation-text-secondary);
  font-size: var(--fs-caption);
  line-height: 1.5;
}
.notice {
  display: flex;
  min-height: 44px;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  border: 1px solid rgba(122, 90, 31, 0.16);
  border-radius: var(--foundation-radius-sm);
  background: var(--foundation-warning-surface);
}
.notice__desc {
  flex: 1;
  color: var(--foundation-warning);
  font-size: var(--fs-caption);
  line-height: 1.6;
}
.notice :deep(.wd-button) {
  --wot-button-primary-color: var(--foundation-warning);
  flex: none;
  padding: 0 4px;
}
.object-row {
  display: flex;
  min-height: 60px;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-4);
  box-sizing: border-box;
  border: 1px solid var(--foundation-primary-soft);
  border-radius: var(--foundation-radius-sm);
  background: var(--foundation-primary-tint);
  box-shadow: 0 1px 3px rgba(47, 111, 94, 0.08);
  transition: transform 140ms ease, background-color 140ms ease;
}
.object-row:active {
  background: var(--foundation-primary-soft);
  transform: scale(0.99);
}
:deep(.object-row__avatar) {
  flex: none;
  font-weight: var(--fw-semibold);
  box-shadow: 0 2px 6px rgba(47, 111, 94, 0.2);
}
.object-row__main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}
.object-row__name {
  color: var(--foundation-text);
  font-size: var(--fs-body-lg);
  font-weight: 600;
}
.object-row__meta {
  color: var(--foundation-text-secondary);
  font-size: var(--fs-caption);
}
.object-row__switch {
  display: flex;
  min-height: 32px;
  flex: none;
  align-items: center;
  gap: 3px;
  padding: 0 12px;
  border-radius: 999px;
  background: var(--foundation-primary);
  box-shadow: 0 2px 6px rgba(47, 111, 94, 0.2);
}
.object-row__switch-text {
  color: var(--foundation-on-primary);
  font-size: var(--fs-tag);
  font-weight: var(--fw-medium);
}
:deep(.portal-cell-group) {
  --wot-cell-group-insert-margin: 0;
  --wot-cell-group-insert-radius: var(--foundation-radius);
  --wot-cell-group-bg: var(--foundation-card);
  --wot-cell-bg: var(--foundation-card);
  --wot-cell-title-color: var(--foundation-text);
  --wot-cell-value-color: var(--foundation-text-muted);
  --wot-cell-icon-color: var(--foundation-interactive);
  --wot-cell-border-color: var(--foundation-border);
}
.footer {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--sp-2) 0 var(--sp-4);
  text-align: center;
}
.footer__copyright,
.footer__contact {
  color: var(--foundation-text-muted);
  font-size: var(--fs-tag);
}
.dialog-text {
  display: block;
  color: var(--foundation-text-secondary);
  font-size: var(--fs-sm);
  line-height: 1.7;
}
</style>

<route lang="json">
{
  "style": {
    "navigationStyle": "default",
    "navigationBarTitleText": "我的",
    "navigationBarBackgroundColor": "#FAF8F3",
    "navigationBarTextStyle": "black"
  }
}
</route>
