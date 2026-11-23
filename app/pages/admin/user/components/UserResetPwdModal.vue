/**
 * @description 用户重置密码弹窗 — 表单验证集成
 * @file app/pages/admin/user/components/UserResetPwdModal.vue
 */
<script setup lang="ts">
import { NModal, NForm, NFormItem, NInput, NButton, useMessage } from 'naive-ui'
const message = useMessage()
const show = ref(false)
const saving = ref(false)
const currentUser = ref<Record<string, any> | null>(null)

const form = reactive({ newPassword: '' })
const errors = ref<Record<string, string>>({})

function validate(): boolean {
  const errs: Record<string, string> = {}
  if (!form.newPassword?.trim()) {
    errs.newPassword = '新密码不能为空'
  } else if (form.newPassword.length < 8) {
    errs.newPassword = '密码长度不能小于8位'
  }
  errors.value = errs
  return Object.keys(errs).length === 0
}

function open(user: Record<string, any>) {
  currentUser.value = user
  form.newPassword = ''
  errors.value = {}
  show.value = true
}

async function handleSave() {
  if (!validate()) return
  saving.value = true
  try {
    await useUserApi().resetPassword(currentUser.value!.id, form.newPassword, form.newPassword)
    show.value = false
    message.success('密码重置成功')
  } catch {
    /* 全局拦截器已弹出错误提示 */
  } finally {
    saving.value = false
  }
}

defineExpose({ open })
</script>

<template>
  <n-modal v-model:show="show" preset="card" style="width:420px" title="重置密码" :bordered="false" size="small">
    <p class="mb-4 text-sm text-muted-foreground">请输入新密码，重置后用户需使用新密码登录</p>
    <template v-if="currentUser">
      <p class="mb-3 text-sm text-muted-foreground">
        重置用户「{{ currentUser.displayName || currentUser.email }}」的登录密码
      </p>
      <n-form label-placement="top">
        <n-form-item label="新密码" required :feedback="errors.newPassword" :validation-status="errors.newPassword ? 'error' : undefined">
          <n-input v-model:value="form.newPassword" type="password" placeholder="输入新密码（至少8位）" />
        </n-form-item>
      </n-form>
      <div class="flex justify-end gap-3 mt-6">
        <n-button @click="show = false">取消</n-button>
        <n-button type="primary" :loading="saving" @click="handleSave">保存</n-button>
      </div>
    </template>
  </n-modal>
</template>
