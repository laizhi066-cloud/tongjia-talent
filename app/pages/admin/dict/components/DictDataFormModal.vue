/**
 * @description 字典数据新增/编辑弹窗 — Naive UI Form
 * @file app/pages/admin/dict/components/DictDataFormModal.vue
 * @route POST /api/admin/dict/data / PUT /api/admin/dict/data/:id
 * @body { dictLabel, dictValue, dictSort, status, isDefault, remark, dictType, listClass, icon, backgroundColor, color }
 */
<script setup lang="ts">import { NModal, NForm, NFormItem, NInput, NInputNumber, NRadioGroup, NRadio, NSpace, NButton } from 'naive-ui'
const emit = defineEmits(['saved'])

const { options: statusOptions } = useDict('sys_normal_disable')
const { options: isDefaultOptions } = useDict('sys_yes_no')

const show = ref(false)
const saving = ref(false)
const editId = ref<string | null>(null)
const currentDictType = ref('')
const formRef = ref()

const formValues = reactive({
  dictLabel: '',
  dictValue: '',
  dictSort: null as number | null,
  status: '1',
  isDefault: 'N',
  remark: '',
  listClass: '',
  icon: '',
  backgroundColor: '',
  color: '',
})

const rules = {
  dictLabel: { required: true, message: '字典标签不能为空', trigger: 'blur' },
  dictValue: { required: true, message: '字典键值不能为空', trigger: 'blur' },
  dictSort: { message: '请输入排序', trigger: 'blur', type: 'number' },
}

function open(data?: Record<string, any>, dictType?: string) {
  editId.value = data?.id || null
  currentDictType.value = dictType || data?.dictType || ''
  formValues.dictLabel = data?.dictLabel || ''
  formValues.dictValue = data?.dictValue || ''
  formValues.dictSort = data?.dictSort ?? null
  formValues.status = data?.status || '1'
  formValues.isDefault = data?.isDefault || 'N'
  formValues.remark = data?.remark || ''
  formValues.listClass = data?.listClass || ''
  formValues.icon = data?.icon || ''
  formValues.backgroundColor = data?.backgroundColor || ''
  formValues.color = data?.color || ''
  show.value = true
}

async function onSubmit(e: Event) {
  e.preventDefault()
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  saving.value = true
  try {
    const body = { ...formValues, dictSort: formValues.dictSort ?? 0, dictType: currentDictType.value }
    if (editId.value) {
      await useDictApi().updateDictData(editId.value, body)
    } else {
      await useDictApi().createDictData(body)
    }
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
  <n-modal v-model:show="show" preset="card" :title="editId ? '修改字典数据' : '新增字典数据'" style="width: 600px" :bordered="false" :segmented="false">
    <n-form ref="formRef" :model="formValues" :rules="rules as any" require-mark-placement="right-hanging" @submit.prevent="onSubmit">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0">
        <n-form-item label="字典标签" path="dictLabel">
          <n-input v-model:value="formValues.dictLabel" placeholder="显示的文字" />
        </n-form-item>
        <n-form-item label="字典键值" path="dictValue">
          <n-input v-model:value="formValues.dictValue" placeholder="实际存储的值" />
        </n-form-item>
        <n-form-item label="显示排序" path="dictSort">
          <n-input-number v-model:value="formValues.dictSort" :min="0" :show-button="false" placeholder="请输入排序" class="w-full" />
        </n-form-item>
        <n-form-item label="状态" path="status">
          <n-radio-group v-model:value="formValues.status">
            <n-space>
              <n-radio v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </n-radio>
            </n-space>
          </n-radio-group>
        </n-form-item>
        <n-form-item label="是否默认" path="isDefault">
          <n-radio-group v-model:value="formValues.isDefault">
            <n-space>
              <n-radio v-for="opt in isDefaultOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </n-radio>
            </n-space>
          </n-radio-group>
        </n-form-item>
        <div class="md:col-span-2">
          <n-form-item label="备注" path="remark">
            <n-input v-model:value="formValues.remark" type="textarea" rows="3" placeholder="备注信息" />
          </n-form-item>
        </div>
      </div>

      <DictDataStyleConfig
        :list-class="formValues.listClass"
        :icon="formValues.icon"
        :background-color="formValues.backgroundColor"
        :color="formValues.color"
        :dict-label="formValues.dictLabel"
        @update:list-class="formValues.listClass = $event"
        @update:icon="formValues.icon = $event"
        @update:background-color="formValues.backgroundColor = $event"
        @update:color="formValues.color = $event"
      />

      <div class="flex justify-end gap-3 mt-6 pt-4 border-t">
        <n-button quaternary @click="show = false">取消</n-button>
        <n-button type="primary" attr-type="submit" :loading="saving">保存</n-button>
      </div>
    </n-form>
  </n-modal>
</template>
