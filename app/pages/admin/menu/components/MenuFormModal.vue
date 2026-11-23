/**
 * @description 菜单新增/编辑弹窗 — Naive UI Form 校验 + 图标选择器
 * @file app/pages/admin/menu/components/MenuFormModal.vue
 * @route POST /api/admin/menu / PUT /api/admin/menu/:id
 * @body { parentId, menuType, menuName, permissionCode, path, component, icon, orderNum, visible, status }
 */
<script setup lang="ts">
import { NModal, NForm, NFormItem, NInput, NInputNumber, NRadioGroup, NRadio, NSpace, NIcon, NButton, useMessage, type FormInst, type FormRules } from 'naive-ui'
import { buildIconMap } from '~/composables/useIcons'

const message = useMessage()
const emit = defineEmits(['saved'])

const formRef = ref<FormInst | null>(null)
const show = ref(false)
const saving = ref(false)
const editId = ref<string | null>(null)
const showIconPicker = ref(false)
const iconMap = buildIconMap()

const { options: menuTypeOptions } = useDict('sys_menu_type')
const { options: visibleOptions } = useDict('sys_show_hide')
const { options: statusOptions } = useDict('sys_normal_disable')

const formValue = ref({
  parentId: null as string | null,
  menuType: 'M',
  menuName: '',
  permissionCode: '',
  path: '',
  component: '',
  icon: '',
  orderNum: null as number | null,
  visible: '0',
  status: '1',
})

const rules: FormRules = {
  menuName: { required: true, message: '菜单名称不能为空', trigger: 'blur' },
  orderNum: { type: 'number', message: '请输入排序', trigger: 'blur' },
}

const selectedIconComponent = computed(() => iconMap[formValue.value.icon] || null)

// 上级菜单：id → 菜单名映射（回显父菜单名而非裸 id）
const menuNameMap = ref<Record<string, string>>({})
const parentDisplay = computed(() => {
  const pid = formValue.value.parentId
  if (!pid) return '顶级菜单'
  return menuNameMap.value[pid] || pid
})

async function loadMenuNames() {
  try {
    const tree = await useMenuApi().fetchMenuTree(true)
    const map: Record<string, string> = {}
    const walk = (nodes: Record<string, any>[]) => {
      for (const n of nodes) {
        map[n.id] = n.menuName
        if (n.children?.length) walk(n.children)
      }
    }
    walk(tree)
    menuNameMap.value = map
  } catch {
    menuNameMap.value = {}
  }
}

const modalTitle = computed(() => editId.value ? '修改菜单' : '新增菜单')
const modalDesc = computed(() => editId.value ? '修改菜单名称、路径和权限标识' : '填写菜单信息以创建新菜单项')

function open(data?: Record<string, any>) {
  editId.value = data?.id || null
  loadMenuNames()
  formValue.value = {
    parentId: data?.parentId || null,
    menuType: data?.menuType || (data?.parentId ? 'C' : 'M'),
    menuName: data?.menuName || '',
    permissionCode: data?.permissionCode || '',
    path: data?.path || '',
    component: data?.component || '',
    icon: data?.icon || '',
    orderNum: data?.orderNum ?? null,
    visible: data?.visible || '0',
    status: data?.status || '1',
  }
  nextTick(() => formRef.value?.restoreValidation())
  show.value = true
}

async function handleSubmit(e: Event) {
  e.preventDefault()
  saving.value = true
  try {
    await formRef.value?.validate()
    const body = { ...formValue.value, orderNum: formValue.value.orderNum ?? 0 }
    if (editId.value) {
      await useMenuApi().updateMenu(editId.value, body)
    } else {
      await useMenuApi().createMenu(body)
    }
    message.success(editId.value ? '保存成功' : '新增成功')
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
        <n-form-item label="上级菜单" path="parentId">
          <n-input :value="parentDisplay" disabled />
        </n-form-item>

        <div class="md:col-span-2">
          <n-form-item label="菜单类型" path="menuType">
            <n-radio-group v-model:value="formValue.menuType">
              <n-space>
                <n-radio v-for="opt in menuTypeOptions" :key="opt.value" :value="opt.value" :label="opt.label" />
              </n-space>
            </n-radio-group>
          </n-form-item>
        </div>

        <n-form-item label="菜单名称" path="menuName">
          <n-input v-model:value="formValue.menuName" placeholder="请输入菜单名称" />
        </n-form-item>

        <n-form-item v-if="formValue.menuType !== 'M'" label="权限标识" path="permissionCode">
          <n-input v-model:value="formValue.permissionCode" placeholder="例如 system:user:list" />
        </n-form-item>

        <n-form-item v-if="formValue.menuType !== 'F'" label="路由地址" path="path">
          <n-input v-model:value="formValue.path" placeholder="例如 /admin/user" />
        </n-form-item>

        <n-form-item v-if="formValue.menuType === 'C'" label="组件路径" path="component">
          <n-input v-model:value="formValue.component" placeholder="例如 admin/user/index.vue" />
        </n-form-item>

        <n-form-item label="图标" path="icon">
          <div class="flex gap-2 w-full">
            <div class="relative flex-1">
              <div class="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                <n-icon v-if="selectedIconComponent" :component="selectedIconComponent" />
                <span v-else class="text-sm text-muted-foreground" />
              </div>
                <n-input
                  :value="formValue.icon"
                  aria-label="选择菜单图标"
                  placeholder="选择菜单图标"
                  readonly
                  @click="showIconPicker = true"
                />
            </div>
            <n-button secondary @click="showIconPicker = true">选择</n-button>
          </div>
        </n-form-item>

        <n-form-item label="显示排序" path="orderNum">
          <n-input-number v-model:value="formValue.orderNum" :min="0" :show-button="false" placeholder="请输入排序" />
        </n-form-item>

        <n-form-item label="显示状态" path="visible">
          <n-radio-group v-model:value="formValue.visible">
            <n-space>
              <n-radio v-for="opt in visibleOptions" :key="opt.value" :value="opt.value" :label="opt.label" />
            </n-space>
          </n-radio-group>
        </n-form-item>

        <n-form-item label="菜单状态" path="status">
          <n-radio-group v-model:value="formValue.status">
            <n-space>
              <n-radio v-for="opt in statusOptions" :key="opt.value" :value="opt.value" :label="opt.label" />
            </n-space>
          </n-radio-group>
        </n-form-item>
      </div>
    </n-form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <n-button secondary @click="show = false">取消</n-button>
        <n-button type="primary" :loading="saving" attr-type="submit" @click="handleSubmit">保存</n-button>
      </div>
    </template>

    <MenuIconPicker
      v-model:open="showIconPicker"
      :selected="formValue.icon"
      @select="(name: string) => { formValue.icon = name }"
    />
  </n-modal>
</template>
