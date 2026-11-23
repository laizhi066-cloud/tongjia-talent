<!--
 * @description 孩子信息表单（S12）：姓名 / 性别 / 与家长关系 / 出生日期 / 身份证；
 *   新增时证件必填，编辑时留空表示不修改；18 位与生日一致校验在提交与失焦时触发。
 *   只负责表单渲染与校验，接口提交由页面经 `useProfileChildForm` 完成。
 * @file src/pages/profile/components/ProfileChildFormPanel.vue
-->
<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { FormInstance, FormSchema, FormSchemaIssue } from '@wot-ui/ui/components/wd-form/types'
import type { TalentChildInput, TalentChildItem } from '@/api/talent-types'
import {
  CHILD_RELATION_OPTIONS,
  dateStringToTimestamp,
  idNoBirthday,
  isFutureBirthday,
  isValidBirthday,
  isValidIdNo,
  normalizeIdNo,
  PROFILE_GENDER_OPTIONS,
  relationLabelOf,
  timestampToDateString,
} from '../profile-fields'
import type { ProfileGenderValue } from '../profile-fields'
import type { ChildFormField } from '../composables/useProfileChildForm'

const props = defineProps<{
  mode: 'create' | 'edit'
  /** 编辑时的当前孩子行（含脱敏证件），新增为 null。 */
  child: TalentChildItem | null
  submitting: boolean
  /** 服务端字段级错误（409 / 422），展示在对应字段下或表单顶部。 */
  serverError: { field?: ChildFormField, message: string } | null
}>()

const emit = defineEmits<{
  submit: [input: TalentChildInput | Partial<TalentChildInput>]
  unchanged: []
  clearError: []
  openPrivacy: []
}>()

const formRef = ref<FormInstance>()
const form = reactive({
  name: '',
  gender: '' as ProfileGenderValue | '',
  relation: '',
  birthday: '',
  idNo: '',
})

const maxBirthday = Date.now()
const minBirthday = new Date(1900, 0, 1).getTime()
const relationPickerVisible = ref(false)
const relationPickerValue = ref<string[]>([])
const birthdayPickerVisible = ref(false)
const birthdayPickerValue = ref<number>(dateStringToTimestamp(''))

/** 关系选择器选项（Wot picker 使用 value / label）。 */
const relationColumns = CHILD_RELATION_OPTIONS.map(option => ({ value: option.value, label: option.label }))
const relationLabel = computed(() => relationLabelOf(form.relation))

/** 编辑时只显示脱敏证件，不回显全号。 */
const idNoPlaceholder = computed(() => props.mode === 'create' ? '请输入 18 位身份证号' : '留空表示不修改')
/** 证件说明与生日一致性合并成一句，避免表单底部堆三行小字。 */
const idNoHint = computed(() => {
  if (props.mode === 'edit' && props.child)
    return `已登记证件：${props.child.maskedIdNo || '未填写'}；填写新号码才会更新，且出生日期需与证件一致。`
  return '身份证号仅用于匹配检测报告，页内只展示脱敏信息；出生日期需与证件一致。'
})

/** 必填字段：新增时证件必填，编辑时可留空。 */
const requiredFields = computed(() => new Set<string>([
  'name',
  'gender',
  'relation',
  'birthday',
  ...(props.mode === 'create' ? ['idNo'] : []),
]))

/** 表单校验引擎：字段级必填、长度、生日合法性、身份证 18 位与生日一致。 */
const schema: FormSchema = {
  validate(model) {
    const issues: FormSchemaIssue[] = []
    const push = (field: ChildFormField, message: string) => issues.push({ path: [field], message })

    const name = String(model.name || '').trim()
    if (!name)
      push('name', '请填写孩子姓名')
    else if (name.length > 50)
      push('name', '姓名不能超过 50 个字符')

    if (!model.gender)
      push('gender', '请选择性别')
    if (!model.relation)
      push('relation', '请选择与孩子的关系')

    const birthday = String(model.birthday || '')
    const rawIdNo = String(model.idNo || '').trim()
    if (!birthday)
      push('birthday', '请选择出生日期')
    else if (!isValidBirthday(birthday))
      push('birthday', '出生日期格式不正确')
    else if (isFutureBirthday(birthday))
      push('birthday', '出生日期不能晚于今天')

    if (!rawIdNo) {
      if (props.mode === 'create')
        push('idNo', '请填写身份证号')
    }
    else if (!isValidIdNo(rawIdNo)) {
      push('idNo', '身份证号应为 18 位')
    }
    else {
      const fromIdNo = idNoBirthday(rawIdNo)
      if (!fromIdNo)
        push('idNo', '身份证号中的出生日期不合法')
      else if (birthday && fromIdNo !== birthday)
        push('idNo', '身份证号与出生日期不一致')
    }
    return issues
  },
  isRequired(path: string) {
    return requiredFields.value.has(path)
  },
}

