/**
 * @description 字典数据样式配置子组件 — 预置样式 + 图标 + 自定义颜色 + 实时预览
 * @file app/pages/admin/dict/components/DictDataStyleConfig.vue
 */
<script setup lang="ts">
import type { Component } from 'vue'

import { NTag, NIcon, NInput } from 'naive-ui'
import {
  Alert,
  AlertCircle,
  AlertCircleOutline,
  Calendar,
  CalendarOutline,
  Card,
  CardOutline,
  Cash,
  CashOutline,
  Checkmark,
  CheckmarkCircle,
  CheckmarkCircleOutline,
  Close,
  CloseCircle,
  CloseCircleOutline,
  DocumentText,
  DocumentTextOutline,
  Flag,
  FlagOutline,
  Gift,
  GiftOutline,
  Heart,
  HeartOutline,
  HelpCircle,
  HelpCircleOutline,
  InformationCircle,
  InformationCircleOutline,
  People,
  PeopleOutline,
  Person,
  PersonOutline,
  Pricetag,
  PricetagOutline,
  Settings,
  SettingsOutline,
  Star,
  StarOutline,
  Time,
  TimeOutline,
  Trophy,
  TrophyOutline,
} from '@vicons/ionicons5'
import DictBadge from '~/components/admin/DictBadge.vue'

/** 字典样式编辑可预览的常用运营图标；禁止全量导入图标集。 */
const ioniconPreviews: Record<string, Component> = {
  Alert,
  AlertCircle,
  AlertCircleOutline,
  Calendar,
  CalendarOutline,
  Card,
  CardOutline,
  Cash,
  CashOutline,
  Checkmark,
  CheckmarkCircle,
  CheckmarkCircleOutline,
  Close,
  CloseCircle,
  CloseCircleOutline,
  DocumentText,
  DocumentTextOutline,
  Flag,
  FlagOutline,
  Gift,
  GiftOutline,
  Heart,
  HeartOutline,
  HelpCircle,
  HelpCircleOutline,
  InformationCircle,
  InformationCircleOutline,
  People,
  PeopleOutline,
  Person,
  PersonOutline,
  Pricetag,
  PricetagOutline,
  Settings,
  SettingsOutline,
  Star,
  StarOutline,
  Time,
  TimeOutline,
  Trophy,
  TrophyOutline,
}

const props = withDefaults(defineProps<{
  listClass?: string
  icon?: string
  backgroundColor?: string
  color?: string
  dictLabel?: string
}>(), {
  listClass: '',
  icon: '',
  backgroundColor: '',
  color: '',
  dictLabel: '',
})

const emit = defineEmits<{
  'update:listClass': [value: string]
  'update:icon': [value: string]
  'update:backgroundColor': [value: string]
  'update:color': [value: string]
}>()

const presetStyleOptions = [
  { value: '', label: '无', type: 'default' as const },
  { value: 'primary', label: 'Primary', type: 'primary' as const },
  { value: 'success', label: 'Success', type: 'success' as const },
  { value: 'info', label: 'Info', type: 'info' as const },
  { value: 'warning', label: 'Warning', type: 'warning' as const },
  { value: 'danger', label: 'Danger', type: 'error' as const },
  { value: 'secondary', label: 'Secondary', type: 'default' as const },
  { value: 'outline', label: 'Outline', type: 'default' as const },
]

function setIcon(val: unknown) { emit('update:icon', val as string) }
function setBg(val: unknown) { emit('update:backgroundColor', val as string) }
function setColor(val: unknown) { emit('update:color', val as string) }

const hasPreset = computed(() => !!props.listClass)

/**
 * 把运营输入的图标名转换为预置图标表的 PascalCase 键。
 * @param value 保存的图标名
 * @returns 可用于查找预览组件的图标名；空值或非法字符返回空字符串
 */
