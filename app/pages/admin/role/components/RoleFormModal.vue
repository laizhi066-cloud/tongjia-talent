/**
 * @description 角色新增/编辑弹窗 — NForm 校验
 * @file app/pages/admin/role/components/RoleFormModal.vue
 * @route POST /api/admin/role / PUT /api/admin/role/:id
 * @body { roleName, roleKey, roleSort, dataScope, deptScopeIds, status, remark }
 * @returns { saved }
 */
<script setup lang="ts">
import { NModal, NForm, NFormItem, NInput, NInputNumber, NSelect, NRadioGroup, NRadio, NSpace, NCheckbox, NButton, useMessage, type FormInst, type FormRules } from 'naive-ui'

const message = useMessage()
const emit = defineEmits(['saved'])
const { hasPermission, hasRole } = usePermission()

const show = ref(false)
const saving = ref(false)
const editId = ref<string | null>(null)
const deptScopeIds = ref<string[]>([])
const deptTreeOptions = ref<{ label: string; value: string }[]>([])
const formRef = ref<FormInst | null>(null)
const canReadDepartments = computed(() => hasPermission('system:dept:list'))
const isSuper = computed(() => hasRole('superadmin'))

const { options: dataScopeOptions } = useDict('sys_data_scope')
const { options: statusOptions } = useDict('sys_normal_disable')

const formValue = reactive({
  roleName: '',
  roleKey: '',
  roleSort: null as number | null,
  dataScope: '4',
  status: '1',
  remark: '',
})

const rules: FormRules = {
  roleName: { required: true, message: '角色名称不能为空', trigger: 'blur' },
  roleKey: { required: true, message: '角色标识不能为空', trigger: 'blur' },
  roleSort: { type: 'number', message: '请输入排序', trigger: 'blur' },
  dataScope: { required: true, message: '请选择数据范围', trigger: 'change' },
}

async function loadDeptTree() {
  if (!canReadDepartments.value) {
    deptTreeOptions.value = []
    return
  }
  try {
    const data = await useDeptApi().fetchDeptTree()
    deptTreeOptions.value = flattenTree(data)
  } catch {
    deptTreeOptions.value = []
  }
}

function flattenTree(items: Record<string, any>[], prefix = ''): { label: string; value: string }[] {
  const result: { label: string; value: string }[] = []
  for (const item of items) {
    result.push({ label: `${prefix}${item.deptName}`, value: item.id })
    if (item.children?.length) {
      result.push(...flattenTree(item.children, `${prefix}── `))
    }
  }
  return result
}

async function open(data?: Record<string, any>) {
  editId.value = data?.id || null
  await loadDeptTree()

  let loadedDeptIds: string[] = []
  if (editId.value) {
    try {
      const detail = await useRoleApi().getRole(editId.value)
      loadedDeptIds = detail.deptIds || []
    } catch { /* 忽略加载失败 */ }
  }

  deptScopeIds.value = loadedDeptIds
  formValue.roleName = data?.roleName || ''
  formValue.roleKey = data?.roleKey || ''
  formValue.roleSort = data?.roleSort ?? null
  formValue.dataScope = data?.dataScope || '4'
  formValue.status = data?.status || '1'
  formValue.remark = data?.remark || ''
  show.value = true
}

async function handleSave() {
  if (!isSuper.value && ['admin', 'superadmin'].includes(formValue.roleKey.trim())) {
    message.error('系统保留角色只能由平台超管维护')
    return
  }
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  saving.value = true
  try {
    const body = { ...formValue, roleSort: formValue.roleSort ?? 0, deptScopeIds: deptScopeIds.value }
    if (editId.value) {
      await useRoleApi().updateRole(editId.value, body)
    } else {
      await useRoleApi().createRole(body)
    }
    message.success(editId.value ? '保存成功' : '新增成功')
    show.value = false
    emit('saved')
  } catch {
    /* 全局拦截器已弹出错误提示 */
  } finally {
    saving.value = false
  }
}

defineExpose({ open })
</script>

<template>
  <n-modal v-model:show="show" preset="card" style="width: min(880px, calc(100vw - 48px))" :title="editId ? '修改角色' : '新增角色'" :bordered="false" size="small">
    <p class="text-sm text-muted-foreground mb-4">{{ editId ? '修改角色名称、权限和排序' : '填写角色信息以创建新角色' }}</p>
    <n-form ref="formRef" :model="formValue" :rules="rules" label-placement="left" label-width="100px" require-mark-placement="right-hanging">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0">
        <n-form-item label="角色名称" path="roleName" required>
          <n-input v-model:value="formValue.roleName" placeholder="请输入角色名称" />
        </n-form-item>

        <n-form-item label="角色标识" path="roleKey" required>
          <n-input v-model:value="formValue.roleKey" placeholder="如 admin, common" :disabled="!!editId" />
        </n-form-item>

        <n-form-item label="显示排序" path="roleSort">
          <n-input-number v-model:value="formValue.roleSort" :min="0" :show-button="false" placeholder="请输入排序" style="width:100%" />
        </n-form-item>

        <n-form-item label="数据范围" path="dataScope" required>
          <n-select v-model:value="formValue.dataScope" :options="dataScopeOptions.map(o => ({ label: o.label, value: o.value }))" placeholder="选择数据范围" />
        </n-form-item>

        <n-form-item label="状态" path="status" required>
          <n-radio-group v-model:value="formValue.status">
            <n-space>
              <n-radio v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</n-radio>
            </n-space>
          </n-radio-group>
        </n-form-item>

        <div class="md:col-span-2">
          <n-form-item label="备注" path="remark">
            <n-input v-model:value="formValue.remark" type="textarea" rows="2" placeholder="备注信息" />
          </n-form-item>
        </div>

        <!-- 部门范围：自定义数据范围时显示 -->
        <div v-if="formValue.dataScope === '2'" class="md:col-span-2">
          <n-form-item label="部门范围">
            <div class="flex flex-col gap-2 rounded-md border p-3 w-full">
              <div v-for="opt in deptTreeOptions" :key="opt.value" class="flex items-center gap-2">
                <n-checkbox
                  :checked="deptScopeIds.includes(opt.value)"
                  @update:checked="(checked: boolean) => {
                    if (checked) deptScopeIds.push(opt.value)
                    else deptScopeIds = deptScopeIds.filter(id => id !== opt.value)
                  }"
                >
                  {{ opt.label }}
                </n-checkbox>
              </div>
              <p v-if="!deptTreeOptions.length" class="text-xs text-muted-foreground">暂无部门数据</p>
            </div>
          </n-form-item>
        </div>
      </div>
      <div class="flex justify-end gap-3 mt-6">
        <n-button @click="show = false">取消</n-button>
        <n-button type="primary" :loading="saving" @click="handleSave">保存</n-button>
      </div>
    </n-form>
  </n-modal>
</template>
