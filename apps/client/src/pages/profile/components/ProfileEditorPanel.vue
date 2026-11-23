<!--
 * @description 编辑资料表单（S10）：头像 / 昵称 / 姓名 / 性别 / 出生日期 / 身份证；
 *   手机号只读并说明原因（M7 spec U1）；身份证留空表示不修改，仅展示脱敏占位。
 *   只负责表单渲染与校验，保存与头像上传由页面经 `useProfileEditor` 完成。
 * @file src/pages/profile/components/ProfileEditorPanel.vue
-->
<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import PortalAvatar from '@/modules/foundation-portal/components/PortalAvatar.vue'
import type { FormInstance, FormSchema, FormSchemaIssue } from '@wot-ui/ui/components/wd-form/types'
import type { TalentProfileInput, TalentProfileResponse } from '@/api/talent-types'
import {
  dateStringToTimestamp,
  idNoBirthday,
  isFutureBirthday,
  isValidBirthday,
  isValidIdNo,
  normalizeIdNo,
  PROFILE_GENDER_OPTIONS,
  timestampToDateString,
} from '../profile-fields'
import type { ProfileGenderValue } from '../profile-fields'
import type { ProfileEditorField } from '../composables/useProfileEditor'

interface AvatarChooseEvent {
  detail: { avatarUrl?: string }
}

const props = defineProps<{
  profile: TalentProfileResponse
  saving: boolean
  uploadingAvatar: boolean
  serverError: { field?: ProfileEditorField, message: string } | null
}>()

const emit = defineEmits<{
  save: [input: TalentProfileInput]
  unchanged: []
  avatar: [filePath: string]
  clearError: []
  openPrivacy: []
}>()

const formRef = ref<FormInstance>()
const form = reactive({
  nickname: '',
  name: '',
  gender: '' as ProfileGenderValue | '',
  birthday: '',
  idNo: '',
})

const maxBirthday = Date.now()
const minBirthday = new Date(1900, 0, 1).getTime()
const birthdayPickerVisible = ref(false)
const birthdayPickerValue = ref<number>(dateStringToTimestamp(''))

const idNoPlaceholder = computed(() => props.profile.hasIdNo ? '留空表示不修改' : '选填，18 位身份证号')

/** 表单校验引擎：昵称 / 姓名必填与长度、生日合法、身份证 18 位且与生日一致。 */
const schema: FormSchema = {
  validate(model) {
    const issues: FormSchemaIssue[] = []
    const push = (field: ProfileEditorField, message: string) => issues.push({ path: [field], message })

    const nickname = String(model.nickname || '').trim()
    if (!nickname)
      push('nickname', '请填写昵称')
    else if (nickname.length > 20)
      push('nickname', '昵称不能超过 20 个字符')

    const name = String(model.name || '').trim()
    if (!name)
      push('name', '请填写姓名')
    else if (name.length > 50)
      push('name', '姓名不能超过 50 个字符')

    const birthday = String(model.birthday || '')
    if (birthday && !isValidBirthday(birthday))
      push('birthday', '出生日期格式不正确')
    else if (birthday && isFutureBirthday(birthday))
      push('birthday', '出生日期不能晚于今天')

    const rawIdNo = String(model.idNo || '').trim()
    if (rawIdNo) {
      if (!isValidIdNo(rawIdNo)) {
        push('idNo', '身份证号应为 18 位')
      }
      else {
        const fromIdNo = idNoBirthday(rawIdNo)
        if (!fromIdNo)
          push('idNo', '身份证号中的出生日期不合法')
        else if (!birthday)
          push('idNo', '填写身份证号前请先选择出生日期')
        else if (fromIdNo !== birthday)
          push('idNo', '身份证号与出生日期不一致')
      }
    }
    return issues
  },
  isRequired(path: string) {
    return path === 'nickname' || path === 'name'
  },
}

