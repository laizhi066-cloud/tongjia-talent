/**
 * @description 编辑资料页数据编排：读取家长资料（中性账户 + 会员档案脱敏合并）、
 *   保存变化字段（手机号只读不提交）、头像经受控上传接口更新。
 * @file src/pages/profile/composables/useProfileEditor.ts
 */
import { ref } from 'vue'
import { uploadAvatar as uploadAvatarFile } from '@/api/auth'
import { getTalentProfile, updateTalentProfile } from '@/api/talent'
import type { TalentProfileInput, TalentProfileResponse } from '@/api/talent-types'
import { apiErrorCode, apiErrorMessage, apiErrorStatus } from '@/http/http'
import { useAuthStore } from '@/store/auth'

/** 编辑资料页状态。 */
export type ProfileEditorState = 'loading' | 'ready' | 'unbound' | 'error'

/** 可定位到字段的错误。 */
export type ProfileEditorField = 'name' | 'nickname' | 'birthday' | 'idNo'

/** 保存结果：成功返回合并后的资料，失败带字段/文案。 */
export interface ProfileSaveResult {
  ok: boolean
  profile?: TalentProfileResponse
  field?: ProfileEditorField
  message: string
}

/** 按服务端文案推断字段，供表单在对应字段下展示错误。 */
function fieldFromMessage(message: string): ProfileEditorField | undefined {
  if (message.includes('身份证'))
    return 'idNo'
  if (message.includes('出生日期') || message.includes('生日'))
    return 'birthday'
  if (message.includes('昵称'))
    return 'nickname'
  if (message.includes('姓名'))
    return 'name'
  return undefined
}

/** 编辑资料数据编排。 */
export function useProfileEditor() {
  const authStore = useAuthStore()
  const profile = ref<TalentProfileResponse | null>(null)
  const state = ref<ProfileEditorState>('loading')
  const errorMessage = ref('')
  const saving = ref(false)
  const uploadingAvatar = ref(false)

  /** 读取资料；未绑定家长（404）单独成态，提示先回「我的」重新匹配。 */
  async function load(): Promise<void> {
    if (!authStore.isLoggedIn) {
      state.value = 'error'
      errorMessage.value = ''
      return
    }
    state.value = 'loading'
    errorMessage.value = ''
    try {
      profile.value = await getTalentProfile()
      state.value = 'ready'
    }
    catch (error) {
      const status = apiErrorStatus(error)
      if (status === 404 || apiErrorCode(error) === 'UNBOUND') {
        state.value = 'unbound'
        errorMessage.value = '暂未关联会员档案，无法编辑资料'
        return
      }
      state.value = 'error'
      errorMessage.value = status === 401 || status === 403
        ? ''
        : apiErrorMessage(error, '资料暂时无法读取，请稍后重试')
    }
  }

  /** 保存变化字段；成功同步本地资料，供页面头像/姓名即时刷新。 */
  async function save(input: TalentProfileInput): Promise<ProfileSaveResult> {
    if (saving.value)
      return { ok: false, message: '' }
    saving.value = true
    try {
      const next = await updateTalentProfile(input)
      profile.value = next
      return { ok: true, profile: next, message: '' }
    }
    catch (error) {
      const status = apiErrorStatus(error)
      const code = apiErrorCode(error)
      const message = apiErrorMessage(error, '保存失败，请稍后重试')
      if (code === 'IDNO_EXISTS')
        return { ok: false, field: 'idNo', message: '该身份证号已存在会员档案，请联系客服核对' }
      if (code === 'VALIDATION_ERROR' || status === 422)
        return { ok: false, field: fieldFromMessage(message), message }
      if (status === 404 || code === 'UNBOUND')
        return { ok: false, message: '暂未关联会员档案，请返回「我的」重新匹配' }
      if (status === 401 || status === 403)
        return { ok: false, message: '' }
      return { ok: false, message: message || '保存失败，请稍后重试' }
    }
    finally {
      saving.value = false
    }
  }

  /** 头像：先上传到受控接口，再刷新中性账户资料；失败保留原头像。 */
  async function changeAvatar(filePath: string): Promise<void> {
    if (uploadingAvatar.value || !filePath)
      return
    uploadingAvatar.value = true
    try {
      await uploadAvatarFile(filePath)
      await authStore.refreshProfile()
      const avatar = authStore.profile?.avatar || ''
      if (profile.value)
        profile.value = { ...profile.value, avatar }
      uni.showToast({ title: '头像已更新', icon: 'success' })
    }
    catch (error) {
      uni.showToast({ title: apiErrorMessage(error, '头像上传失败，请重试'), icon: 'none' })
    }
    finally {
      uploadingAvatar.value = false
    }
  }

  return {
    profile,
    state,
    errorMessage,
    saving,
    uploadingAvatar,
    load,
    save,
    changeAvatar,
  }
}
