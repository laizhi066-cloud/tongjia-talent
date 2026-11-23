<!--
/**
 * @description 密钥输入框 — 统一脱敏字段 UX：密码可见切换 / PEM 多行，并统一追加「留空或掩码表示不修改」提示。
 *   后端 secret-config.ts 负责加密存与掩码回显；前端所有密钥字段统一用本组件，避免提示语与交互漂移。
 * @file app/components/admin/SecretField.vue
 */
-->
<script setup lang="ts">
import { NInput } from 'naive-ui'

const props = withDefaults(defineProps<{
  modelValue: string
  multiline?: boolean
  placeholder?: string
}>(), {
  multiline: false,
  placeholder: '',
})
defineEmits<{ 'update:modelValue': [string] }>()

const HINT = '（留空或掩码表示不修改）'
</script>

<template>
  <NInput
    :value="props.modelValue"
    :type="multiline ? 'textarea' : 'password'"
    :show-password-on="multiline ? undefined : 'click'"
    :autosize="multiline ? { minRows: 2, maxRows: 6 } : undefined"
    :placeholder="(props.placeholder || '') + HINT"
    @update:value="(v: string) => $emit('update:modelValue', v)"
  />
</template>
