<!--
/**
 * @description 门户默认外观的受控快捷选择器，仅负责亮色、暗色和跟随当前管理端系统三种选项。
 * @file app/pages/admin/site-config/components/PortalAppearancePicker.vue
 */
-->
<script setup lang="ts">
import { ContrastOutline, MoonOutline, SunnyOutline } from '@vicons/ionicons5'
import { NIcon, NRadioButton, NRadioGroup } from 'naive-ui'

type PortalThemeMode = 'light' | 'dark' | 'system'

const props = defineProps<{
  modelValue: PortalThemeMode
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: PortalThemeMode]
}>()

const options = [
  { value: 'light' as const, label: '亮色', description: '始终使用明亮外观', icon: SunnyOutline },
  { value: 'dark' as const, label: '暗色', description: '始终使用暗色外观', icon: MoonOutline },
  { value: 'system' as const, label: '跟随系统', description: '按访问门户的设备外观决定', icon: ContrastOutline },
]

function updateValue(value: string | number): void {
  if (value === 'light' || value === 'dark' || value === 'system') emit('update:modelValue', value)
}
</script>

<template>
  <section class="portal-appearance" aria-labelledby="portal-appearance-title">
    <div>
      <h3 id="portal-appearance-title" class="portal-appearance__title">门户默认外观</h3>
      <p class="portal-appearance__description">设置门户首次默认外观；后台亮暗模式独立保存，C 端用户已经选择的外观只保存在个人设备，不会被覆盖。</p>
    </div>

    <NRadioGroup
      class="portal-appearance__options"
      :value="props.modelValue"
      :disabled="props.disabled"
      name="portal-theme-mode"
      @update:value="updateValue"
    >
      <NRadioButton
        v-for="option in options"
        :key="option.value"
        :value="option.value"
        class="portal-appearance__option"
        :class="{ 'portal-appearance__option--active': props.modelValue === option.value }"
      >
        <NIcon :component="option.icon" size="20" aria-hidden="true" />
        <span class="portal-appearance__option-content">
          <strong>{{ option.label }}</strong>
          <span>{{ option.description }}</span>
        </span>
      </NRadioButton>
    </NRadioGroup>
  </section>
</template>

<style lang="scss" scoped>
.portal-appearance { display: flex; flex-direction: column; gap: 14px; }
.portal-appearance__title { margin: 0; color: var(--foreground); font-size: 14px; line-height: 1.5; }
.portal-appearance__description { margin: 4px 0 0; color: var(--muted-foreground); font-size: 13px; line-height: 1.6; }
.portal-appearance__options { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
/* Naive UI 在按钮组间插入 splitor；栅格布局下它会占据单元格，导致第三项换行并与后续表单重叠。 */
.portal-appearance__options :deep(.n-radio-group__splitor) { display: none; }
.portal-appearance__option { display: flex; align-items: center; min-height: 76px; margin: 0; padding: 12px; border: 1px solid var(--border); border-radius: 10px; color: var(--foreground); }
.portal-appearance__option--active { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 8%, var(--card)); }
.portal-appearance__option :deep(.n-radio-button__state-border) { border-radius: 10px; }
.portal-appearance__option :deep(.n-radio-button__button) { display: flex; align-items: center; min-height: 50px; padding: 0; }
.portal-appearance__option-content { display: flex; flex-direction: column; gap: 3px; margin-left: 9px; }
.portal-appearance__option-content strong { font-size: 14px; line-height: 1.4; }
.portal-appearance__option-content span { color: var(--muted-foreground); font-size: 12px; line-height: 1.4; }
@media (max-width: 680px) { .portal-appearance__options { grid-template-columns: 1fr; } }
</style>
