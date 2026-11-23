/**
 * @description 孩子信息页（新增 / 编辑）数据编排：编辑时从孩子列表定位档案（无单条详情接口），
 *   提交复用 M7-B `POST/PUT /api/client/talent/children`，并把 409 / 422 映射为字段级文案。
 * @file src/pages/profile/composables/useProfileChildForm.ts
 */
import { ref } from 'vue'
import { createTalentChild, getTalentChildren, updateTalentChild } from '@/api/talent'
import type { TalentChildInput, TalentChildItem } from '@/api/talent-types'
import { apiErrorCode, apiErrorMessage, apiErrorStatus } from '@/http/http'
import { normalizeIdNo } from '../profile-fields'

/** 孩子信息页状态。 */
export type ChildFormState = 'loading' | 'ready' | 'notfound' | 'error'

/** 可定位到字段的错误。 */
export type ChildFormField = 'name' | 'gender' | 'relation' | 'birthday' | 'idNo'

/** 提交结果：成功返回最新孩子行，失败带字段/文案。 */
export interface ChildSubmitResult {
  ok: boolean
  item?: TalentChildItem
  field?: ChildFormField
  message: string
}

/** 按服务端文案推断字段，供表单在对应字段下展示错误。 */
function fieldFromMessage(message: string): ChildFormField | undefined {
  if (message.includes('身份证'))
    return 'idNo'
  if (message.includes('出生日期') || message.includes('生日'))
    return 'birthday'
  if (message.includes('姓名'))
    return 'name'
  if (message.includes('性别'))
    return 'gender'
  if (message.includes('关系'))
    return 'relation'
  return undefined
}

/** 孩子信息数据编排。 */
export function useProfileChildForm() {
  const child = ref<TalentChildItem | null>(null)
  const state = ref<ChildFormState>('loading')
  const errorMessage = ref('')
  const submitting = ref(false)

  /** 编辑模式：从孩子列表定位档案；不存在 / 越权统一「内容不可查看」。 */
  async function loadForEdit(childId: string): Promise<void> {
    state.value = 'loading'
    errorMessage.value = ''
    try {
      const response = await getTalentChildren()
      const target = (response.items || []).find(item => item.id === childId) || null
      if (!target) {
        state.value = 'notfound'
        errorMessage.value = '内容不可查看'
        return
      }
      child.value = target
      state.value = 'ready'
    }
    catch (error) {
      const status = apiErrorStatus(error)
      if (status === 404 || apiErrorCode(error) === 'UNBOUND') {
        state.value = 'notfound'
        errorMessage.value = '内容不可查看'
        return
      }
      state.value = 'error'
      errorMessage.value = status === 401 || status === 403
        ? ''
        : apiErrorMessage(error, '孩子档案暂时无法读取，请稍后重试')
    }
  }

  /** 新增模式直接进入表单。 */
  function startCreate(): void {
    child.value = null
    state.value = 'ready'
    errorMessage.value = ''
  }

  /** 提交新增 / 编辑；编辑时只提交变化字段，身份证留空表示不修改。 */
  async function submit(input: TalentChildInput | Partial<TalentChildInput>, childId?: string): Promise<ChildSubmitResult> {
    if (submitting.value)
      return { ok: false, message: '' }
    submitting.value = true
    try {
      const item = childId
        ? await updateTalentChild(childId, input as Partial<TalentChildInput>)
        : await createTalentChild(input as TalentChildInput)
      return { ok: true, item, message: '' }
    }
    catch (error) {
      const status = apiErrorStatus(error)
      const code = apiErrorCode(error)
      const message = apiErrorMessage(error, '保存失败，请稍后重试')
      if (code === 'CHILD_IDNO_EXISTS')
        return { ok: false, field: 'idNo', message: '该身份证已存在孩子档案，请联系客服核对' }
      if (code === 'VALIDATION_ERROR' || status === 422)
        return { ok: false, field: fieldFromMessage(message), message }
      if (status === 404 || code === 'UNBOUND')
        return { ok: false, message: '内容不可查看' }
      if (status === 401 || status === 403)
        return { ok: false, message: '' }
      return { ok: false, message: message || '保存失败，请稍后重试' }
    }
    finally {
      submitting.value = false
    }
  }

  /** 归一化身份证后再提交（末位小写 x 转大写、去空白）。 */
  function normalizeInput(input: TalentChildInput | Partial<TalentChildInput>) {
    if (input.idNo === undefined)
      return input
    const idNo = normalizeIdNo(String(input.idNo || ''))
    return idNo ? { ...input, idNo } : { ...input, idNo: undefined }
  }

  return {
    child,
    state,
    errorMessage,
    submitting,
    loadForEdit,
    startCreate,
    submit,
    normalizeInput,
  }
}
