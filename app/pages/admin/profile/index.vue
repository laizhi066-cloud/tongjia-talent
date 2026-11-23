/**
 * @description 个人中心页面 — 个人信息展示、头像上传、密码修改
 * @file app/pages/admin/profile/index.vue
 * @route GET /api/admin/profile / PUT /api/admin/profile / PUT /api/admin/profile/password
 */
<script setup lang="ts">
import { useMessage, NAlert, NButton, NCard, NEmpty, NForm, NFormItem, NInput, NSpin } from 'naive-ui'
definePageMeta({ layout: 'admin', middleware: ['auth', 'permission-guard'] })

const message = useMessage()
const user = ref<Record<string, any> | null>(null)
const loading = ref(false)
const loadError = ref('')

const profileFormRef = ref(null)
const profileFormData = reactive({
  displayName: '',
  phone: '',
})
const profileRules = {
  displayName: { required: true, message: '姓名不能为空', trigger: 'blur' },
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }],
}

const pwdFormRef = ref(null)
const pwdFormData = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})
const pwdRules = {
  oldPassword: { required: true, message: '旧密码不能为空', trigger: 'blur' },
  newPassword: [
    { required: true, message: '新密码不能为空', trigger: 'blur' },
    { min: 6, message: '密码长度不能小于6位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (_rule: any, value: string) => value === pwdFormData.newPassword,
      message: '两次输入的密码不一致',
      trigger: 'blur',
    },
  ],
}

const savingProfile = ref(false)
const savingPwd = ref(false)
const avatarFilename = ref('')
const uploadRef = ref()

async function fetchProfile() {
  loading.value = true
  loadError.value = ''
  try {
    user.value = await useProfileApi().fetchProfile()
    avatarFilename.value = user.value?.avatar || ''
    profileFormData.displayName = user.value!.displayName || ''
    profileFormData.phone = user.value!.phone || ''
  } catch {
    loadError.value = '个人资料加载失败，请检查网络后重试。'
  } finally {
    loading.value = false
  }
}

async function onSubmitProfile() {
  try {
    await (profileFormRef.value as any)?.validate()
  } catch { return }
  savingProfile.value = true
  try {
    await useProfileApi().updateProfile(profileFormData)
    // 头像走 avatar 裁切模式，必须显式提交待上传文件（之前漏调，裁完头像保存不生效）
    if (uploadRef.value?.pendingFile && user.value?.id) {
      await uploadRef.value.submit(user.value.id)
    }
    message.success('保存成功')
    fetchProfile()
  } catch (e: any) {
    message.error(e?.data?.message || '保存失败')
  } finally {
    savingProfile.value = false
  }
}

async function onSubmitPwd() {
  try {
    await (pwdFormRef.value as any)?.validate()
  } catch { return }
  savingPwd.value = true
  try {
    await useProfileApi().changePassword({
      oldPassword: pwdFormData.oldPassword,
      newPassword: pwdFormData.newPassword,
    })
    message.success('密码修改成功')
    pwdFormData.oldPassword = ''
    pwdFormData.newPassword = ''
    pwdFormData.confirmPassword = ''
  } catch (e: any) {
    message.error(e?.data?.message || '修改失败')
  } finally {
    savingPwd.value = false
  }
}

onMounted(fetchProfile)
</script>

<template>
  <div class="profile-page admin-scroll-page">
    <NAlert v-if="loadError" type="error" title="个人资料加载失败" class="profile-error">
      {{ loadError }}
      <NButton size="small" class="ml-3" @click="fetchProfile">重试</NButton>
    </NAlert>
    <NSpin :show="loading">
      <NEmpty v-if="!user && !loading" description="暂无可用的个人资料" />
      <template v-else-if="user">
    <n-card size="small" class="profile-summary">
      <template #header>
        <div class="flex flex-row items-center gap-4">
          <AppUpload ref="uploadRef" v-model="avatarFilename" :record-id="user?.id || ''" />
          <div>
            <div class="text-base font-medium">{{ user?.displayName || user?.email || '用户' }}</div>
            <p class="text-sm" style="color:var(--muted-foreground);">{{ user?.email }}</p>
          </div>
        </div>
      </template>
      <div class="grid grid-cols-1 gap-3">
        <div class="flex gap-4 text-sm">
          <span class="w-20 font-medium shrink-0" style="color:var(--muted-foreground);">邮箱</span>
          <span>{{ user?.email || '-' }}</span>
        </div>
        <div class="flex gap-4 text-sm">
          <span class="w-20 font-medium shrink-0" style="color:var(--muted-foreground);">部门</span>
          <span>{{ user?.dept?.deptName || '-' }}</span>
        </div>
        <div class="flex gap-4 text-sm">
          <span class="w-20 font-medium shrink-0" style="color:var(--muted-foreground);">角色</span>
          <span>{{ user?.roles?.map((r: Record<string, any>) => r.role.roleName).join(', ') || '-' }}</span>
        </div>
        <div class="flex gap-4 text-sm">
          <span class="w-20 font-medium shrink-0" style="color:var(--muted-foreground);">创建时间</span>
          <span>{{ formatTime(user?.created) || '-' }}</span>
        </div>
      </div>
    </n-card>

    <div class="profile-form-grid">
      <n-card size="small">
        <template #header><span class="text-base font-medium">基本资料</span></template>
        <n-form ref="profileFormRef" :model="profileFormData" :rules="profileRules" label-placement="left" label-width="100" label-align="right" class="profile-form">
          <n-form-item label="姓名" path="displayName" required>
            <n-input v-model:value="profileFormData.displayName" placeholder="真实姓名" />
          </n-form-item>
          <n-form-item label="手机号" path="phone">
            <n-input v-model:value="profileFormData.phone" placeholder="手机号码" />
          </n-form-item>
          <n-form-item>
            <n-button type="primary" :loading="savingProfile" @click="onSubmitProfile">保存</n-button>
          </n-form-item>
        </n-form>
      </n-card>

      <n-card size="small">
        <template #header><span class="text-base font-medium">修改密码</span></template>
        <n-form ref="pwdFormRef" :model="pwdFormData" :rules="pwdRules" label-placement="left" label-width="100" label-align="right" class="profile-form">
          <n-form-item label="旧密码" path="oldPassword" required>
            <n-input v-model:value="pwdFormData.oldPassword" type="password" placeholder="请输入旧密码" />
          </n-form-item>
          <n-form-item label="新密码" path="newPassword" required>
            <n-input v-model:value="pwdFormData.newPassword" type="password" placeholder="请输入新密码" />
          </n-form-item>
          <n-form-item label="确认密码" path="confirmPassword" required>
            <n-input v-model:value="pwdFormData.confirmPassword" type="password" placeholder="请再次输入新密码" />
          </n-form-item>
          <n-form-item>
            <n-button type="primary" :loading="savingPwd" @click="onSubmitPwd">修改密码</n-button>
          </n-form-item>
        </n-form>
      </n-card>
    </div>
      </template>
    </NSpin>
  </div>
</template>

<style lang="scss" scoped>
.profile-page {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  min-width: 0;
  min-height: 0;
}

.profile-summary {
  flex-shrink: 0;
}

.profile-error {
  flex-shrink: 0;
}

.profile-form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(420px, 100%), 1fr));
  gap: 24px;
  width: 100%;
  min-width: 0;
}

.profile-form {
  width: min(100%, 560px);
}

@media (max-width: 640px) {
  .profile-page,
  .profile-form-grid {
    gap: 16px;
  }

  .profile-form :deep(.n-form-item) {
    --n-label-width: auto !important;
  }
}
</style>
