/**
 * @description 部门新增/编辑弹窗 — Naive UI Form 校验
 * @file app/pages/admin/dept/components/DeptFormModal.vue
 * @route POST /api/admin/dept / PUT /api/admin/dept/:id
 * @body { parentId, deptName, orderNum, leader, phone, email, status }
 * @returns { saved }
 */
<script setup lang="ts">
import {
  NButton,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NRadio,
  NRadioGroup,
  NSelect,
  NSpace,
  type FormInst,
  type FormRules,
  type SelectOption,
} from 'naive-ui'

const emit = defineEmits(['saved'])

const { options: statusOptions } = useDict('sys_normal_disable')
const { hasPermission } = usePermission()

const formRef = ref<FormInst | null>(null)
const show = ref(false)
const saving = ref(false)
const editId = ref<string | null>(null)
const leaderUserId = ref<string | null>(null)
const leaderLoading = ref(false)
const leaderOptions = ref<SelectOption[]>([])
const leaderUsers = new Map<string, UserEntity>()
const canReadUsers = computed(() => hasPermission('system:user:list'))

const formValue = ref({
  parentId: null as string | null,
  deptName: '',
  orderNum: null as number | null,
  leader: '',
  phone: '',
  email: '',
  status: '1',
})

const rules: FormRules = {
  deptName: { required: true, message: '部门名称不能为空', trigger: 'blur' },
  orderNum: { type: 'number', message: '请输入排序', trigger: 'blur' },
  phone: {
    pattern: /^(?:1[3-9]\d{9}|(?:0\d{2,3}-?)?\d{7,8}|400-?\d{3}-?\d{4})$/,
    message: '请输入正确的手机、座机或 400 电话',
    trigger: 'blur',
  },
  email: { type: 'email', message: '请输入正确的邮箱', trigger: 'blur' },
}

const parentName = ref('')

const parentDisplay = computed(() => {
  return parentName.value || (formValue.value.parentId ? '下级部门' : '顶级部门')
})

const modalTitle = computed(() => editId.value ? '修改部门' : '新增部门')
const modalDesc = computed(() => editId.value ? '修改部门基本信息和排序' : '填写部门信息以创建新部门')

function userDisplayName(user: UserEntity) {
  return user.displayName || user.email
}

function matchLeaderUser(data?: Record<string, any>) {
  if (!data?.leader) return null
  return [...leaderUsers.values()].find((user) => {
    if (data.phone && user.phone === data.phone) return true
    if (data.email && user.email === data.email) return true
    return userDisplayName(user) === data.leader
  }) || null
}

async function loadLeaderOptions(data?: Record<string, any>) {
  if (!canReadUsers.value) {
    leaderOptions.value = []
    leaderUserId.value = null
    return
  }
  leaderLoading.value = true
  try {
    const result = await useUserApi().fetchUsers({ page: 1, pageSize: 200, status: '1' })
    leaderUsers.clear()
    for (const user of result.rows || []) leaderUsers.set(user.id, user)
    leaderOptions.value = [...leaderUsers.values()].map(user => ({
      label: `${userDisplayName(user)}${user.phone ? `（${user.phone}）` : ''}`,
      value: user.id,
    }))

    const matched = matchLeaderUser(data)
    if (matched) {
      leaderUserId.value = matched.id
    } else if (data?.leader) {
      const legacyValue = `legacy:${data.leader}`
      leaderOptions.value.unshift({ label: `${data.leader}（历史负责人）`, value: legacyValue })
      leaderUserId.value = legacyValue
    }
  } catch {
    leaderOptions.value = data?.leader
      ? [{ label: `${data.leader}（历史负责人）`, value: `legacy:${data.leader}` }]
      : []
    leaderUserId.value = data?.leader ? `legacy:${data.leader}` : null
  } finally {
    leaderLoading.value = false
  }
}

