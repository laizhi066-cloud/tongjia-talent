/**
 * @description 字典类型新增/编辑弹窗 — Naive UI Form
 * @file app/pages/admin/dict/components/DictTypeFormModal.vue
 * @route POST /api/admin/dict/type / PUT /api/admin/dict/type/:id
 * @body { dictName, dictType, status, remark }
 * @returns { saved }
 */
<script setup lang="ts">import { NModal, NForm, NFormItem, NInput, NRadioGroup, NRadio, NSpace, NButton } from 'naive-ui'
const emit = defineEmits(['saved'])

const { options: statusOptions } = useDict('sys_normal_disable')

const show = ref(false)
const saving = ref(false)
const editId = ref<string | null>(null)
const formRef = ref()

const formValues = reactive({
  dictName: '',
  dictType: '',
  status: '1',
  remark: '',
})

const rules = {
  dictName: { required: true, message: '字典名称不能为空', trigger: 'blur' },
  dictType: { required: true, message: '字典类型不能为空', trigger: 'blur' },
}

function open(data?: Record<string, any>) {
  editId.value = data?.id || null
  formValues.dictName = data?.dictName || ''
  formValues.dictType = data?.dictType || ''
  formValues.status = data?.status || '1'
  formValues.remark = data?.remark || ''
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
    if (editId.value) {
      await useDictApi().updateDictType(editId.value, formValues)
    } else {
      await useDictApi().createDictType(formValues)
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
  <n-modal v-model:show="show" preset="card" :title="editId ? '修改字典类型' : '新增字典类型'" style="width: 600px" :bordered="false" :segmented="false">
    <n-form ref="formRef" :model="formValues" :rules="rules" require-mark-placement="right-hanging" @submit.prevent="onSubmit">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0">
        <n-form-item label="字典名称" path="dictName">
          <n-input v-model:value="formValues.dictName" placeholder="例如：用户性别" />
        </n-form-item>

        <n-form-item label="字典类型" path="dictType">
          <n-input v-model:value="formValues.dictType" placeholder="例如：sys_user_sex" :disabled="!!editId" />
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

        <div class="md:col-span-2">
          <n-form-item label="备注" path="remark">
            <n-input v-model:value="formValues.remark" type="textarea" rows="3" placeholder="备注信息" />
          </n-form-item>
        </div>
      </div>
      <div class="flex justify-end gap-3 pt-4 border-t">
        <n-button quaternary @click="show = false">取消</n-button>
        <n-button type="primary" attr-type="submit" :loading="saving">保存</n-button>
      </div>
    </n-form>
  </n-modal>
</template>