/** 用服务端资料回填表单；身份证留空，不回显全号。 */
function resetForm(): void {
  form.nickname = props.profile.nickname || ''
  form.name = props.profile.name || ''
  form.gender = (props.profile.gender as ProfileGenderValue | undefined) || ''
  form.birthday = props.profile.birthday || ''
  form.idNo = ''
}
resetForm()
watch(() => props.profile.id, () => {
  resetForm()
  formRef.value?.reset()
})

/** 无法定位到输入字段的服务端错误在表单顶部统一提示。 */
const showFormAlert = computed(() => Boolean(
  props.serverError
  && props.serverError.message
  && props.serverError.field !== 'nickname'
  && props.serverError.field !== 'name'
  && props.serverError.field !== 'idNo',
))

/** 用户修改任一字段后清除上一次的服务端错误。 */
watch(() => [form.nickname, form.name, form.gender, form.birthday, form.idNo], () => {
  if (props.serverError)
    emit('clearError')
})

/** 打开生日选择器。 */
function openBirthdayPicker(): void {
  if (props.saving || props.uploadingAvatar)
    return
  birthdayPickerValue.value = dateStringToTimestamp(form.birthday)
  birthdayPickerVisible.value = true
}

/** 生日确认（Wot 返回毫秒时间戳）。 */
function confirmBirthday(event: { value: number | string | Array<number | string> }): void {
  const raw = Array.isArray(event.value) ? event.value[0] : event.value
  const timestamp = Number(raw)
  if (Number.isFinite(timestamp))
    form.birthday = timestampToDateString(timestamp)
}

/** 小程序头像开放能力：临时文件交给页面受控上传。 */
function handleWechatAvatar(event: AvatarChooseEvent): void {
  const filePath = String(event?.detail?.avatarUrl || '').trim()
  if (filePath)
    emit('avatar', filePath)
}

/** H5 系统图片选择器（仅 H5 分支调用）。 */
function chooseAvatarFromDevice(): void {
  if (props.saving || props.uploadingAvatar)
    return
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (result) => {
      const filePath = result.tempFilePaths?.[0]
      if (filePath)
        emit('avatar', filePath)
    },
  })
}

/** 只提交变化字段；手机号只读，不提交；证件留空不提交。 */
function buildChanges(): TalentProfileInput {
  const changes: TalentProfileInput = {}
  const nickname = form.nickname.trim()
  if (nickname !== String(props.profile.nickname || '').trim())
    changes.nickname = nickname
  const name = form.name.trim()
  if (name !== String(props.profile.name || '').trim())
    changes.name = name
  if (form.gender && form.gender !== props.profile.gender)
    changes.gender = form.gender
  if (form.birthday && form.birthday !== props.profile.birthday)
    changes.birthday = form.birthday
  const idNo = normalizeIdNo(form.idNo)
  if (idNo)
    changes.idNo = idNo
  return changes
}

/** 提交：校验通过后交给页面调用资料接口。 */
async function handleSubmit(): Promise<void> {
  if (props.saving || props.uploadingAvatar)
    return
  const result = await formRef.value?.validate()
  if (!result?.valid)
    return
  const changes = buildChanges()
  if (Object.keys(changes).length === 0) {
    emit('unchanged')
    return
  }
  emit('save', changes)
}
</script>