function handleLeaderChange(userId: string | null) {
  leaderUserId.value = userId
  if (!userId) {
    formValue.value.leader = ''
    formValue.value.phone = ''
    formValue.value.email = ''
    return
  }
  const user = leaderUsers.get(userId)
  if (!user) return
  formValue.value.leader = userDisplayName(user)
  formValue.value.phone = user.phone || ''
  formValue.value.email = user.email || ''
}

async function open(data?: Record<string, any>) {
  editId.value = data?.id || null
  parentName.value = data?.parentName || ''
  leaderUserId.value = null
  formValue.value = {
    parentId: data?.parentId || null,
    deptName: data?.deptName || '',
    orderNum: data?.orderNum ?? null,
    leader: data?.leader || '',
    phone: data?.phone || '',
    email: data?.email || '',
    status: data?.status || '1',
  }
  nextTick(() => formRef.value?.restoreValidation())
  show.value = true
  await loadLeaderOptions(data)
}

async function handleSubmit(e: Event) {
  e.preventDefault()
  saving.value = true
  try {
    await formRef.value?.validate()
    const body = { ...formValue.value, orderNum: formValue.value.orderNum ?? 0 }
    if (editId.value) {
      await useDeptApi().updateDept(editId.value, body)
    } else {
      await useDeptApi().createDept(body)
    }
    show.value = false
    emit('saved')
  } catch {
    /* validate or api error */
  } finally {
    saving.value = false
  }
}

defineExpose({ open })
</script>

<template>
  <n-modal v-model:show="show" preset="card" :title="modalTitle" style="width: min(880px, calc(100vw - 48px))" :bordered="false" :segmented="{ footer: true }">
    <p class="text-sm text-muted-foreground mb-4">{{ modalDesc }}</p>
    <n-form ref="formRef" :model="formValue" :rules="rules" label-placement="left" label-width="100px" require-mark-placement="right-hanging">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0">
        <n-form-item label="上级部门" path="parentId">
          <n-input :value="parentDisplay" disabled />
        </n-form-item>

        <n-form-item label="部门名称" path="deptName">
          <n-input v-model:value="formValue.deptName" placeholder="请输入部门名称" />
        </n-form-item>

        <n-form-item label="显示排序" path="orderNum">
          <n-input-number v-model:value="formValue.orderNum" :min="0" :show-button="false" placeholder="请输入排序" />
        </n-form-item>

        <n-form-item label="状态" path="status">
          <n-radio-group v-model:value="formValue.status">
            <n-space>
              <n-radio v-for="opt in statusOptions" :key="opt.value" :value="opt.value" :label="opt.label" />
            </n-space>
          </n-radio-group>
        </n-form-item>

        <n-form-item v-if="canReadUsers" label="负责人" path="leader">
          <n-select
            v-model:value="leaderUserId"
            :options="leaderOptions"
            :loading="leaderLoading"
            clearable
            filterable
            placeholder="请选择负责人（可选）"
            @update:value="handleLeaderChange"
          />
        </n-form-item>
        <n-form-item v-else label="负责人" path="leader">
          <n-input v-model:value="formValue.leader" placeholder="请输入负责人姓名（可选）" />
        </n-form-item>

        <n-form-item label="联系电话" path="phone">
          <n-input v-model:value="formValue.phone" placeholder="请输入联系电话" />
        </n-form-item>

        <n-form-item label="邮箱" path="email">
          <n-input v-model:value="formValue.email" placeholder="请输入邮箱" />
        </n-form-item>

        <p class="col-span-1 md:col-span-2 -mt-2 mb-3 text-xs text-muted-foreground">
          负责人从已启用的后台人员或员工中选择；选择后自动带入联系方式，也可改成部门公共电话或邮箱。
        </p>
      </div>
    </n-form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <n-button secondary @click="show = false">取消</n-button>
        <n-button type="primary" :loading="saving" attr-type="submit" @click="handleSubmit">保存</n-button>
      </div>
    </template>
  </n-modal>
</template>
