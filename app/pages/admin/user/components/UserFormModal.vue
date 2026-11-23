<!--
/**
 * @description 后台用户新增与编辑弹窗。
 * @file app/pages/admin/user/components/UserFormModal.vue
 */
-->
<script setup lang="ts">
import { NButton, NForm, NFormItem, NInput, NModal, NRadio, NRadioGroup, NSelect, NSpace, NTreeSelect, useMessage, type FormInst, type FormRules } from 'naive-ui'

interface UserRow {
  id?: string
  email?: string
  displayName?: string
  phone?: string
  deptId?: string | null
  postIds?: string[]
  status?: string
  avatar?: string
}

interface DepartmentOption {
  id: string
  name: string
  children?: DepartmentOption[]
}

interface UploadControl {
  pendingFile: File | null
  submit(recordId: string): Promise<unknown>
}

const emit = defineEmits<{ saved: [] }>()
const message = useMessage()
const { options: statusOptions } = useDict('sys_normal_disable')
const { hasPermission } = usePermission()
const show = ref(false)
const saving = ref(false)
const editId = ref<string | null>(null)
const formRef = ref<FormInst | null>(null)
const uploadRef = ref<UploadControl | null>(null)
const avatarFilename = ref('')
const deptTree = ref<DepartmentOption[]>([])
const postOptions = ref<Array<{ label: string, value: string }>>([])
// 新建用户后的头像上传落到该用户记录，服务端要求 system:user:edit。
const canManageAvatar = computed(() => hasPermission('system:user:edit'))
const canReadDepartments = computed(() => hasPermission('system:dept:list'))
const canReadPosts = computed(() => hasPermission('system:post:list'))
const formValue = reactive({
  email: '',
  password: '',
  confirmPassword: '',
  displayName: '',
  phone: '',
  deptId: null as string | null,
  postIds: [] as string[],
  status: '1',
})