/** 初始化 / 切换孩子时回填表单；编辑时证件留空。 */
function resetForm(): void {
  form.name = props.child?.name || ''
  form.gender = (props.child?.gender as ProfileGenderValue | undefined) || ''
  form.relation = props.child?.relation || ''
  form.birthday = props.child?.birthday || ''
  form.idNo = ''
}
resetForm()
watch(() => props.child?.id, () => {
  resetForm()
  formRef.value?.reset()
})

/** 无法定位到表单字段的服务端错误在表单顶部统一提示。 */
const showFormAlert = computed(() => Boolean(
  props.serverError
  && props.serverError.message
  && props.serverError.field !== 'name'
  && props.serverError.field !== 'idNo',
))

/** 用户修改任一字段后清除上一次的服务端错误。 */
watch(() => [form.name, form.gender, form.relation, form.birthday, form.idNo], () => {
  if (props.serverError)
    emit('clearError')
})

/** 打开关系选择器，默认定位当前值。 */
function openRelationPicker(): void {
  if (props.submitting)
    return
  relationPickerValue.value = form.relation ? [form.relation] : []
  relationPickerVisible.value = true
}

/** 关系选择确认。 */
function confirmRelation(event: { value: Array<string | number> }): void {
  const value = String(event.value?.[0] || '')
  if (value)
    form.relation = value
}

/** 打开出生日期选择器，默认定位当前生日。 */
function openBirthdayPicker(): void {
  if (props.submitting)
    return
  birthdayPickerValue.value = dateStringToTimestamp(form.birthday)
  birthdayPickerVisible.value = true
}

/** 出生日期确认（Wot 返回毫秒时间戳）。 */
function confirmBirthday(event: { value: number | string | Array<number | string> }): void {
  const raw = Array.isArray(event.value) ? event.value[0] : event.value
  const timestamp = Number(raw)
  if (Number.isFinite(timestamp))
    form.birthday = timestampToDateString(timestamp)
}

/** 编辑模式：只提交发生变化字段；身份证非空才提交。 */
function buildEditPayload(): Partial<TalentChildInput> {
  const payload: Partial<TalentChildInput> = {}
  const current = props.child
  const name = form.name.trim()
  if (name && name !== (current?.name || ''))
    payload.name = name
  if (form.gender && form.gender !== current?.gender)
    payload.gender = form.gender
  if (form.relation && form.relation !== (current?.relation || ''))
    payload.relation = form.relation
  if (form.birthday && form.birthday !== (current?.birthday || ''))
    payload.birthday = form.birthday
  const idNo = normalizeIdNo(form.idNo)
  if (idNo)
    payload.idNo = idNo
  return payload
}

/** 提交：先做表单校验，通过后交给页面调用接口。 */
async function handleSubmit(): Promise<void> {
  if (props.submitting)
    return
  const result = await formRef.value?.validate()
  if (!result?.valid)
    return
  if (props.mode === 'edit') {
    const payload = buildEditPayload()
    if (Object.keys(payload).length === 0) {
      emit('unchanged')
      return
    }
    emit('submit', payload)
    return
  }
  emit('submit', {
    name: form.name.trim(),
    gender: form.gender as ProfileGenderValue,
    relation: form.relation,
    birthday: form.birthday,
    idNo: normalizeIdNo(form.idNo),
  })
}
</script>