function normalizeIoniconName(value: string): string {
  return value
    .trim()
    .replace(/(?:^|-)([a-zA-Z0-9])/g, (_match, char: string) => char.toUpperCase())
    .replace(/[^A-Za-z0-9]/g, '')
}

const iconPreviewComponent = computed(() => ioniconPreviews[normalizeIoniconName(props.icon)] || null)

const previewData = computed(() => ({
  dictLabel: props.dictLabel || '预览',
  listClass: props.listClass,
  icon: props.icon,
  backgroundColor: props.backgroundColor,
  color: props.color,
}))
</script>

<template>
  <div class="border-t pt-4">
    <h4 class="text-sm font-medium mb-3">样式配置</h4>

    <div class="space-y-3">
      <div class="flex items-start gap-3">
        <span class="pt-1 w-25 shrink-0 text-sm">预置样式</span>
        <div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="opt in presetStyleOptions"
              :key="opt.value"
              type="button"
              class="dict-style-option"
              :aria-pressed="listClass === opt.value || (!listClass && !opt.value)"
              @click="emit('update:listClass', opt.value)"
            >
              <n-tag
                :type="opt.type"
                size="small"
                :class="[
                  'transition-all',
                  listClass === opt.value || (!listClass && !opt.value)
                    ? 'ring-2 ring-primary ring-offset-1'
                    : 'ring-1 ring-transparent hover:ring-muted-foreground/30'
                ]"
              >
                <n-icon v-if="iconPreviewComponent && !opt.value" :component="iconPreviewComponent" size="14" />
                {{ opt.label }}
              </n-tag>
            </button>
          </div>
          <p class="text-xs text-muted-foreground mt-1">选择预置样式后，自定义颜色将自动失效</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <span class="w-25 shrink-0 text-sm">图标</span>
        <div>
          <div class="flex items-center gap-2">
            <n-input :value="icon" placeholder="常用图标名，如 Checkmark" style="width:192px" @update:value="setIcon" />
            <n-icon v-if="iconPreviewComponent" :component="iconPreviewComponent" size="20" class="shrink-0" />
          </div>
          <p class="text-xs text-muted-foreground mt-1">可预览 Checkmark、Alert、Calendar、Star、Heart、Gift、Card、People 等常用图标</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <span class="w-25 shrink-0 text-sm">背景色</span>
        <div class="flex items-center gap-2">
          <input
            type="color"
            :value="backgroundColor"
            :disabled="hasPreset"
            class="size-8 cursor-pointer rounded border disabled:opacity-30"
            @input="emit('update:backgroundColor', ($event.target as HTMLInputElement).value)"
          >
          <n-input
            :value="backgroundColor"
            placeholder="#ffffff"
            :disabled="hasPreset"
            class="w-32 font-mono text-xs"
            @update:value="setBg($event)"
          />
          <span v-if="hasPreset" class="text-xs text-muted-foreground">预置样式已启用，无需自定义</span>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <span class="w-25 shrink-0 text-sm">文字色</span>
        <div class="flex items-center gap-2">
          <input
            type="color"
            :value="color"
            :disabled="hasPreset"
            class="size-8 cursor-pointer rounded border disabled:opacity-30"
            @input="emit('update:color', ($event.target as HTMLInputElement).value)"
          >
          <n-input
            :value="color"
            placeholder="#333333"
            :disabled="hasPreset"
            class="w-32 font-mono text-xs"
            @update:value="setColor($event)"
          />
          <span v-if="hasPreset" class="text-xs text-muted-foreground">预置样式已启用，无需自定义</span>
        </div>
      </div>
    </div>

    <!-- 实时预览 -->
    <div class="mt-4 pt-4 border-t">
      <h4 class="text-sm font-medium mb-2">预览</h4>
      <DictBadge v-bind="previewData" />
    </div>
  </div>
</template>

<style scoped>
.dict-style-option {
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.dict-style-option:focus-visible {
  border-radius: 4px;
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
</style>