const rules: FormRules = {
  email: [
    { required: true, message: '邮箱不能为空', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱', trigger: 'blur' },
  ],
  displayName: { required: true, message: '姓名不能为空', trigger: 'blur' },
  phone: [
    { required: true, message: '手机号不能为空', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' },
  ],
}

function toDepartmentOptions(items: DeptEntity[]): DepartmentOption[] {
  return items.flatMap((item): DepartmentOption[] => {
    const id = item.id
    const name = item.deptName
    if (!id || !name) return []
    const children = item.children ? toDepartmentOptions(item.children) : []
    return [{ id, name, children: children.length ? children : undefined }]
  })
}

async function loadOptions(): Promise<void> {
  const [departments, posts] = await Promise.all([
    canReadDepartments.value ? useDeptApi().fetchDeptTree().catch(() => []) : Promise.resolve([] as DeptEntity[]),
    canReadPosts.value ? usePostApi().fetchPosts({ pageSize: 100 }).catch(() => ({ rows: [] as PostEntity[] })) : Promise.resolve({ rows: [] as PostEntity[] }),
  ])
  deptTree.value = toDepartmentOptions(departments)
  postOptions.value = posts.rows.map((post: PostEntity) => ({ label: post.postName, value: post.id }))
}

async function open(data?: UserRow): Promise<void> {
  editId.value = data?.id ?? null
  await loadOptions()
  let postIds = data?.postIds ?? []
  if (editId.value) {
    try {
      const detail = await useUserApi().getUser(editId.value) as UserRow
      postIds = detail.postIds ?? []
    } catch {
      // 列表详情不可用时使用当前行数据。
    }
  }
  avatarFilename.value = data?.avatar ?? ''
  formValue.email = data?.email ?? ''
  formValue.password = ''
  formValue.confirmPassword = ''
  formValue.displayName = data?.displayName ?? ''
  formValue.phone = data?.phone ?? ''
  formValue.deptId = data?.deptId ?? null
  formValue.postIds = postIds
  formValue.status = data?.status ?? '1'
  show.value = true
}

async function handleSave(): Promise<void> {
  if (!editId.value) {
    if (formValue.password.length < 8) {
      message.error('密码至少 8 位')
      return
    }
    if (formValue.password !== formValue.confirmPassword) {
      message.error('两次输入的密码不一致')
      return
    }
  }

  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    const commonData = {
      displayName: formValue.displayName,
      phone: formValue.phone,
      deptId: formValue.deptId,
      postIds: formValue.postIds,
      status: formValue.status,
    }
    const userId = editId.value
      ? (await useUserApi().updateUser(editId.value, commonData)).id
      : (await useUserApi().createUser({ ...commonData, email: formValue.email, password: formValue.password })).id
    if (uploadRef.value?.pendingFile && userId) await uploadRef.value.submit(userId)
    message.success(editId.value ? '保存成功' : '新增成功')
    show.value = false
    emit('saved')
  } finally {
    saving.value = false
  }
}

defineExpose({ open })
</script>

<template>
  <NModal v-model:show="show" preset="card" :title="editId ? '修改用户' : '新增用户'" :mask-closable="false" style="width: min(880px, calc(100vw - 48px))">
    <NForm ref="formRef" :model="formValue" :rules="rules" label-placement="left" label-width="88">
      <div class="user-form__avatar">
        <AppUpload v-if="canManageAvatar" ref="uploadRef" v-model="avatarFilename" :record-id="editId ?? ''" />
        <p>{{ canManageAvatar ? '支持 JPG、PNG 格式，文件不超过 5MB。' : '当前权限可创建用户；上传或修改其他用户头像还需要“编辑用户”权限。' }}</p>
      </div>
      <div class="user-form__grid">
        <NFormItem label="邮箱" path="email" required>
          <NInput v-model:value="formValue.email" placeholder="请输入邮箱" :disabled="Boolean(editId)" />
        </NFormItem>
        <NFormItem label="姓名" path="displayName" required>
          <NInput v-model:value="formValue.displayName" placeholder="请输入姓名" />
        </NFormItem>
        <template v-if="!editId">
          <NFormItem label="密码" path="password" required>
            <NInput v-model:value="formValue.password" type="password" placeholder="至少 8 位" />
          </NFormItem>
          <NFormItem label="确认密码" path="confirmPassword" required>
            <NInput v-model:value="formValue.confirmPassword" type="password" placeholder="再次输入密码" />
          </NFormItem>
        </template>
        <NFormItem label="手机号" path="phone" required>
          <NInput v-model:value="formValue.phone" placeholder="请输入手机号" />
        </NFormItem>
        <NFormItem label="状态" path="status" required>
          <NRadioGroup v-model:value="formValue.status"><NSpace><NRadio v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</NRadio></NSpace></NRadioGroup>
        </NFormItem>
        <NFormItem label="部门" path="deptId">
          <NTreeSelect v-model:value="formValue.deptId" :options="deptTree" key-field="id" label-field="name" placeholder="选择部门" clearable />
        </NFormItem>
        <NFormItem label="岗位" path="postIds">
          <NSelect v-model:value="formValue.postIds" :options="postOptions" placeholder="选择岗位" multiple />
        </NFormItem>
      </div>
    </NForm>
    <template #footer>
      <div class="user-form__footer">
        <NButton @click="show = false">取消</NButton>
        <NButton type="primary" :loading="saving" @click="handleSave">保存</NButton>
      </div>
    </template>
  </NModal>
</template>

<style lang="scss" scoped>
.user-form__avatar { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; padding: 16px; border-radius: 10px; background: var(--muted); }
.user-form__avatar p { margin: 0; color: var(--muted-foreground); font-size: 14px; }
.user-form__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 24px; }
.user-form__footer { display: flex; justify-content: flex-end; gap: 12px; }
@media (max-width: 640px) { .user-form__grid { grid-template-columns: 1fr; } }
</style>
