/**
 * @description 岗位新增/编辑弹窗 — Naive UI Form
 * @file app/pages/admin/post/components/PostFormModal.vue
 * @route POST /api/admin/post / PUT /api/admin/post/:id
 * @body { postCode, postName, postSort, status, remark }
 * @returns { saved }
 */
<script setup lang="ts">import { NModal, NForm, NFormItem, NInput, NRadioGroup, NRadio, NSpace, NButton, NInputNumber } from 'naive-ui'
const emit = defineEmits(['saved'])

const { options: statusOptions } = useDict('sys_normal_disable')

const show = ref(false)
const saving = ref(false)
const editId = ref<string | null>(null)
const formRef = ref()

const formValues = reactive({
  postCode: '',
  postName: '',
  postSort: null as number | null,
  status: '1',
  remark: '',
})

const rules = {
  postCode: { required: true, message: '岗位编码不能为空', trigger: 'blur' },
  postName: { required: true, message: '岗位名称不能为空', trigger: 'blur' },
  postSort: { message: '请输入排序', trigger: 'blur', type: 'number' },
}

function open(data?: Record<string, any>) {
  editId.value = data?.id || null
  formValues.postCode = data?.postCode || ''
  formValues.postName = data?.postName || ''
  formValues.postSort = data?.postSort ?? null
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
    const body = { ...formValues, postSort: formValues.postSort ?? 0 }
    if (editId.value) {
      await usePostApi().updatePost(editId.value, body)
    } else {
      await usePostApi().createPost(body)
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
  <n-modal v-model:show="show" preset="card" :title="editId ? '修改岗位' : '新增岗位'" style="width: 600px" :bordered="false" :segmented="false">
    <n-form ref="formRef" :model="formValues" :rules="rules as any" require-mark-placement="right-hanging" @submit.prevent="onSubmit">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0">
        <n-form-item label="岗位编码" path="postCode">
          <n-input v-model:value="formValues.postCode" placeholder="请输入岗位编码" :disabled="!!editId" />
        </n-form-item>

        <n-form-item label="岗位名称" path="postName">
          <n-input v-model:value="formValues.postName" placeholder="请输入岗位名称" />
        </n-form-item>

        <n-form-item label="显示排序" path="postSort">
          <n-input-number v-model:value="formValues.postSort" :min="0" :show-button="false" placeholder="请输入排序" class="w-full" />
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
            <n-input v-model:value="formValues.remark" type="textarea" rows="2" placeholder="请输入备注" />
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