<template>
  <view class="child-form">
    <!-- 服务端错误：不暴露技术码 -->
    <view v-if="showFormAlert" class="form-alert" role="alert">
      <wd-icon name="info-circle" size="18px" color="var(--foundation-danger)" />
      <text class="form-alert__text">{{ props.serverError.message }}</text>
    </view>

    <wd-form ref="formRef" :model="form" :schema="schema" size="large" validate-trigger="blur" custom-class="child-form__form">
      <wd-cell-group insert custom-class="profile-cell-group">
        <wd-form-item title="姓名" prop="name" required>
          <wd-input
            v-model="form.name"
            :maxlength="50"
            clearable
            :disabled="props.submitting"
            placeholder="请输入孩子姓名"
            aria-label="孩子姓名"
          />
          <text v-if="props.serverError?.field === 'name'" class="field-error">{{ props.serverError.message }}</text>
        </wd-form-item>

        <wd-form-item title="性别" prop="gender" required>
          <wd-radio-group v-model="form.gender" direction="horizontal" :disabled="props.submitting">
            <wd-radio v-for="option in PROFILE_GENDER_OPTIONS" :key="option.value" :value="option.value">
              {{ option.label }}
            </wd-radio>
          </wd-radio-group>
        </wd-form-item>

        <wd-form-item
          title="与孩子关系"
          prop="relation"
          required
          is-link
          :value="relationLabel"
          placeholder="请选择与孩子的关系"
          role="button"
          tabindex="0"
          aria-label="选择与孩子的关系"
          @click="openRelationPicker"
          @keyup.enter="openRelationPicker"
          @keyup.space.prevent="openRelationPicker"
        />

        <wd-form-item
          title="出生日期"
          prop="birthday"
          required
          is-link
          :value="form.birthday"
          placeholder="请选择出生日期"
          role="button"
          tabindex="0"
          aria-label="选择出生日期"
          @click="openBirthdayPicker"
          @keyup.enter="openBirthdayPicker"
          @keyup.space.prevent="openBirthdayPicker"
        />
      </wd-cell-group>

      <wd-cell-group insert custom-class="profile-cell-group profile-cell-group--gap">
        <wd-form-item title="身份证" prop="idNo" :required="props.mode === 'create'">
          <wd-input
            v-model="form.idNo"
            type="idcard"
            :maxlength="18"
            clearable
            :disabled="props.submitting"
            :placeholder="idNoPlaceholder"
            aria-label="身份证号"
          />
          <text v-if="props.serverError?.field === 'idNo'" class="field-error">{{ props.serverError.message }}</text>
        </wd-form-item>
      </wd-cell-group>
    </wd-form>

    <view class="hints">
      <text class="hints__item">{{ idNoHint }}</text>
      <view class="hints__consent">
        <text class="hints__item">孩子信息仅用于同步报告与身份核对，需取得监护人同意，详见</text>
        <text
          class="hints__link"
          role="link"
          tabindex="0"
          @click="emit('openPrivacy')"
          @keyup.enter="emit('openPrivacy')"
          @keyup.space.prevent="emit('openPrivacy')"
        >
          《隐私政策》
        </text>
        <text class="hints__item">。</text>
      </view>
    </view>

    <view class="child-form__footer">
      <wd-button
        type="primary"
        size="large"
        block
        :loading="props.submitting"
        :disabled="props.submitting"
        @click="handleSubmit"
      >
        {{ props.submitting ? '保存中' : '保存' }}
      </wd-button>
      <text class="child-form__footer-tip">保存后将自动发起检测查询</text>
    </view>

    <wd-picker
      v-model="relationPickerValue"
      v-model:visible="relationPickerVisible"
      title="与孩子的关系"
      :columns="relationColumns"
      @confirm="confirmRelation"
    />
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
.child-form {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-2) var(--foundation-page-padding) calc(112px + env(safe-area-inset-bottom));
  box-sizing: border-box;
  overflow-x: hidden;
}

.form-alert {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-1);
  padding: var(--sp-3);
  box-sizing: border-box;
  border: 1px solid var(--foundation-danger);
  border-radius: var(--foundation-radius-sm);
  background: var(--foundation-card);
}
.form-alert__text {
  flex: 1;
  color: var(--foundation-danger);
  font-size: var(--fs-caption);
  line-height: 1.6;
  overflow-wrap: break-word;
}
.child-form__form {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
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
.profile-cell-group--gap {
  margin-top: 0;
}
:deep(.wd-radio) {
  min-height: 44px;
  padding: 10px 0;
  box-sizing: border-box;
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
.hints {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--sp-3) var(--sp-4);
  border: 1px solid var(--foundation-border);
  border-radius: var(--foundation-radius-sm);
  background: var(--foundation-card-subtle);
}
.hints__item {
  color: var(--foundation-text-muted);
  font-size: var(--fs-tag);
  line-height: 1.7;
  overflow-wrap: break-word;
}
.hints__consent {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
}
.hints__link {
  display: inline-block;
  min-height: 44px;
  margin: -12px 0;
  padding: 12px 0;
  color: var(--foundation-interactive);
  font-size: var(--fs-tag);
  line-height: 1.7;
}
.child-form__footer {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px var(--foundation-page-padding) calc(12px + env(safe-area-inset-bottom));
  box-sizing: border-box;
  background: var(--foundation-card);
  box-shadow: var(--foundation-shadow-bar);
}
.child-form__footer-tip {
  color: var(--foundation-text-muted);
  font-size: var(--fs-tag);
  text-align: center;
}
/* #ifdef H5 */
@media screen and (min-width: 768px) {
  .child-form__footer {
    width: 480px;
    margin: 0 auto;
  }
}
/* #endif */
</style>