<template>
  <view class="profile-editor">
    <view v-if="showFormAlert" class="form-alert" role="alert">
      <wd-icon name="info-circle" size="18px" color="var(--foundation-danger)" />
      <text class="form-alert__text">{{ props.serverError?.message }}</text>
    </view>

    <wd-form ref="formRef" :model="form" :schema="schema" size="large" validate-trigger="blur" custom-class="profile-editor__form">
      <wd-cell-group insert custom-class="profile-cell-group">
        <wd-form-item title="头像" center>
          <!-- #ifdef MP-WEIXIN -->
          <view class="avatar-field">
            <wd-button
              variant="text"
              custom-style="padding:0;min-width:56px;overflow:visible"
              open-type="chooseAvatar"
              aria-label="更换头像"
              :disabled="props.saving || props.uploadingAvatar"
              @chooseavatar="handleWechatAvatar"
            >
              <PortalAvatar
                :src="props.profile.avatar || ''"
                :size="56"
                bg="var(--foundation-surface)"
                color="var(--foundation-text-muted)"
              />
            </wd-button>
            <wd-icon name="right" size="16px" color="var(--foundation-text-muted)" />
          </view>
          <!-- #endif -->
          <!-- #ifndef MP-WEIXIN -->
          <view class="avatar-field">
            <wd-button
              variant="text"
              custom-style="padding:0;min-width:56px;overflow:visible"
              aria-label="更换头像"
              :disabled="props.saving || props.uploadingAvatar"
              @click="chooseAvatarFromDevice"
            >
              <PortalAvatar
                :src="props.profile.avatar || ''"
                :size="56"
                bg="var(--foundation-surface)"
                color="var(--foundation-text-muted)"
              />
            </wd-button>
            <wd-icon name="right" size="16px" color="var(--foundation-text-muted)" />
          </view>
          <!-- #endif -->
        </wd-form-item>

        <wd-form-item title="昵称" prop="nickname">
          <!-- #ifdef MP-WEIXIN -->
          <input
            v-model="form.nickname"
            class="nickname-input"
            type="nickname"
            maxlength="20"
            :disabled="props.saving"
            placeholder="点击使用微信昵称"
            aria-label="昵称"
          >
          <!-- #endif -->
          <!-- #ifndef MP-WEIXIN -->
          <wd-input
            v-model="form.nickname"
            :maxlength="20"
            :disabled="props.saving"
            placeholder="请输入昵称"
            aria-label="昵称"
          />
          <!-- #endif -->
          <text v-if="props.serverError?.field === 'nickname'" class="field-error">{{ props.serverError.message }}</text>
        </wd-form-item>

        <wd-form-item title="姓名" prop="name">
          <wd-input
            v-model="form.name"
            :maxlength="50"
            :disabled="props.saving"
            placeholder="请输入姓名"
            aria-label="姓名"
          />
          <text v-if="props.serverError?.field === 'name'" class="field-error">{{ props.serverError.message }}</text>
        </wd-form-item>

        <wd-form-item title="性别" prop="gender">
          <wd-radio-group v-model="form.gender" direction="horizontal" :disabled="props.saving">
            <wd-radio v-for="option in PROFILE_GENDER_OPTIONS" :key="option.value" :value="option.value">
              {{ option.label }}
            </wd-radio>
          </wd-radio-group>
        </wd-form-item>

        <wd-form-item
          title="出生日期"
          prop="birthday"
          is-link
          :value="form.birthday"
          placeholder="请选择出生日期"
          role="button"
          tabindex="0"
          aria-label="选择出生日期"
          @click="openBirthdayPicker"
          @keyup.enter="openBirthdayPicker"
          @keyup.space.prevent="openBirthdayPicker"
        >
          <text v-if="props.serverError?.field === 'birthday'" class="field-error">{{ props.serverError.message }}</text>
        </wd-form-item>

        <wd-form-item title="身份证" prop="idNo">
          <wd-input
            v-model="form.idNo"
            type="idcard"
            :maxlength="18"
            :disabled="props.saving"
            :placeholder="idNoPlaceholder"
            aria-label="身份证号"
          />
          <text v-if="props.serverError?.field === 'idNo'" class="field-error">{{ props.serverError.message }}</text>
        </wd-form-item>
      </wd-cell-group>
    </wd-form>

    <!-- 手机号只读（claim 唯一键真源）+ 隐私入口 -->
    <wd-cell-group insert custom-class="profile-cell-group">
      <wd-cell
        title="手机号"
        :value="props.profile.maskedMobile || '未填写'"
        prefix-icon="lock"
        aria-label="手机号只读"
      />
      <wd-cell
        title="隐私政策"
        prefix-icon="safe"
        is-link
        role="button"
        tabindex="0"
        aria-label="查看隐私政策"
        @click="emit('openPrivacy')"
        @keyup.enter="emit('openPrivacy')"
        @keyup.space.prevent="emit('openPrivacy')"
      />
    </wd-cell-group>
    <view class="profile-editor__footer">
      <wd-button
        type="primary"
        size="large"
        block
        :loading="props.saving"
        :disabled="props.saving || props.uploadingAvatar"
        @click="handleSubmit"
      >
        {{ props.saving ? '保存中' : '保存' }}
      </wd-button>
    </view>

    <wd-datetime-picker
      v-model="birthdayPickerValue"
      v-model:visible="birthdayPickerVisible"
      title="选择出生日期"
      type="date"
      :min-date="minBirthday"
      :max-date="maxBirthday"
      @confirm="confirmBirthday"
    />
  </view>
