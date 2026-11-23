/**
 * @description 参数配置新增/编辑弹窗 — Naive UI Form
 * @file app/pages/admin/config/components/ConfigFormModal.vue
 * @route POST /api/admin/config / PUT /api/admin/config/:id
 * @body { configName, configKey, configValue, configType, remark }
 * @returns { saved }
 */
<script setup lang="ts">import { NModal, NForm, NFormItem, NInput, NRadioGroup, NRadio, NSpace, NButton } from 'naive-ui'
const emit = defineEmits(['saved'])

const { options: configTypeOptions } = useDict('sys_yes_no')

const show = ref(false)
const saving = ref(false)
const editId = ref<string | null>(null)
const formRef = ref()

const formValues = reactive({
  configName: '',
  configKey: '',
  configValue: '',
  configType: 'N',
  remark: '',
})

const rules = {
  configName: { required: true, message: '配置名称不能为空', trigger: 'blur' },
  configKey: { required: true, message: '配置键名不能为空', trigger: 'blur' },
  configValue: { required: true, message: '配置键值不能为空', trigger: 'blur' },
}

function open(data?: Record<string, any>) {
  editId.value = data?.id || null
  formValues.configName = data?.configName || ''
  formValues.configKey = data?.configKey || ''
  formValues.configValue = data?.configValue || ''
  formValues.configType = data?.configType || 'N'
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
      await useConfigApi().updateConfig(editId.value, formValues)
    } else {
      await useConfigApi().createConfig(formValues)
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
  <n-modal v-model:show="show" preset="card" :title="editId ? '修改参数配置' : '新增参数配置'" style="width: 600px" :bordered="false" :segmented="false">
    <n-form ref="formRef" :model="formValues" :rules="rules" @submit.prevent="onSubmit">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0">
        <n-form-item label="配置名称" path="configName">
          <n-input v-model:value="formValues.configName" placeholder="请输入配置名称" />
        </n-form-item>

        <n-form-item label="配置键名" path="configKey">
          <n-input v-model:value="formValues.configKey" placeholder="请输入配置键名" :disabled="!!editId" />
        </n-form-item>

        <n-form-item label="配置键值" path="configValue">
          <n-input v-model:value="formValues.configValue" placeholder="请输入配置键值" />
        </n-form-item>

        <n-form-item label="配置类型" path="configType">
          <n-radio-group v-model:value="formValues.configType">
            <n-space>
              <n-radio v-for="opt in configTypeOptions" :key="opt.value" :value="opt.value">
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
