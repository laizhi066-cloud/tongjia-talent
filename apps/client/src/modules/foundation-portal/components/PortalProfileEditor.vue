<!--
 * @description 中性账户资料编辑表单，字段通过 save 事件提交给页面容器。
 * @file src/modules/foundation-portal/components/PortalProfileEditor.vue
-->
<script setup lang="ts">
import { reactive, ref, shallowRef, watch } from 'vue'
import PortalAvatar from './PortalAvatar.vue'
import type { FoundationProfileInput, FoundationUser } from '../types'

interface AvatarChooseEvent {
  detail: { avatarUrl: string }
}

interface PickerConfirmEvent {
  value: Array<string | number>
}

interface DatetimeConfirmEvent {
  value: string | number | Array<string | number>
}

const props = defineProps<{
  user: FoundationUser
  saving: boolean
  firstLogin?: boolean
}>()

const emit = defineEmits<{
  save: [value: FoundationProfileInput]
  avatar: [filePath: string]
  skip: []
}>()

const GENDER_VALUES: Array<NonNullable<FoundationProfileInput['gender']>> = ['secret', 'male', 'female']
const GENDER_LABELS = ['保密', '男', '女']
const MIN_BIRTHDAY = new Date(1900, 0, 1).getTime()
const MAX_BIRTHDAY = Date.now()

const form = reactive<FoundationProfileInput>({
  nickname: props.user.nickname,
  gender: props.user.gender || '',
  birthday: props.user.birthday || '',
  region: props.user.region || '',
  bio: props.user.bio || '',
})
const genderPickerVisible = shallowRef(false)
const genderPickerValue = ref<Array<string | number>>([GENDER_LABELS[genderIndex(form.gender)]])
const birthdayPickerVisible = shallowRef(false)
const birthdayPickerValue = shallowRef<number>(birthdayToTimestamp(form.birthday))

/** 仅切换账户时重置表单；上传头像刷新资料时保留尚未保存的输入。 */
watch(() => props.user.id, () => {
  const profile = props.user
  form.nickname = profile.nickname
  form.gender = profile.gender || ''
  form.birthday = profile.birthday || ''
  form.region = profile.region || ''
  form.bio = profile.bio || ''
  genderPickerValue.value = [GENDER_LABELS[genderIndex(form.gender)]]
  birthdayPickerValue.value = birthdayToTimestamp(form.birthday)
})

/** 将保密 / 男 / 女与选择器下标保持一一对应。 */
function genderIndex(gender: FoundationProfileInput['gender']): number {
  return Math.max(0, GENDER_VALUES.indexOf(gender || 'secret'))
}

/** 将资料中的 YYYY-MM-DD 转为 Wot 日期选择器需要的本地时间戳。 */
function birthdayToTimestamp(value: string): number {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day)
    return new Date(2000, 0, 1).getTime()
  return new Date(year, month - 1, day).getTime()
}

/** 将 Wot 日期选择器结果稳定格式化为服务端使用的 YYYY-MM-DD。 */
function timestampToBirthday(value: number): string {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** 使用 Wot 选择器更新性别。 */
function confirmGender(event: PickerConfirmEvent): void {
  const index = GENDER_LABELS.indexOf(String(event.value[0] || '保密'))
  form.gender = GENDER_VALUES[Math.max(0, index)] || 'secret'
}

/** 使用 Wot 日期选择器更新生日。 */
function confirmBirthday(event: DatetimeConfirmEvent): void {
  const rawValue = Array.isArray(event.value) ? event.value[0] : event.value
  const value = Number(rawValue)
  if (Number.isFinite(value))
    form.birthday = timestampToBirthday(value)
}

/** 验证最基本资料后将可编辑字段上报给父级。 */
function submit(): void {
  if (props.saving)
    return
  const nickname = form.nickname.trim()
  if (!nickname) {
    uni.showToast({ title: '请输入昵称', icon: 'none' })
    return
  }
  emit('save', {
    ...form,
    nickname,
    // 服务端以可选枚举接收性别；空值表示不更新，而不是提交非法的空枚举。
    gender: form.gender || undefined,
  })
}

/** H5 使用系统图片选择器，选择后由父级调用受控头像上传接口。 */
function chooseAvatar(): void {
  uni.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'], success: (result) => {
    const filePath = result.tempFilePaths?.[0]
    if (filePath)
      emit('avatar', filePath)
  } })
}