</template>

<style lang="scss" scoped>
.profile-editor {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-2) var(--foundation-page-padding) calc(96px + env(safe-area-inset-bottom));
  box-sizing: border-box;
  overflow-x: hidden;
}
.avatar-field {
  display: flex;
  overflow: visible;
  align-items: center;
  justify-content: flex-end;
  gap: var(--sp-2);
}
.nickname-input {
  width: 100%;
  min-height: 44px;
  border: 0;
  background: transparent;
  color: var(--foundation-text);
  font-size: var(--fs-body-lg);
  text-align: right;
  outline: none;
}
.profile-editor :deep(.wd-input__inner) {
  text-align: right;
}
.profile-editor :deep(.wd-radio-group) {
  display: flex;
  width: 100%;
  justify-content: flex-end;
}
.profile-editor :deep(.wd-form-item__content) {
  justify-content: flex-end;
}
.profile-editor :deep(.wd-form-item__value) {
  flex: 1;
  text-align: right;
}
.profile-editor :deep(.wd-cell__required) {
  display: none;
}
.profile-editor :deep(.wd-cell__value) {
  justify-content: flex-end;
  text-align: right;
}
.profile-editor__form {
  --wot-form-item-error-message-color: var(--foundation-danger);
  --wot-form-item-error-message-font-size: var(--fs-caption);
  --wot-form-item-placeholder-color: var(--foundation-text-muted);
  --wot-cell-title-font-size-large: var(--fs-body-lg);
  --wot-cell-value-font-size-large: var(--fs-body-lg);
  --wot-cell-title-line-height-large: 24px;
  --wot-cell-value-line-height-large: 24px;
}
:deep(.profile-cell-group) {
  --wot-cell-group-insert-margin: 0;
  --wot-cell-group-insert-radius: var(--foundation-radius);
  --wot-cell-group-bg: var(--foundation-card);
  --wot-cell-bg: var(--foundation-card);
  --wot-cell-border-color: var(--foundation-border);
  --wot-cell-arrow-color: var(--foundation-text-muted);
}
:deep(.wd-radio) {
  min-height: 44px;
  padding: 10px 0;
  box-sizing: border-box;
}
.form-alert {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  box-sizing: border-box;
  border-radius: var(--foundation-radius-sm);
  background: var(--foundation-danger-surface);
}
.form-alert__text {
  flex: 1;
  color: var(--foundation-danger);
  font-size: var(--fs-caption);
  line-height: 1.6;
  overflow-wrap: break-word;
}
.field-error {
  display: block;
  margin-top: 4px;
  color: var(--foundation-danger);
  font-size: var(--fs-caption);
  line-height: 1.5;
  text-align: left;
  overflow-wrap: break-word;
}
.profile-editor__footer {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 2;
  padding: 12px var(--foundation-page-padding) calc(12px + env(safe-area-inset-bottom));
  box-sizing: border-box;
  background: var(--foundation-card);
  box-shadow: var(--foundation-shadow-bar);
}
/* #ifdef H5 */
@media screen and (min-width: 768px) {
  .profile-editor__footer {
    width: 480px;
    margin: 0 auto;
  }
}
/* #endif */
</style>
