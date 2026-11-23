/**
 * @description 全局确认对话框 — 消费 useConfirm 的 confirmEvent 状态，渲染 NModal
 * @file app/components/AppConfirm.vue
 */
<script setup lang="ts">
import { zhCN, darkTheme, NConfigProvider, NModal, NButton } from 'naive-ui'
import { buildNaiveOverrides } from '~/config/naive-theme'
import { confirmEvent } from '~/composables/useConfirm'

// AppConfirm 挂在 app.vue 根部，不在 admin/default 布局的 NConfigProvider 内，
// 否则：① 弹窗 z-index 变 auto → 被 z-index:30 的顶栏盖住；② 按钮拿不到主题覆盖 → 停留在 Naive 默认绿。
// 故此处自带一份与布局一致的主题 provider，并给 NModal 显式 z-index。
const { isDark: themeDark, currentThemeId, primaryColor } = useTheme()
const naiveOverrides = ref(buildNaiveOverrides(currentThemeId.value, themeDark.value, primaryColor.value))
watch([themeDark, currentThemeId, primaryColor], () => {
  nextTick(() => {
    naiveOverrides.value = buildNaiveOverrides(currentThemeId.value, themeDark.value, primaryColor.value)
  })
})

let confirmed = false
const isLoading = ref(false)

const isOpen = computed({
  get: () => confirmEvent.value.visible,
  set: (v) => {
    confirmEvent.value.visible = v
    if (!v && !confirmed) confirmEvent.value.onCancel()
  },
})

async function handleConfirm() {
  confirmed = true
  isLoading.value = true
  await nextTick()
  confirmEvent.value.onConfirm()
  confirmEvent.value.visible = false
  isLoading.value = false
}
</script>

<template>
  <n-config-provider :theme="themeDark ? darkTheme : null" :theme-overrides="naiveOverrides" :locale="zhCN">
    <n-modal v-model:show="isOpen" preset="card" :title="confirmEvent.options.title" style="width:420px;" :z-index="2000" :mask-closable="false" :bordered="false">
      <p class="text-muted-foreground">{{ confirmEvent.options.content }}</p>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button :disabled="isLoading" @click="isOpen = false">{{ confirmEvent.options.cancelText || '取消' }}</n-button>
          <n-button type="primary" :loading="isLoading" @click="handleConfirm">{{ confirmEvent.options.confirmText || '确认' }}</n-button>
        </div>
      </template>
    </n-modal>
  </n-config-provider>
</template>