/** 小程序原生头像按钮返回临时文件路径，交给页面调用受控上传接口。 */
function handleWechatAvatar(event: AvatarChooseEvent): void {
  const filePath = event.detail.avatarUrl.trim()
  if (filePath)
    emit('avatar', filePath)
}

function skip(): void {
  if (!props.saving)
    emit('skip')
}

function openGenderPicker(): void {
  if (!props.saving)
    genderPickerVisible.value = true
}

function openBirthdayPicker(): void {
  if (!props.saving)
    birthdayPickerVisible.value = true
}
</script>

<template>
  <view class="profile-editor-page">
    <view v-if="props.firstLogin" class="welcome-note">
      <view class="welcome-heading">
        <text class="welcome-description">填写昵称即可，其他资料可稍后补充。</text>
        <wd-button role="button" tabindex="0" type="primary" variant="text" :disabled="props.saving" @keyup.enter="skip" @keyup.space.prevent="skip" @click="skip">
          稍后完善
        </wd-button>
      </view>
    </view>
    <view class="editor">
      <wd-cell-group insert>
        <wd-cell title="头像" size="large" center>
          <template #default>
            <!-- #ifdef MP-WEIXIN -->
            <wd-button role="button" tabindex="0" custom-style="padding:0;min-width:48px" type="primary" variant="text" open-type="chooseAvatar" aria-label="选择微信头像" :disabled="props.saving" @chooseavatar="handleWechatAvatar">
              <PortalAvatar
                :src="props.user.avatar || ''"
                :size="48"
                bg="var(--foundation-surface)"
                color="var(--foundation-text-muted)"
              />
            </wd-button>
            <!-- #endif -->
            <!-- #ifndef MP-WEIXIN -->
            <wd-button role="button" tabindex="0" custom-style="padding:0;min-width:48px" type="primary" variant="text" aria-label="选择头像" :disabled="props.saving" @keyup.enter="!(props.saving) && chooseAvatar()" @keyup.space.prevent="!(props.saving) && chooseAvatar()" @click="chooseAvatar">
              <PortalAvatar
                :src="props.user.avatar || ''"
                :size="48"
                bg="var(--foundation-surface)"
                color="var(--foundation-text-muted)"
              />
            </wd-button>
          <!-- #endif -->
          </template>
        </wd-cell>
        <wd-cell title="昵称" size="large" center>
          <wd-input v-model="form.nickname" :disabled="props.saving" :cursor-spacing="100" type="nickname" :maxlength="32" placeholder="请输入昵称" aria-label="昵称" compact align-right clearable />
        </wd-cell>
        <wd-cell
          title="性别"
          size="large"
          center
          is-link
          :value="form.gender === 'male' ? '男' : form.gender === 'female' ? '女' : '保密'"
          role="button"
          tabindex="0"
          :aria-disabled="props.saving"
          aria-label="选择性别"
          @click="openGenderPicker"
          @keyup.enter="openGenderPicker"
          @keyup.space.prevent="openGenderPicker"
        />
        <wd-cell
          title="生日"
          size="large"
          center
          is-link
          :value="form.birthday"
          placeholder="未填写"
          role="button"
          tabindex="0"
          :aria-disabled="props.saving"
          aria-label="选择生日"
          @click="openBirthdayPicker"
          @keyup.enter="openBirthdayPicker"
          @keyup.space.prevent="openBirthdayPicker"
        />
        <wd-cell title="地区" size="large" center>
          <wd-input v-model="form.region" :disabled="props.saving" :cursor-spacing="100" :maxlength="64" placeholder="填写所在地区" aria-label="地区" compact align-right clearable />
        </wd-cell>
      </wd-cell-group>
    </view>
    <view class="editor bio-editor">
      <wd-cell-group insert>
        <wd-cell title="个人简介" size="large" layout="vertical">
          <wd-textarea v-model="form.bio" :disabled="props.saving" :cursor-spacing="100" :maxlength="160" placeholder="介绍一下自己吧（选填）" aria-label="个人简介" compact show-word-limit />
        </wd-cell>
      </wd-cell-group>
    </view>
    <wd-picker
      v-model="genderPickerValue"
      v-model:visible="genderPickerVisible"
      title="选择性别"
      :columns="GENDER_LABELS"
      @confirm="confirmGender"
    />
    <wd-datetime-picker
      v-model="birthdayPickerValue"
      v-model:visible="birthdayPickerVisible"
      title="选择生日"
      type="date"
      :min-date="MIN_BIRTHDAY"
      :max-date="MAX_BIRTHDAY"
      @confirm="confirmBirthday"
    />
    <view class="footer-actions">
      <wd-button
        role="button" tabindex="0"
        class="save-button"
        type="primary"
        size="large"
        round
        block
        :loading="props.saving"
        :disabled="props.saving"
        @keyup.enter="submit" @keyup.space.prevent="submit" @click="submit"
      >
        {{ props.saving ? '保存中' : '保存' }}
      </wd-button>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.profile-editor-page {
  padding: 16px 16px calc(100px + env(safe-area-inset-bottom));
}
.welcome-note {
  margin-bottom: 16px;
}
.welcome-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.welcome-description {
  display: block;
  flex: 1;
  color: var(--foundation-text-secondary);
  font-size: var(--fs-sm);
  line-height: 1.6;
}
.editor {
  --wot-cell-group-insert-margin: 0;
  --wot-cell-group-insert-radius: var(--foundation-radius);
  --wot-cell-group-bg: var(--foundation-card);
  --wot-cell-bg: var(--foundation-card);
  --wot-cell-title-color: var(--foundation-text);
  --wot-cell-value-color: var(--foundation-text-secondary);
  --wot-cell-border-color: var(--foundation-border);
  --wot-cell-arrow-color: var(--foundation-text-muted);
  --wot-cell-padding-large: 16px;
  --wot-cell-title-font-size-large: 16px;
  --wot-cell-value-font-size-large: 16px;
  --wot-cell-title-line-height-large: 24px;
  --wot-cell-value-line-height-large: 24px;
  --wot-input-inner-font-size: var(--fs-body-lg);
  --wot-input-inner-height: 44px;
}

.bio-editor {
  margin-top: 16px;
  --wot-textarea-inner-font-size: var(--fs-body-lg);
  --wot-textarea-inner-line-height: 24px;
  --wot-textarea-inner-min-height: 80px;
}

.avatar-picker {
  --wot-button-padding-medium: 0;
  --wot-button-height-medium: 48px;
  min-width: 48px;
}

.footer-actions {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 2;
  padding: 12px 20px calc(12px + env(safe-area-inset-bottom));
  box-sizing: border-box;
  background: var(--foundation-background);
}

.save-button {
  --wot-button-height-large: 48px;
  box-sizing: border-box;
  min-height: 48px;
  font-size: var(--fs-body-lg);
  font-weight: 550;
}

/* #ifdef H5 */
@media screen and (min-width: 768px) {
  .footer-actions {
    width: 480px;
    margin: 0 auto;
  }
}
/* #endif */
.editor {
  border-radius: var(--foundation-radius);
  overflow: hidden;
}
.welcome-note {
  padding: 16px;
  background: var(--foundation-playful-surface);
  border-radius: var(--foundation-radius);
}
</style>
